// Dois defeitos reais moram aqui, e os dois eram MUDOS:
//
// 1. Perguntar pela coluna errada. `crps` é o RESULTADO da consulta;
//    `crps_nups` é o número A consultar. Pedir o resultado devolve lista
//    vazia, não erro.
// 2. Perguntar sem ter entrado. `casos` tem RLS com política só para quem
//    entrou, então a chave anônima recebe 200 com lista VAZIA. Ficava
//    idêntico a "não há recurso nenhum cadastrado".
//
// Nos dois casos a extensão anunciava com convicção que o escritório não
// tinha recurso nenhum. Estes testes existem para nenhum dos dois voltar.
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { pathToFileURL } = require('url');

const MOD = pathToFileURL(path.join(__dirname, '..', 'crm-api.js')).href;

// cada teste quer o módulo com estado limpo (o crachá fica em memória)
let n = 0;
async function carregar({ guardado = {}, respostas = [] } = {}) {
  const pedidos = [];
  const memoria = { url: 'https://x.supabase.co/', chave: 'anon', ...guardado };
  globalThis.chrome = {
    storage: {
      local: {
        get: async ks => Object.fromEntries(
          (Array.isArray(ks) ? ks : [ks]).map(k => [k, memoria[k]])),
        set: async o => Object.assign(memoria, o),
        remove: async ks => (Array.isArray(ks) ? ks : [ks]).forEach(k => delete memoria[k]),
      },
    },
  };
  globalThis.fetch = async (u, o = {}) => {
    pedidos.push({ url: String(u), opcoes: o });
    const r = respostas.shift() || { ok: true, status: 200, corpo: [] };
    return { ok: r.ok !== false, status: r.status || 200,
             json: async () => r.corpo, text: async () => JSON.stringify(r.corpo || '') };
  };
  const api = await import(`${MOD}?${++n}`);      // ?n força um módulo novo
  return { api, pedidos, memoria };
}

const CRACHA_OK = { ok: true, status: 200,
                    corpo: { access_token: 'jwt-novo', refresh_token: 'r2', expires_in: 3600 } };

test('sem ter entrado, a consulta não sai — e diz o que fazer', async () => {
  const { api, pedidos } = await carregar();
  await assert.rejects(() => api.nups(), /entre no CRM/i);
  assert.equal(pedidos.length, 0, 'chegou a perguntar ao banco sem crachá');
});

test('a consulta vai com o crachá de quem entrou, não com a chave anônima', async () => {
  const { api, pedidos } = await carregar({
    guardado: { refresh: 'r1' },
    respostas: [CRACHA_OK, { corpo: [] }],
  });
  await api.nups();
  const consulta = pedidos[1];
  assert.equal(consulta.opcoes.headers.Authorization, 'Bearer jwt-novo',
    'voltou a consultar com a chave anônima — o banco devolveria lista vazia');
  assert.equal(consulta.opcoes.headers.apikey, 'anon');
});

test('pergunta pelo número a consultar, não pelo resultado da última consulta', async () => {
  const { api, pedidos } = await carregar({
    guardado: { refresh: 'r1' }, respostas: [CRACHA_OK, { corpo: [] }],
  });
  await api.nups();
  assert.match(pedidos[1].url, /select=crps_nups,crps_nup/, `coluna errada: ${pedidos[1].url}`);
  assert.ok(!/crps=not\.is\.null/.test(pedidos[1].url),
    'voltou a filtrar pelo resultado — quem nunca consultou ficaria de fora');
  assert.match(pedidos[1].url, /encerrado_em=is\.null/, 'ia consultar caso já encerrado');
});

test('junta os números das duas colunas, sem pontuação e sem repetir', async () => {
  const { api } = await carregar({
    guardado: { refresh: 'r1' },
    respostas: [CRACHA_OK, { corpo: [
      { crps_nups: ['12345678901234567'], crps_nup: null },
      { crps_nups: [], crps_nup: '123.456.789/0123-45' },
      { crps_nups: ['123.456.789.012.345.67'], crps_nup: null },   // o mesmo do primeiro
      { crps_nups: null, crps_nup: null },
      { crps_nups: ['12345678901'], crps_nup: '1234' },            // CPF e protocolo: não são NUP
    ] }],
  });
  const { nups, fichas } = await api.nups();
  assert.deepEqual(nups, ['12345678901234567', '123456789012345']);
  assert.equal(fichas, 5, 'sem o total de fichas lidas, "nada cadastrado" e '
    + '"nada visível" viram a mesma frase');
});

