// Corredor da suíte de tela.
//
// Cada prova desta pasta é um programa solto: sobe um servidor numa porta
// qualquer, abre o Chromium, finge o Supabase com `page.route` e sai com
// código 1 se alguma asserção falhou. Isso é ótimo para depurar uma prova
// isolada e péssimo para conferir as 59 antes de publicar — ninguém roda 59
// comandos na mão, e foi por isso que a suíte existiu semanas sem nunca ter
// rodado inteira.
//
//     node crm/fase2/testes/cadastro/rodar.js           # todas
//     node crm/fase2/testes/cadastro/rodar.js fluxo     # só as que casam
//     node crm/fase2/testes/cadastro/rodar.js -j1       # uma por vez
//
// A CÓPIA DO APP: cada prova serve `app.html` da PRÓPRIA pasta. O arquivo de
// trabalho é `crm/fase2/app.html`, então o corredor copia antes de começar —
// é o passo que garante que a suíte fala do app de agora, e não de uma cópia
// esquecida de duas semanas atrás. A cópia é descartável e está no .gitignore.
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const AQUI = __dirname;
const APP = path.join(AQUI, "..", "..", "app.html");
const COPIA = path.join(AQUI, "app.html");

// não são provas: uma exporta as fixturas, a outra o PDF falso, e este
// arquivo é o próprio corredor
const NAO_SAO_PROVAS = new Set(["fixturas.js", "fixt-pdf.js", "rodar.js"]);

// teto por prova. As mais pesadas (desempenho.js pinta 7.000 tarefas) levam
// perto de um minuto; acima disso é travamento, não lentidão.
const TETO_MS = Number(process.env.TETO_MS || 180000);

const args = process.argv.slice(2);
const paralelas = Number((args.find(a => /^-j\d+$/.test(a)) || "").slice(2))
  || Number(process.env.PARALELAS) || Math.min(4, os.cpus().length);
const filtros = args.filter(a => !a.startsWith("-"));

function provas() {
  return fs.readdirSync(AQUI)
    .filter(f => f.endsWith(".js") && !NAO_SAO_PROVAS.has(f))
    .filter(f => !filtros.length || filtros.some(q => f.includes(q)))
    .sort();
}

function rodar(arquivo) {
  return new Promise(resolve => {
    const t0 = Date.now();
    const p = spawn(process.execPath, [path.join(AQUI, arquivo)],
      { cwd: AQUI, env: process.env });
    let saida = "";
    p.stdout.on("data", d => (saida += d));
    p.stderr.on("data", d => (saida += d));
    const relogio = setTimeout(() => { estourou = true; p.kill("SIGKILL"); }, TETO_MS);
    let estourou = false;
    p.on("close", codigo => {
      clearTimeout(relogio);
      resolve({ arquivo, ok: codigo === 0 && !estourou, estourou,
                seg: ((Date.now() - t0) / 1000).toFixed(1), saida });
    });
  });
}

// A última linha útil de cada prova é o placar dela ("7/7 passaram"). Puxar
// isso para o resumo evita que o verde do corredor esconda uma prova que
// passou por pouco.
function placar(saida) {
  const l = saida.split("\n").map(s => s.trim())
    .filter(s => /\d+\/\d+ passaram|pictograma|nenhum|PASSOU|FALHOU/.test(s));
  const m = saida.match(/(\d+\/\d+ passaram)/g);
  return m ? m[m.length - 1] : (l[l.length - 1] || "").slice(0, 60);
}

async function main() {
  if (!fs.existsSync(APP)) {
    console.error(`não achei ${APP} — o corredor roda a partir do repositório.`);
    process.exit(2);
  }
  fs.copyFileSync(APP, COPIA);
  const lista = provas();
  if (!lista.length) { console.error("nenhuma prova casou com o filtro."); process.exit(2); }

  const versao = (fs.readFileSync(APP, "utf8").match(/versão (\d+\.\d+)/) || [])[1] || "?";
  console.log(`suíte de tela · ${lista.length} prova(s) · app ${versao} · `
            + `${paralelas} em paralelo\n`);

  const fila = lista.slice();
  const feitos = [];
  await Promise.all(Array.from({ length: paralelas }, async () => {
    while (fila.length) {
      const r = await rodar(fila.shift());
      feitos.push(r);
      const selo = r.estourou ? "ESTOUROU" : r.ok ? "ok      " : "FALHOU  ";
      console.log(`${selo} ${r.arquivo.padEnd(22)} ${String(r.seg).padStart(5)}s  ${placar(r.saida)}`);
    }
  }));

  const ruins = feitos.filter(r => !r.ok);
  for (const r of ruins) {
    console.log(`\n───── ${r.arquivo} ${r.estourou ? `(estourou o teto de ${TETO_MS / 1000}s)` : ""}`);
    console.log(r.saida.split("\n").slice(-30).join("\n").trimEnd());
  }
  console.log(`\n${feitos.length - ruins.length}/${feitos.length} provas passaram`
            + (ruins.length ? `  —  ${ruins.map(r => r.arquivo).join(", ")}` : ""));
  process.exit(ruins.length ? 1 : 0);
}

main();
