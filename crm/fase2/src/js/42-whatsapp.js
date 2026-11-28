function pintarPaleta(q, i){
  _palIt = itensPaleta(q); _palI = i;
  const ul = document.getElementById("pal-lista"); if(!ul) return;
  ul.innerHTML = _palIt.length ? _palIt.map((it,j)=>`<li role="option" data-pi="${j}" aria-selected="${j===i}" class="${j===i?"pal-on":""}"><span class="pal-t">${esc(it.tipo)}</span>${esc(it.rot)}</li>`).join("")
    : `<li class="pal-vazio">Nada encontrado.</li>`;
  ul.querySelectorAll("li[data-pi]").forEach(li=>li.onclick=()=>usarPaleta(+li.dataset.pi));
  ul.querySelector(".pal-on")?.scrollIntoView({block:"nearest"});
}
function usarPaleta(i){ const it = _palIt[i]; if(!it) return; fecharPaleta(); it.ir(); }
function fecharPaleta(){ document.getElementById("paleta")?.remove(); }

// sem <form>, o Enter precisa ser ligado à mão nos dois campos do login
["login-email","login-senha"].forEach(function(id){
  var el=document.getElementById(id);
  if(el) el.addEventListener("keydown", function(e){
    if(e.key==="Enter"){ e.preventDefault(); entrar(e); } });
});
// ── celular: barra de baixo e busca no alto da lista ──────────────────────
document.querySelectorAll("#barra-cel button").forEach(b=>{
  b.onclick=()=>irCel(b.dataset.cel);
  // F137 · os mesmos ícones desenhados do menu lateral, no lugar do emoji
  const ic=b.querySelector("b"), em=ic.textContent;
  ic.innerHTML = b.dataset.cel==="whatsapp" ? iconeFonte("zap").replace(/width="16" height="16"/,'width="21" height="21"')
    : em==="☰"
    ? '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
    : (svgIc(em,21)||em); });
let timerCel=null;
document.getElementById("busca-cel").addEventListener("input",e=>{
  clearTimeout(timerCel);
  document.getElementById("busca-cel-x").style.display = e.target.value ? "block" : "none";
  timerCel=setTimeout(()=>{
    buscaTxt=e.target.value.trim();
    document.getElementById("busca").value=e.target.value;   // um campo espelha o outro
    if(buscaTxt && clienteAberto) fecharFicha(false);
    render();
  },200);
});
document.getElementById("busca-cel-x").onclick=()=>{
  const b=document.getElementById("busca-cel");
  b.value=""; buscaTxt=""; document.getElementById("busca").value="";
  document.getElementById("busca-cel-x").style.display="none";
  render();
};
document.getElementById("busca-x").onclick=()=>{
  const b=document.getElementById("busca");
  b.value=""; buscaTxt="";
  document.getElementById("busca-x").style.display="none";
  b.focus(); render();
};
document.getElementById("ordem").onchange=()=>render();
document.getElementById("ordem").value = ["prazo","alfa","imp"].includes(ler("crm_ordem")) ? ler("crm_ordem") : "prazo";
// O ☰ é a palavra final sobre o menu. Antes ele só mexia numa classe que a
// ficha aberta sobrescrevia — com tudo aberto, clicar não fazia nada e o
// botão parecia quebrado. Agora ele grava a preferência e manda aplicar.
document.getElementById("btn-lateral").onclick=()=>{
  const app=document.getElementById("app");
  if(app.classList.contains("detalhe-aberto")){
    // dentro da ficha o ☰ é exceção passageira, não muda a preferência
    menuFichaSessao = app.classList.contains("mini-lateral") ? "cheio" : null;
  }else{
    guardar("crm_menu", app.classList.contains("mini-lateral") ? "cheio" : "mini");
  }
  aplicarMenu();
};

