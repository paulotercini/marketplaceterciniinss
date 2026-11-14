-- F596 (aprovada pelo Paulo em 14.11.2026): a mensagem do cliente que fica 30 minutos sem resposta
-- de ninguém, dentro do expediente, menciona a recepção (sem recepção ativa, os estagiários) e quem
-- atende a conversa. Uma vez por mensagem; a que chega fora do expediente é avisada na primeira
-- rodada do expediente. Fica fora a conversa automática, de contato (F586) e a que a IA conduz (F594).
-- Liga e desliga por config_app.zap_alerta_ligado; os minutos em zap_alerta_min (30).

alter table public.zap_conversas add column if not exists alerta_sem_resposta_em timestamptz;

insert into config_app (chave, valor) values ('zap_alerta_ligado', 'sim'), ('zap_alerta_min', '30')
  on conflict (chave) do nothing;

create or replace function public.zap_alerta_sem_resposta(p_agora timestamptz default now())
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_min int := coalesce(nullif((select valor from config_app where chave = 'zap_alerta_min'), '')::int, 30);
  v_rec boolean;
  c record;
  n int := 0;
  v_txt text;
begin
  if coalesce((select valor from config_app where chave = 'zap_alerta_ligado'), 'sim') <> 'sim'
     or not push_no_expediente(p_agora) then
    return 0;
  end if;
  v_rec := exists (select 1 from colaboradores where ativo and cargo = 'recepcao');
  for c in
    select z.* from zap_conversas z
     where z.status = 'aberta'
       and not coalesce(z.automatica, false)
       and z.ultima_entrada_em is not null
       and z.ultima_entrada_em > coalesce(z.ultima_resposta_em, '-infinity')
       and z.ultima_entrada_em <= p_agora - make_interval(mins => v_min)
       and (z.alerta_sem_resposta_em is null or z.alerta_sem_resposta_em < z.ultima_entrada_em)
       and not (coalesce(z.plantao->>'modo', '') in ('conversa', 'lead') and z.plantao->>'agendado_em' is null
                and z.atendente_id is null)
       and not exists (select 1 from clientes cl where cl.id = z.cliente_id and cl.campos ? 'contato')
  loop
    v_txt := 'Mensagem do cliente sem resposta há mais de ' || v_min || ' minutos. Confira a conversa.';
    insert into mencoes (para_id, conversa_id, cliente_id, texto)
    select k.id, c.id, c.cliente_id, v_txt
      from colaboradores k
     where k.ativo
       and (k.id = c.atendente_id
            or (v_rec and k.cargo = 'recepcao')
            or (not v_rec and k.cargo = 'estagiario'));
    update zap_conversas set alerta_sem_resposta_em = p_agora where id = c.id;
    n := n + 1;
  end loop;
  return n;
end $$;

revoke execute on function public.zap_alerta_sem_resposta(timestamptz) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'zap-alerta-sem-resposta';
    perform cron.schedule('zap-alerta-sem-resposta', '*/5 * * * *', 'select public.zap_alerta_sem_resposta()');
  end if;
end $$;
