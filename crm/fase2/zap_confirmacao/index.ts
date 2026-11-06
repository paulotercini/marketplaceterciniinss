// CONFIRMAÇÃO DOS ATENDIMENTOS · Edge Function `zap_confirmacao` (F422)
//
// enviar    → chamada pelo pg_cron às 9h (zap_conf_disparar, pedido de uso único em
//             config_app.zap_conf_pedido): lê na agenda os atendimentos cuja data de envio é
//             hoje (dois dias antes; o de segunda na sexta; o de terça conforme zap_conf_terca)
//             e manda a mensagem de cada um (zap_conf_enviar, uma por evento)
// confirmar → chamada pelo banco quando o cliente responde SIM (zap_conf_resposta, pedido de
//             uso único na conversa): confirma o evento na agenda (Code.gs confirmar)
// Publicada com verify_jwt = false: a porta é o pedido de uso único.
// Segredos: AGENDA_TOKEN_ROBO e, opcional, AGENDA_URL (os mesmos da zap_agenda).

const env = (k: string) => (typeof Deno !== "undefined" ? Deno.env.get(k) : undefined) || "";
const URL_SB = env("SUPABASE_URL").replace(/\/$/, "");
const SERVICO = env("SUPABASE_SERVICE_ROLE_KEY");
const TOKEN = env("AGENDA_TOKEN_ROBO");
const URL_AGENDA = env("AGENDA_URL") ||
  "https://script.google.com/macros/s/AKfycbwO6RbGD4WvH2q0cleS1ACXY1EWyrVu-jfBYgB3KbVTXJtkifZIu5Pf7KFfk79x7MH9/exec";
const PROFS = ["paulo", "marcos", "amanda"];
const COM_GOVBR = ["paulo", "amanda"];
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

