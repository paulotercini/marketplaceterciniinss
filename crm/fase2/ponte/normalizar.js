// O que o WhatsApp manda e o que o CRM guarda são coisas diferentes. Aqui
// vive só a tradução — funções puras, sem rede e sem banco, para poderem ser
// testadas sem WhatsApp nenhum. Toda a parte que fala com o mundo está em
// ponte.js.

const soDigitos = t => String(t || "").replace(/\D/g, "");

// os 8 últimos dígitos, a mesma régua do fone_chave() do banco: é o que faz
// +55 (00) 90000-0001, 5500900000001 e 00900000001 serem a mesma pessoa
const chaveFone = t => soDigitos(t).slice(-8);

const ehGrupo = jid => String(jid || "").endsWith("@g.us");
const ehStatus = jid => String(jid || "").startsWith("status@");

// '5500900000001@s.whatsapp.net' -> '5500900000001'
const jidParaFone = jid => soDigitos(String(jid || "").split("@")[0].split(":")[0]);

// O WhatsApp passou a esconder o número de parte dos contatos atrás de um id
// de privacidade ('100000000000001@lid'). Esse id não é telefone: não acha o
// cliente e não serve para responder. O número verdadeiro vem ao lado, em
// key.remoteJidAlt (Baileys 7; no 6 era key.senderPn); sem ele, fica o id, que ao menos guarda a conversa.
// No que SAI do escritório (fromMe), o senderPn do Baileys 6 é o nosso número: aí o número do
// cliente vem do `mapa` lid -> telefone, que se aprende com o que ele mandou.
// Sem mapa, devolve "" (não dá para saber de quem é a conversa).
const foneDaMensagem = (m, mapa) => {
  const k = (m && m.key) || {};
  let jid = String(k.remoteJid || "");
  let altJid = k.remoteJidAlt;
  // lista de transmissão: o remoteJid é "<timestamp>@broadcast"; quem escreveu está em participant
  if (jid.endsWith("@broadcast") && jid !== "status@broadcast") {
    if (k.fromMe) return "";
    jid = String(k.participant || "");
    altJid = k.participantAlt;
    if (!jid) return "";
  }
  if (!jid.endsWith("@lid")) return jidParaFone(jid);
  const alt = String(altJid || "");
  if (alt.endsWith("@s.whatsapp.net")) { if (mapa) mapa.set(jid, alt); return jidParaFone(alt); }
  if (!k.fromMe && k.senderPn) { if (mapa) mapa.set(jid, k.senderPn); return jidParaFone(k.senderPn); }
  if (mapa && mapa.has(jid)) return jidParaFone(mapa.get(jid));
  return k.fromMe ? "" : jidParaFone(jid);
};

// chegou há pouco? (o lote 'append' da reconexão traz o recente misturado ao antigo)
const recente = (m, ms, agora = Date.now()) => {
  const q = quandoWa(m); return !!q && agora - new Date(q).getTime() <= ms;
};

// Mensagem que não é conversa: recibo de entrega, reação, apagamento, chave
// de criptografia. Entra no fluxo do Baileys e não pode virar linha na tela.
const TIPOS_MUDOS = ["protocolMessage", "reactionMessage", "senderKeyDistributionMessage",
                     "messageContextInfo", "secretEncryptedMessage", "pollUpdateMessage", "encReactionMessage", "keepInChatMessage",
                     "pinInChatMessage", "encEventResponseMessage", "albumMessage", "placeholderMessage",
                     "messageHistoryBundle", "stickerSyncRmrMessage"];

