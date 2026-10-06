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
let sock = null, ligado = false, recuperando = false;

function fecharSocket(s) {
  if (!s) return;
  try { s.ev.removeAllListeners(); } catch {}
  try { s.end(undefined); } catch {}
}
// Sob o pm2, recomeçar é sair: ele sobe a ponte de novo em 10 s (restart_delay
// no ecosystem.config.js), com uma conexão só e a memória limpa
async function reiniciar(motivo) {
  log("reiniciando a ponte:", motivo);
  ligado = false;
  await anotar("zap_status", "reconectando").catch(() => {});
  fecharSocket(sock);
  process.exit(1);
}

// O aparelho do cliente que não consegue abrir uma mensagem ("Aguardando
// mensagem") pede para a gente reenviá-la; o Baileys reenvia o que getMessage
// devolver. Sem isso a mensagem fica presa para sempre no celular dele.
const enviadas = new Map();          // ponytail: só na memória, os pedidos de reenvio chegam em segundos
function lembrar(r) {
  if (!r || !r.key || !r.message) return;
  enviadas.set(r.key.id, r.message);
  if (enviadas.size > 500) enviadas.delete(enviadas.keys().next().value);
}
async function mensagemParaReenvio(key) {
  if (enviadas.has(key.id)) return enviadas.get(key.id);
  // reiniciou no meio: o texto ainda está no banco (mídia não dá para remontar)
  const [m] = await sb(`/rest/v1/zap_mensagens?select=texto,tipo&externo_id=eq.${encodeURIComponent(key.id)}`).catch(() => []);
  return m && m.tipo === "texto" && m.texto ? { conversation: m.texto } : undefined;
}

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
    browser: ["CRM Tercini", "Desktop", "121.0.0"],  // Desktop: o WhatsApp manda o histórico inteiro, não só os meses recentes
    markOnlineOnConnect: false,      // não rouba as notificações do celular
    // o histórico vem uma vez, ao ler o QR; importarHistorico guarda só o de cliente
    syncFullHistory: true,
    getMessage: mensagemParaReenvio,
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
      if (process.argv.includes("--recuperar-midia") && !recuperando) {
        recuperando = true;
        recuperarMidias().catch(e => log("recuperar mídia:", e.message));
      }
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
      // Duas conexões com a mesma sessão embaralham a criptografia ("Bad MAC"
      // em massa, mensagem que chega e não se lê). Por isso a velha é fechada
      // antes, e com o pm2 o programa recomeça do zero, que é o mais limpo.
      fecharSocket(sock);
      if (process.env.pm_id !== undefined) return reiniciar(deslogado ? "sessão encerrada" : "conexão caiu");
      await espera(deslogado ? 2000 : 4000);
      conectar().catch(e => log("falhou ao reconectar:", e.message));
    }
  });

  sock.ev.on("messaging-history.set", h => receberHistorico(h, downloadMediaMessage));

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
// id de privacidade (@lid) -> telefone, aprendido no que o cliente manda; serve
// para achar a conversa quando quem escreve é o escritório
const lidParaFone = new Map();

async function entrou(m, baixar) {
  const reacao = N.reacaoDe(m);
  if (reacao) return guardarReacao(m, reacao);
  if (N.deveIgnorar(m)) return;
  const fone = N.foneDaMensagem(m, lidParaFone);
  if (N.chaveFone(fone).length < 8) return;
  if (m.key.fromMe) {
    // o que o escritório responde pelo celular também entra na conversa. O que
    // saiu pela fila do CRM já está gravado: a pausa deixa a fila gravar o
    // externo_id antes, e gravar() não duplica mensagem já conhecida
    await espera(4000);
    const conversa = await rpc("zap_abrir", { p_telefone: fone, p_nome: null });
    const linha = await gravar(m, baixar, conversa, "saida", "enviada");
    if (!linha.repetida) log("→ (celular)", fone, (linha.texto || `[${linha.tipo}]`).slice(0, 60));
    return;
  }
  const conversa = await rpc("zap_abrir", { p_telefone: fone, p_nome: m.pushName || null });
  const linha = await gravar(m, baixar, conversa, "entrada", "entregue");
  guardarFoto(conversa, m.key.remoteJid);
  log("←", fone, (linha.texto || `[${linha.tipo}]`).slice(0, 60));
}

