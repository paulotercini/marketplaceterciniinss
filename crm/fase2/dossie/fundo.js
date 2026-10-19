// DOSSIÊ · service worker: recebe cada PDF dos coletores e grava em dois
// lugares — a pasta do cliente no Drive e o CRM.
//
// A PASTA DO DRIVE (G:\Meu Drive\Processos\<Letra>\<Nome #CPF>\Dossie\<fonte>)
// é gravada pelo host/dossie_host.py via native messaging: a extensão sozinha
// só escreve em Downloads, e só um programa local enxerga as pastas que já
// existem. Sem o host instalado, cai no jeito antigo: Downloads/Dossie/<Nome CPF>/.
//
// O download passa por um documento offscreen: o service worker não cria
// blob: URL, e data: URL acima de 2 MB não baixa (a cópia de um processo
// administrativo passa disso fácil).
import * as CRM from './crm.js';
import './regras.js';                       // UMD: no service worker pendura em globalThis
const R = globalThis.DOSSIE_REGRAS;

async function urlDoBlob(b64) {
  if (!(await chrome.offscreen.hasDocument())) {
    await chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['BLOBS'],
      justification: 'transformar o PDF baixado em arquivo para o chrome.downloads' });
  }
  return chrome.runtime.sendMessage({ tipo: 'blob', b64 });
}

const HOST = 'br.tercini.dossie';
const pastaPorCpf = new Map();     // uma busca no Drive por cliente, não uma por arquivo

const nativo = msg => new Promise((ok, falha) => chrome.runtime.sendNativeMessage(HOST, msg, r => {
  if (chrome.runtime.lastError) return falha(new Error(chrome.runtime.lastError.message));
  if (!r || r.erro) return falha(new Error((r && r.erro) || 'o programa do Drive não respondeu'));
  ok(r);
}));

// devolve onde gravou; null = host ausente (aí vai para Downloads)
async function noDrive(m, fonte) {
  let pasta = pastaPorCpf.get(m.cpf);
  try {
    if (!pasta) { pasta = (await nativo({ acao: 'pasta', cpf: m.cpf, nome: m.nome })).pasta; pastaPorCpf.set(m.cpf, pasta); }
  } catch (e) {
    if (/not found|não encontrado|Specified native messaging host/i.test(e.message)) return null;
    throw e;
  }
  return (await nativo({ acao: 'salvar', pasta, fonte, arquivo: m.arquivo, b64: m.b64 })).caminho;
}

async function salvar(m) {
  const fonte = String(m.fonte || 'Outros').split('/').map(R.nomeSeguro).join('/');
  const local = await noDrive(m, fonte);
  if (!local) {
    const url = await urlDoBlob(m.b64);
    await chrome.downloads.download({ url, filename: `${R.pastaCliente(m.nome, m.cpf)}/${fonte}/${m.arquivo}`,
      conflictAction: 'overwrite', saveAs: false });
  }

  let crm;
  try {
    const bytes = Uint8Array.from(atob(m.b64), c => c.charCodeAt(0));
    const caminho = `dossie/${m.cpf}/${fonte.split('/').map(R.slug).join('/')}/${R.slug(m.arquivo)}`;
    crm = await CRM.guardarNoCrm({ cpf: m.cpf, caminho, nome: `${fonte} · ${m.arquivo}`, bytes, mime: m.mime || 'application/pdf' });
  } catch (e) { crm = String(e.message || e); }
  return { ok: true, crm, drive: !!local };
}

