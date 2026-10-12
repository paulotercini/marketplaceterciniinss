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

test('HC: exame de imagem/método entra, exame de sangue fica de fora', () => {
  for (const n of ['RADIOGRAFIA SIMPLES - TORAX', 'ULTRA-SONOGRAFIA - JOELHO DIREITO', 'TOMOGRAFIA COMPUTADORIZADA DE CRANIO',
                   'RESSONÂNCIA MAGNÉTICA COLUNA LOMBAR', 'ELETRONEUROMIOGRAFIA', 'DENSITOMETRIA ÓSSEA', 'ECOCARDIOGRAMA'])
    assert.ok(R.ehExameDeImagem(n), n);
  for (const n of ['GLICOSIMETRIA', 'HEMOGRAMA COMPLETO', 'CREATININA', 'TIPAGEM ABO/RH', 'SOROLOGIA PARA HEPATITES',
                   'TP (TEMPO DE PROTROMBINA)', 'COOMBS DIRETO (POLIESPECIFICO)'])
    assert.ok(!R.ehExameDeImagem(n), n);
});

// o CLAUDE.md é como o CRM (e as outras sessões) ficam sabendo o que esta
// extensão entrega: subir a versão sem atualizar a seção quebra aqui
test('CLAUDE.md descreve esta versão da extensão', () => {
  const fs = require('node:fs'), path = require('node:path');
  const versao = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.json'), 'utf8')).version;
  const md = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'CLAUDE.md'), 'utf8');
  assert.ok(md.includes(`dossie-versao: ${versao}`), `CLAUDE.md ainda fala da versão antiga — atualize a seção "Dossiê do cliente" para ${versao}`);
  assert.ok(md.includes(`(versão **${versao}**)`), 'o número visível da versão no CLAUDE.md não bate com o manifest');
});

test('seguro-desemprego: JSON do MTE vira texto legível com parcelas e datas', () => {
  // o cabeçalho é o que a lista do MTE devolve (medido em 11.10.2026); o detalhe traz as parcelas
  const t = R.textoSeguroDesemprego([{ numeroRequerimento: 123, modalidade: { codigo: 0, descricao: 'Trabalhador Formal' },
    dataRequerimento: '2024-03-10', tipoInscricao: { codigo: 1, descricao: 'CNPJ' }, inscricao: 12345678000199,
    razaoSocial: 'EMPRESA X', dataAdmissao: '2020-01-02', dataDispensa: '2024-02-28',
    detalhe: { situacao: { descricao: 'DEFERIDO' },
      vinculos: [{ nomeEmpresa: 'EMPRESA X', dataAdmissao: '2020-01-02', dataDemissao: '2024-02-28' }],
      parcelas: [{ numero: 1, dataProgramada: '2024-04-10', dataPagamento: '2024-04-12', valorPagamento: '1412.00', situacaoParcela: 'Paga', tipoParcela: 'NORMAL' },
                 { numero: 2, dataProgramada: '2024-05-10', dataPagamento: '2024-05-12', valorPagamento: '1412.00', situacaoParcela: 'Paga', tipoParcela: 'NORMAL' }] } }]);
  assert.match(t, /Requerimento 123 · modalidade Trabalhador Formal · situação DEFERIDO/);
  assert.match(t, /Data do requerimento: 10\/03\/2024/);
  assert.match(t, /Empregador: EMPRESA X \(CNPJ 12345678000199\) · admissão 02\/01\/2020 · dispensa 28\/02\/2024/);
  assert.match(t, /Vínculo: EMPRESA X · admissão 02\/01\/2020 · demissão 28\/02\/2024/);
  assert.match(t, /Parcela 1: programada 10\/04\/2024 · paga em 12\/04\/2024 · R\$ 1412.00 · Paga/);
  assert.match(t, /Última parcela paga em 12\/05\/2024/);
  assert.match(t, /dados brutos/);
});
