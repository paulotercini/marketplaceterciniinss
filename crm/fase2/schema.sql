-- CRM Tercini — Fase 2: banco (Supabase/PostgreSQL)
-- Rodar UMA vez no SQL Editor do projeto Supabase (ver COMO-INSTALAR.md).
-- Idempotente: pode ser re-executado sem perder dados.

create extension if not exists pgcrypto;

-- ── Colaboradores ─────────────────────────────────────────────────────────
-- auth_id liga ao usuário de login (auth.users). Preenchido na instalação.
create table if not exists colaboradores (
  id       uuid primary key default gen_random_uuid(),
  auth_id  uuid unique,
  inicial  text not null unique,          -- P, A, M, D, I, C (Claude)
  nome     text not null,
  cor      text not null default '#2564cf',
  papel    text not null default 'colaborador',  -- admin | colaborador
  ativo    boolean not null default true
);

-- ── Clientes ──────────────────────────────────────────────────────────────
create table if not exists clientes (
  id        uuid primary key default gen_random_uuid(),
  cpf       text unique,                  -- 11 dígitos; nulo p/ contatos sem CPF
  nome      text not null,
  dn        text,                         -- DDMMAAAA (alimenta o hash do portal)
  telefone  text,
  endereco  text,
  campos    jsonb not null default '{}'::jsonb,  -- campos personalizados
  criado_em timestamptz not null default now()
);
create index if not exists clientes_nome on clientes (nome);

-- Senhas (Meu INSS, gov.br...) fora da tabela principal, com log de acesso.
create table if not exists credenciais (
  id         uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  tipo       text not null,               -- meu_inss | gov_br | outro
  valor      text not null,
  criado_em  timestamptz not null default now()
);
create table if not exists credencial_vis (
  credencial_id  uuid not null references credenciais(id) on delete cascade,
  colaborador_id uuid not null references colaboradores(id),
  visto_em       timestamptz not null default now()
);

-- ── Casos (um cliente pode ter vários) ────────────────────────────────────
-- fase substitui as listas do To Do; 'pagamento' NÃO é lista na tela — o
-- recebimento vive dentro do caso (pedido do escritório, ago/2026).
create table if not exists casos (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references clientes(id) on delete cascade,
  titulo       text not null,
  beneficio    text,
  fase         text not null default 'escritorio'
               check (fase in ('escritorio','inss','conselho','judicial',
                               'pagamento','aposentadoria_futura','outro','encerrado')),
  nb           text,
  processo     text,
  prazo        date,
  importante   boolean not null default false,
  resultado    text,                      -- deferido | indeferido | acordo | ...
  origem_lista text,                      -- lista do To Do de onde veio (migração)
  todo_task_id text unique,               -- para a escrita de volta no To Do
  todo_list_id text,
  criado_em    timestamptz not null default now(),
  encerrado_em timestamptz
);
create index if not exists casos_cliente on casos (cliente_id);
create index if not exists casos_fase on casos (fase);

-- ── Andamentos (autor + data automáticos) ─────────────────────────────────
create table if not exists andamentos (
  id        uuid primary key default gen_random_uuid(),
  caso_id   uuid not null references casos(id) on delete cascade,
  autor_id  uuid references colaboradores(id),   -- nulo = bloco antigo sem inicial
  criado_em timestamptz not null default now(),
  texto     text not null,
  publico   boolean not null default false,      -- só true vai ao portal (Fase 3)
  origem    text not null default 'app'          -- app | todo | dou
            check (origem in ('app','todo','dou')),
  todo_sync boolean not null default false       -- já replicado no To Do?
);
create index if not exists andamentos_caso on andamentos (caso_id, criado_em desc);
create index if not exists andamentos_fila on andamentos (todo_sync) where origem = 'app';
-- Dedupe da importação To Do -> banco: migrar.py gera ids determinísticos
-- (UUID5 de caso+data+texto), então re-importar nunca duplica.

