// F181 — honorários decididos na mesa vão ao contrato e à aba Honorários;
// cobrança (mensagem e lembretes 3 dias antes), destaque e contrato assinado.
// Dados fictícios; datas relativas a hoje.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const RETRATO = process.env.RETRATO_DIR;
const dia = n => { const d = new Date(Date.now() - 3 * 3600e3); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const barra = iso => iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4);
const ponto = iso => iso.slice(8, 10) + "." + iso.slice(5, 7) + "." + iso.slice(0, 4);
const menos3 = iso => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - 3); return d.toISOString().slice(0, 10); };
const PC = { id: "pc181", especie: "Aposentadoria por idade", natureza: "concessao", marc: {}, honorarios: "", quem: null, em: null };

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
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  const escritos = [];
  let seq = 0;
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (/\/storage\/v1\//.test(u)) { escritos.push({ m, t: "storage", u }); return rota.fulfill({ status: 200, contentType: "application/json", body: "{}" }); }
    if (m !== "GET") {
      let corpo = {};
      try { corpo = JSON.parse(rota.request().postData() || "{}"); } catch (e) { }
      escritos.push({ m, t, u, corpo });
      if (m === "POST" && /return=representation/.test(rota.request().headers()["prefer"] || "")) {
        const id = `f1810000-0000-0000-0000-${String(++seq).padStart(12, "0")}`;
        return rota.fulfill({ status: 201, contentType: "application/json",
          body: JSON.stringify([{ ...corpo, id, criado_em: new Date().toISOString(), ativo: true }]) });
      }
      return rota.fulfill({ status: 204, body: "" });
    }
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(([cli, pc]) => {
    const c = D.cliPorId.get(cli);
    c.campos = { precasos: [{ ...pc }] };
    // o primeiro telefone não é o do WhatsApp: a cobrança tem de achar o marcado
    c.telefones = [{ numero: "(16) 3242-0000", obs: "recado", zap: false }, { numero: "(16) 99999-0001", obs: "celular", zap: true }];
    D.pagamentos = [];
  }, [CLI_CHEIO, PC]);
  const contrato = () => p.evaluate(cli => { const c = D.cliPorId.get(cli);
    return corpoDoDoc("contrato", c, especieDoCliente(c, D.casosDoCliente.get(cli) || [])).corpo; }, CLI_CHEIO);

  // 1 · padrão do escritório: a cláusula é a de sempre, sem marcador sobrando
  const padrao = await contrato();
  const honPadrao = await p.evaluate(() => CONTRATO_VARIANTES[variantePorEspecie("Aposentadoria por idade rural")].honor);
  conf("contrato com a decisão padrão: a cláusula do escritório, idêntica", padrao.includes("da seguinte forma:\n" + honPadrao + "\n\nPARÁGRAFO PRIMEIRO"));
  conf("nenhum <HONORARIOS> sobra no texto", !/<HONORARIOS>/.test(padrao));

  // 2 · o combinado em campos, pela mesa
  await p.evaluate(cli => abrirFicha(cli).then(() => { mesaAberta.add("hon-pc181"); subCad = "anotacoes"; abaAtiva = 0; repintarFicha(); }), CLI_CHEIO);
  await p.waitForSelector("#hn-pc181 [data-hn='valor']", { state: "visible" });
  const preenche = async (v) => { for (const [k, x] of Object.entries(v)) await p.fill(`#hn-pc181 [data-hn='${k}']`, String(x)); };
  await preenche({ pct: 20, valor: 3000, entrada: 600, entrada_em: dia(5), parcelas: 3, primeira_em: dia(35) });
  escritos.length = 0;
  await p.click("#hn-pc181 button:has-text('Guardar no contrato')");
  await p.waitForTimeout(800);
  const posts = escritos.filter(x => x.m === "POST" && x.t === "pagamentos");
  conf("o combinado com parcelas cria 4 lançamentos a receber (entrada + 3)", posts.length === 4
    && posts.every(x => x.corpo.status === "aberto" && x.corpo.cliente_id === CLI_CHEIO)
    && posts.map(x => x.corpo.todo_item_id).join() === "hon:pc181:e,hon:pc181:1,hon:pc181:2,hon:pc181:3");
  conf("valores e datas das parcelas", posts[0].corpo.valor === 600 && posts[0].corpo.vencimento === dia(5)
    && posts.slice(1).every(x => x.corpo.valor === 800) && posts[1].corpo.vencimento === dia(35));
  const custom = await contrato();
  conf("o contrato sai com os termos combinados",
    custom.includes("20% (vinte por cento) sobre o valor bruto dos atrasados")
    && /O valor fixo de R\$ 3\.000,00, sendo R\$ 600,00 de entrada, com vencimento em /.test(custom)
    && custom.includes(`e o saldo de R$ 2.400,00 em 3 (três) parcelas mensais de R$ 800,00, vencendo a primeira em ${barra(dia(35))}.`)
    && !custom.includes(honPadrao));
  conf("o combinado fica no pré-caso e no cadastro (por variante)", await p.evaluate(cli => {
    const c = D.cliPorId.get(cli); return c.campos.precasos[0].hon.valor === 3000 && c.campos.honor_estrut.padrao.parcelas === 3; }, CLI_CHEIO));

  escritos.length = 0;
  await p.click("#hn-pc181 button:has-text('Guardar no contrato')");
  await p.waitForTimeout(600);
  conf("guardar de novo não duplica", !escritos.some(x => x.m === "POST" && x.t === "pagamentos")
    && await p.evaluate(() => D.pagamentos.length === 4));

  // a 3ª parcela foi recebida; o combinado cai para 2 parcelas: ela fica
  await p.evaluate(() => { const x = D.pagamentos.find(y => y.todo_item_id === "hon:pc181:3"); x.status = "recebido"; x.pago_em = x.vencimento; });
  await preenche({ parcelas: 2 });
  escritos.length = 0;
  await p.click("#hn-pc181 button:has-text('Guardar no contrato')");
  await p.waitForTimeout(600);
  conf("mudar o combinado atualiza as abertas e não apaga a recebida",
    escritos.filter(x => x.m === "PATCH" && x.t === "pagamentos").length === 2
    && !escritos.some(x => x.m === "DELETE")
    && await p.evaluate(() => D.pagamentos.find(y => y.todo_item_id === "hon:pc181:1").valor === 1200));
  // de volta a 3, para o resto da prova
  await p.evaluate(() => { const x = D.pagamentos.find(y => y.todo_item_id === "hon:pc181:3"); x.status = "aberto"; x.pago_em = null; });
  await preenche({ parcelas: 3 });
  await p.click("#hn-pc181 button:has-text('Guardar no contrato')");
  await p.waitForTimeout(600);

  // 3 · aba Honorários
  await p.evaluate(() => { abaAtiva = 4; repintarFicha(); });
  await p.waitForSelector('.painel[data-p="4"].ativo .hon .hon-resumo');
  const t0 = await p.textContent('.painel[data-p="4"].ativo .hon-resumo .adr-tile');
  conf("Contratado mostra o combinado", /Ajuste combinado/.test(t0) && /20% dos atrasados/.test(t0) && /3 parcelas de R\$ 800,00/.test(t0));
  const linhas = await p.$$eval('.painel[data-p="4"].ativo .hon-tab tbody tr', trs => trs.map(t => t.textContent.replace(/\s+/g, " ")));
  conf("as parcelas aparecem na tabela", linhas.length === 4 && linhas.some(l => /Honorários · parcela 1\/3/.test(l)) && linhas.some(l => /entrada/.test(l)));
  const card = await p.textContent('.painel[data-p="4"].ativo .hon-cob');
  conf("cartão Cobrança: o próximo em aberto (a entrada)", /entrada/.test(card) && /R\$\s?600,00/.test(card) && card.includes(ponto(dia(5))));
  if (RETRATO) { await p.setViewportSize({ width: 1440, height: 1750 }); await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(RETRATO, "honorarios181.png") }); await p.setViewportSize({ width: 1440, height: 1000 }); }

  await p.click('.painel[data-p="4"].ativo .hon-cob button:has-text("Mensagem de cobrança")');
  await p.waitForSelector("#cob-txt");
  const msg = await p.inputValue("#cob-txt");
  conf("mensagem: primeiro nome, valor e data", /Prezado\(a\) Aurélia,/.test(msg) && /R\$ 600,00/.test(msg) && msg.includes(barra(dia(5))) && /\[FORMA DE PAGAMENTO\]/.test(msg));
  const href = await p.getAttribute("a.cob-zap", "href");
  conf("abrir no WhatsApp usa o telefone marcado como WhatsApp", /^https:\/\/wa\.me\/5516999990001\?text=/.test(href || ""));
  conf("botão copiar presente", await p.isVisible("#modal button:has-text('copiar')"));
  await p.waitForTimeout(400);
  if (RETRATO) await p.screenshot({ path: path.join(RETRATO, "cobranca181.png") });
  await p.evaluate(() => fecharCaixa());

  // 4 · lembrar 3 dias antes
  escritos.length = 0;
  await p.check('.painel[data-p="4"].ativo #hon-cob-lemb');
  await p.waitForTimeout(800);
  const lembs = escritos.filter(x => x.m === "POST" && x.t === "lembretes");
  const pgs = await p.evaluate(() => D.pagamentos.map(x => ({ id: x.id, v: x.vencimento })));
  conf("um lembrete por lançamento aberto, 3 dias antes do vencimento", lembs.length === 4
    && lembs.every(l => { const pg = pgs.find(x => x.id === l.corpo.detalhes.pgto_id);
      return pg && l.corpo.proximo_em === menos3(pg.v) && l.corpo.tipo === "geral" && l.corpo.detalhes.origem === "cobranca"; })
    && /^Cobrança: Honorários · entrada R\$ 600,00$/.test(lembs[0].corpo.titulo));
  escritos.length = 0;
  await p.evaluate(cli => lembretesCobranca(D.cliPorId.get(cli)), CLI_CHEIO);
  await p.waitForTimeout(300);
  conf("ligar de novo não duplica os lembretes", !escritos.some(x => x.m === "POST" && x.t === "lembretes"));
  conf("o interruptor fica ligado", await p.isChecked('.painel[data-p="4"].ativo #hon-cob-lemb'));

  // 5 · destaque
  await p.click('.painel[data-p="4"].ativo .hon-dst summary');
  await p.selectOption("#hon-dst", "pedido");
  await p.fill("#hon-dst-em", dia(-2));
  escritos.length = 0;
  await p.click('.painel[data-p="4"].ativo .hon-dst button:has-text("Guardar")');
  await p.waitForTimeout(500);
  const pt = escritos.find(x => x.m === "PATCH" && x.t === "clientes");
  conf("destaque grava em campos.contrato", pt && pt.corpo.campos.contrato.destaque.st === "pedido" && pt.corpo.campos.contrato.destaque.em === dia(-2));
  conf("destaque aparece no cartão", (await p.textContent('.painel[data-p="4"].ativo .hon-dst-val')).trim() === `pedido em ${ponto(dia(-2))}`);

  // 6 · contrato assinado
  escritos.length = 0;
  await p.setInputFiles('.painel[data-p="4"].ativo #hon-ass-arq', { name: "contrato.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 ficticio") });
  await p.waitForTimeout(800);
  const an = escritos.find(x => x.m === "POST" && x.t === "anexos");
  conf("anexar sobe o arquivo e cria o anexo 'Contrato assinado …'", escritos.some(x => x.t === "storage")
    && an && /^Contrato assinado /.test(an.corpo.nome) && an.corpo.cliente_id === CLI_CHEIO);
  conf("o cartão oferece abrir o contrato assinado e mostra a data",
    await p.isVisible('.painel[data-p="4"].ativo button:has-text("abrir o contrato assinado")')
    && (await p.textContent('.painel[data-p="4"].ativo .hon-ass-val')).includes(ponto(dia(0))));

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
