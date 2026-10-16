// PORTAL DA TRANSPARÊNCIA · Edge Function `transparencia` (F230)
//
// O botão "Consultar os integrantes" do bloco CadÚnico do Primeiro atendimento
// chama esta função com a lista de CPF/NIS da família. A API de dados abertos
// do Portal da Transparência não aceita chamada direta do navegador (sem CORS),
// e a chave da API fica aqui, no segredo TRANSPARENCIA_CHAVE, e não no
// aparelho de cada colaborador. O resultado vai para clientes.dossie.transparencia
// no MESMO formato que a extensão Dossiê grava (regras.js, textoTransparencia),
// com o token do colaborador que pediu (a mesma permissão do CRM no navegador).
// Não grava o .txt no Drive: isso só a extensão, com o programa do computador.
//
// Pedido: POST { cliente_id, pessoas: [{ nome, cpf, nis }] }
// Resposta: { aviso, pessoas } ou { erro }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const URL_SB = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
// shortcut: o segredo foi salvo no painel como "Portal Transparência" (16.10.2026); some quando ele for renomeado
const CHAVE = Deno.env.get("TRANSPARENCIA_CHAVE") || Deno.env.get("Portal Transparência") || Deno.env.get("Portal") || "";
const TRANSP = "https://api.portaldatransparencia.gov.br/api-de-dados/";
const ENDPOINTS: Record<string, string> = {
  bpc: "bpc-por-cpf-ou-nis?codigo=", novo_bolsa_familia: "novo-bolsa-familia-sacado-por-cpf-ou-nis?codigo=",
  bolsa_familia: "bolsa-familia-sacado-por-cpf-ou-nis?codigo=", auxilio_brasil: "auxilio-brasil-sacado-por-cpf-ou-nis?codigo=",
  auxilio_emergencial: "auxilio-emergencial-por-cpf-ou-nis?codigoBeneficiario=", safra: "safra-codigo-por-cpf-ou-nis?codigo=",
  seguro_defeso: "seguro-defeso-codigo?codigo=",
};
const PROGRAMAS: Record<string, string> = { bpc: "BPC", novo_bolsa_familia: "Bolsa Família (novo, desde 03/2023)", bolsa_familia: "Bolsa Família (até 2021)",
  auxilio_brasil: "Auxílio Brasil (2021–2023)", auxilio_emergencial: "Auxílio Emergencial", safra: "Garantia-Safra", seguro_defeso: "Seguro-Defeso" };
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...cors } });
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));
const soDig = (s: unknown) => String(s ?? "").replace(/\D/g, "");

type Pessoa = { nome?: string; cpf?: string | null; nis?: string | null };

// o resumo por pessoa, igual ao de regras.js (textoTransparencia), para a ficha
// ler os dois do mesmo jeito
export function resumir(pessoas: Pessoa[], resultados: Record<string, any>) {
  return pessoas.map((p) => {
    const r = resultados[p.cpf || p.nis || ""] || {}, prog = r.programas || {};
    const linha: any = { nome: p.nome, cpf: p.cpf || null, nis: p.nis || null, erro: r.erro || null, programas: [] };
    for (const [k, rot] of Object.entries(PROGRAMAS)) {
      const itens: any[] = [].concat(prog[k] || []);
      if (!itens.length) continue;
      const compDe = (i: any) => soDig(i.dataMesCompetencia || i.dataMesReferencia || i.mesDisponibilizacao);
      const comps = itens.map(compDe).filter(Boolean).sort();
      const valores = itens.map((i) => i.valor ?? i.valorSaque).filter((v) => v != null);
      const ult = itens.find((i) => compDe(i) === comps[comps.length - 1]) || itens[0];
      const judicial = itens.some((i) => i.concedidoJudicialmente === true || /sim/i.test(String(i.concedidoJudicialmente || "")));
      const rl0 = (ult.beneficiario && ult.beneficiario.nomeRepresentanteLegal) || null;
      const rl = rl0 && rl0.trim().toUpperCase() !== String(p.nome || "").trim().toUpperCase() ? rl0 : null;
      linha.programas.push({ programa: k, rotulo: rot, meses: itens.length, primeira_competencia: comps[0] || null, ultima_competencia: comps[comps.length - 1] || null,
        valor_ultimo: ult.valor ?? ult.valorSaque ?? null, total: valores.reduce((a: number, b: any) => a + Number(b || 0), 0),
        concedido_judicialmente: judicial || null, representante_legal: rl,
        municipio: ult.municipio ? `${ult.municipio.nomeIBGE || ""}/${(ult.municipio.uf || {}).sigla || ""}` : null });
    }
    return linha;
  });
}

