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
-- o CRM usa. Se todas as linhas aparecerem (dezessete, num banco que tem a
-- tabela aposentadorias), está pronto — é só recarregar o CRM.
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
-- 'pje' entrou na onda do coletor do acervo do TRF3 (extensão 1.4.0)
alter table andamentos drop constraint if exists andamentos_origem_check;
alter table andamentos add constraint andamentos_origem_check
  check (origem in ('app','todo','dou','whatsapp','pat','crps','pje'));
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

-- ── 8. A fase "💡 Petições Iniciais" ──────────────────────────────────────
-- A lista existe no To Do, e o app, o migrar.py e o escrever_todo.py todos
-- conhecem a fase `peticao_inicial`. O banco não conhecia: a restrição de
-- `casos.fase` listava sete fases e essa ficou de fora.
--
-- O efeito era desproporcional ao tamanho do descuido. O PostgREST grava em
-- lotes de 500 e recusa o LOTE INTEIRO quando uma linha viola a restrição —
-- então UM cliente na lista de petições iniciais derrubava a gravação de
-- 2.953 casos, e com ela a sincronização diária inteira. Duas semanas de
-- andamentos do To Do pararam de chegar ao CRM por causa disto.
alter table casos drop constraint if exists casos_fase_check;
alter table casos add constraint casos_fase_check
  check (fase in ('escritorio','inss','conselho','judicial','pagamento',
                  'peticao_inicial','aposentadoria_futura','outro','encerrado'));

-- ── 9. Encerrar com autoria, arquivar por processo, adiar aposentadoria ───
-- encerrado_por: o botão "✔ Encerrar caso" do quadro de fatos registra QUEM
-- encerrou (encerrado_em já guardava o quando). Sem a coluna, o app grava o
-- encerramento sem a autoria — funciona, mas não responde "quem foi".
alter table casos add column if not exists encerrado_por uuid
  references colaboradores(id);

-- arquivados: arquivamento POR PROCESSO nas abas da ficha. Um caso pode ter
-- o recurso nº 1 morto e o nº 2 vivo, ou o 1º grau baixado e o TRF3 andando —
-- por isso é um mapa chave -> {por, em}: "pat" (requerimento no INSS),
-- "crps:<nup>" (cada recurso), "cnj:<instância>" (cada grau). A aba só se
-- diz arquivada quando todas as chaves dela estão no mapa.
alter table casos add column if not exists arquivados jsonb not null default '{}'::jsonb;

-- lembrar_em: adiar o aviso de "🎂 Aposentadorias a tratar". Escolhida a
-- data, o item sai do Meu Dia e só volta no dia combinado. `if exists`
-- porque a tabela aposentadorias nasceu em onda mais nova do schema.sql.
alter table if exists aposentadorias add column if not exists lembrar_em date;

-- lembrete_meses: primeira versão do aviso periódico, POR CASO (08.55).
-- Durou um dia: cliente com dois casos não dizia em qual morava o aviso.
-- A coluna fica (barata, e algum banco pode tê-la), mas a tela não usa
-- mais — o lugar disso é a aba 🔔 Lembretes, por CLIENTE, logo abaixo.
alter table casos add column if not exists lembrete_meses int;


-- ── 10. 🔔 Lembretes do cliente ───────────────────────────────────────────
-- A obrigação que não pertence a processo nenhum: pagar contribuição do
-- INSS, renovar CadÚnico, retomar contato daqui a tantos meses. Era o
-- segundo uso da lista 🙏 Aposentadorias Futuras no To Do — pessoas sem
-- pedido ativo que o escritório avisa de tempos em tempos.
--
-- `detalhes` (jsonb) guarda o que cada tipo pede — na contribuição, o
-- código GPS da categoria, o valor e o dia do vencimento, que é o que
-- monta a mensagem pronta de WhatsApp. `intervalo_meses` nulo = avisa uma
-- vez e desliga. O histórico fica em lembrete_avisos: QUEM avisou, QUANDO
-- e por qual canal — a resposta para "já avisamos a Marcela este mês?".
create table if not exists lembretes (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references clientes(id) on delete cascade,
  tipo           text not null default 'geral',
  titulo         text not null,
  detalhes       jsonb not null default '{}'::jsonb,
  intervalo_meses int,
  proximo_em     date,
  responsavel_id uuid references colaboradores(id),
  ativo          boolean not null default true,
  origem_caso    uuid,               -- caso de Aposentadorias Futuras que virou lembrete
  criado_por     uuid references colaboradores(id),
  criado_em      timestamptz not null default now()
);
create index if not exists lembretes_do_cliente on lembretes (cliente_id) where ativo;
create index if not exists lembretes_vencendo on lembretes (proximo_em) where ativo;
alter table lembretes enable row level security;
drop policy if exists lembretes_autenticados on lembretes;
create policy lembretes_autenticados on lembretes for all to authenticated
  using (true) with check (true);

