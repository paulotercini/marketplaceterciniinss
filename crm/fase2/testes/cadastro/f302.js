// F302 · a leitura completa do CNIS: o indicador partido em duas linhas, os indicadores do vínculo em linha própria, o nome
// do empregador em duas linhas (a empresa falida), a situação do benefício sem número, os meses com pendência contados à
// parte, o salário em dois lugares no mesmo mês e o quadro que mostra à vista só os problemas. Dados fictícios.
// Uso: node f302.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };

(async () => {
  const s = http.createServer((q, r) => { r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(path.join(__dirname, "../../app.html"))); }).listen(0);
  const b = await chromium.launch(), p = await b.newPage();
  await p.goto(`http://127.0.0.1:${s.address().port}/`);
  const r = await p.evaluate(() => {
    // cada linha do extrato: [y, texto]; o pdf.js entrega uma palavra por item
    let y = 0; const itens = [];
    const L = txt => { y += 10; itens.push({ t: txt, x: 10, y, p: 1, w: txt.length * 5 }); };
    L("5 120.11111.11-1 11.111.111/0001-11 OFICINA DE TESTE ELETRONICA Empregado ou Agente 23/12/1992 16/06/1993 12/1993");
    L("LTDA - FALIDO P�blico");
    L("Indicadores: IREM-INDPEND");
    L("01/1993 4.102,39 02/1993 3.699,83 03/1993 5.055,94");
    L("12/1993 448,92 PREM-FVIN, IREM-");
    L("SEM-DIAS-INTERM");
    L("6 120.11111.11-1 22.222.222/0001-22 MAQUINAS FICTICIAS LTDA Empregado ou Agente 01/07/1993 22/12/1993");
    L("Público");
    L("Indicadores: PEXT");
    L("7 120.11111.11-1 5453084827 Benefício 31 - AUXILIO DOENCA PREVIDENCIARIO 19/03/2011 30/09/2011 CESSADO");
    const vs = lerVinculosCnis(itens);
    const v5 = vs.find(v => v.seq === 5), v6 = vs.find(v => v.seq === 6), b7 = vs.find(v => v.seq === 7);
    // a contagem: o vínculo com PEXT conta depois do acerto, e não hoje; o mês coberto por outro vínculo não é pendente
    const emp = (origem, inicio, fim, ind) => ({ tipo: "Empregado ou Agente Público", origem, inicio, fim, indicadores: ind || [], comps: [] });
    const ct = contagemCnis([emp("A", "01/01/2000", "31/12/2000"), emp("B", "01/06/2000", "31/03/2001", ["PEXT"])], []);
    const ctCi = contagemCnis([{ tipo: "Contribuinte Individual", origem: "RECOLHIMENTO", comps: [{ c: "01/2010", v: 1000 }, { c: "02/2010", v: 1000, ind: ["PREC-CSE"] }] }], []);
    // o salário em dois lugares: o mês de entrada e o de saída não contam (a troca de emprego)
    const comps = (de, ate) => { const out = []; let [m, a] = de.split("/").map(Number); const [m2, a2] = ate.split("/").map(Number);
      while (a < a2 || (a === a2 && m <= m2)) { out.push({ c: `${String(m).padStart(2, "0")}/${a}`, v: 1500 }); if (++m > 12) { m = 1; a++; } } return out; };
    const cc = concomitantesDoCnis([{ ...emp("X", "10/01/2005", "20/12/2005"), comps: comps("01/2005", "12/2005") }, { ...emp("Y", "15/03/2005", "10/06/2006"), comps: comps("03/2005", "06/2006") }]);
    const troca = concomitantesDoCnis([{ ...emp("S", "29/11/2012", "27/05/2013"), comps: [...comps("11/2012", "05/2013"), { c: "06/2013", v: 300, ind: ["PREM-FVIN"] }] }, { ...emp("F", "28/05/2013", "17/06/2013"), comps: comps("05/2013", "06/2013") }]);
    const ic = indicadoresDasComps([{ ...emp("S", "29/11/2012", "27/05/2013"), comps: [{ c: "06/2013", v: 300, ind: ["PREM-FVIN"] }] }]);
    // o quadro: à vista os problemas, o resto fechado
    const html = itensDoCnis([{ k: "a", est: "warn", txt: "pendência" }, { k: "b", est: "info", txt: "idade" }, { k: "c", est: "ok", txt: "benefício" }], x => `<li>${x.txt}</li>`);
    const nada = itensDoCnis([{ k: "b", est: "info", txt: "idade" }], x => `<li>${x.txt}</li>`);
    return { v5, v6, b7, ct, ctCi, cc, troca, ic, html, nada, desc: IND_CNIS["IREM-SEM-DIAS-INTERM"] };
  });
  conf("o indicador partido em duas linhas é lido inteiro", (r.v5.comps.find(c => c.c === "12/1993") || {}).ind.join() === "PREM-FVIN,IREM-SEM-DIAS-INTERM");
  conf("o IREM-SEM-DIAS-INTERM tem descrição", /intermitente/.test(r.desc || ""));
  conf("os indicadores do vínculo em linha própria são lidos", r.v5.indicadores.includes("IREM-INDPEND") && r.v6.indicadores.includes("PEXT"));
  conf("o nome do empregador em duas linhas fica inteiro (falida)", r.v5.origem === "OFICINA DE TESTE ELETRONICA LTDA - FALIDO");
  conf("o tipo de filiado continua certo", r.v5.tipo === "Empregado ou Agente Público" && r.v6.tipo === "Empregado ou Agente Público");
  conf("o benefício com a situação sem número traz as datas", r.b7.inicio === "19/03/2011" && r.b7.fim === "30/09/2011" && r.b7.situacao === "CESSADO" && /^AUXILIO DOENCA PREVIDENCIARIO$/.test(r.b7.origem));
  conf("o vínculo com pendência conta depois do acerto e fica fora da conta de hoje", r.ct.carencia === 15 && r.ct.pendentes === 3);
  conf("o mês do contribuinte individual com pendência fica fora da conta de hoje", r.ctCi.carencia === 2 && r.ctCi.pendentes === 1);
  conf("o salário em dois lugares sai em faixa, sem o mês de entrada e o de saída", r.cc.length === 1 && r.cc[0].de === "2005-04" && r.cc[0].ate === "2005-11" && r.cc[0].origens.length === 2);
  conf("a troca de emprego não é atividade concomitante", r.troca.length === 0);
  conf("o indicador de competência guarda o vínculo e o mês", r.ic["PREM-FVIN"] && r.ic["PREM-FVIN"][0].comps.join() === "06/2013");
  conf("o quadro do CNIS mostra à vista só o problema", /1 problema no CNIS/.test(r.html) && /<ul class="paq-itens"><li>pendência<\/li><\/ul>/.test(r.html) && /<details class="paq-resto"><summary>Os demais dados do CNIS, sem problema \(2\)/.test(r.html));
  conf("sem problema, o quadro diz", /Nenhum problema no CNIS/.test(r.nada));
  await b.close(); s.close();
  const n = ok.filter(([, v]) => v).length;
  console.log(`\n${n}/${ok.length}`);
  process.exit(n === ok.length ? 0 : 1);
})();
