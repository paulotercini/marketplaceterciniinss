<script>
// PRIMEIRA linha do script: se ele rodar, o aviso de "navegador não executa"
// desaparece. Chegando aqui, o sistema funciona neste navegador.
(function(){ var a=document.getElementById("sem-js"); if(a) a.style.display="none"; })();

// ── CONFIGURAÇÃO (preencher na instalação — ver COMO-INSTALAR.md) ─────────
const CONFIG = {
  SUPABASE_URL: "COLE_AQUI_https://xxxx.supabase.co",
  ANON_KEY: "COLE_AQUI_a_anon_key",
};
// Quem baixa uma versão nova do arquivo receberia estes valores em branco e
// perderia o acesso a cada atualização. Por isso o endereço e a chave também
// ficam guardados no próprio navegador: preenche uma vez, e trocar o arquivo
// não desconfigura mais nada. (A chave "anon" é pública por natureza — quem
// protege os dados é o RLS do banco, não o segredo dela.)
// Navegador de celular em aba anônima, ou com "bloquear cookies", faz o
// localStorage LANÇAR em vez de só devolver nulo. Sem estas duas funções
// qualquer gravação derruba o login inteiro e a tela volta ao começo sem
// explicar nada. Aqui o armazenamento vira opcional: se não der, guarda na
// memória e o sistema funciona até fechar a aba.
const memoria = {};
function guardar(chave, valor){
  memoria[chave]=valor;
  try{ localStorage.setItem(chave, valor); return true; }catch(e){ return false; }
}
function ler(chave){
  try{ const v=localStorage.getItem(chave); if(v!=null) return v; }catch(e){}
  return memoria[chave] ?? null;
}
function esquecer(chave){
  delete memoria[chave];
  try{ localStorage.removeItem(chave); }catch(e){}
}
function guardaFunciona(){
  try{ localStorage.setItem("__t","1"); localStorage.removeItem("__t"); return true; }
  catch(e){ return false; }
}
function faltaConfig(){ return CONFIG.SUPABASE_URL.startsWith("COLE_AQUI"); }
(function(){
  if(!faltaConfig()) return;
  try{
    const g=JSON.parse(ler("crm_cfg")||"null");
    if(g && g.url && g.key){ CONFIG.SUPABASE_URL=g.url; CONFIG.ANON_KEY=g.key; }
  }catch(e){}
})();
function guardarConfig(){
  const url=(document.getElementById("cfg-url").value||"").trim().replace(/\/+$/,"");
  const key=(document.getElementById("cfg-key").value||"").trim();
  const erro=document.getElementById("login-erro");
  if(!/^https:\/\/[\w-]+\.supabase\.co$/.test(url))
    return erro.textContent="O endereço deve ser algo como https://xxxxx.supabase.co";
  if(key.length<40) return erro.textContent="A chave anon parece incompleta — cole ela inteira";
  if(!guardar("crm_cfg", JSON.stringify({url, key})))
    aviso("Este navegador não deixa guardar dados — vai funcionar só até fechar a aba", false);
  location.reload();
}
// ──────────────────────────────────────────────────────────────────────────

// ── Tudo neste sistema é horário de Brasília e português do Brasil ────────
// O banco grava em UTC. Recortar "2026-08-06T00:30:00Z" com slice(0,10) daria
// 06/08 para um andamento escrito às 21h30 do dia 5 — a data do dia seguinte.
// Estas funções convertem de verdade; nada de fatiar texto de timestamp.
const FUSO = "America/Sao_Paulo", IDIOMA = "pt-BR";
// A data de hoje é a mesma para todo o programa, mas `toLocaleDateString`
// com fuso monta um formatador novo a cada chamada: 0,157 ms cada. Parece
// nada, e era 909 ms num filtro só — `D.tarefas` tem 7.657 linhas e a
// condição chamava hoje() em cada uma. Com 116 chamadas espalhadas pelo
// arquivo, quase todas dentro de laço, esta linha respondia por ~1,1 s de
// tela travada em ☀️ Meu Dia e na montagem da lateral.
//
// Guardar por meio minuto resolve sem risco: a data só muda à meia-noite, e
// meio minuto de atraso numa virada de dia não altera decisão nenhuma.
let _hojeMem = {em:0, v:""};
const hoje = () => {
  const t = Date.now();
  if(t - _hojeMem.em > 30000) _hojeMem = {em:t, v:_FMT_DATA.format(new Date())};
  return _hojeMem.v;
};
// Formatadores de fuso montados UMA vez. `toLocaleDateString(loc, {timeZone})`
// constrói um Intl.DateTimeFormat novo a cada chamada — 0,13 ms cada, e a
// Agenda formata 1.248 eventos. Reaproveitar o formatador é a mesma conta sem
// o custo de montá-lo.
const _FMT_DATA = new Intl.DateTimeFormat("sv", {timeZone: FUSO});
const _FMT_HORA = new Intl.DateTimeFormat(IDIOMA, {timeZone: FUSO, hour:"2-digit", minute:"2-digit"});
const _FMT_AGORA = new Intl.DateTimeFormat("en-US", {timeZone: FUSO, year:"numeric", month:"2-digit",
  day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false});
