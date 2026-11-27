// F833 · piso de 12px: nenhuma regra de estilo do app declara letra abaixo de 12px. Uso: node f833.js
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../../app.html"), "utf8");
const achados = src.match(/font(-size)?:[^;}"']*?(?<![\d.])(\d|1[01])(\.\d+)?px/g) || [];
console.log((achados.length ? "FALHOU  " : "PASSOU  ") + "nenhuma letra abaixo de 12px" + (achados.length ? ": " + achados.slice(0, 5).join(" | ") : ""));
process.exit(achados.length ? 1 : 0);
