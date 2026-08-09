// A IMPORTAÇÃO GRAVANDO DE VERDADE — num navegador, com o banco de mentira.
//
// Os testes de robo-pat/importar.test.js provam o PLANO. Estes provam o que
// sai pelo fio: método, endereço e corpo de cada chamada. É a diferença
// entre "o plano estava certo" e "o CRM gravou certo" — e num lote de cem
// requerimentos é a segunda que importa.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const RAIZ = path.join(__dirname, '..', '..');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let chromium;
try { ({ chromium } = require(path.join(RAIZ, 'robo-crps', 'node_modules', 'playwright'))); }
catch (e) {}
const pular = { skip: !(chromium && fs.existsSync(CHROME)) && 'playwright/chromium indisponível' };

// um CRM com as quatro situações que a importação encontra de verdade
const SEMENTE = `
  const CO=[{id:'p',nome:'Paulo',inicial:'P',cor:'#C0392B',ativo:true}];
  eu=CO[0]; D={};
  D.colaboradores=CO; D.colPorId=new Map(CO.map(c=>[c.id,c]));
  D.clientes=[{id:'c1',nome:'Maria',cpf:'111.111.111-11'},
              {id:'c2',nome:'João', cpf:'22222222222'},
              {id:'c3',nome:'Ana',  cpf:'33333333333'}];
  D.cliPorId=new Map(D.clientes.map(c=>[c.id,c]));
  D.casos=[
    // casa pelo PROTOCOLO -> atualizar
    {id:'k1',cliente_id:'c1',titulo:'Maria',fase:'inss',protocolos:['1111111111'],
     situacao_inss:'Em análise',marcadores:[]},
    // mesmo cliente, mesma lista, mesma espécie, SEM o protocolo -> confira antes
    {id:'k2',cliente_id:'c2',titulo:'João',fase:'inss',protocolos:[],especie:'B42',
     beneficio:'Aposentadoria por tempo de contribuição',marcadores:[]},
  ];
  D.casoPorId=new Map(D.casos.map(k=>[k.id,k]));
  D.casosDoCliente=new Map(); D.casos.forEach(k=>{
    if(!D.casosDoCliente.has(k.cliente_id)) D.casosDoCliente.set(k.cliente_id,[]);
    D.casosDoCliente.get(k.cliente_id).push(k); });
  D.atrDoCaso=new Map(); D.tarefas=[]; D.tarefasPorCaso=new Map(); D.pagamentos=[]; D.meudia=[];
  D.eventos=[]; D.and30=[]; D.modelos=[]; D.sugestoes=[]; D.mencoes=[]; D.leads=[]; D.docs=[];
  D.ckls=[]; D.docModelos=[]; D.frases=[]; D.lembrarMotivos=[]; D.rotinas=[]; D.rotinasFeitas=[];
  D.apos=[]; D.listaPref=[]; D.config=new Map(); D.zapResumo=0; D.andamentos=[];
  D.tarefasFicha=[]; D.anexos=[]; D.convFicha=[];
  visao='patinss';
`;

