-- F422ag (09.11.2026): metade das aberturas de conversa desde 10/2025 vem em rajada (duas ou mais
-- mensagens em 90 segundos). Com a pausa de 15 s, o robô igual ao do SMBot respondia cada mensagem
-- da rajada com "digite o número" e repetia o menu. A pausa passa a 120 s.
insert into public.config_app (chave, valor) values ('zap_pausa_bot', '120')
on conflict (chave) do update set valor = excluded.valor;
