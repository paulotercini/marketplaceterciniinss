// F425 · o balcão do atendimento presencial, testado como a recepção (a Ingrid, nível 2 da transição): o cliente novo
// agendado chega (Chegou na agenda, CPF, senha do gov.br, Entrou, dossiê da extensão, Atualizar, estado civil e
// profissão, Pronto avisa o advogado com o cadastro completo); o evento lançado à mão sem ficha abre o Novo Cliente; o
// cliente sem gov.br; o cliente que não sabe o CPF; quem já é cliente (copiar a senha, Errada, senha nova, Entrou);
// o pré-cadastro da agenda de quem já é cliente; e o nível 1, que não chega a nada disso. O Apps Script é o Code.gs de
// verdade num Google Agenda simulado. Banco simulado e dados fictícios. Uso: node f425.js [pasta das fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const { criarGoogle, proximo, quando } = require("./google-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f425";
fs.mkdirSync(OUT, { recursive: true });

const INGRID = "33333333-3333-3333-3333-333333333333", AUTH_I = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const SESSAO_I = { ...SESSAO, user: { id: AUTH_I, email: "ingrid@exemplo.invalido" } };
const ANA = "c0000000-0000-4000-8000-000000000001", CARLA = "c0000000-0000-4000-8000-000000000002",
  DANIEL = "c0000000-0000-4000-8000-000000000003", PRE_ANA = "c0000000-0000-4000-8000-000000000004",
  PRE_DAN = "c0000000-0000-4000-8000-000000000005";
const PAULO = (FIX.colaboradores.find(c => /^Paulo/.test(c.nome)) || {}).id;
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados"]) dados[t] = [];
const NIVEIS = n => JSON.stringify({ ligada: true, onda: 1, niveis: { [INGRID]: n }, v: 2 });
Object.assign(dados, { colaboradores: [...FIX.colaboradores, { id: INGRID, auth_id: AUTH_I, nome: "Ingrid Fictícia", inicial: "I", cor: "#8a4b00",
    papel: "colaborador", ativo: true, cargo: "recepcao" }],
  clientes: [{ id: ANA, nome: "Ana Fictícia Colab", cpf: "52998224725", telefone: "(16) 99999-0001", campos: {}, telefones: [], criado_em: "2026-01-01T12:00:00Z" },
    { id: CARLA, nome: "Carla Fictícia Semcpf", cpf: null, telefone: "(16) 99999-0002", campos: { primeiro_atendimento: "agendado" }, telefones: [], criado_em: "2026-01-01T12:00:00Z" },
    { id: DANIEL, nome: "Daniel Fictício Semgov", cpf: "39053344705", telefone: "(16) 99999-0003", campos: {}, telefones: [], criado_em: "2026-01-01T12:00:00Z" },
    { id: PRE_ANA, nome: "Ana Colab", cpf: null, telefone: "(16) 99999-0001",
      campos: { primeiro_atendimento: "agendado", atendimento: [{ em: "2026-11-05T12:00:00Z", quem: "Ingrid", texto: "Ligou para marcar: auxílio negado." }] }, telefones: [], criado_em: "2026-11-05T12:00:00Z" },
    { id: PRE_DAN, nome: "Daniel Fictício Semgov", cpf: null, telefone: "(16) 99999-0009",
      campos: { primeiro_atendimento: "agendado", atendimento: [{ em: "2026-11-06T12:00:00Z", quem: "Ingrid", texto: "Pediu retorno sobre a perícia." }] }, telefones: [], criado_em: "2026-11-06T12:00:00Z" }],
  credenciais: [{ id: "cr-ana", cliente_id: ANA, tipo: "meu_inss", valor: "Velha@2025", criado_em: "2026-01-01T12:00:00Z" }],
  zap_conversas: [{ id: "zc-pre", cliente_id: PRE_DAN, telefone: "5500000000009" }],
  casos: [], atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento,
  config_app: [...(FIX.config_app || []), { chave: "crm_transicao", valor: NIVEIS(2) }] });
const banco = new Banco(dados);
const T = banco.t;

const W = proximo(3);
const ev = (id, s, ini, fim) => ({ id, summary: s, start: quando(W, ini), end: quando(W, fim) });
const google = criarGoogle({ tokens: { "tok-ingrid": { nome: "Ingrid", papel: "equipe" } }, eventos: [
  ev("P1", "001 - Livre (anote o telefone)", "09:00", "09:45"),
  ev("P3", "001 - Rafael Fictício - Não confirmado", "10:15", "11:00"),
  ev("P5", "002 - Ana Fictícia Colab - Confirmado", "11:00", "11:30")] });
