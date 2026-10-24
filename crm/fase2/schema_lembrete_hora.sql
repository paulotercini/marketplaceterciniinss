-- LEMBRETE COM HORÁRIO (como o Microsoft To Do)
-- A tarefa continua com a data em lembrar_em; a hora é opcional e, quando
-- existe, o CRM avisa naquele horário da data, com som e aviso do navegador.
-- Só acrescenta a coluna: rodar duas vezes dá no mesmo que rodar uma.
alter table andamento_tarefas add column if not exists lembrar_hora time;