function miolo(m) {
  // o conteúdo real pode vir embrulhado uma ou duas vezes
  let c = (m && m.message) || {};
  for (let i = 0; i < 3; i++) {
    if (c.ephemeralMessage) { c = c.ephemeralMessage.message || {}; continue; }
    if (c.viewOnceMessage) { c = c.viewOnceMessage.message || {}; continue; }
    if (c.viewOnceMessageV2) { c = c.viewOnceMessageV2.message || {}; continue; }
    if (c.viewOnceMessageV2Extension) { c = c.viewOnceMessageV2Extension.message || {}; continue; }
    if (c.documentWithCaptionMessage) { c = c.documentWithCaptionMessage.message || {}; continue; }
    if (c.deviceSentMessage) { c = c.deviceSentMessage.message || {}; continue; }
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
  // F514: o vídeo em círculo e a resposta de botão ou de lista
  ["ptvMessage", "video"], ["buttonsResponseMessage", "texto"],
  ["listResponseMessage", "texto"], ["templateButtonReplyMessage", "texto"],
  // F632 · mensagem de empresa com botões, modelo, lista ou interativa: o corpo e as opções viram texto
  ["buttonsMessage", "texto"], ["templateMessage", "texto"], ["listMessage", "texto"],
  ["interactiveMessage", "texto"], ["interactiveResponseMessage", "texto"],
];
// F514 · o tipo que a ponte não traduz (enquete, evento, pedido…) sumia sem rastro: agora vira uma linha
// de texto que manda ver no celular. Devolve o nome do campo, ou undefined
const semTraducao = c => Object.keys(c).find(k => c[k] && !TIPOS_MUDOS.includes(k) && !MAPA.some(([x]) => x === k));
const tipoSemTraducao = m => { const c = miolo(m); return MAPA.some(([k]) => c[k]) ? undefined : semTraducao(c); };

function tipoDaMensagem(m) {
  const c = miolo(m);
  for (const [chave, tipo] of MAPA) if (c[chave]) return tipo;
  return semTraducao(c) ? "texto" : null;   // null: nada de conversa (só protocolo)
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
  // F555 · o cartão de contato guarda o nome e o número de cada contato, uma linha por contato ("👤 Nome · 5516…"),
  // que o CRM lê para Conversar, Copiar, Ligar e Cliente; antes só ia o nome e o número se perdia
  if (c.contactMessage) return linhaContato(c.contactMessage);
  if (c.contactsArrayMessage) return (c.contactsArrayMessage.contacts || []).map(linhaContato).join("\n");
  for (const [k, campo] of [["buttonsResponseMessage", "selectedDisplayText"], ["listResponseMessage", "title"],
    ["templateButtonReplyMessage", "selectedDisplayText"]]) if (c[k]) return c[k][campo] || c[k].selectedId || c[k].singleSelectReply?.selectedRowId || "";
  const bt = textoDeBotoes(c);
  // F642 · formato de empresa que os campos conhecidos não cobrem (interactiveMessageTemplate, cabeçalho com imagem…): varre os textos
  if (bt !== null) return bt || textoProfundo(c) || "[mensagem com botões sem texto; veja no celular]";
  const d = tipoSemTraducao(m);
  // F631 · o registro de chamada (o proto escreve callLogMesssage, com três "s") vira texto legível
  if (/^callLogMess?sage$/.test(d || "")) return c[d]?.isVideo ? "📹 Chamada de vídeo" : "📞 Chamada de voz";
  if (d) return `[mensagem que o CRM não exibe (${d.replace(/Message$/, "")}); veja no celular]`;
  return "";
}

// F632 · botões, modelo, lista e interativa: "corpo\nrodapé\nOpções: A · B". Devolve null se não for nenhum deles
const juntar = (partes, opcoes) => {
  const ops = opcoes.map(o => String(o || "").trim()).filter(Boolean);
  return [...partes.map(x => String(x || "").trim()).filter(Boolean), ops.length ? "Opções: " + ops.join(" · ") : ""]
    .filter(Boolean).join("\n");
};
const jsonSeguro = t => { try { return JSON.parse(t || "{}") || {}; } catch { return {}; } };
function textoDeBotoes(c) {
  if (c.buttonsMessage) {
    const b = c.buttonsMessage;
    return juntar([b.text, b.contentText, b.footerText], (b.buttons || []).map(x => x.buttonText?.displayText));
  }
  if (c.templateMessage) {
    const t = c.templateMessage;
    const h = t.hydratedTemplate || t.hydratedFourRowTemplate || t.fourRowTemplate || {};
    // no modelo hidratado displayText é texto; no fourRowTemplate é objeto { text }
    const ops = (h.hydratedButtons || h.buttons || []).map(x => (x.quickReplyButton || x.urlButton || x.callButton || {}).displayText)
      .map(o => typeof o === "string" ? o : o?.text);
    return juntar([h.hydratedTitleText, h.hydratedContentText, h.content?.text, h.hydratedFooterText, h.footer?.text], ops);
  }
  if (c.listMessage) {
    const l = c.listMessage;
    const linhas = (l.sections || []).flatMap(s => (s.rows || []).map(r => r.title));
    return juntar([l.title, l.description, l.footerText], linhas.length ? linhas : [l.buttonText]);
  }
  if (c.interactiveMessage) {
    const i = c.interactiveMessage;
    const ops = (i.nativeFlowMessage?.buttons || []).map(x => jsonSeguro(x.buttonParamsJson).display_text || x.name);
    return juntar([i.header?.title, i.header?.subtitle, i.body?.text, i.footer?.text], ops);
  }
  if (c.interactiveResponseMessage) {
    const r = c.interactiveResponseMessage, p = jsonSeguro(r.nativeFlowResponseMessage?.paramsJson);
    return juntar([r.body?.text || p.display_text || p.title || p.id], []);
  }
  return null;
}

const CHAVES_TEXTO = ["hydratedTitleText", "title", "text", "contentText", "hydratedContentText", "caption", "description",
  "footerText", "hydratedFooterText", "displayText", "display_text"];
function textoProfundo(o, vistos = new Set(), saida = []) {
  if (!o || typeof o !== "object" || vistos.has(o)) return saida.join("\n");
  vistos.add(o);
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === "string" && CHAVES_TEXTO.includes(k) && v.trim() && !saida.includes(v.trim())) saida.push(v.trim());
    else if (k === "buttonParamsJson" || k === "paramsJson") textoProfundo(jsonSeguro(v), vistos, saida);
    else if (v && typeof v === "object" && !ArrayBuffer.isView(v)) textoProfundo(v, vistos, saida);
  }
  return saida.join("\n");
}

