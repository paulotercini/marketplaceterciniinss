// Motor de regras, calibrado contra os SEIS acórdãos reais do diagnóstico.
// Os textos abaixo são os decisórios de verdade, com nomes de conselheiros e
// número de protocolo trocados — a FORMA é o que importa aqui, e é ela que
// os testes travam.
//
// A lição que estes casos ensinaram: o dispositivo do CRPS não tem períodos
// (moram na fundamentação, em prosa), mas tem o que o e-Recursos esconde —
// embargo acolhido que mantém a derrota, provimento parcial sem benefício,
// e o resultado quando o e-Recursos só diz "Acórdão publicado".
const { test } = require('node:test');
const assert = require('node:assert');
const G = require('../regras_acordao.js');
const { validarResumo } = require('../resumir.js');

const ASSIN = ' Página: 5 FBB055543FA3166325E1554CA69FB233 Assinatura do documento: '
  + 'Assinatura digital do presidente: Protocolo: 00000.000000/2000-00 -- 5 of 6 -- ';

// ① recurso negado — e-Recursos só dizia "Acórdão publicado"
const NEGADO = `Ante o exposto, voto por CONHECER DO RECURSO E NEGAR-LHE PROVIMENTO, nos termos da
fundamentação. Decisório Nº Acordão: 28ª JR/12261/2025 Vistos e relatados os presentes autos, em
sessão realizada em 27/11/2025, ACORDAM os membros da 28ª Junta de Recursos, em CONHECER DO RECURSO
E NEGAR-LHE PROVIMENTO, POR UNANIMIDADE, de acordo com o voto do(a) Relator(a) e sua fundamentação.${ASSIN}`;

// ② embargos que ANULAM o acórdão anterior e o recurso é provido em parte
const DOIS_ATOS = `CONCLUSÃO Ante o exposto, voto por CONHECER dos Embargos Declaratórios do recorrente
e DAR-LHES provimento para fins de anulação do Acórdão nº 534/2025, para CONHECER DO RECURSO e
DAR-LHE PROVIMENTO PARCIAL. Decisório Nº Acordão: 1ªCA 16ª JR/2493/2026 ACORDAM os membros da 1ª
Composição Adjunta da 16ª Junta de Recursos, em CONHECER DO EMBARGO PARA ANULAR O ACÓRDÃO DA JUNTA DE
RECURSOS, E CONHECER DO RECURSO PARA NO MÉRITO, DAR PROVIMENTO PARCIAL AO SEGURADO, POR UNANIMIDADE,
de acordo com o voto do(a) Relator(a) e sua fundamentação.${ASSIN}`;

// ③ embargos acolhidos SÓ para esclarecer — o e-Recursos dizia "PROVIDO"
const EMBARGO_VAZIO = `entendo por acolher o pedido de Embargos de Declaração com efeito integrativo,
§ 13 do Art 95 do RICRPS, para suprir o questionamento formulado pelo embargante, mantendo-se a decisão
proferida no Acórdão objurgado. CONCLUSÃO Ante o exposto, voto por CONHECER DOS EMBARGOS DE DECLARAÇÃO
E DAR-LHE PROVIMENTO, nos termos da fundamentação. Decisório Nº Acordão: 01ª JR/1228/2026 ACORDAM os
membros da 01ª Junta de Recursos, em CONHECER DO EMBARGO DO SEGURADO E DAR-LHE PROVIMENTO, POR
UNANIMIDADE, de acordo com o voto do(a) Relator(a) e sua fundamentação.${ASSIN}`;

// ④ embargos rejeitados
const EMBARGO_NEGADO = `Nesse sentido, mantêm-se os termos do Acórdão nº 10ª JR/19168/2025. CONCLUSÃO:
Ante o exposto, VOTO por CONHECER dos EMBARGOS DE DECLARAÇÃO e NEGAR-LHES PROVIMENTO. Decisório Nº
Acordão: 10ª JR/10166/2026 ACORDAM os membros da 10ª Junta de Recursos, em CONHECER DO EMBARGO DO
SEGURADO E NEGAR-LHE PROVIMENTO, POR UNANIMIDADE, de acordo com o voto do(a) Relator(a).${ASSIN}`;

// ⑤ provimento parcial SEM concessão do benefício
const PARCIAL_SEM = `ainda assim a parte interessada não alcançar tempo de contribuição suficiente.
CONCLUSÃO Ante o exposto, voto por CONHECER DO RECURSO E DAR-LHE PROVIMENTO PARCIAL, sem a concessão
do benefício, nos termos da fundamentação. Decisório Nº Acordão: 01ª JR/6213/2024 ACORDAM os membros
da 01ª Junta de Recursos, em CONHECER DO RECURSO E DAR-LHE PROVIMENTO PARCIAL, POR UNANIMIDADE, de
acordo com o voto do(a) Relator(a) e sua fundamentação.${ASSIN}`;

