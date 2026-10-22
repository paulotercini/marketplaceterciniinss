// O Google Agenda simulado para os testes da agenda: roda o Code.gs DE VERDADE (crm/agenda-quarta) numa VM com um
// Calendar em memória (list, get, patch, insert, remove), as propriedades do script (tokens) e o fuso de Brasília.
// Assim o teste confere o script e a tela juntos, e não respostas prontas. Dados fictícios.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const CODE = path.join(__dirname, "..", "..", "..", "agenda-quarta", "Code.gs");
const p2 = n => String(n).padStart(2, "0");
// a data e a hora em Brasília (UTC-3, sem horário de verão)
function emBrasilia(d){ const x = new Date(d.getTime() - 3 * 3600e3);
  return { a: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate(), h: x.getUTCHours(), mi: x.getUTCMinutes(), dow: x.getUTCDay() }; }
function formatDate(d, tz, f){
  const b = emBrasilia(d);
  if (f === "HH:mm") return `${p2(b.h)}:${p2(b.mi)}`;
  if (f === "yyyy-MM-dd") return `${b.a}-${p2(b.m)}-${p2(b.d)}`;
  if (f === "u") return String(b.dow === 0 ? 7 : b.dow);
  if (f === "dd/MM/yyyy HH:mm") return `${p2(b.d)}/${p2(b.m)}/${b.a} ${p2(b.h)}:${p2(b.mi)}`;
  throw new Error("formato não simulado: " + f);
}
const copia = o => JSON.parse(JSON.stringify(o));

function criarGoogle({ eventos = [], tokens = {} } = {}){
  let seq = 0;
  const evs = eventos.map(e => ({ status: "confirmed", extendedProperties: { private: {} }, ...e, id: e.id || "ev" + (++seq) }));
  const props = { TOKENS: JSON.stringify(tokens) };
  const ms = e => new Date(e.start.dateTime).getTime();
  const Calendar = { Events: {
    list(cal, q){
      if (cal !== "primary") return { items: [] };
      let r = evs.filter(e => e.status !== "cancelled");
      if (q.timeMin) r = r.filter(e => !e.start.dateTime || new Date(e.end.dateTime) > new Date(q.timeMin));
      if (q.timeMax) r = r.filter(e => !e.start.dateTime || new Date(e.start.dateTime) < new Date(q.timeMax));
      if (q.privateExtendedProperty){ const [k, v] = q.privateExtendedProperty.split("=");
        r = r.filter(e => ((e.extendedProperties || {}).private || {})[k] === v); }
      return { items: copia(r.sort((a, b) => ms(a) - ms(b))) };
    },
    get(cal, id){ const e = evs.find(x => x.id === id); if (!e) throw new Error("Not Found"); return copia(e); },
    patch(res, cal, id){
      const e = evs.find(x => x.id === id); if (!e) throw new Error("Not Found");
      for (const [k, v] of Object.entries(res)){
        if (k === "extendedProperties") e.extendedProperties = { private: { ...((e.extendedProperties || {}).private || {}), ...((v || {}).private || {}) } };
        else e[k] = copia(v);
      }
      return copia(e);
    },
    insert(res){ const e = { status: "confirmed", ...copia(res), id: "ev" + (++seq) }; evs.push(e); return copia(e); },
    remove(cal, id){ const i = evs.findIndex(x => x.id === id); if (i >= 0) evs.splice(i, 1); },
  } };
  const ctx = vm.createContext({
    Calendar, console, JSON, Date, Math, Object, Array, String, Number, RegExp, Error, Set,
    Utilities: { formatDate, getUuid: () => "uuid-" + (++seq) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock(){} }) },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: t => ({ setMimeType: () => ({ texto: t }) }) },
    Logger: { log(){} },
  });
  vm.runInContext(fs.readFileSync(CODE, "utf8"), ctx, { filename: "Code.gs" });
  return {
    eventos: evs,
    post: body => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(body) } }).texto),
    get: q => JSON.parse(ctx.doGet({ parameter: q || {} }).texto),
  };
}
// a próxima data (AAAA-MM-DD, em Brasília) do dia da semana pedido (0 domingo ... 6 sábado), a partir de amanhã
function proximo(dow){ let d = new Date(Date.now() + 86400e3); for (let i = 0; i < 8; i++){ if (emBrasilia(d).dow === dow) break; d = new Date(d.getTime() + 86400e3); }
  return formatDate(d, "", "yyyy-MM-dd"); }
const quando = (data, hm) => ({ dateTime: `${data}T${hm}:00-03:00`, timeZone: "America/Sao_Paulo" });
module.exports = { criarGoogle, proximo, quando };
