// A PONTE DOS COLETORES COM O CRM, e a prova de vida.
//
// Regra que vale para a extensão inteira: ela COLETA e ENTREGA. Não decide
// nada. O que vira caso, o que atualiza, o que é possível duplicado — tudo
// isso continua no CRM, onde já está testado. Aqui só se junta o que os
// portais respondem e se grava numa fila; o CRM lê essa fila e mostra o plano
// antes de tocar em qualquer ficha.
//
// A EXTENSÃO NÃO PASSA POR CIMA DE NADA. Não gera nem reaproveita token de
// reCAPTCHA, não faz login no gov.br, não clica em "Buscar" por você.
//
// Quem conversa com o CRM é o service worker (crm-api.js): é lá que ficam o
// crachá e as permissões de domínio. Aqui ficou o pedido — e a resposta ao
// "você está aí?" do popup.
//
// Tudo pendurado no `window` com guarda: este arquivo é injetado de novo a
// cada clique no botão, e `const CRM` declarado duas vezes derruba o arquivo.

window.CRM = window.CRM || {
  async pedir(msg) {
    const r = await chrome.runtime.sendMessage(msg);
    if (!r) throw new Error('a extensão não respondeu — recarregue a página (F5)');
    if (r.erro) throw new Error(r.erro);
    return r;
  },
  enviar: (fonte, dados) => CRM.pedir({ tipo: 'crm', acao: 'enviar', fonte, dados }).then(() => true),
  // devolve { nups, fichas }: o número de fichas lidas é o que distingue
  // "não há recurso cadastrado" de "não estou enxergando o banco"
  nupsDoCrm: () => CRM.pedir({ tipo: 'crm', acao: 'nups' }),
};

// PROVA DE VIDA. O console do navegador nem sempre mostra o que a extensão
// escreve — e sem essa resposta, "a extensão não roda nesta página" e "roda,
// mas não vi a busca" ficam indistinguíveis. O popup pergunta; quem responde
// é este trecho, e só existe resposta se o arquivo estiver mesmo rodando ali.
if (!window.__crmProvaDeVida) {
  window.__crmProvaDeVida = true;
  chrome.runtime.onMessage.addListener((msg, _remetente, responder) => {
    if (!msg || msg.tipo !== 'vivo') return;
    responder({ ok: true, onde: location.href, coletor: !!window.__crmColetorNoAr });
    return true;
  });
}
