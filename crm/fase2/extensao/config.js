chrome.storage.local.get(['url', 'chave']).then(c => {
  document.getElementById('url').value = c.url || '';
  document.getElementById('chave').value = c.chave || '';
});
document.getElementById('salvar').onclick = async () => {
  await chrome.storage.local.set({
    url: document.getElementById('url').value.trim(),
    chave: document.getElementById('chave').value.trim(),
  });
  document.getElementById('ok').textContent = '✔ guardado';
};
