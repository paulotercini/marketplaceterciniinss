// Tradutor dos eventos do e-Recursos (CRPS) para linguagem de escritório.
//
// A API do INSS devolve o histórico em "servidorês": "Conhecer do Recurso e
// dar-lhe provimento parcial, por unanimidade - Acórdão: 25ª JR/3080/2025".
// Aqui isso vira "✅ Recurso provido em parte (25ª Junta)", que qualquer
// colaborador entende de relance. As regras vêm dos eventos reais das fichas.
//
// Cada regra casa por trecho do status (minúsculo, sem acento) e devolve
// {tipo, icone, resumo}. A ordem importa: da mais específica para a mais geral.

function semAcento(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// alguns nomes de arquivo/eventos vêm com UTF-8 estragado (mojibake).
// não tentamos consertar tudo — só limpamos o que atrapalha a leitura.
function limpar(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

// QUEM julgou — e, portanto, em que instância o recurso está.
//
// O CRPS tem dois andares. As Juntas de Recursos julgam o recurso ordinário
// (1ª instância); das Câmaras de Julgamento vem a decisão do recurso especial
// (2ª instância). Saber qual delas decidiu é o que diz se ainda cabe recurso
// especial ou se o caminho administrativo acabou — por isso não basta um
// número solto: guardamos o nome inteiro e a instância.
//
// Lê tanto a sigla do e-Recursos ("25ª JR/3080/2025", "2ª CAJ/1474/2026")
// quanto o cabeçalho do próprio acórdão ("ACORDAM os membros da 2ª Composição
// Adjunta da 10ª Junta de Recursos"). A composição adjunta é uma turma da
// mesma Junta: a instância não muda, então ela não entra no nome.
function orgaoJulgador(texto) {
  const t = String(texto || '');
  const caj = t.match(/(\d{1,2})\s*ª?\s*(?:CAJ\b|C[âa]mara\s+de\s+Julgamento)/i)
           || t.match(/(\d{1,2})\s*ª?\s*C[âa]mara\b/i);
  if (caj) return { nome: `${Number(caj[1])}ª Câmara de Julgamento`,
                    sigla: `${Number(caj[1])}ª CaJ`, instancia: 2 };
  // "1ª Composição Adjunta da 2ª Junta" — quem vale é a Junta, a última do par
  const jr = [...t.matchAll(/(\d{1,2})\s*ª?\s*(?:JR\b|Junta\s+de\s+Recursos)/ig)].pop();
  if (jr) return { nome: `${Number(jr[1])}ª Junta de Recursos`,
                   sigla: `${Number(jr[1])}ª JR`, instancia: 1 };
  if (/C[âa]maras?\s+de\s+Julgamento/i.test(t))
    return { nome: 'Câmaras de Julgamento', sigla: 'CaJ', instancia: 2 };
  if (/Junta\s+de\s+Recursos/i.test(t))
    return { nome: 'Junta de Recursos', sigla: 'JR', instancia: 1 };
  if (/\bCRPS\b/i.test(t) || /conselho de recursos/i.test(t))
    return { nome: 'CRPS', sigla: 'CRPS', instancia: 0 };
  return null;
}

// O MESMO dado, lido do PDF do acórdão. Aqui não dá para varrer o texto
// inteiro: um acórdão de Junta avisa que "cabe Recurso Especial às Câmaras de
// Julgamento", cita a Câmara que uniformizou a jurisprudência, e tem
// conselheiro chamado CUNHA CAMARA. Procurar "câmara" solto acharia todos
// esses. Então lemos só onde o órgão se identifica:
//   1. "ACORDAM os membros da <órgão>, em CONHECER..."   (o colegiado)
//   2. "O(a) Presidente do(a) <órgão>, HOMOLOGA..."      (monocrática)
//   3. o cabeçalho de cada página, entre o CRPS e o MINISTÉRIO
// Nessa ordem: a 1 e a 2 são a assinatura da decisão; a 3 é o timbre.
const ANCORAS = [
  /ACORDAM\s+os\s+membros\s+d[ao]s?\s+([\s\S]{0,110}?)\s*,?\s+em\s+(?:CONHECER|N[ÃA]O\s+CONHECER)/i,
  /Presidente\s+do\(a\)\s+([\s\S]{0,110}?)\s*,\s*HOMOLOGA/i,
  /CRPS\s+([\s\S]{0,90}?)\s*Data\/Hora:/i,
  /Data\/Hora:\s*\d{2}\/\d{2}\/\d{4}[\s\d:]*([\s\S]{0,90}?)\s*MINIST[ÉE]RIO/i,
];
function orgaoDoAcordao(texto) {
  for (const ancora of ANCORAS) {
    const m = String(texto || '').match(ancora);
    const o = m && orgaoJulgador(m[1]);
    if (o && o.instancia) return o;
  }
  return null;
}

// a versão curta, para caber no fim da linha do andamento ("(25ª Junta)")
function orgaoCurto(bruto) {
  const o = orgaoJulgador(bruto);
  if (!o) return '';
  return o.nome.replace(' de Recursos', '').replace(' de Julgamento', '');
}

// data da sessão embutida no texto ("... - 18/03/26 08:00" → "18/03/2026 08:00")
function dataSessao(bruto) {
  const m = bruto.match(/(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}:\d{2})/);
  if (!m) return '';
  return `${m[1]}/${m[2]}/20${m[3]} ${m[4]}`;
}

const REGRAS = [
  // ── decisões (o que mais importa) ────────────────────────────────────────
  // EMBARGOS ANTES DE RECURSO. "Dar provimento" ao embargo NÃO é recurso
  // provido: às vezes o efeito é só integrativo ("mantendo-se a decisão
  // proferida no Acórdão objurgado"), às vezes é modificativo e concede o
  // benefício. O status do e-Recursos não distingue os dois — quem sabe é o
  // acórdão. Então o rótulo aponta para o acórdão em vez de arriscar um
  // "✅ Recurso PROVIDO" (parabéns por um recurso ainda perdido) ou um
  // "esclarece o acórdão" (que esconde uma aposentadoria concedida).
  { m: ['conhecer do embargo', 'conhecer dos embargos', 'embargo do segurado', 'embargos de declaracao'],
    tipo: 'decisao', icone: '📝',
    f: b => /negar|improv|rejeit/.test(semAcento(b))
      ? `Embargos rejeitados${sufOrgao(b)}`
      : `Embargos acolhidos — confira o acórdão${sufOrgao(b)}` },
  { m: ['dar-lhe provimento parcial', 'dar provimento parcial', 'provimento em parte'],
    tipo: 'decisao', icone: '✅', f: b => `Recurso provido EM PARTE${sufOrgao(b)}` },
  { m: ['negar provimento', 'nao conhecer do recurso', 'improceden'],
    tipo: 'decisao', icone: '⛔', f: b => `Recurso negado${sufOrgao(b)}` },
  { m: ['dar provimento', 'dar-lhe provimento'],
    tipo: 'decisao', icone: '✅', f: b => `Recurso PROVIDO${sufOrgao(b)}` },
  { m: ['decisao monocratica'],
    tipo: 'decisao', icone: '⚖️', f: b => `Decisão monocrática${sufOrgao(b)}` },
  { m: ['acordao'],
    tipo: 'decisao', icone: '⚖️', f: b => `Acórdão publicado${sufOrgao(b)}` },

  // ── julgamento / pauta ───────────────────────────────────────────────────
  { m: ['sessao de julgamento'],
    tipo: 'pauta', icone: '⚖️', f: b => {
      const d = dataSessao(b);
      return d ? `Pautado para julgamento em ${d}` : 'Incluído em pauta de julgamento';
    } },
  { m: ['retirado de pauta'],
    tipo: 'andamento', icone: '↩️', f: () => 'Retirado de pauta pelo relator' },
  { m: ['distribuido ao conselheiro'],
    tipo: 'andamento', icone: '👤', f: () => 'Distribuído ao conselheiro relator' },
  { m: ['redistribuido ao conselheiro'],
    tipo: 'andamento', icone: '👤', f: () => 'Redistribuído a outro relator' },

  // ── movimentos das partes ────────────────────────────────────────────────
  { m: ['interposicao de recurso especial'],
    tipo: 'recurso', icone: '📄', f: () => 'Recurso especial protocolado' },
  { m: ['interposicao de incidente', 'embargos'],
    tipo: 'recurso', icone: '📄', f: () => 'Embargos protocolados' },
  { m: ['contrarrazoes'],
    tipo: 'andamento', icone: '📄', f: () => 'Contrarrazões do INSS juntadas' },
  { m: ['recurso ordinario'],
    tipo: 'recurso', icone: '📄', f: () => 'Recurso ordinário protocolado' },

  // ── perícia médica ───────────────────────────────────────────────────────
  { m: ['aguardando parecer do perito', 'solicitacao de parecer do perito'],
    tipo: 'pericia', icone: '🩺', f: () => 'Aguardando parecer do perito médico' },
  { m: ['informacoes obtidas pmf', 'tarefa cancelada pmf'],
    tipo: 'pericia', icone: '🩺', f: () => 'Parecer médico concluído' },

  // ── tramitação interna ───────────────────────────────────────────────────
  { m: ['requerimento protocolado'],
    tipo: 'andamento', icone: '📥', f: () => 'Requerimento protocolado' },
  { m: ['protocolo recebido no inss', 'protocolo recebido'],
    tipo: 'andamento', icone: '📥', f: () => 'Protocolo recebido no INSS' },
  { m: ['juntada de informacoes previdenciarias'],
    tipo: 'andamento', icone: '📎', f: () => 'Juntada de informações previdenciárias (CNIS/benefícios)' },
  { m: ['juntada de documento', 'documento juntado', 'documento juntado'],
    tipo: 'andamento', icone: '📎', f: () => 'Documento juntado' },
  { m: ['documentacao do processo de origem', 'documentacao do sistema unico'],
    tipo: 'andamento', icone: '📎', f: () => 'Documentação do processo de origem juntada' },
  { m: ['motivo de indeferimento alterado'],
    tipo: 'andamento', icone: 'ℹ️', f: () => 'Motivo de indeferimento registrado' },
  { m: ['inclusao de parte'],
    tipo: 'andamento', icone: '👥', f: () => 'Inclusão de parte no processo' },
  { m: ['alteracao do endereco', 'alteracao da aps', 'alterar localizador',
        'alteracao de correspondencia'],
    tipo: 'ruido', icone: '·', f: () => 'Movimentação interna (cadastro/localizador)' },
  { m: ['encaminhamento automatico', 'criacao de subtarefa'],
    tipo: 'ruido', icone: '·', f: () => 'Encaminhamento automático interno' },
  { m: ['encaminhamento'],
    tipo: 'andamento', icone: '➡️', f: b => `Encaminhado${sufDestino(b)}` },
];

// "... - Acórdão: 25ª JR/3080/2025" → " (25ª Junta)"
function sufOrgao(b) { const o = orgaoCurto(b); return o ? ` (${o})` : ''; }
// "Encaminhamento - (21150521 para 25ª JR)" → " à 25ª Junta"
function sufDestino(b) {
  const o = orgaoCurto(b);
  if (o) return ` à ${o}`;
  const par = b.match(/para\s+([A-Za-zÀ-ú0-9ª\s]+?)\)?$/);
  return par ? ` (${limpar(par[1])})` : '';
}

