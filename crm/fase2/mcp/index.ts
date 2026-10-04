// MCP DO CRM · Edge Function `mcp-crm`
// etapa 1: leitura · etapa 2: anotação e tarefa · etapa 3: concluir, reagendar
// e atualizar o caso · etapa 4: documentos do caso · etapa 5: comandos prontos
//
// O Claude (ou o ChatGPT) se liga a este endereço como conector personalizado:
//   https://<projeto>.supabase.co/functions/v1/mcp-crm
// O login é o OAuth 2.1 do próprio Supabase Auth: o colaborador entra com o
// e-mail e a senha do CRM e autoriza na página de consentimento do CRM
// (docs/crm/oauth/consent). Toda leitura sai com o token DELE, pelo PostgREST,
// exatamente como o CRM faz no navegador; só colaborador ativo passa.
//
// Fica de fora, de propósito: a tabela de credenciais (senhas do Meu INSS e
// do gov.br). Toda escrita leva o colaborador logado como autor e origem_id
// "mcp:…", que a linha do tempo mostra como "via assistente". Nada se apaga.
// O que ALTERA (etapa 3) deixa uma anotação com o valor anterior de cada
// campo, para desfazer à mão. Fase, prazo fatal e encerramento ficam no CRM,
// porque lá movem a lista do To Do e lançam honorários.
import { createMcpHandler, McpServer } from "npm:@modelcontextprotocol/server@^2.3.0";
import { z } from "npm:zod@^4";
import { extractText, getDocumentProxy } from "npm:unpdf@^1";

const URL_SB = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const FUNCAO = "mcp-crm";

// ── o banco, com o token de quem pediu ─────────────────────────────────────
export type Banco = ((caminho: string, corpo?: unknown, metodo?: "POST" | "PATCH") => Promise<any>)
  & { baixar: (caminho: string) => Promise<{ bytes: Uint8Array; tipo: string }> };
