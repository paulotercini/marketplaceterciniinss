"""Fase 1 do CRM — gera o aplicativo-espelho (crm/app.html).

Embute crm/data/crm.json (saída do sync_todo.py) num arquivo HTML único com o
layout de três colunas do To Do: pesquisa + listas à esquerda, clientes no
meio, ficha larga à direita, mais as visões Perícias & Audiências e Dashboard.

    python3 crm/sync_todo.py            # (ou --backup export.json)
    python3 crm/build_app.py
    # abrir crm/app.html no navegador — funciona offline, sem servidor

app.html contém dados reais de clientes: está no .gitignore e NUNCA pode ser
commitado nem colocado em docs/ (que é publicado no GitHub Pages).
"""
import json, pathlib, sys

AQUI = pathlib.Path(__file__).resolve().parent
ENTRADA = AQUI / "data" / "crm.json"
SAIDA = AQUI / "app.html"

TEMPLATE = r"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CRM Tercini — espelho do To Do</title>
<style>
  :root{
    --azul:#2564cf; --azul-escuro:#1e4fa3; --fundo:#faf9f8; --lateral:#eff6fc;
    --texto:#292827; --cinza:#605e5c; --borda:#e1dfdd; --branco:#fff;
    --verde:#0b6a0b; --laranja:#b4530a; --vermelho:#a4262c; --roxo:#5c2e91;
  }
  *{box-sizing:border-box;margin:0;padding:0;font-family:"Segoe UI",system-ui,-apple-system,sans-serif}
  body{background:var(--fundo);color:var(--texto);height:100vh;overflow:hidden;font-size:14px}
  .app{display:grid;grid-template-columns:300px 1fr;height:100vh}
  .app.detalhe-aberto{grid-template-columns:300px minmax(320px,1fr) minmax(480px,54%)}

  .sidebar{background:var(--lateral);border-right:1px solid var(--borda);overflow-y:auto;padding:12px 0}
  .marca{padding:4px 16px 10px;font-weight:700;color:var(--azul-escuro)}
  .marca small{display:block;font-weight:400;color:var(--cinza);font-size:11px}
  .busca{margin:0 12px 14px;position:relative}
  .busca input{width:100%;padding:8px 10px 8px 32px;border:1px solid var(--borda);border-radius:6px;font-size:14px;background:var(--branco)}
  .busca::before{content:"🔍";position:absolute;left:9px;top:7px;font-size:13px;opacity:.6}
  .grupo h3{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--cinza);padding:8px 16px 4px}
  .lista-item{display:flex;align-items:center;gap:8px;padding:8px 16px;cursor:pointer;border-left:3px solid transparent}
  .lista-item:hover{background:#e3eefa}
  .lista-item.ativa{background:#d6e6f7;border-left-color:var(--azul);font-weight:600}
  .lista-item .rotulo{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .lista-item .cont{margin-left:auto;font-size:12px;color:var(--cinza);background:var(--branco);border-radius:10px;padding:1px 8px}
  .sep{border-top:1px solid var(--borda);margin:8px 12px}
  details.outras summary{padding:8px 16px;cursor:pointer;color:var(--cinza);font-size:13px}
  .avatar{width:28px;height:28px;border-radius:50%;background:var(--azul);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex:none}
  .avatar.mini{width:22px;height:22px;font-size:10px}
  .av-A{background:#c74e93}.av-M{background:#0b6a0b}.av-D{background:#b4530a}.av-I{background:#5c2e91}.av-C{background:#8a8886}.av-x{background:#a19f9d}

  .meio{overflow-y:auto;padding:18px 22px}
  .meio-topo{display:flex;align-items:center;gap:12px;margin-bottom:4px;flex-wrap:wrap}
  .meio-topo h1{font-size:21px;color:var(--azul-escuro)}
  .ordenar{margin-left:auto;display:flex;align-items:center;gap:8px;color:var(--cinza);font-size:13px;flex-wrap:wrap}
  .ordenar select{padding:5px 8px;border:1px solid var(--borda);border-radius:6px;background:var(--branco);font-size:13px}
  .meio-sub{color:var(--cinza);font-size:13px;margin-bottom:14px}
  .cartao{background:var(--branco);border:1px solid var(--borda);border-radius:8px;padding:10px 14px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;gap:12px}
  .cartao:hover{box-shadow:0 2px 8px rgba(0,0,0,.08)}
  .cartao.sel{outline:2px solid var(--azul)}
  .cartao.feita{opacity:.55}
  .cartao.feita .nome{text-decoration:line-through}
  .cartao .check{width:17px;height:17px;border:2px solid var(--cinza);border-radius:50%;flex:none}
  .cartao.feita .check{background:var(--verde);border-color:var(--verde)}
  .cartao .info{min-width:0;flex:1}
  .cartao .nome{font-weight:600}
  .cartao .meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;font-size:12px;color:var(--cinza);align-items:center}
  .chip{border-radius:10px;padding:1px 8px;font-size:11px;font-weight:600;white-space:nowrap}
  .chip.ben{background:#e8f1fb;color:var(--azul-escuro)}
  .chip.prazo{background:#fdf3e7;color:var(--laranja)}
  .chip.prazo.venc{background:#fbeaea;color:var(--vermelho)}
  .chip.fase{background:#eef7ee;color:var(--verde)}
  .chip.per{background:#efe6f7;color:var(--roxo)}
  .chip.neutro{background:var(--fundo);color:var(--cinza);font-weight:400}
  .estrela{flex:none;font-size:16px;color:#c8c6c4}
  .estrela.on{color:#eaa300}
  .mais{display:block;width:100%;padding:10px;border:1px dashed var(--borda);border-radius:8px;background:none;color:var(--azul);cursor:pointer;font-size:13px}

  .detalhe{display:none;background:var(--branco);border-left:1px solid var(--borda);overflow-y:auto}
  .app.detalhe-aberto .detalhe{display:block}
  .det-topo{position:sticky;top:0;background:var(--branco);border-bottom:1px solid var(--borda);padding:14px 22px;z-index:2}
  .det-topo .linha1{display:flex;align-items:center;gap:10px}
  .det-topo h2{font-size:18px}
  .fechar{margin-left:auto;border:none;background:none;font-size:20px;cursor:pointer;color:var(--cinza)}
  .det-topo .resumo{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;align-items:center}
  .abas{display:flex;gap:2px;margin-top:12px;flex-wrap:wrap}
  .aba{padding:7px 12px;border:none;background:none;cursor:pointer;font-size:13px;color:var(--cinza);border-bottom:2px solid transparent;font-weight:600}
  .aba.ativa{color:var(--azul);border-bottom-color:var(--azul)}
  .painel{display:none;padding:16px 22px 40px}
  .painel.ativo{display:block}
  .campos{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
  .campo{background:var(--fundo);border:1px solid var(--borda);border-radius:8px;padding:8px 12px}
  .campo label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--cinza);margin-bottom:2px}
  .campo .valor{font-weight:600;word-break:break-word}
  .campo .valor a{color:var(--azul);text-decoration:none}
  .bloco-pre{background:var(--fundo);border:1px solid var(--borda);border-radius:8px;padding:10px 12px;margin-top:12px;white-space:pre-wrap;font-size:13px}
  .caso{border:1px solid var(--borda);border-radius:8px;padding:11px 14px;margin-bottom:8px;cursor:pointer}
  .caso:hover{box-shadow:0 2px 8px rgba(0,0,0,.08)}
  .caso .cab{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .timeline{list-style:none}
  .timeline li{display:flex;gap:12px;padding:9px 0;border-bottom:1px solid var(--fundo)}
  .timeline .quando{flex:none;width:130px;font-size:12px;color:var(--cinza);display:flex;gap:8px}
  .timeline .texto{flex:1;white-space:pre-wrap}
  .evento{border:1px solid var(--borda);border-left:4px solid var(--roxo);border-radius:8px;padding:10px 14px;margin-bottom:8px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;cursor:pointer}
  .evento .data-box{flex:none;text-align:center;background:#efe6f7;color:var(--roxo);border-radius:8px;padding:5px 12px;font-weight:700}
  .evento .data-box small{display:block;font-weight:400;font-size:11px}
  .evento .oque{flex:1;min-width:200px}
  .evento .oque strong{display:block}
  .evento .oque span{color:var(--cinza);font-size:13px}
  .evento.passado{border-left-color:#c8c6c4;opacity:.65}
  .evento.passado .data-box{background:var(--fundo);color:var(--cinza)}
  .cl{display:flex;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid var(--fundo)}
  .cl .box{width:15px;height:15px;border:2px solid var(--cinza);border-radius:4px;flex:none}
  .cl.feito .box{background:var(--verde);border-color:var(--verde)}
  .cl.feito span{text-decoration:line-through;color:var(--cinza)}

  .dash{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
  .card{background:var(--branco);border:1px solid var(--borda);border-radius:10px;padding:16px}
  .card h4{font-size:13px;color:var(--cinza);margin-bottom:10px}
  .num{font-size:30px;font-weight:700;color:var(--azul-escuro)}
  .barra{display:flex;align-items:center;gap:8px;margin:6px 0;font-size:13px}
  .barra .rot{width:130px;flex:none;color:var(--cinza);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .barra .tubo{flex:1;height:10px;background:var(--fundo);border-radius:5px;overflow:hidden}
  .barra .tubo i{display:block;height:100%;background:var(--azul);border-radius:5px}
  .barra .qt{width:48px;text-align:right;font-weight:600;flex:none}
  .faixa{background:#e8f1fb;color:var(--azul-escuro);text-align:center;padding:4px;font-size:12px;position:fixed;bottom:0;left:0;right:0;z-index:9}
  @media (max-width:980px){
    .app.detalhe-aberto{grid-template-columns:0 0 1fr}
    .app.detalhe-aberto .sidebar,.app.detalhe-aberto .meio{display:none}
    .app{grid-template-columns:250px 1fr}
  }
</style>
</head>
<body>
<div class="app" id="app">
  <nav class="sidebar">
    <div class="marca">CRM Tercini — Fase 1<small id="info-fonte"></small></div>
    <div class="busca"><input id="busca" placeholder="Pesquisar nome, CPF, processo, texto…"></div>
    <div class="grupo" id="grupo-dinamicas"></div>
    <div class="sep"></div>
    <div class="grupo"><h3>Listas do escritório</h3><div id="grupo-principais"></div></div>
    <details class="outras"><summary>Outras listas ▾</summary><div id="grupo-outras"></div></details>
  </nav>
  <main class="meio">
    <div class="meio-topo">
      <h1 id="titulo-lista"></h1>
      <div class="ordenar">
        <label><input type="checkbox" id="ver-concluidas"> concluídas</label>
        Ordenar: <select id="ordem">
          <option value="alfa">Alfabética</option>
          <option value="prazo">Prazo mais próximo</option>
          <option value="atualizacao">Última atualização</option>
        </select>
      </div>
    </div>
    <div class="meio-sub" id="sub-lista"></div>
    <div id="conteudo-meio"></div>
  </main>
  <aside class="detalhe" id="detalhe"></aside>
</div>
<div class="faixa">Espelho somente-leitura do Microsoft To Do — atualize com <b>sync_todo.py</b> + <b>build_app.py</b>. Fonte: <span id="info-fonte2"></span></div>

<script>
const DADOS = __DADOS__;
</script>
<script>
const HOJE = DADOS.gerado_em.slice(0,10);
const CORES_OK = {A:1,M:1,D:1,I:1,C:1};
const TAREFAS = DADOS.tarefas;
const porId = new Map(TAREFAS.map(t=>[t.id,t]));
const porCpf = new Map();
TAREFAS.forEach(t=>{ if(t.cpf){ if(!porCpf.has(t.cpf)) porCpf.set(t.cpf,[]); porCpf.get(t.cpf).push(t);} });
// índice de pesquisa (minúsculas, sem acento)
const dsa = s=>(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
TAREFAS.forEach(t=>{ t._ix = dsa([t.titulo,t.nome,t.cpf,t.processo,t.nb,t.beneficio,t.preambulo,
  t.andamentos.map(a=>a.texto).join(" ")].join(" ")); });

const fmt = iso=>iso? iso.slice(8,10)+"."+iso.slice(5,7)+"."+iso.slice(0,4) : "";
const fmtCpf = c=>c? c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,"$1.$2.$3-$4") : "—";
const esc = s=>(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const av = ini=>`<span class="avatar mini av-${CORES_OK[ini]?ini:"x"}">${esc(ini==="?"?"·":ini)}</span>`;

let listaAtual = DADOS.listas_principais[0] || DADOS.listas[0];
let visao = "lista";          // lista | agenda | dashboard
let selecionada = null, busca = "", limite = 300;

document.getElementById("info-fonte").textContent = `dados de ${fmt(HOJE)}`;
document.getElementById("info-fonte2").textContent = `${DADOS.fonte} · ${fmt(HOJE)}`;

function contAtivas(nome){ return TAREFAS.filter(t=>t.lista===nome && !t.concluida).length; }

function montarSidebar(){
  const din = document.getElementById("grupo-dinamicas");
  const din_defs = [
    ["planejado","🗓️ Planejado", TAREFAS.filter(t=>t.prazo && !t.concluida).length],
    ["importante","⭐ Importante", TAREFAS.filter(t=>t.importante && !t.concluida).length],
    ["agenda","🩺 Perícias & Audiências", TAREFAS.flatMap(t=>t.eventos).filter(e=>e.data>=HOJE).length],
    ["dashboard","📊 Dashboard", null],
  ];
  din.innerHTML = din_defs.map(([id,rot,n])=>
    `<div class="lista-item" data-v="${id}"><span class="rotulo">${rot}</span>${n!=null?`<span class="cont">${n}</span>`:""}</div>`).join("");
  const mk = nome=>`<div class="lista-item" data-l="${esc(nome)}"><span class="rotulo">${esc(nome)}</span><span class="cont">${contAtivas(nome)}</span></div>`;
  document.getElementById("grupo-principais").innerHTML = DADOS.listas_principais.map(mk).join("");
  document.getElementById("grupo-outras").innerHTML =
    DADOS.listas.filter(n=>!DADOS.listas_principais.includes(n)).map(mk).join("");
  document.querySelectorAll(".lista-item").forEach(el=>el.onclick=()=>{
    document.querySelectorAll(".lista-item").forEach(i=>i.classList.remove("ativa"));
    el.classList.add("ativa");
    selecionada=null; limite=300;
    document.getElementById("app").classList.remove("detalhe-aberto");
    if(el.dataset.v){ visao = el.dataset.v==="planejado"||el.dataset.v==="importante" ? "lista" : el.dataset.v; listaAtual = el.dataset.v; }
    else { visao="lista"; listaAtual = el.dataset.l; }
    render();
  });
  const primeiro = document.querySelector(`.lista-item[data-l="${CSS.escape(listaAtual)}"]`);
  if(primeiro) primeiro.classList.add("ativa");
}

function tarefasDaVisao(){
  let ts;
  if(busca) ts = TAREFAS.filter(t=>t._ix.includes(busca));
  else if(listaAtual==="planejado") ts = TAREFAS.filter(t=>t.prazo && !t.concluida);
  else if(listaAtual==="importante") ts = TAREFAS.filter(t=>t.importante && !t.concluida);
  else ts = TAREFAS.filter(t=>t.lista===listaAtual);
  if(!document.getElementById("ver-concluidas").checked && !busca)
    ts = ts.filter(t=>!t.concluida || listaAtual==="planejado" || listaAtual==="importante");
  const ord = busca||listaAtual==="planejado" ? (busca?document.getElementById("ordem").value:"prazo") : document.getElementById("ordem").value;
  ts = ts.slice();
  if(ord==="alfa") ts.sort((a,b)=>(a.nome||a.titulo).localeCompare(b.nome||b.titulo,"pt"));
  if(ord==="prazo") ts.sort((a,b)=>(a.prazo||"9999")<(b.prazo||"9999")?-1:1);
  if(ord==="atualizacao") ts.sort((a,b)=>(b.atualizada_em||"")<(a.atualizada_em||"")?-1:1);
  return ts;
}

function render(){
  const h1 = document.getElementById("titulo-lista"), sub = document.getElementById("sub-lista");
  if(visao==="dashboard"){ h1.textContent="📊 Dashboard"; sub.textContent=`Números reais calculados do espelho de ${fmt(HOJE)}.`; return renderDash(); }
  if(visao==="agenda"){ h1.textContent="🩺 Perícias & Audiências"; sub.textContent="Datas extraídas automaticamente dos andamentos — clique para abrir a ficha."; return renderAgenda(); }
  h1.textContent = busca ? "🔍 Pesquisa" :
    listaAtual==="planejado" ? "🗓️ Planejado" : listaAtual==="importante" ? "⭐ Importante" : listaAtual;
  const ts = tarefasDaVisao();
  sub.textContent = busca ? `${ts.length} resultado(s) em todas as listas para "${document.getElementById("busca").value}"`
    : `${ts.length} tarefa(s) — cada cartão é uma tarefa do To Do; a ficha agrupa o cliente inteiro.`;
  renderCartoes(ts);
}

function chips(t){
  const irm = t.cpf ? porCpf.get(t.cpf).length : 1;
  const evFut = t.eventos.find(e=>e.data>=HOJE);
  return [
    t.beneficio?`<span class="chip ben">${esc(t.beneficio)}</span>`:"",
    busca?`<span class="chip fase">${esc(t.lista)}</span>`:"",
    t.prazo && !t.concluida?`<span class="chip prazo ${t.prazo<HOJE?"venc":""}">⏰ ${fmt(t.prazo)}</span>`:"",
    evFut?`<span class="chip per">🩺 ${esc(evFut.tipo)} ${fmt(evFut.data)}</span>`:"",
    irm>1?`<span class="chip neutro">${irm} casos</span>`:"",
    t.andamentos.length?`<span class="chip neutro">${t.andamentos.length} andamentos</span>`:"",
  ].join("");
}

function renderCartoes(ts){
  const fatia = ts.slice(0,limite);
  document.getElementById("conteudo-meio").innerHTML = fatia.map(t=>`
    <div class="cartao ${t.id===selecionada?"sel":""} ${t.concluida?"feita":""}" data-id="${t.id}">
      <span class="check"></span>
      <div class="info">
        <div class="nome">${esc(t.nome||t.titulo)}</div>
        <div class="meta">${chips(t)}</div>
      </div>
      <span class="estrela ${t.importante?"on":""}">★</span>
    </div>`).join("")
    + (ts.length>limite?`<button class="mais" onclick="limite+=300;render()">Mostrar mais ${ts.length-limite} …</button>`:"")
    || `<div class="meio-sub">Nada encontrado.</div>`;
  document.querySelectorAll(".cartao").forEach(el=>el.onclick=()=>abrirFicha(el.dataset.id));
}

function renderAgenda(){
  const evs=[];
  TAREFAS.forEach(t=>t.eventos.forEach(e=>evs.push({...e,t})));
  evs.sort((a,b)=>a.data<b.data?-1:1);
  const fut=evs.filter(e=>e.data>=HOJE), pas=evs.filter(e=>e.data<HOJE).reverse().slice(0,80);
  const bloco=e=>`
    <div class="evento ${e.data<HOJE?"passado":""}" data-id="${e.t.id}">
      <div class="data-box">${fmt(e.data).slice(0,5)}<small>${e.hora||fmt(e.data).slice(6)}</small></div>
      <div class="oque"><strong>${esc(e.tipo)} — ${esc(e.t.nome||e.t.titulo)}</strong>
        <span>${esc(e.trecho)}</span></div>
      <span class="chip fase">${esc(e.t.lista)}</span>
    </div>`;
  document.getElementById("conteudo-meio").innerHTML =
    `<h3 style="margin:6px 0">Próximas (${fut.length})</h3>` + (fut.map(bloco).join("")||"<p class='meio-sub'>Nenhuma futura.</p>")
    + `<h3 style="margin:14px 0 6px">Passadas recentes</h3>` + pas.map(bloco).join("");
  document.querySelectorAll(".evento").forEach(el=>el.onclick=()=>abrirFicha(el.dataset.id));
}

function barras(pares,fmtQt){
  const max=Math.max(...pares.map(p=>p[1]),1);
  return pares.map(([r,q])=>`<div class="barra"><span class="rot" title="${esc(r)}">${esc(r)}</span><div class="tubo"><i style="width:${q/max*100}%"></i></div><span class="qt">${fmtQt?fmtQt(q):q}</span></div>`).join("");
}
function renderDash(){
  const ativas=TAREFAS.filter(t=>!t.concluida);
  const seteDias=new Date(HOJE); seteDias.setDate(seteDias.getDate()+7);
  const lim=seteDias.toISOString().slice(0,10);
  const prazos7=ativas.filter(t=>t.prazo && t.prazo>=HOJE && t.prazo<=lim).length;
  const vencidos=ativas.filter(t=>t.prazo && t.prazo<HOJE).length;
  const evFut=TAREFAS.flatMap(t=>t.eventos).filter(e=>e.data>=HOJE).length;
  const m30=new Date(HOJE); m30.setDate(m30.getDate()-30);
  const lim30=m30.toISOString().slice(0,10);
  const porAutor={};
  TAREFAS.forEach(t=>t.andamentos.forEach(a=>{ if(a.data>=lim30 && a.autor!=="—") porAutor[a.autor]=(porAutor[a.autor]||0)+1; }));
  const autores=Object.entries(porAutor).sort((a,b)=>b[1]-a[1]);
  const porLista=DADOS.listas_principais.map(n=>[n,contAtivas(n)]);
  const porBen={};
  ativas.forEach(t=>{ if(t.beneficio) porBen[t.beneficio]=(porBen[t.beneficio]||0)+1; });
  const bens=Object.entries(porBen).sort((a,b)=>b[1]-a[1]).slice(0,10);
  document.getElementById("conteudo-meio").innerHTML=`<div class="dash">
    <div class="card"><h4>Clientes (CPFs distintos)</h4><div class="num">${DADOS.clientes.length}</div></div>
    <div class="card"><h4>Tarefas ativas</h4><div class="num">${ativas.length}</div></div>
    <div class="card"><h4>Prazos próximos 7 dias</h4><div class="num" style="color:var(--laranja)">${prazos7}</div></div>
    <div class="card"><h4>Prazos vencidos (abertos)</h4><div class="num" style="color:var(--vermelho)">${vencidos}</div></div>
    <div class="card"><h4>Perícias/audiências futuras</h4><div class="num" style="color:var(--roxo)">${evFut}</div></div>
    <div class="card"><h4>Andamentos registrados</h4><div class="num">${TAREFAS.reduce((s,t)=>s+t.andamentos.length,0)}</div></div>
    <div class="card" style="grid-column:1/-1"><h4>Andamentos por colaborador — últimos 30 dias</h4>${barras(autores)}</div>
    <div class="card" style="grid-column:1/-1"><h4>Tarefas ativas por lista</h4>${barras(porLista)}</div>
    <div class="card" style="grid-column:1/-1"><h4>Tarefas ativas por benefício (identificado no texto)</h4>${barras(bens)}</div>
  </div>`;
}

function abrirFicha(id){
  selecionada=id;
  const t=porId.get(id);
  const irmas=t.cpf?porCpf.get(t.cpf):[t];
  document.getElementById("app").classList.add("detalhe-aberto");
  if(visao==="lista") renderCartoes(tarefasDaVisao());
  const abas=["Dados","Casos","Andamentos","Perícias & Audiências","Checklist"];
  const evs=t.eventos.slice().sort((a,b)=>a.data<b.data?1:-1);
  document.getElementById("detalhe").innerHTML=`
  <div class="det-topo">
    <div class="linha1"><span class="avatar">${esc((t.nome||t.titulo)[0]||"?")}</span>
      <h2>${esc(t.nome||t.titulo)}</h2>
      <button class="fechar" onclick="fecharFicha()">✕</button></div>
    <div class="resumo">
      ${t.beneficio?`<span class="chip ben">${esc(t.beneficio)}</span>`:""}
      <span class="chip fase">${esc(t.lista)}</span>
      ${t.prazo?`<span class="chip prazo ${t.prazo<HOJE&&!t.concluida?"venc":""}">⏰ ${fmt(t.prazo)}</span>`:""}
      ${t.concluida?`<span class="chip neutro">concluída ${fmt(t.concluida_em)}</span>`:""}
      ${t.importante?`<span class="chip per">⭐ importante</span>`:""}
    </div>
    <div class="abas">${abas.map((a,i)=>`<button class="aba ${i===2?"ativa":""}" data-i="${i}">${a}${
      a==="Andamentos"?` (${t.andamentos.length})`:a==="Casos"?` (${irmas.length})`:
      a==="Perícias & Audiências"&&evs.length?` (${evs.length})`:a==="Checklist"&&t.checklist.length?` (${t.checklist.length})`:""}</button>`).join("")}</div>
  </div>
  <div class="painel" data-p="0">
    <div class="campos">
      <div class="campo"><label>CPF</label><div class="valor">${fmtCpf(t.cpf)}</div></div>
      <div class="campo"><label>Data de nascimento</label><div class="valor">${t.dn?t.dn.slice(0,2)+"."+t.dn.slice(2,4)+"."+t.dn.slice(4):"—"}</div></div>
      <div class="campo"><label>Telefone</label><div class="valor">${t.telefone?`<a href="https://wa.me/55${t.telefone.replace(/\D/g,"")}" target="_blank">💬 ${esc(t.telefone)}</a>`:"—"}</div></div>
      <div class="campo"><label>Nº processo</label><div class="valor">${esc(t.processo||"—")}</div></div>
      <div class="campo"><label>NB</label><div class="valor">${esc(t.nb||"—")}</div></div>
      <div class="campo"><label>Criada / atualizada</label><div class="valor" style="font-weight:400">${fmt(t.criada_em)} · ${fmt(t.atualizada_em)}</div></div>
    </div>
    ${t.preambulo?`<div class="bloco-pre"><b>Anotações do topo da tarefa (To Do):</b>\n${esc(t.preambulo)}</div>`:""}
    <p style="margin-top:10px;font-size:12px;color:var(--cinza)">Fase 1 é somente-leitura: para alterar, edite no To Do e rode o sync.</p>
  </div>
  <div class="painel" data-p="1">
    ${irmas.map(k=>`<div class="caso" onclick="abrirFicha('${k.id}')">
      <div class="cab"><strong>${esc(k.titulo)}</strong></div>
      <div class="meta" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
        <span class="chip fase">${esc(k.lista)}</span>
        ${k.beneficio?`<span class="chip ben">${esc(k.beneficio)}</span>`:""}
        ${k.concluida?`<span class="chip neutro">concluída</span>`:""}
        <span class="chip neutro">${k.andamentos.length} andamentos</span>
      </div></div>`).join("")}
  </div>
  <div class="painel ativo" data-p="2">
    <ul class="timeline">${t.andamentos.map(a=>`<li>
      <span class="quando">${av(a.inicial)}${fmt(a.data)}<br>${esc(a.autor)}</span>
      <span class="texto">${esc(a.texto)}</span></li>`).join("")||"<p class='meio-sub'>Sem blocos datados nesta tarefa.</p>"}</ul>
  </div>
  <div class="painel" data-p="3">
    ${evs.map(e=>`<div class="evento ${e.data<HOJE?"passado":""}">
      <div class="data-box">${fmt(e.data).slice(0,5)}<small>${e.hora||fmt(e.data).slice(6)}</small></div>
      <div class="oque"><strong>${esc(e.tipo)}</strong><span>${esc(e.trecho)}</span></div></div>`).join("")
      ||"<p class='meio-sub'>Nenhuma perícia ou audiência detectada nos andamentos.</p>"}
  </div>
  <div class="painel" data-p="4">
    ${t.checklist.map(c=>`<div class="cl ${c.feito?"feito":""}"><span class="box"></span><span>${esc(c.texto)}</span></div>`).join("")
      ||"<p class='meio-sub'>Sem checklist.</p>"}
  </div>`;
  document.querySelectorAll(".aba").forEach(b=>b.onclick=()=>{
    document.querySelectorAll(".aba").forEach(x=>x.classList.remove("ativa")); b.classList.add("ativa");
    document.querySelectorAll(".painel").forEach(p=>p.classList.toggle("ativo",p.dataset.p===b.dataset.i));
  });
}
function fecharFicha(){ selecionada=null; document.getElementById("app").classList.remove("detalhe-aberto"); render(); }

let timer=null;
document.getElementById("busca").addEventListener("input",e=>{
  clearTimeout(timer);
  timer=setTimeout(()=>{ busca=dsa(e.target.value.trim()); limite=300; visao="lista"; render(); },200);
});
document.getElementById("ordem").onchange=render;
document.getElementById("ver-concluidas").onchange=render;
montarSidebar();
render();
</script>
</body>
</html>
"""


def main(entrada=ENTRADA, saida=SAIDA):
    entrada, saida = pathlib.Path(entrada), pathlib.Path(saida)
    if not entrada.exists():
        sys.exit(f"{entrada} não existe — rode crm/sync_todo.py antes.")
    dados = entrada.read_text(encoding="utf-8")
    # </script> dentro de strings JSON quebraria o bloco <script>
    embutido = dados.replace("</", "<\\/")
    saida.write_text(TEMPLATE.replace("__DADOS__", embutido), encoding="utf-8")
    print(f"{saida} gerado ({saida.stat().st_size/1e6:.1f} MB) — abra no navegador.")


if __name__ == "__main__":
    ap = __import__("argparse").ArgumentParser()
    ap.add_argument("--entrada", default=str(ENTRADA))
    ap.add_argument("--saida", default=str(SAIDA))
    a = ap.parse_args()
    main(a.entrada, a.saida)