// ── HC RIBEIRÃO ──────────────────────────────────────────────────────────
// Três telas, três páginas: aqui se anda entre elas e se grava o que cada uma
// devolve (hcrp.js roda no mundo da página e não fala com o chrome.*).
const pausa = ms => new Promise(r => setTimeout(r, ms));
function carregou(tabId, prazo = 30000) {
  return new Promise(ok => {
    const fim = () => { chrome.tabs.onUpdated.removeListener(f); clearTimeout(t); ok(); };
    const f = (id, info) => { if (id === tabId && info.status === 'complete') fim(); };
    const t = setTimeout(fim, prazo);
    chrome.tabs.onUpdated.addListener(f);
  });
}
async function noHc(tabId, metodo, arg) {
  await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', files: ['regras.js', 'hcrp.js'] });
  const [r] = await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN',
    func: (metodo, arg) => window.DOSSIE_HC[metodo](arg), args: [metodo, arg === undefined ? null : arg] });
  return r && r.result;
}
// Cada tela roda solta na página e o service worker colhe os PDFs a cada 3 s:
// uma executeScript pendente por minutos derruba o worker (o mesmo do rodarTudo),
// e a resposta com 32 relatórios de uma vez não chegava (16.10.2026)
async function telaHc(tabId, tela, gravar, arg) {
  await noHc(tabId, 'rodar', { tela, arg });
  for (let t = 0; t < 40 * 60000; t += 3000) {
    await pausa(3000);
    const [c] = await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN',
      func: () => { const f = window.__dossieHcFila || []; window.__dossieHcFila = []; return { fila: f, pronto: window.__dossieHcPronto }; } }).catch(() => []);
    if (!c || !c.result) continue;
    for (const a of c.result.fila) await gravar(a);
    if (c.result.pronto) return c.result.pronto;
  }
  return null;
}
async function rodarHc(tabId) {
  const st = await chrome.storage.local.get(['cliente']);
  const info = await noHc(tabId, 'info', st.cliente || null);
  if (!info || info.erro) { const e = (info && info.erro) || 'não consegui ler o HC'; await noHc(tabId, 'fim', { texto: e, cor: '#B3261E' }); return { erro: e }; }
  const { cliente, links, registro } = info;
  let ok = 0; const falhas = [], inexistentes = [], porTela = {};
  for (const [tela, rotulo] of [['exames', 'exames'], ['internacoes', 'internações'], ['relatorios', 'relatórios']]) {
    if (!links[tela]) { falhas.push(`${rotulo}: link não encontrado no menu`); continue; }
    const pronto = carregou(tabId);
    await chrome.tabs.update(tabId, { url: links[tela] });
    await pronto; await pausa(2500);
    const gravar = async a => {
      try { await salvar({ cpf: cliente.cpf, nome: cliente.nome, ...a }); ok++; }
      catch (e) { falhas.push(`${a.arquivo}: ${e.message || e}`); }
    };
    let r = await telaHc(tabId, tela, gravar);
    if (r && r.recarregar) {                    // filtro "Exibir tudo" dos exames: a página se recarrega
      await carregou(tabId); await pausa(2500);
      r = await telaHc(tabId, tela, gravar);
    }
    if (!r) { falhas.push(`${rotulo}: a tela não respondeu`); continue; }
    const anotar = (rot, x) => { porTela[rot] = x; falhas.push(...(x.falhas || []).map(f => `${rot} · ${f}`)); inexistentes.push(...(x.inexistentes || []).map(f => `${rot} · ${f}`)); };
    anotar(rotulo, r);
    if (tela !== 'exames') continue;
    // as imagens dos exames vivem em outro domínio (Agfa XERO): o bilhete só existe
    // na tela de Exames e vence em minutos, por isso a aba, em segundo plano, abre
    // na hora e é fechada no fim; o coletor é o mesmo hcrp.js
    const bilhete = await noHc(tabId, 'bilhete').catch(e => ({ erro: String(e.message || e) }));
    if (!bilhete || !bilhete.url) { anotar('imagens', { falhas: bilhete && bilhete.erro ? [bilhete.erro] : [], inexistentes: bilhete && bilhete.inexistente ? [bilhete.inexistente] : [] }); continue; }
    const aba = await chrome.tabs.create({ url: bilhete.url, active: false });
    try {
      await carregou(aba.id); await pausa(4000);
      const ri = await telaHc(aba.id, 'imagens', gravar, { registro });
      anotar('imagens', ri || { falhas: ['o visualizador não respondeu'] });
    } catch (e) { falhas.push(`imagens: ${e.message || e}`); }
    await chrome.tabs.remove(aba.id).catch(() => {});
  }
  const baixados = [];
  for (const [tela, r] of Object.entries(porTela)) for (const a of r.arquivos || []) baixados.push(`${tela} · ${a.arquivo}`);
  const res = await resumo({ cpf: cliente.cpf, portal: 'hc', baixados, inexistentes, falhas });
  // falha primeiro: é o que pede ação, e não pode sumir atrás da lista de "sem resultado"
  await noHc(tabId, 'fim', { cor: falhas.length ? '#9A6700' : '#1E6F50',
    texto: `${ok} documento(s) do HC${res.crm && res.crm !== 'ok' ? ` (resumo no CRM: ${res.crm})` : ''}`
    + (falhas.length ? `\n${falhas.length} falharam:\n• ${falhas.slice(0, 6).join('\n• ')}` : '')
    + (inexistentes.length ? `\n${inexistentes.length} sem resultado no HC (imagem sem laudo ainda):\n• ${inexistentes.slice(0, 4).join('\n• ')}`
      + (inexistentes.length > 4 ? `\n• … e mais ${inexistentes.length - 4}` : '') : '') });
  return { ok, falhas };
}

