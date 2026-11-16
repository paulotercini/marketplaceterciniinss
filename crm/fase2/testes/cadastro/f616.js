// F616 · o Prévius no Primeiro atendimento: o leitor puro dos relatórios (quatro layouts, um com a fonte MacRoman
// trocada), a conferência com o CNIS e o quadro "Prévius" com o botão de envio. Banco simulado e dados fictícios.
// Uso: node f616.js [pasta-das-fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f616";
fs.mkdirSync(OUT, { recursive: true });

// o PDF com a fonte trocada: os bytes do cp1252 lidos como MacRoman
const MAC = { "á": "·", "ã": "„", "ç": "Á", "ê": "Í", "í": "Ì", "ó": "Û", "Í": "Õ" };
const mojibake = t => t.replace(/[áãçêíóÍ]/g, c => MAC[c]);
const L = a => a.join("\n");
const TRANSICAO = mojibake(L(["Regras de Transição - EC 103/2019", "Cliente Teste",
  "CPF: Data de Nascimento: Sexo: Inscrição no INSS: Data do Cálculo:", "111.222.333-96 10/02/1964 Feminino 01/03/1985 05/11/2026",
  "Regra de Pontos", "Possível Aposentadoria: Tempo de Contribuição (Necessário 30 anos):", "Possui 29 anos e 10 meses", "14/08/2027",
  "Provável RMI: Idade (62 anos):", "R$ 2 496,08 Possui Idade de 63 anos (Carência = 360)", "Retorno do Investimento: R$ 10.000,00",
  "Regra de Idade", "Possível Aposentadoria: Tempo de Contribuição (Necessário 15 anos):", "Possui 29 anos e 10 meses", "05/11/2026",
  "Provável RMI: Idade (62 anos):", "Possui Idade de 62 anos", "R$ 1.900,00", "Retorno do Investimento: R$ 5.000,00"]));
const TEMPO = L(["Relatório do Tempo de Contribuição", "Cliente Teste",
  "Espécie do Benefício: Início do Benefício (DIB): Data da Atualização:", "41 - Aposentadoria por Idade 05/11/2026 05/11/2026",
  "Períodos Informados", "Início Fim Tipo Empresa",
  "* 01/02/1990 31/12/1995 Normal OFICINA FICTICIA LTDA", "* 01/01/1996 31/12/2000 Especial METALURGICA EXEMPLO SA",
  "* 01/01/1980 31/12/1984 Rural", "SITIO DO EXEMPLO", "* 01/01/2001 31/12/2003 Normal LOJA TESTE ME Def",
  "* 01/01/2027 31/12/2027 Normal Tempo Projetado", "Legenda:",
  "Tempo de Contribuição em 05/11/2026 (DIB Informada): Nº de Contribuições", "16 anos, 11 meses e 0 dias 204 contribuições"]);
const COMPLETO = L(["Análise da Situação Atual do Benefício", "CPF: Data de Nascimento: Sexo: Data do Cálculo:", "111.222.333-96 10/02/1964 Feminino 05/11/2026",
  "Espécie do Benefício:", "42 - Aposentadoria por Tempo de Contribuição da Pessoa com Deficiência (Deficiência Leve)",
  "Data de aposentadoria Valor estimado da aposentadoria", "05/11/2026 R$ 3.100,50",
  "Análise das Regras de Transição - EC 103/2019",
  "Regra de Pedágio 100%", "Tempo de Contribuição Carência Idade Provável RMI", "28 anos, 2 meses e 3 dias 340 contribuições 62 anos", "R$ 2.800,00",
  "Necessário: 30 anos", "Possível aposentadoria em 10/10/2028",
  "Regra da PcD (LC 142)", "Tempo de Contribuição Carência Idade Provável RMI", "28 anos, 2 meses e 3 dias 340 contribuições 62 anos", "R$ 3.100,50",
  "Necessário: 28 anos", "Regra Escolhida", "Possível aposentadoria em 05/11/2026",
  "Cálculo da R.M.I. - Aposentadoria da Pessoa com Deficiência", "Espécie do Benefício: Nº do Processo:",
  "42 - Aposentadoria por Tempo de Contribuição da Pessoa com Deficiência (Deficiência Leve)",
  "Índice Utilizado: Inscrição no INSS: Início do Benefício (DIB):", "Reajuste INPC 01/03/1985 05/11/2026",
  "Média dos Salários Corrigidos: R$ 3.100,50 Renda Mensal Inicial: R$ 3.100,50",
  "Relatório do Tempo de Contribuição", "Tempo de Contribuição (PcD)", "Períodos Informados",
  "* 01/03/1985 31/12/1999 Normal FABRICA FICTICIA LTDA", "Def", "* 01/01/2000 05/11/2026 Normal COMERCIO EXEMPLO", "Legenda:"]);
