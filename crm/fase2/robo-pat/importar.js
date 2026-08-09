// O PLANO DE IMPORTAÇÃO — o que o PAT tem, o que o CRM tem, e o que muda.
//
// Este arquivo NÃO grava nada. Ele compara e devolve um plano, para a tela
// mostrar antes de tocar no banco. Importação de 100 requerimentos que
// escreve primeiro e explica depois é como se descobre, três dias depois,
// que noventa casos duplicados nasceram numa lista errada.
//
// A CHAVE É O PROTOCOLO. Cada requerimento do INSS tem o seu, e ele já vive
// em `casos.protocolos`. Quando o protocolo não bate, o CPF diz de quem é —
// e aí o caso é novo, mas o cliente não.
//
// PARA QUE LISTA VAI CADA COISA: a coleta mostrou que só 19 dos 100 ativos
// são pedido de benefício. Mandar tudo para a lista do INSS afogaria ela em
// recurso — que tem lista própria e robô próprio.
const LISTA_POR_TIPO = {
  beneficio: 'inss',
  revisao:   'inss',
  apuracao:  'inss',
  recurso:   'conselho',
};

// Serviço e pagamento NÃO abrem caso. "Atualizar vínculos" e "emissão de
// pagamento não recebido" acontecem DENTRO de um caso que já existe — viram
// andamento quando o protocolo casa, e nada quando não casa. Abrir caso para
// eles encheria a lista de tarefa administrativa sem cliente por trás.
const NAO_ABRE_CASO = new Set(['servico', 'pagamento']);

const digitos = s => String(s || '').replace(/\D/g, '');

// os protocolos de um caso, em qualquer estado que o campo esteja
function protocolosDe(k) {
  const p = (k || {}).protocolos;
  const lista = Array.isArray(p) ? p : (p ? [p] : []);
  return lista.map(x => digitos(x)).filter(Boolean);
}

// índice protocolo -> caso, e cpf -> cliente
function indexar(D) {
  const porProtocolo = new Map();
  for (const k of (D.casos || []))
    for (const p of protocolosDe(k)) if (!porProtocolo.has(p)) porProtocolo.set(p, k);
  const porCpf = new Map();
  for (const c of (D.clientes || [])) {
    const cpf = digitos(c.cpf);
    if (cpf && !porCpf.has(cpf)) porCpf.set(cpf, c);
  }
  return { porProtocolo, porCpf };
}

// O que muda num caso que JÁ existe. Só campo vazio é preenchido: o que o
// escritório escreveu à mão vale mais que o que o portal devolve, e
// sobrescrever DER conferida por DER do sistema é perder trabalho humano.
// A exceção é a situação, que é justamente o que se quer atualizado.
function mudancasDoCaso(k, det) {
  const m = {};
  if (det.der && !k.der) m.der = det.der;
  if (det.especie && !k.especie) m.especie = det.especie;
  if (det.beneficio && !k.beneficio) m.beneficio = det.beneficio;
  if (det.link && k.processo_link !== det.link) m.processo_link = det.link;
  if (det.urgente && !k.urgente) m.urgente = true;
  // marcadores SOMAM, nunca trocam: quem marcou à mão não perde a marcação
  const tinha = Array.isArray(k.marcadores) ? k.marcadores : [];
  const faltam = (det.marcadores || []).filter(x => !tinha.includes(x));
  if (faltam.length) m.marcadores = [...tinha, ...faltam];
  return m;
}

// Só AGENDADO vira compromisso, e só o que ainda não passou. O evento que já
// existe na agenda, com o mesmo tipo e a mesma data, não entra de novo.
function eventosNovos(det, jaTem, hoje) {
  const existe = new Set((jaTem || []).map(e =>
    `${e.tipo}|${String(e.data_hora || '').slice(0, 10)}`));
  return (det.eventos || [])
    .filter(e => e.ativo && e.data && e.data >= hoje)
    .filter(e => !existe.has(`${e.tipo}|${e.data}`))
    .map(e => ({ tipo: e.tipo, data: e.data, hora: e.hora || null, local: e.local || null }));
}

// A situação mudou desde a última vez? É isto que vira andamento — e só
// isto. Requerimento que continua "Em análise" há três meses não rende
// comentário nenhum; escrever "sem alteração" todo dia foi exatamente o que
// o escritório já fazia à mão e queria parar de fazer.
function andamentoDaMudanca(k, det) {
  const antes = k.situacao_inss || null;
  if (!det.situacao || det.situacao === antes) return null;
  if (!antes) return null;                 // primeira vez não é mudança
  return `INSS: ${antes} → ${det.situacao}`;
}

