// F558 · os flutuantes se arrastam (pedido do Paulo, 12.11.2026): o arrasto move e guarda a posição no aparelho, o clique simples continua abrindo,
// o botão não sai da tela, e o celular tem posição própria. Banco simulado e dados fictícios. Uso: node f558.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais", "atribuicoes", "casos"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app,
  clientes: [{ id: "c0000000-0000-4000-8000-000000000001", nome: "Cliente Teste", cpf: null, telefone: null, campos: {}, telefones: [], criado_em: "2026-01-01T12:00:00-03:00" }] });
const banco = new Banco(dados);
const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); return !!v; };

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const URL = `http://127.0.0.1:${s.address().port}/app.html?tema=v10`;
  const nav = await chromium.launch();
  const erros = [];
  const abrir = async (opc) => {
    const ctx = await nav.newContext(opc);
    await ctx.addInitScript(([u, ss]) => {
      if (sessionStorage.getItem("f558")) return; sessionStorage.setItem("f558", "1");
      localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
      localStorage.setItem("crm_sessao", JSON.stringify(ss));
      localStorage.setItem("crm_tema", "v10");
    }, [SUPA, SESSAO]);
    await instalarBanco(ctx, { SUPA, SESSAO, banco });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    const p = await ctx.newPage();
    p.on("pageerror", e => erros.push(e.message));
    p.on("dialog", d => d.accept());
    await p.goto(URL);
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.evaluate(() => irPara("meudia")); await p.waitForTimeout(800);
    return p;
  };
  const caixa = (p, sel) => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, sel);
  const modal = p => p.evaluate(() => { const m = document.getElementById("modal"); return !!m && m.innerHTML.trim().length > 0 && getComputedStyle(m).display !== "none"; });
  const fecharModal = p => p.evaluate(() => { try { fecharModal(); } catch (e) {} });

  // 1 · computador, mouse
  const p = await abrir({ viewport: { width: 1280, height: 800 } });
  const a0 = await caixa(p, "#fab-sug");
  await p.mouse.move(a0.x + a0.w / 2, a0.y + a0.h / 2); await p.mouse.down();
  await p.mouse.move(a0.x - 200, a0.y - 300, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(150);
  const a1 = await caixa(p, "#fab-sug");
  conf("o arrasto do mouse move o ✎ Sugestões", a0.x - a1.x > 170 && a0.y - a1.y > 250);
  conf("o arrasto não abre as Sugestões", !(await modal(p)));
  const salvo = await p.evaluate(() => JSON.parse(localStorage.getItem("crm_fab_pos") || "{}"));
  conf("a posição fica guardada no aparelho (crm_fab_pos)", Array.isArray(salvo["fab-sug"]));
  await p.click("#fab-sug"); await p.waitForTimeout(300);
  conf("o clique simples continua abrindo as Sugestões", await modal(p));
  await fecharModal(p); await p.waitForTimeout(200);
  await p.reload(); await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0); await p.waitForTimeout(600);
  const a2 = await caixa(p, "#fab-sug");
  conf("ao recarregar, o botão volta ao lugar escolhido", Math.abs(a2.x - a1.x) < 3 && Math.abs(a2.y - a1.y) < 3);
  const r0 = await caixa(p, "#fab-rapida");
  await p.mouse.move(r0.x + r0.w / 2, r0.y + r0.h / 2); await p.mouse.down();
  await p.mouse.move(-500, 2000, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(150);
  const r1 = await caixa(p, "#fab-rapida");
  conf("o botão arrastado para fora fica dentro da tela", r1.x >= 0 && r1.y + r1.h <= 800 && r1.x + r1.w <= 1280 && r1.y >= 0);
  await p.setViewportSize({ width: 900, height: 600 }); await p.waitForTimeout(300);
  const r2 = await caixa(p, "#fab-rapida");
  conf("a tela menor puxa o botão para dentro", r2.y + r2.h <= 600 && r2.x + r2.w <= 900);
  await p.setViewportSize({ width: 1280, height: 800 }); await p.waitForTimeout(200);
  const g0 = await p.evaluate(() => { const e = document.querySelector("#zap-ag .zag-pilula"); return e && e.offsetParent ? (r => ({ x: r.left, y: r.top, w: r.width, h: r.height }))(e.getBoundingClientRect()) : null; });
  if (g0) {
    await p.mouse.move(g0.x + g0.w / 2, g0.y + g0.h / 2); await p.mouse.down();
    await p.mouse.move(g0.x - 300, g0.y - 200, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(200);
    const g1 = await caixa(p, "#zap-ag .zag-pilula");
    conf("a Agenda se arrasta pela pílula sem abrir", g0.x - g1.x > 250 && !(await p.evaluate(() => !!document.querySelector("#zap-ag .zag-cx"))));
  } else conf("a pílula da Agenda está à vista no Meu Dia", false);

  // 2 · celular, toque
  const c = await abrir({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const t0 = await caixa(c, "#fab-sug");
  const cdp = await c.context().newCDPSession(c);
  const toque = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  let x = t0.x + t0.w / 2, y = t0.y + t0.h / 2;
  await toque("touchStart", x, y);
  for (let i = 1; i <= 8; i++) await toque("touchMove", x - i * 20, y - i * 30);
  await c.waitForTimeout(300); await toque("touchEnd"); await c.waitForTimeout(200);  // o dedo para antes de soltar, sem fling que engula o toque seguinte
  const t1 = await caixa(c, "#fab-sug");
  conf("no celular, o toque arrasta o ✎ Sugestões", t0.y - t1.y > 180 && t0.x - t1.x > 120);
  conf("o arrasto do toque não abre as Sugestões", !(await modal(c)));
  const pc = await c.evaluate(() => [JSON.parse(localStorage.getItem("crm_fab_pos_cel") || "{}"), JSON.parse(localStorage.getItem("crm_fab_pos") || "{}")]);
  conf("o celular guarda a posição à parte (crm_fab_pos_cel)", Array.isArray(pc[0]["fab-sug"]) && !pc[1]["fab-sug"]);
  await c.waitForTimeout(400); await c.tap("#fab-sug"); await c.waitForTimeout(900);
  conf("o toque simples continua abrindo as Sugestões", await modal(c)) || console.log(await c.evaluate(() => { const r = document.querySelector("#fab-sug").getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2); return [r.left, r.top, r.width, e && (e.id || e.className), document.getElementById("modal").innerHTML.length, getComputedStyle(document.getElementById("modal")).display]; }));

  conf("sem erro de página", !erros.length) || console.log(erros);
  await nav.close(); s.close();
  const n = ok.filter(o => o[1]).length;
  console.log(`\n${n}/${ok.length}`);
  process.exit(n === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