create table if not exists lembrete_avisos (
  id             uuid primary key default gen_random_uuid(),
  lembrete_id    uuid not null references lembretes(id) on delete cascade,
  colaborador_id uuid references colaboradores(id),
  em             timestamptz not null default now(),
  canal          text,
  obs            text
);
create index if not exists avisos_do_lembrete on lembrete_avisos (lembrete_id, em desc);
alter table lembrete_avisos enable row level security;
drop policy if exists lembrete_avisos_autenticados on lembrete_avisos;
create policy lembrete_avisos_autenticados on lembrete_avisos for all to authenticated
  using (true) with check (true);


-- ── 11. O retrato do processo judicial ────────────────────────────────────
-- As duas perguntas que o Paulo faz de todo processo: é Mandado de
-- Segurança? corre no JEF ou no rito comum? E desde quando (ajuizamento)?
-- A classe responde as duas primeiras (MSCiv, PJEC, ProceComCiv…) e vem de
-- graça na coleta do PJe e no DataJud; a data vem do "Distribuído em".
-- As colunas guardam o que a coleta preencher (só onde estiver vazio) e o
-- que a equipe corrigir à mão pelo lápis da ficha.
alter table casos add column if not exists classe_judicial text;
alter table casos add column if not exists ajuizado_em date;
-- e ONDE o processo está (vara/turma/gabinete) — a linha do acervo do PJe
-- também traz isso de graça
alter table casos add column if not exists orgao_judicial text;
-- o link "abrir no PJe" (autos digitais, id+ca do acervo) — como o
-- processo_link do PAT: cada coleta o renova
alter table casos add column if not exists pje_link text;


-- ── 12. 💵 Pagamentos vindos do To Do (checklist = parcelas) ─────────────
-- Cada item do checklist da lista 💵 Pagamentos vira uma linha em
-- `pagamentos`; o id do item no Graph é a trava de dedupe (o upsert
-- atualiza a MESMA linha quando o item é concluído no To Do).
alter table pagamentos add column if not exists todo_item_id text;
create unique index if not exists pagamentos_todo_item
  on pagamentos (todo_item_id) where todo_item_id is not null;


-- ── 13. O dinheiro é do CLIENTE, não de um caso ──────────────────────────
-- Combinado com o Paulo: a lista 💵 Pagamentos do To Do é, no CRM, a ABA
-- Pagamentos da ficha do cliente — e não um caso ao lado do processo dele
-- (do mesmo jeito que 🙏 Aposentadorias Futuras é a aba 🔔 Lembretes).
-- Por isso a parcela passa a apontar para o cliente, e o caso vira opcional:
-- quem paga honorários nem sempre tem processo, e quem tem processo não
-- deve ganhar um "caso de pagamento" concorrendo com ele na ficha.
alter table pagamentos add column if not exists cliente_id uuid
  references clientes(id) on delete cascade;
alter table pagamentos alter column caso_id drop not null;
create index if not exists pagamentos_cliente on pagamentos (cliente_id);
-- as parcelas antigas nasceram presas ao caso: herdam dele o cliente, para a
-- aba passar a enxergar tudo pelo mesmo caminho
update pagamentos p set cliente_id = k.cliente_id
  from casos k where p.caso_id = k.id and p.cliente_id is null;


