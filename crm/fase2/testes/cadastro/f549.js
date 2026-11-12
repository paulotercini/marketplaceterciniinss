// F549 · a tela 🩺 Perícias e os lembretes D-7, D-1 e outra data em dias úteis (pedido do Paulo, 12.11.2026).
// Banco simulado e dados fictícios. Uso: node f549.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const PAULO = FIX.colaboradores[0].id;
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: [], casos: [], atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [],
  modelos_documento: FIX.modelos_documento, config_app: (FIX.config_app || []).filter(r => !/^pericia_/.test(r.chave)) });
const banco = new Banco(dados);
const T = banco.t;
const iso = n => new Date(Date.now() - 3 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const cli = (nome, tel) => { const c = { id: id("c"), nome, cpf: null, telefone: tel, campos: {}, telefones: [], criado_em: iso(-400) + "T12:00:00-03:00" }; T.clientes.push(c); return c; };
const caso = (c, fase) => { const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, origem_lista: "🌻 INSS", fase, beneficio: "Aux. Incapacidade",
  criado_em: iso(-300) + "T12:00:00-03:00" }; T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO }); return k; };
const ev = (k, tipo, n, status = "agendada") => T.eventos.push({ id: id("e"), caso_id: k.id, tipo, data_hora: `${iso(n)}T09:30:00-03:00`, local: "APS Fictícia", status, obs: null });
const kA = caso(cli("Cliente Teste Perícia", "5500000000001"), "inss"); ev(kA, "Perícia", 20);
const kB = caso(cli("Cliente Teste Social", "5500000000002"), "inss"); ev(kB, "Avaliação social", 12);
const kC = caso(cli("Cliente Teste Encerrado", "5500000000003"), "encerrado"); ev(kC, "Perícia", 15);
const kD = caso(cli("Cliente Teste Audiência", "5500000000004"), "judicial"); ev(kD, "Audiência", 10);
ev(kA, "Perícia", 30, "cancelada");

const ok = [];
const conf = (nome, v) => { ok.push(!!v); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); return !!v; };
(async () => {
  const s = http.createServer((q, r) => { const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a)); }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([u, ss]) => { localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss)); localStorage.setItem("crm_tema", "v10"); }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = []; p.on("pageerror", e => erros.push(e.message));
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  // dias úteis: 20/11 é feriado nacional, 21 e 22/11/2026 são fim de semana
  const u = await p.evaluate(() => [uteisAntes("2026-11-23", 1), uteisAntes("2026-11-23", 7), uteisAntes("2026-11-03", 1)]);
  conf("dias úteis pulam feriado e fim de semana", u.join() === "2026-11-19,2026-11-11,2026-10-30") || console.log(u);
  conf("o menu tem a 🩺 Perícias", await p.evaluate(() => !!document.querySelector('.lista-item[data-v="pericias"]')));
  await p.evaluate(() => irPara("pericias")); await p.waitForTimeout(600);
  const l = await p.evaluate(() => [...document.querySelectorAll(".per-lista .evento strong")].map(e => e.textContent));
  conf("lista só a perícia e a avaliação social agendadas de caso aberto", l.length === 2 && /Avaliação social/.test(l[0]) && /Perícia/.test(l[1])) || console.log(l);
  conf("nasce desligado, sem chip de lembrete", await p.evaluate(() => !document.querySelector(".per-lem") && !document.querySelector("[data-pa].on")));
  await p.click('[data-pa="pericia_aviso_d7"]'); await p.waitForTimeout(400);
  await p.click('[data-pa="pericia_aviso_d1"]'); await p.waitForTimeout(400);
  const g = T.config_app.filter(r => /^pericia_aviso_d/.test(r.chave)).map(r => r.chave + "=" + r.valor).sort().join();
  conf("os botões gravam no config_app", g === "pericia_aviso_d1=sim,pericia_aviso_d7=sim") || console.log(g);
  const ch = await p.evaluate(() => [...document.querySelectorAll(".per-lem")].map(e => e.textContent.replace(/\s+/g, " ").trim()));
  const esp = await p.evaluate(n => { const d = dataSP(D.eventos.find(e => e.tipo === "Perícia" && e.status === "agendada" && diasAte(dataSP(e.data_hora)) > 18).data_hora);
    return ["D-7", "D-1"].map((r, i) => r + " · " + fmt(uteisAntes(d, [7, 1][i])).slice(0, 5)); });
  conf("a perícia mostra as datas dos lembretes", ch.length === 2 && esp.every(x => ch[1].includes(x))) || console.log(ch, esp);
  await p.click('[data-pa="pericia_aviso_d7"]'); await p.waitForTimeout(400);
  conf("desligar volta a nao", T.config_app.findLast(r => r.chave === "pericia_aviso_d7").valor === "nao");
  await p.fill("#per-outra-n", "4"); await p.dispatchEvent("#per-outra-n", "change"); await p.waitForTimeout(400);
  await p.click('[data-pa="pericia_aviso_outra"]'); await p.waitForTimeout(400);
  conf("Outra grava a quantidade de dias", T.config_app.findLast(r => r.chave === "pericia_aviso_outra_dias").valor === "4"
    && await p.evaluate(() => /D-4/.test(document.querySelector(".per-lem").textContent)));
  conf("sem erro de página", !erros.length) || console.log(erros.slice(0, 3));
  console.log(`${ok.filter(Boolean).length}/${ok.length} passaram`);
  await nav.close(); s.close(); process.exit(ok.every(Boolean) ? 0 : 1);
})();
