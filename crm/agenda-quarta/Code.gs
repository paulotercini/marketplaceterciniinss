/**
 * Agenda de atendimentos presenciais (Paulo às quartas; Marcos e Amanda de segunda a sexta)
 * Escritório Paulo Roberto Tercini Filho
 * Web App: executar como o proprietário; acesso: qualquer pessoa (a autorização é feita por token).
 * Requer o serviço avançado Calendar (v3).
 */

const CONFIG = {
  TZ: 'America/Sao_Paulo',
  OFFSET: '-03:00',               // Brasil sem horário de verão desde 2019
  CALENDAR_ID: 'primary',
  JANELAS: [['08:00', '12:30'], ['13:30', '18:30']],
  DURACAO: { '001': 45, '002': 30 },
  PASSO_MIN: 15,
  PRAZO_ALERTA_DIAS: 15,
  REGEX_ATENDIMENTO: /^\s*(00[12])/,
  // Os três atendem na MESMA agenda (a do Paulo); a cor do evento diz de
  // quem ele é (colorId do Google: 9 = mirtilo/azul, 10 = manjericão/verde,
  // 5 = banana/amarelo). Evento sem essas cores bloqueia todos.
  // dias: 0 domingo ... 6 sábado. limite/reservas: só o Paulo tem.
  PROFISSIONAIS: {
    paulo:  { nome: 'Paulo',  tratamento: 'o Dr. Paulo Roberto Tercini Filho', cor: '9',  dias: [3],             limite: 14,   reservas: [['18:00', '18:30']], exibir: 6 },
    marcos: { nome: 'Marcos', tratamento: 'o Dr. Marcos',                      cor: '10', dias: [1, 2, 3, 4, 5], limite: null, reservas: [],                   exibir: 10 },
    amanda: { nome: 'Amanda', tratamento: 'a Dra. Amanda',                     cor: '5',  dias: [1, 2, 3, 4, 5], limite: null, reservas: [],                   exibir: 10 }
  },
  PADRAO: 'paulo',
  // dia inteiro nestas agendas bloqueia o dia de quem está na lista
  CALENDARIOS_BLOQUEIO_DIA_INTEIRO: [
    { id: 'e83gr2c3gb344uo2nkll6geaac@group.calendar.google.com', quem: ['paulo'] },                    // Férias
    { id: 'ipt0crldsn7gg9s0gl9hn6l5b8@group.calendar.google.com', quem: ['paulo', 'marcos', 'amanda'] } // Feriado
  ]
};

/* ---------------------------- Entrada ---------------------------- */

function doGet() {
  return json_({ ok: true, servico: 'agenda-quarta' });
}

function doPost(e) {
  let out;
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const user = autenticar_(req.token);
    switch (req.acao) {
      case 'disponibilidade':     out = disponibilidade_(user, req); break;
      case 'agendar':             out = agendar_(user, req); break;
      case 'confirmar':           out = confirmar_(user, req); break;
      case 'cancelar':            out = cancelar_(user, req); break;
      case 'remarcar':            out = remarcar_(user, req); break;
      case 'agendamentosFuturos': out = agendamentosFuturos_(user, req); break;
      case 'quemSouEu':           out = { ok: true, usuario: user.nome, papel: user.papel }; break;
      case 'definirDias':         out = definirDias_(user, req); break;
      case 'trocarDia':           out = trocarDia_(user, req); break;
      case 'desfazerAjuste':      out = desfazerAjuste_(user, req); break;
      default: throw erro_('ACAO_INVALIDA', 'Ação desconhecida.');
    }
  } catch (err) {
    out = { ok: false, codigo: err.codigo || 'ERRO', erro: String(err.message || err) };
  }
  return json_(out);
}

/* ---------------------------- Autenticação ---------------------------- */

function autenticar_(token) {
  const mapa = JSON.parse(PropertiesService.getScriptProperties().getProperty('TOKENS') || '{}');
  const u = token && mapa[token];
  if (!u) throw erro_('NAO_AUTORIZADO', 'Acesso não autorizado.');
  return u;
}

