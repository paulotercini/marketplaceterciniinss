// A peneira é o que separa "mandar um mapa" de "mandar a carteira de
// clientes". Se ela falhar, o vazamento é meu, não do portal — por isso os
// casos abaixo são todos formas reais de dado do PAT/GERID.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const P = require('../peneira');

const texto = o => JSON.stringify(o);

test('CPF, nome e nascimento não sobrevivem', () => {
  const fora = P.peneirar({
    cpf: '085.759.798-17', cpfSemMascara: '08575979817',
    nome: 'Almir Tronfini', nomeRequerente: 'ALMIR TRONFINI',
    dataNascimento: '1958-03-04', nomeMae: 'Maria Tronfini',
  });
  const s = texto(fora);
  for (const vaza of ['085', '08575979817', 'Almir', 'ALMIR', 'Tronfini', 'Maria'])
    assert.ok(!s.includes(vaza), `vazou "${vaza}" em ${s}`);
  // a data de nascimento é dado pessoal: some mesmo tendo cara de data
  assert.ok(!s.includes('1958'), `vazou a data de nascimento em ${s}`);
});

test('nome de arquivo e texto de comentário não sobrevivem', () => {
  const s = texto(P.peneirar({
    anexos: [{ nomeArquivo: 'laudo_oncologia_2024.pdf', tamanho: 448122, autenticado: true }],
    comentarios: [{ texto: 'paciente em quimioterapia, CID C50', autor: 'ANALISTA' }],
    observacao: 'cliente relatou dor lombar incapacitante',
  }));
  for (const vaza of ['laudo', 'oncologia', 'quimioterapia', 'C50', 'lombar'])
    assert.ok(!s.includes(vaza), `vazou "${vaza}" em ${s}`);
});

test('o que eu preciso saber fica: código, data e número curto', () => {
  const fora = P.peneirar({
    situacaoTarefa: 'CUMPRIMENTO_DE_EXIGENCIA',
    status: 'PENDENTE',
    dataAtualizacao: '2026-08-09',
    dataProtocolo: '09/08/2026',
    idServico: 1234,
    agendamentos: [{ situacao: 'REMARCADO', data: '2026-09-15', unidade: 'APS FRANCA' }],
  });
  assert.equal(fora.situacaoTarefa, 'CUMPRIMENTO_DE_EXIGENCIA');
  assert.equal(fora.status, 'PENDENTE');
  assert.equal(fora.dataAtualizacao, '2026-08-09');
  assert.equal(fora.dataProtocolo, '09/08/2026');
  assert.equal(fora.idServico, 1234);
  assert.equal(fora.agendamentos[1].situacao, 'REMARCADO');
  assert.equal(fora.agendamentos[1].data, '2026-09-15');
});

// A defesa por nome de campo nunca vai cobrir tudo: o portal é grande e vai
// ter chave que eu não previ. Por isso o padrão é o contrário do usual —
// texto livre some por ser texto livre, mesmo em campo de nome inocente.
test('campo que eu não previ, com texto livre, some do mesmo jeito', () => {
  const fora = P.peneirar({
    obs2: 'Segurado compareceu acompanhado da filha Joana',
    campoAdicional: 'Rua das Palmeiras 220, Franca',
    valor: 'informou telefone 16 99999-0000',
  });
  const s = texto(fora);
  for (const vaza of ['Joana', 'Palmeiras', 'Franca', '99999'])
    assert.ok(!s.includes(vaza), `vazou "${vaza}" em ${s}`);
  assert.match(fora.obs2, /‹texto \d+›/);
});

test('o comprimento fica — é ele que diz se é rótulo ou parecer', () => {
  const curto = P.peneirar({ x: 'sem alteracao no processo' });
  const longo = P.peneirar({ x: 'a'.repeat(3000) });
  assert.match(curto.x, /‹texto 25›/);
  assert.match(longo.x, /‹texto 3000›/);
});

test('lista guarda só o tamanho e a forma de UM item', () => {
  const fora = P.peneirar({ itens: [{ a: 'PENDENTE' }, { a: 'CONCLUIDA' }, { a: 'CANCELADA' }] });
  assert.equal(fora.itens[0], '‹lista de 3›');
  assert.deepStrictEqual(fora.itens[1], { a: 'PENDENTE' });
  assert.equal(fora.itens.length, 2, 'a lista peneirada não pode crescer com o original');
});

