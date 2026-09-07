-- F87 (versão 09.83) · NATUREZA DO PEDIDO no caso
--
-- A espécie diz QUAL benefício (B41, B42, B94…). A natureza diz o que se pede
-- sobre ele: conceder pela primeira vez, revisar o que já foi concedido, ou
-- acertar o cadastro/CNIS que sustenta o pedido. Muda a peça, muda o prazo
-- decadencial e muda o modo de cobrar honorários — e é por ela que a carteira
-- se separa quando alguém pergunta "quantas revisões temos em andamento".
--
-- Rode no SQL Editor do Supabase. É idempotente: pode rodar mais de uma vez.
-- Sem esta coluna, os três botões de natureza no cartão do caso avisam que
-- falta rodar este arquivo e não gravam nada — o resto do CRM segue igual.

alter table casos add column if not exists natureza text;

-- só os três valores que o app escreve (ou nulo, enquanto ninguém marcou)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'casos_natureza_valores'
  ) then
    alter table casos add constraint casos_natureza_valores
      check (natureza is null or natureza in ('concessao','revisao','acerto'));
  end if;
end $$;

comment on column casos.natureza is
  'Natureza do pedido: concessao | revisao | acerto (de cadastro/CNIS). Nulo = ainda não classificado.';

-- a carteira por natureza, que é a pergunta que a coluna existe para responder
create index if not exists casos_natureza_idx on casos (natureza) where natureza is not null;

-- conferência depois de rodar (deve devolver uma linha com data_type = text):
--   select column_name, data_type from information_schema.columns
--    where table_name = 'casos' and column_name = 'natureza';
