// Casos-ouro tirados da resposta REAL do detalhe (09/08/2026), com o dado do
// cliente trocado. É a única amostra que existe até a primeira coleta — por
// isso a regra é não adivinhar o que ela não mostrou.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const T = require('../traduzir');

const DETALHE = {
  id: 123456789, protocolo: '1462069078',
  dataCriacao: '2026-07-31T17:36:47', dataEntradaRequerimento: '2026-07-31T17:36:47',
  status: 'PENDENTE', tipoCanalAtendimento: 'INTERNET',
  nomeUnidade: 'SETOR TÉCNICO-ADMINISTRATIVO',
  idServico: 1655, nomeServico: 'Benefício Assistencial à Pessoa com Deficiência',
  siglaServico: 'TBSBAPD', especieBeneficio: 'AMP_SOCIAL_PORT_DEFICIENCIA',
  interessados: [{ nome: 'ALMIR TRONFINI', cpf: '08575979817', dataNascimento: '04/03/1958' }],
  comentarios: [{ conteudo: 'segurado relatou dor lombar' }, { conteudo: 'x' }, { conteudo: 'y' }],
  anexos: [{ nomeArquivo: 'laudo_oncologia.pdf' }],
  agendamentosPericia: [
    { situacaoAgendamento: 'AGENDADO', data: '13/08/2026', horario: '09:30',
      nomeUnidade: 'AGÊNCIA DA PREVIDÊNCIA SOCIAL MATÃO' },
    { situacaoAgendamento: 'REMARCADO', data: '02/09/2026', horario: '14:00',
      nomeUnidade: 'AGÊNCIA DA PREVIDÊNCIA SOCIAL MATÃO' },
  ],
  agendamentosAvaliacaoSocial: [
    { situacaoAgendamento: 'CUMPRIDO', data: '31/07/2026', horario: '10:00',
      nomeUnidade: 'AGÊNCIA DA PREVIDÊNCIA SOCIAL JABOTICABAL' },
    { situacaoAgendamento: 'AGENDADO', data: '21/08/2026', horario: '10:00',
      nomeUnidade: 'AGÊNCIA DA PREVIDÊNCIA SOCIAL JABOTICABAL' },
  ],
};

test('a espécie vem do código do INSS, não de leitura de nome', () => {
  const e = T.especieDe(DETALHE);
  assert.equal(e.tipo, 'beneficio');
  assert.equal(e.especie, 'B87');
  assert.equal(e.beneficio, 'BPC/LOAS — deficiência');
  assert.equal(e.fonte, 'especieBeneficio');
});

test('os quatro códigos vistos na coleta real traduzem certo', () => {
  const casos = [
    ['AMP_SOCIAL_PORT_DEFICIENCIA', 'B87'], ['AMP_SOCIAL_IDOSO', 'B88'],
    ['APOSENTADORIA_POR_IDADE', 'B41'], ['APOSENTADORIA_POR_TEMPO_DE_CONTRIBUICAO', 'B42'],
  ];
  for (const [cod, esp] of casos) assert.equal(T.especieDe({ especieBeneficio: cod }).especie, esp);
  for (const [sig, esp] of [['TBSBAPD', 'B87'], ['TBAI', 'B88'], ['TAIU', 'B41'], ['TATCMI', 'B42']])
    assert.equal(T.especieDe({ siglaServico: sig }).especie, esp, sig);
});

// NEM TODA TAREFA DO PAT É PEDIDO DE BENEFÍCIO — duas das seis siglas da
// coleta real não são requerimento nenhum. Tratá-las como benefício criaria
// caso duplicado, com espécie em branco, na lista errada.
test('RECESP é recurso e ATUVCPG é serviço — nenhum dos dois vira benefício', () => {
  const rec = T.especieDe({ siglaServico: 'RECESP',
    nomeServico: 'Recurso Especial ou Incidente (Alteração de Acórdão)' });
  assert.equal(rec.tipo, 'recurso');
  assert.equal(rec.especie, null, 'recurso não tem espécie de benefício');
  assert.ok(!rec.desconhecido, 'recurso conhecido não pode entrar como desconhecido');

  const cnis = T.especieDe({ siglaServico: 'ATUVCPG',
    nomeServico: 'Atualizar Vínculos e Remunerações e Código de Pagamento' });
  assert.equal(cnis.tipo, 'servico');
  assert.equal(cnis.especie, null);
});

