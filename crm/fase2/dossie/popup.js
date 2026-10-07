const $ = id => document.getElementById(id);

// qual coletor serve para a aba aberta
const COLETORES = {
  'meu.inss.gov.br': { arquivo: 'meuinss.js', rotulo: 'Meu INSS: CNIS, declaração, cartas, extrato de pagamento, processos, laudos, PPP e CAT.' },
  'consultaprocessos.inss.gov.br': { arquivo: 'recursos.js', rotulo: 'e-Recursos: todos os documentos de cada recurso.' },
  'servicos.mte.gov.br': { arquivo: 'mte.js', rotulo: 'Emprega Brasil: CTPS completa (digital e outros vínculos), extrato RAIS e extrato CAGED.' },
};

(async () => {
  const [aba] = await chrome.tabs.query({ active: true, currentWindow: true });
  const host = aba && aba.url ? new URL(aba.url).host : '';
  const c = COLETORES[host];
  const st = await chrome.storage.local.get(['quem']);
  $('crm').textContent = st.quem ? `CRM: ${st.quem}` : 'CRM: não conectado — os arquivos vão só para a pasta Downloads/Dossie.';
  if (!c) {
    $('onde').innerHTML = 'Abra, já logado com o gov.br do cliente, o <b>Meu INSS</b>, o <b>e-Recursos</b> ou o <b>Emprega Brasil</b> e clique de novo.';
    $('onde').className = 'erro';
    return;
  }
  $('onde').textContent = c.rotulo;
  $('baixar').disabled = false;
  $('baixar').onclick = async () => {
    $('baixar').disabled = true;
    $('baixar').textContent = 'baixando — acompanhe na faixa azul da página';
    await chrome.scripting.executeScript({ target: { tabId: aba.id }, files: ['regras.js', 'pagina.js', c.arquivo] });
    // não espera: a rodada leva minutos e o popup fecha sozinho; o progresso fica na página
    chrome.scripting.executeScript({ target: { tabId: aba.id }, func: () => window.dossieRodar() });
    setTimeout(() => window.close(), 1200);
  };
})();
