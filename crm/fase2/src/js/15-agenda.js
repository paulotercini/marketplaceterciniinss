function lerCnisPdf(itens){
  itens = palavrasDoPdf(itens);
  const linhas = linhasDoPdf(itens);
  const tudo = linhas.map(l=>l.txt).join("\n");
  const r = {tipo:"cnis", filiado:{}, indicadores:[], vinculos:0, paginas:0};
  r.paginas = itens.length ? Math.max(...itens.map(i=>i.p)) : 0;

  const pega = rx => { const m = tudo.match(rx); return m ? m[1].trim() : ""; };
  // [20.09.2026] o "NIT:" e o número podem chegar em pedaços separados do
  // pdf.js (rótulo colado ao título da seção, número quebrado no hífen).
  // Aceita espaço no meio e limpa depois; e o extrato é reconhecido pelo
  // próprio cabeçalho, mesmo que o NIT não case.
  r.filiado.nit  = pega(/NIT\s*:?\s*([\d][\d.\-\s]{9,20}\d)/).replace(/\s+/g,"");
  r.filiado.cpf  = pega(/CPF\s*:?\s*([\d][\d.\-\s]{9,16}\d)/).replace(/\s+/g,"");
  r.ehExtrato = /Extrato\s+Previdenci/i.test(tudo) && /CNIS/.test(tudo);
  r.filiado.nascimento = pega(/Data de nascimento:\s*(\d{2}\/\d{2}\/\d{4})/);
  r.filiado.nome = pega(/Nome:\s*(.+?)\s*$/m);
  r.filiado.mae  = pega(/Nome da mãe:\s*(.+?)\s*$/m);

  // cada vínculo abre uma linha "Seq." de dados logo abaixo do cabeçalho
  r.vinculos = linhas.filter(l=>/^\d{1,3}\s+\d{3}\.\d{5}\.\d{2}-\d/.test(l.txt)).length;

  // a legenda: duas colunas. O código é o primeiro item de cada coluna, e a
  // descrição continua na mesma linha e pode transbordar para a seguinte.
  const iLeg = linhas.findIndex(l=>/^Legenda de Indicadores/.test(l.txt));
  const achados = new Map();
  let colunas = [];   // os códigos da última linha, com o x em que cada um começa
  if(iLeg >= 0){
    for(let i=iLeg+1; i<linhas.length; i++){
      const l = linhas[i];
      // a legenda acaba onde começa o rodapé da folha: a nota do INSS, o
      // aviso de autenticidade ou o número da página
      if(/^O INSS poderá rever|autenticidade|^Página\s+\d/.test(l.txt)) break;
      if(/^Indicador\s+Descrição/.test(l.txt)) continue;
      // a legenda tem DUAS colunas. Cada código manda do seu x até o x do
      // próximo código da mesma linha; a descrição que transborda para a
      // linha de baixo pertence à coluna em que ela está, não ao último
      // código lido. Emendar no "último aberto" jogava o "concomitante com
      // outros vínculos" do PREC-FACULTCONC (coluna esquerda) na descrição
      // do PREC-MENOR-MIN (coluna direita), e a nota da triagem saía errada.
      const cods = l.itens.filter(x=>RX_IND.test(x.t));
      if(cods.length){
        cods.forEach((it, j)=>{
          const ate = cods[j+1] ? cods[j+1].x : Infinity;
          const desc = l.itens.filter(x=>x.x>it.x && x.x<ate && !RX_IND.test(x.t))
                              .map(x=>x.t).join(" ");
          const ja = achados.get(it.t);
          if(ja) ja.descricao = (ja.descricao + " " + desc).trim();
          else achados.set(it.t, {codigo:it.t, descricao:desc.trim(), ocorrencias:0});
        });
        colunas = cods.map(x=>({cod:x.t, x:x.x}));
      }else if(colunas.length){
        for(const it of l.itens){
          let dono = colunas[0];
          for(const c of colunas) if(it.x >= c.x - 12) dono = c;
          const a = achados.get(dono.cod);
          if(a) a.descricao = (a.descricao + " " + it.t).trim();
        }
      }
    }
  }
  // conta no CORPO, fora da legenda: é o número que diz o tamanho do problema
  const corpo = linhas.slice(0, iLeg<0 ? linhas.length : iLeg);
  for(const l of corpo) for(const it of l.itens){
    const cod = it.t.replace(/,$/,"");
    if(achados.has(cod)) achados.get(cod).ocorrencias++;
  }
  r.indicadores = [...achados.values()].sort((a,b)=>b.ocorrencias-a.ocorrencias);
  r.linhaDoTempo = lerVinculosCnis(itens);
  // F127 · um cliente pode ter VÁRIOS NITs: o do cabeçalho e o de cada
  // vínculo. Todos, sem repetir, na ordem em que aparecem.
  r.nits = [...new Set([r.filiado.nit, ...r.linhaDoTempo.map(v=>v.nit)].filter(Boolean))];
  // a base do § 1º do art. 15 (os "mais de 120") é contarSemPerda, gravada
  // em gravarCnisLido: contagem seguida, que zera na perda da qualidade
  return r;
}
// ── a vida contributiva, como o CNIS a escreve ──────────────────────────
// A linha de vínculo tem sete formatos no extrato, e o tipo de filiado quebra
// para a linha de baixo ("Empregado ou Agente" + "Público"). O que muda entre
// eles é quantas datas vêm: vínculo fechado traz início e fim, vínculo aberto
// traz só o início, e alguns trazem a última remuneração no lugar do fim —
// competência (MM/AAAA), não data. Confundir as duas coisas fecharia um
// vínculo que ainda está aberto.
// pares [o que está escrito, o nome que vale]. "Empregado ou Agente Público"
// quebra em duas linhas no extrato, e quando o "Público" não cai na linha
// seguinte o texto termina em "Empregado ou Agente" — sem esta entrada, o
// casamento caía no "Empregado" solto e o tipo saía errado em 3 dos 30.
// Do mais longo para o mais curto: o primeiro que casar é o que vale.
const TIPOS_FILIADO = [
  ["Empregado ou Agente Público","Empregado ou Agente Público"],
  ["Empregado ou Agente","Empregado ou Agente Público"],
  ["Empregado Doméstico","Empregado Doméstico"],
  ["Contribuinte Individual","Contribuinte Individual"],
  ["Trabalhador Avulso","Trabalhador Avulso"],
  ["Segurado Especial","Segurado Especial"],
  ["Empregador","Empregador"],
  ["Empregado","Empregado"],
  ["Facultativo","Facultativo"],
  // F300 · as categorias de antes da Lei 9.876/99, hoje contribuinte individual: sem elas o vínculo sumia e as guias iam ao vínculo de cima
  ["Equiparado a Autônomo","Contribuinte Individual"],
  ["Autônomo","Contribuinte Individual"],
  ["Empresário","Contribuinte Individual"],
];
const SIT_BEN = {"1":"CESSADO","2":"ATIVO","3":"SUSPENSO"};
// F127 · as competências de uma linha do extrato, com o valor que vale.
// Remuneração: "01/2020 1.045,00 02/2020 1.045,00" (três por linha).
// Contribuição do CI: "01/2020 15/02/2020 209,00 1.045,00 IREC-INDPEND" —
// aí o salário de contribuição é o MAIOR valor do grupo (a contribuição é
// 20% dele), e é ele que se compara com o mínimo.
function competenciasDaLinha(txt){
  const out = []; let atual = null;
  for(const tok of String(txt||"").split(/\s+/)){
    if(/^\d{2}\/\d{4}$/.test(tok)){ atual = {c:tok, vals:[], ind:[]}; out.push(atual); continue; }
    if(atual && /^\d{2}\/\d{2}\/\d{4}$/.test(tok)){ if(!atual.vals.length) atual.pg = tok; continue; }   // F300 · a "Data Pgto." do recolhimento
    if(atual && /^[\d.]+,\d{2}$/.test(tok)) atual.vals.push(+tok.replace(/\./g,"").replace(",","."));
    else if(atual && /^[A-Z]{3,}(?:-[A-Z0-9]{2,})+,?$/.test(tok)) atual.ind.push(tok.replace(/,$/, ""));   // F214 · o indicador da competência ("IREC-MEI, IREC-LC123")
  }
  // F215 · com contribuição e salário na linha, a razão dá a alíquota (5, 11 ou 20 %)
  return out.filter(x=>x.vals.length).map(x=>({c:x.c, v:Math.max(...x.vals), ...(x.pg ? {pg:x.pg} : {}), ...(x.ind.length ? {ind:x.ind} : {}),
    ...(x.vals.length > 1 && Math.max(...x.vals) > 0 ? {aliq: Math.round(Math.min(...x.vals) / Math.max(...x.vals) * 100)} : {})}));
}
// F300 · as guias de CI e facultativo pagas em atraso antes da primeira paga em dia não contam para a carência
// (Lei 8.213/91, art. 27, II). Vence no dia 15 do mês seguinte (Lei 8.212/91, art. 30, II), e o DAS do MEI no
// dia 20, os dois adiados ao dia útil seguinte. Devolve as competências em atraso, ou null sem guia com data.
// shortcut: conta só a partir do primeiro recolhimento do CNIS; o reingresso depois da perda da qualidade reabre a regra e fica com a equipe
function ciPagasEmAtraso(vs){
  const cs = [];
  for(const v of (vs||[]).filter(v=>/Individual|Facultativo/i.test(v.tipo||""))) for(const cp of v.comps||[])
    if(cp.pg) cs.push({...cp, mei: /MEI|Microempreendedor/i.test(v.origem||"") || (cp.ind||[]).some(i=>/MEI|LC123/.test(i))});
  if(!cs.length) return null;
  cs.sort((a, b)=>chaveComp(a.c).localeCompare(chaveComp(b.c)));
  const venc = cp => { let d = `${somarMeses(chaveComp(cp.c) + "-01", 1).slice(0, 8)}${cp.mei ? "20" : "15"}`;
    while(!diaBancario(d)) d = somaDias(d, 1); return d; };
  const out = [];
  for(const cp of cs){ if(isoBr(cp.pg) <= venc(cp)) break; out.push(cp); }
  return out;
}
function lerVinculosCnis(itens){
  const linhas = linhasDoPdf(palavrasDoPdf(itens));
  // F302 · o indicador que não coube na coluna continua na linha de baixo ("IREM-" e "SEM-DIAS-INTERM"): emenda antes de ler
  linhas.forEach((l, i)=>{ const seg = linhas[i+1];
    if(seg && /[A-Z]-$/.test(l.txt) && /^[A-Z]{2,}(?:-[A-Z0-9]+)*,?(?:\s|$)/.test(seg.txt)){
      const [p0, ...resto] = seg.txt.split(/\s+/); l.txt += p0; seg.txt = resto.join(" "); } });
  const out = [];
  linhas.forEach((l, i)=>{
    const m = l.txt.match(/^(\d{1,3})\s+(\d{3}\.\d{5}\.\d{2}-\d)\s+(.*)$/);
    if(!m){
      const ult = out[out.length-1];
      // F302 · os indicadores do vínculo vêm numa linha própria ("Indicadores: PEXT"), abaixo dele
      const iv = l.txt.match(/^Indicadores:\s*(.+)$/);
      if(iv){ if(ult && ult.tipo!=="Benefício") ult.indicadores = [...new Set([...(ult.indicadores||[]), ...(iv[1].match(/[A-Z]{3,}(?:[-_][A-Z0-9]{2,})*/g)||[])])]; return; }
      // F127 · linha de competências: pertence ao último vínculo aberto acima
      if(ult && ult.tipo!=="Benefício"){
        const cps = competenciasDaLinha(l.txt);
        if(cps.length) ult.comps = (ult.comps||[]).concat(cps);
      }
      return;
    }
    const [, seq, nit] = m;
    let resto = m[3];
    // "Empregado ou Agente" termina na linha seguinte, em "Público"
    const seg = linhas[i+1];
    if(seg && /^Público$/.test(seg.txt.trim()) && /Empregado ou Agente$/.test(resto.replace(/\s+\d.*$/,"").trim()))
      resto = resto.replace(/(Empregado ou Agente)(?=\s|$)/, "$1 Público");

    // período de benefício: o CNIS traz o benefício como se fosse vínculo, e
    // é dele que sai a história de B31 sem precisar da Declaração
    // [onda 1 do dossiê, 10.10.2026] o benefício INDEFERIDO vem sem data
    // nenhuma ("42 - APOSENTADORIA POR TEMPO DE 99 - INDEFERIDO"): as datas são
    // opcionais, e o indeferido não fica "em aberto" nem conta como ativo
    // F302 · há extrato que traz a situação sem o número ("CESSADO" no lugar de "2 - CESSADO")
    const b = resto.match(/^(\d{9,11})\s+Benefício\s+(\d+)\s*-\s*(.+?)(?:\s+(\d{2}\/\d{2}\/\d{4}))?(?:\s+(\d{2}\/\d{2}\/\d{4}))?(?:\s+(?:(\d+)\s*-\s*([A-ZÇÃÕÁÉÍÓÚ]+)|(ATIVO|CESSADO|SUSPENSO|INDEFERIDO)))?\s*$/);
    if(b){
      const situacao = b[7] || b[8] || SIT_BEN[b[6]] || "";
      out.push({seq:+seq, nit, tipo:"Benefício", especie:b[2], origem:b[3].trim(),
        nb:b[1], inicio:b[4]||"", fim:b[5]||"", situacao, aberto:!b[5] && !!b[4] && !/INDEFER|CESSAD/i.test(situacao)});
      return;
    }
    // vínculo comum: acha o tipo de filiado, o mais longo que casar
    // F300 · há extrato que grava o acento como "\uFFFD" ("Aut\uFFFDnomo"): o tipo casa também assim
    const par = TIPOS_FILIADO.map(([e, t])=>[[e, e.replace(/[^\x00-\x7f]/g, "\uFFFD")].find(f=>resto.includes(f)), t]).find(([e])=>e);
    if(!par) return;
    const [escrito, tipo] = par;
    const antes = resto.slice(0, resto.indexOf(escrito)).trim();
    const depois = resto.slice(resto.indexOf(escrito)+escrito.length).trim();
    const datas = depois.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
    const comp  = depois.match(/(?:^|\s)(\d{2}\/\d{4})(?:\s|$)/);
    const ind   = depois.match(/\b[A-Z]{3,}(?:-[A-Z0-9]{2,})*\b/g) || [];
    // o código do empregador vem antes do nome: CNPJ, CEI ou número solto
    const cod = antes.match(/^(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|[\d.\/-]{8,})\s+/);
    // F302 · o nome do empregador que não coube continua na linha de baixo, antes do "Público" ("LTDA - FALIDO")
    const nome2 = seg && !/\d/.test(seg.txt) && !/^Indicadores:/.test(seg.txt) ? seg.txt.replace(/\s*P\S?blico$/, "").trim() : "";
    out.push({seq:+seq, nit, tipo, origem:((cod ? antes.slice(cod[0].length) : antes).trim() + (/^[A-Z]/.test(nome2) && nome2===nome2.toUpperCase() ? " " + nome2 : "")).trim(),
      codigo: cod ? cod[1] : "", inicio:datas[0]||"", fim:datas[1]||"",
      ultRemun: comp ? comp[1] : "", indicadores: ind, aberto: !datas[1]});
  });
  // ordem cronológica: é assim que a vida contributiva se lê, e não pela
  // sequência do INSS, que segue a ordem de cadastro
  const chave = v => { const d=(v.inicio||"").split("/"); return d.length===3 ? d[2]+d[1]+d[0] : "9999"; };
  return out.sort((a,b)=>chave(a).localeCompare(chave(b)) || a.seq-b.seq);
}
// o texto pronto para colar no parecer, na seção de vida contributiva
function vidaContributivaTexto(vs){
  const dt = d => d ? d.replace(/\//g,".") : "";
  return vs.map(v=>{
    const per = v.fim ? `${dt(v.inicio)} a ${dt(v.fim)}` : `${dt(v.inicio)} em aberto`;
    if(v.tipo==="Benefício")
      return `${per} · Benefício espécie ${v.especie} · ${v.origem}`
        + (v.nb?` · NB ${v.nb}`:"") + (v.situacao?` · ${v.situacao}`:"");
    return `${per} · ${v.tipo} · ${v.origem}`
      + (v.codigo?` (${v.codigo})`:"")
      + (v.indicadores && v.indicadores.length?` · ${v.indicadores.join(", ")}`:"");
  }).join("\n");
}
// ── Declaração de Benefícios ────────────────────────────────────────────
// Cada benefício é uma linha com o NB à esquerda e, em volta dela, o nome da
// espécie quebrado em duas ou três linhas na faixa do meio da folha.
const RX_NB = /^\d{3}\.\d{3}\.\d{3}-\d$/;
function lerDeclaracaoPdf(itens){
  itens = palavrasDoPdf(itens);
  const linhas = linhasDoPdf(itens);
  const tudo = linhas.map(l=>l.txt).join("\n");
  const r = {tipo:"declaracao", cpf:"", nome:"", emitida:"", beneficios:[]};
  const m = tudo.match(/CPF\s*n[ºo°]\s*([\d.\-]{11,})\s*pertencente a\s*(.+?)\s*:/s);
  if(m){ r.cpf = m[1].trim(); r.nome = m[2].replace(/\s+/g," ").trim(); }
  const e = tudo.match(/(\d{2}\/\d{2}\/\d{4})\s+\d{2}:\d{2}:\d{2}/);
  if(e) r.emitida = e[1];

  linhas.forEach((l, i)=>{
    const nb = l.itens.find(x=>RX_NB.test(x.t));
    if(!nb) return;
    const dep = l.itens.filter(x=>x.x > nb.x);
    const datas = dep.filter(x=>/^\d{2}\/\d{2}\/\d{4}$/.test(x.t)).sort((a,b)=>a.x-b.x);
    const val = dep.find(x=>/^[\d.]+,\d{2}$/.test(x.t));
    // a espécie é o que está na faixa do meio, nesta linha e nas vizinhas
    const perto = linhas.filter(x=>x.p===l.p && Math.abs(x.y - l.y) <= 12);
    const especie = perto.sort((a,b)=>a.y-b.y).flatMap(x=>x.itens)
      .filter(x=>x.x>=nb.x+150 && (val ? x.x < val.x-10 : true) && !RX_NB.test(x.t)
                 && !/^R\$$/.test(x.t) && !/^\d{2}\/\d{2}\/\d{4}$/.test(x.t)
                 && !/^[\d.]+,\d{2}$/.test(x.t))
      .map(x=>x.t).join(" ").replace(/\s+/g," ").trim();
    // situação: entre o NB e a espécie
    const sit = dep.filter(x=>x.x < nb.x + 150).map(x=>x.t).join(" ").trim();
    r.beneficios.push({nb:nb.t, situacao:sit, especie,
      valor: val ? val.t : "", inicio: datas[0] ? datas[0].t : "",
      cessacao: datas[1] ? datas[1].t : ""});
  });
  return r;
}
// o CPF do documento é o do cliente aberto? Trocar o PDF de pessoa é o erro
// mais fácil de cometer e o mais caro de descobrir depois.
function conferePdfComCliente(lido, c){
  const doDoc = digitos(lido.filiado ? lido.filiado.cpf : lido.cpf);
  const daFicha = digitos(c && c.cpf);
  if(!doDoc || !daFicha) return {ok:true, aviso:""};
  if(doDoc === daFicha) return {ok:true, aviso:""};
  return {ok:false, aviso:`O CPF do documento (${fmtCpf(doDoc)}) não é o do cliente aberto `
    + `(${fmtCpf(daFicha)}). Nada foi gravado.`};
}

// ── a vida contributiva na tela ─────────────────────────────────────────
// Trinta linhas dentro da anotação do passo enterrariam os indicadores. A
// linha do tempo mora no próprio passo, fechada, e sai inteira num clique
// para colar no parecer.
function blocoVidaContributiva(c){
  const g = ((triagemDe(c).pdf||{}).cnis||{});
  const vs = g.vinculos || [];
  if(!vs.length) return "";
  const abertos = vs.filter(v=>v.aberto && v.tipo!=="Benefício").length;
  const bens = vs.filter(v=>v.tipo==="Benefício").length;
  return `<details class="vida-cx">
    <summary>Vida contributiva lida do CNIS — ${vs.length} registros${
      bens?`, ${bens} de benefício`:""}${abertos?`, ${abertos} em aberto`:""}</summary>
    <div class="vida-acao">
      <button class="cad-mini" onclick="copiarVidaContributiva('${c.id}')" title="Copiar para o parecer">Copiar<span class="sr-only"> para o parecer</span></button>
      <span class="tri-pdf-nota">em ordem cronológica, do jeito que a seção do parecer pede</span>
    </div>
    <ol class="vida-lista">${vs.map(v=>{
      const dt = d => d ? esc(d.replace(/\//g,".")) : "";
      const per = v.fim ? `${dt(v.inicio)} a ${dt(v.fim)}`
                        : `${dt(v.inicio)} <b>em aberto</b>`;
      return `<li class="${v.tipo==="Benefício"?"vida-ben":""}${v.aberto?" vida-aberto":""}">
        <span class="vida-per">${per}</span>
        <span class="vida-quem">${esc(v.origem)}</span>
        <span class="vida-tipo">${v.tipo==="Benefício"
          ? `benefício espécie ${esc(v.especie)}${v.situacao?" · "+esc(v.situacao):""}`
          : esc(v.tipo)}</span>
        ${v.indicadores && v.indicadores.length
          ? `<span class="vida-ind">${esc(v.indicadores.join(", "))}</span>`:""}
      </li>`;
    }).join("")}</ol>
  </details>`;
}
async function copiarVidaContributiva(cliId){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const g = ((triagemDe(c).pdf||{}).cnis||{});
  const vs = g.vinculos || []; if(!vs.length) return;
  const txt = `VIDA CONTRIBUTIVA (lida do CNIS em ${fmt(g.em||hoje())})\n\n`
    + vidaContributivaTexto(vs);
  try{ await navigator.clipboard.writeText(txt);
       aviso(`${vs.length} registros copiados — cole na seção do parecer ✔`); }
  catch(e){ aviso("Não consegui copiar; o navegador bloqueou a área de transferência"); }
}
// ── o botão dentro do passo da triagem ───────────────────────────────────
// CNIS alimenta os passos "CNIS" e "Indicadores e pendências"; a Declaração
// alimenta "Benefício ativo". São os três passos que hoje dependem de alguém
// abrir o PDF e ler linha por linha.
const PDF_TRIAGEM = {
  beneficio:{rot:"Ler a Declaração de Benefícios (PDF)", arq:"declaracao",
    dica:"a declaração do Meu INSS; o arquivo é lido aqui no navegador e não sai desta máquina"},
};
function botaoPdfTriagem(cliId, chave){
  const d = PDF_TRIAGEM[chave]; if(!d) return "";
  return `<div class="tri-pdf">
    <input type="file" accept="application/pdf" id="pdf-${chave}" style="display:none"
      onchange="lerPdfDaTriagem('${cliId}','${chave}')">
    <button class="cad-mini" onclick="document.getElementById('pdf-${chave}').click()"
      title="${esc(d.dica)}">${esc(d.rot)}</button>
    <span class="tri-pdf-nota">lido aqui no navegador, não sai desta máquina</span>
  </div>`;
}
// lê o PDF e devolve os pedaços, ou avisa e devolve null
async function pedacosDoPdfOuAviso(arq){
  if(arq.size > MAX_ARQ){ aviso("Arquivo grande demais (máximo 20 MB)"); return null; }
  aviso("Lendo o PDF…", false);
  let itens;
  try{ itens = await itensDoPdf(arq); }
  catch(e){
    aviso(/cdn/.test(String(e.message))
      ? "Não consegui carregar o leitor de PDF — confira a conexão e tente de novo"
      : "Não consegui abrir este PDF");
    return null;
  }
  if(!itens.length){
    aviso("Este PDF não tem texto: é digitalizado ou foi impresso como imagem. "
      + "Baixe o PDF original no Meu INSS (Extrato do CNIS ou Declaração de Benefícios), "
      + "que vem com texto, e tente de novo.");
    return null;
  }
  return itens;
}
async function lerPdfDaTriagem(cliId, chave){
  const inp = document.getElementById("pdf-"+chave);
  const arq = inp && inp.files && inp.files[0];
  if(!arq) return;
  inp.value = "";
  const c = D.cliPorId.get(cliId); if(!c) return;
  if(chave === "cnis" || chave === "indicadores") return processarCnis(cliId, arq);
  const itens = await pedacosDoPdfOuAviso(arq); if(!itens) return;
  const lido = lerDeclaracaoPdf(itens);
  const viu = txt => itens.some(i=>i.t.includes(txt));
  const raio = `${Math.max(0,...itens.map(i=>i.p))} pág., ${itens.length} pedaços de texto`;
  if(!lido.beneficios.length && !lido.cpf)
    return aviso(`Não reconheci este arquivo como a Declaração de Benefícios (${raio}; `
      + `${viu("CPF")?"achei":"não achei"} "CPF", ${viu("NB")||viu("Benefício")?"achei":"não achei"} "NB").`);
  const conf = conferePdfComCliente(lido, c);
  if(!conf.ok) return aviso(conf.aviso);
  return gravarDeclaracaoLida(cliId, lido);
}
// ══════════════════════════════════════════════════════════════════════════
// F127 · O CNIS ENTRA NO CADASTRO — lido, guardado e respondendo a triagem
// ══════════════════════════════════════════════════════════════════════════
// O extrato é lido aqui no navegador (pdf.js), conferido contra o CPF do
// cliente, GUARDADO no bucket privado (para o botão "Abrir CNIS" abri-lo em
// outra aba, quantas vezes for preciso) e transformado nas respostas que a
// triagem consegue dar sozinha: vínculo em aberto, erro no empregador,
// competência abaixo do mínimo, indicadores, benefício ativo e o vínculo
// com a Previdência hoje.
async function processarCnis(cliId, arq){
  const c = D.cliPorId.get(cliId); if(!c) return false;
  const itens = await pedacosDoPdfOuAviso(arq); if(!itens) return false;
  const lido = lerCnisPdf(itens);
  const viu = txt => itens.some(i=>i.t.includes(txt));
  const raio = `${lido.paginas||Math.max(0,...itens.map(i=>i.p))} pág., ${itens.length} pedaços de texto`;
  if(!lido.indicadores.length && !lido.filiado.nit && !lido.ehExtrato){
    aviso(`Não reconheci este arquivo como um CNIS do Meu INSS (${raio}; `
      + `${viu("NIT")?"achei":"não achei"} "NIT", ${viu("Legenda")?"achei":"não achei"} a legenda de indicadores). `
      + "Se for o Extrato Previdenciário do Meu INSS, me mande este recado.");
    return false;
  }
  const conf = conferePdfComCliente(lido, c);
  if(!conf.ok){ aviso(conf.aviso); return false; }
  // o arquivo fica guardado: é ele que o botão "Abrir CNIS" abre
  let anexo = null;
  try{
    const stamp = new Date().toISOString().replace(/[:.]/g,"-").toLowerCase();
    const caminho = `${cliId}/${stamp}-cnis.pdf`;
    await subirArquivo(caminho, arq);
    [anexo] = await api(`/rest/v1/anexos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:null, cliente_id:cliId, autor_id:eu.id,
        nome:`CNIS ${fmt(hoje())}.pdf`, caminho, tipo:"application/pdf", tamanho:arq.size})});
    if(anexo && clienteAberto===cliId) (D.anexos=D.anexos||[]).unshift(anexo);
  }catch(e){
    aviso("Li o CNIS, mas não consegui guardar o arquivo — o botão Abrir CNIS fica sem ele até uma nova inserção", true);
  }
  await gravarCnisLido(cliId, lido, anexo);
  return true;
}
// o CNIS guardado deste cliente, se houver
function cnisDe(c){ return ((triagemDe(c).pdf||{}).cnis)||null; }
async function abrirCnis(cliId){
  const c = D.cliPorId.get(cliId); const g = c && cnisDe(c);
  if(!g || !g.caminho) return aviso("Este cliente ainda não tem o CNIS inserido — insira pelo Cadastro");
  const guia = window.open("", "_blank");            // abrir agora: o navegador
  try{                                               // bloqueia janela tardia
    const url = await linkArquivo(g.caminho, 600);
    if(guia) guia.location = url; else window.location = url;
  }catch(e){ if(guia) guia.close(); aviso("Não consegui abrir o CNIS"); }
}
// F129 · fora do cadastro só existe ABRIR: o CNIS entra pela recepção
// (Novo Cliente ou Identificação). Sem CNIS, o clique avisa onde inserir.
function botaoAbrirCnis(c, grande){
  const g = cnisDe(c), tem = !!(g && g.caminho);
  return `<button class="${grande?"cnis-abrir":"cad-mini"}${tem?"":" sem"}" onclick="abrirCnis('${c.id}')"
      title="${tem?`abre o extrato guardado em outra aba (CNIS de ${esc(fmt(g.em))})`:"o CNIS ainda não foi inserido no cadastro (Identificação)"}">Abrir CNIS${
      grande && tem ? ` <span class="meio-sub" style="font-weight:500">de ${esc(fmt(g.em))}</span>` : ""}</button>`;
}
// o botão de INSERIR (só na Identificação e no Novo Cliente)
function botaoInserirCnis(c){
  const g = cnisDe(c);
  return `<button class="cad-mini" onclick="escolherCnis('${c.id}')"
      title="o extrato do Meu INSS, em PDF; é lido aqui no navegador e guardado para abrir depois">${g&&g.caminho?"inserir um CNIS mais novo":"Inserir o CNIS"}</button>`;
}
// o seletor de arquivo nasce no clique: sem input escondido repetido em cada
// painel da ficha
function escolherCnis(cliId){
  const i = document.createElement("input"); i.type = "file"; i.accept = "application/pdf";
  i.onchange = async ()=>{ const a = i.files && i.files[0];
    if(a && await processarCnis(cliId, a) && clienteAberto===cliId) repintarFicha(); };
  i.click();
}
// ── o que o CNIS responde sozinho ────────────────────────────────────────
const TIPO_REMUN = /Empregado|Avulso/;   // remuneração informada pelo empregador
// indicadores que dizem "erro no cadastro do empregador" ou no vínculo
const RX_ERRO_EMPREGADOR = /^(PEMP-CAD|PEMP-IDINV|PCEI-EQP-INV|PADM-EMPR|PRES-EMPR|PREM-EMPR|PVIN-IRREG|PVIN-CAGED|NDET|PVIN-RE)$/;
const chaveComp = c => String(c||"").split("/").reverse().join("-");   // MM/AAAA → AAAA-MM
function analisarCnis(lido, ref){
  const vs = (lido.linhaDoTempo||[]).filter(v=>v.tipo!=="Benefício");
  const bens = (lido.linhaDoTempo||[]).filter(v=>v.tipo==="Benefício");
  // onda 1 · o vínculo sem data de saída termina no último dia do mês da
  // última remuneração (vinculosSemSaida); aqui ele leva o fim presumido junto
  const abertos = vs.filter(v=>v.aberto).map(v=>{
    const ultRemun = (v.comps||[]).map(x=>x.c).sort((a,b)=>chaveComp(a).localeCompare(chaveComp(b))).pop()||v.ultRemun||"";
    return {tipo:v.tipo, origem:v.origem, inicio:v.inicio, codigo:v.codigo||"", ultRemun, fimPresumido:fimDoMes(ultRemun)};
  });
  const errosEmp = [];
  vs.forEach(v=>(v.indicadores||[]).forEach(i=>{ if(RX_ERRO_EMPREGADOR.test(i)) errosEmp.push({cod:i, origem:v.origem}); }));
  // competência abaixo do mínimo: empregado só a partir de 11/2019 (EC 103);
  // CI e facultativo em qualquer época do Real
  const abaixo = [];
  for(const v of vs) for(const cp of (v.comps||[])){
    const [m, a] = cp.c.split("/"); if(+m < 1 || +m > 12) continue;
    if(TIPO_REMUN.test(v.tipo) && `${a}-${m}` < "2019-11") continue;
    const sm = salarioMinimo(cp.c); if(sm == null) continue;
    if(cp.v < sm - 0.005) abaixo.push({comp:cp.c, valor:cp.v, minimo:sm, tipo:v.tipo, origem:v.origem});
  }
  abaixo.sort((x,y)=>chaveComp(x.comp).localeCompare(chaveComp(y.comp)));
  // o vínculo hoje: o mês anterior à data de referência
  const d = new Date((ref||hoje()) + "T12:00:00"); d.setMonth(d.getMonth()-1);
  const mesAnt = `${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  let ultima = null;
  for(const v of vs) for(const cp of (v.comps||[])){
    if(+cp.c.slice(0,2) > 12) continue;
    if(!ultima || chaveComp(cp.c) > chaveComp(ultima.comp)) ultima = {comp:cp.c, tipo:v.tipo, origem:v.origem};
  }
  const tipoCurto = t => /Facultativo/.test(t) ? "facultativo" : /Individual|Empregador/.test(t) ? "ci"
                       : /Segurado Especial/.test(t) ? "especial" : "empregado";
  // [onda 1, 10.10.2026] o vínculo hoje é o aberto com remuneração nos três
  // meses anteriores, e o mais recente deles; o primeiro aberto da lista podia
  // ser um vínculo de 2002 que o empregador nunca fechou
  const d3 = new Date((ref||hoje()) + "T12:00:00"); d3.setMonth(d3.getMonth()-3);
  const recente = `${String(d3.getMonth()+1).padStart(2,"0")}/${d3.getFullYear()}`;
  const abertoEmp = abertos.filter(v=>TIPO_REMUN.test(v.tipo) && v.ultRemun && chaveComp(v.ultRemun) >= chaveComp(recente))
    .sort((a,b)=>chaveComp(b.ultRemun).localeCompare(chaveComp(a.ultRemun)))[0];
  const noMes = vs.find(v=>(v.comps||[]).some(cp=>cp.c===mesAnt));
  const agora = abertoEmp
    ? {tipo:"empregado", origem:abertoEmp.origem, desde:abertoEmp.inicio, ultRemun:abertoEmp.ultRemun, aberto:true}
    : noMes ? {tipo:tipoCurto(noMes.tipo), origem:noMes.origem, comp:mesAnt}
    : {tipo:"sem", ultima};
  const benefAtivos = bens.filter(v=>!/INDEFER|CESSAD|SUSPENS/i.test(v.situacao||"") && (!v.fim || /ATIVO/i.test(v.situacao||"")))
    .map(v=>({especie:v.especie, origem:v.origem, nb:v.nb, inicio:v.inicio, situacao:v.situacao}));
  return {abertos, errosEmp, abaixo, mesAnt, agora, benefAtivos,
    qtComps: vs.reduce((n,v)=>n+((v.comps||[]).length),0), contagem: contagemCnis(vs, abaixo),
    concomitantes: concomitantesDoCnis(vs), indComps: indicadoresDasComps(vs)};
}
// F302 · os meses com salário em dois ou mais lugares ao mesmo tempo: é a soma do art. 32 da Lei 8.213/91 no cálculo e a
// revisão do Tema 1070/STJ. O mês de entrada e o de saída do empregado não contam (na troca de emprego, as duas folhas
// caem no mesmo mês), nem o salário lançado fora das datas do vínculo
function concomitantesDoCnis(vs){
  const por = new Map(), ym = d => { const m = String(d||"").match(/(\d{2})\/(\d{4})$/); return m ? `${m[2]}-${m[1]}` : ""; };
  for(const v of vs){ const emp = TIPO_REMUN.test(v.tipo||""), a = ym(v.inicio), b = ym(v.fim);
    for(const cp of v.comps||[]){ if(!(cp.v > 0) || +String(cp.c).slice(0,2) > 12) continue;
      const k = chaveComp(cp.c); if(emp && (!a || k <= a || (b && k >= b))) continue;
      if(!por.has(k)) por.set(k, new Set()); por.get(k).add(v.origem || v.tipo); } }
  const ks = [...por].filter(([, o])=>o.size > 1).map(([k])=>k).sort(), out = [];
  for(const k of ks){ const u = out[out.length-1];
    if(u && mesesEntreYm(u.ate, k)===2){ u.ate = k; u.n++; por.get(k).forEach(o=>u.origens.add(o)); }
    else out.push({de:k, ate:k, n:1, origens:new Set(por.get(k))}); }
  return out.map(f=>({...f, origens:[...f.origens]}));
}
// F302 · o indicador de competência, com o vínculo e os meses em que aparece (o vínculo gravado não guarda as competências)
function indicadoresDasComps(vs){
  const out = {};
  for(const v of vs) for(const cp of v.comps||[]) for(const i of cp.ind||[]){
    const l = out[i] = out[i] || [], u = l.find(x=>x.origem===v.origem && x.inicio===v.inicio);
    if(u) u.comps.push(cp.c); else l.push({origem:v.origem, inicio:v.inicio, fim:v.fim||"", tipo:v.tipo, comps:[cp.c]}); }
  return out;
}
// Onda 3 · a contagem do CNIS por competência: cada mês de vínculo de
// empregado (da admissão à saída, ou à última remuneração quando falta a
// saída) e cada mês de contribuição de individual ou facultativo conta uma
// vez; a competência abaixo do mínimo fica fora até a complementação. Os meses
// contados se guardam em períodos ("AAAA-MM" a "AAAA-MM"), para a conta até
// uma data qualquer, como a DER de uma contagem do INSS.
function contagemCnis(vs, abaixo){
  const meses = new Set(), fora = new Set((abaixo||[]).map(x=>chaveComp(x.comp)));
  // F302 · o mês que só vem de vínculo ou de recolhimento com pendência fica de fora do que o INSS conta hoje (Decreto 3.048/99, arts. 19 a 19-F)
  const ok = new Set();
  const mesDe = d => { const m = String(d||"").match(/(\d{2})\/(\d{4})$/); return m ? `${m[2]}-${m[1]}` : ""; };
  for(const v of vs){
    const vp = vinculoPendente(v), compPend = x => !TIPO_REMUN.test(v.tipo||"") && (x.ind||[]).some(i=>tipoIndicador(i)==="P" && !RX_PEND_JA.test(i));
    const comps = (v.comps||[]).filter(x=>+String(x.c).slice(0,2)<=12);
    const add = (k, pend) => { meses.add(k); if(!vp && !pend) ok.add(k); };
    if(!TIPO_REMUN.test(v.tipo||"")){ comps.forEach(x=>add(chaveComp(x.c), compPend(x))); continue; }
    const ks = comps.map(x=>chaveComp(x.c)).sort();
    const a = mesDe(v.inicio), b = v.fim ? mesDe(v.fim) : (ks[ks.length-1] || chaveComp(v.ultRemun||""));
    if(!a || !b || b < a){ ks.forEach(k=>add(k)); continue; }
    let [y, m] = a.split("-").map(Number);
    for(let k = a; k <= b; k = `${y}-${String(m).padStart(2,"0")}`){ add(k); if(++m > 12){ m = 1; y++; } }
  }
  const pend = [...meses].filter(k=>!ok.has(k) && !fora.has(k)).sort();
  const conta = [...meses].filter(k=>!fora.has(k)).sort(), periodos = [];
  for(const k of conta){
    const ult = periodos[periodos.length-1];
    if(ult && chaveComp(competenciaMais(ult[1].split("-").reverse().join("/"), 1)) === k) ult[1] = k; else periodos.push([k, k]);
  }
  return {carencia: conta.length, anos: Math.floor(conta.length/12), meses: conta.length % 12, periodos,
    foraMinimo: [...meses].filter(k=>fora.has(k)).length, pendentes: pend.length, pendMeses: pend};
}
// F302 · a pendência do vínculo inteiro: o INSS não conta nenhum mês dele até o acerto. Fica de fora o que já tem conta
// própria (abaixo do mínimo, baixa renda, plano simplificado) e o regime próprio, que não se acerta no INSS
const RX_VIN_PEND = /^(PEXT|PADM-|PRES-EMPR|PVIN-|PEMP-|PCEI-|PNIT-|PDT-NASC|PSUC-|PDIV-DADOS|NDET$)/;
const RX_PEND_JA = /MENOR-MIN|PSC-MEN|FBR|LC123/;
const vinculoPendente = v => (v.indicadores||[]).some(i=>RX_VIN_PEND.test(String(i)));
// os meses contados até uma competência "AAAA-MM", inclusive
const mesesContadosAte = (periodos, ate) => (periodos||[]).reduce((n, [a, b])=>{
  if(a > ate) return n;
  const fim = b < ate ? b : ate, [ya, ma] = a.split("-").map(Number), [yb, mb] = fim.split("-").map(Number);
  return n + (yb - ya) * 12 + (mb - ma) + 1;
}, 0);
// ── o que fica gravado ───────────────────────────────────────────────────
// A leitura grava o extrato (o arquivo e o que foi lido) e as respostas
// PRÉ-PRONTAS dos passos que o CNIS responde. Quem atende confirma passo a
// passo; até lá o estado fica marcado como automático.
// F302 · a versão do leitor: o CNIS do dossiê lido por um leitor mais antigo se relê uma vez, calado
const CNIS_LEITOR_V = 302;
async function gravarCnisLido(cliId, lido, anexo, opc={}){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const t = {...triagemDe(c)};
  const an = analisarCnis(lido, hoje());
  t.pdf = {...(t.pdf||{}), cnis:{em:hoje(), quem:eu.id, paginas:lido.paginas, v:CNIS_LEITOR_V,
    qtVinculos:lido.vinculos, nits:lido.nits||[],
    indicadores:lido.indicadores.map(i=>({codigo:i.codigo, descricao:i.descricao, ocorrencias:i.ocorrencias})),
    // a última remuneração fica no vínculo mesmo quando só as competências a
    // trazem: é dela que sai o fim presumido do vínculo sem data de saída
    vinculos:(lido.linhaDoTempo||[]).map(({comps, ...v})=>({...v,
      ultRemun: v.ultRemun || (comps||[]).map(x=>x.c).sort((a,b)=>chaveComp(a).localeCompare(chaveComp(b))).pop() || ""})),
    analise:an,
    // a base do § 1º do art. 15: contribuições seguidas, sem perda da qualidade
    contribSemPerda: contarSemPerda(mesesDoCnisLido(lido.linhaDoTempo, an.abaixo)),
    nome: (lido.filiado||{}).nome || "",
    anexo_id: anexo ? anexo.id : ((t.pdf||{}).cnis||{}).anexo_id || null,
    caminho:  anexo ? anexo.caminho : ((t.pdf||{}).cnis||{}).caminho || null}};
  // as respostas pré-prontas: só onde ninguém respondeu à mão
  const ks = D.casosDoCliente.get(cliId) || [];
  for(const chave of ["cnis","indicadores","beneficio","vinculo"]){
    const atual = t[chave] || {};
    if(atual.estado && !atual.auto) continue;
    const l = triagemLeitura(chave, {...c, triagem:t}, ks);
    t[chave] = {...atual, estado: l.estado || "", auto:true, em:hoje(), quem:eu.id};
  }
  // F54 · o vínculo hoje viaja para a análise de direito (rotVinculo)
  t.vinculo = {tipo:an.agora.tipo, desde: an.agora.desde ? an.agora.desde.split("/").reverse().slice(0,2).join("-") : null,
               em:hoje(), quem:eu.id, auto:true};
  if(!await salvarTriagem(cliId, t)) return aviso("Li o PDF, mas não consegui guardar");
  // F29 · o cabeçalho do CNIS completa a Identificação: nome da mãe entra no
  // campo vazio; os NITs entram todos, sem repetir os já anotados
  const compl = {};
  if(!c.nome_mae && !((c.campos||{}).civil||{}).nome_mae && lido.filiado.mae)
    compl.nome_mae = tituloOrgao(lido.filiado.mae);   // F282 · o banco também converte (clientes_caixa)
  const nitsJa = String(valCli(c,"pis_nit")||"").split(/[\s·,;]+/).filter(Boolean);
  const nitsNovos = (lido.nits||[]).filter(n=>!nitsJa.includes(n));
  if(nitsNovos.length) compl.pis_nit = nitsJa.concat(nitsNovos).join(" · ");
  let preencheu = 0;
  if(Object.keys(compl).length){
    try{
      await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
        body:JSON.stringify(compl)});
      Object.assign(c, compl); preencheu = Object.keys(compl).length;
    }catch(e){
      // banco sem as colunas: o mesmo destino do resto do cadastro
      const civil = {...(((c.campos||{}).civil)||{}), ...compl};
      c.campos = {...(c.campos||{}), civil};
      try{
        await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
          body:JSON.stringify({campos:c.campos})});
        preencheu = Object.keys(compl).length;
      }catch(e2){}
    }
  }
  if(opc.releitura){ if(clienteAberto===cliId) repintarFicha(); return; }
  await lancarNoCaso(cliId, `${opc.dossie?"CNIS do dossiê lido pelo CRM":"CNIS inserido no CRM"}: ${lido.paginas} página(s), ${lido.vinculos} vínculo(s), `
    + (lido.indicadores.length
        ? `indicadores ${lido.indicadores.map(i=>i.codigo+(i.ocorrencias?`(${i.ocorrencias})`:"")).join(", ")}.`
        : "nenhum indicador na legenda."));
  if(clienteAberto===cliId) repintarFicha();
  aviso(`${opc.dossie?"CNIS do dossiê lido":"CNIS inserido"} — ${lido.indicadores.length} indicador(es), ${lido.vinculos} vínculo(s)${
    preencheu?` · mãe/NIT preenchidos na Identificação`:""} ✔`);
}
async function gravarDeclaracaoLida(cliId, lido, opc={}){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const t = {...triagemDe(c)};
  const linhas = lido.beneficios.map(b=>
    `NB ${b.nb} · ${b.especie||"espécie não lida"} · ${b.situacao||"situação não lida"}`
    + (b.inicio?` · início ${b.inicio}`:"") + (b.cessacao?` · cessação ${b.cessacao}`:"")
    + (b.valor?` · R$ ${b.valor}`:""));
  const ativos = lido.beneficios.filter(b=>!/CESSAD|SUSPENS|INDEFER/i.test(b.situacao||""));
  const texto = lido.beneficios.length
    ? `Lido da Declaração de Benefícios em ${fmt(hoje())}: ${lido.beneficios.length} benefício(s), `
      + `${ativos.length} em manutenção.\n` + linhas.join("\n")
    : `Lido da Declaração em ${fmt(hoje())}: nenhum benefício consta.`;
  t.beneficio = {...(t.beneficio||{}), nota: juntarNota((t.beneficio||{}).nota, texto),
                 em:hoje(), quem:eu.id};
  t.pdf = {...(t.pdf||{}), declaracao:{em:hoje(), quem:eu.id,
    beneficios:lido.beneficios.map(b=>({nb:b.nb, situacao:b.situacao})),
    ...(opc.auto ? {auto:true, anexo_id:(opc.anexo||{}).id||null} : {})}};
  if(!await salvarTriagem(cliId, t)) return aviso("Li o PDF, mas não consegui guardar");

  // o NB entra no caso quando o caso ainda não tem NB nenhum, e só então
  const ks = D.casosDoCliente.get(cliId) || [];
  const sel = casoSel && ks.find(x=>x.id===casoSel);
  const k = sel || ks.find(x=>x.fase!=="encerrado") || ks[0];
  let escreveu = "";
  // onda 1 · lida do dossiê, sem ninguém subir o PDF, o NB vira sugestão
  // no quadro "O que o dossiê já diz" e só entra no caso com o clique
  if(k && !k.nb && lido.beneficios.length && !opc.auto){
    const alvo = ativos[0] || lido.beneficios[0];
    try{
      await patchCaso(k.id, {nb:alvo.nb});
      k.nb = alvo.nb;
      escreveu = ` NB ${alvo.nb} gravado no caso.`;
    }catch(e){ escreveu = " Não consegui gravar o NB no caso."; }
  }
  await lancarNoCaso(cliId, `Declaração de Benefícios ${opc.auto?"do dossiê lida pelo CRM":"lida no CRM"}: ${lido.beneficios.length} benefício(s), `
    + `${ativos.length} em manutenção. ` + linhas.join(" | ") + "." + escreveu);
  repintarFicha();
  aviso(`Declaração lida — ${lido.beneficios.length} benefício(s) ✔`);
}
// a nota antiga não é apagada: a leitura entra acima do que já estava escrito
function juntarNota(velha, nova){
  const v = (velha||"").trim();
  return v ? nova + "\n\n" + v : nova;
}
async function lancarNoCaso(cliId, texto){
  const ks = D.casosDoCliente.get(cliId) || [];
  const sel = casoSel && ks.find(x=>x.id===casoSel);
  const k = sel || ks.find(x=>x.fase!=="encerrado") || ks[0];
  if(!k) return;
  try{
    await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({caso_id:k.id, autor_id:eu.id, texto})});
  }catch(e){}
}

