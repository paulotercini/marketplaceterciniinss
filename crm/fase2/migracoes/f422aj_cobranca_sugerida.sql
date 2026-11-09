-- F422aj (pedido do Paulo de 09.11.2026): a IA sugere a cobrança quando a última mensagem da
-- conversa é da equipe e o cliente não responde há zap_cobranca_dias dias (padrão 2). A Edge
-- Function zap_plantao ({cobranca: true}) lê as candidatas, decide se a mensagem da equipe
-- espera providência do cliente e grava o texto em zap_conversas.sugestao_ia (F422af), acima
-- do campo de escrever. Nada é enviado ao cliente. Cada mensagem da equipe é avaliada uma vez
-- (cobranca_msg).
alter table public.zap_conversas add column if not exists cobranca_msg uuid;

insert into public.config_app (chave, valor) values ('zap_cobranca_ligada', 'sim'), ('zap_cobranca_dias', '2')
on conflict (chave) do nothing;

create or replace function public.zap_cobranca_candidatas(p_limite integer default 6)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_dias integer := coalesce(nullif(trim((select valor from config_app where chave = 'zap_cobranca_dias')), '')::int, 2);
        r record; v jsonb := '[]'::jsonb;
begin
  if coalesce((select valor from config_app where chave = 'zap_cobranca_ligada'), 'nao') <> 'sim' then return v; end if;
  for r in
    select c.id, c.nome_perfil, c.contato_nome, c.contato_relacao, c.cliente_id, u.id as msg_id, u.momento
      from zap_conversas c
      cross join lateral (select m.id, m.direcao, m.por_bot, m.momento from zap_mensagens m
                           where m.conversa_id = c.id and m.direcao <> 'interna' and m.apagada_em is null
                           order by m.seq desc limit 1) u
     where c.status <> 'resolvida' and not coalesce(c.automatica, false) and not coalesce(c.sem_ia, false)
       and c.sugestao_ia is null
       and u.direcao = 'saida' and not u.por_bot
       and u.momento < now() - make_interval(days => v_dias)
       and u.momento > now() - interval '30 days'
       and c.cobranca_msg is distinct from u.id
     order by u.momento desc
     limit greatest(1, least(coalesce(p_limite, 6), 10))
  loop
    v := v || jsonb_build_object(
      'conversa_id', r.id, 'msg_id', r.msg_id, 'dias', extract(day from now() - r.momento)::int,
      'contato', coalesce(nullif(trim(r.contato_nome), ''), nullif(trim(r.nome_perfil), ''), 'cliente'),
      'relacao', r.contato_relacao,
      'cliente', (select nome from clientes where id = r.cliente_id),
      'mensagens', (select coalesce(jsonb_agg(jsonb_build_object('direcao', x.direcao, 'por_bot', x.por_bot, 'tipo', x.tipo,
                                     'texto', x.texto, 'momento', x.momento) order by x.seq), '[]'::jsonb)
                      from (select seq, direcao, por_bot, tipo, texto, momento from zap_mensagens
                             where conversa_id = r.id and direcao <> 'interna' and apagada_em is null
                             order by seq desc limit 30) x));
  end loop;
  return v;
end $$;

create or replace function public.zap_cobranca_gravar(p_conversa uuid, p_msg uuid, p_texto text)
returns boolean language plpgsql security definer set search_path to 'public' as $$
begin
  perform set_config('zap.via_funcao', '1', true);
  update zap_conversas set cobranca_msg = p_msg where id = p_conversa;
  if trim(coalesce(p_texto, '')) = '' then return false; end if;
  -- a equipe ou o cliente escreveu enquanto a IA pensava: a sugestão não vale mais
  if (select m.id from zap_mensagens m where m.conversa_id = p_conversa and m.direcao <> 'interna' and m.apagada_em is null
       order by m.seq desc limit 1) is distinct from p_msg then return false; end if;
  if exists (select 1 from zap_conversas where id = p_conversa and sugestao_ia is not null) then return false; end if;
  perform zap_sugestao_ia(p_conversa, p_texto);
  return true;
end $$;

-- o relógio: de hora em hora, das 8h às 17h de Brasília, nos dias úteis
create or replace function public.zap_cobranca_vez() returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if coalesce((select valor from config_app where chave = 'zap_cobranca_ligada'), 'nao') <> 'sim' then return; end if;
  perform net.http_post(
    url := (select valor from config_app where chave = 'zap_plantao_url'),
    body := '{"cobranca":true}'::jsonb,
    headers := '{"Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 120000);
exception when others then null;
end $$;

revoke execute on function public.zap_cobranca_candidatas(integer) from public, anon, authenticated;
revoke execute on function public.zap_cobranca_gravar(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.zap_cobranca_vez() from public, anon, authenticated;
grant execute on function public.zap_cobranca_candidatas(integer) to service_role;
grant execute on function public.zap_cobranca_gravar(uuid, uuid, text) to service_role;

select cron.unschedule(jobid) from cron.job where jobname = 'zap-cobranca';
select cron.schedule('zap-cobranca', '0 11-20 * * 1-5', 'select public.zap_cobranca_vez()');
