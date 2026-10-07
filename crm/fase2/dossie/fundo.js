// DOSSIÊ · service worker: recebe cada PDF dos coletores e grava em dois
// lugares — Downloads/Dossie/<Nome CPF>/<fonte>/ e o CRM.
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

async function salvar(m) {
  const fonte = String(m.fonte || 'Outros').split('/').map(R.nomeSeguro).join('/');
  const local = `${R.pastaCliente(m.nome, m.cpf)}/${fonte}/${m.arquivo}`;
  const url = await urlDoBlob(m.b64);
  await chrome.downloads.download({ url, filename: local, conflictAction: 'overwrite', saveAs: false });

  let crm;
  try {
    const bytes = Uint8Array.from(atob(m.b64), c => c.charCodeAt(0));
    const caminho = `dossie/${m.cpf}/${fonte.split('/').map(R.slug).join('/')}/${R.slug(m.arquivo)}`;
    crm = await CRM.guardarNoCrm({ cpf: m.cpf, caminho, nome: `${fonte} · ${m.arquivo}`, bytes });
  } catch (e) { crm = String(e.message || e); }
  return { ok: true, crm };
}

chrome.runtime.onMessage.addListener((m, _de, responder) => {
  if (!m || m.tipo === 'blob') return false;                // é para o offscreen
  const tarefa = m.tipo === 'salvar' ? salvar(m)
    : m.tipo === 'crm' && m.acao === 'entrar' ? CRM.entrar(m.email, m.senha).then(quem => ({ quem }))
    : m.tipo === 'crm' && m.acao === 'sair' ? CRM.sair().then(() => ({ ok: true }))
    : null;
  if (!tarefa) return false;
  tarefa.then(responder, e => responder({ erro: String(e.message || e) }));
  return true;
});
