-- Regressão da F312: a chave anônima não executa função SECURITY DEFINER do public, salvo as
-- duas portas do SMBot. Só lê o catálogo: pode rodar no banco de produção.
--   psql "postgres://…" -q -f crm/fase2/testes/anon_funcoes.sql
select case when count(*) = 0 then 'ok a1 anon sem função SECURITY DEFINER'
            else 'FALHOU a1 anon executa: ' || string_agg(p.proname, ', ') end
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prosecdef
   and p.proname not in ('smbot_contato', 'smbot_entrada')
   and has_function_privilege('anon', p.oid, 'EXECUTE');
select case when bool_and(has_function_privilege('anon', p.oid, 'EXECUTE')) then 'ok a2 SMBot aberto à anon'
            else 'FALHOU a2 SMBot fechado' end
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname in ('smbot_contato', 'smbot_entrada');
select case when has_function_privilege('authenticated', 'public.zap_buscar(text,integer)', 'EXECUTE')
            then 'ok a3 colaborador logado ainda busca' else 'FALHOU a3 zap_buscar fechado ao logado' end;
