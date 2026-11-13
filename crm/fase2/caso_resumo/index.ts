// RESUMO DO CASO · Edge Function `caso_resumo` (F567, planejamento aprovado pelo Paulo em 11 e 12.11.2026)
//
// O CRM recorta os pedidos da peça do escritório (recurso no CRPS, petição inicial no Judicial) e manda
// só o recorte. O modelo devolve os campos, cada um com o trecho de onde saiu; o código confere que o
// trecho está no recorte e que cada data está no trecho, e o que não confere vai a "faltas" (Não
// localizado). O código monta a frase e os períodos com a duração ("7a 10m"). Nada é gravado aqui.
// Somente colaborador ativo (verify_jwt = true). Número de 8 ou mais dígitos sai mascarado, a data fica.
//
// Pedido: POST { recorte, hoje: "AAAA-MM-DD", fase, der_caso?: "AAAA-MM-DD", beneficio_caso? }
// Resposta: { texto, tipo, beneficio, der, periodos: [{natureza, inicio, fim, ini, fim_iso, local, motivo, dur}], faltas, avisos } · { erro }

const env = (k: string) => (typeof Deno !== "undefined" ? Deno.env.get(k) : undefined) || "";
const URL_SB = env("SUPABASE_URL").replace(/\/$/, "");
const ANON = env("SUPABASE_ANON_KEY");
const CHAVE_IA = env("ANTHROPIC_API_KEY");
const MODELO = env("CASO_RESUMO_MODELO") || "claude-haiku-5-5";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...cors } });

// a data (dd/mm/aaaa, dd.mm.aaaa) fica; CPF, NB e processo saem
const RX_DATA = /\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4}\b/g;
export function mascarar(s: unknown) {
  const datas: string[] = [];
  const t = String(s ?? "").replace(RX_DATA, (m) => `\u0000${datas.push(m) - 1}\u0000`);
  return t.replace(/\d[\d.\-/ ]{6,}\d/g, (m) => (m.replace(/\D/g, "").length >= 8 ? "[número]" : m))
    .replace(/\u0000(\d+)\u0000/g, (_, i) => datas[+i]);
}

const NAT = ["deficiencia", "incapacidade", "rural", "especial", "comum", "revisao", "outro"];
const DATA_DESC = "dd/mm/aaaa, mm/aaaa ou aaaa, exatamente como no trecho, ou vazio";
export const ESQUEMA = {
  type: "object", additionalProperties: false,
  required: ["tipo", "beneficio", "beneficio_trecho", "der", "der_trecho", "objetos"],
  properties: {
    tipo: { type: "string", enum: ["concessao", "restabelecimento", "revisao", "recurso_ordinario", "recurso_especial"] },
    beneficio: { type: "string", description: "o benefício pedido, curto (ex.: aposentadoria da pessoa com deficiência), ou vazio" },
    beneficio_trecho: { type: "string", description: "cópia literal do trecho do recorte que diz o benefício, ou vazio" },
    der: { type: "string", description: "a DER em dd/mm/aaaa, ou vazio" },
    der_trecho: { type: "string", description: "cópia literal do trecho que diz a DER, ou vazio" },
    objetos: {
      type: "array", description: "cada coisa pedida que é período, condição ou revisão, na ordem da peça",
      items: {
        type: "object", additionalProperties: false,
        required: ["natureza", "inicio", "fim", "local", "motivo", "trecho"],
        properties: {
          natureza: { type: "string", enum: NAT },
          inicio: { type: "string", description: DATA_DESC },
          fim: { type: "string", description: DATA_DESC },
          local: { type: "string", description: "empresa, sítio ou lugar do período, curto, ou vazio" },
          motivo: { type: "string", description: "agente nocivo com a medida, doença, função ou o que se revisa, curto, ou vazio" },
          trecho: { type: "string", description: "cópia literal do trecho do recorte de onde saiu este item, com as datas" },
        },
      },
    },
  },
};

