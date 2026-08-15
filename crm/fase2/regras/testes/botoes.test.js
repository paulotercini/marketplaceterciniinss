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
  D.and30=[];D.novid=[];D.modelos=[];D.sugestoes=[];D.mencoes=[];D.leads=[];D.docs=[];D.ckls=[];
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

test('os botões da linha do cliente respondem ao clique', pular, async () => {
  await pag.evaluate(() => { visao = 'fase:inss'; render(); });
  for (const attr of ['data-fogo', 'data-estrela']) {
    const n = await pag.$$eval(`.cartao [${attr}]`, e => e.length);
    assert.ok(n > 0, `nenhum botão ${attr} na lista`);
  }
  // clicar tem de ACENDER a estrela. Conferir só que o botão continua lá
  // deixou passar, uma vez, a remoção do próprio ouvinte de clique.
  const aceso = () => pag.$eval('.cartao[data-cli="c1"] [data-estrela]',
    e => e.classList.contains('on'));
  const antes = await aceso();
  await pag.click('.cartao[data-cli="c1"] [data-estrela]');
  await pag.waitForTimeout(120);
  assert.equal(await aceso(), !antes, 'o clique no ★ não mudou o estado do botão');
  await pag.click('.cartao[data-cli="c1"] [data-estrela]');   // devolve como estava
  await pag.waitForTimeout(120);
  assert.equal(await aceso(), antes, 'o segundo clique no ★ não desligou');
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
    // como no To Do: a data mora numa segunda linha, embaixo do nome
    dataAbaixoDoNome: !!el.querySelector('.info .nome + .meta .dt'),
    temMarcador: !!el.querySelector('.marc-chip'),
    temBeneficio: /Aposentadoria|B41/.test(el.textContent),
  }));
  assert.ok(l.temNome);
  assert.ok(l.dataAbaixoDoNome, 'a data precisa ficar embaixo do nome, como no To Do');
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
  const ddmm = iso => iso.slice(8, 10) + '.' + iso.slice(5, 7);   // como a etiqueta escreve

  await pag.evaluate(() => { visao = 'fase:inss'; render(); });
  const naInss = await pag.$eval('.cartao[data-cli="c0"] .meta .dt', e => e.textContent.trim());
  assert.ok(naInss.includes(ddmm(inss)),
    `na lista do INSS devia aparecer ${ddmm(inss)} (o prazo do caso do INSS), veio "${naInss}"`);
  assert.ok(!naInss.includes(ddmm(judicial)),
    'vazou para a lista do INSS o prazo do caso judicial');

  await pag.evaluate(() => { visao = 'fase:judicial'; render(); });
  const naJudicial = await pag.$eval('.cartao[data-cli="c0"] .meta .dt', e => e.textContent.trim());
  assert.ok(naJudicial.includes(ddmm(judicial)),
    `na lista Judicial devia aparecer ${ddmm(judicial)}, veio "${naJudicial}"`);
  await pag.evaluate(() => { visao = 'fase:inss'; render(); });
});

test('perícia e audiência aparecem com data e hora', pular, async () => {
  await pag.evaluate(() => { visao = 'fase:inss'; render(); });
  const per = await pag.$eval('.cartao[data-cli="c1"] .dt.ev', e => ({
    txt: e.textContent.trim(), dica: e.getAttribute('title') }));
  assert.match(per.txt, /\d{2}\.\d{2}\s+\d{2}:\d{2}/, `veio "${per.txt}"`);
  assert.match(per.dica, /Perícia médica/);
  assert.match(per.dica, /APS Franca/, 'o local só na dica, para não ocupar a linha');
});