/** Executar manualmente no editor. Gera novos tokens para todos e revoga os anteriores. */
function configurarTokens() {
  const pessoas = [
    { nome: 'Paulo',  papel: 'admin' },
    { nome: 'Amanda', papel: 'equipe' },
    { nome: 'André',  papel: 'equipe' },
    { nome: 'Ingrid', papel: 'equipe' },
    { nome: 'Marcos', papel: 'equipe' }
  ];
  const mapa = {};
  pessoas.forEach(p => {
    const t = Utilities.getUuid();
    mapa[t] = p;
    Logger.log(p.nome + ': ' + t);
  });
  PropertiesService.getScriptProperties().setProperty('TOKENS', JSON.stringify(mapa));
}

/* ---------------------------- Utilitários ---------------------------- */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function erro_(codigo, msg) { const e = new Error(msg); e.codigo = codigo; return e; }
function dt_(data, hm) { return new Date(data + 'T' + hm + ':00' + CONFIG.OFFSET); }
function hm_(d) { return Utilities.formatDate(d, CONFIG.TZ, 'HH:mm'); }
function ymd_(d) { return Utilities.formatDate(d, CONFIG.TZ, 'yyyy-MM-dd'); }
function diaSemana_(data) { return Number(Utilities.formatDate(dt_(data, '12:00'), CONFIG.TZ, 'u')) % 7; }
function sobrepoe_(a1, a2, b1, b2) { return a1 < b2 && b1 < a2; }
function ehAtendimento_(ev) { return CONFIG.REGEX_ATENDIMENTO.test((ev && ev.summary) || ''); }
function recusado_(ev) { return (ev.attendees || []).some(a => a.self && a.responseStatus === 'declined'); }

/* Ajustes feitos pelo Paulo no CRM, guardados nas propriedades do script:
   dias da semana fixos de cada profissional e as trocas pontuais (folgas e
   dias extras). Valem sobre o CONFIG, sem precisar editar este arquivo. */
function ajustes_() { return JSON.parse(PropertiesService.getScriptProperties().getProperty('AJUSTES') || '{}'); }
function gravarAjustes_(a) { PropertiesService.getScriptProperties().setProperty('AJUSTES', JSON.stringify(a)); }

function prof_(id) {
  const chave = String(id || CONFIG.PADRAO).toLowerCase();
  const p = CONFIG.PROFISSIONAIS[chave];
  if (!p) throw erro_('PARAMETRO', 'Profissional desconhecido.');
  const aj = ajustes_()[chave] || {};
  return Object.assign({ id: chave }, p, {
    dias: Array.isArray(aj.dias) ? aj.dias : p.dias,
    extras: aj.extras || [], folgas: aj.folgas || []
  });
}
/** Atende nesta data? O dia fixo da semana, menos as folgas, mais os dias extras. */
function atendeNoDia_(prof, data) {
  if (prof.folgas.indexOf(data) >= 0) return false;
  return prof.extras.indexOf(data) >= 0 || prof.dias.indexOf(diaSemana_(data)) >= 0;
}
/** De quem é o evento, pela cor (ou pela marca gravada pelo CRM). null = de ninguém = bloqueia todos. */
function donoDoEvento_(ev) {
  const p = (ev.extendedProperties && ev.extendedProperties.private) || {};
  if (p.profissional && CONFIG.PROFISSIONAIS[p.profissional]) return p.profissional;
  const achado = Object.keys(CONFIG.PROFISSIONAIS).find(k => CONFIG.PROFISSIONAIS[k].cor === String(ev.colorId || ''));
  return achado || null;
}

function proximosDias_(prof, n) {
  const res = [];
  let d = dt_(ymd_(new Date()), '12:00');
  for (let i = 0; res.length < n && i < 400; i++) {
    const data = ymd_(d);
    if (atendeNoDia_(prof, data)) res.push(data);
    d = new Date(d.getTime() + 86400000);
  }
  return res;
}

