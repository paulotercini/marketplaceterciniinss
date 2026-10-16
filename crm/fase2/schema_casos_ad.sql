-- F231 · A ESCOLHA DA ANÁLISE DE DIREITO MORA NO PRÉ-CASO
-- (crm/fase2/docs/PRIMEIRO-ATENDIMENTO-QUADROS.md, "Onde mora a escolha")
-- O que o atendimento decide sobre o benefício (os itens do Primeiro atendimento
-- deixados de fora, os benefícios escolhidos, os campos e os tempos) vai para a
-- linha do pré-caso, e não mais para clientes.campos.ad_modulos: dois atendimentos
-- do mesmo cliente não se misturam, e a linha leva a escolha quando vira caso.
-- Coluna própria, fora de `precaso`, para o PATCH com atraso não brigar com quem
-- grava etapas, desfecho e fase. A sincronização (migrar.py) não envia a coluna.
--   {fora:[chaves], beneficios:{familia:[opção]}, valores:{campo:valor}, tempos:[…]}
alter table casos add column if not exists ad jsonb;
