// Um caso para cada recurso administrativo.
//
// Um cliente pode ter dois, três recursos correndo ao mesmo tempo — um do
// benefício negado, outro do pedido de revisão, outro do especial. Cada um
// tem NÚMERO DE PROTOCOLO próprio, prazo próprio, decisão própria e resultado
// próprio. Empilhar todos numa ficha só faz o CRM mentir de três jeitos:
//
//   - o "Situação" do caso passa a ser o de um dos recursos, escolhido por
//     acaso — quem lê acha que é do processo inteiro;
//   - o comentário do robô cai numa linha do tempo compartilhada, e ninguém
//     sabe de qual recurso é aquele "Recurso negado";
//   - encerrar o caso quando um recurso acaba enterra os outros junto.
//
// Este módulo calcula a separação: quem fica no caso original, quais casos
// novos nascem e o que cada um leva. Só cálculo — quem grava é o app.
//
// O que o caso novo herda: os dados do cliente e do benefício (é o mesmo
// pedido, na mesma fase). O que NÃO herda: o histórico de comentários. Um
// andamento pertence ao momento em que foi escrito, e adivinhar a qual
// recurso ele se referia seria inventar. Cada lado ganha uma nota dizendo de
// onde veio, e o histórico antigo continua inteiro no caso de origem.

const CAMPOS_HERDADOS = [
  'cliente_id', 'beneficio', 'fase', 'especie', 'nb', 'parceria',
  'der', 'dib', 'dii', 'dat', 'urgente', 'origem_lista',
];

const so = x => String(x || '').replace(/\D/g, '');

function nupsDoCaso(k) {
  const arr = Array.isArray(k.crps_nups) ? k.crps_nups : [];
  const lista = arr.map(so).filter(Boolean);
  const unico = so(k.crps_nup);
  if (unico && !lista.includes(unico)) lista.push(unico);
  return [...new Set(lista)];
}
function blocosDoCaso(k) {
  return Array.isArray(k.crps) ? k.crps : (k.crps ? [k.crps] : []);
}
// "44233.139765/2025-37" — o número como o INSS o escreve
function formatarNup(d) {
  const n = so(d);
  if (n.length !== 17) return String(d || '');
  return `${n.slice(0, 5)}.${n.slice(5, 11)}/${n.slice(11, 15)}-${n.slice(15)}`;
}

// o título distingue os irmãos na lista: sem isso o cliente aparece três
// vezes com o mesmo nome e ninguém sabe qual abrir
function tituloDoRecurso(k, nup, i) {
  const base = String(k.titulo || '').replace(/\s*—\s*recurso\s.*$/i, '').trim();
  return `${base} — recurso ${i}/${formatarNup(nup)}`;
}

// Calcula a separação. Devolve:
//   { fica, novos, precisa }
//     fica    — como o caso original deve ficar (só o 1º recurso)
//     novos   — um objeto por caso a criar, com o campo `nup` e o `crps`
//     precisa — false quando não há o que separar (0 ou 1 recurso)
function planoDeSeparacao(k) {
  const nups = nupsDoCaso(k);
  if (nups.length < 2) return { precisa: false, fica: null, novos: [] };
  const blocos = blocosDoCaso(k);
  const blocoDe = n => blocos.find(b => so(b.nup) === n) || null;

  const [primeiro, ...resto] = nups;
  const fica = {
    id: k.id,
    titulo: tituloDoRecurso(k, primeiro, 1),
    crps_nups: [primeiro],
    crps_nup: null,
    crps: blocoDe(primeiro) ? [blocoDe(primeiro)] : [],
  };
  const novos = resto.map((n, i) => {
    const novo = { nup: n, titulo: tituloDoRecurso(k, n, i + 2),
                   crps_nups: [n], crps_nup: null,
                   crps: blocoDe(n) ? [blocoDe(n)] : [] };
    for (const c of CAMPOS_HERDADOS) if (k[c] !== undefined && k[c] !== null) novo[c] = k[c];
    return novo;
  });
  return { precisa: true, fica, novos };
}

// nenhum recurso pode sumir na separação: é a conferência que roda antes de
// gravar qualquer coisa
function conferirPlano(k, plano) {
  const antes = nupsDoCaso(k);
  const depois = [...(plano.fica ? plano.fica.crps_nups : []),
                  ...plano.novos.map(n => n.nup)];
  if (antes.length !== depois.length) return `sobrou/faltou recurso: ${antes.length} → ${depois.length}`;
  for (const n of antes) if (!depois.includes(n)) return `o recurso ${formatarNup(n)} ficaria sem caso`;
  const blocosAntes = blocosDoCaso(k).length;
  const blocosDepois = (plano.fica ? plano.fica.crps.length : 0)
    + plano.novos.reduce((s, x) => s + x.crps.length, 0);
  if (blocosAntes !== blocosDepois) return `o histórico de um recurso ficaria para trás (${blocosAntes} → ${blocosDepois})`;
  return null;
}

module.exports = { planoDeSeparacao, conferirPlano, nupsDoCaso, blocosDoCaso,
  formatarNup, tituloDoRecurso, CAMPOS_HERDADOS };