// "agora" no relógio de Brasília, mesmo com o aparelho em outro fuso
function agoraSP(){
  const p = {}; for(const x of _FMT_AGORA.formatToParts(new Date())) p[x.type] = x.value;
  // hourCycle h23 devolve 24 à meia-noite em alguns motores
  return new Date(+p.year, +p.month-1, +p.day, +p.hour%24, +p.minute, +p.second);
}
// timestamp do banco -> data e hora de Brasília. Timestamp sem fuso (o que o
// próprio escritório digitou, como a hora da perícia) já é de Brasília e
// passa intocado.
function _dt(ts){
  if(!ts) return null;
  const d = new Date(/[Zz]|[+-]\d\d:?\d\d$/.test(ts) ? ts : ts.replace(" ","T"));
  return isNaN(d) ? null : d;
}
function _semFuso(ts){ return ts && !/[Zz]|[+-]\d\d:?\d\d$/.test(ts); }
function dataSP(ts){
  if(_semFuso(ts)) return (ts||"").slice(0,10);
  const d=_dt(ts); return d ? _FMT_DATA.format(d) : "";
}
function horaSP(ts){
  if(_semFuso(ts)) return (ts||"").slice(11,16);
  const d=_dt(ts); if(!d) return "";
  return _FMT_HORA.format(d);
}
const fmtTS = ts => fmt(dataSP(ts));                 // DD.MM.AAAA de Brasília
const fmt = iso => iso ? iso.slice(8,10)+"."+iso.slice(5,7)+"."+iso.slice(0,4) : "";
const fmtCpf = c => c ? c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : "—";
const digitosCpf = c => (c||"").replace(/\D/g,"");
// escapa TAMBÉM aspas e apóstrofos: sem isso, esc() protegia o miolo do
// elemento mas um " em title="..." (nome, texto de coleta) quebrava o
// atributo e virava injeção. Dentro de onclick="fn('...')" entidade não
// basta (o HTML devolve o apóstrofo antes de virar JS) — lá é escJs.
const esc = s => (s??"").toString().replace(/&/g,"&amp;").replace(/</g,"&lt;")
  .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const escJs = s => esc((s??"").toString().replace(/\\/g,"\\\\").replace(/'/g,"\\'")
  .replace(/\r/g,"\\r").replace(/\n/g,"\\n").replace(/\u2028|\u2029/g," "));
// href só de verdade: link de coleta (PAT/PJe) sem https na frente não entra
const urlOk = u => /^https?:\/\//i.test(u||"") ? esc(u) : "#";
const dsa = s => (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");

// ── pesquisa ──────────────────────────────────────────────────────────────
// "Paulo Santos" tem de achar "Paulo dos Santos": cada pedaço digitado é
// procurado em qualquer lugar da ficha, em qualquer ordem. Não é preciso
// escrever o nome inteiro nem na ordem certa.
const LIGACOES = new Set(["de","da","do","das","dos","e","di","du","del","dr","dra"]);
function termosBusca(txt){
  const base = dsa(txt);
  const digitos = base.replace(/\D/g, "");
  // CPF, nº de processo, protocolo: vale o número inteiro, não os pedaços
  if(digitos.length >= 6) return [digitos];
  const termos = base.split(/[^a-z0-9]+/).filter(Boolean);
  const fortes = termos.filter(t=>!LIGACOES.has(t));
  return (fortes.length ? fortes : termos);
}
function pesquisar(txt){
  const termos = termosBusca(txt);
  if(!termos.length) return [];
  // F222 · o cliente gravado agora (etapa 1 do Novo Cliente, CPF achado no banco) entra sem índice e derrubava a pesquisa
  let achados = D.clientes.filter(c=>{ if(fichaJuntada(c)) return false; if(c._ix==null) reindexarCliente(c); return termos.every(t=>c._ix.includes(t)); });
  // F447 · o telefone copiado do WhatsApp (+55) ou sem o nono dígito: vale pelos 8 últimos dígitos
  if(!achados.length && termos.length===1 && /^\d{8,13}$/.test(termos[0])) achados = clientesDoTelefone(termos[0]).filter(c=>!fichaJuntada(c));
  // quem casa pelo NOME aparece primeiro; depois, nome mais curto (mais exato)
  const noNome = c => termos.every(t=>(c._nome_ix||"").includes(t));
  return achados.sort((a,b)=>{
    const d = (noNome(b)?1:0) - (noNome(a)?1:0);
    return d || (a.nome||"").length - (b.nome||"").length;
  });
}
// F222 · a pesquisa que não acha a pessoa oferece o cadastro. Vale para nome
// (três letras ou mais) e para CPF válido; número de processo, NB e protocolo
// não viram cliente. Com resultados, a saída fica no pé da lista, porque o
// achado pode ser um homônimo; some quando alguém tem exatamente o nome
// digitado (sem contar "de", "da", "dos") ou o CPF digitado.
function saidaNovoCliente(txt, achados){
  const t = String(txt||"").trim(), d = t.replace(/\D/g,"");
  const ehCpf = d.length===11 && cpfValido(d) && !/[a-z]/.test(dsa(t));
  if(!ehCpf && (t.length<3 || !/[a-z]/.test(dsa(t)))) return "";
  const fortes = s => termosBusca(s).sort().join(" ");
  if(ehCpf ? achados.some(c=>digitosCpf(c.cpf)===d) : achados.some(c=>fortes(c.nome)===fortes(t))) return "";
  return `<div class="busca-novo${achados.length?" com-achados":""}">
    <p>${achados.length ? "Não é nenhum destes?" : `Ninguém com ${ehCpf ? `o CPF ${esc(fmtCpf(d))}` : `“${esc(t)}”`} no CRM.`}</p>
    <button type="button" class="bn-cli" data-bn="${esc(t)}" onclick="novoClienteDaBusca(this.dataset.bn)" title="abre o cadastro do cliente novo com ${ehCpf?"o CPF":"o nome"} da pesquisa">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Cliente</button>
  </div>`;
}
// F39 · navegar com a pesquisa ativa: o clique no menu VAI para a lista e a
// pesquisa se apaga sozinha — antes era preciso clicar no ✕ primeiro. Um
// helper só para os dois campos (desktop e celular) e os dois ✕.
function limparBusca(){
  buscaTxt="";
  for(const [cid,xid] of [["busca","busca-x"],["busca-cel","busca-cel-x"]]){
    const c=document.getElementById(cid); if(c) c.value="";
    const x=document.getElementById(xid); if(x) x.style.display="none";
  }
}
const moeda = v => v==null ? "—" : Number(v).toLocaleString(IDIOMA,{style:"currency",currency:"BRL"});

// (F41) UM predicado para "quem está na equipe": metade do app filtrava
// c.ativo (some quem tem ativo=null) e a outra metade ativo!==false. Agora
// toda superfície de anotação/atribuição usa a mesma régua.
// (F43) E a linha precisa ser UTILIZÁVEL: colaborador sem nome ou sem
// inicial (cadastro pela metade, robô antigo) derrubava a pintura da ficha
// inteira — quebrado fica fora até alguém completar o cadastro.
const equipeAtiva = () => (D.colaboradores||[]).filter(c=>c.ativo!==false && c.nome && c.inicial);

let sessao = null;   // {access_token, refresh_token, user}
let eu = null;       // linha de colaboradores do usuário logado
let D = {};          // dados carregados: colaboradores, clientes, casos, ...
// 1.25 da extensão · o aviso de fim da rodada abre o CRM com ?ir=patinss, já no 📥 Importar
// F420 · o Paulo confere só as Novidades: o aviso da extensão (?ir=patinss) abre nelas, e as coletas entram sozinhas
let visao = new URLSearchParams(location.search).get("ir")==="patinss" ? "novidades" : "meudia", filtroColab = null, filtroVencidas = false, buscaTxt = "", clienteAberto = null, abaAtiva = 2, casoSel = null;
// F236 · o Meu Dia tem filtro próprio e abre no dia de quem entrou; as listas (filtroColab) abrem na pessoa
let filtroDia = null;
let secRecolhida = new Set();   // F79: seções do Meu Dia recolhidas (sobrevive às repinturas)
let fasesAbertas = new Set();   // F82: fases do Caso completo abertas à mão (tema v10), por caso:fase
// F320 · no celular a ficha se lê em abas no alto (plano de interface limpa, 31.10.2026): Andamentos, Prazos, Caso,
// Cadastro e Honorários; o Cadastro abre no Principal (CPF, Meu INSS e telefone, cada um com o seu botão)
let celAba = "casos", celCad = "principal";
// F677 · o menu do celular é Casos, Cadastro, Prazos, Perícias e Honorários (pedido do Paulo, 21.11.2026); Casos reúne
// os andamentos (botões Escritório, INSS, CRPS, Judicial), o resumo e os dados do benefício; "and" e "caso" ficam como sinônimos
function celIr(qual, escolher){
  if(qual==="and" || qual==="caso") qual = "casos";
  // com mais de um caso, o toque em Casos abre a escolha do caso
  const ks = escolher && qual==="casos" ? (D.casosDoCliente.get(clienteAberto)||[]).filter(k=>k.fase!=="encerrado") : [];
  celAba = qual;
  abaAtiva = qual==="cad" ? 0 : qual==="hon" ? 4 : qual==="per" ? 3 : qual==="pz" ? 5 : qual==="pc" ? 6 : 2;   // F326 · Prazos é a aba do cliente
  repintarFicha();
  const r = document.querySelector(".det-rolagem"); if(r) r.scrollTop = 0;
  if(ks.length>1) escolherProcesso(clienteAberto, ks);
}
const celAbaNorm = () => abaAtiva===0 ? "cad" : abaAtiva===4 ? "hon" : abaAtiva===3 ? "per" : abaAtiva===5 ? "pz" : abaAtiva===6 ? "pc" : "casos";
function celCadIr(qual){ celCad = qual; const d = document.querySelector(".det-principal"); if(d) d.dataset.celCad = qual;
  document.querySelectorAll(".cel-cad-seg button").forEach(b=>b.setAttribute("aria-pressed", String(b.dataset.cc===qual))); }
function celAbasHtml(c, ks, k, nPer, temHon){
  if(soIdentificacao()) return "";   // os níveis 0 a 2 ficam na Identificação: as abas do caso não abririam (teste da colaboradora, 02.11.2026)
  celAba = celAbaNorm();
  const nNov = k ? (D.novid||[]).filter(a=>a.caso_id===k.id).length : 0;
  // F326 · a aba Prazos do celular é a do cliente (todos os casos), com o número dos vencidos em vermelho
  const z = (()=>{ try{ return prazosDoCliente(c.id); }catch(e){ return {total:0, venc:0}; } })();
  const it = [ks.length && ["casos", `Casos${nNov?` <span class="ca-n">${nNov}</span>`:""}`], ["cad", "Cadastro"],
    (z.total || abaAtiva===5) && ["pz", `Prazos${z.venc?` <span class="ca-n ca-venc" aria-label="${z.venc} vencido${z.venc>1?"s":""}">${z.venc}</span>`:""}`],
    nPer && ["per", "Perícias"], temHon && ["hon", "Honorários"]].filter(Boolean);
  return `<nav class="cel-abas" role="tablist" aria-label="Partes da ficha">${it.map(([q, r])=>
    `<button role="tab" aria-selected="${celAba===q}" class="${celAba===q?"on":""}" onclick="celIr('${q}',1)">${r}</button>`).join("")}</nav>`;
}
function alertaVencidoCel(k){
  let x; try{ x = linhasDeDatas(k.cliente_id).soltas.filter(y=>(!y.casoId || y.casoId===k.id) && y.data<hoje() && !y.aConfirmar && y.lembTipo!=="aposentadoria_futura")
    .sort((a,b)=>a.data<b.data?-1:1)[0]; }catch(e){ return ""; }
  if(!x) return "";
  const txt = x.resumo || x.rotulo || String(x.rot||"").replace(/<[^>]*>/g, "").trim();
  return `<button type="button" class="cel-alerta" onclick="celIr('pz')">Vencido ${fmtBarra(x.data).slice(0,5)}${txt ? ` · ${esc(cortaFrase(txt, 60))}` : ""}</button>`;
}
function celPrincipalHtml(c, creds, k){
  const cr = (creds||[]).find(x=>x.tipo==="meu_inss");
  const adv = D.colPorId.get(advogadoDoCliente(c.id)[0]);
  const ativos = (D.casosDoCliente.get(c.id)||[]).filter(x=>!x.pre_caso && x.fase!=="encerrado").length;
  return `<div class="cel-principal">
    <div class="cel-cad-seg seg-colab" role="group" aria-label="Dados do cadastro"><button data-cc="principal" aria-pressed="${celCad==="principal"}" onclick="celCadIr('principal')">Principal</button><button data-cc="mais" aria-pressed="${celCad==="mais"}" onclick="celCadIr('mais')">Mais dados</button></div>
    <div class="cel-dados">
      <div class="cel-dado"><span class="cel-rot">CPF</span><b class="cel-val">${c.cpf ? fmtCpf(c.cpf) : "não informado"}</b>${c.cpf ? `<button class="btn-mini" onclick="copiar('${escJs(c.cpf)}','CPF copiado')">Copiar</button>` : ""}</div>
      <div class="cel-dado"><span class="cel-rot">Meu INSS</span><b class="cel-val cel-txt">${cr ? "••••••" : "sem senha"}</b>${cr ? `<button class="btn-mini" onclick="copiarCred('${cr.id}')" title="Copiar senha">Copiar<span class="sr-only"> senha</span></button>` : ""}${c.cpf ? `<button class="btn-mini" onclick="entrarMeuInss('${c.id}')">Abrir ↗</button>` : ""}</div>
      <div class="cel-dado"><span class="cel-rot">Telefone</span><b class="cel-val">${c.telefone ? esc(fmtTelBR(c.telefone)) : "não informado"}</b>${c.telefone ? `<a class="btn-mini" href="tel:${esc(soDig(c.telefone))}">Ligar</a>` : ""}</div>
    </div>
    <p class="meio-sub cel-rodape">Advogado responsável: <button type="button" class="cli-adv-bt" onclick="escolherAdvogado('${c.id}')">${esc(adv ? adv.nome : "escolher")}</button> · ${ativos ? "Cliente ativo" : "Sem caso em andamento"}</p>
  </div>`;
}
let subAba = ler("crm_subaba") || "escritorio", instSel = 0;   // F166 · o caso abre nos andamentos do Escritório
let subCad = ler("crm_subcad") || "";   // divisão aberta do Cadastro
// qual PROCESSO do caso está sendo olhado (número, "" = o principal) e de que
// FONTE: a consulta oficial do CNJ ou a coleta do PJe. Duas listas de
// movimentos uma embaixo da outra não se lia — agora é escolha, não pilha.
let procSel = "", fonteCnj = "", nupSel = "", fontePat = "", fonteCrps = "";   // F185: fontePat "docs" = Documentos do INSS   // F71: "" = sem escolha (PJe é o padrão)

// som de retorno, como no To Do (gerado na hora — sem arquivo de áudio).
// "plim" duplo ao concluir; tique curto nos avisos. 🔔 na lateral silencia.
function somLigado(){ return ler("crm_som")!=="off"; }
function plim(tipo){
  if(!somLigado()) return;
  try{
    const ctx = plim.ctx || (plim.ctx = new (window.AudioContext||window.webkitAudioContext)());
    if(ctx.state==="suspended") ctx.resume();
    const t0=ctx.currentTime;
    const notas = tipo==="suave" ? [[740,0,.09,.10]] : [[587,0,.12,.16],[880,.10,.20,.18]];
    notas.forEach(([f,dt,dur,vol])=>{
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.type="sine"; o.frequency.value=f;
      g.gain.setValueAtTime(0.0001,t0+dt);
      g.gain.exponentialRampToValueAtTime(vol,t0+dt+.015);
      g.gain.exponentialRampToValueAtTime(0.0001,t0+dt+dur);
      o.connect(g).connect(ctx.destination); o.start(t0+dt); o.stop(t0+dt+dur+.05);
    });
  }catch(e){}
}
// ── o rascunho do andamento (por caso, só nesta sessão do navegador) ──────
// Guardar no sessionStorage e não no D: o que se quer é sobreviver às
// repinturas da ficha, não virar dado do escritório. Fechar a aba descarta.
function guardarRascunho(casoId, txt){
  if(!casoId) return;
  try{ (txt||"").trim() ? sessionStorage.setItem("rasc:"+casoId, txt)
                        : sessionStorage.removeItem("rasc:"+casoId); }catch(e){}
}
function lerRascunho(casoId){
  try{ return casoId ? (sessionStorage.getItem("rasc:"+casoId)||"") : ""; }catch(e){ return ""; }
}
function limparRascunho(casoId){
  try{ sessionStorage.removeItem("rasc:"+casoId); }catch(e){}
}
let coletaSilenciosa = false;   // F482 · ver autoAplicarColetas
function aviso(msg, som=true, naColeta=false){
  if(coletaSilenciosa && !naColeta) return;   // F482 · a importação em segundo plano mostra só o "Importando N de M"
  const el = document.getElementById("aviso");
  clearTimeout(_desfazerTimer); _desfazer = null;
  el.textContent = msg; el.classList.remove("com-bt"); el.classList.add("on");
  el.style.pointerEvents = "none";
  setTimeout(()=>el.classList.remove("on"), 2600);
  if(som) plim("suave");
}
// F14 · DESFAZER
// Concluir em um clique só é seguro com volta. O To Do desfaz clicando de novo
// no círculo; aqui a faixa fica oito segundos com o botão, e some sozinha.
// Oito e não três: o tempo de perceber o engano é o tempo de ler o que mudou.
let _desfazer = null, _desfazerTimer = null;
function avisoDesfazer(msg, voltar, ms = 8000){
  const el = document.getElementById("aviso");
  if(!el || typeof voltar !== "function") return aviso(msg, false);
  clearTimeout(_desfazerTimer);
  _desfazer = voltar;
  el.innerHTML = `${esc(msg)}<button class="aviso-bt" onclick="desfazerAgora()">desfazer</button>`;
  el.classList.add("on","com-bt"); el.style.pointerEvents = "auto";
  _desfazerTimer = setTimeout(esconderDesfazer, ms);
  plim("suave");
}
function esconderDesfazer(){
  const el = document.getElementById("aviso");
  if(el){ el.classList.remove("on","com-bt"); el.style.pointerEvents = "none"; }
  clearTimeout(_desfazerTimer); _desfazer = null;
}
async function desfazerAgora(){
  const f = _desfazer;
  esconderDesfazer();
  if(f) await f();
}

// ── API (PostgREST + GoTrue por fetch, com paginação e refresh) ───────────
async function api(caminho, opcoes={}, tentativa=0){
  // F660 · a versão de leitura não grava nada (o banco também recusa, pelas políticas so_leitura_*)
  if(opcoes.method && opcoes.method!=="GET" && typeof semAnotar==="function" && semAnotar() && /^\/rest\/v1\/(andamentos|andamento_tarefas|tarefas|lembretes|meu_dia)[?/]/.test(caminho)){
    aviso("Versão de leitura: anotar e alterar prazos não estão disponíveis."); throw new Error("versão de leitura"); }
  if(opcoes.method && opcoes.method!=="GET" && tentativa===0) escritas++;
  const r = await fetch(CONFIG.SUPABASE_URL.replace(/\/$/,"") + caminho, {
    ...opcoes,
    headers: {
      apikey: CONFIG.ANON_KEY,
      Authorization: "Bearer " + (sessao ? sessao.access_token : CONFIG.ANON_KEY),
      "Content-Type": "application/json",
      ...(opcoes.headers||{}),
    },
  });
  if(r.status === 401 && sessao && tentativa === 0){
    const ok = await renovar();
    if(ok) return api(caminho, opcoes, 1);
    // já dentro do sistema: sessão vencida, recomeça. Ainda no login:
    // recarregar apagaria a mensagem e a tela voltaria ao início sem dizer nada
    if(eu) return sair();
    throw new Error("a sessão não foi aceita pelo banco");
  }
  if(!r.ok){
    const corpo = await r.text();
    const e = new Error(`${r.status}: ${corpo.slice(0,200)}`);
    e.status = r.status;
    throw e;
  }
  const texto = await r.text();
  return texto ? JSON.parse(texto) : null;
}

// ── Arquivos (Storage) ────────────────────────────────────────────────────
// A foto do documento vai para o bucket "anexos", que é privado. Não existe
// link fixo: para abrir, o app pede uma URL assinada que vence em minutos —
// laudo médico e CNIS não podem ficar num endereço que funciona para sempre.
const BUCKET = "anexos";
async function subirArquivo(caminho, arquivo, bucket=BUCKET, upsert=false){
  const r = await fetch(`${CONFIG.SUPABASE_URL.replace(/\/$/,"")}/storage/v1/object/${bucket}/${caminho}`,{
    method:"POST",
    headers:{ apikey: CONFIG.ANON_KEY,
              Authorization: "Bearer " + (sessao ? sessao.access_token : CONFIG.ANON_KEY),
              "Content-Type": arquivo.type || "application/octet-stream", ...(upsert ? {"x-upsert":"true"} : {}) },
    body: arquivo });
  if(!r.ok) throw new Error(`${r.status}: ${(await r.text()).slice(0,200)}`);
  return true;
}
async function linkArquivo(caminho, segundos=120, bucket=BUCKET){
  const d = await api(`/storage/v1/object/sign/${bucket}/${caminho}`,
    {method:"POST", body:JSON.stringify({expiresIn:segundos})});
  return CONFIG.SUPABASE_URL.replace(/\/$/,"") + "/storage/v1" + d.signedURL;
}
async function abrirAnexo(id, lista){
  const a=(lista||D.anexos||[]).find(x=>x.id===id); if(!a) return;
  if(a.origem==="transcricao" && a.texto) return verTranscricao(id);   // F543
  const guia=window.open("", "_blank");            // abrir agora: o navegador
  try{                                             // bloqueia janela tardia
    let url=await linkArquivo(a.caminho);
    // F184 · o despacho/sentença do PJe é HTML, e o Storage do Supabase o
    // entrega como text/plain (de propósito: HTML servido de lá rodaria
    // script). Abre num visualizador próprio, com o documento num iframe
    // SANDBOX — o script que o PJe embute não roda, e nada dele alcança o CRM
    if(/^text\//.test(a.tipo||"")){
      const html = await (await fetch(url)).text();
      if(/^\s*</.test(html)){
        const pag = `<!doctype html><meta charset="utf-8"><title>${esc(a.nome||"documento")}</title>`
          + `<style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%}</style>`
          + `<iframe sandbox srcdoc="${html.replace(/&/g,"&amp;").replace(/"/g,"&quot;")}"></iframe>`;
        url = URL.createObjectURL(new Blob([pag], {type:"text/html"}));
      }
    }
    if(guia) guia.location=url; else window.location=url;
  }catch(e){ if(guia) guia.close(); aviso("Não consegui abrir o arquivo"); }
}

async function todas(tabela, filtro=""){  // paginação (Supabase limita a 1000)
  // F135 · a primeira página sai sozinha (quase toda tabela cabe nela); as
  // demais saem em lotes de 4 em paralelo. As 9 páginas de tarefas eram 9
  // idas ao banco em fila e viraram 3. Página além do fim volta 416 = vazia.
  const pagina = de => api(`/rest/v1/${tabela}?${filtro}`, {
      headers: {Range: `${de}-${de+999}`, "Range-Unit": "items"},
    }).catch(e => { if(e.status===416) return []; throw e; });
  const out = await pagina(0);
  if(out.length < 1000) return out;
  for(let de=1000;;de+=4000){
    const pgs = await Promise.all([0,1,2,3].map(i=>pagina(de+i*1000)));
    for(const pg of pgs) out.push(...pg);
    if(pgs.some(pg=>pg.length < 1000)) return out;
  }
}

async function renovar(){
  try{
    const r = await fetch(CONFIG.SUPABASE_URL.replace(/\/$/,"") + "/auth/v1/token?grant_type=refresh_token", {
      method:"POST", headers:{apikey:CONFIG.ANON_KEY,"Content-Type":"application/json"},
      body: JSON.stringify({refresh_token: sessao.refresh_token}),
    });
    if(!r.ok) return false;
    sessao = await r.json();
    guardar("crm_sessao", JSON.stringify(sessao));
    return true;
  }catch{ return false; }
}

// ── login ─────────────────────────────────────────────────────────────────
// A tela de login precisa DIZER o que houve. Voltar em silêncio para o
// mesmo formulário — que foi o que aconteceu no celular — não dá pistas de
// que o problema é a senha, a internet ou a configuração do aparelho.
function erroLogin(html){
  const el=document.getElementById("login-erro");
  el.innerHTML = html;
  el.scrollIntoView({block:"center", behavior:"smooth"});
}
async function entrar(ev){
  ev.preventDefault();
  document.getElementById("login-erro").textContent = "";
  if(faltaConfig())
    return erroLogin(`Este aparelho ainda não sabe o endereço do banco.
      <button type="button" class="btn-mini" onclick="pedirConfig()" title="Configurar agora">Configurar<span class="sr-only"> agora</span></button>`);
  const email=(document.getElementById("login-email").value||"").trim();
  const senha=document.getElementById("login-senha").value||"";
  if(!email || !senha) return erroLogin("Preencha o e-mail e a senha.");
  const bt=document.getElementById("btn-entrar");
  bt.disabled=true; bt.textContent="Entrando…";
  try{
    let r;
    try{
      r = await fetch(CONFIG.SUPABASE_URL.replace(/\/$/,"") + "/auth/v1/token?grant_type=password", {
        method:"POST", headers:{apikey:CONFIG.ANON_KEY,"Content-Type":"application/json"},
        body: JSON.stringify({email, password: senha}),
      });
    }catch(rede){
      // fetch só estoura assim quando nem chegou ao servidor
      return erroLogin(`Não consegui falar com o servidor. Confira a internet do aparelho.
        Se o endereço estiver errado,
        <button type="button" class="btn-mini" onclick="pedirConfig()">reconfigurar</button>.`);
    }
    const corpo = await r.json().catch(()=>({}));
    if(r.status===400 || r.status===401)
      return erroLogin("E-mail ou senha não conferem. Atenção ao teclado do celular: ele "+
        "costuma pôr maiúscula na primeira letra e trocar aspas.");
    if(r.status===403 || r.status===404)
      return erroLogin(`O endereço do banco parece errado para este aparelho.
        <button type="button" class="btn-mini" onclick="pedirConfig()">Reconfigurar</button>`);
    if(!r.ok) return erroLogin(esc(corpo.error_description || corpo.msg || `falha no login (${r.status})`));
    sessao = corpo;
    if(!guardar("crm_sessao", JSON.stringify(sessao)) && !guardaFunciona())
      aviso("Este navegador não guarda dados (aba anônima?) — você entra, mas terá que "+
            "repetir o login na próxima vez", false);
    await iniciar();
  }catch(e){
    erroLogin(esc(e.message||"não consegui entrar"));
  }finally{ bt.disabled=false; bt.textContent="Entrar"; }
}
// abrir a caixa de configuração a qualquer momento, não só no primeiro acesso
function pedirConfig(){
  esquecer("crm_cfg");
  location.reload();
}

async function sair(){
  esquecer("crm_sessao");
  await cacheApagar();   // F150 · a sessão guardada sai junto com quem saiu
  location.reload();
}

async function iniciar(){
  const meus = await api(`/rest/v1/colaboradores?auth_id=eq.${sessao.user.id}&select=*`);
  if(!meus.length){
    erroLogin("Este e-mail entrou, mas não está ligado a nenhum colaborador do escritório. "+
      "Peça para vincular o usuário (passo 'vincular usuários' do COMO-INSTALAR.md).");
    sessao = null; esquecer("crm_sessao");
    return;
  }
  eu = meus[0];
  document.getElementById("tela-login").style.display = "none";
  const app = document.getElementById("app");
  app.classList.add("logado");
  marcarCelular();
  aplicarMenu();
  pintarAgendaZap();   // F305 · o botão da agenda flutua em todas as telas
  document.getElementById("u-nome").textContent = eu.nome;
  // no lugar do texto de versão que ficava aqui: quem você é para o sistema
  document.getElementById("u-papel").textContent =
    (eu.papel === "admin" ? "administrador" : eu.setor || "equipe");
  const uav = document.getElementById("u-avatar");
  uav.textContent = eu.inicial; uav.style.background = eu.cor;
  // F150 · 1º a sessão guardada, na hora; 2º o banco, por cima dela
  const snap = await cacheLer();
  // F236 · o Meu Dia abre no dia de quem entrou; as listas abrem na pessoa quando ela tem casos atribuídos (decisão do Paulo, 17.10.2026)
  const primeiroFiltro = () => { filtroDia = eu.id; filtroColab = [...D.atrDoCaso.values()].some(v=>v.includes(eu.id)) ? eu.id : null; };
  if(snap && snap.usuario===eu.id && Date.now()-snap.em < CACHE_VALIDADE && snap.r && snap.r.clientes){
    try{
      montarD(snap.r); dadosDoCache = true; primeiroFiltro();
      // E1 · com os carimbos da cópia, a carga que vem a seguir é só do que mudou
      D._marcas = snap.marcas || null; D._cheiaEm = snap.cheiaEm || 0;
      document.getElementById("app").classList.add("dados-guardados");
      montarSidebar(); render();
    }catch(e){ dadosDoCache = false; }
  }
  if(!dadosDoCache){
    // F149 · enquanto o banco responde, a tela já mostra o desenho dela
    if(temaV10()){
    document.getElementById("conteudo-meio").innerHTML = esqueletoLista(9);
    document.getElementById("grupo-dinamicas").innerHTML = esqueletoLateral(4);
    document.getElementById("grupo-fases").innerHTML = esqueletoLateral(6);
    document.querySelector(".meio").classList.add("ag-v10");   // sem o Ordenar e o fundo na espera
    const av = document.getElementById("conta-av"); av.textContent = eu.inicial; av.style.background = eu.cor;
    document.getElementById("conta-nome").textContent = (eu.nome||"").split(" ")[0];
    document.getElementById("busca").placeholder = "Nome, CPF, processo";
  }
  }
  const escritas0 = escritas, veioDoCache = dadosDoCache;
  await carregar(veioDoCache ? {} : { cedo: () => { primeiroFiltro(); montarSidebar(); render(); } });
  // gravou alguma coisa enquanto via a sessão guardada? a leitura pode ter
  // saído antes da gravação: lê de novo, para a tela mostrar o que está no banco
  if(veioDoCache && escritas!==escritas0) await carregar();
  // F151 · a ocupação da próxima quarta, para o contador da barra
  if(agendaUrl() && agendaToken()) carregarAgenda("paulo").then(()=>montarSidebar()).catch(()=>{});
  // F236 · quem aplica as coletas vê na barra quantas esperam, sem abrir o Importar
  if(souAdmin()) buscarColetas().then(()=>montarSidebar()).catch(()=>{});
  // F426 · o robô do servidor (crm-coletas.yml) abre o CRM com ?coletas=robo, aplica uma vez e diz como terminou
  if(souAdmin() && new URLSearchParams(location.search).get("coletas")==="robo"){
    window._coletasRobo = "rodando";
    autoAplicarColetas().then(r=>window._coletasRobo=r||"ok", e=>window._coletasRobo="erro: "+(e&&e.message||e));
  }
  else if(souAdmin() && !window._autoColetas && !navigator.webdriver){
    window._autoColetas = setInterval(()=>autoAplicarColetas().catch(()=>{}), AUTO_COLETAS_MS);
    setTimeout(()=>autoAplicarColetas().catch(()=>{}), 1500);
    // F420 · a aba que volta à frente (depois de rodar a extensão) aplica na hora, sem esperar o intervalo
    document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) autoAplicarColetas().catch(()=>{}); });
  }
  // F530 · os "⏳ Prazo:" do assistente deixaram de ser lançados (decisão do Paulo de 11.11.2026)
  document.getElementById("app").classList.remove("dados-guardados");
  if(!veioDoCache) primeiroFiltro();
  montarSidebar();
  // não repinta por cima de quem está digitando num formulário da lista
  const digitandoNoMeio = document.querySelector("#conteudo-meio :is(input,textarea,select):focus");
  if(!digitandoNoMeio && !["novocliente","config"].includes(visao)) render();
  if(!vigiaLigada){ vigiaLigada = true; setInterval(vigiarMudancas, VIGIA_MS);
    // como o To Do ao voltar para a frente: a aba que reaparece busca o que mudou na hora, sem esperar a volta do relógio
    document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) vigiarMudancas(); });
    vigiarLembretes(); setInterval(vigiarLembretes, 30000);
    setTimeout(()=>verGravacaoGuardada().catch(()=>{}), 1500); }   // F537: a gravação interrompida volta com Continuar
  // F187 · "online agora" no painel do gestor: um ponto por minuto
  if(!zapSomLigado){ zapSomLigado = true; vigiarZapSom(); setInterval(vigiarZapSom, 20000); }
  // F335 · o toque na notificação com o CRM fechado abre ?zap=<conversa>
  const zq = new URLSearchParams(location.search).get("zap");
  const qs = new URLSearchParams(location.search);
  if(zq){ history.replaceState(null, "", location.pathname); abrirConversaDaMencao(zq, qs.get("acao"), qs.get("m")); }
  else if(qs.get("mencoes")){ history.replaceState(null, "", location.pathname); irPara("mencoes"); }
  if(!presencaLigada){ presencaLigada = true;
    const ponto = () => api(`/rest/v1/rpc/zap_presenca`,{method:"POST", body:"{}"}).catch(()=>{});
    ponto(); setInterval(ponto, 60000); }
}
let presencaLigada = false, zapSomLigado = false;
// F191 · aviso de mensagem nova (som e, com a aba escondida, aviso do navegador):
// mensagem nova numa conversa minha ou sem dono, e transferência/@ para mim.
// Olha a cada 20 s em qualquer tela do CRM; a primeira volta só aprende.
let zapSomVisto = null, zapAudioCtx = null;
const somZapLigado = () => ler("crm_zap_som") !== "0";
// F360 · o aviso do navegador tem chave própria (ligado por padrão), separada do som, e sai também com a aba
// à vista quando a pessoa não está na própria conversa
const navZapLigado = () => ler("crm_zap_nav") !== "0";
function tocarAvisoZap(texto, convId, soSom, icone){
  if(somZapLigado()) try{
    zapAudioCtx = zapAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if(zapAudioCtx.state === "suspended") zapAudioCtx.resume();
    [[880, 0], [660, 0.16]].forEach(([f, t])=>{
      const o = zapAudioCtx.createOscillator(), g = zapAudioCtx.createGain(), t0 = zapAudioCtx.currentTime + t;
      o.frequency.value = f; o.connect(g); g.connect(zapAudioCtx.destination);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0+0.14); o.start(t0); o.stop(t0+0.15);
    });
  }catch(e){}
  // com o aviso no aparelho ligado (F335), quem avisa é o zap_push: aqui não repete
  const vendo = !document.hidden && visao==="whatsapp" && convId && zapAberta===convId;
  if(!soSom && navZapLigado() && !vendo && ler("crm_push")!=="1" && window.Notification && Notification.permission==="granted")
    try{ const n = new Notification("WhatsApp · CRM", {body: texto, tag: "crm-zap", ...(icone?{icon: icone}:{})});   // F389 · a foto de quem escreve
         n.onclick = ()=>{ window.focus(); if(convId) abrirConversaDaMencao(convId); else { visao="whatsapp"; render(); } n.close(); }; }catch(e){}
}
// F398 · o corpo do aviso do navegador, igual ao zap_push (F395): o texto, ou "🎤 " + a transcrição; o tipo sem
// texto vira o rótulo; null = áudio de menos de 3 minutos ainda sem transcrição (esperar)
const AVISO_TIPO = {audio:"🎤 Áudio", imagem:"📷 Foto", video:"🎥 Vídeo", documento:"📄 Documento", figurinha:"Figurinha", localizacao:"📍 Localização", contato:"👤 Contato"};
function corpoAvisoZap(m, agora){
  if(!m) return "";
  const falhou = m.tipo==="audio" && /^\[áudio não transcrito\]$/.test((m.texto||"").trim());
  const txt = (falhou ? "" : m.texto||"").replace(/\s+/g," ").trim();
  if(!txt && m.tipo==="audio" && !falhou && m.momento && (agora||Date.now()) - new Date(m.momento) < 180000) return null;
  if(!txt) return AVISO_TIPO[m.tipo] || "";
  const t = txt.length > 120 ? txt.slice(0,117) + "…" : txt;
  return m.tipo==="audio" ? "🎤 " + t : t;
}
async function vigiarZapSom(){
  if(!eu) return;
  const [cs, ms] = await Promise.all([
    todas("zap_conversas","select=id,nao_lidas,atendente_id,status,nome_perfil,cliente_id,lead_id,telefone,foto_url,contato_nome&nao_lidas=gt.0").catch(()=>null),
    todas("mencoes",`select=id,texto,conversa_id&para_id=eq.${eu.id}&lida_em=is.null&conversa_id=not.is.null`).catch(()=>null)]);
  if(!cs || !ms) return;
  await lerSilencioZap();
  const minhas = cs.filter(c=>c.status!=="resolvida" && (c.atendente_id===eu.id || !c.atendente_id) && !silenciadaZap(c.id));
  const agora = {conv: new Map(minhas.map(c=>[c.id, c.nao_lidas])), menc: new Set(ms.map(m=>m.id))};
  if(zapSomVisto){
    const nova = minhas.find(c=>c.nao_lidas > (zapSomVisto.conv.get(c.id)||0));
    const menc = ms.find(m=>!zapSomVisto.menc.has(m.id));
    const fotoDe = async id=>{ const c = cs.find(x=>x.id===id); if(!c || !c.foto_url) return null;
      await assinarFotosZap([c]); return zapFotos.get(c.foto_url) || null; };   // F389
    if(menc) tocarAvisoZap(menc.texto.replace(/^💬\s*/,""), menc.conversa_id, false, await fotoDe(menc.conversa_id));
    else if(nova){
      // F398 · como no celular (F395): o texto da última mensagem, e o áudio com a transcrição
      const [m] = await todas("zap_mensagens",`select=tipo,texto,momento&conversa_id=eq.${nova.id}&direcao=eq.entrada&order=momento.desc&limit=1`).catch(()=>[]);
      const corpo = corpoAvisoZap(m);
      // o áudio ainda sem transcrição espera até 3 minutos: a conversa volta à contagem antiga e avisa na próxima olhada
      if(corpo === null) agora.conv.set(nova.id, zapSomVisto.conv.get(nova.id)||0);
      else tocarAvisoZap(corpo ? `${nomeDaConversa(nova)}: ${corpo}` : `Mensagem nova de ${nomeDaConversa(nova)}`, nova.id, false, await fotoDe(nova.id));
    }
  }
  zapSomVisto = agora;
}
// F335 · A NOTIFICAÇÃO DO WHATSAPP NO CELULAR (Web Push): o aparelho se inscreve no navegador e grava a
// inscrição em push_inscricoes; a mensagem nova do cliente chega pela Edge Function zap_push, mesmo com o
// CRM fechado. No iPhone, só com o CRM adicionado à tela de início (iOS 16.4 ou posterior).
const pushZapLigado = () => ler("crm_push")==="1";
const b64Bytes = b => Uint8Array.from(atob(b.replace(/-/g,"+").replace(/_/g,"/") + "===".slice((b.length+3)%4)), c=>c.charCodeAt(0));
async function chamarZapPush(corpo){
  const r = await fetch(CONFIG.SUPABASE_URL.replace(/\/$/,"") + "/functions/v1/zap_push", {method:"POST",
    headers:{"Content-Type":"application/json", apikey: CONFIG.ANON_KEY, Authorization: "Bearer " + (sessao ? sessao.access_token : CONFIG.ANON_KEY)},
    body: JSON.stringify(corpo)});
  return r.json().catch(()=>({}));
}
async function alternarPushZap(){
  zapMaisAberto = false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if(!("serviceWorker" in navigator) || !("PushManager" in window) || !window.Notification)
    return aviso(ios ? "No iPhone, adicione o CRM à tela de início (Compartilhar → Adicionar à Tela de Início), abra por lá e ligue de novo."
                     : "Este navegador não recebe aviso fora da página.", true);
  try{
    const reg = await navigator.serviceWorker.register("sw.js").then(()=>navigator.serviceWorker.ready);
    const atual = await reg.pushManager.getSubscription();
    if(pushZapLigado()){
      if(atual){
        await api(`/rest/v1/push_inscricoes?endpoint=eq.${encodeURIComponent(atual.endpoint)}`,{method:"DELETE"}).catch(()=>{});
        await atual.unsubscribe().catch(()=>{});
      }
      guardar("crm_push","0"); aviso("Aviso neste aparelho desligado", false); return pintarListaZap();
    }
    if(Notification.permission!=="granted" && await Notification.requestPermission()!=="granted")
      return aviso("O aviso foi bloqueado no navegador. Libere as notificações do CRM nas configurações do aparelho.", true);
    const publica = cfgApp("zap_push_publica") || (await chamarZapPush({preparar:true})).publica;
    if(!publica) return aviso("Não consegui preparar o aviso. Tente de novo em instantes.", true);
    const insc = atual || await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey: b64Bytes(publica)});
    const j = insc.toJSON();
    await api(`/rest/v1/push_inscricoes?on_conflict=endpoint`,{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},
      body: JSON.stringify({colaborador_id: eu.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth,
        aparelho: (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || null})});
    guardar("crm_push","1");
    const t = await chamarZapPush({teste:true});
    aviso(t.enviados ? "Aviso ligado neste aparelho 🔔 Mandei um teste." : "Aviso ligado neste aparelho 🔔", false);
  }catch(e){ aviso("Não consegui ligar o aviso neste aparelho: " + (e.message||e), true); }
  pintarListaZap();
}
async function alternarSomZap(){
  const ligar = !somZapLigado();
  guardar("crm_zap_som", ligar ? "1" : "0");
  if(ligar){
    tocarAvisoZap("teste", null, true);
  }
  aviso(ligar ? "Aviso sonoro ligado 🔔" : "Aviso sonoro desligado", false);
  pintarListaZap();
}
async function alternarNavZap(){
  const ligar = !navZapLigado();
  if(ligar && window.Notification && Notification.permission!=="granted"
     && await Notification.requestPermission().catch(()=>"denied")!=="granted"){
    guardar("crm_zap_nav","0");
    aviso("O navegador bloqueou as notificações do CRM. Libere no cadeado ao lado do endereço e ligue de novo.", true);
    return pintarListaZap();
  }
  guardar("crm_zap_nav", ligar ? "1" : "0");
  if(ligar) try{ new Notification("WhatsApp · CRM", {body: "Notificação no navegador ligada", tag: "crm-zap"}); }catch(e){}
  aviso(ligar ? "Notificação no navegador ligada" : "Notificação no navegador desligada", false);
  pintarListaZap();
}

