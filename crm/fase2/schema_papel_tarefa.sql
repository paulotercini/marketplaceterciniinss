-- F160 (versão 10.64) · O PAPEL NA TAREFA (lição do Tramitação Inteligente,
-- 03.10.2026). Uma tarefa de andamento é de UMA pessoa; quando o trabalho tem
-- quem faz e quem confere, são duas tarefas no mesmo andamento, e a coluna
-- `papel` diz qual é qual.
--   executa   quem faz o trabalho (o padrão de toda tarefa que já existe)
--   revisa    quem confere o que o executor fez, na mesma data
-- O CRM grava 'revisa' pelo seletor "sem revisor / Fulano revisa" do 📌 Dar
-- seguimento, do compositor da ficha e do ＋ do comentário. Sem esta coluna a
-- tarefa grava sem o papel (como executor) e o aviso diz para rodar este
-- arquivo. Rode no SQL Editor do Supabase; é idempotente.
alter table andamento_tarefas
  add column if not exists papel text not null default 'executa';
do $$ begin
  alter table andamento_tarefas
    add constraint andamento_tarefas_papel_ck
    check (papel in ('executa','revisa'));
exception when duplicate_object then null; end $$;
comment on column andamento_tarefas.papel is
  'executa (padrão) | revisa — o revisor confere o que o executor fez, na mesma data.';
