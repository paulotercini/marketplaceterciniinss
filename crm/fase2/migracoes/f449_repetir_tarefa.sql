-- F449 · a tarefa que se repete: {n, un: "d"|"m", apos}. Concluída, o CRM cria a próxima rodada.
alter table andamento_tarefas add column if not exists repetir jsonb;
comment on column andamento_tarefas.repetir is
  'regra de repetição da tarefa (F449): {n, un: d|m, apos}; nula = não repete; prazo fatal nunca repete';
