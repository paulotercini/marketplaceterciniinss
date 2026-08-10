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
-- Mexe em casos e andamentos, que o CRM já usa em toda tela, e cria a tabela
-- `coletas` se ela ainda não existir. Por isso não há risco de o script
-- parar no meio por causa de alguma tabela ausente.
--
-- É ISTO que faltava para os marcadores do pedido (Rural, Especial,
-- Deficiência…) gravarem: enquanto casos.marcadores não existir aqui, o
-- botão não tem onde guardar a marcação, o banco recusa e o CRM avisa.
--
-- Depois de executar, role até o fim: a última consulta lista as colunas que
-- a importação usa. Se as treze linhas aparecerem, está pronto — é só
-- recarregar o CRM.
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



-- ── 4. A situação do requerimento no INSS (importação do PAT/GERID) ───────
-- É a MEMÓRIA da última importação, e serve para saber o que MUDOU. Sem ela,
-- a importação diária ou não avisa nada, ou escreve "Em análise" todo dia na
-- ficha de cem clientes — o mesmo ruído que o sistema nasceu para acabar.
alter table casos add column if not exists situacao_inss text;


-- ── 5. A fila das coletas (extensão do navegador) ─────────────────────────
-- A extensão coleta e ENTREGA; quem decide continua sendo a tela do CRM.
-- Cada rodada vira uma linha aqui, e a tela 📥 Importar lê a fila em vez de
-- você baixar e soltar arquivo.
create table if not exists coletas (
  id          uuid primary key default gen_random_uuid(),
  fonte       text not null,
  dados       jsonb not null,
  criado_em   timestamptz not null default now(),
  aplicada_em timestamptz
);
create index if not exists coletas_pendentes on coletas (fonte, criado_em desc)
  where aplicada_em is null;
alter table coletas enable row level security;
-- Uma coleta do PAT carrega nome, protocolo e comentário de dezenas de
-- clientes. A política antiga (`for all using (true)`, sem papel) valia também
-- para a chave anônima, que é justamente a que fica visível no app.html — ou
-- seja, quem tivesse a chave lia a fila inteira. Agora é só para quem entrou.
--
-- ISTO EXIGE A EXTENSÃO 1.1.0 OU MAIS NOVA: da 1.0.x, que entregava com a
-- chave anônima, a gravação passa a ser recusada com 401. Aplique os dois
-- juntos.
drop policy if exists coletas_tudo on coletas;
drop policy if exists coletas_autenticados on coletas;
create policy coletas_autenticados on coletas for all to authenticated
  using (true) with check (true);


-- ── 6. De onde veio o andamento, e qual é ele lá na origem ────────────────
-- `origem` ganha 'pat' e 'crps' — é por ele que a lista 📣 Novidades separa
-- o que os portais trouxeram do que a equipe digitou.
--
-- `origem_id` é a chave do item na origem (o id do comentário no PAT). A
-- importação roda TODO DIA e o portal devolve sempre a lista inteira: sem
-- esta coluna, os mesmos comentários virariam andamento novo a cada manhã, e
-- em uma semana a ficha teria sete cópias de cada um. O índice único é o que
-- garante isso mesmo se algo for aplicado duas vezes.
alter table andamentos drop constraint if exists andamentos_origem_check;
alter table andamentos add constraint andamentos_origem_check
  check (origem in ('app','todo','dou','whatsapp','pat','crps'));
alter table andamentos add column if not exists origem_id text;
create unique index if not exists andamentos_origem_unica
  on andamentos (caso_id, origem, origem_id) where origem_id is not null;

-- ── 7. Os campos que a importação do PAT escreve ──────────────────────────
-- Estes vieram do schema.sql em outras ondas, e um banco que ficou para trás
-- em qualquer uma delas faz a importação parar com "O banco está
-- desatualizado" — o PostgREST recusa a gravação inteira quando UMA coluna
-- não existe. Aqui eles vão junto, para o patch bastar sozinho.
alter table casos add column if not exists especie text;        -- B31, B41, B87…
alter table casos add column if not exists der date;            -- entrada do requerimento
alter table casos add column if not exists urgente boolean not null default false;
alter table casos add column if not exists protocolos jsonb not null default '[]';
alter table casos add column if not exists crps_nups jsonb not null default '[]';
alter table casos add column if not exists crps jsonb;

-- ── conferência ───────────────────────────────────────────────────────────
-- Devem aparecer TREZE linhas: as colunas de `casos` e `andamentos` que a
-- importação usa, e a tabela `coletas`. Faltando alguma, o SQL não rodou
-- inteiro — e é justamente a que falta que derruba a importação.
select table_name as tabela, column_name as coluna, data_type as tipo
  from information_schema.columns
 where (table_name = 'casos' and column_name in ('marcadores','ronda','processo_link',
          'situacao_inss','especie','der','urgente','protocolos','crps_nups','crps'))
    or (table_name = 'andamentos' and column_name in ('responde_a','origem_id'))
union all
select 'coletas', 'tabela criada', ''
  from information_schema.tables where table_name = 'coletas'
 order by 1, 2;