// ── RODAR TUDO ───────────────────────────────────────────────────────────
// Um clique percorre os portais, um por vez, cada um na sua aba: a aba que já
// está aberta é usada (é onde o login está); Meu INSS, e-Recursos, CadÚnico e Redesim
// são abertos se faltarem (mesmo gov.br); Emprega Brasil e HC só rodam se a
// aba estiver aberta, porque o login deles é por aba/portal. O HC vai depois
// de todos, porque é o mais pesado (imagens) e o CRM precisa do CNIS, da RAIS
// e do CadÚnico o quanto antes; a Redesim vem antes dele e para a frente, porque
// só abre a tela e segue: a pessoa clica em PESQUISAR (captcha) enquanto o HC roda.
// Portal sem login responde "sem sessão" e a rodada segue; o relato fica em
// chrome.storage (ultima_rodada) e o popup mostra.
const PORTAIS = [
  { chave: 'meuinss', nome: 'Meu INSS', url: 'https://meu.inss.gov.br/#/', padrao: 'https://meu.inss.gov.br/*', arquivo: 'meuinss.js' },
  { chave: 'recursos', nome: 'e-Recursos', url: 'https://consultaprocessos.inss.gov.br/', padrao: 'https://consultaprocessos.inss.gov.br/*', arquivo: 'recursos.js' },
  { chave: 'mte', nome: 'Emprega Brasil', url: 'https://servicos.mte.gov.br/spme-v2/#/login', padrao: 'https://servicos.mte.gov.br/*', arquivo: 'mte.js', soSeAberto: true },
  { chave: 'cadunico', nome: 'CadÚnico', url: 'https://cadunico.dataprev.gov.br/#/home', padrao: 'https://cadunico.dataprev.gov.br/*', arquivo: 'cadunico.js' },
  { chave: 'redesim', nome: 'Redesim', url: 'https://consultacnpj.redesim.gov.br/minhas-empresas', padrao: 'https://consultacnpj.redesim.gov.br/*', redesim: true },
  { chave: 'hc', nome: 'HC Ribeirão', url: 'https://appiris.hcrp.usp.br/apex/r/iris/nossohcribeirao/login', padrao: 'https://appiris.hcrp.usp.br/*', hc: true, soSeAberto: true },
];
// abre em abas os portais que ainda não estão abertos — a pessoa entra em cada
// um (o login é dela) e depois clica em "Rodar todos os portais"
async function abrirTudo() {
  let abertos = 0;
  for (const p of PORTAIS) {
    const [aba] = await chrome.tabs.query({ url: p.padrao });
    if (!aba) { await chrome.tabs.create({ url: p.url, active: false }); abertos++; }
  }
  return { abertos };
}
let rodandoTudo = false;
// recarregar (↻) ou abrir o navegador mata qualquer rodada em curso: o
// "rodando…" que sobrou no storage é lixo e prenderia o botão do popup
const zerarRodada = () => chrome.storage.local.set({ rodada_andamento: null, rodada_desde: null });
chrome.runtime.onInstalled.addListener(zerarRodada);
chrome.runtime.onStartup.addListener(zerarRodada);
async function rodarTudo() {
  if (rodandoTudo) throw new Error('já há uma rodada em curso — se ela travou, recarregue a extensão (↻ em chrome://extensions)');
  rodandoTudo = true;
  const relato = [];
  const anotar = (p, x) => relato.push(`${p.nome}: ${x && x.erro ? x.erro
    : `${(x && x.ok) || 0} doc(s)${x && x.falhas && x.falhas.length ? `, ${x.falhas.length} falha(s)` : ''}`}`);
  try {
    await chrome.storage.local.set({ rodada_desde: Date.now() });
    for (const p of PORTAIS) {
      await chrome.storage.local.set({ rodada_andamento: `${p.nome}…` });
      let [aba] = await chrome.tabs.query({ url: p.padrao });
      if (!aba) {
        if (p.soSeAberto) { relato.push(`${p.nome}: sem aba aberta — abra, entre e rode de novo`); continue; }
        aba = await chrome.tabs.create({ url: p.url, active: false });
        await carregou(aba.id); await pausa(3000);
      }
      // portal sem sessão manda a aba para o login do gov.br (sso.acesso.gov.br),
      // onde a extensão não entra: é "entre e rode de novo", não erro
      const atual = await chrome.tabs.get(aba.id).catch(() => null);
      const host = (p.padrao.match(/^https:\/\/([^/]+)/) || [])[1];
      if (!atual || !atual.url || !atual.url.startsWith(`https://${host}/`)) {
        relato.push(`${p.nome}: a aba foi para o login — entre com o gov.br nela e rode de novo`);
        continue;
      }
      try {
        if (p.hc) anotar(p, await rodarHc(aba.id));
        else if (p.redesim) {
          await chrome.scripting.executeScript({ target: { tabId: aba.id }, files: ['regras.js', 'pagina.js', 'redesim-ponte.js'] });
          await chrome.scripting.executeScript({ target: { tabId: aba.id }, world: 'MAIN', files: ['redesim.js'] });
          await chrome.tabs.update(aba.id, { active: true });
          relato.push(`${p.nome}: aberta — falta o seu clique em PESQUISAR`);
        } else {
          await chrome.scripting.executeScript({ target: { tabId: aba.id }, files: ['regras.js', 'pagina.js', p.arquivo] });
          // dispara e ACOMPANHA em consultas curtas: uma chamada que fica minutos
          // pendente deixa o service worker ser encerrado pelo Chrome no meio da
          // rodada (foi o que prendeu o popup em "rodando: Meu INSS…", 11.10.2026)
          await chrome.scripting.executeScript({ target: { tabId: aba.id }, func: () => {
            window.__dossieResultado = null;
            Promise.resolve().then(() => window.dossieRodar())
              .then(r => { window.__dossieResultado = r || { ok: 0 }; }, e => { window.__dossieResultado = { erro: String(e && e.message || e) }; });
          } });
          let x = null;
          for (let t = 0; t < 40 * 60000 && !x; t += 3000) {       // teto de 40 min por portal
            await pausa(3000);
            await chrome.storage.local.set({ rodada_andamento: `${p.nome}… (${Math.round(t / 60000)} min)` });
            const [r] = await chrome.scripting.executeScript({ target: { tabId: aba.id }, func: () => window.__dossieResultado })
              .catch(() => [null]);                                  // aba fechou ou navegou: segue esperando
            x = r && r.result;
          }
          anotar(p, x || { erro: 'não terminou em 40 min — veja a faixa na aba' });
        }
      } catch (e) { relato.push(`${p.nome}: ${e.message || e}`); }
    }
  } catch (e) {
    relato.push(`a rodada parou: ${e.message || e}`);       // erro fora do laço (abas, storage): fica visível no popup
  } finally {
    rodandoTudo = false;
    await chrome.storage.local.set({ ultima_rodada: { em: new Date().toISOString(), relato }, rodada_andamento: null, rodada_desde: null });
  }
}