// o arquivo do coletor, com a forma que ele gera de verdade
const PAT = {
  versao: 2, total: 5,
  lista: [
    { protocolo: '1111111111', cpf: '11111111111' },
    { protocolo: '2222222222', cpf: '22222222222' },
    { protocolo: '3333333333', cpf: '33333333333' },
    { protocolo: '4444444444', cpf: '33333333333' },
    { protocolo: '5555555555', cpf: '99999999999' },
  ],
  detalhes: [
    // 1) casa pelo protocolo, e a situação MUDOU -> patch + andamento + perícia
    { protocolo: '1111111111', situacao: 'Em exigência', tipo: 'beneficio', especie: 'B87',
      beneficio: 'BPC/LOAS — deficiência', der: '2026-07-31', marcadores: [], urgente: false,
      link: 'https://atendimento.inss.gov.br/tarefas/detalhar_tarefa/1111111111',
      eventos: [{ tipo: 'Perícia médica', data: '2026-12-01', hora: '08:20',
                  local: 'APS MATÃO', situacao: 'AGENDADO', ativo: true },
                { tipo: 'Perícia médica', data: '2026-11-30', hora: '07:40',
                  local: 'APS MATÃO', situacao: 'REMARCADO', ativo: false }] },
    // 2) cliente tem caso parecido sem protocolo -> confira antes, NÃO cria
    { protocolo: '2222222222', situacao: 'Em análise', tipo: 'beneficio', especie: 'B42',
      beneficio: 'Aposentadoria por tempo de contribuição', der: '2026-06-01',
      marcadores: [], urgente: false, eventos: [],
      link: 'https://atendimento.inss.gov.br/tarefas/detalhar_tarefa/2222222222' },
    // 3) recurso de cliente sem caso -> caso novo no Conselho
    { protocolo: '3333333333', situacao: 'Em análise', tipo: 'recurso', especie: null,
      beneficio: 'Recurso ordinário (inicial)', der: '2026-05-01', marcadores: [],
      urgente: false, eventos: [],
      link: 'https://atendimento.inss.gov.br/tarefas/detalhar_tarefa/3333333333' },
    // 4) apuração -> caso novo no INSS, urgente
    { protocolo: '4444444444', situacao: 'Em análise', tipo: 'apuracao', especie: null,
      beneficio: 'Apuração de irregularidade (MOB Digital)', der: '2026-04-01',
      marcadores: [], urgente: true, eventos: [],
      link: 'https://atendimento.inss.gov.br/tarefas/detalhar_tarefa/4444444444' },
    // 5) CPF que não existe no CRM -> não entra
    { protocolo: '5555555555', situacao: 'Em análise', tipo: 'beneficio', especie: 'B41',
      beneficio: 'Aposentadoria por idade', der: '2026-03-01', marcadores: [], urgente: false,
      eventos: [], link: 'https://atendimento.inss.gov.br/tarefas/detalhar_tarefa/5555555555' },
  ],
  desconhecidos: [], falhas: [],
};

let navegador, pag, pedidos = [], gravados = [], resumo, falhar = null;

const abrir = async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-pat-'));
  const html = fs.readFileSync(path.join(RAIZ, 'app.html'), 'utf8')
    .replace('"COLE_AQUI_https://xxxx.supabase.co"', '"https://fake.supabase.co"')
    .replace('"COLE_AQUI_a_anon_key"', '"chave"');
  const arq = path.join(tmp, 'app.html');
  fs.writeFileSync(arq, html);
  pag = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
  const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*',
                 'access-control-allow-methods': '*' };
  await pag.route('https://fake.supabase.co/**', r => {
    const req = r.request(), m = req.method();
    if (m === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS, body: '' });
    const corpo = req.postData();
    if (m !== 'GET') pedidos.push({ m, url: req.url().replace('https://fake.supabase.co', ''),
                                    corpo: corpo ? JSON.parse(corpo) : null });
    // permite simular um banco que recusa uma gravação específica
    if (falhar && falhar(m, req.url(), corpo))
      return r.fulfill({ status: 400, headers: { ...CORS, 'content-type': 'application/json' },
        body: JSON.stringify({ code: 'PGRST204',
          message: "Could not find the 'situacao_inss' column of 'casos' in the schema cache" }) });
    return r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' },
      body: m === 'POST' ? '[{"id":"novo1"}]' : '[]' });
  });
  await pag.goto('file://' + arq);
  await pag.evaluate(s => window.eval(s), SEMENTE);
  await pag.evaluate(() => {
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('app').classList.add('logado');
    carregar = async () => {};                    // o recarregar não faz parte deste teste
    window.__api = api;                           // os testes do CRPS trocam o api
    montarSidebar(); render();
  });
};