// o nome do arquivo diz se ele é o que DECIDE — é por ele que o coletor sabe
// o que vale a pena baixar (acórdão e decisão monocrática, não o acervo todo)
const ehArquivoDeDecisao = nome => /ac[oó]rd[aã]o|monocr[aá]tic/i.test(nome || '');

// traduz UM evento cru {status, data, documentos} → objeto de andamento
function traduzirEvento(ev) {
  const bruto = limpar(ev.status || '');
  const chave = semAcento(bruto);
  let regra = REGRAS.find(r => r.m.some(t => chave.includes(t)));
  const base = regra ? { tipo: regra.tipo, icone: regra.icone, resumo: regra.f(bruto) }
                     : { tipo: 'andamento', icone: '•', resumo: bruto };
  // guardamos a lista dos documentos (nome + caminho no e-Recursos). Antes só
  // ficava a contagem, e o acórdão se perdia: sem o caminho não há como buscá-lo.
  const arquivos = (ev.documentos || []).map(d => ({
    id: String(d.id || ''),
    nome: limpar(d.nome || ''),
    path: d.path || '',
    decide: ehArquivoDeDecisao(d.nome),
  })).filter(a => a.id || a.path);
  return {
    data: ev.data || '',
    tipo: base.tipo,
    icone: base.icone,
    resumo: base.resumo,
    bruto,
    docs: arquivos.length,
    arquivos,
  };
}

