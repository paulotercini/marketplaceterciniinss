// ─────────────────────────────────────────────────────────────────────────
// COLETOR DO PAT/GERID — a rotina de todo dia, no SEU navegador
//
// A sonda já respondeu o que precisava: a lista exige o reCAPTCHA (por isso
// quem clica em "Buscar" é você), mas o DETALHE de cada requerimento abre com
// o mesmo crachá da sua sessão. Provado: HTTP 200. Então um clique seu traz
// a carteira inteira.
//
// O QUE ELE NÃO FAZ: não gera, não guarda e não reaproveita token de
// reCAPTCHA; não faz login; não roda em servidor; não pagina sozinho (paginar
// é POST novo, e POST novo é captcha novo — quem pagina é você, pondo 500 por
// página).
//
// O QUE ELE NÃO LEVA: anexo, comentário, campo adicional e dado dos
// interessados. São laudo médico e relato de doença. O CRM guarda o LINK para
// o portal, não a cópia — quem precisa ler abre lá, com o login dele.
//
// ATENÇÃO, ESTE ARQUIVO É DIFERENTE DO DA SONDA: aqui vai dado real do seu
// escritório, para o SEU CRM. Ele fica na sua máquina. Não me mande.
//
// COMO USAR, todo dia
//   1. Entre no PAT/GERID (login gov.br normal) e vá em Tarefas.
//   2. F12 → Console. (Se pedir, digite  allow pasting  e Enter.)
//   3. Cole ISTO e Enter.
//   4. Na tela: ponha a data da última sincronização em "Data de atualização
//      inicial", escolha 500 por página e clique em "Buscar".
//   5. Ele busca sozinho o detalhe do que veio, mostra o resumo no Console e
//      baixa "pat_AAAA-MM-DD.json". Esse arquivo entra no CRM.
// ─────────────────────────────────────────────────────────────────────────
(() => {
  const OUT = { versao: 2, quando: new Date().toISOString(), total: null,
                lista: [], detalhes: [], desconhecidos: [], falhas: [] };

  // ── tradução: cópia de traduzir.js, que tem teste próprio ────────────────
  const SERVICOS = {
    // ── pedido de benefício ────────────────────────────────────────────────
    TAIU:    { tipo: 'beneficio', especie: 'B41', nome: 'Aposentadoria por idade' },
    TAR:     { tipo: 'beneficio', especie: 'B41', nome: 'Aposentadoria por idade rural',
               marcadores: ['idade_rural'] },
    TAPDI:   { tipo: 'beneficio', especie: 'B41', nome: 'Aposentadoria por idade da pessoa com deficiência',
               marcadores: ['pcd'] },
    TATCMI:  { tipo: 'beneficio', especie: 'B42', nome: 'Aposentadoria por tempo de contribuição' },
    TAPDTC:  { tipo: 'beneficio', especie: 'B42', nome: 'Aposentadoria por tempo de contribuição da pessoa com deficiência',
               marcadores: ['pcd'] },
    TBSBAPD: { tipo: 'beneficio', especie: 'B87', nome: 'BPC/LOAS — deficiência' },
    TBAI:    { tipo: 'beneficio', especie: 'B88', nome: 'BPC/LOAS — idoso' },
    TPU:     { tipo: 'beneficio', especie: 'B21', nome: 'Pensão por morte' },
    // O auxílio-acidente tem duas espécies e o nome do serviço NÃO diz qual:
    // B36 é o previdenciário, B94 o acidentário. Escolher por conta própria
    // seria chutar num campo que muda a competência do processo — então a
    // espécie fica em aberto e o CRM pergunta.
    TAA:     { tipo: 'beneficio', especie: null, nome: 'Auxílio-acidente',
               aConfirmar: 'B36 (previdenciário) ou B94 (acidentário)' },

    // ── recurso: lista Conselho de Recursos, não INSS ───────────────────────
    // É o mesmo processo que o robô do CRPS já acompanha. Somados, são 83 dos
    // 184 — quase metade da carteira.
    TREC:    { tipo: 'recurso', nome: 'Recurso ordinário (inicial)' },
    RECESP:  { tipo: 'recurso', nome: 'Recurso especial ou incidente' },

    // ── revisão de benefício já concedido ──────────────────────────────────
    TREVISAO:  { tipo: 'revisao', nome: 'Revisão — entidade conveniada' },
    TAREFAREV: { tipo: 'revisao', nome: 'Revisão' },
    REVOFICIO: { tipo: 'revisao', nome: 'Revisão de ofício' },

    // ── dinheiro ───────────────────────────────────────────────────────────
    SEMNPG:  { tipo: 'pagamento', nome: 'Emissão de pagamento não recebido' },
    TSCC:    { tipo: 'pagamento', nome: 'Calcular complementação' },

    // ── serviço administrativo: não abre caso, acontece DENTRO de um ───────
    ATUVCPG: { tipo: 'servico', nome: 'Atualizar vínculos e remunerações (CNIS)' },
    TVALFBR: { tipo: 'servico', nome: 'Validar contribuição de facultativo baixa renda' },
    ATUACAD: { tipo: 'servico', nome: 'Atualizar cadastro e/ou benefício' },

    // ── APURAÇÃO DE IRREGULARIDADE ─────────────────────────────────────────
    // O INSS revendo um benefício que já paga. Pode terminar em suspensão,
    // cancelamento e cobrança do que foi recebido. São dois requerimentos na
    // carteira e são os dois mais urgentes dela — por isso `urgente`.
    MOBDGT:  { tipo: 'apuracao', nome: 'Apuração de irregularidade (MOB Digital)', urgente: true },
    CPCARCJ: { tipo: 'apuracao', nome: 'Encaminhamentos do processo de apuração (MOB)', urgente: true },
  };

  const ESPECIE_POR_CODIGO = {
    AMP_SOCIAL_PORT_DEFICIENCIA: 'B87',
    AMP_SOCIAL_IDOSO:            'B88',
    APOSENTADORIA_POR_IDADE:     'B41',
    APOSENTADORIA_POR_TEMPO_DE_CONTRIBUICAO: 'B42',
  };

  const CANAIS = {
    ENTIDADE_CONVENIADA: 'Protocolado pelo escritório (convênio OAB)',
    INTERNET:            'O cliente protocolou sozinho pelo Meu INSS',
    CENTRAL_135:         'Protocolado pela Central 135',
  };

  const SITUACOES = {
    PENDENTE: 'Em análise',
    EM_ANALISE: 'Em análise',
    CONCLUIDA: 'Concluído',
    CONCLUIDO: 'Concluído',
    CANCELADA: 'Cancelado',
    CANCELADO: 'Cancelado',
    EXIGENCIA: 'Em exigência',
    CUMPRIMENTO_DE_EXIGENCIA: 'Em exigência',
  };

  const limpo = s => String(s || '').trim().toUpperCase();

  const semAcento = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const situacaoDe = s => SITUACOES[semAcento(limpo(s)).replace(/\s+/g, '_')]
    || String(s || '').trim() || null;

  function especieDe(tarefa) {
    const t = tarefa || {};
    const s = SERVICOS[limpo(t.siglaServico)];
    // a sigla diz o TIPO e os marcadores; o código do INSS, quando vem, tem a
    // última palavra sobre a espécie
    const porCodigo = ESPECIE_POR_CODIGO[limpo(t.especieBeneficio)] || null;
    if (!s) {
      if (porCodigo)
        return { tipo: 'beneficio', especie: porCodigo, beneficio: null,
                 marcadores: [], urgente: false, fonte: 'especieBeneficio' };
      // desconhecido não é erro: é trabalho para a próxima rodada. O nome do
      // serviço vai junto porque é ele que me diz o que a sigla quer dizer.
      return { tipo: null, especie: null, beneficio: null, marcadores: [], urgente: false,
               fonte: null,
               desconhecido: { especieBeneficio: t.especieBeneficio || null,
                               siglaServico: t.siglaServico || null,
                               nomeServico: t.nomeServico || null } };
    }
    return {
      tipo: s.tipo,
      especie: porCodigo || s.especie || null,
      beneficio: s.nome,
      marcadores: s.marcadores || [],
      urgente: !!s.urgente,
      a_confirmar: s.aConfirmar || null,
      fonte: porCodigo ? 'especieBeneficio' : 'siglaServico',
    };
  }

  function dataIso(br) {
    const m = String(br || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    const iso = String(br || '').trim().match(/^(\d{4}-\d{2}-\d{2})/);
    return iso ? iso[1] : null;
  }

  function eventosDe(det) {
    const d = det || {};
    const juntar = (lista, tipo) => (Array.isArray(lista) ? lista : []).map(a => ({
      tipo,
      data: dataIso(a.data),
      hora: (String(a.horario || '').match(/^\d{2}:\d{2}/) || [null])[0],
      local: a.nomeUnidade || null,
      situacao: limpo(a.situacaoAgendamento) || null,
      ativo: limpo(a.situacaoAgendamento) === 'AGENDADO',
    })).filter(e => e.data);
    return [...juntar(d.agendamentosPericia, 'Perícia médica'),
            ...juntar(d.agendamentosAvaliacaoSocial, 'Avaliação social')];
  }

  function resumoDaLista(t) {
    return {
      protocolo: String((t || {}).protocolo || '').trim(),
      situacao: situacaoDe((t || {}).status),
      cpf: String((t || {}).cpfRequerente || '').replace(/\D/g, '').padStart(11, '0'),
      servico: (t || {}).nomeServico || null,
      sigla: (t || {}).siglaServico || null,
      unidade: (t || {}).nomeUnidade || null,
      criado_em: (t || {}).dataCriacao || null,
      atualizado_em: (t || {}).dataUltimaAtualizacao || null,
      link: (t || {}).protocolo ? `https://atendimento.inss.gov.br/tarefas/detalhar_tarefa/${t.protocolo}` : null,
    };
  }

  function resumoDoDetalhe(d) {
    const det = d || {};
    const esp = especieDe(det);
    return {
      protocolo: String(det.protocolo || '').trim(),
      situacao: situacaoDe(det.status),
      tipo: esp.tipo,
      especie: esp.especie,
      beneficio: esp.beneficio,
      marcadores: esp.marcadores,
      urgente: esp.urgente,
      especie_a_confirmar: esp.a_confirmar || null,
      servico: det.nomeServico || null,
      sigla: det.siglaServico || null,
      especie_codigo: det.especieBeneficio || null,
      der: (String(det.dataEntradaRequerimento || '').match(/^\d{4}-\d{2}-\d{2}/) || [null])[0],
      unidade: det.nomeUnidade || null,
      canal: det.tipoCanalAtendimento || null,
      quem_protocolou: CANAIS[limpo(det.tipoCanalAtendimento)] || null,
      // contagens, não conteúdo: dizem que há o que olhar, sem trazer o que é
      anexos: Array.isArray(det.anexos) ? det.anexos.length : 0,
      comentarios: Array.isArray(det.comentarios) ? det.comentarios.length : 0,
      em_exigencia: !!det.podeCumprirExigencia || situacaoDe(det.status) === 'Em exigência',
      eventos: eventosDe(det),
      link: det.protocolo ? `https://atendimento.inss.gov.br/tarefas/detalhar_tarefa/${det.protocolo}` : null,
      desconhecido: esp.desconhecido || null,
    };
  }

  // ── coleta ──────────────────────────────────────────────────────────────
  const ALVO_LISTA = /\/requerimento\/ec\/tarefa\/consulta/;
  const ALVO_DET = /\/requerimento\/ec\/tarefa\/\d+/;
  const pausa = ms => new Promise(r => setTimeout(r, ms));
  let cracha = null, rodando = false, vistos = new Set();

  const fetchOriginal = window.fetch;
  window.fetch = async function (...args) {
    const [ent, cfg = {}] = args;
    const url = (typeof ent === 'string' ? ent : ent && ent.url) || '';
    const r = await fetchOriginal.apply(this, args);
    if (ALVO_LISTA.test(url) || ALVO_DET.test(url)) {
      if (cfg.headers) cracha = cfg.headers;
      if (ALVO_LISTA.test(url)) receber(await r.clone().json().catch(() => null));
    }
    return r;
  };
  const abrirOriginal = XMLHttpRequest.prototype.open;
  const porOriginal = XMLHttpRequest.prototype.setRequestHeader;
  const enviarOriginal = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, url, ...resto) {
    this._pat = { url: String(url), hdr: {} };
    return abrirOriginal.call(this, m, url, ...resto);
  };
  XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
    if (this._pat) this._pat.hdr[k] = v;
    return porOriginal.call(this, k, v);
  };
  XMLHttpRequest.prototype.send = function (body) {
    if (this._pat && (ALVO_LISTA.test(this._pat.url) || ALVO_DET.test(this._pat.url))) {
      if (Object.keys(this._pat.hdr).length) cracha = this._pat.hdr;
      if (ALVO_LISTA.test(this._pat.url))
        this.addEventListener('load', () => {
          try { receber(JSON.parse(this.responseText)); } catch (e) {}
        });
    }
    return enviarOriginal.call(this, body);
  };

  // cada página que VOCÊ pede entra aqui; o protocolo repetido não duplica
  function receber(j) {
    const tarefas = (j && j.tarefas) || [];
    if (!tarefas.length) return;
    let novos = 0;
    for (const t of tarefas) {
      const r = resumoDaLista(t);
      if (!r.protocolo || vistos.has(r.protocolo)) continue;
      vistos.add(r.protocolo); OUT.lista.push(r); novos++;
    }
    if (j && j.quantidadeTotalTarefa) OUT.total = j.quantidadeTotalTarefa;
    console.log(`📋 +${novos} requerimento(s) — ${OUT.lista.length} de ${OUT.total || '?'} na janela pedida`);
    if (!rodando) { rodando = true; setTimeout(detalhar, 1500); }
  }

  // ── o detalhe de cada um, devagar ───────────────────────────────────────
  // 700ms entre chamadas: é a sua sessão pedindo o que você tem direito de
  // ver, mas em rajada seria falta de educação com o portal — e chama atenção
  // à toa.
  async function detalhar() {
    // O DEFEITO DA PRIMEIRA COLETA: 184 na lista, 10 detalhes. A fila era um
    // retrato do momento em que ela começava — as páginas que chegavam
    // depois, ou enquanto ela rodava, nunca eram pegas. Agora a fila é o que
    // FALTA, e ao terminar ela confere se entrou gente nova no caminho.
    const feitos = new Set([...OUT.detalhes.map(d => d.protocolo),
                            ...OUT.falhas.map(f => f.protocolo)]);
    const fila = OUT.lista.filter(t => !feitos.has(t.protocolo));
    if (!fila.length) { rodando = false; return; }
    console.log(`🔎 buscando o detalhe de ${fila.length} requerimento(s)… (~${Math.ceil(fila.length * 0.7 / 60)} min)`);
    for (let i = 0; i < fila.length; i++) {
      const p = fila[i].protocolo;
      try {
        const r = await fetchOriginal(
          `/apis/requerimentosPortalApi/requerimento/ec/tarefa/${p}`,
          { credentials: 'include', headers: cracha || {} });
        if (!r.ok) { OUT.falhas.push({ protocolo: p, status: r.status }); continue; }
        const d = resumoDoDetalhe(await r.json());
        if (d.desconhecido) { OUT.desconhecidos.push(d.desconhecido); delete d.desconhecido; }
        OUT.detalhes.push(d);
      } catch (e) { OUT.falhas.push({ protocolo: p, erro: String(e.message || e) }); }
      if (i % 20 === 19) console.log(`   … ${i + 1}/${fila.length}`);
      await pausa(700);
    }
    // chegou página nova enquanto eu buscava? então ainda há o que buscar
    const pendentes = OUT.lista.length - OUT.detalhes.length - OUT.falhas.length;
    if (pendentes > 0) return detalhar();
    rodando = false;
    resumir();
    if (OUT.total && OUT.lista.length < OUT.total)
      console.log('%cainda falta gente: puxe a janela anterior antes de baixar.', 'color:#B4530A;font-weight:700');
    else baixar();
  }

  // ── o resumo que aparece na tela ────────────────────────────────────────
  // Ninguém abre um JSON de 184 itens para saber se valeu a pena.
  function resumir() {
    const ev = OUT.detalhes.flatMap(d => d.eventos);
    const hoje = new Date().toISOString().slice(0, 10);
    const conta = (lista, f) => lista.reduce((m, x) => (m[f(x)] = (m[f(x)] || 0) + 1, m), {});
    console.log('%c── o que veio ──────────────────────────', 'font-weight:700');
    console.table(conta(OUT.detalhes, d => d.situacao || '—'));
    console.log(`🩺 ${ev.filter(e => e.data >= hoje).length} perícia(s)/avaliação(ões) ainda por vir`);
    const rem = ev.filter(e => e.remarcado);
    if (rem.length) console.warn(`⚠ ${rem.length} REMARCADO(S) — confira estes primeiro`);
    const exig = OUT.detalhes.filter(d => d.em_exigencia);
    if (exig.length) console.warn(`⚠ ${exig.length} em EXIGÊNCIA`);
    if (OUT.desconhecidos.length) {
      const semMapa = conta(OUT.desconhecidos, d => `${d.especieBeneficio || '?'} · ${d.nomeServico || '?'}`);
      console.log('%cserviços que eu ainda não sei traduzir em espécie:', 'font-weight:700');
      console.table(semMapa);
      console.log('👉 mande NO CHAT só esta tabela (é código de serviço, não tem dado de cliente).');
    }
    if (OUT.falhas.length) console.warn(`${OUT.falhas.length} não abriram — estão em "falhas" no arquivo`);
    janela();
  }

  // ── a janela de 6 meses ─────────────────────────────────────────────────
  // O portal recusa intervalo maior: "O intervalo entre as datas não pode
  // ultrapassar 6 meses." Na rotina diária isso não atrapalha (a janela é de
  // um dia). Atrapalha UMA vez, na primeira carga, que precisa vir em fatias
  // de seis meses — e cada fatia é um "Buscar" novo, porque POST novo é
  // captcha novo.
  //
  // O coletor acumula entre as fatias: pode clicar quantas vezes precisar
  // antes de baixar. O protocolo repetido não duplica.
  function janela() {
    const antigo = OUT.lista.map(t => t.criado_em).filter(Boolean).sort()[0];
    if (!antigo) return;
    const d = new Date(antigo);
    const fim = new Date(d.getTime() - 86400000);
    const ini = new Date(fim); ini.setMonth(ini.getMonth() - 6);
    const br = x => x.toLocaleDateString('pt-BR');
    console.log(`%cpara puxar mais para trás: ${br(ini)} a ${br(fim)}`, 'font-weight:700');
    console.log('   (o portal limita a janela a 6 meses — troque as datas, clique em "Buscar" de novo,');
    console.log('    e só depois rode  patColeta.baixar()  . O que já veio fica guardado.)');
  }

  function baixar() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(OUT, null, 2)], { type: 'application/json' }));
    a.download = `pat_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    console.log('%c✔ arquivo baixado — este entra no CRM, NÃO no chat.',
                'color:#1E6F50;font-weight:700');
  }

  window.patColeta = { OUT, baixar, detalhar };
  console.log('%ccoletor ligado.', 'color:#2B5FC7;font-weight:700');
  console.log('Agora: data da última sincronização + 500 por página + "Buscar".');
})();
