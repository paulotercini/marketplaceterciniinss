// A importação toca 100 requerimentos de uma vez. Se ela errar de lista, de
// caso ou de cliente, o estrago aparece espalhado por cem fichas e ninguém
// desfaz na mão. Por isso o plano é conferido antes de gravar — e conferido
// aqui antes de existir.
const { test } = require('node:test');
const assert = require('node:assert');
const I = require('../importar');

const HOJE = '2026-08-09';

// um CRM pequeno com as três situações que importam: caso que já existe,
// cliente sem o caso, e ninguém
const CRM = () => ({
  clientes: [
    { id: 'c1', nome: 'Maria', cpf: '111.111.111-11' },
    { id: 'c2', nome: 'João',  cpf: '22222222222' },
  ],
  casos: [
    { id: 'k1', cliente_id: 'c1', fase: 'inss', protocolos: ['1462069078'],
      situacao_inss: 'Em análise', marcadores: ['rural'] },
  ],
  eventos: [{ id: 'e1', caso_id: 'k1', tipo: 'Perícia médica', data_hora: '2026-08-13T08:20:00' }],
});

const det = (o) => ({ protocolo: o.protocolo, situacao: o.situacao || 'Em análise',
  tipo: o.tipo || 'beneficio', especie: o.especie || null, beneficio: o.beneficio || 'X',
  der: o.der || '2026-07-01', link: `https://atendimento.inss.gov.br/tarefas/detalhar_tarefa/${o.protocolo}`,
  marcadores: o.marcadores || [], urgente: !!o.urgente, eventos: o.eventos || [] });

test('protocolo que já existe atualiza o caso, não cria outro', () => {
  const pat = { lista: [{ protocolo: '1462069078', cpf: '11111111111' }],
                detalhes: [det({ protocolo: '1462069078', especie: 'B87', der: '2026-07-31' })] };
  const p = I.planoDeImportacao(pat, CRM(), HOJE);
  assert.equal(p.novos.length, 0);
  assert.equal(p.atualizar.length, 1);
  assert.equal(p.atualizar[0].caso_id, 'k1');
  assert.equal(p.atualizar[0].mudancas.especie, 'B87');
  assert.equal(p.atualizar[0].mudancas.der, '2026-07-31');
});

// O que o escritório escreveu à mão vale mais que o que o portal devolve.
// Sobrescrever DER conferida por DER do sistema é perder trabalho humano.
test('campo já preenchido no CRM não é sobrescrito', () => {
  const D = CRM();
  D.casos[0].der = '2026-01-01';
  D.casos[0].especie = 'B41';
  const pat = { lista: [{ protocolo: '1462069078', cpf: '11111111111' }],
                detalhes: [det({ protocolo: '1462069078', especie: 'B87', der: '2026-07-31' })] };
  const p = I.planoDeImportacao(pat, D, HOJE);
  const m = (p.atualizar[0] || {}).mudancas || {};
  assert.ok(!('der' in m), 'ia sobrescrever a DER conferida à mão');
  assert.ok(!('especie' in m), 'ia sobrescrever a espécie conferida à mão');
});

test('marcador SOMA ao que já estava marcado — nunca troca', () => {
  const pat = { lista: [{ protocolo: '1462069078', cpf: '11111111111' }],
                detalhes: [det({ protocolo: '1462069078', marcadores: ['pcd'] })] };
  const p = I.planoDeImportacao(pat, CRM(), HOJE);
  assert.deepStrictEqual(p.atualizar[0].mudancas.marcadores, ['rural', 'pcd']);
});

test('cliente existe e caso não: entra como caso novo, na lista do tipo', () => {
  const pat = { lista: [{ protocolo: '999', cpf: '22222222222' }],
                detalhes: [det({ protocolo: '999', tipo: 'recurso' })] };
  const p = I.planoDeImportacao(pat, CRM(), HOJE);
  assert.equal(p.novos.length, 1);
  assert.equal(p.possiveisDuplicados.length, 0);
  assert.equal(p.novos[0].cliente_id, 'c2');
  assert.equal(p.novos[0].lista, 'conselho', 'recurso tem lista própria');
  assert.equal(p.semCliente.length, 0);
});

// Mandar os 70 recursos para a lista do INSS afogaria ela. Recurso tem lista
// própria — e é o mesmo processo que o robô do CRPS acompanha.
test('cada tipo vai para a sua lista', () => {
  const casos = [['beneficio', 'inss'], ['revisao', 'inss'], ['apuracao', 'inss'],
                 ['recurso', 'conselho']];
  for (const [tipo, lista] of casos) {
    const pat = { lista: [{ protocolo: '7', cpf: '22222222222' }],
                  detalhes: [det({ protocolo: '7', tipo })] };
    assert.equal(I.planoDeImportacao(pat, CRM(), HOJE).novos[0].lista, lista, tipo);
  }
});