// o To Do escreve "Hoje" e "Amanhã" por extenso, e o resto com o dia da
// semana na frente. maisDias() do app pula para o próximo dia ÚTIL — usá-la
// aqui faria a sexta-feira dizer que amanhã é segunda.
test('a data é escrita como no To Do', pular, async () => {
  const r = await pag.evaluate(() => {
    const d = n => { const x = new Date(hoje() + 'T12:00:00'); x.setDate(x.getDate() + n);
                     return x.toLocaleDateString('sv'); };
    return { hoje: dataRelativa(hoje()), amanha: dataRelativa(d(1)),
             ontem: dataRelativa(d(-1)), longe: dataRelativa('2026-08-07'), vazio: dataRelativa(null) };
  });
  assert.equal(r.hoje, 'Hoje');
  assert.equal(r.amanha, 'Amanhã');
  assert.equal(r.ontem, 'Ontem');
  assert.equal(r.longe, 'sex, 07.08');
  assert.equal(r.vazio, '');
});

// O COMPASSO DA LISTA. Qual densidade se escolhe é gosto; que todas as linhas
// tenham a MESMA altura não é. Quando a linha crescia com data e encolhia sem
// ela, a distância entre um nome e o seguinte mudava a cada linha e o olho
// perdia o passo — era o defeito que mais cansava em uso de dia inteiro.
test('todas as linhas têm a mesma altura, com ou sem data', pular, async () => {
  await limpar();
  const alturas = await pag.$$eval('.cartao', els =>
    els.map(e => Math.round(e.getBoundingClientRect().height)));
  assert.ok(alturas.length >= 3, `só vieram ${alturas.length} linhas`);
  const unicas = [...new Set(alturas)];
  assert.equal(unicas.length, 1, `linhas com alturas diferentes: ${unicas.join(', ')}px`);
  // e o alvo do clique tem de caber um dedo, não só um ponteiro
  assert.ok(unicas[0] >= 44, `linha de ${unicas[0]}px é baixa demais para clicar`);
});

test('o nome de todos os clientes começa na mesma coluna', pular, async () => {
  const xs = await pag.$$eval('.cartao .nome', els =>
    els.map(e => Math.round(e.getBoundingClientRect().left)));
  assert.equal([...new Set(xs)].length, 1, `nomes desalinhados: ${[...new Set(xs)].join(', ')}px`);
});

// Botão que só aparece no hover não existe para quem não sabe que ele está
// lá — e some de vez para quem usa teclado ou toque. O ⭐ e o 🔥 são de uso
// diário: ficam sempre na tela, apagados quando desligados.
test('⭐ e 🔥 ficam visíveis sem precisar do mouse em cima', pular, async () => {
  await limpar();
  const vis = await pag.$$eval('.cartao[data-cli="c0"] .acao-card', els =>
    els.map(e => ({ cls: e.className, op: Number(getComputedStyle(e).opacity) })));
  assert.ok(vis.length, 'a linha ficou sem botão de ação');
  for (const b of vis) assert.ok(b.op > 0.15, `${b.cls} está invisível (opacidade ${b.op})`);
});

// O ☀️ saiu da linha, mas o Meu Dia não pode ter sumido junto: a ação mudou
// de lugar, para o menu do botão direito.
test('o ☀️ saiu da linha e vive no menu do botão direito', pular, async () => {
  assert.equal(await pag.$$eval('.cartao [data-sol]', e => e.length), 0,
    'o botão ☀️ continua na linha');
  await pag.click('.cartao[data-cli="c0"]', { button: 'right' });
  const item = await pag.$eval('#menu-mover [data-dia]', e => e.textContent.trim());
  assert.match(item, /Meu Dia/);
  await pag.keyboard.press('Escape');
  await pag.evaluate(() => fecharMenuMover());
});

// ── o trilho de ícones (menu recolhido) ───────────────────────────────────
// Recolhido, o ícone é a única palavra que sobra. A 14px sobre fundo escuro
// ele vira borrão: dá para ver que há algo ali, não O QUE é.
const recolher = () => pag.evaluate(() => {
  fecharCaixa(); fecharFicha(false);
  guardar('crm_menu', 'mini'); aplicarMenu(); montarSidebar(); render();
});
const estender = () => pag.evaluate(() => {
  guardar('crm_menu', 'cheio'); aplicarMenu(); montarSidebar(); render();
});

