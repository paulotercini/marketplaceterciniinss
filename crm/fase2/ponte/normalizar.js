// O que o WhatsApp manda e o que o CRM guarda são coisas diferentes. Aqui
// vive só a tradução — funções puras, sem rede e sem banco, para poderem ser
// testadas sem WhatsApp nenhum. Toda a parte que fala com o mundo está em
// ponte.js.

const soDigitos = t => String(t || "").replace(/\D/g, "");

// os 8 últimos dígitos, a mesma régua do fone_chave() do banco: é o que faz
// +55 (16) 99999-0000, 5516999990000 e 16999990000 serem a mesma pessoa
const chaveFone = t => soDigitos(t).slice(-8);

const ehGrupo = jid => String(jid || "").endsWith("@g.us");
const ehStatus = jid => String(jid || "").startsWith("status@");

// '5516999990000@s.whatsapp.net' -> '5516999990000'
const jidParaFone = jid => soDigitos(String(jid || "").split("@")[0].split(":")[0]);

// O WhatsApp passou a esconder o número de parte dos contatos atrás de um id
// de privacidade ('119928724144327@lid'). Esse id não é telefone: não acha o
// cliente e não serve para responder. O número verdadeiro vem ao lado, em
// key.senderPn; sem ele, fica o id, que ao menos guarda a conversa.
const foneDaMensagem = m => {
  const k = (m && m.key) || {};
  const jid = String(k.remoteJid || "").endsWith("@lid") && k.senderPn ? k.senderPn : k.remoteJid;
  return jidParaFone(jid);
};

// Mensagem que não é conversa: recibo de entrega, reação, apagamento, chave
// de criptografia. Entra no fluxo do Baileys e não pode virar linha na tela.
const TIPOS_MUDOS = ["protocolMessage", "reactionMessage", "senderKeyDistributionMessage",
                     "messageContextInfo", "pollUpdateMessage"];

function miolo(m) {
  // o conteúdo real pode vir embrulhado uma ou duas vezes
  let c = (m && m.message) || {};
  for (let i = 0; i < 3; i++) {
    if (c.ephemeralMessage) { c = c.ephemeralMessage.message || {}; continue; }
    if (c.viewOnceMessage) { c = c.viewOnceMessage.message || {}; continue; }
    if (c.viewOnceMessageV2) { c = c.viewOnceMessageV2.message || {}; continue; }
    if (c.documentWithCaptionMessage) { c = c.documentWithCaptionMessage.message || {}; continue; }
    break;
  }
  return c;
}

const MAPA = [
  ["conversation", "texto"], ["extendedTextMessage", "texto"],
  ["imageMessage", "imagem"], ["audioMessage", "audio"],
  ["videoMessage", "video"], ["documentMessage", "documento"],
  ["stickerMessage", "figurinha"], ["locationMessage", "local"],
  ["liveLocationMessage", "local"], ["contactMessage", "contato"],
  ["contactsArrayMessage", "contato"],
];

function tipoDaMensagem(m) {
  const c = miolo(m);
  for (const [chave, tipo] of MAPA) if (c[chave]) return tipo;
  return null;                       // nada que a gente saiba mostrar
}

function textoDaMensagem(m) {
  const c = miolo(m);
  if (c.conversation) return c.conversation;
  if (c.extendedTextMessage) return c.extendedTextMessage.text || "";
  // legenda de foto/vídeo é texto de verdade: "segue o laudo do médico"
  for (const k of ["imageMessage", "videoMessage", "documentMessage"])
    if (c[k] && c[k].caption) return c[k].caption;
  if (c.documentMessage) return c.documentMessage.fileName || "";
  if (c.locationMessage) {
    const l = c.locationMessage;
    return `📍 ${l.degreesLatitude}, ${l.degreesLongitude}`;
  }
  if (c.contactMessage) return `👤 ${c.contactMessage.displayName || ""}`.trim();
  return "";
}

// Só o que a gente sabe guardar, de gente de verdade, uma a uma.
// Grupo fica de fora de propósito: conversa de escritório com cliente é
// individual, e grupo entraria como enxurrada sem dono.
function deveIgnorar(m) {
  if (!m || !m.message || !m.key) return true;
  const jid = m.key.remoteJid;
  if (!jid || ehGrupo(jid) || ehStatus(jid)) return true;
  if (jid === "status@broadcast") return true;
  const c = miolo(m);
  if (TIPOS_MUDOS.some(t => c[t]) && !tipoDaMensagem(m)) return true;
  return tipoDaMensagem(m) === null;
}

// Nome de arquivo que não vira dor de cabeça no Storage nem no navegador
function nomeSeguro(nome, tipo, mime) {
  // o Storage recusa acento no caminho ("Invalid key"): só ASCII
  let n = String(nome || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim()
    .replace(/[^\w.-]+/g, "_").slice(0, 80);
  if (!n) {
    const ext = String(mime || "").split("/")[1] || "bin";
    n = `${tipo || "arquivo"}.${ext.split(";")[0]}`;
  }
  return n;
}

// O relógio do WhatsApp vem em segundos (e às vezes como objeto Long)
function quandoWa(m) {
  const t = m && m.messageTimestamp;
  const s = (t && typeof t === "object" && typeof t.toNumber === "function")
    ? t.toNumber() : Number(t);
  if (!s || !isFinite(s)) return null;
  return new Date(s * 1000).toISOString();
}

// O histórico que o WhatsApp entrega ao conectar traz TODAS as conversas do
// celular. Só entra o que é de cliente: o resto (fornecedor, família, grupo)
// não é assunto do CRM. Conversa com id de privacidade (@lid) acha o número
// pelo pnJid que vem na própria conversa. Devolve Map fone -> mensagens em
// ordem de data, para a prévia terminar na mais recente.
function agruparHistorico(chats, mensagens, chavesClientes) {
  const pn = new Map();
  for (const c of chats || []) {
    if (String(c.id).endsWith("@lid") && c.pnJid) pn.set(c.id, c.pnJid);
    if (c.lidJid && String(c.id).endsWith("@s.whatsapp.net")) pn.set(c.lidJid, c.id);
  }
  const grupos = new Map();
  for (const m of mensagens || []) {
    if (deveIgnorar(m)) continue;
    const jid = String(m.key.remoteJid);
    // senderPn só vale para o que o cliente mandou: no que saiu daqui, é o nosso número
    const alvo = jid.endsWith("@lid") ? (pn.get(jid) || (!m.key.fromMe && m.key.senderPn)) : jid;
    if (!alvo || String(alvo).endsWith("@lid")) continue;
    const fone = jidParaFone(alvo);
    if (!chavesClientes.has(chaveFone(fone))) continue;
    if (!grupos.has(fone)) grupos.set(fone, []);
    grupos.get(fone).push(m);
  }
  for (const l of grupos.values()) l.sort((a, b) => (quandoWa(a) || "") < (quandoWa(b) || "") ? -1 : 1);
  return grupos;
}

module.exports = { soDigitos, chaveFone, ehGrupo, ehStatus, jidParaFone, foneDaMensagem, agruparHistorico,
                   miolo, tipoDaMensagem, textoDaMensagem, deveIgnorar,
                   nomeSeguro, quandoWa };
