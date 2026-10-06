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
  // devolve { numeros, fichas }: os números do TJSP nas fichas abertas
  processosTjsp: () => CRM.pedir({ tipo: 'crm', acao: 'processos-tjsp' }),
  // devolve { favoritos }: os links de processo do e-SAJ nas pastas "X a Y" dos favoritos
  favoritosEsaj: () => CRM.pedir({ tipo: 'crm', acao: 'favoritos-esaj' }),

  // F184 · baixa (nesta sessão logada) e guarda no CRM as peças e os
  // documentos (tudo menos expediente — docs-regras.js); marca `caminho`
  // em cada um que ficou guardado. Um por vez, com
  // pausa: o portal é do tribunal, e derrubar a sessão custa a coleta inteira.
  // `baixar(doc)` → Response, para o portal que precisa de cabeçalho próprio.
  // Falha num documento não derruba a coleta: o andamento vai sem ele.
  async guardarDocs(origem, processo, docs, { todos = false, baixar, pausaMs = 600 } = {}) {
    const R = window.DOCS_REGRAS;
    let n = 0;
    for (const d of docs || []) {
      if (!d || (!d.url && !baixar) || (!todos && !R.vaiBaixar(d.nome))) continue;
      const caminho = R.caminhoDoc(origem, processo, d);
      try {
        if (!(await CRM.pedir({ tipo: 'crm', acao: 'doc-existe', caminho })).existe) {
          const r = baixar ? await baixar(d)
            : await fetch(new URL(d.url, location.href), { credentials: 'include' });
          if (!r || !r.ok) continue;
          let buf = new Uint8Array(await r.arrayBuffer());
          let ctype = r.headers.get('content-type');
          let tipoDoc = R.tipoDoConteudo(buf, ctype);
          // a página do visualizador (eproc, e-SAJ) embrulha o documento: segue
          // até ele, no máximo dois andares
          for (let andar = 0, base = r.url || location.href; tipoDoc === 'text/html' && andar < 2; andar++) {
            const miolo = R.enderecoDoMiolo(new TextDecoder().decode(buf));
            if (!miolo) break;
            const r2 = await fetch(new URL(miolo, base), { credentials: 'include' });
            if (!r2.ok) { tipoDoc = null; break; }
            base = r2.url; buf = new Uint8Array(await r2.arrayBuffer());
            ctype = r2.headers.get('content-type');
            tipoDoc = R.tipoDoConteudo(buf, ctype);
          }
          if (!tipoDoc) continue;                      // tela de login ou erro, não documento
          // HTML em outro charset (o eproc é ISO-8859-1) vai ao bucket em UTF-8
          if (tipoDoc === 'text/html') {
            const cs = R.charsetDoHtml(buf, ctype);
            let jaUtf8 = true;
            try { new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { jaUtf8 = false; }
            if (!jaUtf8 && !/^utf-?8$/.test(cs)) {
              let html = new TextDecoder(cs).decode(buf);
              html = html.replace(/<meta[^>]*charset[^>]*>/gi, '').replace(/<head[^>]*>/i, m => m + '<meta charset="utf-8">');
              if (!/charset="utf-8"/.test(html)) html = '<meta charset="utf-8">' + html;
              buf = new TextEncoder().encode(html);
            }
          }
          let s = '';
          for (let i = 0; i < buf.length; i += 8192) s += String.fromCharCode.apply(null, buf.subarray(i, i + 8192));
          await CRM.pedir({ tipo: 'crm', acao: 'guardar-doc', caminho, tipoDoc, b64: btoa(s) });
          await new Promise(res => setTimeout(res, pausaMs));
        }
        d.caminho = caminho; n++;
      } catch (e) { console.warn('[CRM] documento não guardado:', d.nome, e); }
    }
    return n;
  },
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
