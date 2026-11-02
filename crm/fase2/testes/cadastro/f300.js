// F300 · a data de pagamento das guias do CNIS completo responde à pergunta do carnê pago em atraso (Lei 8.213/91,
// art. 27, II), e o vínculo de "Autônomo" (inclusive com o acento gravado como U+FFFD) deixa de sumir. Dados fictícios.
// Uso: node f300.js
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
    const linha = competenciasDaLinha("04/2018 28/05/2018 47,70 954,00 IREC-MEI, IREC-LC123 05/2018 21/06/2018 47,70 954,00 IREC-MEI, IREC-LC123");
    const ci = (tipo, origem, comps) => ({ tipo, origem, comps: comps.map(([c, pg]) => ({ c, v: 1000, pg, ...(origem === "MEI" ? { ind: ["IREC-MEI"] } : {}) })) });
    const mei = ciPagasEmAtraso([ci("Contribuinte Individual", "MEI", [["04/2018", "28/05/2018"], ["05/2018", "21/06/2018"], ["06/2018", "06/07/2018"], ["07/2018", "25/08/2018"]])]);
    // 15/06/2019 é sábado: a guia de 05/2019 paga na segunda, 17/06, está em dia
    const fds = ciPagasEmAtraso([ci("Facultativo", "RECOLHIMENTO", [["05/2019", "17/06/2019"]])]);
    const emDia = ciPagasEmAtraso([ci("Contribuinte Individual", "RECOLHIMENTO", [["02/1999", "12/02/1999"]])]);
    const semData = ciPagasEmAtraso([{ tipo: "Contribuinte Individual", comps: [{ c: "05/2006", v: 350 }] }]);
    const emp = ciPagasEmAtraso([{ tipo: "Empregado", comps: [{ c: "05/2006", v: 350, pg: "30/12/2010" }] }]);
    // a pergunta do campo vem respondida pelo CNIS lido na sessão
    _cnisComps.set("cli-1", { vs: [ci("Contribuinte Individual", "RECOLHIMENTO", [["01/2010", "20/03/2010"], ["02/2010", "20/03/2010"], ["03/2010", "15/04/2010"]])] });
    const pre = PRE_DOSSIE.apo_ci_atraso({ c: { id: "cli-1" } });
    const tipoFffd = TIPOS_FILIADO.map(([e, t]) => [[e, e.replace(/[^\x00-\x7f]/g, "�")].find(f => "AUT�NOMO Aut�nomo 01/02/1999".includes(f)), t]).find(([e]) => e);
    return { linha, mei: faixasDeMeses(mei), fds: fds.length, emDia: emDia.length, semData, emp, pre, tipoFffd };
  });
  conf("a linha de contribuição traz a data de pagamento de cada competência", r.linha.length === 2 && r.linha[0].pg === "28/05/2018" && r.linha[1].pg === "21/06/2018");
  conf("o indicador com vírgula ('IREC-MEI,') é lido", (r.linha[0].ind || []).join() === "IREC-MEI,IREC-LC123");
  conf("o DAS do MEI vence no dia 20: 04 e 05/2018 em atraso, e o atraso depois da primeira em dia não conta", r.mei === "04/2018 a 05/2018");
  conf("o vencimento no sábado passa ao dia útil seguinte", r.fds === 0);
  conf("a guia paga no próprio mês está em dia", r.emDia === 0);
  conf("sem data de pagamento não há resposta", r.semData === null);
  conf("o empregado não entra na conta", r.emp === null);
  conf("o campo do carnê em atraso vem do CNIS", r.pre && r.pre.val === "01/2010 a 02/2010" && /CNIS completo/.test(r.pre.fonte));
  conf("o tipo 'Aut\\uFFFDnomo' vira contribuinte individual", r.tipoFffd && r.tipoFffd[1] === "Contribuinte Individual");
  await b.close(); s.close();
  const n = ok.filter(([, v]) => v).length;
  console.log(`\n${n}/${ok.length}`);
  process.exit(n === ok.length ? 0 : 1);
})();
