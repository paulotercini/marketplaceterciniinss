-- F189 · o rito sugerido pelos dados (crm/conducao.py grava; o app lê).
-- Coluna separada de casos.trilha, que continua exclusiva da equipe: uma
-- gravação da rotina nunca apaga a escolha manual, e a manual prevalece.
alter table casos add column if not exists conducao jsonb;
comment on column casos.conducao is
  'F189 · {v, ritos:{fase:{r, c (alta|media|baixa), por}}} gravado só por crm/conducao.py';
