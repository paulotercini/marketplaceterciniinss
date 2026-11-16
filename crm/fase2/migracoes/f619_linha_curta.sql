-- F619: a linha curta do último andamento relevante nos cartões INSS, CRPS e Judicial do Dashboard do caso.
-- Regra v6, testada em somente leitura em 290 casos (16.11.2026): catálogo fechado de fatos com frase pronta,
-- rotina nunca vira a linha, data conferida na fonte e, na dúvida, o texto literal do portal com a data.
-- Sem chamada a modelo de IA e sem providência. A correção da equipe fica em casos.ronda.linha_curta (no app).
create or replace function public.linha_curta(p_caso uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare r jsonb;
begin
  if not coalesce(sou_ativo(), false) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  with
k as (
  select q.n, c.id, c.cliente_id, c.fase, c.nb, c.protocolos, c.etapa, c.resultado, c.decisao_em, q.quadro
  from casos c cross join (values (1,'pat'),(2,'crps'),(3,'pje')) q(n, quadro)
  where c.id = p_caso
),
irm as (
  select k.n, c2.id caso2
  from k join casos c2 on c2.cliente_id = k.cliente_id
  where c2.id = k.id
     or exists (select 1 from jsonb_array_elements_text(coalesce(k.protocolos,'[]'::jsonb)) p, jsonb_array_elements_text(coalesce(c2.protocolos,'[]'::jsonb)) q
                where regexp_replace(p,'\D','','g') = regexp_replace(q,'\D','','g')
                  and length(regexp_replace(p,'\D','','g')) between 6 and 16)
     or (length(regexp_replace(coalesce(k.nb,''),'\D','','g')) = 10
         and regexp_replace(k.nb,'\D','','g') = regexp_replace(coalesce(c2.nb,''),'\D','','g'))
),
bruto as (
  select k.n, k.quadro, (a.caso_id = k.id) proprio, a.id and_id, a.origem, a.origem_id,
         case
           when a.origem = 'pat' and a.origem_id ~ '^atualizacao:\d+:\d{14}$'
             then to_timestamp(substring(a.origem_id from ':(\d{14})$'), 'YYYYMMDDHH24MISS')::timestamp
           when a.origem in ('pje','esaj','eproc') and a.origem_id ~ '\d{4}-\d{2}-\d{2}T\d{2}:\d{2}'
             then to_timestamp(substring(a.origem_id from '(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})'), 'YYYY-MM-DD"T"HH24:MI')::timestamp
           when a.origem = 'crps' and split_part(a.origem_id,'|',2) ~ '^\d{4}-\d{2}-\d{2}T'
             then split_part(a.origem_id,'|',2)::timestamp
           else a.criado_em at time zone 'America/Sao_Paulo'
         end ev,
         substring(a.texto from '\((\dº grau)\)') grau,
         substring(a.origem_id from '^mov:(\d{20}):') proc, a.texto raw,
         case when a.origem = 'crps' then split_part(a.origem_id,'|',3) else '' end cru,
         -- sem rodapé " — em …", sem aviso do CRM (⚠ é providência) e sem o prefixo do sistema
         regexp_replace(regexp_replace(regexp_replace(
           trim(split_part(split_part(a.texto, ' — em ', 1), '⚠', 1)),
           '^(PJe|e-SAJ TJSP|eproc TJSP) \(\dº grau\): ', ''),
           '^🖥 CRPS · \d\d/\d\d/\d{4} — ', ''),
           '^(INSS|Escritório) · ', '') tx
  from k join irm i on i.n = k.n join andamentos a on a.caso_id = i.caso2
  where k.quadro is not null
    and ((a.caso_id = k.id and (a.origem = k.quadro or (k.quadro = 'pje' and a.origem in ('esaj','eproc'))))
         or (a.caso_id <> k.id and k.quadro = 'pat' and a.origem = 'pat'))
    and coalesce(a.origem_id,'') !~ '^(importado|situacao|prazo):'
    and a.texto !~ '⏰'
and a.texto !~ '\[Cancelado\]'
    and a.texto !~* 'juntado a este caso pela importação|cálculo da quantidade de dias|caso importado do'
),
-- (1)(2) partes: no Judicial, por " · "; nos demais, só os anexos se separam do texto
partes as (
  select b.*, p.parte, p.ord, (p.parte ~ '^📎') anexo
  from bruto b,
  lateral unnest(case when b.origem in ('pje','esaj') then regexp_split_to_array(b.tx, ' · ')
                      else regexp_split_to_array(regexp_replace(b.tx, ' · 📎', ' ·· 📎', 'g'), ' ·· ') end)
          with ordinality p(parte, ord)
  where trim(p.parte) <> ''
),
grau_atual as (select distinct on (n) n, grau from partes where quadro = 'pje' and proprio order by n, ev desc),
mov as (
  select p.*, (p.quadro <> 'pje' or g.grau is null or p.grau is not distinct from g.grau) grau_ok
  from partes p left join grau_atual g on g.n = p.n
),
cls as (
  select m.*, (m.parte || ' ' || m.cru) t,
  case
    when (parte || ' ' || cru) ~* 'não foi reconhecido o direito' then case when quadro = 'pat' then 'indef' end
    when (parte || ' ' || cru) ~* '(foi reconhecido o direito|solicitado foi concedido|concedido sob o n|benefício implantado|comprovante de implanta|implantação (do benefício )?(cumprida|efetivada|realizada)|ac[óo]rd[ãa]o cumprido|reconhecimento do direito|foi deferido sob)'
         and parte !~* 'gratuidade' and not anexo then 'conc'
    when not proprio then null
    when quadro = 'pat' and parte ~* '(indeferid|indeferimento do pedido|pedido foi negado)' then 'indef'
    when quadro = 'pat' and parte ~* '(solicitamos o envio|situação: em exigência|passos para cumprir a exigência)'
         and parte !~* '(ciente da exigência|integralmente cumprida)' then 'exig'
    -- v6 (1) convocação do INSS para perícia ou avaliação social
    when quadro = 'pat' and parte ~* 'comparecimento para realiza[çc][ãa]o de (per[íi]cia|avalia[çc][ãa]o social)' then 'peric_des'
    -- v6 (3) suspensão do processo e embargos no Judicial
    when quadro = 'pje' and not anexo and parte ~* '(levantad[ao] a (suspens|causa suspensiva)|levantamento da suspens|dessobrest)' then 'susp_fim'
    when quadro = 'pje' and not anexo and parte ~* '(suspens|sobrest)' and parte !~* '(prazo|precat[óo]rio|efeito suspensivo|feriado|requisi[çc][ãa]o|juntada|pedido de|requer)' then 'susp'
    when quadro = 'pje' and not anexo and parte ~* 'conclusos? com embargos' then 'emb_conc'
    when quadro = 'pje' and not anexo and parte ~* 'peti[çc][ãa]o de embargos de declara' and parte !~* '(contrarraz|impugna|manifesta)' then 'emb_jud'
    -- v6 (2) distribuição
    when quadro = 'pje' and not anexo and parte ~* '^\s*(distribu[íi]d[oa]|distribui[çc][ãa]o)' and parte !~* 'redistribu' then 'distrib'
    when quadro = 'crps' and not anexo and cru ~* '^encaminhamento - \([^)]* para [^)]*\d+ª ?(jr|caj)\)' then 'distrib'
    -- v5 (2) fatos decisivos do Judicial
    when quadro = 'pje' and not anexo and parte ~* '(transitad[oa] em julgado|trânsito em julgado)' and parte !~* '(aguard|certifique|decorrid)' then 'transito'
    when quadro = 'pje' and not anexo and parte ~* 'of[íi]cio requisit[óo]rio' and split_part(parte,' — ',1) !~* '(pedido|requer|minuta)' then 'req'
    when quadro = 'pje' and not anexo and parte ~* 'comunica[çc][ãa]o (eletr[ôo]nica )?d[ea] (rpv|requisi[çc][ãa]o de pequeno valor)' then 'rpv_com'
    when quadro = 'pje' and not anexo and parte ~* 'of[íi]cio.{0,90}implanta[çc][ãa]o de benef' then 'impl_ord'
    when quadro = 'pje' and not anexo and parte ~* '(penhora on ?-?line|bloqueio).{0,25}positiv' then 'penhora'
    when quadro = 'pje' and not anexo and parte ~* '(levante-se|mandado de levantamento expedido|alvar[áa] (de levantamento )?expedido)' and parte !~* 'pedido de' then 'levant'
    when quadro = 'pje' and not anexo and parte ~* '(peti[çc][ãa]o de apela|apela[çc][ãa]o (interposta|protocolada)|interposi[çc][ãa]o de apela)' and parte !~* 'contrarraz' then 'apel'
    -- v5 (4) incidente (embargos) no CRPS
    when quadro = 'crps' and not anexo and (cru ~* '^interposição de incidente' or parte ~* 'embargos protocolados') then 'emb_op'
    when quadro = 'crps' and not anexo and (parte || ' ' || cru) ~* 'classificação de incidente' then 'inc_class'
    -- (3) recurso aos superiores (no CRPS, a interposição; no Judicial, a petição do recurso)
    when (parte || ' ' || cru) ~* '(interposição de recurso especial|recurso especial protocolado|recurso extraordinário|agravo em recurso (especial|extraordinário)|agravo interno|petição de recurso especial)'
         and (parte || ' ' || cru) !~* '(contrarraz|tarefa de requerimento|decorrido|prazo|admitid|inadmit|intima|vista|remetid|remessa|conclus)'
         and not anexo then 'rec_sup'
    when parte ~* 'retirad[oa] de pauta' then 'despauta'
    when parte ~* '(pautado para julgamento|inclu[íi]do em pauta|inclusão em pauta|intimação de pauta)' then 'pauta'
    when parte ~* 'parecer médico concluído' then 'parecer'
    when (parte || ' ' || cru) ~* '(recurso provido em parte|recurso provido|recurso negado|embargos acolhidos|embargos rejeitados|embargos de declaração não-acolhidos|embargos de declaração acolhidos|provimento parcial|negar-lhe provimento|dar-lhe provimento|negar provimento|dar provimento|não conhec|não-acolhid)' and not anexo then 'acord_res'
    when parte ~* 'conhecid[oa] o recurso' and parte ~* 'provid' then 'acord_res'
    when quadro = 'pje' and not anexo and parte ~* 'peti[çc][ãa]o de contesta' and parte !~* '(impugna|r[ée]plica)' then 'contest'
    when parte ~* '(perícia agendada|perícia designada|avaliação social agendada|agendad[oa] (a )?(perícia|avaliação)|agendamento de (perícia|avaliação social) realizado)' then 'peric_des'
    when parte ~* 'perícia realizada' then 'peric_feita'
    when parte ~* '\mlaudo' and parte !~* '(manifesta|impugna|quesito|esclarec)' then 'laudo'
    when parte ~* '(nomeado perito|perito nomeado)' then 'perito'
    when parte ~* '(julgad[oa]s? (o pedido )?(procedente|improcedente|parcialmente)|procedente em parte|homologad[ao] (a |o )?(transação|acordo)|extint[oa] o processo|extinta a execução|concedida a segurança|denegada a segurança)' and not anexo then 'sent_res'
    when parte ~* '(tutela|liminar)' and parte ~* '(deferid|concedid|indeferid)' and not anexo then 'tutela'
    when parte ~* 'homolog[oa]\M.{0,20}c[áa]lculos' then 'calc'
    when quadro = 'pje' and not anexo and parte ~* 'incidente processual instaurado' and parte ~* 'requisi[çc][ãa]o de pequeno valor' then 'rpv_inc'
    when parte ~* 'requisição de pagamento de pequeno valor paga' then 'rpv_paga'
    when parte ~* '(requisição de pagamento de pequeno valor (enviada|preparada)|expedição de requisição de pequeno valor|rpv expedid)' then 'rpv'
    when parte ~* 'suspenso em razão de expedição de precatório' then 'precat'
    when parte ~* '(prazo (de |: ?)\d+ dias|\m\d+ \([a-zçãé ]+\) dias)' then 'intim'
    when quadro = 'crps' and parte ~* 'protocolo recebido no inss' then 'rec_receb'
    -- decisão: pelo movimento ou pelo nome do anexo (1); o resultado vem do documento (4)
    when anexo and parte ~* '(comunica[çc][ãa]o de ac[óo]rd[ãa]o|^📎 ac[óo]rd[ãa]o|^📎 senten[çc]a|^📎 decis[ãa]o( monocr)?)' then 'sem_res'
    when not anexo and parte ~* '(ac[óo]rd[ãa]o|senten[çc]a|decisão monocrática|julgado - mérito|outras decisões|comunicação de decisão|não admitid|inadmitid)'
         and parte !~* '(conclus|embargos de declaração$|decorrido|prazo|trânsit|transitad)' then 'sem_res'
  end tipo,
  (parte ~* '^(publicad|disponibilizad)') publicacao,
  ((parte || ' ' || cru) ~* '(juntada|juntad[ao]|conclus|decorrid|expedi[çc][ãa]o de|expedid|certid|ci[êe]ncia|publicad|disponibilizad|recebid|mero expediente|tarefa transferida|transfer[êe]ncia|confirmad|intima[çc][ãa]o eletr|leitura|ato ordinat|distribu[íi]d|protocolad|encaminhad|notifica[çc][ãa]o|aguardando|devolvid|ar dispon|carta decis|of[íi]cio|inclus[ãa]o de parte|titular do benef|representa[çc][ãa]o|a[çc][õo]es judiciais|desativa[çc][ãa]o|redistribui|despacho|ciente|cumprid|em anexo|defesa|contrarraz|motivo de indeferimento|informa[çc][õo]es previdenci|para inclus|solicita[çc][ãa]o|mandado|cita[çc][ãa]o|suspensão do prazo|mensagem eletr|prova|^\[imagem\]$|📎|informa[çc][ãa]o - id|(des)?arquivar$|tarefa de requerimento|adicionou .{0,160}procurador|remetido ao dje)'
     and parte !~* 'demanda concluída'
     and coalesce(origem_id,'') !~ '^atualizacao:') or anexo
    or (quadro = 'pje' and (parte ~* '^\s*(peti[çc][ãa]o|remessa)\s*$' or parte ~* 'dila[çc][ãa]o de prazo' or parte ~* '(suspens[ãa]o do prazo|cancelamento de movimenta|gratuidade|honor[áa]rios? (de |do )?perit|redistribu)'
        or (parte ~* 'remetid[oa]s? (os )?autos.{0,80}(secretaria|setor administrativo|ju[íi]zo de origem)' and parte !~* 'contadoria')
        or parte ~* 'remetid[oa]s? (os )?autos \((para processamento|em diligência)\)')) rotina
  from mov m
),
-- (4) resultado lido do documento do mesmo andamento
docres as (
  select c.and_id,
    (select r from (
       select case
         when x ~* '(julgo parcialmente procedente|parcialmente procedentes?|procedente em parte|concedo parcialmente a seguran)' then 'proc_parc'
         when x ~* '(julgo improcedente|improcedentes? (o|os) pedidos?|denego a seguran)' then case when x ~* 'seguran' then 'denega' else 'improc' end
         when x ~* '(julgo procedente|concedo a seguran)' then case when x ~* 'seguran' then 'concede' else 'proc' end
         when x ~* '(extingo o processo|julgo extint)' then 'extinto'
         when x ~* '(acolho (parcialmente )?os embargos|embargos (de declaração )?acolhidos)' then 'emb_acol'
         when x ~* '(rejeito os embargos|embargos (de declaração )?rejeitados)' then 'emb_rej'
         when x ~* '(dar parcial provimento|dou parcial provimento|deu parcial provimento|parcial provimento|provido em parte|parcialmente provido)' then 'prov_parc'
         when x ~* '(negar provimento|nego provimento|negou provimento|negaram provimento|desprovid|não provido|improvido)' then 'negado'
         when x ~* '(dar provimento|dou provimento|deu provimento|deram provimento|recurso provido)' then 'provido'
       end r, prio
       from anexos an,
       lateral (values (right(regexp_replace(an.texto,'\s+',' ','g'), 3000), 1),
                       (left(regexp_replace(an.texto,'\s+',' ','g'), 1500), 2)) v(x, prio)
       where an.andamento_id = c.and_id
         and an.nome ~* '(senten|ac[óo]rd|decis|ementa|voto|comunica)'
         and an.nome !~* '(documento comprobat|certid|intima)'
     ) s where r is not null order by prio limit 1) r
  from (select distinct and_id from cls where tipo = 'sem_res') c
),
cls2 as (
  select c.*,
    case when c.tipo = 'sem_res' and d.r is not null then
      case when d.r in ('proc_parc','improc','proc','extinto','concede','denega') then 'sent_doc'
           when d.r in ('emb_acol','emb_rej') then 'emb_doc' else 'acord_doc' end
    else c.tipo end tipo2,
    d.r doc_r
  from cls c left join docres d on d.and_id = c.and_id and c.tipo = 'sem_res'
),
-- catálogo com o grau atual; sem fato no grau atual, qualquer grau
cand as (
  select c.*, case when tipo2 in ('sent_res','sent_doc','acord_res','acord_doc','emb_doc','tutela','calc','conc','indef','transito','req','rpv_com','impl_ord','penhora','levant','apel') then 1 else 0 end comres
  from cls2 c
  where c.tipo2 is not null
    and (c.grau_ok or c.tipo2 = 'transito' or not exists (select 1 from cls2 x where x.n = c.n and x.grau_ok and x.proprio and x.tipo2 is not null and x.tipo2 <> 'conc'))
),
fato_conc as (select distinct on (n) * from cand c where tipo2 = 'conc'
  -- v5 (3) o acórdão cumprido do CRPS não vence acórdão com resultado mais novo
  and not (c.origem = 'crps' and exists (select 1 from cand y where y.n = c.n and y.proprio and y.tipo2 in ('acord_res','acord_doc') and y.ev > c.ev))
  order by n, ev desc),
fato2 as (
  select distinct on (n) * from cand c
  where tipo2 <> 'conc' and proprio
    -- publicação ou decisão sem resultado não supera decisão com resultado dos 30 dias anteriores
    and not (c.tipo2 = 'sem_res' and exists (select 1 from cand y where y.n = c.n and y.proprio and y.comres = 1
              and y.tipo2 <> 'conc' and y.ev <= c.ev and y.ev > c.ev - interval '30 days'))
  order by n, ev::date desc, (quadro = 'pat' and tipo2 = 'peric_des') desc, (quadro = 'crps' and tipo2 = 'emb_op') desc, ev desc, comres desc, ord
),
cat as (
  select k.n, coalesce(fc.tipo2, f2.tipo2) tipo, coalesce(fc.ev, f2.ev) ev, coalesce(fc.parte, f2.parte) tx,
         coalesce(fc.t, f2.t) t, coalesce(fc.origem, f2.origem) origem, coalesce(fc.doc_r, f2.doc_r) doc_r,
         coalesce(fc.anexo, f2.anexo) anexo, (fc.n is not null) conc, coalesce(fc.cru, f2.cru) cru, coalesce(fc.grau, f2.grau) grau
  from k left join fato_conc fc on fc.n = k.n left join fato2 f2 on f2.n = k.n
),
-- (d) cumprimento de sentença, execução ou RPV em processo diferente do arquivado, movimentado depois
cumpr as (
  select distinct on (b.n) b.n, b.proc, b.ev
  from bruto b
  where b.quadro = 'pje' and b.proprio and b.proc is not null
    and b.raw ~* '(cumprimento de senten|execu[çc][ãa]o contra|requisi[çc][ãa]o de pequeno valor|precat[óo]rio)'
    and b.tx !~* '(suspens[ãa]o do prazo|prazo referente ao usu)'
    and exists (select 1 from bruto a2 where a2.n = b.n and a2.proprio and a2.proc is not null and a2.proc <> b.proc
                and a2.tx ~* 'arquivad' and a2.ev < b.ev)
  order by b.n, b.ev desc
),
arq_fora as (
  select c.and_id, c.ord from cls2 c join cumpr u on u.n = c.n
  where c.parte ~* 'arquivad' and c.proc is not null and c.proc <> u.proc and c.ev < u.ev
),
sup as (
  select distinct on (cl.n) cl.n, cl.ev, cl.parte tx, cl.origem, false rotina
  from cls2 cl join cat on cat.n = cl.n
  where cl.proprio and cl.grau_ok and cl.tipo2 is null and not cl.rotina and not cl.anexo and not cat.conc
    and not exists (select 1 from arq_fora f where f.and_id = cl.and_id and f.ord = cl.ord)
    and (cat.ev is null or cl.ev::date > cat.ev::date)
    and not (cl.origem_id like 'atualizacao:%' and cl.parte ~* 'situação: conclu' and cat.ev is not null and cl.ev < cat.ev + interval '3 days')
  order by cl.n, cl.ev desc, (cl.origem_id like 'atualizacao:%')
),
ult as (
  select distinct on (n) n, ev, parte tx, origem, rotina from cls2 where proprio and grau_ok and not anexo
    and parte !~* '(titular do benef|relacionado como parte|informa[çc][õo]es previdenci)'
    and not exists (select 1 from arq_fora f where f.and_id = cls2.and_id and f.ord = cls2.ord) order by n, rotina, ev desc
),
lit0 as (
  select n, ev, origem, rotina,
    left(regexp_replace(tx, '^Movimentação no protocolo \d+ — situação: ([^(]+?) \(portal atualizado.*$', 'Situação no INSS: \1'), 140) t0
  from (select * from sup union all select u.* from ult u where not exists (select 1 from cat where cat.n = u.n and cat.tipo is not null)
                                  and not exists (select 1 from sup where sup.n = u.n)) s
),
lit as (select n, ev, origem, rotina, regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(t0, '(Conselheir[oa]|Relator[a]?)( Relator[a]?)?\s*[-:]\s*(Conselheir[oa]:\s*)?[^|•(]+', '\1\2', 'gi'), '(advogad[oa](\(a\))?)\s+[A-ZÁ-Ú][^,.;]*', '\1 [nome]', 'g'), '\d{3}\.\d{3}\.\d{3}-\d{2}', '[CPF]', 'g'), 'Nome: [^,]+,', 'Nome: [omitido],', 'g'), '\(Por: [^)]*\)', '', 'g') t0 from lit0),
litm as (select n, ev, origem, rotina, regexp_replace(regexp_replace(regexp_replace(t0, '[A-ZÁ-Úa-zá-ú][^()|•:]*\(CPF \[CPF\]\)', '[nome]', 'g'), '(Advogad[oa]s?(\([as]+\))?:)\s*[^|•]+', '\1 [nome]', 'gi'), '\(?OAB[^)|•]*\)?', '', 'g') t from lit),
res_dec as (
  select n,
    case when t ~* 'não conhec' then case when t ~* 'embargo' then 'embargos de declaração não conhecidos' else 'recurso não conhecido' end
         when t ~* 'embargo' and t ~* '(negar(-lhe)? provimento|rejeit|não-acolhid|não acolhid)' then 'embargos de declaração rejeitados'
         when t ~* 'embargo' and t ~* '(dar(-lhe)? provimento|acolh)' then 'embargos de declaração acolhidos'
         when t ~* '(provido em parte|provimento parcial|parcialmente)' then 'recurso provido em parte'
         when t ~* '(não[- ]provido|desprovido|recurso negado|negar(-lhe)? provimento|negad)' then 'recurso negado'
         when t ~* '(dar(-lhe)? provimento|provi)' then 'recurso provido' end r,
    substring(t from '(\d+ª (Junta de Recursos|Câmara de Julgamento))') org
  from cat where tipo = 'acord_res'
),
-- v5 (4) recurso especial e embargos no mesmo dia
arqv as (select distinct on (c.n) c.n, c.ev from cls2 c join cat on cat.n = c.n and cat.tipo = 'transito'
where c.proprio and c.parte ~* 'arquivad' and c.ev::date >= cat.ev::date order by c.n, c.ev desc),
dois as (select distinct c.n from cat c join cand y on y.n = c.n and y.proprio and y.ev::date = c.ev::date
         where ((c.tipo = 'rec_sup' and y.tipo2 = 'emb_op') or (c.tipo = 'emb_op' and y.tipo2 = 'rec_sup'))
           and not exists (select 1 from cls2 z where z.n = c.n and z.ev::date = c.ev::date and (z.parte || ' ' || z.cru) ~* 'cancelamento do recurso especial')),
