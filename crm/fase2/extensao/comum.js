// A PONTE DOS COLETORES COM O CRM.
//
// Regra que vale para a extensão inteira: ela COLETA e ENTREGA. Não decide
// nada. O que vira caso, o que atualiza, o que é possível duplicado — tudo
// isso continua no CRM, onde já está testado. Aqui só se junta o que os
// portais respondem e se grava numa fila; o CRM lê essa fila e mostra o plano
// antes de tocar em qualquer ficha.
//
// A EXTENSÃO NÃO PASSA POR CIMA DE NADA. Não gera nem reaproveita token de
// reCAPTCHA, não faz login no gov.br, não clica em "Buscar" por você. Ela
// prepara a tela e escuta a resposta que a SUA sessão recebeu.
//
// Quem conversa com o CRM é o service worker (crm-api.js): é lá que ficam o
// crachá e as permissões de domínio. Aqui ficou só o pedido.

const CRM = {
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
