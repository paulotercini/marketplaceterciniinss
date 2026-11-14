// A PONTE DO PAT — roda no lado da extensão e dá as duas mãos.
//
// De um lado, injeta o coletor dentro da página (só lá ele enxerga o
// fetch/XHR do portal). Do outro, faz o que a página não pode: falar com o
// CRM, guardar a data da última coleta, desenhar a faixa.
//
// A injeção do coletor é por tag <script>, do jeito antigo: declarar o
// coletor no manifesto com "world": "MAIN" seria mais direto, mas um
// navegador que não conhece essa chave recusa o manifesto INTEIRO — e a
// extensão não carrega, sem uma linha no console para explicar.
//
// Este arquivo é reinjetado a cada clique no botão, então tudo tem guarda de
// "já rodei". É de propósito: assim o botão funciona mesmo quando o
// carregamento automático do script não acontece, seja qual for o motivo.

if (!window.__crmPontePat) {
  window.__crmPontePat = true;

  console.log('%c[CRM]', 'color:#2B5FC7;font-weight:700',
              'extensão no ar nesta página (ponte do PAT).');

  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('pat-pagina.js');
  s.onload = () => s.remove();
  s.onerror = () => faixaErr('não consegui injetar o coletor nesta página');
  (document.head || document.documentElement).appendChild(s);

  window.addEventListener('message', async ev => {
    const m = ev.data;
    if (ev.source !== window || !m || m.de !== 'crm-pat') return;

    if (m.tipo === 'oi') {
      window.__crmColetorNoAr = true;
      console.log('%c[CRM]', 'color:#2B5FC7;font-weight:700', 'coletor confirmado dentro da página.');
    }
    if (m.tipo === 'faixa') { faixa(m.texto, m.cor); if (/✔/.test(m.texto)) someFaixa(); }
    if (m.tipo === 'entregar') {
      // DUAS ENTREGAS: situação, exigência e decisão vão ao CRM já (etapa
      // 'detalhes'); os anexos descem depois, a 3 s cada, e a mesma coleta vai
      // de novo com `arquivos` (etapa 'anexos'). Antes, aba fechada no meio dos
      // anexos perdia a coleta inteira.
      let soAnexos = false;
      try {
        m.dados.etapa = 'detalhes';
        await CRM.enviar('pat', m.dados);
        soAnexos = true;
        let a = { faltam: 0, parou: null };
        // com barreira, o portal acabou de recusar: os anexos ficam para a próxima
        if (!m.barreira) {
          a = await guardarAnexosPat(m.dados.detalhes || [], m.cracha);
          m.dados.etapa = 'anexos';
          await CRM.enviar('pat', m.dados);
        }
        // a data só anda com a rodada fechada: com portal recusando ou detalhe
        // que ainda pode vir, a busca seguinte tem de cobrir a mesma janela.
        // Falha permanente de um protocolo (404, ou a mesma pela segunda vez)
        // não segura: congelava a data para sempre e a janela só crescia.
        const semDetalhe = (m.dados.falhas || []).length;
        const { pat_falhou } = await chrome.storage.local.get(['pat_falhou']);
        const parado = !!(m.barreira || a.parou);
        const fechou = !parado && !falhasQueSeguramPat(m.dados.falhas, pat_falhou).length;
        if (fechou) await chrome.storage.local.set({ ultima_pat: m.quando, pat_falhou: [] });
        // na barreira a recusa é do portal, não do protocolo: não conta como repetida
        else if (!parado) await chrome.storage.local.set({ pat_falhou: (m.dados.falhas || []).map(f => String(f.protocolo)) });
        window.postMessage({ de: 'crm-ponte', tipo: 'entregue', quantos: m.quantos, semDetalhe, faltam: a.faltam, fechou,
          barreira: !!(m.barreira || a.parou), venceu: !!m.venceu || a.parou === 401 || a.parou === 403 }, '*');
      } catch (e) {
        window.postMessage({ de: 'crm-ponte', tipo: 'falhou', soAnexos, erro: String(e.message || e) }, '*');
      }
    }
  });
}

// Os protocolos cuja falha de detalhe ainda segura a `ultima_pat`: só a
// transitória (sem resposta, 401/403/429, 5xx) e só na primeira vez; `antes`
// são os que já falharam na rodada anterior.
function falhasQueSeguramPat(falhas, antes) {
  const ja = new Set((antes || []).map(String));
  return (falhas || []).filter(f => (f.status == null || [401, 403, 429].includes(f.status) || f.status >= 500) &&
                                    !ja.has(String(f.protocolo))).map(f => String(f.protocolo));
}