const RMI = L(["Cálculo da R.M.I. - Aposentadoria por Idade", "Cliente Teste", "CPF: 700.100.616-03",
  "Espécie do Benefício: Nº do Processo:", "41 - Aposentadoria por Idade",
  "Índice Utilizado: Inscrição no INSS: Início do Benefício (DIB):", "Reajuste INPC 01/03/1985 05/11/2026",
  "Média dos Salários Corrigidos: R$ 2.000,00 Renda Mensal Inicial: R$ 1.700,25"]);
// o Prévius das fichas da tela: o mesmo vínculo do CNIS (confere) e outro com carência e período a mais (diverge)
const tempoDe = (linhas, anos, meses, car) => L(["Relatório do Tempo de Contribuição", "Cliente Teste",
  "Espécie do Benefício: Início do Benefício (DIB): Data da Atualização:", "41 - Aposentadoria por Idade 05/11/2026 05/11/2026",
  "Períodos Informados", ...linhas, "Legenda:", "Tempo de Contribuição em 05/11/2026 (DIB Informada): Nº de Contribuições",
  `${anos} anos, ${meses} meses e 0 dias ${car} contribuições`]);
const PREV_OK = tempoDe(["* 01/02/2011 30/09/2019 Normal CONFECCOES FICTICIAS LTDA"], 8, 8, 104);
const PREV_DIV = tempoDe(["* 01/02/2011 30/09/2019 Normal CONFECCOES FICTICIAS LTDA", "* 01/01/2000 31/12/2005 Especial METALURGICA EXEMPLO SA"], 14, 8, 176);

const P = "c0000000-0000-0000-0000-000000000a16", N = "c0000000-0000-0000-0000-000000000b16", Q = "c0000000-0000-0000-0000-000000000c16";
const CPF = { [P]: "70010061601", [N]: "70010061603", [Q]: "70010061605" };
const CNIS = { em: "2026-10-08", nome: "Cliente Teste", paginas: 3, qtVinculos: 1, nits: [], contribSemPerda: 104, indicadores: [],
  vinculos: [{ seq: 1, tipo: "Empregado", origem: "CONFECCOES FICTICIAS LTDA", codigo: "11.444.777/0001-61", inicio: "01/02/2011", fim: "30/09/2019", ultRemun: "09/2019", aberto: false, indicadores: [] },
    { seq: 2, tipo: "Benefício", especie: "31", origem: "AUXILIO DOENCA PREVIDENCIARIO", nb: "6000000001", inicio: "10/03/2018", fim: "20/05/2018", situacao: "CESSADO", aberto: false }],
  analise: { abertos: [], errosEmp: [], abaixo: [], mesAnt: "09/2026", agora: { tipo: "sem", ultima: { comp: "09/2019", tipo: "Empregado" } },
    benefAtivos: [], qtComps: 104, contagem: { periodos: [["2011-02", "2019-09"]], carencia: 104, anos: 8, meses: 8, foraMinimo: 0 } } };
const AN = (n, cli, nome, texto) => ({ id: `a7000000-0000-0000-0000-0000000616${String(n).padStart(2, "0")}`, cliente_id: cli, caso_id: null, origem: "previus", nome: `Prévius · ${nome}`,
  caminho: `previus/${CPF[cli]}/${nome}`, tipo: "text/plain", tamanho: texto.length, texto, paginas: 1, paginas_imagem: [], criado_em: `2026-11-1${n}T12:00:00Z` });

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "lembretes", "analises_direito",
  "aposentadorias", "lista_pref", "andamento_tarefas", "modelos_mensagem", "credencial_vis", "apagados", "credenciais", "atribuicoes"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app, anexos: [] });
