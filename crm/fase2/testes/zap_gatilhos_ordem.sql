-- A ordem dos gatilhos AFTER INSERT de zap_mensagens. O Postgres dispara os gatilhos do mesmo
-- evento pela ordem dos NOMES (byte a byte), e o WhatsApp depende dela: o zap_toque_ins reabre a
-- conversa antes do filtro (zap_v_), do plantão da IA (zap_w_), do aviso no aparelho (zap_x_), da
-- mensagem do Offline (zap_y_) e do robô (zap_zbot_ins), que roda por último. Gatilho novo, nome
-- trocado ou função trocada muda quem responde ao cliente: esta lista tem de mudar junto, de propósito.
-- Lista lida da produção em 10.11.2026 (pg_trigger). Só lê o catálogo, não mexe em dado:
--   psql "postgres://…" -f crm/fase2/testes/zap_gatilhos_ordem.sql
-- Com diferença, a linha sai FALHOU e o arquivo termina em erro.
create temp table t_gat as
with esperado(n, gatilho, funcao) as (values
  (1,  'zap_avisa_resposta',     'zap_avisa_resposta_compartilhada'),
  (2,  'zap_historico_primeira', 'zap_historico_primeira'),
  (3,  'zap_humano_ins',         'zap_humano_assumiu'),
  (4,  'zap_s_anotacao_ins',     'zap_anotacao_gatilho'),
  (5,  'zap_t_andamento_ins',    'zap_andamento_gatilho'),
  (6,  'zap_toque_ins',          'zap_toque'),
  (7,  'zap_u_sugestao_ins',     'zap_sugestao_limpa'),
  (8,  'zap_v_filtro_ins',       'zap_filtro'),
  (9,  'zap_v_marcas_ins',       'zap_marcas_conversa'),
  (10, 'zap_w_plantao_ins',      'zap_plantao_gatilho'),
  (11, 'zap_x_push_ins',         'zap_push_gatilho'),
  (12, 'zap_y_offline_ins',      'zap_offline_gatilho'),
  (13, 'zap_zbot_ins',           'zap_bot')
), atual as (
  select row_number() over (order by t.tgname collate "C") as n, t.tgname::text as gatilho, p.proname::text as funcao
    from pg_trigger t join pg_proc p on p.oid = t.tgfoid
   where t.tgrelid = 'public.zap_mensagens'::regclass and not t.tgisinternal
     and t.tgtype & 2 = 0      -- AFTER
     and t.tgtype & 4 = 4      -- INSERT
     and t.tgenabled <> 'D'
)
select coalesce(e.n, a.n) as ordem, e.gatilho as esperado, a.gatilho as atual, a.funcao,
       (e.gatilho is not distinct from a.gatilho and e.funcao is not distinct from a.funcao) as ok
  from esperado e full join atual a using (n);

select ordem, esperado, atual, funcao, case when ok then 'ok' else 'FALHOU' end as resultado from t_gat order by ordem;
select count(*) filter (where not ok) as falhas from t_gat;
do $$ begin if exists (select 1 from t_gat where not ok) then
  raise exception 'zap_gatilhos_ordem: os gatilhos AFTER INSERT de zap_mensagens mudaram; confira a ordem e atualize a lista';
end if; end $$;