-- ── Perícias, audiências, avaliações ──────────────────────────────────────
create table if not exists eventos (
  id        uuid primary key default gen_random_uuid(),
  caso_id   uuid not null references casos(id) on delete cascade,
  tipo      text not null,               -- Perícia | Audiência | Avaliação social
  data_hora timestamptz not null,
  local     text,
  status    text not null default 'agendada',   -- agendada | realizada | cancelada
  obs       text
);
create index if not exists eventos_data on eventos (data_hora);
create unique index if not exists eventos_dedupe on eventos (caso_id, tipo, data_hora);

-- ── Pagamentos: DENTRO do caso ────────────────────────────────────────────
create table if not exists pagamentos (
  id         uuid primary key default gen_random_uuid(),
  caso_id    uuid not null references casos(id) on delete cascade,
  descricao  text not null,              -- honorários, RPV, precatório, parcela...
  valor      numeric(14,2),
  vencimento date,
  status     text not null default 'aberto',    -- aberto | recebido | cancelado
  pago_em    date
);
create index if not exists pagamentos_caso on pagamentos (caso_id);

-- Cadeia de conferência do dinheiro recebido: quem recebeu e quem conferiu,
-- em ordem, cada um com data/hora. [{"c": colaborador_id, "em": timestamptz}]
-- O primeiro da lista é quem recebeu; os seguintes conferiram.
alter table pagamentos add column if not exists conferencias jsonb not null default '[]';

-- ── Tarefas soltas (com prazo) e particulares ─────────────────────────────
-- particular_de preenchido = tarefa pessoal: só o dono vê (RLS abaixo).
create table if not exists tarefas (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid references clientes(id) on delete cascade,
  caso_id       uuid references casos(id) on delete cascade,
  titulo        text not null,
  prazo         date,
  concluida     boolean not null default false,
  concluida_em  timestamptz,
  particular_de uuid references colaboradores(id),
  criado_em     timestamptz not null default now()
);
create index if not exists tarefas_prazo on tarefas (prazo) where not concluida;

-- ── Atribuições: N colaboradores por caso ─────────────────────────────────
create table if not exists atribuicoes (
  caso_id        uuid not null references casos(id) on delete cascade,
  colaborador_id uuid not null references colaboradores(id) on delete cascade,
  primary key (caso_id, colaborador_id)
);

-- ── Meu Dia: por colaborador, por dia ─────────────────────────────────────
create table if not exists meu_dia (
  id             uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references colaboradores(id) on delete cascade,
  caso_id        uuid references casos(id) on delete cascade,
  tarefa_id      uuid references tarefas(id) on delete cascade,
  dia            date not null default (now() at time zone 'America/Sao_Paulo')::date,
  check (caso_id is not null or tarefa_id is not null)
);
-- um item só uma vez por colaborador/dia (o app ignora o 409 de duplicata)
create unique index if not exists meu_dia_unico on meu_dia
  (colaborador_id, dia, coalesce(caso_id, '00000000-0000-0000-0000-000000000000'),
                        coalesce(tarefa_id, '00000000-0000-0000-0000-000000000000'));

-- ── Exigências do INSS (prazo legal de 30 dias) ───────────────────────────
-- Marcada no caso: enquanto exigencia_prazo estiver preenchido, o caso está
-- "em exigência" e o app mostra a contagem regressiva dos 30 dias.
alter table casos add column if not exists exigencia_prazo date;
alter table casos add column if not exists exigencia_descricao text;

-- Urgente (🔥) convive com importante (⭐): urgente ordena primeiro em toda lista
alter table casos add column if not exists urgente boolean not null default false;

