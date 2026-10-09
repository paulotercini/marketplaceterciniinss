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
    crm = await CRM.guardarNoCrm({ cpf: m.cpf, caminho, nome: `${fonte} · ${m.arquivo}`, bytes });
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
async function rodarHc(tabId) {
  const st = await chrome.storage.local.get(['cliente']);
  const info = await noHc(tabId, 'info', st.cliente || null);
  if (!info || info.erro) { await noHc(tabId, 'fim', (info && info.erro) || 'não consegui ler o HC'); return; }
  const { cliente, links } = info;
  let ok = 0; const falhas = [], inexistentes = [];
  for (const [tela, rotulo] of [['exames', 'exames'], ['internacoes', 'internações'], ['relatorios', 'relatórios']]) {
    if (!links[tela]) { falhas.push(`${rotulo}: link não encontrado no menu`); continue; }
    const pronto = carregou(tabId);
    await chrome.tabs.update(tabId, { url: links[tela] });
    await pronto; await pausa(2500);
    let r = await noHc(tabId, tela);
    if (r && r.recarregar) {                    // filtro "Exibir tudo" dos exames: a página se recarrega
      await carregou(tabId); await pausa(2500);
      r = await noHc(tabId, tela);
    }
    if (!r) { falhas.push(`${rotulo}: a tela não respondeu`); continue; }
    falhas.push(...r.falhas.map(f => `${rotulo} · ${f}`));
    inexistentes.push(...r.inexistentes.map(f => `${rotulo} · ${f}`));
    for (const a of r.arquivos || []) {
      try { await salvar({ cpf: cliente.cpf, nome: cliente.nome, ...a }); ok++; }
      catch (e) { falhas.push(`${a.arquivo}: ${e.message || e}`); }
    }
  }
  // falha primeiro: é o que pede ação, e não pode sumir atrás da lista de "sem resultado"
  await noHc(tabId, 'fim', `${ok} documento(s) do HC`
    + (falhas.length ? `\n${falhas.length} falharam:\n• ${falhas.slice(0, 6).join('\n• ')}` : '')
    + (inexistentes.length ? `\n${inexistentes.length} sem resultado no HC (imagem sem laudo ainda):\n• ${inexistentes.slice(0, 4).join('\n• ')}`
      + (inexistentes.length > 4 ? `\n• … e mais ${inexistentes.length - 4}` : '') : ''));
}

chrome.runtime.onMessage.addListener((m, _de, responder) => {
  if (!m || m.tipo === 'blob') return false;                // é para o offscreen
  if (m.tipo === 'hc') { rodarHc(m.tabId).catch(() => {}); responder({ ok: true }); return false; }
  const tarefa = m.tipo === 'salvar' ? salvar(m)
    : m.tipo === 'crm' && m.acao === 'entrar' ? CRM.entrar(m.email, m.senha).then(quem => ({ quem }))
    : m.tipo === 'crm' && m.acao === 'sair' ? CRM.sair().then(() => ({ ok: true }))
    : null;
  if (!tarefa) return false;
  tarefa.then(responder, e => responder({ erro: String(e.message || e) }));
  return true;
});
