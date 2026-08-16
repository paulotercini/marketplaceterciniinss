// F27 — a tela Novo Cliente virou a tela da RECEPÇÃO.
//
//   1. só o nome é obrigatório; o benefício é opcional (a recepção não
//      identifica caso) e o agendamento no Google Agenda saiu da tela
//   2. cadastrar NÃO cria caso: cria o cliente com o relato do balcão como
//      primeira anotação (com autor) — o cliente entra 🟡 em atendimento
//   3. benefício conhecido vira PRÉ-CASO com autor e data, nunca caso
//   4. CPF repetido continua barrado pela janela de aviso
//   5. cliente cujo único conteúdo é um pré-caso também aparece na lista
//
// F28 somou: sexo (entra na data da aposentadoria), endereço pela lista de
// CEPs de Monte Alto (rua escolhida traz CEP, bairro e cidade, gravados
// pelas colunas + espelho da procuração) e menção aos advogados a cada
// cliente novo, para dar seguimento na triagem.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// os três advogados do escritório: quem cadastra (Paulo) não se avisa,
// Amanda e Marcos recebem a menção da triagem
const AMANDA = "22222222-2222-2222-2222-222222222222";
const MARCOS = "33333333-3333-3333-3333-333333333333";
FIX.colaboradores = [...FIX.colaboradores,
  { id: AMANDA, auth_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", nome: "Amanda Fictícia",
    inicial: "A", cor: "#b10e1e", papel: "colaborador", ativo: true, atende_zap: true,
    cargo: "advogado", setor: null },
  { id: MARCOS, auth_id: "cccccccc-cccc-cccc-cccc-cccccccccccc", nome: "Marcos Fictício",
    inicial: "M", cor: "#00666b", papel: "colaborador", ativo: true, atende_zap: false,
    cargo: "advogado", setor: null }];

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
      // criarCliente consome o cliente criado — o eco 201 é obrigatório
      if (m === "POST" && t === "clientes")
        return rota.fulfill({ status: 201, contentType: "application/json",
          body: JSON.stringify([{ id: "c0000000-0000-0000-0000-00000000novo", ...corpo }]) });
      return rota.fulfill({ status: 204, body: "" });
    }
    let corpo = FIX[t] || [];
    const f = u.match(/cpf=eq\.(\d+)/);
    if (f) corpo = corpo.filter(x => x.cpf === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error") erros.push("console: " + m.text()); });
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  const abrirTela = async () => {
    await p.evaluate(() => { visao = "novocliente"; render(); });
    await p.waitForSelector("#ncl-nome");
    // agendamento não existe mais — se algo ainda chamar window.open, conta
    await p.evaluate(() => { window._abriu = 0; window.open = () => { window._abriu++; }; });
  };
  await abrirTela();

  // ── 1. a tela da recepção ───────────────────────────────────────────────
  conf("só o nome carrega o asterisco de obrigatório",
    await p.evaluate(() => document.getElementById("ncl-nome").placeholder.includes("*")
      && !document.getElementById("ncl-caso").placeholder.includes("*")));
  conf("o benefício se declara opcional no próprio campo",
    /opcional/.test(await p.evaluate(() => document.getElementById("ncl-caso").placeholder)));
  conf("o agendamento saiu da tela (tipo, data e hora)",
    await p.evaluate(() => !document.getElementById("ncl-tipo")
      && !document.getElementById("ncl-data") && !document.getElementById("ncl-hora")));
  conf("a escolha de fase saiu — recepção não escolhe fase",
    !(await p.$("#ncl-fase")));
  conf("o relato do balcão ganhou o seu campo", await p.$("#ncl-relato"));
  conf("a idade continua conferindo o ano na hora",
    await p.evaluate(() => { document.getElementById("ncl-dn").value = "1960-05-10";
      mostrarIdadeNovo();
      return /\d+ anos/.test(document.getElementById("ncl-idade").textContent); }));
  conf("o sexo tem os dois valores do sistema (F e M)",
    await p.evaluate(() => {
      const ops = [...document.querySelectorAll("#ncl-sexo option")].map(o => o.value);
      return ops.includes("F") && ops.includes("M");
    }));
  conf("a lista de ruas carrega os 1.048 CEPs de Monte Alto",
    (await p.evaluate(() => document.querySelectorAll("#lista-ruas option").length)) === 1048);
  conf("rua escolhida da lista mostra CEP, bairro e cidade na hora",
    await p.evaluate(() => {
      document.getElementById("ncl-rua").value = "Rua dos Lirios — Centro";
      conferirRuaNovo();
      return /CEP 15910-001 · Centro · Monte Alto\/SP/.test(
        document.getElementById("ncl-cep-recado").textContent);
    }));
  conf("rua de fora avisa que grava como digitada",
    await p.evaluate(() => {
      document.getElementById("ncl-rua").value = "Rua Que Não Existe Aqui";
      conferirRuaNovo();
      return /fora da lista/.test(document.getElementById("ncl-cep-recado").textContent);
    }));
  conf("rua única também casa sem o bairro escrito",
    await p.evaluate(() => {
      document.getElementById("ncl-rua").value = "Travessa Francisco Pelloso";
      return (ruaNovoAchada() || [])[0] === "15910-017";
    }));
  conf("rua que existe em vários bairros NÃO casa sozinha — exige escolher da lista",
    await p.evaluate(() => {
      document.getElementById("ncl-rua").value = "Rua dos Lirios";
      return ruaNovoAchada() === null;
    }));

  // ── 2. cadastrar só com o nome: cliente sem caso, com a marca do balcão ─
  await abrirTela();
  escritos.length = 0;
  await p.fill("#ncl-nome", "Ondina Fictícia Prado");
  await p.evaluate(() => document.getElementById("ncl-dn").value = "");
  await p.evaluate(() => criarCliente());
  await p.waitForTimeout(900);
  const postCli = escritos.find(x => x.m === "POST" && x.t === "clientes");
  const nota = postCli && (postCli.corpo.campos.atendimento || [])[0];
  conf("o cliente grava com a primeira anotação do atendimento",
    nota && /cadastrado na recepção/i.test(nota.texto));
  conf(`assinada por quem cadastrou (${nota && nota.quem})`,
    nota && nota.quem === "Paulo" && /^\d{4}-\d{2}-\d{2}T/.test(nota.em));
  conf("NENHUM caso é criado pela recepção",
    !escritos.some(x => x.m === "POST" && x.t === "casos"));
  conf("sem benefício, nenhum pré-caso inventado",
    postCli && !postCli.corpo.campos.precasos);
  conf("nada abre o Google Agenda",
    (await p.evaluate(() => window._abriu)) === 0);
  conf("a tela leva para a lista Escritório, onde o 🟡 mora",
    await p.evaluate(() => visao === "fase:escritorio"));
  // F28 — as menções da triagem
  const mencs = escritos.filter(x => x.m === "POST" && x.t === "mencoes");
  conf(`os DOIS outros advogados recebem menção (${mencs.length})`,
    mencs.length === 2
    && mencs.some(x => x.corpo.para_id === AMANDA)
    && mencs.some(x => x.corpo.para_id === MARCOS));
  conf("quem cadastrou não se avisa a si mesmo",
    !mencs.some(x => x.corpo.para_id === EU));
  conf("a menção pede o seguimento na triagem e leva à ficha (cliente_id)",
    mencs.every(x => /dar seguimento na triagem/.test(x.corpo.texto)
      && /Ondina/.test(x.corpo.texto) && x.corpo.cliente_id));

  // ── 3. benefício conhecido vira pré-caso, nunca caso — e o cadastro
  //       completo grava sexo e endereço da lista de CEPs ─────────────────
  await abrirTela();
  escritos.length = 0;
  await p.fill("#ncl-nome", "Teodoro Fictício Braga");
  await p.selectOption("#ncl-sexo", "M");
  await p.fill("#ncl-rua", "Rua dos Lirios — Jardim Califórnia");
  await p.fill("#ncl-num", "245");
  await p.fill("#ncl-caso", "Aposentadoria por idade rural");
  await p.fill("#ncl-relato", "Trabalhou na roça a vida toda, quer se aposentar.");
  await p.evaluate(() => criarCliente());
  await p.waitForTimeout(900);
  const postCli2 = escritos.find(x => x.m === "POST" && x.t === "clientes");
  const pc = postCli2 && (postCli2.corpo.campos.precasos || [])[0];
  conf("o sexo grava no cliente (homem/mulher — entra na data da aposentadoria)",
    postCli2 && postCli2.corpo.sexo === "M");
  const patEnd = escritos.find(x => x.m === "PATCH" && x.t === "clientes" && x.corpo.logradouro);
  conf("a rua da lista grava as sete colunas do endereço",
    patEnd && patEnd.corpo.logradouro === "Rua dos Lirios" && patEnd.corpo.numero === "245"
    && patEnd.corpo.bairro === "Jardim Califórnia" && patEnd.corpo.cidade === "Monte Alto"
    && patEnd.corpo.uf === "SP" && patEnd.corpo.cep === "15914366");
  conf("e o espelho da procuração sai montado",
    patEnd && patEnd.corpo.endereco === "Rua dos Lirios, nº 245");
  conf("o benefício vira pré-caso com a espécie",
    pc && pc.especie === "Aposentadoria por idade rural");
  conf("com autor e data no pré-caso", pc && pc.quem === EU && /^\d{4}-\d{2}-\d{2}$/.test(pc.em));
  conf("o relato do balcão é a primeira anotação",
    /roça a vida toda/.test(((postCli2.corpo.campos.atendimento || [])[0] || {}).texto || ""));
  conf("e MESMO com benefício, caso não nasce na recepção",
    !escritos.some(x => x.m === "POST" && x.t === "casos"));

  // rua de fora da lista: grava como digitada, sem CEP inventado
  await abrirTela();
  escritos.length = 0;
  await p.fill("#ncl-nome", "Vicência Ficta Moraes");
  await p.fill("#ncl-rua", "Rua do Sítio Alheio");
  await p.fill("#ncl-num", "10");
  await p.evaluate(() => criarCliente());
  await p.waitForTimeout(900);
  const patFora = escritos.find(x => x.m === "PATCH" && x.t === "clientes" && x.corpo.logradouro);
  conf("rua de fora grava como digitada, sem CEP nem bairro por adivinhação",
    patFora && patFora.corpo.logradouro === "Rua do Sítio Alheio"
    && !patFora.corpo.cep && !patFora.corpo.bairro && !patFora.corpo.cidade
    && patFora.corpo.endereco === "Rua do Sítio Alheio, nº 10");

  // ── 4. CPF repetido continua barrado ────────────────────────────────────
  await abrirTela();
  escritos.length = 0;
  await p.fill("#ncl-nome", "Aurélia Digitada Errado");
  await p.fill("#ncl-cpf", "123.456.789-09");
  await p.evaluate(() => criarCliente());
  await p.waitForTimeout(700);
  conf("a janela avisa que o CPF já tem cadastro",
    /CPF já tem cadastro/.test(await p.evaluate(() =>
      (document.querySelector("#modal .modal-cx") || {}).innerText || "")));
  conf("e nada é gravado", !escritos.some(x => x.m === "POST"));
  await p.evaluate(() => fecharEscolha());

  // ── 5. cliente só com pré-caso também aparece em atendimento ────────────
  conf("quem só tem pré-caso conta como 🟡 em atendimento",
    await p.evaluate(() => {
      const c = { id: "c-pc", nome: "Zulmira Ficta", campos: { precasos: [{ id: "pc1", especie: "BPC/LOAS" }] } };
      D.clientes.push(c); D.cliPorId.set(c.id, c);
      const ta = clientesEmAtendimento().some(x => x.id === "c-pc");
      D.clientes.pop(); D.cliPorId.delete("c-pc");
      return ta;
    }));

  await abrirTela();
  const form = await p.$(".caso");
  if (form) await form.screenshot({ path: path.join(__dirname, "f28-recepcao.png") });

  console.log("=== Novo Cliente = tela da recepção (F27+F28) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