// F555 · o número do vCard: o waid (número no WhatsApp) vale mais que o TEL escrito; sem nenhum, só o nome
function numerosDoVcard(vcard) {
  const tels = String(vcard || "").split(/\r?\n/).filter(l => /^(item\d+\.)?TEL/i.test(l));
  const nums = tels.map(l => { const w = l.match(/waid=(\d+)/i); return w ? w[1] : soDigitos(l.split(":").pop()); })
    .filter(n => n && n.length >= 8);
  return [...new Set(nums)];
}
function linhaContato(ct) {
  const nome = String((ct && ct.displayName) || "").replace(/\s+/g, " ").trim()
    || (String((ct && ct.vcard) || "").match(/^FN:(.*)$/mi) || [])[1] || "";
  const nums = numerosDoVcard(ct && ct.vcard);
  return `👤 ${nome}${nums.length ? " · " + nums.join(" · ") : ""}`.trim();
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

// F491 · a mensagem de cliente que chegou cifrada e não abriu (stub CIPHERTEXT, 2): o celular a tem
function naoAbriu(m) {
  if (!m || !m.key || m.message || m.messageStubType !== 2 || m.key.fromMe) return false;
  const jid = String(m.key.remoteJid || "");
  return !!jid && !ehGrupo(jid) && !ehStatus(jid) && jid !== "status@broadcast";
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
    const lista = String(m.key.remoteJid).endsWith("@broadcast");  // lista de transmissão: quem escreveu é o participant
    if (lista && m.key.fromMe) continue;
    const jid = String(lista ? m.key.participant || "" : m.key.remoteJid);
    // senderPn só vale para o que o cliente mandou: no que saiu daqui, é o nosso número
    const altJid = lista ? m.key.participantAlt : m.key.remoteJidAlt;
    const alt = String(altJid || "").endsWith("@s.whatsapp.net") && altJid;
    const alvo = jid.endsWith("@lid") ? (pn.get(jid) || alt || (!m.key.fromMe && m.key.senderPn)) : jid;
    if (!alvo || String(alvo).endsWith("@lid") || String(alvo).endsWith("@broadcast")) continue;
    const fone = jidParaFone(alvo);
    if (!chavesClientes.has(chaveFone(fone))) continue;
    if (!grupos.has(fone)) grupos.set(fone, []);
    grupos.get(fone).push(m);
  }
  for (const l of grupos.values()) l.sort((a, b) => (quandoWa(a) || "") < (quandoWa(b) || "") ? -1 : 1);
  return grupos;
}

// A mensagem que esta responde (o id dela no WhatsApp), quando o cliente cita
function citacaoDe(m) {
  const c = miolo(m);
  for (const k of Object.keys(c)) {
    const id = c[k] && c[k].contextInfo && c[k].contextInfo.stanzaId;
    if (id) return id;
  }
  return null;
}

// Mensagem encaminhada: o forwardingScore (1 quando não vem; 4 ou mais = "encaminhada com frequência")
function encaminhadaDe(m) {
  const c = miolo(m);
  for (const k of Object.keys(c)) {
    const ci = c[k] && c[k].contextInfo;
    if (ci && (ci.isForwarded || ci.forwardingScore > 0)) return Math.min(Number(ci.forwardingScore) || 1, 127);
  }
  return null;
}

