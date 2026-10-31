-- F312 · nenhuma função do banco sem login (teste integral 11.88, defeito DAD-01, 31.10.2026).
-- O Postgres dá EXECUTE a todos (PUBLIC) em toda função nova, e o Supabase dá também à chave
-- anônima; as 48 funções SECURITY DEFINER do public podiam ser chamadas pela chave publicável,
-- que está no site, sem login (zap_buscar lia o texto do WhatsApp; zap_ligacao gravava saída).
-- Fica a chave anônima só nas duas portas do SMBot, que conferem o token da integração
-- (INTEGRACAO-SMBOT.md). O navegador entra logado (authenticated) e segue como antes; a ponte,
-- o plantão e o cron usam service_role ou o dono das funções, que não dependem deste grant.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prosecdef
             and p.proname not in ('smbot_contato', 'smbot_entrada')
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated, service_role', f.sig);
  end loop;
end $$;

-- Função criada daqui em diante nasce sem EXECUTE para PUBLIC e anon; a que precisar de anon
-- (nova porta como a do SMBot) recebe o grant explícito na própria migração.
alter default privileges for role postgres in schema public revoke execute on functions from public, anon;
alter default privileges for role postgres in schema public grant execute on functions to authenticated, service_role;