test('recolhido, o ícone do menu é bem maior que aberto', pular, async () => {
  await estender();
  const aberto = await pag.$eval('.lista-item .ic', e => parseFloat(getComputedStyle(e).fontSize));
  await recolher();
  const mini = await pag.$eval('.lista-item .ic', e => parseFloat(getComputedStyle(e).fontSize));
  assert.ok(mini >= 20, `o ícone do menu recolhido está pequeno demais: ${mini}px`);
  assert.ok(mini > aberto + 4, `recolhido (${mini}px) mal cresceu perto de aberto (${aberto}px)`);
});

// Esconder o contador transformava o trilho em enfeite: saber que o INSS tem
// 12 é metade do motivo de olhar o menu.
test('recolhido, o contador continua na tela', pular, async () => {
  await recolher();
  const conts = await pag.$$eval('.lista-item .cont', els => els
    .filter(e => getComputedStyle(e).display !== 'none')
    .map(e => e.textContent.trim()));
  assert.ok(conts.length >= 2, `sumiram os contadores do menu recolhido: ${conts.length} visíveis`);
  assert.ok(conts.every(t => /^\d+$/.test(t)), `contador com conteúdo estranho: ${conts.join('|')}`);
});

// O nome tem de aparecer NA ALTURA do ícone — inclusive com a barra rolada,
// que é onde a versão só-CSS errava por centenas de pixels.
test('recolhido, o nome aparece ao lado do ícone — mesmo com a barra rolada', pular, async () => {
  await recolher();
  const medir = async sel => {
    await pag.hover(sel);
    await pag.waitForTimeout(80);
    return pag.evaluate(s => {
      const it = document.querySelector(s), b = document.getElementById('balao-menu');
      if (!b || getComputedStyle(b).display === 'none') return null;
      const a = it.getBoundingClientRect(), c = b.getBoundingClientRect();
      return { desvio: Math.abs((a.top + a.height / 2) - (c.top + c.height / 2)),
               daDireita: c.left > a.right, texto: b.textContent };
    }, sel);
  };
  const topo = await medir('.lista-item[data-v="importante"]');
  assert.ok(topo, 'nenhuma etiqueta apareceu ao passar o mouse');
  assert.ok(topo.desvio <= 2, `etiqueta fora da altura do ícone: ${topo.desvio}px`);
  assert.ok(topo.daDireita, 'a etiqueta saiu por cima do trilho');
  assert.match(topo.texto, /Importante/);
  await pag.evaluate(() => document.querySelector('.sidebar').scrollTop = 9999);
  const fim = await medir('.lista-item[data-v="config"]');
  assert.ok(fim, 'com a barra rolada a etiqueta não apareceu');
  assert.ok(fim.desvio <= 2, `com a barra rolada a etiqueta errou a altura em ${fim.desvio}px`);
  assert.match(fim.texto, /Configura/);
});

// São 26 destinos: o trilho não cabe na tela e rola. Abrir uma lista do fim
// não pode deixar o menu mostrando um trecho onde nada está aceso.
test('recolhido, a lista aberta fica à vista no trilho', pular, async () => {
  await recolher();
  await pag.evaluate(() => { visao = 'config'; montarSidebar(); render(); });
  await pag.waitForTimeout(80);
  const v = await pag.evaluate(() => {
    const it = document.querySelector('.lista-item.ativa');
    if (!it) return null;
    const a = it.getBoundingClientRect(), s = document.querySelector('.sidebar').getBoundingClientRect();
    return { dentro: a.top >= s.top - 1 && a.bottom <= s.bottom + 1, v: it.dataset.v };
  });
  assert.ok(v, 'nenhum item ficou marcado como ativo');
  assert.equal(v.v, 'config');
  assert.ok(v.dentro, 'a lista aberta ficou fora da parte visível do trilho');
  await estender();
  await limpar();
});

