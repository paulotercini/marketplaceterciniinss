-- F226 · O PRÉ-CASO DENTRO DE CASOS (onda 1 de crm/fase2/docs/PRE-CASOS.md)
-- Cada benefício que o cliente busca no escritório é uma linha de `casos`
-- na fase Escritório com pre_caso = true. Gerar o caso é mudar a fase da
-- mesma linha (pre_caso = false); arquivar e mandar a Aposentadorias futuras
-- encerram a linha. O que era o objeto de clientes.campos.precasos (natureza,
-- marcadores, honorários, via, código, etapas, desfecho, lembrete ligado)
-- vive em `precaso`; a espécie vai em `beneficio`.
-- A sincronização (migrar.py) não envia estas colunas, que sobrevivem ao upsert.
alter table casos add column if not exists pre_caso boolean not null default false;
alter table casos add column if not exists precaso jsonb;
