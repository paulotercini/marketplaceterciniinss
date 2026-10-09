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
      el.textContent = '📂 Dossiê · ' + texto;
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
  function guardar(out, fonte, nome, u8) {
    if (!u8) { out.inexistentes.push(nome); return; }
    const base = R.nomeSeguro(nome).replace(/\.pdf$/i, '');
    let arquivo = `${base}.pdf`;
    for (let n = 2; out.arquivos.some(a => a.fonte === fonte && a.arquivo === arquivo); n++) arquivo = `${base} (${n}).pdf`;
    out.arquivos.push({ fonte, arquivo, b64: R.b64(u8) });
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
      return { cliente: { cpf, nome }, links };
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

    fim(texto, cor) { D.faixa(texto, cor); },
  };
})();
