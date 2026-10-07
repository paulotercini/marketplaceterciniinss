-- F183 · a trilha por fase e rito (marcas por etapa: estado, data e detalhe)
alter table casos add column if not exists trilha jsonb;
