// Lê o que foi COLADO do painel de movimentações do PJe / e-SAJ.
//
// O advogado não confere processo por processo: ele abre o painel, que lista
// as movimentações em ordem de data, e lê só o intervalo desde a última vez.
// Às 9h leu tudo; às 13h aparecem cinco linhas novas. Pedir um clique por
// processo seria cobrar trabalho onde não há trabalho — os que não se
// mexeram ele nem abre.
//
// Então o CRM não pergunta "você conferiu este?". Ele recebe as linhas que
// apareceram, de uma vez, e transforma cada uma em comentário na ficha certa.
// Uma colagem por leitura, em vez de vinte cliques.
//
// A colagem vem torta de propósito: cada sistema quebra a linha de um jeito,
// e ninguém vai formatar nada antes de colar. A única âncora confiável é o
// número CNJ, que tem forma fixa. Tudo que vem depois dele (até o próximo
// número) é o texto da movimentação.

// NNNNNNN-DD.AAAA.J.TR.OOOO — com ou sem os separadores
const RE_CNJ = /(\d{7})-?(\d{2})\.?(\d{4})\.?(\d)\.?(\d{2})\.?(\d{4})/g;
const RE_DATA = /(\d{2})\/(\d{2})\/(\d{4})/;

const soDigitos = s => String(s || '').replace(/\D/g, '');
function formatarCNJ(d) {
  const n = soDigitos(d);
  if (n.length !== 20) return String(d || '');
  return `${n.slice(0, 7)}-${n.slice(7, 9)}.${n.slice(9, 13)}.${n.slice(13, 14)}.${n.slice(14, 16)}.${n.slice(16)}`;
}

// tira o lixo que todo painel arrasta junto: numeração de linha, marcadores,
// "Nº", rótulos de coluna e espaço repetido
function limparTexto(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s•·\-–—|>*\d.)\]]+/, '')
    .replace(/^(n[ºo°]\.?|processo|autos|movimenta[çc][ãa]o|[úu]ltimo andamento)\s*[:\-–]?\s*/i, '')
    .replace(/[\s|;,.-]+$/, '')
    .trim();
}

// A colagem inteira, não linha a linha: o painel quebra a mesma movimentação
// em duas ou três linhas, e casar por linha partiria o texto ao meio. Cada
// número CNJ abre um trecho que vai até o número seguinte.
function analisarColagem(bruto) {
  const txt = String(bruto || '');
  const achados = [];
  let m;
  RE_CNJ.lastIndex = 0;
  while ((m = RE_CNJ.exec(txt)) !== null) achados.push({ i: m.index, fim: m.index + m[0].length, num: soDigitos(m[0]) });
  if (!achados.length) return [];

  const fora = [];
  for (let n = 0; n < achados.length; n++) {
    const a = achados[n];
    const ate = n + 1 < achados.length ? achados[n + 1].i : txt.length;
    // até o próximo número — mas parando na primeira linha em branco depois
    // de já ter texto. O último processo da colagem, sem número adiante para
    // limitá-lo, engoliria o rodapé da tela ("CPF 123...", "1 de 40").
    const corpo = (txt.slice(a.fim, ate).split(/\n\s*\n/).map(x => x.trim()).filter(Boolean)[0]) || '';
    const d = corpo.match(RE_DATA);
    // a data sai do texto para não sujar o comentário: ela vira campo
    const texto = limparTexto(d ? corpo.replace(d[0], ' ') : corpo);
    const item = { numero: formatarCNJ(a.num), digitos: a.num, texto };
    if (d) item.data = `${d[3]}-${d[2]}-${d[1]}`;
    // o mesmo processo repetido na colagem (duas movimentações) entra duas
    // vezes: são dois fatos. Repetição idêntica, não — é o painel duplicando.
    if (!fora.some(x => x.digitos === item.digitos && x.texto === item.texto && x.data === item.data))
      fora.push(item);
  }
  return fora;
}

// casa cada achado com o caso do CRM pelo número do processo
function casar(achados, casos) {
  const porNumero = new Map();
  for (const k of (casos || [])) {
    const n = soDigitos(k.processo);
    if (n.length === 20) porNumero.set(n, k);
  }
  return (achados || []).map(a => ({ ...a, caso: porNumero.get(a.digitos) || null }));
}

module.exports = { analisarColagem, casar, formatarCNJ, limparTexto, soDigitos, RE_CNJ };