// o PDF da consulta da Redesim já foi capturado na página (redesim.js): o
// download que o portal dispara em seguida é o mesmo arquivo em dobro
chrome.downloads.onCreated.addListener(d => {
  if (/^blob:https:\/\/consultacnpj\.redesim\.gov\.br\//.test(d.url || ''))
    chrome.downloads.cancel(d.id).then(() => chrome.downloads.erase({ id: d.id })).catch(() => {});
});

// ── PORTAL DA TRANSPARÊNCIA ──────────────────────────────────────────────
// Sem login: a API de dados abertos (chave gratuita, cabeçalho chave-api-dados)
// devolve os pagamentos de BPC, Bolsa Família, Auxílio Brasil/Emergencial,
// Garantia-Safra e Seguro-Defeso por CPF ou NIS. Roda no fim do CadÚnico, para
// cada integrante da família (o CadÚnico dá CPF e NIS de todos). A API aceita
// ~90 chamadas/min: pausa entre uma e outra, e para no 429.
const TRANSP = 'https://api.portaldatransparencia.gov.br/api-de-dados/';
const TRANSP_ENDPOINTS = {
  bpc: 'bpc-por-cpf-ou-nis?codigo=', novo_bolsa_familia: 'novo-bolsa-familia-sacado-por-cpf-ou-nis?codigo=',
  bolsa_familia: 'bolsa-familia-sacado-por-cpf-ou-nis?codigo=', auxilio_brasil: 'auxilio-brasil-sacado-por-cpf-ou-nis?codigo=',
  auxilio_emergencial: 'auxilio-emergencial-por-cpf-ou-nis?codigoBeneficiario=', safra: 'safra-codigo-por-cpf-ou-nis?codigo=',
  seguro_defeso: 'seguro-defeso-codigo?codigo=',
};
async function transparencia(m) {
  const { chave_transparencia: chave } = await chrome.storage.local.get(['chave_transparencia']);
  if (!chave) return { crm: 'sem chave', aviso: 'Portal da Transparência: cole a chave da API em ⚙ para consultar os integrantes' };
  let pessoas = (m.pessoas || []).filter(p => p.cpf || p.nis);
  // sem login (botão do popup): só o CPF/NIS digitado; nome e integrantes vêm da ficha do CRM, se houver
  if (!pessoas.length && m.cpf) {
    const c = await CRM.clienteDoCpf(m.cpf).catch(() => null);
    m.nome = m.nome || (c && c.nome) || '';
    pessoas = [{ nome: m.nome || 'Cliente', cpf: /^\d{11}$/.test(m.cpf) ? m.cpf : null, nis: /^\d{11}$/.test(m.cpf) ? null : m.cpf }];
    for (const x of (c && c.membros) || []) if (x.cpf !== m.cpf && (x.cpf || x.nis)) pessoas.push({ nome: x.nome, cpf: x.cpf, nis: x.nis });
  }
  const resultados = {};
  let parou = null;
  for (const p of pessoas) {
    const codigo = p.cpf || p.nis;
    resultados[codigo] = { pessoa: { nome: p.nome, cpf: p.cpf || null, nis: p.nis || null }, programas: {} };
    for (const [k, ep] of Object.entries(TRANSP_ENDPOINTS)) {
      if (parou) break;
      const itens = [];
      for (let pagina = 1; pagina <= 30; pagina++) {
        const r = await fetch(`${TRANSP}${ep}${encodeURIComponent(codigo)}&pagina=${pagina}`, { headers: { 'chave-api-dados': chave, Accept: 'application/json' } }).catch(() => null);
        await pausa(700);
        if (!r) { resultados[codigo].erro = 'sem resposta'; break; }
        if (r.status === 429) { parou = 'a API limitou as consultas (429) — rode de novo em alguns minutos'; break; }
        if (r.status === 401 || r.status === 403) { parou = `a chave da API foi recusada (${r.status}) — confira em ⚙`; break; }
        if (!r.ok) { resultados[codigo].erro = `${k}: HTTP ${r.status}`; break; }
        const j = await r.json().catch(() => []);
        const lista = Array.isArray(j) ? j : [];
        itens.push(...lista);
        if (lista.length < 15) break;                         // a API pagina de 15 em 15
      }
      if (itens.length) resultados[codigo].programas[k] = itens;
    }
    if (parou) { resultados[codigo].erro = parou; break; }
  }
  const t = R.textoTransparencia(pessoas, resultados);
  const arquivo = { cpf: m.cpf, nome: m.nome, fonte: 'Transparencia', arquivo: 'Portal da Transparencia - beneficios por integrante.txt',
    mime: 'text/plain', b64: R.b64(new TextEncoder().encode(t.texto)) };
  const s = await salvar(arquivo).catch(e => ({ crm: String(e.message || e) }));
  const res = await CRM.guardarResumo({ cpf: m.cpf, portal: 'transparencia',
    resumo: { baixados: ['Portal da Transparencia - beneficios por integrante'], inexistentes: [], falhas: parou ? [parou] : [], pessoas: t.pessoas } })
    .catch(e => String(e.message || e));
  const comPagamento = t.pessoas.filter(p => p.programas.length).length;
  return { ok: true, crm: res, aviso: `Portal da Transparência: ${pessoas.length} integrante(s) consultado(s), ${comPagamento} com pagamento${parou ? ' — ' + parou : ''}${s.crm && s.crm !== 'ok' ? ` (CRM: ${s.crm})` : ''}` };
}

// o resumo da rodada (o que veio, o que o portal diz que não existe, o que
// falhou) vai para clientes.dossie — é o que deixa a ficha dizer "sem CTC"
const resumo = m => CRM.guardarResumo({ cpf: m.cpf, portal: m.portal,
  resumo: Object.assign({ baixados: m.baixados || [], inexistentes: m.inexistentes || [], falhas: m.falhas || [] },
    m.cadastro ? { cadastro: m.cadastro } : {},          // Meu INSS: os dados cadastrais do CNIS, nas colunas do CRM
    m.familia ? { familia: m.familia, familias: m.familias || [m.familia] } : {}) })   // CadÚnico: a família (renda per capita, integrantes)
  .then(crm => ({ ok: true, crm }), e => ({ ok: false, crm: String(e.message || e) }));

chrome.runtime.onMessage.addListener((m, _de, responder) => {
  if (!m || m.tipo === 'blob') return false;                // é para o offscreen
  if (m.tipo === 'hc') { rodarHc(m.tabId).catch(() => {}); responder({ ok: true }); return false; }
  if (m.tipo === 'tudo') {
    // responde na hora (a rodada leva minutos); o que falha ANTES de começar volta ao popup
    try { rodarTudo().catch(e => chrome.storage.local.set({ ultima_rodada: { em: new Date().toISOString(), relato: [`a rodada não começou: ${e.message || e}`] } })); responder({ ok: true }); }
    catch (e) { responder({ erro: String(e.message || e) }); }
    return false;
  }
  const tarefa = m.tipo === 'salvar' ? salvar(m)
    : m.tipo === 'resumo' ? resumo(m)
    : m.tipo === 'abrir' ? abrirTudo()
    : m.tipo === 'transparencia' ? transparencia(m)
    : m.tipo === 'crm' && m.acao === 'entrar' ? CRM.entrar(m.email, m.senha).then(quem => ({ quem }))
    : m.tipo === 'crm' && m.acao === 'sair' ? CRM.sair().then(() => ({ ok: true }))
    : null;
  if (!tarefa) return false;
  tarefa.then(responder, e => responder({ erro: String(e.message || e) }));
  return true;
});
