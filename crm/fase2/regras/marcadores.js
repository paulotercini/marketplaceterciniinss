// O que estamos pedindo, de fato.
//
// A espécie do INSS não diz o que o escritório faz. Debaixo do mesmo B42 há
// reconhecimento de tempo rural, de tempo especial, redução por deficiência —
// e com frequência mais de um no mesmo pedido.
//
// Por que MARCADORES e não sub-espécies: porque eles se somam. Rural +
// especial existe; rural + especial + deficiência existe. Uma lista fechada
// precisaria de um item por combinação e ainda erraria na seguinte.
//
// DUAS REGRAS que este arquivo respeita:
//
// 1. Marcador não repete o que a espécie já diz. Professor tem espécie
//    própria (B57) e aposentadoria especial também (B46) — nesses casos o
//    código do INSS já é a resposta, e marcar de novo seria ruído. Por isso
//    cada marcador declara em QUE espécies ele faz sentido.
//
// 2. Reconhecer tempo rural não é o mesmo que o benefício ser rural. Na
//    aposentadoria por idade, o tempo rural pode entrar para somar carência e
//    valor num pedido urbano — ou o pedido pode ser o do segurado especial,
//    com idade reduzida (55/60) e sem contribuição. São coisas diferentes e
//    ficam em marcadores diferentes.

const MARCADORES = [
  { slug: 'rural', rot: 'Rural', icone: '🌾', cor: '#7A8B2E',
    especies: ['B42', 'B41', 'B46'],
    dica: 'reconhecimento de tempo de atividade rural, para somar tempo/carência ou aumentar o valor',
    docs: [
      'Autodeclaração rural (formulário do INSS)',
      'Prova material do período rural (notas de produtor, ITR, contrato de parceria, escritura)',
      'Documentos de escola/igreja/sindicato com a qualificação de lavrador',
      'Indicar testemunhas do período rural (nome, telefone, período que conviveu)',
    ] },
  { slug: 'idaderural', rot: 'Idade rural', icone: '🚜', cor: '#4E7A3A',
    especies: ['B41'],
    dica: 'aposentadoria por idade do segurado especial — 55 anos (mulher) / 60 (homem), sem contribuição',
    docs: [
      'Comprovar a atividade rural no período imediatamente anterior ao requerimento',
      'Autodeclaração rural homologada (sindicato, INCRA ou órgão indicado)',
      'Conferir se a idade reduzida já foi alcançada (55 mulher / 60 homem)',
    ] },
  { slug: 'especial', rot: 'Especial', icone: '⚗️', cor: '#1F6FB2',
    especies: ['B42', 'B41'],
    dica: 'reconhecimento de tempo especial para converter em comum ou aumentar o valor '
        + '(quando o pedido É a aposentadoria especial, a espécie B46 já diz isso)',
    docs: [
      'PPP — Perfil Profissiográfico Previdenciário de cada empresa',
      'LTCAT ou laudo técnico das condições ambientais',
      'CTPS e ficha de registro dos períodos alegados como especiais',
      'Conferir no PPP: agente nocivo, técnico responsável e período sem lacuna',
    ] },
  { slug: 'pcd', rot: 'Deficiência', icone: '♿', cor: '#7A5AA8',
    especies: ['B42', 'B41'],
    dica: 'aposentadoria da pessoa com deficiência (LC 142/2013) — por tempo de contribuição ou por idade',
    docs: [
      'Laudos, exames e relatórios que comprovem a deficiência e desde quando',
      'Requerer a avaliação biopsicossocial (perícia médica + serviço social)',
      'Levantar os períodos trabalhados COM a deficiência (é o que define o grau)',
    ] },
];

const POR_SLUG = new Map(MARCADORES.map(m => [m.slug, m]));

// os marcadores que fazem sentido para a espécie do caso. Sem espécie
// definida mostramos todos: é melhor oferecer demais do que esconder o certo.
function doCatalogo(especie) {
  const e = String(especie || '').trim().toUpperCase();
  if (!e) return MARCADORES;
  return MARCADORES.filter(m => m.especies.includes(e));
}

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

// A mesma pessoa PODE ter dois pedidos da mesma espécie — um B42 por
// deficiência e outro B42 por tempo especial são pedidos diferentes, com
// protocolo e decisão próprios. O que não faz sentido é o mesmo pedido
// cadastrado duas vezes: mesma espécie E mesmos marcadores.
function pedidosIguais(a, b) {
  const eA = String((a && a.especie) || '').trim().toUpperCase();
  const eB = String((b && b.especie) || '').trim().toUpperCase();
  if (!eA || eA !== eB) return false;
  const mA = marcadoresDe(a), mB = marcadoresDe(b);
  return mA.length === mB.length && mA.every((x, i) => x === mB[i]);
}

module.exports = { MARCADORES, POR_SLUG, doCatalogo, marcadoresDe, alternar,
  rotuloDoPedido, docsDosMarcadores, pedidosIguais };
