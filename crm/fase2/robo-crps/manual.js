// Recurso que o robô NÃO consegue acompanhar.
//
// O e-Recursos só devolve os processos ligados ao CPF do procurador. Quando o
// recurso não está vinculado — protocolo feito por outro advogado, cadastro
// que o INSS não corrigiu, processo antigo — a consulta automática não vê
// nada, e a única saída é alguém abrir o site e olhar.
//
// Hoje isso vive no To Do como "André, verificar semanalmente", e cada olhada
// que não encontra nada vira mais uma anotação "não houve andamento". Ao fim
// de um semestre a ficha tem vinte linhas dizendo que nada aconteceu, e ainda
// assim ninguém sabe se a consulta desta semana foi feita.
//
// A troca é essa: CONFERÊNCIA não é ANDAMENTO. A olhada que não achou nada
// vira um carimbo (quem, quando) que se acumula numa linha só — "conferido
// 6× sem novidade · última em 05/08 (D)". Só o que ACONTECEU vira comentário
// na ficha. E o número entra na lista de consulta manual, para o coletor
// parar de tentar (e falhar) nele toda rodada.
//
// Mora dentro de casos.crps, no mesmo bloco do recurso, para que o CRM e os
// robôs leiam do mesmo lugar:
//   { nup, manual: true,
//     consulta: { responsavel_id, cada_dias, proxima, total, checagens: [...] } }

const CADENCIA_PADRAO = 7;      // semanal, como o escritório já faz
const HISTORICO_MAX = 12;       // o suficiente para "vem sendo conferido"

const so = x => String(x || '').replace(/\D/g, '');
const ehManual = b => !!(b && b.manual);

// soma dias a uma data YYYY-MM-DD sem passar por fuso: o dia da consulta é
// dia de calendário, e new Date('2026-08-09') em UTC já atrasou um dia antes
function maisDias(iso, dias) {
  const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  const t = new Date(Date.UTC(a, m - 1, d + Number(dias || 0)));
  return t.toISOString().slice(0, 10);
}

// cria (ou reaproveita) o bloco manual de um número dentro de casos.crps
function marcarManual(crps, nup, { responsavel_id = null, cada_dias = CADENCIA_PADRAO,
                                   proxima = null, hoje = null } = {}) {
  const lista = Array.isArray(crps) ? crps : (crps ? [crps] : []);
  let b = lista.find(x => so(x.nup) === so(nup));
  if (!b) { b = { nup: String(nup), eventos: [] }; lista.push(b); }
  b.manual = true;
  const antes = b.consulta || {};
  b.consulta = {
    responsavel_id: responsavel_id || antes.responsavel_id || null,
    cada_dias: Number(cada_dias) || antes.cada_dias || CADENCIA_PADRAO,
    proxima: proxima || antes.proxima || (hoje ? maisDias(hoje, 0) : null),
    total: antes.total || 0,
    checagens: antes.checagens || [],
  };
  return lista;
}

// volta a ser automático: o INSS vinculou o processo, o robô assume
function desmarcarManual(crps, nup) {
  for (const b of (Array.isArray(crps) ? crps : [])) {
    if (so(b.nup) !== so(nup)) continue;
    delete b.manual;
    delete b.consulta;
  }
  return crps;
}

// registra a olhada. novidade=false é o caso comum e NÃO gera comentário:
// é só o carimbo de que alguém conferiu e o processo continua parado.
function registrarConsulta(bloco, { por = null, em = null, novidade = false, hoje = null } = {}) {
  if (!ehManual(bloco)) return bloco;
  const c = bloco.consulta || (bloco.consulta = { cada_dias: CADENCIA_PADRAO, total: 0, checagens: [] });
  const quando = em || (hoje ? `${hoje}T12:00:00.000Z` : new Date().toISOString());
  c.checagens = [{ em: quando, por, novidade: !!novidade }, ...(c.checagens || [])].slice(0, HISTORICO_MAX);
  c.total = (c.total || 0) + 1;
  // a próxima conta a partir de HOJE, não da data que estava marcada: quem
  // conferiu com três dias de atraso não deve ser cobrado de novo amanhã
  const base = (quando || '').slice(0, 10);
  c.proxima = maisDias(base, c.cada_dias || CADENCIA_PADRAO);
  return bloco;
}

// o que está vencido para conferir hoje
function vencidas(casos, hoje, { colaboradorId = null } = {}) {
  const fora = [];
  for (const k of (casos || []))
    for (const b of (Array.isArray(k.crps) ? k.crps : [])) {
      if (!ehManual(b)) continue;
      const c = b.consulta || {};
      if (colaboradorId && c.responsavel_id !== colaboradorId) continue;
      if (c.proxima && c.proxima > hoje) continue;    // sem data = para conferir
      fora.push({ caso: k, bloco: b, proxima: c.proxima || hoje });
    }
  return fora.sort((x, y) => (x.proxima < y.proxima ? -1 : 1));
}

// os números que o coletor NÃO deve pedir: pedir dá 404 toda rodada e ainda
// custa a pausa entre as chamadas
function nupsManuais(casos) {
  const fora = new Set();
  for (const k of (casos || []))
    for (const b of (Array.isArray(k.crps) ? k.crps : []))
      if (ehManual(b) && b.nup) fora.add(so(b.nup));
  return fora;
}

module.exports = { CADENCIA_PADRAO, HISTORICO_MAX, ehManual, maisDias,
  marcarManual, desmarcarManual, registrarConsulta, vencidas, nupsManuais };
