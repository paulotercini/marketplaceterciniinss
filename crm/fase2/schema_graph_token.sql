-- F90 · O CRACHÁ DA MICROSOFT QUE NÃO MORRE MAIS
--
-- A Microsoft devolve um refresh_token NOVO a cada renovação, e o antigo tem
-- validade própria. O workflow recriava sempre o MESMO crachá a partir do
-- segredo GRAPH_REFRESH_TOKEN e jogava fora o novo, então a corrente morria
-- sozinha ao fim da validade do original. Foi o que houve em 05.09.2026
-- (AADSTS70000, "the grant is expired"): a sincronização To Do -> CRM ficou
-- parada de 05 a 12.09.2026 sem aviso nenhum.
--
-- Esta tabela guarda o token renovado a cada hora. Uma linha só.
--
-- Rode no SQL Editor do Supabase. É idempotente: pode rodar mais de uma vez.
-- Sem ela o graph_refresh.py apenas avisa no log e segue usando o segredo,
-- ou seja, o comportamento antigo.

create table if not exists graph_token (
  id            int primary key default 1 check (id = 1),
  refresh_token text not null,
  atualizado_em timestamptz not null default now()
);

-- É um crachá de acesso ao To Do do escritório: RLS LIGADO e NENHUMA policy.
-- Sem policy, anon e authenticated não leem nem escrevem nada; a service_role
-- (que é quem roda a sincronização no GitHub) passa por cima do RLS. Não crie
-- policy aqui, e não leia esta tabela pelo app.
alter table graph_token enable row level security;

comment on table graph_token is
  'refresh_token da conta Microsoft da sincronização. Só service_role. Nunca expor ao app.';

-- conferência depois de rodar (deve devolver 1 linha com rowsecurity = true):
--   select tablename, rowsecurity from pg_tables where tablename = 'graph_token';
-- e, depois da primeira sincronização, uma linha aqui:
--   select id, atualizado_em from graph_token;
