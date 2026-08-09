// A sonda roda uma vez só, na máquina dele, contra um portal que eu não
// alcanço. Se ela quebrar lá — ou pior, se vazar —, não há segunda chance
// barata. Então ela roda aqui antes, num navegador de verdade, contra um
// portal de mentira que responde como o de verdade respondeu.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let chromium;
try { ({ chromium } = require(path.join(RAIZ, '..', 'robo-crps', 'node_modules', 'playwright'))); }
catch (e) {}
const pular = { skip: !(chromium && fs.existsSync(CHROME)) && 'playwright/chromium indisponível' };

const SONDA = fs.readFileSync(path.join(RAIZ, 'sonda-no-navegador.js'), 'utf8');

// as respostas têm a forma que a sonda v1 trouxe do portal de verdade, com
// dado inventado no lugar do real
const LISTA = {
  tarefas: [{
    protocolo: '1462069078', status: 'Pendente', cpfRequerente: 8575979817,
    nomeServico: 'Aposentadoria por Tempo de Contribuição', siglaServico: 'TBSBAPD',
    nomeRequerente: 'ALMIR TRONFINI', dataCriacao: '2026-07-31T17:36:47',
    nomeUnidade: 'APS FRANCA', dataUltimaAtualizacao: '2026-08-04T16:00:39',
  }],
  quantidadeTotalTarefa: 184, imagemCaptcha: null,
};
const DETALHE = {
  protocolo: '1462069078', situacao: 'CUMPRIMENTO_DE_EXIGENCIA',
  nomeServico: 'Aposentadoria por Tempo de Contribuição', nomeUnidade: 'APS FRANCA',
  requerente: { nome: 'ALMIR TRONFINI', cpf: '085.759.798-17', dataNascimento: '1958-03-04' },
  anexos: [{ nomeArquivo: 'laudo_oncologia.pdf', tamanho: 448122 }],
  agendamentos: [{ situacao: 'REMARCADO', data: '2026-09-15', unidade: 'APS FRANCA' }],
  comentarios: [{ texto: 'segurado relatou dor lombar', autor: 'ANALISTA' }],
};

let navegador, pag, baixado;

before(async () => {
  if (pular.skip) return;
  navegador = await chromium.launch({ executablePath: CHROME });
  pag = await navegador.newPage();
  await pag.route('https://portal.exemplo/**', r => {
    const u = r.request().url();
    const cab = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
    if (u.includes('/consulta')) return r.fulfill({ status: 200, headers: cab, body: JSON.stringify(LISTA) });
    if (/\/tarefa\/\d+/.test(u))  return r.fulfill({ status: 200, headers: cab, body: JSON.stringify(DETALHE) });
    return r.fulfill({ status: 200, headers: cab, body: '<html><body>portal</body></html>',
                       contentType: 'text/html' });
  });
  await pag.goto('https://portal.exemplo/tarefas');
  // intercepta o download para conferir o que teria saído da máquina dele
  await pag.evaluate(() => {
    window.__baixado = null;
    HTMLAnchorElement.prototype.click = function () { window.__baixado = this.href; };
  });
  await pag.evaluate(SONDA);

  // 1) a página consulta a lista, como faria ao clicar em "Buscar"
  await pag.evaluate(() => fetch(
    'https://portal.exemplo/apis/requerimentosPortalApi/requerimento/ec/tarefa/consulta?first=0&pageSize=500',
    { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer abc.def.ghi' },
      body: JSON.stringify({ cpf: '', nome: '', protocolo: '', status: 'PENDENTE',
                             tokenReCAPTCHA: 'x'.repeat(2300) }) }).then(r => r.json()));
  // 2) a página abre UMA tarefa — por XHR, para provar os dois caminhos
  await pag.evaluate(() => new Promise(ok => {
    const x = new XMLHttpRequest();
    x.open('GET', 'https://portal.exemplo/apis/requerimentosPortalApi/requerimento/ec/tarefa/1462069078');
    x.setRequestHeader('Authorization', 'Bearer abc.def.ghi');
    x.onload = ok; x.send();
  }));
  await pag.evaluate(() => window.sondaPat.provar());
  await pag.waitForTimeout(200);
  const href = await pag.evaluate(() => window.__baixado);
  baixado = href ? JSON.parse(await pag.evaluate(h => fetch(h).then(r => r.text()), href)) : null;
});
after(async () => { if (navegador) await navegador.close(); });

test('escuta os dois caminhos: fetch e XMLHttpRequest', pular, () => {
  const rot = baixado.capturas.map(c => c.rotulo);
  assert.ok(rot.includes('lista'), `não capturou a lista: ${rot.join(', ')}`);
  assert.ok(rot.includes('detalhe'), `não capturou o detalhe (XHR): ${rot.join(', ')}`);
});

test('a prova responde a pergunta que sobrou: o script refaz o detalhe?', pular, () => {
  const t = baixado.testes.find(x => /repetido/.test(x.rotulo));
  assert.ok(t, 'a prova não rodou');
  assert.equal(t.deu, true, 'o script não conseguiu refazer o detalhe com o mesmo crachá');
});

test('o crachá vai pelo tipo e pelo tamanho — nunca pelo valor', pular, () => {
  const s = JSON.stringify(baixado);
  assert.ok(!s.includes('abc.def.ghi'), 'VAZOU o token de autorização');
  assert.ok(!/x{100}/.test(s), 'VAZOU o token do reCAPTCHA');
  const lista = baixado.capturas.find(c => c.rotulo === 'lista');
  assert.match(lista.pedido.cabecalhos.authorization, /‹Bearer · \d+ car›/);
  // saber QUE o reCAPTCHA está no corpo é o que explica por que a lista
  // precisa do clique; o valor dele não me serve para nada
  assert.equal(lista.pedido.corpo.temTokenReCAPTCHA, true);
  assert.ok(lista.pedido.corpo.campos.includes('status'));
});

test('nada que identifique alguém sai no arquivo', pular, () => {
  const s = JSON.stringify(baixado);
  for (const vaza of ['ALMIR', 'TRONFINI', '085.759', '08575979817', '8575979817',
                      '1958-03-04', 'laudo_oncologia', 'lombar', '1462069078'])
    assert.ok(!s.includes(vaza), `VAZOU "${vaza}"`);
});

test('o que eu preciso ler chega inteiro', pular, () => {
  const det = baixado.capturas.find(c => c.rotulo === 'detalhe').formato;
  assert.equal(det.situacao, 'CUMPRIMENTO_DE_EXIGENCIA');
  assert.equal(det.nomeUnidade, 'APS FRANCA');
  assert.match(det.nomeServico, /Aposentadoria/);
  assert.equal(det.agendamentos[1].situacao, 'REMARCADO');
  assert.equal(det.agendamentos[1].data, '2026-09-15');
  const lista = baixado.capturas.find(c => c.rotulo === 'lista').formato;
  assert.equal(lista.quantidadeTotalTarefa, 184);
  assert.equal(lista.tarefas[1].siglaServico, 'TBSBAPD');
  assert.equal(lista.tarefas[1].dataUltimaAtualizacao, '2026-08-04T16:00:39');
});

test('o endereço não leva o protocolo junto', pular, () => {
  for (const c of baixado.capturas)
    assert.ok(!/\d{6,}/.test(c.url + c.query), `número longo cru na URL: ${c.url}${c.query}`);
});