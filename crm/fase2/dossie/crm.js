// CÓPIA de ../extensao/crm-api.js (linhas 1-105: config, login, crachá). O Chrome não carrega
// arquivo de fora da pasta da extensão. Mudou lá? Copie de novo.
//
// TUDO O QUE FALA COM O CRM MORA AQUI, e roda no service worker da extensão.
//
// Duas razões, e as duas custaram uma rodada de erro:
//
// 1. O BANCO NÃO DEIXA LER NADA COM A CHAVE ANÔNIMA. A tabela `casos` tem RLS
//    com política só para quem entrou (`to authenticated`). Com a chave
//    anônima o PostgREST responde 200 com lista VAZIA — não um erro. Foi por
//    isso que a extensão anunciou "nenhuma ficha tem número de recurso" com o
//    escritório inteiro cadastrado: ela não estava vendo nada, e nada e vazio
//    são indistinguíveis daquele lado. A extensão precisa entrar como você.
//
// 2. Requisição a outro domínio pertence ao service worker, não à página do
//    portal: aqui valem as host_permissions da extensão e nenhuma política de
//    segurança do site atrapalha.
//
// A SENHA NUNCA É GUARDADA. O login acontece uma vez, na tela de configuração;
// daqui em diante vive só o refresh_token, que o Supabase troca a cada uso e
// que você pode revogar quando quiser.

// endereço e chave vão em CABEÇALHO HTTP, que só aceita ASCII: um espaço
// invisível ou um "…" colado junto da chave derrubava o fetch inteiro com
// "String contains non ISO-8859-1 code point". Tudo que não é ASCII visível
// cai fora aqui — a chave e o endereço legítimos nunca têm nada disso.
export const soAscii = s => String(s || '').replace(/[^!-~]/g, '');

export async function config() {
  const c = await chrome.storage.local.get(['url', 'chave']);
  const url = soAscii(c.url).replace(/\/$/, ''), chave = soAscii(c.chave);
  if (!url || !chave) throw new Error('Configure o endereço do CRM na extensão (⚙)');
  return { url, chave };
}

let acesso = null;          // { token, ate } — vale ~1h; uma renovação por rodada basta

// login de verdade, feito uma única vez na tela de configuração
export async function entrar(email, senha) {
  const { url, chave } = await config();
  const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: chave, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: String(email || '').trim(), password: senha || '' }),
  });
  const j = await r.json().catch(() => ({}));
  // 401 "Invalid API key" é a CHAVE do Supabase errada, não a senha — medido
  // em 15.09: senha errada é 400 invalid_credentials; chave errada é 401
  if (!r.ok) throw new Error(
    /api key/i.test(j.message || j.msg || '') || r.status === 401
      ? 'a chave do Supabase não confere — cole de novo em ⚙ (é a "chave anônima" das Configurações do CRM)'
    : r.status === 400 ? 'e-mail ou senha não conferem'
    : j.error_description || j.msg || `falha no login (${r.status})`);
  const quem = (j.user && j.user.email) || String(email || '').trim();
  await chrome.storage.local.set({ refresh: j.refresh_token, quem });
  acesso = { token: j.access_token, ate: Date.now() + (j.expires_in || 3600) * 1000 };
  return quem;
}

export async function sair() {
  acesso = null;
  await chrome.storage.local.remove(['refresh', 'quem']);
}

export async function cracha() {
  if (acesso && acesso.ate > Date.now() + 60000) return acesso.token;
  const { url, chave } = await config();
  const refresh = soAscii((await chrome.storage.local.get(['refresh'])).refresh);
  if (!refresh) throw new Error('entre no CRM pela extensão (⚙) — sem isso o banco não devolve nada');
  const r = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: chave, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!r.ok) {
    acesso = null;
    // só apaga o crachá quando o servidor DIZ que ele não vale; queda de rede
    // não pode custar o login
    if (r.status === 400 || r.status === 401) await chrome.storage.local.remove(['refresh']);
    throw new Error(r.status === 400 || r.status === 401
      ? 'a sessão do CRM venceu — entre de novo em ⚙ configurar'
      : `não consegui renovar a sessão do CRM (${r.status})`);
  }
  const j = await r.json();
  if (j.refresh_token) await chrome.storage.local.set({ refresh: j.refresh_token });
  acesso = { token: j.access_token, ate: Date.now() + (j.expires_in || 3600) * 1000 };
  return j.access_token;
}

async function cabecalhos() {
  const { chave } = await config();
  return { apikey: chave, Authorization: 'Bearer ' + await cracha(),
           'Content-Type': 'application/json' };
}

// "JWT issued at future" (PGRST303): o relógio do autenticador do Supabase
// corre segundos À FRENTE do relógio do banco, e o crachá recém-renovado
// nasce "no futuro". Passa sozinho — esperar alguns segundos resolve. Sem
// esta paciência, uma coleta inteira do PJe era jogada fora por causa disso.
async function fetchTeimoso(url, opts) {
  for (let tent = 0; ; tent++) {
    const r = await fetch(url, opts);
    if (r.status !== 401 || tent >= 2) return r;
    const texto = await r.clone().text();
    if (!/PGRST303|issued at future/i.test(texto)) return r;
    await new Promise(res => setTimeout(res, 4000 * (tent + 1)));
  }
}

// ── DOSSIÊ ───────────────────────────────────────────────────────────────
// O PDF sobe ao bucket privado "anexos" e vira uma linha em `anexos` presa ao
// CLIENTE (achado pelo CPF), com origem 'dossie' — é o que o põe na ficha.
// Cliente que não está no CRM: o arquivo fica só na pasta local.
const clientePorCpf = new Map();

async function idDoCliente(cpf) {
  if (clientePorCpf.has(cpf)) return clientePorCpf.get(cpf);
  const { url } = await config();
  const r = await fetchTeimoso(`${url}/rest/v1/clientes?select=id&cpf=eq.${cpf}&limit=1`, { headers: await cabecalhos() });
  if (!r.ok) throw new Error(`CRM recusou a busca do cliente (${r.status})`);
  const id = ((await r.json())[0] || {}).id || null;
  clientePorCpf.set(cpf, id);
  return id;
}

// devolve 'ok' | 'sem login' | 'cliente fora do CRM'
export async function guardarNoCrm({ cpf, caminho, nome, bytes }) {
  const st = await chrome.storage.local.get(['refresh', 'url']);
  if (!st.refresh || !st.url) return 'sem login';
  const clienteId = await idDoCliente(cpf);
  if (!clienteId) return 'cliente fora do CRM';
  const { url } = await config();
  const cab = await cabecalhos();
  // x-upsert: rodar o dossiê de novo substitui o PDF (o CNIS muda de um mês para outro)
  const up = await fetchTeimoso(`${url}/storage/v1/object/anexos/${caminho}`, { method: 'POST', body: bytes,
    headers: { apikey: cab.apikey, Authorization: cab.Authorization, 'Content-Type': 'application/pdf', 'x-upsert': 'true' } });
  if (!up.ok) throw new Error(`upload recusado (${up.status})`);
  const ln = await fetchTeimoso(`${url}/rest/v1/anexos?on_conflict=caminho`, { method: 'POST',
    headers: Object.assign({}, cab, { Prefer: 'resolution=ignore-duplicates,return=minimal' }),
    body: JSON.stringify({ cliente_id: clienteId, nome, caminho, tipo: 'application/pdf', tamanho: bytes.length, origem: 'dossie' }) });
  if (!ln.ok) throw new Error(`anexo recusado (${ln.status})`);
  return 'ok';
}