async function rest(caminho: string, corpo?: unknown) {
  const r = await fetch(`${URL_SB}/rest/v1/${caminho}`, {
    method: corpo === undefined ? "GET" : "POST",
    headers: { apikey: SERVICO, Authorization: `Bearer ${SERVICO}`, "Content-Type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  if (!r.ok) throw new Error(`${caminho}: ${r.status} ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
const rpc = (nome: string, corpo: unknown) => rest(`rpc/${nome}`, corpo);

async function agenda(acao: string, corpo: Record<string, unknown>) {
  const r = await fetch(URL_AGENDA, {
    method: "POST", redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ acao, token: TOKEN, ...corpo }),
  });
  return (await r.json().catch(() => ({ ok: false, erro: `agenda: ${r.status}` }))) as { ok: boolean; erro?: string; codigo?: string; [k: string]: unknown };
}

// datas em AAAA-MM-DD, contadas em UTC ao meio-dia para não escorregar de dia
const dia = (s: string) => { const [a, m, d] = s.split("-").map(Number); return new Date(Date.UTC(a, m - 1, d, 12)); };
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const soma = (s: string, n: number) => ymd(new Date(dia(s).getTime() + n * 86400000));

// quando sai a mensagem do atendimento da data: dois dias antes; o de segunda, na sexta;
// o de terça, na segunda, na sexta ou no domingo (zap_conf_terca)
// shortcut: feriado no dia do envio não adia nem antecipa; tratar se o Paulo pedir
export function dataDoEnvio(data: string, terca = "segunda") {
  const dow = dia(data).getUTCDay();
  if (dow === 1) return soma(data, -3);
  if (dow === 2) return soma(data, terca === "sexta" ? -4 : terca === "domingo" ? -2 : -1);
  return soma(data, -2);
}
export function datasDeHoje(hoje: string, terca = "segunda") {
  return [1, 2, 3, 4].map((n) => soma(hoje, n)).filter((d) => dataDoEnvio(d, terca) === hoje);
}

const SEMANA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
export function primeiroNome(nome: string) {
  const p = String(nome || "").trim().split(/\s+/)[0] || "";
  return p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : "";
}
export function nomeDoTitulo(titulo: string) {
  return String(titulo || "").replace(/^\s*00[12]\s*-\s*/, "").replace(/\s*-\s*(n[ãa]o confirmado|confirmado)\s*$/i, "").trim();
}
export function textoConfirmacao(modelo: string, govbr: string, x: { nome: string; data: string; inicio: string; tratamento: string; profissional: string }) {
  const [, m, d] = x.data.split("-");
  const [h, mi] = x.inicio.split(":");
  return modelo
    .replaceAll("{nome}", primeiroNome(x.nome))
    .replaceAll("{dia}", SEMANA[dia(x.data).getUTCDay()])
    .replaceAll("{data}", `${d}/${m}/${x.data.slice(0, 4)}`)
    .replaceAll("{hora}", `${Number(h)}h${mi}`)
    .replaceAll("{advogado}", x.tratamento)
    .replaceAll("{govbr}", COM_GOVBR.includes(x.profissional) ? govbr : "")
    .replace(/\s+\.$/, ".");
}

type Ev = { id: string; titulo: string; data: string; inicio: string; atendimento: boolean; confirmado: boolean;
  profissional: string; telefone: string | null; nome: string | null; clienteId: string | null };

async function enviar(terca: string) {
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const datas = datasDeHoje(hoje, terca);
  const cfg = Object.fromEntries(((await rest("config_app?chave=in.(zap_conf_texto,zap_conf_govbr)&select=chave,valor")) || [])
    .map((c: { chave: string; valor: string }) => [c.chave, c.valor]));
  let enviadas = 0, ja = 0;
  const semTelefone: string[] = [];
  for (const data of datas) {
    for (const id of PROFS) {
      const d = await agenda("disponibilidade", { profissional: id, desde: data, dias: 1 });
      if (!d.ok) throw new Error(`agenda de ${id}: ${d.erro || d.codigo}`);
      const prof = ((d.profissionais as { id: string; nome: string; tratamento: string }[]) || []).find((p) => p.id === id);
      const doDia = ((d.dias as { data: string; eventos?: Ev[] }[]) || []).find((x) => x.data === data);
      for (const ev of doDia?.eventos || []) {
        if (!ev.atendimento || ev.confirmado || ev.profissional !== id) continue;
        const nome = ev.nome || nomeDoTitulo(ev.titulo);
        let tel = String(ev.telefone || "").replace(/\D/g, "");
        if (!tel && ev.clienteId) {
          const c = await rest(`clientes?id=eq.${encodeURIComponent(ev.clienteId)}&select=telefone`);
          tel = String(c?.[0]?.telefone || "").replace(/\D/g, "");
        }
        const rotulo = `${SEMANA[dia(data).getUTCDay()]}, ${data.slice(8)}/${data.slice(5, 7)}, às ${ev.inicio}, com ${prof?.nome || id}`;
        if (tel.length < 10) { semTelefone.push(`${nome} (${rotulo})`); continue; }
        const texto = textoConfirmacao(cfg.zap_conf_texto || "", cfg.zap_conf_govbr || "",
          { nome, data, inicio: ev.inicio, tratamento: prof?.tratamento || prof?.nome || id, profissional: id });
        const r = await rpc("zap_conf_enviar", { p_telefone: tel.length <= 11 ? "55" + tel : tel, p_nome: nome, p_texto: texto,
          p_dados: { evento: ev.id, data, hora: ev.inicio, profissional: prof?.nome || id, rotulo } });
        if (r === "enviada") enviadas++; else ja++;
      }
    }
  }
  const cobradas = await rpc("zap_conf_relatorio", { p_sem_telefone: semTelefone });
  return { hoje, datas, enviadas, ja, sem_telefone: semTelefone.length, cobradas };
}

async function confirmar(conversa: string, pedido: string) {
  const x = await rpc("zap_conf_pegar", { p_conversa: conversa, p_pedido: pedido });
  if (!x) return { aviso: "pedido já lido" };
  const r = TOKEN ? await agenda("confirmar", { eventId: x.evento }) : { ok: false, erro: "sem o token do robô" };
  await rpc("zap_conf_confirmado", { p_conversa: conversa, p_ok: !!r.ok, p_erro: r.ok ? null : String(r.erro || r.codigo || "erro") });
  return { confirmado: !!r.ok };
}

if (typeof Deno !== "undefined") {
  Deno.serve(async (req) => {
    if (req.method !== "POST") return json({ erro: "use POST" }, 405);
    let b: Record<string, unknown> = {};
    try { b = await req.json(); } catch { /* corpo inválido */ }
    const pedido = String(b.pedido || "");
    if (!/^[0-9a-f-]{36}$/i.test(pedido)) return json({ erro: "pedido inválido" }, 400);
    try {
      if (b.acao === "confirmar" && /^[0-9a-f-]{36}$/i.test(String(b.conversa_id || ""))) return json(await confirmar(String(b.conversa_id), pedido));
      if (b.acao === "enviar") {
        if (!(await rpc("zap_conf_pegar_envio", { p_pedido: pedido }))) return json({ erro: "pedido vencido" }, 403);
        if (!TOKEN) return json({ erro: "sem AGENDA_TOKEN_ROBO" }, 500);
        return json(await enviar(String(b.terca || "segunda")));
      }
      return json({ erro: "ação" }, 400);
    } catch (e) { return json({ erro: String(e) }, 500); }
  });
}
