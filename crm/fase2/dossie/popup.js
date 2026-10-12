const $ = id => document.getElementById(id);

// qual coletor serve para a aba aberta
const COLETORES = {
  'meu.inss.gov.br': { arquivo: 'meuinss.js', rotulo: 'Meu INSS: CNIS, declaração, cartas, extrato de pagamento, processos, laudos, PPP e CAT.' },
  'consultaprocessos.inss.gov.br': { arquivo: 'recursos.js', rotulo: 'e-Recursos: todos os documentos de cada recurso.' },
  'servicos.mte.gov.br': { arquivo: 'mte.js', rotulo: 'Emprega Brasil: CTPS completa (digital e outros vínculos), extrato RAIS e extrato CAGED.' },
  'appiris.hcrp.usp.br': { hc: true, rotulo: 'HC Ribeirão: exames de imagem (todo o período), internações e relatórios. A aba vai passar sozinha pelas três telas.' },
  'consultacnpj.redesim.gov.br': { redesim: true, rotulo: 'Redesim · Minhas Empresas: os CNPJs em que o CPF é sócio ou titular. Você clica em PESQUISAR (captcha); a lista é gravada sozinha.' },
};

(async () => {
  const [aba] = await chrome.tabs.query({ active: true, currentWindow: true });
  const host = aba && aba.url ? new URL(aba.url).host : '';
  const c = COLETORES[host];
  const st = await chrome.storage.local.get(['quem', 'ultima_rodada', 'rodada_andamento', 'rodada_desde']);
  // "Rodar tudo": percorre Meu INSS → e-Recursos → Emprega Brasil → HC → Redesim, cada um na sua aba.
  // "rodando" com mais de 3 h é rodada que morreu (service worker encerrado): libera o botão
  const viva = st.rodada_andamento && st.rodada_desde && (Date.now() - st.rodada_desde) < 3 * 3600000;
  if (viva) { $('tudo').disabled = true; $('tudo').textContent = `rodando: ${st.rodada_andamento}`; }
  else if (st.ultima_rodada) $('rodada').textContent = `última rodada ${new Date(st.ultima_rodada.em).toLocaleString('pt-BR')}:\n• ${st.ultima_rodada.relato.join('\n• ')}`;
  $('abrir').onclick = async () => {
    const r = await chrome.runtime.sendMessage({ tipo: 'abrir' }).catch(() => null);
    $('rodada').className = 'meio';
    $('rodada').textContent = r && !r.erro
      ? `${r.abertos} aba(s) aberta(s). Entre em cada portal (gov.br; HC com o login do paciente) e depois clique em Rodar.`
      : (r && r.erro) || 'a extensão não respondeu';
  };
  $('tudo').onclick = async () => {
    $('tudo').disabled = true; $('tudo').textContent = 'rodando — acompanhe nas abas dos portais';
    const r = await chrome.runtime.sendMessage({ tipo: 'tudo' }).catch(e => ({ erro: String(e.message || e) }));
    if (!r || r.erro) {                      // não fecha: o motivo tem de ficar na tela
      $('tudo').disabled = false; $('tudo').textContent = '🔁 Rodar todos os portais';
      $('rodada').className = 'meio erro';
      $('rodada').textContent = (r && r.erro) || 'a extensão não respondeu — recarregue-a (↻ em chrome://extensions) e tente de novo';
      return;
    }
    setTimeout(() => window.close(), 1200);
  };
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
    // Redesim: o gancho no fetch precisa do mundo da página; a gravação, do mundo da extensão
    if (c.redesim) {
      await chrome.scripting.executeScript({ target: { tabId: aba.id }, files: ['regras.js', 'pagina.js', 'redesim-ponte.js'] });
      await chrome.scripting.executeScript({ target: { tabId: aba.id }, world: 'MAIN', files: ['redesim.js'] });
      setTimeout(() => window.close(), 1200); return;
    }
    await chrome.scripting.executeScript({ target: { tabId: aba.id }, files: ['regras.js', 'pagina.js', c.arquivo] });
    // não espera: a rodada leva minutos e o popup fecha sozinho; o progresso fica na página
    chrome.scripting.executeScript({ target: { tabId: aba.id }, func: () => window.dossieRodar() });
    setTimeout(() => window.close(), 1200);
  };
})();
