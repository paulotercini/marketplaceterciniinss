#!/usr/bin/env node
// CURA DE MOJIBAKE — desfaz, sem perda, o estrago das rodadas em que o
// resolvedor escolheu a tabela errada.
//
// O QUE ACONTECEU: os bytes do e-SAJ são UTF-8, mas o resolvedor decodificou
// como windows-1252 (o `TextDecoder('iso-8859-1')` da Web é cp1252, não
// latin1). "Cível" virou "CÃ­vel". O `resolver-codigos.js` já foi consertado
// — decodifica UTF-8 e ponto —, mas os arquivos das rodadas ruins continuam
// na máquina, e refazer 180 requisições contra o tribunal para consertar
// acento seria abusar do servidor à toa.
//
// POR QUE DÁ PARA DESFAZER: o dano é uma bijeção. Cada caractere do texto
// estragado corresponde a um byte do original; basta reconverter caractere →
// byte pela tabela cp1252 e reler os bytes como UTF-8.
//
// A ARMADILHA, que custou uma tentativa: latin1 NÃO serve. As duas tabelas só
// divergem em 0x80–0x9F, mas é exatamente ali que cai o segundo byte das
// MAIÚSCULAS acentuadas. Revertendo por latin1, "SEBASTIÃO" vira "SEBASTIÒO":
// 166 campos ficaram para trás. Com cp1252, voltam todos.
//
// Uso:  node curar-mojibake.js <arquivo.json> [saida.json]
const fs = require('fs');

// cp1252 difere do latin1 só nesta faixa. Mapa reverso: caractere -> byte.
const CP1252 = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F,
};

function paraBytes(s) {
  const b = [];
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (CP1252[c] !== undefined) b.push(CP1252[c]);
    else if (c <= 0xFF) b.push(c);
    else return null;              // fora da tabela: não nasceu deste dano
  }
  return Buffer.from(b);
}

// Só troca se a leitura fechar. Um texto que já está certo, ou que nunca foi
// estragado por este caminho, sai intacto — a cura nunca piora.
function curar(s) {
  const b = paraBytes(s);
  if (!b) return s;
  const v = b.toString('utf8');
  return v.includes('�') ? s : v;
}

let curados = 0, intactos = 0;
function andar(o) {
  if (Array.isArray(o)) return o.map(andar);
  if (o && typeof o === 'object') {
    const r = {};
    for (const k in o) r[k] = andar(o[k]);
    return r;
  }
  if (typeof o === 'string' && /[^\x00-\x7F]/.test(o)) {
    const c = curar(o);
    c !== o ? curados++ : intactos++;
    return c;
  }
  return o;
}

const entrada = process.argv[2];
if (!entrada) {
  console.error('uso: node curar-mojibake.js <arquivo.json> [saida.json]');
  process.exit(1);
}
const saida = process.argv[3] || entrada.replace(/\.json$/, '') + '.curado.json';
const dados = andar(JSON.parse(fs.readFileSync(entrada, 'utf8')));
fs.writeFileSync(saida, JSON.stringify(dados, null, 2), 'utf8');

// A conferência que importa: nome é a ponte com o CRM. Se sobrar mojibake
// num nome, o cruzamento erra silenciosamente — então isto vira número.
const SUJO = new RegExp('[\\u00C2\\u00C3][\\u0080-\\u00BF]');
const textos = [].concat(
  dados.flatMap(x => (x.partes || []).map(p => p.nome)),
  dados.flatMap(x => (x.partes || []).flatMap(p => p.advogados || [])),
  dados.map(x => x.rotulo),
).filter(Boolean);
const sujos = textos.filter(t => SUJO.test(t));

console.log('campos curados            :', curados);
console.log('campos que já estavam bons:', intactos);
console.log('nomes/advogados/rótulos   :', textos.length, '-> ainda sujos:', sujos.length);
if (sujos.length) sujos.slice(0, 5).forEach(t => console.log('   !', t));
console.log('escrito:', saida);
