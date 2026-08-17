// F41 — anotações e comentários de ponta a ponta: ↩ responder, @ com menu,
// 👥 todos, atendimento na língua do composer (chips multi), lembrete sem
// dono vira lembrete de quem escreveu, frase pronta voltou a nascer, e UM
// predicado de equipe (ativo=null não some de tela nenhuma).
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const EU2 = "22222222-2222-2222-2222-222222222222";
const EU3 = "33333333-3333-3333-3333-333333333333";
FIX.colaboradores.push(
  { id: EU2, auth_id: null, nome: "Marcos Fictício", inicial: "M", cor: "#7a3ccf",
    papel: "user", ativo: true, cargo: "advogado", setor: null },
  // o cadastro incompleto: ativo NULO — antes sumia das telas que filtravam c.ativo
  { id: EU3, auth_id: null, nome: "Ingrid Fictícia", inicial: "I", cor: "#0f7b6c",
    papel: "user", ativo: null, cargo: "secretaria", setor: null });
// as Anotações do atendimento só abrem com a triagem encerrada (F29/F30)
FIX.clientes[1] = { ...FIX.clientes[1], triagem: { atendimento:
  { em: "2026-08-01", quem: EU, passos: 8, conferidos: 8 } } };
const AND1 = "a0000000-0000-0000-0000-00000000f411";
FIX.andamentos = FIX.andamentos || [];
FIX.andamentos.push({ id: AND1, caso_id: CASO1, autor_id: EU2, origem: "app",
  criado_em: "2026-08-16T12:00:00Z", andamentos_lidos: [],
  texto: "Chegou a carta de exigência, precisamos responder até o fim do mês." });

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
  const aviso = () => p.evaluate(() => document.getElementById("aviso").textContent);

  // 0) UM predicado de equipe: a colaboradora com ativo=null CONTA
  conf("equipeAtiva() enxerga os 3 (inclusive ativo=null)",
    (await p.evaluate(() => equipeAtiva().length)) === 3);

  // 1) composer do caso: chips, 👥 todos e +7 dias
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(800);
  conf("os 3 da equipe estão no TAREFA PARA",
    (await p.evaluate(() => document.querySelectorAll("#tf-box .tf-eq").length)) === 3);
  await p.evaluate(() => tfTodos());
  conf("👥 todos seleciona a equipe inteira",
    (await p.evaluate(() => tfQuem.length)) === 3 &&
    (await p.evaluate(() => document.querySelectorAll("#tf-box .tf-eq.on").length)) === 3);
  conf("o atalho +7 dias existe no composer",
    await p.evaluate(() => !!document.querySelector('#tf-box [data-tfd="7"]')));
  await p.evaluate(() => tfDia("7", document.querySelector('#tf-box [data-tfd="7"]')));
  conf("+7 dias marca a data", await p.evaluate(() => !!tfData));

  // registrar para TODOS → uma tarefa por colaborador
  escritos.length = 0;
  await p.fill("#and-texto", "Reunião do caso: todos conferem a sua parte.");
  await p.evaluate(caso => novoAndamento(caso), CASO1);
  await p.waitForTimeout(900);
  conf("nasce UMA tarefa para CADA um dos 3",
    escritos.filter(x => x.m === "POST" && x.t === "andamento_tarefas").length === 3);

  // 2) ↩ responder em qualquer comentário
  await p.waitForTimeout(400);
  conf("o comentário do colega tem o ↩ responder",
    await p.evaluate(() => !!document.querySelector(".timeline .resp-liga")));
  await p.evaluate(id => armarResposta(id), AND1);
  conf("o chip “respondendo a …” aparece sobre o composer",
    await p.evaluate(() => !!document.getElementById("resp-chip")));
  escritos.length = 0;
  await p.fill("#and-texto", "Exigência respondida no protocolo de hoje.");
  await p.evaluate(() => { tfQuem = []; tfData = null; });
  await p.evaluate(caso => novoAndamento(caso), CASO1);
  await p.waitForTimeout(900);
  const respPost = escritos.find(x => x.m === "POST" && x.t === "andamentos");
  conf("a resposta sai com responde_a do comentário original",
    respPost && respPost.corpo.responde_a === AND1);
  conf("registrou e desarmou (o próximo comentário não é resposta)",
    (await p.evaluate(() => respondeA)) === null);

  // 3) o @ com menu — e a menção que não é ninguém avisa
  await p.evaluate(() => menuArroba({ preventDefault(){}, stopPropagation(){}, clientX: 400, clientY: 300 }));
  await p.waitForTimeout(200);
  conf("o menu do @ lista os colegas (sem eu mesmo)",
    (await p.evaluate(() => document.querySelectorAll("#menu-arroba .mm-it").length)) === 2);
  await p.click('#menu-arroba .mm-it >> text=Marcos');
  await p.waitForTimeout(200);
  conf("o clique insere @Marcos no texto",
    /@Marcos\s$/.test(await p.inputValue("#and-texto")));
  escritos.length = 0;
  await p.evaluate(caso => criarMencoes("@Marcos confere isso, por favor", caso, null, []), CASO1);
  await p.waitForTimeout(400);
  conf("a menção ao Marcos é criada",
    escritos.some(x => x.t === "mencoes" && x.corpo.para_id === EU2));
  escritos.length = 0;
  await p.evaluate(caso => criarMencoes("@Zenobio confere isso", caso, null, []), CASO1);
  await p.waitForTimeout(400);
  conf("@ que não é ninguém da equipe: avisa e NÃO cria menção",
    /não é ninguém da equipe/.test(await aviso()) &&
    !escritos.some(x => x.t === "mencoes"));

  // 4) a anotação do atendimento na língua do composer
  await p.evaluate(() => fecharFicha(false));
  await p.evaluate(cli => abrirFicha(cli), CLI_VAZIO);
  await p.waitForTimeout(800);
  conf("os chips PARA estão na anotação do atendimento (3 iniciais)",
    (await p.evaluate(() => document.querySelectorAll(".at-eq").length)) === 3);
  await p.fill("#at-nota", "Separar a certidão rural e ligar avisando do prazo.");
  await p.click('.at-eq[data-atq="' + EU2 + '"]');
  await p.click('.at-eq[data-atq="' + EU3 + '"]');
  await p.click('button:has-text("Amanhã") >> nth=0');
  conf("o atalho de data preencheu o lembrar",
    (await p.evaluate(() => document.getElementById("at-lembrar").value)) !== "");
  escritos.length = 0;
  await p.evaluate(cli => salvarNotaAtendimento2(cli), CLI_VAZIO);
  await p.waitForTimeout(900);
  const patCli = escritos.find(x => x.m === "PATCH" && x.t === "clientes");
  const notas = patCli ? (patCli.corpo.campos || {}).atendimento || [] : [];
  const ultima = notas[notas.length - 1] || {};
  conf("a anotação grava os DOIS atribuídos e o autor",
    (ultima.atribuidos || []).length === 2 && ultima.autor_id === EU);
  conf("nasce um lembrete por responsável (2)",
    escritos.filter(x => x.m === "POST" && x.t === "lembretes").length === 2 &&
    escritos.filter(x => x.t === "lembretes").every(x => !!x.corpo.responsavel_id));

  // 4b) sem ninguém marcado, o lembrete é de quem escreveu
  await p.waitForTimeout(600);
  await p.fill("#at-nota", "Conferir o CNIS quando o cliente trouxer a senha.");
  await p.click('button:has-text("+7 dias") >> nth=0');
  escritos.length = 0;
  await p.evaluate(cli => salvarNotaAtendimento2(cli), CLI_VAZIO);
  await p.waitForTimeout(900);
  const lemb = escritos.find(x => x.t === "lembretes");
  conf("lembrete sem responsável marcado é de quem escreveu",
    lemb && lemb.corpo.responsavel_id === EU);

  // 5) frase pronta voltou a poder nascer
  await p.evaluate(() => fecharFicha(false));
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(800);
  await p.evaluate(caso => { const k = D.casoPorId.get(caso);
    document.getElementById("sug-box").style.display = "flex";
    pintarSugestoes(k, true); }, CASO1);
  conf("o painel de sugestões tem o campo de NOVA frase pronta",
    await p.evaluate(() => !!document.getElementById("nf-texto")));
  escritos.length = 0;
  await p.fill("#nf-texto", "Aguardando retorno da agência do INSS");
  await p.press("#nf-texto", "Enter");
  await p.waitForTimeout(600);
  conf("Enter salva a frase para a equipe",
    escritos.some(x => x.m === "POST" && x.t === "frases_prontas"));

  // 6) os fluxos mortos morreram de verdade
  conf("encaminhar/menuLembrar não existem mais no código",
    await p.evaluate(() => typeof window.ligarEncaminhar === "undefined" &&
      typeof window.menuLembrar === "undefined" && typeof window.caixaEncaminhar === "undefined"));

  await (await p.$("#app")).screenshot({ path: path.join(__dirname, "f41-anotacoes.png") });
  console.log("=== anotações e comentários (F41) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
