-- ══════════════════════════════════════════════════════════════════════════
-- CRM Tercini — ⚖️ ANÁLISE DE DIREITO (F48)
--
-- Cole isto inteiro no SQL Editor do Supabase e execute. Leva segundos.
-- Rodar duas vezes dá no mesmo que rodar uma (tudo com if not exists).
--
-- O que guarda: cada análise de direito feita num atendimento — a data em
-- que foi feita (pode ser retroativa: a de 2020 entra como 2020), o que foi
-- visto e combinado, e os CENÁRIOS calculados (regra, data prevista de
-- aposentadoria, valor estimado), um deles marcado como o melhor caminho.
--
-- Os cenários moram num jsonb porque são lidos sempre juntos da análise,
-- nunca consultados soltos:
--   [{ "regra": "Pontos", "data": "2025-05-12", "valor": 3000,
--      "obs": "faltam 14 meses de contribuição", "melhor": true }, ...]
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists analises_direito (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references clientes(id) on delete cascade,
  autor_id     uuid references colaboradores(id),
  data_analise date not null,                       -- quando a análise foi feita
  contexto     text,                                -- o que foi visto/combinado
  fonte        text not null default 'manual',      -- manual | previus | todo
  cenarios     jsonb not null default '[]'::jsonb,
  criado_em    timestamptz not null default now()
);
create index if not exists analises_do_cliente on analises_direito (cliente_id, data_analise desc);
alter table analises_direito enable row level security;
drop policy if exists analises_autenticados on analises_direito;
create policy analises_autenticados on analises_direito for all to authenticated
  using (true) with check (true);

-- conferência: deve listar as colunas da tabela nova
select column_name, data_type from information_schema.columns
 where table_name = 'analises_direito' order by ordinal_position;
