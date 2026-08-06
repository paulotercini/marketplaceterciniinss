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
  let n = String(nome || "").trim().replace(/[/\\?%*:|"<>\s]+/g, "_").slice(0, 80);
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

module.exports = { soDigitos, chaveFone, ehGrupo, ehStatus, jidParaFone,
                   miolo, tipoDaMensagem, textoDaMensagem, deveIgnorar,
                   nomeSeguro, quandoWa };
