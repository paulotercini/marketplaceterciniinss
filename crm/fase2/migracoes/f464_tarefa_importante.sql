-- F464 · a ⭐ também na tarefa pessoal do Meu Dia (pedido do Paulo, 09.11.2026)
alter table public.tarefas add column if not exists importante boolean not null default false;
