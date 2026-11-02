-- A data do "Concluir em" do To Do na última rodada (31.10.2026). O migrar.py
-- compara a data nova da tarefa com esta: mudou no To Do, o To Do vence; não
-- mudou, vale a do CRM. Sem ela, a data adiada ou apagada no To Do nunca chegava.
alter table casos add column if not exists todo_prazo date;

-- Partida: a data que o To Do tinha na auditoria de 31.10.2026 09:53 quando
-- divergia do CRM (tipo 'retorno'); nos demais, a do próprio caso (não divergia).
-- Só preenche: nenhuma data do caso muda aqui.
update casos c set todo_prazo = coalesce(
    (select a.no_todo::date from todo_auditoria a
      where a.caso_id = c.id and a.tipo = 'retorno' order by a.rodada desc limit 1),
    case when exists (select 1 from todo_auditoria a where a.caso_id = c.id and a.tipo = 'retorno')
         then null else c.prazo end)
 where c.todo_task_id is not null and c.todo_prazo is null;
