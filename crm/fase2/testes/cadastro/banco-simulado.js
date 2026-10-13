// Banco simulado com estado para os testes de fluxo inteiro (F220).
//
// Os testes antigos respondem GET com a fixtura fixa e engolem as escritas:
// servem para conferir uma tela, mas não um percurso em que o caso criado
// precisa reaparecer depois de abrirFicha(). Este módulo guarda as tabelas em
// memória e responde como o PostgREST e o Storage do Supabase: filtros (eq,
// neq, is, in, gt, gte, lt, lte, like, ilike, not, or, ->>), ordem, Range,
// embutidos simples, POST com upsert, PATCH, DELETE, RPC e arquivos. Nada sai
// da máquina; os dados são os fictícios das fixturas.
const crypto = require("crypto");

const PADROES = {
  casos: () => ({ fase: "escritorio", protocolos: [], processos: [], crps_nups: [], nbs: [], marcadores: [], arquivados: {},
    ronda: {}, pje_links: {}, sinais_cnj: {}, prazos_tribunal: [], importante: false, urgente: false,
    dcb_prorrogacao_pedida: false, renda_acima_minimo: false, encerrado_em: null }),
  andamentos: () => ({ origem: "app", publico: false, todo_sync: false, excluir: false, importante: false, urgente: false }),
  tarefas: () => ({ concluida: false }),
  lembretes: () => ({ ativo: true, crm: {}, detalhes: {} }),
  clientes: () => ({ campos: {}, telefones: [] }),
  mencoes: () => ({ lida_em: null }),
};
const COM_DATA = new Set(["casos", "andamentos", "tarefas", "lembretes", "clientes", "mencoes", "anexos", "aposentadorias",
  "analises_direito", "eventos", "pagamentos", "leads", "andamento_tarefas", "conversas", "coletas", "sugestoes"]);

const sing = t => t.replace(/oes$/, "ao").replace(/ais$/, "al").replace(/s$/, "");
const valorDe = (row, col) => {
  const m = /^([a-z_]+)->>?([a-z_]+)$/.exec(col);
  if (m) { const o = row[m[1]]; return o && typeof o === "object" ? o[m[2]] : undefined; }
  return row[col];
};
const texto = v => v === null || v === undefined ? null : typeof v === "object" ? JSON.stringify(v) : String(v);
function compara(a, b) {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  const na = Number(a), nb = Number(b);
  if (a !== "" && b !== "" && !isNaN(na) && !isNaN(nb) && typeof a !== "boolean") return na - nb;
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}
function casa(row, col, expr) {
  let neg = false;
  if (expr.startsWith("not.")) { neg = true; expr = expr.slice(4); }
  const i = expr.indexOf("."), op = expr.slice(0, i), val = decodeURIComponent(expr.slice(i + 1));
  const v = valorDe(row, col);
  let r;
  switch (op) {
    case "eq": r = texto(v) === val || (typeof v === "boolean" && String(v) === val); break;
    case "neq": r = texto(v) !== val; break;
    case "is": r = val === "null" ? (v === null || v === undefined) : val === "true" ? v === true : val === "false" ? v === false : false; break;
    case "in": { const xs = val.replace(/^\(|\)$/g, "").split(",").map(x => x.replace(/^"|"$/g, "")); r = xs.includes(texto(v)); break; }
    case "gt": r = v !== null && v !== undefined && compara(v, val) > 0; break;
    case "gte": r = v !== null && v !== undefined && compara(v, val) >= 0; break;
    case "lt": r = v !== null && v !== undefined && compara(v, val) < 0; break;
    case "lte": r = v !== null && v !== undefined && compara(v, val) <= 0; break;
    case "like": case "ilike": {
      const rx = new RegExp("^" + val.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/%/g, ".*") + "$", op === "ilike" ? "i" : "");
      r = v !== null && v !== undefined && rx.test(texto(v)); break;
    }
    case "cs": { try { const alvo = JSON.parse(val.replace(/^\{/, "[").replace(/\}$/, "]")); r = Array.isArray(v) && alvo.every(x => v.map(String).includes(String(x))); } catch (e) { r = false; } break; }
    default: r = true;
  }
  return neg ? !r : r;
}
// "(a.eq.1,b.is.null,and(c.eq.2,d.eq.3))" -> lista de condições
function partes(s) {
  const out = []; let nivel = 0, atual = "";
  for (const ch of s) {
    if (ch === "(") nivel++;
    if (ch === ")") nivel--;
    if (ch === "," && nivel === 0) { out.push(atual); atual = ""; continue; }
    atual += ch;
  }
  if (atual) out.push(atual);
  return out;
}
function avaliaLogico(row, tipo, corpo) {
  const conds = partes(corpo.replace(/^\(|\)$/g, ""));
  const um = c => {
    const m = /^(and|or)\((.*)\)$/.exec(c);
    if (m) return avaliaLogico(row, m[1], "(" + m[2] + ")");
    const i = c.indexOf(".");
    return casa(row, c.slice(0, i), c.slice(i + 1));
  };
  return tipo === "or" ? conds.some(um) : conds.every(um);
}
function filtrar(rows, params) {
  return rows.filter(row => {
    for (const [k, v] of params) {
      if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(k)) continue;
      if (k === "or" || k === "and") { if (!avaliaLogico(row, k, v)) return false; continue; }
      if (!casa(row, k, v)) return false;
    }
    return true;
  });
}
function ordenar(rows, order) {
  if (!order) return rows;
  const regras = order.split(",").map(x => { const [col, ...mods] = x.split("."); return { col, desc: mods.includes("desc") }; });
  return rows.slice().sort((a, b) => {
    for (const r of regras) {
      const c = compara(valorDe(a, r.col), valorDe(b, r.col));
      if (c) return r.desc ? -c : c;
    }
    return 0;
  });
}