test('o refresh_token novo substitui o usado; a senha nunca é guardada', async () => {
  const { api, memoria } = await carregar({
    guardado: { refresh: 'r1' }, respostas: [CRACHA_OK, { corpo: [] }],
  });
  await api.nups();
  assert.equal(memoria.refresh, 'r2', 'o Supabase troca o refresh a cada uso e o novo se perdeu');
  assert.ok(!Object.values(memoria).includes('minha-senha'));
});

test('entrar guarda só o crachá e o e-mail', async () => {
  const { api, memoria, pedidos } = await carregar({
    respostas: [{ corpo: { access_token: 'a', refresh_token: 'r9', expires_in: 3600,
                           user: { email: 'paulo@exemplo.com' } } }],
  });
  assert.equal(await api.entrar('paulo@exemplo.com', 'minha-senha'), 'paulo@exemplo.com');
  assert.match(pedidos[0].url, /grant_type=password/);
  assert.equal(memoria.refresh, 'r9');
  assert.equal(memoria.quem, 'paulo@exemplo.com');
  assert.ok(!JSON.stringify(memoria).includes('minha-senha'), 'a senha ficou guardada');
});

test('senha errada é dita como senha errada', async () => {
  const { api } = await carregar({ respostas: [{ ok: false, status: 400, corpo: {} }] });
  await assert.rejects(() => api.entrar('a@b.c', 'x'), /não conferem/i);
});

test('queda de rede não custa o login; crachá recusado, sim', async () => {
  const caiu = await carregar({ guardado: { refresh: 'r1' },
                                respostas: [{ ok: false, status: 503, corpo: {} }] });
  await assert.rejects(() => caiu.api.nups(), /renovar/i);
  assert.equal(caiu.memoria.refresh, 'r1', 'apagou o login por causa de uma queda de rede');

  const venceu = await carregar({ guardado: { refresh: 'r1' },
                                  respostas: [{ ok: false, status: 401, corpo: {} }] });
  await assert.rejects(() => venceu.api.nups(), /venceu/i);
  assert.equal(venceu.memoria.refresh, undefined, 'guardou um crachá que o servidor recusou');
});

test('uma rodada renova o crachá uma vez só', async () => {
  const { api, pedidos } = await carregar({
    guardado: { refresh: 'r1' },
    respostas: [CRACHA_OK],
  });
  await api.nups();
  await api.enviar('crps', { a: 1 });
  assert.equal(pedidos.filter(p => /grant_type/.test(p.url)).length, 1,
    'renovou o crachá de novo dentro da mesma rodada');
  const envio = pedidos.at(-1);
  assert.match(envio.url, /\/rest\/v1\/coletas$/);
  assert.equal(envio.opcoes.headers.Authorization, 'Bearer jwt-novo');
});

test('F184 · o documento sobe ao bucket privado com o crachá; já existir não é erro', async () => {
  const { api, pedidos } = await carregar({
    guardado: { refresh: 'r1' },
    respostas: [CRACHA_OK, { ok: false, status: 409, corpo: { error: 'Duplicate' } }],
  });
  const r = await api.guardarDoc('pje/123/9', 'application/pdf', Buffer.from('%PDF-1').toString('base64'));
  assert.deepStrictEqual(r, { caminho: 'pje/123/9', bytes: 6 });
  assert.equal(pedidos[1].url, 'https://x.supabase.co/storage/v1/object/anexos/pje/123/9');
  assert.equal(pedidos[1].opcoes.headers.Authorization, 'Bearer jwt-novo');
  assert.equal(pedidos[1].opcoes.headers['x-upsert'], 'false', 'sobrescrever trocaria a sentença guardada');
});