const linhas = t => G.resumirPorRegras(t).linhas;

test('① recurso negado sai certo mesmo com o e-Recursos calado', () => {
  assert.deepStrictEqual(linhas(NEGADO).slice(0, 1), ['Manteve a decisão do INSS (recurso negado)']);
});

test('② CASO-OURO: dois atos na mesma frase — a versão anterior lia só o primeiro', () => {
  const l = linhas(DOIS_ATOS);
  assert.ok(l.some(x => /Anulou o acórdão anterior/.test(x)), 'perdeu a anulação');
  assert.ok(l.some(x => /provido em parte/.test(x)), 'perdeu o provimento parcial — era o que interessava');
});

test('③ CASO-OURO: embargo acolhido que mantém a derrota', () => {
  const l = linhas(EMBARGO_VAZIO);
  assert.ok(l.some(x => /Acolheu os embargos/.test(x)));
  assert.ok(l.some(x => /Manteve o que o acórdão anterior/.test(x)),
    'não avisou que a decisão anterior ficou de pé — é o ponto todo');
  assert.ok(!l.some(x => /recurso provido/i.test(x)), 'chamou embargo de recurso provido de novo');
});

test('③ e isso DIVERGE do que o e-Recursos anuncia — divergência é achado, não erro', () => {
  assert.equal(G.divergeDoERecursos('Recurso PROVIDO (01ª Junta)', linhas(EMBARGO_VAZIO)), true);
  assert.equal(G.divergeDoERecursos('Recurso negado (28ª Junta)', linhas(NEGADO)), false);
});

test('④ embargos rejeitados não viram recurso negado', () => {
  const l = linhas(EMBARGO_NEGADO);
  assert.ok(l.some(x => /Rejeitou os embargos/.test(x)));
  assert.ok(!l.some(x => /recurso negado/i.test(x)));
});

test('⑤ CASO-OURO: provimento parcial SEM concessão do benefício', () => {
  const l = linhas(PARCIAL_SEM);
  assert.ok(l.some(x => /provido em parte/.test(x)));
  assert.ok(l.some(x => /Não concedeu o benefício/.test(x)),
    'ganhou tempo mas não o benefício — sem esta linha o resumo engana');
});

test('a ressalva vem do fim do documento, não do meio do voto', () => {
  const meio = 'VOTO: discute-se se caberia provimento sem a concessão do benefício, hipótese afastada. '
    + 'x'.repeat(4000)
    + 'CONCLUSÃO Ante o exposto, voto por CONHECER DO RECURSO E DAR-LHE PROVIMENTO. '
    + 'ACORDAM os membros da 5ª Junta, em CONHECER DO RECURSO E DAR-LHE PROVIMENTO, POR UNANIMIDADE.';
  assert.ok(!linhas(meio).some(x => /Não concedeu/.test(x)), 'pegou ressalva discutida e afastada no voto');
});

test('pega o decisório e não a folha de assinatura', () => {
  const d = G.dispositivo(NEGADO);
  assert.match(d, /^ACORDAM/);
  assert.ok(!/Ante o exposto/.test(d), 'a conclusão do voto entrou no decisório');
});

test('todos os resumos passam pela barreira do motor com IA', () => {
  for (const t of [NEGADO, DOIS_ATOS, EMBARGO_VAZIO, EMBARGO_NEGADO, PARCIAL_SEM]) {
    const v = validarResumo(G.resumirPorRegras(t));
    assert.equal(v.ok, true, v.motivo);
    assert.ok(v.linhas.length <= 4);
  }
});

test('CALA quando não acha o decisório', () => {
  const r = G.resumirPorRegras('Documento digitalizado sem camada de texto.');
  assert.equal(r.conseguiu, false);
  assert.match(r.motivo, /decis[óo]rio/);
});

test('CALA quando o decisório foge do padrão', () => {
  const r = G.resumirPorRegras('ACORDAM os membros da Junta, na forma do relatório e voto que integram este acórdão.');
  assert.equal(r.conseguiu, false);
  assert.match(r.motivo, /padr[ãa]o/);
});

test('não conhecer é lido como não conhecer, não como provido', () => {
  const d = 'ACORDAM os membros da 23ª Junta, em NÃO CONHECER DO RECURSO, POR UNANIMIDADE.';
  assert.deepStrictEqual(linhas(d), ['Negou seguimento ao recurso (não conhecido)']);
});

test('recurso especial tem frase própria', () => {
  const d = 'ACORDAM os membros da 2ª Câmara de Julgamento, em CONHECER DO RECURSO ESPECIAL E '
    + 'NEGAR-LHE PROVIMENTO, POR UNANIMIDADE.';
  assert.match(linhas(d)[0], /recurso especial negado/);
});
