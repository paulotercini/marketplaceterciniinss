// O que o PAT chama de serviço, e o que o CRM chama de benefício.
//
// O detalhe traz `especieBeneficio` — um código do próprio INSS, como
// AMP_SOCIAL_PORT_DEFICIENCIA. É a tradução mais confiável que existe para a
// espécie: vem do sistema deles, não de leitura de texto.
//
// A REGRA DESTE ARQUIVO: só entra código que eu tenha VISTO numa resposta
// real. Adivinhar espécie a partir do nome do serviço é o tipo de acerto que
// funciona em nove casos e escreve B87 num caso de pensão no décimo — e uma
// espécie errada na ficha muda prazo de recurso, checklist e marcador.
//
// Por isso `especieDe` devolve null quando não conhece, e o coletor JUNTA os
// desconhecidos num relatório. A primeira coleta de verdade, com 184
// requerimentos, é que vai preencher esta tabela — do mesmo jeito que as
// REGRAS da extração do To Do foram preenchidas: olhando o que aparece.

// ── OS 21 SERVIÇOS DA CARTEIRA ───────────────────────────────────────────
// Tirados da coleta de 09/08/2026: 184 requerimentos, 21 siglas distintas.
// Nenhuma inventada — cada linha abaixo apareceu na carteira de verdade.
//
// A descoberta que muda o desenho: só NOVE das 21 são pedido de benefício.
// As outras são recurso, revisão, serviço administrativo ou apuração de
// irregularidade. Tratar tudo como benefício encheria a lista do INSS de
// caso sem espécie, e esconderia as duas coisas que mais pedem atenção.
//
// `marcadores` liga direto no que foi feito hoje de manhã: TAPDTC é B42 com
// deficiência, TAR é B41 rural. A sigla já diz o que o marcador diria.
const SERVICOS = {
  // ── pedido de benefício ────────────────────────────────────────────────
  TAIU:    { tipo: 'beneficio', especie: 'B41', nome: 'Aposentadoria por idade' },
  TAR:     { tipo: 'beneficio', especie: 'B41', nome: 'Aposentadoria por idade rural',
             marcadores: ['idade_rural'] },
  TAPDI:   { tipo: 'beneficio', especie: 'B41', nome: 'Aposentadoria por idade da pessoa com deficiência',
             marcadores: ['pcd'] },
  TATCMI:  { tipo: 'beneficio', especie: 'B42', nome: 'Aposentadoria por tempo de contribuição' },
  TAPDTC:  { tipo: 'beneficio', especie: 'B42', nome: 'Aposentadoria por tempo de contribuição da pessoa com deficiência',
             marcadores: ['pcd'] },
  TBSBAPD: { tipo: 'beneficio', especie: 'B87', nome: 'BPC/LOAS — deficiência' },
  TBAI:    { tipo: 'beneficio', especie: 'B88', nome: 'BPC/LOAS — idoso' },
  TPU:     { tipo: 'beneficio', especie: 'B21', nome: 'Pensão por morte' },
  // O auxílio-acidente tem duas espécies e o nome do serviço NÃO diz qual:
  // B36 é o previdenciário, B94 o acidentário. Escolher por conta própria
  // seria chutar num campo que muda a competência do processo — então a
  // espécie fica em aberto e o CRM pergunta.
  TAA:     { tipo: 'beneficio', especie: null, nome: 'Auxílio-acidente',
             aConfirmar: 'B36 (previdenciário) ou B94 (acidentário)' },

  // ── recurso: lista Conselho de Recursos, não INSS ───────────────────────
  // É o mesmo processo que o robô do CRPS já acompanha. Somados, são 83 dos
  // 184 — quase metade da carteira.
  TREC:    { tipo: 'recurso', nome: 'Recurso ordinário (inicial)' },
  RECESP:  { tipo: 'recurso', nome: 'Recurso especial ou incidente' },

  // ── revisão de benefício já concedido ──────────────────────────────────
  TREVISAO:  { tipo: 'revisao', nome: 'Revisão — entidade conveniada' },
  TAREFAREV: { tipo: 'revisao', nome: 'Revisão' },
  REVOFICIO: { tipo: 'revisao', nome: 'Revisão de ofício' },

  // ── dinheiro ───────────────────────────────────────────────────────────
  SEMNPG:  { tipo: 'pagamento', nome: 'Emissão de pagamento não recebido' },
  TSCC:    { tipo: 'pagamento', nome: 'Calcular complementação' },

  // ── serviço administrativo: não abre caso, acontece DENTRO de um ───────
  ATUVCPG: { tipo: 'servico', nome: 'Atualizar vínculos e remunerações (CNIS)' },
  TVALFBR: { tipo: 'servico', nome: 'Validar contribuição de facultativo baixa renda' },
  ATUACAD: { tipo: 'servico', nome: 'Atualizar cadastro e/ou benefício' },

  // ── APURAÇÃO DE IRREGULARIDADE ─────────────────────────────────────────
  // O INSS revendo um benefício que já paga. Pode terminar em suspensão,
  // cancelamento e cobrança do que foi recebido. São dois requerimentos na
  // carteira e são os dois mais urgentes dela — por isso `urgente`.
  MOBDGT:  { tipo: 'apuracao', nome: 'Apuração de irregularidade (MOB Digital)', urgente: true },
  CPCARCJ: { tipo: 'apuracao', nome: 'Encaminhamentos do processo de apuração (MOB)', urgente: true },
};

