#!/usr/bin/env node
// GERADOR DE ALVOS — favoritos exportados do navegador -> lista para o resolvedor.
//
// Por que existe: o acervo de verdade não está na consulta por OAB (que
// devolve ~93 processos) e sim nos seus favoritos, que guardam 180 códigos
// distintos do e-SAJ. Mas 161 dos 209 links NÃO trazem o número CNJ — só o
// `processo.codigo`, chave interna do e-SAJ. Este script colhe os códigos; o
// `resolver-codigos.js` é quem vai buscar o número do outro lado do link.
//
// SEPARAÇÃO QUE IMPORTA: aqui é CÓDIGO (versiona). A saída é DADO — tem nome
// de cliente no rótulo do favorito e a chave que abre os autos. A saída vai
// para alvos-acervo.js, que está no .gitignore e não sai da máquina.
//
// Uso:
//   node gerar-alvos.js "C:/caminho/favoritos.html"
//   node gerar-alvos.js "C:/caminho/favoritos.html" --pastas "A a J|I a Z|Processos"
//
// Escreve alvos-acervo.js ao lado deste arquivo e resume na tela.
const fs = require('fs');
const path = require('path');

const arq = process.argv[2];
if (!arq) {
  console.error('uso: node gerar-alvos.js <favoritos.html> [--pastas "A a J|I a Z|Processos"]');
  process.exit(1);
}
const iPastas = process.argv.indexOf('--pastas');
const RE_PASTAS = new RegExp(iPastas > 0 ? process.argv[iPastas + 1] : 'A a J|I a Z|Processos');

// O bookmarks.html do Chrome sai em windows-1252 e sem fechar <DT>. Leio como
// latin1 de propósito: 'utf8' aqui produz o U+FFFD que já apareceu na primeira
// leitura ("TERCrÃ©d"), e rótulo corrompido é cliente que não casa depois.
const html = fs.readFileSync(arq, 'latin1');

// <DT><H3>pasta</H3> abre um <DL>; </DL> fecha. Ando na ordem do arquivo e
// mantenho uma pilha — é o bastante para saber em que pasta cada link mora,
// sem depender de indentação nem de o Chrome fechar as tags.
function extrair(html) {
  const tok = html.match(/<H3[^>]*>[\s\S]*?<\/H3>|<A HREF="[^"]*"[^>]*>[\s\S]*?<\/A>|<\/DL>/gi) || [];
  const pilha = [], linhas = [];
  for (const t of tok) {
    if (/^<H3/i.test(t)) pilha.push(t.replace(/<[^>]+>/g, '').trim());
    else if (/^<\/DL/i.test(t)) pilha.pop();
    else linhas.push({
      pasta: pilha.join(' / '),
      url: (t.match(/HREF="([^"]*)"/i) || [])[1] || '',
      rotulo: t.replace(/<[^>]+>/g, '').trim(),
    });
  }
  return linhas;
}

// O favorito antigo carrega uuidCaptcha e conversationId de uma sessão que
// morreu há anos. Levar token vencido é convidar o e-SAJ a recusar; tiro os
// dois e deixo o RESTO como está — o que foi provado a funcionar na sonda da
// ficha foi a URL do favorito, não uma URL mínima que eu inventaria agora.
const LIXO = ['uuidCaptcha', 'conversationId'];
function limpar(u) {
  const url = new URL(u, 'https://esaj.tjsp.jus.br');
  for (const k of LIXO) url.searchParams.delete(k);
  return url.pathname + '?' + url.searchParams.toString();
}

const linhas = extrair(html).filter(l => RE_PASTAS.test(l.pasta));
const porCodigo = new Map();
const semCodigo = [];

for (const l of linhas) {
  let url;
  try { url = new URL(l.url, 'https://esaj.tjsp.jus.br'); } catch { continue; }
  if (!/esaj\.tjsp\.jus\.br$/.test(url.host)) { semCodigo.push(l); continue; }
  const codigo = url.searchParams.get('processo.codigo');
  if (!codigo) { semCodigo.push(l); continue; }
  // cpopg = 1º grau, cposg = 2º grau. O grau decide os seletores lá na frente:
  // a ficha do 1º grau foi sondada; a do 2º NÃO — e o resolvedor precisa saber
  // disso para marcar o que não conseguir ler em vez de inventar.
  const grau = /cposg/i.test(url.pathname) ? '2G' : /cpopg/i.test(url.pathname) ? '1G' : '?';
  // o primeiro favorito de cada código vence: os repetidos são a mesma capa
  // salva duas vezes, e visitar duas vezes é dobrar a carga no tribunal à toa
  if (porCodigo.has(codigo)) continue;
  porCodigo.set(codigo, {
    codigo, grau,
    foro: url.searchParams.get('processo.foro') || url.searchParams.get('cdForo') || null,
    url: limpar(l.url),
    rotulo: l.rotulo,
    pasta: l.pasta,
  });
}

const alvos = [...porCodigo.values()];
const semForo = alvos.filter(a => a.grau === '1G' && !a.foro);

const cabecalho = `// GERADO por gerar-alvos.js em ${new Date().toISOString()}
// FONTE: ${path.basename(arq)}
//
// ISTO É DADO, NÃO CÓDIGO. Tem rótulo de favorito (nome de cliente) e a chave
// que abre os autos. Está no .gitignore de propósito: não versiona, não sai da
// máquina, não vai para o chat.
//
// Uso: cole ESTE arquivo no console do e-SAJ logado, e depois o
// resolver-codigos.js. Este define window.__alvos; aquele consome.
window.__alvos =
`;
const saida = path.join(__dirname, 'alvos-acervo.js');
fs.writeFileSync(saida, cabecalho + JSON.stringify(alvos, null, 1) + ';\n', 'utf8');

const conta = (lista, chave) => lista.reduce((h, x) => (h[x[chave]] = (h[x[chave]] || 0) + 1, h), {});
console.log('favoritos nas pastas de processo :', linhas.length);
console.log('códigos DISTINTOS (os alvos)     :', alvos.length);
console.log('  por grau                       :', JSON.stringify(conta(alvos, 'grau')));
console.log('  1º grau SEM processo.foro      :', semForo.length, '(podem falhar ao abrir)');
console.log('links sem código de processo     :', semCodigo.length);
console.log('\nescrito:', saida);
