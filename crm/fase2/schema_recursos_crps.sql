-- F58 (versão 09.57) · Datas dos protocolos recursais no CRPS
-- Rode no SQL Editor do Supabase. Sem estas colunas, editar as datas do
-- Recurso Ordinário / Embargos / Recurso Especial no cartão do caso não grava.
alter table casos add column if not exists ro_protocolado_em date;
alter table casos add column if not exists ed_protocolado_em date;
alter table casos add column if not exists re_protocolado_em date;