// "Atualizar vínculos" e "emissão de pagamento" acontecem DENTRO de um caso
// que já existe. Abrir caso para eles encheria a lista de tarefa
// administrativa sem cliente por trás.
test('serviço e pagamento NÃO abrem caso', () => {
  for (const tipo of ['servico', 'pagamento']) {
    const pat = { lista: [{ protocolo: '7', cpf: '22222222222' }],
                  detalhes: [det({ protocolo: '7', tipo })] };
    const p = I.planoDeImportacao(pat, CRM(), HOJE);
    assert.equal(p.novos.length, 0, tipo);
    assert.equal(p.ignorados.length, 1, tipo);
  }
});

test('CPF que não está no CRM fica separado, não vira cliente às cegas', () => {
  const pat = { lista: [{ protocolo: '5', cpf: '99999999999' }],
                detalhes: [det({ protocolo: '5' })] };
  const p = I.planoDeImportacao(pat, CRM(), HOJE);
  assert.equal(p.semCliente.length, 1);
  assert.equal(p.semCliente[0].cpf, '99999999999');
  assert.equal(p.novos.length, 0);
});

test('o CPF casa com ou sem pontuação no cadastro', () => {
  // c1 está cadastrado com "111.111.111-11"; o recurso vai para outra lista,
  // então não esbarra no caso do INSS que ele já tem
  const pat = { lista: [{ protocolo: '5', cpf: '11111111111' }],
                detalhes: [det({ protocolo: '5', tipo: 'recurso' })] };
  assert.equal(I.planoDeImportacao(pat, CRM(), HOJE).novos[0].cliente_id, 'c1');
});

// O PROTOCOLO CASOU EM POUCOS porque o campo quase nunca foi preenchido à
// mão — não porque o caso não existe. Criar sem olhar duplicaria a ficha de
// quem já está no CRM, e ninguém desfaz setenta duplicatas na mão.
test('caso parecido do mesmo cliente NÃO vira caso novo às cegas', () => {
  const D = CRM();
  D.casos[0].especie = 'B87';
  D.casos[0].beneficio = 'BPC/LOAS — deficiência';
  const pat = { lista: [{ protocolo: '888', cpf: '11111111111' }],   // protocolo novo
                detalhes: [det({ protocolo: '888', especie: 'B87' })] };
  const p = I.planoDeImportacao(pat, D, HOJE);
  assert.equal(p.novos.length, 0, 'ia criar uma segunda ficha do mesmo pedido');
  assert.equal(p.possiveisDuplicados.length, 1);
  assert.equal(p.possiveisDuplicados[0].caso_id, 'k1');
  assert.match(p.possiveisDuplicados[0].titulo_existente, /BPC/);
});

// Espécie diferente é pedido diferente: o mesmo cliente pode ter um B42 e um
// B87 abertos ao mesmo tempo, e o segundo não é duplicata do primeiro.
test('espécie diferente no mesmo cliente é caso novo mesmo', () => {
  const D = CRM();
  D.casos[0].especie = 'B87';
  const pat = { lista: [{ protocolo: '888', cpf: '11111111111' }],
                detalhes: [det({ protocolo: '888', especie: 'B42' })] };
  const p = I.planoDeImportacao(pat, D, HOJE);
  assert.equal(p.novos.length, 1);
  assert.equal(p.possiveisDuplicados.length, 0);
});

test('lista diferente não é duplicata — recurso não duplica caso do INSS', () => {
  const D = CRM();
  const pat = { lista: [{ protocolo: '888', cpf: '11111111111' }],
                detalhes: [det({ protocolo: '888', tipo: 'recurso' })] };
  const p = I.planoDeImportacao(pat, D, HOJE);
  assert.equal(p.novos.length, 1, 'o caso do INSS não pode barrar um recurso');
  assert.equal(p.novos[0].lista, 'conselho');
});

// ── agenda ────────────────────────────────────────────────────────────────
test('só AGENDADO futuro vira compromisso, e o repetido não entra de novo', () => {
  const pat = { lista: [{ protocolo: '1462069078', cpf: '11111111111' }],
    detalhes: [det({ protocolo: '1462069078', eventos: [
      { tipo: 'Perícia médica', data: '2026-08-13', hora: '08:20', ativo: true },   // já na agenda
      { tipo: 'Perícia médica', data: '2026-08-12', hora: '07:40', ativo: false },  // remarcado
      { tipo: 'Avaliação social', data: '2026-07-31', hora: '10:00', ativo: true }, // passou
      { tipo: 'Avaliação social', data: '2026-08-21', hora: '07:00', ativo: true },
    ] })] };
  const p = I.planoDeImportacao(pat, CRM(), HOJE);
  assert.equal(p.eventos.length, 1);
  assert.deepStrictEqual(p.eventos[0].eventos,
    [{ tipo: 'Avaliação social', data: '2026-08-21', hora: '07:00', local: null }]);
});

