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

export async function config() {
  const c = await chrome.storage.local.get(['url', 'chave']);
  if (!c.url || !c.chave) throw new Error('Configure o endereço do CRM na extensão (⚙)');
  return { url: String(c.url).replace(/\/$/, ''), chave: c.chave };
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
  if (!r.ok) throw new Error(
    r.status === 400 || r.status === 401 ? 'e-mail ou senha não conferem'
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
  const { refresh } = await chrome.storage.local.get(['refresh']);
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

// uma coleta = uma linha na fila. O CRM decide o que fazer com ela.
export async function enviar(fonte, dados) {
  const { url } = await config();
  const r = await fetch(`${url}/rest/v1/coletas`, {
    method: 'POST',
    headers: { ...await cabecalhos(), Prefer: 'return=minimal' },
    body: JSON.stringify({ fonte, dados }),
  });
  if (!r.ok) throw new Error(`o CRM recusou (${r.status}): ${(await r.text()).slice(0, 120)}`);
  return true;
}

// Os processos que o CRM quer que sejam consultados no e-Recursos.
//
// A LISTA A CONSULTAR é `crps_nups` (o número que a ficha guarda); `crps` é o
// RESULTADO da última consulta. Pedir o resultado — como esta função fazia —
// devolvia vazio justamente na primeira vez, que é quando a extensão serve.
// Devolve TAMBÉM quantas fichas foram lidas. Sem esse número, "nenhum recurso
// cadastrado" e "não estou enxergando nada" viram a mesma frase — e foi
// exatamente aí que a extensão passou duas rodadas dizendo a coisa errada com
// toda a convicção.
export async function nups() {
  const { url } = await config();
  const cab = await cabecalhos();
  // `arquivados` diz quais recursos o escritório marcou 🗄 no CRM — é o que
  // permite ao coletor pular os que não movimentam mais. Banco antigo sem a
  // coluna não derruba a coleta: repete a consulta sem ela.
  let r = await fetch(
    `${url}/rest/v1/casos?select=crps_nups,crps_nup,arquivados&encerrado_em=is.null&limit=5000`,
    { headers: cab });
  if (!r.ok) r = await fetch(
    `${url}/rest/v1/casos?select=crps_nups,crps_nup&encerrado_em=is.null&limit=5000`,
    { headers: cab });
  if (!r.ok) throw new Error(`não consegui ler os recursos do CRM (${r.status})`);
  const linhas = await r.json();
  const fora = new Set(), arq = new Set();
  for (const l of linhas)
    for (const n of [...(Array.isArray(l.crps_nups) ? l.crps_nups : []), l.crps_nup]) {
      const d = String(n == null ? '' : n).replace(/\D/g, '');
      if (d.length >= 15 && d.length <= 25) {
        fora.add(d);
        if ((l.arquivados || {})['crps:' + d]) arq.add(d);
      }
    }
  return { nups: [...fora], arquivados: [...arq], fichas: linhas.length };
}

// o que o popup mostra no "testar conexão": responde de uma vez quem está
// logado, quanto o banco devolve e quanto disso tem número de recurso
export async function diagnostico() {
  const { quem } = await chrome.storage.local.get(['quem']);
  const { nups: lista, fichas } = await nups();
  return { quem: quem || null, fichas, recursos: lista.length };
}
