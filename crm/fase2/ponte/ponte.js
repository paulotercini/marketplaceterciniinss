#!/usr/bin/env node
// A ponte entre o WhatsApp do escritório e o CRM.
//
// Fica ligada numa máquina só (VPS, ou um computador que não desliga), com a
// sessão do WhatsApp lida por QR code uma vez. Daí em diante:
//
//   WhatsApp -> zap_mensagens (direcao 'entrada')
//   zap_mensagens com status 'fila' -> WhatsApp
//
// Não expõe porta nenhuma: só fala de dentro para fora, com o Supabase. Por
// isso não precisa de domínio, certificado nem firewall aberto.
//
// A chave que ela usa é a service_role — o crachá de faxineiro do banco, que
// entra em tudo. Ela vive AQUI e não pode aparecer no navegador nem no git.
//
// Uso:  cp .env.exemplo .env  &&  editar  &&  npm install  &&  node ponte.js

const fs = require("fs");
const path = require("path");
const N = require("./normalizar");

// ── configuração ──────────────────────────────────────────────────────────
for (const linha of (fs.existsSync(path.join(__dirname, ".env"))
    ? fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n") : [])) {
  const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const BASE = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const CHAVE = process.env.SUPABASE_SERVICE_KEY || "";
const PASTA = process.env.PASTA_SESSAO || path.join(__dirname, "sessao");
const BALDE = process.env.BUCKET || "anexos";
const INTERVALO = Number(process.env.INTERVALO_FILA || 2000);
if (!BASE || !CHAVE) {
  console.error("faltam SUPABASE_URL e SUPABASE_SERVICE_KEY (veja .env.exemplo)");
  process.exit(1);
}

const agora = () => new Date().toISOString();
const log = (...a) => console.log(new Date().toLocaleString("pt-BR",
  { timeZone: "America/Sao_Paulo" }), "·", ...a);
const espera = ms => new Promise(r => setTimeout(r, ms));

// ── Supabase por REST: sem SDK, sem dependência a mais ────────────────────
async function sb(caminho, opts = {}) {
  const r = await fetch(BASE + caminho, {
    ...opts,
    headers: {
      apikey: CHAVE, Authorization: `Bearer ${CHAVE}`,
      "Content-Type": "application/json", ...(opts.headers || {}),
    },
  });
  if (!r.ok) throw new Error(`${opts.method || "GET"} ${caminho} -> ${r.status} ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
const rpc = (nome, args) =>
  sb(`/rest/v1/rpc/${nome}`, { method: "POST", body: JSON.stringify(args) });

async function anotar(chave, valor) {
  await sb("/rest/v1/config_app", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ chave, valor: String(valor), atualizado: agora() }),
  }).catch(e => log("não consegui anotar", chave, e.message));
}

async function baixarDoBalde(caminho) {
  const r = await fetch(`${BASE}/storage/v1/object/${BALDE}/${caminho}`, {
    headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` },
  });
  if (!r.ok) throw new Error(`storage ${r.status} ao ler ${caminho}`);
  return Buffer.from(await r.arrayBuffer());
}