// ── andamento ─────────────────────────────────────────────────────────────
// Escrever "sem alteração" todo dia é exatamente o que o escritório fazia à
// mão e queria parar de fazer.
test('andamento só quando a situação MUDA', () => {
  const igual = { lista: [{ protocolo: '1462069078', cpf: '11111111111' }],
                  detalhes: [det({ protocolo: '1462069078', situacao: 'Em análise' })] };
  const p1 = I.planoDeImportacao(igual, CRM(), HOJE);
  assert.ok(!(p1.atualizar[0] || {}).andamento, 'situação igual não pode virar comentário');

  const mudou = { lista: [{ protocolo: '1462069078', cpf: '11111111111' }],
                  detalhes: [det({ protocolo: '1462069078', situacao: 'Em exigência' })] };
  const p2 = I.planoDeImportacao(mudou, CRM(), HOJE);
  assert.match(p2.atualizar[0].andamento, /Em análise → Em exigência/);
});

test('a primeira importação não inventa mudança de situação', () => {
  const D = CRM();
  delete D.casos[0].situacao_inss;
  const pat = { lista: [{ protocolo: '1462069078', cpf: '11111111111' }],
                detalhes: [det({ protocolo: '1462069078', situacao: 'Em exigência' })] };
  assert.ok(!(I.planoDeImportacao(pat, D, HOJE).atualizar[0] || {}).andamento);
});

// ── a conferência antes de gravar ─────────────────────────────────────────
test('o plano de um arquivo real passa na conferência', () => {
  const pat = { lista: [
      { protocolo: '1462069078', cpf: '11111111111' }, { protocolo: '999', cpf: '22222222222' },
      { protocolo: '5', cpf: '99999999999' }, { protocolo: '7', cpf: '22222222222' }],
    detalhes: [det({ protocolo: '1462069078', especie: 'B87' }),
               det({ protocolo: '999', tipo: 'recurso' }),
               det({ protocolo: '5' }), det({ protocolo: '7', tipo: 'servico' })] };
  const p = I.planoDeImportacao(pat, CRM(), HOJE);
  assert.equal(I.conferirPlanoPat(pat, p), null);
  assert.deepStrictEqual(p.resumo,
    { lidos: 4, atualizar: 1, novos: 1, possiveis_duplicados: 0, sem_cliente: 1,
      ignorados: 1, eventos: 0, exigencias: 0, apuracoes: 0, a_confirmar: 0,
      novos_por_tipo: { recurso: 1 } });
});

test('a conferência barra plano que manda recurso para a lista errada', () => {
  const pat = { lista: [{ protocolo: '999', cpf: '22222222222' }],
                detalhes: [det({ protocolo: '999', tipo: 'recurso' })] };
  const p = I.planoDeImportacao(pat, CRM(), HOJE);
  p.novos[0].lista = 'inss';                       // estrago de propósito
  assert.match(I.conferirPlanoPat(pat, p), /conselho/);
});

test('a conferência barra plano que fala de mais gente do que foi lida', () => {
  const pat = { lista: [], detalhes: [det({ protocolo: '1' })] };
  const p = I.planoDeImportacao(pat, CRM(), HOJE);
  p.novos.push({ protocolo: '2', tipo: 'beneficio', lista: 'inss' });
  p.novos.push({ protocolo: '3', tipo: 'beneficio', lista: 'inss' });
  assert.match(I.conferirPlanoPat(pat, p), /só 1 foram lidos|1 foram lidos/);
});

test('arquivo vazio não quebra e não propõe nada', () => {
  const p = I.planoDeImportacao({}, CRM(), HOJE);
  assert.equal(p.resumo.lidos, 0);
  assert.equal(I.conferirPlanoPat({}, p), null);
});

// ── o app.html é arquivo único e não faz require: a mesma lógica vive lá
// dentro copiada. Se as duas divergirem, a tela planeja de um jeito e os
// testes garantem outro — e a diferença aparece com cem casos já gravados.
const fs = require('fs');
const path = require('path');
test('a cópia dentro do app.html é idêntica à testada aqui', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', '..', 'app.html'), 'utf8');
  const nu = s => s.replace(/\s+/g, ' ').trim();
  for (const fn of ['protocolosDe', 'indexar', 'casoParecido', 'mudancasDoCaso', 'eventosNovos',
                    'andamentoDaMudanca', 'planoDeImportacao', 'conferirPlanoPat']) {
    const i = app.indexOf(`function ${fn}(`);
    assert.notEqual(i, -1, `${fn} sumiu do app.html`);
    let n = 0, j = app.indexOf('{', i);
    do { if (app[j] === '{') n++; else if (app[j] === '}') n--; j++; } while (n > 0 && j < app.length);
    assert.equal(nu(app.slice(i, j)), nu(I[fn].toString()), `${fn} divergiu de importar.js`);
  }
  const m = app.match(/const LISTA_POR_TIPO = \{([\s\S]*?)\};/);
  assert.ok(m, 'LISTA_POR_TIPO sumiu do app.html');
  assert.deepStrictEqual(eval(`({${m[1]}})`), I.LISTA_POR_TIPO);
  assert.ok(/const NAO_ABRE_CASO = new Set\(\['servico', 'pagamento'\]\)/.test(app),
    'NAO_ABRE_CASO divergiu do app.html');
});