// Emoji não têm a mesma largura. Sem uma célula de largura fixa para o ícone,
// cada rótulo do menu aberto começava numa coluna diferente.
test('aberto, todos os rótulos começam na mesma coluna', pular, async () => {
  await estender();
  const xs = await pag.$$eval('.lista-item .txt', els =>
    els.map(e => Math.round(e.getBoundingClientRect().left)));
  assert.ok(xs.length > 5, 'o menu veio quase vazio');
  assert.equal([...new Set(xs)].length, 1, `rótulos desalinhados: ${[...new Set(xs)].join(', ')}px`);
  await limpar();
});

// ── os três níveis da ficha ───────────────────────────────────────────────
// A placa dos fatos (espécie, NB, DER…) é para LER; o compositor é para
// ESCREVER. O cinza separa os dois — mas cinza nenhum pode encostar no da
// faixa zebrada da linha do tempo: dois cinzas quase iguais leem-se como
// engano, não como hierarquia.
test('a placa é cinza, o compositor é branco e nenhum imita a linha do tempo', pular, async () => {
  await limpar();
  await pag.evaluate(() => abrirFicha('c2'));
  await pag.waitForTimeout(200);
  const lum = c => { const [r, g, b] = c.match(/\d+/g).map(Number); return 0.299*r + 0.587*g + 0.114*b; };
  const cores = await pag.evaluate(() => ({
    placa: getComputedStyle(document.querySelector('.fatos')).backgroundColor,
    escrever: getComputedStyle(document.querySelector('.escrever')).backgroundColor,
    zebra: '#F5F6F8',
  }));
  assert.ok(lum(cores.escrever) > 250, `o compositor deixou de ser branco: ${cores.escrever}`);
  assert.ok(lum(cores.placa) < lum(cores.escrever) - 5,
    `a placa não está mais escura que o compositor: ${cores.placa} vs ${cores.escrever}`);
  assert.ok(Math.abs(lum(cores.placa) - lum('rgb(245,246,248)')) > 4,
    `a placa (${cores.placa}) ficou colada no cinza da linha do tempo`);
  await pag.evaluate(() => fecharFicha(false));
  await limpar();
});

// ── as sugestões do compositor: marcar várias ─────────────────────────────
// A mesma regra do encaminhamento vale aqui, que é onde nascem as tarefas:
// "documentos recebidos" E "aguardar até" é um andamento só, com dois itens.
// Antes a segunda frase apagava a primeira.
test('no compositor dá para marcar mais de uma frase', pular, async () => {
  await limpar();
  await pag.evaluate(() => abrirFicha('c2'));
  await pag.waitForTimeout(220);
  await pag.click('#sug-abrir');
  await pag.waitForTimeout(150);
  const sem = await pag.$$eval('.sug-it',
    e => e.map((x, i) => [i, x.textContent]).filter(([, t]) => !t.includes('__')).map(([i]) => i));
  const chip = i => `.sug-it:nth-of-type(${i + 1})`;
  await pag.click(chip(sem[0]));
  await pag.waitForTimeout(120);
  await pag.click(chip(sem[1]));
  await pag.waitForTimeout(120);
  const duas = await pag.$eval('#and-texto', e => e.value);
  assert.equal(duas.split('\n').length, 2, `a segunda frase apagou a primeira: ${JSON.stringify(duas)}`);
  assert.ok(duas.split('\n').every(l => l.startsWith('• ')), `sem marcador: ${duas}`);
  assert.equal(await pag.$$eval('.sug-it.on', e => e.length), 2,
    'as frases escolhidas não ficaram acesas');
  // e a lista não pode encolher depois do primeiro clique — era o que
  // acontecia quando o texto do campo virava busca
  assert.ok(await pag.$$eval('.sug-it', e => e.length) > 5, 'a lista de frases sumiu');
  await pag.click(chip(sem[0]));
  await pag.waitForTimeout(120);
  const uma = await pag.$eval('#and-texto', e => e.value);
  assert.equal(uma.split('\n').length, 1, `desmarcar não tirou a linha: ${uma}`);
  assert.ok(!uma.startsWith('• '), 'sobrou marcador com um item só');
});

