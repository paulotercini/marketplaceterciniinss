-- F549 · aviso da perícia ao cliente pelo WhatsApp, com aprovação por perícia (decisões do Paulo de 12.11.2026)
-- Nada sai sem o Ligar da tela Perícias. O Ligar aprova a data registrada; a data mudada depois
-- derruba a aprovação. Envios só às 08:30 e às 16:00 dos dias úteis. A resposta do cliente vai à IA,
-- que oferece o atendimento 002 com o Dr. Paulo (ou a Dra. Amanda) antes da perícia.

create table if not exists public.pericia_avisos (
  evento_id      uuid primary key references public.eventos(id) on delete cascade,
  ligado         boolean not null default false,
  data_aprovada  timestamptz,
  ligado_por     uuid references public.colaboradores(id) on delete set null,
  ligado_em      timestamptz,
  profissional   text not null default 'paulo' check (profissional in ('paulo','amanda')),
  conversa_id    uuid references public.zap_conversas(id) on delete set null,
  primeiro_em    timestamptz,
  repetido_em    timestamptz,
  respondeu_em   timestamptz,
  recepcao_avisada_em timestamptz,
  atendimento_em timestamptz,
  estado         text,
  enviados       jsonb not null default '{}',
  compareceu_em  timestamptz
);

alter table public.pericia_avisos enable row level security;
drop policy if exists pericia_avisos_equipe on public.pericia_avisos;
create policy pericia_avisos_equipe on public.pericia_avisos for select to authenticated using ((select sou_ativo()));

alter table public.zap_conversas add column if not exists pericia jsonb;