function diaBloqueado_(data, prof) {
  const timeMin = dt_(data, '00:00').toISOString();
  const timeMax = dt_(data, '23:59').toISOString();
  return CONFIG.CALENDARIOS_BLOQUEIO_DIA_INTEIRO.some(c => {
    if (c.quem.indexOf(prof.id) < 0) return false;
    try {
      const r = Calendar.Events.list(c.id, { timeMin, timeMax, singleEvents: true, maxResults: 20 });
      return (r.items || []).some(ev => ev.status !== 'cancelled' && ev.start && ev.start.date);
    } catch (e) { return false; }
  });
}
/** O que ocupa o profissional: os eventos dele e os de ninguém (sem cor de profissional). */
/** Atendimento que conta no dia de quem: o da cor dele; sem cor, conta para o Paulo (dono da agenda). */
function contaPara_(ev, prof) { const d = donoDoEvento_(ev); return d === prof.id || (d === null && prof.id === CONFIG.PADRAO); }
function eventosDoProfissional_(evs, prof) {
  return evs.filter(ev => { const d = donoDoEvento_(ev); return d === null || d === prof.id; });
}

function eventosDoDia_(data) {
  const r = Calendar.Events.list(CONFIG.CALENDAR_ID, {
    timeMin: dt_(data, '00:00').toISOString(),
    timeMax: dt_(data, '23:59').toISOString(),
    singleEvents: true, orderBy: 'startTime', maxResults: 250
  });
  return (r.items || []).filter(ev =>
    ev.status !== 'cancelled' && ev.start && ev.start.dateTime &&
    ev.transparency !== 'transparent' && !recusado_(ev));
}

function resumo_(ev) {
  const p = (ev.extendedProperties && ev.extendedProperties.private) || {};
  const ini = new Date(ev.start.dateTime), fim = new Date(ev.end.dateTime);
  const titulo = ev.summary || '(sem título)';
  const m = titulo.match(CONFIG.REGEX_ATENDIMENTO);
  return {
    id: ev.id, titulo, data: ymd_(ini), inicio: hm_(ini), fim: hm_(fim),
    atendimento: !!m, tipo: m ? m[1] : null, profissional: donoDoEvento_(ev),
    confirmado: /(^|\s)confirmado\s*$/i.test(titulo) && !/n[ãa]o confirmado\s*$/i.test(titulo),
    origemCrm: p.origem === 'crm-agenda',
    clienteId: p.clienteId || null, nome: p.nome || null,
    telefone: p.telefone || null, agendadoPor: p.agendadoPor || null
  };
}

function horariosLivres_(data, tipo, ocupados, user, agora, prof) {
  const dur = CONFIG.DURACAO[tipo] * 60000;
  const passo = CONFIG.PASSO_MIN * 60000;
  const bordas = new Set(ocupados.map(([, f]) => f.getTime()));
  CONFIG.JANELAS.forEach(([a]) => bordas.add(dt_(data, a).getTime()));
  const res = [];
  CONFIG.JANELAS.forEach(([a, b]) => {
    const ja = dt_(data, a).getTime(), jb = dt_(data, b).getTime();
    for (let t = ja; t + dur <= jb; t += passo) {
      const i = new Date(t), f = new Date(t + dur);
      if (i <= agora) continue;
      if (ocupados.some(([oi, of]) => sobrepoe_(i, f, oi, of))) continue;
      const reserva = prof.reservas.some(([ra, rb]) => sobrepoe_(i, f, dt_(data, ra), dt_(data, rb)));
      if (reserva && user.papel !== 'admin') continue;
      res.push({ inicio: hm_(i), fim: hm_(f), encaixado: bordas.has(t), reserva });
    }
  });
  return res;
}

/* ---------------------------- Ações ---------------------------- */

