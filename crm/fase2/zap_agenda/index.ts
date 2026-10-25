// AGENDA PELO ROBÔ DO WHATSAPP · Edge Function `zap_agenda` (F272, onda 4)
//
// O robô (zap_bot_ler, zap_bot_seguir) chama esta função por pg_net quando o
// cliente escolhe "6 · Agendar um horário" e quando responde o número da vaga.
// Ela lê o pedido UMA vez (zap_agenda_pegar, uso único, 2 minutos), conversa
// com o Apps Script da agenda (crm/agenda-quarta/Code.gs) e devolve ao banco:
//   oferecer → disponibilidade de cada profissional de zap_agenda_profs, as 5
//              vagas marcadas no Google mais próximas → zap_agenda_oferecer
//   marcar   → agendar na vaga escolhida → zap_agenda_marcado; a vaga que
//              acabou de ser tomada volta a oferecer as outras
// Qualquer erro vai a zap_agenda_falhou, que avisa o cliente e chama alguém;
// sem resposta, o relógio do banco faz o mesmo em 2 minutos.
// Publicada com verify_jwt = false, porque quem chama é o banco: a porta é o
// pedido de uso único gravado na conversa.
// Segredos: AGENDA_TOKEN_ROBO (token do robô no Apps Script, adicionarColaborador
// com o nome "Robô do WhatsApp") e, opcional, AGENDA_URL (a implantação do script).
//
// Pedido: POST { conversa_id, pedido }

const env = (k: string) => (typeof Deno !== "undefined" ? Deno.env.get(k) : undefined) || "";
const URL_SB = env("SUPABASE_URL").replace(/\/$/, "");
const SERVICO = env("SUPABASE_SERVICE_ROLE_KEY");
const TOKEN = env("AGENDA_TOKEN_ROBO");
const URL_AGENDA = env("AGENDA_URL") ||
  "https://script.google.com/macros/s/AKfycbwO6RbGD4WvH2q0cleS1ACXY1EWyrVu-jfBYgB3KbVTXJtkifZIu5Pf7KFfk79x7MH9/exec";
const DIAS = 10, QUANTAS = 5;
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