// F184 · TODOS OS ANEXOS DO REQUERIMENTO vão para o bucket privado (decisão do
// Paulo, 05.10.2026 — inclusive laudo médico: no CRM eles continuam internos,
// nunca atravessam para o portal do cliente). O portal devolve o arquivo em
// BASE64 no corpo (medido ao vivo: "JVBE…" = "%PDF"), por
//   GET /apis/arquivosPortalApi/tarefa/{protocolo}/anexo/{id}
// com o mesmo crachá da lista. Três segundos entre downloads: é o limite de
// velocidade do portal, o mesmo do detalhe. (`var`: este arquivo é
// reinjetado a cada clique, e `const` declarado duas vezes derruba o arquivo)
var TIPO_POR_EXT = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };
// O crachá capturado na lista vale; só no 401 tenta UMA vez com o ifs_auth de
// agora (o token gira no meio da rodada, como no e-Recursos na 1.33.1). Se o
// crachá já era esse token, a sessão venceu mesmo e não há segunda chamada.
async function pedirPat(url, cab, dono) {
  const r = await fetch(url, { credentials: 'include', headers: cab });
  const tok = localStorage.getItem('ifs_auth');
  if (r.status !== 401 || !tok) return r;
  const novo = {};
  let era = null;
  for (const k of Object.keys(cab)) { if (/^authorization$/i.test(k)) era = cab[k]; else novo[k] = cab[k]; }
  if (era === 'Bearer ' + tok) return r;
  novo.Authorization = 'Bearer ' + tok;
  const r2 = await fetch(url, { credentials: 'include', headers: novo });
  // F590: guarda o crachá novo na rodada, senão todo pedido seguinte sai em dobro (401 + repetição) e dobra o ritmo ao portal
  if (r2.status !== 401) for (const o of [cab, dono]) if (o) {
    for (const k of Object.keys(o)) if (/^authorization$/i.test(k)) delete o[k];
    o.Authorization = novo.Authorization;
  }
  return r2;
}
async function baixarAnexoPat(protocolo, d, cracha) {
  const tok = localStorage.getItem('ifs_auth');
  const r = await pedirPat(`/apis/arquivosPortalApi/tarefa/${protocolo}/anexo/${d.id}`,
    cracha || (tok ? { Authorization: 'Bearer ' + tok } : {}));
  if (!r.ok) return r;
  let b64 = (await r.text()).trim();
  if (b64.startsWith('"')) b64 = JSON.parse(b64);
  const bin = Uint8Array.from(atob(b64.replace(/\s+/g, '')), c => c.charCodeAt(0));
  const ext = (String(d.arquivo || d.nome).match(/\.(\w+)$/) || [])[1];
  return new Response(bin, { headers: { 'content-type': TIPO_POR_EXT[String(ext).toLowerCase()] || 'application/octet-stream' } });
}
// F329 · O PROCESSO INTEIRO EM PDF: é o botão "Baixar Processo" da tarefa
// (micro-frontend de tarefas do PAT, lido em 31.10.2026):
//   GET /apis/consolidador[EC]Api/pap/metadados?protocolo=&sistema=PAT&cpf=&nome=&async=false
// devolve JSON com o PDF em base64 em `relatorio`. O perfil de entidade usa
// consolidadorECApi, o de servidor consolidadorApi: tenta os dois. Com
// `emissaoAssincrona` o INSS só enfileira e não manda PDF: fica para a próxima.
function quemEstaLogado() {
  try {
    const j = JSON.parse(atob(String(localStorage.getItem('ifs_auth') || '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return { cpf: String(j.sub || j.cpf || '').replace(/\D/g, ''), nome: j.name || j.nome || '' };
  } catch (e) { return { cpf: '', nome: '' }; }
}
async function baixarPapPat(protocolo, cracha) {
  const tok = localStorage.getItem('ifs_auth'), srv = localStorage.getItem('srv_auth');
  const cab = Object.assign({ Accept: 'application/json' },
    cracha || (tok ? { Authorization: 'Bearer ' + tok } : {}), srv ? { tokenServidor: srv } : {});
  const eu = quemEstaLogado();
  const q = `protocolo=${protocolo}&sistema=PAT&cpf=${eu.cpf}&nome=${encodeURIComponent(eu.nome)}&async=false`;
  let r;
  for (const api of ['consolidadorECApi', 'consolidadorApi']) {
    r = await pedirPat(`/apis/${api}/pap/metadados?${q}`, cab, cracha);
    if (r.ok) break;
  }
  if (!r.ok) return r;
  const j = await r.json().catch(() => ({}));
  if (!j.relatorio) return new Response(null, { status: 409 });   // assíncrono ou sem PDF: não é documento
  const bin = Uint8Array.from(atob(String(j.relatorio).replace(/\s+/g, '')), c => c.charCodeAt(0));
  return new Response(bin, { headers: { 'content-type': 'application/pdf' } });
}
// O concluído não muda mais; o que corre ganha a situação no nome, para o
// PDF ser baixado de novo quando a situação andar.
function docDoProcessoInteiro(det) {
  const st = String(det.status || '').trim();
  const fim = /conclu|cancel/i.test(st);
  const id = fim ? 'processo-integral' : `processo-integral-${st.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'em-curso'}`;
  return { id, arquivo: `${id}.pdf`, pap: true,
           // F416 · antes de concluir, o "Baixar Processo" dá só as Informações da Tarefa
           nome: fim || !st ? 'Processo administrativo integral.pdf' : `Cópia parcial (${st}).pdf` };
}

// devolve { n, faltam, parou }: quantos ficaram guardados, quantos anexos não
// desceram e, se o portal recusou 3 seguidos, o status (os demais protocolos
// ficam para a próxima rodada)
async function guardarAnexosPat(detalhes, cracha) {
  let n = 0, faltam = 0, parou = null;
  for (const det of detalhes) {
    const p = String(det.protocolo || '').replace(/\D/g, '');
    const docs = (det.anexos || []).filter(a => a && a.id)
      // o nome do arquivo + o que o INSS diz que ele é ("Documento Médico")
      .map(a => ({ id: String(a.id), arquivo: a.nomeArquivo || '',
                   nome: [a.nomeArquivo, a.descricaoArquivo && `(${a.descricaoArquivo})`].filter(Boolean).join(' ') || 'anexo' }));
    if (!p) continue;
    docs.unshift(docDoProcessoInteiro(det));
    faixa(`guardando os anexos do INSS no CRM (${n} até aqui)…`);
    // a pasta listada de uma vez: sem isso era uma ida ao banco por anexo
    let existentes = null;
    try { existentes = new Set((await CRM.pedir({ tipo: 'crm', acao: 'docs-existentes', prefixo: `pat/${p}/` })).nomes); } catch (e) {}
    const falhas = [];
    n += await CRM.guardarDocs('pat', p, docs, { todos: true, pausaMs: 3000, pausaDesdeDownload: true, existentes,
                                                 falhas, pararEm: 3,
                                                 baixar: d => d.pap ? baixarPapPat(p, cracha) : baixarAnexoPat(p, d, cracha) });
    det.arquivos = docs.filter(d => d.caminho);
    // o PDF do processo que o INSS só enfileirou (409) é rotina, não falta
    faltam += falhas.filter(f => !(f.status === 409 && /^processo-integral/.test(f.id))).length;
    if (falhas.parou) { parou = falhas.parou; break; }
  }
  return { n, faltam, parou };
}

// o botão do popup chama isto. Espera o coletor se anunciar — quando a
// injeção acabou de acontecer, ele leva um instante para subir.
window.crmRodar = async (desde) => {
  for (let i = 0; i < 25 && !window.__crmColetorNoAr; i++) await new Promise(r => setTimeout(r, 100));
  if (!window.__crmColetorNoAr)
    return { erro: 'o coletor não subiu nesta página — o portal pode estar bloqueando o script' };

  const resposta = new Promise(resolve => {
    const ouvir = ev => {
      if (ev.source !== window || !ev.data || ev.data.de !== 'crm-pat') return;
      if (ev.data.tipo !== 'pronto') return;
      window.removeEventListener('message', ouvir);
      resolve({ esperando: ev.data.esperando, jaTinha: ev.data.jaTinha });
    };
    window.addEventListener('message', ouvir);
    setTimeout(() => { window.removeEventListener('message', ouvir);
                       resolve({ erro: 'o coletor não respondeu' }); }, 4000);
  });
  window.postMessage({ de: 'crm-ponte', tipo: 'rodar', desde }, '*');
  return resposta;
};
