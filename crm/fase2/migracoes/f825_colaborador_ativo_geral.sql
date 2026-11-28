-- F825 · análise de segurança de 26.11.2026: toda tabela pública com RLS passa a exigir colaborador
-- ATIVO para o login (authenticated), além das políticas que já existem. Fecha o acesso de conta
-- criada por cadastro aberto e de ex-colaborador. Anon, service_role e funções SECURITY DEFINER
-- do postgres não são alcançados. Reaproveita sou_ativo() da F513.
do $$
declare t record;
begin
  for t in select distinct tablename from pg_policies where schemaname='public' loop
    execute format('drop policy if exists so_colaborador_ativo on public.%I', t.tablename);
    execute format('create policy so_colaborador_ativo on public.%I as restrictive for all to authenticated using ((select sou_ativo())) with check ((select sou_ativo()))', t.tablename);
  end loop;
end $$;