// converte "DD/MM/AAAA HH:MM:SS" → ISO, para ordenar/comparar
function dataParaISO(br) {
  const m = (br || '').match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):?(\d{2})?)?/);
  if (!m) return '';
  const [, d, mo, y, h = '00', mi = '00', s = '00'] = m;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}`;
}

// os eventos "ruído" existem no histórico, mas não valem uma notificação:
// encaminhamentos automáticos e troca de localizador não são novidade real.
const TIPOS_SILENCIOSOS = new Set(['ruido']);

// traduz o processo INTEIRO (o JSON que a API devolve) para o bloco casos.crps
function traduzirProcesso(json, opts = {}) {
  const meuNome = semAcento(opts.procurador || 'paulo roberto tercini');
  const recorrentes = (json.recorrentes || []).map(r => limpar(r.nome))
    .filter(n => !semAcento(n).includes(meuNome));
  const eventos = (json.eventos || []).map(traduzirEvento);
  // o mais novo primeiro (a API já manda assim, mas garantimos)
  eventos.sort((a, b) => (dataParaISO(b.data) < dataParaISO(a.data) ? -1 : 1));
  const relevante = eventos.find(e => !TIPOS_SILENCIOSOS.has(e.tipo)) || eventos[0] || null;
  return {
    nup: limpar(json.proc || ''),
    num_proc: limpar(json.numProc || ''),
    orgao_atual: limpar(json.orgaoAtual || ''),
    recorrentes,
    status: relevante ? `${relevante.icone} ${relevante.resumo}` : '',
    ultimo_em: relevante ? relevante.data : '',
    eventos,
  };
}

// dá a "impressão digital" de um evento, para o robô saber o que é NOVO
// entre uma varredura e outra (data + status cru bastam)
function chaveEvento(e) { return `${dataParaISO(e.data)}|${e.bruto}`; }

// Corrigimos uma REGRA e o rótulo errado já está gravado na ficha. Como cada
// evento guarda o `bruto` (o status cru do e-Recursos), dá para reetiquetar
// sem coletar tudo de novo. Mexe SÓ em tipo/ícone/resumo: os arquivos, o
// storage e os resumos dos acórdãos ficam exatamente como estavam.
function rerotular(bloco) {
  let mudou = 0;
  for (const e of (bloco.eventos || [])) {
    if (!e.bruto) continue;
    const novo = traduzirEvento({ status: e.bruto });
    if (e.tipo === novo.tipo && e.icone === novo.icone && e.resumo === novo.resumo) continue;
    e.tipo = novo.tipo; e.icone = novo.icone; e.resumo = novo.resumo;
    mudou++;
  }
  if (mudou) {
    const rel = (bloco.eventos || []).find(x => !TIPOS_SILENCIOSOS.has(x.tipo)) || bloco.eventos?.[0] || null;
    if (rel) { bloco.status = `${rel.icone} ${rel.resumo}`; bloco.ultimo_em = rel.data; }
  }
  return mudou;
}

module.exports = {
  traduzirEvento, traduzirProcesso, dataParaISO, chaveEvento, rerotular,
  orgaoJulgador, orgaoDoAcordao,
  semAcento, orgaoCurto, dataSessao, TIPOS_SILENCIOSOS, ehArquivoDeDecisao,
};
