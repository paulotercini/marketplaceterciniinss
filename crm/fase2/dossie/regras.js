// DOSSIÊ · regras puras (testáveis no node): nome de pasta e de arquivo,
// leitura do crachá do gov.br e o reconhecimento do PDF na resposta.
//
// Os portais do INSS devolvem o mesmo PDF de três jeitos: os bytes crus
// (CNIS, declaração, carta), uma string base64 dentro de JSON (a cópia do
// processo, `consolidadorservices/pap`) ou um JSON de erro com status 200.
// `comoPdf` resolve os três: devolve os bytes do PDF ou null.
(function (raiz) {

  const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

  // nome que o Windows e o Storage aceitam: sem / \ : * ? " < > | e sem espaço sobrando
  const nomeSeguro = s => String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, 120) || 'documento';

  // chave do Storage do Supabase: só ASCII, sem espaço
  const slug = s => semAcento(nomeSeguro(s)).replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-').replace(/^-|-$/g, '') || 'documento';

  const pastaCliente = (nome, cpf) => `Dossie/${nomeSeguro(`${nome || 'Cliente'} ${cpf || ''}`)}`;

  // payload do JWT (gov.br/Meu INSS): base64url, UTF-8
  function jwt(tok) {
    try {
      const b = String(tok || '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const bin = atob(b + '='.repeat((4 - b.length % 4) % 4));
      return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
    } catch (e) { return null; }
  }

  const ehPdf = u8 => u8 && u8.length > 4 && u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46;

  function comoPdf(buf) {
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf || []);
    if (ehPdf(u8)) return u8;
    let t = new TextDecoder().decode(u8).trim();
    if (/^["{][\s\S]*["}]$/.test(t)) { try { t = JSON.parse(t); } catch (e) {} }
    // {arquivo: "<base64>"} e afins: o campo de texto mais longo é o PDF
    if (t && typeof t === 'object')
      t = Object.values(t).filter(v => typeof v === 'string').sort((a, b) => b.length - a.length)[0] || '';
    t = String(t).replace(/^data:[^,]*,/, '');
    if (!/^[A-Za-z0-9+/=\s]+$/.test(t)) return null;
    try {
      const bin = Uint8Array.from(atob(t.replace(/\s/g, '')), c => c.charCodeAt(0));
      return ehPdf(bin) ? bin : null;
    } catch (e) { return null; }
  }

  // a frase que o INSS manda no lugar do PDF ({"mensagem": "..."}, {"result": "..."}…), curta
  function mensagemDoPortal(buf) {
    try {
      const j = JSON.parse(new TextDecoder().decode(buf instanceof Uint8Array ? buf : new Uint8Array(buf || [])));
      const m = typeof j === 'string' ? '' : ['mensagem', 'message', 'result', 'erro', 'error', 'descricao']
        .map(k => j && j[k]).find(v => typeof v === 'string' && v.trim());
      return m ? m.trim().slice(0, 140) : '';
    } catch (e) { return ''; }
  }

  // bytes → base64 em blocos (String.fromCharCode(...u8) estoura a pilha em PDF grande)
  function b64(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  }

  // extrato de pagamento: os últimos 12 meses, do dia 1 de 11 meses atrás ao fim do mês corrente
  function janela12Meses(hoje) {
    const d = hoje || new Date();
    const ini = new Date(d.getFullYear(), d.getMonth() - 11, 1);
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const f = x => `${String(x.getDate()).padStart(2, '0')}-${String(x.getMonth() + 1).padStart(2, '0')}-${x.getFullYear()}`;
    return [f(ini), f(fim)];
  }

  // NUP do e-Recursos reconhecido pelo FORMATO (15 a 25 dígitos), como no crps.js
  // do CRM: nome de campo do INSS muda, formato não. Com `cpf`, fica só o item
  // que traz esse CPF em algum campo — quando a lista é do advogado, não do cliente.
  function nupsDaLista(lista, cpf) {
    const itens = (Array.isArray(lista) ? lista : []).filter(x => x && typeof x === 'object');
    const comCpf = cpf ? itens.filter(x => Object.values(x).some(v => String(v == null ? '' : v).replace(/\D/g, '') === cpf)) : [];
    const fora = new Set();
    for (const item of (comCpf.length ? comCpf : itens))
      for (const v of Object.values(item)) {
        const d = String(v == null ? '' : v).replace(/\D/g, '');
        if (d.length >= 15 && d.length <= 25) fora.add(d);
      }
    return { nups: [...fora], filtrouPorCpf: comCpf.length > 0 };
  }

  // HC Ribeirão: exame de imagem e de método (laudo), não exame de sangue/laboratório.
  // ponytail: lista por palavra; exame que não casar fica de fora — some aqui o nome que faltar
  const IMAGEM = /RADIOGRAF|\bRX\b|RAIO[\s-]?X|TOMOGRAF|RESSON[AÂ]NCIA|\bRNM\b|ULTRA[\s-]?SSON|ULTRA[\s-]?SON|ECOGRAF|ECOCARDIO|DOPPLER|DUPLEX|MAMOGRAF|DENSITOMETR|CINTILOGRAF|\bPET\b|ANGIO|ARTERIOGRAF|FLEBOGRAF|UROGRAF|FLUOROSCOP|ESOFAGOGRAF|ENEMA|ENDOSCOP|COLONOSCOP|BRONCOSCOP|NEUROMIOGRAF|ELETROCARDIO|ELETROENCEFALO|\bECG\b|\bEEG\b|HOLTER|\bMAPA\b|ERGOMETR|AUDIOMETR|IMITANCIOMETR|ESPIROMETR|POLISSONOGRAF|CAMPIMETR|RETINOGRAF|BIOPSIA|ANATOMO/i;
  const ehExameDeImagem = nome => IMAGEM.test(semAcento(nome || ''));

  // Seguro-desemprego: o JSON do portal vira texto que uma pessoa e o CRM leem.
  // Nome de campo do MTE pode mudar: cada linha pega o primeiro campo que
  // existir; o JSON cru vai embaixo para nada se perder.
  const dataBr = v => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v || '-'); };
  const campo = (o, ...ks) => { for (const k of ks) if (o && o[k] != null && o[k] !== '') return o[k]; return ''; };
  function textoSeguroDesemprego(lista) {
    const linhas = ['SEGURO-DESEMPREGO — requerimentos (Portal Emprega Brasil, MTE)', ''];
    // objeto {codigo, descricao} (modalidade, tipoInscricao, situação) → a descrição
    const rot = v => (v && typeof v === 'object') ? (v.descricao || v.nome || v.codigo || '') : (v == null ? '' : v);
    for (const r of lista) {
      const d = r.detalhe || {};
      linhas.push(`Requerimento ${campo(r, 'numeroRequerimento', 'numero', 'codigo') || '?'} · modalidade ${rot(campo(r, 'modalidade', 'tipo')) || '?'}`
        + `${rot(campo(d, 'situacao', 'situacaoRequerimento', 'status')) ? ` · situação ${rot(campo(d, 'situacao', 'situacaoRequerimento', 'status'))}` : ''}`);
      linhas.push(`  Data do requerimento: ${dataBr(campo(r, 'dataRequerimento', 'dataCadastro', 'data'))}`);
      if (campo(r, 'razaoSocial', 'dataAdmissao', 'dataDispensa'))
        linhas.push(`  Empregador: ${campo(r, 'razaoSocial') || '?'} (${rot(r.tipoInscricao) || ''} ${campo(r, 'inscricao', 'numeroInscricao') || ''}) · admissão ${dataBr(r.dataAdmissao)} · dispensa ${dataBr(campo(r, 'dataDispensa', 'dataDemissao'))}`);
      if (r.dataInicioSuspensao || r.dataFimSuspensao)
        linhas.push(`  Suspensão do contrato: ${dataBr(r.dataInicioSuspensao)} a ${dataBr(r.dataFimSuspensao)}`);
      // campos do detalhe como o MTE devolveu em 12.10.2026: vinculos[{nomeEmpresa, dataAdmissao,
      // dataDemissao}], parcelas[{numero, dataProgramada, dataPagamento, valorPagamento, situacaoParcela, tipoParcela}]
      const v = [].concat(campo(d, 'vinculos', 'vinculo') || campo(r, 'vinculos') || []);
      for (const x of v) linhas.push(`  Vínculo: ${campo(x, 'nomeEmpresa', 'nomeEmpregador', 'empregador', 'razaoSocial') || '?'} · admissão ${dataBr(campo(x, 'dataAdmissao', 'admissao'))} · demissão ${dataBr(campo(x, 'dataDemissao', 'dataDesligamento', 'dataDispensa', 'demissao'))}`);
      const p = [].concat(campo(d, 'parcelas') || campo(r, 'parcelas') || []);
      for (const x of p) linhas.push(`  Parcela ${campo(x, 'numero', 'numeroParcela', 'parcela') || '?'}: programada ${dataBr(campo(x, 'dataProgramada', 'dataLiberacao'))} · paga em ${dataBr(campo(x, 'dataPagamento', 'dataEmissao'))} · R$ ${campo(x, 'valorPagamento', 'valorProgramado', 'valorParcela', 'valor') || '-'} · ${rot(campo(x, 'situacaoParcela', 'situacao')) || ''}${x.tipoParcela && x.tipoParcela !== 'NORMAL' ? ` (${x.tipoParcela})` : ''}`);
      const ultima = p.map(x => campo(x, 'dataPagamento')).filter(Boolean).sort().pop();
      // a parcela recebida dentro da graça prova o desemprego e acresce 12 meses; o prazo segue
      // contado da última competência, não da parcela (IN 128, art. 184, §§ 2º e 5º)
      if (ultima) linhas.push(`  Última parcela paga em ${dataBr(ultima)} — recebida dentro do período de graça, prova o desemprego e acresce 12 meses (contados da última competência, IN 128 art. 184 §§2º e 5º)`);
      if (!p.length) linhas.push(r.detalhe_erro ? `  (parcelas: o portal não devolveu o detalhe — ${r.detalhe_erro})` : '  (sem parcelas informadas)');
      linhas.push('');
    }
    linhas.push('', '--- dados brutos do portal ---', JSON.stringify(lista, null, 2));
    return linhas.join('\n');
  }

  // Dados cadastrais do CNIS (extratocnisservices/dadoscompletos, 12.10.2026) → os
  // campos com o NOME DAS COLUNAS de `clientes` no CRM, para o cadastro da
  // etapa 2 e a identificação do cliente serem preenchidos sem redigitar.
  // Telefone e e-mail não vêm do CNIS. O endereço do CNIS traz número e
  // complemento dentro do logradouro: vai inteiro em `logradouro`.
  function cadastroDoCnis(j) {
    const f = (j && j.filiadoTO) || {};
    const d = v => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}` : null; };
    const rg = ((f.listaIdentidadeTO || [])[0]) || {};
    const end = f.enderecoPrincipalTO || {};
    const sx = String(f.sexo || '').toUpperCase();
    const cad = {
      nome: f.nome || null,
      cpf: String(f.cpf || '').replace(/\D/g, '').padStart(11, '0') || null,
      dn: d(f.dataNascimento),
      nome_mae: f.nomeMae || null,
      sexo: sx.startsWith('F') ? 'F' : sx.startsWith('M') ? 'M' : null,
      pis_nit: f.nitFormatado || (f.nit ? String(f.nit) : null),
      rg: rg.numero ? String(rg.numero) : null,
      rg_orgao: [rg.orgaoEmissorIdentidade, rg.uf].filter(Boolean).join('/') || null,
      ctps: (f.listaCtpsTO || []).map(c => [c.numero, c.serie, c.uf].filter(Boolean).join(' ')).filter(Boolean),
      titulo_eleitor: f.numeroTitulo || (f.tituloEleitorTO && f.tituloEleitorTO.numero) || null,
      logradouro: end.logradouro || null,
      bairro: end.bairro || null,
      cep: end.cep ? String(end.cep).padStart(8, '0') : null,
      cidade: end.municipio || null,
      uf: end.siglaUf || end.uf || null,
      naturalidade: [f.municipioOrigem, f.ufOrigem].filter(Boolean).join('/') || null,
      nacionalidade: f.nacionalidade || null,
      grau_instrucao: f.grauInstrucao || null,
      atualizado_no_cnis_em: d(f.dataUltimaAtualizacao),
    };
    const br = v => v ? v.split('-').reverse().join('/') : '-';
    const texto = ['DADOS CADASTRAIS (CNIS / Meu INSS)', '',
      `Nome: ${cad.nome || '-'}`, `CPF: ${cad.cpf || '-'}`, `Nascimento: ${br(cad.dn)}`, `Nome da mãe: ${cad.nome_mae || '-'}`,
      `Sexo: ${cad.sexo || '-'}`, `NIT/PIS: ${cad.pis_nit || '-'}`, `RG: ${cad.rg || '-'} ${cad.rg_orgao || ''}`.trim(),
      `CTPS: ${cad.ctps.join('; ') || '-'}`, `Título de eleitor: ${cad.titulo_eleitor || '-'}`,
      `Endereço: ${cad.logradouro || '-'}${cad.bairro ? ', ' + cad.bairro : ''} — ${cad.cidade || '-'}/${cad.uf || '-'} CEP ${cad.cep || '-'}`,
      `Naturalidade: ${cad.naturalidade || '-'} · Nacionalidade: ${cad.nacionalidade || '-'} · Instrução: ${cad.grau_instrucao || '-'}`,
      `Última atualização no CNIS: ${br(cad.atualizado_no_cnis_em)}`,
      '', '--- dados brutos do portal ---', JSON.stringify(j, null, 2)].join('\n');
    return { cadastro: cad, texto };
  }

  // CadÚnico (perfil de pessoa/{cpf}/tipos-perfil + familia/{nf}/membros, 13.10.2026):
  // o .txt legível e o resumo da família que vai a clientes.dossie.cadunico.familia
  // — renda per capita, faixa, integrantes e estado cadastral são o que o BPC pede.
  function textoCadunico(perfil, membros, renda, extra) {
    const p = perfil || {}, nome = v => (v && typeof v === 'object') ? (v.nome || v.descricao || v.codigo || '') : (v == null ? '' : String(v));
    const dBr = v => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v || '-'); };
    const brl = v => (v == null || v === '') ? '-' : 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const integrantes = ((membros && membros.integranteFamiliaDTOs) || []).map(i => {
      const d = i.pessoaDadosCadastroDTO || {};
      return { id: i.identificador != null ? String(i.identificador) : null, nome: d.nomePessoa || '', parentesco: nome(i.tipoRelacaoParentescoRF), nascimento: d.dataNascimentoPessoa || null,
        cpf: d.numeroCpfPessoa ? String(d.numeroCpfPessoa).padStart(11, '0') : null, nis: d.numeroNisPisPasepPessoa ? String(d.numeroNisPisPasepPessoa) : null,
        responsavel: !!i.isResponsavelFamiliar, obito: !!i.obito, estado: nome(d.tipoEstadoCadastralMembro) };
    });
    const familia = {
      numero_familiar: String(p.numeroFamiliar || ''), estado_cadastral: nome(p.tipoEstadoCadastralFamilia), condicao: nome(p.tipoCondicaoCadastroFamiliar),
      municipio: [p.municipio, p.uf].filter(Boolean).join('/'), cadastrada_em: p.dataCadastroFamilia || null, atualizada_em: p.dataAtualizacaoFamilia || null,
      renda_total: p.rendaFamiliarTotal ?? null, renda_por_pessoa: p.rendaFamiliarPorPessoa ?? null,
      faixa_renda_total: p.faixaRendaFamiliarTotal || null, faixa_renda_por_pessoa: p.faixaRendaFamiliarPorPessoa || null,
      integrantes: p.quantidadeIntegrantes ?? integrantes.length, pessoas_no_calculo_da_renda: p.qtPessoasCalculoRenda ?? null,
      situacao_de_rua: nome(p.familiaEmSituacaoDeRua) || null, pendencias: p.quantidadePendencias ?? null, membros: integrantes,
    };
    const linhas = [`CADÚNICO — família ${familia.numero_familiar} (Meu CadÚnico, consulta em ${new Date().toLocaleDateString('pt-BR')})`, '',
      `Titular da consulta: ${p.nome || '-'} · perfil ${nome(p.tipoPerfil) || '-'}`,
      `Estado cadastral: ${familia.estado_cadastral || '-'} · ${familia.condicao || ''} · ${familia.municipio}`,
      `Cadastrada em ${dBr(familia.cadastrada_em)} · última atualização ${dBr(familia.atualizada_em)}`,
      `Renda familiar total: ${brl(familia.renda_total)} (${familia.faixa_renda_total || '-'})`,
      `Renda por pessoa: ${brl(familia.renda_por_pessoa)} (${familia.faixa_renda_por_pessoa || '-'}) · ${familia.integrantes} integrante(s)${familia.pessoas_no_calculo_da_renda != null ? `, ${familia.pessoas_no_calculo_da_renda} no cálculo da renda` : ''}`,
      `Situação de rua: ${familia.situacao_de_rua || '-'} · pendências: ${familia.pendencias ?? '-'}`, '', 'INTEGRANTES'];
    for (const m of integrantes)
      linhas.push(`  ${m.responsavel ? '★ ' : ''}${m.nome} · ${m.parentesco || '-'} · nasc. ${dBr(m.nascimento)} · CPF ${m.cpf || '-'} · NIS ${m.nis || '-'} · ${m.estado || ''}${m.obito ? ' · ÓBITO' : ''}`);

    // ── o que mais o portal dá (extra, opcional): extrato de benefícios pagos
    // (Bolsa Família, BPC…), tarifa social, consignações, renda CNIS por
    // integrante (benefício do INSS com espécie e DIB, remuneração, SD),
    // trabalho e renda declarados, pendências e despesas (13.10.2026)
    const x = extra || {};
    const comp = c => { const s = String(c || ''); return /^\d{6}$/.test(s) ? `${s.slice(4)}/${s.slice(0, 4)}` : (s.match(/^(\d{4})-(\d{2})/) ? `${s.slice(5, 7)}/${s.slice(0, 4)}` : s || '-'); };
    const pagos = {};
    for (const e of [].concat(x.extrato || [])) {
      const k = `${nome(e.tipoExtrato) || '?'} · ${e.nomeEspecie || '?'} · ${e.nomeBeneficiario || ''}`.trim();
      const g = pagos[k] || (pagos[k] = { tipo: nome(e.tipoExtrato) || null, especie: e.nomeEspecie || null, beneficiario: e.nomeBeneficiario || null, competencias: [], valores: [] });
      g.competencias.push(String(e.numeroCompetencia || '')); g.valores.push(e.valorBeneficio);
    }
    familia.beneficios_pagos = Object.values(pagos).map(g => { const cs = g.competencias.filter(Boolean).sort(); return { tipo: g.tipo, especie: g.especie, beneficiario: g.beneficiario,
      primeira_competencia: cs[0] || null, ultima_competencia: cs[cs.length - 1] || null, meses: cs.length, valor_ultimo: g.valores[0] ?? null }; });
    const ts = x.tipos && x.tipos.tarifaSocialEnergiaEletrica;
    familia.tarifa_social_energia = ts ? { competencia: String(ts.numeroCompetencia || ''), desconto: ts.valorDesconto ?? null } : null;
    familia.consignacoes = [].concat(x.consignacoes || []).length;
    familia.pendencias_detalhe = x.pendencias ? { familia: [].concat(x.pendencias.pendenciasOcorrenciasFamilia || []).length, pessoas: [].concat(x.pendencias.pendenciasOcorrenciasPessoas || []).length } : null;
    const desp = x.info && x.info.familiaDespesaDTO;
    familia.despesas = desp ? Object.fromEntries(Object.entries(desp).map(([k, v]) => [k.replace(/^valorDespesas/, '').toLowerCase(), v])) : null;
    familia.renda_cnis = [];
    for (const m of integrantes) {
      const r = (x.rendas || {})[m.id || ''] || (x.rendas || {})[m.nis || ''] || null;
      if (!r) continue;
      const rb = (r.renda && r.renda.rendasBeneficios) || {};
      familia.renda_cnis.push({ nome: m.nome, possui_remuneracao: r.renda ? !!r.renda.possuiAlgumaRemuneracao : null, competencia_referencia: (r.renda && r.renda.competenciaReferencia) || null,
        beneficios_inss: [].concat(rb.beneficios || []).map(b => ({ nb: b.nb ? String(b.nb) : null, especie: nome(b.especie), valor: b.valor ?? null, dib: b.dataInicioPagamento || null })),
        total_beneficios: rb.total ?? null, remuneracao_ultimo_mes: r.renda && r.renda.remuneracaoUltimoMes ? (r.renda.remuneracaoUltimoMes.valor ?? r.renda.remuneracaoUltimoMes) : null,
        seguro_desemprego: !!(r.renda && r.renda.rendasSeguroDesemprego), outras_fontes: !!(r.renda && r.renda.rendasOutrasFontes),
        declarado: r.trabalho ? { trabalhou_semana_anterior: nome(r.trabalho.trabalhouSemanaAnteriorAEntrevista) || null, remuneracao_mes_anterior: r.trabalho.remuneracaoTrabalhoMesAnteriorEntrevista ?? null,
          aposentadoria_pensao_bpc: r.trabalho.valorAposentadoriaPensaoBpcLoas ?? null, seguro_desemprego: r.trabalho.valorSeguroDesemprego ?? null, pensao_alimenticia: r.trabalho.valorPensaoAlimenticia ?? null, outras: r.trabalho.outrasRendas ?? null } : null });
    }
    if (familia.beneficios_pagos.length) {
      linhas.push('', 'BENEFÍCIOS PAGOS (extrato do portal)');
      for (const b of familia.beneficios_pagos) linhas.push(`  ${b.tipo} · ${b.especie}${b.beneficiario ? ' · ' + b.beneficiario : ''} · ${comp(b.primeira_competencia)} a ${comp(b.ultima_competencia)} (${b.meses} mês/meses) · último ${brl(b.valor_ultimo)}`);
    } else if (x.extrato) linhas.push('', 'BENEFÍCIOS PAGOS (extrato do portal): nenhum no período consultado');
    if (familia.tarifa_social_energia) linhas.push(`  Tarifa Social de Energia Elétrica: desconto ${brl(familia.tarifa_social_energia.desconto)} (competência ${comp(familia.tarifa_social_energia.competencia)})`);
    if (x.consignacoes) linhas.push(`  Consignações no benefício: ${familia.consignacoes}`);
    if (familia.renda_cnis.length) {
      linhas.push('', 'RENDA POR INTEGRANTE (CNIS, via CadÚnico)');
      for (const r of familia.renda_cnis) {
        linhas.push(`  ${r.nome} · referência ${comp(r.competencia_referencia)} · ${r.possui_remuneracao ? 'tem remuneração/benefício' : 'sem remuneração'}`);
        for (const b of r.beneficios_inss) linhas.push(`    Benefício INSS NB ${b.nb || '?'} · ${b.especie || '?'} · ${brl(b.valor)} · início ${dBr(b.dib)}`);
        if (r.remuneracao_ultimo_mes != null && typeof r.remuneracao_ultimo_mes !== 'object') linhas.push(`    Remuneração do último mês: ${brl(r.remuneracao_ultimo_mes)}`);
        if (r.seguro_desemprego) linhas.push('    Tem seguro-desemprego no período');
        if (r.declarado) linhas.push(`    Declarado no CadÚnico: trabalho mês anterior ${brl(r.declarado.remuneracao_mes_anterior)} · aposentadoria/pensão/BPC ${brl(r.declarado.aposentadoria_pensao_bpc)} · SD ${brl(r.declarado.seguro_desemprego)} · pensão alimentícia ${brl(r.declarado.pensao_alimenticia)} · outras ${brl(r.declarado.outras)}`);
      }
    }
    if (familia.pendencias_detalhe) linhas.push('', `PENDÊNCIAS: ${familia.pendencias_detalhe.familia} da família, ${familia.pendencias_detalhe.pessoas} de pessoas`);
    if (familia.despesas) linhas.push('', 'DESPESAS DECLARADAS: ' + Object.entries(familia.despesas).map(([k, v]) => `${k} ${brl(v)}`).join(' · '));
    linhas.push('', '--- dados brutos do portal ---', JSON.stringify({ perfil, membros, renda, extra: x }, null, 2));
    return { familia, texto: linhas.join('\n') };
  }

  // Portal da Transparência (API de dados abertos, 13.10.2026): os pagamentos de
  // BPC, Bolsa Família (novo e antigo), Auxílio Brasil, Auxílio Emergencial,
  // Garantia-Safra e Seguro-Defeso de cada integrante da família → .txt + resumo.
  // `resultados` = { [cpfOuNis]: { pessoa, programas: { bpc: [...], novo_bolsa_familia: [...], … } } }
  const PROGRAMAS = { bpc: 'BPC', novo_bolsa_familia: 'Bolsa Família (novo, desde 03/2023)', bolsa_familia: 'Bolsa Família (até 2021)',
    auxilio_brasil: 'Auxílio Brasil (2021–2023)', auxilio_emergencial: 'Auxílio Emergencial', safra: 'Garantia-Safra', seguro_defeso: 'Seguro-Defeso' };
  function textoTransparencia(pessoas, resultados) {
    const brl = v => (v == null || v === '') ? '-' : 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    // competência: BPC/Bolsa mandam AAAAMM; o Auxílio Emergencial manda MM/AAAA (13.10.2026)
    const comp = v => { const s = String(v || '').replace(/\D/g, ''); if (s.length < 6) return v || '-';
      return Number(s.slice(0, 4)) >= 1990 ? `${s.slice(4, 6)}/${s.slice(0, 4)}` : `${s.slice(0, 2)}/${s.slice(2, 6)}`; };
    const linhas = [`PORTAL DA TRANSPARÊNCIA — benefícios pagos a cada integrante (consulta em ${new Date().toLocaleDateString('pt-BR')})`, ''];
    const resumo = [];
    for (const p of pessoas) {
      const chave = p.cpf || p.nis; const r = (resultados || {})[chave] || {};
      const prog = r.programas || {};
      const linhaPessoa = { nome: p.nome, cpf: p.cpf || null, nis: p.nis || null, erro: r.erro || null, programas: [] };
      linhas.push(`${p.nome || '?'} · CPF ${p.cpf || '-'} · NIS ${p.nis || '-'}${r.erro ? ` · ERRO: ${r.erro}` : ''}`);
      let algum = false;
      for (const [k, rot] of Object.entries(PROGRAMAS)) {
        const itens = [].concat(prog[k] || []);
        if (!itens.length) continue;
        algum = true;
        const comps = itens.map(i => String(i.dataMesCompetencia || i.dataMesReferencia || i.mesDisponibilizacao || '').replace(/\D/g, '')).filter(Boolean).sort();
        const valores = itens.map(i => i.valor ?? i.valorSaque).filter(v => v != null);
        const ult = itens.find(i => String(i.dataMesCompetencia || i.dataMesReferencia || i.mesDisponibilizacao || '').replace(/\D/g, '') === comps[comps.length - 1]) || itens[0];
        const judicial = itens.some(i => i.concedidoJudicialmente === true || /sim/i.test(String(i.concedidoJudicialmente || '')));
        // representante legal só quando é outra pessoa (o portal repete o próprio beneficiário)
        const rl0 = (ult.beneficiario && ult.beneficiario.nomeRepresentanteLegal) || null;
        const rl = rl0 && rl0.trim().toUpperCase() !== String(p.nome || '').trim().toUpperCase() ? rl0 : null;
        const item = { programa: k, rotulo: rot, meses: itens.length, primeira_competencia: comps[0] || null, ultima_competencia: comps[comps.length - 1] || null,
          valor_ultimo: ult.valor ?? ult.valorSaque ?? null, total: valores.reduce((a, b) => a + Number(b || 0), 0), concedido_judicialmente: judicial || null, representante_legal: rl,
          municipio: ult.municipio ? `${ult.municipio.nomeIBGE || ''}/${(ult.municipio.uf || {}).sigla || ''}` : null };
        linhaPessoa.programas.push(item);
        linhas.push(`  ${rot}: ${comp(item.primeira_competencia)} a ${comp(item.ultima_competencia)} · ${item.meses} pagamento(s) · último ${brl(item.valor_ultimo)} · total ${brl(item.total)}`
          + `${judicial ? ' · CONCEDIDO JUDICIALMENTE' : ''}${rl ? ` · representante legal: ${rl}` : ''}${item.municipio ? ` · ${item.municipio}` : ''}`);
      }
      if (!algum && !r.erro) linhas.push('  nenhum pagamento encontrado no Portal da Transparência');
      resumo.push(linhaPessoa);
      linhas.push('');
    }
    linhas.push('', '--- dados brutos do portal ---', JSON.stringify(resultados, null, 2));
    return { pessoas: resumo, texto: linhas.join('\n') };
  }

  const API = { nomeSeguro, slug, pastaCliente, jwt, comoPdf, mensagemDoPortal, ehExameDeImagem, textoSeguroDesemprego, cadastroDoCnis, textoCadunico, textoTransparencia, b64, janela12Meses, nupsDaLista };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.DOSSIE_REGRAS = API;
})(typeof window !== 'undefined' ? window : globalThis);
