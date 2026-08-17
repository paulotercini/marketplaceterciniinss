// F40 — nada da importação entra calado. O julgamento com data "24/08/26
// 14:20" é reconhecido, o 📌 dar seguimento sugere lembrar no dia seguinte
// útil, a linha ⏰ PRAZO manda o caso para 🗓 Tarefas com Prazo, e o
// "é o mesmo — juntar" ingere na hora comentários e agendamentos da coleta,
// tudo passando por 📣 Novidades. E o 📋 copia o nome do cliente.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const NOV = "a0000000-0000-0000-0000-00000000f401";
FIX.andamentos = FIX.andamentos || [];
FIX.andamentos.push({ id: NOV, caso_id: CASO1, origem: "pat", origem_id: "novtest",
  criado_em: "2026-08-17T09:00:00Z", andamentos_lidos: [],
  texto: "Encaminhado para julgamento - Agendado para 24/08/26 14:20 - 25ª Junta de Recursos" });

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
  }, [SUPA, SESSAO]);
  const escritos = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      const corpo = JSON.parse(rota.request().postData() || "{}");
      escritos.push({ m, t, corpo });
      const rep = /return=representation/.test(JSON.stringify(rota.request().headers()));
      return rota.fulfill({ status: rep ? 201 : 204, contentType: "application/json",
        body: rep ? JSON.stringify([{ id: "n" + escritos.length, ...corpo }]) : "" });
    }
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error") erros.push("console: " + m.text()); });
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  // 1) o julgamento com ano de 2 dígitos é reconhecido
  const ev = await p.evaluate(() =>
    eventoNoTexto("Encaminhado para julgamento - Agendado para 24/08/26 14:20"));
  conf("eventoNoTexto lê julgamento com ano de 2 dígitos",
    ev && ev.tipo === "Julgamento" && ev.data === "2026-08-24" && ev.hora === "14:20");

  // 2) a novidade aparece em 📣 com o botão nomeado e o 📋 do nome
  await p.evaluate(() => { visao = "novidades"; render(); });
  await p.waitForTimeout(400);
  conf("a novidade do julgamento está na caixa 📣",
    await p.evaluate(() => document.querySelector(".nov[data-and]") !== null));
  conf("o botão de seguimento é visível e nomeado",
    (await p.$$eval(".nov .btn-mini", bs => bs.map(b => b.textContent))).some(t => /dar seguimento/.test(t)));
  conf("a novidade tem o 📋 de copiar o nome",
    await p.evaluate(() => !!document.querySelector(".nov .nov-cli .olho")));

  // 3) o modal: lembrar já sugerido para o dia seguinte útil, chips e ⏰ PRAZO
  await p.click('.nov button:has-text("dar seguimento")');
  await p.waitForTimeout(400);
  conf("o modal abre com a anotação pré-escrita em bom português",
    /o julgamento foi agendado/.test(await p.inputValue("#seg-txt")));
  conf("LEMBRAR já vem sugerido para o dia seguinte útil (25.08)",
    (await p.inputValue("#seg-data")) === "2026-08-25");
  conf("os atalhos véspera / dia seguinte existem",
    await p.evaluate(() => [...document.querySelectorAll(".modal-cx .btn-mini")]
      .filter(b => /véspera|dia seguinte/.test(b.textContent)).length >= 2));
  conf("a linha ⏰ PRAZO existe", await p.evaluate(() => !!document.getElementById("seg-prazo")));

  // 4) preencher o PRAZO e registrar: anotação [PRAZO] + caso para 🗓
  await p.fill("#seg-prazo", "2026-09-01");
  escritos.length = 0;
  await p.click('.modal-cx button:has-text("Registrar")');
  await p.waitForTimeout(800);
  const andPrazo = escritos.find(x => x.m === "POST" && x.t === "andamentos" && /\[PRAZO 01\.09\.2026\]/.test(x.corpo.texto || ""));
  conf("a anotação sai prefixada ⏰ [PRAZO 01.09.2026]", andPrazo);
  const patPrazo = escritos.find(x => x.m === "PATCH" && x.t === "casos" && x.corpo.mover_para === "🗓 Tarefas com Prazo");
  conf("o caso vai para 🗓 Tarefas com Prazo com a data fatal",
    patPrazo && patPrazo.corpo.prazo === "2026-09-01" && patPrazo.corpo.fase === "outro");

  // 5) o "é o mesmo — juntar" ingere AGORA comentários e agendamentos
  escritos.length = 0;
  const antesNovid = await p.evaluate(() => (D.novid || []).length);
  await p.evaluate(([caso]) => {
    arquivoPat = { detalhes: [{ protocolo: "9990001", situacao: "Em análise",
      comentarios: [{ id: "cm1", quando: "2026-08-16", do_inss: true, texto: "<p>Agendado julgamento do recurso</p>" }],
      eventos: [{ tipo: "Julgamento", ativo: true, data: "2026-08-24", hora: "14:20", local: "25ª Junta" }] }] };
    planoPat = { possiveisDuplicados: [{ protocolo: "9990001", caso_id: caso,
      situacao: "Em análise", link: null, der: null, especie: null }], resumo: {} };
    return juntarAoCaso("9990001");
  }, [CASO1]);
  await p.waitForTimeout(800);
  const comIng = escritos.find(x => x.m === "POST" && x.t === "andamentos" && /Agendado julgamento do recurso/.test(x.corpo.texto || ""));
  conf("o comentário da coleta entra na hora (não na próxima importação)",
    comIng && comIng.corpo.origem === "pat" && comIng.corpo.origem_id === "cm1");
  conf("o agendamento vira evento na aba 🩺",
    escritos.some(x => x.m === "POST" && x.t === "eventos" && /2026-08-24T14:20/.test(x.corpo.data_hora || "")));
  const evNov = escritos.find(x => x.m === "POST" && x.t === "andamentos" && /📅 Julgamento agendado no INSS para 24\.08\.2026 às 14:20/.test(x.corpo.texto || ""));
  conf("o agendamento também vira linha em 📣 (com concordância certa)", evNov);
  const notícia = escritos.find(x => x.m === "POST" && x.t === "andamentos" && /juntado a este caso/.test(x.corpo.texto || ""));
  conf("a notícia do juntar conta o que entrou",
    notícia && /1 comentário\(s\) e 1 agendamento\(s\) já entraram em 📣/.test(notícia.corpo.texto));
  conf("as novidades novas já estão na memória (sem F5)",
    (await p.evaluate(() => (D.novid || []).length)) >= antesNovid + 3);

  // 6) o 📋 do nome na ficha
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(800);
  conf("a ficha tem o 📋 de copiar o nome ao lado do nome",
    await p.evaluate(() => !!document.querySelector('.linha1 button[title="copiar o nome do cliente"]')));
  await (await p.$(".linha1")).screenshot({ path: path.join(__dirname, "f40-copiar-nome.png") });

  console.log("=== novidades da importação (F40) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
