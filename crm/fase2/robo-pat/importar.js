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

// UM CASO QUE PODE SER O MESMO. O protocolo é a chave certa, mas o campo
// quase nunca foi preenchido à mão — então "não casou pelo protocolo" quer
// dizer, quase sempre, "o caso existe e ninguém anotou o número". Antes de
// criar, procura no mesmo cliente um caso ativo na mesma lista e, quando as
// duas têm espécie, com a mesma espécie.
function casosParecidos(D, clienteId, lista, especie) {
  return (D.casos || []).filter(k =>
    k.cliente_id === clienteId && k.fase !== 'encerrado' && k.fase === lista &&
    (!especie || !k.especie || String(k.especie).toUpperCase() === String(especie).toUpperCase()));
}
const casoParecido = (D, clienteId, lista, especie) =>
  casosParecidos(D, clienteId, lista, especie)[0];
const tituloDoCaso = k => (k || {}).beneficio || (k || {}).titulo || 'caso sem nome';

// SEPARAR O ÓBVIO DO DUVIDOSO. Sessenta e cinco decisões na mão é trabalho
// que ninguém faz duas vezes — e a maioria delas é "Aposentadoria por tempo
// de contribuição" contra "Apos. Tempo de Contribuição", ou seja, a mesma
// coisa escrita de dois jeitos. O que muda é só a certeza, e ela pode ser
// dita: o item ganha `provavel` e o MOTIVO, para a decisão continuar sendo
// sua com o argumento na frente.
const ABREV = { apos: 'aposentadoria', aposent: 'aposentadoria', aux: 'auxilio',
                ben: 'beneficio', pens: 'pensao', def: 'deficiencia',
                incap: 'incapacidade', contrib: 'contribuicao' };
const VAZIAS = new Set(['por', 'com', 'para', 'sem', 'pessoa', 'requerimento', 'concessao']);

function palavrasDoBeneficio(t) {
  return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim().split(' ')
    .map(p => ABREV[p] || p)
    .filter(p => p.length > 2 && !VAZIAS.has(p));
}
// duas palavras significativas em comum, ou tudo o que o nome mais curto tem
function mesmoBeneficio(a, b) {
  const A = new Set(palavrasDoBeneficio(a)), B = new Set(palavrasDoBeneficio(b));
  if (!A.size || !B.size) return false;
  const comuns = [...A].filter(p => B.has(p)).length;
  return comuns >= 2 || comuns === Math.min(A.size, B.size);
}

function porQueParecido(item, k, quantos) {
  // Recurso e revisão NÃO têm benefício próprio: o nome que veio do portal é
  // o tipo do pedido ("Recurso ordinário"), não o que se pede. Comparar texto
  // aqui casaria "Recurso ESPECIAL" com "Aposentadoria ESPECIAL", que é
  // parecença de palavra e não de caso. O que vale é a contagem.
  if (item.tipo === 'recurso' || item.tipo === 'revisao')
    return quantos === 1
      ? { provavel: true,  motivo: 'é o único caso do cliente nesta lista' }
      : { provavel: false, motivo: `o cliente tem ${quantos} casos nesta lista` };
  if (item.especie && k.especie &&
      String(item.especie).toUpperCase() === String(k.especie).toUpperCase())
    return { provavel: true, motivo: `mesma espécie (${item.especie})` };
  if (mesmoBeneficio(item.beneficio, k.beneficio || k.titulo))
    return { provavel: true, motivo: 'mesmo benefício, escrito de outro jeito' };
  return { provavel: false, motivo: 'o benefício não bate com o que já existe' };
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
  // F44 · a primeira situação também consta em 📣 (pedido do Paulo: TODA
  // movimentação do portal aparece em Novidades — antes, o primeiro import
  // da situação entrava calado)
  if (!antes) return `INSS · Situação registrada: ${det.situacao}`;
  return `INSS: ${antes} → ${det.situacao}`;
}

// O PAT devolve o comentário em HTML ("<p>an&aacute;lise</p>"): na ficha isso
// virava tag e entidade cruas. Vira texto simples AQUI, na entrada — e a tela
// aplica de novo na saída, para o que já foi gravado sujo. Sem DOM de
// propósito: a mesma função roda no navegador e nos testes do node.
const ENTIDADES_PAT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  nbsp: ' ', aacute: 'á', agrave: 'à', atilde: 'ã', acirc: 'â', eacute: 'é',
  ecirc: 'ê', iacute: 'í', oacute: 'ó', otilde: 'õ', ocirc: 'ô', uacute: 'ú',
  uuml: 'ü', ccedil: 'ç', Aacute: 'Á', Agrave: 'À', Atilde: 'Ã', Acirc: 'Â',
  Eacute: 'É', Ecirc: 'Ê', Iacute: 'Í', Oacute: 'Ó', Otilde: 'Õ', Ocirc: 'Ô',
  Uacute: 'Ú', Ccedil: 'Ç', ordm: 'º', ordf: 'ª', sect: '§', deg: '°' };
function limparHtmlPat(t) {
  return String(t || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => ENTIDADES_PAT[n] || m)
    .replace(/\s+/g, ' ').trim();
}