-- Parceria com advogado externo (#Laís, #JoãoEduardo no título do To Do)
alter table casos add column if not exists parceria text;

-- Mover de lista pedido no app (botão direito → "Mover para…"):
-- escrever_todo.py recria a tarefa na lista nova do To Do (o Graph não tem
-- "mover"), apaga a antiga, atualiza todo_task_id/origem_lista e limpa isto.
alter table casos add column if not exists mover_para text;

-- Protocolos do INSS citados nos andamentos ("protocolo 210987654321").
-- Extraídos automaticamente; a pesquisa encontra o cliente pelo número —
-- útil quando o INSS avisa só "concluído o protocolo X" sem outros dados.
alter table casos add column if not exists protocolos jsonb not null default '[]';

-- ── Vínculos entre clientes (parentes/amigos — o antigo checklist do To Do)
create table if not exists vinculos (
  id         uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  ligado_a   uuid not null references clientes(id) on delete cascade,
  relacao    text,                                  -- "esposa", "irmão", "amigo indicou"...
  unique (cliente_id, ligado_a)
);
create index if not exists vinculos_ligado on vinculos (ligado_a);

-- ── Frases prontas dos andamentos (os padrões que a equipe sempre escreve)
create table if not exists frases_prontas (
  id    uuid primary key default gen_random_uuid(),
  texto text not null unique
);
insert into frases_prontas (texto) values
  ('Perícia médica agendada no dia __/__/____ às __:__ no INSS de ____.'),
  ('Perícia judicial agendada no dia __/__/____ às __:__ em ____.'),
  ('Audiência agendada no dia __/__/____ às __:__ .'),
  ('Avaliação social agendada no dia __/__/____ às __:__ no INSS de ____.'),
  ('Exigência do INSS: apresentar ____ até __/__/____.'),
  ('Requerimento protocolado. Protocolo nº ____.'),
  ('Recurso protocolado. Protocolo nº ____.'),
  ('Benefício concedido. 🎉'),
  ('Benefício indeferido. Motivo: ____.'),
  ('Cliente orientado por telefone sobre ____.'),
  ('Documentos recebidos do cliente: ____.')
on conflict (texto) do nothing;

-- ── Modelos de mensagem (copiar e mandar ao cliente) ──────────────────────
-- Espaços reservados preenchidos pelo app: {nome} {primeiro_nome} {data}
-- {hora} {local} {prazo}
create table if not exists modelos_mensagem (
  id        uuid primary key default gen_random_uuid(),
  titulo    text not null unique,
  texto     text not null,
  contexto  text not null default 'geral'   -- pericia | audiencia | exigencia | geral
);

insert into modelos_mensagem (titulo, contexto, texto) values
  ('Lembrete de perícia', 'pericia',
   'Olá, {primeiro_nome}! Tudo bem? Passando para lembrar da sua perícia do INSS: dia {data}, às {hora}, em {local}. Chegue uns 30 minutos antes e leve um documento com foto e todos os exames, laudos e receitas médicas que tiver, mesmo os antigos. Qualquer dúvida é só chamar por aqui. — Escritório Paulo R. Tercini Filho'),
  ('Lembrete de audiência', 'audiencia',
   'Olá, {primeiro_nome}! Lembrando da sua audiência: dia {data}, às {hora}, em {local}. Chegue com antecedência e traga documento com foto. Se tiver qualquer imprevisto, nos avise o quanto antes. — Escritório Paulo R. Tercini Filho'),
  ('Exigência do INSS', 'exigencia',
   'Olá, {primeiro_nome}! O INSS pediu uma providência no seu processo (chama-se exigência) e temos até {prazo} para cumprir. Precisamos da sua ajuda com o seguinte: '),
  ('Solicitação de documentos', 'geral',
   'Olá, {primeiro_nome}! Para dar andamento ao seu processo, precisamos que nos envie: . Pode mandar foto por aqui mesmo, desde que esteja legível. Obrigado!'),
  ('Benefício deferido', 'geral',
   'Olá, {primeiro_nome}! Temos uma ótima notícia: seu benefício foi CONCEDIDO! 🎉 Em breve entraremos em contato para explicar os próximos passos e os valores. Parabéns pela conquista!'),
  ('Boas-vindas (novo cliente)', 'geral',
   'Olá, {primeiro_nome}! Seja bem-vindo(a) ao escritório Paulo R. Tercini Filho. Seu caso já está registrado em nosso sistema e vamos te manter informado(a) de cada andamento por aqui. Qualquer dúvida, é só chamar.')
on conflict (titulo) do nothing;

-- ── Sugestões do Claude (automação com aprovação humana) ──────────────────
-- A rotina diária grava aqui; a equipe aceita/descarta na visão 🤖 do app.
create table if not exists sugestoes (
  id         uuid primary key default gen_random_uuid(),
  caso_id    uuid references casos(id) on delete cascade,
  tipo       text not null,          -- exigencia | prazo | pericia | proximo_passo | mensagem
  titulo     text not null,
  texto      text not null,          -- o que o Claude sugere (andamento, mensagem, alerta)
  dados      jsonb not null default '{}'::jsonb,   -- ex.: {"exigencia_prazo": "2026-09-01"}
  criado_em  timestamptz not null default now(),
  status     text not null default 'pendente'      -- pendente | aceita | descartada
             check (status in ('pendente','aceita','descartada')),
  decidido_por uuid references colaboradores(id),
  decidido_em  timestamptz
);
create index if not exists sugestoes_pend on sugestoes (status) where status = 'pendente';

-- ── Menções (@Nome dentro de um andamento -> pendência na caixa de entrada) ─
create table if not exists mencoes (
  id           uuid primary key default gen_random_uuid(),
  de_id        uuid references colaboradores(id),
  para_id      uuid not null references colaboradores(id),
  caso_id      uuid references casos(id) on delete cascade,
  andamento_id uuid references andamentos(id) on delete cascade,
  texto        text not null,
  criado_em    timestamptz not null default now(),
  lida_em      timestamptz
);
create index if not exists mencoes_caixa on mencoes (para_id) where lida_em is null;

-- ── Vendas: funil de prospectos (leads) ───────────────────────────────────
-- Etapas: novo -> atendimento -> viabilidade -> proposta -> fechado | perdido.
-- Ao fechar, vira cliente + caso (cliente_id preenchido).
create table if not exists leads (
  id                 uuid primary key default gen_random_uuid(),
  nome               text not null,
  telefone           text,
  beneficio_interesse text,
  origem             text,          -- indicação | site | redes sociais | anúncio | outro
  etapa              text not null default 'novo'
                     check (etapa in ('novo','atendimento','viabilidade','proposta','fechado','perdido')),
  obs                text,
  motivo_perda       text,
  responsavel_id     uuid references colaboradores(id),
  cliente_id         uuid references clientes(id),
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now()
);
create index if not exists leads_etapa on leads (etapa);

-- ── Documentos por benefício (carta para o cliente providenciar) ──────────
-- Conteúdo editável no app; espelhar/atualizar com o texto do site interno
-- (advprevidenciaria.netlify.app). {itens} são uma linha por documento.
create table if not exists documentos_beneficio (
  id        uuid primary key default gen_random_uuid(),
  beneficio text not null unique,   -- mesmo nome usado nos casos
  itens     text not null,          -- um documento por linha
  observacoes text
);

insert into documentos_beneficio (beneficio, itens, observacoes) values
  ('Apos. por Idade', E'RG e CPF (ou CNH)\nComprovante de residência atualizado\nCarteiras de trabalho (todas, inclusive antigas)\nCarnês de contribuição (se houver)\nExtrato CNIS (nós emitimos, se preferir)\nSenha do Meu INSS (gov.br)', null),
  ('Rural', E'RG e CPF (ou CNH)\nComprovante de residência\nCertidão de casamento (profissão lavrador, se constar)\nContratos de arrendamento, parceria ou comodato rural\nNotas fiscais de venda de produção rural\nDeclaração de sindicato rural (se houver)\nDocumentos da terra (ITR, CCIR, escritura)\nCertidões antigas que citem profissão de lavrador (nascimento dos filhos, alistamento militar, escola)', 'Documentos em nome dos pais também servem para o período em regime de economia familiar.'),
  ('Apos. Tempo de Contribuição', E'RG e CPF (ou CNH)\nComprovante de residência\nCarteiras de trabalho (todas)\nCarnês de contribuição\nPPP e LTCAT de empresas com agentes nocivos (se houver)\nCertidão de tempo de serviço público (se houver)', null),
  ('Apos. Especial', E'RG e CPF (ou CNH)\nComprovante de residência\nCarteiras de trabalho (todas)\nPPP (Perfil Profissiográfico Previdenciário) de cada empresa\nLTCAT ou laudos técnicos das empresas\nFichas de EPI (se a empresa fornecer)', 'O PPP deve ser pedido no RH da empresa; ex-empresas também são obrigadas a fornecer.'),
  ('Aux. Incapacidade Temporária', E'RG e CPF (ou CNH)\nComprovante de residência\nCarteira de trabalho\nAtestados e relatórios médicos com CID, assinatura e carimbo\nExames recentes (laudos, imagens)\nReceitas dos remédios em uso\nDeclaração do afastamento da empresa (se empregado)', 'Relatório médico recente (menos de 90 dias) faz muita diferença na perícia.'),
  ('Apos. por Incapacidade Permanente', E'RG e CPF (ou CNH)\nComprovante de residência\nCarteira de trabalho\nTodos os relatórios e atestados médicos, do início do problema até hoje\nExames e laudos (inclusive antigos)\nReceitas e comprovantes de tratamento', null),
  ('BPC/LOAS', E'RG e CPF de TODOS que moram na casa\nCertidão de nascimento ou casamento\nComprovante de residência\nComprovantes de renda de todos da casa (ou declaração de que não têm renda)\nCadÚnico atualizado (CRAS)\nRelatórios médicos com CID (no caso de deficiência)\nLaudos e exames', 'O CadÚnico precisa estar atualizado há menos de 2 anos — atualiza no CRAS da cidade.'),
  ('Pensão por Morte', E'RG e CPF do falecido e do requerente\nCertidão de óbito\nCertidão de casamento (atualizada) ou provas da união estável\nComprovante de residência do casal (contas no mesmo endereço, fotos, declarações)\nCertidão de nascimento dos filhos menores\nCarteira de trabalho do falecido', 'Para união estável: quanto mais provas do casal junto (contas, fotos, plano de saúde), melhor.'),
  ('Salário-Maternidade', E'RG e CPF\nCertidão de nascimento do bebê\nCarteira de trabalho\nComprovante de residência\nPara rural: documentos da atividade rural (notas, contratos, sindicato)', null),
  ('Aux. Acidente', E'RG e CPF\nCarteira de trabalho\nCAT (Comunicação de Acidente de Trabalho), se houver\nRelatórios médicos sobre a sequela\nExames de antes e depois do acidente', null),
  ('Acerto de CNIS', E'RG e CPF\nCarteiras de trabalho (todas)\nCarnês de contribuição\nContracheques ou recibos antigos\nContratos de trabalho, rescisões, extratos do FGTS', null),
  ('Revisão', E'Carta de concessão do benefício\nRG e CPF\nCarteiras de trabalho\nDocumentos do período que faltou ser contado (PPP, certidões, carnês)', null)
on conflict (beneficio) do nothing;

-- ── Checklist-modelo por benefício (workflow padronizado) ─────────────────
-- Um item por linha; caso novo do benefício já nasce com estas subtarefas.
create table if not exists checklist_modelo (
  id        uuid primary key default gen_random_uuid(),
  beneficio text not null unique,
  itens     text not null
);

insert into checklist_modelo (beneficio, itens) values
  ('Apos. por Idade', E'Procuração e contrato assinados\nSenha gov.br/Meu INSS cadastrada\nCNIS emitido e conferido\nCarteiras de trabalho digitalizadas\nRequerimento protocolado no Meu INSS\nAcompanhar análise e possíveis exigências'),
  ('Rural', E'Procuração e contrato assinados\nDocumentos rurais reunidos e digitalizados\nCertidões que citem profissão de lavrador\nAutodeclaração rural preenchida\nCNIS conferido\nRequerimento protocolado\nPreparar cliente para entrevista rural'),
  ('Apos. Tempo de Contribuição', E'Procuração e contrato assinados\nCNIS emitido e conferido\nCarteiras digitalizadas\nVerificar períodos faltantes no CNIS\nSimulação de tempo/valor feita\nRequerimento protocolado'),
  ('Apos. Especial', E'Procuração e contrato assinados\nPPP solicitado a cada empresa\nLTCAT/laudos recebidos\nCNIS conferido\nRequerimento protocolado'),
  ('Aux. Incapacidade Temporária', E'Procuração e contrato assinados\nRelatórios e exames médicos digitalizados\nRelatório médico recente (menos de 90 dias)\nRequerimento protocolado\nPerícia agendada e cliente avisado\nResultado da perícia conferido'),
  ('BPC/LOAS', E'Procuração e contrato assinados\nCadÚnico atualizado no CRAS\nDocumentos de todos do grupo familiar\nRelatórios médicos com CID (se deficiência)\nRequerimento protocolado\nAvaliação social e perícia acompanhadas'),
  ('Pensão por Morte', E'Procuração e contrato assinados\nCertidão de óbito digitalizada\nProvas de dependência/união estável reunidas\nRequerimento protocolado'),
  ('Salário-Maternidade', E'Procuração e contrato assinados\nCertidão de nascimento digitalizada\nDocumentos da atividade (se rural)\nRequerimento protocolado')
on conflict (beneficio) do nothing;

-- ── Modelos de documentos (os "modelos ouro", com preenchimento) ──────────
-- {nome} {primeiro_nome} {cpf} {endereco} {telefone} {nb} {processo}
-- {beneficio} {data} são preenchidos com os dados do cliente/caso.
create table if not exists modelos_documento (
  id        uuid primary key default gen_random_uuid(),
  titulo    text not null unique,
  categoria text not null default 'geral',
  conteudo  text not null
);

insert into modelos_documento (titulo, categoria, conteudo) values
  ('Procuração ad judicia', 'geral',
E'PROCURAÇÃO AD JUDICIA ET EXTRA\n\nOUTORGANTE: {nome}, CPF {cpf}, residente e domiciliado(a) em {endereco}.\n\nOUTORGADO: PAULO R. TERCINI FILHO, advogado, inscrito na OAB/SP, com escritório profissional em Franca/SP.\n\nPODERES: por este instrumento, o(a) outorgante nomeia e constitui o outorgado seu procurador, conferindo-lhe os poderes das cláusulas ad judicia e extra judicia, para o foro em geral, podendo promover quaisquer medidas judiciais ou administrativas, especialmente perante o INSS, relativas a {beneficio}, com poderes para receber citações e intimações, confessar, transigir, desistir, firmar compromissos, receber e dar quitação, substabelecer com ou sem reserva de poderes.\n\nFranca/SP, {data}.\n\n_____________________________________\n{nome}'),
  ('Contrato de honorários', 'geral',
E'CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS\n\nCONTRATANTE: {nome}, CPF {cpf}, residente em {endereco}, telefone {telefone}.\nCONTRATADO: PAULO R. TERCINI FILHO — Advocacia Previdenciária, Franca/SP.\n\nOBJETO: atuação administrativa e/ou judicial referente a {beneficio}.\n\nHONORÁRIOS: [definir percentual/valor e condições de pagamento].\n\nFranca/SP, {data}.\n\n_____________________________________\nCONTRATANTE\n\n_____________________________________\nCONTRATADO'),
  ('Declaração de hipossuficiência', 'geral',
E'DECLARAÇÃO DE HIPOSSUFICIÊNCIA\n\nEu, {nome}, CPF {cpf}, residente e domiciliado(a) em {endereco}, DECLARO, sob as penas da lei, que não possuo condições de arcar com as custas processuais e honorários advocatícios sem prejuízo do meu sustento e de minha família, requerendo os benefícios da justiça gratuita, nos termos da Lei 1.060/50 e do art. 98 do CPC.\n\nFranca/SP, {data}.\n\n_____________________________________\n{nome}'),
  ('Autodeclaração de atividade rural', 'Rural',
E'AUTODECLARAÇÃO DE EXERCÍCIO DE ATIVIDADE RURAL\n\nEu, {nome}, CPF {cpf}, residente em {endereco}, DECLARO, para fins de comprovação junto ao INSS, que exerci atividade rural em regime de economia familiar, como segurado(a) especial, nos períodos e propriedades que descrevo a seguir:\n\n[período] — [propriedade/município] — [condição: proprietário, arrendatário, comodatário, parceiro]\n\nDeclaro estar ciente de que a falsidade destas informações está sujeita às penas da lei.\n\nFranca/SP, {data}.\n\n_____________________________________\n{nome}')
on conflict (titulo) do nothing;

-- ── Conversas com clientes (fundação da integração do chatbot/WhatsApp) ───
-- O conector do chatbot grava aqui via webhook; mensagens com anexo geram
-- sugestão de andamento (ex.: "recebi relatório médico") na visão 🤖.
create table if not exists conversas (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid references clientes(id) on delete set null,
  telefone    text,
  plataforma  text,                 -- tawk | jivochat | chatwoot | whatsapp | outro
  externo_id  text unique,          -- id da mensagem na plataforma (dedupe)
  de_cliente  boolean not null default true,
  atendente   text,                 -- nome do colaborador na plataforma
  texto       text,
  anexo_nome  text,
  anexo_url   text,
  criado_em   timestamptz not null default now()
);
create index if not exists conversas_cliente on conversas (cliente_id, criado_em desc);

-- ── Segurança (RLS) ───────────────────────────────────────────────────────
-- Regra geral: só usuário logado acessa; anônimo não vê NADA.
-- Tarefas particulares: só o dono. Credenciais: leitura logada + log no app.
do $$
declare t text;
begin
  foreach t in array array['colaboradores','clientes','credenciais','credencial_vis',
                           'casos','andamentos','eventos','pagamentos','tarefas',
                           'atribuicoes','meu_dia','modelos_mensagem','sugestoes',
                           'mencoes','leads','documentos_beneficio','conversas',
                           'checklist_modelo','modelos_documento',
                           'vinculos','frases_prontas'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists autenticados on %I', t);
    if t <> 'tarefas' then
      execute format(
        'create policy autenticados on %I for all to authenticated using (true) with check (true)', t);
    end if;
  end loop;
end $$;

drop policy if exists tarefas_visiveis on tarefas;
create policy tarefas_visiveis on tarefas for select to authenticated
  using (particular_de is null
         or particular_de = (select id from colaboradores where auth_id = auth.uid()));
drop policy if exists tarefas_escrita on tarefas;
create policy tarefas_escrita on tarefas for insert to authenticated with check (true);
drop policy if exists tarefas_update on tarefas;
create policy tarefas_update on tarefas for update to authenticated
  using (particular_de is null
         or particular_de = (select id from colaboradores where auth_id = auth.uid()));
drop policy if exists tarefas_delete on tarefas;
create policy tarefas_delete on tarefas for delete to authenticated
  using (particular_de is null
         or particular_de = (select id from colaboradores where auth_id = auth.uid()));

-- ── Colaboradores do escritório ───────────────────────────────────────────
insert into colaboradores (inicial, nome, cor) values
  ('P', 'Paulo',  '#2564cf'),
  ('A', 'Amanda', '#e6a700'),
  ('M', 'Marcos', '#0b8043'),
  ('D', 'André',  '#00838f'),
  ('I', 'Ingrid', '#c2185b'),
  ('C', 'Claude', '#d97757')
on conflict (inicial) do nothing;

-- Paleta oficial (a mesma lógica do Google Agenda do escritório):
-- Paulo azul, Amanda amarelo, Marcos verde, André azul-petróleo,
-- Ingrid rosa, Claude laranja (cor padrão do Claude).
-- Os updates garantem que re-rodar o schema aplica a paleta em bancos já criados.
update colaboradores set cor='#2564cf' where inicial='P';
update colaboradores set cor='#e6a700' where inicial='A';
update colaboradores set cor='#0b8043' where inicial='M';
update colaboradores set cor='#00838f' where inicial='D';
update colaboradores set cor='#c2185b' where inicial='I';
update colaboradores set cor='#d97757' where inicial='C';
