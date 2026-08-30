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
  marcadores: o.marcadores || [], urgente: !!o.urgente, eventos: o.eventos || [],
  comentarios: o.comentarios || [], atualizado_em: o.atualizado_em || null });

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

// F44 · antes o primeiro import da situação entrava CALADO — o caso ganhava
// "Em exigência" no banco e nada aparecia em 📣. Agora ele se anuncia, mas
// como REGISTRO, não como seta de mudança: não houve situação anterior e
// inventar uma ("null → Em exigência") seria mentir sobre o histórico.
test('a primeira situação é registrada, não vira seta de mudança', () => {
  const D = CRM();
  delete D.casos[0].situacao_inss;
  const pat = { lista: [{ protocolo: '1462069078', cpf: '11111111111' }],
                detalhes: [det({ protocolo: '1462069078', situacao: 'Em exigência' })] };
  const and = I.planoDeImportacao(pat, D, HOJE).atualizar[0].andamento;
  assert.match(and, /Situação registrada: Em exigência/);
  assert.ok(!/→/.test(and), 'sem situação anterior não pode haver seta');
});

// ── a movimentação sem novidade visível (F44) ─────────────────────────────
// O portal avança a "última atualização" do requerimento sem mudar situação,
// sem comentário e sem agendamento. Isso é movimentação real — quem olha o
// PAT vê a data mudar — e entrava calada no CRM.
test('protocolo que só mudou de carimbo vira novidade própria', () => {
  const pat = { lista: [{ protocolo: '1462069078', cpf: '11111111111' }],
    detalhes: [det({ protocolo: '1462069078', atualizado_em: '2026-08-08 14:32' })] };
  const p = I.planoDeImportacao(pat, CRM(), HOJE);
  assert.equal(p.atualizacoes.length, 1);
  assert.equal(p.atualizacoes[0].caso_id, 'k1');
  assert.equal(p.resumo.movimentacoes, 1);
  // preencher campo vazio (o backfill de benefício e DER) não é novidade e
  // não gera linha em 📣 — por isso NÃO suprime a movimentação
  assert.ok(!p.atualizar[0].andamento, 'backfill de campo não é andamento');
});

// Importar o mesmo arquivo duas vezes é rotina no escritório. Se o carimbo
// já virou andamento, ele não pode virar de novo.
test('a mesma movimentação não volta na importação seguinte', () => {
  const D = CRM();
  D.andamentos = [{ caso_id: 'k1', origem_id: 'atualizacao:1462069078:202608081432' }];
  const pat = { lista: [{ protocolo: '1462069078', cpf: '11111111111' }],
    detalhes: [det({ protocolo: '1462069078', atualizado_em: '2026-08-08 14:32' })] };
  assert.equal(I.planoDeImportacao(pat, D, HOJE).atualizacoes.length, 0);
});