before(async () => {
  if (pular.skip) return;
  navegador = await chromium.launch({ executablePath: CHROME });
  await abrir();
  resumo = await pag.evaluate(pat => {
    arquivoPat = pat;
    planoPat = planoDeImportacao(pat, D, '2026-08-09');
    planoPat.erro = conferirPlanoPat(pat, planoPat);
    render();
    return { ...planoPat.resumo, erro: planoPat.erro };
  }, PAT);
  await pag.evaluate(() => aplicarPat());
  await pag.waitForTimeout(400);
  // guarda o que ESTA rodada mandou: os testes seguintes reabrem a página e
  // zeram `pedidos`, e sem a cópia eles passariam a olhar para outra coisa
  gravados = pedidos.slice();
});
after(async () => { if (navegador) await navegador.close(); });

test('o plano separa os cinco casos como deve', pular, () => {
  assert.equal(resumo.erro, null, `a conferência barrou: ${resumo.erro}`);
  assert.equal(resumo.lidos, 5);
  assert.equal(resumo.atualizar, 1);
  assert.equal(resumo.novos, 2, 'recurso e apuração');
  assert.equal(resumo.possiveis_duplicados, 1, 'o caso parecido do João');
  assert.equal(resumo.sem_cliente, 1);
  assert.equal(resumo.eventos, 1, 'só o AGENDADO futuro');
});

test('o caso que já existe é atualizado, sem repetir o protocolo', pular, () => {
  const p = pedidos.find(x => x.m === 'PATCH' && x.url.includes('id=eq.k1'));
  assert.ok(p, `nenhum PATCH em k1: ${pedidos.map(x => x.m + ' ' + x.url).join(' | ')}`);
  assert.equal(p.corpo.situacao_inss, 'Em exigência', 'a situação é a memória da próxima vez');
  assert.equal(p.corpo.der, '2026-07-31');
  assert.equal(p.corpo.especie, 'B87');
  assert.equal(p.corpo.processo_link,
    'https://atendimento.inss.gov.br/tarefas/detalhar_tarefa/1111111111');
  // k1 JÁ tinha esse protocolo: regravar a lista com ele de novo seria
  // escrever duas vezes o mesmo número no mesmo caso
  assert.ok(!('protocolos' in p.corpo),
    `o protocolo já estava lá e foi regravado: ${JSON.stringify(p.corpo.protocolos)}`);
});

// A saída mais usada da tabela "confira antes": o caso é o mesmo, só faltava
// o número anotado. Juntar tem de anexar o protocolo SEM apagar o que havia.
test('"é o mesmo — juntar" anexa o protocolo ao caso que já existia', pular, async () => {
  pedidos = [];
  await abrir();
  await pag.evaluate(pat => {
    arquivoPat = pat;
    planoPat = planoDeImportacao(pat, D, '2026-08-09');
    D.casoPorId.get('k2').protocolos = ['9999999999'];      // já tinha um número
    return juntarAoCaso('2222222222');
  }, PAT);
  await pag.waitForTimeout(300);
  const p = pedidos.find(x => x.m === 'PATCH' && x.url.includes('id=eq.k2'));
  assert.ok(p, 'não juntou nada');
  assert.deepStrictEqual(p.corpo.protocolos, ['9999999999', '2222222222'],
    'o protocolo novo tem de SOMAR ao que já estava');
  assert.equal(p.corpo.situacao_inss, 'Em análise');
  assert.equal(p.corpo.der, '2026-06-01', 'DER vazia é preenchida');
  assert.ok(!('especie' in p.corpo), 'k2 já tinha espécie: não pode ser sobrescrita');
  assert.equal(pedidos.filter(x => x.m === 'POST' && /\/casos$/.test(x.url)).length, 0,
    'juntar não pode criar caso nenhum');
});

