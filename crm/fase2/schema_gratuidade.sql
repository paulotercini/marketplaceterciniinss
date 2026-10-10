-- Gratuidade da justiça no caso judicial (pedido do Paulo, 10.10.2026).
-- null = não informada; 'concedida'; 'negada'. Só 'negada' aparece na linha
-- do caso, em vermelho. Escolhida em gestão do caso, na fase judicial.
alter table casos add column if not exists gratuidade text
  check (gratuidade in ('concedida','negada'));