// digitar e escolher continua sendo COMPLETAR aquela linha, não somar outra:
// senão sobrava o pedaço digitado junto da frase inteira
test('escolher enquanto digita completa a linha em vez de somar', pular, async () => {
  await pag.evaluate(() => { document.getElementById('and-texto').value = ''; });
  await pag.click('#sug-abrir');                       // fecha o painel
  await pag.fill('#and-texto', 'protocol');
  await pag.waitForTimeout(180);
  await pag.click('.sug-it');
  await pag.waitForTimeout(150);
  const t = await pag.$eval('#and-texto', e => e.value);
  assert.equal(t.split('\n').length, 1, `virou duas linhas: ${JSON.stringify(t)}`);
  assert.ok(/protocolad/i.test(t) && t !== 'protocol', `não completou a frase: ${t}`);
  await pag.evaluate(() => { document.getElementById('and-texto').value = ''; fecharFicha(false); });
  await limpar();
});

// ── os marcadores do pedido (Rural, Especial, Deficiência…) ────────────────
// Este bloco existe por um botão que não fazia nada: o `await` do PATCH não
// tinha rede, e quando o banco recusava a função morria ali — sem aviso, sem
// redesenho. Clicar não mudava um pixel.
const abrirCaso = async (cli = 'c2') => {
  await limpar();
  await pag.evaluate(c => abrirFicha(c), cli);
  await pag.waitForTimeout(220);
};

test('clicar num marcador acende o botão', pular, async () => {
  await abrirCaso();
  const marc = `.marc[onclick*="'especial')"]`;   // 'especial', não 'pcd' nem 'rural'
  assert.equal(await pag.$$eval(marc, e => e.length), 1, 'o marcador Especial não está na ficha');
  assert.equal(await pag.$eval(marc, e => e.classList.contains('on')), false);
  await pag.click(marc);
  await pag.waitForTimeout(260);
  assert.equal(await pag.$eval(marc, e => e.classList.contains('on')), true,
    'o clique no marcador não acendeu o botão');
  await pag.click(marc);
  await pag.waitForTimeout(260);
  assert.equal(await pag.$eval(marc, e => e.classList.contains('on')), false,
    'o segundo clique não desmarcou');
});

// O caso real: enquanto a coluna `marcadores` não existir no Supabase, o
// PATCH volta 400. O botão não pode ficar aceso mentindo, e o motivo tem de
// aparecer na tela.
test('marcador que o banco recusa não fica aceso — e diz o porquê', pular, async () => {
  await abrirCaso();
  await pag.route('**/rest/v1/casos?id=eq.*', r => r.request().method() === 'PATCH'
    ? r.fulfill({ status: 400, contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*',
                   'access-control-allow-methods': '*' },
        body: '{"code":"42703","message":"column casos.marcadores does not exist"}' })
    : r.fallback());
  const marc = `.marc[onclick*="'rural')"]`;      // exato: 'idade_rural' também contém "rural"
  await pag.click(marc);
  await pag.waitForTimeout(320);
  assert.equal(await pag.$eval(marc, e => e.classList.contains('on')), false,
    'o marcador ficou aceso mesmo o banco tendo recusado');
  const msg = await pag.$eval('#aviso', e => e.textContent);
  assert.match(msg, /schema\.sql|coluna/i, `o erro não foi explicado: "${msg}"`);
  await pag.unroute('**/rest/v1/casos?id=eq.*');
});

// Quem manda nos marcadores é a espécie. Sem ela, apareciam os seis — e
// "União estável" numa ficha de aposentadoria não explica nada a ninguém.
test('sem espécie, não há botão de marcador — há o convite de preenchê-la', pular, async () => {
  await limpar();
  await pag.evaluate(() => { D.casoPorId.get('k2').especie = ''; abrirFicha('c2'); });
  await pag.waitForTimeout(220);
  assert.equal(await pag.$$eval('.marc', e => e.length), 0,
    'sem espécie ainda aparecem marcadores');
  const linha = await pag.$eval('.marc-linha', e => e.textContent);
  assert.match(linha, /esp[ée]cie/i, 'a linha não diz o que fazer');
  await pag.evaluate(() => { D.casoPorId.get('k2').especie = 'B41'; fecharFicha(false); });
  await limpar();
});

