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

test('os códigos de espécie do INSS traduzem certo', () => {
  for (const [cod, esp] of [['AMP_SOCIAL_PORT_DEFICIENCIA', 'B87'], ['AMP_SOCIAL_IDOSO', 'B88'],
                            ['APOSENTADORIA_POR_IDADE', 'B41'],
                            ['APOSENTADORIA_POR_TEMPO_DE_CONTRIBUICAO', 'B42']])
    assert.equal(T.especieDe({ especieBeneficio: cod }).especie, esp, cod);
});

// As 21 siglas da carteira real (184 requerimentos, 09/08/2026). Só NOVE são
// pedido de benefício — o resto é recurso, revisão, serviço ou apuração.
test('as 21 siglas da carteira estão todas classificadas', () => {
  const TODAS = ['RECESP', 'TREC', 'TAA', 'TBSBAPD', 'TAIU', 'TAPDTC', 'TATCMI', 'SEMNPG',
    'ATUVCPG', 'TBAI', 'TREVISAO', 'TPU', 'REVOFICIO', 'TAR', 'TVALFBR', 'TAPDI',
    'TSCC', 'ATUACAD', 'CPCARCJ', 'TAREFAREV', 'MOBDGT'];
  assert.equal(TODAS.length, 21);
  for (const sig of TODAS) {
    const e = T.especieDe({ siglaServico: sig });
    assert.ok(e.tipo, `${sig} ficou sem tipo`);
    assert.ok(e.beneficio, `${sig} ficou sem nome`);
    assert.ok(!e.desconhecido, `${sig} caiu em desconhecido`);
  }
  const benef = TODAS.filter(s => T.especieDe({ siglaServico: s }).tipo === 'beneficio');
  assert.equal(benef.length, 9, `mudou o número de siglas de benefício: ${benef.join(', ')}`);
});

// A sigla carrega o que o marcador diria — e é o mesmo vocabulário da linha
// do PEDIDO na ficha. TAPDTC é B42 com deficiência; TAR é B41 rural.
test('a sigla já traz o marcador do pedido', () => {
  assert.deepStrictEqual(T.especieDe({ siglaServico: 'TAPDTC' }),
    { tipo: 'beneficio', especie: 'B42',
      beneficio: 'Aposentadoria por tempo de contribuição da pessoa com deficiência',
      marcadores: ['pcd'], urgente: false, a_confirmar: null, fonte: 'siglaServico' });
  assert.deepStrictEqual(T.especieDe({ siglaServico: 'TAR' }).marcadores, ['idade_rural']);
  assert.deepStrictEqual(T.especieDe({ siglaServico: 'TAPDI' }).marcadores, ['pcd']);
  assert.deepStrictEqual(T.especieDe({ siglaServico: 'TAIU' }).marcadores, []);
});

// O auxílio-acidente tem duas espécies e o nome do serviço não diz qual.
// Escolher por conta própria mudaria a competência do processo.
test('auxílio-acidente fica com a espécie EM ABERTO, não chutada', () => {
  const e = T.especieDe({ siglaServico: 'TAA' });
  assert.equal(e.tipo, 'beneficio');
  assert.equal(e.especie, null);
  assert.match(e.a_confirmar, /B36.*B94/);
});

// O INSS revendo um benefício que já paga pode suspender, cancelar e cobrar
// o recebido. São dois na carteira e são os dois mais urgentes dela.
test('apuração de irregularidade nasce urgente', () => {
  for (const sig of ['MOBDGT', 'CPCARCJ']) {
    const e = T.especieDe({ siglaServico: sig });
    assert.equal(e.tipo, 'apuracao', sig);
    assert.equal(e.urgente, true, sig);
  }
  assert.equal(T.especieDe({ siglaServico: 'TAIU' }).urgente, false);
});

test('recurso, revisão, pagamento e serviço não viram pedido de benefício', () => {
  const tipo = s => T.especieDe({ siglaServico: s }).tipo;
  assert.equal(tipo('TREC'), 'recurso');
  assert.equal(tipo('RECESP'), 'recurso');
  assert.equal(tipo('TREVISAO'), 'revisao');
  assert.equal(tipo('REVOFICIO'), 'revisao');
  assert.equal(tipo('SEMNPG'), 'pagamento');
  assert.equal(tipo('ATUVCPG'), 'servico');
  for (const s of ['TREC', 'RECESP', 'TREVISAO', 'SEMNPG', 'ATUVCPG'])
    assert.equal(T.especieDe({ siglaServico: s }).especie, null, `${s} não pode ter espécie`);
});

// NEM TODA TAREFA DO PAT É PEDIDO DE BENEFÍCIO — duas das seis siglas da
// coleta real não são requerimento nenhum. Tratá-las como benefício criaria
// caso duplicado, com espécie em branco, na lista errada.
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

// A LISTA devolve rótulo humano e ACENTUADO. Sem tirar o acento, "Concluída"
// — 84 dos 184 requerimentos — passava direto e o CRM ficava com duas
// palavras para o mesmo estado.
test('o rótulo acentuado da lista casa com o código do detalhe', () => {
  assert.equal(T.situacaoDe('Concluída'), 'Concluído');
  assert.equal(T.situacaoDe('Exigência'), 'Em exigência');
  assert.equal(T.situacaoDe('Em análise'), 'Em análise');
  assert.equal(T.situacaoDe('Concluída'), T.situacaoDe('CONCLUIDA'));
  assert.equal(T.situacaoDe('Exigência'), T.situacaoDe('CUMPRIMENTO_DE_EXIGENCIA'));
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
  for (const nome of ['SERVICOS', 'ESPECIE_POR_CODIGO', 'CANAIS', 'SITUACOES']) {
    const i = col.indexOf(`const ${nome}`);
    assert.notEqual(i, -1, `${nome} sumiu do coletor`);
    const bruto = col.slice(col.indexOf('{', i), col.indexOf('};', i) + 1);
    assert.deepStrictEqual(eval(`(${bruto})`), T[nome], `${nome} divergiu de traduzir.js`);
  }
});

// A coleta completa trouxe o código que faltava: o sufixo _PREVIDENCIARIO é
// a resposta que o nome do serviço não dava. O acidentário (B94) ainda não
// apareceu na carteira — e por isso não está no mapa.
test('o auxílio-acidente se resolve quando o código do INSS vem junto', () => {
  const e = T.especieDe({ siglaServico: 'TAA', especieBeneficio: 'AUXILIO_ACIDENTE_PREVIDENCIARIO' });
  assert.equal(e.especie, 'B36');
  assert.equal(e.tipo, 'beneficio');
  // sem o código, continua em aberto — não se escolhe entre B36 e B94 no chute
  assert.equal(T.especieDe({ siglaServico: 'TAA' }).especie, null);
});
