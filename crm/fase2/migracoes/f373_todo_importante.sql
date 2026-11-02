-- F373 · a ⭐ do caso espelhada no Microsoft To Do (pedido do Paulo, 02.11.2026).
-- casos.todo_importante guarda a estrela que a tarefa do To Do tinha na rodada anterior, como o todo_prazo:
-- a estrela que MUDOU no To Do vence; a que não mudou mantém a do CRM, que a ponte_despacho.py leva ao To Do.
-- Nasce nula: a primeira sincronização a preenche, e até lá vale a regra antiga (CRM ou To Do).
alter table casos add column if not exists todo_importante boolean;
