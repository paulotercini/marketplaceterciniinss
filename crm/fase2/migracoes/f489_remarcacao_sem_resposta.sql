-- F489 · remarcação sem resposta (pedido do Paulo, 09.11.2026, caso de 11/11): quem disse que não pode ir
-- e não respondeu aos horários da IA ficava em 'remarcando', fora do reenvio das 9h e do aviso das 13h30 da F487,
-- e o atendimento continuava agendado. Agora a conversa em 'remarcando' cuja última mensagem é da IA há mais
-- de 2 horas, sem a equipe ter escrito depois, recebe na véspera "o atendimento continua agendado; deseja
-- remarcar ou cancelar?" e a equipe é avisada às 13h30 para ligar e, se for o caso, liberar a vaga.

create or replace function public.zap_conf_sem_retorno(c zap_conversas)
returns boolean language sql stable set search_path = public as $$
  select c.confirmacao->>'estado' = 'remarcando'
     and not exists (select 1 from zap_mensagens h where h.conversa_id = c.id and h.direcao = 'saida' and not h.por_bot
                       and h.momento > (c.confirmacao->>'remarcar_em')::timestamptz)
     and coalesce((select m.direcao = 'saida' and m.por_bot and m.momento < now() - interval '2 hours'
                     from zap_mensagens m where m.conversa_id = c.id and m.direcao <> 'interna' and m.apagada_em is null
                    order by m.seq desc limit 1), false);
$$;
revoke all on function public.zap_conf_sem_retorno(zap_conversas) from public, anon, authenticated;

create or replace function public.zap_conf_relatorio(p_sem_telefone jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0; v_amanha date := (now() at time zone 'America/Sao_Paulo')::date + 1; v_txt text;
begin
  for r in select z.id, z.confirmacao->>'evento' evento, z.confirmacao->>'estado' estado,
                  split_part(z.confirmacao->>'rotulo', ', com ', 1) quando from zap_conversas z
            where (z.confirmacao->>'estado' = 'aguardando' and (z.confirmacao->>'enviada_em')::timestamptz < now() - interval '12 hours'
                   or zap_conf_sem_retorno(z))
              and (z.confirmacao->>'data')::date = v_amanha
              and not coalesce((z.confirmacao->>'reenviada')::boolean, false) loop
    if r.estado = 'remarcando' then
      v_txt := 'Ainda não recebemos a sua resposta. O seu atendimento de ' || r.quando
            || ' continua agendado. Deseja remarcar para outro dia ou podemos cancelar?';
    else
      select m.texto into v_txt from zap_mensagens m
       where m.aviso_chave = 'confirmacao:' || r.evento and m.aviso_ref = r.id limit 1;
      if coalesce(v_txt, '') <> '' then
        v_txt := case when v_txt ~* '^Ol[áa][^.!\n]*[.!]'
                      then regexp_replace(v_txt, '^(Ol[áa][^.!\n]*[.!])\s*', '\1 Ainda não recebemos a sua resposta. ', 'i')
                      else 'Ainda não recebemos a sua resposta. ' || v_txt end;
      end if;
    end if;
    if coalesce(v_txt, '') <> '' then
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
  for r in select z.id, z.confirmacao->>'rotulo' rotulo, z.confirmacao->>'estado' estado from zap_conversas z
            where (z.confirmacao->>'estado' = 'aguardando' and (z.confirmacao->>'enviada_em')::timestamptz < now() - interval '4 hours'
                   or zap_conf_sem_retorno(z))
              and (z.confirmacao->>'data')::date between (now() at time zone 'America/Sao_Paulo')::date and v_amanha
              and not coalesce((z.confirmacao->>'cobrada')::boolean, false) loop
    perform zap_conf_avisar(r.id, case when r.estado = 'remarcando'
      then '📅 Remarcação sem resposta: o cliente não confirmou o atendimento de ' || r.rotulo
           || ' e não respondeu aos horários oferecidos. Ligar e, se for o caso, cancelar e liberar a vaga.'
      else '📅 Sem resposta à confirmação do atendimento de ' || r.rotulo || ': ligar para o cliente.' end);
    update zap_conversas set confirmacao = confirmacao || '{"cobrada": true}' where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

