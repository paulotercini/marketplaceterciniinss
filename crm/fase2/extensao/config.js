const $ = id => document.getElementById(id);

chrome.storage.local.get(['url', 'chave', 'quem']).then(c => {
  $('url').value = c.url || '';
  $('chave').value = c.chave || '';
  mostrarQuem(c.quem);
});

function mostrarQuem(quem) {
  $('quem').className = quem ? 'ok' : 'erro';
  $('quem').textContent = quem ? `✔ conectado como ${quem}` : 'ainda não entrou';
}

$('salvar').onclick = async () => {
  await chrome.storage.local.set({
    url: $('url').value.trim(),
    chave: $('chave').value.trim(),
  });
  $('ok').textContent = '✔ guardado';
};

$('entrar').onclick = async () => {
  // salva o endereço junto: entrar sem ter guardado o Supabase é o erro óbvio
  await chrome.storage.local.set({ url: $('url').value.trim(), chave: $('chave').value.trim() });
  $('quem').className = 'ok';
  $('quem').textContent = 'entrando…';
  const r = await chrome.runtime.sendMessage(
    { tipo: 'crm', acao: 'entrar', email: $('email').value, senha: $('senha').value });
  $('senha').value = '';                     // a senha não fica nem no formulário
  if (!r || r.erro) {
    $('quem').className = 'erro';
    $('quem').textContent = (r && r.erro) || 'sem resposta';
    return;
  }
  mostrarQuem(r.quem);
};

$('sair').onclick = async () => {
  await chrome.runtime.sendMessage({ tipo: 'crm', acao: 'sair' });
  mostrarQuem(null);
};