// O rótulo PEDIDO saiu: os próprios botões dizem o que são.
test('a linha do pedido não tem mais o rótulo PEDIDO', pular, async () => {
  await abrirCaso();
  assert.equal(await pag.$$eval('.marc-rot', e => e.length), 0, 'o rótulo PEDIDO voltou');
  await pag.evaluate(() => fecharFicha(false));
  await limpar();
});

// ── Meu Dia só do dia, e o acervo com casa própria ────────────────────────
// "Esse meu dia é destinado somente às tarefas que estão vencendo hoje."
// Revisão do acervo e "sem próxima ação" são FILA, não agenda: nunca acabam,
// e empurravam para baixo justamente o que vence.
test('Meu Dia não mostra mais a fila do acervo', pular, async () => {
  await limpar();
  await pag.evaluate(() => {
    // um caso parado há muito e sem nenhuma próxima ação: entraria nos dois
    D.casos.push({ id: 'kv', cliente_id: 'c1', titulo: 'Velho', fase: 'inss',
                   protocolos: [], revisado_em: '2020-01-01' });
    D.casoPorId.set('kv', D.casos[D.casos.length - 1]);
    D.casosDoCliente.get('c1').push(D.casos[D.casos.length - 1]);
    visao = 'meudia'; montarSidebar(); render();
  });
  const txt = await pag.$eval('#conteudo-meio', e => e.textContent);
  assert.ok(!/Revisão do acervo/i.test(txt), 'a revisão do acervo voltou para o Meu Dia');
  assert.ok(!/Sem próxima ação/i.test(txt), '"sem próxima ação" voltou para o Meu Dia');
  assert.match(txt, /Adicionados ao dia/, 'o Meu Dia perdeu o que é dele');
});

test('a fila do acervo tem lista própria, com o número na lateral', pular, async () => {
  const item = await pag.$('.lista-item[data-v="acervo"]');
  assert.ok(item, 'não há item 🧹 Cuidar do acervo na barra lateral');
  await pag.evaluate(() => { visao = 'acervo'; render(); });
  await pag.waitForTimeout(120);
  const txt = await pag.$eval('#conteudo-meio', e => e.textContent);
  assert.ok(/Revisão do acervo|Sem próxima ação|Acervo em dia/i.test(txt),
    `a lista do acervo veio vazia: "${txt.slice(0, 120)}"`);
  assert.match(await pag.$eval('#sub-lista', e => e.textContent), /Nada aqui vence hoje/);
  await limpar();
});

// ── o filtro de exigência ─────────────────────────────────────────────────
// Duas fontes: a exigência anotada à mão (com prazo) e a que o PAT devolve
// em situacao_inss. Olhar só a primeira deixava de fora justamente as
// recém-descobertas pela importação — as que ninguém viu ainda.
test('a lista INSS filtra por exigência, das duas fontes', pular, async () => {
  await limpar();
  await pag.evaluate(() => {
    D.casos[0].exigencia_prazo = '2026-09-30';              // anotada à mão
    D.casos[1].situacao_inss = 'Em exigência';              // veio do PAT
    visao = 'fase:inss'; render();
  });
  await pag.waitForTimeout(120);
  const chip = await pag.$('#chip-exig');
  assert.ok(chip, 'não há filtro de exigência na lista do INSS');
  assert.match(await pag.$eval('#chip-exig', e => e.textContent), /\(2\)/,
    'o filtro tem de contar as duas fontes de exigência');
  const antes = await pag.$$eval('.cartao[data-cli]', e => e.length);
  await pag.click('#chip-exig');
  await pag.waitForTimeout(150);
  const depois = await pag.$$eval('.cartao[data-cli]', e => e.length);
  assert.ok(depois < antes, `o filtro não escondeu ninguém (${antes} → ${depois})`);
  assert.ok(!/Demais requerimentos/.test(await pag.$eval('#conteudo-meio', e => e.textContent)),
    'ligado o filtro, o resto da lista tem de sumir');
  await pag.click('#chip-exig');
  await pag.waitForTimeout(150);
  assert.equal(await pag.$$eval('.cartao[data-cli]', e => e.length), antes, 'o filtro não desligou');
  await pag.evaluate(() => { delete D.casos[0].exigencia_prazo; delete D.casos[1].situacao_inss; });
  await limpar();
});