// Ajuste do ESCRITÓRIO, não do navegador de cada um: o endereço do painel do
// SMBot vale para todo mundo, e quem trocar de máquina não reconfigura nada.
// (CONFIG/faltaConfig lá em cima é outra coisa: é como este navegador acha o
// banco, e essa não dá para guardar no banco.)
// um PATCH de caso = uma linha. Eram 52 cópias do mesmo fetch — 52 chances
// de um header divergente. O erro continua subindo para quem chamou.
// EDIÇÃO AO MESMO TEMPO (o change_key do To Do): o PATCH só vale se o caso
// ainda está como esta tela o viu (mudou_em). Se outra pessoa mexeu antes, a
// gravação segue campo a campo, como no To Do, mas a tela recarrega o caso e
// avisa, para ninguém continuar trabalhando em cima do que já mudou.
async function patchCaso(id, campos){
  const k = D && D.casoPorId && D.casoPorId.get(id), visto = k && k.mudou_em;
  const patch = (filtro, sel) => api(`/rest/v1/casos?id=eq.${id}${filtro}&select=${sel}`,{method:"PATCH",
    headers:{Prefer:"return=representation"}, body:JSON.stringify(campos)});
  if(!visto) return void await patch("", "id");
  const [ok] = (await patch(`&mudou_em=eq.${encodeURIComponent(visto)}`, "mudou_em")) || [];
  if(ok){ k.mudou_em = ok.mudou_em; return; }
  const [atual] = (await patch("", "*")) || [];
  if(!atual) return;
  Object.assign(k, atual);
  aviso("⚠ Outra pessoa alterou este caso há pouco. Gravei a sua mudança e recarreguei o caso: confira antes de seguir.");
  if(clienteAberto) abrirFicha(clienteAberto);
}
// TODA tarefa criada em tela entra na memória NA HORA — gravar no banco e só
// aparecer no Meu Dia depois do F5 fazia a tarefa recém-criada "sumir" das
// listas (criação pelo andamento, pela nota, pelo encaminhar e pelo repetir)
function tarefaNaMemoria(t){
  if(!t || !t.caso_id || !D.tarefasPorCaso) return;
  if(!D.tarefasPorCaso.has(t.caso_id)) D.tarefasPorCaso.set(t.caso_id,[]);
  D.tarefasPorCaso.get(t.caso_id).push(t);
}
// F160 · O PAPEL NA TAREFA (lição do Tramitação Inteligente, 03.10.2026).
// Quem EXECUTA e quem REVISA são duas tarefas no mesmo andamento, uma por
// pessoa, e a coluna `papel` diz qual é qual. Num banco sem o
// schema_papel_tarefa.sql o PostgREST recusa a coluna (PGRST204): a tarefa
// grava sem o papel, como executor, e o aviso diz o que falta rodar.
async function criarTarefa(corpo){
  const post = c => api(`/rest/v1/andamento_tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify(c)});
  try{ const [tf]=await post(corpo); return tf; }
  catch(e){
    // F449 · banco sem a coluna repetir: a tarefa grava sem a regra, e o aviso diz o que falta
    if(corpo.repetir && /PGRST204|42703|does not exist|schema cache/i.test(String((e&&e.message)||e))){
      const {repetir, ...sem} = corpo;
      aviso("A tarefa gravou sem repetir: falta a migração f449 no Supabase", false);
      return criarTarefa(sem);
    }
    if(!corpo.papel || !/PGRST204|42703|does not exist|schema cache/i.test(String((e&&e.message)||e))) throw e;
    const {papel, ...sem} = corpo;
    const [tf]=await post(sem);
    if(papel==="revisa") aviso("A tarefa gravou sem o papel de revisor — rode schema_papel_tarefa.sql no Supabase", false);
    return tf;
  }
}
// as tarefas que nascem de um 📌 ou de uma anotação: os executores na data
// escolhida e, se houver, o revisor na mesma data. O banco tem UMA tarefa por
// pessoa e andamento, então quem executa não entra de novo como revisor.
async function criarTarefasDe(andId, casoId, executores, revisor, dia, natureza, repetir){
  const feitas=[];
  for(const pid of executores){
    const tf = await criarTarefa({andamento_id:andId, caso_id:casoId, colaborador_id:pid,
      atribuido_por:eu.id, lembrar_em:dia, ...(natureza?{natureza}:{}),
      ...(repetir && natureza!=="fatal" ? {repetir} : {})});
    tarefaNaMemoria(tf); feitas.push(tf);
  }
  if(revisor && !executores.includes(revisor)){
    const tf = await criarTarefa({andamento_id:andId, caso_id:casoId, colaborador_id:revisor,
      atribuido_por:eu.id, lembrar_em:dia, papel:"revisa", ...(natureza?{natureza}:{})});
    tarefaNaMemoria(tf); feitas.push(tf);
  }
  return feitas;
}
// o seletor "quem revisa?": um só, opcional, com a inicial da equipe
function seletorRevisor(id, atual){
  return `<select id="${id}" class="tf-rev" title="quem confere o que o executor fez — opcional">
    <option value="">sem revisor</option>
    ${equipeAtiva().map(co=>`<option value="${co.id}" ${atual===co.id?"selected":""}>${esc(co.nome.split(" ")[0])} revisa</option>`).join("")}
  </select>`;
}
function cfgApp(chave){ return (D.config||new Map()).get(chave); }
async function guardarCfgApp(chave, valor){
  await api(`/rest/v1/config_app`,{method:"POST",
    headers:{Prefer:"resolution=merge-duplicates,return=minimal"},
    body:JSON.stringify({chave, valor})});
  (D.config=D.config||new Map()).set(chave, valor);
}

// F47 · o botão "🔄 agora" do rodapé da barra: dispara no GitHub a MESMA
// sincronização que roda de hora em hora (workflow crm-sync.yml, que lê o
// To Do e espelha no banco) e depois espia o carimbo todo_sync_em até a
// rodada terminar. Precisa de um token fino do GitHub (permissão Actions:
// Read and write SÓ neste repositório), pedido uma vez e guardado em
// config_app (chave gh_token) — vale para toda a equipe.
const GH_REPO = "paulotercini/marketplaceterciniinss";
let syncRodando = false, SYNC_POLL_MS = 30000;
async function sincronizarToDoAgora(){
  if(syncRodando) return;
  let tok = (cfgApp("gh_token")||"").trim();
  if(!tok){
    tok = (prompt("Cole o token do GitHub para disparar a sincronização.\n\n"
      +"Criar em github.com → Settings → Developer settings → Fine-grained tokens:\n"
      +"só o repositório marketplaceterciniinss, permissão Actions: Read and write.")||"").trim();
    if(!tok) return;
    await guardarCfgApp("gh_token", tok);
  }
  let r;
  try{
    r = await fetch(`https://api.github.com/repos/${GH_REPO}/actions/workflows/crm-sync.yml/dispatches`,{
      method:"POST",
      headers:{Authorization:"Bearer "+tok, Accept:"application/vnd.github+json",
        "Content-Type":"application/json"},
      body:JSON.stringify({ref:"main"})});
  }catch(e){ aviso("Sem resposta do GitHub — confira a internet."); return; }
  if(r.status===401 || r.status===403){
    // token vencido ou sem permissão: esquece o guardado e pede outro no próximo clique
    await guardarCfgApp("gh_token","");
    aviso("O GitHub recusou o token — clique de novo e cole um token válido.");
    return;
  }
  if(r.status!==204){ aviso(`O GitHub respondeu ${r.status} — sincronização não disparada.`); return; }
  // o carimbo é pintado pelo montarSidebar, não pelo render
  syncRodando = true; montarSidebar();
  aviso("Sincronização disparada — o To Do chega em uns 2 minutos.");
  espiarSync(cfgApp("todo_sync_em")||"", Date.now());
}
// E3 · atraso do carimbo: das 07h25 às 21h15 a rodada de 10 em 10 min deixa
// no máximo uns 12 min entre carimbos; fora desse horário, a última do dia
// (20h50) vale até a primeira do seguinte
function syncAtrasada(min){
  const hm = horaSP(new Date().toISOString());
  return (hm >= "07:25" && hm <= "21:15") ? min > 25 : min > 14*60;
}
// o disparo automático guarda em config_app o que o GitHub respondeu ao
// anterior (crm/fase2/schema_disparo.sql); só o administrador vê o aviso
function problemaDisparo(){
  if(!souAdmin()) return "";
  let d = null; try{ d = JSON.parse(cfgApp("sync_disparo")||"null"); }catch(e){}
  if(!d) return "";
  if(d.sem_token) return "O disparo automático da sincronização está sem o token do GitHub. Guarde-o pelo Sincronizar, no menu da conta.";
  if([401,403].includes(d.status_anterior)) return "O GitHub recusou o token do disparo automático (vencido ou sem permissão). Gere outro e guarde-o pelo Sincronizar, no menu da conta.";
  return "";
}
// F72 · a SAÚDE da sincronização, sem sair do CRM: as últimas rodadas da
// Action no GitHub (verde/vermelha), e para a falha, QUAL passo caiu — a
// falha recorrente relatada pelo Paulo agora tem cara e nome. Usa o mesmo
// gh_token do 🔄 (Actions: Read and write no repositório).
async function saudeSync(){
  const tok=(cfgApp("gh_token")||"").trim();
  if(!tok) return aviso("Guarde o token do GitHub primeiro — clique no 🔄 e cole o token.");
  caixa(`<h3 style="margin:0 0 6px">🩺 Rodadas da sincronização To Do</h3>
    <div id="ss-corpo" class="meio-sub">consultando o GitHub…</div>
    <div class="form-linha" style="margin-top:10px"><button class="btn-rap" onclick="fecharCaixa()">fechar</button></div>`);
  const el=()=>document.getElementById("ss-corpo");
  try{
    const r=await fetch(`https://api.github.com/repos/${GH_REPO}/actions/workflows/crm-sync.yml/runs?per_page=10`,
      {headers:{Authorization:"Bearer "+tok, Accept:"application/vnd.github+json"}});
    if(!r.ok) throw new Error("GitHub respondeu "+r.status+(r.status===401||r.status===403?" — token vencido? Clique no 🔄 para trocar":""));
    const runs=(await r.json()).workflow_runs||[];
    if(!el()) return;
    if(!runs.length){ el().textContent="Nenhuma rodada encontrada."; return; }
    const falhas=runs.filter(x=>x.conclusion==="failure").length;
    el().innerHTML = `<ul style="list-style:none;margin:0;padding:0">`+runs.map(x=>{
      const co=x.conclusion||x.status;
      const ico=co==="success"?"🟢":co==="failure"?"🔴":co==="cancelled"?"⚪":"🟡";
      const quando=new Date(x.created_at).toLocaleString("pt-BR",
        {timeZone:"America/Sao_Paulo", day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"});
      return `<li style="padding:5px 0;border-top:1px solid var(--borda);display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${ico} <b>${quando}</b> <span class="meio-sub">${esc(x.display_title && x.display_title!==x.name ? x.display_title
          : x.event==="schedule" ? "rodada de reserva do GitHub" : "disparo manual")}</span>
        ${co==="failure"?`<button class="btn-mini" onclick="ssPasso(${x.id},this)" title="qual passo falhou?"><span aria-hidden="true">Diagnosticar</span><span class="sr-only">qual passo falhou?</span></button>`:""}
        <a class="btn-mini" style="text-decoration:none;margin-left:auto" href="${x.html_url}" target="_blank" rel="noopener">abrir ↗</a>
      </li>`; }).join("")+`</ul>
      ${falhas?`<p class="meio-sub" style="margin:8px 0 0">Se a falha for no passo <b>Renova token Microsoft Graph</b>,
        o segredo GRAPH_REFRESH_TOKEN do repositório venceu — é ele que abre o To Do; gere um novo e atualize em
        Settings → Secrets and variables → Actions.
        Se o log falar em <b>Invalid API key (401)</b> no passo Espelho → banco, quem venceu foi o segredo
        <b>SUPABASE_SERVICE_KEY</b>: copie a service key atual no painel do Supabase (Settings → API keys)
        e atualize o segredo no mesmo lugar do GitHub.</p>
      ${/* F77 · o testador: cola a chave copiada e sabe NA HORA se é a certa,
           antes de pôr no GitHub — a chave não é gravada em lugar nenhum */""}
      <div class="form-linha" style="margin-top:8px">
        <input id="ss-chave" type="password" style="flex:1;min-width:220px"
          placeholder="cole aqui a chave copiada do Supabase para TESTAR">
        <button class="btn-mini" onclick="ssTestarChave()" title="testar a chave"><span aria-hidden="true">Testar</span><span class="sr-only">testar a chave</span></button>
      </div>
      <p class="meio-sub" id="ss-chave-r" style="margin:4px 0 0"></p>`:""}`;
  }catch(e){ if(el()) el().textContent="Não consegui consultar: "+e.message; }
}
// F77 · testa uma chave do Supabase SEM guardar: gateway recusou (401/403 com
// "Invalid API key") = chave errada; 200 com linhas = service key (a que vai
// no segredo); 200 vazio = chave do gateway mas SEM força de service (anon).
async function ssTestarChave(){
  const el=document.getElementById("ss-chave"), r=document.getElementById("ss-chave-r");
  const chave=(el&&el.value||"").trim(); if(!chave||!r) return;
  r.textContent="testando…";
  try{
    const cfg=JSON.parse(localStorage.getItem("crm_cfg")||"{}");
    // Chave nova (sb_secret_…/sb_publishable_…) NÃO é JWT: no header
    // Authorization o gateway tenta ler como JWT e recusa com "Invalid API
    // key" mesmo com a chave CERTA (doc oficial do Supabase). Ela vai só no
    // apikey; apenas a legada (eyJ…) vai também como Bearer — igual migrar.py.
    const cab=/^eyJ/.test(chave)
      ? {apikey:chave, Authorization:"Bearer "+chave} : {apikey:chave};
    const resp=await fetch(cfg.url.replace(/\/$/,"")+"/rest/v1/config_app?select=chave&limit=1",
      {headers:cab});
    const corpo=await resp.json().catch(()=>null);
    const digital=`${chave.length} caracteres, começa com "${chave.slice(0,10)}"`;
    r.innerHTML = !resp.ok
      ? `❌ <b>Chave INVÁLIDA</b> (HTTP ${resp.status}) — o Supabase não reconhece (${digital}). Não é a chave deste projeto; volte ao painel e copie a <b>service_role</b> (eyJ…) ou a secreta nova (sb_secret_…).`
      : (Array.isArray(corpo)&&corpo.length
        ? `✅ <b>Chave VÁLIDA e com força de service</b> (${digital}) — é ESSA que vai no segredo SUPABASE_SERVICE_KEY do GitHub.`
        : `⚠ A chave é aceita mas parece a <b>anon/publishable</b> (sem força de service) — copie a <b>service_role</b> (eyJ…) ou a sb_secret_, não a pública.`);
  }catch(e){ r.textContent="Não consegui testar: "+String(e.message||e).slice(0,80); }
  el.value="";   // some da tela: a chave não é gravada em lugar nenhum
}
async function ssPasso(runId, bt){
  bt.disabled=true; bt.textContent="consultando…";
  try{
    const tok=(cfgApp("gh_token")||"").trim();
    const r=await fetch(`https://api.github.com/repos/${GH_REPO}/actions/runs/${runId}/jobs`,
      {headers:{Authorization:"Bearer "+tok, Accept:"application/vnd.github+json"}});
    const d=await r.json();
    const jobs=d.jobs||[];
    const passos=jobs.flatMap(j=>j.steps||[]).filter(s=>s.conclusion==="failure").map(s=>s.name);
    // F75 · o VEREDITO mora no log do job: o migrar.py imprime "o banco
    // recusou POST em 'tabela' (código): detalhe" e nomeia linha culpada —
    // as últimas linhas relevantes aparecem aqui, sem abrir o GitHub
    const jobRuim=jobs.find(j=>(j.steps||[]).some(s=>s.conclusion==="failure"))||jobs[0];
    let trecho="";
    if(jobRuim){
      try{
        const rl=await fetch(`https://api.github.com/repos/${GH_REPO}/actions/jobs/${jobRuim.id}/logs`,
          {headers:{Authorization:"Bearer "+tok, Accept:"application/vnd.github+json"}});
        if(rl.ok){
          const linhas=(await rl.text()).split("\n")
            .map(l=>l.replace(/^\S+Z\s?/,"").replace(/^##\[error\]/,"⛔ "));
          const boas=linhas.filter(l=>l.trim() && !/^##\[/.test(l) &&
            /recusou|recusad|Falta coluna|culpad|Traceback|Error|ERRO|error|Exception|exit code|⛔/i.test(l));
          trecho=(boas.length?boas:linhas.filter(l=>l.trim())).slice(-14).join("\n").slice(-1800);
        }
      }catch(e){}
    }
    bt.outerHTML = (passos.length
      ? `<b style="color:var(--vermelho)">falhou em: ${esc(passos.join(" · "))}</b>`
      : `<span class="meio-sub">passo não identificado — abra no GitHub</span>`)
      + (trecho?`<pre class="ss-log" title="as últimas linhas do log do job — o motivo está aqui">${esc(trecho)}</pre>`:"");
  }catch(e){ bt.textContent="erro — abra no GitHub"; }
}
async function espiarSync(base, inicio){
  if(Date.now()-inicio > 15*60000){
    syncRodando = false; montarSidebar();
    aviso("A sincronização não confirmou em 15 min — confira a aba Actions do GitHub.");
    return;
  }
  await new Promise(x=>setTimeout(x, SYNC_POLL_MS));
  const linhas = await todas("config_app","select=chave,valor&chave=eq.todo_sync_em").catch(()=>null);
  const agora = linhas && linhas[0] && linhas[0].valor;
  if(agora && agora!==base){
    await carregar();               // traz o que a rodada acabou de importar
    syncRodando = false; montarSidebar(); render();
    aviso("To Do sincronizado ✔ — dados atualizados.");
    return;
  }
  espiarSync(base, inicio);
}

// E4 · A AUDITORIA TO DO × CRM. A rodada das 06h50 (e o botão desta tela) lê o
// To Do inteiro e compara, lista por lista e cliente por cliente, com o que o
// CRM tem (crm/auditoria_todo.py). O resumo vem em config_app, que a carga já
// traz; as linhas, só as da lista aberta e só quando alguém abre.
const TIPOS_AUDITORIA = {
  caso_ausente: "Tarefa aberta no To Do sem caso no CRM",
  fase: "Concluída num e aberta no outro, ou em outra fase",
  lista: "Lista de origem diferente",
  retorno: "Data diferente",
  importante: "Importância diferente",
  anotacoes: "Anotações diferentes",
  subtarefas: "Subtarefas diferentes",
  parcela_ausente: "Parcela do To Do que falta no CRM",
  parcela_situacao: "Parcela paga num e aberta no outro",
  parcela_a_mais: "Parcela no CRM que não está mais no To Do",
  lembrete_ausente: "Tarefa de Aposentadorias Futuras sem lembrete",
  lembrete_ativo: "Lembrete desligado num e ligado no outro",
  lembrete_data: "Data do lembrete diferente",
  lembrete_anotacoes: "Anotações do lembrete diferentes",
  particular_ausente: "Tarefa particular que falta no CRM",
  particular_concluida: "Tarefa particular concluída num e aberta no outro",
  particular_data: "Data da tarefa particular diferente",
  so_no_crm: "Caso aberto só no CRM",
  tarefa_sumiu: "Caso aberto cuja tarefa não existe mais no To Do",
  sem_caso_por_regra: "Tarefa nova guardada fora de caso (regra do Escritório e de Pagamentos)",
};
const AUD_INFORMATIVO = new Set(["sem_caso_por_regra"]);
let audLista = null, audLinhas = null;
function resumoAuditoria(){ try{ return JSON.parse(cfgApp("auditoria_todo")||"null"); }catch(e){ return null; } }
const audValor = v => v==null || v==="" ? "—" : /^\d{4}-\d{2}-\d{2}$/.test(v) ? fmtBarra(v)
  : v==="true" ? "sim" : v==="false" ? "não" : String(v);
function renderAuditoria(){
  tituloLista("🔎 Auditoria To Do × CRM");
  const r = resumoAuditoria();
  const p = r && r.planejado || {};
  document.getElementById("sub-lista").textContent = r
    ? `Última em ${fmtTS(r.em)} às ${horaSP(r.em)}. ${r.total} diferença(s). No Planejado, ${p.crm_mesma_data||0} de ${p.todo_com_data||0} tarefas com data estão iguais nos dois sistemas.`
    : "A auditoria roda todo dia às 06h50 e compara o To Do inteiro com o CRM.";
  const botao = `<button class="btn-rap" onclick="dispararAuditoria()" title="auditar agora"><span aria-hidden="true">Auditar</span><span class="sr-only">auditar agora</span></button>`;
  if(!r){ document.getElementById("conteudo-meio").innerHTML =
    `<div class="caso"><p class="meio-sub">Ainda não há auditoria gravada.</p>${botao}</div>`; return; }
  const listas = Object.entries(r.listas||{}).sort((a,b)=>b[1].divergencias-a[1].divergencias);
  const linhaLista = ([nome, x]) => {
    const tipos = Object.entries(x.tipos||{}).sort((a,b)=>b[1]-a[1]).map(([t,n]) =>
      `<span class="chip${AUD_INFORMATIVO.has(t)?"":" ben"}" title="${esc(TIPOS_AUDITORIA[t]||t)}">${esc(TIPOS_AUDITORIA[t]||t)}: ${n}</span>`).join(" ");
    const aberta = audLista===nome;
    return `<div class="caso aud-lista">
      <button class="aud-cab" onclick="abrirListaAuditoria('${escJs(nome)}')" aria-expanded="${aberta}">
        <b>${esc(nome)}</b>
        <span class="meio-sub">${x.abertas||0} aberta(s) no To Do, ${x.com_data||0} com data</span>
        <span class="aud-n${x.divergencias?"":" ok"}">${x.divergencias ? x.divergencias+" diferença(s)" : "igual"}</span>
      </button>
      ${tipos?`<div class="aud-tipos">${tipos}</div>`:""}
      ${aberta?`<div class="aud-linhas">${audLinhas===null?`<p class="meio-sub">carregando…</p>`:linhasAuditoria(audLinhas)}</div>`:""}
    </div>`;
  };
  const fora = Object.entries(r.fora_do_crm||{});
  document.getElementById("conteudo-meio").innerHTML =
    `<div class="form-linha" style="margin-bottom:8px">${botao}
      <span class="meio-sub">A rodada leva uns 3 minutos; a tela se atualiza sozinha quando o resultado chega.</span></div>`
    + listas.map(linhaLista).join("")
    + (r.parcelas_abertas_de_tarefa_concluida ? `<p class="meio-sub">💵 ${r.parcelas_abertas_de_tarefa_concluida} parcela(s) em aberto pertencem a tarefas já concluídas no To Do e entram na conta do "a receber" (decisão D6).</p>` : "")
    + (fora.length ? `<p class="meio-sub">Fora do CRM, por não terem CPF no título: ${fora.map(([l,n])=>`${esc(l)} (${n})`).join(", ")}.</p>` : "");
}
function linhasAuditoria(ls){
  if(!ls.length) return `<p class="meio-sub">Nenhuma diferença nesta lista.</p>`;
  const grupos = {};
  ls.forEach(l=>{ (grupos[l.tipo]=grupos[l.tipo]||[]).push(l); });
  return Object.entries(grupos).map(([t, xs]) => `<div class="aud-grupo">
      <div class="rotulo-caso">${esc(TIPOS_AUDITORIA[t]||t)} (${xs.length})</div>
      ${xs.map(l=>{
        const c = l.cliente_id && D.cliPorId.get(l.cliente_id);
        const quem = c ? esc(c.nome) : l.titulo ? esc(l.titulo) : "—";
        return `<div class="aud-linha">
          ${c?`<button class="btn-mini" onclick="abrirFicha('${c.id}')">${quem}</button>`:`<span>${quem}</span>`}
          <span class="meio-sub">To Do: ${esc(audValor(l.no_todo))} · CRM: ${esc(audValor(l.no_crm))}${l.detalhe?` · ${esc(l.detalhe)}`:""}</span>
        </div>`; }).join("")}
    </div>`).join("");
}
async function abrirListaAuditoria(nome){
  if(audLista===nome){ audLista=null; audLinhas=null; return renderAuditoria(); }
  audLista=nome; audLinhas=null; renderAuditoria();
  try{ audLinhas = await todas("todo_auditoria", `select=*&lista=eq.${encodeURIComponent(nome)}&order=tipo`); }
  catch(e){ audLinhas = []; aviso("Não consegui ler a auditoria: "+String(e.message||e).slice(0,80)); }
  if(visao==="auditoria" && audLista===nome) renderAuditoria();
}
async function dispararAuditoria(){
  const tok=(cfgApp("gh_token")||"").trim();
  if(!tok) return aviso("Guarde o token do GitHub primeiro: Sincronizar, no menu da conta.");
  try{
    const r = await fetch(`https://api.github.com/repos/${GH_REPO}/actions/workflows/crm-sync.yml/dispatches`,{
      method:"POST", headers:{Authorization:"Bearer "+tok, Accept:"application/vnd.github+json",
        "Content-Type":"application/json"},
      body:JSON.stringify({ref:"main", inputs:{origem:"manual", auditar:"sim"}})});
    if(r.status!==204) return aviso(`O GitHub respondeu ${r.status}: auditoria não disparada.`);
    aviso("Auditoria disparada. O resultado chega em uns 3 minutos.");
  }catch(e){ aviso("Sem resposta do GitHub. Confira a internet."); }
}

// F150 · A CARGA EM DUAS LEVAS. A primeira traz o que as listas e a barra
// precisam (clientes, casos, tarefas, atribuições...); a segunda, o que só
// serve a telas secundárias (modelos, frases, WhatsApp, análises, andamentos
// de 30 dias...). Com `cedo`, a tela aparece assim que a primeira chega, e a
// segunda só PREENCHE os campos dela em D, sem refazer o que a pessoa já mexeu.
// Sem `cedo`, é a carga de sempre: tudo, e só então D.
// [10.10.2026] o evento que o leitor do To Do criou com a data errada: entre
// "perícia" e a data havia "Ver o resultado em", "Fazer manifestação em",
// "Prazo", "atendimento para o dia", "valor de R$"… A mesma regra do
// crm/sync_todo.py (_data_e_do_evento), aplicada ao trecho guardado em obs,
// tira da tela o que já está no banco. Evento do PAT (obs vazia) não passa aqui.
const RX_EV_PALAVRA = /per[íi]cia|audi[êe]ncia|avalia[çc][ãa]o social/i;
const RX_EV_NAO = /verific|resultado|manifest|prazo|desfavor|favor[aá]vel|r\$|valor|ap[oó]s|for marcad|aguard|atendimento|precisa ser|seja agendad|laudo|proposta|decis[aã]o/i;
function eventoFalso(e){
  const t = String((e && e.obs) || ""); if(!t) return false;
  const k = RX_EV_PALAVRA.exec(t); if(!k) return false;
  const resto = t.slice(k.index + k[0].length), d = /\b\d{1,2}[./]\d{1,2}/.exec(resto);
  if(!d) return false;
  const meio = resto.slice(0, d.index);
  if(RX_EV_NAO.test(meio)) return true;
  const partes = meio.split(/[.;!?]\s/);
  return partes.length > 1 && !/agend|marcad|design|remarc/i.test(partes[partes.length-1]);
}
// F379 (12.37) · os casos encerrados vêm sem o histórico do DataJud (datajud, datajud_multi): eram 2 MB dos 7 MB
// deles, e só a ficha os mostra. A lista de colunas sai de uma linha de amostra, para coluna nova não ficar de fora.
// A ficha (buscarFicha) e quem grava esses campos (casoInteiro: fundir, desfazer a fusão, mover número, trocar o
// processo principal) completam o caso antes; gravar a partir do caso sem eles apagaria o histórico no banco.
const CASO_PESADO = ["datajud","datajud_multi"];
async function casosDaCarga(){
  const [abertos, amostra] = await Promise.all([todas("casos","select=*&encerrado_em=is.null"),
    api("/rest/v1/casos?select=*&encerrado_em=not.is.null&limit=1").catch(()=>null)]);
  const cols = amostra && amostra[0] ? Object.keys(amostra[0]).filter(c=>!CASO_PESADO.includes(c)) : null;
  if(!cols) return [...abertos, ...await todas("casos","select=*&encerrado_em=not.is.null")];
  const ja = new Set(abertos.map(k=>k.id));   // nunca o mesmo caso duas vezes, mesmo se o filtro não valer
  const fechados = (await todas("casos",`select=${cols.join(",")}&encerrado_em=not.is.null`)).filter(k=>k.encerrado_em && !ja.has(k.id));
  for(const k of fechados) k._semDj = true;
  return [...abertos, ...fechados];
}
async function casoInteiro(...ks){
  const faltam = ks.filter(k=>k && k._semDj); if(!faltam.length) return;
  const l = await todas("casos",`select=id,${CASO_PESADO.join(",")}&id=in.(${faltam.map(k=>k.id).join(",")})`);
  for(const r of l){ const k = faltam.find(x=>x.id===r.id); if(k){ Object.assign(k, r); delete k._semDj; } }
}
const CARGA_1 = {
    colaboradores: ()=>todas("colaboradores","select=*&order=nome"),
    clientes: ()=>todas("clientes","select=*&order=nome"),
    casos: ()=>casosDaCarga(),
    atribuicoes: ()=>todas("atribuicoes","select=*"),
    tarefas: ()=>todas("tarefas","select=*"),
    eventos: ()=>todas("eventos","select=*&order=data_hora").then(l=>l.filter(e=>!eventoFalso(e))),
    pagamentos: ()=>todas("pagamentos","select=*"),
    meudia: ()=>todas("meu_dia",`select=*&dia=eq.${hoje()}`),
    mencoes: ()=>todas("mencoes",`select=*&para_id=eq.${eu.id}&lida_em=is.null&order=criado_em.desc`),
    apos: ()=>todas("aposentadorias","select=*&order=data").catch(()=>[]),
    qualid: ()=>todas("qualidade_planos","select=*&ativo=is.true&order=criado_em").catch(()=>null),   // F282
    listaPref: ()=>todas("lista_pref","select=*").catch(()=>[]),
    cfgs: ()=>todas("config_app","select=*").catch(()=>[]),
    seguidores: ()=>todas("caso_seguidores",`select=caso_id,colaborador_id&colaborador_id=eq.${eu.id}`).catch(()=>[]),   // F441
    tarefasAnd: ()=>todas("andamento_tarefas","select=*&concluida_em=is.null").catch(()=>[]),
      // 🔔 lembretes do cliente, com o histórico de avisos embutido — a
      // tabela pode nem existir num banco atrasado, daí o catch,
    lembs: ()=>todas("lembretes","select=*,lembrete_avisos(colaborador_id,em,canal)&ativo=is.true&order=proximo_em")
        .catch(()=>todas("lembretes","select=*&ativo=is.true&order=proximo_em").catch(()=>[])),
      // ⚖️ Análise de Direito (F48) — null (e não []) quando a tabela ainda
      // não existe, para a tela saber avisar "rode o schema",
};
const CARGA_2 = {
    and30: ()=>todas("andamentos",`select=autor_id,criado_em,caso_id,origem&criado_em=gte.${window.__d30.toISOString()}`),
    // F236 · as menções que EU fiz e ninguém leu: o "Delegadas por mim" diz se a pessoa viu
    mencEnv: ()=>todas("mencoes",`select=id,para_id,andamento_id,criado_em&de_id=eq.${eu.id}&lida_em=is.null`).catch(()=>[]),
      // 📣 Novidades: só o que veio dos portais, com quem já leu. É uma
      // consulta pequena de propósito — puxar o texto de TODOS os andamentos
      // de 30 dias para mostrar os do robô seria carregar a ficha inteira do
      // escritório em toda abertura do CRM.,
    novid: ()=>todas("andamentos",`select=id,caso_id,texto,origem,criado_em,andamentos_lidos(colaborador_id)`
        +`&origem=in.(pat,crps,dou,pje)&criado_em=gte.${window.__d30.toISOString()}&order=criado_em.desc`)
        .catch(()=>[]),
    modelos: ()=>todas("modelos_mensagem","select=*&order=titulo"),
    sugestoes: ()=>todas("sugestoes","select=*&status=eq.pendente&order=criado_em.desc"),
    leads: ()=>todas("leads","select=*&order=criado_em.desc"),
    docs: ()=>todas("documentos_beneficio","select=*"),
    ckls: ()=>todas("checklist_modelo","select=*"),
    docModelos: ()=>todas("modelos_documento","select=*&order=titulo"),
    frases: ()=>todas("frases_prontas","select=*&order=texto").catch(()=>[]),
    lembrarMotivos: ()=>todas("lembrar_motivos","select=*&order=ordem").catch(()=>[]),
    rotinas: ()=>todas("rotinas","select=*&ativo=is.true&order=criada_em").catch(()=>[]),
    rotinasFeitas: ()=>todas("rotinas_feitas",`select=*&dia=eq.${hoje()}`).catch(()=>[]),
    zaps: ()=>todas("zap_conversas","select=id,nao_lidas,atendente_id,status,plantao").catch(()=>[]),
    inssCal: ()=>todas("inss_calendario","select=*").catch(()=>[]),
    anals: ()=>todas("analises_direito","select=*&order=data_analise.desc").catch(()=>null),
      // ⭐/⚡ as anotações marcadas, de TODOS os clientes — é a lista ⭐
      // Importante. Só as marcadas entram, então a consulta é pequena; o
      // catch cobre o banco que ainda não rodou o schema_por_em_dia.sql,
    sinal: ()=>todas("andamentos","select=id,caso_id,texto,origem,criado_em,autor_id,importante,urgente"
        +"&or=(importante.is.true,urgente.is.true)&order=criado_em.desc").catch(()=>[]),
};
// F150 · A ÚLTIMA SESSÃO GUARDADA NO APARELHO (autorizado pelo Paulo,
// 27.09.2026). O CRM abre na hora com os dados da última vez e atualiza em
// seguida. Fica no IndexedDB deste navegador, amarrado ao colaborador, vale
// por 7 dias e é APAGADO no "Sair". Contém dados pessoais dos clientes:
// só use o CRM, com isto ligado, em aparelho do escritório ou pessoal.
const CACHE_BANCO = "crm-sessao", CACHE_VALIDADE = 7*864e5;
let escritas = 0;   // gravações feitas enquanto a tela mostrava a sessão guardada
function cacheAbrir(){ return new Promise((ok, erro)=>{ const r = indexedDB.open(CACHE_BANCO, 1);
  r.onupgradeneeded = () => r.result.createObjectStore("s"); r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error); }); }
async function cacheLer(){ try{ const db = await cacheAbrir();
  return await new Promise(ok=>{ const q = db.transaction("s").objectStore("s").get("ultima"); q.onsuccess = () => ok(q.result||null); q.onerror = () => ok(null); });
  }catch(e){ return null; } }
async function guardarSessao(){ try{ if(!D || !D._bruto1 || !eu) return; const db = await cacheAbrir();
  db.transaction("s","readwrite").objectStore("s").put({usuario:eu.id, em:Date.now(), dia:hoje(),
    r:{...D._bruto1, ...(D._bruto2||{})}, marcas:D._marcas||null, cheiaEm:D._cheiaEm||0}, "ultima");
  }catch(e){} }
function cacheApagar(){ return new Promise(ok=>{ try{ const r = indexedDB.deleteDatabase(CACHE_BANCO); r.onsuccess = r.onerror = r.onblocked = () => ok(); }catch(e){ ok(); } }); }

// E1 · A CARGA INCREMENTAL. Estas seis tabelas eram 95% dos 18 MB que cada
// abertura do CRM baixava, e o plano gratuito do Supabase dá 5 GB de tráfego
// por mês (29.09.2026: 10,19 GB gastos no ciclo). O banco carimba mudou_em em
// toda alteração REAL (a regravação idêntica da sincronização não conta) e
// anota em `apagados` o que sai. Com a cópia já na memória, o CRM pede só o
// que mudou desde a carga anterior, com 2 min de folga: o carimbo é a hora em
// que a gravação COMEÇOU, e uma gravação lenta pode terminar depois de uma
// rápida (a mais longa, o lote de 500 linhas da sincronização, leva segundos).
// Folga maior rebaixaria a cada 3 min, em cada tela aberta, o que já veio.
// Carga completa na primeira vez, com o banco sem o carimbo, depois de falha
// da incremental e uma vez por semana.
const ordPor = campo => (a,b) => { const x=a[campo], y=b[campo];
  return x==null ? (y==null?0:1) : y==null ? -1 : String(x).localeCompare(String(y), "pt-BR"); };
const INCREMENTAIS = {
  clientes:   {t:"clientes",   sel:"select=*", ord:ordPor("nome")},
  casos:      {t:"casos",      sel:"select=*"},
  tarefas:    {t:"tarefas",    sel:"select=*"},
  eventos:    {t:"eventos",    sel:"select=*", ord:ordPor("data_hora"), fica:e=>!eventoFalso(e)},
  pagamentos: {t:"pagamentos", sel:"select=*"},
  // a carga completa traz só os ativos; a incremental traz também o que foi
  // desligado, para tirar da cópia
  lembs:      {t:"lembretes",  sel:"select=*,lembrete_avisos(colaborador_id,em,canal)",
               ord:ordPor("proximo_em"), fica:l=>l.ativo===true},
};
