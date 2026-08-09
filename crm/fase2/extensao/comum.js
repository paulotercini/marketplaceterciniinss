// O QUE OS DOIS COLETORES COMPARTILHAM.
//
// Regra que vale para a extensão inteira: ela COLETA e ENTREGA. Não decide
// nada. O que vira caso, o que atualiza, o que é possível duplicado — tudo
// isso continua no CRM, onde já está testado. Aqui só se junta o que os
// portais respondem e se grava numa fila; o CRM lê essa fila e mostra o
// plano antes de tocar em qualquer ficha.
//
// A EXTENSÃO NÃO PASSA POR CIMA DE NADA. Não gera nem reaproveita token de
// reCAPTCHA, não faz login, não clica em "Buscar" por você. Ela prepara a
// tela e escuta a resposta que a SUA sessão recebeu.

const CRM = {
  async config() {
    const c = await chrome.storage.local.get(['url', 'chave']);
    if (!c.url || !c.chave) throw new Error('Configure o endereço do CRM na extensão');
    return { url: String(c.url).replace(/\/$/, ''), chave: c.chave };
  },
  // uma coleta = uma linha na fila. O CRM decide o que fazer com ela.
  async enviar(fonte, dados) {
    const { url, chave } = await CRM.config();
    const r = await fetch(`${url}/rest/v1/coletas`, {
      method: 'POST',
      headers: { apikey: chave, Authorization: 'Bearer ' + chave,
                 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ fonte, dados }),
    });
    if (!r.ok) throw new Error(`o CRM recusou (${r.status}): ${(await r.text()).slice(0, 120)}`);
  },
  // os processos que o CRM quer que sejam consultados no e-Recursos.
  //
  // A LISTA A CONSULTAR é `crps_nups` (o número que a ficha guarda); `crps` é
  // o RESULTADO da última consulta. Ler o resultado — como esta função fazia —
  // devolvia vazio justamente na primeira vez, que é quando a extensão mais
  // serve: nunca tendo consultado, não havia resultado, e ela anunciava que
  // "o CRM não tem recurso nenhum com número" com as fichas todas preenchidas.
  async nupsDoCrm() {
    const { url, chave } = await CRM.config();
    const r = await fetch(
      `${url}/rest/v1/casos?select=crps_nups,crps_nup&encerrado_em=is.null&limit=5000`,
      { headers: { apikey: chave, Authorization: 'Bearer ' + chave } });
    if (!r.ok) throw new Error(`não consegui ler os recursos do CRM (${r.status})`);
    const linhas = await r.json();
    const nups = new Set();
    for (const l of linhas)
      for (const n of [...(Array.isArray(l.crps_nups) ? l.crps_nups : []), l.crps_nup]) {
        const d = String(n == null ? '' : n).replace(/\D/g, '');
        if (d.length >= 15 && d.length <= 25) nups.add(d);
      }
    return [...nups];
  },
};

const pausa = ms => new Promise(r => setTimeout(r, ms));

// o aviso que aparece na própria página do portal: quem clicou quer saber
// o que está acontecendo sem abrir o Console
function faixa(texto, cor = '#2B5FC7') {
  let f = document.getElementById('crm-faixa');
  if (!f) {
    f = document.createElement('div');
    f.id = 'crm-faixa';
    f.style.cssText = 'position:fixed;z-index:2147483647;left:50%;transform:translateX(-50%);' +
      'top:14px;padding:10px 18px;border-radius:10px;color:#fff;font:600 14px system-ui;' +
      'box-shadow:0 6px 24px rgba(0,0,0,.3);max-width:80vw;text-align:center';
    document.body.appendChild(f);
  }
  f.style.background = cor;
  f.textContent = texto;
  return f;
}
const faixaOk  = t => faixa(t, '#1E6F50');
const faixaErr = t => faixa(t, '#B3261E');
