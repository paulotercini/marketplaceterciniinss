// F839 · paleta única, camadas nomeadas e espaçamento em passos: a folha de estilo não declara cor literal fora da paleta
// (variáveis --p-* e de tema), camada sem nome nem espaçamento ímpar. Uso: node f839.js
const fs = require("fs"), path = require("path");
const css = ["base.css", "tema-v10.css"].map(f => { const t = fs.readFileSync(path.join(__dirname, "../../src/css", f), "utf8"); return t.slice(0, t.lastIndexOf("</style>")); }).join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
const provas = [
  ["nenhuma cor literal fora da paleta", /(?<![\w-])(?!--)[a-z][a-z-]*\s*:[^;{}]*#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])(?=[^;{}]*[;}])/g],
  ["nenhuma camada sem nome", /z-index:\s*[1-9]\d*\s*[;}!]/g],
  ["nenhum espaçamento ímpar acima de 1px", /(?<![\w-])(?:gap|row-gap|column-gap|padding|margin)(?:-(?:top|right|bottom|left))?:(?:(?![;{}(]).)*?(?<![\d.\w-])\d*[13579]px(?<!(?<![\d.])1px)/g],
];
let falhas = 0;
for (const [nome, re] of provas) { const a = css.match(re) || []; if (a.length) falhas++;
  console.log((a.length ? "FALHOU  " : "PASSOU  ") + nome + (a.length ? `: ${a.length}, ex. ` + a.slice(0, 4).join(" | ").slice(0, 300) : "")); }
process.exit(falhas ? 1 : 0);