// ── 1.24 · o e-SAJ só baixa peças de caso aberto previdenciário ─────────────
test('processosTjsp: todo caso aberto dá movimentação, só o previdenciário dá peças', async () => {
  const { api } = await carregar({ guardado: { refresh: 'r1' }, respostas: [CRACHA_OK, { corpo: [
    { processo: '0002499-64.2010.8.26.0338', processos: [], beneficio: 'Ação civil pública, responsabilidade da administração' },
    { processo: '0003054-15.2015.8.26.0368', processos: [], beneficio: 'Falência' },
    { processo: '1000001-11.2024.8.26.0368', processos: [{ numero: '1000002-22.2024.8.26.0368' }], beneficio: 'Espécie 94' },
    { processo: '1000003-33.2024.8.26.0368', processos: [], beneficio: null },
  ] }] });
  const r = await api.processosTjsp();
  assert.equal(r.numeros.length, 5);
  assert.deepStrictEqual(r.comDocs.sort(), ['1000001-11.2024.8.26.0368', '1000002-22.2024.8.26.0368', '1000003-33.2024.8.26.0368']);
  for (const b of ['Apos. Tempo de Contribuição', 'Aux. Incapacidade Temporária', 'Revisão', 'Acerto de CNIS', 'BPC/LOAS', 'Pensão por Morte', 'Salário-Maternidade', 'Auxílio-Reclusão'])
    assert.ok(api.previdenciario(b), b);
  for (const b of ['Execução de título extrajudicial', 'Ação de cobrança contra seguradora', 'Ação contra banco no Juizado Especial Cível', 'Carta precatória cível, intimação', 'Consignação em pagamento', 'Embargos à execução', 'Mandado de segurança, reintegração de servidor público'])
    assert.ok(!api.previdenciario(b), b);
});

// ── F190 · completar só o que movimentou ────────────────────────────────────
test('movimentou: compara o último movimento do acervo com a cronologia entregue', async () => {
  const { api } = await carregar();
  const itens = [{ data: '2026-10-10', textos: ['Juntada de petição'] }, { data: '2026-10-01', textos: ['Recebidos os autos'] }];
  assert.ok(api.movimentou({ data: '2026-10-11', texto: 'Conclusos' }, itens), 'dia depois');
  assert.ok(!api.movimentou({ data: '2026-10-09', texto: 'Qualquer' }, itens), 'dia antes');
  assert.ok(!api.movimentou({ data: '2026-10-10', texto: 'JUNTADA DE PETIÇÃO' }, itens), 'mesmo dia, mesmo texto');
  assert.ok(api.movimentou({ data: '2026-10-10', texto: 'Conclusos' }, itens), 'mesmo dia, texto novo');
  assert.ok(api.movimentou({ data: '2026-10-10', texto: 'x' }, undefined), 'nunca completado');
  assert.ok(!api.movimentou(null, itens), 'acervo sem movimento, cronologia já entregue');
});

test('acervoPje: só entra o processo que movimentou desde a última cronologia', async () => {
  const host = 'pje1g.trf3.jus.br';
  const acervo = [{ dados: { host, processos: [
    { numero: '5000000-11.2020.4.03.9999', id: '1', ca: 'a', movimento: { data: '2026-10-12', texto: 'Conclusos' } },
    { numero: '5000000-22.2020.4.03.9999', id: '2', ca: 'b', movimento: { data: '2026-10-10', texto: 'Juntada' } },
    { numero: '5000000-33.2020.4.03.9999', id: '3', ca: 'c', movimento: { data: '2026-10-10', texto: 'Juntada' } },
  ] } }];
  const casos = [{ processo: '5000000-11.2020.4.03.9999', processos: ['5000000-22.2020.4.03.9999', '5000000-33.2020.4.03.9999'] }];
  const entregues = [{ dados: { lote: [
    { numero: '5000000-11.2020.4.03.9999', host, itens: [{ data: '2026-10-10', textos: ['Juntada'] }] },
    { numero: '5000000-22.2020.4.03.9999', host, itens: [{ data: '2026-10-10', textos: ['Juntada'] }, { data: '2020-01-10', textos: ['Distribuído por sorteio'] }, { data: '2020-01-10', textos: [], docs: [{ id: '1', nome: 'Petição inicial', caminho: 'x' }] }] },
  ] } }];
  const { api } = await carregar({ guardado: { refresh: 'r', quem: 'eu' },
    respostas: [{ corpo: { access_token: 't', refresh_token: 'r', expires_in: 3600 } },
                { corpo: acervo }, { corpo: casos }, { corpo: [] }, { corpo: entregues }] });
  const lista = await api.acervoPje();
  assert.deepStrictEqual(lista.map(p => p.numero).sort(),
    ['5000000-11.2020.4.03.9999', '5000000-33.2020.4.03.9999']);   // o 22 não movimentou; o 33 nunca foi completado
});