const pre = (id, cli, pc) => ({ id, cliente_id: cli, titulo: "", fase: "escritorio", pre_caso: true, beneficio: "Aposentadoria por idade", protocolos: [], processos: [], crps_nups: [], crps: [],
  nbs: [], arquivados: {}, marcadores: [], origem_lista: "🙋 Escritório", precaso: { id: pc, natureza: "", marc: {}, honorarios: "", quem: null, em: "2026-10-12" }, criado_em: "2026-10-12T12:00:00Z" });
const cli = (id, nome) => ({ id, nome, cpf: CPF[id], dn: "1964-02-10", sexo: "F", criado_em: "2026-10-01T12:00:00Z",
  dossie: { meuinss: { em: "2026-10-08T10:00:00Z" }, mte: { em: "2026-10-08T10:00:00Z" } }, triagem: { pdf: { cnis: CNIS } }, campos: {} });
dados.clientes.push(cli(P, "Cliente Teste Um"), cli(N, "Cliente Teste Dois"), cli(Q, "Cliente Teste Tres"));
dados.casos.push(pre("b0000000-0000-0000-0000-000000000a16", P, "pc_p16"), pre("b0000000-0000-0000-0000-000000000b16", N, "pc_n16"), pre("b0000000-0000-0000-0000-000000000c16", Q, "pc_q16"));
dados.anexos.push(AN(1, P, "tempo.txt", PREV_OK), AN(2, N, "tempo.txt", PREV_DIV), AN(3, N, "rmi.txt", RMI));
const banco = new Banco(dados);
const T = banco.t;

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
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  // 1 · o leitor, nos quatro layouts
  const ler = t => p.evaluate(x => lerPreviusTexto(x), t);
  const a = await ler(TRANSICAO);
  conf("transição (fonte trocada): layout, CPF e data do cálculo", a && a.layouts.join() === "transicao" && a.cpf === "11122233396" && a.data === "2026-11-05");
  conf("transição: duas regras com data, tempo e RMI", a && a.regras.length === 2 && a.regras[0].nome === "Regra de Pontos" && a.regras[0].data === "2027-08-14" && a.regras[0].rmi === 2496.08 && a.regras[1].rmi === 1900);
  conf("transição: tempo e carência do resumo, sem regra escolhida", a && a.tempo.anos === 29 && a.tempo.meses === 10 && a.carencia === 360 && !a.regra && !a.rmi);
  const b = await ler(TEMPO);
  conf("tempo: DIB, data, tempo e carência da DIB informada", b && b.layouts.join() === "tempo" && b.dib === "2026-11-05" && b.data === "2026-11-05" && b.tempo.anos === 16 && b.tempo.meses === 11 && b.carencia === 204);
  const nat = b ? b.periodos.map(x => x.natureza + (x.projetado ? "+proj" : "")).join() : "";
  conf(`tempo: cinco períodos com a natureza certa (${nat})`, nat === "comum,especial,rural,def,comum+proj");
  conf("tempo: a empresa na linha de baixo e o Def no fim", b && b.periodos[2].empresa === "SITIO DO EXEMPLO" && b.periodos[3].empresa === "LOJA TESTE ME");
  const c = await ler(COMPLETO);
  conf("completo: os quatro relatórios", c && ["situacao", "regras", "tempo", "rmi"].every(k => c.layouts.includes(k)));
  conf("completo: a regra escolhida, o tempo e a carência dela", c && c.regra === "Regra da PcD (LC 142)" && c.tempo.anos === 28 && c.tempo.dias === 3 && c.carencia === 340);
  conf("completo: RMI do cálculo, DIB, espécie, grau e PcD", c && c.rmi.valor === 3100.5 && c.rmi.data === "2026-11-05" && /Deficiência Leve/.test(c.rmi.especie) && c.grau === "leve" && c.pcd === true);
  conf("completo: o Def sozinho na linha de cima marca o período", c && c.periodos.length === 2 && !c.periodos[0].def && c.periodos[1].def && c.periodos[1].grau === "leve");
  const d = await ler(RMI);
  conf("RMI sozinha: valor, DIB e espécie", d && d.layouts.join() === "rmi" && d.rmi.valor === 1700.25 && d.dib === "2026-11-05" && d.rmi.especie === "41 - Aposentadoria por Idade");
  conf("texto que não é do Prévius volta nulo", (await ler("CNIS - Cadastro Nacional de Informações Sociais\nExtrato")) === null);

  // 2 · a conferência com o CNIS
  const confere = (prev, x) => p.evaluate(([pr, cx]) => conferirPrevius(pr, cx), [prev, x]);
  const base = { ct: { anos: 8, meses: 8, carencia: 104 }, vinculos: CNIS.vinculos, ppps: [], temRural: false, temLaudo: false, hoje: "2026-11-16" };
  const iguais = await confere({ tempo: { anos: 8, meses: 8, dias: 0 }, carencia: 104, tempoEm: "2026-11-05", periodos: [{ inicio: "2011-02-01", fim: "2019-09-30", natureza: "comum", empresa: "X" }] }, base);
  conf(`sem divergência: nada a apontar, e o benefício do CNIS não conta (${iguais.length})`, iguais.length === 0);
  const div = await confere({ tempo: { anos: 10, meses: 0, dias: 0 }, carencia: 120, tempoEm: "2026-11-05", periodos: [
    { inicio: "2011-02-01", fim: "2019-09-30", natureza: "comum", empresa: "X" }, { inicio: "2000-01-01", fim: "2005-12-31", natureza: "especial", empresa: "METALURGICA EXEMPLO SA" },
    { inicio: "1980-01-01", fim: "1984-12-31", natureza: "rural", empresa: "SITIO" }, { inicio: "2001-01-01", fim: "2001-06-30", natureza: "def", def: true, empresa: "Y" }] }, base);
  const ks = div.map(x => x.k);
  conf("com divergência: tempo, carência e período fora do CNIS", ["prev.tempo", "prev.carencia"].every(k => ks.includes(k)) && ks.some(k => k.startsWith("prev.so:2000-01-01")));
  conf("sem documento: especial sem PPP, rural sem papel, deficiência sem laudo", div.filter(x => x.tipo === "sem_documento").map(x => x.k.split(":")[0]).sort().join() === "prev.def,prev.esp,prev.rural");
  conf("com o PPP da empresa, o especial deixa de faltar", !(await confere({ periodos: [{ inicio: "2011-02-01", fim: "2019-09-30", natureza: "especial", empresa: "CONFECCOES FICTICIAS LTDA" }] },
    { ...base, ppps: ["Confecções Fictícias Ltda"] })).some(x => x.k.startsWith("prev.esp")));
  const proj = await confere({ tempo: { anos: 20, meses: 0, dias: 0 }, carencia: 300, tempoEm: "2030-01-01", periodos: [] }, base);
  conf("cálculo numa DIB futura: tempo e carência não se comparam", proj.length === 0);
  const rev = await confere({ periodos: [{ inicio: "1990-01-01", fim: "1995-12-31", natureza: "comum", empresa: "Z" }] }, base);
  conf("o vínculo do CNIS que falta no Prévius também aparece", rev.some(x => x.k.startsWith("prev.cnis:2011-02-01")) && !rev.some(x => x.k.startsWith("prev.cnis:2018")));

  // 3 · a tela
  const abrir = async (cl, pc) => { await p.evaluate(([x, y]) => abrirAtendimentoDe(x, y), [cl, pc]);
    await p.waitForFunction(() => !_lendoDossie && !_lendoLeitores && document.querySelector(".pa"), null, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(500); await p.evaluate(() => passoTudo(true)); await p.waitForTimeout(300); };
  const ordem = () => p.evaluate(() => [...document.querySelectorAll(".pa .paq[data-q]")].map(q => q.dataset.q));
  const quadro = () => p.evaluate(() => { const q = document.getElementById("paq-prev"); return q && { blocos: [...q.querySelectorAll(".paq-bloco small")].map(x => x.textContent),
    itens: [...q.querySelectorAll(".paq-it")].map(li => [li.dataset.k, li.className, li.textContent.replace(/\s+/g, " ")]), txt: q.textContent }; });

  await abrir(P, "pc_p16");
  let qs = await ordem(), q = await quadro();
  const shot = async n => { const el = await p.$("#paq-prev"); if (el) await el.screenshot({ path: path.join(OUT, n) }); };
  await shot("01-confere.png");
  conf(`o quadro Prévius vem logo depois do CNIS (${qs.slice(0, 3).join(", ")})`, qs[0] === "cnis" && qs[1] === "prev");
  conf(`o resumo traz tempo e carência (${q && q.blocos.join(" · ")})`, q && ["Tempo", "Carência"].every(k => q.blocos.some(x => x.includes(k))));
  conf("sem divergência, o item verde: Prévius confere com o CNIS", q && q.itens.some(([k, cl, t]) => k === "prev.ok" && /confere com o CNIS/.test(t)));
  conf("sem divergência, nenhum problema no quadro", q && !q.itens.some(([k]) => /^prev\.(tempo|carencia|so:|cnis:)/.test(k)));
  conf("a linha do CNIS diz quando o Prévius foi enviado e oferece Trocar", await p.evaluate(() => { const l = document.querySelector("#paq-cnis .pa-prev-linha"); return !!l && /Prévius enviado em/.test(l.textContent) && /Trocar/.test(l.textContent); }));
  conf("o quadro não tem travessão", q && !/—/.test(q.txt) || (console.log(q.txt.match(/.{0,40}—.{0,40}/g)), false));

  await abrir(N, "pc_n16");
  q = await quadro(); await shot("02-diverge.png");
  conf("com divergência: carência e período fora do CNIS viram problema", q && q.itens.some(([k]) => k === "prev.carencia") && q.itens.some(([k]) => k.startsWith("prev.so:2000-01-01")));
  conf("com divergência, o item verde não aparece", q && !q.itens.some(([k]) => k === "prev.ok"));
  conf("o especial sem PPP aparece como falta de documento", q && q.itens.some(([k]) => k.startsWith("prev.esp")));
  conf("a RMI do Prévius aparece no resumo do quadro", q && q.blocos.some(x => /RMI/.test(x)) && /1\.700,25/.test(q.txt));
  conf("Análise de Direito: RMI pelo Prévius, só para conferência", await p.evaluate(i => /RMI pelo Prévius: R\$\s*1\.700,25/.test(rmiPrevius(D.cliPorId.get(i))) && /conferência/.test(rmiPrevius(D.cliPorId.get(i))), N));

  await abrir(Q, "pc_q16");
  qs = await ordem();
  conf(`sem Prévius: nenhum quadro, só a linha discreta com o botão (${qs.slice(0, 3).join(", ")})`, qs[0] === "cnis" && !qs.includes("prev")
    && await p.evaluate(() => { const l = document.querySelector("#paq-cnis .pa-prev-linha"); return !!l && /Sem cálculo do Prévius/.test(l.textContent) && /^Prévius$/.test(l.querySelector("label").textContent.trim()); }));
  const antes = T.anexos.length;
  await p.setInputFiles(`#prev-arq-${Q}`, { name: "calculo.txt", mimeType: "text/plain", buffer: Buffer.from(PREV_OK) });
  await p.waitForFunction(() => document.getElementById("paq-prev"), null, { timeout: 8000 }).catch(() => {});
  const novo = T.anexos.find(x => x.origem === "previus" && x.cliente_id === Q);
  conf("enviar grava o anexo de origem previus, no caminho previus/<cpf>/, preso ao cliente e ao pré-caso", T.anexos.length === antes + 1 && novo
    && novo.caminho === `previus/${CPF[Q]}/calculo.txt` && novo.caso_id === "b0000000-0000-0000-0000-000000000c16" && /Tempo de Contribuição em/.test(novo.texto || ""));
  conf("depois do envio, o quadro aparece", !!(await p.$("#paq-prev")));
  conf("nada vai ao To Do nem a outra tabela", !banco.escritas.some(e => e.m !== "GET" && !["anexos", "storage", "casos", "clientes"].includes(e.t) && !/^rpc:zap_presenca$/.test(e.t)));
  const outroCpf = PREV_OK.replace("Relatório do Tempo de Contribuição", "Relatório do Tempo de Contribuição\nCPF: 999.888.777-66");
  await p.setInputFiles(`#prev-arq-${Q}`, { name: "outro.txt", mimeType: "text/plain", buffer: Buffer.from(outroCpf) });
  await p.waitForTimeout(800);
  conf("o Prévius com CPF de outra pessoa não é gravado", !T.anexos.some(x => x.caminho === `previus/${CPF[Q]}/outro.txt`));
  conf("sem erro de página", erros.length === 0 || (console.log(erros), false));

  const n = ok.filter(x => x[1]).length, pts = Math.round(100 * n / ok.length);
  console.log(`\nF616: ${n}/${ok.length} · ${pts}/100`);
  await nav.close(); s.close();
  process.exit(pts > 95 ? 0 : 1);
})();
