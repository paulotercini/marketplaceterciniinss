-- F508 · a chave anônima volta a não executar função SECURITY DEFINER (auditoria de 10.11.2026).
-- O "alter default privileges" da F312 não alcançou as funções criadas depois por migração: oito
-- delas (push_aberto, push_cliente_com_prazo, push_mencao_gatilho, push_no_expediente,
-- zap_contato_tira_foto, zap_offline_gatilho, zap_push_transcrito, zap_sugestao_ia) nasceram
-- abertas à chave publicável do site. Mesmo laço da F312; as duas portas do SMBot continuam
-- abertas, porque conferem o token. O aplicar_migracoes.py repete este fechamento depois de toda
-- migração aplicada (guarda_anon), para a função nova não abrir de novo.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prosecdef
             and p.proname not in ('smbot_contato', 'smbot_entrada')
             and has_function_privilege('anon', p.oid, 'execute')
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated, service_role', f.sig);
  end loop;
end $$;