const BUCKET = "anexos";
export function bancoDe(token: string, base = URL_SB, chave = ANON): Banco {
  const auth = { apikey: chave, Authorization: `Bearer ${token}` };
  const db = async (caminho: string, corpo?: unknown, metodo: "POST" | "PATCH" = "POST") => {
    const r = await fetch(`${base}/rest/v1/${caminho}`, {
      headers: { ...auth, Accept: "application/json",
        ...(corpo ? { "Content-Type": "application/json", Prefer: "return=representation" } : {}) },
      ...(corpo ? { method: metodo, body: JSON.stringify(corpo) } : {}),
    });
    if (!r.ok) throw new Error(`banco respondeu ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return r.json();
  };
  // o arquivo sai do Storage com o token de quem pediu: a mesma regra do CRM
  const baixar = async (caminho: string) => {
    const r = await fetch(`${base}/storage/v1/object/authenticated/${BUCKET}/${caminho.split("/").map(encodeURIComponent).join("/")}`, { headers: auth });
    if (!r.ok) throw new Error(`arquivo indisponível (${r.status})`);
    return { bytes: new Uint8Array(await r.arrayBuffer()), tipo: r.headers.get("content-type") || "" };
  };
  return Object.assign(db, { baixar });
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
export function criarServidor(db: Banco, eu: { id: string; nome: string; papel?: string }) {
  // a conta do assistente (papel "assistente_ia") roda sozinha nas rotinas
  // agendadas: lê, anota e cria tarefa, mas não conclui, não reagenda e não
  // altera o caso. Essas decisões ficam com quem é gente.
  const robo = eu.papel === "assistente_ia";
  const server = new McpServer({ name: "crm-tercini", version: "0.5.0" });
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
    description: "O que tem data num período: tarefas abertas (de quem e o que fazer, com o tarefa_id para concluir ou reagendar), prazos fatais dos casos e perícias, audiências e julgamentos agendados. Por padrão, as tarefas de quem pergunta, de hoje a 7 dias, incluindo as vencidas.",
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
    const tfs = await db(`andamento_tarefas?select=id,caso_id,andamento_id,colaborador_id,lembrar_em,natureza,papel&concluida_em=is.null&lembrar_em=gte.${de}&lembrar_em=lte.${ate}${col ? `&colaborador_id=eq.${col}` : ""}&order=lembrar_em&limit=200`);
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
        o_que: String(textos.get(t.andamento_id) || "").slice(0, 240), caso_id: t.caso_id, tarefa_id: t.id });
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

  // ── etapa 3: fechar o ciclo e atualizar o caso ───────────────────────────
  const tarefaAberta = async (tarefa_id: string) => {
    const [t] = await db(`andamento_tarefas?select=id,caso_id,andamento_id,colaborador_id,lembrar_em,papel,concluida_em&id=eq.${tarefa_id}`);
    return t;
  };

  server.registerTool("tarefas_caso", {
    title: "Tarefas do caso",
    description: "As tarefas abertas de um caso, com o tarefa_id, o responsável, a data e o que fazer. Use antes de concluir_tarefa ou reagendar_tarefa.",
    inputSchema: z.object({ caso_id: ID }),
    annotations: leitura,
  }, async ({ caso_id }) => {
    const tfs = await db(`andamento_tarefas?select=id,andamento_id,colaborador_id,lembrar_em,natureza,papel&caso_id=eq.${caso_id}&concluida_em=is.null&order=lembrar_em`);
    if (!tfs.length) return texto("Nenhuma tarefa aberta neste caso.");
    const textos = new Map((await db(`andamentos?select=id,texto&id=in.${lista(tfs.map((t: any) => t.andamento_id))}`)).map((a: any) => [a.id, a.texto]));
    const out = [];
    for (const t of tfs) out.push({ tarefa_id: t.id, quem: await nomeCol(t.colaborador_id), papel: t.papel, natureza: t.natureza,
      data: br(t.lembrar_em), vencida: t.lembrar_em < hojeSP() || undefined, o_que: String(textos.get(t.andamento_id) || "").slice(0, 300) });
    return texto(out);
  });

  if (!robo) server.registerTool("concluir_tarefa", {
    title: "Concluir tarefa",
    description: "Dá baixa numa tarefa aberta, como o botão ✔ do CRM: marca concluída e grava na linha do tempo, em resposta ao pedido, o que foi feito. Se informar o número do protocolo, ele entra na ficha do caso. O tarefa_id vem de agenda ou de tarefas_caso.",
    inputSchema: z.object({
      tarefa_id: ID,
      o_que_foi_feito: z.string().max(2000).optional(),
      protocolo: z.string().optional().describe("número do protocolo gerado, se houver"),
    }),
    annotations: escrita,
  }, async ({ tarefa_id, o_que_foi_feito, protocolo }) => {
    const t = await tarefaAberta(tarefa_id);
    if (!t) return texto("Tarefa não encontrada; nada foi gravado.");
    if (t.concluida_em) return texto("Esta tarefa já estava concluída; nada foi gravado.");
    const k = await casoComCliente(t.caso_id);
    await db(`andamento_tarefas?id=eq.${tarefa_id}`, { concluida_em: new Date().toISOString() }, "PATCH");
    const prot = soDig(protocolo);
    await anotar(t.caso_id, "✔ " + ((o_que_foi_feito || "").trim() || "Tarefa concluída") + (prot.length >= 6 ? ` — Protocolo: ${prot}` : ""),
      { responde_a: t.andamento_id });
    let extra = "";
    if (prot.length >= 6) {
      const [c] = await db(`casos?select=protocolos&id=eq.${t.caso_id}`);
      const ps = Array.isArray(c?.protocolos) ? c.protocolos : [];
      if (!ps.includes(prot)) { await db(`casos?id=eq.${t.caso_id}`, { protocolos: [...ps, prot] }, "PATCH"); extra = ` O protocolo ${prot} entrou na ficha.`; }
    }
    // o vínculo com o prazo fatal (F64) mexe na lista do To Do: fica no CRM
    const [orig] = await db(`andamentos?select=texto&id=eq.${t.andamento_id}`);
    const [cp] = await db(`casos?select=prazo&id=eq.${t.caso_id}`);
    if (cp?.prazo && String(orig?.texto || "").includes(`[PRAZO ${br(cp.prazo).replace(/\//g, ".")}]`))
      extra += ` O prazo fatal de ${br(cp.prazo)} continua no caso; dê a baixa dele pelo CRM.`;
    return texto(`Tarefa concluída no caso "${k?.titulo}" de ${k?.cliente}, por ${eu.nome}.${extra}`);
  });

  if (!robo) server.registerTool("reagendar_tarefa", {
    title: "Reagendar tarefa",
    description: "Muda a data de uma tarefa aberta e anota na linha do tempo a data antiga, a nova e o motivo.",
    inputSchema: z.object({ tarefa_id: ID, nova_data: DATA, motivo: z.string().max(500).optional() }),
    annotations: escrita,
  }, async ({ tarefa_id, nova_data, motivo }) => {
    const dia = isoDe(nova_data);
    if (!dia) return texto(`Data "${nova_data}" inválida; use AAAA-MM-DD ou DD/MM/AAAA. Nada foi gravado.`);
    if (dia < hojeSP()) return texto(`A data ${br(dia)} já passou. Nada foi gravado.`);
    const t = await tarefaAberta(tarefa_id);
    if (!t || t.concluida_em) return texto("Tarefa aberta não encontrada; nada foi gravado.");
    if (t.lembrar_em === dia) return texto(`A tarefa já está em ${br(dia)}; nada mudou.`);
    await db(`andamento_tarefas?id=eq.${tarefa_id}`, { lembrar_em: dia }, "PATCH");
    const quem = await nomeCol(t.colaborador_id);
    await anotar(t.caso_id, `🗓 Tarefa de ${quem} reagendada de ${br(t.lembrar_em)} para ${br(dia)}` + (motivo?.trim() ? `. Motivo: ${motivo.trim()}` : "."),
      { responde_a: t.andamento_id });
    return texto(`Tarefa de ${quem} reagendada de ${br(t.lembrar_em)} para ${br(dia)}.`);
  });

  // os campos que o assistente pode mudar e como cada um aparece na anotação
  const CAMPOS: Record<string, string> = { etapa: "etapa", resultado: "resultado", decisao_em: "data da decisão",
    exigencia_prazo: "prazo da exigência", exigencia_descricao: "exigência", der: "DER", dib: "DIB", dcb: "DCB", nb: "NB" };
  const DATAS = new Set(["decisao_em", "exigencia_prazo", "der", "dib", "dcb"]);
  if (!robo) server.registerTool("atualizar_caso", {
    title: "Atualizar dados do caso",
    description: "Altera a etapa, o resultado (deferido, indeferido, acordo, desistencia), a data da decisão, a exigência do INSS (descrição e prazo), DER, DIB, DCB ou NB de um caso. Grava na linha do tempo cada campo com o valor anterior e o novo. Para apagar um campo, mande texto vazio. Fase, prazo fatal e encerramento ficam no CRM. A etapa precisa ser uma das da fase do caso (ficha_cliente mostra a fase).",
    inputSchema: z.object({
      caso_id: ID,
      etapa: z.string().optional(),
      resultado: z.enum(["deferido", "indeferido", "acordo", "desistencia", ""]).optional(),
      decisao_em: DATA.optional(), exigencia_prazo: DATA.optional(), exigencia_descricao: z.string().max(1000).optional(),
      der: DATA.optional(), dib: DATA.optional(), dcb: DATA.optional(), nb: z.string().optional(),
      motivo: z.string().max(500).optional().describe("de onde veio a informação (ex.: carta de concessão de 12/09)"),
    }),
    annotations: escrita,
  }, async (args) => {
    const [k] = await db(`casos?select=id,cliente_id,titulo,fase,${Object.keys(CAMPOS).join(",")}&id=eq.${args.caso_id}`);
    if (!k) return texto("Caso não encontrado; nada foi gravado.");
    const novo: Record<string, unknown> = {}, linhas: string[] = [];
    for (const c of Object.keys(CAMPOS)) {
      const v = (args as any)[c];
      if (v === undefined) continue;
      let val: string | null = String(v).trim() || null;
      if (val && DATAS.has(c)) { val = isoDe(val); if (!val) return texto(`${CAMPOS[c]} com data inválida; nada foi gravado.`); }
      if (val && c === "nb") val = soDig(val);
      if (val && c === "etapa") {
        const ok = ETAPAS[k.fase] || [];
        if (!ok.includes(val)) return texto(`A etapa "${val}" não existe na fase ${k.fase}. Use uma destas: ${ok.join(", ") || "(esta fase não tem etapas)"}. Nada foi gravado.`);
      }
      if ((k[c] ?? null) === val) continue;
      novo[c] = val;
      const fmtv = (x: any) => x == null || x === "" ? "vazio" : DATAS.has(c) ? br(String(x)) : String(x);
      linhas.push(`${CAMPOS[c]}: ${fmtv(k[c])} → ${fmtv(val)}`);
    }
    if (!linhas.length) return texto("Nada a mudar: os valores já são esses.");
    await db(`casos?id=eq.${args.caso_id}`, novo, "PATCH");
    const cli = (await clientesDe([k.cliente_id])).get(k.cliente_id) || "";
    await anotar(args.caso_id, `✎ Caso atualizado. ${linhas.join("; ")}.` + (args.motivo?.trim() ? ` Fonte: ${args.motivo.trim()}.` : "")
      + (novo.resultado === "deferido" ? " Benefício CONCEDIDO. 🎉" : ""));
    return texto(`Caso "${k.titulo}" de ${cli} atualizado. ${linhas.join("; ")}. O valor anterior ficou anotado na linha do tempo.`);
  });

  server.registerTool("casos_com_decisao_sem_resultado", {
    title: "Casos com decisão escrita e sem resultado",
    description: "Casos em que a linha do tempo fala em deferimento, indeferimento, concessão ou acordo, mas o campo resultado está vazio. Traz o trecho e a data de cada anotação para conferir e, só com a confirmação de quem pediu, preencher com atualizar_caso (resultado e decisao_em).",
    inputSchema: z.object({ limite: z.number().int().min(1).max(50).default(15), pular: z.number().int().min(0).default(0) }),
    annotations: leitura,
  }, async ({ limite, pular }) => {
    // o PostgREST devolve no máximo mil linhas por pedido: pagina até esgotar
    const as: any[] = [];
    for (let o = 0; o < 10000; o += 1000) {
      const pg = await db(`andamentos?select=caso_id,criado_em,origem,texto&excluir=is.false&or=(texto.ilike.*deferid*,texto.ilike.*concedid*,texto.ilike.*acordo homologado*)&order=criado_em.desc,id&offset=${o}&limit=1000`);
      as.push(...pg); if (pg.length < 1000) break;
    }
    const ultima = new Map<string, any>();
    for (const a of as) if (!ultima.has(a.caso_id)) ultima.set(a.caso_id, a);
    const sem: any[] = [];
    const ids = [...ultima.keys()];
    for (let i = 0; i < ids.length; i += 150)
      sem.push(...await db(`casos?select=id,cliente_id,titulo,fase&resultado=is.null&id=in.${lista(ids.slice(i, i + 150))}`));
    const fatia = sem.slice(pular, pular + limite);
    const clientes = await clientesDe(fatia.map((k: any) => k.cliente_id));
    if (!fatia.length) return texto("Nenhum caso pendente nesta faixa.");
    return texto({ total_pendentes: sem.length, mostrando: `${pular + 1} a ${pular + fatia.length}`, casos: fatia.map((k: any) => {
      const a = ultima.get(k.id);
      return { caso_id: k.id, cliente: clientes.get(k.cliente_id) || "", caso: k.titulo, fase: k.fase,
        anotacao_em: br(String(a.criado_em).slice(0, 10)), fonte: a.origem, trecho: String(a.texto).slice(0, 400) };
    }) });
  });

  // ── etapa 4: documentos do caso ──────────────────────────────────────────
  // três fontes: os anexos enviados pelo CRM, as decisões do CRPS que a coleta
  // guardou no Storage (casos.crps) e o link da pasta do cliente no Drive
  const docsDoCaso = async (caso_id: string) => {
    const [k] = await db(`casos?select=id,cliente_id,titulo,crps&id=eq.${caso_id}`);
    if (!k) return null;
    const anexos = await db(`anexos?select=id,nome,caminho,tipo,tamanho,criado_em,caso_id&or=(caso_id.eq.${caso_id},and(caso_id.is.null,cliente_id.eq.${k.cliente_id}))&order=criado_em.desc`);
    const docs: any[] = anexos.map((a: any) => ({ documento: `anexo:${a.id}`, nome: a.nome, tipo: a.tipo,
      enviado_em: br(String(a.criado_em).slice(0, 10)), do_cliente: !a.caso_id || undefined, caminho: a.caminho }));
    for (const bl of (Array.isArray(k.crps) ? k.crps : []))
      for (const e of (bl.eventos || []))
        for (const f of (e.arquivos || [])) if (f.storage)
          docs.push({ documento: `crps:${f.storage}`, nome: f.nome || "decisão do CRPS", tipo: "application/pdf",
            data: e.data || "", nup: bl.nup, resumo: Array.isArray(f.resumo?.linhas) ? f.resumo.linhas.join(" ") : undefined, caminho: f.storage });
    const [c] = await db(`clientes?select=campos&id=eq.${k.cliente_id}`);
    return { k, docs, drive: c?.campos?.pasta_drive || null };
  };

  server.registerTool("documentos_caso", {
    title: "Documentos do caso",
    description: "Lista os documentos guardados no CRM para um caso: anexos (do caso e da ficha do cliente) e decisões do CRPS coletadas, com o identificador para ler_documento. Informa também o link da pasta do cliente no Google Drive, quando cadastrado.",
    inputSchema: z.object({ caso_id: ID }),
    annotations: leitura,
  }, async ({ caso_id }) => {
    const r = await docsDoCaso(caso_id);
    if (!r) return texto("Caso não encontrado.");
    return texto({ caso: r.k.titulo, pasta_drive: r.drive, documentos: r.docs.map(({ caminho, ...d }) => d),
      aviso: r.docs.length ? undefined : "Nenhum documento guardado no CRM para este caso; os documentos do cliente ficam na pasta do Drive." });
  });

  server.registerTool("ler_documento", {
    title: "Ler documento do caso",
    description: "Lê um documento listado por documentos_caso. PDF com texto volta como texto (em partes de 40 mil caracteres; use 'inicio' para continuar); imagem volta como imagem. PDF digitalizado sem camada de texto não é lido aqui.",
    inputSchema: z.object({ caso_id: ID, documento: z.string().regex(/^(anexo|crps):.+/), inicio: z.number().int().min(0).default(0) }),
    annotations: leitura,
  }, async ({ caso_id, documento, inicio }) => {
    const r = await docsDoCaso(caso_id);
    if (!r) return texto("Caso não encontrado.");
    const d = r.docs.find((x) => x.documento === documento);
    if (!d) return texto("Este documento não pertence a este caso.");
    const { bytes, tipo } = await db.baixar(d.caminho);
    if (bytes.length > 15e6) return texto("Arquivo grande demais para ler por aqui (mais de 15 MB); abra pelo CRM.");
    const mime = (d.tipo || tipo || "").toLowerCase();
    if (mime.startsWith("image/")) {
      let b = ""; for (let i = 0; i < bytes.length; i += 0x8000) b += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return { content: [{ type: "image" as const, data: btoa(b), mimeType: mime }] };
    }
    if (!mime.includes("pdf") && !/\.pdf$/i.test(d.nome || "")) {
      if (mime.startsWith("text/")) return texto(new TextDecoder().decode(bytes).slice(inicio, inicio + 40000));
      return texto(`Formato ${mime || "desconhecido"} não é lido por aqui; abra pelo CRM.`);
    }
    const { text, totalPages } = await extractText(await getDocumentProxy(bytes), { mergePages: true });
    const t = String(text || "").trim();
    if (t.length < 50) return texto(`O PDF "${d.nome}" (${totalPages} página(s)) é digitalizado, sem texto. Abra pelo CRM ou pela pasta do Drive.`);
    const parte = t.slice(inicio, inicio + 40000);
    return texto(`${d.nome} · ${totalPages} página(s) · caracteres ${inicio + 1} a ${inicio + parte.length} de ${t.length}`
      + (inicio + parte.length < t.length ? ` · continue com inicio=${inicio + parte.length}` : "") + `\n\n${parte}`);
  });

  // ── etapa 5: comandos prontos (prompts do MCP) ───────────────────────────
  const ESTILO = "Responda em português formal, com a conclusão primeiro, em parágrafos curtos e sem listas. Não invente dado que não veio das ferramentas.";
  const prompt = (txt: string) => ({ messages: [{ role: "user" as const, content: { type: "text" as const, text: `${txt}\n\n${ESTILO}` } }] });
  server.registerPrompt("resumo_do_dia", { title: "Resumo do meu dia",
    description: "Tarefas de hoje e vencidas, prazos e agendamentos, e o que chegou dos portais desde ontem." },
    () => prompt("Use as ferramentas do CRM Tercini. Chame agenda com dias=0 e incluir_vencidas=true, e novidades com dias=1. Diga primeiro o que vence hoje e o que está vencido, depois as perícias e audiências, e por último os movimentos dos portais que pedem providência. Indique o tarefa_id de cada tarefa, para eu poder concluir ou reagendar."));
  server.registerPrompt("situacao_do_caso", { title: "Situação completa do caso",
    description: "Ficha, linha do tempo, tarefas e documentos de um cliente, num resumo só.",
    argsSchema: z.object({ cliente: z.string().describe("nome, CPF, processo ou NB") }) },
    ({ cliente }) => prompt(`Use as ferramentas do CRM Tercini para o cliente "${cliente}": buscar_clientes, ficha_cliente, e para cada caso aberto anotacoes_caso (25 últimas), tarefas_caso e documentos_caso. Diga onde cada caso está (fase e etapa), o que foi feito por último, o que está pendente e com quem, e o próximo prazo.`));
  server.registerPrompt("novidades_dos_portais", { title: "Novidades dos portais",
    description: "Movimentos do INSS, do PJe e do CRPS num período, com o que pedem de providência.",
    argsSchema: z.object({ dias: z.string().default("3").describe("quantos dias para trás") }) },
    ({ dias }) => prompt(`Use novidades do CRM Tercini com dias=${Number(dias) || 3}. Agrupe por cliente e diga, para cada movimento, se pede providência do escritório e qual.`));
  server.registerPrompt("registrar_atendimento", { title: "Registrar atendimento",
    description: "Grava o relato de um atendimento no caso certo e propõe as tarefas que dele decorrem.",
    argsSchema: z.object({ cliente: z.string(), relato: z.string().describe("o que aconteceu no atendimento") }) },
    ({ cliente, relato }) => prompt(`Localize o cliente "${cliente}" no CRM Tercini (buscar_clientes e ficha_cliente) e identifique o caso a que o relato se refere; se houver dúvida entre casos, pergunte. Mostre-me o texto da anotação antes de gravar com registrar_anotacao. Depois proponha as tarefas que decorrem do relato (responsável, data e revisor) e só crie com criar_tarefa as que eu aprovar.\n\nRelato: ${relato}`));
  server.registerPrompt("preencher_resultados", { title: "Preencher resultados pendentes",
    description: "Confere os casos com decisão escrita nas anotações e resultado vazio, e preenche com a sua confirmação.",
    argsSchema: z.object({ quantos: z.string().default("10") }) },
    ({ quantos }) => prompt(`Use casos_com_decisao_sem_resultado do CRM Tercini com limite=${Number(quantos) || 10}. Para cada caso, leia o trecho e, se preciso, anotacoes_caso com busca "deferid" ou "indeferid". Proponha o resultado (deferido, indeferido, acordo ou desistencia) e a data da decisão, indicando a anotação que sustenta cada proposta, e marque como duvidoso o que não for inequívoco. Só grave com atualizar_caso, informando o motivo, depois que eu confirmar cada um.`));
  server.registerPrompt("agenda_da_equipe", { title: "Agenda da equipe",
    description: "A carga de tarefas de cada colaborador na semana, com o que está vencido.",
    argsSchema: z.object({ dias: z.string().default("7") }) },
    ({ dias }) => prompt(`Use equipe e agenda do CRM Tercini com quem="todos" e dias=${Number(dias) || 7}. Diga, por colaborador, quantas tarefas tem, quantas estão vencidas e quais são as mais urgentes, e aponte quem está sobrecarregado.`));

  return server;
}

// as etapas de cada fase · espelho de ETAPAS_POR_FASE em crm/fase2/app.html
// (acrescentou lá, acrescente aqui também)
const ETAPAS: Record<string, string[]> = {
  escritorio: ["em atendimento", "reunindo documentos", "análise de direito", "aguardando o cliente"],
  inss: ["requerimento protocolado", "aguardando perícia", "perícia realizada", "em exigência", "aguardando análise", "decidido"],
  conselho: ["recurso protocolado", "aguardando distribuição", "em diligência", "em pauta", "julgado"],
  judicial: ["ação distribuída", "aguardando citação", "contestação apresentada", "perícia designada", "perícia realizada", "aguardando sentença", "sentença publicada", "em recurso"],
  peticao_inicial: ["a redigir", "redigida", "a protocolar"],
  pagamento: ["aguardando implantação", "benefício implantado", "aguardando RPV", "RPV expedida", "recebido"],
  aposentadoria_futura: ["monitorando", "documentação em dia", "pronto para protocolar"],
};

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
  const [eu] = await db(`colaboradores?select=id,nome,ativo,papel&auth_id=eq.${user.id}`).catch(() => []);
  if (!eu || eu.ativo === false) return json({ error: "forbidden", error_description: "só colaborador ativo do escritório" }, 403, cors);
  const resp = await createMcpHandler(() => criarServidor(db, eu)).fetch(req);
  const h = new Headers(resp.headers); for (const [k, v] of Object.entries(cors)) h.set(k, v);
  return new Response(resp.body, { status: resp.status, headers: h });
}

// no teste local (MCP_TESTE=1) só o módulo é importado
if (!Deno.env.get("MCP_TESTE")) Deno.serve((req) => atender(req));