export function prompt(recorte: string) {
  return `Você lê os pedidos de uma peça de advocacia previdenciária e devolve apenas o que se pede, sem inventar.
O recorte pode ter duas partes: "[fundamentação]", com os trechos do corpo da peça que citam as datas do pedido, e "[pedido]".
Regras:
- Cada campo vem com o trecho COPIADO LITERALMENTE do recorte. Campo sem trecho fica vazio.
- Datas exatamente como estão no trecho (dd/mm/aaaa, dd.mm.aaaa, mm/aaaa ou aaaa). Não complete dia nem mês que o texto não traz.
- Um objeto por período que o pedido manda reconhecer (rural, especial, comum), com as datas do pedido. A empresa ou o lugar (local) e o agente nocivo ou a função (motivo) você tira da fundamentação, no trecho que cita a mesma data; o trecho do objeto é o da fundamentação quando ele traz as datas e a empresa, senão o do pedido.
- Não liste o período que a peça diz já reconhecido pelo INSS ou na via administrativa.
- Um objeto por condição (deficiência ou incapacidade, com o início).
- Quando a peça pede a revisão de um benefício já concedido, tipo "revisao" e beneficio é o benefício que se revisa (ex.: aposentadoria por tempo de contribuição). Cada resultado pedido vira um objeto "revisao" com motivo curto, começando por artigo (ex.: "a conversão em aposentadoria especial", "a conversão do tempo especial em comum pelo fator 1,4"), e inicio com a data desde quando se pede, se houver; o pedido subsidiário é outro objeto "revisao", depois do principal.
- Não repita o mesmo período. Não inclua pedidos processuais (gratuidade, honorários, citação, prioridade, tutela, correção, juros).

Recorte:
${recorte}`;
}