// Reação (do cliente ou dada pelo celular do escritório) a uma mensagem que o
// CRM conhece: uma por lado, a nova substitui a antiga; emoji vazio = retirada
async function guardarReacao(m, reacao) {
  const [alvo] = await sb(`/rest/v1/zap_mensagens?externo_id=eq.${encodeURIComponent(reacao.id)}&select=id`);
  if (!alvo) return;                               // mensagem antiga, fora do CRM
  await sb("/rest/v1/zap_reacoes?on_conflict=mensagem_id,de", {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ mensagem_id: alvo.id, de: m.key.fromMe ? "escritorio" : "cliente",
                           emoji: reacao.emoji, status: "enviada" }),
  });
}

// Uma mensagem do WhatsApp vira uma linha de zap_mensagens, com a mídia no
// Storage. Serve à mensagem que chega agora e ao histórico.
async function gravar(m, baixar, conversa, direcao, status) {
  const tipo = N.tipoDaMensagem(m);
  const linha = {
    conversa_id: conversa, externo_id: m.key.id, direcao,
    tipo, texto: N.textoDaMensagem(m) || null, status,
    quando_wa: N.quandoWa(m),
  };

  // já gravada? Não baixa a mídia de novo; só refaz a que tinha falhado
  // (é assim que o --recuperar-midia devolve o áudio às mensagens antigas)
  const [ja] = await sb(`/rest/v1/zap_mensagens?externo_id=eq.${encodeURIComponent(m.key.id)}&select=id,texto,midia_url`);
  if (ja) {
    if (MIDIA.includes(tipo) && !ja.midia_url && (ja.texto || "").includes(SEM_MIDIA)) {
      const md = await baixarMidia(m, baixar, conversa, tipo).catch(e => { log("mídia ainda indisponível:", e.message); return null; });
      if (md) {
        // texto vazio de novo: o áudio volta para a fila da transcrição
        const texto = (ja.texto || "").replace(SEM_MIDIA, "").trim() || null;
        await sb(`/rest/v1/zap_mensagens?id=eq.${ja.id}`, {
          method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ ...md, texto }) });
        recuperadas++;
      }
    }
    return { ...linha, repetida: true };
  }

  // respondeu citando: guarda o id do WhatsApp e, se a citada está no CRM, liga as duas
  const citada = N.citacaoDe(m);
  if (citada) {
    linha.responde_externo = citada;
    const [orig] = await sb(`/rest/v1/zap_mensagens?externo_id=eq.${encodeURIComponent(citada)}&select=id`).catch(() => []);
    if (orig) linha.responde_a = orig.id;
  }

  if (MIDIA.includes(tipo)) {
    try { Object.assign(linha, await baixarMidia(m, baixar, conversa, tipo)); }
    catch (e) {
      log("não consegui baixar a mídia:", e.message);
      linha.texto = ((linha.texto || "") + " " + SEM_MIDIA).trim();
    }
  }

  await sb("/rest/v1/zap_mensagens", {
    method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(linha),
  }).catch(e => {
    // 23505 = mensagem repetida; reprocessar não pode virar linha dobrada
    if (!String(e.message).includes("23505")) throw e;
  });
  return linha;
}

const MIDIA = ["imagem", "audio", "video", "documento", "figurinha"];
const SEM_MIDIA = "[mídia não baixada]";
let recuperadas = 0;

