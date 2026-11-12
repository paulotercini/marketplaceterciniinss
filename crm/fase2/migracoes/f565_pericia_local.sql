-- F565 (12.11.2026, pedido do Paulo): a mensagem da perícia exige o endereço (rua, número e cidade).
-- pericia_local grava o endereço da perícia em eventos.local; pericia_ligar recusa ligar sem endereço;
-- pericia_avisos_vez não envia perícia sem endereço.

create or replace function public.pericia_local(p_evento uuid, p_local text)
returns text language plpgsql security definer set search_path = public as $$
declare v text := nullif(trim(coalesce(p_local, '')), '');
begin
  if not sou_ativo() then raise exception 'sem permissão'; end if;
  update eventos set local = v where id = p_evento and tipo in ('Perícia', 'Avaliação social');
  if not found then raise exception 'perícia não encontrada'; end if;
  return v;
end $$;
revoke all on function public.pericia_local(uuid, text) from public, anon;
grant execute on function public.pericia_local(uuid, text) to authenticated, service_role;

create or replace function public.pericia_ligar(p_evento uuid, p_ligado boolean, p_profissional text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare e eventos; a pericia_avisos; eu uuid;
begin
  if not sou_ativo() then raise exception 'sem permissão'; end if;
  select id into eu from colaboradores where auth_id = auth.uid();
  select * into e from eventos where id = p_evento;
  if e.id is null then raise exception 'perícia não encontrada'; end if;
  if p_ligado and nullif(trim(coalesce(e.local, '')), '') is null then
    raise exception 'informe o endereço da perícia (rua, número e cidade) antes de ligar';
  end if;
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
       and e.data_hora > now() and nullif(trim(coalesce(e.local, '')), '') is not null
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
    if r.primeiro_em is null and not r.so_lembretes then
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
    if r.respondeu_em is null and r.atendimento_em is null and not r.so_lembretes then
      if r.repetido_em is null and (r.primeiro_em at time zone 'America/Sao_Paulo')::date < hoje then
        if pericia_enviar(conv, base || ':repete',
             regexp_replace(pericia_texto(r.evento_id, coalesce((select valor from config_app where chave = 'pericia_aviso_texto'), ''), sauda),
                     '^([^.]*\.)\s+', '\1 Ainda não recebemos a sua resposta. ')) then
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
    if r.primeiro_em is not null and (r.primeiro_em at time zone 'America/Sao_Paulo')::date = hoje then continue; end if;
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
