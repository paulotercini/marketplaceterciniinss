-- F527 · lista de espera, onda 2 (aprovada pelo Paulo em 11.11.2026)
-- A IA inclui na lista quem pede data mais cedo e oferece, pelo WhatsApp, a vaga liberada
-- pelo cancelar ou pelo remarcar (do CRM ou da própria IA), uma pessoa por vez, no expediente.
-- Aceitar troca o atendimento antigo pelo novo, e a vaga antiga segue para o próximo da lista.
-- Tudo depende da chave config_app.zap_ia_espera ('sim'), que nasce desligada.

insert into public.config_app (chave, valor) values ('zap_ia_espera', 'nao') on conflict (chave) do nothing;

create table if not exists public.agenda_liberadas (
  id           uuid primary key default gen_random_uuid(),
  evento_id    text not null,
  profissional text not null,
  data         date not null,
  estado       text not null default 'nova' check (estado in ('nova','oferecida','fechada','tomada')),
  tentados     uuid[] not null default '{}',
  pedido_em    timestamptz,
  criado_em    timestamptz not null default now()
);
create unique index if not exists agenda_liberadas_viva on public.agenda_liberadas (evento_id) where estado in ('nova','oferecida');
alter table public.agenda_liberadas enable row level security;
drop policy if exists agenda_liberadas_ler on public.agenda_liberadas;
create policy agenda_liberadas_ler on public.agenda_liberadas for select to authenticated using ((select sou_ativo()));
revoke all on public.agenda_liberadas from anon;

create or replace function public.agenda_espera_ligada() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select valor from config_app where chave = 'zap_ia_espera'), 'nao') = 'sim' and coalesce(zap_agenda_ligada(), false)
$$;

-- o CRM (cancelar, remarcar) e a IA registram a vaga que voltou a ser livre
create or replace function public.agenda_liberada_registrar(p_evento text, p_prof text, p_data date) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and not coalesce(sou_ativo(), false) then return false; end if;
  if not agenda_espera_ligada() or p_evento is null or p_prof not in ('paulo','marcos','amanda')
     or p_data < (now() at time zone 'America/Sao_Paulo')::date then return false; end if;
  insert into agenda_liberadas (evento_id, profissional, data) values (p_evento, p_prof, p_data) on conflict do nothing;
  return true;
end $$;

-- a cada minuto: vence a oferta sem resposta, fecha a vaga que passou e pede a oferta das novas
create or replace function public.agenda_espera_vez() returns void
language plpgsql security definer set search_path = public as $$
declare l record;
begin
  for l in select id, ofertas->-1 as o from agenda_espera
            where estado = 'oferta' and ofertas->-1->>'origem' = 'ia' and (ofertas->-1->>'ate')::timestamptz < now()
            for update skip locked loop
    update agenda_espera set estado = 'aguardando', atualizado_em = now(),
           ofertas = jsonb_set(ofertas, array[(jsonb_array_length(ofertas) - 1)::text],
                       (l.o - 'lendo_em') || jsonb_build_object('resposta', 'sem resposta', 'respondida_em', now()))
     where id = l.id;
    update agenda_liberadas set estado = 'nova', pedido_em = null where id = (l.o->>'liberada')::uuid and estado = 'oferecida';
  end loop;
  update agenda_liberadas set estado = 'fechada'
   where estado in ('nova','oferecida') and data < (now() at time zone 'America/Sao_Paulo')::date;
  if not agenda_espera_ligada() or not push_no_expediente(now()) then return; end if;
  for l in select id from agenda_liberadas
            where estado = 'nova' and (pedido_em is null or pedido_em < now() - interval '3 minutes')
            order by criado_em limit 3 for update skip locked loop
    update agenda_liberadas set pedido_em = now() where id = l.id;
    begin
      perform net.http_post(url := (select valor from config_app where chave = 'zap_plantao_url'),
        body := jsonb_build_object('espera', l.id), headers := zap_fn_cabecalho(), timeout_milliseconds := 60000);
    exception when others then null;
    end;
  end loop;
end $$;

create or replace function public.agenda_espera_pegar(p_liberada uuid) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object('liberada', to_jsonb(l), 'candidatos', coalesce((
           select jsonb_agg(to_jsonb(e) - 'ofertas' order by e.criado_em) from agenda_espera e
            where e.estado = 'aguardando' and coalesce(e.telefone, '') <> '' and not (e.id = any (l.tentados))), '[]'::jsonb))
    from agenda_liberadas l where l.id = p_liberada and l.estado = 'nova'
$$;

create or replace function public.agenda_liberada_fechar(p_liberada uuid, p_estado text) returns void
language sql security definer set search_path = public as $$
  update agenda_liberadas set estado = p_estado where id = p_liberada and p_estado in ('nova','fechada','tomada')
$$;

