// F421 · aplica as coletas da extensão no servidor, sem depender do CRM aberto (pedido do Paulo, 07.11.2026).
// Só abre o navegador quando há coleta esperando. Entra como o administrador por um link de uso único
// gerado com a service key (nenhum e-mail é enviado) e abre o CRM publicado com ?coletas=robo, que roda
// o mesmo autoAplicarColetas do CRM aberto: mesma regra, mesma trava, o que pede escolha vai às Novidades.
const { chromium } = require("playwright");
const URL_ = (process.env.SUPABASE_URL||"").replace(/\/$/,""), SK = process.env.SUPABASE_SERVICE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
const CRM = process.env.CRM_URL || "https://paulotercini.github.io/marketplaceterciniinss/crm/";
const h = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function j(path, opt={}){
  const r = await fetch(URL_+path, { ...opt, headers: { ...h, ...(opt.headers||{}) } });
  if(!r.ok) throw new Error(`${path.split("?")[0]} ${r.status} ${(await r.text()).slice(0,200)}`);
  return r.json();
}
(async () => {
  if(!URL_ || !SK || !ANON) return console.log("::notice::Segredos ausentes; robô das coletas pulado.");
  const pend = await j("/rest/v1/coletas?aplicada_em=is.null&select=id,fonte");
  if(!pend.length) return console.log("Nenhuma coleta esperando.");
  console.log(`${pend.length} coleta(s) esperando: ${pend.map(c=>c.fonte).join(", ")}`);
  const [adm] = await j("/rest/v1/colaboradores?papel=eq.admin&ativo=eq.true&auth_id=not.is.null&select=auth_id&limit=1");
  if(!adm) throw new Error("sem administrador ativo");
  const { email } = await j(`/auth/v1/admin/users/${adm.auth_id}`);
  const link = await j("/auth/v1/admin/generate_link", { method:"POST", body: JSON.stringify({ type:"magiclink", email }) });
  const tk = link.hashed_token || link.properties?.hashed_token;
  const sessao = await j("/auth/v1/verify", { method:"POST", headers:{ apikey: ANON, Authorization:`Bearer ${ANON}` },
    body: JSON.stringify({ type:"magiclink", token_hash: tk }) });
  if(!sessao.access_token) throw new Error("verify sem sessão");
  const nav = await chromium.launch();
  try{
    const pg = await nav.newPage();
    await pg.addInitScript(([cfg, s]) => { localStorage.setItem("crm_cfg", cfg); localStorage.setItem("crm_sessao", s); },
      [JSON.stringify({ url: URL_, key: ANON }), JSON.stringify(sessao)]);
    pg.on("pageerror", e => console.log("erro na página:", e.message));
    await pg.goto(CRM + "?coletas=robo");
    await pg.waitForFunction(() => window._coletasRobo && window._coletasRobo !== "rodando", null, { timeout: 8*60*1000 });
    const fim = await pg.evaluate(() => window._coletasRobo);
    const resta = await j("/rest/v1/coletas?aplicada_em=is.null&select=id");
    console.log(`Robô: ${fim}; ${pend.length - resta.length} aplicada(s), ${resta.length} na fila.`);
    if(fim !== "ok") process.exitCode = 1;
  } finally { await nav.close(); }
})().catch(e => { console.error(e.message); process.exit(1); });
