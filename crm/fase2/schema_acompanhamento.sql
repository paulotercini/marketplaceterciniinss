-- F68 · Acompanhamento Manual/Automático + registro da checagem
-- Rodar no SQL Editor do Supabase (idempotente).
alter table casos add column if not exists acompanhamento text;   -- 'manual' | 'automatico'
alter table casos add column if not exists checado_em timestamptz; -- última checagem manual
alter table casos add column if not exists checado_por uuid;       -- colaborador que checou
