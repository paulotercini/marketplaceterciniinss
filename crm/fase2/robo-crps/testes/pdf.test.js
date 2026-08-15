// Caso-ouro do bug real: os 67 acórdãos entraram no CRM com 0 byte porque o
// coletor pedia o documento em /esisrec/... (rota da tela) em vez de
// /api/v1/esisrec/... (rota da API). O servidor respondia 200 com a própria
// página do site, e ninguém conferia se o que chegou era mesmo um PDF.
const { test } = require('node:test');
const assert = require('node:assert');
const P = require('../preparar.js');
const I = require('../ingerir.js');

test('a URL do documento leva o prefixo da API', () => {
  assert.equal(P.urlDoc('/esisrec/44234156897202017/64874126'),
    '/api/v1/esisrec/44234156897202017/64874126');
});

test('o ?arquivo= é cortado — é só o nome sugerido para salvar', () => {
  assert.equal(P.urlDoc('/esisrec/442341568/64874126?arquivo=ACORDAO_3080.pdf'),
    '/api/v1/esisrec/442341568/64874126');
});

test('ehPDF aceita o PDF de verdade e recusa página e vazio', () => {
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);      // %PDF-1
  const html = new Uint8Array([0x3c, 0x21, 0x44, 0x4f, 0x43]);           // <!DOC
  assert.equal(P.ehPDF(pdf), true);
  assert.equal(P.ehPDF(html), false);
  assert.equal(P.ehPDF(new Uint8Array(0)), false);
  assert.equal(P.ehPDF(null), false);
});

test('o tamanho não arredonda para 0 KB — foi o que escondeu o problema', () => {
  assert.equal(P.tamanho(312), '312 bytes');
  assert.equal(P.tamanho(78_643), '76.8 KB');
});

test('os ajudantes viajam mesmo para dentro do coletor', () => {
  const s = P.montarColetor(['44234156897202017'], 3000);
  assert.ok(!s.includes('{{'), 'sobrou marcador sem trocar no coletor');
  assert.match(s, /const urlDoc =/);
  assert.match(s, /\/api\/v1/);
  assert.match(s, /const ehPDF =/);
  assert.match(s, /44234156897202017/);
  assert.match(s, /3000/);
  new Function(s);   // tem que ser JavaScript válido
});

test('o coletor pede o documento como PDF e com o crachá do site', () => {
  const s = P.montarColetor(['1'], 100);
  assert.match(s, /Accept: 'application\/pdf'/);
  assert.match(s, /localStorage\.getItem\('ifs_auth'\)/);
});

test('conferirPDF barra o arquivo vazio e o que não é PDF', () => {
  const bom = Buffer.concat([Buffer.from('%PDF-1.4'), Buffer.alloc(2000, 0x20)]);
  assert.equal(I.conferirPDF(bom), null);
  assert.match(I.conferirPDF(Buffer.alloc(0)), /0 bytes/);
  assert.match(I.conferirPDF(Buffer.from('%PDF-1.4')), /8 bytes/);
  assert.match(I.conferirPDF(Buffer.alloc(3000, 0x41)), /não é PDF/);
});

test('nome de arquivo do Storage sai sem acento, sem barra e sem espaço', () => {
  const n = I.nomeSeguro('DECISÃO MONOCRÁTICA_1ªCA 2ª JR/2413/2026.pdf');
  assert.ok(!/[\/ ÃÁª]/.test(n), 'sobrou caractere que o Storage recusa: ' + n);
  assert.match(n, /\.pdf$/);
});

test('o caminho do acórdão já guardado sobrevive a uma coleta sem PDF', () => {
  const bloco = { eventos: [{ arquivos: [{ id: '73189593', nome: 'ACÓRDÃO.pdf' }] }] };
  const jaTinha = new Map([['73189593', { storage: 'crps/1/73189593_ACORDAO.pdf', bytes: 78643 }]]);
  I.restaurarGuardados(bloco, jaTinha);
  assert.equal(bloco.eventos[0].arquivos[0].storage, 'crps/1/73189593_ACORDAO.pdf');
});

test('a cópia vazia da coleta antiga NÃO volta — o botão some até vir a boa', () => {
  const bloco = { eventos: [{ arquivos: [{ id: '73189593', nome: 'ACÓRDÃO.pdf' }] }] };
  const jaTinha = new Map([['73189593', { storage: 'crps/1/73189593_ACORDAO.pdf' }]]);  // sem bytes
  I.restaurarGuardados(bloco, jaTinha);
  assert.equal(bloco.eventos[0].arquivos[0].storage, undefined);
});