async function baixarMidia(m, baixar, conversa, tipo) {
  let buf;
  try { buf = await baixar(m, "buffer", {}, { reuploadRequest: sock.updateMediaMessage }); }
  catch (e) {
    // link vencido: o WhatsApp responde 403, e o Baileys só pede ao celular
    // que reenvie em 404/410. Pede aqui e tenta de novo, uma vez.
    if (!/status code 403/.test(e.message)) throw e;
    m = await sock.updateMediaMessage(m);
    buf = await baixar(m, "buffer", {}, { reuploadRequest: sock.updateMediaMessage });
  }
  const c = N.miolo(m);
  const orig = (c.documentMessage && c.documentMessage.fileName) || "";
  const mime = (c[Object.keys(c).find(k => c[k] && c[k].mimetype)] || {}).mimetype;
  const nome = N.nomeSeguro(orig, tipo, mime);
  return {
    midia_url: await subirMidia(buf, `zap/${conversa}/${m.key.id}-${nome}`, mime),
    midia_nome: orig || nome,          // na tela, o nome como o cliente mandou
    midia_mime: mime || null,
  };
}

// ── histórico: as conversas antigas, gravadas na ficha de cada cliente ────
// O WhatsApp manda o histórico uma vez, logo depois de ler o QR, em lotes.
// Só entra conversa de número que é cliente (N.agruparHistorico). Mensagem
// repetida não dobra (externo_id é único). Um lote por vez: dois zap_abrir
// do mesmo número ao mesmo tempo brigariam pela mesma conversa.
let filaHistorico = Promise.resolve();
function receberHistorico({ chats, messages, syncType }, baixar) {
  for (const c of chats || []) if (String(c.id).endsWith("@lid") && c.pnJid) lidParaFone.set(c.id, c.pnJid);
  filaHistorico = filaHistorico.then(() => importarHistorico(chats, messages, baixar))
    .catch(e => log("histórico:", e.message))
    .then(() => { if (syncType === SOB_PEDIDO && esperandoPagina) esperandoPagina(messages); });
}

