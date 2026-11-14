-- F599 (fase 2 do plano das cobranças do WhatsApp, decisões do Paulo de 14.11.2026): a "IA de amparo".
-- A conversa cuja última mensagem é do cliente e fica 1 hora sem resposta da equipe, no expediente,
-- recebe uma mensagem assinada "Assistente do escritório" que diz que a equipe está ciente e quando
-- responderá. Não dá orientação jurídica nem informa andamento: o pedido de andamento recebe apenas
-- "a equipe jurídica vai verificar o seu processo", com menção URGENTE ao advogado.
-- Uma mensagem por espera, no máximo 2 por conversa no dia e com 2 horas entre elas. Vale também na
-- conversa assumida. Fica fora a automática, a sem_ia, a de contato (F586), a que a IA conduz (F594),
-- a que espera confirmação de atendimento e a que já recebeu mensagem do robô ou da IA depois do cliente.
-- Nasce desligada (config_app.zap_ia_amparo = 'nao'); a espera em zap_amparo_min (60).

alter table public.zap_conversas add column if not exists amparo jsonb;

insert into config_app (chave, valor) values ('zap_ia_amparo', 'nao'), ('zap_amparo_min', '60')
  on conflict (chave) do nothing;

create or replace function public.zap_amparo_vez(p_agora timestamptz default now())
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_min int := coalesce(nullif((select valor from config_app where chave = 'zap_amparo_min'), '')::int, 60);
  v_local timestamp := p_agora at time zone 'America/Sao_Paulo';
  v_dia text := to_char(v_local, 'YYYY-MM-DD');
  v_quando text := case when extract(hour from v_local) < 15 then 'ainda hoje' else 'até o próximo dia útil' end;
  v_rec boolean;
  v_claude uuid := (select id from colaboradores where papel = 'assistente_ia' and ativo order by nome limit 1);
  c record;
  n int := 0;
  v_ultima text;
  v_and boolean;
  v_txt text;
  v_aviso text;
  v_adv uuid;
begin
  if coalesce((select valor from config_app where chave = 'zap_ia_amparo'), 'nao') <> 'sim'
     or not push_no_expediente(p_agora) then
    return 0;
  end if;
  v_rec := exists (select 1 from colaboradores where ativo and cargo = 'recepcao');
  for c in
    select z.* from zap_conversas z
     where z.status = 'aberta'
       and not coalesce(z.automatica, false)
       and not coalesce(z.sem_ia, false)
       and z.ultima_entrada_em is not null
       and z.ultima_entrada_em > coalesce(z.ultima_resposta_em, '-infinity')
       and z.ultima_entrada_em <= p_agora - make_interval(mins => v_min)
       and not (coalesce(z.plantao->>'modo', '') in ('conversa', 'lead') and z.plantao->>'agendado_em' is null
                and z.atendente_id is null)
       and coalesce(z.confirmacao->>'estado', '') not in ('aguardando', 'remarcando')
       and not exists (select 1 from clientes cl where cl.id = z.cliente_id and cl.campos ? 'contato')
       and (z.amparo is null or (z.amparo->>'em')::timestamptz < z.ultima_entrada_em)
       and (z.amparo is null or z.amparo->>'dia' <> v_dia
            or (coalesce((z.amparo->>'n')::int, 0) < 2
                and (z.amparo->>'em')::timestamptz <= p_agora - interval '2 hours'))
       and not exists (select 1 from zap_mensagens m
                        where m.conversa_id = z.id and m.direcao = 'saida' and m.por_bot
                          and m.criado_em > z.ultima_entrada_em)
  loop
    select m.texto into v_ultima from zap_mensagens m
     where m.conversa_id = c.id and m.direcao = 'entrada'
     order by m.criado_em desc limit 1;
    v_and := c.cliente_id is not null and zap_pede_andamento(coalesce(v_ultima, ''));
    v_txt := case when v_and
      then 'Recebemos a sua mensagem. A equipe jurídica vai verificar o seu processo e responderá ' || v_quando || '.'
      else 'Recebemos a sua mensagem e a equipe já está ciente. A resposta será enviada ' || v_quando || '.' end;
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, criado_em)
    values (c.id, 'saida', true, '*Assistente do escritório:*' || E'\n\n' || v_txt, 'fila', p_agora);
    v_aviso := case when v_and then '⚠ URGENTE: ' else '' end
      || 'Cliente sem resposta há mais de ' || v_min || ' minutos. A assistente do escritório informou que a resposta virá '
      || v_quando || case when v_and then ' (pedido de andamento).' else '.' end || ' Responda a conversa.';
    perform zap_nota_sistema(c.id, v_claude, 'Assistente do escritório: ' || v_txt);
    v_adv := zap_advogado_da_conversa(c.id);
    insert into mencoes (para_id, conversa_id, cliente_id, texto)
    select k.id, c.id, c.cliente_id, v_aviso
      from colaboradores k
     where k.ativo
       and (k.id = c.atendente_id or k.id = v_adv
            or (v_rec and k.cargo = 'recepcao')
            or (not v_rec and k.cargo = 'estagiario'));
    update zap_conversas set amparo = jsonb_build_object(
        'em', p_agora, 'dia', v_dia,
        'n', case when amparo->>'dia' = v_dia then coalesce((amparo->>'n')::int, 0) + 1 else 1 end)
     where id = c.id;
    n := n + 1;
  end loop;
  return n;
end $$;

revoke execute on function public.zap_amparo_vez(timestamptz) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'zap-amparo';
    perform cron.schedule('zap-amparo', '*/5 * * * *', 'select public.zap_amparo_vez()');
  end if;
end $$;