// F127 · a triagem UM PASSO POR VEZ (pedido do Paulo, 20.09). Em cima, o
// botão de abrir o CNIS; depois, o que a recepção anotou (espécie e relato);
// e então os passos, um de cada vez, com a resposta que o CNIS já deu
// pré-marcada e o botão Próxima. Cada passo respondido aparece na hora na
// Análise de Direito, com o nome de quem respondeu.
function passoAtualTriagem(c, PASSOS){
  const t = triagemDe(c);
  const n = PASSOS.length;
  if(Number.isInteger(t.passo)) return Math.max(0, Math.min(n-1, t.passo));
  const i = PASSOS.findIndex(([k])=>!(t[k]||{}).feito);
  return i < 0 ? n-1 : i;
}
async function irPassoTriagem(cliId, i){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const t = {...triagemDe(c), passo:i};
  if(!await salvarTriagem(cliId, t)) return aviso("Não consegui guardar — tente de novo");
  repintarFicha();
}
// Próxima: guarda a nota, confirma o passo (estado pré-pronto vale) e
// escreve na Análise de Direito; no último passo, encerra a triagem
async function proximaTriagem(cliId, chave){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const ks = D.casosDoCliente.get(cliId) || [];
  const PASSOS = triagemPassosDe(c, ks);
  const i = PASSOS.findIndex(([k])=>k===chave);
  const el = document.getElementById("tri-"+chave);
  const nota = el ? (el.value||"").trim() : ((triagemDe(c)[chave]||{}).nota||"");
  const t = {...triagemDe(c)};
  const l = triagemLeitura(chave, c, ks);
  const atual = t[chave] || {};
  t[chave] = {...atual, nota, estado: atual.estado || l.estado || "",
              texto: [l.txt, l.det].filter(Boolean).join(" "), feito: Date.now(), em: hoje(), quem: eu.id};
  delete t[chave].auto;
  if(i >= 0 && i < PASSOS.length-1) t.passo = i+1;
  if(!await salvarTriagem(cliId, t)) return aviso("Não consegui guardar o passo — tente de novo");
  if(i === PASSOS.length-1) return fecharAtendimento(cliId);
  repintarFicha();
}
function legendaIndicadores(inds){
  return `<ul class="ind-lista">${inds.map(i=>{
    const tp = tipoIndicador(i.codigo);
    return `<li class="ind-${tp}"><span class="ind-cod">${esc(i.codigo)}</span>
      <span class="ind-tipo">${IND_TIPO_ROT[tp]}</span>
      <span>${esc(descIndicador(i.codigo, i.descricao))}${i.ocorrencias?` <span class="meio-sub">(${i.ocorrencias}×)</span>`:""}</span></li>`;
  }).join("")}</ul>`;
}
function painelTriagemFicha(c, ks){
  const t = triagemDe(c);
  const PASSOS = triagemPassosDe(c, ks);
  const fam = familiaDaTriagem(c, ks);
  const doCaso = familiaDaEspecie(especieDoCliente(c, ks));
  const porta = t.porta || null;
  const feitos = PASSOS.filter(([k])=>(t[k]||{}).feito || ((t[k]||{}).estado && !(t[k]||{}).auto)).length;
  const prox = (t.conclusao||{}).proximo || "";
  const i = passoAtualTriagem(c, PASSOS);
  const [chave, rot, , dona] = PASSOS[i];
  const p = t[chave] || {};
  const l = triagemLeitura(chave, c, ks);
  const quem = p.quem && D.colPorId.get(p.quem);
  // a resposta pré-pronta aparece marcada até alguém responder à mão
  const estadoMarcado = p.estado || (!p.feito ? (l.estado||"") : "");
  // o que a recepção registrou: a espécie e o relato
  const balcao = (!(ks||[]).filter(k=>!k.pre_caso).length && !triagemFechada(c))   // F226 · o pré-caso não é caso
    ? ((c.campos||{}).atendimento||[]).slice(-3) : [];
  const especie = especieDoCliente(c, ks) || (porta && porta.especie) || "";
  // F178 · as cores do topo: o estado gravado de cada passo respondido
  const estDe = k => { const q = t[k]||{}; return (q.feito||(q.estado&&!q.auto)) ? (q.estado||"pendente") : ""; };
  const nOk = PASSOS.filter(([k])=>estDe(k)==="ok").length;
  const nAt = PASSOS.filter(([k])=>estDe(k)==="atencao").length;
  const pct = Math.round(feitos*100/PASSOS.length);
  return `<div class="cad-cartao tri-novo">
    <section class="tri-topo" aria-label="Andamento da triagem">
      <div class="tri-topo-n"><span class="adr-tile-rot">Triagem</span>
        <span class="cad-cont${feitos===PASSOS.length?" cad-ok":""}">${feitos} de ${PASSOS.length} respondidos</span></div>
      <div class="tri-topo-barra">
        <span class="adr-barra" role="progressbar" aria-label="passos respondidos" aria-valuemin="0" aria-valuemax="${PASSOS.length}" aria-valuenow="${feitos}"><span style="width:${pct}%"></span></span>
        <span class="tri-cores">
          <span data-cor="ok"><i class="tri-bola ok"></i>${nOk} sem pendência</span>
          <span data-cor="atencao"><i class="tri-bola atencao"></i>${nAt} atenção</span>
          <span data-cor="pendente"><i class="tri-bola"></i>${PASSOS.length-nOk-nAt} não conferidos</span>
        </span>
      </div>
    </section>
    <div class="cnis-faixa">
      ${botaoAbrirCnis(c, true)}
      <span class="meio-sub">${cnisDe(c)&&cnisDe(c).caminho ? "abre em outra aba; o CRM já leu vínculos, indicadores e benefícios" : "a recepção insere o CNIS no cadastro (Identificação)"}</span>
    </div>
    ${/* onda 0 · o dossiê aparece onde ele serve, no começo da triagem */""}
    ${(h=>h?`<div class="tri-dossie">${h}</div>`:"")(caixaDossie(c) + quadroDossie(c, ks))}
    <div class="tri-balcao" style="border:1px solid var(--borda);border-left:3px solid #E9B44C;border-radius:8px;padding:8px 12px;margin:8px 0;font-size:13px">
      <b>O que a recepção registrou</b>
      <div style="margin-top:4px">Espécie: ${especie ? `<span class="chip ben">${esc(especie)}</span>` : `<span class="meio-sub">não informada</span>`}
        ${fam?`<span class="tri-especie meio-sub">· ${fam.pontos.length} pontos próprios de <b>${esc(fam.rot)}</b> entram na triagem${
          fam.ferramenta?` · <a class="tri-ferr" href="${fam.ferramenta[1]}" target="_blank" rel="noopener">${esc(fam.ferramenta[0])} ↗</a>`:""}</span>`:""}</div>
      ${balcao.map(n=>`<div style="margin-top:4px">“${esc(n.texto)}” <span class="meio-sub">— ${esc(n.quem||"?")}, ${esc(fmtTS(n.em))}</span></div>`).join("")}
      ${/* F24 · a porta: quando o CASO ainda não diz a espécie, quem atende
           responde — ou declara que não sabe, e ficam só os passos padrão. */""}
      ${doCaso ? "" : `
      <div class="tri-porta" style="margin-top:6px">
        <b>De qual caso se trata?</b>
        ${porta ? `
          <span class="chip ${porta.sei===false?"neutro":"ben"}">${
            porta.sei===false ? "ainda não sabemos" : esc(porta.especie||"?")}</span>
          <button class="cad-mini" onclick="responderPorta('${c.id}', null, null)">trocar</button>`
        : `
          <span class="tri-porta-ops">
            ${PONTOS_ESPECIE.map(f=>`<button class="tri-p" title="abre os pontos específicos de ${esc(f.rot)}"
              onclick="responderPorta('${c.id}', ${JSON.stringify(f.rot).replace(/"/g,"&quot;")}, true)">${esc(f.rot)}</button>`).join("")}
            <button class="tri-p tri-naosei" title="sem problema: ficam os passos padrão, que valem para qualquer caso"
              onclick="responderPorta('${c.id}', null, false)"><span aria-hidden="true">Indefinido</span><span class="sr-only">ainda não sei</span></button>
          </span>`}
      </div>`}
    </div>
    ${/* F178 · duas colunas: à esquerda a lista dos passos (ponto na cor da
         resposta, nome e estado; o atual em destaque), à direita o cartão do
         passo aberto. O ponto continua sendo o .tri-etapa, sem texto. */""}
    <div class="tri-cols">
    <nav class="tri-trilho tri-nav" aria-label="Passos da triagem"><ol>${PASSOS.map(([k,r],j)=>{
      const e = estDe(k);
      return `<li><button type="button" class="tri-item${j===i?" on":""}" ${j===i?`aria-current="step"`:""}
        onclick="irPassoTriagem('${c.id}',${j})"><span class="tri-etapa ${e}${j===i?" on":""}" title="${esc(r)}" aria-hidden="true"></span>
        <span class="tri-item-nome">${esc(r)}</span><span class="tri-item-est">${e?esc((TRIAGEM_ESTADOS.find(([x])=>x===e)||[,""])[1]):""}</span></button></li>`;
    }).join("")}</ol></nav>
    <div class="tri-lista tri-um">
      <section class="tri-passo${p.feito?" feito":""}" aria-labelledby="tri-passo-tit">
        <div class="tri-cab">
          <div class="tri-tit"><span class="tri-pn">Passo ${i+1} de ${PASSOS.length}</span>
            <span class="tri-tit-l" id="tri-passo-tit"><b>${esc(rot)}</b>${
            dona?`<span class="tri-de${dona==="escritório"?" tri-de-esc":""}">${esc(dona)}</span>`:""}${
            dona==="escritório"?`<button class="cad-lap" title="tirar esta pergunta de TODOS os clientes"
              onclick="event.stopPropagation();tirarPerguntaEscritorio('${chave}')">${CAD_IC.fechar}</button>`:""}</span>
            ${PASSOS[i][2]?`<p class="tri-perg">${esc(PASSOS[i][2])}</p>`:""}</div>
        </div>
        ${l.txt||l.legenda?`<div class="tri-sabe"><span class="tri-sabe-rot">O que o CRM já sabe</span>
          ${l.txt?`<div class="tri-leitura ${l.cor}">${esc(l.txt)}${
          l.det?`<span class="tri-det">${esc(l.det)}</span>`:""}</div>`:""}
          ${l.legenda ? legendaIndicadores(l.legenda) : ""}</div>`:""}
        ${chave==="cnis" ? blocoVidaContributiva(c) + blocoAcertoVinculos(c) : ""}
        ${chave==="parentes" ? blocoParentes(c, null, "tri") : ""}
        ${botaoPdfTriagem(c.id, chave)}
        ${chave==="vinculo" ? (v=>`<div class="form-linha" style="margin-top:8px;align-items:center">
          <span class="meio-sub">corrigir, se o extrato estiver defasado:</span>
          <select id="tri-vinc" onchange="document.getElementById('tri-vinc-desde-cx').style.display=this.value==='empregado'?'inline-flex':'none';salvarVinculoTriagem('${c.id}')">
            <option value="">como contribui hoje?…</option>
            <option value="empregado" ${v.tipo==="empregado"?"selected":""}>Empregado (CLT)</option>
            <option value="ci" ${v.tipo==="ci"?"selected":""}>Contribuinte individual</option>
            <option value="facultativo" ${v.tipo==="facultativo"?"selected":""}>Facultativo</option>
            <option value="especial" ${v.tipo==="especial"?"selected":""}>Segurado especial</option>
            <option value="sem" ${v.tipo==="sem"?"selected":""}>Não contribui</option>
          </select>
          <label id="tri-vinc-desde-cx" class="meio-sub" style="display:${v.tipo==="empregado"?"inline-flex":"none"};align-items:center;gap:4px">desde
            <input type="month" id="tri-vinc-desde" value="${esc(v.desde||"")}" onchange="salvarVinculoTriagem('${c.id}')"></label>
        </div>`)(t.vinculo||{}) : ""}
        ${chave==="conclusao"?`
        <div class="tri-prox">
          ${TRIAGEM_PROXIMO.map(([v,r])=>`<button class="tri-p${prox===v?" on":""}"
            onclick="marcarProximo('${c.id}','${v}')">${r}</button>`).join("")}
        </div>`:""}
        ${/* F178 · as três respostas viram botões grandes, com a linha de apoio */""}
        <div class="tri-bt" role="group" aria-label="Resposta">${TRIAGEM_ESTADOS.map(([e,r])=>
          `<button type="button" class="tri-e ${e}${estadoMarcado===e?" on":""}" aria-pressed="${estadoMarcado===e}"
            onclick="marcarTriagem('${c.id}','${chave}','${e}')"><i class="tri-bola ${e==="pendente"?"":e}" aria-hidden="true"></i>
            <span><b>${r}</b><small>${TRIAGEM_ESTADOS_SUB[e]}</small></span></button>`).join("")}</div>
        <label class="tri-obs">Observação
        <textarea class="tri-nota" id="tri-${chave}" rows="2"
          placeholder="${chave==="conclusao"?"o que foi decidido e por quê":"o que foi visto neste passo"}"
          onblur="salvarNotaTriagem('${c.id}','${chave}')">${esc(p.nota||"")}</textarea></label>
        ${p.feito?`<div class="tri-assin">respondido por ${quem?esc(quem.nome):"alguém"} · ${fmt(p.em)}</div>`:""}
        <div class="tri-prox-bt">
          ${i>0?`<button class="cad-mini" onclick="irPassoTriagem('${c.id}',${i-1})">Anterior</button>`:""}
          <button class="principal" onclick="proximaTriagem('${c.id}','${chave}')">${i===PASSOS.length-1?"Encerrar a triagem":"Próximo passo"}</button>
        </div>
      </section>
    </div>
    </div>
    ${/* F49 · o elo triagem → análise: quem está triando vê na hora se a
         análise de direito deste cliente já existe, e onde registrá-la */""}
    <div class="tri-analise">${statusAnalise(c, true)}</div>
    <div class="tri-fecho">
      <button class="cad-mini" onclick="fecharAtendimento('${c.id}')"
        title="encerra a triagem: com atenção ou não conferido, o resumo vai para as Anotações; havendo caso, uma linha no histórico dele">
        Encerrar<span class="sr-only"> a triagem</span></button>
    </div>
    ${/* F24 → F129 · a pergunta do escritório fica por último, atrás de uma
         seta, abaixo do encerrar (pedido do Paulo): vale para TODOS os
         clientes, com autor e data gravados. */""}
    <details class="tri-mais-q">
      <summary class="meio-sub">acrescentar pergunta do escritório</summary>
      <div class="tri-nova-q">
        <input id="tq-nova" placeholder="a pergunta nova — vale para todos os clientes"
          onkeydown="if(event.key==='Enter'){event.preventDefault();novaPerguntaEscritorio();}">
        <button class="cad-mini" onclick="novaPerguntaEscritorio()">acrescentar</button>
      </div>
    </details>
  </div>`;
}

// ══════════════════════════════════════════════════════════════════════════
// F17 · FECHAR O ATENDIMENTO — a triagem vira uma linha no caso
// ══════════════════════════════════════════════════════════════════════════
// A triagem fica na ficha do CLIENTE; o histórico fica no CASO. Sem este
// fecho, quem abre o processo semanas depois não vê que houve atendimento,
// nem o que foi conferido — e refaz tudo. Uma linha só, com o que decidiu.
async function fecharAtendimento(cliId){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const ks = D.casosDoCliente.get(cliId) || [];
  // `casoSel` é global e sobrevive à troca de ficha: sem conferir de quem ele
  // é, o atendimento de um cliente seria lançado no processo de outro.
  const sel = casoSel && ks.find(x=>x.id===casoSel);
  const k = sel || ks.find(x=>x.fase!=="encerrado") || ks[0] || null;
  const t = triagemDe(c);
  const PASSOS = triagemPassosDe(c, ks);
  const conferidos = PASSOS.filter(([x])=>(t[x]||{}).estado && t[x].estado!=="pendente");
  if(!conferidos.length) return aviso("Marque ao menos um passo antes de encerrar o atendimento");
  const atencao = PASSOS.filter(([x])=>(t[x]||{}).estado==="atencao");
  const faltam  = PASSOS.filter(([x])=>!(t[x]||{}).estado || t[x].estado==="pendente");
  const prox = (t.conclusao||{}).proximo || "";
  const rotProx = (TRIAGEM_PROXIMO.find(([v])=>v===prox)||[])[1];
  const fam = familiaDaEspecie(especieDoCliente(c, ks));

  const linhas = [`Atendimento — triagem conferida: ${conferidos.length} de ${PASSOS.length} passos.`];
  if(fam) linhas.push(`Espécie lida como ${fam.rot}.`);
  if(atencao.length)
    linhas.push(`Com atenção: ${atencao.map(([x,r])=>r + ((t[x]||{}).nota?` (${t[x].nota})`:"")).join("; ")}.`);
  if(faltam.length)
    linhas.push(`Ainda não conferido: ${faltam.map(([,r])=>r).join("; ")}.`);
  const notaConc = (t.conclusao||{}).nota;
  if(notaConc) linhas.push(`Conclusão: ${notaConc}`);
  // F49 · o fecho da triagem registra o elo com a análise de direito: feita
  // (com a data) ou pendente — quem ler o histórico sabe na hora
  const ultA=analisesDe(cliId)[0];
  linhas.push(ultA?`Análise de direito registrada em ${fmt(ultA.data_analise)}.`
                  :`Análise de direito: PENDENTE.`);
  linhas.push(`Próximo passo: ${rotProx || "não definido nesta triagem"}.`);

  // F24 · com atenção ou não conferido, o resumo vai para as ANOTAÇÕES do
  // cliente — leitura rápida do essencial no lugar em que o Paulo atende.
  // Sem pendência, as Anotações ficam limpas.
  if(atencao.length || faltam.length){
    const resumo = [`Triagem encerrada: ${conferidos.length} de ${PASSOS.length} passos conferidos.`]
      .concat(atencao.length?[`ATENÇÃO: ${atencao.map(([x,r])=>r+((t[x]||{}).nota?` (${t[x].nota})`:"")).join("; ")}.`]:[])
      .concat(faltam.length?[`NÃO CONFERIDO: ${faltam.map(([,r])=>r).join("; ")}.`]:[])
      .concat(ultA?[]:["Análise de direito: PENDENTE."])
      .concat(rotProx?[`Próximo passo: ${rotProx}.`]:[]).join(" ");
    const notas=[...((c.campos||{}).atendimento||[]),
      {em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0], texto:resumo, origem:"triagem"}];
    c.campos={...(c.campos||{}), atendimento:notas};
    try{ await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({campos:c.campos})}); }catch(e){}
  }
  if(k){
    try{
      await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({caso_id:k.id, autor_id:eu.id, texto:linhas.join(" ")})});
    }catch(e){ return aviso("Não consegui lançar no caso — tente de novo"); }
  }
  const t2 = {...t, atendimento:{em:hoje(), quem:eu.id, passos:PASSOS.length,
                                 conferidos:conferidos.length, proximo:prox}};
  await salvarTriagem(cliId, t2);
  // F29 · a triagem encerrada abre as Anotações e os Lembretes — sem caso,
  // a ficha já leva para a mesa do atendimento que acabou de se abrir
  if(!k){ subCad="anotacoes"; guardar("crm_subcad","anotacoes"); }
  await carregar(); montarSidebar(); repintarFicha();
  aviso(k ? `Triagem encerrada e lançada em ${tituloCaso(k)} ✔`
          : (atencao.length||faltam.length)
            ? "Triagem encerrada — as Anotações se abriram, com o resumo ✔"
            : "Triagem encerrada — as Anotações e as Aposentadorias futuras se abriram ✔");
}
async function salvarTriagem(cliId, triagem){
  const c = D.cliPorId.get(cliId); if(!c) return false;
  try{
    await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({triagem})});
    c.triagem = triagem;
    return true;
  }catch(e){
    const msg = String((e && e.message) || e);
    if(!/PGRST204|42703|does not exist|schema cache/i.test(msg)) return false;
    c.campos = {...(c.campos||{}), triagem};
    try{
      await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({campos:c.campos})});
      return true;
    }catch(e2){ return false; }
  }
}
// marcar de novo o mesmo estado desmarca: dá para voltar atrás sem apagar a nota
async function marcarTriagem(cliId, passo, estado){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const t = {...triagemDe(c)};
  const atual = t[passo] || {};
  // F127 · a resposta à mão substitui a pré-pronta e já conta como
  // respondida: entra na Análise de Direito na hora, com o nome de quem clicou
  const ks = D.casosDoCliente.get(cliId) || [];
  const l = triagemLeitura(passo, c, ks);
  t[passo] = {...atual, estado: atual.estado===estado && !atual.auto ? "" : estado,
              texto: [l.txt, l.det].filter(Boolean).join(" "), feito: Date.now(),
              em: hoje(), quem: eu.id};
  delete t[passo].auto;
  if(!await salvarTriagem(cliId, t)) return aviso("Não consegui guardar a triagem — tente de novo");
  repintarFicha();
}
async function salvarNotaTriagem(cliId, passo){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const el = document.getElementById("tri-"+passo); if(!el) return;
  const nota = (el.value||"").trim();
  const t = {...triagemDe(c)};
  const atual = t[passo] || {};
  if((atual.nota||"") === nota) return;              // sair do campo sem mexer não grava
  t[passo] = {...atual, nota, em: hoje(), quem: eu.id};
  if(!await salvarTriagem(cliId, t)) return aviso("Não consegui guardar a anotação — tente de novo");
  aviso("Triagem guardada", false);
}
async function marcarProximo(cliId, valor){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const t = {...triagemDe(c)};
  const atual = t.conclusao || {};
  t.conclusao = {...atual, proximo: atual.proximo===valor ? "" : valor, em: hoje(), quem: eu.id};
  if(!await salvarTriagem(cliId, t)) return aviso("Não consegui guardar — tente de novo");
  repintarFicha();
}

// o catálogo de documentos do benefício (era a aba 8) agora vive na divisão
// 🖨 Documentos do Cadastro — o atendimento não pula de aba para pedir papel
function catalogoNoCadastro(c, ks){
  return `
    <h3>Documentos para o INSS</h3>
    <p class="meio-sub">O catálogo completo do site interno, aqui dentro: escolha o benefício,
      confira a lista, marque os itens da atividade do cliente e solicite — imprime a lista
      e cada item vira checklist no caso, com andamento datado.</p>
    <div class="form-linha" style="align-items:center">
      <label style="font-size:12px;color:var(--cinza)">Benefício:
        <select id="doc-ben" onchange="renderDocCatalogo()">${(()=>{
          const benAtual=(casoSel&&(D.casoPorId.get(casoSel)||{}).beneficio)||"";
          const selDoc=docDe(benAtual);
          return D.docs.map(d=>`<option value="${esc(d.beneficio)}" ${selDoc&&selDoc.beneficio===d.beneficio?"selected":""}>${esc(d.beneficio)}</option>`).join("");
        })()}</select></label>
      <label style="font-size:12px;color:var(--cinza)">Aplicar em:
        <select id="doc-destino">
          ${ks.filter(x=>x.fase!=="encerrado").map(x=>`<option value="${x.id}" ${casoSel===x.id?"selected":""}>caso em andamento: ${esc(tituloCaso(x))}</option>`).join("")}
          <option value="__novo__">criar caso NOVO com este benefício</option>
        </select></label>
    </div>
    <div id="doc-conteudo"></div>