test('acervoPje: documento que falhou traz o processo de volta, até 3 tentativas', async () => {
  const host = 'pje1g.trf3.jus.br', numero = '5000000-22.2020.4.03.9999';
  const acervo = [{ dados: { host, processos: [{ numero, id: '2', ca: 'b', movimento: { data: '2026-10-10', texto: 'Juntada' } }] } }];
  const casos = [{ processo: numero, processos: [] }];
  const entregues = [{ dados: { lote: [{ numero, host, itens: [{ data: '2026-10-10', textos: ['Juntada'],
    docs: [{ id: '900', nome: 'Certidão', falhou: true }, { id: '902', nome: 'Peça de processo arquivado' }, { id: '901', nome: 'Laudo', caminho: 'pje/x/901' }] },
    { data: '2020-01-10', textos: ['Distribuído por sorteio'] }, { data: '2020-01-10', textos: [], docs: [{ id: '1', nome: 'Petição inicial', caminho: 'x' }] }] }] } }];   // F385 · já chegou ao início
  const rodar = async tentativas => {
    const { api, memoria } = await carregar({ guardado: { refresh: 'r', quem: 'eu', pje_tentativas: tentativas },
      respostas: [{ corpo: { access_token: 't', refresh_token: 'r', expires_in: 3600 } },
                  { corpo: acervo }, { corpo: casos }, { corpo: [] }, { corpo: entregues }] });
    const lista = await api.acervoPje(), naFila = { ...memoria.pje_tentativas };
    await api.gastarTentativas(lista);             // o que o completar faz depois de ler e entregar
    return { lista, naFila, tent: memoria.pje_tentativas };
  };
  let r = await rodar({});
  assert.equal(r.lista.length, 1, '1ª tentativa entra');
  assert.deepStrictEqual(r.lista[0].pend, ['900'], 'só o que falhou é pendente: a peça não baixada de propósito (902) não conta');
  assert.deepStrictEqual(r.naFila, {}, 'entrar na fila não gasta tentativa');
  assert.deepStrictEqual(r.tent, { 900: 1 });
  r = await rodar({ 900: 2 });
  assert.equal(r.lista.length, 1, '3ª tentativa ainda entra');
  assert.deepStrictEqual(r.tent, { 900: 3 });
  r = await rodar({ 900: 3 });
  assert.equal(r.lista.length, 0, 'depois de 3, desiste');
});

test('F590 · acervoPje: 3 falhas no mesmo movimento tiram o processo da fila; movimento novo o devolve', async () => {
  const host = 'pje1g.trf3.jus.br', numero = '5000000-55.2020.4.03.9999';
  const rodar = async (data, tent) => {
    const acervo = [{ dados: { host, processos: [{ numero, id: '5', ca: 'e', movimento: { data, texto: 'Juntada' } }] } }];
    const { api, memoria } = await carregar({ guardado: { refresh: 'r', quem: 'eu', pje_tentativas: tent },
      respostas: [CRACHA_OK, { corpo: acervo }, { corpo: [{ processo: numero, processos: [] }] }, { corpo: [] }, { corpo: [] }] });
    const lista = await api.acervoPje();
    await api.gastarTentativas(lista.map(p => ({ pend: [p.falha] })));   // o que o completar faz com quem falhou
    return { lista, tent: memoria.pje_tentativas };
  };
  const chave = `falha:${host}:50000005520204039999:2026-10-10`;
  let r = await rodar('2026-10-10', { [chave]: 2 });
  assert.equal(r.lista.length, 1, 'a 3ª tentativa ainda entra (nunca completado: antes não tinha chave para contar)');
  assert.equal(r.tent[chave], 3);
  assert.equal((await rodar('2026-10-10', r.tent)).lista.length, 0, 'depois de 3, sai da fila');
  assert.equal((await rodar('2026-10-12', r.tent)).lista.length, 1, 'movimentou de novo: volta');
});

