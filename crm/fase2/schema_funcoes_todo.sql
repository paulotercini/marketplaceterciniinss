-- FUNÇÕES TRAZIDAS DO MICROSOFT TO DO
-- Só acrescenta colunas: rodar duas vezes dá no mesmo que rodar uma.

-- Lembrete com horário: a tarefa continua com a data em lembrar_em; a hora é
-- opcional e, quando existe, o CRM avisa naquele horário da data.
alter table andamento_tarefas add column if not exists lembrar_hora time;

-- Atribuição com autor e data (o assigner e o assigned_datetime do To Do):
-- quem pôs a pessoa no caso, e quando. O banco preenche sozinho pelo login;
-- a sincronização com o To Do, que entra sem login, deixa o autor vazio.
alter table atribuicoes add column if not exists atribuido_por uuid
  references colaboradores(id) on delete set null default eu_colab();
alter table atribuicoes add column if not exists atribuido_em timestamptz default now();
