// Resumir o acórdão SEM IA — só regras sobre o texto do PDF.
//
// ── O QUE O TEXTO REAL ENSINOU (a primeira versão foi escrita no escuro) ──
//
// 1. O dispositivo do CRPS é uma fórmula seca, e NÃO tem os períodos:
//      "ACORDAM os membros da 28ª Junta de Recursos, em CONHECER DO RECURSO
//       E NEGAR-LHE PROVIMENTO, POR UNANIMIDADE, de acordo com o voto do(a)
//       Relator(a) e sua fundamentação."
//    Os períodos reconhecidos moram na FUNDAMENTAÇÃO, em prosa longa. Por
//    isso a primeira rodada trouxe 63 resumos e zero períodos: não era bug,
//    era o documento. Regra não lê fundamentação — quem lê é a IA.
//
// 2. Em compensação, o dispositivo diz coisas que o e-Recursos ESCONDE, e
//    é aí que a regra ganha o seu sustento:
//      • embargos acolhidos "com efeito integrativo ... mantendo-se a decisão
//        proferida no Acórdão objurgado" — o e-Recursos chamava de PROVIDO
//        e o cliente continuava perdido;
//      • "DAR-LHE PROVIMENTO PARCIAL, sem a concessão do benefício";
//      • o resultado, quando o e-Recursos só diz "Acórdão publicado";
//      • dois atos encadeados ("CONHECER DO EMBARGO PARA ANULAR O ACÓRDÃO
//        ... E CONHECER DO RECURSO PARA ... DAR PROVIMENTO PARCIAL"), que a
//        versão anterior lia pela metade e resumia como "Anulou".
//
// 3. A CONCLUSÃO do voto repete o dispositivo e às vezes traz a ressalva que
//    muda tudo. Lemos as duas.

// ── recorte ────────────────────────────────────────────────────────────────
// o decisório é a ÚLTIMA ocorrência de ACORDAM/RESOLVE: no PDF ele aparece
// duas vezes (no corpo e na folha de assinaturas), e o voto ainda ensaia um
// "Ante o exposto" antes. A conclusão do voto entra junto, mas separada.
function dispositivo(texto) {
  const t = String(texto || '').replace(/\s+/g, ' ');
  const re = /(ACORDAM|ACORDA\b|RESOLVE[MN]?\b|DECIDE[MN]?\b)/gi;
  let corte = -1, m;
  while ((m = re.exec(t))) corte = m.index;
  if (corte < 0) return '';
  return t.slice(corte, corte + 1200);
}
function conclusao(texto) {
  const t = String(texto || '').replace(/\s+/g, ' ');
  const re = /(CONCLUS[ÃA]O|Ante o exposto|Isto posto|Isso posto|Pelo exposto|Diante do exposto)/gi;
  let corte = -1, m;
  while ((m = re.exec(t))) corte = m.index;
  if (corte < 0) return '';
  return t.slice(corte, corte + 700);
}

// ── os atos do decisório ───────────────────────────────────────────────────
// "CONHECER DO <objeto> ... <verbo>", uma ou duas vezes na mesma frase.
const OBJETO = /(RECURSO\s+ESPECIAL|RECURSO|EMBARGOS?|INCIDENTE|PEDIDO)/i;
function atos(disp) {
  const t = disp.replace(/\s+/g, ' ');
  const re = /(N[ÃA]O\s+CONHECER|CONHECER)\s+(?:DOS?|DAS?)\s+(RECURSO\s+ESPECIAL|RECURSO|EMBARGOS?|INCIDENTE|PEDIDO)/gi;
  const marcos = [];
  let m; while ((m = re.exec(t))) marcos.push({ i: m.index, fim: re.lastIndex, conhece: !/N[ÃA]O/i.test(m[1]),
    objeto: /EMBARGO/i.test(m[2]) ? 'embargos' : /ESPECIAL/i.test(m[2]) ? 'especial' : 'recurso' });
  if (!marcos.length) return [];
  return marcos.map((mk, n) => {
    const corpo = t.slice(mk.fim, n + 1 < marcos.length ? marcos[n + 1].i : mk.fim + 260);
    let verbo = null;
    if (!mk.conhece) verbo = 'nao_conhecido';
    else if (/ANULAR|ANULA[ÇC][ÃA]O/i.test(corpo)) verbo = 'anulado';
    else if (/PROVIMENTO\s+PARCIAL|PARCIAL\s+PROVIMENTO|PARCIALMENTE\s+PROVID/i.test(corpo)) verbo = 'parcial';
    else if (/NEGAR[\s-]*LHES?\s+PROVIMENTO|NEGAR\s+PROVIMENTO|IMPROVIMENTO/i.test(corpo)) verbo = 'negado';
    else if (/DAR[\s-]*LHES?\s+PROVIMENTO|DAR\s+PROVIMENTO|ACOLHER/i.test(corpo)) verbo = 'provido';
    return verbo ? { objeto: mk.objeto, verbo } : null;
  }).filter(Boolean);
}

