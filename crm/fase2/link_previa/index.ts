// PRÉVIA DO LINK · Edge Function `link_previa` (F328)
//
// O balão do WhatsApp do CRM mostra o link enviado com o título, a descrição e a imagem do site,
// como no aplicativo. O navegador não lê outro site (CORS), por isso esta função busca a página,
// lê as etiquetas og:/twitter:/<title> e devolve só elas. Somente colaborador ativo do escritório,
// somente http(s), sem endereço interno, até 3 redirecionamentos, 512 KB e 6 segundos.
//
// Pedido: POST { url }   Resposta: { titulo, descricao, imagem, site } ou { erro }
const ENV = typeof Deno !== "undefined" ? Deno.env : { get: (_: string) => "" };
const URL_SB = (ENV.get("SUPABASE_URL") || "").replace(/\/$/, "");
const ANON = ENV.get("SUPABASE_ANON_KEY") || "";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...cors } });

// endereço que a função pode buscar: http(s) na porta padrão, nome público (nada de IP, localhost ou rede interna)
export function urlPermitida(s: string): URL | null {
  let u: URL;
  try { u = new URL(s); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password || (u.port && !["80", "443"].includes(u.port))) return null;
  const h = u.hostname.toLowerCase().replace(/\.$/, "");
  if (!h.includes(".") || /^[\d.]+$/.test(h) || h.includes(":") || h.startsWith("[")) return null;
  if (/(^|\.)(localhost|local|internal|intranet|lan|home|corp|supabase\.co|supabase\.in)$/.test(h)) return null;
  return u;
}

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const desEnt = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) =>
  e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e.toLowerCase()] ?? m);
const limpo = (s: string | undefined, n: number) => s ? desEnt(s).replace(/\s+/g, " ").trim().slice(0, n) : "";

// lê as etiquetas da página; a imagem relativa vira absoluta pelo endereço final
export function lerMeta(html: string, base: string) {
  const cab = html.slice(0, 200000);
  const meta: Record<string, string> = {};
  for (const tag of cab.match(/<meta\b[^>]*>/gi) || []) {
    const at = (n: string) => (new RegExp(`\\b${n}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag) || []).slice(2).find((x) => x != null);
    const k = (at("property") || at("name") || "").toLowerCase(), v = at("content");
    if (k && v != null && !(k in meta)) meta[k] = v;
  }
  const titulo = limpo(meta["og:title"] || meta["twitter:title"] || (/<title[^>]*>([^<]*)<\/title>/i.exec(cab) || [])[1], 200);
  const descricao = limpo(meta["og:description"] || meta["twitter:description"] || meta["description"], 300);
  let imagem = limpo(meta["og:image"] || meta["og:image:url"] || meta["twitter:image"], 1000);
  try { imagem = imagem ? new URL(imagem, base).href : ""; } catch { imagem = ""; }
  if (imagem && !/^https:/.test(imagem)) imagem = "";            // a página do CRM é https: imagem http não carrega
  const site = limpo(meta["og:site_name"], 80) || new URL(base).hostname.replace(/^www\./, "");
  return { titulo, descricao, imagem, site };
}

async function buscar(inicio: URL) {
  let u = inicio;
  for (let i = 0; i < 4; i++) {
    const r = await fetch(u, { redirect: "manual", signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CRM-Tercini link preview)", Accept: "text/html,application/xhtml+xml" } });
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
      const prox = urlPermitida(new URL(r.headers.get("location")!, u).href);
      await r.body?.cancel();
      if (!prox) throw new Error("redirecionamento para endereço não permitido");
      u = prox; continue;
    }
    if (!r.ok) throw new Error(`o site respondeu ${r.status}`);
    if (!/html/i.test(r.headers.get("content-type") || "")) { await r.body?.cancel(); return { url: u.href, html: "" }; }
    const leitor = r.body!.getReader(), partes: Uint8Array[] = [];
    let total = 0;
    while (total < 512 * 1024) { const { done, value } = await leitor.read(); if (done) break; partes.push(value); total += value.length; }
    await leitor.cancel().catch(() => {});
    const tudo = new Uint8Array(total); let p = 0; for (const x of partes) { tudo.set(x.subarray(0, total - p), p); p += x.length; }
    return { url: u.href, html: new TextDecoder().decode(tudo) };
  }
  throw new Error("redirecionamentos demais");
}

if (typeof Deno !== "undefined") Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const auth = { apikey: ANON, Authorization: `Bearer ${token}` };
  const u = await fetch(`${URL_SB}/auth/v1/user`, { headers: auth });
  if (!u.ok) return json({ erro: "sessão vencida — entre de novo no CRM" }, 401);
  const user = await u.json();
  const eu = await (await fetch(`${URL_SB}/rest/v1/colaboradores?select=id,ativo&auth_id=eq.${user.id}`, { headers: auth })).json().catch(() => []);
  if (!eu[0] || eu[0].ativo === false) return json({ erro: "só colaborador ativo do escritório" }, 403);
  const { url } = await req.json().catch(() => ({}));
  const alvo = urlPermitida(String(url || ""));
  if (!alvo) return json({ erro: "endereço não permitido" }, 400);
  try {
    const { url: final, html } = await buscar(alvo);
    return json(html ? lerMeta(html, final) : { titulo: "", descricao: "", imagem: "", site: new URL(final).hostname.replace(/^www\./, "") });
  } catch (e) { return json({ erro: String((e as Error).message || e) }, 502); }
});
