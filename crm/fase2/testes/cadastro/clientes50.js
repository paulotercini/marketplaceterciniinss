// F447 · 50 percursos de clientes fictícios pela equipe inteira (Paulo, administrador; Amanda, advogada; Ingrid,
// recepção), com foco no acesso ao cliente e na comunicação entre a equipe: a pesquisa por nome, CPF, telefone e
// número do caso; as menções com e sem caso e a resposta Ok; o cliente novo e o Pronto do balcão; o pedido ao
// cliente, as tentativas sem resposta, o concluir por hoje passado a outra pessoa, a tarefa concluída de quem a
// passou e o advogado responsável. Banco simulado e dados fictícios. Uso: node clientes50.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";

const PAULO = FIX.colaboradores[0].id;
const AMANDA = "22222222-2222-2222-2222-222222222222", AUTH_A = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const INGRID = "33333333-3333-3333-3333-333333333333", AUTH_I = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const MARCOS = "44444444-4444-4444-4444-444444444444";
const sess = (auth, email) => ({ ...SESSAO, user: { id: auth, email } });

// 50 clientes com CPF válido, telefone próprio e um caso cada
const dv = b => { const r = n => { let s = 0; for (let i = 0; i < n; i++) s += +b[i] * (n + 1 - i); const d = 11 - s % 11; return d > 9 ? 0 : d; };
  b += r(9); return b + r(10); };
const pad = (n, l) => String(n).padStart(l, "0");
const NOMES = ["Aurora", "Benedito", "Cecília", "Durval", "Eunice", "Fausto", "Geralda", "Horácio", "Iracema", "Jandira"];
const SOBRE = ["Fictícia Pereira", "Fictício Antunes", "Fictícia Brandão", "Fictício Seixas", "Fictícia Lourenço"];
const clientes = [], casos = [], atribuicoes = [];
for (let i = 1; i <= 50; i++) {
  const id = `c5000000-0000-4000-8000-${pad(i, 12)}`, kid = `b5000000-0000-4000-8000-${pad(i, 12)}`;
  const fase = ["inss", "judicial", "conselho"][i % 3];
  clientes.push({ id, nome: `${NOMES[i % 10]} ${SOBRE[i % 5]} ${pad(i, 2)}`.replace(/ (\d\d)$/, (m, n) => " " + "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[+n % 26] + "ilva" + n),
    cpf: dv(pad(100000000 + i * 7919, 9)), dn: "01011960", telefone: `(16) 98${pad(i, 3)}-${pad(1000 + i, 4)}`,
    telefones: [{ numero: `(16) 98${pad(i, 3)}-${pad(1000 + i, 4)}`, obs: "principal", zap: true },
      { numero: `(16) 97${pad(i, 3)}-${pad(5000 + i, 4)}`, obs: "da filha", zap: true }],
    campos: {}, criado_em: "2026-01-10T12:00:00Z" });
  casos.push({ ...FIX.casos[0], id: kid, cliente_id: id, fase, origem_lista: { inss: "🌻 INSS", judicial: "👪 Judicial", conselho: "🖥 Conselho de Recursos" }[fase],
    nb: pad(7000000000 + i, 10), protocolos: [pad(1800000000 + i * 3, 10)],
    processo: fase === "judicial" ? `50${pad(i, 5)}-${pad(i, 2)}.2026.4.03.6314` : null, processos: [],
    crps_nups: fase === "conselho" ? [`44234.${pad(i, 6)}/2026-11`] : [], criado_em: "2026-02-01T12:00:00Z" });
  if (i % 4 !== 0) atribuicoes.push({ caso_id: kid, colaborador_id: i % 2 ? AMANDA : PAULO });
}
const C = i => clientes[i - 1], K = i => casos[i - 1];
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, {
  colaboradores: [...FIX.colaboradores,
    { id: AMANDA, auth_id: AUTH_A, nome: "Amanda Garcez", inicial: "A", cor: "#b58900", papel: "colaborador", ativo: true, cargo: "advogado" },
    { id: INGRID, auth_id: AUTH_I, nome: "Ingrid Fictícia", inicial: "I", cor: "#8a4b00", papel: "colaborador", ativo: true, cargo: "recepcao" },
    { id: MARCOS, auth_id: "dddddddd-dddd-dddd-dddd-dddddddddddd", nome: "Marcos Fictício", inicial: "M", cor: "#5f8a6b", papel: "colaborador", ativo: true, cargo: "advogado" }],
  clientes, casos, atribuicoes, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento,
  config_app: [...(FIX.config_app || [])] });
