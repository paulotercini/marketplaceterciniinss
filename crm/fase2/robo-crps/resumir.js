#!/usr/bin/env node
// Nível 3: lê o PDF do acórdão guardado no CRM e escreve, em duas ou três
// linhas, O QUE FOI DECIDIDO — para qualquer pessoa da equipe entender sem
// abrir o arquivo.
//
// Regras que valem mais que a completude do resumo:
//   1. Só o DISPOSITIVO (a parte que decide). A fundamentação não entra.
//   2. Verbos fechados (Reconheceu / Não reconheceu / Determinou / ...) e
//      datas em DD/MM/AAAA. Nada de "entendeu que", "considerou".
//   3. Na dúvida, cala. Buraco é melhor que erro: alguém age em cima disso.
//   4. Nada de dado médico. Doença, CID e laudo não viram texto público —
//      a mesma barreira do is_internal() no extrator do To Do.
//
// Uso:
//   node resumir.js              → modo SECO: mostra e grava resumos_para_conferir.txt
//   node resumir.js --aplicar    → escreve nas fichas
//   node resumir.js --refazer    → refaz até os que já têm resumo automático
//                                  (resumo corrigido à mão nunca é tocado)

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

for (const linha of (fs.existsSync(path.join(__dirname, '.env'))
    ? fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n') : [])) {
  const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const BASE = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const CHAVE = process.env.SUPABASE_SERVICE_KEY || '';
const BALDE = process.env.BUCKET || 'anexos';
const MODELO = process.env.CRPS_MODELO || 'claude-opus-5';
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
async function baixarPDF(caminho) {
  const r = await fetch(`${BASE}/storage/v1/object/${BALDE}/${caminho}`,
    { headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` } });
  if (!r.ok) throw new Error(`storage ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

// ── o que precisa de resumo ────────────────────────────────────────────────
// Um alvo é um arquivo de decisão já guardado no Storage. Resumo escrito à
// mão (origem "curado") é intocável — mesma proveniência dos processos.
function alvos(casos, { refazer = false } = {}) {
  const fila = [];
  for (const k of casos)
    for (const bloco of (Array.isArray(k.crps) ? k.crps : []))
      for (const e of (bloco.eventos || []))
        for (const a of (e.arquivos || [])) {
          if (!a.storage || !a.decide) continue;
          if (a.resumo && a.resumo.origem === 'curado') continue;
          if (a.resumo && !refazer) continue;
          fila.push({ casoId: k.id, nup: bloco.nup, marca: a.id || a.nome,
            nome: a.nome, storage: a.storage, data: e.data || '', resultado: e.resumo || '' });
        }
  return fila;
}

const REGRAS = `Você lê acórdãos e decisões monocráticas do CRPS (Conselho de Recursos da Previdência Social) e diz, em poucas linhas, O QUE FOI DECIDIDO.

Leia o DISPOSITIVO — a parte final que decide ("Acordam...", "Resolve...", "Decide..."). Não resuma a fundamentação, o relatório nem o voto.

Cada linha começa por um destes verbos, no passado:
Reconheceu / Não reconheceu / Converteu / Determinou / Manteve / Reformou / Anulou / Concedeu / Negou / Devolveu.

Regras rígidas:
- Datas sempre DD/MM/AAAA. Períodos: "de DD/MM/AAAA a DD/MM/AAAA".
- No máximo 4 linhas. Cada linha com um fato só.
- Nada de "entendeu que", "considerou", "à luz de", "restou comprovado".
- NÃO escreva nome de doença, CID, diagnóstico, laudo, achado clínico nem qualquer dado de saúde. Se a decisão trata de incapacidade, diga apenas "reconheceu a incapacidade" ou "não reconheceu a incapacidade", sem o motivo médico.
- Não repita o nome do segurado, CPF, NB ou número do processo.

Se o dispositivo estiver confuso, ilegível, ou você ficar em dúvida sobre o que foi decidido, responda conseguiu=false e explique em motivo. Um resumo errado é pior que nenhum: alguém do escritório vai agir em cima disso.`;

const ESQUEMA = {
  type: 'object',
  properties: {
    conseguiu: { type: 'boolean', description: 'true só se o dispositivo ficou claro' },
    linhas: { type: 'array', items: { type: 'string' },
      description: 'até 4 frases curtas, cada uma começando pelo verbo. Vazio se conseguiu=false.' },
    motivo: { type: 'string', description: 'quando conseguiu=false, por que não deu' },
  },
  required: ['conseguiu', 'linhas', 'motivo'],
  additionalProperties: false,
};

// barreira final do lado de cá: mesmo com as regras no prompt, nada passa sem
// conferência. Vale para privacidade (dado médico) e para forma (verbo, tamanho).
const VERBOS = /^(Reconheceu|Não reconheceu|Nao reconheceu|Converteu|Determinou|Manteve|Reformou|Anulou|Concedeu|Negou|Devolveu)\b/;
const MEDICO = /\b(CID[- ]?\d|cid[- ]?10|diagn[óo]stic|laudo|per[íi]cia m[ée]dica atestou|doen[çc]a de|neoplas|depress|esquizo|lombalgia|hérnia|hernia|artros|diabet|hipertens|HIV|c[âa]ncer|transtorno)\b/i;
function validarResumo(r) {
  if (!r || r.conseguiu !== true) return { ok: false, motivo: (r && r.motivo) || 'não consegui ler o dispositivo' };
  const linhas = (r.linhas || []).map(s => String(s).trim()).filter(Boolean);
  if (!linhas.length) return { ok: false, motivo: 'voltou sem linhas' };
  if (linhas.length > 4) return { ok: false, motivo: `voltou com ${linhas.length} linhas (o teto é 4)` };
  for (const l of linhas) {
    if (!VERBOS.test(l)) return { ok: false, motivo: `linha fora do formato: "${l.slice(0, 60)}"` };
    if (MEDICO.test(l)) return { ok: false, motivo: 'a linha carregava dado de saúde' };
  }
  return { ok: true, linhas };
}

async function resumirPDF(cliente, bytes) {
  const r = await cliente.messages.create({
    model: MODELO,
    max_tokens: 8000,
    system: REGRAS,
    output_config: { format: { type: 'json_schema', schema: ESQUEMA } },
    messages: [{ role: 'user', content: [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf',
        data: bytes.toString('base64') } },
      { type: 'text', text: 'O que esta decisão decidiu?' },
    ] }],
  });
  if (r.stop_reason === 'refusal') return { conseguiu: false, linhas: [], motivo: 'a leitura foi recusada' };
  const txt = (r.content.find(b => b.type === 'text') || {}).text || '{}';
  try { return JSON.parse(txt); } catch (e) { return { conseguiu: false, linhas: [], motivo: 'resposta ilegível' }; }
}

// escreve o resumo dentro do arquivo certo, sem mexer em mais nada
function aplicarResumo(crps, nup, marca, resumo) {
  for (const bloco of (Array.isArray(crps) ? crps : [])) {
    if (String(bloco.nup || '').replace(/\D/g, '') !== String(nup || '').replace(/\D/g, '')) continue;
    for (const e of (bloco.eventos || []))
      for (const a of (e.arquivos || []))
        if ((a.id || a.nome) === marca) a.resumo = resumo;
  }
  return crps;
}

async function main() {
  const aplicar = process.argv.includes('--aplicar');
  const refazer = process.argv.includes('--refazer');
  if (!BASE || !CHAVE) { console.error('faltam SUPABASE_URL e SUPABASE_SERVICE_KEY no .env'); process.exit(1); }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('falta ANTHROPIC_API_KEY no .env (a mesma chave do Claude que a rotina diária usa)');
    process.exit(1);
  }
  const cliente = new Anthropic();

  const casos = await sb('/rest/v1/casos?select=id,cliente_id,crps&crps=not.is.null');
  const clientes = await sb('/rest/v1/clientes?select=id,nome').catch(() => []);
  const nomePorId = new Map((clientes || []).map(c => [c.id, c.nome]));
  const casoPorId = new Map(casos.map(k => [k.id, k]));

  const fila = alvos(casos, { refazer });
  log(`${fila.length} decisão(ões) para resumir${aplicar ? '' : '  (modo SECO — não grava nada)'}\n`);
  if (!fila.length) { log('Nada a fazer. Rode com --refazer para refazer os automáticos.'); return; }

  const relato = [];
  let ok = 0, pulados = 0;
  const porCaso = new Map();

  for (const [i, alvo] of fila.entries()) {
    const k = casoPorId.get(alvo.casoId);
    const nome = nomePorId.get(k && k.cliente_id) || '(sem nome)';
    process.stdout.write(`${i + 1}/${fila.length}  ${nome} — ${alvo.nome.slice(0, 40)} ... `);
    let bruto;
    try { bruto = await resumirPDF(cliente, await baixarPDF(alvo.storage)); }
    catch (e) { log(`falhou (${e.message})`); pulados++; continue; }
    const v = validarResumo(bruto);
    if (!v.ok) { log(`sem resumo — ${v.motivo}`); pulados++;
      relato.push(`\n### ${nome} — ${alvo.data.slice(0, 10)}\n(sem resumo: ${v.motivo})`); continue; }
    log('ok');
    const resumo = { linhas: v.linhas, origem: 'auto', modelo: MODELO, gerado_em: new Date().toISOString() };
    relato.push(`\n### ${nome} — ${alvo.data.slice(0, 10)} — ${alvo.resultado}\n`
      + v.linhas.map(l => `  • ${l}`).join('\n'));
    ok++;
    if (aplicar) {
      if (!porCaso.has(alvo.casoId)) porCaso.set(alvo.casoId, k.crps);
      aplicarResumo(porCaso.get(alvo.casoId), alvo.nup, alvo.marca, resumo);
    }
  }

  if (aplicar) {
    for (const [casoId, crps] of porCaso)
      await sb(`/rest/v1/casos?id=eq.${casoId}`, { method: 'PATCH',
        headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ crps }) });
    log(`\n✔ ${ok} resumo(s) gravados em ${porCaso.size} caso(s); ${pulados} sem resumo.`);
    log('Recarregue o CRM e veja a aba 🖥 Recurso (CRPS).');
  } else {
    const saida = path.join(__dirname, 'resumos_para_conferir.txt');
    fs.writeFileSync(saida, `RESUMOS DAS DECISÕES — PARA CONFERIR ANTES DE PUBLICAR\n`
      + `${ok} resumidos, ${pulados} sem resumo.\n${relato.join('\n')}\n`);
    log(`\n${ok} resumo(s) prontos, ${pulados} sem resumo.`);
    log(`Escrevi em  resumos_para_conferir.txt  — leia antes de publicar.`);
    log(`Se estiver bom:  node resumir.js --aplicar`);
  }
}

module.exports = { alvos, validarResumo, aplicarResumo, ESQUEMA, REGRAS };
if (require.main === module) main().catch(e => { console.error('falhou:', e.message); process.exit(1); });