// Reação a uma mensagem: { id da mensagem reagida, emoji } ("" = reação retirada)
function reacaoDe(m) {
  const r = m && m.message && m.message.reactionMessage;
  if (!r || !r.key || !r.key.id) return null;
  return { id: r.key.id, emoji: r.text || "" };
}

// F332 · o cliente apagou ou editou a mensagem: chega um protocolMessage com a chave
// da original (tipo 0 = apagar para todos, 14 = editar). Editada traz o texto novo.
const textoEditado = e => (e && (e.conversation || (e.extendedTextMessage && e.extendedTextMessage.text)
  || (e.imageMessage && e.imageMessage.caption) || (e.videoMessage && e.videoMessage.caption))) || "";
// idEditada: o messages.update do Baileys 6.7 já entrega a edição desembrulhada
// ({editedMessage: {message: <conteúdo novo>}}), com o id da original na chave do aviso
function alteracaoDe(m, idEditada) {
  let c = (m && m.message) || {};
  if (c.editedMessage) c = c.editedMessage.message || {};
  // F627 · o Baileys 7 entrega a edição de alguns aparelhos cifrada (secretEncryptedMessage,
  // MESSAGE_EDIT) e não a decifra; marca a original como editada, sem trocar o texto.
  const se = c.secretEncryptedMessage;
  if (se && se.targetMessageKey && se.targetMessageKey.id) {
    const t = se.secretEncType;
    return (t === 2 || t === "MESSAGE_EDIT") ? { id: se.targetMessageKey.id, editadaSemTexto: true } : null;
  }
  const p = c.protocolMessage;
  if (!p || !p.key || !p.key.id) {
    const texto = idEditada ? textoEditado(c) : "";
    return texto ? { id: idEditada, texto } : null;
  }
  const tipo = Number(p.type);
  if (tipo === 0) return { id: p.key.id, apagada: true };
  if (tipo === 14 && p.editedMessage) {
    const texto = textoEditado(p.editedMessage);
    return texto ? { id: p.key.id, texto } : null;
  }
  return null;
}

// O que o Baileys precisa para citar (quoted) ou reagir a uma mensagem nossa
function chaveDaMensagem(jid, original) {
  return { remoteJid: jid, id: original.externo_id, fromMe: original.direcao !== "entrada" };
}

// Ligação recebida (evento "call" do Baileys): só o toque inicial ("offer"),
// fora de grupo. O número vem do jid; atrás de um @lid, do mapa aprendido.
// Sem número conhecido, devolve "" (não dá para responder a um @lid).
const foneDaLigacao = (c, mapa) => {
  if (!c || c.status !== "offer" || c.isGroup) return "";
  for (const j of [c.from, c.chatId]) {
    const jid = String(j || "").replace(/:\d+@/, "@");
    if (jid.endsWith("@s.whatsapp.net")) return jidParaFone(jid);
    if (jid.endsWith("@lid") && mapa && mapa.has(jid)) return jidParaFone(mapa.get(jid));
  }
  return "";
};

// Celular gravado sem o 9 da frente (ou com ele, quando a conta é antiga): o
// WhatsApp acha a pessoa por um dos dois. Fixo (começa de 2 a 5) não muda.
// F593 · gravado sem o 55 (DDD + número) ou com o 0 de discagem (016…), ganha o 55 antes de tudo.
const variantesFone = t => {
  let d = soDigitos(t).replace(/^0(?=[1-9]\d{9,10}$)/, ""); if (d.length <= 11) d = "55" + d;
  const ddd = d.slice(2, 4), loc = d.slice(4), v = [d];
  if (loc.length === 8 && /^[6-9]/.test(loc)) v.push("55" + ddd + "9" + loc);
  else if (loc.length === 9 && loc[0] === "9") v.push("55" + ddd + loc.slice(1));
  return v;
};

module.exports = { variantesFone, soDigitos, chaveFone, ehGrupo, ehStatus, jidParaFone, foneDaMensagem, foneDaLigacao, agruparHistorico,
                   miolo, tipoDaMensagem, tipoSemTraducao, textoDaMensagem, deveIgnorar,
                   nomeSeguro, quandoWa, numerosDoVcard, linhaContato, citacaoDe, encaminhadaDe, reacaoDe, alteracaoDe, chaveDaMensagem, recente, naoAbriu };
