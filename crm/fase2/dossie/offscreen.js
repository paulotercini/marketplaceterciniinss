// base64 → blob: URL para o chrome.downloads. Cada URL é solta depois de um
// minuto (o download já começou; segurar o blob só ocuparia memória).
chrome.runtime.onMessage.addListener((m, _de, responder) => {
  if (!m || m.tipo !== 'blob') return false;
  const bytes = Uint8Array.from(atob(m.b64), c => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  responder(url);
  return false;
});