const evG = id => google.eventos.find(e => e.id === id) || {};

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
    localStorage.setItem("crm_agenda_token", "tok-ingrid");
    window._abertas = []; window.open = u => { window._abertas.push(u); return {}; };
  }, [SUPA, SESSAO_I]);
  await instalarBanco(ctx, { SUPA, SESSAO: SESSAO_I, banco });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route(/script\.google\.com/, r => {
    const corpo = JSON.parse(r.request().postData() || "{}");
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(google.post(corpo)) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  const foto = n => p.screenshot({ path: path.join(OUT, n + ".png"), fullPage: true });
  const cli = id => T.clientes.find(c => c.id === id) || {};
  const mencao = re => T.mencoes.find(m => m.para_id === PAULO && re.test(m.texto || ""));
  const caixaTxt = () => p.evaluate(() => (document.querySelector(".modal-cx, #modal") || {}).textContent || "");
  const botao = t => p.click(`#modal button[title="${t}"]`);
  const recarregar = async () => { await p.evaluate(async () => { await carregarAgenda(); pintarAgenda(); }); await p.waitForTimeout(300); };

  await p.waitForFunction(() => meuNivel() === 2, null, { timeout: 8000 }).catch(() => {});   // a configuração chega depois do login
  conf("a recepção entra no nível 2 (cadastro e dossiê)", await p.evaluate(() => meuNivel() === 2 && podeCadastrar() && !podeGravarCaso()));
  await p.evaluate(() => { visao = "agendaq"; render(); });
  await p.waitForSelector(".aq-faixa", { timeout: 15000 });
  await p.click(`[data-aqdia="${W}"]`);

  // A · o cliente novo agendado numa vaga 001 chega no horário
  await p.click('.aq-vaga[data-aqvaga="P1"]');
  await p.waitForSelector("#aq-busca");
  await p.type("#aq-busca", "Elza Ficticia Nova", { delay: 10 });
  await p.click("[data-aqnovo]");
  await p.waitForSelector("#aq-tel");
  await p.fill("#aq-tel", "16999990009");
  await p.click("#aq-seg2");
  await p.waitForSelector('[data-aqacomp="nao"]');
  await p.click('[data-aqacomp="nao"]'); await p.click("#aq-seg4");
  await p.waitForSelector("#aq-seg5"); await p.click("#aq-seg5");
  await p.check("#aq-o1"); await p.check("#aq-o2");
  await p.click("#aq-gravar");
  await p.waitForSelector(".aq-whats", { timeout: 10000 });
  const ELZA = (T.clientes.find(c => c.nome === "Elza Ficticia Nova") || {}).id;
  conf("A · o agendamento cria o pré-cadastro sem CPF", !!ELZA && !cli(ELZA).cpf);
  await p.evaluate(() => fecharCaixa()); await recarregar();
  await p.click('[data-aqev="P1"]');
  const ops = await p.$$eval(".aq-menu [data-aqop]", b => b.map(x => x.dataset.aqop));
  conf(`A · o atendimento marcado oferece Chegou (${ops.join(", ")})`, ops.includes("chegou"));
  await p.click('.aq-menu [data-aqop="chegou"]');
  await p.waitForSelector("#bal-cpf", { timeout: 8000 });
  conf("A · F468 · sem CPF nem senha, a janela pede os dois", /Chegou: Elza/.test(await caixaTxt()) && !!(await p.$("#bal-senha")) && !/Emprega Brasil/.test(await caixaTxt()));
  await p.fill("#bal-cpf", "111.444.777-00"); await p.fill("#bal-senha", "Nova@2026"); await botao("Guardar o CPF e a senha");
  conf("A · o CPF errado não é guardado e a janela diz", /CPF inválido/.test(await p.textContent("#bal-msg")) && !cli(ELZA).cpf);
  await p.fill("#bal-cpf", "111.444.777-35"); await botao("Guardar o CPF e a senha");
  await p.waitForSelector('#modal button[title="Copiar o CPF e abrir o Meu INSS"]', { timeout: 8000 });
  conf("A · o CPF certo vai à ficha", cli(ELZA).cpf === "11144477735");
  conf("A · a senha do gov.br vai às credenciais do cliente", T.credenciais.some(c => c.cliente_id === ELZA && c.tipo === "meu_inss" && c.valor === "Nova@2026"));
  await foto("a1-testar");
  await botao("Copiar o CPF e abrir o Meu INSS");
  const abertas = await p.evaluate(() => window._abertas.slice());
  conf(`A · Testar abre o Meu INSS (${abertas.length})`, abertas.length === 1 && /meu\.inss/i.test(abertas[0]));
  await botao("A senha entrou no Meu INSS"); await p.waitForTimeout(300);
  conf("A · Entrou grava quem conferiu a senha e quando", (cli(ELZA).campos || {}).gov && cli(ELZA).campos.gov.quem === "Ingrid" && !cli(ELZA).campos.gov.sem);
  // a extensão roda: grava o resumo do Meu INSS com os dados cadastrais e o CNIS nos anexos (o mesmo formato do dossiê)
  Object.assign(T.clientes.find(c => c.id === ELZA), { dossie: { meuinss: { em: new Date().toISOString(), baixados: ["CNIS completo"], inexistentes: [], falhas: [],
    cadastro: { dn: "1970-03-15", nome_mae: "Maria Ficta", sexo: "F", logradouro: "RUA SETE DE SETEMBRO, 10", bairro: "Centro", cidade: "Monte Alto", uf: "SP", cep: "15910000" } } } });
  T.anexos.push({ id: "an-elza-1", cliente_id: ELZA, origem: "dossie", nome: "CNIS · CNIS completo", caminho: "dossie/11144477735/CNIS/CNIS completo.pdf",
    tipo: "application/pdf", texto: "", criado_em: new Date().toISOString() });
  await p.evaluate(id => dossieDoAtendimento(id, false), ELZA);
  await p.click('#modal button[title="Atualizar a ficha com o dossiê"]');
  await p.waitForFunction(() => /Dossiê atualizado/.test((document.getElementById("aviso") || {}).textContent || ""), null, { timeout: 8000 }).catch(() => {});
  const e1 = cli(ELZA);
  conf(`A · Atualizar completa o cadastro pelo CNIS (${e1.dn}, ${e1.cidade}/${e1.uf})`, !!e1.dn && e1.cidade === "Monte Alto" && e1.uf === "SP" && e1.cep === "15910000" && e1.nome_mae === "Maria Ficta");
  conf(`A · a rua do CNIS vira o endereço da peça, com o número separado (${e1.endereco})`, e1.numero === "10" && /Sete de Setembro, nº 10$/.test(e1.endereco || ""));
  const faltam = await p.evaluate(id => cadFaltandoChaves(D.cliPorId.get(id)), ELZA);
  conf(`A · depois do dossiê faltam só estado civil e profissão (${faltam.join(", ")})`, faltam.join() === "estado_civil,profissao");
  await p.evaluate(id => editarCad("estado_civil", id), ELZA);
  await p.selectOption("#cad-ed", "casado"); await p.waitForTimeout(500);
  await p.waitForSelector("#cad-profissao", { timeout: 5000 });
  await p.evaluate(id => editarCad("profissao", id), ELZA);
  await p.fill("#cad-ed", "Costureira"); await p.press("#cad-ed", "Enter"); await p.waitForTimeout(500);
  conf("A · a recepção completa estado civil e profissão na Identificação", await p.evaluate(id => cadFaltando(D.cliPorId.get(id)).length === 0, ELZA));
  await foto("a2-identificacao-completa");
  await p.evaluate(id => dossieDoAtendimento(id, false), ELZA);
  await botao("Avisar os advogados que o cliente está pronto para o atendimento"); await p.waitForTimeout(400);
  const mA = mencao(/Elza/);
  conf(`A · Pronto avisa o advogado com o dossiê e o cadastro completo (${(mA || {}).texto})`, !!mA && /dossiê com 1 documento; cadastro completo/.test(mA.texto) && mA.cliente_id === ELZA);

  // B · o atendimento lançado à mão no Google, sem ficha no CRM
  await p.evaluate(() => { fecharFicha && fecharFicha(false); visao = "agendaq"; render(); });
  await p.waitForSelector(".aq-faixa"); await p.click(`[data-aqdia="${W}"]`);
  await p.click('[data-aqev="P3"]');
  await p.click('.aq-menu [data-aqop="chegou"]');
  await p.waitForSelector("#bal-nome", { timeout: 8000 });
  conf("B · sem ficha, o Chegou pede CPF e senha com o nome do evento", /Rafael/.test(await p.inputValue("#bal-nome")));
  await p.fill("#bal-cpf", "153.509.460-56"); await p.fill("#bal-senha", "Rafa@2026"); await botao("Criar o cliente");
  await p.waitForSelector('#modal button[title="Copiar o CPF e abrir o Meu INSS"]', { timeout: 8000 });
  const RAF = T.clientes.find(c => c.cpf === "15350946056") || {};
  conf("B · Criar grava o cliente com CPF e senha e abre o teste", /Rafael/.test(RAF.nome || "") && T.credenciais.some(c => c.cliente_id === RAF.id && c.valor === "Rafa@2026"));
  await foto("b-novo-cliente");

  // C · o cliente sem gov.br
  await p.evaluate(async id => { await abrirFicha(id); dossieDoAtendimento(id, false); }, DANIEL);
  await p.waitForSelector("#bal-senha");
  await botao("O cliente não tem ou não lembra a conta gov.br"); await p.waitForTimeout(300);
  const d1 = cli(DANIEL).campos || {};
  conf("C · Sem gov.br fica registrado na ficha e nas anotações", d1.gov && d1.gov.sem && (d1.atendimento || []).some(n => /Sem acesso ao gov\.br/.test(n.texto)));
  conf("C · a janela orienta a criar a conta ou seguir com os papéis", /acesso\.gov\.br/.test(await p.textContent("#bal-msg")));
  await botao("Avisar os advogados que o cliente está pronto para o atendimento"); await p.waitForTimeout(400);
  conf("C · o aviso diz que veio sem gov.br e sem dossiê", !!mencao(/Daniel.*sem gov\.br, sem dossiê/));

  // D · o cliente que não sabe o CPF
  await p.evaluate(async id => { await abrirFicha(id); dossieDoAtendimento(id); }, CARLA);
  await p.waitForSelector("#bal-cpf");
  await botao("O cliente não sabe o CPF"); await p.waitForTimeout(300);
  conf("D · Sem CPF fica nas anotações e a janela lista o documento a trazer", ((cli(CARLA).campos || {}).atendimento || []).some(n => /sem saber o CPF/.test(n.texto))
    && /CNH/.test(await p.textContent("#bal-msg")));
  await p.click('#bal-msg button[title="Avisar os advogados"]'); await p.waitForTimeout(400);
  conf("D · o aviso diz que veio sem CPF e sem dossiê", !!mencao(/Carla.*sem CPF, sem dossiê/));

  // E · quem já é cliente: testar a senha guardada
  await p.evaluate(() => { fecharFicha && fecharFicha(false); visao = "agendaq"; render(); });
  await p.waitForSelector(".aq-faixa"); await p.click(`[data-aqdia="${W}"]`);
  await p.click('[data-aqev="P5"]');
  await p.click('.aq-menu [data-aqop="chegou"]');
  await p.waitForSelector('#modal button[title="Copiar a senha do Meu INSS"]', { timeout: 8000 });
  conf("E · o cliente antigo abre direto no teste da senha", /Chegou: Ana Fictícia Colab/.test(await caixaTxt()));
  await botao("Copiar a senha do Meu INSS"); await p.waitForTimeout(400);
  conf("E · copiar a senha deixa o registro de quem viu", T.credencial_vis.some(v => v.credencial_id === "cr-ana" || v.cliente_id === ANA));
  await botao("A senha não entrou"); await p.waitForSelector("#bal-senha");
  conf("E · Errada explica como recuperar no gov.br", /Esqueci minha senha/.test(await p.textContent("#bal-msg")));
  await p.fill("#bal-senha", "Atual@2026"); await botao("Guardar a senha nova");
  for (let i = 0; i < 40 && (T.credenciais.filter(c => c.cliente_id === ANA).length !== 1 || !T.credenciais.some(c => c.cliente_id === ANA && c.valor === "Atual@2026")); i++) await p.waitForTimeout(100);
  await p.waitForSelector('#modal button[title="A senha entrou no Meu INSS"]', { timeout: 8000 });
  const crAna = T.credenciais.filter(c => c.cliente_id === ANA);
  conf(`E · a senha nova substitui a velha (${crAna.map(c => c.valor).join(", ")})`, crAna.length === 1 && crAna[0].valor === "Atual@2026");
  await botao("A senha entrou no Meu INSS"); await p.waitForTimeout(300);
  await p.evaluate(() => { repintarFicha(); });
  conf("E · a Identificação mostra a senha conferida ao lado da senha", /Senha conferida em .* por Ingrid/.test(await p.textContent("#detalhe")));

  // F · o pré-cadastro da agenda era de quem já é cliente
  await p.evaluate(async id => { await abrirFicha(id); dossieDoAtendimento(id); }, PRE_ANA);
  await p.waitForSelector("#bal-cpf");
  await p.fill("#bal-cpf", "52998224725"); await botao("Guardar o CPF"); await p.waitForTimeout(300);
  conf("F · o CPF de quem já é cliente não vai à ficha nova", /já é de Ana Fictícia Colab/.test(await p.textContent("#bal-msg")) && !cli(PRE_ANA).cpf);
  await p.click("#bal-msg button"); await p.waitForTimeout(600);
  conf("F · Abrir leva a anotação à ficha de verdade e tira o pré-cadastro da lista",
    ((cli(ANA).campos || {}).atendimento || []).some(n => /auxílio negado/.test(n.texto)) && cli(PRE_ANA).campos.nao_cliente && cli(PRE_ANA).campos.fundido_para === ANA);
  conf("F · e abre a janela na ficha de verdade", await p.evaluate(a => clienteAberto === a, ANA) && /Dossiê de Ana Fictícia Colab/.test(await caixaTxt()));

  // H · F542: informar na Identificação o CPF de outra ficha junta as duas, sem apagar nada
  await p.evaluate(async id => { fecharCaixa(); await abrirFicha(id); editarCampo("cpf", id); }, PRE_DAN);
  await p.fill("#ed-campo", "39053344705");
  await p.evaluate(id => salvarCampo("cpf", id), PRE_DAN);
  for (let i = 0; i < 40 && !(cli(PRE_DAN).campos || {}).fundido_para; i++) await p.waitForTimeout(100);
  await p.waitForTimeout(300);
  const dan = cli(DANIEL), pre = cli(PRE_DAN);
  conf("H · o CPF de outra ficha junta as fichas: a anotação e o telefone vão à ficha com CPF",
    ((dan.campos || {}).atendimento || []).some(n => /retorno sobre a perícia/.test(n.texto)) && (dan.telefones || []).some(t => /99999-0009/.test(t.numero)));
  conf("H · a conversa do WhatsApp passa à ficha com CPF e a outra fica marcada, sem CPF",
    T.zap_conversas.find(z => z.id === "zc-pre").cliente_id === DANIEL && pre.campos.nao_cliente && pre.campos.fundido_para === DANIEL && !pre.cpf && T.clientes.some(c => c.id === PRE_DAN));
  const achados = await p.evaluate(() => pesquisar("Daniel Semgov").map(c => c.id));
  conf("H · a pesquisa deixa de mostrar a ficha juntada", achados.length === 1 && achados[0] === DANIEL);

  // G · o nível 1 (WhatsApp) não chega ao balcão nem edita o cadastro
  await p.evaluate(v => { fecharCaixa(); D.config.set("crm_transicao", v); aplicarNivel(); }, NIVEIS(1));
  const n1 = await p.evaluate(a => {
    const antes = document.getElementById("modal").innerHTML;
    dossieDoAtendimento(a, false); editarCampo && editarCampo("nome", a); trocarSenha && trocarSenha(a);
    return { nivel: meuNivel(), mudou: document.getElementById("modal").innerHTML !== antes && /Dossiê de/.test(document.getElementById("modal").textContent) };
  }, ANA);
  conf("G · no nível 1 a janela do balcão e a edição não abrem", n1.nivel === 1 && !n1.mudou);
  await p.evaluate(() => { visao = "agendaq"; render(); });
  await p.waitForSelector(".aq-faixa"); await p.click(`[data-aqdia="${W}"]`);
  await p.click('[data-aqev="P5"]');
  const ops1 = await p.$$eval(".aq-menu [data-aqop]", b => b.map(x => x.dataset.aqop));
  conf(`G · no nível 1 o menu do atendimento não tem Chegou (${ops1.join(", ")})`, !ops1.includes("chegou"));

  conf(`sem erro de página (${erros.slice(0, 3).join(" | ")})`, erros.length === 0);
  const passou = ok.filter(x => x[1]).length;
  console.log(`\n${passou}/${ok.length}`);
  await nav.close(); s.close();
  process.exit(passou === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
