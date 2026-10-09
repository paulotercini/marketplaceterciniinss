const $ = id => document.getElementById(id);

// qual coletor serve para a aba aberta
const COLETORES = {
  'meu.inss.gov.br': { arquivo: 'meuinss.js', rotulo: 'Meu INSS: CNIS, declaração, cartas, extrato de pagamento, processos, laudos, PPP e CAT.' },
  'consultaprocessos.inss.gov.br': { arquivo: 'recursos.js', rotulo: 'e-Recursos: todos os documentos de cada recurso.' },
  'servicos.mte.gov.br': { arquivo: 'mte.js', rotulo: 'Emprega Brasil: CTPS completa (digital e outros vínculos), extrato RAIS e extrato CAGED.' },
  'appiris.hcrp.usp.br': { hc: true, rotulo: 'HC Ribeirão: exames de imagem (todo o período), internações e relatórios. A aba vai passar sozinha pelas três telas.' },
};

(async () => {
  const [aba] = await chrome.tabs.query({ active: true, currentWindow: true });
  const host = aba && aba.url ? new URL(aba.url).host : '';
  const c = COLETORES[host];
  const st = await chrome.storage.local.get(['quem']);
  $('crm').textContent = st.quem ? `CRM: ${st.quem}` : 'CRM: não conectado.';
  chrome.runtime.sendNativeMessage('br.tercini.dossie', { acao: 'ping' }, r => {
    const linha = document.createElement('p');
    if (chrome.runtime.lastError || !r) {
      linha.className = 'erro';
      linha.textContent = 'Drive: programa não instalado — os arquivos vão para Downloads/Dossie (rode host/instalar.ps1).';
    } else linha.textContent = r.existe ? `Drive: ${r.raiz}` : `Drive: ${r.raiz} não está acessível agora (o Google Drive está aberto?)`;
    $('crm').after(linha);
  });
  if (!c) {
    $('onde').innerHTML = 'Abra, já logado com o gov.br do cliente, o <b>Meu INSS</b>, o <b>e-Recursos</b>, o <b>Emprega Brasil</b> ou o <b>HC Ribeirão</b> e clique de novo.';
    $('onde').className = 'erro';
    return;
  }
  $('onde').textContent = c.rotulo;
  $('baixar').disabled = false;
  $('baixar').onclick = async () => {
    $('baixar').disabled = true;
    $('baixar').textContent = 'baixando — acompanhe na faixa azul da página';
    // o HC anda por três páginas: quem conduz é o service worker, que sobrevive à troca de página
    if (c.hc) { await chrome.runtime.sendMessage({ tipo: 'hc', tabId: aba.id }); setTimeout(() => window.close(), 1200); return; }
    await chrome.scripting.executeScript({ target: { tabId: aba.id }, files: ['regras.js', 'pagina.js', c.arquivo] });
    // não espera: a rodada leva minutos e o popup fecha sozinho; o progresso fica na página
    chrome.scripting.executeScript({ target: { tabId: aba.id }, func: () => window.dossieRodar() });
    setTimeout(() => window.close(), 1200);
  };
})();
