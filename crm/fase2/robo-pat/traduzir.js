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

// código do INSS -> [espécie, nome que o CRM usa]
const ESPECIE_POR_CODIGO = {
  // visto em 09/08/2026, na primeira coleta com detalhe
  AMP_SOCIAL_PORT_DEFICIENCIA: ['B87', 'BPC/LOAS — deficiência'],
};

// sigla do serviço -> a mesma coisa, para quando `especieBeneficio` vier vazio
const ESPECIE_POR_SIGLA = {
  TBSBAPD: ['B87', 'BPC/LOAS — deficiência'],
};

const limpo = s => String(s || '').trim().toUpperCase();

function especieDe(tarefa) {
  const t = tarefa || {};
  const porCodigo = ESPECIE_POR_CODIGO[limpo(t.especieBeneficio)];
  if (porCodigo) return { especie: porCodigo[0], beneficio: porCodigo[1], fonte: 'especieBeneficio' };
  const porSigla = ESPECIE_POR_SIGLA[limpo(t.siglaServico)];
  if (porSigla) return { especie: porSigla[0], beneficio: porSigla[1], fonte: 'siglaServico' };
  // desconhecido não é erro: é trabalho para a próxima rodada. O nome do
  // serviço vai junto porque é ele que me diz o que o código quer dizer.
  return { especie: null, beneficio: null, fonte: null,
           desconhecido: { especieBeneficio: t.especieBeneficio || null,
                           siglaServico: t.siglaServico || null,
                           nomeServico: t.nomeServico || null } };
}

// A situação do requerimento, do jeito que o CRM entende. O PAT devolve o
// status em duas caixas diferentes — "Pendente" na lista, "PENDENTE" no
// detalhe —, então normalizar aqui evita duas verdades para a mesma coisa.
const SITUACOES = {
  PENDENTE: 'Em análise',
  CONCLUIDA: 'Concluído',
  CANCELADA: 'Cancelado',
  CUMPRIMENTO_DE_EXIGENCIA: 'Em exigência',
};
const situacaoDe = s => SITUACOES[limpo(s).replace(/\s+/g, '_')] || String(s || '').trim() || null;

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
// social com data, hora e agência. REMARCADO é o caso que ninguém pode
// perder — a data mudou e o cliente costuma saber antes do escritório.
function eventosDe(det) {
  const d = det || {};
  const juntar = (lista, tipo) => (Array.isArray(lista) ? lista : []).map(a => ({
    tipo,
    data: dataIso(a.data),
    hora: (String(a.horario || '').match(/^\d{2}:\d{2}/) || [null])[0],
    local: a.nomeUnidade || null,
    situacao: limpo(a.situacaoAgendamento) || null,
    remarcado: limpo(a.situacaoAgendamento) === 'REMARCADO',
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
    especie: esp.especie,
    beneficio: esp.beneficio,
    servico: det.nomeServico || null,
    sigla: det.siglaServico || null,
    especie_codigo: det.especieBeneficio || null,
    der: (String(det.dataEntradaRequerimento || '').match(/^\d{4}-\d{2}-\d{2}/) || [null])[0],
    unidade: det.nomeUnidade || null,
    canal: det.tipoCanalAtendimento || null,
    // contagens, não conteúdo: dizem que há o que olhar, sem trazer o que é
    anexos: Array.isArray(det.anexos) ? det.anexos.length : 0,
    comentarios: Array.isArray(det.comentarios) ? det.comentarios.length : 0,
    em_exigencia: !!det.podeCumprirExigencia || situacaoDe(det.status) === 'Em exigência',
    eventos: eventosDe(det),
    link: det.protocolo ? `https://atendimento.inss.gov.br/tarefas/detalhar_tarefa/${det.protocolo}` : null,
    desconhecido: esp.desconhecido || null,
  };
}

module.exports = { ESPECIE_POR_CODIGO, ESPECIE_POR_SIGLA, SITUACOES,
  especieDe, situacaoDe, dataIso, eventosDe, resumoDaLista, resumoDoDetalhe };
