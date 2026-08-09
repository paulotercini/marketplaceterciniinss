// PAT/GERID — o INSS.
//
// AQUI FICA A ÚNICA COISA QUE A EXTENSÃO NÃO FAZ POR VOCÊ: clicar em
// "Buscar". A lista do PAT exige um token de reCAPTCHA, que a página gera
// quando UMA PESSOA aciona a busca. Mandar o script clicar seria justamente
// o robô que o captcha existe para barrar — e o convênio está no seu nome.
//
// Então a divisão é esta: a extensão prepara a tela (põe a data da última
// atualização e 500 por página), você dá UM clique em Buscar, e ela faz todo
// o resto — o detalhe de cada requerimento e a entrega ao CRM.
//
// Depois da lista não há captcha nenhum: o detalhe abre com a mesma sessão.
// Foi o que a sonda provou, com HTTP 200.

(() => {
  const ALVO_LISTA = /\/requerimento\/ec\/tarefa\/consulta/;
  let cracha = null, coletando = false, esperando = false;
  const OUT = { versao: 3, quando: null, total: null, lista: [], detalhes: [], falhas: [] };
  const vistos = new Set();

  // escuta o que a PÁGINA pede — sem mexer no que ela manda
  const fetchOriginal = window.fetch;
  window.fetch = async function (...args) {
    const [ent, cfg = {}] = args;
    const url = (typeof ent === 'string' ? ent : ent && ent.url) || '';
    const r = await fetchOriginal.apply(this, args);
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
    if (this._u && ALVO_LISTA.test(this._u)) {
      if (Object.keys(this._h || {}).length) cracha = this._h;
      this.addEventListener('load', () => {
        try { receber(JSON.parse(this.responseText)); } catch (e) {}
      });
    }
    return enviar.call(this, b);
  };

  function receber(j) {
    if (!esperando) return;                    // sem clique no botão, sem coleta
    const tarefas = (j && j.tarefas) || [];
    if (!tarefas.length) return;
    if (j.quantidadeTotalTarefa) OUT.total = j.quantidadeTotalTarefa;
    let novos = 0;
    for (const t of tarefas) {
      const p = String(t.protocolo || '').replace(/\D/g, '');
      if (!p || vistos.has(p)) continue;
      vistos.add(p); OUT.lista.push(t); novos++;
    }
    faixa(`recebi ${OUT.lista.length} de ${OUT.total || '?'} — buscando o detalhe…`);
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
      faixa(`detalhe ${i + 1} de ${fila.length}…`);
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
    faixaErr(`o portal parou de responder (${status}). Entreguei o que já veio; ` +
             `daqui a alguns minutos clique de novo.`);
    entregar();
  }

  async function entregar() {
    esperando = false;
    OUT.quando = new Date().toISOString();
    try {
      await CRM.enviar('pat', OUT);
      await chrome.storage.local.set({ ultima_pat: OUT.quando });
      faixaOk(`✔ ${OUT.detalhes.length} requerimento(s) entregues ao CRM. ` +
              `Abra 📥 Importar do INSS para conferir o plano.`);
    } catch (e) { faixaErr('coletei, mas não consegui entregar: ' + e.message); }
    setTimeout(() => { const f = document.getElementById('crm-faixa'); if (f) f.remove(); }, 12000);
  }

  // prepara a tela e ESPERA o seu clique
  window.crmRodar = async () => {
    const { ultima_pat } = await chrome.storage.local.get(['ultima_pat']);
    const desde = ultima_pat ? new Date(ultima_pat) : new Date(Date.now() - 180 * 86400000);
    preencher(desde);
    esperando = true;
    faixa('Pronto: agora clique em "Buscar". O resto é comigo.', '#B4530A');
    return { esperando: true, desde: desde.toISOString().slice(0, 10) };
  };

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
  // o portal é Angular: mexer no .value não basta, ele precisa do evento
  function escrever(inp, texto) {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, texto);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  }
})();
