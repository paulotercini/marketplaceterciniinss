-- ── F184 · O CONTEÚDO do andamento: a decisão, não só o aviso de que houve ──
-- A extensão baixa, na sessão logada do usuário, os documentos decisórios do
-- PJe, eproc, e-SAJ e CRPS (e todos os anexos do PAT) para o bucket privado
-- "anexos". A importação liga cada arquivo ao andamento e guarda o texto
-- extraído — é o texto que deixa o CRM dizer O QUE foi decidido.
--
-- Nada disso atravessa para o portal do cliente: os geradores não leem
-- `anexos`, e o bucket continua privado (URL assinada, que vence).
alter table anexos add column if not exists andamento_id uuid references andamentos(id) on delete set null;
alter table anexos add column if not exists origem    text;   -- pje | eproc | esaj | crps | pat
alter table anexos add column if not exists texto     text;   -- null = PDF digitalizado (sem OCR)

-- o mesmo documento do portal entra uma vez só: o caminho no bucket é
-- determinístico (extensao/docs-regras.js) e `caminho` já é unique
create index if not exists anexos_por_andamento on anexos (andamento_id) where andamento_id is not null;

-- F188 · as PÁGINAS que são imagem: o PDF escaneado com algumas folhas de
-- texto (o processo administrativo do INSS juntado no PJe) passava por "com
-- texto". A extração conta página por página; o PDF dos digitalizados leva só
-- as que não têm conteúdo (tarja de assinatura e "Página X de Y" não contam).
alter table anexos add column if not exists paginas int;              -- null = ainda não analisado
alter table anexos add column if not exists paginas_imagem int[];     -- números das páginas sem texto