// Requerimento parado não pode render comentário; o que mudou, sim.
test('a mudança de situação vira UM andamento — e só ela', pular, () => {
  const ands = gravados.filter(x => x.m === 'POST' && x.url.includes('/andamentos'));
  assert.equal(ands.length, 1, 'um andamento por mudança de situação, nem mais nem menos');
  assert.match(ands[0].corpo.texto, /Em análise → Em exigência/);
  assert.equal(ands[0].corpo.caso_id, 'k1');
});

test('cada caso novo nasce na sua lista, com protocolo e link', pular, () => {
  const novos = gravados.filter(x => x.m === 'POST' && /\/casos$/.test(x.url));
  assert.equal(novos.length, 2, 'só o recurso e a apuração podem nascer');
  const rec = novos.find(x => x.corpo.protocolos[0] === '3333333333');
  assert.equal(rec.corpo.fase, 'conselho', 'recurso não pode cair na lista do INSS');
  assert.equal(rec.corpo.cliente_id, 'c3');
  assert.match(rec.corpo.processo_link, /detalhar_tarefa\/3333333333$/);
  const apu = novos.find(x => x.corpo.protocolos[0] === '4444444444');
  assert.equal(apu.corpo.fase, 'inss');
  assert.equal(apu.corpo.urgente, true, 'apuração de irregularidade nasce urgente');
});

// O que ninguém desfaz na mão: uma segunda ficha do mesmo pedido.
test('o possível duplicado NÃO é criado pelo botão de aplicar', pular, () => {
  const criou = gravados.some(x => x.m === 'POST' && /\/casos$/.test(x.url)
    && (x.corpo.protocolos || []).includes('2222222222'));
  assert.equal(criou, false, 'criou o caso que devia ir para "confira antes"');
});

test('CPF sem cliente no CRM não vira caso nem cliente', pular, () => {
  const tocou = gravados.some(x => JSON.stringify(x.corpo || {}).includes('5555555555'));
  assert.equal(tocou, false, 'gravou um requerimento sem cliente');
  assert.equal(gravados.filter(x => x.m === 'POST' && /\/clientes/.test(x.url)).length, 0,
    'não se cria cliente às cegas a partir de um portal');
});

test('só o AGENDADO futuro entra na agenda', pular, () => {
  const evs = gravados.filter(x => x.m === 'POST' && x.url.includes('/eventos'));
  assert.equal(evs.length, 1, 'o horário REMARCADO não pode virar compromisso');
  assert.equal(evs[0].corpo.data_hora, '2026-12-01T08:20:00');
  assert.equal(evs[0].corpo.local, 'APS MATÃO');
  assert.equal(evs[0].corpo.status, 'agendada');
});

// ── o defeito que apareceu no uso real ────────────────────────────────────
// A primeira versão abortava no primeiro erro. Num lote de cem, isso deixa
// metade gravada e ninguém sabe qual metade.
test('um erro no meio não impede o resto de gravar', pular, async () => {
  pedidos = [];
  falhar = (m, url) => m === 'PATCH' && url.includes('id=eq.k1');   // o primeiro item falha
  await abrir();
  await pag.evaluate(pat => {
    arquivoPat = pat;
    planoPat = planoDeImportacao(pat, D, '2026-08-09');
    planoPat.erro = conferirPlanoPat(pat, planoPat);
    return aplicarPat();
  }, PAT);
  await pag.waitForTimeout(400);
  const novos = pedidos.filter(x => x.m === 'POST' && /\/casos$/.test(x.url));
  assert.equal(novos.length, 2, 'o erro no primeiro item matou o resto do lote');
  const aviso = await pag.$eval('#aviso', e => e.textContent);
  assert.match(aviso, /schema_por_em_dia|desatualizado/i,
    `o aviso devia apontar o schema, veio: "${aviso}"`);
  falhar = null;
});