// Quando OUTRA novidade já conta a história, a movimentação genérica é ruído:
// o escritório leria duas linhas em 📣 para o mesmo fato.
test('movimentação não duplica novidade que já tem motivo', () => {
  const pat = { lista: [{ protocolo: '1462069078', cpf: '11111111111' }],
    detalhes: [det({ protocolo: '1462069078', situacao: 'Em exigência',
                     atualizado_em: '2026-08-08 14:32' })] };
  const p = I.planoDeImportacao(pat, CRM(), HOJE);
  assert.match(p.atualizar[0].andamento, /Em análise → Em exigência/);
  assert.equal(p.atualizacoes.length, 0);
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
    { lidos: 4, atualizar: 1, novos: 1, possiveis_duplicados: 0, provaveis: 0, sem_cliente: 1,
      ignorados: 1, eventos: 0, comentarios: 0, movimentacoes: 0, exigencias: 0,
      apuracoes: 0, a_confirmar: 0, novos_por_tipo: { recurso: 1 } });
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
  for (const fn of ['protocolosDe', 'indexar', 'casosParecidos', 'palavrasDoBeneficio',
                    'mesmoBeneficio', 'porQueParecido', 'mudancasDoCaso', 'eventosNovos',
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

// ── os comentários do INSS ────────────────────────────────────────────────
// São a resposta para "o que mudou?". Sem eles a importação avisa que algo
// aconteceu e não diz o quê.
test('comentário novo vira andamento; o já visto não volta', () => {
  const D = CRM();
  D.andamentos = [{ caso_id: 'k1', origem_id: '8' }];   // esse já está na ficha
  const pat = { lista: [{ protocolo: '1462069078', cpf: '11111111111' }],
    detalhes: [det({ protocolo: '1462069078', comentarios: [
      { id: '9', texto: 'Apresentar PPP da empresa X', quando: '2026-08-05', do_inss: true },
      { id: '8', texto: 'Exigência cumprida', quando: '2026-08-01', do_inss: false },
    ] })] };
  const p = I.planoDeImportacao(pat, D, HOJE);
  assert.equal(p.comentarios.length, 1);
  assert.deepStrictEqual(p.comentarios[0].comentarios, [
    { origem_id: '9', quando: '2026-08-05', texto: 'INSS · Apresentar PPP da empresa X' }]);
  assert.equal(p.resumo.comentarios, 1);
});

// A importação roda TODO DIA e o portal devolve sempre a lista inteira.
test('rodar de novo no mesmo dia não repete comentário nenhum', () => {
  const D = CRM();
  D.andamentos = [{ caso_id: 'k1', origem_id: '9' }, { caso_id: 'k1', origem_id: '8' }];
  const pat = { lista: [{ protocolo: '1462069078', cpf: '11111111111' }],
    detalhes: [det({ protocolo: '1462069078', comentarios: [
      { id: '9', texto: 'a', quando: '2026-08-05' }, { id: '8', texto: 'b', quando: '2026-08-01' }] })] };
  assert.equal(I.planoDeImportacao(pat, D, HOJE).resumo.comentarios, 0);
});

// O PAT devolve o comentário em HTML — na ficha aparecia
// "<p>Tarefa transferida para an&aacute;lise na fila regional</p>", tag e
// entidade cruas (bug real, print do Paulo de 10.08.2026).
test('comentário em HTML vira texto simples', () => {
  const D = CRM(); D.andamentos = [];
  const pat = { lista: [{ protocolo: '1462069078', cpf: '11111111111' }],
    detalhes: [det({ protocolo: '1462069078', comentarios: [
      { id: '3', texto: '<p>Tarefa transferida para an&aacute;lise na fila regional</p>',
        quando: '2026-08-10', do_inss: false }] })] };
  const cs = I.planoDeImportacao(pat, D, HOJE).comentarios[0].comentarios;
  assert.equal(cs[0].texto, 'Escritório · Tarefa transferida para análise na fila regional');
});

test('limparHtmlPat: tags, entidades numéricas e nomeadas, espaços', () => {
  assert.equal(I.limparHtmlPat('<p>Exig&ecirc;ncia: juntar  PPP<br>at&eacute; 20/08</p>'),
    'Exigência: juntar PPP até 20/08');
  assert.equal(I.limparHtmlPat('an&#225;lise conclu&#xED;da'), 'análise concluída');
  assert.equal(I.limparHtmlPat('sem html nenhum'), 'sem html nenhum');
});

// Quem escreveu vem na frente: é a diferença entre o INSS PEDINDO algo e o
// escritório respondendo, e ela muda o que se faz a seguir.
test('o texto diz quem escreveu', () => {
  const D = CRM(); D.andamentos = [];
  const pat = { lista: [{ protocolo: '1462069078', cpf: '11111111111' }],
    detalhes: [det({ protocolo: '1462069078', comentarios: [
      { id: '1', texto: 'junte o PPP', quando: '2026-08-05', do_inss: true },
      { id: '2', texto: 'juntado', quando: '2026-08-06', do_inss: false }] })] };
  const cs = I.planoDeImportacao(pat, D, HOJE).comentarios[0].comentarios;
  assert.match(cs.find(c => c.origem_id === '1').texto, /^INSS · /);
  assert.match(cs.find(c => c.origem_id === '2').texto, /^Escritório · /);
});

// O caso que só tem comentário novo (nada mais mudou) precisa entrar no
// plano — senão o comentário nunca seria gravado.
test('caso sem outra mudança entra no plano só pelo comentário', () => {
  const D = CRM(); D.andamentos = [];
  D.casos[0].der = '2026-01-01'; D.casos[0].especie = 'B87';
  D.casos[0].beneficio = 'X'; D.casos[0].processo_link =
    'https://atendimento.inss.gov.br/tarefas/detalhar_tarefa/1462069078';
  const pat = { lista: [{ protocolo: '1462069078', cpf: '11111111111' }],
    detalhes: [det({ protocolo: '1462069078', especie: 'B87', beneficio: 'X',
      comentarios: [{ id: '7', texto: 'novidade', quando: '2026-08-07' }] })] };
  const p = I.planoDeImportacao(pat, D, HOJE);
  assert.equal(p.atualizar.length, 1, 'o comentário sozinho não colocou o caso no plano');
  assert.equal(p.atualizar[0].novos_comentarios, 1);
});

// ── provável x duvidoso ───────────────────────────────────────────────────
// Sessenta e cinco decisões na mão, na primeira importação de verdade. A
// maioria era "Aposentadoria por tempo de contribuição" contra "Apos. Tempo
// de Contribuição" — a mesma coisa escrita de dois jeitos. O que separa o
// óbvio do duvidoso pode ser dito, e é isto que estes testes prendem.
test('o mesmo benefício escrito de outro jeito é provável', () => {
  assert.ok(I.mesmoBeneficio('Aposentadoria por tempo de contribuição', 'Apos. Tempo de Contribuição'));
  assert.ok(I.mesmoBeneficio('Auxílio-doença', 'Aux. Doença'));
  assert.ok(I.mesmoBeneficio('Aposentadoria por idade', 'Apos. por Idade'));
});

// "Recurso ESPECIAL" e "Aposentadoria ESPECIAL" compartilham a palavra e não
// o assunto: é parecença de texto, não de caso.
test('palavra em comum sem assunto em comum não conta', () => {
  assert.ok(!I.mesmoBeneficio('Aposentadoria por idade', 'Aposentadoria especial'));
  assert.ok(!I.mesmoBeneficio('Auxílio-acidente', 'Espécie 94'));
  assert.ok(!I.mesmoBeneficio('', 'Apos. por Idade'));
});

test('mesma espécie basta para ser provável', () => {
  const j = I.porQueParecido({ tipo: 'beneficio', especie: 'B42', beneficio: 'Sei lá o quê' },
                             { especie: 'b42', beneficio: 'Outro nome qualquer' }, 1);
  assert.equal(j.provavel, true);
  assert.match(j.motivo, /mesma espécie/);
});

// O nome que o portal manda num recurso é o TIPO do recurso, não o benefício.
// Comparar texto ali casaria coisas erradas; o que vale é quantos casos o
// cliente tem naquela lista.
test('recurso é provável quando o cliente só tem um caso na lista', () => {
  const item = { tipo: 'recurso', beneficio: 'Recurso ordinário (inicial)' };
  assert.equal(I.porQueParecido(item, { beneficio: 'Aux. Incapacidade Temporária' }, 1).provavel, true);
  const dois = I.porQueParecido(item, { beneficio: 'Aux. Incapacidade Temporária' }, 3);
  assert.equal(dois.provavel, false);
  assert.match(dois.motivo, /3 casos/);
});

test('benefício que não bate fica para decidir na mão', () => {
  const j = I.porQueParecido({ tipo: 'beneficio', especie: 'B36', beneficio: 'Auxílio-acidente' },
                             { especie: 'B94', beneficio: 'Espécie 94' }, 1);
  assert.equal(j.provavel, false);
  assert.match(j.motivo, /não bate/);
});

test('o plano marca o provável, conta e põe na frente', () => {
  const D = { clientes: [{ id: 'c1', cpf: '11111111111', nome: 'Maria' }],
              casos: [
                { id: 'k1', cliente_id: 'c1', fase: 'inss', beneficio: 'Apos. Tempo de Contribuição' },
                { id: 'k2', cliente_id: 'c1', fase: 'inss', beneficio: 'Pensão por morte' }],
              eventos: [], andamentos: [] };
  const pat = { lista: [{ protocolo: '11', cpf: '11111111111' },
                        { protocolo: '22', cpf: '11111111111' }],
    detalhes: [det({ protocolo: '11', beneficio: 'Auxílio-acidente', especie: null }),
               det({ protocolo: '22', beneficio: 'Aposentadoria por tempo de contribuição', especie: null })] };
  const p = I.planoDeImportacao(pat, D, HOJE);
  assert.equal(p.resumo.possiveis_duplicados, 2);
  assert.equal(p.resumo.provaveis, 1, 'devia haver exatamente um provável');
  assert.equal(p.possiveisDuplicados[0].protocolo, '22', 'o provável tem de vir primeiro');
  assert.equal(p.possiveisDuplicados[0].provavel, true);
  assert.equal(p.possiveisDuplicados[1].provavel, false);
  assert.ok(p.possiveisDuplicados[1].motivo, 'o duvidoso também precisa dizer por quê');
});