async function subirMidia(buffer, caminho, mime) {
  const r = await fetch(`${BASE}/storage/v1/object/${BALDE}/${caminho}`, {
    method: "POST",
    headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}`,
               "Content-Type": mime || "application/octet-stream", "x-upsert": "true" },
    body: buffer,
  });
  if (!r.ok) throw new Error(`storage ${r.status} ${await r.text()}`);
  return caminho;
}

// ── WhatsApp ──────────────────────────────────────────────────────────────
let sock = null, ligado = false;

async function conectar() {
  const baileys = require("@whiskeysockets/baileys");
  const makeWASocket = baileys.default || baileys.makeWASocket;
  const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion,
          downloadMediaMessage } = baileys;
  const pino = require("pino");

  const { state, saveCreds } = await useMultiFileAuthState(PASTA);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));
  sock = makeWASocket({
    version, auth: state, logger: pino({ level: "silent" }),
    // aparecer como um navegador comum é o comportamento normal de quem usa
    // o WhatsApp Web; nada aqui manda mensagem sozinho
    browser: ["CRM Tercini", "Chrome", "121.0.0"],
    markOnlineOnConnect: false,      // não rouba as notificações do celular
    syncFullHistory: false,          // histórico antigo não interessa
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async u => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) {
      // o QR também vai para o banco, para poder ser lido de dentro do CRM
      // por quem não tem acesso ao servidor
      await anotar("zap_qr", qr);
      await anotar("zap_status", "esperando leitura do QR");
      try { require("qrcode-terminal").generate(qr, { small: true }); }
      catch { log("QR (instale qrcode-terminal para ver aqui):", qr.slice(0, 40) + "…"); }
    }
    if (connection === "open") {
      ligado = true;
      await anotar("zap_qr", "");
      await anotar("zap_status", "ligado");
      log("WhatsApp conectado como", (sock.user && sock.user.id) || "?");
    }
    if (connection === "close") {
      ligado = false;
      const cod = lastDisconnect && lastDisconnect.error
        && lastDisconnect.error.output && lastDisconnect.error.output.statusCode;
      const deslogado = cod === DisconnectReason.loggedOut;
      await anotar("zap_status", deslogado ? "desconectado — precisa ler o QR de novo"
                                           : "reconectando");
      log("caiu", cod || "", deslogado ? "(sessão encerrada no celular)" : "— reconectando");
      if (deslogado) {
        // sessão morta: apagar as credenciais, senão ele tenta para sempre
        fs.rmSync(PASTA, { recursive: true, force: true });
      }
      await espera(deslogado ? 2000 : 4000);
      conectar().catch(e => log("falhou ao reconectar:", e.message));
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;                 // 'append' é histórico velho
    for (const m of messages) {
      try { await entrou(m, downloadMediaMessage); }
      catch (e) { log("erro ao guardar mensagem:", e.message); }
    }
  });

  // recibos: entregue e lida, para a tela mostrar o mesmo que o celular
  sock.ev.on("messages.update", async atualizacoes => {
    for (const u of atualizacoes) {
      const st = u.update && u.update.status;
      if (!st || !u.key || !u.key.id) continue;
      const novo = st >= 4 ? "lida" : st >= 3 ? "entregue" : null;
      if (!novo) continue;
      await sb(`/rest/v1/zap_mensagens?externo_id=eq.${encodeURIComponent(u.key.id)}`
               + `&status=in.(enviada,entregue)`,
        { method: "PATCH", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ status: novo }) }).catch(() => {});
    }
  });
}

// ── chegou mensagem ───────────────────────────────────────────────────────
async function entrou(m, baixar) {
  if (N.deveIgnorar(m)) return;
  if (m.key.fromMe) return;        // o que sai daqui já é gravado na fila
  const fone = N.jidParaFone(m.key.remoteJid);
  if (N.chaveFone(fone).length < 8) return;

  const conversa = await rpc("zap_abrir", { p_telefone: fone, p_nome: m.pushName || null });
  const tipo = N.tipoDaMensagem(m);
  const linha = {
    conversa_id: conversa, externo_id: m.key.id, direcao: "entrada",
    tipo, texto: N.textoDaMensagem(m) || null, status: "entregue",
    quando_wa: N.quandoWa(m),
  };

  if (["imagem", "audio", "video", "documento", "figurinha"].includes(tipo)) {
    try {
      const buf = await baixar(m, "buffer", {}, { reuploadRequest: sock.updateMediaMessage });
      const c = N.miolo(m);
      const orig = (c.documentMessage && c.documentMessage.fileName) || "";
      const mime = (c[Object.keys(c).find(k => c[k] && c[k].mimetype)] || {}).mimetype;
      const nome = N.nomeSeguro(orig, tipo, mime);
      linha.midia_url = await subirMidia(buf, `zap/${conversa}/${m.key.id}-${nome}`, mime);
      linha.midia_nome = nome;
      linha.midia_mime = mime || null;
    } catch (e) {
      log("não consegui baixar a mídia:", e.message);
      linha.texto = (linha.texto || "") + " [mídia não baixada]";
    }
  }

  await sb("/rest/v1/zap_mensagens", {
    method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(linha),
  }).catch(e => {
    // 23505 = mensagem repetida; reprocessar não pode virar linha dobrada
    if (!String(e.message).includes("23505")) throw e;
  });
  guardarFoto(conversa, m.key.remoteJid);
  log("←", fone, (linha.texto || `[${tipo}]`).slice(0, 60));
}

// O tipo importa: foto tem de chegar como FOTO, não como arquivo para baixar.
// Documento leva o nome original, senão o cliente recebe "arquivo.bin" e não
// sabe que é a lista de documentos que ele pediu.
async function conteudoDaMensagem(msg) {
  if (!msg.midia_url) return { text: msg.texto || "" };
  const buf = await baixarDoBalde(msg.midia_url);
  const legenda = (msg.texto || "").trim() || undefined;
  const mime = msg.midia_mime || "application/octet-stream";
  switch (msg.tipo) {
    case "imagem": return { image: buf, caption: legenda };
    case "video":  return { video: buf, caption: legenda };
    // ptt=true faz aparecer como áudio de voz, e não como arquivo de música
    case "audio":  return { audio: buf, mimetype: mime, ptt: true };
    default:       return { document: buf, mimetype: mime,
                            fileName: msg.midia_nome || "arquivo", caption: legenda };
  }
}

// ── fila de saída ─────────────────────────────────────────────────────────
// O CRM não fala com o WhatsApp: ele escreve na tabela e vai embora. Se a
// ponte estiver caída, a mensagem espera em vez de sumir.
async function rodarFila() {
  for (;;) {
    try {
      if (ligado) {
        // ordem pelo contador, não pelo relógio: duas mensagens gravadas no
        // mesmo instante sairiam em ordem sorteada
        const fila = await sb("/rest/v1/zap_mensagens?status=eq.fila"
          + "&select=id,conversa_id,texto,tipo,midia_url,midia_nome,midia_mime,tentativas"
          + "&order=seq&limit=5");
        for (const msg of fila || []) await enviar(msg);
      }
    } catch (e) { log("fila:", e.message); }
    await espera(INTERVALO);
  }
}

// `s` é o socket; vem por parâmetro para o teste poder entrar com um de mentira
async function enviar(msg, s = sock) {
  // marca antes de mandar: se a ponte cair no meio, ninguém reenvia sozinho
  const pego = await sb(`/rest/v1/zap_mensagens?id=eq.${msg.id}&status=eq.fila`, {
    method: "PATCH", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: "enviando" }),
  });
  if (!pego || !pego.length) return;              // outro processo pegou antes

  try {
    const [c] = await sb(`/rest/v1/zap_conversas?id=eq.${msg.conversa_id}&select=telefone`);
    if (!c) throw new Error("conversa sem telefone");
    // deixar o WhatsApp dizer qual é o endereço certo resolve o nono dígito:
    // 16 9 9999-0000 e 16 9999-0000 podem ser a mesma pessoa, e só ele sabe
    const [achado] = await s.onWhatsApp(N.soDigitos(c.telefone));
    if (!achado || !achado.exists) throw new Error("número não tem WhatsApp");

    await s.sendPresenceUpdate("composing", achado.jid);
    // um respiro humano entre uma mensagem e outra
    await espera(Number(process.env.PAUSA_ENVIO ?? (700 + Math.floor(Math.random() * 1500))));
    const r = await s.sendMessage(achado.jid, await conteudoDaMensagem(msg));
    await s.sendPresenceUpdate("paused", achado.jid);

    await sb(`/rest/v1/zap_mensagens?id=eq.${msg.id}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "enviada", enviada_em: agora(),
                             externo_id: (r && r.key && r.key.id) || null }),
    });
    log("→", c.telefone, (msg.texto || `[${msg.tipo}] ${msg.midia_nome || ""}`).slice(0, 60));
  } catch (e) {
    const n = (msg.tentativas || 0) + 1;
    await sb(`/rest/v1/zap_mensagens?id=eq.${msg.id}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ tentativas: n, erro: String(e.message).slice(0, 300),
                             // três tentativas e para: mensagem que não vai
                             // tem de aparecer em vermelho para alguém resolver
                             status: n >= 3 ? "erro" : "fila" }),
    }).catch(() => {});
    log("✗ falhou:", e.message, n >= 3 ? "(desisti)" : `(tentativa ${n})`);
  }
}

// ── foto de perfil ────────────────────────────────────────────────────────
// A URL que o WhatsApp devolve expira em horas, então a foto é copiada para o
// nosso balde uma vez. Nem todo mundo tem foto, e quem não tem não pode virar
// erro no meio do fluxo de mensagens.
async function guardarFoto(conversaId, jid, s = sock) {
  try {
    const [c] = await sb(`/rest/v1/zap_conversas?id=eq.${conversaId}&select=foto_url`);
    if (c && c.foto_url) return;                 // já temos
    const url = await s.profilePictureUrl(jid, "image").catch(() => null);
    if (!url) return;
    const r = await fetch(url);
    if (!r.ok) return;
    const caminho = `zap/perfil/${conversaId}.jpg`;
    await subirMidia(Buffer.from(await r.arrayBuffer()), caminho, "image/jpeg");
    await sb(`/rest/v1/zap_conversas?id=eq.${conversaId}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ foto_url: caminho }),
    });
  } catch (e) { /* foto é enfeite: não pode atrapalhar a mensagem */ }
}

