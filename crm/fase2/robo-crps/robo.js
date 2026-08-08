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
const PAUSA = Number(process.env.CRPS_PAUSA_MS || 6000);   // entre consultas
const PROCURADOR = process.env.CRPS_PROCURADOR || 'PAULO ROBERTO TERCINI';
if (!BASE || !CHAVE) {
  console.error('faltam SUPABASE_URL e SUPABASE_SERVICE_KEY (veja .env.exemplo)');
  process.exit(1);
}

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

// consulta um processo na API do e-Recursos; devolve {status, json}
async function consultarCRPS(sistema, nup, token) {
  const r = await fetch(`${CRPS}/api/v1/${sistema}/${nup}`, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
  });
  let json = null;
  const txt = await r.text();
  if (r.status === 200) { try { json = JSON.parse(txt); } catch (e) { /* corpo estranho */ } }
  return { status: r.status, json };
}

// registra na ficha o comentário de um andamento novo do CRPS
async function comentar(casoId, autorId, texto) {
  await sb('/rest/v1/andamentos', {
    method: 'POST', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ caso_id: casoId, autor_id: autorId, texto }),
  });
}

async function main() {
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

  // 2. quem tem número de recurso para consultar
  const casos = await sb('/rest/v1/casos?select=id,crps_nup,crps&crps_nup=not.is.null&fase=neq.encerrado')
    .catch(() => []);
  if (!casos || !casos.length) { log('nenhum caso com número de recurso ainda.'); await anotar('crps_visto_em', agora()); return; }
  log(`${casos.length} caso(s) com recurso a consultar`);

  // autor dos comentários = o Claude (a IA do escritório)
  const cols = await sb('/rest/v1/colaboradores?select=id,inicial&inicial=eq.C').catch(() => []);
  const autorIA = cols && cols[0] ? cols[0].id : (casos[0] && casos[0].autor_fallback) || null;

  // descobre qual token funciona, com o primeiro processo
  let token = null;
  for (const cand of tokens) {
    const r = await consultarCRPS('esisrec', casos[0].crps_nup.replace(/\D/g, ''), cand);
    if (r.status === 200) { token = cand; break; }
    if (r.status === 401) { break; }   // crачhá morto: não adianta outro
    await espera(1500);
  }
  if (!token) {
    log('crachá vencido ou inválido — pedindo um novo no CRM.');
    await anotar('crps_estado', 'vencido');
    await anotar('crps_visto_em', agora());
    return;
  }
  await anotar('crps_estado', 'ok');

  // 3+4+5. varre cada caso
  let ok = 0, novos = 0, erros = 0;
  for (const k of casos) {
    const nup = (k.crps_nup || '').replace(/\D/g, '');
    if (!nup) continue;
    let r = await consultarCRPS('esisrec', nup, token);
    if (r.status !== 200) { await espera(1500); r = await consultarCRPS('recben', nup, token); }
    if (r.status === 401) {   // crачhá caiu no meio da rodada
      log('crachá caiu durante a varredura — parando e pedindo um novo.');
      await anotar('crps_estado', 'vencido');
      break;
    }
    if (r.status !== 200 || !r.json) {
      log(`  ${nup}: sem dados (HTTP ${r.status})`); erros++;
      await espera(PAUSA); continue;
    }

    const novo = T.traduzirProcesso(r.json, { procurador: PROCURADOR });
    const antes = k.crps && Array.isArray(k.crps.eventos) ? k.crps.eventos : null;
    const primeira = !antes;   // primeira carga: só preenche, sem inundar de comentários

    await sb(`/rest/v1/casos?id=eq.${k.id}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ crps: { ...novo, consultado_em: agora() } }),
    });
    ok++;

    if (!primeira && autorIA) {
      const vistos = new Set(antes.map(T.chaveEvento));
      // novidades reais (fora o ruído), do mais antigo ao mais novo
      const frescos = novo.eventos
        .filter(e => !T.TIPOS_SILENCIOSOS.has(e.tipo) && !vistos.has(T.chaveEvento(e)))
        .reverse();
      for (const e of frescos) {
        const data = T.dataParaISO(e.data).slice(0, 10).split('-').reverse().join('/');
        await comentar(k.id, autorIA, `🖥 CRPS — ${e.icone} ${e.resumo}${data ? ` (${data})` : ''}`);
        novos++;
      }
    }
    log(`  ${nup}: ok${primeira ? ' (primeira carga)' : ''}`);
    await espera(PAUSA);
  }

  await anotar('crps_visto_em', agora());
  await anotar('crps_sync_em', agora());
  log(`fim — ${ok} consultados, ${novos} andamento(s) novo(s), ${erros} sem dados`);
}

module.exports = { candidatosDeToken };
if (require.main === module) main().catch(e => { console.error('robô CRPS falhou:', e.message); process.exit(1); });