async function consultar(pessoas: Pessoa[]) {
  const resultados: Record<string, any> = {};
  let parou: string | null = null;
  for (const p of pessoas) {
    const codigo = p.cpf || p.nis || "";
    resultados[codigo] = { pessoa: { nome: p.nome, cpf: p.cpf || null, nis: p.nis || null }, programas: {} };
    for (const [k, ep] of Object.entries(ENDPOINTS)) {
      if (parou) break;
      const itens: any[] = [];
      for (let pagina = 1; pagina <= 30; pagina++) {
        const r = await fetch(`${TRANSP}${ep}${encodeURIComponent(codigo)}&pagina=${pagina}`, { headers: { "chave-api-dados": CHAVE, Accept: "application/json" } }).catch(() => null);
        await pausa(700);
        if (!r) { resultados[codigo].erro = "sem resposta"; break; }
        if (r.status === 429) { parou = "a API limitou as consultas (429) — tente de novo em alguns minutos"; break; }
        if (r.status === 401 || r.status === 403) { parou = `a chave da API foi recusada (${r.status}) — confira o segredo TRANSPARENCIA_CHAVE no Supabase`; break; }
        if (!r.ok) { resultados[codigo].erro = `${k}: HTTP ${r.status}`; break; }
        const j = await r.json().catch(() => []);
        const lista = Array.isArray(j) ? j : [];
        itens.push(...lista);
        if (lista.length < 15) break;                                 // a API pagina de 15 em 15
      }
      if (itens.length) resultados[codigo].programas[k] = itens;
    }
    if (parou) { resultados[codigo].erro = parou; break; }
  }
  return { resultados, parou };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  // sem o segredo, diz quais nomes a função enxerga (só os nomes, nunca os valores)
  if (!CHAVE) return json({ erro: `falta o segredo TRANSPARENCIA_CHAVE na função (Supabase › Edge Functions › Secrets); segredos visíveis: ${Object.keys(Deno.env.toObject()).filter((k) => !/^SUPABASE_|^DENO_|^HOME$|^PATH$/.test(k)).join(", ") || "nenhum"}` }, 500);
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const auth = { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const u = await fetch(`${URL_SB}/auth/v1/user`, { headers: auth });
  if (!u.ok) return json({ erro: "sessão vencida — entre de novo no CRM" }, 401);
  const user = await u.json();
  const eu = await (await fetch(`${URL_SB}/rest/v1/colaboradores?select=id,ativo&auth_id=eq.${user.id}`, { headers: auth })).json().catch(() => []);
  if (!eu[0] || eu[0].ativo === false) return json({ erro: "só colaborador ativo do escritório" }, 403);

  const m = await req.json().catch(() => ({}));
  const pessoas: Pessoa[] = (m.pessoas || []).map((p: any) => ({ nome: p.nome, cpf: soDig(p.cpf).length === 11 ? soDig(p.cpf) : null, nis: soDig(p.nis).length === 11 ? soDig(p.nis) : null }))
    .filter((p: Pessoa) => p.cpf || p.nis).slice(0, 20);
  if (!m.cliente_id || !pessoas.length) return json({ erro: "pedido sem cliente ou sem CPF/NIS" }, 400);
  const { resultados, parou } = await consultar(pessoas);
  const resumo = resumir(pessoas, resultados);
  // grava em clientes.dossie.transparencia, trocando só essa chave (como a extensão)
  const [cli] = await (await fetch(`${URL_SB}/rest/v1/clientes?select=dossie&id=eq.${encodeURIComponent(m.cliente_id)}`, { headers: auth })).json().catch(() => []);
  if (!cli) return json({ erro: "cliente não encontrado" }, 404);
  const dossie = Object.assign({}, cli.dossie || {}, { transparencia: { em: new Date().toISOString(), baixados: [], inexistentes: [], falhas: parou ? [parou] : [], pessoas: resumo, origem: "crm" } });
  const g = await fetch(`${URL_SB}/rest/v1/clientes?id=eq.${encodeURIComponent(m.cliente_id)}`, { method: "PATCH", headers: { ...auth, Prefer: "return=minimal" }, body: JSON.stringify({ dossie }) });
  if (!g.ok) return json({ erro: `o banco não gravou (${g.status})` }, 500);
  const comPagamento = resumo.filter((p) => p.programas.length).length;
  return json({ ok: true, pessoas: resumo, aviso: `Portal da Transparência: ${pessoas.length} integrante(s) consultado(s), ${comPagamento} com pagamento${parou ? " — " + parou : ""}` });
});