// ── 📣 Novidades: a caixa de entrada do que os portais trouxeram ──────────
// "Quero ter conhecimento de todos os andamentos diários." Antes disso era
// caçar ficha por ficha o que tinha mudado.
test('Novidades mostra o que veio dos portais, agrupado por dia', pular, async () => {
  await limpar();
  await pag.evaluate(() => {
    D.novid = [
      { id: 'n1', caso_id: 'k1', origem: 'pat', criado_em: '2026-08-09T10:00:00',
        texto: 'INSS · Apresentar PPP da empresa X', andamentos_lidos: [] },
      { id: 'n2', caso_id: 'k1', origem: 'crps', criado_em: '2026-08-08T10:00:00',
        texto: 'Recurso distribuído à 12ª Junta', andamentos_lidos: [] },
      { id: 'n3', caso_id: 'k2', origem: 'pat', criado_em: '2026-08-08T09:00:00',
        texto: 'INSS · Exigência cumprida', andamentos_lidos: [{ colaborador_id: 'p' }] },
    ];
    visao = 'novidades'; montarSidebar(); render();
  });
  await pag.waitForTimeout(120);
  const txt = await pag.$eval('#conteudo-meio', e => e.textContent);
  assert.match(txt, /Apresentar PPP/, 'o comentário do INSS não apareceu');
  assert.match(txt, /12ª Junta/, 'a movimentação do recurso não apareceu');
  assert.ok(!/Exigência cumprida/.test(txt), 'o que eu já li continua aparecendo');
  assert.equal(await pag.$$eval('.nov', e => e.length), 2);
  assert.equal(await pag.$$eval('.secao', e => e.length), 2, 'devia agrupar por dia');
  // o contador da barra lateral conta o mesmo
  assert.match(await pag.$eval('.lista-item[data-v="novidades"] .cont', e => e.textContent), /^2$/);
});

// Marcar como lido tira da caixa de entrada, NÃO da ficha do cliente.
test('marcar como lido esvazia a caixa sem apagar nada', pular, async () => {
  await pag.evaluate(() => { marcarLidas(['n1', 'n2']); });
  await pag.waitForTimeout(200);
  assert.equal(await pag.$$eval('.nov', e => e.length), 0);
  assert.match(await pag.$eval('#conteudo-meio', e => e.textContent), /Caixa vazia/);
  // os andamentos continuam onde estavam — só ganharam a marca de lido
  assert.equal(await pag.evaluate(() => D.novid.length), 3, 'apagou andamento do CRM');
  await pag.evaluate(() => { D.novid = []; visao = 'fase:inss'; });
  await limpar();
});

// ── encaminhar da caixa de entrada ────────────────────────────────────────
// Ler a novidade é metade; a outra metade é dizer a alguém o que fazer com
// ela — e isso significava abrir a ficha e escrever tudo de novo.
test('cada novidade pode ser encaminhada com anotação, dono e prazo', pular, async () => {
  await limpar();
  await pag.evaluate(() => {
    D.novid = [{ id: 'n9', caso_id: 'k1', origem: 'pat', criado_em: '2026-08-09T10:00:00',
                 texto: 'INSS · Apresentar PPP da empresa X', andamentos_lidos: [] }];
    visao = 'novidades'; montarSidebar(); render();
  });
  await pag.click('[data-encaminhar="n9"]');
  await pag.waitForTimeout(120);
  assert.ok(await pag.$('.enc[data-enc="n9"]'), 'a caixa de encaminhar não abriu');
  // as sugestões seguem o texto: exigência pede documento
  const sug = await pag.$$eval('.enc-sug .btn-rap', e => e.map(x => x.textContent));
  assert.ok(sug.some(s => /documento/i.test(s)), `sugestões fora de contexto: ${sug.join(' | ')}`);
  // sem dono e sem texto não vai — as mesmas travas do compositor
  await pag.click('[data-enviar="n9"]');
  await pag.waitForTimeout(120);
  assert.match(await pag.$eval('#aviso', e => e.textContent), /para quem/i);
  await pag.click('.enc .enc-quem');
  await pag.click('[data-enviar="n9"]');
  await pag.waitForTimeout(120);
  assert.match(await pag.$eval('#aviso', e => e.textContent), /o que precisa/i);
});

