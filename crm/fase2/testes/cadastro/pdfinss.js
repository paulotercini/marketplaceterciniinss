// F18 — ler o CNIS e a Declaração de Benefícios do Meu INSS.
//
// A parte arriscada não é abrir o PDF, é ENTENDER o layout. Por isso os
// extratores são funções puras sobre a lista de pedaços de texto com posição,
// e é sobre elas que este teste roda — com as coordenadas exatas dos dois PDFs
// de verdade e todo dado de pessoa trocado (ver fixt-pdf.js).
//
// O que fica de fora, e é honesto dizer: o carregamento do pdf.js pelo cdnjs
// não é exercitado aqui, porque o navegador do arneço não tem saída para a
// internet. O que é exercitado é tudo o que vem depois dele.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, EU } = require("./fixturas");
const { ITENS_CNIS, ITENS_DECLARACAO } = require("./fixt-pdf");
const SUPA = "https://ficticio.supabase.co";

// o cliente da fixtura precisa ter o CPF do documento, senão a conferência
// de identidade barra tudo antes de chegar na leitura
const CPF_DOC = "52998224725";
FIX.clientes[0] = { ...FIX.clientes[0], cpf: CPF_DOC };

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
    localStorage.setItem("crm_subcad", "triagem");
  }, [SUPA, SESSAO]);
  const escritos = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      escritos.push({ m, t, corpo: JSON.parse(rota.request().postData() || "{}"), url: u });
      return rota.fulfill({ status: 204, body: "" });
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

  // ── 1. o CNIS ───────────────────────────────────────────────────────────
  const cnis = await p.evaluate(it => lerCnisPdf(it), ITENS_CNIS);
  conf(`acha o NIT do filiado (${cnis.filiado.nit})`, cnis.filiado.nit === "123.45678.90-1");
  conf(`acha o CPF (${cnis.filiado.cpf})`, cnis.filiado.cpf === "529.982.247-25");
  conf(`acha a data de nascimento (${cnis.filiado.nascimento})`,
    /^\d{2}\/\d{2}\/\d{4}$/.test(cnis.filiado.nascimento));
  const cods = cnis.indicadores.map(i => i.codigo).sort();
  conf(`acha os quatro indicadores da legenda (${cods.join(", ")})`,
    JSON.stringify(cods) === JSON.stringify(["IREC-INDPEND", "PEXT", "PREC-FACULTCONC", "PREC-MENOR-MIN"]));
  const porCod = c => cnis.indicadores.find(i => i.codigo === c) || {};
  conf(`cada indicador vem com a descrição oficial (${JSON.stringify((porCod("PREC-MENOR-MIN").descricao || "").slice(0, 40))})`,
    /Recolhimento abaixo do valor mínimo/.test(porCod("PREC-MENOR-MIN").descricao || ""));
  conf(`a descrição que quebra em duas linhas vem inteira (${JSON.stringify((porCod("PEXT").descricao || "").slice(-24))})`,
    /informação extemporânea, passível de comprovação/.test(porCod("PEXT").descricao || ""));
  // A legenda tem DUAS colunas, e a linha que transborda pertence à COLUNA em
  // que ela está, não ao último código lido. Emendar no último jogava o
  // "concomitante com outros vínculos" do PREC-FACULTCONC (esquerda) dentro do
  // PREC-MENOR-MIN (direita) — e a nota da triagem saía com a descrição
  // trocada. Estes dois travam esse erro.
  conf(`o transbordo da coluna ESQUERDA fica na esquerda (${JSON.stringify(porCod("PREC-FACULTCONC").descricao)})`,
    porCod("PREC-FACULTCONC").descricao
      === "Recolhimento ou período de contribuinte facultativo concomitante com outros vínculos");
  conf(`e não contamina a coluna da direita (${JSON.stringify(porCod("PREC-MENOR-MIN").descricao)})`,
    porCod("PREC-MENOR-MIN").descricao === "Recolhimento abaixo do valor mínimo");
  conf(`conta quantas vezes cada um aparece no corpo (FACULTCONC ${porCod("PREC-FACULTCONC").ocorrencias}×)`,
    porCod("PREC-FACULTCONC").ocorrencias >= 15);
  conf(`o que aparece uma vez só aparece uma vez (MENOR-MIN ${porCod("PREC-MENOR-MIN").ocorrencias}×, IREC ${porCod("IREC-INDPEND").ocorrencias}×)`,
    porCod("PREC-MENOR-MIN").ocorrencias === 1 && porCod("IREC-INDPEND").ocorrencias === 1);
  conf("a legenda não conta como ocorrência",
    cnis.indicadores.every(i => i.ocorrencias < 40));
  conf(`ordena pelo tamanho do problema (${cnis.indicadores.map(i => i.codigo)[0]} primeiro)`,
    cnis.indicadores[0].codigo === "PREC-FACULTCONC");
  conf(`conta os vínculos (${cnis.vinculos})`, cnis.vinculos >= 2);
  conf(`conta as páginas (${cnis.paginas})`, cnis.paginas === 7);

  // um CNIS sem legenda nenhuma não pode inventar indicador
  const limpo = await p.evaluate(it =>
    lerCnisPdf(it.filter(i => i.p !== 7)), ITENS_CNIS);
  conf(`sem a página da legenda, nenhum indicador é inventado (${limpo.indicadores.length})`,
    limpo.indicadores.length === 0 && limpo.filiado.nit === "123.45678.90-1");

  // ── 2. a Declaração de Benefícios ───────────────────────────────────────
  const dec = await p.evaluate(it => lerDeclaracaoPdf(it), ITENS_DECLARACAO);
  conf(`acha o CPF do titular (${dec.cpf})`, dec.cpf === "529.982.247-25");
  conf(`acha a data de emissão (${dec.emitida})`, /^\d{2}\/\d{2}\/\d{4}$/.test(dec.emitida));
  conf(`acha os três benefícios (${dec.beneficios.length})`, dec.beneficios.length === 3);
  const b = dec.beneficios[0] || {};
  conf(`o NB sai completo (${b.nb})`, /^\d{3}\.\d{3}\.\d{3}-\d$/.test(b.nb));
  conf(`a situação sai limpa (${JSON.stringify(b.situacao)})`, b.situacao === "CESSADO");
  // a espécie é escrita em três linhas em volta do NB: é o ponto que quebra
  // qualquer leitura por linha de texto corrida
  conf(`a espécie quebrada em três linhas sai inteira (${JSON.stringify(b.especie)})`,
    b.especie === "AUXÍLIO POR INCAPACIDADE TEMPORÁRIA PREVIDENCIÁRIO");
  conf(`as duas datas saem separadas (${b.inicio} → ${b.cessacao})`,
    /^\d{2}\/\d{2}\/\d{4}$/.test(b.inicio) && /^\d{2}\/\d{2}\/\d{4}$/.test(b.cessacao)
    && b.inicio !== b.cessacao);
  conf(`o último pagamento sai como valor (${b.valor})`, /^[\d.]+,\d{2}$/.test(b.valor));
  conf("nenhum benefício sai sem espécie", dec.beneficios.every(x => x.especie.length > 10));
  conf("nenhum NB se repete por engano",
    new Set(dec.beneficios.map(x => x.nb)).size === dec.beneficios.length
    || dec.beneficios.every(x => x.nb === dec.beneficios[0].nb));

  // ── 3. o pdf.js entrega PEDAÇOS, não palavras ───────────────────────────
  // Se o extrator depender de o gerador do PDF ter picotado por palavra, ele
  // funciona no arneço e falha no navegador. Aqui a fixtura é regrupada em
  // pedaços grandes de propósito, e o resultado tem de ser o mesmo.
  const colado = await p.evaluate(it => {
    const juntos = [];
    for (const i of it) {
      const u = juntos[juntos.length - 1];
      if (u && u.p === i.p && Math.abs(u.y - i.y) <= 2 && i.x - (u.x + u.w) < 14) {
        u.t += " " + i.t; u.w = i.x + i.w - u.x;
      } else juntos.push({ ...i });
    }
    return { pedacos: juntos.length, r: lerDeclaracaoPdf(juntos) };
  }, ITENS_DECLARACAO);
  conf(`com o texto colado em ${colado.pedacos} pedaços (era ${ITENS_DECLARACAO.length} palavras), lê igual`,
    colado.r.beneficios.length === 3
    && colado.r.beneficios[0].nb === b.nb
    && colado.r.beneficios[0].especie === b.especie
    && colado.r.cpf === dec.cpf);

  // ── 4. a conferência de identidade ──────────────────────────────────────
  const confId = await p.evaluate(([itc, itd, cli]) => {
    const c = D.cliPorId.get(cli);
    const outro = { ...c, cpf: "11144477735" };
    return {
      certo: conferePdfComCliente(lerCnisPdf(itc), c),
      errado: conferePdfComCliente(lerCnisPdf(itc), outro),
      erradoDec: conferePdfComCliente(lerDeclaracaoPdf(itd), outro),
      semCpf: conferePdfComCliente(lerCnisPdf(itc), { ...c, cpf: "" }),
    };
  }, [ITENS_CNIS, ITENS_DECLARACAO, CLI_CHEIO]);
  conf("o CPF do documento batendo com o da ficha, segue", confId.certo.ok);
  conf(`CPF de outra pessoa é barrado (${JSON.stringify(confId.errado.aviso.slice(0, 44))})`,
    !confId.errado.ok && /não é o do cliente aberto/.test(confId.errado.aviso));
  conf("e a Declaração é barrada do mesmo jeito", !confId.erradoDec.ok);
  conf("cliente ainda sem CPF na ficha não é barrado", confId.semCpf.ok);

  // ── 5. o que fica gravado ───────────────────────────────────────────────
  await p.evaluate(cli => abrirFicha(cli).then(() => { abaAtiva = 0; subCad = "triagem"; pintarFicha(); }),
    CLI_CHEIO);
  await p.waitForSelector(".tri-lista");
  await p.waitForTimeout(300);
  const bt = await p.evaluate(() =>
    [...document.querySelectorAll(".tri-pdf button")].map(x => x.innerText.trim()));
  conf(`o botão aparece nos dois passos certos (${bt.join(" | ")})`,
    bt.length === 2 && /Ler o CNIS/.test(bt[0]) && /Declaração de Benefícios/.test(bt[1]));
  conf("e a tela diz que o arquivo não sai da máquina",
    /não sai desta máquina/.test(await p.innerText(".tri-pdf")));

  escritos.length = 0;
  await p.evaluate(([cli, it]) => gravarCnisLido(cli, lerCnisPdf(it)), [CLI_CHEIO, ITENS_CNIS]);
  await p.waitForTimeout(700);
  const pat = escritos.find(x => x.m === "PATCH" && x.t === "clientes");
  const tri = pat && pat.corpo.triagem;
  conf("a leitura do CNIS grava na triagem", !!tri);
  conf(`a nota do passo Indicadores lista os quatro códigos (${JSON.stringify(((tri || {}).indicadores || {}).nota || "").slice(0, 50)})`,
    tri && /PREC-FACULTCONC/.test(tri.indicadores.nota) && /PEXT/.test(tri.indicadores.nota)
    && /IREC-INDPEND/.test(tri.indicadores.nota) && /PREC-MENOR-MIN/.test(tri.indicadores.nota));
  conf("e traz a descrição junto do código",
    tri && /Recolhimento abaixo do valor mínimo/.test(tri.indicadores.nota));
  conf(`o passo CNIS registra páginas e vínculos (${JSON.stringify(((tri || {}).cnis || {}).nota || "").slice(0, 46)})`,
    tri && /CNIS lido em/.test(tri.cnis.nota) && /vínculo\(s\)/.test(tri.cnis.nota));
  conf("o ESTADO do passo não é marcado pela máquina: quem confere é quem atende",
    tri && !tri.indicadores.estado && !tri.cnis.estado);
  conf("fica registrado quem leu e quando",
    tri && tri.pdf && tri.pdf.cnis && tri.pdf.cnis.quem === EU && tri.pdf.cnis.indicadores.length === 4);
  const and = escritos.find(x => x.m === "POST" && x.t === "andamentos");
  conf(`lança no histórico do caso (${JSON.stringify(((and || {}).corpo || {}).texto || "").slice(0, 48)})`,
    and && /CNIS lido no CRM/.test(and.corpo.texto) && /PREC-FACULTCONC/.test(and.corpo.texto));

  // a nota que já existia não é apagada
  await p.evaluate(cli => { const c = D.cliPorId.get(cli);
    c.triagem = { ...(c.triagem || {}), indicadores: { nota: "anotação antiga do Marcos" } }; }, CLI_CHEIO);
  escritos.length = 0;
  await p.evaluate(([cli, it]) => gravarCnisLido(cli, lerCnisPdf(it)), [CLI_CHEIO, ITENS_CNIS]);
  await p.waitForTimeout(700);
  const pat2 = escritos.find(x => x.m === "PATCH" && x.t === "clientes");
  conf("a leitura entra ACIMA da anotação que já estava lá, sem apagá-la",
    pat2 && /anotação antiga do Marcos/.test(pat2.corpo.triagem.indicadores.nota)
    && pat2.corpo.triagem.indicadores.nota.indexOf("Lido do CNIS")
       < pat2.corpo.triagem.indicadores.nota.indexOf("anotação antiga"));

  // a Declaração grava o NB no caso quando o caso está sem NB
  await p.evaluate(cli => { const c = D.cliPorId.get(cli); c.triagem = {};
    (D.casosDoCliente.get(cli) || []).forEach(k => { k.nb = null; }); }, CLI_CHEIO);
  escritos.length = 0;
  await p.evaluate(([cli, it]) => gravarDeclaracaoLida(cli, lerDeclaracaoPdf(it)), [CLI_CHEIO, ITENS_DECLARACAO]);
  await p.waitForTimeout(700);
  const patC = escritos.find(x => x.m === "PATCH" && x.t === "casos");
  conf(`grava o NB no caso que estava sem NB (${patC ? patC.corpo.nb : "não gravou"})`,
    patC && /^\d{3}\.\d{3}\.\d{3}-\d$/.test(patC.corpo.nb));
  const patD = escritos.find(x => x.m === "PATCH" && x.t === "clientes");
  conf(`a nota do passo Benefício ativo lista os três (${JSON.stringify((patD.corpo.triagem.beneficio.nota || "").slice(0, 44))})`,
    /3 benefício\(s\)/.test(patD.corpo.triagem.beneficio.nota)
    && (patD.corpo.triagem.beneficio.nota.match(/NB /g) || []).length === 3);
  conf("e separa o que está em manutenção do que já cessou",
    /0 em manutenção/.test(patD.corpo.triagem.beneficio.nota));

  // com o caso já tendo NB, a leitura não sobrescreve
  await p.evaluate(cli => { const c = D.cliPorId.get(cli); c.triagem = {};
    (D.casosDoCliente.get(cli) || []).forEach(k => { k.nb = "999.999.999-9"; }); }, CLI_CHEIO);
  escritos.length = 0;
  await p.evaluate(([cli, it]) => gravarDeclaracaoLida(cli, lerDeclaracaoPdf(it)), [CLI_CHEIO, ITENS_DECLARACAO]);
  await p.waitForTimeout(700);
  conf("caso que já tem NB não é sobrescrito pela leitura",
    !escritos.some(x => x.m === "PATCH" && x.t === "casos" && x.corpo.nb));

  // retrato dos dois passos com a leitura já dentro
  await p.evaluate(([cli, itc, itd]) => {
    const c = D.cliPorId.get(cli);
    c.triagem = {};
    return gravarCnisLido(cli, lerCnisPdf(itc))
      .then(() => gravarDeclaracaoLida(cli, lerDeclaracaoPdf(itd)));
  }, [CLI_CHEIO, ITENS_CNIS, ITENS_DECLARACAO]);
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    const ps = [...document.querySelectorAll(".tri-passo")];
    const alvo = ps.filter(x => x.querySelector(".tri-pdf"));
    if (!alvo.length) return;
    const cx = document.createElement("div");
    cx.id = "retrato-f18"; cx.style.cssText = "background:#fff;padding:12px 16px;width:900px";
    alvo.forEach(x => { const cl = x.cloneNode(true);
      const ta = cl.querySelector("textarea"); if (ta) ta.rows = 6;
      cx.appendChild(cl); });
    document.querySelector(".tri-lista").appendChild(cx);
    cx.querySelectorAll("textarea").forEach((t, i) => {
      const orig = alvo[i].querySelector("textarea");
      if (orig) t.value = orig.value;
    });
  });
  await p.waitForTimeout(300);
  const retr = await p.$("#retrato-f18");
  if (retr) await retr.screenshot({ path: path.join(__dirname, "f18-triagem-pdf.png") });

  console.log("=== ler o CNIS e a Declaração (F18) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
