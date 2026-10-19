// DOSSIÊ · NOSSO HC RIBEIRÃO (appiris.hcrp.usp.br, Oracle APEX) — exames de
// imagem, internações e relatórios.
//
// Mapeado em 08.10.2026 numa sessão logada. O portal não tem API de arquivos:
// cada clique faz o APEX buscar o PDF e pôr o base64 num campo escondido da
// página (P0_PDF_PARA_EXIBIR; nos relatórios às vezes P8_BASE64_PDF) antes de
// abrir a janela "Exibição de Arquivo". O coletor clica, lê o campo e fecha.
//
//   Exames      filtro P4_EXAME_DATA = 01/01/1800 ("Exibir tudo", não 3 meses);
//               um cartão por data ([data-num-ped]); com um exame só, o clique
//               já dá o PDF; com vários, abre "Detalhes" com um checkbox por
//               exame → marca só os de imagem "Atendido" → "Ver/Baixar Selecionados"
//   Internações botão "Visualizar Autorização de Internação" de cada linha
//   Relatórios  cada cartão (a.a-CardView-fullLink), todos no período
//
// Cada tela é uma página: quem anda entre elas é o service worker (fundo.js,
// rodarHc); aqui fica o que se faz DENTRO de cada uma. Roda no mundo da PÁGINA
// (world MAIN): os cliques abrem links "javascript:" do APEX, que no mundo
// isolado da extensão não garantidamente rodam. Daqui não há chrome.*: cada
// tela devolve os PDFs (base64) e o service worker é quem grava.
(() => {
  if (window !== window.top) return;
  const R = window.DOSSIE_REGRAS;
  const D = {
    pausa: ms => new Promise(r => setTimeout(r, ms)),
    faixa(texto, cor) {
      let el = document.getElementById('dossie-faixa');
      if (!el) {
        el = document.createElement('div');
        el.id = 'dossie-faixa';
        el.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483647;padding:12px 16px;'
          + 'border-radius:10px;font:600 14px system-ui;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.25);white-space:pre-line';
        document.body.appendChild(el);
      }
      el.style.background = cor || '#2B5FC7';
      // a faixa final fica na tela de propósito (é a prova de que rodou): diz que acabou
      const fim = cor === '#1E6F50' ? '✔ CONCLUÍDO · ' : cor === '#9A6700' ? '✔ CONCLUÍDO COM RESSALVAS · ' : '';
      el.textContent = '📂 Dossiê · ' + fim + texto;
    },
  };
  const $ = id => document.getElementById(id);
  const visiveis = () => [...document.querySelectorAll('.ui-dialog')].filter(d => getComputedStyle(d).display !== 'none');
  const dialogo = titulo => visiveis().find(d => ((d.querySelector('.ui-dialog-title') || {}).innerText || '').trim() === titulo);
  const fechar = titulo => visiveis().forEach(d => {
    if (!titulo || ((d.querySelector('.ui-dialog-title') || {}).innerText || '').trim() === titulo) {
      const x = d.querySelector('.ui-dialog-titlebar-close'); if (x) x.click();
    }
  });
  const dataBr = s => String(s || '').replace(/\//g, '-');
  // as listas chegam por AJAX depois do "carregou" (os relatórios mostram "Processando"):
  // espera aparecerem; vazio depois do prazo vira falha, nunca silêncio
  async function esperarLista(seletor, prazo = 25000) {
    for (let t = 0; t < prazo; t += 500) {
      const itens = [...document.querySelectorAll(seletor)];
      if (itens.length && !/Processando/.test(document.body.innerText)) return itens;
      await D.pausa(500);
    }
    return [...document.querySelectorAll(seletor)];
  }

  // clica e espera o PDF aparecer no campo escondido; null se não vier no prazo
  async function pegarPdf(clicar, prazo = 25000) {
    for (const id of ['P0_PDF_PARA_EXIBIR', 'P8_BASE64_PDF']) if ($(id)) $(id).value = '';
    clicar();
    for (let t = 0; t < prazo; t += 400) {
      await D.pausa(400);
      const v = ($('P0_PDF_PARA_EXIBIR') || {}).value || ($('P8_BASE64_PDF') || {}).value || '';
      if (v.length > 100) {
        await D.pausa(300);
        fechar('Exibição de Arquivo');
        return R.comoPdf(Uint8Array.from(atob(v.replace(/\s/g, '')), c => c.charCodeAt(0)));
      }
    }
    fechar('Exibição de Arquivo');
    return null;
  }

  const contagem = () => ({ arquivos: [], falhas: [], inexistentes: [] });
  // nome repetido (3 relatórios no mesmo minuto) ganha " (2)", " (3)": senão um sobrescreve o outro
  function guardar(out, fonte, nome, u8, mime = 'application/pdf') {
    if (!u8) { out.inexistentes.push(nome); return; }
    const ext = mime === 'image/jpeg' ? 'jpg' : 'pdf';
    const base = R.nomeSeguro(nome).replace(/\.(pdf|jpg)$/i, '');
    let arquivo = `${base}.${ext}`;
    for (let n = 2; out.arquivos.some(a => a.fonte === fonte && a.arquivo === arquivo); n++) arquivo = `${base} (${n}).${ext}`;
    out.arquivos.push({ fonte, arquivo });
    // o PDF vai à fila que o service worker esvazia a cada 3 s (fundo.js, telaHc):
    // devolver 32 relatórios de uma vez no fim estourava a resposta e a tela "travava"
    (window.__dossieHcFila = window.__dossieHcFila || []).push({ fonte, arquivo, b64: R.b64(u8), mime });
  }

  window.DOSSIE_HC = {
    // quem é o paciente e onde ficam as três telas (os links do menu levam o token de acesso)
    // `guardado` = último cliente do Meu INSS (chrome.storage, passado pelo service worker)
    async info(guardado) {
      const id = R.jwt(($('P0_TOKEN_ID') || {}).value) || {};
      const acesso = R.jwt(($('P0_TOKEN_ACESSO') || {}).value) || {};
      let cpf = String(id.preferred_username || '').replace(/\D/g, '');
      let nome = id.name || [acesso.given_name, acesso.family_name].filter(Boolean).join(' ');
      if (cpf.length !== 11) {
        // login pelo registro HC (sem gov.br) não traz CPF: usa o último dossiê do Meu INSS
        if (!guardado) return { erro: 'não achei o CPF do paciente — entre no HC com "Entrar com gov.br" ou rode antes o dossiê no Meu INSS do paciente' };
        cpf = guardado.cpf; nome = guardado.nome || nome;
      }
      const link = parte => { const a = [...document.querySelectorAll('a')].find(a => (a.getAttribute('href') || '').includes(`/${parte}?`)); return a && a.href; };
      const links = { exames: link('exames'), internacoes: link('internacoes'), relatorios: link('relatorios') };
      if (!links.exames && !links.internacoes && !links.relatorios) return { erro: 'não achei o menu do HC — volte à página inicial do portal e clique de novo' };
      // o registro HC (0000000X) é a chave do paciente no visualizador de imagens
      return { cliente: { cpf, nome }, links, registro: String(acesso.codigo_paciente || acesso.sub || '') };
    },

    async exames() {
      const filtro = $('P4_EXAME_DATA');
      if (filtro && filtro.value !== '01/01/1800') {         // "Exibir tudo": recarrega a página
        filtro.value = '01/01/1800';
        filtro.dispatchEvent(new Event('change', { bubbles: true }));
        return { recarregar: true };
      }
      const out = contagem();
      // data com imagem "Em processamento pelo lab" não tem link nenhum: só registra
      for (const c of document.querySelectorAll('li, .t-Card'))
        if (!c.querySelector('[data-num-ped]') && /Em processamento/i.test(c.innerText) && c.innerText.length < 800
            && R.ehExameDeImagem(c.innerText) && !c.querySelector('li, .t-Card'))
          out.inexistentes.push(`${c.innerText.trim().slice(0, 11)}: em processamento no HC`);
      const cartoes = await esperarLista('[data-num-ped]');
      let ultimaTabela = '';
      if (!cartoes.length) out.falhas.push('nenhuma data de exame apareceu na tela');
      for (const [i, a] of cartoes.entries()) {
        const caixa = a.closest('li, .t-Card') || a.parentElement;
        if (!R.ehExameDeImagem(caixa.innerText)) continue;       // só sangue/laboratório nessa data
        const data = dataBr(a.dataset.dta);
        D.faixa(`HC · exames: data ${i + 1} de ${cartoes.length} (${data})…`);
        // prazo de 2 min: exame digitalizado o HC "junta as informações" por mais de 1 min
        if (a.dataset.nom) {                                     // exame único: o clique já dá o PDF
          guardar(out, 'HC Ribeirao/Exames', `${data} ${a.dataset.nom}`, await pegarPdf(() => a.click(), 120000));
          continue;
        }
        a.click();                                               // vários: abre "Detalhes"
        // A janela é reaproveitada entre datas: a tabela vale quando aparece com
        // linhas de exame e DIFERENTE da data anterior (ou depois de 4s, se igual).
        // Exame que não está "Atendido" pode vir sem checkbox — não exigir checkbox
        // aqui: foi o que fez 5 datas darem "a lista não abriu" (08.10.2026).
        const linhasDe = d => [...d.querySelectorAll('tr')].filter(tr => /Atendido|Realiza|Cancelad|Coleta|Process|Agendad/i.test(tr.innerText));
        let dlg = null, linhas = [];
        for (let t = 0; t < 15000 && !dlg; t += 400) {
          await D.pausa(400);
          const d = dialogo('Detalhes');
          const l = d ? linhasDe(d) : [];
          const texto = l.map(tr => tr.innerText).join('|');
          if (l.length && (texto !== ultimaTabela || t >= 4000)) { dlg = d; linhas = l; ultimaTabela = texto; }
        }
        if (!dlg) { out.falhas.push(`${data}: a lista de exames não abriu`); fechar('Detalhes'); continue; }
        await D.pausa(800);                                      // o APEX termina de preencher a tabela
        const alvo = linhas.filter(tr => R.ehExameDeImagem(tr.innerText) && /Atendido/i.test(tr.innerText));
        for (const tr of linhas) {
          const cb = tr.querySelector('input[name=f01]');
          if (cb && cb.checked !== alvo.includes(tr)) cb.click();
        }
        if (!alvo.length) {                                      // imagem ainda "Em Realização": não há laudo
          out.inexistentes.push(`${data}: exame de imagem ainda sem laudo`);
          fechar('Detalhes'); continue;
        }
        if (alvo.some(tr => !tr.querySelector('input[name=f01]'))) {
          out.falhas.push(`${data}: exame de imagem atendido sem caixa de seleção`);
          fechar('Detalhes'); continue;
        }
        const nomes = alvo.map(tr => tr.innerText.replace(/Atendido/i, '').replace(/\s+/g, ' ').trim()).join(' + ');
        const btn = [...dlg.querySelectorAll('button')].find(b => /Ver\/Baixar/i.test(b.innerText));
        guardar(out, 'HC Ribeirao/Exames', `${data} ${nomes}`.slice(0, 150), await pegarPdf(() => btn.click(), 120000));
        fechar('Detalhes');
      }
      return out;
    },

    // "Visualizar Imagens Médicas" (tela de Exames) pede ao APEX um bilhete de uso
    // único, que vence em minutos, e abre o visualizador em outra aba: aqui só se
    // captura o endereço (window.open interceptado); o service worker abre a aba
    // em segundo plano na hora, antes das outras telas
    async bilhete() {
      const b = [...document.querySelectorAll('button')].find(e => /Visualizar Imagens/i.test(e.innerText));
      if (!b) return { inexistente: 'a tela de Exames não tem o botão de imagens' };
      let url = null; const abrir = window.open;
      window.open = u => { url = String(u); return null; };
      b.click();
      for (let t = 0; t < 10000 && !url; t += 400) {
        await D.pausa(400);
        const c = [...document.querySelectorAll('.ui-dialog button')].find(e => /Visualizar Imagens/i.test(e.innerText));
        if (c) c.click();
      }
      window.open = abrir;
      return url ? { url } : { erro: 'o HC não abriu o visualizador de imagens' };
    },

    // Agfa XERO Viewer (hcrpeiweb01, mapeado em 19.10.2026): tudo sai de /wado/ com a
    // sessão da aba — STUDY lista os exames, IMAGE as imagens de cada um e XERO
    // devolve a imagem renderizada em JPEG. O "Exportar o DICOM" exige senha e
    // entrega um zip com visualizador, inútil para juntar ao processo.
    async imagens(a) {
      const out = contagem(), registro = a && a.registro;
      if (!registro) { out.falhas.push('sem o registro HC do paciente'); return out; }
      const V = (((document.scripts[0] || {}).src || '').match(/[?&]v=([^&]+)/) || [])[1] || '';
      const wado = p => fetch('/wado/?' + new URLSearchParams({ v: V, ae: 'local', language: 'pt_BR', ...p }));
      const json = async p => { const r = await wado({ contentType: 'text/javascript', ...p }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); };
      const colher = (n, cond, acc = [], se = null) => { se = n.seriesUID || se; if (cond(n)) acc.push({ ...n, se }); (n.children || []).forEach(c => colher(c, cond, acc, se)); return acc; };
      const estudos = colher(await json({ requestType: 'STUDY', PatientIdentifier: 'EIHCRP:' + registro, groupByIssuer: '*' }), n => n.tagName === 'study');
      if (!estudos.length) out.inexistentes.push('nenhum exame com imagem no visualizador');
      for (const [i, e] of estudos.entries()) {
        const rot = `${dataBr(e.StudyDateF)} ${e.StudyDescription || ''}`.trim();
        if (!Number(e.NumberOfStudyRelatedInstances)) { out.inexistentes.push(`${rot}: sem imagem disponível no visualizador`); continue; }
        D.faixa(`HC · imagens: exame ${i + 1} de ${estudos.length} (${rot})…`);
        try {
          const imgs = colher(await json({ requestType: 'IMAGE', regroup: '*', studyUID: e.studyUID, Position: 0, Count: 256, fromHeader: 'false' }), n => !!n.objectUID);
          for (const [k, im] of imgs.entries()) {
            const r = await wado({ requestType: 'XERO', studyUID: e.studyUID, seriesUID: im.se, objectUID: im.objectUID, rows: 3000 });
            guardar(out, 'HC Ribeirao/Imagens', `${rot} ${k + 1}`.slice(0, 150), r.ok ? new Uint8Array(await r.arrayBuffer()) : null, 'image/jpeg');
            await D.pausa(300);
          }
        } catch (err) { out.falhas.push(`${rot}: ${err.message || err}`); }
      }
      return out;
    },

    async internacoes() {
      const out = contagem();
      const botoes = await esperarLista('button[title="Visualizar Autorização de Internação"]', 15000);
      for (const [i, b] of botoes.entries()) {
        const linha = (b.closest('tr') || b.parentElement).innerText.replace(/\s+/g, ' ').replace(/\bSUS\b.*$/, '').trim();
        D.faixa(`HC · internação ${i + 1} de ${botoes.length}…`);
        guardar(out, 'HC Ribeirao/Internacoes', `Internacao ${dataBr(linha)}`, await pegarPdf(() => b.click(), 40000));
      }
      return out;
    },

    async relatorios() {
      const out = contagem();
      const cartoes = await esperarLista('.a-CardView-items > li');
      if (!cartoes.length) out.falhas.push('nenhum relatório apareceu na tela');
      for (const [i, li] of cartoes.entries()) {
        const a = li.querySelector('a.a-CardView-fullLink');
        if (!a) continue;
        const t = li.innerText.replace(/\s+/g, ' ');
        const titulo = (t.match(/RELAT[ÓO]RIO [A-ZÁÉÍÓÚÇÃÕ ]+?(?= RELAT| Data)/) || ['Relatorio'])[0];
        const quando = (t.match(/Data:\s*(\S+)\s+(\d{2}):(\d{2}):(\d{2})/) || []);
        D.faixa(`HC · relatório ${i + 1} de ${cartoes.length}…`);
        guardar(out, 'HC Ribeirao/Relatorios',
          `${quando[1] || ''} ${quando[2] ? `${quando[2]}h${quando[3]}m${quando[4]}` : ''} ${titulo}`.trim(), await pegarPdf(() => a.click(), 40000));
      }
      return out;
    },

    // dispara a tela e volta na hora; o resultado fica em window.__dossieHcPronto
    rodar(a) {
      const { tela, arg } = typeof a === 'string' ? { tela: a } : a;
      window.__dossieHcPronto = null; window.__dossieHcFila = [];
      Promise.resolve().then(() => this[tela](arg)).then(r => { window.__dossieHcPronto = r || contagem(); },
        e => { window.__dossieHcPronto = { ...contagem(), falhas: [String(e && e.message || e)] }; });
      return true;
    },
    fim(a) { D.faixa(a && a.texto != null ? a.texto : a, a && a.cor); },
  };
})();
