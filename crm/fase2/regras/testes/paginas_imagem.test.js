// F188 · quais páginas de um PDF são só imagem (o processo administrativo do
// INSS juntado no PJe: texto nas folhas de protocolo, o resto escaneado com
// a tarja de assinatura do PJe por cima)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'app.html'), 'utf8');
function extrair(nome) {
  const i = html.indexOf(`function ${nome}(`);
  let n = 0, j = html.indexOf('{', i);
  for (let k = j; k < html.length; k++) {
    if (html[k] === '{') n++;
    if (html[k] === '}' && --n === 0) return html.slice(i, k + 1);
  }
}
const ctx = {};
new Function('ctx', `${extrair('paginaSemConteudo')}; ${extrair('faixasDePaginas')};
  ctx.paginaSemConteudo = paginaSemConteudo; ctx.faixasDePaginas = faixasDePaginas;`)(ctx);

test('folha escaneada com a tarja do PJe é imagem; peça com texto não é', () => {
  const tarja = 'Assinado eletronicamente por: FULANO DE TAL - 12/03/2024 10:11:12\nhttps://pje1g.trf3.jus.br/pje/Processo/ConsultaDocumento/listView.seam?x=1\nNúmero do documento: 24031210111200000301234567\nNum. 301234567 - Pág. 7';
  assert.ok(ctx.paginaSemConteudo(tarja));
  assert.ok(ctx.paginaSemConteudo('Página 7 de 55'));
  assert.ok(ctx.paginaSemConteudo(''));
  const peca = 'EXCELENTÍSSIMO SENHOR DOUTOR JUIZ FEDERAL. O autor, já qualificado, vem respeitosamente apresentar réplica à contestação, '
    + 'pelos fatos e fundamentos a seguir expostos, demonstrando que o tempo especial está comprovado pelo PPP juntado aos autos.';
  assert.ok(!ctx.paginaSemConteudo(peca + '\n' + tarja));
});

test('as páginas viram faixas: 3, 7 a 12', () => {
  assert.equal(ctx.faixasDePaginas([12, 3, 7, 8, 9, 10, 11]), '3, 7 a 12');
  assert.equal(ctx.faixasDePaginas([1]), '1');
  assert.equal(ctx.faixasDePaginas([]), '');
});