-- a mensagem da oferta sai pelo WhatsApp do escritório; a oferta guarda a conversa e a vaga
create or replace function public.agenda_espera_oferecer(p_liberada uuid, p_espera uuid, p_oferta jsonb, p_texto text) returns boolean
language plpgsql security definer set search_path = public as $$
declare e agenda_espera; v_fone text; v_conv uuid;
begin
  select * into e from agenda_espera where id = p_espera for update;
  if e.id is null or e.estado <> 'aguardando' then return false; end if;
  perform 1 from agenda_liberadas where id = p_liberada and estado = 'nova' for update;
  if not found then return false; end if;
  v_fone := regexp_replace(coalesce(e.telefone, ''), '\D', '', 'g');
  if length(v_fone) in (8, 9) then v_fone := '16' || v_fone; end if;
  if length(v_fone) in (10, 11) then v_fone := '55' || v_fone; end if;
  v_conv := zap_abrir(v_fone, e.nome);
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, bot_ia)
  values (v_conv, 'saida', true, p_texto, 'fila', 'espera:oferta');
  update agenda_espera set estado = 'oferta', atualizado_em = now(),
         ofertas = ofertas || jsonb_build_array(p_oferta || jsonb_build_object('origem', 'ia', 'conversa', v_conv, 'liberada', p_liberada, 'em', now()))
   where id = e.id;
  update agenda_liberadas set estado = 'oferecida', tentados = tentados || p_espera where id = p_liberada;
  perform zap_nota_sistema(v_conv, null, '📅 Lista de espera: a assistente virtual ofereceu a vaga de ' || coalesce(p_oferta->>'rotulo', '') ||
    ', com resposta até ' || to_char((p_oferta->>'ate')::timestamptz at time zone 'America/Sao_Paulo', 'HH24"h"MI') || '.');
  return true;
end $$;

