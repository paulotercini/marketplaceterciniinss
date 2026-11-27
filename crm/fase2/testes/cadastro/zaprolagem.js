const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
// F687 · no celular a lista de conversas não volta ao topo na volta de 6 s; volta sem novidade não troca o DOM. Dados fictícios.
const DIR = require("path").join(__dirname, "..", "..");
const { FIX, SESSAO } = require(DIR + "/testes/cadastro/fixturas");
const SUPA = "https://ficticio.supabase.co", agora = new Date().toISOString();
const convs = Array.from({length:40},(_,i)=>({ id:`d3000000-0000-0000-0000-0000000000${String(i).padStart(2,"0")}`, telefone:"55000000000"+String(i).padStart(2,"0"), chave:"0000"+i, nome_perfil:"Cliente Teste "+i, status:"aberta", nao_lidas:0, ultima_em:agora, ultimo_texto:"oi" }));
(async () => {
  const s = http.createServer((q, r) => { const a = path.join(DIR, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end(); } r.writeHead(200,{"Content-Type":"text/html; charset=utf-8"}); r.end(fs.readFileSync(a)); }).listen(0,"127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport:{width:390,height:780}, isMobile:true, hasTouch:true });
  await ctx.addInitScript(([u, ss]) => { localStorage.setItem("crm_cfg", JSON.stringify({url:u,key:"a".repeat(60)})); localStorage.setItem("crm_sessao", JSON.stringify(ss)); localStorage.setItem("crm_tema","v10"); }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => { const u = decodeURIComponent(rota.request().url()), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({status:200,contentType:"application/json",body:JSON.stringify(SESSAO)});
    if (m !== "GET") return rota.fulfill({status:200,contentType:"application/json",body:/zap_painel/.test(u)?'{"totais":{},"setores":[],"atendentes":[]}':"[]"});
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/)||[])[1];
    const corpo = t==="zap_conversas"?convs : t==="zap_mensagens"?[] : (FIX[t]||[]);
    return rota.fulfill({status:200,contentType:"application/json",body:JSON.stringify(corpo)}); });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado.celular");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);   // espera de boot (LEIAME): sem ela, irPara corria antes do carregar()
  await p.evaluate(() => { zapFiltro = "todas"; irPara("whatsapp"); });
  await p.waitForSelector(".zap-conv");
  await p.waitForTimeout(500);
  await p.evaluate(()=>{window.MUT=0;new MutationObserver(()=>MUT++).observe(document.querySelector(".zap-lado"),{childList:true});});
  const cdp = await ctx.newCDPSession(p);
  await cdp.send("Input.synthesizeScrollGesture",{x:195,y:600,yDistance:-1500,speed:3000}); await p.waitForTimeout(400);
  const antes = await p.evaluate(() => document.querySelector(".meio").scrollTop);
  await p.waitForTimeout(7000);
  const m1 = await p.evaluate(()=>MUT);
  convs[5].nao_lidas = 2; convs[5].ultimo_texto = "novo";
  await p.waitForTimeout(7000);
  const m2 = await p.evaluate(()=>MUT), depois = await p.evaluate(() => document.querySelector(".meio").scrollTop);
  const ok = [["a lista rolou", antes > 500], ["volta sem novidade não repinta", m1 === 0],
    ["mensagem nova repinta", m2 > 0], ["a rolagem fica onde estava", depois === antes]];
  ok.forEach(([n,v])=>console.log((v?"✔ ":"✘ FALHA ")+n));
  const passou = ok.filter(([,v])=>v).length; console.log(`${passou}/${ok.length} passaram`);
  await nav.close(); s.close(); process.exit(passou === ok.length ? 0 : 1);
})();
