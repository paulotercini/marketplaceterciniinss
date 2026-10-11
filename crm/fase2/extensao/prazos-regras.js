// F192 · OS PRAZOS DOS TRIBUNAIS — regras puras, testáveis no node.
//
// Cada sistema tem a sua tela de prazos (medido ao vivo, 11.10.2026):
//   PJe   Painel do Advogado → EXPEDIENTES: a árvore "Pendentes de ciência ou
//         de resposta" e "Cujo prazo findou nos últimos 10 dias - sem resposta",
//         uma jurisdição por vez; cada linha da tabela formExpedientes:tbExpedientes
//         traz o ato, o meio, o prazo, a ciência e a "Data limite prevista".
//   eproc Painel → Citações/Intimações: o JSON de retornar_citacao_intimacao_estado
//         dá os links assinados de "prazo em aberto" e "decurso de prazo";
//         cada um é uma tabela infraTable com "Final Prazo".
//   e-SAJ /tarefas-adv/api/intimacoes: as intimações ainda sem ciência, sem prazo.
// Todas viram o mesmo item: { numero, ato, dias, expedido_em, ciencia_em, fim, situacao }.
// situacao: 'aberto' (corre), 'findo' (venceu sem resposta), 'sem_ciencia' (ainda não corre).
(function (raiz) {
  'use strict';

  const iso = s => { const m = String(s || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
  const CNJ = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;
  const texto = h => String(h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();

  // PJe: o texto da 2ª célula de uma linha dos expedientes
  //   NOME DO DESTINATÁRIO / Despacho (123) / Diário Eletrônico (02/10/2026 10:10) /
  //   Prazo:15 dias / O sistema registrou ciência em 08/10/2026 / Data limite prevista
  //   para manifestação: 29/10/2026 23:59 / PJEC 5000…-26.2025.4.03.6314 Assunto / …
  function lerExpedientePje(txt, grupo) {
    const linhas = String(txt || '').split('\n').map(l => l.trim()).filter(Boolean);
    const numero = (String(txt).match(CNJ) || [])[0];
    if (!numero) return null;
    const ato = linhas.map(l => l.match(/^(.+?)\s*\((\d{5,})\)$/)).find(Boolean);
    const meio = linhas.map(l => l.match(/^(.+?)\s*\((\d{2}\/\d{2}\/\d{4})[^)]*\)$/)).find(Boolean);
    const dias = (String(txt).match(/Prazo:\s*(\d+)\s*dia/i) || [])[1];
    const ciencia = iso((String(txt).match(/ci[êe]ncia em (\d{2}\/\d{2}\/\d{4})/i) || [])[1]);
    const fim = iso((String(txt).match(/Data limite prevista[^:]*:\s*(\d{2}\/\d{2}\/\d{4})/i) || [])[1]);
    return { numero, ato: ato ? ato[1] : null, ato_id: ato ? ato[2] : null, meio: meio ? meio[1] : null,
             dias: dias ? +dias : null, expedido_em: meio ? iso(meio[2]) : null, ciencia_em: ciencia, fim,
             situacao: /findou/i.test(grupo || '') ? 'findo' : (ciencia || fim ? 'aberto' : 'sem_ciencia') };
  }

  // eproc: a tabela de "prazo em aberto" ou de "decurso de prazo", pelos
  // nomes das colunas (a de decurso não tem "Início Prazo" nem a caixa de seleção)
  function lerPrazosEproc(html, situacao) {
    const h = String(html || '');
    const ths = [...h.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map(m => texto(m[1]));
    const col = nome => ths.findIndex(t => t.toLowerCase() === nome.toLowerCase());
    const cP = col('Processo'), cE = col('Evento e Prazo'), cEnv = col('Data envio requisição'),
          cI = col('Início Prazo'), cF = col('Final Prazo');
    const out = [];
    for (const tr of h.matchAll(/<tr[^>]*class="[^"]*infraTr(?:Clara|Escura)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const tds = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => texto(m[1]));
      const numero = ((tds[cP] || '').match(CNJ) || [])[0];
      if (!numero) continue;
      const ev = (tds[cE] || '').replace(/\s+/g, ' ').trim();
      const dias = (ev.match(/(\d+)\s*dias?\s*$/) || [])[1];
      out.push({ numero, ato: ev.replace(/\s*-?\s*\d+\s*dias?\s*$/, '').trim() || null, ato_id: null, meio: null,
                 dias: dias ? +dias : null, expedido_em: iso(tds[cEnv]), ciencia_em: null,
                 inicio: cI >= 0 ? iso(tds[cI]) : null, fim: iso(tds[cF]), situacao });
    }
    return out;
  }

  // e-SAJ: a intimação sem ciência ainda não corre — vai com a data da
  // disponibilização; o CRM conta a ciência tácita (10 dias) a partir dela.
  // A API não traz o número CNJ, só o código interno (cdProcesso): quem chama
  // resolve o código pela ficha e passa `numeroDe(cd)`. O despacho vem inteiro
  // em `descricao` — é o que se manda fazer, e o prazo costuma estar nele.
  function lerIntimacoesEsaj(json, numeroDe) {
    const lista = Array.isArray(json) ? json : ((json && (json.content || json.intimacoes || json.lista)) || []);
    return lista.map(i => {
      const desc = String(i.descricao || '').replace(/\s+/g, ' ').trim();
      const numero = (numeroDe && numeroDe(i.cdProcesso)) || (`${i.titulo || ''} ${desc}`.match(CNJ) || [])[0];
      if (!numero) return null;
      const d = String(i.dataMovimentacao || '');
      const dias = (desc.match(/prazo (?:legal )?de (\d+)\s*\(?[^)]*\)?\s*dias/i) || [])[1];
      return { numero, ato: String(i.titulo || '').trim() || null, ato_id: i.id != null ? String(i.id) : null,
               meio: 'Portal e-SAJ', texto: desc.slice(0, 400) || null, dias: dias ? +dias : null,
               expedido_em: (d.match(/^\d{4}-\d{2}-\d{2}/) || [])[0] || iso(d), ciencia_em: null, fim: null,
               situacao: String(i.ciencia) === 'true' ? 'aberto' : 'sem_ciencia' };
    }).filter(Boolean);
  }

  const API = { lerExpedientePje, lerPrazosEproc, lerIntimacoesEsaj };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.PRAZOS_REGRAS = raiz.PRAZOS_REGRAS || API;
})(typeof window !== 'undefined' ? window : globalThis);