-- chamada por zap_conf_resposta: a resposta à oferta da IA vai à IA, e não ao robô, ao plantão ou ao Offline
create or replace function public.zap_espera_resposta(p_msg uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare m zap_mensagens; v_id uuid;
begin
  select * into m from zap_mensagens where id = p_msg;
  if m.id is null or m.direcao <> 'entrada' then return false; end if;
  if m.bot_ia like 'espera:%' then return true; end if;
  if m.bot_ia is not null then return false; end if;
  select id into v_id from agenda_espera
   where estado = 'oferta' and ofertas->-1->>'origem' = 'ia' and ofertas->-1->>'conversa' = m.conversa_id::text
     and (ofertas->-1->>'ate')::timestamptz > now() - interval '5 minutes'
   limit 1;
  if v_id is null then return false; end if;
  update zap_mensagens set bot_ia = 'espera:lendo' where id = p_msg;
  begin
    perform net.http_post(url := (select valor from config_app where chave = 'zap_plantao_url'),
      body := jsonb_build_object('espera_resposta', p_msg), headers := zap_fn_cabecalho(), timeout_milliseconds := 60000);
  exception when others then
    perform zap_conf_avisar(m.conversa_id, '📅 A resposta à vaga oferecida pela lista de espera precisa de alguém: ' || left(coalesce(m.texto, '[' || m.tipo || ']'), 120));
  end;
  return true;
end $$;

create or replace function public.agenda_espera_resposta_pegar(p_msg uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m zap_mensagens; e agenda_espera; o jsonb;
begin
  select * into m from zap_mensagens where id = p_msg;
  select * into e from agenda_espera
   where estado = 'oferta' and ofertas->-1->>'origem' = 'ia' and ofertas->-1->>'conversa' = m.conversa_id::text
   for update limit 1;
  if e.id is null then return null; end if;
  o := e.ofertas->-1;
  if (o->>'lendo_em')::timestamptz > now() - interval '2 minutes' then return null; end if;
  update agenda_espera set ofertas = jsonb_set(ofertas, array[(jsonb_array_length(ofertas) - 1)::text, 'lendo_em'], to_jsonb(now()))
   where id = e.id;
  return jsonb_build_object('espera', to_jsonb(e) - 'ofertas', 'oferta', o, 'conversa', m.conversa_id,
    'mensagens', coalesce((select jsonb_agg(jsonb_build_object('tipo', x.tipo, 'texto', x.texto) order by x.seq)
                             from zap_mensagens x
                            where x.conversa_id = m.conversa_id and x.direcao = 'entrada' and x.criado_em >= (o->>'em')::timestamptz), '[]'::jsonb));
end $$;

-- aceitou: agendado e vaga tomada; recusou: volta à lista e a vaga ao próximo;
-- perdeu: a vaga foi tomada antes; outro: a equipe é avisada e a oferta continua até vencer
create or replace function public.agenda_espera_responder(p_espera uuid, p_resultado text, p_texto text) returns void
language plpgsql security definer set search_path = public as $$
declare e agenda_espera; o jsonb; n int; v_conv uuid;
begin
  select * into e from agenda_espera where id = p_espera for update;
  if e.id is null or e.estado <> 'oferta' then return; end if;
  n := jsonb_array_length(e.ofertas) - 1; o := e.ofertas->n; v_conv := (o->>'conversa')::uuid;
  if p_resultado = 'outro' then
    update agenda_espera set ofertas = jsonb_set(ofertas, array[n::text], o - 'lendo_em') where id = e.id;
    perform zap_conf_avisar(v_conv, '📅 A resposta à vaga oferecida pela lista de espera (' || coalesce(o->>'rotulo', '') || ') precisa de alguém.');
  elsif p_resultado in ('aceitou', 'recusou', 'perdeu') then
    update agenda_espera set estado = case when p_resultado = 'aceitou' then 'agendado' else 'aguardando' end, atualizado_em = now(),
           ofertas = jsonb_set(ofertas, array[n::text], (o - 'lendo_em') || jsonb_build_object('resposta', p_resultado, 'respondida_em', now()))
     where id = e.id;
    update agenda_liberadas set estado = case when p_resultado = 'recusou' then 'nova' else 'tomada' end, pedido_em = null
     where id = (o->>'liberada')::uuid;
    perform zap_nota_sistema(v_conv, null, '📅 Lista de espera: ' || case p_resultado
      when 'aceitou' then 'a pessoa aceitou a vaga de ' when 'recusou' then 'a pessoa recusou a vaga de '
      else 'a vaga foi tomada antes da resposta: ' end || coalesce(o->>'rotulo', '') || '.');
  else return;
  end if;
  if trim(coalesce(p_texto, '')) <> '' and v_conv is not null then
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, bot_ia)
    values (v_conv, 'saida', true, p_texto, 'fila', 'espera:resposta');
  end if;
end $$;

-- a IA (ferramenta entrar_na_espera do Agendador) inclui quem pede data mais cedo
create or replace function public.agenda_espera_incluir_ia(p_conversa uuid, p_nome text, p_tipo text, p_cliente uuid,
  p_profs text[], p_periodos text[], p_ate date, p_marcado date, p_obs text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c zap_conversas; v_id uuid; v_profs text[]; v_per text[];
begin
  if not agenda_espera_ligada() then return jsonb_build_object('erro', 'a lista de espera está desligada'); end if;
  select * into c from zap_conversas where id = p_conversa;
  if c.id is null or trim(coalesce(p_nome, '')) = '' then return jsonb_build_object('erro', 'falta o nome de quem será atendido'); end if;
  select id into v_id from agenda_espera
   where estado in ('aguardando', 'oferta') and fone_chave(telefone) = fone_chave(c.telefone) and lower(trim(nome)) = lower(trim(p_nome)) limit 1;
  if v_id is not null then return jsonb_build_object('ja_estava', true); end if;
  v_profs := array(select x from unnest(coalesce(p_profs, '{}')) x where x in ('paulo', 'marcos', 'amanda'));
  v_per := array(select x from unnest(coalesce(p_periodos, '{}')) x where x in ('manha', 'tarde'));
  insert into agenda_espera (cliente_id, nome, telefone, tipo, profs, periodos, ate, marcado, obs)
  values (p_cliente, trim(p_nome), c.telefone, case when p_tipo = '002' then '002' else '001' end,
          case when cardinality(v_profs) > 0 then v_profs else '{amanda,paulo}' end,
          case when cardinality(v_per) > 0 then v_per else '{manha,tarde}' end,
          p_ate, p_marcado, left('Incluído pela assistente virtual do WhatsApp. ' || coalesce(p_obs, ''), 500));
  perform zap_nota_sistema(p_conversa, null, '📅 A assistente virtual incluiu ' || trim(p_nome) || ' na lista de espera da agenda.');
  return jsonb_build_object('incluido', true);
end $$;

-- a resposta à oferta passa antes de tudo em zap_conf_resposta, chamada no início do robô, do plantão e do Offline
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.zap_conf_resposta(uuid)'::regprocedure);
  if position('zap_espera_resposta' in d) > 0 then return; end if;
  n := replace(d, E'if m.direcao <> \'entrada\' then return false; end if;',
                  E'if m.direcao <> \'entrada\' then return false; end if;\n  if zap_espera_resposta(p_msg) then return true; end if;');
  if n = d then raise exception 'F527: o ponto de inserção não foi achado em zap_conf_resposta'; end if;
  execute n;
end $$;

revoke execute on function public.agenda_espera_ligada(), public.agenda_liberada_registrar(text, text, date),
  public.agenda_espera_vez(), public.agenda_espera_pegar(uuid), public.agenda_liberada_fechar(uuid, text),
  public.agenda_espera_oferecer(uuid, uuid, jsonb, text), public.zap_espera_resposta(uuid),
  public.agenda_espera_resposta_pegar(uuid), public.agenda_espera_responder(uuid, text, text),
  public.agenda_espera_incluir_ia(uuid, text, text, uuid, text[], text[], date, date, text)
  from public, anon, authenticated;
grant execute on function public.agenda_liberada_registrar(text, text, date) to authenticated;

do $$ begin
  perform cron.schedule('agenda-espera', '* * * * *', 'select public.agenda_espera_vez()');
exception when others then raise notice 'F527: pg_cron indisponível: %', sqlerrm;
end $$;
