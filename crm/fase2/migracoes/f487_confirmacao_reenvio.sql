-- F487 · confirmação sem resposta: segundo envio e aviso à equipe às 13h30 da véspera (pedido do Paulo, 09.11.2026)
--
-- zap_conf_relatorio, chamado pela zap_confirmacao no fim da rodada das 9h, deixa de avisar a equipe
-- e passa a reenviar a confirmação a quem não respondeu: atendimento amanhã, enviada há mais de 12 horas,
-- uma vez só (aviso_chave 'confirmacao2:<evento>'). O aviso à equipe sai às 13h30 de Brasília, pelo
-- pg_cron 'zap-confirmacao-cobrar' (16h30 UTC), com zap_conf_cobrar.

create or replace function public.zap_conf_relatorio(p_sem_telefone jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0; v_amanha date := (now() at time zone 'America/Sao_Paulo')::date + 1; v_txt text;
begin
  for r in select z.id, z.confirmacao->>'evento' evento from zap_conversas z
            where z.confirmacao->>'estado' = 'aguardando' and (z.confirmacao->>'data')::date = v_amanha
              and (z.confirmacao->>'enviada_em')::timestamptz < now() - interval '12 hours'
              and not coalesce((z.confirmacao->>'reenviada')::boolean, false) loop
    select m.texto into v_txt from zap_mensagens m
     where m.aviso_chave = 'confirmacao:' || r.evento and m.aviso_ref = r.id limit 1;
    if coalesce(v_txt, '') <> '' then
      v_txt := case when v_txt ~* '^Ol[áa][^.!\n]*[.!]'
                    then regexp_replace(v_txt, '^(Ol[áa][^.!\n]*[.!])\s*', '\1 Ainda não recebemos a sua resposta. ', 'i')
                    else 'Ainda não recebemos a sua resposta. ' || v_txt end;
      begin
        insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, aviso_chave, aviso_ref)
        values (r.id, 'saida', true, v_txt, 'fila', 'confirmacao2:' || r.evento, r.id);
        n := n + 1;
      exception when unique_violation then null;
      end;
    end if;
    update zap_conversas set confirmacao = confirmacao || jsonb_build_object('reenviada', true, 'reenviada_em', now())
     where id = r.id;
  end loop;
  if jsonb_array_length(coalesce(p_sem_telefone, '[]')) > 0 then
    insert into mencoes (para_id, texto)
    select k.id, '📅 Atendimentos sem telefone na agenda, confirme por ligação: '
                 || (select string_agg(x, '; ') from jsonb_array_elements_text(p_sem_telefone) x)
      from colaboradores k where k.ativo and k.cargo in ('recepcao', 'estagiario');
  end if;
  return n;
end $$;

create or replace function public.zap_conf_cobrar()
returns integer language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0; v_amanha date := (now() at time zone 'America/Sao_Paulo')::date + 1;
begin
  if coalesce((select valor from config_app where chave = 'zap_conf_ligado'), 'nao') <> 'sim' then return 0; end if;
  for r in select z.id, z.confirmacao->>'rotulo' rotulo from zap_conversas z
            where z.confirmacao->>'estado' = 'aguardando' and (z.confirmacao->>'data')::date <= v_amanha
              and (z.confirmacao->>'enviada_em')::timestamptz < now() - interval '4 hours'
              and not coalesce((z.confirmacao->>'cobrada')::boolean, false) loop
    perform zap_conf_avisar(r.id, '📅 Sem resposta à confirmação do atendimento de ' || r.rotulo || ': ligar para o cliente.');
    update zap_conversas set confirmacao = confirmacao || '{"cobrada": true}' where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

revoke all on function public.zap_conf_cobrar() from public, anon, authenticated;
grant execute on function public.zap_conf_cobrar() to service_role;

do $$ begin
  perform cron.unschedule('zap-confirmacao-cobrar') where exists (select 1 from cron.job where jobname = 'zap-confirmacao-cobrar');
  perform cron.schedule('zap-confirmacao-cobrar', '30 16 * * *', 'select public.zap_conf_cobrar()');
end $$;