function disponibilidade_(user, r) {
  const prof = prof_(r.profissional);
  const n = Math.min(Number(r.dias) || prof.exibir, 30);
  const agora = new Date();
  const dias = proximosDias_(prof, n).map(data => {
    const base = { data, diaSemana: diaSemana_(data), limite: prof.limite };
    if (diaBloqueado_(data, prof)) {
      return Object.assign(base, { bloqueado: true, atendimentos: 0, lotado: true, eventos: [], livres: { '001': [], '002': [] } });
    }
    const evs = eventosDoProfissional_(eventosDoDia_(data), prof);
    const ocupados = evs.map(ev => [new Date(ev.start.dateTime), new Date(ev.end.dateTime)]);
    const atend = evs.filter(ev => ehAtendimento_(ev) && contaPara_(ev, prof)).length;
    const lotado = !!prof.limite && atend >= prof.limite;
    const livres = {};
    Object.keys(CONFIG.DURACAO).forEach(tipo => {
      livres[tipo] = (lotado && user.papel !== 'admin') ? [] : horariosLivres_(data, tipo, ocupados, user, agora, prof);
    });
    return Object.assign(base, { bloqueado: false, atendimentos: atend, lotado, eventos: evs.map(resumo_), livres,
             reservas: prof.reservas.map(([a, b]) => ({ inicio: a, fim: b })),
             janelas: CONFIG.JANELAS.map(([a, b]) => ({ inicio: a, fim: b })) });
  });

  const primeira = dias.find(d => !d.bloqueado && (d.livres['001'].length || d.livres['002'].length));
  let alerta = null;
  if (!primeira) {
    alerta = 'Nenhuma vaga para ' + prof.nome + ' nos próximos ' + n + ' dias de atendimento.';
  } else {
    const dd = Math.round((dt_(primeira.data, '12:00') - dt_(ymd_(agora), '12:00')) / 86400000);
    if (dd > CONFIG.PRAZO_ALERTA_DIAS) {
      alerta = 'A primeira vaga de ' + prof.nome + ' está a ' + dd + ' dias, acima do prazo de ' + CONFIG.PRAZO_ALERTA_DIAS + ' dias. Avise o Paulo.';
    }
  }
  const profissionais = Object.keys(CONFIG.PROFISSIONAIS).map(k => ({ id: k, nome: CONFIG.PROFISSIONAIS[k].nome,
    tratamento: CONFIG.PROFISSIONAIS[k].tratamento, cor: CONFIG.PROFISSIONAIS[k].cor, dias: CONFIG.PROFISSIONAIS[k].dias }));
  return { ok: true, usuario: user.nome, papel: user.papel, profissional: prof.id, profissionais, duracao: CONFIG.DURACAO, dias, alerta,
           ajustes: { dias: prof.dias, extras: prof.extras.filter(d => d >= ymd_(agora)), folgas: prof.folgas.filter(d => d >= ymd_(agora)) } };
}

