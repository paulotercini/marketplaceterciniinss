-- F516 · a saúde do WhatsApp no banco (auditoria de 10.11.2026, Ondas 0 e 2).
-- 1 · zap_alarme_ponte avisa também a ponte viva mas fora do ar (sessão encerrada, QR pendente)
--     há 5 minutos, e avisa também o gestor do WhatsApp.
-- 2 · zap_relogio roda também pelo pg_cron, a cada minuto: sem a ponte, plantão, triagem,
--     agendadas e retornos paravam. A trava por carimbo não deixa rodar em dobro.
-- 3 · falha do pg_cron vira menção ao administrador, uma vez por job e por dia.
-- 4 · índices parciais para as sondagens do relógio e do transcrever.py (a tabela tem 15 MB).
-- 5 · a sugestão do andamento não dispara para histórico nem para mensagem antiga do celular.
-- 6 · o relógio limpa a marca 'plantao:lendo' órfã e a sugestão da IA com mais de 24 horas.
-- 7 · zap_saude (uma linha por componente) e zap_saude_falhas (pg_cron por dia, pg_net por hora),
--     que só o administrador lê.

-- ── 7 · as tabelas ───────────────────────────────────────────────────────────────────────────
create table if not exists public.zap_saude (
  componente text primary key,                    -- ponte | relogio | cron | funcoes
  ok         boolean not null default true,
  desde      timestamptz not null default now(),  -- desde quando está neste estado
  visto_em   timestamptz,                         -- última conferência
  detalhe    text
);
create table if not exists public.zap_saude_falhas (
  origem  text not null,          -- cron | pg_net
  chave   text not null,          -- cron: o job; pg_net: o status da resposta
  quando  timestamptz not null,   -- cron: o dia (Brasília); pg_net: a hora
  n       integer not null default 1,
  detalhe text,
  primary key (origem, chave, quando)
);
insert into public.zap_saude (componente) values ('ponte'), ('relogio'), ('cron'), ('funcoes')
on conflict (componente) do nothing;

alter table public.zap_saude enable row level security;
alter table public.zap_saude_falhas enable row level security;
revoke all on public.zap_saude, public.zap_saude_falhas from public, anon, authenticated;
grant select on public.zap_saude, public.zap_saude_falhas to authenticated;
drop policy if exists saude_admin on public.zap_saude;
create policy saude_admin on public.zap_saude for select to authenticated using ((select sou_admin()));
drop policy if exists saude_falhas_admin on public.zap_saude_falhas;
create policy saude_falhas_admin on public.zap_saude_falhas for select to authenticated using ((select sou_admin()));

-- "parado": ninguém conferiu o componente há 15 minutos, e o "ok" gravado já não vale
create or replace view public.zap_saude_agora with (security_invoker = true) as
  select componente, ok, coalesce(visto_em < now() - interval '15 minutes', true) as parado,
         desde, visto_em, detalhe
    from public.zap_saude;
revoke all on public.zap_saude_agora from public, anon, authenticated;
grant select on public.zap_saude_agora to authenticated;

create or replace function public.zap_saude_marca(p_comp text, p_ok boolean, p_detalhe text) returns void
language sql security definer set search_path = public as $$
  insert into zap_saude as s (componente, ok, desde, visto_em, detalhe)
  values (p_comp, coalesce(p_ok, false), now(), now(), p_detalhe)
  on conflict (componente) do update set
    desde = case when s.ok is distinct from excluded.ok then now() else s.desde end,
    ok = excluded.ok, visto_em = now(), detalhe = excluded.detalhe;
$$;

-- ── 3 e 7 · pg_cron e pg_net, conferidos a cada 5 minutos de dentro do relógio ───────────────
-- (dentro do relógio porque a ponte também o chama: se o pg_cron parar, o aviso ainda sai)
create or replace function public.zap_saude_vez() returns void
language plpgsql security definer set search_path = public as $$
declare v_de timestamptz := date_trunc('day', (now() - interval '6 hours') at time zone 'America/Sao_Paulo')
                            at time zone 'America/Sao_Paulo';
        v_jobs text; v_n integer; v_tot integer; v_ult timestamptz;