class Banco {
  constructor(dados) {
    this.t = {};
    for (const [nome, linhas] of Object.entries(dados || {})) this.t[nome] = JSON.parse(JSON.stringify(linhas || []));
    this.arquivos = new Map();
    this.escritas = [];
  }
  tabela(n) { return this.t[n] || (this.t[n] = []); }
  novaLinha(tab, corpo) {
    const base = PADROES[tab] ? PADROES[tab]() : {};
    const l = { ...base, ...corpo };
    if (!l.id && tab !== "andamentos_lidos" && tab !== "colaborador_setores" && tab !== "atribuicoes") l.id = crypto.randomUUID();
    if (COM_DATA.has(tab) && !l.criado_em) l.criado_em = new Date().toISOString();
    return l;
  }
  embutir(tab, rows, select) {
    const emb = [...String(select || "").matchAll(/([a-z_]+)\(([^)]*)\)/g)].map(m => m[1]);
    if (!emb.length) return rows;
    return rows.map(r => {
      const o = { ...r };
      for (const e of emb) {
        const fk = sing(tab) + "_id", outra = this.tabela(e);
        if (outra.some(x => fk in x) || !(sing(e) + "_id" in r)) o[e] = outra.filter(x => x[fk] === r.id);
        else o[e] = outra.find(x => x.id === r[sing(e) + "_id"]) || null;
      }
      return o;
    });
  }
  responder(metodo, url, cabecalhos, corpoTxt) {
    const u = new URL(url), caminho = u.pathname;
    const params = [...u.searchParams.entries()];
    const prefer = String(cabecalhos.prefer || "");
    const json = (status, corpo, extra) => ({ status, contentType: "application/json", body: corpo === undefined ? "" : JSON.stringify(corpo), headers: extra });
    if (caminho.startsWith("/auth/v1/")) return null;   // quem chamou responde a sessão
    if (caminho.startsWith("/functions/v1/")) return json(200, {});
    // ── Storage ──
    let m = /^\/storage\/v1\/object\/sign\/([^/]+)\/(.+)$/.exec(caminho);
    if (m && metodo === "POST") return json(200, { signedURL: `/object/sign/${m[1]}/${m[2]}?token=simulado` });
    if (m && metodo === "GET") {
      const a = this.arquivos.get(decodeURIComponent(`${m[1]}/${m[2]}`));
      return a ? { status: 200, contentType: a.tipo, body: a.corpo } : { status: 404, contentType: "text/plain", body: "não achei" };
    }
    m = /^\/storage\/v1\/object\/(?:public\/)?([^/]+)\/(.+)$/.exec(caminho);
    if (m) {
      const chave = decodeURIComponent(`${m[1]}/${m[2]}`);
      if (metodo === "POST" || metodo === "PUT") {
        this.arquivos.set(chave, { tipo: cabecalhos["content-type"] || "application/octet-stream", corpo: corpoTxt || "" });
        this.escritas.push({ m: metodo, t: "storage", chave });
        return json(200, { Key: chave });
      }
      const a = this.arquivos.get(chave);
      return a ? { status: 200, contentType: a.tipo, body: a.corpo } : { status: 404, contentType: "text/plain", body: "não achei" };
    }
    // ── RPC ──
    m = /^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(caminho);
    if (m) { this.escritas.push({ m: metodo, t: "rpc:" + m[1] }); return json(200, null); }
    m = /^\/rest\/v1\/([a-z_]+)$/.exec(caminho);
    if (!m) return json(404, { message: "rota desconhecida" });
    const tab = m[1], linhas = this.tabela(tab);
    const select = (params.find(p => p[0] === "select") || [])[1];
    const repr = /return=representation/.test(prefer);
    let corpo = null;
    if (corpoTxt) { try { corpo = JSON.parse(corpoTxt); } catch (e) { corpo = null; } }
    if (metodo === "GET" || metodo === "HEAD") {
      let rows = ordenar(filtrar(linhas, params), (params.find(p => p[0] === "order") || [])[1]);
      const lim = +((params.find(p => p[0] === "limit") || [])[1] || 0), off = +((params.find(p => p[0] === "offset") || [])[1] || 0);
      const rg = /^(\d+)-(\d+)$/.exec(cabecalhos.range || "");
      if (rg) rows = rows.slice(+rg[1], +rg[2] + 1);
      else { if (off) rows = rows.slice(off); if (lim) rows = rows.slice(0, lim); }
      return json(200, this.embutir(tab, rows, select));
    }
    if (metodo === "POST") {
      const lista = Array.isArray(corpo) ? corpo : [corpo || {}];
      const conflito = ((params.find(p => p[0] === "on_conflict") || [])[1] || "").split(",").filter(Boolean);
      const out = [];
      for (const c of lista) {
        const chave = conflito.length ? conflito : (c.id ? ["id"] : []);
        const exist = chave.length ? linhas.find(l => chave.every(k => texto(l[k]) === texto(c[k]))) : null;
        if (exist) {
          if (/ignore-duplicates/.test(prefer)) continue;
          if (/merge-duplicates/.test(prefer) || conflito.length) { Object.assign(exist, c); out.push(exist); continue; }
          return json(409, { code: "23505", message: `duplicate key value violates unique constraint (${tab})` });
        }
        const nova = this.novaLinha(tab, c);
        linhas.push(nova); out.push(nova);
      }
      this.escritas.push({ m: "POST", t: tab, corpo, linhas: out.map(x => x.id) });
      return repr ? json(201, out) : json(201, undefined);
    }
    if (metodo === "PATCH") {
      const alvo = filtrar(linhas, params);
      for (const l of alvo) Object.assign(l, corpo || {});
      this.escritas.push({ m: "PATCH", t: tab, corpo, ids: alvo.map(x => x.id), url: u.search });
      return repr ? json(200, alvo) : json(204, undefined);
    }
    if (metodo === "DELETE") {
      const alvo = new Set(filtrar(linhas, params));
      this.t[tab] = linhas.filter(l => !alvo.has(l));
      this.escritas.push({ m: "DELETE", t: tab, ids: [...alvo].map(x => x.id) });
      return json(204, undefined);
    }
    return json(405, { message: "método" });
  }
}

// liga o banco ao contexto do Playwright: devolve o banco para o teste ler o estado.
// Vários contextos (uma pessoa da equipe em cada) podem dividir o MESMO banco.
async function instalarBanco(ctx, { SUPA, SESSAO, dados, banco: dado }) {
  const banco = dado || new Banco(dados);
  await ctx.route(SUPA + "/**", rota => {
    const q = rota.request(), u = q.url();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(/\/user$/.test(u) ? SESSAO.user : SESSAO) });
    const r = banco.responder(q.method(), u, q.headers(), q.postData());
    return rota.fulfill(r);
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  return banco;
}

module.exports = { Banco, instalarBanco, filtrar, casa };