// O código de espécie do próprio INSS, quando vem preenchido, manda na
// espécie — é mais confiável que a sigla do serviço.
const ESPECIE_POR_CODIGO = {
  AMP_SOCIAL_PORT_DEFICIENCIA: 'B87',
  AMP_SOCIAL_IDOSO:            'B88',
  APOSENTADORIA_POR_IDADE:     'B41',
  APOSENTADORIA_POR_TEMPO_DE_CONTRIBUICAO: 'B42',
  // apareceu na coleta completa e resolve o TAA quando o código vem: o
  // sufixo _PREVIDENCIARIO é a resposta que o nome do serviço não dava. O
  // acidentário (B94) ainda não apareceu — quando aparecer, entra aqui.
  AUXILIO_ACIDENTE_PREVIDENCIARIO: 'B36',
};

// Quem protocolou. `INTERNET` quer dizer que o CLIENTE fez sozinho pelo Meu
// INSS — e é a explicação para requerimentos que existem no PAT sem caso no
// CRM. Na carteira real: 5 pelo escritório, 3 pelo cliente, 2 pela 135.
const CANAIS = {
  ENTIDADE_CONVENIADA: 'Protocolado pelo escritório (convênio OAB)',
  INTERNET:            'O cliente protocolou sozinho pelo Meu INSS',
  CENTRAL_135:         'Protocolado pela Central 135',
};

const limpo = s => String(s || '').trim().toUpperCase();

function especieDe(tarefa) {
  const t = tarefa || {};
  const s = SERVICOS[limpo(t.siglaServico)];
  // a sigla diz o TIPO e os marcadores; o código do INSS, quando vem, tem a
  // última palavra sobre a espécie
  const porCodigo = ESPECIE_POR_CODIGO[limpo(t.especieBeneficio)] || null;
  if (!s) {
    if (porCodigo)
      return { tipo: 'beneficio', especie: porCodigo, beneficio: null,
               marcadores: [], urgente: false, fonte: 'especieBeneficio' };
    // desconhecido não é erro: é trabalho para a próxima rodada. O nome do
    // serviço vai junto porque é ele que me diz o que a sigla quer dizer.
    return { tipo: null, especie: null, beneficio: null, marcadores: [], urgente: false,
             fonte: null,
             desconhecido: { especieBeneficio: t.especieBeneficio || null,
                             siglaServico: t.siglaServico || null,
                             nomeServico: t.nomeServico || null } };
  }
  return {
    tipo: s.tipo,
    especie: porCodigo || s.especie || null,
    beneficio: s.nome,
    marcadores: s.marcadores || [],
    urgente: !!s.urgente,
    a_confirmar: s.aConfirmar || null,
    fonte: porCodigo ? 'especieBeneficio' : 'siglaServico',
  };
}

// A situação do requerimento, do jeito que o CRM entende. O PAT devolve o
// status em duas caixas diferentes — "Pendente" na lista, "PENDENTE" no
// detalhe —, então normalizar aqui evita duas verdades para a mesma coisa.
// A LISTA devolve rótulo humano e acentuado — "Concluída", "Exigência",
// "Em análise" —, o DETALHE devolve o código em caixa alta. Sem tirar acento
// e sem as duas formas, "Concluída" (84 dos 184!) passava direto e o CRM
// ficava com duas palavras para o mesmo estado.
const SITUACOES = {
  PENDENTE: 'Em análise',
  EM_ANALISE: 'Em análise',
  CONCLUIDA: 'Concluído',
  CONCLUIDO: 'Concluído',
  CANCELADA: 'Cancelado',
  CANCELADO: 'Cancelado',
  EXIGENCIA: 'Em exigência',
  CUMPRIMENTO_DE_EXIGENCIA: 'Em exigência',
};
const semAcento = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const situacaoDe = s => SITUACOES[semAcento(limpo(s)).replace(/\s+/g, '_')]
  || String(s || '').trim() || null;