begin
  update zap_saude set visto_em = now()
   where componente = 'cron' and (visto_em is null or visto_em < now() - interval '5 minutes');
  if not found then return; end if;

  -- o job que falhou e ainda não tem linha no dia é o que se avisa
  select string_agg(distinct x.job, ', ') into v_jobs
    from (select coalesce(j.jobname, 'job ' || d.jobid) job,
                 date_trunc('day', d.start_time at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo' dia
            from cron.job_run_details d left join cron.job j on j.jobid = d.jobid
           where d.status = 'failed' and d.start_time >= v_de) x
   where not exists (select 1 from zap_saude_falhas f
                      where f.origem = 'cron' and f.chave = x.job and f.quando = x.dia);
  insert into zap_saude_falhas as f (origem, chave, quando, n, detalhe)
  select 'cron', coalesce(j.jobname, 'job ' || d.jobid),
         date_trunc('day', d.start_time at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo',
         count(*), max(left(d.return_message, 200))
    from cron.job_run_details d left join cron.job j on j.jobid = d.jobid
   where d.status = 'failed' and d.start_time >= v_de
   group by 2, 3
  on conflict (origem, chave, quando) do update set n = greatest(f.n, excluded.n), detalhe = excluded.detalhe;
  if v_jobs is not null then
    insert into mencoes (para_id, texto)
    select id, '⚠ CRM: tarefa agendada do banco (pg_cron) falhou: ' || v_jobs
               || '. O que ela faria pode não ter rodado nesse horário.'
      from colaboradores where ativo and papel = 'admin';
  end if;
  select count(*) filter (where status = 'failed'), max(start_time) filter (where status = 'succeeded')
    into v_n, v_ult from cron.job_run_details where start_time > now() - interval '1 hour';
  perform zap_saude_marca('cron', v_n = 0 and v_ult > now() - interval '15 minutes',
    case when v_ult is null then 'nenhuma execução com sucesso na última hora'
         else v_n || ' falha(s) na última hora; último sucesso às '
              || to_char(v_ult at time zone 'America/Sao_Paulo', 'HH24:MI') end);

  -- pg_net guarda a resposta por poucas horas e sem o endereço: fica a contagem por hora e status
  insert into zap_saude_falhas as f (origem, chave, quando, n, detalhe)
  select 'pg_net', coalesce(r.status_code::text, case when r.timed_out then 'tempo esgotado' else 'erro' end),
         date_trunc('hour', r.created), count(*), max(left(r.error_msg, 200))
    from net._http_response r
   where r.created >= date_trunc('hour', now() - interval '1 hour')
     and (r.status_code >= 400 or coalesce(r.timed_out, false) or r.error_msg is not null)
   group by 2, 3
  on conflict (origem, chave, quando) do update set n = greatest(f.n, excluded.n), detalhe = excluded.detalhe;
  select count(*) filter (where status_code >= 400 or coalesce(timed_out, false) or error_msg is not null), count(*)
    into v_n, v_tot from net._http_response where created > now() - interval '1 hour';
  perform zap_saude_marca('funcoes', v_n = 0, v_n || ' de ' || v_tot || ' chamadas do banco (pg_net) falharam na última hora');
end $$;

-- ── 1 · o alarme da ponte ────────────────────────────────────────────────────────────────────
create or replace function public.zap_alarme_ponte() returns void
language plpgsql security definer set search_path = public as $$
declare v_visto timestamptz; v_alarme text; v_morta boolean; v_status text; v_boa boolean; v_desde timestamptz;
begin
  select nullif(valor,'')::timestamptz into v_visto from config_app where chave = 'zap_visto_em';
  select valor into v_alarme from config_app where chave = 'zap_alarme_em';
  select valor into v_status from config_app where chave = 'zap_status';
  v_morta := v_visto is null or v_visto < now() - interval '5 minutes';
  v_boa := not v_morta and coalesce(v_status, '') = 'ligado';
  -- a ponte regrava o zap_status a cada batida: desde quando está fora, quem guarda é a saúde
  perform zap_saude_marca('ponte', v_boa, case when v_morta then 'sem sinal' else v_status end);
  select desde into v_desde from zap_saude where componente = 'ponte';
  if (v_morta or (not v_boa and v_desde <= now() - interval '4 minutes 30 seconds')) and coalesce(v_alarme,'') = '' then
    insert into mencoes (para_id, texto)
    select id, case when v_morta then
             '⚠ WhatsApp: a ponte está sem sinal desde '
             || coalesce(to_char(v_visto at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI'), 'agora')
             || '. Mensagens não estão entrando no CRM. Veja WhatsApp › Corrigir conexão.'
           else
             '⚠ WhatsApp: a ponte está fora do ar desde '
             || to_char(v_desde at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI')
             || ' (' || coalesce(nullif(v_status, ''), 'sem estado')
             || '). Mensagens não entram nem saem. Veja WhatsApp › Ler QR code ou Corrigir conexão.' end
      from colaboradores where ativo and (papel = 'admin' or coalesce(gestor_zap, false));
    insert into config_app (chave, valor) values ('zap_alarme_em', now()::text)
      on conflict (chave) do update set valor = excluded.valor, atualizado = now();
  elsif v_boa and coalesce(v_alarme,'') <> '' then
    insert into mencoes (para_id, texto)
    select id, '✔ WhatsApp: a ponte voltou às '
           || to_char(v_visto at time zone 'America/Sao_Paulo', 'HH24:MI')
           || '. O que chegou no meio entra pelo histórico do celular.'
      from colaboradores where ativo and (papel = 'admin' or coalesce(gestor_zap, false));
    update config_app set valor = '', atualizado = now() where chave = 'zap_alarme_em';
  end if;
end $$;

-- ── 2 e 6 · o relógio ────────────────────────────────────────────────────────────────────────
create or replace function public.zap_relogio() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer := 0; r record;
begin
  -- ponte (30 s) e pg_cron (1 min) chamam os dois: a linha do relógio é a trava. A segunda
  -- chamada espera a primeira e, vendo o carimbo novo, sai; duas voltas juntas avisariam o
  -- retorno e chamariam a IA duas vezes
  insert into zap_saude (componente) values ('relogio') on conflict (componente) do nothing;
  update zap_saude set visto_em = now(), ok = true, detalhe = null
   where componente = 'relogio' and (visto_em is null or visto_em < now() - interval '20 seconds');
  if not found then return 0; end if;

  update zap_mensagens set status = 'fila'
   where status = 'agendada' and enviar_em <= now();
  get diagnostics n = row_count;
  for r in select z.id, z.conversa_id, coalesce(z.colaborador_id, c.atendente_id) quem, z.nota,
                  coalesce(nullif(trim(c.nome_perfil), ''), c.telefone) nome
             from zap_retornos z join zap_conversas c on c.id = z.conversa_id
            where z.feito_em is null and z.avisado_em is null and z.quando <= now() loop
    if r.quem is not null then
      insert into mencoes (para_id, conversa_id, texto)
      values (r.quem, r.conversa_id, '⏰ Retorno: responder ' || coalesce(r.nome, 'o contato')
              || coalesce(' — ' || nullif(trim(r.nota), ''), ''));
    end if;
    update zap_retornos set avisado_em = now() where id = r.id;
  end loop;
  perform zap_bot_esperas();
  perform zap_triagem_vencidas();
  perform zap_plantao_vencidas();
  perform zap_push_audios_vencidos();
  perform push_resumo_vez();
  -- faxina e saúde não podem derrubar o que veio antes
  begin
    -- a leitura da IA que ninguém mais espera (o pedido da conversa já é de outra mensagem)
    update zap_mensagens m set bot_ia = 'plantao:falhou'
     where m.bot_ia = 'plantao:lendo'
       and not exists (select 1 from zap_conversas c
                        where c.id = m.conversa_id and c.plantao->>'pedido_msg' = m.id::text);
    perform set_config('zap.via_funcao', '1', true);
    update zap_conversas set sugestao_ia = null
     where sugestao_ia is not null and (sugestao_ia->>'em')::timestamptz < now() - interval '24 hours';
    perform zap_saude_vez();
  exception when others then null;
  end;
  return n;
end $$;

-- só o banco e a ponte (service_role) chamam; o colaborador não forja a saúde
revoke execute on function public.zap_saude_marca(text, boolean, text), public.zap_saude_vez()
  from public, anon, authenticated;
grant execute on function public.zap_saude_marca(text, boolean, text), public.zap_saude_vez() to service_role;

select cron.unschedule(jobid) from cron.job where jobname = 'zap-relogio';
select cron.schedule('zap-relogio', '* * * * *', 'select public.zap_relogio()');

-- ── 5 · o andamento só para mensagem viva ────────────────────────────────────────────────────
-- A guarda fica no gatilho, e não na função, que chama a Edge Function e é recriada por outras
-- migrações. Mesma regra do plantão (F274): histórico e mensagem com mais de 10 minutos não contam.
drop trigger if exists zap_t_andamento_ins on public.zap_mensagens;
create trigger zap_t_andamento_ins after insert or update of texto on public.zap_mensagens
  for each row when (new.direcao = 'entrada'
                     and coalesce(new.quando_wa, now()) > now() - interval '10 minutes'
                     and not zap_eh_historico(new))
  execute function zap_andamento_gatilho();

-- ── 4 · índices parciais (as sondagens liam a tabela inteira a cada 30 s) ────────────────────
create index if not exists zap_msg_plantao_espera on public.zap_mensagens (criado_em)
  where bot_ia in ('plantao:espera', 'plantao:agora', 'plantao:lendo');
create index if not exists zap_msg_triagem_espera on public.zap_mensagens (criado_em)
  where bot_ia like 'pedida:%' or bot_ia like 'lendo:%' or bot_ia like 'audio:%';
create index if not exists zap_msg_audio_sem_push on public.zap_mensagens (momento)
  where direcao = 'entrada' and tipo = 'audio' and push_em is null;
create index if not exists zap_msg_audio_sem_texto on public.zap_mensagens (seq)
  where tipo = 'audio' and texto is null and midia_url is not null;
create index if not exists zap_msg_sem_drive on public.zap_mensagens (seq)
  where direcao = 'entrada' and tipo in ('imagem', 'documento') and midia_url is not null and drive_em is null;