test('não quebra com nulo, vazio, aninhado fundo ou ciclo de tipos', () => {
  assert.equal(P.peneirar(null), null);
  assert.equal(P.peneirar(undefined), null);
  assert.deepStrictEqual(P.peneirar([]), []);
  assert.deepStrictEqual(P.peneirar({}), {});
  let fundo = { v: 'PENDENTE' };
  for (let i = 0; i < 30; i++) fundo = { n: fundo };
  assert.doesNotThrow(() => P.peneirar(fundo));
  assert.ok(texto(P.peneirar(fundo)).includes('‹fundo›'), 'o corte de profundidade não agiu');
});

// Número de protocolo tem 15+ dígitos e identifica um requerimento — logo,
// uma pessoa. Não preciso dele para desenhar o robô.
test('número comprido some, mesmo sem nome de campo suspeito', () => {
  const fora = P.peneirar({ p: 44234156897202017, q: '44234156897202017' });
  assert.match(String(fora.p), /‹num \d+ díg›/);
  assert.match(String(fora.q), /‹texto 17›/);
});

// ── o que a primeira sonda de verdade ensinou ─────────────────────────────
// Ela voltou com nomeServico e nomeUnidade apagados. São o nome do serviço do
// INSS e o da agência: não identificam ninguém, e são o que eu mais preciso
// para traduzir a sigla em benefício.
test('nome de SERVIÇO e de UNIDADE não são nome de gente', () => {
  const fora = P.peneirar({
    nomeServico: 'Aposentadoria por Tempo de Contribuição da Pessoa com Deficiência',
    siglaServico: 'TBSBAPD',
    nomeUnidade: 'AGENCIA DA PREVIDENCIA SOCIAL FRANCA',
    nomeRequerente: 'Almir Tronfini',
  });
  assert.equal(fora.siglaServico, 'TBSBAPD');
  assert.match(fora.nomeUnidade, /FRANCA/);
  assert.match(fora.nomeServico, /‹texto 6[0-9]›/, 'nome de serviço muito longo devia ir pelo comprimento');
  assert.match(fora.nomeRequerente, /‹oculto/, 'o nome do cliente NÃO pode passar por essa porta');
});

test('a lista institucional é fechada — chave parecida não entra sozinha', () => {
  const fora = P.peneirar({ nomeServidor: 'João da Silva', nomeMedico: 'Dra. Ana' });
  assert.match(fora.nomeServidor, /‹oculto/);
  assert.match(fora.nomeMedico, /‹oculto/);
});

// Peneirar o corpo e mandar o identificador no endereço é peneirar pela
// metade: a URL do detalhe TERMINA no número do protocolo, e na primeira
// sonda ela foi guardada crua.
test('a URL não leva o número do protocolo junto', () => {
  const u = P.mascararUrl('/apis/requerimentosPortalApi/requerimento/ec/tarefa/1462069078');
  assert.ok(!u.includes('1462069078'), `vazou o protocolo na URL: ${u}`);
  assert.match(u, /‹num 10 díg›/);
  assert.equal(P.mascararUrl('/apis/tarefasApi/tarefas/1462069078/analise-documental'),
               '/apis/tarefasApi/tarefas/‹num 10 díg›/analise-documental');
  // número curto é versão de API, não identificador: fica
  assert.equal(P.mascararUrl('/apis/v1/tarefa/consulta?first=0&pageSize=500'),
               '/apis/v1/tarefa/consulta?first=0&pageSize=500');
});

// ── a sonda roda colada no Console e não faz require: a peneira vive lá
// dentro copiada. Se as duas divergirem, os testes garantem uma coisa e o
// navegador manda outra — e o vazamento aparece depois de mandado.
test('a cópia dentro da sonda é idêntica à testada aqui', () => {
  const sonda = fs.readFileSync(path.join(__dirname, '..', 'sonda-no-navegador.js'), 'utf8');
  const nu = s => s.replace(/\s+/g, ' ').trim();
  const i = sonda.indexOf('function peneirar(');
  assert.notEqual(i, -1, 'peneirar sumiu da sonda');
  let n = 0, j = sonda.indexOf('{', i);
  const ini = j;
  do { if (sonda[j] === '{') n++; else if (sonda[j] === '}') n--; j++; } while (n > 0 && j < sonda.length);
  assert.equal(nu(sonda.slice(i, j)), nu(P.peneirar.toString()),
    'peneirar divergiu entre peneira.js e a sonda');
  for (const [nome, re] of [['PESSOAL', P.PESSOAL], ['CODIGO', P.CODIGO], ['DATA', P.DATA]]) {
    const m = sonda.match(new RegExp(`const ${nome}\\s*=\\s*(/.*?/[a-z]*);`));
    assert.ok(m, `${nome} sumiu da sonda`);
    assert.equal(m[1], re.toString(), `${nome} divergiu entre peneira.js e a sonda`);
  }
});
