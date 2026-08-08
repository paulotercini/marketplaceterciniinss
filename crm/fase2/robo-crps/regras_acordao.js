// Resumir o acórdão SEM IA — só regras sobre o texto do PDF.
//
// É o mesmo caminho do extrator do To Do: o dispositivo do CRPS é formulário.
// "ACORDAM os membros da 25ª Junta... em conhecer do recurso e dar-lhe
// provimento parcial, para reconhecer como especial o período de X a Y,
// determinando a averbação..." — isso se lê com regra, não precisa de IA.
//
// O preço da regra é a cobertura: onde o texto foge do padrão, ela cala em
// vez de chutar. Melhor um "sem resumo" honesto que uma linha inventada.

// 1. o dispositivo é a parte que decide. Classificar o acórdão inteiro traz o
//    relatório e o voto junto — e o voto discute teses que NÃO foram acolhidas.
const ABRE = /(ACORDAM|ACORDA\b|RESOLVE[MN]?\b|DECIDE[MN]?\b|Ante o exposto|Isto posto|Isso posto|Pelo exposto|Diante do exposto|DISPOSITIVO)/i;
function dispositivo(texto) {
  const t = String(texto || '').replace(/\s+/g, ' ');
  // pega a ÚLTIMA abertura: em acórdão longo o voto costuma ensaiar antes
  let corte = -1, m;
  const re = new RegExp(ABRE.source, 'gi');
  while ((m = re.exec(t))) corte = m.index;
  if (corte < 0) return '';
  return t.slice(corte, corte + 2500);
}

// 2. o resultado do recurso. A ordem importa: "não conhecer" antes de tudo,
//    "parcial" antes de "provimento", diligência antes de negativa.
const RESULTADOS = [
  [/n[ãa]o\s+conhec(er|ido|imento)/i, 'Negou seguimento ao recurso (não conhecido)'],
  [/(dilig[êe]ncia|anular|nulidade|convert\w*\s+o\s+julgamento)/i, 'Anulou a decisão e determinou nova análise'],
  [/(provimento\s+parcial|parcial\s+provimento|parcialmente\s+provido|provimento\s+em\s+parte)/i,
    'Reformou em parte a decisão do INSS (provimento parcial)'],
  [/(negar[\s-]*lhe\s+provimento|negar\s+provimento|improvimento|n[ãa]o\s+provido|manter\s+a\s+decis[ãa]o)/i,
    'Manteve a decisão do INSS (recurso negado)'],
  [/(dar[\s-]*lhe\s+provimento|dar\s+provimento|provimento\s+ao\s+recurso|provido)/i,
    'Reformou a decisão do INSS (recurso provido)'],
];
function resultado(disp) {
  for (const [re, frase] of RESULTADOS) if (re.test(disp)) return frase;
  return null;
}

// 3. os períodos reconhecidos. Só valem os que estão perto de um verbo de
//    reconhecimento — data solta no dispositivo costuma ser DER, DIB ou a
//    data da sessão, e virar "período reconhecido" seria mentira.
const PERIODO = /(\d{2}\/\d{2}\/\d{4})\s*(?:a|at[ée]|à)\s*(\d{2}\/\d{2}\/\d{4})/g;
const RECONHECE = /(reconhec|averb|comput|enquadr|convert|declar)/i;
const ESPECIAL = /(especial|insalubr|agente\s+nocivo|ru[íi]do|periculos)/i;
const RURAL = /(rural|segurado\s+especial|lavoura|boia[\s-]?fria)/i;
function periodos(disp) {
  const achados = [];
  let m; PERIODO.lastIndex = 0;
  while ((m = PERIODO.exec(disp))) {
    const antes = disp.slice(Math.max(0, m.index - 220), m.index);
    // classifica pelo trecho a partir do ÚLTIMO verbo de reconhecimento. Com
    // a janela inteira, "especial" de uma frase contaminava a data da frase
    // seguinte — e "rural" virava "especial" sem ninguém perceber.
    const re = new RegExp(RECONHECE.source, 'gi');
    let ini = -1, v; while ((v = re.exec(antes))) ini = v.index;
    if (ini < 0) continue;                            // data solta não conta
    const trecho = antes.slice(ini);
    achados.push({ de: m[1], ate: m[2],
      tipo: ESPECIAL.test(trecho) ? 'especial' : RURAL.test(trecho) ? 'rural' : 'tempo' });
  }
  if (!achados.length) return null;
  const tipo = achados[0].tipo;
  if (!achados.every(a => a.tipo === tipo)) return null;   // misturou: não arrisca
  const lista = achados.map(a => `de ${a.de} a ${a.ate}`).join(' e ');
  const rot = tipo === 'especial' ? (achados.length > 1 ? 'como especiais os períodos' : 'como especial o período')
    : tipo === 'rural' ? (achados.length > 1 ? 'como rurais os períodos' : 'como rural o período')
    : (achados.length > 1 ? 'os períodos' : 'o período');
  return `Reconheceu ${rot} ${lista}`;
}

// 4. o que a decisão mandou fazer. Fica em segundo plano: se passar de 4
//    linhas, o resultado e os períodos ficam, estas caem.
const ORDENS = [
  [/averb/i, 'Determinou a averbação do tempo reconhecido'],
  [/(nova\s+per[íi]cia|nova\s+avalia[çc][ãa]o\s+m[ée]dica|reavalia[çc][ãa]o\s+m[ée]dica)/i, 'Determinou nova perícia médica'],
  [/restabelec/i, 'Determinou o restabelecimento do benefício'],
  [/(conced\w*\s+o\s+benef[íi]cio|concess[ãa]o\s+do\s+benef[íi]cio|implant\w*\s+o\s+benef[íi]cio)/i, 'Concedeu o benefício'],
  [/(mantendo\s+o\s+indeferimento|indeferimento\s+\w*\s*mantido|mantida\s+a\s+decis[ãa]o\s+recorrida)/i,
    'Não reconheceu o direito ao benefício'],
];
function ordens(disp) {
  return ORDENS.filter(([re]) => re.test(disp)).map(([, frase]) => frase);
}

// junta tudo, no mesmo formato que o resumidor com IA devolve
function resumirPorRegras(texto) {
  const disp = dispositivo(texto);
  if (!disp) return { conseguiu: false, linhas: [], motivo: 'não achei o dispositivo no PDF (pode ser digitalizado)' };
  const res = resultado(disp);
  if (!res) return { conseguiu: false, linhas: [], motivo: 'o dispositivo não segue o padrão que sei ler' };
  const linhas = [res];
  const per = periodos(disp); if (per) linhas.push(per);
  for (const o of ordens(disp)) { if (linhas.length >= 4) break; linhas.push(o); }
  return { conseguiu: true, linhas, motivo: '' };
}

module.exports = { dispositivo, resultado, periodos, ordens, resumirPorRegras };
