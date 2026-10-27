-- F276 · a IA conversa com este número (pedido do Paulo, 25.10.2026): a conversa marcada no ⋯
-- vai à IA na hora mesmo com mensagem da equipe nos últimos dias e com o modo interativo desligado.
alter table zap_conversas add column if not exists ia_conversa boolean not null default false;

create or replace function zap_plantao_interativa(p_conversa uuid) returns boolean
language sql stable security definer set search_path = public as $$
  with d as (select coalesce(nullif((select valor from config_app where chave = 'zap_plantao_aberta_dias'), ''), '0')::int n)
  select c.atendente_id is null
     and (c.ia_conversa or (d.n > 0
          and not exists (select 1 from zap_mensagens h where h.conversa_id = c.id and h.direcao = 'saida' and not h.por_bot
                            and h.momento > now() - make_interval(days => d.n))))
     and (select count(*) from zap_mensagens b where b.conversa_id = c.id and b.bot_ia = 'plantao:resposta'
            and b.momento > now() - interval '24 hours') < 15
    from zap_conversas c, d where c.id = p_conversa
$$;
