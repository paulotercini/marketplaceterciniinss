const res = document.getElementById('res');
const fmt = iso => {
  if (!iso) return 'nunca atualizado por aqui';
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  const q = new Date(iso).toLocaleDateString('pt-BR');
  return d <= 0 ? `atualizado hoje (${q})`
       : d === 1 ? `atualizado ontem (${q})`
       : `faz ${d} dias (${q})`;
};
chrome.storage.local.get(['ultima_pat', 'ultima_crps']).then(c => {
  document.getElementById('q-pat').textContent = fmt(c.ultima_pat);
  document.getElementById('q-crps').textContent = fmt(c.ultima_crps);
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
document.getElementById('b-pat').onclick  = () => rodar('pat');
document.getElementById('b-crps').onclick = () => rodar('crps');
document.getElementById('cfg').onclick = e => {
  e.preventDefault(); chrome.runtime.openOptionsPage();
};