insert into public.config_app (chave, valor) values
  ('pericia_aviso_d7', 'sim'),
  ('pericia_aviso_d1', 'sim'),
  ('pericia_aviso_outra', '0'),
  ('pericia_aviso_docs', 'documento com foto, CPF, carteira de trabalho, laudos, exames, receitas e relatórios médicos'),
  ('pericia_aviso_texto', '{saudacao}, {nome}. Aqui é do escritório do Dr. Paulo Tercini.

O INSS agendou a sua {tipo} para {dia}, {data}, às {hora}, em {local}.

Para a sua preparação, oferecemos um atendimento presencial com {advogado} antes da {tipo}. Podemos agendar?')
on conflict (chave) do nothing;

-- dia útil: sem sábado, domingo e feriado nacional
create or replace function public.pericia_util(d date) returns boolean language sql stable set search_path = public as $$
  select extract(isodow from d) < 6 and not coalesce(qualidade_feriado(d), false);
$$;

create or replace function public.pericia_util_antes(d date, n int) returns date language plpgsql stable set search_path = public as $$
declare x date := d; k int := 0;
begin
  while k < n loop
    x := x - 1;
    if pericia_util(x) then k := k + 1; end if;
  end loop;
  return x;
end $$;

create or replace function public.pericia_util_depois(d date) returns date language plpgsql stable set search_path = public as $$
declare x date := d + 1;
begin
  while not pericia_util(x) loop x := x + 1; end loop;
  return x;
end $$;

-- o telefonema: 16h do dia útil anterior à perícia, nunca numa quarta-feira
create or replace function public.pericia_dia_telefone(d date) returns date language plpgsql stable set search_path = public as $$
declare x date := pericia_util_antes(d, 1);
begin
  while extract(isodow from x) = 3 loop x := pericia_util_antes(x, 1); end loop;
  return x;
end $$;

create or replace function public.pericia_texto(p_ev uuid, p_modelo text, p_saudacao text) returns text
language plpgsql stable security definer set search_path = public as $$
declare e eventos; cl clientes; a pericia_avisos; t text; dl timestamp;
  dias text[] := array['segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado','domingo'];
begin
  select * into e from eventos where id = p_ev;
  select cl2.* into cl from casos k join clientes cl2 on cl2.id = k.cliente_id where k.id = e.caso_id;
  select * into a from pericia_avisos where evento_id = p_ev;
  dl := e.data_hora at time zone 'America/Sao_Paulo';
  t := p_modelo;
  t := replace(t, '{saudacao}', p_saudacao);
  t := replace(t, '{nome}', split_part(trim(coalesce(cl.nome, '')), ' ', 1));
  t := replace(t, '{tipo}', case when e.tipo = 'Avaliação social' then 'avaliação social' else 'perícia médica' end);
  t := replace(t, '{dia}', dias[extract(isodow from dl)::int]);
  t := replace(t, '{data}', to_char(dl, 'DD/MM/YYYY'));
  t := replace(t, '{hora}', to_char(dl, 'HH24:MI'));
  t := replace(t, '{local}', coalesce(nullif(trim(e.local), ''), 'local informado pelo INSS'));
  t := replace(t, '{advogado}', case when coalesce(a.profissional, 'paulo') = 'amanda' then 'a Dra. Amanda' else 'o Dr. Paulo' end);
  t := replace(t, '{documentos}', coalesce((select valor from config_app where chave = 'pericia_aviso_docs'), ''));
  return t;
end $$;

-- a conversa do cliente: a mais recente da ficha, senão a do telefone principal
create or replace function public.pericia_conversa(p_ev uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid; cl clientes;
begin
  select cl2.* into cl from eventos e join casos k on k.id = e.caso_id join clientes cl2 on cl2.id = k.cliente_id where e.id = p_ev;
  select id into v from zap_conversas where cliente_id = cl.id and not coalesce(automatica, false)
   order by ultima_em desc nulls last limit 1;
  if v is null and length(regexp_replace(coalesce(cl.telefone, ''), '\D', '', 'g')) >= 10 then
    begin v := zap_abrir(cl.telefone, null); exception when others then v := null; end;
  end if;
  return v;
end $$;

create or replace function public.pericia_enviar(p_conv uuid, p_chave text, p_texto text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, aviso_chave, aviso_ref)
  values (p_conv, 'saida', true, p_texto, 'fila', p_chave, p_conv);
  return true;
exception when unique_violation then return false;
end $$;

create or replace function public.pericia_mencionar_recepcao(p_conv uuid, p_cli uuid, p_texto text) returns void
language sql security definer set search_path = public as $$
  insert into mencoes (para_id, conversa_id, cliente_id, texto)
  select k.id, p_conv, p_cli, p_texto from colaboradores k where k.ativo and k.cargo in ('recepcao', 'estagiario');
$$;

-- Ligar e Desligar da tela Perícias. Religar com outra data recomeça os avisos.
create or replace function public.pericia_ligar(p_evento uuid, p_ligado boolean, p_profissional text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare e eventos; a pericia_avisos; eu uuid;
begin
  if not sou_ativo() then raise exception 'sem permissão'; end if;
  select id into eu from colaboradores where auth_id = auth.uid();
  select * into e from eventos where id = p_evento;
  if e.id is null then raise exception 'perícia não encontrada'; end if;
  insert into pericia_avisos (evento_id) values (p_evento) on conflict do nothing;
  select * into a from pericia_avisos where evento_id = p_evento;
  if p_profissional in ('paulo', 'amanda') then
    update pericia_avisos set profissional = p_profissional where evento_id = p_evento;
  end if;
  if p_ligado is null then null;
  elsif p_ligado then
    update pericia_avisos set ligado = true, ligado_por = eu, ligado_em = now(), data_aprovada = e.data_hora,
      estado = 'ligado',
      primeiro_em = case when a.data_aprovada is distinct from e.data_hora then null else primeiro_em end,
      repetido_em = case when a.data_aprovada is distinct from e.data_hora then null else repetido_em end,
      respondeu_em = case when a.data_aprovada is distinct from e.data_hora then null else respondeu_em end,
      recepcao_avisada_em = case when a.data_aprovada is distinct from e.data_hora then null else recepcao_avisada_em end
     where evento_id = p_evento;
  else
    update pericia_avisos set ligado = false, estado = 'desligado' where evento_id = p_evento;
    update zap_conversas set pericia = null where pericia->>'evento' = p_evento::text;
  end if;
  select * into a from pericia_avisos where evento_id = p_evento;
  return to_jsonb(a);
end $$;

-- A rodada das 08:30 ('manha') e das 16:00 ('tarde')
create or replace function public.pericia_avisos_vez(p_slot text) returns int
language plpgsql security definer set search_path = public as $$
declare r record; hoje date := (now() at time zone 'America/Sao_Paulo')::date; n int := 0;
  sauda text := case when p_slot = 'tarde' then 'Boa tarde' else 'Bom dia' end;
  conv uuid; base text; v_chave text; outra int; dp date; tipo text;
begin
  if not pericia_util(hoje) then return 0; end if;
  outra := coalesce(nullif((select valor from config_app where chave = 'pericia_aviso_outra'), '')::int, 0);
  for r in
    select a.*, e.data_hora, e.tipo ev_tipo, e.status, k.cliente_id, k.encerrado_em
      from pericia_avisos a join eventos e on e.id = a.evento_id join casos k on k.id = e.caso_id
     where a.ligado and e.tipo in ('Perícia', 'Avaliação social') and e.status = 'agendada'
       and e.data_hora > now()
  loop
    if r.data_aprovada is distinct from r.data_hora then
      update pericia_avisos set estado = 'data_mudou' where evento_id = r.evento_id and estado is distinct from 'data_mudou';
      continue;
    end if;
    dp := (r.data_hora at time zone 'America/Sao_Paulo')::date;
    base := 'pericia:' || r.evento_id || ':' || to_char(r.data_hora at time zone 'America/Sao_Paulo', 'YYYYMMDDHH24MI');
    tipo := case when r.ev_tipo = 'Avaliação social' then 'avaliação social' else 'perícia médica' end;
    conv := coalesce(r.conversa_id, pericia_conversa(r.evento_id));
    if conv is null then
      if r.estado is distinct from 'sem_telefone' then
        perform pericia_mencionar_recepcao(null, r.cliente_id, '🩺 Aviso da perícia ligado, mas o cliente não tem WhatsApp no cadastro: telefonar.');
        update pericia_avisos set estado = 'sem_telefone' where evento_id = r.evento_id;
      end if;
      continue;
    end if;

    -- 1º aviso, em qualquer das duas rodadas
    if r.primeiro_em is null then
      if pericia_enviar(conv, base || ':primeiro',
           pericia_texto(r.evento_id, coalesce((select valor from config_app where chave = 'pericia_aviso_texto'), ''), sauda)) then
        update pericia_avisos set primeiro_em = now(), conversa_id = conv, estado = 'aguardando' where evento_id = r.evento_id;
        update zap_conversas set pericia = jsonb_build_object('evento', r.evento_id, 'estado', 'aguardando',
            'profissional', r.profissional, 'data', dp, 'enviada_em', now()) where id = conv;
        n := n + 1;
      end if;
      continue;
    end if;

    if p_slot <> 'manha' then continue; end if;

    -- sem resposta: repete uma vez no dia útil seguinte; depois, a recepção telefona
    if r.respondeu_em is null and r.atendimento_em is null then
      if r.repetido_em is null and (r.primeiro_em at time zone 'America/Sao_Paulo')::date < hoje then
        if pericia_enviar(conv, base || ':repete',
             replace(pericia_texto(r.evento_id, coalesce((select valor from config_app where chave = 'pericia_aviso_texto'), ''), sauda),
                     'Aqui é do escritório do Dr. Paulo Tercini.', 'Aqui é do escritório do Dr. Paulo Tercini. Ainda não recebemos a sua resposta.')) then
          update pericia_avisos set repetido_em = now() where evento_id = r.evento_id;
          n := n + 1;
        end if;
      elsif r.repetido_em is not null and r.recepcao_avisada_em is null and (r.repetido_em at time zone 'America/Sao_Paulo')::date < hoje then
        perform pericia_mencionar_recepcao(conv, r.cliente_id,
          '🩺 Sem resposta ao aviso da ' || tipo || ' de ' || to_char(r.data_hora at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
          || ', nem depois da repetição: telefonar ao cliente e oferecer o atendimento antes da perícia.');
        update pericia_avisos set recepcao_avisada_em = now(), estado = 'sem_resposta' where evento_id = r.evento_id;
      end if;
    end if;

    -- lembretes em dias úteis antes da perícia, nunca no mesmo dia do 1º aviso
    if (r.primeiro_em at time zone 'America/Sao_Paulo')::date = hoje then continue; end if;
    if coalesce((select valor from config_app where chave = 'pericia_aviso_d7'), 'sim') = 'sim' and hoje = pericia_util_antes(dp, 7) then
      v_chave := base || ':d7';
    elsif coalesce((select valor from config_app where chave = 'pericia_aviso_d1'), 'sim') = 'sim' and hoje = pericia_util_antes(dp, 1) then
      v_chave := base || ':d1';
    elsif outra between 2 and 30 and outra <> 7 and hoje = pericia_util_antes(dp, outra) then
      v_chave := base || ':outra';
    else
      continue;
    end if;
    if pericia_enviar(conv, v_chave, pericia_texto(r.evento_id,
         '{saudacao}, {nome}. Lembramos que a sua {tipo} está agendada para {dia}, {data}, às {hora}, em {local}.'
         || case when v_chave like '%:d1' then E'\n\nLeve: {documentos}.\n\nChegue com 30 minutos de antecedência.' else '' end, sauda)) then
      update pericia_avisos set enviados = enviados || jsonb_build_object(split_part(v_chave, ':', 4), now()) where evento_id = r.evento_id;
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- 16:30 do dia útil da perícia: "Compareceu?" ao advogado do cliente
create or replace function public.pericia_compareceu_vez() returns int
language plpgsql security definer set search_path = public as $$
declare r record; hoje date := (now() at time zone 'America/Sao_Paulo')::date; n int := 0; adv uuid;
begin
  if not pericia_util(hoje) then return 0; end if;
  for r in
    select e.id, e.tipo, e.data_hora, k.id caso_id, cl.id cliente_id, cl.campos
      from eventos e join casos k on k.id = e.caso_id join clientes cl on cl.id = k.cliente_id
     where e.tipo in ('Perícia', 'Avaliação social') and e.status = 'agendada' and k.encerrado_em is null
       and (e.data_hora at time zone 'America/Sao_Paulo')::date = hoje
       and not exists (select 1 from pericia_avisos a where a.evento_id = e.id and a.compareceu_em is not null)
  loop
    adv := coalesce(nullif(r.campos->>'advogado_id', '')::uuid, (select id from colaboradores where lower(nome) = 'paulo' and ativo limit 1));
    insert into mencoes (para_id, caso_id, cliente_id, texto)
    values (adv, r.caso_id, r.cliente_id, '🩺 Compareceu? Registre no caso como foi a '
      || case when r.tipo = 'Avaliação social' then 'avaliação social' else 'perícia médica' end
      || ' de hoje, às ' || to_char(r.data_hora at time zone 'America/Sao_Paulo', 'HH24:MI')
      || ': quem atendeu, o que foi perguntado e os exames apresentados.');
    insert into pericia_avisos (evento_id, compareceu_em) values (r.id, now())
      on conflict (evento_id) do update set compareceu_em = now();
    n := n + 1;
  end loop;
  return n;
end $$;

-- a resposta do cliente ao aviso vai à IA (chamada no começo do zap_conf_resposta)
create or replace function public.pericia_resposta(p_msg uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare m zap_mensagens; c zap_conversas;
begin
  select * into m from zap_mensagens where id = p_msg;
  if m.direcao <> 'entrada' or zap_eh_historico(m) then return false; end if;
  select * into c from zap_conversas where id = m.conversa_id;
  if c.pericia is null or c.pericia->>'estado' not in ('aguardando', 'conversa') then return false; end if;
  if (c.pericia->>'data')::date < (now() at time zone 'America/Sao_Paulo')::date then
    update zap_conversas set pericia = null where id = c.id;
    return false;
  end if;
  if not zap_conf_ia_remarca() or coalesce(c.sem_ia, false) then return false; end if;
  update pericia_avisos set respondeu_em = coalesce(respondeu_em, now()), estado = 'conversa'
   where evento_id = (c.pericia->>'evento')::uuid;
  update zap_conversas set pericia = pericia || '{"estado": "conversa"}' where id = c.id;
  perform zap_conf_para_ia(c.id, p_msg);
  return true;
end $$;

-- o contexto da perícia para a IA
create or replace function public.pericia_contexto(p_conversa uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c zap_conversas; e eventos; dl timestamp; dp date;
begin
  select * into c from zap_conversas where id = p_conversa;
  if c.pericia is null or c.pericia->>'estado' not in ('aguardando', 'conversa') then return null; end if;
  select * into e from eventos where id = (c.pericia->>'evento')::uuid;
  if e.id is null then return null; end if;
  dl := e.data_hora at time zone 'America/Sao_Paulo';
  dp := dl::date;
  return jsonb_build_object(
    'tipo', case when e.tipo = 'Avaliação social' then 'avaliação social' else 'perícia médica' end,
    'data', to_char(dl, 'DD/MM/YYYY'), 'hora', to_char(dl, 'HH24:MI'), 'local', e.local,
    'profissional', coalesce(c.pericia->>'profissional', 'paulo'),
    'ate_hora', to_char(dl - interval '3 hours', 'HH24:MI'),
    'limite_presenca', to_char(dp - 8, 'DD/MM/YYYY'),
    'telefone_em', to_char(pericia_dia_telefone(dp), 'DD/MM/YYYY'));
end $$;

-- o atendimento agendado pela IA: tarefa do Dr. Paulo no dia útil anterior
create or replace function public.pericia_atendimento_marcado(p_conversa uuid, p_data text, p_inicio text) returns void
language plpgsql security definer set search_path = public as $$
declare c zap_conversas; e eventos; paulo uuid; and_id uuid; d date := nullif(p_data, '')::date;
begin
  select * into c from zap_conversas where id = p_conversa;
  if c.pericia is null or d is null then return; end if;
  select * into e from eventos where id = (c.pericia->>'evento')::uuid;
  if e.id is null then return; end if;
  select id into paulo from colaboradores where lower(nome) = 'paulo' and ativo limit 1;
  update pericia_avisos set atendimento_em = (d + coalesce(nullif(p_inicio, '')::time, '09:00'::time)) at time zone 'America/Sao_Paulo',
         estado = 'agendado' where evento_id = e.id;
  update zap_conversas set pericia = pericia || '{"estado": "agendado"}' where id = c.id;
  insert into andamentos (caso_id, autor_id, texto, origem, origem_id)
  values (e.caso_id, paulo, 'Atendimento sobre a ' || case when e.tipo = 'Avaliação social' then 'avaliação social' else 'perícia' end
      || ' de ' || to_char(e.data_hora at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || ' agendado para '
      || to_char(d, 'DD/MM/YYYY') || coalesce(' às ' || nullif(p_inicio, ''), '') || '. Preparar o estudo sobre a perícia.',
      'app', 'pericia:' || e.id || ':' || d)
  returning id into and_id;
  if paulo is not null then
    insert into andamento_tarefas (andamento_id, caso_id, colaborador_id, lembrar_em, natureza, papel)
    values (and_id, e.caso_id, paulo, pericia_util_antes(d, 1), 'compromisso', 'executa')
    on conflict do nothing;
  end if;
end $$;

-- a resposta ao aviso passa antes do robô, do plantão e do Offline
do $$
declare def text;
begin
  def := pg_get_functiondef('public.zap_conf_resposta(uuid)'::regprocedure);
  if position('pericia_resposta' in def) = 0 then
    def := replace(def, 'if zap_espera_resposta(p_msg) then return true; end if;',
      'if zap_espera_resposta(p_msg) then return true; end if;' || E'\n  if pericia_resposta(p_msg) then return true; end if;');
    execute def;
  end if;
end $$;

revoke all on function public.pericia_avisos_vez(text), public.pericia_compareceu_vez(), public.pericia_resposta(uuid),
  public.pericia_contexto(uuid), public.pericia_atendimento_marcado(uuid, text, text), public.pericia_enviar(uuid, text, text),
  public.pericia_conversa(uuid), public.pericia_texto(uuid, text, text), public.pericia_mencionar_recepcao(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.pericia_avisos_vez(text), public.pericia_compareceu_vez(), public.pericia_resposta(uuid),
  public.pericia_contexto(uuid), public.pericia_atendimento_marcado(uuid, text, text) to service_role;
revoke all on function public.pericia_ligar(uuid, boolean, text) from public, anon;
grant execute on function public.pericia_ligar(uuid, boolean, text) to authenticated, service_role;

do $$ begin
  perform cron.unschedule(j) from unnest(array['pericia-avisos-manha', 'pericia-avisos-tarde', 'pericia-compareceu']) j
   where exists (select 1 from cron.job where jobname = j);
  perform cron.schedule('pericia-avisos-manha', '30 11 * * 1-5', 'select public.pericia_avisos_vez(''manha'')');
  perform cron.schedule('pericia-avisos-tarde', '0 19 * * 1-5', 'select public.pericia_avisos_vez(''tarde'')');
  perform cron.schedule('pericia-compareceu', '30 19 * * 1-5', 'select public.pericia_compareceu_vez()');
end $$;