// ══════════════════════════════════════════════════════════════════════════
// F15 · A LETRA DO AVATAR — texto claro sobre cor clara não se lê
// ══════════════════════════════════════════════════════════════════════════
// A cor do colaborador vem do banco e entra crua em `style="background:..."`
// em quinze pontos de render. O CSS escreve a inicial sempre em branco, e
// sobre um âmbar como #E6A700 isso dá 2,12:1 — a letra some. Escurecer a cor
// escolhida mudaria a identidade que o escritório definiu; o certo é trocar a
// LETRA quando o fundo é claro.
//
// Um observador é o único lugar que alcança todos os quinze pontos, mais os
// avatares que nascem em janelas e na ficha, sem tocar em nenhum deles.
function _lumHex(h){
  h = String(h||"").replace("#","");
  if(h.length===3) h = [...h].map(c=>c+c).join("");
  if(!/^[0-9a-fA-F]{6,8}$/.test(h)) return 0;
  const f = v => { v = parseInt(v,16)/255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
  return 0.2126*f(h.slice(0,2)) + 0.7152*f(h.slice(2,4)) + 0.0722*f(h.slice(4,6));
}
// o ponto de virada é a luminância em que branco e quase-preto empatam
function _lumCor(c){
  c = String(c||"").trim();
  if(c[0]==="#") return _lumHex(c);
  const m = c.match(/rgba?\(([^)]+)\)/);
  if(!m) return null;
  const [r,g,b] = m[1].split(/[,\s\/]+/).filter(Boolean).map(Number);
  const f = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
  return 0.2126*f(r) + 0.7152*f(g) + 0.0722*f(b);
}
function letraDoAvatar(el){
  const L = _lumCor(el.style.background || el.style.backgroundColor);
  if(L === null) return;
  el.style.color = L > 0.183 ? "#1A1C20" : "#fff";
}
function pintarLetraAvatares(raiz){
  (raiz.querySelectorAll ? raiz.querySelectorAll(".avatar[style]") : []).forEach(letraDoAvatar);
  if(raiz.matches && raiz.matches(".avatar[style]")) letraDoAvatar(raiz);
}
new MutationObserver(ms=>{
  for(const m of ms) for(const n of m.addedNodes) if(n.nodeType===1) pintarLetraAvatares(n);
}).observe(document.documentElement, {childList:true, subtree:true});

(async ()=>{
  if(faltaConfig()){
    // primeira vez neste navegador: pede o endereço e a chave e guarda
    document.getElementById("login-config").innerHTML=`
      <div class="cfg-cx">
        <strong>Primeiro acesso neste navegador</strong>
        <p>Cole o endereço e a chave <b>anon</b> do projeto, que no Supabase fica em
           <i>Settings → API</i>. Fica guardado aqui: você só faz isto uma vez,
           mesmo trocando o arquivo por uma versão nova.</p>
        <input id="cfg-url" placeholder="https://xxxxx.supabase.co" autocomplete="off">
        <input id="cfg-key" placeholder="chave anon (eyJ...)" autocomplete="off">
        <button type="button" onclick="guardarConfig()" title="Guardar neste navegador">Guardar<span class="sr-only"> neste navegador</span></button>
      </div>`;
    document.getElementById("login-email").style.display="none";
    document.getElementById("login-senha").style.display="none";
    document.getElementById("btn-entrar").style.display="none";
    document.querySelector(".cfg-link").style.display="none";
    return;
  }
  const salva=ler("crm_sessao");
  if(salva){
    sessao=JSON.parse(salva);
    try{ await iniciar(); }catch{ if(await renovar()){ try{ await iniciar(); }catch{ sair(); } } }
  }
})();

// Trava de duplo clique: enquanto a gravação anterior do mesmo item não termina, o segundo clique é ignorado.
// Fica no último módulo porque troca as quatro funções globais chamadas por onclick, já declaradas nos módulos anteriores.
const _gravando = new Set();
for(const n of ["novoPgto", "confirmarRecebido", "registrarMovimento", "semNovidade"]){
  const f = window[n];
  if(typeof f !== "function") continue;
  window[n] = async function(...a){
    const ch = n + ":" + a[0];
    if(_gravando.has(ch)){ a.forEach(x=>x && x.stopPropagation && x.stopPropagation()); return; }   // o clique ignorado não sobe para a linha
    _gravando.add(ch);
    try{ return await f.apply(this, a); } finally{ _gravando.delete(ch); }
  };
}
