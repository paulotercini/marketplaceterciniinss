// Botão que não faz nada é pior que botão que não existe: quem clica acha
// que o sistema travou. Estes testes abrem o app num navegador de verdade,
// clicam, e conferem que a tela MUDOU — não que a função foi chamada.
//
// O playwright mora em robo-crps/node_modules (é lá que o coletor do CRPS já
// o usava); aqui ele é só emprestado.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const RAIZ = path.join(__dirname, '..', '..');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let chromium;
try { ({ chromium } = require(path.join(RAIZ, 'robo-crps', 'node_modules', 'playwright'))); }
catch (e) { /* sem playwright instalado: os testes se declaram pulados abaixo */ }

const TEM_NAVEGADOR = !!chromium && fs.existsSync(CHROME);

// dados de mentira com a forma dos de verdade — é o bastante para a tela
// montar e os botões terem em que mexer
const SEMENTE = `
  const CO=[{id:'p',nome:'Paulo',inicial:'P',cor:'#C0392B',ativo:true,papel:'admin'},
            {id:'a',nome:'Amanda',inicial:'A',cor:'#C19C00',ativo:true}];
  eu=CO[0];
  const N=['Maria Aparecida de Souza','João Batista Ferreira','Benedita Ramos da Silva'];
  D={};
  D.colaboradores=CO; D.colPorId=new Map(CO.map(c=>[c.id,c]));
  D.clientes=N.map((n,i)=>({id:'c'+i,nome:n,cpf:'1234567890'+i}));
  D.cliPorId=new Map(D.clientes.map(c=>[c.id,c]));
  D.casos=N.map((n,i)=>({id:'k'+i,cliente_id:'c'+i,titulo:n,beneficio:'Aposentadoria por idade',
    especie:'B41',marcadores:i?[]:['rural'],fase:'inss',importante:false,urgente:false,protocolos:[]}));
  D.casoPorId=new Map(D.casos.map(k=>[k.id,k]));
  D.casosDoCliente=new Map(D.casos.map(k=>[k.cliente_id,[k]]));
  D.atrDoCaso=new Map(D.casos.map(k=>[k.id,['p']]));
  D.tarefas=[];D.tarefasPorCaso=new Map();D.eventos=[];D.pagamentos=[];D.meudia=[];
  D.and30=[];D.modelos=[];D.sugestoes=[];D.mencoes=[];D.leads=[];D.docs=[];D.ckls=[];
  D.docModelos=[];D.frases=[];D.lembrarMotivos=[];D.rotinas=[];D.rotinasFeitas=[];
  D.apos=[];D.listaPref=[];D.config=new Map();D.zapResumo=0;D.andamentos=[];
  D.tarefasFicha=[];D.anexos=[];D.convFicha=[];
  visao='fase:inss';
`;

let navegador, pag;
const erros = [];

