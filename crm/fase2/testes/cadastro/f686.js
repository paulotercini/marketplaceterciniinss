// F320 · a interface limpa (plano de 31.10.2026, imagens aprovadas pelo Paulo): a linha do Meu Dia sem o texto, a ficha
// em duas colunas com as etapas recolhidas, as abas do celular (Andamentos, Prazos, Caso, Cadastro e Honorários) e a
// faixa do atendimento com o prazo uma vez. Banco simulado e dados fictícios.
// Uso: node f320.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f320";
fs.mkdirSync(OUT, { recursive: true });

const PAULO = FIX.colaboradores[0].id, MARCOS = "22222222-2222-2222-2222-222222222222", MEISSA = "33333333-3333-3333-3333-333333333333";
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: [...FIX.colaboradores, { id: MARCOS, auth_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", nome: "Marcos Fictício", inicial: "M",
    cor: "#8a4b00", papel: "colaborador", ativo: true, cargo: "advogado" },
    { id: MEISSA, auth_id: "cccccccc-cccc-cccc-cccc-cccccccccccc", nome: "Meissa Fictícia", inicial: "ME", cor: "#2b7a4b", papel: "colaborador", ativo: true, cargo: "recepcao" }],
  clientes: [], casos: [], atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
const iso = n => new Date(Date.now() - 3 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const ts = (n, h = "12:00") => `${iso(n)}T${h}:00-03:00`;
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const cli = (nome, campos = {}) => { const c = { id: id("c"), nome, cpf: null, telefone: null, campos, telefones: [], criado_em: ts(-400) }; T.clientes.push(c); return c; };
const caso = (c, o) => { const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "🌻 INSS",
  criado_em: ts(-300), ...o }; T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO }); return k; };
const and = (k, n, texto, o = {}) => { const a = { id: id("e"), caso_id: k.id, autor_id: PAULO, texto, origem: "app", origem_id: null, criado_em: ts(n),
  publico: false, excluir: false, importante: false, urgente: false, responde_a: null, ...o }; T.andamentos.push(a); return a; };




// o último dia útil antes de hoje, como o CRM conta
const dUtil = (() => { let n = -1; for (;;) { const d = new Date(iso(n) + "T12:00:00"); if (d.getDay() % 6) return n; n--; } })();
const cA = cli("Luciana Aparecida Fictícia Mendes de Oliveira"); cA.telefone="16900000001"; cA.cpf = "52998224725";
cA.campos = { notas_todo: [{ tipo: "cnpj", texto: "12.345.678/0001-90" }, { tipo: "aposentadoria", texto: "Possível aposentadoria especial em 22/10/2027" }] };
const kA = caso(cA, { beneficio: "Aux. Incapacidade Temporária", especie: "B31", fase: "inss", importante: true, urgente: true, prazo: iso(10),
  ronda: { despacho: { em: ts(dUtil, "15:00"), por: PAULO, prazo: iso(10) } } });
and(kA, dUtil, "Cliente avisado. Verificar em 10 dias.");
const cB = cli("Bruna Fictícia Urgente");
const kB = caso(cB, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", urgente: true });
and(kB, dUtil, "Pedido de documento enviado.");
const cC = cli("Carla Fictícia Estrela");
caso(cC, { beneficio: "Pensão por Morte", especie: "B21", fase: "inss", importante: true });
caso(cli("Roseli Maria Fictícia Carvalho Sampaio"), { beneficio: "Aux. Incapacidade", especie: "B46", fase: "inss", prazo: iso(-90) });


cA.campos.atendimento = [{ em: ts(-6), quem: "Paulo", texto: `Benefício negado; ciência pelo AR em ${iso(-6).split("-").reverse().join("/")}. Quer recorrer.` }];

const ok = []; const conf = (n, v) => { ok.push([n, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + n); };
(async()=>{const s=http.createServer((q,r)=>{r.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});r.end(fs.readFileSync(path.join(__dirname,"app.html")))}).listen(0,"127.0.0.1");await new Promise(r=>s.on("listening",r));
const nav=await chromium.launch();const ctx=await nav.newContext({viewport:{width:1440,height:1000}});
await ctx.addInitScript(([u,ss])=>{localStorage.setItem("crm_cfg",JSON.stringify({url:u,key:"a".repeat(60)}));localStorage.setItem("crm_sessao",JSON.stringify(ss));localStorage.setItem("crm_tema","v10");},[SUPA,SESSAO]);
await instalarBanco(ctx,{SUPA,SESSAO,banco});const p=await ctx.newPage();const erros=[];p.on("pageerror",e=>erros.push(e.message));
await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);await p.waitForSelector("#app.logado");await p.waitForFunction(()=>D.cliPorId.size>0);
await p.evaluate(([cid,kid])=>abrirFicha(cid).then(()=>{casoSel=kid;abaAtiva=2;repintarFicha();}),[cA.id,kA.id]);await p.waitForTimeout(600);
await p.click('button.lapis[title="alterar a DER"]');await p.waitForTimeout(200);
conf("F686 · o lápis da DER abre o campo de data",await p.$(`#lc-der-${kA.id} input[type=date]`));
conf("F686 · o Desfazer fica 30 s",await p.evaluate(()=>/ms = 30000/.test(avisoDesfazer.toString())));
conf("sem erro de página",!erros.length);if(erros.length)console.log(erros);
await nav.close();s.close();process.exit(ok.every(x=>x[1])?0:1);})();