// OS COMENTÁRIOS QUE AINDA NÃO ESTÃO NA FICHA. A importação roda todo dia e
// o portal devolve sempre a lista inteira — sem esta peneira, os mesmos
// comentários virariam andamento de novo a cada manhã. O `id` do comentário
// é a chave; ele vive em `andamentos.origem_id`.
function comentariosNovos(det, jaTem) {
  const vistos = new Set((jaTem || []).map(a => String(a.origem_id || '')));
  return (det.comentarios || [])
    .filter(c => c.id && !vistos.has(String(c.id)))
    .map(c => ({
      origem_id: String(c.id),
      quando: c.quando,
      // quem escreveu vem na frente: é a diferença entre o INSS pedindo algo
      // e o escritório respondendo, e ela muda o que se faz a seguir
      texto: `${c.do_inss ? 'INSS' : 'Escritório'} · ${limparHtmlPat(c.texto)}`,
    }));
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

  const andDoCaso = new Map();
  for (const a of (D.andamentos || [])) {
    if (!a.origem_id) continue;
    if (!andDoCaso.has(a.caso_id)) andDoCaso.set(a.caso_id, []);
    andDoCaso.get(a.caso_id).push(a);
  }

  const plano = { atualizar: [], novos: [], possiveisDuplicados: [], semCliente: [],
                  ignorados: [], eventos: [], comentarios: [], atualizacoes: [], resumo: {} };

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
      const coms = comentariosNovos(det, andDoCaso.get(k.id));
      if (coms.length) plano.comentarios.push({ caso_id: k.id, protocolo: proto, comentarios: coms });
      // F44 · TODA movimentação consta em 📣: o protocolo cuja "última
      // atualização" avançou no portal SEM mudar situação, comentário ou
      // agendamento entrava calado. Agora vira a sua própria novidade,
      // deduplicada pelo carimbo do portal (importar de novo não repete).
      const ts = String(det.atualizado_em || daLista.atualizado_em || "").trim();
      const chaveAt = ts ? `atualizacao:${proto}:${ts.replace(/\D/g, "")}` : null;
      const jaVisto = chaveAt && (andDoCaso.get(k.id) || [])
        .some(a => String(a.origem_id || "") === chaveAt);
      // só suprime quando OUTRA novidade já vai contar a história (mudança de
      // situação, comentário, agendamento) — backfill silencioso de campo não
      // conta: ele não gera linha nenhuma em 📣
      const teveOutra = and || coms.length || evs.length;
      if (chaveAt && !jaVisto && !teveOutra)
        plano.atualizacoes.push({ caso_id: k.id, protocolo: proto, ts,
          situacao: det.situacao || daLista.situacao || null,
          servico: det.beneficio || daLista.servico || null });
      if (Object.keys(mud).length || and || coms.length)
        plano.atualizar.push({ ...item, caso_id: k.id, mudancas: mud, andamento: and,
                               novos_comentarios: coms.length });
      continue;
    }

    // sem caso: serviço e pagamento não abrem um novo
    if (NAO_ABRE_CASO.has(det.tipo)) { plano.ignorados.push(item); continue; }

    const cli = porCpf.get(cpf);
    const lista = LISTA_POR_TIPO[det.tipo] || 'inss';
    if (!cli) { plano.semCliente.push({ ...item, lista }); continue; }
    // O PROTOCOLO CASOU EM POUCOS PORQUE O CAMPO QUASE NUNCA FOI PREENCHIDO,
    // não porque o caso não existe. Criar sem olhar duplicaria a ficha de
    // quem já está no CRM — e ninguém desfaz setenta duplicatas na mão.
    const candidatos = casosParecidos(D, cli.id, lista, det.especie);
    const parecido = candidatos[0];
    if (parecido) {
      const j = porQueParecido(item, parecido, candidatos.length);
      plano.possiveisDuplicados.push({ ...item, cliente_id: cli.id, nome: cli.nome, lista,
        caso_id: parecido.id, titulo_existente: tituloDoCaso(parecido),
        provavel: j.provavel, motivo: j.motivo });
    }
    else plano.novos.push({ ...item, cliente_id: cli.id, nome: cli.nome, lista });
  }

  // os prováveis primeiro: é a ordem em que se decide, e o botão de juntar
  // em lote age exatamente sobre esse bloco de cima
  plano.possiveisDuplicados.sort((a, b) => (b.provavel ? 1 : 0) - (a.provavel ? 1 : 0));

  const porTipo = l => l.reduce((m, x) => (m[x.tipo] = (m[x.tipo] || 0) + 1, m), {});
  plano.resumo = {
    lidos: (pat.detalhes || []).length,
    atualizar: plano.atualizar.length,
    novos: plano.novos.length,
    possiveis_duplicados: plano.possiveisDuplicados.length,
    provaveis: plano.possiveisDuplicados.filter(x => x.provavel).length,
    sem_cliente: plano.semCliente.length,
    ignorados: plano.ignorados.length,
    eventos: plano.eventos.reduce((n, e) => n + e.eventos.length, 0),
    comentarios: plano.comentarios.reduce((n, c) => n + c.comentarios.length, 0),
    movimentacoes: plano.atualizacoes.length,
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
  const soma = plano.atualizar.length + plano.novos.length + plano.possiveisDuplicados.length
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

module.exports = { LISTA_POR_TIPO, NAO_ABRE_CASO, digitos, protocolosDe, indexar, casoParecido,
  casosParecidos, palavrasDoBeneficio, mesmoBeneficio, porQueParecido, limparHtmlPat,
  mudancasDoCaso, eventosNovos, comentariosNovos, andamentoDaMudanca, planoDeImportacao, conferirPlanoPat };
