-- F422 · confirmação dos atendimentos pelo WhatsApp (pedido do Paulo de 06.11.2026)
--
-- Todo dia às 9h (pg_cron) o banco pede à Edge Function zap_confirmacao que leia na agenda
-- os atendimentos de daqui a dois dias (o de segunda-feira na sexta; o de terça conforme
-- zap_conf_terca) e mande a mensagem de confirmação. A conversa fica com
-- zap_conversas.confirmacao em 'aguardando': enquanto isso o robô do menu, a IA do plantão e
-- a mensagem do Offline não respondem. A resposta do cliente é lida aqui:
--   SIM     → a Edge Function confirma o atendimento na agenda (Code.gs confirmar)
--   NÃO     → a recepção e o advogado recebem menção para remarcar
--   dúvida  → a recepção e o advogado recebem menção, uma vez; a conversa segue calada
-- Nasce desligado (zap_conf_ligado = 'nao') até o Paulo aprovar o texto.

alter table zap_conversas add column if not exists confirmacao jsonb;

insert into config_app (chave, valor) values
  ('zap_conf_ligado', 'nao'),
  ('zap_conf_terca', 'segunda'),          -- segunda | sexta | domingo
  ('zap_conf_url', 'https://bhdyatqaebpzufridwkh.supabase.co/functions/v1/zap_confirmacao'),
  ('zap_conf_texto', E'Olá, {nome}. Seu atendimento está marcado para {dia}, {data}, às {hora}, com {advogado}. Responda SIM para confirmar ou NÃO se precisar remarcar.{govbr}'),
  ('zap_conf_govbr', E'\n\nPedimos que compareça com a senha do gov.br.'),
  ('zap_conf_sim', 'Obrigado. Seu atendimento está confirmado.'),
  ('zap_conf_nao', 'Certo. Nossa equipe vai falar com você para remarcar.')
on conflict (chave) do nothing;

-- a quem avisar: a recepção e o advogado do atendimento
create or replace function public.zap_conf_avisar(p_conversa uuid, p_texto text)
returns void language sql security definer set search_path = public as $$
  insert into mencoes (para_id, conversa_id, texto)
  select k.id, p_conversa, p_texto from colaboradores k, zap_conversas z
   where z.id = p_conversa and k.ativo
     and (k.cargo in ('recepcao', 'estagiario') or lower(k.nome) = lower(z.confirmacao->>'profissional'));
$$;