// a tarefa que o Paulo passou à Ingrid (cliente 37)
dados.andamentos.push({ id: "a5000000-0000-4000-8000-000000000037", caso_id: K(37).id, autor_id: PAULO, texto: "@Ingrid ligar para a cliente e pedir o RG", criado_em: "2026-11-05T12:00:00Z", origem: "app" });
dados.andamento_tarefas.push({ id: "d5000000-0000-4000-8000-000000000037", andamento_id: "a5000000-0000-4000-8000-000000000037", caso_id: K(37).id,
  colaborador_id: INGRID, atribuido_por: PAULO, lembrar_em: "2026-11-06", natureza: "compromisso", papel: "executa", criado_em: "2026-11-05T12:00:00Z" });
const banco = new Banco(dados);
const T = banco.t;
const menc = (para, f = () => true) => T.mencoes.filter(m => m.para_id === para && f(m));

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const URL_APP = `http://127.0.0.1:${s.address().port}/app.html?tema=v10`;
  const nav = await chromium.launch();
  const erros = [];
  const entrar = async (ss) => {
    const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(([u, ss]) => {
      localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
      localStorage.setItem("crm_sessao", JSON.stringify(ss));
      localStorage.setItem("crm_tema", "v10");
      window._abertas = []; window.open = u => { window._abertas.push(u); return {}; };
    }, [SUPA, ss]);
    await instalarBanco(ctx, { SUPA, SESSAO: ss, banco });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(/script\.google\.com/, r => r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"eventos":[]}' }));
    const p = await ctx.newPage();
    p.on("pageerror", e => erros.push(e.message));
    p.on("dialog", d => d.accept());
    p.recarregar = async () => { await p.goto(URL_APP); await p.waitForSelector("#app.logado", { timeout: 20000 }); await p.waitForTimeout(400); };
    await p.recarregar();
    return p;
  };
  const P = await entrar(SESSAO), A = await entrar(sess(AUTH_A, "amanda@exemplo.invalido")), I = await entrar(sess(AUTH_I, "ingrid@exemplo.invalido"));
  const ev = (p, fn, arg) => p.evaluate(fn, arg);
  const acha = (p, txt) => ev(p, t => pesquisar(t).map(c => c.id), txt);
  const espera = ms => new Promise(r => setTimeout(r, ms));

  // ── 1. A pesquisa (clientes 1 a 13) ───────────────────────────────────────────────────────────────────────────
  conf("01 · acha pelo nome", (await acha(I, C(1).nome.split(" ").slice(0, 2).join(" "))).includes(C(1).id));
  conf("02 · acha pelo nome sem acento", (await acha(I, C(2).nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase())).includes(C(2).id));
  conf("03 · acha pelo CPF com pontos", (await acha(I, C(3).cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")))[0] === C(3).id);
  conf("04 · acha pelo CPF só com números", (await acha(I, C(4).cpf))[0] === C(4).id);
  conf("05 · acha pelo telefone principal escrito como na ficha", (await acha(I, C(5).telefone)).includes(C(5).id));
  conf("06 · acha pelo telefone sem o DDD", (await acha(I, C(6).telefone.replace(/\D/g, "").slice(2))).includes(C(6).id));
  conf("07 · acha pelo segundo telefone (da filha)", (await acha(I, C(7).telefones[1].numero)).includes(C(7).id));
  conf("08 · acha pelo telefone copiado do WhatsApp, com +55", (await acha(I, "+55 " + C(8).telefone)).includes(C(8).id));
  conf("09 · acha pelo telefone sem o nono dígito", (await acha(I, "16" + C(9).telefone.replace(/\D/g, "").slice(3))).includes(C(9).id));
  conf("10 · acha pelo NB", (await acha(I, K(10).nb))[0] === C(10).id);
  conf("11 · acha pelo NUP do CRPS", (await acha(I, K(11).crps_nups[0]))[0] === C(11).id);
  conf("12 · acha pelo protocolo do INSS", (await acha(I, K(12).protocolos[0]))[0] === C(12).id);
  conf("13 · acha pelo processo judicial com pontos", (await acha(I, K(13).processo))[0] === C(13).id);

  // ── 2. As menções (clientes 14 a 23) ──────────────────────────────────────────────────────────────────────────
  await ev(P, async k => { const [a] = await api(`/rest/v1/andamentos`, { method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ caso_id: k, autor_id: eu.id, texto: "@Ingrid confirmar o telefone da cliente" }) });
    await criarMencoes(a.texto, k, a.id); }, K(14).id);
  conf("14 · @Ingrid no caso chega à Ingrid com o caso", menc(INGRID, m => m.caso_id === K(14).id).length === 1);
  await I.recarregar();
  const m14 = menc(INGRID, m => m.caso_id === K(14).id)[0];
  await ev(I, id => responderMencao(id, "Ok."), m14.id); await espera(300);
  conf("15 · o Ok da Ingrid vira resposta no caso e volta ao Paulo",
    T.andamentos.some(a => a.caso_id === K(14).id && a.responde_a === m14.andamento_id && /Ok\./.test(a.texto)) &&
    menc(PAULO, m => m.caso_id === K(14).id && /respondeu/.test(m.texto)).length === 1 && !!m14.lida_em);
  const n16 = T.mencoes.length;
  await ev(P, k => criarMencoes("@Fulano veja isto", k, null), K(16).id);
  conf("16 · @Fulano, que não é da equipe, não cria menção e avisa", T.mencoes.length === n16 &&
    /não é ninguém da equipe/.test(await ev(P, () => (document.getElementById("aviso") || document.body).textContent)));
  await ev(P, k => criarMencoes("@Paulo lembrar", k, null), K(17).id);
  conf("17 · ninguém menciona a si mesmo", T.mencoes.length === n16);
  const n18 = await ev(I, c => avisarClienteNovo(c), C(18).id);
  conf("18 · cliente novo da recepção avisa Amanda e Paulo com a ficha", n18 >= 2 &&
    menc(AMANDA, m => m.cliente_id === C(18).id).length === 1 && menc(PAULO, m => m.cliente_id === C(18).id).length === 1);
  await A.recarregar();
  const m18 = menc(AMANDA, m => m.cliente_id === C(18).id)[0];
  const html19 = await ev(A, () => { visao = "mencoes"; render(); return document.getElementById("conteudo-meio").innerHTML; });
  conf("19 · a menção sem caso também tem Ok e Feito", new RegExp(`responderMencao\\('${m18.id}'`).test(html19));
  await ev(A, id => responderMencao(id, "Ok."), m18.id); await espera(300);
  conf("20 · o Ok da Amanda ao cliente novo volta à Ingrid e baixa a menção",
    menc(INGRID, m => m.cliente_id === C(18).id && /respondeu/.test(m.texto)).length === 1 && !!m18.lida_em);
  await ev(I, c => { D.cliPorId.get(c).campos = {}; return balcaoPronto(c); }, C(21).id);
  conf("21 · o Pronto do balcão diz o estado do cadastro aos advogados",
    menc(AMANDA, m => m.cliente_id === C(21).id && /pronto para o atendimento/.test(m.texto)).length === 1);
  await ev(P, k => criarMencoes("@A conferir o laudo", k, null), K(22).id);
  conf("22 · @A (a inicial) chega à Amanda", menc(AMANDA, m => m.caso_id === K(22).id).length === 1);
  await ev(P, k => criarMencoes("@Ingrid e @Amanda, combinar a perícia", k, null), K(23).id);
  conf("23 · duas pessoas citadas, duas menções", menc(AMANDA, m => m.caso_id === K(23).id).length === 1 && menc(INGRID, m => m.caso_id === K(23).id).length === 1);

  // ── 3. Pedido ao cliente e contato sem resposta (clientes 24 a 33) ────────────────────────────────────────────
  await ev(A, async k => { pedirAoCliente(k); document.getElementById("pc-itens").value = "Relatório médico atualizado\nRG"; await gravarPedidoAoCliente(k); }, K(24).id);
  await espera(300);
  const c24 = T.clientes.find(c => c.id === C(24).id);
  conf("24 · o pedido grava os dois papéis presos ao caso", ((c24.campos || {}).docs_pedidos || []).some(p => p.caso_id === K(24).id && p.itens.length === 2));
  conf("25 · o pedido vira anotação [DOCUMENTOS] no caso", T.andamentos.some(a => a.caso_id === K(24).id && /^\[DOCUMENTOS\]/.test(a.texto)));
  conf("26 · a recepção recebe o pedido para falar com o cliente", menc(INGRID, m => m.caso_id === K(24).id).length === 1);
  conf("27 · a data de entrega vira lembrete de quem pediu", T.andamento_tarefas.some(t => t.caso_id === K(24).id && t.colaborador_id === AMANDA && t.natureza === "lembrete" && t.lembrar_em));
  const n28 = menc(INGRID).length;
  await ev(I, async k => { pedirAoCliente(k); document.getElementById("pc-itens").value = "CTPS"; await gravarPedidoAoCliente(k); }, K(28).id);
  await espera(300);
  conf("28 · a recepção que pede não se avisa", menc(INGRID).length === n28 && T.andamentos.some(a => a.caso_id === K(28).id && /CTPS/.test(a.texto)));
  const tentar = async (p, k) => { await ev(p, async k => { D._andsFicha = (await api(`/rest/v1/andamentos?caso_id=eq.${k}&select=*`)) || []; await semResposta(k, "telefone"); fecharCaixa(); }, k); await espera(200); };
  await tentar(I, K(29).id);
  conf("29 · sem resposta anota a 1ª tentativa e marca a próxima", T.andamentos.some(a => a.caso_id === K(29).id && /1ª tentativa/.test(a.texto)) &&
    T.andamento_tarefas.some(t => t.caso_id === K(29).id && t.natureza === "lembrete"));
  await tentar(I, K(29).id);
  conf("30 · a 2ª tentativa conta como 2ª", T.andamentos.some(a => a.caso_id === K(29).id && /2ª tentativa/.test(a.texto)));
  await tentar(I, K(29).id);
  conf("31 · na 3ª tentativa o advogado do caso fica sabendo", menc(AMANDA, m => m.caso_id === K(29).id).length === 1);
  conf("32 · a mensagem pronta usa o primeiro nome do cliente", (await ev(I, c => msgRetorno(D.cliPorId.get(c)), C(32).id)).startsWith(`Olá, ${C(32).nome.split(" ")[0]}!`));
  const bal = await ev(I, c => { const r = pedidosDoBalcao(c); return r.grupos.flatMap(g => g.itens).map(i => i.nome); }, C(24).id).catch(() => []);
  await I.recarregar();
  const bal2 = await ev(I, c => pedidosDoBalcao(c).grupos.flatMap(g => g.itens).map(i => i.nome), C(24).id);
  conf("33 · o Trouxe documentos da recepção mostra o que a advogada pediu", bal2.some(n => /Relatório médico/.test(n)) || bal.some(n => /Relatório médico/.test(n)));

  // ── 4. Concluir por hoje, tarefas e advogado responsável (clientes 34 a 43) ───────────────────────────────────
  await ev(P, k => aplicarDespacho(D.casoPorId.get(k), { data: "2026-11-20", para: "33333333-3333-3333-3333-333333333333" }, ""), K(34).id); await espera(300);
  conf("34 · passar o cliente à Ingrid a avisa", menc(INGRID, m => m.caso_id === K(34).id && /passou a você/.test(m.texto)).length === 1);
  conf("35 · a Ingrid entra no caso", T.atribuicoes.some(a => a.caso_id === K(34).id && a.colaborador_id === INGRID));
  await ev(P, k => aplicarDespacho(D.casoPorId.get(k), { data: "2026-11-21" }, "Aguardar a perícia. @Amanda conferir depois"), K(36).id); await espera(300);
  conf("36 · a @Amanda escrita no concluir por hoje é avisada", menc(AMANDA, m => m.caso_id === K(36).id).length === 1);
  await I.recarregar();
  const t37 = await ev(I, a => (itensAgendaTodos() || []).some(i => i.andId === a), "a5000000-0000-4000-8000-000000000037").catch(() => false);
  await ev(I, async id => { D.tarefasFicha = (await api(`/rest/v1/andamento_tarefas?id=eq.${id}&select=*`)) || []; await concluirDeVez(id, "Liguei e pedi o RG"); }, "d5000000-0000-4000-8000-000000000037");
  await espera(300);
  conf("37 · concluir a tarefa que o Paulo passou avisa o Paulo", menc(PAULO, m => m.caso_id === K(37).id && /Liguei/.test(m.texto)).length === 1);
  conf("38 · a tarefa passada à Ingrid aparecia no Meu Dia dela", t37);
  await ev(P, ([c, a]) => gravarAdvogado(c, a), [C(39).id, MARCOS]);
  conf("39 · o advogado escolhido na ficha vale primeiro", (await ev(P, c => advogadoDoCliente(c)[0], C(39).id)) === MARCOS);
  conf("40 · sem escolha, vale o advogado atribuído ao caso", (await ev(P, c => advogadoDoCliente(c)[0], C(41).id)) === AMANDA);
  conf("41 · sem ninguém atribuído, vale o administrador", (await ev(P, c => advogadoDoCliente(c)[0], C(40).id)) === PAULO);
  await ev(I, k => anotarUmClique(k, "Cliente avisou que vem amanhã", { lembrarEm: "2026-11-10" }), K(42).id); await espera(200);
  conf("42 · anotação de um clique com lembrete", T.andamentos.some(a => a.caso_id === K(42).id && /vem amanhã/.test(a.texto)) &&
    T.andamento_tarefas.some(t => t.caso_id === K(42).id && t.lembrar_em === "2026-11-10"));
  await ev(P, k => criarMencoes("@Ingrid veja a conversa", k, null, [], "e5000000-0000-4000-8000-000000000043"), K(43).id);
  conf("43 · a menção da nota do WhatsApp leva a conversa", menc(INGRID, m => m.conversa_id === "e5000000-0000-4000-8000-000000000043").length === 1);

  // ── 5. Cadastro e quem é avisado (clientes 44 a 50) ───────────────────────────────────────────────────────────
  conf("44 · o telefone principal acha a ficha (agenda e WhatsApp)", (await ev(I, t => clientesDoTelefone(t).map(c => c.id), C(44).telefone)).includes(C(44).id));
  conf("45 · o segundo telefone também acha a ficha", (await ev(I, t => clientesDoTelefone(t).map(c => c.id), C(45).telefones[1].numero)).includes(C(45).id));
  conf("46 · o telefone com +55 acha a ficha", (await ev(I, t => clientesDoTelefone(t).map(c => c.id), "+55" + C(46).telefone.replace(/\D/g, ""))).includes(C(46).id));
  const quem = await ev(I, () => quemAvisaClienteNovo().map(c => c.nome.split(" ")[0]));
  conf("47 · cliente novo avisa Amanda e Paulo (e os advogados)", quem.includes("Amanda") && quem.includes("Paulo") && !quem.includes("Ingrid"));
  await ev(P, c => avisarClienteNovo(c), C(48).id);
  conf("48 · quem cadastra não se avisa", menc(PAULO, m => m.cliente_id === C(48).id).length === 0 && menc(AMANDA, m => m.cliente_id === C(48).id).length === 1);
  conf("49 · cliente com CPF entra na lista Clientes", await ev(I, c => ehClienteDaLista(D.cliPorId.get(c)), C(49).id));
  const novo = dv("987654321");
  conf("50 · CPF que ninguém tem oferece o cadastro", (await acha(I, novo)).length === 0 && /bn-cli/.test(await ev(I, t => saidaNovoCliente(t, []), novo)));

  conf("sem erro de página", erros.length === 0);
  if (erros.length) console.log(erros.slice(0, 5).join("\n"));
  const n = ok.filter(x => x[1]).length;
  console.log(`\n${n}/${ok.length} provas passaram`);
  await nav.close(); s.close();
  process.exit(n === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