// ── a coleta que a extensão entrega ───────────────────────────────────────
// A extensão NÃO decide nada: ela manda o que o portal respondeu, cru. Quem
// traduz e quem monta o plano é a tela — a mesma que já estava testada.
test('a coleta crua da extensão é traduzida e vira o mesmo plano', pular, async () => {
  pedidos = [];
  await abrir();
  const r = await pag.evaluate(() => {
    // exatamente a forma que o portal devolve, sem passar por tradução
    const cru = {
      versao: 3, total: 2,
      lista: [{ protocolo: '1111111111', status: 'Pendente', cpfRequerente: 11111111111,
                nomeServico: 'BPC', siglaServico: 'TBSBAPD', nomeUnidade: 'APS X',
                dataCriacao: '2026-07-01T10:00:00', dataUltimaAtualizacao: '2026-08-01T10:00:00' },
              { protocolo: '3333333333', status: 'Pendente', cpfRequerente: 33333333333,
                nomeServico: 'Recurso', siglaServico: 'TREC', nomeUnidade: 'SCARD',
                dataCriacao: '2026-06-01T10:00:00', dataUltimaAtualizacao: '2026-08-01T10:00:00' }],
      detalhes: [
        { protocolo: '1111111111', status: 'CUMPRIMENTO_DE_EXIGENCIA', siglaServico: 'TBSBAPD',
          especieBeneficio: 'AMP_SOCIAL_PORT_DEFICIENCIA', nomeServico: 'BPC',
          dataEntradaRequerimento: '2026-07-01T10:00:00', nomeUnidade: 'APS X',
          tipoCanalAtendimento: 'INTERNET', anexos: [], comentarios: [],
          agendamentosPericia: [{ situacaoAgendamento: 'AGENDADO', data: '01/12/2026',
                                  horario: '09:00', nomeUnidade: 'APS X' }] },
        { protocolo: '3333333333', status: 'PENDENTE', siglaServico: 'TREC',
          nomeServico: 'Recurso ordinário', dataEntradaRequerimento: '2026-06-01T10:00:00',
          nomeUnidade: 'SCARD', tipoCanalAtendimento: 'ENTIDADE_CONVENIADA',
          anexos: [], comentarios: [] },
      ],
    };
    arquivoPat = normalizarColeta(cru);
    planoPat = planoDeImportacao(arquivoPat, D, '2026-08-09');
    planoPat.erro = conferirPlanoPat(arquivoPat, planoPat);
    return { erro: planoPat.erro, ...planoPat.resumo,
             situacao: (planoPat.atualizar[0] || {}).situacao,
             especie: (planoPat.atualizar[0] || {}).especie,
             listaNovo: (planoPat.novos[0] || {}).lista };
  });
  assert.equal(r.erro, null, `a conferência barrou a coleta crua: ${r.erro}`);
  assert.equal(r.lidos, 2);
  assert.equal(r.situacao, 'Em exigência', 'o código cru do portal não foi traduzido');
  assert.equal(r.especie, 'B87', 'a espécie não saiu do código do INSS');
  assert.equal(r.listaNovo, 'conselho', 'o recurso não foi para a lista dele');
  assert.equal(r.eventos, 1, 'a perícia em data brasileira não virou compromisso');
});

// Uma coleta já traduzida (o arquivo do coletor antigo) não pode ser
// traduzida de novo — passar duas vezes pela tradução apagaria o que ela já
// tinha resolvido.
test('coleta já traduzida atravessa sem ser mexida', pular, async () => {
  const igual = await pag.evaluate(pat => {
    const a = JSON.stringify(normalizarColeta(pat));
    return a === JSON.stringify(pat);
  }, PAT);
  assert.equal(igual, true, 'a tradução mexeu num arquivo que já estava pronto');
});

