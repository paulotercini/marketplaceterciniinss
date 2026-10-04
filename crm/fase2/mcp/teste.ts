// deno run -A: MCP_TESTE=1 deno run -A crm/fase2/mcp/teste.ts
// Prova do MCP do CRM com um Supabase de mentira (dados fictícios).
// (MCP_TESTE=1 impede o index.ts de abrir o servidor ao ser importado)
import { atender } from "./index.ts";

const EU = "11111111-1111-1111-1111-111111111111", AUTH = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const CLI = "c0000000-0000-0000-0000-000000000001", CASO = "b0000000-0000-0000-0000-000000000001";
const hj = new Date().toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
const T: Record<string, any[]> = {
  colaboradores: [{ id: EU, auth_id: AUTH, nome: "Paulo Tercini", inicial: "P", cargo: "advogado", ativo: true }],
  clientes: [{ id: CLI, nome: "Aurélia Ficta de Souza", cpf: "12345678909", dn: "14031962", telefone: "(16) 99999-0001",
    cidade: "Monte Alto", uf: "SP", campos: { civil: { origem: "indicação" } }, criado_em: "2026-01-10T12:00:00Z" }],
  casos: [{ id: CASO, cliente_id: CLI, titulo: "Aposentadoria por idade rural", especie: "B41", fase: "inss",
    processo: null, nb: "1234567890", prazo: hj, der: "2026-03-01", lembrar_motivo: "cumprir exigência" }],
  andamentos: [{ id: "a1", caso_id: CASO, autor_id: EU, origem: "app", excluir: false, criado_em: new Date().toISOString(), texto: "Pedir as notas de produtor de 2019." },
    { id: "a2", caso_id: CASO, autor_id: null, origem: "pat", excluir: false, criado_em: new Date().toISOString(), texto: "INSS: exigência emitida." }],
  andamento_tarefas: [{ caso_id: CASO, andamento_id: "a1", colaborador_id: EU, lembrar_em: hj, natureza: "compromisso", papel: "executa", concluida_em: null }],
  eventos: [],
  credenciais: [{ id: "x", cliente_id: CLI, tipo: "meu_inss", valor: "SENHA-NAO-PODE-SAIR" }],
};
const pedidos: string[] = [];
const fake = Deno.serve({ port: 0, onListen() {} }, (req) => {
  const u = new URL(req.url);
  pedidos.push(u.pathname + u.search);
  if (u.pathname === "/auth/v1/user")
    return req.headers.get("authorization") === "Bearer tok-bom" ? Response.json({ id: AUTH }) : new Response("no", { status: 401 });
  const t = u.pathname.replace("/rest/v1/", "");
  let rows = T[t] || [];
  for (const [k, v] of u.searchParams) {
    const m = /^eq\.(.*)$/.exec(v); if (m && k in (rows[0] || {})) rows = rows.filter((r) => String(r[k]) === m[1]);
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
conf("token inválido é recusado", (await rpc("tools/list", {}, "tok-ruim")).status === 401);

const ini = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "teste", version: "1" } });
conf("initialize responde com o nome do servidor", ini.corpo?.result?.serverInfo?.name === "crm-tercini");
const tl = await rpc("tools/list", {}, "tok-bom", 2);
const nomes = (tl.corpo?.result?.tools || []).map((t: any) => t.name).sort();
conf(`as seis ferramentas de leitura (${nomes.join(",")})`, JSON.stringify(nomes) === JSON.stringify(["agenda", "anotacoes_caso", "buscar_clientes", "equipe", "ficha_cliente", "novidades"]));
conf("todas marcadas como só leitura", (tl.corpo?.result?.tools || []).every((t: any) => t.annotations?.readOnlyHint));

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

// colaborador inativo não passa
T.colaboradores[0].ativo = false;
conf("colaborador inativo recebe 403", (await rpc("tools/list", {}, "tok-bom", 4)).status === 403);

for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
const f = ok.filter(([, v]) => !v).length;
console.log(`${ok.length - f}/${ok.length} passaram`);
await fake.shutdown();
Deno.exit(f ? 1 : 0);
