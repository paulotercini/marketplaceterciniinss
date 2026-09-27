// Roda o Code.gs de verdade (crm/agenda-quarta) em Node, com dublês do
// Google (Calendar, LockService, PropertiesService, Utilities). Serve às
// provas da agenda de quarta: o CRM conversa com a MESMA lógica que irá ao ar.
const vm = require("vm"), fs = require("fs"), path = require("path");
function criarAgenda(tokens){
  const eventos = [];            // {id, calendario, summary, start:{dateTime|date}, end, transparency, extendedProperties, status}
  let seq = 0;
  const SP = d => new Date(d.getTime() - 3*3600e3);   // America/Sao_Paulo, sem horário de verão
  const p2 = n => String(n).padStart(2,"0");
  const Utilities = {
    getUuid: () => "tok-" + (++seq),
    formatDate(d, tz, f){ const x = SP(d);
      const Y=x.getUTCFullYear(), M=p2(x.getUTCMonth()+1), D=p2(x.getUTCDate()), h=p2(x.getUTCHours()), m=p2(x.getUTCMinutes());
      if(f==="HH:mm") return `${h}:${m}`; if(f==="yyyy-MM-dd") return `${Y}-${M}-${D}`;
      if(f==="u") return String(x.getUTCDay()||7); if(f==="dd/MM/yyyy HH:mm") return `${D}/${M}/${Y} ${h}:${m}`; return x.toISOString(); },
  };
  const ini = ev => new Date(ev.start.dateTime || (ev.start.date+"T00:00:00-03:00"));
  const fim = ev => new Date(ev.end.dateTime || (ev.end.date+"T23:59:00-03:00"));
  const Calendar = { Events: {
    list(cal, pr){
      let l = eventos.filter(e=>e.calendario===(cal==="primary"?"primary":cal) && e.status!=="cancelled");
      if(pr.timeMin) l = l.filter(e=>fim(e) > new Date(pr.timeMin));
      if(pr.timeMax) l = l.filter(e=>ini(e) < new Date(pr.timeMax));
      if(pr.privateExtendedProperty){ const [k,v]=pr.privateExtendedProperty.split("=");
        l = l.filter(e=>((e.extendedProperties||{}).private||{})[k]===v); }
      l.sort((a,b)=>ini(a)-ini(b));
      return { items: JSON.parse(JSON.stringify(l)) };
    },
    insert(ev, cal){ const n = {...JSON.parse(JSON.stringify(ev)), id:"ev"+(++seq), calendario:cal, status:"confirmed"}; eventos.push(n); return JSON.parse(JSON.stringify(n)); },
    get(cal, id){ const e = eventos.find(x=>x.id===id); if(!e) throw new Error("Not Found"); return JSON.parse(JSON.stringify(e)); },
    patch(parc, cal, id){ const e = eventos.find(x=>x.id===id); Object.assign(e, parc); return JSON.parse(JSON.stringify(e)); },
    remove(cal, id){ const i = eventos.findIndex(x=>x.id===id); if(i>=0) eventos.splice(i,1); },
  }};
  const props = { TOKENS: JSON.stringify(tokens) };
  const ctx = vm.createContext({
    Utilities, Calendar, Logger:{log(){}},
    PropertiesService:{ getScriptProperties:()=>({ getProperty:k=>props[k], setProperty:(k,v)=>{props[k]=v;} }) },
    LockService:{ getScriptLock:()=>({ tryLock:()=>true, releaseLock(){} }) },
    ContentService:{ MimeType:{JSON:"json"}, createTextOutput:t=>({ t, setMimeType(){ return this; } }) },
    Date, JSON, Math, Number, String, Set, Error, Object,
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,"..","..","..","agenda-quarta","Code.gs"),"utf8"), ctx);
  const chamar = corpo => JSON.parse(ctx.doPost({ postData:{ contents: corpo } }).t);
  const evento = (data, hi, hf, titulo, extra={}) => eventos.push({ id:"m"+(++seq), calendario:"primary", status:"confirmed", summary:titulo,
    start:{dateTime:`${data}T${hi}:00-03:00`}, end:{dateTime:`${data}T${hf}:00-03:00`}, ...extra });
  const diaInteiro = (cal, data, titulo) => eventos.push({ id:"d"+(++seq), calendario:cal, status:"confirmed", summary:titulo, start:{date:data}, end:{date:data} });
  return { chamar, evento, diaInteiro, eventos };
}
// as próximas quartas, em AAAA-MM-DD
function quartas(n){ const r=[]; const d=new Date(Date.now()-3*3600e3); d.setUTCHours(12);
  while(r.length<n){ if(d.getUTCDay()===3) r.push(d.toISOString().slice(0,10)); d.setUTCDate(d.getUTCDate()+1); } return r; }
module.exports = { criarAgenda, quartas };