async function rpc(nome: string, corpo: unknown) {
  const r = await fetch(`${URL_SB}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: { apikey: SERVICO, Authorization: `Bearer ${SERVICO}`, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (!r.ok) throw new Error(`${nome}: ${r.status} ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

async function agenda(acao: string, corpo: Record<string, unknown>) {
  const r = await fetch(URL_AGENDA, {
    method: "POST", redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },   // o Apps Script lê postData.contents
    body: JSON.stringify({ acao, token: TOKEN, ...corpo }),
  });
  const d = await r.json().catch(() => ({ ok: false, erro: `agenda: ${r.status}` }));
  return d as { ok: boolean; codigo?: string; erro?: string; [k: string]: unknown };
}

export type Vaga = { rotulo: string; profissional: string; data: string; inicio: string; eventoId: string };
type Dia = { data: string; bloqueado?: boolean; livres?: Record<string, { inicio: string; eventoId?: string }[]> };

const SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
export function rotuloDaVaga(data: string, inicio: string, nome: string) {
  const [a, m, d] = data.split("-").map(Number);
  const dia = SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
  const [h, mi] = inicio.split(":");
  return `${dia}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}, às ${Number(h)}h${mi}${nome ? `, com ${nome}` : ""}`;
}

// as vagas de todos os profissionais, das mais próximas: só a vaga marcada no
// Google (com eventoId), nunca o horário calculado
export function escolherVagas(porProf: { id: string; nome: string; dias: Dia[] }[], tipo: string, n = QUANTAS): Vaga[] {
  const todas: Vaga[] = [];
  for (const p of porProf) {
    for (const d of p.dias || []) {
      if (d.bloqueado) continue;
      for (const s of d.livres?.[tipo] || []) {
        if (!s.eventoId) continue;
        todas.push({ rotulo: rotuloDaVaga(d.data, s.inicio, p.nome), profissional: p.id, data: d.data, inicio: s.inicio, eventoId: s.eventoId });
      }
    }
  }
  todas.sort((x, y) => (x.data + x.inicio).localeCompare(y.data + y.inicio));
  return todas.slice(0, n);
}

// o telefone da conversa (55 + DDD + número) no formato da agenda (DDD + número)
export function foneAgenda(t: string) {
  const d = String(t || "").replace(/\D/g, "");
  return (d.length === 12 || d.length === 13) && d.startsWith("55") ? d.slice(2) : d;
}

async function vagasDe(profs: string[], tipo: string) {
  const porProf = [];
  for (const id of profs) {
    const d = await agenda("disponibilidade", { profissional: id, dias: DIAS });
    if (!d.ok) throw new Error(`disponibilidade de ${id}: ${d.erro || d.codigo}`);
    const nome = ((d.profissionais as { id: string; nome: string }[]) || []).find((p) => p.id === id)?.nome || id;
    porProf.push({ id, nome, dias: (d.dias as Dia[]) || [] });
  }
  return escolherVagas(porProf, tipo);
}

async function atender(conversa: string, pedido: string) {
  const x = await rpc("zap_agenda_pegar", { p_conversa: conversa, p_pedido: pedido });
  if (!x) return { aviso: "pedido já lido ou vencido" };
  const falhou = (motivo: string) => rpc("zap_agenda_falhou", { p_conversa: conversa, p_pedido: null, p_motivo: motivo });
  if (!TOKEN) { await falhou("sem o token do robô na agenda"); return { erro: "sem AGENDA_TOKEN_ROBO" }; }
  const profs = String(x.profissionais || "").split(",").map((s: string) => s.trim()).filter(Boolean);
  const tipo = x.cliente_id ? "002" : "001";
  try {
    if (x.acao === "oferecer") {
      const vagas = await vagasDe(profs, tipo);
      await rpc("zap_agenda_oferecer", { p_conversa: conversa, p_tipo: tipo, p_vagas: vagas });
      return { vagas: vagas.length };
    }
    if (x.acao === "marcar") {
      const v: Vaga | undefined = (x.vagas || [])[Number(x.escolha) - 1];
      if (!v) { await falhou("vaga escolhida não encontrada"); return { erro: "vaga" }; }
      const r = await agenda("agendar", {
        profissional: v.profissional, tipo: x.tipo || tipo, nome: x.nome, telefone: foneAgenda(x.telefone),
        data: v.data, inicio: v.inicio, eventoId: v.eventoId, clienteId: x.cliente_id || undefined,
        orientacoesConfirmadas: true,
        observacoes: "Marcado pelo robô do WhatsApp." + (x.relato ? ` Relato: ${String(x.relato).slice(0, 300)}` : ""),
      });
      if (r.ok) {
        await rpc("zap_agenda_marcado", { p_conversa: conversa, p_rotulo: v.rotulo });
        return { marcado: v.rotulo };
      }
      if (r.codigo === "HORARIO_INDISPONIVEL") {
        const vagas = await vagasDe(profs, x.tipo || tipo);
        await rpc("zap_agenda_oferecer", { p_conversa: conversa, p_tipo: x.tipo || tipo, p_vagas: vagas });
        return { tomada: true, vagas: vagas.length };
      }
      await falhou(String(r.erro || r.codigo || "erro da agenda").slice(0, 200));
      return { erro: r.erro };
    }
    await falhou("pedido sem ação");
    return { erro: "acao" };
  } catch (e) {
    await falhou(String(e).slice(0, 200));
    return { erro: String(e) };
  }
}

if (typeof Deno !== "undefined") {
  Deno.serve(async (req) => {
    if (req.method !== "POST") return json({ erro: "use POST" }, 405);
    let c = "", p = "";
    try { const b = await req.json(); c = String(b?.conversa_id || ""); p = String(b?.pedido || ""); } catch { /* corpo inválido */ }
    if (!/^[0-9a-f-]{36}$/i.test(c) || !/^[0-9a-f-]{36}$/i.test(p)) return json({ erro: "pedido inválido" }, 400);
    try { return json(await atender(c, p)); } catch (e) { return json({ erro: String(e) }, 500); }
  });
}