async function claude(p: string) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": CHAVE_IA, "anthropic-version": "2023-06-01", "anthropic-beta": "server-side-fallback-2026-07-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODELO, max_tokens: 4000, fallbacks: "default",
      output_config: { format: { type: "json_schema", schema: ESQUEMA } },
      messages: [{ role: "user", content: [{ type: "text", text: p }] }],
    }),
  });
  if (!r.ok) throw new Error(`Claude: ${r.status} ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  if (d.stop_reason === "refusal") throw new Error("o modelo recusou este pedido");
  return JSON.parse((d.content || []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join(""));
}

const norm = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const SEP = "\\s*[\\/.\\-]\\s*";

// partes da data: "05/10/1994" → {d:5,m:10,a:1994}; "10/1994" → {m,a}; "1994" → {a}
export function partes(v: string) {
  const s = String(v || "").trim();
  let x;
  if ((x = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/))) return { d: +x[1], m: +x[2], a: +x[3] };
  if ((x = s.match(/^(\d{1,2})[\/.\-](\d{4})$/))) return { m: +x[1], a: +x[2] };
  if ((x = s.match(/^(\d{4})$/))) return { a: +x[1] };
  return null;
}

// a data aparece no trecho, em número ou por extenso ("5 de outubro de 1994")
export function dataNoTrecho(v: string, trecho: string) {
  const p = partes(v); if (!p) return false;
  const t = norm(trecho), z = (n: number) => `0?${n}`;
  const mes = p.m ? `(${z(p.m)}|${MESES[p.m - 1]})` : "";
  const rx = p.d ? `\\b${z(p.d)}(${SEP}${z(p.m!)}${SEP}|\\s*(o|º)?\\s+de\\s+${MESES[p.m! - 1]}\\s+de\\s+)${p.a}\\b`
    : p.m ? `(\\b${z(p.m)}${SEP}|\\b${MESES[p.m - 1]}\\s+(de\\s+)?)${p.a}\\b` : `\\b${p.a}\\b`;
  return new RegExp(rx).test(t) || (!!p.d && !mes);
}

const trechoOk = (trecho: string, base: string) => norm(trecho).length >= 6 && norm(base).includes(norm(trecho));
const z2 = (n: number) => String(n).padStart(2, "0");
const ultimoDia = (a: number, m: number) => new Date(Date.UTC(a, m, 0)).getUTCDate();
// ISO do início (o primeiro dia do que a data diz) e do fim (o último dia)
export function iso(v: string, fim = false) {
  const p = partes(v); if (!p) return "";
  const m = p.m || (fim ? 12 : 1), d = p.d || (fim ? ultimoDia(p.a, m) : 1);
  return `${p.a}-${z2(m)}-${z2(d)}`;
}
const br = (i: string) => (i ? i.slice(8, 10) + "/" + i.slice(5, 7) + "/" + i.slice(0, 4) : "");

// "7a 10m" pelo calendário
export function duracao(ini: string, fim: string) {
  if (!ini || !fim || fim < ini) return "";
  // conta o último dia: 01/01 a 31/12 é um ano
  const f = new Date(fim + "T00:00:00Z"); f.setUTCDate(f.getUTCDate() + 1);
  const [a1, m1, d1] = ini.split("-").map(Number), a2 = f.getUTCFullYear(), m2 = f.getUTCMonth() + 1, d2 = f.getUTCDate();
  let meses = (a2 - a1) * 12 + (m2 - m1);
  if (d2 < d1) meses--;
  const a = Math.floor(meses / 12), m = meses % 12;
  return a ? (m ? `${a}a ${m}m` : `${a}a`) : `${Math.max(m, 0)}m`;
}
const ROT_NAT: Record<string, string> = { deficiencia: "deficiência", incapacidade: "incapacidade", rural: "rural", especial: "especial", comum: "comum", revisao: "revisão", outro: "outro" };
const TIPO_ROT: Record<string, string> = { concessao: "Ação de concessão", restabelecimento: "Ação de restabelecimento", revisao: "Ação de revisão", recurso_ordinario: "Recurso ordinário", recurso_especial: "Recurso especial" };

// o ano civil inteiro (01/01 a 31/12) se diz só pelo ano
function rotDatas(inicio: string, fim: string) {
  const pi = partes(inicio), pf = partes(fim);
  if (pi?.d === 1 && pi.m === 1 && pf?.d === 31 && pf.m === 12) return [String(pi.a), String(pf.a)];
  return [inicio, fim];
}

const PERIODO = ["rural", "especial", "comum"];
function itemPeriodo(o: any) {
  const [i, f] = rotDatas(o.inicio, o.fim);
  const per = i && f ? `de ${i} a ${f}` : i ? `desde ${i}` : "";
  const loc = o.local ? `${o.natureza === "rural" ? " em" : " na"} ${o.local}` : "";
  return `${per}${loc}${o.motivo ? `, por ${o.motivo}` : ""}`.trim();
}
function fraseObjeto(o: any) {
  const [i, f] = rotDatas(o.inicio, o.fim);
  const per = i && f ? `de ${i} a ${f}` : i ? `desde ${i}` : "";
  switch (o.natureza) {
    case "deficiencia": return `deficiência${o.motivo ? ` por ${o.motivo}` : ""}${per ? ` ${per}` : ""}`;
    case "incapacidade": return `incapacidade${o.motivo ? ` por ${o.motivo}` : ""}${per ? ` ${per}` : ""}`;
    case "revisao": return `${o.motivo || "a revisão"}${i ? ` desde ${i}` : ""}`;
    default: return `${o.motivo || "outro pedido"}${per ? ` ${per}` : ""}`;
  }
}
const ROT_GRUPO: Record<string, [string, string]> = { especial: ["do período especial", "dos períodos especiais"], rural: ["do período rural", "dos períodos rurais"], comum: ["do tempo comum", "dos períodos comuns"] };
const juntar = (xs: string[], e = " e ") => (xs.length > 1 ? xs.slice(0, -1).join(", ") + e + xs.at(-1) : xs[0] || "");

// "o reconhecimento dos períodos especiais de A a B na X, por Y, e de C a D …, com a conversão …"
export function montarFrase(tipo: string, beneficio: string, der: string, objetos: any[], teto = 60) {
  const cab = `${tipo}${beneficio ? ` de ${beneficio}` : ""}${der ? ` (DER ${der})` : ""}`;
  const palavras = (s: string) => s.split(/\s+/).filter(Boolean).length;
  const revs = objetos.filter((o) => o.natureza === "revisao").map(fraseObjeto);
  const montar = (lim: number) => {
    let n = 0, cortados = 0;
    const grupos: string[] = [], outros: string[] = [];
    const nats = [...new Set(objetos.filter((o) => PERIODO.includes(o.natureza)).map((o) => o.natureza))];
    for (const nat of nats) {
      const its = objetos.filter((o) => o.natureza === nat).map(itemPeriodo);
      const vai = its.filter(() => (n++ < lim) || (cortados++, false));
      const lista = vai.length < its.length ? vai.join(", ") : juntar(vai, vai.some((v) => v.includes(",")) ? ", e " : " e ");
      if (vai.length) grupos.push(`${ROT_GRUPO[nat][vai.length > 1 ? 1 : 0]} ${lista}`);
    }
    for (const o of objetos.filter((o) => !PERIODO.includes(o.natureza) && o.natureza !== "revisao")) outros.push(fraseObjeto(o));
    const corpo = [grupos.length ? `o reconhecimento ${juntar(grupos, "; e ")}` : "", ...outros].filter(Boolean);
    let t = corpo.length ? `${cab} em que buscamos ${juntar(corpo)}${cortados ? ` e mais ${cortados} ${cortados > 1 ? "períodos" : "período"}` : ""}` : cab;
    if (revs.length) t += `${corpo.length ? ", com" : " em que buscamos"} ${revs.join(" ou, subsidiariamente, ")}`;
    return t + ".";
  };
  const total = objetos.filter((o) => PERIODO.includes(o.natureza)).length;
  for (let lim = total; lim > 1; lim--) { const t = montar(lim); if (palavras(t) <= teto) return t; }
  return montar(Math.min(total, 1));
}

// o que volta do modelo é conferido aqui; o que não confere vai a faltas
export function conferirResposta(r: any, x: { recorte: string; hoje: string; fase: string; der_caso?: string; beneficio_caso?: string }) {
  const faltas: string[] = [], avisos: string[] = [];
  let tipo = TIPO_ROT[r?.tipo] || "Ação de concessão";
  if (x.fase === "conselho" && !/^Recurso/.test(tipo)) tipo = "Recurso ordinário";
  if (x.fase !== "conselho" && /^Recurso/.test(tipo)) tipo = "Ação de concessão";
  const temRevisao = (Array.isArray(r?.objetos) ? r.objetos : []).some((o: any) => o?.natureza === "revisao");
  if (x.fase !== "conselho" && temRevisao) tipo = "Ação de revisão";

  let beneficio = r?.beneficio && trechoOk(r.beneficio_trecho, x.recorte) ? String(r.beneficio).trim() : "";
  if (!beneficio) { beneficio = String(x.beneficio_caso || "").trim(); if (!beneficio) faltas.push("benefício"); }

  const derPeca = r?.der && partes(r.der)?.d && trechoOk(r.der_trecho, x.recorte) && dataNoTrecho(r.der, r.der_trecho) ? r.der : "";
  const derCaso = br(String(x.der_caso || "").slice(0, 10));
  if (derPeca && derCaso && derPeca.replace(/\./g, "/") !== derCaso && iso(derPeca) !== x.der_caso?.slice(0, 10))
    avisos.push(`A peça diz DER ${derPeca}; o caso diz ${derCaso}.`);
  const der = derCaso || (derPeca ? br(iso(derPeca)) : "");
  if (!der) faltas.push("DER");

  const objetos: any[] = [];
  for (const o of Array.isArray(r?.objetos) ? r.objetos : []) {
    const nat = NAT.includes(o?.natureza) ? o.natureza : "outro";
    if (!trechoOk(o?.trecho, x.recorte)) { faltas.push(`${ROT_NAT[nat]} (trecho não localizado na peça)`); continue; }
    const ini = o.inicio && partes(o.inicio) && dataNoTrecho(o.inicio, o.trecho) ? o.inicio.replace(/[.\-]/g, "/") : "";
    const fim = o.fim && partes(o.fim) && dataNoTrecho(o.fim, o.trecho) ? o.fim.replace(/[.\-]/g, "/") : "";
    if ((o.inicio && !ini) || (o.fim && !fim)) { faltas.push(`${ROT_NAT[nat]} (data não confirmada no texto)`); continue; }
    if (!ini && [...PERIODO, "deficiencia", "incapacidade"].includes(nat)) faltas.push(`início do período ${ROT_NAT[nat]}`);
    objetos.push({ natureza: nat, inicio: ini, fim, local: String(o.local || "").trim().slice(0, 80), motivo: String(o.motivo || "").trim().slice(0, 100) });
  }

  const ate = der ? iso(der) : x.hoje;
  // a revisão e o outro pedido não são período: ficam na frase, fora da linha do tempo
  const periodos = objetos.filter((o) => o.inicio && o.natureza !== "revisao" && o.natureza !== "outro").map((o) => {
    const ini = iso(o.inicio), fimIso = o.fim ? iso(o.fim, true) : ate;
    return { ...o, ini, fim_iso: fimIso, dur: duracao(ini, fimIso) };
  });
  return { texto: montarFrase(tipo, beneficio, der, objetos, 110), tipo, beneficio, der, periodos, objetos, faltas, avisos };
}

if (typeof Deno !== "undefined") {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (!CHAVE_IA) return json({ erro: "falta o segredo ANTHROPIC_API_KEY na função" }, 500);
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const auth = { apikey: ANON, Authorization: `Bearer ${token}` };
    const u = await fetch(`${URL_SB}/auth/v1/user`, { headers: auth });
    if (!u.ok) return json({ erro: "sessão vencida, entre de novo no CRM" }, 401);
    const user = await u.json();
    const eu = await (await fetch(`${URL_SB}/rest/v1/colaboradores?select=id,ativo&auth_id=eq.${user.id}`, { headers: auth })).json().catch(() => []);
    if (!eu[0] || eu[0].ativo === false) return json({ erro: "só colaborador ativo do escritório" }, 403);
    const m = await req.json().catch(() => ({}));
    const recorte = mascarar(m.recorte).trim().slice(0, 16000);
    if (recorte.length < 40) return json({ erro: "a peça não tem texto legível" }, 400);
    const hoje = /^\d{4}-\d{2}-\d{2}$/.test(m.hoje || "") ? m.hoje : new Date().toISOString().slice(0, 10);
    const x = { recorte, hoje, fase: String(m.fase || ""), der_caso: /^\d{4}-\d{2}-\d{2}/.test(m.der_caso || "") ? m.der_caso : "", beneficio_caso: String(m.beneficio_caso || "").slice(0, 80) };
    try {
      return json(conferirResposta(await claude(prompt(recorte)), x));
    } catch (e) {
      return json({ erro: String(e).slice(0, 300) }, 500);
    }
  });
}
