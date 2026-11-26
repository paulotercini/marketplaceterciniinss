// F826 · perícia com 00:00 (hora não informada) não gera recado com horário; e só o autor apaga o próprio
// resumo do zap (precedência do && sobre o ||). Dados fictícios. Uso: node f826.js
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
    const avisos = []; window.aviso = t => avisos.push(t);
    D.modelos = []; D.anexos = [];
    D.eventos = [{ id: "ev1", caso_id: "k1", tipo: "Perícia", data_hora: "2030-03-10T03:00:00Z", status: "agendada" }];
    D.casoPorId = new Map([["k1", { id: "k1", cliente_id: "c1" }]]);
    D.cliPorId = new Map([["c1", { id: "c1", nome: "Cliente Teste", telefone: "550000000001" }]]);
    const semHora = lembreteDoEvento("ev1");
    D.eventos[0].data_hora = "2030-03-10T13:00:00Z";
    const comHora = lembreteDoEvento("ev1");
    return { semHora, avisou: avisos.some(a => /Hora não informada/.test(a)), comHora: comHora && comHora.texto };
  });
  conf("perícia às 00:00 não gera recado", r.semHora === null);
  conf("e avisa que a hora não foi informada", r.avisou);
  conf("com hora informada o recado sai com o horário", /às 10:00/.test(r.comHora || ""));
  const src = fs.readFileSync(path.join(__dirname, "../../app.html"), "utf8");
  conf("permissão: nenhum && seguido de || solto no resumo do zap", !src.includes('a.autor_id===eu.id&&a.origem==="app"||a.origem==="zap_resumo"'));
  conf("permissão: o autor é exigido também para o zap_resumo", src.split('a.autor_id===eu.id&&(a.origem==="app"||a.origem==="zap_resumo")').length - 1 >= 5);
  await b.close(); s.close();
  const n = ok.filter(([, v]) => v).length;
  console.log(`\n${n}/${ok.length}`);
  process.exit(n === ok.length ? 0 : 1);
})();
