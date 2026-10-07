// DOSSIÊ · nomes de pasta/arquivo, o PDF nos três formatos do INSS, a janela do extrato e o filtro de recursos
const test = require('node:test');
const assert = require('node:assert');
const R = require('../regras.js');

const PDF = Uint8Array.from('%PDF-1.5 corpo', c => c.charCodeAt(0));

test('comoPdf: bytes crus, base64 em JSON, base64 solto; JSON de erro vira null', () => {
  assert.deepEqual(R.comoPdf(PDF), PDF);
  const b64 = Buffer.from(PDF).toString('base64');
  const enc = s => new TextEncoder().encode(s);
  assert.deepEqual([...R.comoPdf(enc(JSON.stringify(b64)))], [...PDF]);   // consolidadorservices/pap
  assert.deepEqual([...R.comoPdf(enc(b64))], [...PDF]);
  assert.equal(R.comoPdf(enc('{"erro":"DEVE_RESOLVER_DESAFIO_CAPTCHA"}')), null);
  assert.equal(R.comoPdf(enc(JSON.stringify(Buffer.from('<html>').toString('base64')))), null);
  assert.equal(R.comoPdf(new Uint8Array()), null);
});

test('b64 ida e volta, inclusive acima do bloco de 32 KB', () => {
  const grande = new Uint8Array(100000).map((_, i) => i % 256);
  assert.deepEqual(Buffer.from(R.b64(grande), 'base64'), Buffer.from(grande));
});

test('nomes: pasta legível no Windows, caminho ASCII no Storage', () => {
  assert.equal(R.pastaCliente('João da Silva', '12345678901'), 'Dossie/João da Silva 12345678901');
  assert.equal(R.nomeSeguro('Carta: NB 123/456?'), 'Carta NB 123 456');
  assert.equal(R.slug('Cartas de concessão'), 'Cartas-de-concessao');
  assert.equal(R.slug('2025-07-02 123 Aposentadoria por Idade.pdf'), '2025-07-02-123-Aposentadoria-por-Idade.pdf');
});

test('jwt: lê sub e nome com acento; lixo vira null', () => {
  const p = Buffer.from(JSON.stringify({ sub: '12345678901', name: 'JOSÉ' })).toString('base64url');
  assert.deepEqual(R.jwt(`x.${p}.y`), { sub: '12345678901', name: 'JOSÉ' });
  assert.equal(R.jwt('não é jwt'), null);
});

test('extrato de pagamento: 12 competências terminando no mês corrente', () => {
  assert.deepEqual(R.janela12Meses(new Date(2026, 9, 7)), ['01-11-2025', '31-10-2026']);
  assert.deepEqual(R.janela12Meses(new Date(2026, 1, 10)), ['01-03-2025', '28-02-2026']);
});

test('recursos: NUP pelo formato; com o CPF na lista, só os do cliente', () => {
  const lista = [{ proc: '44233.123456/2024-11', cpf: '111.111.111-11' },
                 { proc: '44233.654321/2024-22', cpf: '222.222.222-22' }];
  assert.deepEqual(R.nupsDaLista(lista, '22222222222'), { nups: ['44233654321202422'], filtrouPorCpf: true });
  assert.equal(R.nupsDaLista(lista, '99999999999').nups.length, 2);
  assert.equal(R.nupsDaLista(lista, '99999999999').filtrouPorCpf, false);
});

test('mensagemDoPortal: a frase do INSS no lugar do PDF; nada quando não há', () => {
  const enc = s => new TextEncoder().encode(s);
  assert.equal(R.mensagemDoPortal(enc('{"mensagem":"Carta de concessão não encontrada"}')), 'Carta de concessão não encontrada');
  assert.equal(R.mensagemDoPortal(enc('{"result":"Benefício não possui laudo"}')), 'Benefício não possui laudo');
  assert.equal(R.mensagemDoPortal(enc('"JVBERi0="')), '');
  assert.equal(R.mensagemDoPortal(enc('%PDF-1.5')), '');
  assert.equal(R.mensagemDoPortal(enc('{"codigo":1}')), '');
});

test('comoPdf: base64 dentro de objeto e com prefixo data: (Emprega Brasil)', () => {
  const b64 = Buffer.from(PDF).toString('base64');
  const enc = s => new TextEncoder().encode(s);
  assert.deepEqual([...R.comoPdf(enc(JSON.stringify({ nome: 'ctps.pdf', arquivo: b64 })))], [...PDF]);
  assert.deepEqual([...R.comoPdf(enc(JSON.stringify('data:application/pdf;base64,' + b64)))], [...PDF]);
  assert.equal(R.comoPdf(enc('{"mensagem":"Não há registros"}')), null);
});
