-- F174 · campos estruturados da Análise de Direito (serviço, tempo, carência,
-- valor, data do direito, recolhimento, DID, grau, períodos, planejamento).
-- Aditiva: sem ela o CRM grava a análise sem os detalhes.
alter table analises_direito add column if not exists detalhes jsonb not null default '{}'::jsonb;
