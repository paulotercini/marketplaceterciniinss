-- F608 (15.11.2026, pedidos do Paulo): o atendimento antes da perícia é no dia útil anterior ou antes,
-- e só excepcionalmente no próprio dia; a mensagem indica um horário de manhã e outro à tarde, sem
-- perguntar qual fica melhor. A prévia da tela 🩺 Perícias sai pronta, com os horários reais da agenda,
-- e editável: o texto aprovado no Ligar fica em pericia_avisos.texto e é o que o banco envia.

alter table public.pericia_avisos add column if not exists texto text;

-- o dia proposto: o dia útil anterior à perícia; se já passou, o primeiro dia útil depois de hoje
-- antes da perícia; o próprio dia da perícia só quando não há outro
create or replace function public.pericia_dia_atendimento(p_ev uuid) returns date
language plpgsql stable security definer set search_path = public as $$
declare dl timestamp; dp date; d date; hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  select data_hora at time zone 'America/Sao_Paulo' into dl from eventos where id = p_ev;
  if dl is null then return null; end if;
  dp := dl::date;
  d := pericia_util_antes(dp, 1);
  if d <= hoje then
    d := hoje + 1;
    while not pericia_util(d) and d < dp loop d := d + 1; end loop;
    if d > dp then d := dp; end if;
  end if;
  return d;
end $$;

-- grava o texto aprovado na prévia (vazio volta ao modelo)
create or replace function public.pericia_texto_salvar(p_evento uuid, p_texto text) returns text
language plpgsql security definer set search_path = public as $$
declare v text := nullif(trim(coalesce(p_texto, '')), '');
begin
  if not sou_ativo() then raise exception 'sem permissão'; end if;
  insert into pericia_avisos (evento_id) values (p_evento) on conflict do nothing;
  update pericia_avisos set texto = v where evento_id = p_evento;
  return v;
end $$;
revoke all on function public.pericia_texto_salvar(uuid, text) from public, anon;
grant execute on function public.pericia_texto_salvar(uuid, text) to authenticated, service_role;

-- o texto aprovado com a saudação da rodada (08:30 Bom dia, 16:00 Boa tarde)
create or replace function public.pericia_texto_aprovado(p_texto text, p_ev uuid, p_saudacao text) returns text
language sql stable security definer set search_path = public as $$
  select case when nullif(trim(coalesce(p_texto, '')), '') is null
    then pericia_texto(p_ev, coalesce((select valor from config_app where chave = 'pericia_aviso_texto'), ''), p_saudacao)
    else regexp_replace(p_texto, '^\s*(Bom dia|Boa tarde|Boa noite)', p_saudacao) end
$$;
revoke all on function public.pericia_texto_aprovado(text, uuid, text) from public, anon;
grant execute on function public.pericia_texto_aprovado(text, uuid, text) to service_role;

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
           pericia_texto_aprovado(r.texto, r.evento_id, sauda)) then
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
             regexp_replace(pericia_texto_aprovado(r.texto, r.evento_id, sauda),
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

update public.config_app set valor = '{saudacao}, {nome}. A sua {tipo} está agendada para {dia}, {data}, às {hora}, em {local}.

Para a sua preparação, vamos agendar o seu atendimento presencial com {advogado} {quando_atendimento}, pela manhã ou à tarde, conforme a agenda.'
 where chave = 'pericia_aviso_texto';