-- ── 14. Um caso, VÁRIOS processos judiciais ──────────────────────────────
-- O caso nasce de um ponto de partida (protocolo ou NB) e dali ramifica: um
-- mandado de segurança, depois a ação pelo rito comum, depois o recurso. Era
-- um número só por caso (`casos.processo`), e o segundo processo obrigava a
-- abrir um caso paralelo — que virava dois lugares para a mesma história.
--
-- `processos` é a lista: cada item {numero, rotulo, nosso, acompanhar}.
--   nosso=false   -> processo do cliente que NÃO é do escritório (vem de
--                    outro advogado), mas interessa acompanhar
--   acompanhar=false -> arquivado da vista, sem apagar o histórico
-- `casos.processo` continua sendo o PRINCIPAL: é por ele que o DataJud
-- consulta, que a busca acha e que o coletor do PJe casa.
alter table casos add column if not exists processos jsonb not null default '[]'::jsonb;
-- o andamento oficial de CADA número: mapa "<20 dígitos>" -> mesmo formato de
-- `datajud`. O `datajud` segue existindo, com o do processo principal.
alter table casos add column if not exists datajud_multi jsonb;
-- quem já tinha um processo gravado entra na lista com ele
update casos set processos = jsonb_build_array(
    jsonb_build_object('numero', processo, 'nosso', true, 'acompanhar', true))
  where coalesce(processo,'') <> '' and processos = '[]'::jsonb;


-- ── 15. Ficha civil do cliente (o que os documentos pedem) ───────────────
-- Procuração, contrato, declaração de pobreza e termo de representação são
-- gerados a partir daqui: sem RG, estado civil, profissão e endereço em
-- pedaços (logradouro, bairro, cidade, UF, CEP), a peça sai com lacuna e
-- alguém preenche à mão — que é justamente o trabalho que o CRM tira.
alter table clientes add column if not exists rg text;
alter table clientes add column if not exists sexo text;            -- 'F' | 'M'
alter table clientes add column if not exists profissao text;
alter table clientes add column if not exists estado_civil text;    -- solteiro|casado|uniao|viuvo|divorciado
alter table clientes add column if not exists bairro text;
alter table clientes add column if not exists cidade text;
alter table clientes add column if not exists uf text;
alter table clientes add column if not exists cep text;
-- o cliente costuma dar o telefone dele, o do filho e o do trabalho: a
-- coluna `telefone` segue sendo o principal (é dela que o WhatsApp sai)
alter table clientes add column if not exists telefones jsonb not null default '[]'::jsonb;
-- quem indicou / parente que já é cliente: o vínculo vale para achar a
-- família toda e para saber de onde veio o atendimento
alter table clientes add column if not exists indicado_por text;


-- ── conferência ───────────────────────────────────────────────────────────
-- Lista as colunas que o CRM e a importação usam, mais a tabela `coletas` e
-- a restrição de fase. Faltando alguma linha, o SQL não rodou inteiro — e é
-- justamente a que falta que derruba a tela ou a importação.
select table_name as tabela, column_name as coluna, data_type as tipo
  from information_schema.columns
 where (table_name = 'casos' and column_name in ('marcadores','ronda','processo_link',
          'situacao_inss','especie','der','urgente','protocolos','crps_nups','crps',
          'encerrado_por','arquivados','lembrete_meses','classe_judicial','ajuizado_em',
          'orgao_judicial','pje_link'))
    or (table_name = 'andamentos' and column_name in ('responde_a','origem_id'))
    or (table_name = 'pagamentos' and column_name = 'todo_item_id')
    or (table_name = 'aposentadorias' and column_name = 'lembrar_em')
union all
select 'coletas', 'tabela criada', ''
  from information_schema.tables where table_name = 'coletas'
union all
select 'lembretes', 'tabela criada', ''
  from information_schema.tables where table_name = 'lembretes'
union all
select 'lembrete_avisos', 'tabela criada', ''
  from information_schema.tables where table_name = 'lembrete_avisos'
union all
select 'casos', 'fase aceita peticao_inicial', ''
  from pg_constraint
 where conname = 'casos_fase_check'
   and pg_get_constraintdef(oid) like '%peticao_inicial%'
 order by 1, 2;