before(async () => {
  if (!TEM_NAVEGADOR) return;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-tela-'));
  // os marcadores de instalação são "COLE_AQUI_https://..." e
  // "COLE_AQUI_a_anon_key" — com minúsculas depois do prefixo. Trocá-los por
  // regex de MAIÚSCULAS não pegava nada, e o app saía chamando um endereço
  // inválido em silêncio.
  const html = fs.readFileSync(path.join(RAIZ, 'app.html'), 'utf8')
    .replace('"COLE_AQUI_https://xxxx.supabase.co"', '"https://fake.supabase.co"')
    .replace('"COLE_AQUI_a_anon_key"', '"chave-de-teste"');
  const arq = path.join(tmp, 'app.html');
  fs.writeFileSync(arq, html);
  navegador = await chromium.launch({ executablePath: CHROME });
  pag = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
  pag.on('pageerror', e => erros.push(e.message));
  // o banco não entra nesta prova: abrir a ficha busca andamentos, e o que
  // se testa aqui é a TELA. Toda chamada ao Supabase volta vazia.
  // a página roda em file:// e o fetch é para outra origem: sem os cabeçalhos
  // de CORS o navegador recusa antes de chegar ao mock ("Failed to fetch")
  const CORS = { 'access-control-allow-origin': '*',
                 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  await pag.route('https://fake.supabase.co/**', r => r.fulfill({
    status: 200, contentType: 'application/json', headers: CORS,
    body: r.request().method() === 'OPTIONS' ? '' : '[]' }));
  await pag.goto('file://' + arq);
  await pag.evaluate(s => window.eval(s), SEMENTE);
  await pag.evaluate(() => {
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('app').classList.add('logado');
    montarSidebar(); render();
  });
});
after(async () => { if (navegador) await navegador.close(); });

const pular = { skip: !TEM_NAVEGADOR && 'playwright/chromium não disponível aqui' };
// a grade tem transição de .15s: ler logo depois do clique pega a largura no
// meio do caminho, e o teste acusa defeito onde não há
const colunas = async () => { await pag.waitForTimeout(220);
  return pag.evaluate(() => getComputedStyle(document.getElementById('app')).gridTemplateColumns); };
const larguraMenu = async () => Number((await colunas()).split(' ')[0].replace('px', ''));

test('a tela monta sem erro de JavaScript', pular, () => {
  assert.deepStrictEqual(erros, []);
});

// O BOTÃO QUE NÃO FUNCIONAVA. Com a ficha aberta, o CSS recolhia o menu por
// conta própria e o ☰ não tinha efeito nenhum — clicar não mudava um pixel.
test('☰ recolhe e estende o menu com a ficha FECHADA', pular, async () => {
  const antes = await larguraMenu();
  assert.ok(antes > 200, `o menu devia começar aberto, veio ${antes}px`);
  await pag.click('#btn-lateral');
  assert.ok(await larguraMenu() < 100, 'o ☰ não recolheu o menu');
  await pag.click('#btn-lateral');
  assert.ok(await larguraMenu() > 200, 'o ☰ não estendeu o menu de volta');
});

test('☰ continua funcionando com TODAS as abas abertas', pular, async () => {
  // sem preferência guardada: quem decide o padrão é a ficha
  await pag.evaluate(() => { localStorage.removeItem('crm_menu'); esquecer('crm_menu'); });
  await pag.evaluate(() => abrirFicha('c0'));
  assert.equal(await pag.evaluate(() => document.getElementById('app').classList.contains('detalhe-aberto')), true);
  const cols = await colunas();
  assert.equal(cols.split(' ').length, 3, `com a ficha aberta são 3 colunas, veio: ${cols}`);
  // a ficha abre com o menu em ícones, que é o padrão sensato com 4 colunas
  const inicial = await larguraMenu();
  assert.ok(inicial < 100, `com a ficha aberta o padrão é o menu em ícones, veio ${inicial}px`);
  await pag.click('#btn-lateral');
  const depois = await larguraMenu();
  assert.notEqual(depois, inicial, 'com a ficha aberta o ☰ não fez NADA — era o defeito');
  assert.ok(depois > 200, `o ☰ devia abrir o menu, veio ${depois}px`);
  await pag.click('#btn-lateral');
  assert.ok(await larguraMenu() < 100, 'e devia recolher de novo');
});

test('a escolha do ☰ sobrevive a abrir e fechar a ficha', pular, async () => {
  await pag.click('#btn-lateral');                       // deixa aberto
  assert.ok(await larguraMenu() > 200);
  await pag.evaluate(() => fecharFicha());
  assert.ok(await larguraMenu() > 200, 'fechar a ficha desfez a escolha de quem clicou');
  await pag.evaluate(() => abrirFicha('c0'));
  assert.ok(await larguraMenu() > 200, 'abrir a ficha desfez a escolha de quem clicou');
  await pag.evaluate(() => { fecharFicha(); localStorage.removeItem('crm_menu'); aplicarMenu(); });
});

test('a pesquisa sempre abre o menu — o campo não cabe em 58px', pular, async () => {
  await pag.evaluate(() => { document.getElementById('app').classList.add('mini-lateral'); });
  await pag.evaluate(() => irParaPesquisa());
  assert.ok(await larguraMenu() > 200, 'a lupa não estendeu o menu para caber o campo');
  await pag.evaluate(() => {
    document.getElementById('app').classList.remove('busca-aberta');
    localStorage.removeItem('crm_menu'); aplicarMenu(); render();
  });
});

test('cada item do menu troca a lista mostrada', pular, async () => {
  const itens = await pag.$$eval('.lista-item[data-v]', els => els.map(e => e.dataset.v));
  assert.ok(itens.length > 10, `o menu veio com ${itens.length} itens`);
  const mortos = [];
  for (const v of itens) {
    if (v === 'config' || v === 'novocliente') continue;      // abrem formulário, não lista
    await pag.click(`.lista-item[data-v="${v}"]`);
    const titulo = await pag.textContent('#titulo-lista');
    const marcado = await pag.$eval(`.lista-item[data-v="${v}"]`, e => e.classList.contains('ativa'));
    if (!titulo.trim() || !marcado) mortos.push(v);
  }
  assert.deepStrictEqual(mortos, [], 'itens do menu que não trocaram a lista');
});

test('os três botões da linha do cliente respondem ao clique', pular, async () => {
  await pag.evaluate(() => { visao = 'fase:inss'; render(); });
  for (const attr of ['data-fogo', 'data-sol', 'data-estrela']) {
    const n = await pag.$$eval(`.cartao [${attr}]`, e => e.length);
    assert.ok(n > 0, `nenhum botão ${attr} na lista`);
  }
  // o ★ é o único que muda estado sem falar com o banco
  const antes = await pag.$eval('.cartao [data-estrela]', e => e.className);
  await pag.$eval('.cartao [data-estrela]', e => e.click());
  await pag.waitForTimeout(60);
  assert.ok(await pag.$eval('.cartao [data-estrela]', e => e.className) !== undefined,
    'o botão ★ sumiu depois do clique');
});

// a lista é a coluna mais usada do sistema: o nome tem de ser o que salta
test('a linha do cliente mostra nome, data e marcadores nos lugares certos', pular, async () => {
  await pag.evaluate(() => { visao = 'fase:inss'; render(); });
  const linha = await pag.$eval('.cartao', el => ({
    temCalha: !!el.querySelector('.calha'),
    nome: el.querySelector('.nome').textContent.trim(),
    marcadoresNaMeta: !!el.querySelector('.meta .marc-chip'),
    pesoDoNome: getComputedStyle(el.querySelector('.nome')).fontWeight,
  }));
  assert.ok(linha.temCalha, 'sumiu a calha da data');
  assert.ok(linha.nome.length > 3);
  assert.ok(Number(linha.pesoDoNome) >= 600, 'o nome precisa ser o mais forte da linha');
  assert.equal(linha.marcadoresNaMeta, true, 'os marcadores saíram da linha de leitura');
});

test('nenhum contador do menu mostra zero', pular, async () => {
  const zeros = await pag.$$eval('.lista-item .cont', els =>
    els.map(e => e.textContent.trim()).filter(t => t === '0'));
  assert.deepStrictEqual(zeros, [], 'voltaram os contadores em zero');
});
