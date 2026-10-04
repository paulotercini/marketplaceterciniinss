// deno run -A: MCP_TESTE=1 deno run -A crm/fase2/mcp/teste.ts
// Prova do MCP do CRM com um Supabase de mentira (dados fictícios).
// (MCP_TESTE=1 impede o index.ts de abrir o servidor ao ser importado)
import { atender } from "./index.ts";

const EU = "11111111-1111-1111-1111-111111111111", AUTH = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const CLI = "c0000000-0000-0000-0000-000000000001", CASO = "b0000000-0000-0000-0000-000000000001";
const hj = new Date().toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
const T: Record<string, any[]> = {
  colaboradores: [{ id: EU, auth_id: AUTH, nome: "Paulo Tercini", inicial: "P", cargo: "advogado", ativo: true },
    { id: "22222222-2222-2222-2222-222222222222", auth_id: null, nome: "Amanda Ficta", inicial: "A", cargo: "assistente", ativo: true }],
  clientes: [{ id: CLI, nome: "Aurélia Ficta de Souza", cpf: "12345678909", dn: "14031962", telefone: "(16) 99999-0001",
    cidade: "Monte Alto", uf: "SP", campos: { civil: { origem: "indicação" }, pasta_drive: "https://drive.google.com/drive/folders/ficticia" }, criado_em: "2026-01-10T12:00:00Z" },
    { id: "c0000000-0000-0000-0000-000000000002", nome: "Bento Ficto Lima", cpf: "98765432100", campos: {}, criado_em: "2026-02-01T12:00:00Z" }],
  casos: [{ id: CASO, cliente_id: CLI, titulo: "Aposentadoria por idade rural", especie: "B41", fase: "inss",
    processo: null, nb: "1234567890", prazo: hj, der: "2026-03-01", lembrar_motivo: "cumprir exigência", etapa: null, resultado: null, decisao_em: null, protocolos: [],
    crps: [{ nup: "44000.000001/2026-01", eventos: [{ data: "2026-08-20", arquivos: [{ nome: "Acórdão 1ª JR", storage: "crps/ficticio/acordao.pdf", decide: true, resumo: { linhas: ["Recurso provido."], origem: "regras" } }] }] }] },
    { id: "b0000000-0000-0000-0000-000000000002", cliente_id: "c0000000-0000-0000-0000-000000000002", titulo: "BPC ao idoso", especie: "B88", fase: "inss", resultado: null, protocolos: [] }],
  anexos: [{ id: "e0000000-0000-0000-0000-000000000001", caso_id: CASO, cliente_id: CLI, nome: "rg.png", caminho: "fichas/rg.png", tipo: "image/png", tamanho: 4, criado_em: "2026-09-01T12:00:00Z" }],
  andamentos: [{ id: "a1", caso_id: CASO, autor_id: EU, origem: "app", excluir: false, criado_em: new Date().toISOString(), texto: "Pedir as notas de produtor de 2019." },
    { id: "a2", caso_id: CASO, autor_id: null, origem: "pat", excluir: false, criado_em: new Date().toISOString(), texto: "INSS: exigência emitida." },
    { id: "a3", caso_id: "b0000000-0000-0000-0000-000000000002", autor_id: null, origem: "pat", excluir: false, criado_em: "2026-09-15T12:00:00Z", texto: "INSS: benefício deferido em 12/09/2026." }],
  andamento_tarefas: [{ id: "f0000000-0000-0000-0000-000000000001", caso_id: CASO, andamento_id: "a1", colaborador_id: EU, lembrar_em: hj, natureza: "compromisso", papel: "executa", concluida_em: null }],
  eventos: [],
  credenciais: [{ id: "x", cliente_id: CLI, tipo: "meu_inss", valor: "SENHA-NAO-PODE-SAIR" }],
};
const pedidos: string[] = [];
const PDF = new TextEncoder().encode(`%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 400 100]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 80>>stream
BT /F1 12 Tf 10 50 Td (ACORDAM os membros da Junta em DAR PROVIMENTO ao recurso) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`);
const fake = Deno.serve({ port: 0, onListen() {} }, async (req) => {
  const u = new URL(req.url);
  pedidos.push(req.method + " " + u.pathname + u.search);
  if (u.pathname.startsWith("/storage/v1/object/authenticated/anexos/")) {
    const c = decodeURIComponent(u.pathname.split("/anexos/")[1]);
    if (c === "crps/ficticio/acordao.pdf") return new Response(PDF, { headers: { "content-type": "application/pdf" } });
    if (c === "fichas/rg.png") return new Response(new Uint8Array([137, 80, 78, 71]), { headers: { "content-type": "image/png" } });
    return new Response("no", { status: 404 });
  }
  if (req.method === "PATCH") {
    const t = u.pathname.replace("/rest/v1/", ""), b = await req.json(), id = (u.searchParams.get("id") || "").replace("eq.", "");
    const rows = (T[t] || []).filter((r) => r.id === id); rows.forEach((r) => Object.assign(r, b));
    return Response.json(rows);
  }
  if (req.method === "POST") {
    const t = u.pathname.replace("/rest/v1/", ""), b = await req.json();
    const novos = (Array.isArray(b) ? b : [b]).map((r: any) => ({ id: crypto.randomUUID(), ...r }));
    (T[t] ||= []).push(...novos);
    return Response.json(novos, { status: 201 });
  }
  if (u.pathname === "/auth/v1/user")
    return req.headers.get("authorization") === "Bearer tok-bom" ? Response.json({ id: AUTH }) : new Response("no", { status: 401 });
  const t = u.pathname.replace("/rest/v1/", "");
  let rows = T[t] || [];
  for (const [k, v] of u.searchParams) {
    const m = /^eq\.(.*)$/.exec(v); if (m && k in (rows[0] || {})) rows = rows.filter((r) => String(r[k]) === m[1]);
    if (v === "is.null" && rows.some((r) => k in r)) rows = rows.filter((r) => r[k] == null);
    const n = /^in\.\((.*)\)$/.exec(v); if (n && k in (rows[0] || {})) rows = rows.filter((r) => n[1].split(",").includes(String(r[k])));
  }
  return Response.json(rows);
});
const BASE = `http://localhost:${fake.addr.port}`;
const ok: [string, boolean][] = []; const conf = (n: string, v: unknown) => ok.push([n, !!v]);

