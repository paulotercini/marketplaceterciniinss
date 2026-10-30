-- F308 · o nome próprio do caso (pedido do Paulo, 30.10.2026): na janela que pede a escolha do caso,
-- o ✎ grava aqui o nome que separa dois casos da mesma espécie ("Acidentária do joelho").
-- Vazio, a janela usa o título da espécie. O To Do não escreve nesta coluna.
alter table casos add column if not exists apelido text;
