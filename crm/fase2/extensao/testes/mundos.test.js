// OS DEFEITOS MAIS SILENCIOSOS DE TODOS: os que impedem o código de rodar.
//
// Dois já aconteceram, um em seguida do outro:
//
// 1. Mundo errado. Um script de extensão roda num `window` só dele. O gancho
//    no fetch do portal estava lá — existia, não dava erro, e nunca disparava.
// 2. Manifesto recusado. A correção do primeiro pedia `"world": "MAIN"`, chave
//    que um Chrome mais antigo não conhece — e um manifesto com chave inválida
//    é recusado INTEIRO. A extensão deixou de carregar, sem uma linha no
//    console dizendo por quê.
//
// Nenhum dos dois aparece em teste de comportamento, então estes são de
// estrutura: o coletor é injetado na página pela ponte, e o manifesto usa só
// chaves antigas.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ler = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const manifesto = JSON.parse(ler('manifest.json'));
const entradas = manifesto.content_scripts;
const daquele = arq => entradas.find(e => e.js.includes(arq));

const semComentario = f => ler(f).replace(/^\s*\/\/.*$/gm, '');
const codigo = f => semComentario(f).replace(/`[^`]*`|'[^'\n]*'|"[^"\n]*"/g, "''");

test('o manifesto não usa chave que um Chrome antigo recuse', () => {
  const bruto = ler('manifest.json');
  assert.ok(!/"world"/.test(bruto),
    'voltou o "world" no manifesto — Chrome sem essa chave recusa o arquivo inteiro '
    + 'e a extensão nem carrega');
});

test('o coletor do PAT não é declarado: é injetado na página', () => {
  assert.equal(daquele('pat-pagina.js'), undefined,
    'o coletor tem de ficar fora do manifesto — dentro dele, roda no mundo errado');
  assert.match(codigo('ponte-pat.js'), /getURL\(/, 'a ponte deixou de injetar o coletor');
  const livres = (manifesto.web_accessible_resources || []).flatMap(r => r.resources);
  assert.ok(livres.includes('pat-pagina.js'),
    'sem web_accessible_resources, a página não tem permissão de carregar o coletor');
});

test('dentro da página não há chrome.* nem ponte para o CRM', () => {
  const src = codigo('pat-pagina.js');
  assert.ok(!/\bchrome\./.test(src), 'pat-pagina.js usa chrome.* — não existe dentro da página');
  assert.ok(!/\bCRM\./.test(src), 'pat-pagina.js chama CRM.* — o objeto vive no outro lado');
  assert.match(src, /postMessage\(/, 'sem postMessage, o coletado não chega à extensão');
});

test('a ponte se anuncia, e cobra o coletor se ele não subir', () => {
  const src = semComentario('ponte-pat.js');
  assert.match(src, /\[CRM\]/, 'sem a linha no console, "não carregou" vira mais um silêncio');
  assert.match(src, /coletorNoAr/, 'ninguém confere se o coletor chegou a subir');
});

test('todo arquivo prometido no manifesto existe', () => {
  const prometidos = [manifesto.background.service_worker, manifesto.options_page,
                      manifesto.action.default_popup, ...entradas.flatMap(e => e.js),
                      ...(manifesto.web_accessible_resources || []).flatMap(r => r.resources)];
  for (const f of prometidos)
    assert.ok(fs.existsSync(path.join(RAIZ, f)), `o manifesto promete ${f}, que não existe`);
});

test('a faixa e a ponte do CRM estão em toda entrada', () => {
  for (const e of entradas) {
    assert.ok(e.js.includes('tela.js'), `entrada sem tela.js: ${e.js.join(', ')}`);
    assert.ok(e.js.includes('comum.js'), `entrada sem comum.js: ${e.js.join(', ')}`);
    assert.equal(e.all_frames, true,
      'o portal virou micro-frontend: sem all_frames, um quadro interno fica de fora');
  }
});

test('o service worker chama a página em todos os quadros', () => {
  const src = semComentario('fundo.js');
  assert.match(src, /allFrames:\s*true/, 'só o quadro de cima seria consultado');
  assert.ok(!/world:/.test(src), 'executeScript voltou a pedir mundo — não é mais preciso');
});