const rpc = async (method: string, params: unknown, token = "tok-bom", id = 1) => {
  const r = await atender(new Request(`${BASE}/functions/v1/mcp-crm`, { method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", Authorization: `Bearer ${token}`, "mcp-protocol-version": "2025-06-18" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }) }), BASE, "anon");
  const t = await r.text();
  const linha = t.split("\n").find((l) => l.startsWith("data:"));
  return { status: r.status, headers: r.headers, corpo: linha ? JSON.parse(linha.slice(5)) : (t ? JSON.parse(t) : null) };
};

// sem token: 401 apontando para a descoberta
const sem = await atender(new Request(`${BASE}/functions/v1/mcp-crm`, { method: "POST", body: "{}" }), BASE, "anon");
await sem.text();
conf("sem token responde 401 com resource_metadata", sem.status === 401 && /resource_metadata=".*\/functions\/v1\/mcp-crm\/\.well-known\/oauth-protected-resource"/.test(sem.headers.get("www-authenticate") || ""));
const meta = await (await atender(new Request(`${BASE}/functions/v1/mcp-crm/.well-known/oauth-protected-resource`), BASE, "anon")).json();
conf("a descoberta aponta o servidor de autorização do Supabase", meta.authorization_servers[0] === `${BASE}/auth/v1` && meta.resource.endsWith("/functions/v1/mcp-crm"));
const semA = await atender(new Request(`${BASE}/functions/v1/mcp-crm/assistente`, { method: "POST", body: "{}" }), BASE, "anon"); await semA.text();
const metaA = await (await atender(new Request(`${BASE}/functions/v1/mcp-crm/assistente/.well-known/oauth-protected-resource`), BASE, "anon")).json();
conf("o endereço do assistente anuncia a si mesmo como recurso", /mcp-crm\/assistente\/\.well-known/.test(semA.headers.get("www-authenticate") || "") && metaA.resource.endsWith("/functions/v1/mcp-crm/assistente"));
const iniA = await atender(new Request(`${BASE}/functions/v1/mcp-crm/assistente`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", Authorization: "Bearer tok-bom", "mcp-protocol-version": "2025-06-18" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 9, method: "tools/list", params: {} }) }), BASE, "anon");
conf("o endereço do assistente atende o MCP", iniA.status === 200 && (await iniA.text()).includes("buscar_clientes"));
conf("token inválido é recusado", (await rpc("tools/list", {}, "tok-ruim")).status === 401);

const ini = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "teste", version: "1" } });
conf("initialize responde com o nome do servidor", ini.corpo?.result?.serverInfo?.name === "crm-tercini");
const tl = await rpc("tools/list", {}, "tok-bom", 2);
const nomes = (tl.corpo?.result?.tools || []).map((t: any) => t.name).sort();
conf(`as quinze ferramentas (${nomes.join(",")})`, JSON.stringify(nomes) === JSON.stringify(["agenda", "anotacoes_caso", "atualizar_caso", "buscar_clientes", "casos_com_decisao_sem_resultado", "concluir_tarefa", "criar_tarefa", "documentos_caso", "equipe", "ficha_cliente", "ler_documento", "novidades", "reagendar_tarefa", "registrar_anotacao", "tarefas_caso"]));
const ESCREVE = ["atualizar_caso", "concluir_tarefa", "criar_tarefa", "reagendar_tarefa", "registrar_anotacao"];
conf("leitura marcada só leitura e escrita marcada não destrutiva", (tl.corpo?.result?.tools || []).every((t: any) =>
  ESCREVE.includes(t.name) ? t.annotations?.readOnlyHint === false && t.annotations?.destructiveHint === false : t.annotations?.readOnlyHint));

const call = async (name: string, args: unknown) => {
  const r = await rpc("tools/call", { name, arguments: args }, "tok-bom", 3);
  return r.corpo?.result?.content?.[0]?.text || JSON.stringify(r.corpo);
};
const busca = await call("buscar_clientes", { texto: "12345678909" });
conf("buscar pelo CPF acha a cliente", busca.includes("Aurélia Ficta"));
const ficha = await call("ficha_cliente", { cliente_id: CLI });
conf("a ficha traz casos, origem e NB", ficha.includes("B41") && ficha.includes("indicação") && ficha.includes("1234567890"));
const notas = await call("anotacoes_caso", { caso_id: CASO });
conf("a linha do tempo traz o autor", notas.includes("Paulo Tercini") && notas.includes("notas de produtor"));
const ag = await call("agenda", {});
conf("a agenda traz a tarefa e o prazo fatal de hoje", ag.includes("compromisso") && ag.includes("PRAZO FATAL") && ag.includes("notas de produtor"));
const nov = await call("novidades", { dias: 3 });
conf("novidades traz o movimento do PAT", nov.includes("exigência emitida") && !nov.includes("notas de produtor"));
conf("nenhuma chamada tocou a tabela de credenciais", !pedidos.some((p) => p.includes("credenciais")) && !(busca + ficha + notas + ag + nov).includes("SENHA"));

// etapa 2 · escrita
const nAnd = () => T.andamentos.length, nTf = () => T.andamento_tarefas.length;
const r1 = await call("registrar_anotacao", { caso_id: CASO, texto: "Cliente trouxe as notas de produtor." });
const nova = T.andamentos.at(-1);
conf("registrar_anotacao grava com o autor logado e a marca mcp", r1.includes("Aurélia Ficta") && nova.autor_id === EU && nova.origem === "app" && /^mcp:/.test(nova.origem_id) && nova.texto === "Cliente trouxe as notas de produtor.");
const amanha = new Date(Date.now() + 864e5).toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
const a0 = nAnd(), t0 = nTf();
const r2 = await call("criar_tarefa", { caso_id: CASO, o_que: "Protocolar o cumprimento da exigência", data: amanha.split("-").reverse().join("/"), para: ["A"], revisor: "Paulo" });
const tfs = T.andamento_tarefas.slice(t0);
conf("criar_tarefa grava a anotação, a executora e o revisor", r2.includes("Amanda Ficta") && r2.includes("revisão de Paulo") && nAnd() === a0 + 1 && tfs.length === 2
  && tfs.every((t: any) => t.andamento_id === T.andamentos.at(-1).id && t.atribuido_por === EU && t.lembrar_em === amanha)
  && tfs.find((t: any) => t.papel === "revisa")?.colaborador_id === EU && tfs.find((t: any) => t.papel === "executa")?.colaborador_id !== EU);
const a1 = nAnd(), t1 = nTf();
const r3 = await call("criar_tarefa", { caso_id: CASO, o_que: "Algo atrasado", data: "2020-01-01" });
const r4 = await call("criar_tarefa", { caso_id: CASO, o_que: "Para ninguém", data: amanha, para: ["Zé"] });
const r5 = await call("registrar_anotacao", { caso_id: "b0000000-0000-0000-0000-000000000999", texto: "caso que não existe" });
conf("data passada, colaborador inexistente e caso inexistente não gravam nada", /já passou/.test(r3) && /Não achei/.test(r4) && /não encontrado/.test(r5) && nAnd() === a1 && nTf() === t1);

// etapa 3 · fechar o ciclo e atualizar o caso
const TF = "f0000000-0000-0000-0000-000000000001";
const ag2 = await call("agenda", {});
conf("a agenda traz o tarefa_id", ag2.includes(TF));
conf("tarefas_caso lista a tarefa aberta", (await call("tarefas_caso", { caso_id: CASO })).includes(TF));
const em3 = new Date(Date.now() + 3 * 864e5).toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
const rr = await call("reagendar_tarefa", { tarefa_id: TF, nova_data: em3, motivo: "cliente viaja" });
conf("reagendar muda a data e anota a antiga e o motivo", T.andamento_tarefas[0].lembrar_em === em3 && T.andamentos.at(-1).texto.includes(`para ${em3.split("-").reverse().join("/")}`)
  && T.andamentos.at(-1).texto.includes("cliente viaja") && T.andamentos.at(-1).responde_a === "a1" && rr.includes("reagendada"));
const rc = await call("concluir_tarefa", { tarefa_id: TF, o_que_foi_feito: "Exigência cumprida", protocolo: "123.456.789" });
const caso = T.casos[0];
conf("concluir dá baixa, responde ao pedido e leva o protocolo à ficha", !!T.andamento_tarefas[0].concluida_em && T.andamentos.at(-1).texto === "✔ Exigência cumprida — Protocolo: 123456789"
  && T.andamentos.at(-1).responde_a === "a1" && caso.protocolos.includes("123456789") && rc.includes("protocolo 123456789"));
conf("concluir de novo é recusado", (await call("concluir_tarefa", { tarefa_id: TF })).includes("já estava concluída"));
const a2n = nAnd();
const ru = await call("atualizar_caso", { caso_id: CASO, etapa: "julgado" });
conf("etapa fora da fase é recusada sem gravar", ru.includes("não existe na fase inss") && caso.etapa === null && nAnd() === a2n);
const pend = await call("casos_com_decisao_sem_resultado", {});
conf("a lista de pendentes traz o caso com 'deferido' na anotação", pend.includes("Bento Ficto") && pend.includes("deferido em 12/09/2026"));
const ru2 = await call("atualizar_caso", { caso_id: CASO, etapa: "em exigência", resultado: "deferido", decisao_em: "10/09/2026", motivo: "carta de concessão" });
conf("atualizar grava e anota o antes e o depois", caso.etapa === "em exigência" && caso.resultado === "deferido" && caso.decisao_em === "2026-09-10"
  && /etapa: vazio → em exigência/.test(T.andamentos.at(-1).texto) && /data da decisão: vazio → 10\/09\/2026/.test(T.andamentos.at(-1).texto)
  && T.andamentos.at(-1).texto.includes("carta de concessão") && ru2.includes("valor anterior"));
conf("repetir os mesmos valores não grava nada", (await call("atualizar_caso", { caso_id: CASO, resultado: "deferido" })).includes("Nada a mudar"));

// etapa 4 · documentos
const ld = await call("documentos_caso", { caso_id: CASO });
conf("documentos_caso traz o anexo, a decisão do CRPS e a pasta do Drive", ld.includes("anexo:e0000000") && ld.includes("crps:crps/ficticio/acordao.pdf")
  && ld.includes("drive.google.com") && ld.includes("Recurso provido") && !ld.includes("fichas/rg.png"));
const lp = await call("ler_documento", { caso_id: CASO, documento: "crps:crps/ficticio/acordao.pdf" });
conf("ler_documento extrai o texto do PDF", lp.includes("DAR PROVIMENTO") && lp.includes("1 página"));
const li = await rpc("tools/call", { name: "ler_documento", arguments: { caso_id: CASO, documento: "anexo:e0000000-0000-0000-0000-000000000001" } }, "tok-bom", 5);
conf("imagem volta como imagem", li.corpo?.result?.content?.[0]?.type === "image" && li.corpo.result.content[0].mimeType === "image/png");
conf("documento de outro caso é recusado", (await call("ler_documento", { caso_id: "b0000000-0000-0000-0000-000000000002", documento: "crps:crps/ficticio/acordao.pdf" })).includes("não pertence"));

// etapa 5 · comandos prontos
const pl = await rpc("prompts/list", {}, "tok-bom", 6);
const pn = (pl.corpo?.result?.prompts || []).map((x: any) => x.name).sort();
conf(`seis comandos prontos (${pn.join(",")})`, JSON.stringify(pn) === JSON.stringify(["agenda_da_equipe", "novidades_dos_portais", "preencher_resultados", "registrar_atendimento", "resumo_do_dia", "situacao_do_caso"]));
const pg = await rpc("prompts/get", { name: "situacao_do_caso", arguments: { cliente: "Aurélia" } }, "tok-bom", 7);
conf("o comando leva o argumento ao texto", String(pg.corpo?.result?.messages?.[0]?.content?.text || "").includes('"Aurélia"'));

conf("a escrita só toca andamentos, tarefas e casos", pedidos.filter((p) => !p.startsWith("GET")).every((p) =>
  /^POST \/rest\/v1\/(andamentos|andamento_tarefas)$/.test(p) || /^PATCH \/rest\/v1\/(andamento_tarefas|casos)\?id=eq\./.test(p)));

// a conta do assistente não conclui, não reagenda e não altera o caso
T.colaboradores[0].papel = "assistente_ia";
const tlr = await rpc("tools/list", {}, "tok-bom", 8);
const nr = (tlr.corpo?.result?.tools || []).map((t: any) => t.name);
conf("a conta do assistente fica sem concluir, reagendar e atualizar, e mantém anotar e criar tarefa", nr.length === 12
  && !nr.includes("concluir_tarefa") && !nr.includes("reagendar_tarefa") && !nr.includes("atualizar_caso") && nr.includes("registrar_anotacao") && nr.includes("criar_tarefa"));
T.colaboradores[0].papel = undefined;

// colaborador inativo não passa
T.colaboradores[0].ativo = false;
conf("colaborador inativo recebe 403", (await rpc("tools/list", {}, "tok-bom", 4)).status === 403);

for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
const f = ok.filter(([, v]) => !v).length;
console.log(`${ok.length - f}/${ok.length} passaram`);
await fake.shutdown();
Deno.exit(f ? 1 : 0);