// "13/08/2026" -> "2026-08-13". Os agendamentos vêm em data brasileira, e o
// CRM guarda tudo em ISO — misturar os dois formatos já custou caro noutro
// lugar deste sistema.
function dataIso(br) {
  const m = String(br || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const iso = String(br || '').trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : null;
}

// Os agendamentos são o que o CRM mais tem a ganhar: perícia e avaliação
// social com data, hora e agência.
//
// EU TINHA ENTENDIDO REMARCADO AO CONTRÁRIO. Um requerimento real veio com
// perícia 13/08 AGENDADO e 12/08 REMARCADO: a linha REMARCADO é o horário
// ABANDONADO, não o novo. Pôr as duas na agenda faria o cliente ser chamado
// num dia que não existe mais.
//
// Então só AGENDADO vira compromisso (`ativo`). REMARCADO e CUMPRIDO ficam
// no histórico — o que dispara o aviso não é a existência de um REMARCADO, é
// a data do AGENDADO ter mudado desde a última coleta.
function eventosDe(det) {
  const d = det || {};
  const juntar = (lista, tipo) => (Array.isArray(lista) ? lista : []).map(a => ({
    tipo,
    data: dataIso(a.data),
    hora: (String(a.horario || '').match(/^\d{2}:\d{2}/) || [null])[0],
    local: a.nomeUnidade || null,
    situacao: limpo(a.situacaoAgendamento) || null,
    ativo: limpo(a.situacaoAgendamento) === 'AGENDADO',
  })).filter(e => e.data);
  return [...juntar(d.agendamentosPericia, 'Perícia médica'),
          ...juntar(d.agendamentosAvaliacaoSocial, 'Avaliação social')];
}

// Uma linha da lista, pronta para o CRM comparar com o que já sabe.
function resumoDaLista(t) {
  return {
    protocolo: String((t || {}).protocolo || '').trim(),
    situacao: situacaoDe((t || {}).status),
    cpf: String((t || {}).cpfRequerente || '').replace(/\D/g, '').padStart(11, '0'),
    servico: (t || {}).nomeServico || null,
    sigla: (t || {}).siglaServico || null,
    unidade: (t || {}).nomeUnidade || null,
    criado_em: (t || {}).dataCriacao || null,
    atualizado_em: (t || {}).dataUltimaAtualizacao || null,
    link: (t || {}).protocolo ? `https://atendimento.inss.gov.br/tarefas/detalhar_tarefa/${t.protocolo}` : null,
  };
}

// O QUE NÃO ATRAVESSA. Anexo, comentário e campo adicional ficam de fora de
// propósito: são laudo médico, relato de doença e dado do interessado. O CRM
// guarda o link para o portal, não a cópia — é a mesma regra que vale para a
// ficha pública do cliente, e vale mais ainda aqui.
function resumoDoDetalhe(d) {
  const det = d || {};
  const esp = especieDe(det);
  return {
    protocolo: String(det.protocolo || '').trim(),
    situacao: situacaoDe(det.status),
    tipo: esp.tipo,
    especie: esp.especie,
    beneficio: esp.beneficio,
    marcadores: esp.marcadores,
    urgente: esp.urgente,
    especie_a_confirmar: esp.a_confirmar || null,
    servico: det.nomeServico || null,
    sigla: det.siglaServico || null,
    especie_codigo: det.especieBeneficio || null,
    der: (String(det.dataEntradaRequerimento || '').match(/^\d{4}-\d{2}-\d{2}/) || [null])[0],
    unidade: det.nomeUnidade || null,
    canal: det.tipoCanalAtendimento || null,
    quem_protocolou: CANAIS[limpo(det.tipoCanalAtendimento)] || null,
    // contagens, não conteúdo: dizem que há o que olhar, sem trazer o que é
    anexos: Array.isArray(det.anexos) ? det.anexos.length : 0,
    comentarios: Array.isArray(det.comentarios) ? det.comentarios.length : 0,
    em_exigencia: !!det.podeCumprirExigencia || situacaoDe(det.status) === 'Em exigência',
    eventos: eventosDe(det),
    link: det.protocolo ? `https://atendimento.inss.gov.br/tarefas/detalhar_tarefa/${det.protocolo}` : null,
    desconhecido: esp.desconhecido || null,
  };
}

module.exports = { SERVICOS, ESPECIE_POR_CODIGO, CANAIS, SITUACOES, semAcento,
  especieDe, situacaoDe, dataIso, eventosDe, resumoDaLista, resumoDoDetalhe };