function agendar_(user, r) {
  const prof = prof_(r.profissional);
  const tipo = String(r.tipo || '');
  if (!CONFIG.DURACAO[tipo]) throw erro_('PARAMETRO', 'Tipo inválido. Use 001 ou 002.');
  const nome = String(r.nome || '').replace(/\s+/g, ' ').trim();
  if (nome.length < 5 || nome.indexOf(' ') < 0) throw erro_('PARAMETRO', 'Informe o nome completo do cliente.');
  const tel = String(r.telefone || '').replace(/\D/g, '');
  if (!/^\d{10,11}$/.test(tel)) throw erro_('PARAMETRO', 'Telefone inválido. Informe DDD e número.');
  if (tipo === '002' && !r.clienteId) throw erro_('PARAMETRO', 'O agendamento 002 exige cliente selecionado no cadastro do CRM.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(r.data)) || !/^\d{2}:\d{2}$/.test(String(r.inicio))) {
    throw erro_('PARAMETRO', 'Data ou horário em formato inválido.');
  }
  if (r.orientacoesConfirmadas !== true) {
    throw erro_('ORIENTACOES', 'Confirme que o cliente foi orientado sobre a senha do Meu INSS e sobre o agendamento individual.');
  }
  if (!atendeNoDia_(prof, r.data)) throw erro_('PARAMETRO', prof.nome + ' não atende nesta data.');
  if (diaBloqueado_(r.data, prof)) throw erro_('DIA_BLOQUEADO', 'Data bloqueada por feriado ou férias.');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw erro_('OCUPADO', 'Sistema ocupado. Tente novamente em alguns segundos.');
  try {
    const evs = eventosDoProfissional_(eventosDoDia_(r.data), prof);
    const atend = evs.filter(ev => ehAtendimento_(ev) && contaPara_(ev, prof)).length;
    if (prof.limite && atend >= prof.limite && user.papel !== 'admin') {
      throw erro_('LOTADO', 'Limite de ' + prof.limite + ' atendimentos de ' + prof.nome + ' atingido neste dia.');
    }
    const ocupados = evs.map(ev => [new Date(ev.start.dateTime), new Date(ev.end.dateTime)]);
    const slot = horariosLivres_(r.data, tipo, ocupados, user, new Date(), prof).find(s => s.inicio === r.inicio);
    if (!slot) throw erro_('HORARIO_INDISPONIVEL', 'O horário acabou de ser ocupado. A agenda será atualizada.');

    const ini = dt_(r.data, r.inicio);
    const fim = new Date(ini.getTime() + CONFIG.DURACAO[tipo] * 60000);
    const descricao = [
      'Telefone: ' + tel,
      'Tipo: ' + (tipo === '001' ? 'Primeiro atendimento' : 'Cliente do escritório'),
      'Com: ' + prof.nome,
      'Agendado por: ' + user.nome + ' em ' + Utilities.formatDate(new Date(), CONFIG.TZ, 'dd/MM/yyyy HH:mm'),
      'Orientações dadas: senha do Meu INSS atualizada; agendamento individual.',
      r.observacoes ? 'Observações: ' + String(r.observacoes).trim() : ''
    ].filter(Boolean).join('\n');

    const ev = Calendar.Events.insert({
      summary: tipo + ' - ' + nome + ' - Não confirmado',
      description: descricao,
      colorId: prof.cor,
      start: { dateTime: ini.toISOString(), timeZone: CONFIG.TZ },
      end:   { dateTime: fim.toISOString(), timeZone: CONFIG.TZ },
      extendedProperties: { private: {
        origem: 'crm-agenda', tipo, nome, telefone: tel, profissional: prof.id,
        clienteId: r.clienteId ? String(r.clienteId) : '', agendadoPor: user.nome
      } }
    }, CONFIG.CALENDAR_ID);
    return { ok: true, evento: resumo_(ev) };
  } finally {
    lock.releaseLock();
  }
}

function confirmar_(user, r) {
  const ev = Calendar.Events.get(CONFIG.CALENDAR_ID, String(r.eventId || ''));
  if (!ehAtendimento_(ev)) throw erro_('NAO_PERMITIDO', 'O evento não é um atendimento 001 ou 002.');
  const base = (ev.summary || '').replace(/\s*-\s*(n[ãa]o confirmado|confirmado)\s*$/i, '');
  const novo = Calendar.Events.patch({ summary: base + ' - Confirmado' }, CONFIG.CALENDAR_ID, ev.id);
  return { ok: true, evento: resumo_(novo) };
}

function cancelar_(user, r) {
  const ev = Calendar.Events.get(CONFIG.CALENDAR_ID, String(r.eventId || ''));
  const origemCrm = ((ev.extendedProperties && ev.extendedProperties.private) || {}).origem === 'crm-agenda';
  if (!(origemCrm || (user.papel === 'admin' && ehAtendimento_(ev)))) {
    throw erro_('NAO_PERMITIDO', 'Somente agendamentos feitos pelo CRM podem ser cancelados por aqui.');
  }
  Calendar.Events.remove(CONFIG.CALENDAR_ID, ev.id);
  return { ok: true };
}

/** Grava o novo horário primeiro e só depois remove o antigo, para não perder a vaga. */
function remarcar_(user, r) {
  const antigo = Calendar.Events.get(CONFIG.CALENDAR_ID, String(r.eventId || ''));
  const p = (antigo.extendedProperties && antigo.extendedProperties.private) || {};
  if (p.origem !== 'crm-agenda' && user.papel !== 'admin') {
    throw erro_('NAO_PERMITIDO', 'Somente agendamentos feitos pelo CRM podem ser remarcados por aqui.');
  }
  const novo = agendar_(user, {
    profissional: r.profissional || donoDoEvento_(antigo) || CONFIG.PADRAO,
    tipo: p.tipo || r.tipo, nome: p.nome || r.nome, telefone: p.telefone || r.telefone,
    clienteId: p.clienteId || r.clienteId, data: r.data, inicio: r.inicio,
    observacoes: r.observacoes, orientacoesConfirmadas: true
  });
  Calendar.Events.remove(CONFIG.CALENDAR_ID, antigo.id);
  return novo;
}

