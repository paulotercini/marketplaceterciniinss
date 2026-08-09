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
  const dia=n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);
  D.casos[0].prazo = dia(20);                       // lembrete do caso do INSS
  // o MESMO cliente com um caso no Judicial, com prazo bem mais próximo
  D.casos.push({id:'kj',cliente_id:'c0',titulo:N[0],beneficio:'Ação judicial',
    especie:'B42',marcadores:[],fase:'judicial',prazo:dia(2),protocolos:[]});
  D.casoPorId=new Map(D.casos.map(k=>[k.id,k]));
  D.casosDoCliente=new Map();
  D.casos.forEach(k=>{ if(!D.casosDoCliente.has(k.cliente_id)) D.casosDoCliente.set(k.cliente_id,[]);
                       D.casosDoCliente.get(k.cliente_id).push(k); });
  D.atrDoCaso=new Map(D.casos.map(k=>[k.id,['p']]));
  window.DIA = dia;
  D.tarefas=[];D.tarefasPorCaso=new Map();D.pagamentos=[];D.meudia=[];
  D.eventos=[{id:'e1',caso_id:'k1',tipo:'Perícia médica',status:'agendada',
              data_hora:dia(9)+'T09:30:00',local:'APS Franca'}];
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

// nenhuma caixa de diálogo pode sobrar aberta entre um teste e outro: ela
// cobre a tela e o clique seguinte bate nela
const limpar = () => pag.evaluate(() => {
  fecharCaixa(); fecharFicha(false);
  localStorage.removeItem('crm_menu'); esquecer('crm_menu');
  visao = 'fase:inss'; aplicarMenu(); montarSidebar(); render();
});

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
  await limpar();
  const antes = await larguraMenu();
  assert.ok(antes > 200, `o menu devia começar aberto, veio ${antes}px`);
  await pag.click('#btn-lateral');
  assert.ok(await larguraMenu() < 100, 'o ☰ não recolheu o menu');
  await pag.click('#btn-lateral');
  assert.ok(await larguraMenu() > 200, 'o ☰ não estendeu o menu de volta');
});

test('☰ continua funcionando com TODAS as abas abertas', pular, async () => {
  await limpar();
  await pag.evaluate(() => abrirFicha('c2'));
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
  await limpar();
  await pag.evaluate(() => abrirFicha('c2'));
  assert.ok(await larguraMenu() < 100, 'o padrão com a ficha aberta é o menu em ícones');
  await pag.click('#btn-lateral');                       // escolha explícita: aberto
  assert.ok(await larguraMenu() > 200);
  await pag.evaluate(() => fecharFicha());
  assert.ok(await larguraMenu() > 200, 'fechar a ficha desfez a escolha de quem clicou');
  await pag.evaluate(() => abrirFicha('c2'));
  assert.ok(await larguraMenu() > 200, 'abrir a ficha desfez a escolha de quem clicou');
  await limpar();
});

test('a pesquisa sempre abre o menu — o campo não cabe em 58px', pular, async () => {
  await limpar();
  await pag.evaluate(() => { document.getElementById('app').classList.add('mini-lateral'); });
  await pag.evaluate(() => irParaPesquisa());
  assert.ok(await larguraMenu() > 200, 'a lupa não estendeu o menu para caber o campo');
  await pag.evaluate(() => {
    document.getElementById('app').classList.remove('busca-aberta');
    localStorage.removeItem('crm_menu'); aplicarMenu(); render();
  });
});

test('cada item do menu troca a lista mostrada', pular, async () => {
  await limpar();
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

test('nenhum contador do menu mostra zero', pular, async () => {
  const zeros = await pag.$$eval('.lista-item .cont', els =>
    els.map(e => e.textContent.trim()).filter(t => t === '0'));
  assert.deepStrictEqual(zeros, [], 'voltaram os contadores em zero');
});

// ── a coluna dos nomes ────────────────────────────────────────────────────
// Ela responde "de quem eu preciso cuidar, e quando?". Benefício, espécie e
// marcadores são o assunto do caso e vivem na ficha; aqui seriam
// atravessadores entre o olho e o nome.
test('a linha mostra o nome e as datas — e nada de benefício ou marcador', pular, async () => {
  await pag.evaluate(() => { visao = 'fase:inss'; render(); });
  const l = await pag.$eval('.cartao[data-cli="c0"]', el => ({
    temNome: !!el.querySelector('.nome'),
    temMeta: !!el.querySelector('.meta'),
    temMarcador: !!el.querySelector('.marc-chip'),
    temBeneficio: /Aposentadoria|B41/.test(el.textContent),
  }));
  assert.ok(l.temNome);
  assert.equal(l.temMeta, false, 'voltou a segunda linha de texto');
  assert.equal(l.temMarcador, false, 'marcador é assunto de ficha, não de lista');
  assert.equal(l.temBeneficio, false, 'o benefício voltou para a lista');
});

// A REGRA QUE ESTE TESTE EXISTE PARA GUARDAR: quem tem um caso no INSS e
// outro no Judicial, visto na lista do INSS, mostra o lembrete DO INSS. O do
// Judicial não diz nada sobre o trabalho de agora e faria a lista parecer
// atrasada sem estar.
test('a data é a do caso DESTA lista, não a mais próxima do cliente', pular, async () => {
  const dias = n => pag.evaluate(n => DIA(n), n);
  const inss = await dias(20), judicial = await dias(2);
  const ddmm = iso => iso.slice(8, 10) + '.' + iso.slice(5, 7);

  await pag.evaluate(() => { visao = 'fase:inss'; render(); });
  const naInss = await pag.$eval('.cartao[data-cli="c0"] .calha', e => e.textContent.trim());
  assert.ok(naInss.startsWith(ddmm(inss)),
    `na lista do INSS devia aparecer ${ddmm(inss)} (o prazo do caso do INSS), veio "${naInss}"`);
  assert.ok(!naInss.startsWith(ddmm(judicial)),
    'vazou para a lista do INSS o prazo do caso judicial');

  await pag.evaluate(() => { visao = 'fase:judicial'; render(); });
  const naJudicial = await pag.$eval('.cartao[data-cli="c0"] .calha', e => e.textContent.trim());
  assert.ok(naJudicial.startsWith(ddmm(judicial)),
    `na lista Judicial devia aparecer ${ddmm(judicial)}, veio "${naJudicial}"`);
  await pag.evaluate(() => { visao = 'fase:inss'; render(); });
});

test('perícia e audiência aparecem com data e hora', pular, async () => {
  await pag.evaluate(() => { visao = 'fase:inss'; render(); });
  const per = await pag.$eval('.cartao[data-cli="c1"] .chip.per', e => ({
    txt: e.textContent.trim(), dica: e.getAttribute('title') }));
  assert.match(per.txt, /\d{2}\.\d{2}\s+\d{2}:\d{2}/, `veio "${per.txt}"`);
  assert.match(per.dica, /Perícia médica/);
  assert.match(per.dica, /APS Franca/, 'o local só na dica, para não ocupar a linha');
});
