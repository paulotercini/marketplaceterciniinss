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

  window.dossieRodar = async (opcoes = {}) => {
    const tok = localStorage.getItem('ifs_auth');
    const quem = R.jwt(tok);
    if (!quem || !quem.sub) { D.faixa('não achei a sessão do Meu INSS — entre com o gov.br e clique de novo', '#B3261E'); return { erro: 'sem sessão' }; }
    const cliente = { cpf: String(quem.sub).replace(/\D/g, ''), nome: quem.name || '' };
    const cpf = cliente.cpf;
    await chrome.storage.local.set({ cliente });           // o e-Recursos usa para filtrar e nomear a pasta

    const cab = { Accept: 'application/json', Authorization: 'Bearer ' + tok,
      miToken: localStorage.getItem('miToken') || '', userId: localStorage.getItem('userId') || '',
      sessionId: sessionStorage.getItem('sessionId') || '' };
    // o portal é do INSS: uma chamada por vez, com 1,5 s de folga contados da resposta
    // (a gravação do arquivo corre dentro da folga). O gov.br troca o ifs_auth e o
    // miToken no meio da rodada: cada pedido relê os dois, também no cabeçalho do POST
    const fila = R.filaDePedidos(D.pausa);
    const pedir = (url, opts) => fila(1500, () => {
      cab.Authorization = 'Bearer ' + (localStorage.getItem('ifs_auth') || tok);
      cab.miToken = localStorage.getItem('miToken') || cab.miToken;
      const o = Object.assign({ headers: cab }, opts);
      if (opts && opts.headers) o.headers = Object.assign({}, opts.headers, { Authorization: cab.Authorization, miToken: cab.miToken });
      return fetch(url, o);
    });

    const ok = [], falhas = [], inexistentes = [];
    // baixa um PDF e entrega; nunca derruba a rodada.
    // 404, ou 200 com mensagem em vez de PDF, é o INSS dizendo que o documento
    // não existe (benefício sem perícia não tem laudo; nem toda espécie tem
    // carta) — vai para "não existem", com a frase do INSS, e não para falha
    async function pdf(fonte, arquivo, url, opts) {
      if (fila.caiu) return;                               // sessão caída: uma falha só, no fim
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
    // lista que não veio (401, 500, rede) é FALHA, e não "não tem": antes virava
    // "0 pedido(s) · 0 PPP · 0 CAT" sem registro. 204, corpo vazio e 404 seguem como
    // lista vazia: no pdf() o 404 é o INSS dizendo "não existe", e as listas de PPP e
    // CAT nunca foram vistas ao vivo em conta sem PPP nem CAT (conferir na 1ª rodada)
    const json = async (rotulo, url) => {
      try {
        const r = await pedir(url);
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const t = r.status === 204 ? '' : await r.text();
        return t.trim() ? JSON.parse(t) : null;
      } catch (e) { if (!fila.caiu) falhas.push(`${rotulo}: a lista não veio (${e.message || e}), rode de novo`); return null; }
    };

    // 0.13.0 · só o extrato de pagamento (a consulta do dia, sem a rodada inteira): grava o PDF no Drive e
    // nos anexos, como na rodada, mas não mexe no resumo do portal (clientes.dossie.meuinss), que é da rodada completa
    if (opcoes.so === 'extrato') {
      const [ini, fim] = R.janela12Meses();
      await pdf('Extrato de pagamento', `Extrato de pagamento ${ini} a ${fim}`, `${API}hiscreServices/historicocreditosPdf/${cpf}/${ini}/${fim}`);
      D.faixa(ok.length ? `extrato de pagamento baixado (${ini} a ${fim})` : (inexistentes[0] || falhas[0] || 'o portal não devolveu o extrato'),
        ok.length ? '#1E6F50' : '#9A6700');
      return { ok: ok.length, falhas };
    }

    // ── CADASTRO: os dados cadastrais do CNIS (JSON → campos do CRM + .txt) e o PDF
    // da tela "Dados Cadastrais" (botão Baixar Documento = dadoscompletosPdf)
    let cadastro = null;
    try {
      const rc = await pedir(`${API}extratocnisservices/dadoscompletos/${cpf}?timestamp=${Date.now()}`);
      const jc = rc.ok ? await rc.json() : null;
      if (jc && jc.filiadoTO) {
        const c = R.cadastroDoCnis(jc);
        cadastro = c.cadastro;
        if (cadastro.nome) { cliente.nome = cadastro.nome; await chrome.storage.local.set({ cliente }); }
        // o .txt que não gravou não pode segurar o cadastro: o resumo abaixo vai assim mesmo
        try {
          await D.salvar(cliente, 'Cadastro', 'Dados cadastrais (CNIS)', new TextEncoder().encode(c.texto), 'text/plain');
          ok.push('Cadastro · Dados cadastrais (CNIS)');
        } catch (e) { falhas.push(`Cadastro · Dados cadastrais (CNIS) em texto: ${e.message || e}`); }
        // vai ao CRM AGORA, antes dos outros downloads: a ficha fica preenchida em
        // segundos, sem esperar os minutos da rodada (o resumo final regrava tudo).
        // `parcial` marca que a rodada ainda corre: se ela morrer, a ficha sabe
        const av = await D.resumo(cliente, 'meuinss', { baixados: ok, inexistentes, falhas, cadastro, parcial: true });
        D.faixa(`cadastro gravado no CRM${av ? av.replace(/\n\(resumo no CRM: (.*)\)/, ' — $1') : ''} — seguindo com os documentos…`);
      } else falhas.push(`Cadastro: o CNIS não devolveu os dados (HTTP ${rc.status})`);
    } catch (e) { falhas.push(`Cadastro: ${e.message || e}`); }
    await pdf('Cadastro', 'Dados cadastrais (CNIS)', `${API}extratocnisservices/dadoscompletosPdf/${cpf}`);

    // ── CNIS: os três extratos da tela ──────────────────────────────────────
    await pdf('CNIS', 'CNIS completo (com remuneracoes)', `${API}extratocnisservices/v2/remuneracoesPdf/${cpf}`);
    await pdf('CNIS', 'CNIS resumido (vinculos)', `${API}extratocnisservices/v2/vinculosPdf/${cpf}`);
    await pdf('CNIS', 'CNIS ano civil', `${API}extratocnisservices/anocivilPdf/${cpf}`);

    // ── Declaração de beneficiário (nada consta) ────────────────────────────
    await pdf('Declaracao', 'Declaracao de beneficiario', `${API}declaracaoBeneficioServices/declaracaoBeneficioPdf/${cpf}`);

    // ── Certificado da Pessoa com Deficiência (BPC, aposentadoria PCD, auxílio-inclusão):
    // quem não tem recebe {"result": "...não possui deficiência..."} → "não existe no INSS"
    await pdf('Declaracao', 'Certificado da pessoa com deficiencia', `${API}certificadoDeficienciaServices/certificadoDeficienciaPdf/${cpf}`);

    // ── Por benefício: carta de concessão e laudo médico ────────────────────
    let nbs = [];
    try {
      const mi = R.jwt(localStorage.getItem('miToken'));
      const lb = JSON.parse((mi && mi.nbsJson) || '{}').listaBeneficios || [];
      nbs = [...new Set(lb.map(b => String(b.numero || '').replace(/\D/g, '')).filter(Boolean))];
    } catch (e) {}
    // Extrato de informações do benefício ("dossiê previdenciário"): a tela
    // POSTa o formData do Redux com as opções marcadas — aqui vai tudo marcado
    // (valor, pagamento, instituidor, dependentes, revisões, procurador,
    // representante, perícias e reclusão, todas as datas). Mapeado pelo código
    // em 10.10.2026; ainda não visto ao vivo — conta sem benefício.
    const dossieTudo = { todos: true, valorBenef: true, pgtoBenef: true, instBenef: true, depBenef: true, revBenef: true,
      procBenef: true, reprLegal: true, perMedica: true, compReclusao: true, dadosGerais: true,
      dtIniPer: null, dtFimPer: null, dtIniRecl: null, dtFimRecl: null };
    for (const nb of nbs) {
      await pdf('Cartas de concessao', `Carta de concessao NB ${nb}`, `${API}calculoBeneficioServices/concalPdf/${nb}`);
      await pdf('Laudos', `Laudo medico NB ${nb}`, `${API}laudomedicoservices/pdf/${nb}`);
      // Benefício antigo/cessado: com TODAS as opções o INSS responde 500 "parâmetros
      // informados" (5 de 7 NBs em 12.10.2026, justo os sem carta). Segunda tentativa
      // só com os dados gerais (o padrão da tela); se ainda não vier, é "não existe".
      const antesF = falhas.length;
      await pdf('Extrato do beneficio', `Extrato de informacoes do beneficio NB ${nb}`, `${API}formDinServices/gerarDossie/${nb}`,
        { method: 'POST', headers: Object.assign({}, cab, { 'Content-Type': 'application/json' }), body: JSON.stringify(dossieTudo) });
      if (falhas.length > antesF && /HTTP 500/.test(falhas[falhas.length - 1])) {
        falhas.pop();
        const antesF2 = falhas.length;
        await pdf('Extrato do beneficio', `Extrato de informacoes do beneficio NB ${nb} (dados gerais)`, `${API}formDinServices/gerarDossie/${nb}`,
          { method: 'POST', headers: Object.assign({}, cab, { 'Content-Type': 'application/json' }),
            body: JSON.stringify(Object.assign({}, dossieTudo, { todos: false, valorBenef: false, pgtoBenef: false, instBenef: false,
              depBenef: false, revBenef: false, procBenef: false, reprLegal: false, perMedica: false, compReclusao: false })) });
        if (falhas.length > antesF2 && /HTTP 500/.test(falhas[falhas.length - 1])) {
          falhas.pop();
          inexistentes.push(`Extrato do beneficio · NB ${nb}: o INSS não gera extrato para este benefício (antigo/cessado)`);
        }
      }
    }

    // ── Declaração de atividade (tipo de segurado cadastrado) ────────────────
    await pdf('Declaracao', 'Declaracao de atividade', `${API}declaracaoAtividadeServices/declaracaoAtividadePdf/${cpf}`);

    // ── CTC: só quem já pediu uma. `protocolos` devolve o protocolo ativo
    // (ou vazio); a certidão sai por cpf + protocolo ────────────────────────
    let ctc = 0;
    try {
      const rp = await pedir(`${API}ctcServices/protocolos`);
      const tp = rp.ok ? await rp.text() : '';              // sem CTC o INSS responde 204 vazio (10.10.2026)
      const jp = tp.trim() ? JSON.parse(tp) : null;
      const protos = [].concat(jp && typeof jp === 'object' && !Array.isArray(jp) ? Object.values(jp) : jp || [])
        .flatMap(x => (x && typeof x === 'object') ? Object.values(x) : [x])
        .map(x => String(x == null ? '' : x).replace(/\D/g, '')).filter(d => d.length >= 8);
      for (const p of [...new Set(protos)]) {
        await pdf('CTC', `Certidao de tempo de contribuicao ${p}`, `${API}ctcServices/certidoes/${cpf}/${p}`);
        ctc++;
      }
    } catch (e) { falhas.push(`CTC: ${e.message || e}`); }

    // ── Extrato de pagamento: últimos 12 meses (é por CPF, não por NB) ──────
    if (nbs.length) {
      const [ini, fim] = R.janela12Meses();
      await pdf('Extrato de pagamento', `Extrato de pagamento ${ini} a ${fim}`, `${API}hiscreServices/historicocreditosPdf/${cpf}/${ini}/${fim}`);
    }

    // ── Pedidos: TODOS (a tela filtra por ano; a API devolve a lista inteira)
    // e de cada um a cópia integral do processo administrativo (PAP)
    D.faixa('lendo a lista de pedidos…');
    const tarefas = lista(await json('Pedidos', `${ARQ}SagService/tarefa`));
    for (const t of tarefas) {
      if (!t || !t.protocolo) continue;
      const data = String(t.dataCriacao || '').slice(0, 10);
      await pdf('Processos administrativos', `${data} ${t.protocolo} ${t.nomeServico || t.siglaServico || ''}`,
        `${API}consolidadorservices/pap/${t.protocolo}`);
    }

    // ── PPP eletrônico (obrigatório só desde 01/2023): a tela lista
    // listaVinculosTO e manda o vínculo inteiro no POST, como aqui ────────────
    const vinculos = ((await json('PPP', `${API}declaracaoPppServices/obterDadosVinculos/`)) || {}).listaVinculosTO || [];
    for (const [i, v] of vinculos.entries()) {
      const rotulo = `${v.nomeVinculo || v.codigoVinculo || `vinculo ${i + 1}`} ${String(v.dataInicio || '').slice(0, 10)}`;
      await pdf('PPP', `PPP ${rotulo}`, `${API}declaracaoPppServices/gerarDeclaracao/`,
        { method: 'POST', headers: Object.assign({}, cab, { 'Content-Type': 'application/json' }), body: JSON.stringify(v) });
    }

    // ── CAT ─────────────────────────────────────────────────────────────────
    const cats = lista(await json('CAT', `${API}catservices/cat/${cpf}`));
    for (const c of cats) {
      const n = String(c.numeroCat || '').replace(/\D/g, '');
      if (n) await pdf('CAT', `CAT ${n}`, `${API}catservices/catPdf/${cpf}/${n}`);
    }

    if (fila.caiu) falhas.push(R.SESSAO_CAIU);
    const resumo = `${ok.length} documento(s) baixado(s)`
      + ` · ${nbs.length} benefício(s) · ${tarefas.length} pedido(s) · ${vinculos.length} vínculo(s) PPP · ${cats.length} CAT · ${ctc} CTC`
      + (inexistentes.length ? `\n${inexistentes.length} não existem no INSS:\n• ${inexistentes.slice(0, 8).join('\n• ')}` : '')
      + (falhas.length ? `\n${falhas.length} falharam:\n• ${falhas.slice(0, 8).join('\n• ')}` : '');
    const avisoCrm = await D.resumo(cliente, 'meuinss', { baixados: ok, inexistentes, falhas, cadastro });
    D.faixa(resumo + avisoCrm, falhas.length ? '#9A6700' : '#1E6F50');
    return { ok: ok.length, falhas };
  };
})();