function agendamentosFuturos_(user, r) {
  const params = { timeMin: new Date().toISOString(), singleEvents: true, orderBy: 'startTime', maxResults: 20 };
  if (r.clienteId) params.privateExtendedProperty = 'clienteId=' + String(r.clienteId);
  else if (r.telefone) params.privateExtendedProperty = 'telefone=' + String(r.telefone).replace(/\D/g, '');
  else throw erro_('PARAMETRO', 'Informe clienteId ou telefone.');
  const items = (Calendar.Events.list(CONFIG.CALENDAR_ID, params).items || []).filter(ev => ev.status !== 'cancelled');
  return { ok: true, agendamentos: items.map(resumo_) };
}

/* ---------------------------- Dias de atendimento (só o Paulo) ---------------------------- */

function soAdmin_(user) { if (user.papel !== 'admin') throw erro_('NAO_PERMITIDO', 'Só o Paulo muda os dias de atendimento.'); }
function dataValida_(d) { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d || ''))) throw erro_('PARAMETRO', 'Data em formato inválido.'); return String(d); }
function atendimentosNaData_(prof, data) {
  return eventosDoDia_(data).filter(ev => ehAtendimento_(ev) && contaPara_(ev, prof)).length;
}

/** Dias fixos da semana (0 domingo ... 6 sábado). */
function definirDias_(user, r) {
  soAdmin_(user);
  const prof = prof_(r.profissional);
  const dias = (r.dias || []).map(Number).filter(n => n >= 0 && n <= 6);
  if (!dias.length) throw erro_('PARAMETRO', 'Escolha ao menos um dia da semana.');
  const aj = ajustes_(); aj[prof.id] = Object.assign({}, aj[prof.id], { dias: Array.from(new Set(dias)).sort() });
  gravarAjustes_(aj);
  return { ok: true, dias: aj[prof.id].dias };
}

/** Troca pontual: deixa de atender em "de" e passa a atender em "para". */
function trocarDia_(user, r) {
  soAdmin_(user);
  const prof = prof_(r.profissional);
  const de = r.de ? dataValida_(r.de) : null, para = r.para ? dataValida_(r.para) : null;
  if (!de && !para) throw erro_('PARAMETRO', 'Informe o dia que sai e o dia que entra.');
  const aj = ajustes_(); const a = Object.assign({ extras: [], folgas: [] }, aj[prof.id]);
  a.extras = a.extras || []; a.folgas = a.folgas || [];
  if (de) { a.extras = a.extras.filter(d => d !== de); if (atendeNoDia_(prof, de)) a.folgas.push(de); }
  if (para) { a.folgas = a.folgas.filter(d => d !== para); if (!atendeNoDia_(Object.assign({}, prof, { folgas: a.folgas, extras: a.extras }), para)) a.extras.push(para); }
  a.extras = Array.from(new Set(a.extras)).sort(); a.folgas = Array.from(new Set(a.folgas)).sort();
  aj[prof.id] = a; gravarAjustes_(aj);
  // quem já estava marcado no dia que saiu continua na agenda: o CRM avisa para remarcar
  return { ok: true, extras: a.extras, folgas: a.folgas, atendimentosNoDiaQueSai: de ? atendimentosNaData_(prof, de) : 0 };
}

function desfazerAjuste_(user, r) {
  soAdmin_(user);
  const prof = prof_(r.profissional), data = dataValida_(r.data);
  const aj = ajustes_(); const a = aj[prof.id] || {};
  a.extras = (a.extras || []).filter(d => d !== data); a.folgas = (a.folgas || []).filter(d => d !== data);
  aj[prof.id] = a; gravarAjustes_(aj);
  return { ok: true, extras: a.extras, folgas: a.folgas };
}

/* ---------------------------- Teste no editor ---------------------------- */

function testeDisponibilidade() {
  ['paulo', 'marcos', 'amanda'].forEach(p =>
    Logger.log(JSON.stringify(disponibilidade_({ nome: 'Teste', papel: 'admin' }, { profissional: p, dias: 3 }), null, 2)));
}
