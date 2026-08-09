// O que estamos pedindo, de fato, naquele caso.
//
// "Aposentadoria por tempo de contribuição" é a espécie B42 e não diz nada
// para quem trabalha com isso o dia inteiro. O escritório pede coisas muito
// diferentes debaixo do mesmo B42: reconhecimento de tempo rural, de tempo
// especial, de tempo de magistério, redução por deficiência — e, com
// frequência, mais de uma ao mesmo tempo.
//
// Por que MARCADORES e não uma lista de sub-espécies: porque eles se somam.
// Rural + especial existe. Rural + especial + deficiência existe. Uma lista
// de opções fechadas obrigaria a inventar um item para cada combinação (são
// 15 só com quatro marcadores) e ainda assim erraria na décima sexta. Com
// marcadores independentes, a combinação nasce sozinha.
//
// Eles não trocam a espécie: o B42 continua B42 no INSS. O que muda é o que
// a ficha diz para quem olha, e o que o checklist pede de documento.

const MARCADORES = [
  { slug: 'rural', rot: 'Rural', icone: '🌾', cor: '#7A8B2E',
    dica: 'reconhecimento de tempo de atividade rural',
    docs: [
      'Autodeclaração rural (formulário do INSS)',
      'Prova material do período rural (notas de produtor, ITR, contrato de parceria, escritura)',
      'Documentos de escola/igreja/sindicato com a qualificação de lavrador',
      'Indicar testemunhas do período rural (nome, telefone, período que conviveu)',
    ] },
  { slug: 'especial', rot: 'Especial', icone: '⚗️', cor: '#1F6FB2',
    dica: 'reconhecimento de tempo especial (exposição a agente nocivo)',
    docs: [
      'PPP — Perfil Profissiográfico Previdenciário de cada empresa',
      'LTCAT ou laudo técnico das condições ambientais',
      'CTPS e ficha de registro dos períodos alegados como especiais',
      'Conferir no PPP: agente nocivo, técnico responsável e período sem lacuna',
    ] },
  { slug: 'pcd', rot: 'Deficiência', icone: '♿', cor: '#7A5AA8',
    dica: 'aposentadoria da pessoa com deficiência (LC 142/2013)',
    docs: [
      'Laudos, exames e relatórios que comprovem a deficiência e desde quando',
      'Requerer a avaliação biopsicossocial (perícia médica + serviço social)',
      'Levantar os períodos trabalhados COM a deficiência (é o que define o grau)',
    ] },
  { slug: 'professor', rot: 'Professor', icone: '🍎', cor: '#C6541A',
    dica: 'tempo de magistério na educação básica',
    docs: [
      'Certidão de tempo de magistério da escola/secretaria (com as funções exercidas)',
      'CTPS e contracheques do período de magistério',
      'Conferir se todo o período é de educação básica — coordenação e direção contam, ensino superior não',
    ] },
];

const POR_SLUG = new Map(MARCADORES.map(m => [m.slug, m]));

// aceita a lista do caso em qualquer estado (nula, string solta, com lixo)
function marcadoresDe(k) {
  const bruto = k && k.marcadores;
  const lista = Array.isArray(bruto) ? bruto : (bruto ? [bruto] : []);
  const vistos = new Set();
  // a ordem é a do catálogo, não a de clique: assim "Rural + Especial" é
  // sempre escrito do mesmo jeito, e duas fichas iguais parecem iguais
  return MARCADORES.filter(m => {
    const tem = lista.some(x => String(x).trim().toLowerCase() === m.slug);
    if (tem && !vistos.has(m.slug)) { vistos.add(m.slug); return true; }
    return false;
  }).map(m => m.slug);
}

function alternar(k, slug) {
  if (!POR_SLUG.has(slug)) return marcadoresDe(k);
  const atuais = marcadoresDe(k);
  const fora = atuais.includes(slug) ? atuais.filter(x => x !== slug) : [...atuais, slug];
  return marcadoresDe({ marcadores: fora });
}

// "Tempo de contribuição · Rural + Especial" — a linha que responde, de
// relance, o que está sendo pedido para aquele cliente
function rotuloDoPedido(k) {
  const base = String((k && k.beneficio) || '').trim();
  const marcas = marcadoresDe(k).map(s => POR_SLUG.get(s).rot);
  if (!marcas.length) return base;
  return base ? `${base} · ${marcas.join(' + ')}` : marcas.join(' + ');
}

// os documentos que cada marcador acrescenta ao checklist do caso. Vêm DEPOIS
// dos do benefício e sem repetir o que já está lá: o marcador soma, não troca.
function docsDosMarcadores(k, jaTem = []) {
  const tidos = new Set(jaTem.map(x => String(x).trim().toLowerCase()));
  const fora = [];
  for (const slug of marcadoresDe(k))
    for (const d of POR_SLUG.get(slug).docs) {
      const chave = d.trim().toLowerCase();
      if (tidos.has(chave)) continue;
      tidos.add(chave);
      fora.push(d);
    }
  return fora;
}

module.exports = { MARCADORES, POR_SLUG, marcadoresDe, alternar, rotuloDoPedido, docsDosMarcadores };