function planoDeImportacao(pat, D, hoje) {
  const hj = hoje || new Date().toISOString().slice(0, 10);
  const { porProtocolo, porCpf } = indexar(D);
  const porProtocoloPat = new Map((pat.lista || []).map(t => [digitos(t.protocolo), t]));
  const evDoCaso = new Map();
  for (const e of (D.eventos || [])) {
    if (!evDoCaso.has(e.caso_id)) evDoCaso.set(e.caso_id, []);
    evDoCaso.get(e.caso_id).push(e);
  }

  const plano = { atualizar: [], novos: [], semCliente: [], soAndamento: [],
                  ignorados: [], eventos: [], resumo: {} };

  for (const det of (pat.detalhes || [])) {
    const proto = digitos(det.protocolo);
    const daLista = porProtocoloPat.get(proto) || {};
    const cpf = digitos(daLista.cpf);
    const k = porProtocolo.get(proto);
    const item = { protocolo: proto, cpf, tipo: det.tipo, situacao: det.situacao,
                   beneficio: det.beneficio, especie: det.especie, der: det.der,
                   link: det.link, marcadores: det.marcadores || [],
                   urgente: !!det.urgente, a_confirmar: det.especie_a_confirmar || null,
                   quem_protocolou: det.quem_protocolou || null };

    if (k) {
      const mud = mudancasDoCaso(k, det);
      const and = andamentoDaMudanca(k, det);
      const evs = eventosNovos(det, evDoCaso.get(k.id), hj);
      if (evs.length) plano.eventos.push({ caso_id: k.id, protocolo: proto, eventos: evs });
      if (Object.keys(mud).length || and)
        plano.atualizar.push({ ...item, caso_id: k.id, mudancas: mud, andamento: and });
      continue;
    }

    // sem caso: serviço e pagamento não abrem um novo
    if (NAO_ABRE_CASO.has(det.tipo)) { plano.ignorados.push(item); continue; }

    const cli = porCpf.get(cpf);
    if (cli) plano.novos.push({ ...item, cliente_id: cli.id, nome: cli.nome,
                                lista: LISTA_POR_TIPO[det.tipo] || 'inss' });
    else plano.semCliente.push({ ...item, lista: LISTA_POR_TIPO[det.tipo] || 'inss' });
  }

  const porTipo = l => l.reduce((m, x) => (m[x.tipo] = (m[x.tipo] || 0) + 1, m), {});
  plano.resumo = {
    lidos: (pat.detalhes || []).length,
    atualizar: plano.atualizar.length,
    novos: plano.novos.length,
    sem_cliente: plano.semCliente.length,
    ignorados: plano.ignorados.length,
    eventos: plano.eventos.reduce((n, e) => n + e.eventos.length, 0),
    exigencias: (pat.detalhes || []).filter(d => d.situacao === 'Em exigência').length,
    apuracoes: (pat.detalhes || []).filter(d => d.urgente).length,
    a_confirmar: (pat.detalhes || []).filter(d => d.especie_a_confirmar).length,
    novos_por_tipo: porTipo(plano.novos),
  };
  return plano;
}

// Uma conferência antes de gravar, como a dos recursos: se o plano cria mais
// caso do que o total lido, ou manda benefício para a lista de recursos,
// alguma coisa está errada e é melhor não gravar nada.
function conferirPlanoPat(pat, plano) {
  const lidos = (pat.detalhes || []).length;
  const soma = plano.atualizar.length + plano.novos.length
             + plano.semCliente.length + plano.ignorados.length;
  if (soma > lidos) return `o plano fala de ${soma} requerimentos e só ${lidos} foram lidos`;
  for (const n of plano.novos.concat(plano.semCliente)) {
    const esperada = LISTA_POR_TIPO[n.tipo];
    if (esperada && n.lista !== esperada)
      return `${n.protocolo} (${n.tipo}) iria para "${n.lista}" em vez de "${esperada}"`;
    if (NAO_ABRE_CASO.has(n.tipo)) return `${n.protocolo} é ${n.tipo} e não pode abrir caso`;
  }
  for (const a of plano.atualizar)
    if (a.mudancas.especie && a.mudancas.especie !== a.especie)
      return `${a.protocolo} gravaria espécie diferente da lida`;
  return null;
}

module.exports = { LISTA_POR_TIPO, NAO_ABRE_CASO, digitos, protocolosDe, indexar,
  mudancasDoCaso, eventosNovos, andamentoDaMudanca, planoDeImportacao, conferirPlanoPat };
