#!/usr/bin/env node
// O robô dos recursos administrativos (CRPS / e-Recursos).
//
// Roda na mesma máquina da ponte do WhatsApp. A cada rodada:
//   1. lê o "crachá" do gov.br que o Paulo colou no CRM (tabela crps_segredo,
//      que só a service_role enxerga);
//   2. pega os casos que têm um número de recurso (casos.crps_nup);
//   3. consulta cada um no e-Recursos, DEVAGAR (o site não gosta de volume);
//   4. traduz o histórico e grava em casos.crps;
//   5. quando um andamento é NOVO, registra um comentário no caso (assinado
//      pelo Claude) para a equipe ver a novidade — só do que mudou.
//
// Se o crachá vencer, o robô não quebra: marca crps_estado='vencido' e para,
// e o CRM pede um crachá novo. Login não dá para automatizar (captcha).
//
// Uso:  cp .env.exemplo .env  &&  editar  &&  npm install  &&  node robo.js
//       (para rodar sozinho todo dia, agende no cron/Agendador de Tarefas)

const fs = require('fs');
const path = require('path');
const T = require('./traduzir');

// ── configuração (mesma leitura de .env da ponte) ─────────────────────────
for (const linha of (fs.existsSync(path.join(__dirname, '.env'))
    ? fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n') : [])) {
  const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const BASE = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const CHAVE = process.env.SUPABASE_SERVICE_KEY || '';
const CRPS = (process.env.CRPS_URL || 'https://consultaprocessos.inss.gov.br').replace(/\/$/, '');
const PAUSA = Number(process.env.CRPS_PAUSA_MS || 2500);   // entre consultas
const PROCURADOR = process.env.CRPS_PROCURADOR || 'PAULO ROBERTO TERCINI';
const REFORCAR = /^(1|sim|true)$/i.test(process.env.CRPS_REFORCAR || '');   // reconsultar o que já foi hoje
const HOJE_SP = new Date().toLocaleDateString('sv', { timeZone: 'America/Sao_Paulo' });

const log = (...a) => console.log(new Date().toLocaleString('pt-BR',
  { timeZone: 'America/Sao_Paulo' }), '·', ...a);
const espera = ms => new Promise(r => setTimeout(r, ms));
const agora = () => new Date().toISOString();

// ── Supabase por REST, sem SDK (igual à ponte) ────────────────────────────
async function sb(caminho, opts = {}) {
  const r = await fetch(BASE + caminho, {
    ...opts,
    headers: {
      apikey: CHAVE, Authorization: `Bearer ${CHAVE}`,
      'Content-Type': 'application/json', ...(opts.headers || {}),
    },
  });
  if (!r.ok) throw new Error(`${opts.method || 'GET'} ${caminho} -> ${r.status} ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
async function anotar(chave, valor) {
  await sb('/rest/v1/config_app', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ chave, valor }),
  });
}

// lê a validade escrita dentro do próprio token (JWT: exp em segundos)
function validadeToken(tok) {
  try {
    const p = (tok || '').split('.')[1];
    if (!p) return null;
    const j = JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return j.exp ? j.exp * 1000 : null;
  } catch (e) { return null; }
}
// um bloco já foi consultado HOJE? (para retomar sem refazer tudo)
function consultadoHoje(bloco) {
  return !!(bloco && bloco.consultado_em
    && new Date(bloco.consultado_em).toLocaleDateString('sv', { timeZone: 'America/Sao_Paulo' }) === HOJE_SP);
}

// candidatos de token: o crachá cru, ou um campo dentro dele se for JSON
function candidatosDeToken(bruto) {
  const c = [];
  if (!bruto) return c;
  c.push(bruto);
  try {
    const j = JSON.parse(bruto);
    for (const k of ['access_token', 'accessToken', 'token', 'id_token', 'jwt'])
      if (typeof j[k] === 'string' && !c.includes(j[k])) c.push(j[k]);
  } catch (e) { /* não era JSON */ }
  return c;
}

// consulta um processo na API do e-Recursos; devolve {status, json, dica}
// (dica = um pedaço da resposta, para entender por que falhou)
async function consultarCRPS(sistema, nup, token) {
  const ctrl = new AbortController();
  const relogio = setTimeout(() => ctrl.abort(), Number(process.env.CRPS_TIMEOUT_MS || 12000));
  try {
    const r = await fetch(`${CRPS}/api/v1/${sistema}/${nup}`, {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      redirect: 'manual', signal: ctrl.signal,
    });
    let json = null;
    const txt = await r.text().catch(() => '');
    if (r.status === 200) { try { json = JSON.parse(txt); } catch (e) { /* corpo estranho */ } }
    const dica = (txt || '').replace(/\s+/g, ' ').slice(0, 160);
    return { status: r.status, json, dica };
  } catch (e) {
    return { status: -1, json: null, dica: e.name === 'AbortError' ? 'demorou demais (timeout)' : e.message };
  } finally { clearTimeout(relogio); }
}

// registra na ficha o comentário de um andamento novo do CRPS
async function comentar(casoId, autorId, texto) {
  await sb('/rest/v1/andamentos', {
    method: 'POST', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ caso_id: casoId, autor_id: autorId, texto }),
  });
}

async function main() {
  if (!BASE || !CHAVE) {
    console.error('faltam SUPABASE_URL e SUPABASE_SERVICE_KEY (veja .env.exemplo)');
    process.exit(1);
  }
  log('robô CRPS acordou');

  // 1. o crачhá — só a service_role lê esta tabela
  const seg = await sb('/rest/v1/crps_segredo?select=cracha&id=eq.1').catch(() => null);
  const bruto = seg && seg[0] && seg[0].cracha;
  const tokens = candidatosDeToken(bruto);
  if (!tokens.length) {
    log('sem crachá — nada a fazer. Cole o crachá no CRM (⚙️ → Recurso CRPS).');
    await anotar('crps_estado', 'sem_cracha');
    return;
  }

  // 2. quem tem número de recurso para consultar. Um caso pode ter VÁRIOS
  // (crps_nups); crps_nup continua valendo como o número único antigo.
  const brutos = await sb('/rest/v1/casos?select=id,crps_nup,crps_nups,crps&fase=neq.encerrado')
    .catch(() => []);
  const casos = (brutos || []).map(k => ({ ...k, nups: numerosDe(k) })).filter(k => k.nups.length);
  if (!casos.length) { log('nenhum caso com número de recurso ainda.'); await anotar('crps_visto_em', agora()); return; }
  const totalNups = casos.reduce((s, k) => s + k.nups.length, 0);
  log(`${casos.length} caso(s), ${totalNups} recurso(s) a consultar`);

  // autor dos comentários = o Claude (a IA do escritório)
  const cols = await sb('/rest/v1/colaboradores?select=id,inicial&inicial=eq.C').catch(() => []);
  const autorIA = cols && cols[0] ? cols[0].id : (casos[0] && casos[0].autor_fallback) || null;

  // descobre qual token funciona, com o primeiro recurso
  let token = null, ultimo = null;
  for (const cand of tokens) {
    const r = await consultarCRPS('esisrec', casos[0].nups[0], cand); ultimo = r;
    if (r.status === 200) { token = cand; break; }
    await espera(1000);
  }
  if (!token) {
    log(`crachá não funcionou — o INSS respondeu HTTP ${ultimo ? ultimo.status : '?'}`
      + `${ultimo && ultimo.dica ? ` · ${ultimo.dica}` : ''}`);
    log('→ renove o crachá no CRM (⚙️ → Recurso CRPS) e rode de novo LOGO em seguida.');
    await anotar('crps_estado', 'vencido');
    await anotar('crps_visto_em', agora());
    return;
  }
  await anotar('crps_estado', 'ok');
  // avisa quanto tempo o crachá ainda tem — a sessão do gov.br dura pouco
  const exp = validadeToken(token);
  if (exp) {
    const min = Math.round((exp - Date.now()) / 60000);
    log(min > 0 ? `crachá válido por ~${min} min — vou consultar o máximo que der`
                : 'crachá já no limite — pode cair no meio; renove se parar cedo');
  }
  const faltam = casos.reduce((s, k) => s + k.nups.filter(n =>
    REFORCAR || !consultadoHoje(blocosPorNup(k.crps).get(n))).length, 0);
  log(`${faltam} recurso(s) ainda por consultar hoje${REFORCAR ? ' (reforçando tudo)' : ''}`);

  // 3+4+5. varre cada caso, cada um com um ou mais recursos.
  // Um 401/403 num processo isolado = você não é procurador DAQUELE (segue a
  // vida). Só desistimos do crachá se vierem VÁRIAS negativas seguidas — aí é
  // o crachá que morreu, não o processo.
  let ok = 0, novos = 0, erros = 0, semAcesso = 0, pulados = 0, seguidas = 0, vencido = false;
  for (const k of casos) {
    const antesPorNup = blocosPorNup(k.crps);   // o que já sabíamos, por número
    const blocos = [];
    let mexeu = false;
    for (const nup of k.nups) {
      const antes = antesPorNup.get(nup);
      // retomada: o que já consultamos hoje fica como está (o crачhá dura pouco)
      if (!REFORCAR && consultadoHoje(antes)) { blocos.push(antes); pulados++; continue; }

      let r = await consultarCRPS('esisrec', nup, token);
      // só tento o sistema antigo (recben) quando o novo diz "não encontrado"
      // (404, rápido). Se travou (-1) ou negou acesso (403), não insisto —
      // seria outro travamento à toa.
      if (r.status === 404) { await espera(800); const rb = await consultarCRPS('recben', nup, token);
        if (rb.status === 200) r = rb; }

      if (r.status === 200 && r.json) {
        mexeu = true; seguidas = 0;
        const novo = T.traduzirProcesso(r.json, { procurador: PROCURADOR });
        novo.consultado_em = agora();
        blocos.push(novo);
        if (antes && autorIA) {   // já conhecíamos: comenta só o que é NOVO
          const vistos = new Set((antes.eventos || []).map(T.chaveEvento));
          const frescos = novo.eventos
            .filter(e => !T.TIPOS_SILENCIOSOS.has(e.tipo) && !vistos.has(T.chaveEvento(e)))
            .reverse();
          for (const e of frescos) {
            const data = T.dataParaISO(e.data).slice(0, 10).split('-').reverse().join('/');
            await comentar(k.id, autorIA, `🖥 CRPS — ${e.icone} ${e.resumo}${data ? ` (${data})` : ''}`);
            novos++;
          }
        }
        log(`  ${nup}: ok${antes ? '' : ' (primeira carga)'}`);
      } else if (r.status === 401) {   // crачhá recusado: pode ter morrido
        seguidas++; semAcesso++;
        if (antes) blocos.push(antes);
        log(`  ${nup}: crachá recusado (HTTP 401)${r.dica ? ` · ${r.dica}` : ''}`);
        if (seguidas >= 4) { vencido = true; }   // 4 seguidas: o crachá caiu de vez
      } else if (r.status === 403) {   // você não é procurador DESTE — segue
        seguidas = 0; semAcesso++;
        if (antes) blocos.push(antes);
        log(`  ${nup}: sem acesso a este recurso (HTTP 403)`);
      } else {                         // timeout, 5xx, corpo estranho — segue
        seguidas = 0; erros++;
        if (antes) blocos.push(antes);
        log(`  ${nup}: sem dados (HTTP ${r.status})${r.dica ? ` · ${r.dica}` : ''}`);
      }
      await espera(PAUSA);
      if (vencido) break;
    }
    if (mexeu && blocos.length) {
      await sb(`/rest/v1/casos?id=eq.${k.id}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ crps: blocos }) });
      ok++;
    }
    if (vencido) { log('4 crachás recusados seguidos — a sessão caiu. Renove no CRM e rode de novo (ele retoma de onde parou).'); await anotar('crps_estado', 'vencido'); break; }
  }

  await anotar('crps_visto_em', agora());
  if (!vencido) await anotar('crps_sync_em', agora());
  log(`fim — ${ok} caso(s) atualizados, ${novos} andamento(s) novo(s), `
    + `${pulados} já feitos hoje, ${semAcesso} sem acesso, ${erros} sem dados`);
  if (vencido) log('↻ rode de novo depois de renovar o crachá — ele continua de onde parou.');
}

// os números de um caso: a lista crps_nups, ou o número único antigo
function numerosDe(k) {
  const arr = Array.isArray(k.crps_nups) ? k.crps_nups : [];
  const nups = arr.map(n => String(n).replace(/\D/g, '')).filter(Boolean);
  const unico = (k.crps_nup || '').replace(/\D/g, '');
  if (unico && !nups.includes(unico)) nups.push(unico);
  return [...new Set(nups)];
}
// o que já tínhamos, indexado por número (crps é lista de blocos; aceita o
// formato antigo de um objeto só)
function blocosPorNup(crps) {
  const m = new Map();
  const lista = Array.isArray(crps) ? crps : (crps ? [crps] : []);
  for (const b of lista) if (b && b.nup) m.set(String(b.nup).replace(/\D/g, ''), b);
  return m;
}

module.exports = { candidatosDeToken, numerosDe, blocosPorNup, validadeToken, consultadoHoje };
if (require.main === module) main().catch(e => { console.error('robô CRPS falhou:', e.message); process.exit(1); });
