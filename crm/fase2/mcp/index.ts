// MCP DO CRM (etapa 1: leitura · etapa 2: anotação e tarefa) · Edge Function `mcp-crm`
//
// O Claude (ou o ChatGPT) se liga a este endereço como conector personalizado:
//   https://<projeto>.supabase.co/functions/v1/mcp-crm
// O login é o OAuth 2.1 do próprio Supabase Auth: o colaborador entra com o
// e-mail e a senha do CRM e autoriza na página de consentimento do CRM
// (docs/crm/oauth/consent). Toda leitura sai com o token DELE, pelo PostgREST,
// exatamente como o CRM faz no navegador; só colaborador ativo passa.
//
// Fica de fora, de propósito: a tabela de credenciais (senhas do Meu INSS e
// do gov.br). A escrita (etapa 2) só acrescenta: anotação e tarefa, sempre com
// o colaborador logado como autor e origem_id "mcp:…", que a linha do tempo
// mostra como "via assistente". Nada se apaga nem se altera por aqui.
import { createMcpHandler, McpServer } from "npm:@modelcontextprotocol/server@^2.3.0";
import { z } from "npm:zod@^4";

const URL_SB = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const FUNCAO = "mcp-crm";

// ── o banco, com o token de quem pediu ─────────────────────────────────────
export type Banco = (caminho: string, corpo?: unknown) => Promise<any>;
export function bancoDe(token: string, base = URL_SB, chave = ANON): Banco {
  return async (caminho: string, corpo?: unknown) => {
    const r = await fetch(`${base}/rest/v1/${caminho}`, {
      headers: { apikey: chave, Authorization: `Bearer ${token}`, Accept: "application/json",
        ...(corpo ? { "Content-Type": "application/json", Prefer: "return=representation" } : {}) },
      ...(corpo ? { method: "POST", body: JSON.stringify(corpo) } : {}),
    });
    if (!r.ok) throw new Error(`banco respondeu ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return r.json();
  };
}

const hojeSP = () => new Date().toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
const somaDias = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
};
const br = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
const soDig = (s: unknown) => String(s ?? "").replace(/\D/g, "");
const lista = (ids: string[]) => `(${[...new Set(ids)].filter(Boolean).join(",")})`;
const enc = encodeURIComponent;
// o formato de uuid sem exigir a versão: os ids do CRM nascem de uuid5 e de uuid4
const ID = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "id no formato uuid");
const texto = (o: unknown) => ({ content: [{ type: "text" as const, text: typeof o === "string" ? o : JSON.stringify(o, null, 1) }] });

// colunas que a IA lê de cada tabela (nada de credenciais)
const COL_CASO = "id,cliente_id,titulo,beneficio,especie,fase,etapa,mover_para,processo,processos,nb,protocolos,der,dib,dcb,prazo,exigencia_prazo,exigencia_descricao,resultado,parceria,importante,urgente";
const COL_CLIENTE = "id,nome,cpf,dn,telefone,cidade,uf,profissao,estado_civil,sexo,campos,criado_em";

// ── as ferramentas ─────────────────────────────────────────────────────────
export function criarServidor(db: Banco, eu: { id: string; nome: string }) {
  const server = new McpServer({ name: "crm-tercini", version: "0.2.0" });
  const leitura = { readOnlyHint: true, openWorldHint: false };
  const escrita = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
  let cols: Map<string, any> | null = null;
  const colaboradores = async () => {
    if (!cols) cols = new Map((await db("colaboradores?select=id,nome,inicial,cargo,ativo")).map((c: any) => [c.id, c]));
    return cols;
  };
  // a inicial exata primeiro: "A" acharia "Paulo" pelo nome, que contém "a"
  const acharCol = async (quem: string) => {
    if (quem === "eu") return (await colaboradores()).get(eu.id) || eu;
    const q = quem.trim().toLowerCase(), ativos = [...(await colaboradores()).values()].filter((c: any) => c.ativo !== false);
    return ativos.find((c: any) => c.inicial?.toLowerCase() === q)
      || (q.length > 1 ? ativos.find((c: any) => c.nome?.toLowerCase().includes(q)) : undefined);
  };
  const nomeCol = async (id?: string | null) => (id && (await colaboradores()).get(id)?.nome) || "";
  const clientesDe = async (ids: string[]) => ids.length
    ? new Map((await db(`clientes?select=id,nome&id=in.${lista(ids)}`)).map((c: any) => [c.id, c.nome])) : new Map();
  const casosDe = async (ids: string[]) => ids.length
    ? new Map((await db(`casos?select=id,cliente_id,titulo,especie,fase&id=in.${lista(ids)}`)).map((k: any) => [k.id, k])) : new Map();

  server.registerTool("buscar_clientes", {
    title: "Buscar clientes",
    description: "Procura clientes do escritório pelo nome (ou parte dele), pelo CPF, pelo número do processo judicial ou pelo NB. Devolve o id de cada um para usar em ficha_cliente.",
    inputSchema: z.object({ texto: z.string().min(3).describe("nome, CPF, número do processo ou NB") }),
    annotations: leitura,
  }, async ({ texto: q }) => {
    const d = soDig(q);
    const achados = new Map<string, any>();
    if (d.length === 11) for (const c of await db(`clientes?select=id,nome,cpf&cpf=eq.${d}`)) achados.set(c.id, c);
    if (d.length >= 10) {
      const ks = await db(`casos?select=cliente_id&or=(processo.ilike.*${enc(q.trim())}*,nb.eq.${d},processo.ilike.*${d}*)&limit=20`);
      for (const c of await db(`clientes?select=id,nome,cpf&id=in.${lista(ks.map((k: any) => k.cliente_id))}`).catch(() => [])) achados.set(c.id, c);
    }
    if (!d.length || achados.size === 0) {
      const termos = q.trim().split(/\s+/).filter((t) => t.length > 1).map((t) => `nome.ilike.*${enc(t)}*`);
      for (const c of await db(`clientes?select=id,nome,cpf&and=(${termos.join(",")})&order=nome&limit=15`)) achados.set(c.id, c);
    }
    if (!achados.size) return texto(`Nenhum cliente encontrado para "${q}".`);
    return texto([...achados.values()].slice(0, 15));
  });

  server.registerTool("ficha_cliente", {
    title: "Ficha do cliente",
    description: "Dados civis do cliente e todos os casos dele (benefício, espécie, fase, etapa, processo, NB, DER, DIB, DCB, prazo fatal, exigência do INSS). Não traz senhas.",
    inputSchema: z.object({ cliente_id: ID }),
    annotations: leitura,
  }, async ({ cliente_id }) => {
    const [c] = await db(`clientes?select=${COL_CLIENTE}&id=eq.${cliente_id}`);
    if (!c) return texto("Cliente não encontrado.");
    const casos = await db(`casos?select=${COL_CASO}&cliente_id=eq.${cliente_id}&order=criado_em.desc`);
    const campos = c.campos || {};
    return texto({
      nome: c.nome, cpf: c.cpf, nascimento: c.dn ? `${c.dn.slice(0, 2)}/${c.dn.slice(2, 4)}/${c.dn.slice(4)}` : null,
      telefone: c.telefone, cidade: [c.cidade, c.uf].filter(Boolean).join("/") || null, profissao: c.profissao,
      estado_civil: c.estado_civil ?? campos.civil?.estado_civil ?? null, origem: campos.civil?.origem ?? null,
      representante_legal: campos.representante ?? null, cliente_desde: br(String(c.criado_em).slice(0, 10)),
      casos: casos.map((k: any) => ({ ...k, der: br(k.der), dib: br(k.dib), dcb: br(k.dcb), prazo_fatal: br(k.prazo),
        exigencia_prazo: br(k.exigencia_prazo), prazo: undefined, cliente_id: undefined })),
    });
  });

  server.registerTool("anotacoes_caso", {
    title: "Anotações e movimentos do caso",
    description: "A linha do tempo de um caso: anotações da equipe e movimentos vindos do INSS, do PJe e do CRPS, do mais novo para o mais antigo, com autor e data. Aceita filtrar por um termo.",
    inputSchema: z.object({
      caso_id: ID,
      limite: z.number().int().min(1).max(100).default(25),
      busca: z.string().optional().describe("só as anotações que contêm este termo"),
    }),
    annotations: leitura,
  }, async ({ caso_id, limite, busca }) => {
    const filtro = busca ? `&texto=ilike.*${enc(busca)}*` : "";
    const as = await db(`andamentos?select=criado_em,origem,autor_id,texto&caso_id=eq.${caso_id}&excluir=is.false${filtro}&order=criado_em.desc&limit=${limite}`);
    const out = [];
    for (const a of as) out.push({ em: new Date(a.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      fonte: a.origem || "app", autor: await nomeCol(a.autor_id), texto: a.texto });
    return texto(out.length ? out : "Nenhuma anotação neste caso" + (busca ? ` com "${busca}".` : "."));
  });

  server.registerTool("agenda", {
    title: "Agenda e prazos",
    description: "O que tem data num período: tarefas abertas (de quem e o que fazer), prazos fatais dos casos e perícias, audiências e julgamentos agendados. Por padrão, as tarefas de quem pergunta, de hoje a 7 dias, incluindo as vencidas.",
    inputSchema: z.object({
      dias: z.number().int().min(0).max(90).default(7).describe("quantos dias à frente"),
      quem: z.string().default("eu").describe("'eu', 'todos' ou o nome ou a inicial de um colaborador"),
      incluir_vencidas: z.boolean().default(true),
    }),
    annotations: leitura,
  }, async ({ dias, quem, incluir_vencidas }) => {
    const hj = hojeSP(), ate = somaDias(hj, dias), de = incluir_vencidas ? "1900-01-01" : hj;
    let col: string | null = eu.id;
    if (quem === "todos") col = null;
    else if (quem !== "eu") {
      const alvo = await acharCol(quem);
      if (!alvo) return texto(`Não achei colaborador "${quem}".`);
      col = alvo.id;
    }
    const tfs = await db(`andamento_tarefas?select=caso_id,andamento_id,colaborador_id,lembrar_em,natureza,papel&concluida_em=is.null&lembrar_em=gte.${de}&lembrar_em=lte.${ate}${col ? `&colaborador_id=eq.${col}` : ""}&order=lembrar_em&limit=200`);
    const pzs = await db(`casos?select=id,cliente_id,titulo,prazo,lembrar_motivo&prazo=gte.${de}&prazo=lte.${ate}&fase=neq.encerrado&order=prazo&limit=200`);
    const evs = await db(`eventos?select=caso_id,tipo,data_hora,local&status=eq.agendada&data_hora=gte.${hj}&data_hora=lte.${ate}T23:59:59&order=data_hora&limit=100`);
    const textos = tfs.length ? new Map((await db(`andamentos?select=id,texto&id=in.${lista(tfs.map((t: any) => t.andamento_id))}`)).map((a: any) => [a.id, a.texto])) : new Map();
    const casos = await casosDe([...tfs, ...evs].map((x: any) => x.caso_id));
    const clientes = await clientesDe([...pzs.map((k: any) => k.cliente_id), ...[...casos.values()].map((k: any) => k.cliente_id)]);
    const itens: any[] = [];
    for (const t of tfs) {
      const k = casos.get(t.caso_id);
      itens.push({ data: t.lembrar_em, tipo: t.papel === "revisa" ? "revisar" : (t.natureza || "compromisso"),
        cliente: clientes.get(k?.cliente_id) || "", caso: k?.titulo || "", quem: await nomeCol(t.colaborador_id),
        o_que: String(textos.get(t.andamento_id) || "").slice(0, 240), caso_id: t.caso_id });
    }
    for (const k of pzs) itens.push({ data: k.prazo, tipo: "PRAZO FATAL", cliente: clientes.get(k.cliente_id) || "",
      caso: k.titulo, o_que: k.lembrar_motivo || "", caso_id: k.id });
    for (const e of evs) {
      const k = casos.get(e.caso_id);
      itens.push({ data: String(e.data_hora).slice(0, 10), tipo: e.tipo || "agendamento",
        hora: new Date(e.data_hora).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }),
        cliente: clientes.get(k?.cliente_id) || "", caso: k?.titulo || "", o_que: e.local || "", caso_id: e.caso_id });
    }
    itens.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
    if (!itens.length) return texto("Nada com data no período.");
    return texto(itens.map((i) => ({ ...i, data: br(i.data), vencida: i.data < hj || undefined })));
  });

  server.registerTool("novidades", {
    title: "Novidades dos portais",
    description: "Movimentos que chegaram dos portais (INSS/PAT, PJe e outros tribunais, CRPS) nos últimos dias, com o cliente e o caso de cada um.",
    inputSchema: z.object({ dias: z.number().int().min(1).max(30).default(3) }),
    annotations: leitura,
  }, async ({ dias }) => {
    const desde = new Date(Date.now() - dias * 864e5).toISOString();
    const as = await db(`andamentos?select=caso_id,criado_em,origem,texto&origem=in.(pje,pat,crps)&criado_em=gte.${desde}&order=criado_em.desc&limit=150`);
    const casos = await casosDe(as.map((a: any) => a.caso_id));
    const clientes = await clientesDe([...casos.values()].map((k: any) => k.cliente_id));
    if (!as.length) return texto(`Nenhum movimento dos portais nos últimos ${dias} dia(s).`);
    return texto(as.map((a: any) => {
      const k = casos.get(a.caso_id);
      return { em: br(String(a.criado_em).slice(0, 10)), fonte: a.origem, cliente: clientes.get(k?.cliente_id) || "",
        caso: k?.titulo || "", texto: String(a.texto).slice(0, 300), caso_id: a.caso_id };
    }));
  });

  server.registerTool("equipe", {
    title: "Equipe do escritório",
    description: "Os colaboradores ativos, com a inicial usada nas tarefas e o cargo.",
    inputSchema: z.object({}),
    annotations: leitura,
  }, async () => texto([...(await colaboradores()).values()].filter((c: any) => c.ativo !== false)
    .map((c: any) => ({ nome: c.nome, inicial: c.inicial, cargo: c.cargo, voce: c.id === eu.id || undefined }))));

  // ── etapa 2: escrever ────────────────────────────────────────────────────
  // o caso tem que existir e vir com o nome do cliente, para a confirmação
  // dizer ONDE gravou; um id errado vira recusa, não anotação perdida
  const casoComCliente = async (caso_id: string) => {
    const [k] = await db(`casos?select=id,cliente_id,titulo&id=eq.${caso_id}`);
    if (!k) return null;
    return { ...k, cliente: (await clientesDe([k.cliente_id])).get(k.cliente_id) || "" };
  };
  const anotar = async (caso_id: string, txt: string, extra: Record<string, unknown> = {}) => {
    const [a] = await db("andamentos", { caso_id, autor_id: eu.id, texto: txt.trim(), origem: "app",
      origem_id: `mcp:${crypto.randomUUID()}`, ...extra });
    return a;
  };
  const DATA = z.string().describe("AAAA-MM-DD ou DD/MM/AAAA");
  const isoDe = (d: string) => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d.trim());
    const iso = m ? `${m[3]}-${m[2]}-${m[1]}` : d.trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) && !isNaN(Date.parse(iso + "T12:00:00Z")) ? iso : null;
  };

  server.registerTool("registrar_anotacao", {
    title: "Registrar anotação no caso",
    description: "Grava uma anotação na linha do tempo de um caso, em nome de quem está conectado (aparece no CRM com o autor e a marca 'via assistente'). Use o caso_id que vem de ficha_cliente. Não cria tarefa; para isso use criar_tarefa.",
    inputSchema: z.object({
      caso_id: ID,
      texto: z.string().min(3).max(4000),
      importante: z.boolean().default(false),
      urgente: z.boolean().default(false),
    }),
    annotations: escrita,
  }, async ({ caso_id, texto: txt, importante, urgente }) => {
    const k = await casoComCliente(caso_id);
    if (!k) return texto("Caso não encontrado; nada foi gravado.");
    await anotar(caso_id, txt, { importante, urgente });
    return texto(`Anotação gravada no caso "${k.titulo}" de ${k.cliente}, em nome de ${eu.nome}.`);
  });

  server.registerTool("criar_tarefa", {
    title: "Criar tarefa no caso",
    description: "Cria uma tarefa num caso: grava o texto como anotação e põe na agenda de cada responsável na data indicada, com um revisor opcional. Quem cria fica registrado como autor e como quem atribuiu. Responsáveis e revisor pelo nome, pela inicial ou 'eu'.",
    inputSchema: z.object({
      caso_id: ID,
      o_que: z.string().min(3).max(2000).describe("o que deve ser feito"),
      data: DATA,
      para: z.array(z.string()).min(1).max(6).default(["eu"]).describe("responsáveis: 'eu', nome ou inicial"),
      revisor: z.string().optional().describe("quem revisa: nome ou inicial"),
      natureza: z.enum(["compromisso", "lembrete"]).default("compromisso"),
    }),
    annotations: escrita,
  }, async ({ caso_id, o_que, data, para, revisor, natureza }) => {
    const dia = isoDe(data);
    if (!dia) return texto(`Data "${data}" inválida; use AAAA-MM-DD ou DD/MM/AAAA. Nada foi gravado.`);
    if (dia < hojeSP()) return texto(`A data ${br(dia)} já passou. Nada foi gravado.`);
    const execs: any[] = [];
    for (const q of para) {
      const c = await acharCol(q);
      if (!c) return texto(`Não achei colaborador ativo "${q}". Nada foi gravado.`);
      if (!execs.some((x) => x.id === c.id)) execs.push(c);
    }
    const rev = revisor ? await acharCol(revisor) : null;
    if (revisor && !rev) return texto(`Não achei colaborador ativo "${revisor}" para revisar. Nada foi gravado.`);
    const k = await casoComCliente(caso_id);
    if (!k) return texto("Caso não encontrado; nada foi gravado.");
    const a = await anotar(caso_id, o_que);
    const linhas = execs.map((c) => ({ andamento_id: a.id, caso_id, colaborador_id: c.id, atribuido_por: eu.id,
      lembrar_em: dia, natureza, papel: "executa" }));
    if (rev && !execs.some((x) => x.id === rev.id))
      linhas.push({ andamento_id: a.id, caso_id, colaborador_id: rev.id, atribuido_por: eu.id, lembrar_em: dia, natureza, papel: "revisa" });
    try { await db("andamento_tarefas", linhas); }
    catch (e) { return texto(`A anotação foi gravada, mas a tarefa não entrou na agenda (${(e as Error).message}). Crie a tarefa pelo CRM.`); }
    return texto(`Tarefa criada no caso "${k.titulo}" de ${k.cliente} para ${br(dia)}: ${execs.map((c) => c.nome).join(", ")}`
      + (rev && !execs.some((x) => x.id === rev.id) ? `, com revisão de ${rev.nome}` : "") + `. Atribuída por ${eu.nome}.`);
  });

  return server;
}

// ── a porta: descoberta OAuth, token e colaborador ativo ───────────────────
export function metadados(base = URL_SB) {
  return { resource: `${base}/functions/v1/${FUNCAO}`, authorization_servers: [`${base}/auth/v1`],
    scopes_supported: [], bearer_methods_supported: ["header"], resource_name: "CRM Tercini" };
}
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, mcp-protocol-version, mcp-session-id", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const json = (o: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...cors, ...extra } });

export async function atender(req: Request, base = URL_SB, chave = ANON): Promise<Response> {
  const url = new URL(req.url);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (url.pathname.endsWith("/.well-known/oauth-protected-resource")) return json(metadados(base));
  const nega = (msg: string) => json({ error: "invalid_token", error_description: msg }, 401, {
    "WWW-Authenticate": `Bearer resource_metadata="${base}/functions/v1/${FUNCAO}/.well-known/oauth-protected-resource"` });
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return nega("entre com a sua conta do CRM");
  const u = await fetch(`${base}/auth/v1/user`, { headers: { apikey: chave, Authorization: `Bearer ${token}` } });
  if (!u.ok) return nega("sessão vencida ou inválida");
  const user = await u.json();
  const db = bancoDe(token, base, chave);
  const [eu] = await db(`colaboradores?select=id,nome,ativo&auth_id=eq.${user.id}`).catch(() => []);
  if (!eu || eu.ativo === false) return json({ error: "forbidden", error_description: "só colaborador ativo do escritório" }, 403, cors);
  const resp = await createMcpHandler(() => criarServidor(db, eu)).fetch(req);
  const h = new Headers(resp.headers); for (const [k, v] of Object.entries(cors)) h.set(k, v);
  return new Response(resp.body, { status: resp.status, headers: h });
}

// no teste local (MCP_TESTE=1) só o módulo é importado
if (!Deno.env.get("MCP_TESTE")) Deno.serve((req) => atender(req));
