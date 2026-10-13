-- F218 · O CARD DA APOSENTADORIA FUTURA
-- O que o CRM grava no card (etapa, data provável do direito, pré-caso e
-- análise ligados, motivo do arquivamento) vive nesta coluna, e NÃO em
-- `detalhes`: a sincronização com o To Do (crm/fase2/migrar.py) substitui
-- `detalhes` inteiro a cada rodada e não envia `crm`, que por isso sobrevive.
alter table lembretes add column if not exists crm jsonb not null default '{}'::jsonb;
