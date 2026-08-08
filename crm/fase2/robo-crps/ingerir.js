#!/usr/bin/env node
// Plano B, parte 2: grava no CRM o que o navegador coletou.
//
// Lê o crps_coletado.json (baixado pelo coletor), traduz cada processo com a
// MESMA lógica do robô e escreve casos.crps, comentando na ficha só o que é
// novo. Usa a service_role — roda na sua máquina, nunca no navegador.
//
// Uso:  node ingerir.js crps_coletado.json

const fs = require('fs');
const path = require('path');
const T = require('./traduzir');

for (const linha of (fs.existsSync(path.join(__dirname, '.env'))
    ? fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n') : [])) {
  const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const BASE = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const CHAVE = process.env.SUPABASE_SERVICE_KEY || '';
const PROCURADOR = process.env.CRPS_PROCURADOR || 'PAULO ROBERTO TERCINI';
const agora = () => new Date().toISOString();
const log = (...a) => console.log(...a);

async function sb(caminho, opts = {}) {
  const r = await fetch(BASE + caminho, {
    ...opts,
    headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}`,
      'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (!r.ok) throw new Error(`${opts.method || 'GET'} ${caminho} -> ${r.status} ${await r.text()}`);
  const t = await r.text(); return t ? JSON.parse(t) : null;
}
function numerosDe(k) {
  const arr = Array.isArray(k.crps_nups) ? k.crps_nups : [];
  const nups = arr.map(n => String(n).replace(/\D/g, '')).filter(Boolean);
  const unico = (k.crps_nup || '').replace(/\D/g, '');
  if (unico && !nups.includes(unico)) nups.push(unico);
  return [...new Set(nups)];
}
function blocosPorNup(crps) {
  const m = new Map();
  const lista = Array.isArray(crps) ? crps : (crps ? [crps] : []);
  for (const b of lista) if (b && b.nup) m.set(String(b.nup).replace(/\D/g, ''), b);
  return m;
}

// lê os itens coletados: aceita {itens:{nup:{status,body}}} e também o formato
// da sonda antiga ({itens:{"nup_esisrec":{status,body}}})
function processosColetados(dados) {
  const porNup = new Map();
  for (const [chave, val] of Object.entries(dados.itens || {})) {
    if (!val || val.status !== 200 || !val.body) continue;
    const nup = chave.replace(/\D/g, '').slice(0, 25);
    let json = null; try { json = JSON.parse(val.body); } catch (e) { continue; }
    if (json && json.eventos) porNup.set(nup, json);   // fica o primeiro que der certo
    else if (json && json.proc && !porNup.has(nup)) porNup.set(nup, json);
  }
  return porNup;
}

async function main() {
  const arq = process.argv[2];
  if (!arq || !fs.existsSync(arq)) { console.log('Uso: node ingerir.js crps_coletado.json'); process.exit(1); }
  if (!BASE || !CHAVE) { console.error('faltam SUPABASE_URL e SUPABASE_SERVICE_KEY no .env'); process.exit(1); }

  const dados = JSON.parse(fs.readFileSync(arq, 'utf8'));
  const coletados = processosColetados(dados);
  log(`${coletados.size} processo(s) com dados no arquivo.`);
  if (!coletados.size) { log('Nada para gravar (nenhum veio com HTTP 200).'); return; }

  const casos = await sb('/rest/v1/casos?select=id,crps_nup,crps_nups,crps&fase=neq.encerrado');
  const cols = await sb('/rest/v1/colaboradores?select=id,inicial&inicial=eq.C').catch(() => []);
  const autorIA = cols && cols[0] ? cols[0].id : null;

  // de cada número, o caso a que pertence
  const casoDoNup = new Map();
  for (const k of casos) for (const nup of numerosDe(k)) casoDoNup.set(nup, k);

  let ok = 0, novos = 0, semCaso = 0;
  // agrupa os processos coletados por caso
  const porCaso = new Map();
  for (const [nup, json] of coletados) {
    const k = casoDoNup.get(nup);
    if (!k) { semCaso++; log(`  ${nup}: coletado, mas não achei o caso no CRM (vincule na ficha)`); continue; }
    if (!porCaso.has(k.id)) porCaso.set(k.id, { caso: k, novos: new Map() });
    porCaso.get(k.id).novos.set(nup, json);
  }

  for (const { caso, novos: novosDoCaso } of porCaso.values()) {
    const antesPorNup = blocosPorNup(caso.crps);
    const finais = new Map(antesPorNup);   // parte do que já havia, sobrescreve o novo
    for (const [nup, json] of novosDoCaso) {
      const bloco = T.traduzirProcesso(json, { procurador: PROCURADOR });
      bloco.consultado_em = agora();
      const antes = antesPorNup.get(nup);
      finais.set(nup, bloco);
      if (antes && autorIA) {   // já conhecíamos: comenta só a novidade
        const vistos = new Set((antes.eventos || []).map(T.chaveEvento));
        const frescos = bloco.eventos
          .filter(e => !T.TIPOS_SILENCIOSOS.has(e.tipo) && !vistos.has(T.chaveEvento(e))).reverse();
        for (const e of frescos) {
          const data = T.dataParaISO(e.data).slice(0, 10).split('-').reverse().join('/');
          await sb('/rest/v1/andamentos', { method: 'POST', headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ caso_id: caso.id, autor_id: autorIA,
              texto: `🖥 CRPS — ${e.icone} ${e.resumo}${data ? ` (${data})` : ''}` }) });
          novos++;
        }
      }
    }
    await sb(`/rest/v1/casos?id=eq.${caso.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ crps: [...finais.values()] }) });
    ok++;
  }
  // marca a última sincronização, para o CRM mostrar
  await sb('/rest/v1/config_app', { method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ chave: 'crps_sync_em', valor: agora() }) });
  log(`\n✔ ${ok} caso(s) atualizados, ${novos} andamento(s) novo(s), ${semCaso} sem caso no CRM.`);
  log('Abra o CRM (recarregue a página) e veja a aba 🖥 Recurso (CRPS) das fichas.');
}

module.exports = { processosColetados, numerosDe, blocosPorNup };
if (require.main === module) main().catch(e => { console.error('ingestão falhou:', e.message); process.exit(1); });