// um andamento costuma pedir duas coisas de uma vez: buscar o documento E
// avisar o cliente. Marcar a segunda não pode apagar a primeira nem emendar
// as duas numa frase só.
test('dá para marcar mais de uma sugestão, e desmarcar', pular, async () => {
  const sugs = await pag.$$('.enc-sug .btn-rap');
  await sugs[0].click();
  await sugs[1].click();
  await pag.waitForTimeout(80);
  const duas = await pag.$eval('.enc .enc-txt', e => e.value);
  assert.equal(duas.split('\n').length, 2, `não virou lista: ${JSON.stringify(duas)}`);
  assert.ok(duas.split('\n').every(l => l.startsWith('• ')), `sem marcador: ${duas}`);
  assert.equal(await pag.$$eval('.enc-sug .btn-rap.on', e => e.length), 2,
    'os botões marcados não ficaram acesos');
  // clicar de novo tira aquela linha e deixa a outra intacta
  await sugs[0].click();
  await pag.waitForTimeout(80);
  const uma = await pag.$eval('.enc .enc-txt', e => e.value);
  assert.equal(uma.split('\n').length, 1, `desmarcar não tirou a linha: ${uma}`);
  assert.ok(!uma.startsWith('• '), 'sobrou marcador num pedido só');
  assert.equal(await pag.$$eval('.enc-sug .btn-rap.on', e => e.length), 1);
});

test('a caixa fecha e a novidade sai da lista ao encaminhar', pular, async () => {
  await pag.evaluate(() => {
    document.querySelector('.enc .enc-txt').value = 'Amanda, pedir o PPP ao cliente';
    document.querySelector('.enc .enc-txt').dispatchEvent(new Event('input'));
  });
  await pag.click('[data-enviar="n9"]');
  await pag.waitForTimeout(300);
  assert.equal(await pag.$$eval('.enc', e => e.length), 0,
    'a caixa continuou aberta');
  assert.equal(await pag.$$eval('.nov', e => e.length), 0,
    'encaminhou é porque leu: devia ter saído da caixa de entrada');
  await pag.evaluate(() => { D.novid = []; });
  await limpar();
});

// ⭐ Importante é onde ele passa o dia: pôr ali o que os portais trouxeram
// encurta o caminho entre a mudança acontecer e alguém saber dela.
test('as novidades aparecem no topo do ⭐ Importante', pular, async () => {
  await pag.evaluate(() => {
    D.novid = [{ id: 'n1', caso_id: 'k1', origem: 'pat', criado_em: '2026-08-09T10:00:00',
                 texto: 'INSS · Exigência aberta', andamentos_lidos: [] }];
    D.casos[0].importante = true;
    visao = 'importante'; montarSidebar(); render();
  });
  await pag.waitForTimeout(120);
  const txt = await pag.$eval('#conteudo-meio', e => e.textContent);
  assert.match(txt, /Novidades dos portais \(1\)/, 'o bloco não apareceu no Importante');
  assert.match(txt, /Exigência aberta/);
  assert.ok(await pag.$('[data-encaminhar="n1"]'), 'sem encaminhar no topo do Importante');
  await pag.evaluate(() => { D.novid = []; D.casos[0].importante = false; });
  await limpar();
});
