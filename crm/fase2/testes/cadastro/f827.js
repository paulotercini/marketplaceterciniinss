// F827 · o menu do WhatsApp conta o mesmo que a aba Novas (sem as Pendentes) e o áudio sem arquivo
// não aparece como "[audio]". Dados fictícios. Uso: node f827.js
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
    eu = { id: "eu1", papel: "gestor" };
    const zs = [
      { id: "z1", status: "aberta", atendente_id: "eu1", nao_lidas: 2 },                              // Nova: minha, não lida
      { id: "z2", status: "aberta", atendente_id: null, nao_lidas: 3 },                               // Pendente: fora do número
      { id: "z3", status: "aberta", atendente_id: "outro", nao_lidas: 1, cobertura: { cobre: "eu1" } }, // Nova: eu cubro
      { id: "z4", status: "resolvida", atendente_id: "eu1", nao_lidas: 1 },
      { id: "z5", status: "aberta", atendente_id: "eu1", nao_lidas: 0 },
    ];
    D.colPorId = D.colPorId || new Map();
    let audio = "";
    try { audio = bolhaZap({ id: "m1", tipo: "audio", direcao: "entrada", criado_em: "2026-11-27T12:00:00Z" }, null); } catch (e) { audio = "erro: " + e; }
    return { n: contaZapResumo(zs), audio };
  });
  conf("o menu conta só as Novas (2), sem as Pendentes", r.n === 2);
  conf("áudio sem arquivo diz que não foi baixado", /áudio antigo, não baixado/.test(r.audio) && !r.audio.includes("[audio]"));
  await b.close(); s.close();
  const n = ok.filter(([, v]) => v).length;
  console.log(`\n${n}/${ok.length}`);
  process.exit(n === ok.length ? 0 : 1);
})();