`;
}
// o site interno do escritório dentro do CRM (pedido do Paulo): contribuições,
// qualidade de segurado, espécies e indicadores do CNIS, na tela do advogado
const SITE_INTERNO = "https://advprevidenciaria.netlify.app/";
// ══════════════════════════════════════════════════════════════════════════
// F13 · CONSULTA SEM IFRAME
// ══════════════════════════════════════════════════════════════════════════
// O site interno vivia embutido numa moldura, e o resultado eram duas
// identidades visuais na mesma tela: a barra do CRM em volta e um site inteiro
// dentro, com a própria navegação, o próprio menu e a própria tipografia.
//
// A saída NÃO foi reconstruir o site. Ele tem calculadora de ruído, de IR, de
// contribuição, simulador de aposentadoria, RPPS-SP e conversores de tempo,
// que funcionam e são mantidos num lugar só. Copiá-los para cá obrigaria a
// corrigir cada regra duas vezes, e regra previdenciária muda.
//
// O que entrou aqui é o que precisa do CLIENTE ABERTO, e que a moldura nunca
// deu: o CPF desta ficha indo junto para a consulta externa, e os anexos da
// IN 128 a um clique de quem está fazendo a triagem. O resto abre em aba
// própria, sem fingir que está integrado.
// F220 · o terceiro campo é o artigo da IN 128 consolidada que cita o anexo
// (conferido em 13.10.2026); I-A, I-F e XXVII não têm artigo localizado
const ANEXOS_IN128 = [
  ["RAC Completo (Anexo I)", "AnexoI.docx", "art. 12, § 1º"],
  ["RAC Acerto de Dados (Anexo I-A)", "AnexoI-A-2.1.docx", ""],
  ["RAC Vínculos (Anexo I-B)", "AnexoI-B-2.2.docx", "art. 12, § 2º, I: empregado e doméstico"],
  ["RAC Remunerações CI (Anexo I-D)", "AnexoI-D-2.4.docx", "art. 12, § 2º, III: contribuinte individual prestador de serviço"],
  ["RAC Reconhecimento (Anexo I-E)", "AnexoI-E-2.5.docx", "art. 12, § 2º, IV: reconhecimento de filiação"],
  ["RAC Acerto de Contribuições (Anexo I-F)", "AnexoI-F-2.6.docx", ""],
  ["DTC (Anexo IV)", "AnexoIV.docx", "art. 69"],
  ["Relação de Remunerações (Anexo V)", "AnexoV.docx", "art. 69, § 2º"],
  ["Cálculo em Atraso (Anexo VII)", "AnexoVII.docx", "art. 105"],
  ["Autodeclaração Rural (Anexo VIII)", "AnexoVIII.docx", "art. 115, § 1º"],
  ["PPP (Anexo XVII)", "AnexoXVII.docx", "art. 281"],
  ["Procuração (Anexo XXII)", "AnexoXXII.docx", "art. 534, § 1º, I: procuração com a declaração de ausência"],
  ["Benefício em outro regime (Anexo XXIV)", "AnexoXXIV.docx", "art. 669: declaração de recebimento de benefício em outro regime"],
  ["Termo de Responsabilidade (Anexo XXVII)", "AnexoXXVII.docx", ""],
  ["Termo de Compromisso (Anexo XXIX)", "AnexoXXIX.docx", "art. 527, § 7º: administrador provisório"],
];
const IN128_BASE = "https://portalin.inss.gov.br/assets/anexos/in/";
// as ferramentas que continuam morando no site interno, cada uma com o que
// ela faz. Os rótulos são os do próprio site, não descrição inventada.
const FERRAMENTAS_SITE = [
  "Calculadora de ruído (NEN, NHO-01 e NR-15 Anexo 1)",
  "Calculadora de IR sobre aposentadoria",
  "Simulador de aposentadoria",
  "Contribuições e qualidade de segurado",
  "Simulador RPPS-SP",
  "Conversores de tempo (especial e deficiência)",
  "Indicadores do CNIS",
  "Espécies de benefício",
  "Mínimo e teto",
  "Padrão de digitalização",
  "Publicações OAB/SP",
];
// leva o CPF desta ficha junto: é o que a moldura nunca fez
async function consultaComCpf(cliId, url, onde){
  const c = D.cliPorId.get(cliId);
  const cpf = digitosCpf((c||{}).cpf||"");
  if(!cpf) return aviso("Este cliente ainda não tem CPF no cadastro");
  await copiar(fmtCpf(cpf), `CPF copiado — cole na busca do ${onde}`);
  window.open(url, "_blank", "noopener");
}
function painelConsulta(c){
  const temCpf = !!(c && c.cpf);
  const ext = [
    ["TSE", "https://www.tse.jus.br/servicos-eleitorais/titulo-e-local-de-votacao/consulta-por-titulo", "título de eleitor e biometria"],
    ["Receita Federal", "https://servicos.receita.fazenda.gov.br/servicos/cpf/consultasituacao/consultapublica.asp", "situação cadastral do CPF"],
    ["Meu INSS", "https://meu.inss.gov.br/", "o portal do segurado"],
    ["SAL", "https://sal.rfb.gov.br/", "gerar a guia da GPS"],
  ];
  return `
    <div class="cad-cartao">
      <div class="cad-tit"><span class="cad-ic">${CAD_IC.tela}</span>Consultas com o CPF deste cliente
        <span class="cad-tit-sub">o CPF vai copiado; é só colar na busca do portal</span></div>
      <div class="form-linha" style="flex-wrap:wrap">
        ${ext.map(([rot,url,oque])=>`<button class="cad-mini" title="${esc(oque)}"
          ${temCpf?`onclick="consultaComCpf('${c.id}','${url}','${esc(rot)}')"`:"disabled"}
          >${esc(rot)}</button>`).join("")}
      </div>
      ${temCpf?"":`<p class="cad-nota">Sem CPF no cadastro, não há o que copiar. Preencha na
        divisão Identificação e estes botões acendem.</p>`}
    </div>

    <div class="cad-cartao">
      <div class="cad-tit"><span class="cad-ic">${CAD_IC.doc}</span>Anexos da IN 128/2022
        <span class="cad-tit-sub">os formulários oficiais, direto do portal do INSS</span></div>
      <p class="cad-nota" style="margin:0 0 9px">O acerto do CNIS tem um anexo certo para cada
        tipo de erro. Baixar o errado devolve a exigência semanas depois.</p>
      <div class="form-linha" style="flex-wrap:wrap">
        ${ANEXOS_IN128.map(([rot,arq,art])=>`<a class="cad-mini" style="text-decoration:none"
          href="${IN128_BASE}${arq}" target="_blank" rel="noopener" title="${esc(art ? "IN 128, "+art : "sem artigo da IN 128 localizado que cite este anexo")}">${esc(rot)}</a>`).join("")}
      </div>
      <p class="cad-nota"><a href="https://portalin.inss.gov.br/anexos" target="_blank"
        rel="noopener">Ver todos os anexos no portal</a></p>
    </div>

    <div class="cad-cartao">
      <div class="cad-tit"><span class="cad-ic">${CAD_IC.engren}</span>Site interno do escritório
        <span class="cad-tit-sub">abre em aba própria, com a navegação dele</span></div>
      <p class="cad-nota" style="margin:0 0 9px">Estas ferramentas não foram copiadas para cá de
        propósito: regra previdenciária muda, e duas cópias da mesma conta significam corrigir
        cada mudança duas vezes.</p>
      <ul class="lista-simples">${FERRAMENTAS_SITE.map(f=>`<li>${esc(f)}</li>`).join("")}</ul>
      <div class="form-linha" style="margin-top:10px">
        <a class="btn-mini" style="text-decoration:none" href="${SITE_INTERNO}"
          target="_blank" rel="noopener">Abrir o site interno</a>
      </div>
    </div>`;
}


// aba 3 da ficha — extraída da pintarFicha (era um literal de 22 linhas)
function painelPericiasFicha(c, ks, evs){
  const form = `<div class="form-linha">
      <select id="ne-tipo"><option>Perícia</option><option>Audiência</option><option>Avaliação social</option></select>
      <select id="ne-caso">${ks.map(k=>`<option value="${k.id}">${esc(tituloCaso(k)+" · "+(NOME_FASE[k.fase]||""))}</option>`).join("")}</select>
      <input type="date" id="ne-data"><input type="time" id="ne-hora" value="09:00">
      <input id="ne-local" list="per-locais-ev" placeholder="endereço: rua, número e cidade"><datalist id="per-locais-ev">${Object.values(PER_LOCAIS).map(v=>`<option value="${esc(v)}">`).join("")}</datalist><button onclick="novoEvento()">Agendar</button>
    </div>`;
  if(temaV10()){
    // as futuras primeiro (a mais próxima no alto), depois as passadas (a mais recente no alto)
    const h = hoje(), fut = evs.filter(e=>dataSP(e.data_hora)>=h).sort((x,y)=>x.data_hora<y.data_hora?-1:1),
      pas = evs.filter(e=>dataSP(e.data_hora)<h).sort((x,y)=>x.data_hora<y.data_hora?1:-1);
    // F236 · a que passou e segue "agendada" pergunta "aconteceu?" num bloco próprio; a que só o processo conhece vem no alto
    const pede = e => e.status==="agendada" && (D.casoPorId.get(e.caso_id)||{}).fase!=="encerrado";   // caso encerrado não pergunta
    const conf = pas.filter(pede), ant = pas.filter(e=>!pede(e));
    const proc = periciasDoProcesso((D._andsFicha||[]).filter(a=>ks.some(k=>k.id===a.caso_id)), true);
    const nAg = fut.filter(e=>e.status==="agendada").length;
    return `${faixaDoCaso(ks)}<div class="per-topo"><div><h2 class="adr-h">Perícias e audiências</h2>
        <span class="adr-sub">${nAg} agendada${nAg===1?"":"s"}${conf.length?` · ${conf.length} a confirmar`:""}${proc.length?` · ${proc.length} no processo, a agendar`:""} · ${ant.length} anterior${ant.length===1?"":"es"}</span></div>
        <details class="per-novo"${evs.length||proc.length?"":" open"}><summary class="adr-bt adr-primario">+ perícia</summary>${form}</details></div>
      ${proc.length?`<h3 class="per-sub">Marcada no processo, sem agendamento</h3><ul class="timeline tl-per">${proc.map(cartaoDoProcesso).join("")}</ul>`:""}
      ${fut.length?`<ul class="timeline tl-per">${fut.map(cartaoPericia).join("")}</ul>`:proc.length||conf.length?"":`<p class="meio-sub">Nenhuma perícia ou audiência marcada.</p>`}
      ${conf.length?`<h3 class="per-sub">Aconteceu? Confirme</h3><ul class="timeline tl-per">${conf.map(cartaoPericia).join("")}</ul>`:""}
      ${ant.length?`<h3 class="per-sub">Anteriores</h3><ul class="timeline tl-per">${ant.map(cartaoPericia).join("")}</ul>`:""}`;
  }
  return `
    ${evs.map(e=>`<div class="evento ${dataSP(e.data_hora)<hoje()?"passado":"futuro"}${dataSP(e.data_hora)<hoje()&&e.status==="agendada"?" confirmar":""}${e.status==="cancelada"?" cancelada":""}">
      <div class="data-box">${fmtTS(e.data_hora).slice(0,5)}<small>${dataSP(e.data_hora).slice(0,4)}</small><small>${horaSP(e.data_hora)}</small></div>
      <div class="oque"><strong>${esc(e.tipo)}</strong><span>${esc([e.local,e.obs].filter(Boolean).join(" · "))} · ${esc(nomeStatusEvento(e.status))}</span></div>
      ${dataSP(e.data_hora)>=hoje()?`
        ${evAvisado(e)?`<span class="chip neutro" title="o cliente já foi avisado deste agendamento">📞 avisado ✓</span>`
          :e.status==="agendada"?`<button class="btn-mini" onclick="janelaAvisado('${e.id}')"
            title="registrar que o cliente foi avisado — e se agendou o atendimento presencial de preparação">📞 avisado</button>`:""}
        <button class="btn-mini" onclick="copiarLembrete('${e.id}')" title="💬 copiar lembrete"><span aria-hidden="true">💬 Copiar</span><span class="sr-only">💬 copiar lembrete</span></button>
        ${c.telefone?`<a class="btn-mini" target="_blank" rel="noopener" href="#" onclick="event.preventDefault();zapLembrete('${e.id}')" style="text-decoration:none" title="mandar o lembrete pelo WhatsApp">${iconeFonte("zap")}</a>`:""}
        <a class="btn-mini" target="_blank" rel="noopener" style="text-decoration:none"
           href="${gcal(e.tipo+" — "+esc(c.nome), dataSP(e.data_hora), horaSP(e.data_hora), 90, "", e.local||"")}" title="pôr no Google Agenda">${iconeFonte("gcal")}</a>
        ${e.status==="agendada"?`<button class="btn-mini" onclick="cancelarEvento('${e.id}')"
           title="desmarcada, remarcada ou lançada errada (ex.: ano trocado) — some das listas; a ficha guarda como cancelada">✕ cancelar</button>`:""}`
      :e.status==="agendada"?`
        ${botoesDoPassado(e)}
        <button class="btn-mini" onclick="cancelarEvento('${e.id}')"
           title="lançada errada (ex.: ano trocado) — some das listas">✕</button>`:""}
      </div>`).join("")}
    <div class="form-linha">
      <select id="ne-tipo"><option>Perícia</option><option>Audiência</option><option>Avaliação social</option></select>
      <select id="ne-caso">${ks.map(k=>`<option value="${k.id}">${esc(tituloCaso(k)+" · "+(NOME_FASE[k.fase]||""))}</option>`).join("")}</select>
      <input type="date" id="ne-data"><input type="time" id="ne-hora" value="09:00">
      <input id="ne-local" list="per-locais-ev" placeholder="endereço: rua, número e cidade"><datalist id="per-locais-ev">${Object.values(PER_LOCAIS).map(v=>`<option value="${esc(v)}">`).join("")}</datalist><button onclick="novoEvento()">Agendar</button>
    </div>`;
}

// aba 4 da ficha — extraída da pintarFicha (era um literal de 50 linhas)
// DE QUE BENEFÍCIO É ESTE DINHEIRO. Com um caso só não há dúvida — o vínculo
// aparece como etiqueta. Com dois ou mais, a escolha é do escritório: a
// importação do To Do deixa a parcela sem caso de propósito (chutar o
// "principal" contabilizaria honorário no benefício errado) e aqui vem o
// seletor, destacado enquanto ninguém escolheu.
function vinculoDaParcela(p, ks){
  const casos=(ks||[]).filter(k=>k.fase!=="pagamento");
  if(!casos.length) return "";
  if(casos.length===1){
    const k=casos[0];
    // um caso só: dizer o benefício em toda linha só repetia o título do caso
    return p.caso_id===k.id ? ""
      : `<button class="btn-mini" title="vincular este pagamento ao caso do cliente"
           onclick="vincularPgto('${p.id}','${k.id}')">vincular a ${esc(tituloCaso(k))}</button>`;
  }
  const semCaso=!p.caso_id;
  // F236 · a sugestão: a irmã da mesma série já presa a um caso ("… parcela 2/3"), ou a espécie citada na descrição
  const sug = semCaso && D.casoPorId.get(sugestaoDeCaso(p, casos));
  return `<select class="pg-caso ${semCaso?"falta":""}" title="benefício/serviço a que este pagamento se refere"
      onchange="vincularPgto('${p.id}', this.value)">
    <option value="" ${semCaso?"selected":""}>— de qual benefício? —</option>
    ${casos.map(k=>`<option value="${k.id}" ${p.caso_id===k.id?"selected":""}>${esc(tituloCaso(k))}${k.fase==="encerrado"?" (encerrado)":""}</option>`).join("")}
  </select>${sug?` <button class="btn-mini" title="a série desta parcela ou a espécie citada nela aponta este caso"
      onclick="vincularPgto('${p.id}','${sug.id}')">é de ${esc(tituloCaso(sug))}${sug.fase==="encerrado"?" (encerrado)":""}?</button>`:""}`;
}
