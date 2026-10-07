// DOSSIÊ · MEU INSS — tudo o que o cidadão logado consegue baixar, num clique.
//
// Mapeado em 07.10.2026 no código do próprio Meu INSS (static/js) e conferido
// ao vivo numa sessão gov.br: as telas chamam a API com o crachá que já está
// no localStorage (`ifs_auth`, o JWT do gov.br; `sub` é o CPF, `name` o nome)
// e o `miToken`, que carrega a lista de benefícios (nbsJson.listaBeneficios).
// A extensão faz as MESMAS chamadas, com a mesma sessão. Nada de login.
//
// CONFERIDO ao vivo (conta sem benefício): CNIS ×3, declaração, lista de
// pedidos e cópia integral do processo (PAP). SÓ PELO CÓDIGO, falta conta com
// dado para ver funcionar: carta de concessão, laudo, extrato de pagamento,
// PPP e CAT — se o formato divergir, o item falha sozinho e o resumo diz qual.
//
// O extrato de pagamento PODE pedir captcha (o próprio Meu INSS liga e desliga
// isso por parâmetro). A extensão não resolve captcha: avisa e segue.
(() => {
  if (window !== window.top) return;
  const R = window.DOSSIE_REGRAS, D = window.DOSSIE;
  const API = 'https://vip-pmeuinss-api.inss.gov.br/apis/';
  const ARQ = 'https://vip-pmeuinss-arq.inss.gov.br/apis/';   // SagService (pedidos)

  window.dossieRodar = async () => {
    const tok = localStorage.getItem('ifs_auth');
    const quem = R.jwt(tok);
    if (!quem || !quem.sub) { D.faixa('não achei a sessão do Meu INSS — entre com o gov.br e clique de novo', '#B3261E'); return { erro: 'sem sessão' }; }
    const cliente = { cpf: String(quem.sub).replace(/\D/g, ''), nome: quem.name || '' };
    const cpf = cliente.cpf;
    await chrome.storage.local.set({ cliente });           // o e-Recursos usa para filtrar e nomear a pasta

    const cab = { Accept: 'application/json', Authorization: 'Bearer ' + tok,
      miToken: localStorage.getItem('miToken') || '', userId: localStorage.getItem('userId') || '',
      sessionId: sessionStorage.getItem('sessionId') || '' };
    const pedir = async (url, opts) => {
      const r = await fetch(url, Object.assign({ headers: cab }, opts));
      await D.pausa(1500);                                 // o portal é do INSS: uma chamada por vez, com folga
      return r;
    };
    const json = async url => { const r = await pedir(url); return r.ok ? r.json() : null; };

    const ok = [], falhas = [], inexistentes = [];
    // baixa um PDF e entrega; nunca derruba a rodada.
    // 404, ou 200 com mensagem em vez de PDF, é o INSS dizendo que o documento
    // não existe (benefício sem perícia não tem laudo; nem toda espécie tem
    // carta) — vai para "não existem", com a frase do INSS, e não para falha
    async function pdf(fonte, arquivo, url, opts) {
      D.faixa(`${fonte}: ${arquivo}…`);
      try {
        const r = await pedir(url, opts);
        const buf = await r.arrayBuffer();
        const u8 = r.ok ? R.comoPdf(buf) : null;
        if (!u8) {
          const msg = R.mensagemDoPortal(buf);
          if (r.status === 404 || (r.ok && msg)) inexistentes.push(`${fonte} · ${arquivo}${msg ? `: ${msg}` : ''}`);
          else falhas.push(`${fonte} · ${arquivo}: ${r.ok ? 'o portal não devolveu PDF' : `HTTP ${r.status}`}${msg ? ` — ${msg}` : ''}`);
          return;
        }
        const s = await D.salvar(cliente, fonte, arquivo, u8);
        ok.push(`${fonte} · ${arquivo}${s.crm && s.crm !== 'ok' ? ` (CRM: ${s.crm})` : ''}`);
      } catch (e) { falhas.push(`${fonte} · ${arquivo}: ${e.message || e}`); }
    }
    // primeira lista de objetos dentro da resposta, qualquer que seja o nome do campo
    const lista = j => Array.isArray(j) ? j
      : (j && typeof j === 'object' ? Object.values(j).find(v => Array.isArray(v) && v.some(x => x && typeof x === 'object')) || [] : []);

    // ── CNIS: os três extratos da tela ──────────────────────────────────────
    await pdf('CNIS', 'CNIS completo (com remuneracoes)', `${API}extratocnisservices/v2/remuneracoesPdf/${cpf}`);
    await pdf('CNIS', 'CNIS resumido (vinculos)', `${API}extratocnisservices/v2/vinculosPdf/${cpf}`);
    await pdf('CNIS', 'CNIS ano civil', `${API}extratocnisservices/anocivilPdf/${cpf}`);

    // ── Declaração de beneficiário (nada consta) ────────────────────────────
    await pdf('Declaracao', 'Declaracao de beneficiario', `${API}declaracaoBeneficioServices/declaracaoBeneficioPdf/${cpf}`);

    // ── Por benefício: carta de concessão e laudo médico ────────────────────
    let nbs = [];
    try {
      const mi = R.jwt(localStorage.getItem('miToken'));
      const lb = JSON.parse((mi && mi.nbsJson) || '{}').listaBeneficios || [];
      nbs = [...new Set(lb.map(b => String(b.numero || '').replace(/\D/g, '')).filter(Boolean))];
    } catch (e) {}
    for (const nb of nbs) {
      await pdf('Cartas de concessao', `Carta de concessao NB ${nb}`, `${API}calculoBeneficioServices/concalPdf/${nb}`);
      await pdf('Laudos', `Laudo medico NB ${nb}`, `${API}laudomedicoservices/pdf/${nb}`);
    }

    // ── Extrato de pagamento: últimos 12 meses (é por CPF, não por NB) ──────
    if (nbs.length) {
      const [ini, fim] = R.janela12Meses();
      await pdf('Extrato de pagamento', `Extrato de pagamento ${ini} a ${fim}`, `${API}hiscreServices/historicocreditosPdf/${cpf}/${ini}/${fim}`);
    }

    // ── Pedidos: TODOS (a tela filtra por ano; a API devolve a lista inteira)
    // e de cada um a cópia integral do processo administrativo (PAP)
    D.faixa('lendo a lista de pedidos…');
    const tarefas = lista(await json(`${ARQ}SagService/tarefa`).catch(() => null));
    for (const t of tarefas) {
      if (!t || !t.protocolo) continue;
      const data = String(t.dataCriacao || '').slice(0, 10);
      await pdf('Processos administrativos', `${data} ${t.protocolo} ${t.nomeServico || t.siglaServico || ''}`,
        `${API}consolidadorservices/pap/${t.protocolo}`);
    }

    // ── PPP eletrônico (obrigatório só desde 01/2023): a tela lista
    // listaVinculosTO e manda o vínculo inteiro no POST, como aqui ────────────
    const vinculos = ((await json(`${API}declaracaoPppServices/obterDadosVinculos/`).catch(() => null)) || {}).listaVinculosTO || [];
    for (const [i, v] of vinculos.entries()) {
      const rotulo = `${v.nomeVinculo || v.codigoVinculo || `vinculo ${i + 1}`} ${String(v.dataInicio || '').slice(0, 10)}`;
      await pdf('PPP', `PPP ${rotulo}`, `${API}declaracaoPppServices/gerarDeclaracao/`,
        { method: 'POST', headers: Object.assign({}, cab, { 'Content-Type': 'application/json' }), body: JSON.stringify(v) });
    }

    // ── CAT ─────────────────────────────────────────────────────────────────
    const cats = lista(await json(`${API}catservices/cat/${cpf}`).catch(() => null));
    for (const c of cats) {
      const n = String(c.numeroCat || '').replace(/\D/g, '');
      if (n) await pdf('CAT', `CAT ${n}`, `${API}catservices/catPdf/${cpf}/${n}`);
    }

    const resumo = `${ok.length} documento(s) baixado(s)`
      + ` · ${nbs.length} benefício(s) · ${tarefas.length} pedido(s) · ${vinculos.length} vínculo(s) PPP · ${cats.length} CAT`
      + (inexistentes.length ? `\n${inexistentes.length} não existem no INSS:\n• ${inexistentes.slice(0, 8).join('\n• ')}` : '')
      + (falhas.length ? `\n${falhas.length} falharam:\n• ${falhas.slice(0, 8).join('\n• ')}` : '');
    D.faixa(resumo, falhas.length ? '#9A6700' : '#1E6F50');
    return { ok: ok.length, falhas };
  };
})();
