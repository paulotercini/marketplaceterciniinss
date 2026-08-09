// O DEFEITO MAIS SILENCIOSO DE TODOS: mundo errado.
//
// Um script de conteúdo roda, por padrão, num `window` só dele. Compartilha o
// DOM com a página, mas não os objetos. O gancho do coletor do PAT estava no
// `window.fetch` do mundo isolado — existia, não dava erro nenhum, e nunca
// disparava: clicava-se em "Buscar", o portal buscava, e a extensão ficava
// parada. Nenhum console acusa isso; só o silêncio.
//
// Daí estes testes, que são de ESTRUTURA e não de comportamento: o coletor do
// PAT tem de estar declarado no mundo da página, e lá dentro não pode haver
// nada que dependa da extensão.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ler = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const manifesto = JSON.parse(ler('manifest.json'));
const entradas = manifesto.content_scripts;
const daquele = arq => entradas.find(e => e.js.includes(arq));

// tira comentários e textos antes de procurar chamadas: nem a explicação do
// problema nem a frase que o usuário lê ("entregues ao CRM") são o problema
const semComentario = f => ler(f).replace(/^\s*\/\/.*$/gm, '');
const codigo = f => semComentario(f).replace(/`[^`]*`|'[^'\n]*'|"[^"\n]*"/g, "''");

test('o coletor do PAT roda no mundo da página', () => {
  const e = daquele('pat.js');
  assert.ok(e, 'pat.js saiu do manifesto');
  assert.equal(e.world, 'MAIN',
    'o gancho no fetch do portal não enxerga nada fora do mundo da página');
});

test('no mundo da página não há chrome.* nem ponte para o CRM', () => {
  const src = codigo('pat.js');
  assert.ok(!/\bchrome\./.test(src), 'pat.js usa chrome.* — não existe no mundo da página');
  assert.ok(!/\bCRM\./.test(src), 'pat.js chama CRM.* — o objeto vive no outro mundo');
  assert.match(src, /postMessage\(/, 'sem postMessage, o coletado não chega à extensão');
});

test('a ponte e o coletor do e-Recursos ficam no mundo da extensão', () => {
  for (const arq of ['ponte-pat.js', 'crps.js']) {
    const e = daquele(arq);
    assert.ok(e, `${arq} saiu do manifesto`);
    assert.notEqual(e.world, 'MAIN', `${arq} precisa de chrome.* e do CRM`);
    assert.ok(e.js.includes('comum.js'), `${arq} ficou sem a ponte do CRM`);
  }
});

test('o service worker chama cada coletor no mundo em que ele mora', () => {
  const src = semComentario('fundo.js');
  assert.match(src, /world:\s*mundo/, 'executeScript sem escolher o mundo');
  assert.match(src, /'pat'\s*\?\s*'MAIN'\s*:\s*'ISOLATED'/,
    'a escolha do mundo por fonte sumiu — chamar no mundo errado parece "página não abriu"');
});

test('todo arquivo prometido no manifesto existe', () => {
  const prometidos = [manifesto.background.service_worker, manifesto.options_page,
                      manifesto.action.default_popup, ...entradas.flatMap(e => e.js)];
  for (const f of prometidos)
    assert.ok(fs.existsSync(path.join(RAIZ, f)), `o manifesto promete ${f}, que não existe`);
});

test('a faixa está nos dois mundos — cada um tem o seu window', () => {
  for (const e of entradas)
    assert.ok(e.js.includes('tela.js'), `entrada sem tela.js: ${e.js.join(', ')}`);
});
