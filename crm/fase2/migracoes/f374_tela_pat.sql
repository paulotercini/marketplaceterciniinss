-- F374 · a tela do PAT na aba INSS: o requerimento como o portal mostra,
-- por protocolo ({"<protocolo>": {status, nomeServico, comentarios, anexos,
-- agendamentos, ...}}), gravado pelo CRM ao aplicar a coleta do INSS
-- (blocoPat em app.html). Aplicada em 02.11.2026; o caso ganha a tela na
-- primeira importação do PAT que trouxer o protocolo.
alter table casos add column if not exists pat jsonb;