// ── avisos automáticos ────────────────────────────────────────────────────
// Quem lembra o cliente da perícia é o banco (zap_gerar_avisos); a ponte só
// bate na porta de hora em hora. A função é idempotente e recusa fora do
// expediente, então chamar demais não manda mensagem demais — e é melhor
// depender de um processo que já fica ligado do que de um agendador a mais.
async function rodarAvisos() {
  for (;;) {
    try {
      const n = await rpc("zap_gerar_avisos", {});
      if (n) log(`${n} aviso(s) programado(s) para os clientes`);
    } catch (e) { log("avisos:", e.message); }
    await espera(Number(process.env.INTERVALO_AVISOS || 3600000));
  }
}

// ── sinal de vida ─────────────────────────────────────────────────────────
// Sem isso, ninguém no escritório sabe a diferença entre "ninguém escreveu"
// e "a ponte morreu às 3 da manhã".
async function baterPonto() {
  for (;;) {
    await anotar("zap_visto_em", agora());
    if (!ligado) await anotar("zap_status", "desligado");
    await espera(30000);
  }
}

if (require.main === module) {
  log("subindo a ponte…");
  conectar().catch(e => { console.error(e); process.exit(1); });
  rodarFila();
  rodarAvisos();
  baterPonto();
  const tchau = async s => { log("saindo por", s); await anotar("zap_status", "parada"); process.exit(0); };
  process.on("SIGINT", () => tchau("SIGINT"));
  process.on("SIGTERM", () => tchau("SIGTERM"));
}

module.exports = { sb, rpc, enviar, entrou, conteudoDaMensagem };
