-- F824 · conversa assumida pela equipe (atendente Online que já escreveu ao cliente): a sugestão sai em 1 minuto,
-- e não depois dos 20 do plantão; ela não vai ao cliente (Paulo, 26.11.2026). A F629 (assumida sem mensagem da equipe) e o Offline seguem a espera.
create or replace function public.zap_plantao_vencidas()
 returns integer language plpgsql security definer set search_path to 'public' as $function$
declare r record; n integer := 0; v_min integer; v_fim timestamptz;
begin
  if coalesce((select valor from config_app where chave = 'zap_ia_plantao'), 'nao') <> 'sim' then return 0; end if;
  v_min := case when zap_no_horario()
                then coalesce(nullif((select valor from config_app where chave = 'zap_plantao_min'), ''), '20')::int
                else coalesce(nullif((select valor from config_app where chave = 'zap_plantao_fora_min'), ''), '5')::int end;
  for r in select m.id, m.conversa_id, m.seq, m.momento, m.bot_ia from zap_mensagens m
            where (m.bot_ia = 'plantao:espera' and m.criado_em < now() - make_interval(mins => v_min))
               or (m.bot_ia = 'plantao:espera' and m.criado_em < now() - interval '1 minute' and exists (
                     select 1 from zap_conversas c join colaboradores k on k.id = c.atendente_id
                      where c.id = m.conversa_id and k.zap_offline_desde is null
                        and exists (select 1 from zap_mensagens x where x.conversa_id = c.id and x.direcao = 'saida'
                                      and not x.por_bot and x.momento < m.momento)))
               or (m.bot_ia = 'plantao:agora' and (trim(coalesce(m.texto, '')) not in ('') and m.texto not like '[áudio%'
                                                   or m.criado_em < now() - interval '3 minutes'))
            order by m.criado_em loop
    if exists (select 1 from zap_mensagens x where x.conversa_id = r.conversa_id and x.direcao = 'entrada' and x.seq > r.seq) then
      update zap_mensagens set bot_ia = 'plantao:junto' where id = r.id;
    elsif exists (select 1 from zap_mensagens x where x.conversa_id = r.conversa_id and x.direcao = 'saida'
                    and not x.por_bot and x.momento >= r.momento) then
      update zap_mensagens set bot_ia = 'plantao:respondida' where id = r.id;
    elsif r.bot_ia = 'plantao:espera' and exists (
            select 1 from zap_mensagens x where x.conversa_id = r.conversa_id and x.bot_ia = 'plantao:resposta'
               and (x.momento > now() - interval '4 hours' or not zap_no_horario())
               and x.momento > coalesce((select max(h.momento) from zap_mensagens h where h.conversa_id = r.conversa_id
                                           and h.direcao = 'saida' and not h.por_bot), '-infinity')) then
      update zap_mensagens set bot_ia = 'plantao:ja_avisado' where id = r.id;
    elsif exists (select 1 from zap_conversas c where c.id = r.conversa_id and (c.automatica or c.sem_ia)) then
      update zap_mensagens set bot_ia = 'plantao:fora' where id = r.id;
    else
      perform zap_plantao_chamar(r.id);
    end if;
    n := n + 1;
  end loop;
  for r in select c.id, (c.plantao->>'pedido_msg')::uuid msg, c.confirmacao from zap_conversas c
            where c.plantao ? 'pedido_em' and (c.plantao->>'pedido_em')::timestamptz < now() - interval '90 seconds' loop
    if coalesce((r.confirmacao->>'ler')::boolean, false) then
      perform zap_conf_ia_intencao(r.id, case r.confirmacao->>'classe' when 'sim' then 'confirmar' when 'nao' then 'remarcar' else 'outro' end, r.msg);
    end if;
    perform zap_plantao_aplicar(r.msg, 'falhou', null, null, false, null, null, null);
    n := n + 1;
  end loop;
  return n;
end $function$;
