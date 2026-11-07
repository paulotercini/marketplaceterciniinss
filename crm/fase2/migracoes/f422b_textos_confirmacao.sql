-- F422b · textos da confirmação revistos pelo Paulo (07.11.2026)
-- SIM e NÃO em negrito; o lembrete do gov.br sai da confirmação e vai à resposta do SIM;
-- as respostas ao SIM e ao NÃO passam a levar nome, dia, data e hora (zap_conf_preencher).

update config_app set valor = E'Olá, {nome}.\n\nLembramos que o seu atendimento está agendado para {dia}, {data}, às {hora}, com {advogado}.\n\nPara confirmar, responda *SIM*. Se precisar remarcar, responda *NÃO*.' where chave = 'zap_conf_texto';
update config_app set valor = E'\n\nTraga a senha do gov.br (Meu INSS), porque precisamos consultar os seus dados previdenciários durante o atendimento.' where chave = 'zap_conf_govbr';
update config_app set valor = 'Obrigado, {nome}. Seu atendimento de {dia}, {data}, às {hora}, está confirmado.{govbr}' where chave = 'zap_conf_sim';
update config_app set valor = 'Tudo bem, {nome}. Nossa equipe vai entrar em contato para agendar um novo horário.' where chave = 'zap_conf_nao';

-- preenche {nome} (primeiro nome), {dia}, {data}, {hora} e {govbr} (só Paulo e Amanda) pela confirmação da conversa
create or replace function public.zap_conf_preencher(p_txt text, c jsonb)
returns text language sql stable set search_path = public as $$
  select replace(replace(replace(replace(replace(p_txt,
    '{nome}', initcap(split_part(trim(coalesce(c->>'nome', '')), ' ', 1))),
    '{dia}', (array['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'])[extract(dow from (c->>'data')::date)::int + 1]),
    '{data}', to_char((c->>'data')::date, 'DD/MM/YYYY')),
    '{hora}', (split_part(c->>'hora', ':', 1))::int || 'h' || split_part(c->>'hora', ':', 2)),
    '{govbr}', case when lower(c->>'profissional') in ('paulo', 'amanda')
                    then coalesce((select valor from config_app where chave = 'zap_conf_govbr'), '') else '' end);
$$;

create or replace function public.zap_conf_confirmado(p_conversa uuid, p_ok boolean, p_erro text)
returns void language plpgsql security definer set search_path = public as $$
declare c zap_conversas;
begin
  select * into c from zap_conversas where id = p_conversa;
  if p_ok then
    update zap_conversas set confirmacao = confirmacao || jsonb_build_object('estado', 'confirmado', 'confirmado_em', now()) where id = p_conversa;
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
    select p_conversa, 'saida', true, zap_conf_preencher(valor, c.confirmacao), 'fila' from config_app where chave = 'zap_conf_sim' and trim(valor) <> '';
    perform zap_nota_sistema(p_conversa, null, '📅 O cliente confirmou o atendimento de ' || (c.confirmacao->>'rotulo') || ', e a agenda foi atualizada.');
  else
    perform zap_conf_avisar(p_conversa, '📅 O cliente confirmou o atendimento de ' || (c.confirmacao->>'rotulo') || ', mas a agenda não foi atualizada (' || left(coalesce(p_erro, ''), 120) || '): confirme à mão.');
  end if;
end $$;

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
    select c.id, 'saida', true, zap_conf_preencher(valor, c.confirmacao), 'fila' from config_app where chave = 'zap_conf_nao' and trim(valor) <> '';
    perform zap_conf_avisar(c.id, '📅 O cliente pediu para remarcar o atendimento de ' || (c.confirmacao->>'rotulo') || '.');
    perform zap_nota_sistema(c.id, null, '📅 Resposta à confirmação: remarcar. A equipe foi avisada.');
  elsif not coalesce((c.confirmacao->>'avisada')::boolean, false) then
    perform zap_conf_avisar(c.id, '📅 Resposta à confirmação do atendimento de ' || (c.confirmacao->>'rotulo') || ' precisa de alguém: ' || left(coalesce(m.texto, '[' || m.tipo || ']'), 120));
  end if;
  return true;
end $$;

revoke all on function public.zap_conf_preencher(text, jsonb), public.zap_conf_confirmado(uuid, boolean, text), public.zap_conf_resposta(uuid) from public, anon, authenticated;
grant execute on function public.zap_conf_confirmado(uuid, boolean, text) to service_role;