// Adivinhar espécie pelo nome do serviço acerta nove e escreve B87 numa
// pensão no décimo. Espécie errada muda prazo de recurso, checklist e
// marcador — é dano, não aproximação.
test('serviço que eu nunca vi NÃO vira espécie chutada', () => {
  const e = T.especieDe({ especieBeneficio: 'PENSAO_MORTE_URBANA',
                          siglaServico: 'TBSPMU', nomeServico: 'Pensão por Morte Urbana' });
  assert.equal(e.tipo, null);
  assert.equal(e.especie, null);
  assert.equal(e.beneficio, null);
  assert.deepStrictEqual(e.desconhecido, { especieBeneficio: 'PENSAO_MORTE_URBANA',
    siglaServico: 'TBSPMU', nomeServico: 'Pensão por Morte Urbana' });
});

test('a sigla socorre quando o código vem vazio', () => {
  assert.equal(T.especieDe({ siglaServico: 'TBSBAPD' }).especie, 'B87');
  assert.equal(T.especieDe({ especieBeneficio: '', siglaServico: 'tbsbapd' }).especie, 'B87');
});

// O PAT devolve "Pendente" na lista e "PENDENTE" no detalhe: duas caixas para
// a mesma coisa viram duas verdades no CRM se ninguém normalizar.
test('a situação é a mesma venha da lista ou do detalhe', () => {
  assert.equal(T.situacaoDe('Pendente'), 'Em análise');
  assert.equal(T.situacaoDe('PENDENTE'), 'Em análise');
  assert.equal(T.situacaoDe('CUMPRIMENTO_DE_EXIGENCIA'), 'Em exigência');
  assert.equal(T.situacaoDe('Cumprimento de Exigencia'), 'Em exigência');
  assert.equal(T.situacaoDe('CONCLUIDA'), 'Concluído');
  assert.equal(T.situacaoDe('CANCELADA'), 'Cancelado');
  // situação que eu não conheço passa inteira: sumir com ela seria pior
  assert.equal(T.situacaoDe('EM_DILIGENCIA'), 'EM_DILIGENCIA');
  assert.equal(T.situacaoDe(''), null);
});

test('agendamento vem em data brasileira e o CRM guarda em ISO', () => {
  assert.equal(T.dataIso('13/08/2026'), '2026-08-13');
  assert.equal(T.dataIso('2026-08-13T09:30:00'), '2026-08-13');
  assert.equal(T.dataIso('sem data'), null);
  assert.equal(T.dataIso(null), null);
});

// EU TINHA ENTENDIDO REMARCADO AO CONTRÁRIO. Um requerimento real veio com
// perícia 13/08 AGENDADO e 12/08 REMARCADO: a linha REMARCADO é o horário
// ABANDONADO. Pôr as duas na agenda faria o cliente ser chamado num dia que
// não existe mais.
test('só AGENDADO vira compromisso; REMARCADO e CUMPRIDO ficam no histórico', () => {
  const ev = T.eventosDe(DETALHE);
  assert.equal(ev.length, 4);
  assert.deepStrictEqual(ev[0], { tipo: 'Perícia médica', data: '2026-08-13', hora: '09:30',
    local: 'AGÊNCIA DA PREVIDÊNCIA SOCIAL MATÃO', situacao: 'AGENDADO', ativo: true });
  assert.equal(ev[1].situacao, 'REMARCADO');
  assert.equal(ev[1].ativo, false, 'o horário abandonado NÃO pode ir para a agenda');
  assert.equal(ev[2].situacao, 'CUMPRIDO');
  assert.equal(ev[2].ativo, false);
  assert.equal(ev[3].tipo, 'Avaliação social');
  assert.equal(ev[3].ativo, true);
  assert.equal(ev.filter(e => e.ativo).length, 2, 'sobram dois compromissos de verdade');
});

// INTERNET quer dizer que o CLIENTE protocolou sozinho — é a explicação para
// requerimento que existe no PAT e não tem caso no CRM.
test('o canal diz quem protocolou', () => {
  assert.match(T.resumoDoDetalhe({ tipoCanalAtendimento: 'INTERNET' }).quem_protocolou, /cliente/);
  assert.match(T.resumoDoDetalhe({ tipoCanalAtendimento: 'ENTIDADE_CONVENIADA' }).quem_protocolou, /escrit/);
  assert.match(T.resumoDoDetalhe({ tipoCanalAtendimento: 'CENTRAL_135' }).quem_protocolou, /135/);
  assert.equal(T.resumoDoDetalhe({ tipoCanalAtendimento: 'CANAL_NOVO' }).quem_protocolou, null);
});