-- (a) registro de agendamento com a data
pdata as (
  select distinct on (n) n, ev,
    regexp_replace(substring(parte from '(?:data e hora agendada: |agendad[oa] no INSS para |agendad[oa] para (?:o dia )?|no dia )(\d\d[/.]\d\d[/.]\d{4})'), '\.', '/', 'g') dt,
    (parte ~* 'avalia[çc][ãa]o social') social
  from cls2
  where proprio and tipo2 = 'peric_des'
    and parte ~* '(data e hora agendada: |agendad[oa] no INSS para |agendad[oa] para (o dia )?|no dia )\d\d[/.]\d\d[/.]\d{4}'
  order by n, ev desc
),
-- (c) situação mais recente de cada protocolo do próprio caso
prot as (
  select distinct on (n, pr) n, pr, ev, sit from (
    select b.n, substring(b.origem_id from '^atualizacao:(\d+):') pr, b.ev,
           trim(substring(b.tx from 'situação: ([^(]+?) \(')) sit
    from bruto b where b.proprio and b.quadro = 'pat' and b.origem_id ~ '^atualizacao:\d+:\d{14}$') x
  where sit is not null
  order by n, pr, ev desc
),
outro as (
  select distinct on (p.n) p.n, p.sit,
    (select min(b.ev) from bruto b where b.n = p.n and b.proprio and b.origem_id like 'atualizacao:' || p.pr || ':%'
       and b.tx ~* ('situação: ' || p.sit)
       and b.ev > coalesce((select max(b2.ev) from bruto b2 where b2.n = p.n and b2.proprio
                             and b2.origem_id like 'atualizacao:' || p.pr || ':%' and b2.tx !~* ('situação: ' || p.sit)), '-infinity')) desde
  from prot p join cat on cat.n = p.n and cat.tipo = 'conc'
  where p.sit ~* '^(em análise|em exigência)$' and p.ev > cat.ev
  order by p.n, p.ev desc
),
susp_ab as (
  select distinct on (c.n) c.n, c.ev, c.parte from cand c
  where c.proprio and c.tipo2 = 'susp'
    and not exists (select 1 from cand y where y.n = c.n and y.proprio and y.ev > c.ev
                    and (y.tipo2 in ('susp_fim','sent_res','sent_doc','acord_res','acord_doc','emb_doc','transito','calc','req','rpv','rpv_paga','rpv_com','precat','conc','distrib','tutela')))
  order by c.n, c.ev desc
),
umov as (select n, max(ev) ev from cls2 where proprio and grau_ok and not anexo group by n),
pubd as (select distinct on (n) n, coalesce(to_date(substring(parte from '(?i)^publicad[oa] \S+ em (\d\d/\d\d/\d{4})'),'DD/MM/YYYY'), ev::date) dt
         from cls2 where proprio and grau_ok and not anexo and parte ~* '^publicad[oa] (decis[ãa]o|senten[çc]a|ac[óo]rd[ãa]o)' order by n, ev desc),
