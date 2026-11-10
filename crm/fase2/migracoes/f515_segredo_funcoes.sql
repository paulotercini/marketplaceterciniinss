-- F515 · segredo compartilhado nas Edge Functions sem JWT (auditoria do WhatsApp, 10.11.2026).
-- zap_plantao, zap_push, zap_triagem, zap_agenda e zap_confirmacao são publicadas com
-- verify_jwt = false porque quem chama é o banco (pg_net), e não conferiam a origem. Agora o
-- banco manda o cabeçalho x-crm-segredo e cada função o confere lendo funcoes_segredo com a
-- service key. A exigência nasce DESLIGADA (config_app.zap_fn_segredo = 'nao'): desligada, a
-- função aceita a chamada sem cabeçalho e só registra no log; assim a migração pode entrar
-- antes de as funções serem publicadas. Para ligar: zap_fn_segredo = 'sim'.

-- 1 · o segredo, numa tabela que só a service_role lê (como push_chave: RLS ligada, sem política)
create table if not exists public.funcoes_segredo (
  id      int primary key default 1 check (id = 1),
  segredo text not null,
  criado  timestamptz not null default now()
);
alter table public.funcoes_segredo enable row level security;
revoke all on public.funcoes_segredo from public, anon, authenticated;
grant select on public.funcoes_segredo to service_role;
insert into public.funcoes_segredo (id, segredo)
values (1, encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (id) do nothing;

insert into public.config_app (chave, valor) values ('zap_fn_segredo', 'nao')
on conflict (chave) do nothing;

-- 2 · o cabeçalho das chamadas do banco. Sem SECURITY DEFINER de propósito: quem chama são
-- funções SECURITY DEFINER do postgres, que leem a tabela; o colaborador que a chamar pela API
-- roda como authenticated e não lê o segredo.
create or replace function public.zap_fn_cabecalho() returns jsonb
language sql stable set search_path = public as $$
  select jsonb_strip_nulls(jsonb_build_object('Content-Type', 'application/json',
    'x-crm-segredo', (select segredo from funcoes_segredo where id = 1)));
$$;
revoke execute on function public.zap_fn_cabecalho() from public, anon, authenticated;

-- 3 · as funções que chamam as Edge Functions por pg_net são recriadas a partir da definição
-- que está no banco na hora (pg_get_functiondef), trocando só o cabeçalho fixo pelo
-- zap_fn_cabecalho(). Rodar de novo não acha mais o cabeçalho fixo e não faz nada.
do $$
declare
  f record;
  v_fixo constant text := $h$'{"Content-Type":"application/json"}'::jsonb$h$;
  v_n int := 0;
begin
  for f in
    select pg_get_functiondef(p.oid) as def
      from pg_proc p join pg_namespace s on s.oid = p.pronamespace
     where s.nspname = 'public' and p.prokind = 'f'
       and pg_get_functiondef(p.oid) ~ 'net\.http_post'
       and pg_get_functiondef(p.oid) ~ 'zap_(push|plantao|agenda|triagem|conf)_url'
       and position(v_fixo in pg_get_functiondef(p.oid)) > 0
  loop
    execute replace(f.def, v_fixo, 'zap_fn_cabecalho()');
    v_n := v_n + 1;
  end loop;
  raise notice 'F515: % funções passaram a mandar o x-crm-segredo', v_n;
end $$;