// ── --recuperar-midia: pede de novo ao celular as conversas dos clientes ──
// A mídia antiga vem com link vencido. Para cada conversa com mídia faltando,
// pede ao celular as mensagens de novo (de 50 em 50, da mais nova para a mais
// antiga) até passar da mídia mais antiga que falhou. Cada mensagem que volta
// passa por gravar(), que refaz só a mídia que faltava.
const SOB_PEDIDO = require("@whiskeysockets/baileys").proto.HistorySync.HistorySyncType.ON_DEMAND;
let esperandoPagina = null;
const pagina = (s, chave, ts) => new Promise(resolve => {
  const t = setTimeout(() => { esperandoPagina = null; resolve(null); }, 30000);
  esperandoPagina = msgs => { clearTimeout(t); esperandoPagina = null; resolve(msgs); };
  s.fetchMessageHistory(50, chave, ts).catch(e => { log("pedido de histórico:", e.message); });
});
async function recuperarMidias(s = sock) {
  const falhas = await sb("/rest/v1/zap_mensagens?select=conversa_id,quando_wa"
    + `&texto=like.*${encodeURIComponent(SEM_MIDIA)}*&order=quando_wa`);
  const ate = new Map();               // conversa -> data da mídia mais antiga que falhou
  for (const f of falhas) if (!ate.has(f.conversa_id)) ate.set(f.conversa_id, f.quando_wa);
  log(`recuperar mídia: ${falhas.length} mídia(s) em ${ate.size} conversa(s)`);
  const antes = recuperadas;
  for (const [conversa, limite] of ate) {
    const [c] = await sb(`/rest/v1/zap_conversas?id=eq.${conversa}&select=telefone`);
    let [ancora] = await sb(`/rest/v1/zap_mensagens?conversa_id=eq.${conversa}&externo_id=not.is.null`
      + "&select=externo_id,direcao,quando_wa&order=quando_wa.desc&limit=1");
    // o celular guarda a conversa pelo id de privacidade (@lid) ou pelo número:
    // pergunta pelos dois, e fica com o que ele responder
    const fone = N.soDigitos(c.telefone);
    const [w] = await s.onWhatsApp(fone).catch(() => []);
    let jids = [...new Set([w && w.lid, (w && w.jid) || `${fone}@s.whatsapp.net`].filter(Boolean))];
    for (let volta = 0; ancora && volta < 40; volta++) {
      let msgs = null;
      for (const jid of jids) {
        msgs = await pagina(s, { remoteJid: jid, id: ancora.externo_id, fromMe: ancora.direcao === "saida" }, Date.parse(ancora.quando_wa));
        if (msgs && msgs.length) { jids = [jid]; break; }
      }
      if (!msgs || !msgs.length) { if (volta === 0) log("recuperar mídia: o celular não respondeu pela conversa de", c.telefone); break; }
      const velha = msgs.reduce((a, b) => ((N.quandoWa(a) || "") < (N.quandoWa(b) || "") ? a : b));
      if (!N.quandoWa(velha) || N.quandoWa(velha) <= limite) break;
      ancora = { externo_id: velha.key.id, direcao: velha.key.fromMe ? "saida" : "entrada", quando_wa: N.quandoWa(velha) };
    }
    log(`recuperar mídia: conversa de ${c.telefone} conferida (${recuperadas - antes} recuperada(s) até aqui)`);
  }
  log(`recuperar mídia: fim — ${recuperadas - antes} mídia(s) recuperada(s)`);
}
async function importarHistorico(chats, messages, baixar) {
  // o principal e os da lista da ficha (o da filha, o segundo WhatsApp)
  // o PostgREST entrega no máximo 1000 linhas por vez: vem em páginas
  const clientes = [];
  for (let ini = 0; ; ini += 1000) {
    const lote = await sb(`/rest/v1/clientes?select=telefone,telefones&order=id&offset=${ini}&limit=1000`);
    clientes.push(...lote);
    if (lote.length < 1000) break;
  }
  const nums = clientes.flatMap(c => [c.telefone, ...(Array.isArray(c.telefones) ? c.telefones.map(t => t && t.numero) : [])]);
  const chaves = new Set(nums.map(N.chaveFone).filter(k => k.length === 8));
  const grupos = N.agruparHistorico(chats, messages, chaves);
  if (!grupos.size) return;
  log(`histórico: ${messages.length} mensagem(ns) no lote, ${grupos.size} conversa(s) de cliente`);
  for (const [fone, msgs] of grupos) {
    const nome = (msgs.find(m => !m.key.fromMe && m.pushName) || {}).pushName || null;
    const conversa = await rpc("zap_abrir", { p_telefone: fone, p_nome: nome });
    let n = 0;
    for (const m of msgs) {
      try {
        await gravar(m, baixar, conversa, m.key.fromMe ? "saida" : "entrada", m.key.fromMe ? "enviada" : "entregue");
        n++;
      } catch (e) { log("histórico: não gravei uma mensagem de", fone, "-", e.message); }
    }
    // histórico não é novidade: nada fica "não lido" e a prévia volta para a
    // mensagem mais recente (o lote antigo pode chegar depois de uma nova).
    // ponytail: zera também o não-lido de mensagem nova que chegou durante a importação; só acontece logo após ler o QR
    const [ult] = await sb(`/rest/v1/zap_mensagens?conversa_id=eq.${conversa}&direcao=neq.interna`
      + "&select=texto,tipo,quando_wa,criado_em&order=quando_wa.desc.nullslast&limit=1");
    await sb(`/rest/v1/zap_conversas?id=eq.${conversa}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ nao_lidas: 0, ...(ult ? { ultima_em: ult.quando_wa || ult.criado_em,
        ultimo_texto: (ult.texto || `[${ult.tipo}]`).slice(0, 200) } : {}) }),
    });
    log(`histórico: ${n} mensagem(ns) gravada(s) na conversa de ${fone}`);
  }
}

// O tipo importa: foto tem de chegar como FOTO, não como arquivo para baixar.
// Documento leva o nome original, senão o cliente recebe "arquivo.bin" e não
// sabe que é a lista de documentos que ele pediu.
// WebM -> OGG/Opus com o ffmpeg que vem no pacote ffmpeg-static (sem instalar nada no Windows)
function paraOgg(buf) {
  return new Promise((ok, falha) => {
    const p = require("child_process").spawn(require("ffmpeg-static"),
      ["-loglevel", "error", "-i", "pipe:0", "-vn", "-c:a", "libopus", "-b:a", "32k", "-f", "ogg", "pipe:1"]);
    const partes = [], erro = [];
    p.stdout.on("data", d => partes.push(d));
    p.stderr.on("data", d => erro.push(d));
    p.on("error", falha);
    p.on("close", c => c === 0 ? ok(Buffer.concat(partes)) : falha(new Error("ffmpeg: " + Buffer.concat(erro).toString().slice(0, 200))));
    p.stdin.end(buf);
  });
}

async function conteudoDaMensagem(msg) {
  if (!msg.midia_url) return { text: msg.texto || "" };
  const buf = await baixarDoBalde(msg.midia_url);
  const legenda = (msg.texto || "").trim() || undefined;
  const mime = msg.midia_mime || "application/octet-stream";
  switch (msg.tipo) {
    case "imagem": return { image: buf, caption: legenda };
    case "video":  return { video: buf, caption: legenda };
    // ptt=true faz aparecer como áudio de voz, e não como arquivo de música.
    // O áudio gravado no CRM vem em WebM (é o que o Chrome grava) e o WhatsApp
    // só toca mensagem de voz em OGG/Opus: converte antes de mandar
    case "audio":
      if (/webm/i.test(mime)) return { audio: await paraOgg(buf), mimetype: "audio/ogg; codecs=opus", ptt: true };
      return { audio: buf, mimetype: mime, ptt: true };
    default:       return { document: buf, mimetype: mime,
                            fileName: msg.midia_nome || "arquivo", caption: legenda };
  }
}

// ── fila de saída ─────────────────────────────────────────────────────────
// O CRM não fala com o WhatsApp: ele escreve na tabela e vai embora. Se a
// ponte estiver caída, a mensagem espera em vez de sumir.
let ultimoRelogio = 0;

// reação da equipe (👍 numa mensagem): vai para o WhatsApp como reação de verdade
async function reagir(r, s = sock) {
  try {
    const [m] = await sb(`/rest/v1/zap_mensagens?id=eq.${r.mensagem_id}&select=externo_id,direcao,conversa_id`);
    const [c] = m ? await sb(`/rest/v1/zap_conversas?id=eq.${m.conversa_id}&select=telefone`) : [];
    if (!m || !m.externo_id || !c) throw new Error("mensagem sem id no WhatsApp");
    const [achado] = await s.onWhatsApp(N.soDigitos(c.telefone));
    if (!achado || !achado.exists) throw new Error("número não tem WhatsApp");
    lembrar(await s.sendMessage(achado.jid, { react: { text: r.emoji, key: N.chaveDaMensagem(achado.jid, m) } }));
    await sb(`/rest/v1/zap_reacoes?id=eq.${r.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "enviada" }) });
  } catch (e) {
    log("✗ reação:", e.message);
    await sb(`/rest/v1/zap_reacoes?id=eq.${r.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "erro" }) }).catch(() => {});
  }
}

async function rodarFila() {
  for (;;) {
    try {
      if (ligado) {
        // ordem pelo contador, não pelo relógio: duas mensagens gravadas no
        // mesmo instante sairiam em ordem sorteada
        // a cada ~30 s: agendadas que venceram entram na fila, retornos avisam
        if (Date.now() - ultimoRelogio > 30000) {
          ultimoRelogio = Date.now();
          const n = await rpc("zap_relogio", {}).catch(e => { log("relógio:", e.message); return 0; });
          if (n) log(`${n} mensagem(ns) agendada(s) liberada(s)`);
        }
        const fila = await sb("/rest/v1/zap_mensagens?status=eq.fila"
          + "&select=id,conversa_id,texto,tipo,midia_url,midia_nome,midia_mime,tentativas,responde_a"
          + "&order=seq&limit=5");
        for (const msg of fila || []) await enviar(msg);
        const reacoes = await sb("/rest/v1/zap_reacoes?status=eq.fila&de=eq.escritorio&select=id,mensagem_id,emoji&limit=5");
        for (const r of reacoes || []) await reagir(r);
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
    // resposta citando uma mensagem: o WhatsApp precisa da chave da original
    let opcoes;
    if (msg.responde_a) {
      const [orig] = await sb(`/rest/v1/zap_mensagens?id=eq.${msg.responde_a}&select=externo_id,direcao,texto`);
      if (orig && orig.externo_id)
        opcoes = { quoted: { key: N.chaveDaMensagem(achado.jid, orig), message: { conversation: orig.texto || "" } } };
    }
    const r = await s.sendMessage(achado.jid, await conteudoDaMensagem(msg), opcoes);
    lembrar(r);
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
  for (let i = 0; ; i++) {
    if (i % 3 === 0) {
      await anotar("zap_visto_em", agora());
      if (!ligado) await anotar("zap_status", "desligado");
    }
    await ouvirComando().catch(e => log("comando:", e.message));
    await espera(10000);
  }
}

// ── comandos do CRM ──────────────────────────────────────────────────────
// O botão "Corrigir conexão" do CRM grava zap_comando = "reconectar|<quando>"
// ou "novo_qr|<quando>". A ponte lê a cada 10 s, apaga o pedido e obedece.
async function ouvirComando() {
  const [c] = await sb("/rest/v1/config_app?select=valor&chave=eq.zap_comando");
  const pedido = String((c && c.valor) || "").split("|")[0];
  if (!pedido) return;
  await anotar("zap_comando", "");
  if (pedido === "reconectar") return reiniciar("pedido do CRM");
  if (pedido === "novo_qr") {
    // desfaz o aparelho no celular e apaga a sessão: ao subir, vem QR novo
    try { if (sock && ligado) await Promise.race([sock.logout(), espera(8000)]); } catch {}
    fecharSocket(sock);
    fs.rmSync(PASTA, { recursive: true, force: true });
    return reiniciar("novo QR pedido pelo CRM");
  }
}

// ── vigia ─────────────────────────────────────────────────────────────────
// A conexão pode morrer calada: "conectada", sem cair, e sem receber nada
// (aconteceu em 05/10, das 17h16 às 21h34). A cada 2 minutos a ponte pergunta
// ao WhatsApp pelo próprio número; duas perguntas sem resposta, ela recomeça.
async function vigiar() {
  let falhas = 0;
  for (;;) {
    await espera(120000);
    if (!ligado || !sock || !sock.user) { falhas = 0; continue; }
    try {
      const eu = N.jidParaFone(sock.user.id);
      await Promise.race([sock.onWhatsApp(eu), espera(30000).then(() => { throw new Error("sem resposta"); })]);
      falhas = 0;
    } catch (e) {
      falhas++;
      log(`vigia: o WhatsApp não respondeu (${falhas}/2):`, e.message);
      if (falhas >= 2) {
        if (process.env.pm_id !== undefined) return reiniciar("conexão muda");
        fecharSocket(sock); falhas = 0;
        conectar().catch(err => log("falhou ao reconectar:", err.message));
      }
    }
  }
}

if (require.main === module) {
  log("subindo a ponte…");
  conectar().catch(e => { console.error(e); process.exit(1); });
  rodarFila();
  rodarAvisos();
  baterPonto();
  vigiar();
  const tchau = async s => { log("saindo por", s); await anotar("zap_status", "parada"); process.exit(0); };
  process.on("SIGINT", () => tchau("SIGINT"));
  process.on("SIGTERM", () => tchau("SIGTERM"));
  // o Baileys às vezes rejeita uma promessa do socket que já morreu (retry de
  // mensagem depois de a sessão cair): isso não pode derrubar a ponte inteira
  process.on("unhandledRejection", e => log("erro solto (seguindo):", (e && e.message) || e));
}

module.exports = { sb, rpc, enviar, entrou, conteudoDaMensagem, paraOgg };