-- a conversa espera a confirmação de um atendimento que ainda não passou
create or replace function public.zap_conf_espera(c zap_conversas)
returns boolean language sql stable as $$
  select c.confirmacao->>'estado' in ('aguardando', 'duvida')
     and (c.confirmacao->>'data')::date >= (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- classifica a resposta: sim | nao | duvida
create or replace function public.zap_conf_classe(p_txt text)
returns text language sql immutable as $$
  select case
    when t ~ '(remarc|desmarc|cancel|^n(ao)?\M|nao (vou|posso|poderei|consigo|da)|outro (dia|horario))' then 'nao'
    when t ~ '(^(s|sim|ok|okay|certo|combinado|confirm\w*|claro|pode ser|positivo)\M|confirmo|estarei|vou sim|sim[ ,.!]|👍)' then 'sim'
    else 'duvida' end
  from (select lower(translate(trim(coalesce(p_txt, '')), 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç', 'AAAAEEIOOOUCaaaaeeiooouc')) t) x;
$$;

-- chamada pelos gatilhos do robô, do plantão e do Offline: true = a mensagem é da confirmação
-- e ninguém mais responde. A primeira chamada trata; as seguintes da mesma mensagem só dizem true.
create or replace function public.zap_conf_resposta(p_msg uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare m zap_mensagens; c zap_conversas; v_classe text; v_pedido text;
begin
  select * into m from zap_mensagens where id = p_msg;
  if m.direcao <> 'entrada' then return false; end if;
  select * into c from zap_conversas where id = m.conversa_id;
  if c.confirmacao->>'msg' = p_msg::text then return true; end if;
  if not coalesce(zap_conf_espera(c), false) then return false; end if;
  v_classe := case when m.tipo = 'audio' and trim(coalesce(m.texto, '')) = '' then 'duvida' else zap_conf_classe(m.texto) end;
  v_pedido := gen_random_uuid()::text;
  update zap_conversas set confirmacao = confirmacao || jsonb_build_object(
      'msg', p_msg, 'respondida_em', now(), 'resposta', left(coalesce(m.texto, '[' || m.tipo || ']'), 200),
      'estado', v_classe, 'pedido', case when v_classe = 'sim' then v_pedido end,
      'avisada', coalesce((confirmacao->>'avisada')::boolean, false) or v_classe <> 'sim')
   where id = c.id;
  if v_classe = 'sim' then
    begin
      perform net.http_post(url := (select valor from config_app where chave = 'zap_conf_url'),
        body := jsonb_build_object('acao', 'confirmar', 'conversa_id', c.id, 'pedido', v_pedido),
        headers := '{"Content-Type":"application/json"}'::jsonb, timeout_milliseconds := 30000);
    exception when others then
      perform zap_conf_avisar(c.id, '📅 O cliente confirmou o atendimento de ' || (c.confirmacao->>'rotulo') || ', mas a agenda não foi atualizada: confirme à mão.');
    end;
  elsif v_classe = 'nao' then
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
    select c.id, 'saida', true, valor, 'fila' from config_app where chave = 'zap_conf_nao' and trim(valor) <> '';
    perform zap_conf_avisar(c.id, '📅 O cliente pediu para remarcar o atendimento de ' || (c.confirmacao->>'rotulo') || '.');
    perform zap_nota_sistema(c.id, null, '📅 Resposta à confirmação: remarcar. A equipe foi avisada.');
  elsif not coalesce((c.confirmacao->>'avisada')::boolean, false) then
    perform zap_conf_avisar(c.id, '📅 Resposta à confirmação do atendimento de ' || (c.confirmacao->>'rotulo') || ' precisa de alguém: ' || left(coalesce(m.texto, '[' || m.tipo || ']'), 120));
  end if;
  return true;
end $$;

-- a Edge Function apresenta o pedido de uso único gravado pela resposta "sim"
create or replace function public.zap_conf_pegar(p_conversa uuid, p_pedido text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  update zap_conversas set confirmacao = confirmacao - 'pedido'
   where id = p_conversa and confirmacao->>'pedido' = p_pedido and confirmacao->>'estado' = 'sim'
  returning confirmacao into v;
  return v;
end $$;

-- a Edge Function devolve o resultado da confirmação na agenda
create or replace function public.zap_conf_confirmado(p_conversa uuid, p_ok boolean, p_erro text)
returns void language plpgsql security definer set search_path = public as $$
declare c zap_conversas;
begin
  select * into c from zap_conversas where id = p_conversa;
  if p_ok then
    update zap_conversas set confirmacao = confirmacao || jsonb_build_object('estado', 'confirmado', 'confirmado_em', now()) where id = p_conversa;
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
    select p_conversa, 'saida', true, valor, 'fila' from config_app where chave = 'zap_conf_sim' and trim(valor) <> '';
    perform zap_nota_sistema(p_conversa, null, '📅 O cliente confirmou o atendimento de ' || (c.confirmacao->>'rotulo') || ', e a agenda foi atualizada.');
  else
    perform zap_conf_avisar(p_conversa, '📅 O cliente confirmou o atendimento de ' || (c.confirmacao->>'rotulo') || ', mas a agenda não foi atualizada (' || left(coalesce(p_erro, ''), 120) || '): confirme à mão.');
  end if;
end $$;

-- o disparo diário: grava o pedido de uso único e chama a Edge Function
create or replace function public.zap_conf_disparar()
returns void language plpgsql security definer set search_path = public as $$
declare v_pedido text := gen_random_uuid()::text;
begin
  if coalesce((select valor from config_app where chave = 'zap_conf_ligado'), 'nao') <> 'sim' then return; end if;
  insert into config_app (chave, valor) values ('zap_conf_pedido', v_pedido || '|' || extract(epoch from now())::bigint)
  on conflict (chave) do update set valor = excluded.valor;
  perform net.http_post(url := (select valor from config_app where chave = 'zap_conf_url'),
    body := jsonb_build_object('acao', 'enviar', 'pedido', v_pedido, 'terca', (select valor from config_app where chave = 'zap_conf_terca')),
    headers := '{"Content-Type":"application/json"}'::jsonb, timeout_milliseconds := 120000);
end $$;

create or replace function public.zap_conf_pegar_envio(p_pedido text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v text;
begin
  delete from config_app where chave = 'zap_conf_pedido' and split_part(valor, '|', 1) = p_pedido
     and split_part(valor, '|', 2)::bigint > extract(epoch from now())::bigint - 600
  returning valor into v;
  return v is not null;
end $$;

-- uma mensagem por atendimento: o mesmo evento não recebe duas
create or replace function public.zap_conf_enviar(p_telefone text, p_nome text, p_texto text, p_dados jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare v_conv uuid;
begin
  v_conv := zap_abrir(p_telefone, null);
  begin
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, aviso_chave, aviso_ref)
    values (v_conv, 'saida', true, p_texto, 'fila', 'confirmacao:' || (p_dados->>'evento'), v_conv);
  exception when unique_violation then return 'ja';
  end;
  update zap_conversas set confirmacao = p_dados || jsonb_build_object('estado', 'aguardando', 'enviada_em', now(), 'nome', p_nome)
   where id = v_conv;
  return 'enviada';
end $$;

-- a lista para a recepção: sem telefone na agenda, e sem resposta na véspera
create or replace function public.zap_conf_relatorio(p_sem_telefone jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0; v_amanha date := (now() at time zone 'America/Sao_Paulo')::date + 1;
begin
  for r in select z.id, z.confirmacao->>'rotulo' rotulo from zap_conversas z
            where z.confirmacao->>'estado' = 'aguardando' and (z.confirmacao->>'data')::date <= v_amanha
              and (z.confirmacao->>'enviada_em')::timestamptz < now() - interval '12 hours'
              and not coalesce((z.confirmacao->>'cobrada')::boolean, false) loop
    perform zap_conf_avisar(r.id, '📅 Sem resposta à confirmação do atendimento de ' || r.rotulo || ': ligar para o cliente.');
    update zap_conversas set confirmacao = confirmacao || '{"cobrada": true}' where id = r.id;
    n := n + 1;
  end loop;
  if jsonb_array_length(coalesce(p_sem_telefone, '[]')) > 0 then
    insert into mencoes (para_id, texto)
    select k.id, '📅 Atendimentos sem telefone na agenda, confirme por ligação: '
                 || (select string_agg(x, '; ') from jsonb_array_elements_text(p_sem_telefone) x)
      from colaboradores k where k.ativo and k.cargo in ('recepcao', 'estagiario');
  end if;
  return n;
end $$;

-- o robô, o plantão e o Offline não respondem a quem responde a confirmação
create or replace function public.zap_bot() returns trigger
language plpgsql security definer set search_path = public as $function$
declare
  c zap_conversas; p zap_bot_passos; ultimo timestamptz; pausa integer;
begin
  if new.direcao <> 'entrada' or zap_eh_historico(new) then return new; end if;
  if zap_conf_resposta(new.id) then return new; end if;    -- F422
  if coalesce((select valor from config_app where chave='zap_bot_ligado'),'sim') <> 'sim'
    then return new; end if;
  if coalesce((select valor from config_app where chave='zap_robo_modelo'),'crm') = 'smbot' then
    perform zap_smb_bot(new.id);
    return new;
  end if;
  select * into c from zap_conversas where id = new.conversa_id;
  if c.atendente_id is not null or not c.bot_ativo or c.automatica then return new; end if;
  pausa := coalesce((select valor from config_app where chave='zap_pausa_bot'), '15')::int;
  select max(criado_em) into ultimo from zap_mensagens
   where conversa_id = new.conversa_id and por_bot;
  if ultimo is not null and pausa > 0 and coalesce(c.bot_passo,'') not in ('agendar_nome','agendar_escolha','novo_relato')
     and ultimo > now() - make_interval(secs => pausa) then return new; end if;
  if c.bot_passo is null then
    if not zap_no_horario() then
      insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
      select new.conversa_id, 'saida', true, texto, 'fila'
        from zap_bot_passos where chave='fora_horario' and ativo;
    end if;
    select * into p from zap_bot_passos where chave='inicio' and ativo;
    if not found then return new; end if;
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
    values (new.conversa_id, 'saida', true, zap_menu_texto('inicio'), 'fila');
    update zap_conversas set bot_passo='inicio' where id=new.conversa_id;
    return new;
  end if;
  select * into p from zap_bot_passos where chave=c.bot_passo and ativo;
  if not found then return new; end if;
  if new.tipo = 'audio' and trim(coalesce(new.texto,'')) = '' and jsonb_array_length(p.opcoes) > 1
     and coalesce((select valor from config_app where chave='zap_robo_ia'),'nao') = 'sim' then
    update zap_mensagens set bot_ia = 'audio:' || c.bot_passo where id = new.id;
    return new;
  end if;
  perform zap_bot_ler(new.id);
  return new;
end $function$;

create or replace function public.zap_plantao_gatilho() returns trigger
language plpgsql security definer set search_path = public as $function$
declare c zap_conversas; v_bot boolean;
begin
  if new.direcao <> 'entrada'
     or coalesce((select valor from config_app where chave = 'zap_ia_plantao'), 'nao') <> 'sim' then return new; end if;
  if coalesce(new.quando_wa, now()) < now() - interval '10 minutes' then return new; end if;
  if zap_conf_resposta(new.id) then return new; end if;    -- F422
  select * into c from zap_conversas where id = new.conversa_id;
  if c.automatica or c.sem_ia then return new; end if;
  v_bot := coalesce((select valor from config_app where chave = 'zap_bot_ligado'), 'sim') = 'sim';
  if v_bot and c.bot_ativo and c.atendente_id is null then return new; end if;
  if c.bot_passo in ('agendar', 'agendar_nome', 'agendar_escolha') or coalesce(c.bot_dados ? 'pedido_em', false) then
    perform zap_bot_ler(new.id);
    return new;
  end if;
  if c.plantao->>'modo' in ('lead', 'conversa') or zap_plantao_interativa(c.id) then
    if new.tipo = 'audio' and trim(coalesce(new.texto, '')) = '' then
      update zap_mensagens set bot_ia = 'plantao:agora' where id = new.id;
    else
      perform zap_plantao_chamar(new.id);
    end if;
  else
    update zap_mensagens set bot_ia = 'plantao:espera' where id = new.id;
  end if;
  return new;
end $function$;

create or replace function public.zap_offline_gatilho() returns trigger
language plpgsql security definer set search_path = public as $function$
declare c record;
begin
  if new.direcao <> 'entrada' or zap_eh_historico(new) then return new; end if;
  if zap_conf_resposta(new.id) then return new; end if;    -- F422
  select z.id, z.offline_aviso_em, z.automatica, k.zap_offline_desde, k.zap_offline_msg, k.nome
    into c
    from zap_conversas z join colaboradores k on k.id = z.atendente_id
   where z.id = new.conversa_id and z.status <> 'resolvida';
  if c.id is null or c.zap_offline_desde is null or coalesce(c.automatica, false) then return new; end if;
  if c.offline_aviso_em is not null and c.offline_aviso_em >= c.zap_offline_desde then return new; end if;
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
  values (c.id, 'saida', true, coalesce(nullif(trim(c.zap_offline_msg), ''), zap_offline_padrao(c.nome)), 'fila');
  update zap_conversas set offline_aviso_em = now() where id = c.id;
  return new;
end $function$;

revoke all on function public.zap_conf_avisar(uuid, text), public.zap_conf_resposta(uuid), public.zap_conf_pegar(uuid, text),
  public.zap_conf_confirmado(uuid, boolean, text), public.zap_conf_disparar(), public.zap_conf_pegar_envio(text),
  public.zap_conf_enviar(text, text, text, jsonb), public.zap_conf_relatorio(jsonb) from public, anon, authenticated;
grant execute on function public.zap_conf_pegar(uuid, text), public.zap_conf_confirmado(uuid, boolean, text),
  public.zap_conf_pegar_envio(text), public.zap_conf_enviar(text, text, text, jsonb), public.zap_conf_relatorio(jsonb) to service_role;

-- 9h de Brasília, todos os dias (a Edge Function decide se hoje há envio)
select cron.schedule('zap-confirmacao', '0 12 * * *', 'select public.zap_conf_disparar()');