saida as (
select k.n, left(k.id::text,8) id8, k.quadro, k.etapa, k.resultado, k.decisao_em, cat.tipo, cat.ev cat_ev, cat.doc_r, cat.tx cat_tx, (s.n is not null) via_sup, su.ev su_ev, l.ev l_ev, cu.ev cu_ev,
  (select b.origem from bruto b where b.n = k.n and b.proprio order by b.ev desc limit 1) ori,
  case
    when cat.tipo = 'transito' and av.n is not null and (um.ev is null or um.ev::date <= av.ev::date + 30) and (s.n is null or l.ev::date <= av.ev::date or l.t ~* 'arquivad')
      then 'Trânsito em julgado em ' || coalesce(substring(cat.tx from '(?i)em julgado em (\d\d/\d\d/\d{4})'), to_char(cat.ev,'DD/MM/YYYY')) || '; autos arquivados em ' || to_char(av.ev,'DD/MM/YYYY') || '.'
    when su.n is not null then 'Processo suspenso desde ' || to_char(su.ev,'DD/MM/YYYY')
      || coalesce(' (Tema ' || substring(su.parte from '(?i)(?:tema\D{0,10}|repetitivo\s+|repercuss[ãa]o geral\s+(?:de n[úu]mero\s+)?)(\d{2,5})') || '/'
           || case when su.parte ~* 'tema\s*-?\s*stf|repercuss' then 'STF' when su.parte ~* 'tema\s*-?\s*tnu|\mtnu\M' then 'TNU' else 'STJ' end || ')',
           case when su.parte ~* 'embargos' then ' até o julgamento dos embargos' else '' end) || '.'
    when s.n is not null then '"' || l.t || '" (' || to_char(l.ev,'DD/MM/YYYY') || ').'
    when cat.tipo = 'conc' and cat.origem = 'crps' then 'Acórdão cumprido pelo INSS em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'conc' and cat.tx ~* 'implant' then 'Benefício implantado em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'conc' then 'Benefício concedido pelo INSS em ' || to_char(cat.ev,'DD/MM/YYYY')
         || coalesce(', NB ' || substring(cat.tx from '(\d{3}\.\d{3}\.\d{3}-\d)'), '')
         || coalesce('; outro pedido ' || lower(o.sit) || ' desde ' || to_char(o.desde,'DD/MM/YYYY'), '') || '.'
    when cat.tipo = 'indef' then 'Pedido indeferido pelo INSS em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'exig' then 'Exigência do INSS em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo in ('rec_sup','emb_op') and d2.n is not null then 'Recurso especial e embargos de declaração protocolados em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'susp_fim' then 'Suspensão do processo levantada em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'emb_conc' then 'Embargos de declaração conclusos para julgamento em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'emb_jud' then 'Embargos de declaração opostos em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'distrib' and k.quadro = 'crps' then 'Encaminhado à '
      || (substring(cat.cru from '(?i)para [^)]*?(\d+)ª ?(?:jr|caj)\)')::int) || 'ª '
      || case when cat.cru ~* 'caj\)' then 'Câmara de Julgamento' else 'Junta de Recursos' end || ' em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'distrib' then case when cat.grau = '2º grau' then 'Processo distribuído no tribunal em ' else 'Ação distribuída em ' end || to_char(cat.ev,'DD/MM/YYYY')
      || case when um.ev::date > cat.ev::date then '; último movimento em ' || to_char(um.ev,'DD/MM/YYYY') else '' end || '.'
    when cat.tipo = 'emb_op' then 'Embargos de declaração protocolados em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'inc_class' then 'Incidente classificado pelo conselheiro relator em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'transito' then 'Trânsito em julgado em ' || coalesce(substring(cat.tx from '(?i)em julgado em (\d\d/\d\d/\d{4})'), to_char(cat.ev,'DD/MM/YYYY')) || case when um.ev::date > cat.ev::date + 365 then '; último movimento em ' || to_char(um.ev,'DD/MM/YYYY') else '' end || '.'
    when cat.tipo = 'req' then 'Ofício requisitório deferido em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'rpv_com' then 'Comunicação da requisição de pequeno valor recebida pelo tribunal em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'impl_ord' then 'Ofício de implantação do benefício expedido ao INSS em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'penhora' then 'Penhora on-line com resultado positivo em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'levant' and split_part(cat.tx,' — ',1) ~* 'mandado|alvar' then 'Mandado de levantamento expedido em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'levant' then 'Levantamento de valores determinado em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'apel' then 'Apelação protocolada em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'rec_sup' then
      case when cat.t ~* 'extraordin' then 'Recurso extraordinário' when cat.t ~* 'agravo interno' then 'Agravo interno'
           when cat.t ~* 'agravo' then 'Agravo' else 'Recurso especial' end
      || ' protocolado' || case when cat.t ~* 'por: instituto nacional' then ' pelo INSS' else '' end
      || ' em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'rec_receb' then 'Recurso recebido no INSS em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'despauta' then 'Retirado de pauta em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'pauta' and cat.tx ~ 'em \d\d/\d\d/\d{4}' and cat.tx ~* 'pautado'
         then 'Pautado para julgamento em ' || substring(cat.tx from 'em (\d\d/\d\d/\d{4})') || '.'
    when cat.tipo = 'pauta' then 'Incluído em pauta de julgamento em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'parecer' then 'Parecer da Perícia Médica Federal concluído em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'acord_res' and r.r like 'embargos%' then initcap(left(r.r,1)) || substr(r.r,2) || ' em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'acord_res' then 'Acórdão' || coalesce(' da ' || r.org, '') || ' em ' || to_char(cat.ev,'DD/MM/YYYY') || ': ' || r.r || '.'
    when cat.tipo = 'acord_doc' then
      case when cat.tx ~* 'monocr' then 'Decisão monocrática em ' else 'Acórdão em ' end || to_char(cat.ev,'DD/MM/YYYY') || ': '
      || case cat.doc_r when 'prov_parc' then 'recurso provido em parte' when 'negado' then 'recurso negado' else 'recurso provido' end || '.'
    when cat.tipo = 'emb_doc' then 'Embargos de declaração ' || case cat.doc_r when 'emb_acol' then 'acolhidos' else 'rejeitados' end || ' em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'sent_doc' then
      case cat.doc_r when 'proc_parc' then 'Sentença de procedência parcial em ' when 'improc' then 'Sentença de improcedência em '
                     when 'proc' then 'Sentença de procedência em ' when 'concede' then 'Sentença concedeu a segurança em '
                     when 'denega' then 'Sentença denegou a segurança em ' else 'Sentença de extinção do processo em ' end
      || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'peric_des' and cat.tx ~* 'data e hora agendada: \d\d/\d\d/\d{4}' then case when cat.tx ~* 'avaliação social' then 'Avaliação social agendada para ' else 'Perícia agendada para ' end || substring(cat.tx from 'data e hora agendada: (\d\d/\d\d/\d{4})') || '.'
    when cat.tipo = 'peric_des' and cat.tx ~* '(agendad[oa] (no INSS )?para (o dia )?|no dia )\d\d[/.]\d\d[/.]\d{4}'
      then case when cat.tx ~* 'avalia[çc][ãa]o social' then 'Avaliação social agendada para ' else 'Perícia agendada para ' end
        || replace(substring(cat.tx from '(?:agendad[oa] (?:no INSS )?para (?:o dia )?|no dia )(\d\d[/.]\d\d[/.]\d{4})'), '.', '/') || '.'
    when cat.tipo = 'peric_des' and pd.dt is not null and pd.ev > cat.ev - interval '10 days'
      then case when pd.social then 'Avaliação social agendada para ' else 'Perícia agendada para ' end || pd.dt || '.'
    when cat.tipo = 'peric_des' then case when k.quadro = 'pje' then 'Perícia ' || case when cat.tx ~* 'reagend' then 'reagendada' else 'agendada' end || ' nos autos em ' || to_char(cat.ev,'DD/MM/YYYY') || '.' else 'Perícia designada (registro de ' || to_char(cat.ev,'DD/MM/YYYY') || ').' end
    when cat.tipo = 'contest' then 'Contestação juntada em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'peric_feita' then 'Perícia realizada em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'laudo' then 'Laudo juntado em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'perito' then 'Perito nomeado em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'sent_res' then
      case when cat.tx ~* 'procedente em parte|parcialmente' then 'Sentença de procedência parcial em '
           when cat.tx ~* 'improcedente' then 'Sentença de improcedência em '
           when cat.tx ~* 'procedente' then 'Sentença de procedência em '
           when cat.tx ~* 'homologad' then 'Acordo homologado em '
           when cat.tx ~* 'extinta a execução' then 'Sentença de extinção da execução em '
           when cat.tx ~* 'concedida a segurança' then 'Segurança concedida em '
           when cat.tx ~* 'denegada a segurança' then 'Segurança denegada em '
           else 'Processo extinto em ' end || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'tutela' then 'Tutela ' || case when cat.tx ~* '(não concedida|indeferid)' then 'indeferida' else 'deferida' end || ' em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'calc' then 'Cálculos homologados em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'rpv_inc' then 'Incidente de requisição de pequeno valor instaurado em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'rpv_paga' then 'Requisição de pequeno valor paga em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'rpv' and cat.tx ~* 'preparada' then 'Requisição de pequeno valor preparada em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'rpv' then 'Requisição de pequeno valor enviada ao Tribunal em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'precat' then 'Processo suspenso pela expedição de precatório em ' || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'intim' then 'Intimação em ' || to_char(cat.ev,'DD/MM/YYYY') || ', com prazo de ' || coalesce(substring(cat.tx from 'prazo (?:de |: ?)(\d+) dias'), substring(cat.tx from '(\d+) \([a-zçãé ]+\) dias')) || ' dias.'
    -- decisão sem resultado: literal; se o fato só está no nome do anexo, frase neutra (o 📎 nunca é a linha)
    when cat.tipo = 'sem_res' and cat.anexo then
      case when cat.tx ~* 'ac[óo]rd' then 'Acórdão comunicado nos autos em ' when cat.tx ~* 'senten' then 'Sentença juntada em '
           else 'Decisão juntada em ' end || to_char(cat.ev,'DD/MM/YYYY') || '.'
    when cat.tipo = 'sem_res' then '"' || left(regexp_replace(regexp_replace(cat.tx, '(Conselheir[oa]|Relator[a]?)( Relator[a]?)?\s*[-:]\s*(Conselheir[oa]:\s*)?[^|•(]+', '\1\2', 'gi'), '(advogad[oa](\(a\))?)\s+[A-ZÁ-Ú][^,.;]*', '\1 [nome]', 'g'), 140) || '" (' || to_char(cat.ev,'DD/MM/YYYY') || ').'
    when cu.n is not null then 'Cumprimento de sentença em andamento; último movimento em ' || to_char(cu.ev,'DD/MM/YYYY') || '.'
    when l.n is not null and l.rotina and k.quadro = 'pje' and pb.n is not null then 'Decisão publicada em ' || to_char(pb.dt,'DD/MM/YYYY') || '; último movimento em ' || to_char(l.ev,'DD/MM/YYYY') || '.'
    when l.n is not null and l.rotina and k.quadro = 'pje' then 'Sem decisão ou ato novo nos autos; último movimento em ' || to_char(l.ev,'DD/MM/YYYY') || '.'
    when l.n is not null then '"' || l.t || '" (' || to_char(l.ev,'DD/MM/YYYY') || ').'
  end linha,
  case when su.n is not null then 'suspensão (v6)' when s.n is not null then 'literal (b)' when cat.tipo = 'conc' then 'concessão (a)'
       when cat.tipo = 'sem_res' then 'literal (c)' when cat.tipo in ('acord_doc','sent_doc','emb_doc') then 'documento (4)'
       when cat.tipo is not null then 'catálogo' when cu.n is not null then 'cumprimento (d)'
       when l.n is not null then 'literal' else 'sem andamento' end via
from k
left join cat on cat.n = k.n
left join sup s on s.n = k.n
left join litm l on l.n = k.n
left join res_dec r on r.n = k.n
left join pdata pd on pd.n = k.n
left join outro o on o.n = k.n
left join cumpr cu on cu.n = k.n
left join dois d2 on d2.n = k.n
left join arqv av on av.n = k.n
left join susp_ab su on su.n = k.n and (cat.tipo is null or cat.ev <= su.ev or cat.tipo in ('intim','emb_jud','emb_conc','pauta','despauta','perito','susp'))
left join umov um on um.n = k.n
left join pubd pb on pb.n = k.n
)
  select coalesce(jsonb_object_agg(
           case quadro when 'pat' then 'inss' when 'crps' then 'crps' else 'judicial' end,
           jsonb_build_object(
             'texto', linha,
             'data', to_char(case
                when via = 'suspensão (v6)' then su_ev
                when via in ('literal', 'literal (b)') then l_ev
                when via = 'cumprimento (d)' then cu_ev
                else cat_ev end, 'YYYY-MM-DD'),
             'fonte', case ori when 'pat' then 'PAT' when 'crps' then 'e-Recursos' when 'esaj' then 'e-SAJ'
                               when 'eproc' then 'eproc' when 'pje' then 'PJe' end,
             'via', via)), '{}'::jsonb)
    into r
  from saida
  where linha is not null;
  return r;
end;
$fn$;

revoke all on function public.linha_curta(uuid) from public, anon;
grant execute on function public.linha_curta(uuid) to authenticated, service_role;