// CASO-OURO: aplicar os resumos e depois rodar a ingestão apagaria tudo — a
// ingestão reescreve o bloco do processo do zero a cada leitura.
test('a ingestão não apaga o resumo do acórdão', () => {
  const bloco = { eventos: [{ arquivos: [{ id: '73189593', nome: 'ACÓRDÃO.pdf' }] }] };
  const jaTinha = new Map([['73189593', { storage: 'crps/1/73189593_ACORDAO.pdf', bytes: 78643,
    resumo: { linhas: ['Acolheu os embargos de declaração'], origem: 'auto' } }]]);
  I.restaurarGuardados(bloco, jaTinha);
  assert.deepStrictEqual(bloco.eventos[0].arquivos[0].resumo.linhas, ['Acolheu os embargos de declaração']);
});

test('e não apaga nem o que alguém corrigiu à mão na ficha', () => {
  const bloco = { eventos: [{ arquivos: [{ id: '1', nome: 'A.pdf' }] }] };
  const jaTinha = new Map([['1', { storage: 's1', bytes: 100,
    resumo: { linhas: ['Reconheceu o tempo especial'], origem: 'curado' } }]]);
  I.restaurarGuardados(bloco, jaTinha);
  assert.equal(bloco.eventos[0].arquivos[0].resumo.origem, 'curado');
});

// O órgão custa uma leitura de PDF por decisão; e o que alguém corrigiu à mão
// não pode voltar errado só porque houve uma coleta nova.
test('a ingestão não apaga o órgão julgador', () => {
  const bloco = { eventos: [{ arquivos: [{ id: '1', nome: 'A.pdf' }] }] };
  const jaTinha = new Map([['1', { storage: 's1', bytes: 100,
    orgao: { nome: '10ª Junta de Recursos', instancia: 1, origem: 'auto' } }]]);
  I.restaurarGuardados(bloco, jaTinha);
  assert.equal(bloco.eventos[0].arquivos[0].orgao.nome, '10ª Junta de Recursos');
});

// A estrela é do escritório, não do e-Recursos: ela diz "isto aqui eu preciso
// ver". O bloco é reescrito do zero a cada coleta — sem restaurar, o robô
// apagaria todos os destaques na varredura seguinte.
test('a estrela da movimentação sobrevive à coleta seguinte', () => {
  const chave = { data: '12/11/2025 10:00:00', bruto: 'Conhecer do Recurso e negar-lhe provimento' };
  const antes = { eventos: [{ ...chave, importante: true }, { data: '01/10/2025 09:00:00', bruto: 'Contrarrazoes' }] };
  const bloco = { eventos: [{ ...chave }, { data: '01/10/2025 09:00:00', bruto: 'Contrarrazoes' }] };
  I.restaurarGuardados(bloco, new Map(), antes);
  assert.equal(bloco.eventos[0].importante, true, 'apagou o destaque na coleta nova');
  assert.equal(bloco.eventos[1].importante, undefined, 'acendeu estrela em quem não tinha');
});

// ── o comentário que o robô escreve no Escritório ──────────────────────────
test('decisão de Junta avisa o prazo do recurso especial', () => {
  const txt = I.comentarioDoEvento({ tipo: 'decisao', icone: '⛔', data: '12/11/2025 10:00:00',
    resumo: 'Recurso negado (25ª Junta)',
    bruto: 'Conhecer do Recurso e negar-lhe provimento - Acórdão: 25ª JR/3080/2025' });
  assert.match(txt, /25ª Junta de Recursos/);
  assert.match(txt, /30 dias/);
  // o rótulo já trazia "(25ª Junta)"; com o órgão inteiro ao lado, viraria eco
  assert.ok(!/\(25ª Junta\)/.test(txt), 'repetiu o órgão duas vezes na mesma linha');
});

test('decisão de Câmara não promete recurso que não existe', () => {
  const txt = I.comentarioDoEvento({ tipo: 'decisao', icone: '✅', data: '16/07/2026 10:00:00',
    resumo: 'Recurso PROVIDO (4ª Câmara)',
    bruto: 'Conhecer do Recurso e dar-lhe provimento - Acórdão: 4ª CAJ/1200/2026' });
  assert.match(txt, /4ª Câmara de Julgamento/);
  assert.ok(!/30 dias/.test(txt), 'ofereceu recurso especial contra decisão de Câmara');
  assert.match(txt, /fim da via administrativa/i);
});

test('movimentação comum vira comentário de uma linha, sem alarde', () => {
  const txt = I.comentarioDoEvento({ tipo: 'andamento', icone: '📄', data: '02/02/2026 09:00:00',
    resumo: 'Contrarrazões do INSS juntadas', bruto: 'Contrarrazoes' });
  assert.equal(txt, '🖥 CRPS · 02/02/2026 — 📄 Contrarrazões do INSS juntadas');
  assert.ok(!txt.includes('\n'));
});

// marcar tudo como importante é o mesmo que não marcar nada
test('só decisão e pauta acendem o ⭐ sozinhas', () => {
  assert.ok(I.PEDE_CIENCIA.has('decisao'));
  assert.ok(I.PEDE_CIENCIA.has('pauta'));
  for (const t of ['andamento', 'recurso', 'pericia', 'ruido'])
    assert.ok(!I.PEDE_CIENCIA.has(t), `${t} não deveria acender o ⭐`);
});
