// 1.25 · o "atualizar tudo" leva prazos e completar, confere as sessões antes e
// avisa no fim; o CRM abre no 📥 Importar pelo ?ir=patinss do aviso.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const ler = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const src = ler('fundo.js');

test('rodarTudo: coletas, depois prazos, depois completar', () => {
  const f = src.slice(src.indexOf('async function rodarTudo()')).split('\n}')[0];
  const a = f.indexOf('await Promise.all(tarefas)'), p = f.indexOf('rodarPrazos()'), c = f.indexOf('completarPje()');
  assert.ok(a > 0 && p > a && c > p);
});

test('sessaoCaida reconhece o login e deixa passar a página logada', async () => {
  const { sessaoCaida } = await import(pathToFileURL(path.join(__dirname, '..', 'sessao.js')).href);
  assert.ok(sessaoCaida('https://sso.cloud.pje.jus.br/auth/realms/pje/protocol/openid-connect/auth?x'));
  assert.ok(sessaoCaida('https://esaj.tjsp.jus.br/sajcas/login?service=x'));
  assert.ok(sessaoCaida('https://eproc1g.tjsp.jus.br/eproc/', '<input type="password" name="pwdSenha">'));
  assert.ok(!sessaoCaida('https://pje1g.trf3.jus.br/pje/Painel/painel_usuario/advogado.seam', '<div>Painel do advogado</div>'));
});

test('aviso de conclusão: permissão, clique abre o Importar, e o CRM entende o ?ir', () => {
  assert.ok(JSON.parse(ler('manifest.json')).permissions.includes('notifications'));
  assert.match(src, /avisarFim\(titulo, r\)/);
  assert.match(src, /\?ir=patinss/);
  const app = fs.readFileSync(path.join(__dirname, '..', '..', 'app.html'), 'utf8');
  assert.match(app, /get\("ir"\)==="patinss"/);
});

test('o popup confere as sessões antes de rodar tudo', () => {
  assert.match(ler('popup.js'), /tipo: 'sessoes'/);
  assert.match(src, /msg\.tipo !== 'sessoes'/);
});

test('as rodadas longas correm com o pulso que mantém o worker vivo', () => {
  for (const t of ['Atualizar tudo', 'Prazos dos tribunais', 'PJe e eproc', 'Completar processos'])
    assert.match(src, new RegExp(`responderComAviso\\('${t}'`));
  assert.match(src, /const comPulso = async f =>[\s\S]*getPlatformInfo/);
});