const FRASES = {
  'recurso:negado': 'Manteve a decisão do INSS (recurso negado)',
  'recurso:provido': 'Reformou a decisão do INSS (recurso provido)',
  'recurso:parcial': 'Reformou em parte a decisão do INSS (recurso provido em parte)',
  'recurso:nao_conhecido': 'Negou seguimento ao recurso (não conhecido)',
  'recurso:anulado': 'Anulou a decisão recorrida',
  'especial:negado': 'Manteve a decisão (recurso especial negado)',
  'especial:provido': 'Reformou a decisão (recurso especial provido)',
  'especial:parcial': 'Reformou em parte a decisão (recurso especial provido em parte)',
  'especial:nao_conhecido': 'Negou seguimento ao recurso especial (não conhecido)',
  'especial:anulado': 'Anulou a decisão recorrida',
  'embargos:provido': 'Acolheu os embargos de declaração',
  'embargos:negado': 'Rejeitou os embargos de declaração',
  'embargos:nao_conhecido': 'Rejeitou os embargos de declaração (não conhecidos)',
  'embargos:anulado': 'Anulou o acórdão anterior (acolhendo os embargos)',
  'embargos:parcial': 'Acolheu em parte os embargos de declaração',
};

// ── as ressalvas: o que o e-Recursos não conta ─────────────────────────────
const RESSALVAS = [
  [/(efeito\s+integrativo|mantendo[\s-]*se\s+a\s+decis[ãa]o\s+proferida\s+no\s+Ac[óo]rd[ãa]o|mant[êe]m[\s-]*se\s+os\s+termos\s+do\s+Ac[óo]rd[ãa]o|mantida\s+a\s+decis[ãa]o\s+embargada)/i,
    'Manteve o que o acórdão anterior já havia decidido'],
  [/sem\s+a\s+concess[ãa]o\s+do\s+benef[íi]cio/i, 'Não concedeu o benefício'],
  [/(n[ãa]o\s+faz(endo)?\s+.{0,25}jus\s+(ao|à)\s+benef[íi]cio|n[ãa]o\s+implementa\s+os\s+requisitos|n[ãa]o\s+preenche\s+(nenhuma|os)\s)/i,
    'Não reconheceu o direito ao benefício'],
];
function ressalvas(texto) {
  const vistos = new Set();
  for (const [re, frase] of RESSALVAS) if (re.test(texto)) vistos.add(frase);
  return [...vistos];
}

// ── junta tudo ─────────────────────────────────────────────────────────────
function resumirPorRegras(texto) {
  const disp = dispositivo(texto);
  if (!disp) return { conseguiu: false, linhas: [], motivo: 'não achei o decisório no PDF (pode ser digitalizado)' };
  const lista = atos(disp);
  if (!lista.length) return { conseguiu: false, linhas: [], motivo: 'o decisório não segue o padrão que sei ler' };

  const linhas = [];
  for (const a of lista) {
    const f = FRASES[`${a.objeto}:${a.verbo}`];
    if (f && !linhas.includes(f)) linhas.push(f);
  }
  if (!linhas.length) return { conseguiu: false, linhas: [], motivo: 'não entendi o que o decisório decidiu' };

  // a ressalva só vale se olhar para o fim do documento: no meio do voto o
  // relator discute hipóteses que não foram acolhidas
  const fim = conclusao(texto) + ' ' + String(texto).slice(-3000);
  for (const r of ressalvas(fim)) { if (linhas.length >= 4) break; if (!linhas.includes(r)) linhas.push(r); }
  return { conseguiu: true, linhas, motivo: '' };
}

// o resultado que o e-Recursos anuncia vs. o que o acórdão diz. Divergência
// não é para calar: é o achado mais valioso — foi assim que apareceu o
// "Recurso PROVIDO" que era, na verdade, embargo acolhido sem ganhar nada.
function divergeDoERecursos(statusERecursos, linhas) {
  const s = String(statusERecursos || '').toLowerCase();
  const l = linhas.join(' ').toLowerCase();
  if (!s || !l) return false;
  const ganhou = t => /provido|provimento/.test(t) && !/em parte|parcial|negad/.test(t);
  const perdeu = t => /negad|mantev|não conhec|nao conhec|rejeit/.test(t);
  // embargo anunciado como "Recurso PROVIDO" é o caso perigoso: alguém liga
  // para o cliente dando parabéns. Embargo com anúncio negativo concorda no
  // que importa — não vale gastar a atenção de ninguém com isso.
  if (/embargos/.test(l) && ganhou(s)) return true;
  return (ganhou(s) && perdeu(l)) || (perdeu(s) && ganhou(l));
}

module.exports = { dispositivo, conclusao, atos, ressalvas, resumirPorRegras, divergeDoERecursos, FRASES };
