const res = document.getElementById('res');
const fmt = iso => {
  if (!iso) return 'nunca atualizado por aqui';
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  const q = new Date(iso).toLocaleDateString('pt-BR');
  return d <= 0 ? `atualizado hoje (${q})`
       : d === 1 ? `atualizado ontem (${q})`
       : `faz ${d} dias (${q})`;
};
chrome.storage.local.get(['ultima_pat', 'ultima_crps', 'ultima_pje', 'quem']).then(c => {
  document.getElementById('q-pat').textContent = fmt(c.ultima_pat);
  document.getElementById('q-crps').textContent = fmt(c.ultima_crps);
  document.getElementById('q-pje').textContent = fmt(c.ultima_pje);
  // sem login não se lê nada do CRM, e o erro só apareceria lá na frente
  document.getElementById('quem').textContent = c.quem
    ? `CRM: ${c.quem}` : '⚠ ainda não entrou no CRM — clique abaixo';
});
const rodar = fonte => {
  res.style.color = '#5B6069';
  res.textContent = 'abrindo o portal…';
  chrome.runtime.sendMessage({ tipo: 'rodar', fonte }, r => {
    if (!r) return (res.textContent = 'sem resposta — a página abriu?');
    if (r.erro) { res.style.color = '#B3261E'; res.textContent = r.erro; return; }
    res.style.color = '#1E6F50';
    res.textContent = r.esperando
      ? 'tela pronta — clique em "Buscar" nela'
      : 'rodando… acompanhe a faixa na página';
  });
};
// Responde de uma vez as três perguntas que a faixa de erro deixava no ar:
// estou logado? o banco devolve alguma ficha? alguma tem número de recurso?
document.getElementById('b-teste').onclick = () => {
  res.style.color = '#5B6069';
  res.textContent = 'perguntando ao CRM…';
  chrome.runtime.sendMessage({ tipo: 'crm', acao: 'diagnostico' }, r => {
    if (!r || r.erro) {
      res.style.color = '#B3261E';
      res.textContent = (r && r.erro) || 'sem resposta';
      return;
    }
    res.style.color = r.fichas && r.recursos ? '#1E6F50' : '#B4530A';
    res.textContent = `${r.quem || 'sem login'} · ${r.fichas} ficha(s) visíveis · `
      + `${r.recursos} com número de recurso`;
  });
};

// A prova de vida do outro lado: a extensão está mesmo rodando NA PÁGINA que
// está aberta? Sem esta resposta, "não roda ali" e "roda, mas não viu a
// busca" ficam iguais — e o console do navegador nem sempre mostra o que a
// extensão escreve, então não dá para depender dele.
document.getElementById('b-pagina').onclick = () => {
  res.style.color = '#5B6069';
  res.textContent = 'perguntando à página…';
  chrome.tabs.query({ active: true, currentWindow: true }, ([aba]) => {
    if (!aba) { res.textContent = 'nenhuma aba ativa'; return; }
    chrome.tabs.sendMessage(aba.id, { tipo: 'vivo' }, r => {
      if (chrome.runtime.lastError || !r) {
        res.style.color = '#B3261E';
        res.textContent = 'a extensão NÃO está rodando nesta página — '
          + 'clique no botão do portal, que ela se instala na hora';
        return;
      }
      res.style.color = r.coletor ? '#1E6F50' : '#B4530A';
      res.textContent = r.coletor
        ? 'extensão na página ✔ · coletor dentro da página ✔'
        : 'extensão na página ✔ · o coletor ainda não subiu';
    });
  });
};

document.getElementById('b-pat').onclick  = () => rodar('pat');
document.getElementById('b-crps').onclick = () => rodar('crps');
document.getElementById('b-pje').onclick  = () => rodar('pje');
document.getElementById('cfg').onclick = e => {
  e.preventDefault(); chrome.runtime.openOptionsPage();
};
