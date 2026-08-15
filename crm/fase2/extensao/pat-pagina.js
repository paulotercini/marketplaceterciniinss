// O COLETOR DO PAT — roda DENTRO DA PÁGINA, e é o único pedaço que roda lá.
//
// Precisa: o gancho no `fetch`/`XMLHttpRequest` só enxerga as chamadas do
// portal se estiver no MESMO `window` que ele. Um script de extensão comum
// mora num `window` só dele — o gancho existia, não dava erro nenhum, e nunca
// disparava. Clicava-se em "Buscar", o portal buscava, e nada acontecia.
//
// Ele NÃO é declarado no manifesto: é a ponte que o injeta com uma tag
// <script>. Declará-lo pedindo "world": "MAIN" exige um Chrome recente e, se
// o navegador não conhece essa chave, ele recusa o manifesto INTEIRO — a
// extensão simplesmente não carrega, sem uma linha no console. Foi o que
// aconteceu, e por isso a injeção é feita do jeito antigo, que sempre serviu.
//
// Aqui não existe `chrome.*` nem conversa com o CRM. Nem faixa na tela: quem
// desenha é a ponte. Daqui só saem recados por postMessage.

(() => {
  // a ponte é reinjetada a cada clique no botão, e reinjeta este arquivo
  // junto; instalar o gancho duas vezes duplicaria cada resposta da lista
  if (window.__crmColetor) return;
  window.__crmColetor = true;

  const ALVO_LISTA = /\/requerimento\/ec\/tarefa\/consulta/;
  let cracha = null, coletando = false, esperando = false;
  const OUT = { versao: 3, quando: null, total: null, lista: [], detalhes: [], falhas: [] };
  const vistos = new Set();

  const diga = (...o) => console.log('%c[CRM]', 'color:#2B5FC7;font-weight:700', ...o);
  const dizer = (tipo, extra) => window.postMessage({ de: 'crm-pat', tipo, ...extra }, '*');
  const mostrar = (texto, cor) => dizer('faixa', { texto, cor });
  const pausa = ms => new Promise(r => setTimeout(r, ms));

  diga('coletor do PAT no ar, dentro da página.');
  dizer('oi');                         // a ponte espera este sinal para saber que subiu

  // escuta o que a PÁGINA pede — sem mexer no que ela manda
  const fetchOriginal = window.fetch;
  window.fetch = async function (...args) {
    const [ent, cfg = {}] = args;
    const url = (typeof ent === 'string' ? ent : ent && ent.url) || '';
    const r = await fetchOriginal.apply(this, args);
    if (/tarefa/i.test(url)) diga('fetch:', url, ALVO_LISTA.test(url) ? '← é a lista' : '');
    if (ALVO_LISTA.test(url)) {
      if (cfg.headers) cracha = cfg.headers;
      receber(await r.clone().json().catch(() => null));
    }
    return r;
  };
  const abrir = XMLHttpRequest.prototype.open, por = XMLHttpRequest.prototype.setRequestHeader,
        enviar = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, url, ...r) {
    this._u = String(url); this._h = {}; return abrir.call(this, m, url, ...r);
  };
  XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
    if (this._h) this._h[k] = v; return por.call(this, k, v);
  };
  XMLHttpRequest.prototype.send = function (b) {
    if (this._u && /tarefa/i.test(this._u))
      diga('xhr:', this._u, ALVO_LISTA.test(this._u) ? '← é a lista' : '');
    if (this._u && ALVO_LISTA.test(this._u)) {
      if (Object.keys(this._h || {}).length) cracha = this._h;
      this.addEventListener('load', () => {
        try { receber(JSON.parse(this.responseText)); }
        catch (e) { diga('a resposta da lista não era JSON:', String(e.message || e)); }
      });
    }
    return enviar.call(this, b);
  };

  // A lista é guardada MESMO SEM O BOTÃO ter sido clicado antes. Exigir a
  // ordem certa (extensão primeiro, "Buscar" depois) era uma armadilha calada:
  // invertida, a coleta era descartada em silêncio. Guardar não é coletar — o
  // detalhe, que é o que gera tráfego no portal, continua só saindo no clique.
  function receber(j) {
    const tarefas = (j && j.tarefas) || [];
    diga(`resposta da lista: ${tarefas.length} tarefa(s)`,
         `de ${(j && j.quantidadeTotalTarefa) || '?'} no total`);
    if (!tarefas.length) return;
    if (j.quantidadeTotalTarefa) OUT.total = j.quantidadeTotalTarefa;
    for (const t of tarefas) {
      const p = String(t.protocolo || '').replace(/\D/g, '');
      if (!p || vistos.has(p)) continue;
      vistos.add(p); OUT.lista.push(t);
    }
    if (!esperando) {
      diga(`guardei ${OUT.lista.length} — clique em 🌻 INSS na extensão.`);
      mostrar(`${OUT.lista.length} requerimento(s) na tela — clique em 🌻 INSS na extensão`, '#B4530A');
      return;
    }
    mostrar(`recebi ${OUT.lista.length} de ${OUT.total || '?'} — buscando o detalhe…`);
    if (!coletando) { coletando = true; setTimeout(detalhar, 1200); }
  }

  // Concluído não precisa de detalhe, e o portal tem limite de velocidade:
  // 3 segundos entre chamadas, e para na primeira recusa em vez de insistir.
  async function detalhar() {
    const feitos = new Set([...OUT.detalhes.map(d => String(d.protocolo)),
                            ...OUT.falhas.map(f => f.protocolo)]);
    const ativo = t => !/conclu|cancel/i.test(t.status || '');
    const peso = t => /exig/i.test(t.status || '') ? 0 : 1;
    const fila = OUT.lista.filter(t => ativo(t) && !feitos.has(String(t.protocolo)))
                          .sort((a, b) => peso(a) - peso(b));
    if (!fila.length) { coletando = false; return entregar(); }
    let seguidas = 0;
    for (let i = 0; i < fila.length; i++) {
      const p = fila[i].protocolo;
      mostrar(`detalhe ${i + 1} de ${fila.length}…`);
      try {
        const r = await fetchOriginal(
          `/apis/requerimentosPortalApi/requerimento/ec/tarefa/${p}`,
          { credentials: 'include', headers: cracha || {} });
        if (!r.ok) {
          OUT.falhas.push({ protocolo: String(p), status: r.status });
          if (++seguidas >= 3) { coletando = false; return barreira(r.status); }
          continue;
        }
        seguidas = 0;
        OUT.detalhes.push(await r.json());
      } catch (e) {
        OUT.falhas.push({ protocolo: String(p), erro: String(e.message || e) });
        if (++seguidas >= 3) { coletando = false; return barreira('sem resposta'); }
      }
      await pausa(3000);
    }
    if (OUT.lista.length - OUT.detalhes.length - OUT.falhas.length > 0) return detalhar();
    coletando = false; entregar();
  }

  function barreira(status) {
    diga('o portal parou de responder:', status);
    mostrar(`o portal parou de responder (${status}). Entreguei o que já veio; ` +
            `daqui a alguns minutos clique de novo.`, '#B3261E');
    entregar();
  }

  // a entrega é da ponte: daqui sai o pacote, e o resultado volta por outro recado
  function entregar() {
    esperando = false;
    OUT.quando = new Date().toISOString();
    diga('entregando', OUT.detalhes.length, 'detalhe(s) à extensão.');
    dizer('entregar', { dados: OUT, quando: OUT.quando, quantos: OUT.detalhes.length });
  }

  // ── recados que vêm da ponte ────────────────────────────────────────────
  window.addEventListener('message', ev => {
    const m = ev.data;
    if (ev.source !== window || !m || m.de !== 'crm-ponte') return;

    if (m.tipo === 'rodar') {
      esperando = true;
      diga('botão clicado; já tenho', OUT.lista.length, 'requerimento(s) da lista.');
      // se a busca já foi feita antes do clique, é só continuar dali
      if (OUT.lista.length && !coletando) {
        coletando = true;
        mostrar(`recebi ${OUT.lista.length} de ${OUT.total || '?'} — buscando o detalhe…`);
        setTimeout(detalhar, 600);
        dizer('pronto', { jaTinha: OUT.lista.length, esperando: false });
        return;
      }
      preencher(m.desde ? new Date(m.desde) : new Date(Date.now() - 180 * 86400000));
      mostrar('Pronto: agora clique em "Buscar". O resto é comigo.', '#B4530A');
      dizer('pronto', { jaTinha: 0, esperando: true });
    }
    if (m.tipo === 'entregue')
      mostrar(`✔ ${m.quantos} requerimento(s) entregues ao CRM. ` +
              `Abra 📥 Importar do INSS para conferir o plano.`, '#1E6F50');
    if (m.tipo === 'falhou')
      mostrar('coletei, mas não consegui entregar: ' + m.erro, '#B3261E');
  });

  // põe a data e o tamanho da página nos campos que a tela já tem. Preencher
  // campo é preparar; acionar a busca é que seria passar por cima do captcha.
  function preencher(desde) {
    const br = d => d.toLocaleDateString('pt-BR');
    for (const inp of document.querySelectorAll('input')) {
      const rot = (inp.getAttribute('placeholder') || inp.name || inp.id || '').toLowerCase();
      if (/inicial/.test(rot)) escrever(inp, br(desde));
      if (/final/.test(rot))   escrever(inp, br(new Date()));
    }
    for (const sel of document.querySelectorAll('select')) {
      const op = [...sel.options].find(o => o.text.trim() === '500');
      if (op) { sel.value = op.value; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    }
  }
  // o portal é React: mexer no .value não basta, ele precisa do evento
  function escrever(inp, texto) {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, texto);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  }
})();
