-- F567 · Resumo do Caso: o que se busca no pedido, com cada período, lido da peça do escritório
-- (recurso ordinário ou especial no CRPS; petição inicial no Judicial e no Pagamento).
-- {texto, periodos, beneficio, der, tipo, fonte, faltas, avisos, autor, em, travado, versoes, proposta, recusou}
alter table public.casos add column if not exists resumo jsonb;