test('agendamento sem data não entra — evento sem data não é evento', () => {
  assert.deepStrictEqual(T.eventosDe({ agendamentosPericia: [{ situacaoAgendamento: 'AGENDADO' }] }), []);
  assert.deepStrictEqual(T.eventosDe({}), []);
  assert.deepStrictEqual(T.eventosDe(null), []);
});

test('o detalhe entrega DER, espécie, unidade e link', () => {
  const r = T.resumoDoDetalhe(DETALHE);
  assert.equal(r.protocolo, '1462069078');
  assert.equal(r.der, '2026-07-31');
  assert.equal(r.especie, 'B87');
  assert.equal(r.situacao, 'Em análise');
  assert.equal(r.unidade, 'SETOR TÉCNICO-ADMINISTRATIVO');
  assert.equal(r.link, 'https://atendimento.inss.gov.br/tarefas/detalhar_tarefa/1462069078');
  assert.equal(r.tipo, 'beneficio');
  assert.equal(r.eventos.length, 4);
});

// O CRM guarda o LINK, não a cópia. Laudo médico e relato de doença ficam no
// portal, onde quem precisa ler abre com o login dele — é a mesma regra da
// ficha pública do cliente, e aqui vale mais ainda.
test('anexo e comentário viram CONTAGEM, nunca conteúdo', () => {
  const r = T.resumoDoDetalhe(DETALHE);
  assert.equal(r.anexos, 1);
  assert.equal(r.comentarios, 3);
  const s = JSON.stringify(r);
  for (const vaza of ['laudo_oncologia', 'lombar', 'ALMIR', 'TRONFINI', '08575979817', '1958'])
    assert.ok(!s.includes(vaza), `o resumo levou "${vaza}" junto`);
});

test('a lista vira linha comparável, com o link pronto', () => {
  const r = T.resumoDaLista({ protocolo: '1462069078', status: 'Pendente',
    cpfRequerente: 8575979817, nomeServico: 'BPC', siglaServico: 'TBSBAPD',
    nomeUnidade: 'APS FRANCA', dataCriacao: '2026-07-31T17:36:47',
    dataUltimaAtualizacao: '2026-08-04T16:00:39' });
  assert.equal(r.situacao, 'Em análise');
  // o CPF vem como NÚMERO e perde o zero à esquerda no caminho; sem repor,
  // o casamento com o cadastro do CRM falha justamente em quem começa com 0
  assert.equal(r.cpf, '08575979817');
  assert.equal(r.cpf.length, 11);
  assert.equal(r.atualizado_em, '2026-08-04T16:00:39');
  assert.match(r.link, /detalhar_tarefa\/1462069078$/);
});

// ── o coletor roda colado no Console e não faz require: a tradução vive lá
// dentro copiada. Divergência ali significa o CRM recebendo uma coisa e os
// testes garantindo outra.
test('a cópia dentro do coletor é idêntica à testada aqui', () => {
  const col = fs.readFileSync(path.join(__dirname, '..', 'coletar-no-navegador.js'), 'utf8');
  const nu = s => s.replace(/\s+/g, ' ').trim();
  for (const fn of ['especieDe', 'dataIso', 'eventosDe', 'resumoDaLista', 'resumoDoDetalhe']) {
    const i = col.indexOf(`function ${fn}(`);
    assert.notEqual(i, -1, `${fn} sumiu do coletor`);
    let n = 0, j = col.indexOf('{', i);
    do { if (col[j] === '{') n++; else if (col[j] === '}') n--; j++; } while (n > 0 && j < col.length);
    assert.equal(nu(col.slice(i, j)), nu(T[fn].toString()), `${fn} divergiu de traduzir.js`);
  }
  for (const nome of ['ESPECIE_POR_CODIGO', 'ESPECIE_POR_SIGLA', 'SERVICO_NAO_BENEFICIO',
                      'CANAIS', 'SITUACOES']) {
    const i = col.indexOf(`const ${nome}`);
    assert.notEqual(i, -1, `${nome} sumiu do coletor`);
    const bruto = col.slice(col.indexOf('{', i), col.indexOf('};', i) + 1);
    assert.deepStrictEqual(eval(`(${bruto})`), T[nome], `${nome} divergiu de traduzir.js`);
  }
});