// ── o e-Recursos ──────────────────────────────────────────────────────────
// A extensão entrega o que o portal respondeu, cru. A tradução — a mesma que
// tem 125 casos-ouro no robô de linha de comando — roda aqui dentro.
const CRPS_COLETA = {
  versao: 1, quando: '2026-08-09T12:00:00Z',
  itens: {
    '44234156897202017_esisrec': {
      proc: '44234156897202017', numProc: '123/2026', orgaoAtual: '25ª Junta de Recursos',
      recorrentes: [{ nome: 'MARIA APARECIDA' }],
      eventos: [
        { status: 'ACORDAM os membros da 25ª Junta de Recursos, em CONHECER do recurso e NEGAR-LHE provimento',
          data: '05/08/2026' },
        { status: 'RECURSO DISTRIBUIDO', data: '01/07/2026' },
      ],
    },
    '99999999999999999_esisrec': {          // nup que o CRM não conhece
      proc: '99999999999999999', eventos: [{ status: 'RECURSO DISTRIBUIDO', data: '01/07/2026' }],
    },
  },
  falhas: [],
};

test('a coleta do CRPS vira bloco do recurso e movimento novo', pular, async () => {
  pedidos = [];
  await abrir();
  const r = await pag.evaluate(col => {
    D.casos[0].crps_nups = ['44234156897202017'];
    const p = planoCrps(col, D);
    return { ...p.resumo, primeiro: (p.andamentos[0] || {}).texto,
             id: (p.andamentos[0] || {}).origem_id,
             casoDoBloco: (p.blocos[0] || {}).caso_id };
  }, CRPS_COLETA);
  assert.equal(r.lidos, 2);
  assert.equal(r.casos, 1, 'o bloco devia casar pelo NUP');
  assert.equal(r.sem_caso, 1, 'o NUP desconhecido não pode virar caso');
  assert.equal(r.casoDoBloco, 'k1');
  assert.ok(r.movimentos >= 1, 'nenhum movimento virou andamento');
  assert.match(r.primeiro, /🖥 CRPS/, 'o comentário não saiu no formato do CRPS');
  assert.match(r.id, /^44234156897202017\|/, 'a impressão digital do evento tem de levar o NUP');
});

// O portal devolve a lista INTEIRA a cada consulta: sem a impressão digital,
// os mesmos movimentos virariam comentário de novo a cada rodada.
test('movimento já visto não vira andamento de novo', pular, async () => {
  const n = await pag.evaluate(col => {
    D.casos[0].crps_nups = ['44234156897202017'];
    const p1 = planoCrps(col, D);
    // finge que a rodada anterior já gravou tudo
    D.novid = p1.andamentos.map(a => ({ id: a.origem_id, origem: 'crps',
                                        origem_id: a.origem_id, andamentos_lidos: [] }));
    return planoCrps(col, D).resumo.movimentos;
  }, CRPS_COLETA);
  assert.equal(n, 0, 'repetiu os movimentos que já estavam na ficha');
});

test('aplicar o CRPS grava o bloco no caso e o movimento como andamento', pular, async () => {
  pedidos = [];
  await abrir();
  await pag.evaluate(async col => {
    D.casos[0].crps_nups = ['44234156897202017'];
    D.novid = [];
    api = (async (caminho, op) => {                    // o banco de mentira já responde
      if (/\/coletas\?select/.test(caminho)) return [{ id: 'x1', fonte: 'crps', dados: col }];
      return window.__api(caminho, op);
    });
    await aplicarCrps('x1');
  }, CRPS_COLETA).catch(() => {});
  await pag.waitForTimeout(400);
  const patch = pedidos.find(x => x.m === 'PATCH' && x.url.includes('id=eq.k1') && x.corpo.crps);
  assert.ok(patch, `não gravou o bloco do recurso: ${pedidos.map(x => x.m + x.url).join('|')}`);
  assert.equal(patch.corpo.crps[0].nup, '44234156897202017');
  const ands = pedidos.filter(x => x.m === 'POST' && x.url.includes('/andamentos'));
  assert.ok(ands.length >= 1, 'nenhum movimento virou andamento');
  assert.equal(ands[0].corpo.origem, 'crps');
  assert.match(ands[0].corpo.origem_id, /^44234156897202017\|/);
  assert.equal(ands[0].corpo.publico, false, 'movimento do CRPS não pode ir ao portal do cliente');
});
