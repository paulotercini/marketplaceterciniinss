-- ══════════════════════════════════════════════════════════════════════════
-- CRM Tercini — PÔR O BANCO EM DIA
--
-- Cole isto inteiro no SQL Editor do Supabase e execute. Leva segundos.
--
-- É o remendo mínimo: só acrescenta colunas e índices, todos com
-- `if not exists`. NÃO cria tabela, NÃO apaga linha nenhuma e NÃO regrava
-- conteúdo. O que já existe é ignorado em silêncio; o que falta é criado.
-- Rodar duas vezes dá no mesmo que rodar uma.
--
-- Mexe em duas tabelas apenas — casos e andamentos —, que o CRM já usa em
-- toda tela. Por isso não há risco de o script parar no meio por causa de
-- alguma tabela ausente.
--
-- É ISTO que faltava para os marcadores do pedido (Rural, Especial,
-- Deficiência…) gravarem: enquanto casos.marcadores não existir aqui, o
-- botão não tem onde guardar a marcação, o banco recusa e o CRM avisa.
--
-- Depois de executar, role até o fim: a última consulta lista as quatro
-- colunas. Se as quatro aparecerem, está pronto — é só recarregar o CRM.
-- ══════════════════════════════════════════════════════════════════════════


-- ── 1. O que estamos pedindo, de fato ─────────────────────────────────────
-- "B42 — aposentadoria por tempo de contribuição" é o que o INSS registra, e
-- não diz nada para quem trabalha com isso o dia inteiro. Debaixo do mesmo
-- B42 o escritório pede reconhecimento de tempo rural, de tempo especial,
-- redução por deficiência — e com frequência mais de um ao mesmo tempo.
--
-- Por que uma LISTA e não uma sub-espécie: porque eles se somam. Rural +
-- especial existe; rural + especial + deficiência existe. Uma lista fechada
-- precisaria de um item para cada combinação (quinze só com quatro
-- marcadores) e ainda erraria na décima sexta.
--
-- Não substitui a espécie: o B42 continua B42. Muda o que a ficha diz de
-- relance, e o que o checklist pede de documento.
alter table casos add column if not exists marcadores jsonb not null default '[]'::jsonb;
create index if not exists casos_marcadores on casos using gin (marcadores);


-- ── 2. A conclusão da tarefa vira RESPOSTA do comentário que a pediu ──────
-- Antes, "✔ Cumpri a exigência" nascia como comentário solto no topo da
-- ficha. Num processo com três tarefas abertas, ninguém sabia de qual delas
-- era aquele "feito" — a conclusão perdia o assunto pelo caminho.
--
-- `on delete set null`, não cascade: apagar o comentário que PEDIU não pode
-- apagar o "feito" de quem cumpriu. Sem o pai, a resposta volta a ser
-- comentário de primeiro nível, e a tela já sabe mostrar assim.
alter table andamentos add column if not exists responde_a uuid
  references andamentos(id) on delete set null;
create index if not exists andamentos_resposta on andamentos (responde_a)
  where responde_a is not null;


-- ── 3. Endereço do processo no tribunal ───────────────────────────────────
-- processo_link guarda o endereço direto do processo no PJe ou no e-SAJ,
-- para abrir um caso específico sem procurar pelo número.
--
-- casos.ronda fica reservado para marcação por processo. A tela NÃO usa hoje
-- (a ronda por processo foi descartada: era atrito demais). A coluna entra
-- porque é barata e mantém o banco igual ao schema.sql — não tem efeito
-- nenhum sobre o que você vê.
alter table casos add column if not exists ronda jsonb not null default '{}'::jsonb;
alter table casos add column if not exists processo_link text;


-- ── conferência ───────────────────────────────────────────────────────────
-- Devem aparecer QUATRO linhas. Se aparecerem, recarregue o CRM e os
-- marcadores passam a gravar.
select table_name as tabela, column_name as coluna, data_type as tipo
  from information_schema.columns
 where (table_name = 'casos'      and column_name in ('marcadores','ronda','processo_link'))
    or (table_name = 'andamentos' and column_name = 'responde_a')
 order by table_name, column_name;