test('F590 · acervoPje: as tentativas do início cortado contam por grau; a chave antiga, sem host, ainda vale', async () => {
  const numero = '5000000-66.2020.4.03.9999', n = '50000006620204039999', mov = { data: '2026-10-10', texto: 'Juntada' };
  const hosts = ['pje1g.trf3.jus.br', 'pje2g.trf3.jus.br'];
  const acervo = hosts.map(host => ({ dados: { host, processos: [{ numero, id: '6', ca: 'f', movimento: mov }] } }));
  const entregues = [{ dados: { lote: hosts.map(host => ({ numero, host, itens: [{ data: '2026-10-10', textos: ['Juntada'] }] })) } }];   // cortada nos dois
  const rodar = async tent => (await carregar({ guardado: { refresh: 'r', quem: 'eu', pje_tentativas: tent },
    respostas: [CRACHA_OK, { corpo: acervo }, { corpo: [{ processo: numero, processos: [] }] }, { corpo: [] }, { corpo: entregues }] })).api.acervoPje();
  let lista = await rodar({ ['inicio2:' + hosts[0] + ':' + n]: 3 });
  assert.deepStrictEqual(lista.map(p => [p.host, p.ini]), [[hosts[1], 'inicio2:' + hosts[1] + ':' + n]], 'o 1º grau esgotado não gasta o 2º');
  assert.equal((await rodar({ ['inicio2:' + n]: 3 })).length, 0, 'quem já esgotou pela chave antiga não reabre');
});

test('acervoPje: a cronologia de um grau não dá o outro grau por completado', async () => {
  const numero = '5000000-44.2020.4.03.9999', mov = { data: '2026-10-10', texto: 'Juntada' };
  const acervo = ['pje1g.trf3.jus.br', 'pje2g.trf3.jus.br'].map(host =>
    ({ dados: { host, processos: [{ numero, id: '4', ca: 'd', movimento: mov }] } }));
  const entregues = [{ dados: { lote: [{ numero, host: 'pje1g.trf3.jus.br', itens: [{ data: '2026-10-10', textos: ['Juntada'] },
    { data: '2020-01-10', textos: ['Distribuído por sorteio'] }, { data: '2020-01-10', textos: [], docs: [{ id: '1', nome: 'Petição inicial', caminho: 'x' }] }] }] } }];
  const { api, pedidos } = await carregar({ guardado: { refresh: 'r', quem: 'eu' },
    respostas: [CRACHA_OK, { corpo: acervo }, { corpo: [{ processo: numero, processos: [] }] }, { corpo: [] }, { corpo: entregues }] });
  const lista = await api.acervoPje();
  assert.deepStrictEqual(lista.map(p => p.host), ['pje2g.trf3.jus.br']);
  assert.equal(lista[0].curto, false, 'nunca lido neste grau: a rolagem espera o início inteiro');
  assert.match(pedidos[1].url, /dados->>sistema=is\.null/, 'as coletas do eproc não ocupam a janela das 40');
});

test('leitura paginada: o que passa de 1.000 linhas não some; recurso de caso encerrado vai como arquivado', async () => {
  const nup = i => '4423' + String(i).padStart(13, '0');
  const pagina = (de, n) => Array.from({ length: n }, (_, i) => ({ crps_nups: [nup(de + i)], crps_nup: null }));
  const { api, pedidos } = await carregar({ guardado: { refresh: 'r1' }, respostas: [CRACHA_OK,
    { corpo: pagina(0, 1000) }, { corpo: pagina(1000, 3) }, { corpo: [] },
    { corpo: [{ crps_nups: [nup(5000)], crps_nup: nup(2) }] }] });                // encerrados: um só dele, um que também está em caso aberto
  const r = await api.nups();
  assert.equal(r.nups.length, 1003);
  assert.equal(r.fichas, 1003, 'fichas continua sendo a conta dos casos abertos');
  assert.match(pedidos[2].url, /order=id&limit=1000&offset=1000$/);
  assert.match(pedidos[4].url, /encerrado_em=not\.is\.null/);
  assert.deepStrictEqual(r.arquivados, [nup(5000)], 'o que está em caso aberto continua na fila');
});

// F597 · o processo que andou vai antes do nunca lido, e este antes do resto; no empate, o mais recente
test('ordemAcervo põe o movimentado primeiro', async () => {
  const { ordemAcervo } = await import(MOD + '?ordem');
  const ps = [{ n: 'resto', prio: 2, data: '2026-11-14' }, { n: 'novo', prio: 1, data: '2026-11-01' },
    { n: 'andou-velho', prio: 0, data: '2026-10-01' }, { n: 'andou', prio: 0, data: '2026-11-10' }];
  assert.deepStrictEqual(ordemAcervo(ps).map(p => p.n), ['andou', 'andou-velho', 'novo', 'resto']);
});
