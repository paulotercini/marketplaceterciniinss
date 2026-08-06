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

-- Comentário apagado pelo próprio autor no app: marcado para a sincronização
-- remover o bloco correspondente do corpo da tarefa no To Do e então sumir.
alter table andamentos add column if not exists excluir boolean not null default false;

-- O MOTIVO do "Lembrar em" (prazo): a data diz quando agir, o motivo diz o
-- porquê — "pedir prorrogação", "cobrar documentos", "conferir INSS"...
alter table casos add column if not exists lembrar_motivo text;

-- Ordem de julgamento no TRF3 (painel público Power BI), gravada pelo
-- crm/trf3_ordem.py (workflow diário): {processo, ordem, total, orgao,
-- turma, grau, prioridade, fase_desde, consultado_em}. ordem null =
-- processo não consta no painel (não concluso/sigiloso) — o app não mostra.
alter table casos add column if not exists trf3 jsonb;

-- Andamento oficial do processo na base pública do CNJ (DataJud), gravado
-- pelo crm/datajud.py (workflow diário): {processo, tribunal, grau, classe,
-- orgao, ajuizado_em, ultimo:{data,nome,complemento,claro}, recentes[],
-- outras[], consultado_em}. Vale para qualquer instância — 1º grau, JEF,
-- Turma Recursal, 2º grau e Justiça Estadual.
alter table casos add column if not exists datajud jsonb;

-- Régua da fila do INSS para o benefício deste caso, casada pelo
-- crm/inss_fila.py: {pendentes, dias_mediana, dias_p90, referencia,
-- servicos[], uf}. Serve para calibrar a expectativa do cliente quando o
-- Meu INSS só diz "em análise".
alter table casos add column if not exists inss_fila jsonb;

-- ── Quem já leu cada comentário ───────────────────────────────────────────
-- O "visto" do comentário: cada colaborador marca que leu, e fica registrado
-- quem e QUANDO. Quem escreveu entra automaticamente — não faz sentido pedir
-- que confirme a leitura do próprio texto.
create table if not exists andamentos_lidos (
  andamento_id   uuid not null references andamentos(id) on delete cascade,
  colaborador_id uuid not null references colaboradores(id) on delete cascade,
  lido_em        timestamptz not null default now(),
  primary key (andamento_id, colaborador_id)
);
create index if not exists lidos_por_and on andamentos_lidos (andamento_id);

-- ── Anexos (a foto do documento, tirada na casa do cliente) ───────────────
-- Esta tabela guarda só o CATÁLOGO: o arquivo em si mora no Storage do
-- Supabase, no bucket "anexos", e `caminho` é onde ele está lá dentro.
--
-- O bucket é PRIVADO de propósito: aqui entram laudo médico, CNIS, RG,
-- carteira de trabalho. Nada disso pode ficar num link público que qualquer
-- um acessa sabendo o endereço — o app baixa por URL assinada, que vence.
create table if not exists anexos (
  id          uuid primary key default gen_random_uuid(),
  caso_id     uuid references casos(id) on delete cascade,
  cliente_id  uuid references clientes(id) on delete cascade,
  autor_id    uuid references colaboradores(id),
  nome        text not null,              -- como mostrar para a equipe
  caminho     text not null unique,       -- caminho dentro do bucket
  tipo        text,                       -- image/jpeg, application/pdf…
  tamanho     bigint,
  criado_em   timestamptz not null default now()
);
create index if not exists anexos_por_caso on anexos (caso_id, criado_em desc);
create index if not exists anexos_por_cliente on anexos (cliente_id, criado_em desc);

-- ── Datas prováveis de aposentadoria ─────────────────────────────────────
-- Cada cliente pode ter várias: por idade, por tempo de contribuição,
-- especial, professor. Cada uma vira um lembrete três meses antes na agenda
-- — é o tempo de chamar o cliente, pedir documento e protocolar sem correria.
--
-- A aposentadoria por IDADE não precisa estar aqui: o app a calcula da data
-- de nascimento (62 anos para mulher, 65 para homem) e mostra marcada como
-- automática, para conferir. Ao editar, ela vira uma linha de verdade e
-- passa a valer sobre a calculada.
alter table clientes add column if not exists sexo text;
alter table clientes drop constraint if exists clientes_sexo_valido;
alter table clientes add constraint clientes_sexo_valido
  check (sexo is null or sexo in ('F','M'));

create table if not exists aposentadorias (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete cascade,
  data        date not null,               -- data provável do direito
  especie     text not null,               -- "Idade", "Tempo de Contribuição"…
  observacao  text,
  autor_id    uuid references colaboradores(id),
  criado_em   timestamptz not null default now()
);
create index if not exists apos_por_cliente on aposentadorias (cliente_id, data);
create index if not exists apos_por_data on aposentadorias (data);

-- Já se aposentou? Enquanto não se sabe, o sistema previa a aposentadoria por
-- idade de quem provavelmente já a tem. Quem responde é, nesta ordem: os
-- próprios andamentos (crm/fase2/detectar_aposentado.py lê e marca), o CNIS,
-- ou o colaborador à mão. `aposentado_prova` guarda o trecho que decidiu —
-- ninguém precisa acreditar no sistema sem ver de onde veio.
alter table clientes add column if not exists aposentado boolean;
alter table clientes add column if not exists aposentado_fonte text;   -- andamento | cnis | manual
alter table clientes add column if not exists aposentado_em date;      -- data do indício
alter table clientes add column if not exists aposentado_prova text;

-- CadÚnico do BPC/LOAS: vence a cada dois anos e derruba o benefício se não
-- for atualizado — precisa lembrar mesmo com o caso encerrado, porque
-- encerrado aqui só quer dizer que o nosso trabalho acabou.
alter table casos add column if not exists cadunico date;               -- última atualização

-- ── Porta de entrada para o SMBot (WhatsApp) ─────────────────────────────
-- O atendimento do WhatsApp manda cada mensagem para cá. UMA função, e nada
-- além dela: quem tem o token consegue registrar contato, e não consegue ler
-- ficha, senha nem processo de ninguém.
--
-- O token não é a chave do banco. É um segredo só desta integração, que se
-- troca sem mexer em mais nada se algum dia vazar.
create table if not exists integracao_token (
  nome      text primary key,          -- 'smbot'
  token     text not null,
  criado_em timestamptz not null default now()
);
alter table integracao_token enable row level security;   -- ninguém lê pela API

-- telefone chega de todo jeito: +55 (16) 99999-0000, 5516999999000, 16999990000.
-- Comparar pelos 8 últimos dígitos acha o mesmo cliente em qualquer formato.
create or replace function fone_chave(t text) returns text
language sql immutable as $$
  select right(regexp_replace(coalesce(t,''), '\D', '', 'g'), 8)
$$;

create or replace function smbot_entrada(
  p_token      text,
  p_telefone   text,
  p_nome       text default null,
  p_texto      text default null,
  p_externo_id text default null,      -- id da mensagem no SMBot (evita repetir)
  p_de_cliente boolean default true,   -- false = mensagem que o escritório mandou
  p_atendente  text default null,
  p_beneficio  text default null       -- assunto/benefício, se o bot perguntar
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_cli uuid; v_lead uuid; v_conv uuid; v_novo boolean := false; v_chave text;
begin
  if p_token is null or p_token <> (select token from integracao_token where nome='smbot') then
    return jsonb_build_object('ok', false, 'erro', 'token inválido');
  end if;
  v_chave := fone_chave(p_telefone);
  if v_chave = '' or length(v_chave) < 8 then
    return jsonb_build_object('ok', false, 'erro', 'telefone inválido');
  end if;

  -- já é cliente do escritório?
  select id into v_cli from clientes where fone_chave(telefone) = v_chave limit 1;

  -- não sendo cliente, vira (ou reaproveita) um lead do funil de vendas
  if v_cli is null then
    select id into v_lead from leads
     where fone_chave(telefone) = v_chave
       and etapa not in ('fechado','perdido')
     order by criado_em desc limit 1;
    if v_lead is null then
      insert into leads (nome, telefone, beneficio_interesse, origem, etapa, obs)
      values (coalesce(nullif(trim(p_nome),''), 'WhatsApp ' || p_telefone),
              p_telefone, p_beneficio, 'whatsapp', 'novo',
              'Entrou pelo WhatsApp (SMBot).')
      returning id into v_lead;
      v_novo := true;
    end if;
  end if;

  -- a mensagem entra no histórico; mandar duas vezes a mesma não duplica
  if p_texto is not null and trim(p_texto) <> '' then
    insert into conversas (cliente_id, telefone, plataforma, externo_id,
                           de_cliente, atendente, texto)
    values (v_cli, p_telefone, 'whatsapp', p_externo_id,
            coalesce(p_de_cliente, true), p_atendente, p_texto)
    on conflict (externo_id) do nothing
    returning id into v_conv;
  end if;

  return jsonb_build_object('ok', true, 'cliente_id', v_cli, 'lead_id', v_lead,
                            'conversa_id', v_conv, 'lead_novo', v_novo);
end $$;

revoke all on function smbot_entrada(text,text,text,text,text,boolean,text,text) from public;
grant execute on function smbot_entrada(text,text,text,text,text,boolean,text,text) to anon, authenticated;

-- ── O webhook do SMBot manda o contato, não a mensagem ────────────────────
-- Resposta do suporte deles (06.08.2026): existe webhook, mas ele NÃO carrega
-- o conteúdo da mensagem — só quem falou. Então esta integração não é
-- histórico de conversa: é AVISO DE QUE ALGUÉM PROCUROU O ESCRITÓRIO. O texto
-- continua no painel do SMBot, e é lá que se lê.
--
-- E o corpo do webhook tem formato deles, não nosso: `smbot_entrada` acima
-- exige parâmetros com os nossos nomes, o que só serve se o SMBot deixar
-- montar o JSON. Esta porta aqui aceita QUALQUER corpo e procura telefone e
-- nome onde quer que estejam, inclusive dentro de objetos aninhados.
create or replace function jsonb_achar(p jsonb, chaves text[], padrao text default null)
returns text
language plpgsql immutable as $$
declare k text; v jsonb; r text;
begin
  if p is null then return null; end if;
  if jsonb_typeof(p) = 'object' then
    -- as chaves DESTE nível primeiro: em {"contato":{"nome":…},"nome":…} o
    -- raso ganha do fundo, senão a busca desce e traz o campo errado
    for k, v in select key, value from jsonb_each(p) loop
      if lower(regexp_replace(k, '[^a-zA-Z]', '', 'g')) = any (chaves)
         and jsonb_typeof(v) in ('string','number') then
        r := v #>> '{}';
        if r is not null and (padrao is null or r ~ padrao) then return r; end if;
      end if;
    end loop;
    for k, v in select key, value from jsonb_each(p) loop
      if jsonb_typeof(v) in ('object','array') then
        r := jsonb_achar(v, chaves, padrao);
        if r is not null then return r; end if;
      end if;
    end loop;
  elsif jsonb_typeof(p) = 'array' then
    for v in select value from jsonb_array_elements(p) loop
      r := jsonb_achar(v, chaves, padrao);
      if r is not null then return r; end if;
    end loop;
  end if;
  return null;
end $$;

-- quantas vezes o prospecto já bateu na porta, e quando foi a última
alter table leads add column if not exists ultimo_contato timestamptz;
alter table leads add column if not exists contatos integer not null default 0;
create index if not exists conversas_fone on conversas (telefone, criado_em desc);

create or replace function smbot_contato(payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_tok text; v_fone text; v_nome text; v_texto text; v_ext text; v_chave text;
  v_cli uuid; v_lead uuid; v_conv uuid; v_novo boolean := false; v_reg boolean := false;
  -- telefone: qualquer coisa com 8 a 15 algarismos, pontuada de qualquer jeito
  pad_fone constant text := '^[^0-9]*([0-9][^0-9]*){8,15}$';
  pad_letra constant text := '[A-Za-zÀ-ÿ]';   -- nome tem letra; id de contato não
begin
  -- o token pode vir no corpo ou no cabeçalho — se o webhook deles não deixar
  -- mexer no JSON, quase sempre deixa acrescentar um cabeçalho
  v_tok := coalesce(
    jsonb_achar(payload, array['token','ptoken','secret','segredo','chave','apikey']),
    nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-smbot-token');
  if v_tok is null or v_tok <> (select token from integracao_token where nome='smbot') then
    return jsonb_build_object('ok', false, 'erro', 'token inválido');
  end if;

  -- duas passadas: os nomes inequívocos primeiro, os ambíguos depois
  v_fone := coalesce(
    jsonb_achar(payload, array['telefone','phone','celular','whatsapp','msisdn','waid','fone'], pad_fone),
    jsonb_achar(payload, array['numero','number','from','remetente','contato','contact'], pad_fone));
  v_nome := coalesce(
    jsonb_achar(payload, array['nome','name','pushname','nomecontato','contactname','nomedocontato'], pad_letra),
    jsonb_achar(payload, array['contato','contact','cliente','fullname','displayname'], pad_letra));
  -- se um dia o SMBot passar a mandar o conteúdo, ele já entra sem mexer aqui
  v_texto := jsonb_achar(payload, array['mensagem','message','texto','text','body','conteudo','content','msg'], '.');
  -- 'id' puro NÃO entra: no webhook de contato ele é o id da PESSOA, e usá-lo
  -- como chave de mensagem faria todo contato dela virar um só registro
  v_ext := jsonb_achar(payload, array['messageid','idmensagem','externoid','protocolo','ticket','msgid','idmsg'], '.');

  v_chave := fone_chave(v_fone);
  if v_chave = '' or length(v_chave) < 8 then
    return jsonb_build_object('ok', false, 'erro', 'telefone não encontrado no corpo enviado');
  end if;

  select id into v_cli from clientes where fone_chave(telefone) = v_chave limit 1;
  if v_cli is null then
    select id into v_lead from leads
     where fone_chave(telefone) = v_chave and etapa not in ('fechado','perdido')
     order by criado_em desc limit 1;
    if v_lead is null then
      insert into leads (nome, telefone, origem, etapa, obs)
      values (coalesce(nullif(trim(v_nome),''), 'WhatsApp ' || v_fone), v_fone,
              'whatsapp', 'novo', 'Falou no WhatsApp (SMBot). A conversa está no painel do SMBot.')
      returning id into v_lead;
      v_novo := true;
    end if;
  end if;

  if v_texto is not null and trim(v_texto) <> '' then
    insert into conversas (cliente_id, telefone, plataforma, externo_id, de_cliente, texto)
    values (v_cli, v_fone, 'whatsapp', v_ext, true, v_texto)
    on conflict (externo_id) do nothing
    returning id into v_conv;
    v_reg := v_conv is not null;
  -- sem conteúdo, o que se registra é a PASSAGEM — e uma a cada 10 minutos,
  -- senão uma conversa de dez mensagens vira dez linhas iguais dizendo "falou"
  elsif not exists (select 1 from conversas
                     where fone_chave(telefone) = v_chave
                       and criado_em > now() - interval '10 minutes') then
    insert into conversas (cliente_id, telefone, plataforma, externo_id, de_cliente, texto)
    values (v_cli, v_fone, 'whatsapp', v_ext, true, null)
    returning id into v_conv;
    v_reg := true;
  end if;

  if v_lead is not null then
    update leads set ultimo_contato = now(), atualizado_em = now(),
                     contatos = contatos + (case when v_reg then 1 else 0 end)
     where id = v_lead;
  end if;

  return jsonb_build_object('ok', true, 'cliente_id', v_cli, 'lead_id', v_lead,
                            'lead_novo', v_novo, 'registrado', v_reg,
                            'com_texto', v_texto is not null);
end $$;

revoke all on function smbot_contato(jsonb) from public;
grant execute on function smbot_contato(jsonb) to anon, authenticated;

-- ── Como cada lista aparece ──────────────────────────────────────────────
-- Fundo e posição no menu. É preferência DO ESCRITÓRIO, não de cada um:
-- todo mundo enxerga a mesma tela, e quem descreve "a lista amarela" por
-- telefone está falando da mesma lista que o outro vê.
--   chave  -> a visão: 'meudia', 'fase:inss', 'calendario'…
--   fundo  -> hex (#FDF9E2), gradiente CSS, ou a URL de uma imagem
create table if not exists lista_pref (
  chave      text primary key,
  fundo      text,
  ordem      int,
  atualizado timestamptz not null default now()
);

-- ── Ajustes do escritório ────────────────────────────────────────────────
-- Configuração que vale para TODO MUNDO e mora no banco, não no navegador:
-- quem trocar de máquina não reconfigura nada. Hoje guarda 'smbot_url', o
-- endereço do painel de atendimento do WhatsApp embutido na aba 💬.
-- (O endereço do próprio Supabase é a exceção que não cabe aqui: sem ele o
-- navegador não sabe nem onde é o banco. Esse continua no navegador.)
create table if not exists config_app (
  chave      text primary key,
  valor      text,
  atualizado timestamptz not null default now()
);

-- imagens de fundo: papel de parede, não documento de cliente — pode ser
-- bucket público, e precisa ser, para o CSS conseguir carregar a imagem
insert into storage.buckets (id, name, public)
  values ('fundos','fundos',true)
  on conflict (id) do update set public = true;
do $$
declare a text;
begin
  foreach a in array array['ler','enviar','apagar'] loop
    execute format('drop policy if exists fundos_%s on storage.objects', a);
  end loop;
end $$;
create policy fundos_ler on storage.objects for select to public
  using (bucket_id = 'fundos');
create policy fundos_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'fundos');
create policy fundos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'fundos');

-- o bucket, privado. Rodar de novo não duplica nem volta a ser público.
insert into storage.buckets (id, name, public)
  values ('anexos','anexos',false)
  on conflict (id) do update set public = false;

-- quem está logado no CRM usa o bucket; anônimo não toca em nada
do $$
declare a text;
begin
  foreach a in array array['ler','enviar','apagar'] loop
    execute format('drop policy if exists anexos_%s on storage.objects', a);
  end loop;
end $$;
create policy anexos_ler on storage.objects for select to authenticated
  using (bucket_id = 'anexos');
create policy anexos_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'anexos');
create policy anexos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'anexos');

-- ── Rotina do escritório (tarefas recorrentes, não são de cliente) ────────
-- "Conferir a caixa de e-mail toda manhã", "fechar o caixa toda sexta",
-- "conferir o DOU todo dia útil". Cada uma tem dono e volta sozinha no
-- próximo dia programado — o colaborador só marca "já fiz".
--
-- Quando ela é devida:
--   dias_semana vazio e dia_mes nulo -> todo dia
--   dias_semana [1,2,3,4,5]          -> dias úteis (0=domingo … 6=sábado)
--   dias_semana [1]                  -> toda segunda-feira
--   dia_mes 5                        -> todo dia 5 (ou no último dia do mês,
--                                       quando o mês não tem esse dia)
create table if not exists rotinas (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null,
  detalhe        text,
  responsavel_id uuid references colaboradores(id) on delete set null,
  dias_semana    jsonb not null default '[]'::jsonb,
  dia_mes        int,
  ativo          boolean not null default true,
  criada_em      timestamptz not null default now()
);
create index if not exists rotinas_resp on rotinas (responsavel_id) where ativo;

-- uma linha por rotina/dia concluído: é o que faz a rotina sumir hoje e
-- voltar amanhã, e também o histórico de quem fez o quê
create table if not exists rotinas_feitas (
  rotina_id      uuid not null references rotinas(id) on delete cascade,
  dia            date not null,
  colaborador_id uuid references colaboradores(id) on delete set null,
  feito_em       timestamptz not null default now(),
  primary key (rotina_id, dia)
);

-- ── Produção de cada órgão julgador (painel Justiça em Números do CNJ) ────
-- Alimenta a previsão de julgamento: o painel do TRF3 dá a POSIÇÃO na fila
-- e este dá a VELOCIDADE do gabinete, então a estimativa já sai na primeira
-- consulta, sem esperar semanas medindo a fila.
create table if not exists orgao_producao (
  tribunal               text not null,
  grau                   text not null,
  orgao                  text not null,
  julgados_ano_anterior  int,
  julgados_ano_atual     int,
  conclusos_julgamento   int,
  dias_medios_julgamento int,        -- distribuição -> julgamento (oficial)
  atualizado_em          date not null default current_date,
  primary key (tribunal, grau, orgao)
);

-- ── Fila do INSS por serviço e UF (dados abertos, retrato mensal) ─────────
create table if not exists inss_fila (
  servico      text not null,
  uf           text not null,          -- UF da unidade, ou 'BR' para o país
  pendentes    int  not null,
  dias_mediana int,
  dias_p90     int,
  referencia   date not null,          -- data do retrato (não é a de hoje)
  atualizado_em date not null default current_date,
  primary key (servico, uf)
);

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

-- ── Motivos prontos do "Lembrar em" (minerados do histórico real do To Do) ─
-- Editáveis no próprio app (✎ editar): criar, renomear, desativar e escolher
-- em quais listas cada um aparece. `listas` = fases onde o motivo é mostrado
-- (lista vazia = aparece em todas). `seed` marca os de fábrica: re-rodar o
-- schema NÃO desfaz as suas edições nem ressuscita os desativados.
create table if not exists lembrar_motivos (
  id     uuid primary key default gen_random_uuid(),
  grupo  text not null default '🙋 Cliente',
  texto  text not null,
  listas jsonb not null default '[]'::jsonb,
  ordem  int not null default 0,
  ativo  boolean not null default true,
  seed   text unique
);
insert into lembrar_motivos (grupo, texto, listas, ordem, seed) values
  ('🌻 INSS','Em análise — verificar novamente','["inss"]',1,'inss-analise'),
  ('🌻 INSS','Benefício concedido — verificar HISCRE','["inss"]',2,'inss-concedido-hiscre'),
  ('🌻 INSS','HISCRE ainda não disponível — conferir de novo','["inss"]',3,'inss-hiscre-indisponivel'),
  ('🌻 INSS','Pedir prorrogação do benefício','["inss"]',4,'inss-prorrogacao'),
  ('🌻 INSS','Prorrogação ainda não disponível — tentar de novo','["inss"]',5,'inss-prorrogacao-indisponivel'),
  ('🌻 INSS','Verificar resultado da perícia','["inss","judicial"]',6,'inss-pericia'),
  ('🌻 INSS','Verificar resposta da exigência','["inss"]',7,'inss-exigencia'),
  ('🌻 INSS','Verificar resposta da ouvidoria','["inss","conselho"]',8,'inss-ouvidoria'),
  ('🌻 INSS','Solicitar o benefício nesta data','["escritorio","peticao_inicial","aposentadoria_futura"]',9,'inss-solicitar'),
  ('💰 Pagamento','Verificar previsão de pagamento (HISCRE)','["inss","pagamento"]',10,'pag-previsao'),
  ('💰 Pagamento','Conferir se o pagamento caiu','["pagamento"]',11,'pag-caiu'),
  ('⚖️ Judicial','Verificar movimentação do processo','["judicial"]',12,'jud-movimentacao'),
  ('⚖️ Judicial','Sem alteração no recurso — conferir de novo','["conselho"]',13,'jud-recurso'),
  ('⚖️ Judicial','Verificar trânsito em julgado','["judicial"]',14,'jud-transito'),
  ('🙋 Cliente','Cobrar documentos do cliente','[]',15,'cli-documentos'),
  ('🙋 Cliente','Cliente não retornou — tentar novo contato','[]',16,'cli-retorno'),
  ('🙋 Cliente','Verificar resposta do e-mail','[]',17,'cli-email'),
  ('🙋 Cliente','Agendar atendimento presencial','[]',18,'cli-atendimento'),
  ('🙋 Cliente','Avisar o cliente do resultado','[]',19,'cli-avisar'),
  ('🙋 Cliente','Verificar senha do Meu INSS','[]',20,'cli-senha'),
  ('🙋 Cliente','Último dia do prazo','[]',21,'cli-prazo')
on conflict (seed) do nothing;

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

-- Catálogo COMPLETO de documentos por benefício — espelho do site interno
-- (advprevidenciaria.netlify.app, "Documentos para Solicitar aos Clientes").
-- Linhas "▸ Título" são cabeçalhos de seção (não viram item de checklist).
-- Re-rodar o schema ATUALIZA as listas para a versão do site.
alter table documentos_beneficio add column if not exists extras text;
insert into documentos_beneficio (beneficio, itens, extras, observacoes) values
  (E'Apos. Tempo de Contribuição', E'RG, CNH ou CIN — Original e cópia\nCPF\nComprovante de residência — Em nome do cliente, com no máximo 3 meses. Se estiver em nome do cônjuge, traga também a certidão de casamento. Sem comprovante em seu nome ou do cônjuge, avise seu advogado\nBiometria — Verifique se está atualizada na Justiça Eleitoral', E'▸ Vínculos CLT e trabalho urbano\nCarteira de Trabalho (CTPS) — todas as páginas com registros\nExtratos do FGTS — um por empresa, com datas de admissão e demissão\nTermos de rescisão (TRCT) ou comprovante de rescisão contratual\nContrato individual de trabalho\nFicha de Registro de Empregados ou Livro de Registro — cópia autenticada\nHolerites (contracheques) do período\nAcordo coletivo de trabalho — se contiver dados do vínculo\nRAIS — Relação Anual de Informações Sociais\nSentença trabalhista com reconhecimento de vínculo\nExtrato do CNIS atualizado — seu advogado pode obter e identificar divergências\nDTC — Declaração de Tempo de Contribuição emitida pelo INSS\n▸ Autônomo, CI e MEI\nComprovantes de GPS (guias ao INSS) — com autenticação bancária\nDAS do MEI recolhido — se houve período como Microempreendedor\nNotas fiscais emitidas em nome do contribuinte individual\nContratos de prestação de serviço com empresa ou pessoa física\nRPA — Recibo de Prestação de Serviços emitido pelo contratante\nDeclaração de IR com renda de trabalho autônomo ou pró-labore\nGFIP com informação de remuneração de CI prestando serviço a empresa\nInscrição em órgão de fiscalização profissional (CRM, OAB, CREA, CRC)\nContrato social ou alteração contratual registrada em Junta Comercial\nCCMEI — Certificado de Microempreendedor Individual\nAlvará de funcionamento ou licença municipal\n▸ Períodos rurais\nCertidão de casamento com qualificação de lavrador(a)\nCertidão de nascimento dos filhos com qualificação rural dos pais\nTítulo de eleitor antigo com profissão de agricultor(a)\nDAP ou CAF — Declaração de Aptidão ao Pronaf\nBloco de notas do produtor rural\nContrato de arrendamento, parceria ou comodato rural\nCCIR — Certificado de Cadastro de Imóvel Rural ou documento do INCRA\nITR — comprovante de pagamento do Imposto Territorial Rural\nNotas fiscais de venda de produção rural\nFicha de associado em sindicato de trabalhadores rurais\nComprovante de empréstimo bancário rural (Pronaf, Agro Amigo)\nDocumentos rurais no nome do cônjuge (Tema 327 TNU) — traga certidão de casamento\nAutodeclaração de segurado especial — seu advogado orienta o preenchimento\n▸ Atividade especial e PPP\nPPP (Perfil Profissiográfico Previdenciário) — obrigatório a partir de 01/01/2004\nPPP eletrônico (eSocial) — para períodos a partir de 01/01/2023\nFormulário SB-40 ou DISES BE 5235 — trabalhos até 13/10/1996\nFormulário DSS-8030 ou DIRBEN 8030 — trabalhos de 14/10/1996 a 31/12/2003\nLTCAT — Laudo Técnico de Condições Ambientais do Trabalho\nPPRA ou PGR — Programa de Prevenção/Gerenciamento de Riscos\nPCMSO — Programa de Controle Médico de Saúde Ocupacional\nLaudo de insalubridade ou periculosidade de reclamação trabalhista\nFicha de entrega de EPI com assinatura do empregado\nSentença trabalhista reconhecendo atividade especial\n▸ Períodos com deficiência (LC 142/2013)\nLaudo médico com diagnóstico (CID) e descrição das limitações funcionais — o que a deficiência impede ou dificulta no dia a dia\nRelatório do médico especialista — impacto na rotina, trabalho e vida social\nExames que comprovam a deficiência — específicos do tipo de impedimento\nDocumentos que comprovem a DATA DE INÍCIO da deficiência — quanto mais antigo, melhor\nLaudos de outros profissionais (psicólogo, terapeuta, fisioterapeuta, fonoaudiólogo)\nLaudo do Detran de habilitação especial — se houver\nHistórico de internações, cirurgias e tratamentos\nCarteira de Passe Livre (Lei 8.899/94) — se houver\nCOLUNA — RM da coluna seriada, ENMG, laudo ortopedista/neurocirurgião com CIDs (M51.1, M47.8, M48.0), receituários de gabapentina/pregabalina, relatório cirúrgico se houve\nJOELHO — RM do joelho, radiografia com carga, goniometria, laudo ortopedista com CID (M23.5, S83.5, M17), relatório cirúrgico se houve\nOMBRO — RM do ombro, goniometria de elevação/abdução/rotações, laudo ortopedista com CID (M75.1, M75.0), relatório cirúrgico se houve\nAUDITIVA — audiometria tonal e vocal (500, 1k, 2k, 3k Hz), laudo ORL com CID H90/H91, BERA, relatório fonoaudiológico, prescrição de AASI ou implante coclear\nVISUAL — acuidade visual com correção, campimetria, laudo oftalmológico com CID, OCT se indicado\nINTELECTUAL/MENTAL/AUTISMO — laudo psiquiátrico ou neurológico, avaliação neuropsicológica, relatório APAE/CAPS\n▸ Acerto de CNIS\nGPS com autenticação bancária visível — para corrigir recolhimento\nExtrato analítico do FGTS por empresa — para incluir vínculo ausente\nHolerite do período com divergência no CNIS\nTRCT — Termo de Rescisão Contratual — para corrigir data de saída\nDeclaração de sócio ou ex-sócio de empresa extinta\nComprovante com número do recibo eletrônico do eSocial\n▸ Servidor público\nCertidão de Tempo de Contribuição (CTC) — emitida pelo órgão público competente\n▸ Comprovação de jornada efetiva (horas extras habituais)\nFolhas de ponto ou cartões eletrônicos de ponto do período\nHolerites e contracheques mostrando pagamento habitual de horas extras\nRegistro Eletrônico de Ponto (REP) emitido pela empresa\nAcordo coletivo ou convenção coletiva com previsão de jornada estendida (12x36, 8x12)\nContrato individual de trabalho com previsão da jornada\nEventos do eSocial S-2240 e S-2400 — para vínculos a partir de setembro de 2019\nDeclaração formal da empresa atestando a jornada habitual e a habitualidade das horas extras\nSentença ou acordo homologado em Reclamação Trabalhista reconhecendo horas extras habituais (Tema 132 TST)\nAta de audiência trabalhista com confissão da empresa sobre a jornada\nEscalas oficiais de turno — plantões, revezamento 12x36, escala rodoviária\nCTPS com anotação da jornada\nDiário de bordo ou ficha de viagem — motoristas profissionais\nRecibos de pagamento de adicional noturno habitual', E'Para o pedido de aposentadoria por tempo de contribuição, reúna os documentos abaixo e traga para a consulta antes de qualquer atendimento no INSS. A lista segue os arts. 46 e 48 da IN 128/2022.\n\n⚠️ Antes do protocolo, seu advogado verificará o CNIS completo. Períodos faltando ou com divergência precisam ser regularizados primeiro — o recolhimento de nova GPS não resolve por si só.\n\nℹ️ Quem não tinha os requisitos em novembro de 2019 está nas regras de transição. Seu advogado identificará a mais vantajosa para você.'),
  (E'Apos. por Idade', E'RG, CNH ou CIN — Original e cópia\nCertidão de nascimento ou casamento — Para comprovar a sua idade\nCPF\nComprovante de residência — Em nome do cliente, com no máximo 3 meses. Se estiver em nome do cônjuge, traga também a certidão de casamento. Sem comprovante em seu nome ou do cônjuge, avise seu advogado\nBiometria — Verifique se está atualizada na Justiça Eleitoral', E'Carteira de Trabalho (CTPS) — Todas as páginas com registros\nExtratos do FGTS por empresa — Com datas de admissão e demissão\nTermos de rescisão (TRCT)\nExtrato do CNIS atualizado\nComprovantes de GPS recolhidas — Com autenticação bancária — código 1163 (CI), 1007 (CI empresa encerrada) ou DAS do MEI\nInscrição em órgão de fiscalização profissional — CRM, OAB, CREA, CRC, COREN etc.\nContrato social ou alteração contratual registrada em Junta Comercial ou Cartório\nCCMEI — Certificado de Microempreendedor Individual — Portal do Empreendedor\nAlvará de funcionamento ou licença municipal\nRPA — Recibo de Prestação de Serviços emitido pelo contratante\nDeclaração de Imposto de Renda com renda de trabalho autônomo ou pró-labore\nContrato de prestação de serviço com empresa ou pessoa física\nNotas fiscais emitidas em nome do contribuinte individual\nExtrato de pagamento de cooperativa de trabalho\nGFIP com informação de remuneração de CI prestando serviço a empresa\nInscrição no ISS municipal ou Cadastro de Contribuintes Mobiliários\nDocumentos que caracterizem atividade de sócio — Atas de reunião, balanços, declarações da empresa\nDTC — Declaração de Tempo de Contribuição emitida pelo INSS', E'Para a aposentadoria por idade, reúna os documentos abaixo e consulte seu advogado antes de qualquer atendimento no INSS. Os documentos variam conforme você foi empregado CLT, autônomo ou empresário.\n\nℹ️ A aposentadoria por idade exige um número mínimo de contribuições (carência). Seu advogado verifica se você já atingiu esse número e se há períodos para regularizar no CNIS antes do pedido.'),
  (E'Rural', E'RG, CNH ou CIN — Original e cópia\nCPF\nComprovante de residência — Em nome do cliente, com no máximo 3 meses. Se estiver em nome do cônjuge, traga também a certidão de casamento. Sem comprovante em seu nome ou do cônjuge, avise seu advogado\nBiometria — Verifique se está atualizada na Justiça Eleitoral\nCarteira de Trabalho (CTPS) — Todas as páginas com registros — inclusive vínculos urbanos intercalados com períodos rurais', E'Contrato de arrendamento, parceria, meação ou comodato rural — Inciso I — somente vale a partir da data do registro ou reconhecimento de firma em cartório\nEscritura pública de imóvel rural — Inciso XXI\nTítulo de propriedade de imóvel rural — Inciso XXVI\nTítulo de aforamento — Inciso XXXIV\nLicença de ocupação ou permissão do INCRA — assentados do programa de reforma agrária — Inciso VIII\nCCIR — Certificado de Cadastro de Imóvel Rural ou outro documento do INCRA — Inciso VIII\nITR — comprovante de pagamento do Imposto Territorial Rural (DIAC / DIAT) — Inciso IX\nDAP — Declaração de Aptidão ao Pronaf — Inciso II — ou documento substituto (CAF)\nBloco de notas do produtor rural — Inciso III\nNotas fiscais de entrada de mercadorias emitidas pela empresa que comprou sua produção — Inciso IV — com seu nome como vendedor\nDocumentos fiscais de entrega de produção a cooperativa ou entreposto de pescado — Inciso V — com seu nome como vendedor ou consignante\nComprovantes de recolhimento de contribuição ao INSS sobre a comercialização da produção — Inciso VI\nDeclaração do Imposto de Renda com renda de produção rural — Inciso VII\nRecibo de compra de implementos ou insumos agrícolas — Inciso XXVII — sementes, defensivos, ferramentas\nComprovante de empréstimo bancário para atividade rural — Inciso XXVIII — Pronaf, Agro Amigo, etc.\nComprovante de assistência técnica ou extensão rural recebida — Inciso XX — EMATER, EMBRAPA, Senar\nFicha de inscrição ou registro sindical no Sindicato de Trabalhadores Rurais — Inciso XXIX\nComprovante de pagamento de contribuição ao Sindicato Rural ou associação de produtores — Incisos XXIX e XXX\nFicha de associado em cooperativa agrícola ou de pesca — Inciso XVIII\nRegistro em documentos de associações de produtores rurais, comunitárias, recreativas ou religiosas — Inciso XXXIII\nComprovante de participação em programas governamentais para a área rural — Inciso XIX — Bolsa Verde, PAA, PNAE, etc.\nCertidão de casamento civil ou religioso — Inciso XI — com profissão de agricultor/lavrador\nCertidão de nascimento ou batismo dos filhos — Inciso XII — com profissão dos pais como agricultor\nTítulo de eleitor antigo — Inciso XV — com endereço e profissão rural\nFicha de cadastro eleitoral ou certidão eleitoral — Inciso XV\nCertificado de alistamento militar ou quitação com o serviço militar — Inciso XVI — com qualificação rural\nProcuração — Inciso XIV — com qualificação como agricultor\nCertidão de tutela ou curatela — Inciso XIII — com qualificação rural\nRecibo de pagamento de contribuição federativa ou confederativa — Inciso XXII\nPublicação na imprensa ou informativos com referência à atividade rural — Inciso XXXI\nRegistro em processos administrativos ou judiciais como testemunha, autor ou réu — Inciso XXIII — com qualificação rural\nProntuário de posto de saúde, hospital ou UBS — Inciso XXIV — com endereço ou qualificação rural\nFicha do programa de agentes comunitários de saúde — Inciso XXIV\nFicha de atendimento médico ou odontológico — Inciso XXXV — com qualificação como agricultor\nCarteira de vacinação — Inciso XXV — com endereço na zona rural\nCartão da gestante — Inciso XXV — com qualificação rural\nComprovante de matrícula, ficha de inscrição em escola ou boletim escolar — Inciso XVII — do trabalhador ou dos filhos, com endereço ou escola rural\nRegistro em livros de entidades religiosas (batismo, crisma, casamento, sacramentos) — Inciso XXXII — com qualificação como agricultor\nDocumentos rurais no nome do cônjuge ou companheiro — Tema 327 TNU — valem como início de prova material para o outro cônjuge. Traga a certidão de casamento junto.\nProcesso administrativo de familiar já aposentado como segurado especial — Tema 327 TNU — prova emprestada de alta eficácia', E'Para a aposentadoria rural, o mais importante é comprovar que você trabalhou no campo. Reúna o máximo de documentos possível — mesmo os mais antigos ou incompletos podem ajudar. A lista abaixo segue o art. 116 da IN 128/2022 do INSS.\n\n⚠️ Os documentos dos grupos D, E e F precisam ter anotado o nome, a profissão como agricultor/lavrador ou o endereço rural para valer como prova. Sem isso, o INSS pode rejeitar.\n\n⚠️ Documentos no nome do marido, esposa, pais ou filhos que moram com você também podem ser usados (Tema 327 TNU). Traga tudo o que tiver — inclusive dos parentes.\n\n✅ O INSS realiza autodeclaração online pelo Meu INSS. Seu advogado prepara a declaração e reúne os documentos de ratificação antes do protocolo.\n\nℹ️ Não é necessário ter todos os documentos. Mesmo um ou dois documentos contemporâneos ao período de trabalho rural podem ser suficientes para garantir o benefício.'),
  (E'Apos. Especial', E'RG, CNH ou CIN\nCPF\nComprovante de residência — Em nome do cliente, com no máximo 3 meses. Se estiver em nome do cônjuge, traga também a certidão de casamento. Sem comprovante em seu nome ou do cônjuge, avise seu advogado\nBiometria — Verifique se está atualizada na Justiça Eleitoral', E'Carteira de Trabalho (CTPS) — Com os registros nos períodos de atividade especial\nExtrato do CNIS atualizado\nPPP (Perfil Profissiográfico Previdenciário) — Obrigatório a partir de 01/01/2004 — a empresa É OBRIGADA a fornecer. Para empregos a partir de 2023, o PPP é exclusivamente eletrônico (eSocial). Peça por escrito.\nSe a empresa fechou, informe seu advogado — Há procedimento específico para esses casos — é possível buscar LTCAT e outros documentos mesmo sem a empresa\nAté 13/10/1996 — formulário SB-40, DISES BE 5235, DSS-8030 ou DIRBEN 8030 — Emitido pela empresa ou preposto, acompanhado de CTPS com anotação da atividade\nDe 14/10/1996 a 31/12/2003 — formulário DIRBEN 8030 ou DSS-8030 — Deve ter sido emitido com base em LTCAT\nA partir de 18/07/2002 — PPP já era aceito como formulário de reconhecimento\nLTCAT — Laudo Técnico de Condições Ambientais do Trabalho — Emitido por médico do trabalho ou engenheiro de segurança — deve ter agente nocivo, concentração/intensidade, metodologia e data da avaliação\nPPRA (Programa de Prevenção de Riscos Ambientais) ou PGR (Programa de Gerenciamento de Riscos)\nPCMSO — Programa de Controle Médico de Saúde Ocupacional\nPCMAT — Programa de Condições e Meio Ambiente de Trabalho na Construção\nOutros laudos ambientais com os elementos do art. 276 da IN 128/2022\n[Jornada] Folhas de ponto ou cartões eletrônicos de ponto do período\n[Jornada] Holerites e contracheques mostrando pagamento habitual de horas extras\n[Jornada] Registro Eletrônico de Ponto (REP) emitido pela empresa\n[Jornada] Acordo coletivo ou convenção coletiva com previsão de jornada estendida (12x36, 8x12)\n[Jornada] Contrato individual de trabalho com previsão da jornada\n[Jornada] Eventos do eSocial S-2240 e S-2400 — para vínculos a partir de setembro de 2019\n[Jornada] Declaração formal da empresa atestando a jornada habitual e a habitualidade das horas extras\n[Jornada] Sentença ou acordo homologado em Reclamação Trabalhista reconhecendo horas extras habituais (Tema 132 TST)\n[Jornada] Ata de audiência trabalhista com confissão da empresa sobre a jornada\n[Jornada] Escalas oficiais de turno — plantões, revezamento 12x36, escala rodoviária\n[Jornada] CTPS com anotação da jornada\n[Jornada] Diário de bordo ou ficha de viagem — motoristas profissionais\n[Jornada] Recibos de pagamento de adicional noturno habitual', E'A aposentadoria especial é para quem trabalhou exposto a ruídos, substâncias químicas, calor ou agentes biológicos prejudiciais à saúde. O documento principal é o PPP. Os formulários aceitos variam conforme o período trabalhado (art. 272 da IN 128/2022).\n\n🚨 Sem o PPP, a chance de negativa é altíssima. Solicite à empresa por escrito antes de qualquer outra providência. Para vínculos a partir de 2023, o PPP é eletrônico (eSocial S-2240).\n\n⚠️ O LTCAT emitido em data anterior ou posterior ao período é aceito se a empresa informar expressamente que não houve alteração no ambiente de trabalho (art. 279 da IN 128/2022).\n\n⚠️ EPI NÃO neutraliza o direito para ruído acima do limite (Tema 555 STF). O Tema 1090 STJ reforça que para agentes cancerígenos, biológicos e cumulativos a alegação de eficácia de EPI é insuficiente. Os Pareceres Fundacentro nº 2/2025 e 3/2025 (Ofício 221/2025/PRES) ancoram a tese pró-segurado no Tema 383 TNU para agentes biológicos.\n\n⚠️ Motociclista profissional (motoboy, mototaxista, entregador) — atividade especial por periculosidade desde 09/05/2014 (Lei 12.997/2014), com NR-16 Anexo V e Portaria MTE 2.021/2025. Período anterior pode ser enquadrado por outras vias.\n\nℹ️ Conversão de tempo especial em tempo comum só vale para períodos até 13/11/2019 (EC 103/2019). Para períodos posteriores, é necessária aposentadoria especial pura. Informe seu advogado de todos os períodos.\n\n✅ Categoria profissional pré-1995 — quem exerceu profissão listada nos Decretos 53.831/64 e 83.080/79 antes de 28/04/1995 tem presunção de exposição (Súmula 198 TFR, Súmula 555 STJ). Não precisa de PPP nesse período.'),
  (E'Apos. por Incapacidade Permanente', E'RG, CNH ou CIN\nCPF\nComprovante de residência — Em nome do cliente, com no máximo 3 meses. Se estiver em nome do cônjuge, traga também a certidão de casamento. Sem comprovante em seu nome ou do cônjuge, avise seu advogado\nBiometria — Verifique se está atualizada na Justiça Eleitoral', E'▸ Documentos gerais de incapacidade permanente\nLaudo do médico que acompanha — com CID, descrição do quadro e avaliação sobre capacidade de trabalho\nExames de imagem, laboratoriais e laudos\nHistórico de internações e cirurgias — com datas e local\nReceitas médicas antigas — mostram o histórico do tratamento\nRelatórios de especialistas — cardiologista, ortopedista, neurologista etc.\nCarteira de Trabalho (CTPS)\nExtrato do CNIS atualizado\nSe tiver auxílio-doença ativo, informe o número do benefício\nCAT (Comunicação de Acidente de Trabalho) — se a empresa registrou\nBoletim de ocorrência — se houve registro policial\n▸ Coluna vertebral — hérnia de disco, osteofitose, estenose, espondilose\nRessonância magnética (RM) da coluna — seriada (2+ exames em datas diferentes) para demonstrar persistência e irreversibilidade\nEletroneuromiografia (ENMG) — classificação do grau de radiculopatia (leve, moderado, severo, com ou sem denervação)\nLaudo do ortopedista ou neurocirurgião — com todos os CIDs (M51.1, M47.8, M48.0), prognóstico RESERVADO e opinião sobre irreversibilidade\nRelatório de fisioterapia — evolução e limitações persistentes após tratamento prolongado\nReceituários em série cronológica — gabapentina, pregabalina, opioides — demonstram quadro álgico crônico\nRelatórios de bloqueios, infiltrações e rizotomia — repetição de intervenções demonstra refratariedade\nRelatório cirúrgico — artrodese, discectomia, laminectomia — se houve cirurgia e permanecem limitações\nRM pós-operatória — fibrose peridural, recidiva herniária (síndrome pós-laminectomia, CID M96.1)\nLaudos de afastamento anteriores pelo INSS (B31 ou B91) — demonstram histórico de incapacidade reconhecida\n▸ Perda auditiva — surdez, hipoacusia\nAudiometria tonal e vocal — nas frequências de 500, 1.000, 2.000 e 3.000 Hz — seriada\nBERA (Potencial Evocado Auditivo) — exame objetivo\nLaudo de otorrinolaringologista — com CID (H90 ou H91), etiologia e prognóstico\nRelatório fonoaudiológico — avaliação da comunicação e dificuldades funcionais\nPrescrição e histórico de uso de aparelho auditivo (AASI) ou implante coclear\n▸ Perda visual — cegueira, baixa visão, visão monocular\nExame de acuidade visual com e sem correção (tabela de Snellen)\nCampimetria visual — glaucoma, retinose, doenças de retina\nLaudo de oftalmologista — com CID, diagnóstico e prognóstico\nOCT (Tomografia de Coerência Óptica), retinografia ou angiofluoresceinografia\nRelatório de terapeuta em orientação e mobilidade — se houver\n▸ Joelho — ruptura de ligamento, lesão meniscal, artrose avançada\nRessonância magnética (RM) do joelho — seriada se possível\nRadiografia com carga — redução do espaço articular e desvio de eixo\nGoniometria — amplitude de movimento residual\nLaudo do ortopedista — com CID (M23.5, S83.5, M17), prognóstico e opinião sobre irreversibilidade\nRelatório cirúrgico — artroscopia, reconstrução de LCA, prótese total de joelho\nRelatório de fisioterapia pós-cirúrgica — demonstrar limitação residual após reabilitação\n▸ Ombro — manguito rotador, instabilidade, artrose\nRessonância magnética (RM) do ombro — seriada se possível\nGoniometria de elevação, abdução e rotações — comparação bilateral\nLaudo do ortopedista — com CID (M75.1, M75.0, M19.0), prognóstico e opinião sobre irreversibilidade\nENMG de membros superiores — se houver neuropatia associada\nRelatório cirúrgico — reparo artroscópico, prótese — se houve\nRelatório de fisioterapia — demonstrar limitação residual persistente\n▸ Transtorno mental — depressão grave, esquizofrenia, bipolar\nLaudo de psiquiatra — com CID (F20, F31, F32, F33, F41), descrição do impacto funcional e prognóstico\nRelatório de psicólogo — funcionalidade e autonomia\nReceituários em série cronológica — demonstram cronicidade\nGuias de internação psiquiátrica ou CAPS — se houve\nAvaliação neuropsicológica — se comprometimento cognitivo\nCAT — se nexo com o trabalho', E'Este benefício é para quem não tem mais condições de trabalhar permanentemente. Reúna todos os documentos médicos que tiver — quanto mais completo, melhor.\n\nℹ️ O INSS agendará perícia médica obrigatória. O laudo do seu médico não substitui a perícia — mas é essencial para o perito conhecer seu caso.\n\n✅ ACRÉSCIMO DE 25% — O art. 45 da Lei 8.213/91 segue vigente para a aposentadoria por incapacidade permanente sempre que o segurado precisar de ASSISTÊNCIA PERMANENTE DE TERCEIROS (Anexo I do Decreto 3.048/99). Documente com laudo médico detalhado descrevendo as atividades em que precisa de ajuda.'),
  (E'Apos. do Professor', E'RG, CNH ou CIN\nCPF\nComprovante de residência — Em nome do cliente, com no máximo 3 meses. Se estiver em nome do cônjuge, traga também a certidão de casamento. Sem comprovante em seu nome ou do cônjuge, avise seu advogado\nBiometria — Verifique se está atualizada na Justiça Eleitoral', E'Carteira de Trabalho (CTPS) — Com os registros de todos os períodos como professor(a)\nContratos de trabalho e termos de rescisão — De cada escola ou instituição de ensino\nExtratos do FGTS — Com datas de admissão e demissão por escola\nExtrato do CNIS atualizado\nDiploma de licenciatura ou pedagogia — Que habilita para o exercício do magistério\nContracheques ou holerites — Com o cargo indicado — professor, pedagogo, diretor, coordenador pedagógico\nPortarias de nomeação ou designação — Para escolas públicas — obtidas junto ao órgão de educação\nAta de posse ou termo de exercício — Para professores concursados em cargo público\nDeclaração do estabelecimento de ensino — Confirmando o período e a função — com CNPJ da escola e assinatura do representante legal\nHistórico funcional da Secretaria de Educação — Para professores das redes municipal ou estadual\nQualquer documento contemporâneo ao período — Holerite, contrato de trabalho, declaração de sócio\nDTC — Declaração de Tempo de Contribuição emitida pelo INSS', E'A aposentadoria do professor tem regras diferenciadas para quem atuou exclusivamente no ensino infantil, fundamental ou médio. O tempo deve ser comprovado em funções de magistério.\n\n🚨 TODO o tempo exigido deve ser em magistério na educação BÁSICA. Tempo em ensino superior, cursos livres ou funções administrativas sem relação pedagógica NÃO conta.\n\n⚠️ A regra permanente pós-Reforma exige 25 anos de magistério mais 57 anos (professora) ou 60 anos (professor). Quem já contribuía antes de 13/11/2019 tem regras de transição — seu advogado calculará a mais vantajosa.\n\n✅ Além de professor de sala de aula, têm direito os diretores, coordenadores, orientadores pedagógicos, supervisores e planejadores de ensino (Lei 11.301/2006, ADI 3772 STF).\n\n✅ EDUCAÇÃO INFANTIL — A Lei 15.326/2026 reconhece tempo em educação infantil e creche como magistério, inclusive funções pedagógicas em berçário. Auxiliar de creche com função híbrida pode ter o tempo computado. Reúna a descrição da função.'),
  (E'Apos. Tempo — Pessoa com Deficiência', E'RG, CNH ou CIN\nCPF\nComprovante de residência — Em nome do cliente, com no máximo 3 meses. Se estiver em nome do cônjuge, traga também a certidão de casamento. Sem comprovante em seu nome ou do cônjuge, avise seu advogado\nBiometria — Verifique se está atualizada na Justiça Eleitoral', E'▸ Documentos de trabalho e contribuições\nCarteira de Trabalho (CTPS) — todas as páginas com registros\nExtratos do FGTS — um por empresa\nComprovantes de GPS ou contribuições como autônomo — se houver períodos como CI ou facultativo\nDAS do MEI — se houver período como Microempreendedor\nExtrato do CNIS atualizado — seu advogado pode obter\nTermos de rescisão (TRCT) ou comprovantes de rescisão contratual\nDTC — Declaração de Tempo de Contribuição emitida pelo INSS\n▸ Laudos e documentos médicos gerais\nLaudo médico com diagnóstico (CID) e descrição das LIMITAÇÕES FUNCIONAIS — o que a deficiência impede ou dificulta no dia a dia, não apenas o nome da doença\nRelatório do médico especialista — impacto na rotina, trabalho e vida social\nExames que comprovam a deficiência — específicos do tipo de impedimento\nHistórico de internações, cirurgias e tratamentos — com datas\nReceitas médicas antigas — mostram histórico e continuidade do tratamento\nLaudos de outros profissionais de saúde — psicólogo, terapeuta ocupacional, fisioterapeuta, fonoaudiólogo, assistente social\n▸ Comprovação da data de início da deficiência\nProntuários antigos de posto de saúde, hospital ou UBS — quanto mais antigo, melhor\nAtendimentos de emergência da época do início da deficiência\nReceitas médicas e prescrições antigas com data\nLaudos ou relatórios médicos de anos anteriores\nFicha de tratamento em reabilitação — com data de início\nCarteira de vacinação ou cartão da gestante — se registrar condição da criança ao nascer (deficiência congênita)\n▸ Deficiência auditiva — documentos específicos\nAudiometria tonal e vocal — nas frequências de 500, 1.000, 2.000 e 3.000 Hz — recente (últimos 12 meses)\nLaudo de otorrinolaringologista — com CID (H90 ou H91), diagnóstico, etiologia e data provável de início\nImitanciometria — complementa a audiometria\nBERA (Potencial Evocado Auditivo de Tronco Encefálico) — exame objetivo, especialmente útil em crianças\nRelatório fonoaudiológico — avaliação da comunicação, linguagem e dificuldades funcionais\nPrescrição e histórico de uso de aparelho auditivo (AASI) ou implante coclear — receituário, notas fiscais, relatórios de mapeamento\nRelatório de adaptação do aparelho auditivo — demonstra limitações persistentes mesmo com prótese\nDocumentação escolar com AEE ou intérprete de Libras — se houver\n▸ Deficiência visual — documentos específicos\nExame de acuidade visual com correção óptica\nCampimetria (campo visual) — especialmente para baixa visão e visão monocular\nLaudo de oftalmologista — com CID, diagnóstico e prognóstico\nRelatório de terapeuta em orientação e mobilidade — se houver\nOCT (Tomografia de Coerência Óptica) ou outros exames complementares\n▸ Coluna vertebral — hérnia de disco, osteofitose, estenose, espondilose\nRessonância magnética (RM) da coluna — segmento acometido — idealmente seriada (2 ou mais exames em datas diferentes, separados por pelo menos 12 meses) para demonstrar persistência\nRadiografia simples da coluna — útil para demonstrar osteófitos e redução do espaço discal — radiografias antigas permitem comparação evolutiva\nEletroneuromiografia (ENMG) — documenta radiculopatia objetivamente, com classificação do grau (leve, moderado, severo)\nLaudo do ortopedista ou neurocirurgião — com todos os CIDs aplicáveis (M51.1, M47.8, M48.0, M50.1), limitações funcionais concretas e opinião sobre irreversibilidade\nRelatório de fisioterapia — frequência, evolução funcional, limitações de amplitude de movimento (goniometria), restrições para atividades cotidianas\nReceituários em série cronológica — gabapentina, pregabalina, amitriptilina, duloxetina, opioides — uso contínuo de medicação neuropática indica impedimento permanente\nRelatórios de bloqueios facetários, infiltrações peridurais ou rizotomia — repetição de intervenções demonstra dor refratária\nRelatório cirúrgico — se houve artrodese, discectomia, laminectomia ou fixação pedicular — cirurgia prévia reforça gravidade e cronicidade\nRM pós-operatória — se houve cirurgia e permanecem limitações (síndrome pós-laminectomia, CID M96.1)\nLaudos de afastamento pelo INSS (B31 ou B91) — o próprio INSS já reconheceu incapacidade, reforça impedimento de longo prazo\nLaudo do Detran de habilitação especial — se houver restrição na CNH\n▸ Joelho — ruptura de ligamento, lesão meniscal, artrose\nRessonância magnética (RM) do joelho — documenta lesão ligamentar (LCA, LCP, colaterais), lesão meniscal, condropatia, derrame articular\nRadiografia do joelho com carga — evidencia redução do espaço articular (artrose) e desvio de eixo (varo/valgo)\nGoniometria — medição objetiva da amplitude de movimento (flexão e extensão) — comparação com lado contralateral\nLaudo do ortopedista — com CID específico (M23.5 lesão meniscal, S83.5 ruptura LCA, M17 gonartrose), grau de instabilidade e limitações funcionais\nRelatório cirúrgico — artroscopia, reconstrução de LCA, meniscectomia, prótese de joelho — se houve cirurgia\nRelatório de fisioterapia pós-operatória — evolução, amplitude de movimento residual, instabilidade persistente\nReceituários de analgésicos, anti-inflamatórios e viscossuplementação — demonstram tratamento contínuo\nLaudos de afastamento pelo INSS (B31 ou B91) — se houve períodos anteriores de incapacidade reconhecida\n▸ Ombro — manguito rotador, instabilidade, artrose\nRessonância magnética (RM) do ombro — documenta ruptura do manguito rotador (parcial ou total), lesão do labrum, artrose acromioclavicular, bursite\nRadiografia do ombro — posição AP e axilar — demonstra calcificações, osteófitos e redução do espaço subacromial\nGoniometria de elevação, abdução e rotações — medição objetiva — comparação bilateral\nLaudo do ortopedista — com CID específico (M75.1 manguito rotador, M75.0 capsulite adesiva, M19.0 artrose), grau da lesão e limitações funcionais\nENMG de membros superiores — se houver neuropatia associada (compressão do plexo braquial, neuropatia do supraescapular)\nRelatório cirúrgico — reparo artroscópico do manguito, acromioplastia, prótese — se houve cirurgia\nRelatório de fisioterapia — evolução funcional e limitações persistentes após tratamento\nLaudos de afastamento pelo INSS (B31 ou B91) — se houve períodos anteriores de incapacidade reconhecida\n▸ Outra deficiência física ou motora — documentos gerais\nLaudo de ortopedista, neurologista, fisiatra ou reumatologista — com CID e limitações funcionais\nExames de imagem — radiografia, ressonância, tomografia — com laudo\nRelatório de fisioterapia — frequência, evolução e limitações persistentes\nLaudo do Detran de habilitação especial — válido como prova de limitação funcional\nPrescrição de cadeira de rodas, órtese, prótese ou muleta — demonstra gravidade\n▸ Deficiência intelectual, mental ou autismo — documentos específicos\nLaudo de psiquiatra ou neurologista — com CID e descrição do impacto funcional\nAvaliação neuropsicológica — com testes aplicados e resultados\nRelatório de psicólogo — avaliação de funcionalidade e autonomia\nRelatório da APAE, CAPS ou instituição de atendimento — se houver acompanhamento\nRelatório escolar com necessidades educacionais especiais — plano de ensino individualizado\n▸ Documentos de inclusão e adaptação social\nCarteira de Passe Livre (Lei 8.899/94) — se houver\nCarteira de identificação de pessoa com deficiência — emitida pelo município ou estado\nHistórico escolar com registro de AEE (Atendimento Educacional Especializado)\nComprovante de inscrição em cota PCD em empresa (art. 93, Lei 8.213/91)\nDeclaração de empresa sobre adaptações no ambiente de trabalho — ou ausência delas\n▸ Comprovação de jornada efetiva (horas extras habituais)\nFolhas de ponto ou cartões eletrônicos de ponto do período\nHolerites e contracheques mostrando pagamento habitual de horas extras\nRegistro Eletrônico de Ponto (REP) emitido pela empresa\nAcordo coletivo ou convenção coletiva com previsão de jornada estendida (12x36, 8x12)\nContrato individual de trabalho com previsão da jornada\nEventos do eSocial S-2240 e S-2400 — para vínculos a partir de setembro de 2019\nDeclaração formal da empresa atestando a jornada habitual e a habitualidade das horas extras\nSentença ou acordo homologado em Reclamação Trabalhista reconhecendo horas extras habituais (Tema 132 TST)\nAta de audiência trabalhista com confissão da empresa sobre a jornada\nEscalas oficiais de turno — plantões, revezamento 12x36, escala rodoviária\nCTPS com anotação da jornada\nDiário de bordo ou ficha de viagem — motoristas profissionais\nRecibos de pagamento de adicional noturno habitual', E'A aposentadoria por tempo de contribuição da pessoa com deficiência (LC 142/2013) permite aposentadoria com menos tempo e sem exigência de idade. O grau da deficiência reconhecido pelo INSS determina o tempo exigido.\n\n🔬 O INSS realizará PERÍCIA BIOPSICOSSOCIAL com médico e assistente social, usando o IF-BrA com lógica fuzzy nos sete domínios. O grau reconhecido (grave, moderado ou leve) define o tempo exigido. Para mulheres, varia de 20 a 28 anos. Para homens, de 25 a 33 anos.\n\n🚨 Laudo com apenas diagnóstico, sem descrever limitações do dia a dia, resulta em grau baixo ou negativa. Peça ao médico que detalhe o que você não consegue fazer ou faz com dificuldade — em cada um dos sete domínios.\n\n⚠️ DID RETROATIVA — É preciso comprovar a Data de Início da Deficiência (DID) durante o período contributivo. Documentos antigos são fundamentais. Presunção de continuidade favorece o segurado.\n\n✅ FIBROMIALGIA — A Lei 15.176/2025 equiparou a fibromialgia à pessoa com deficiência. Reúna critérios ACR, FIQ, BPI e relatórios multidisciplinares.\n\n✅ DEFICIÊNCIA AUDITIVA — A Lei 14.768/2023 ampliou o reconhecimento da deficiência auditiva uni e bilateral. Audiometria nas frequências 500, 1k, 2k, 3k Hz, BERA e laudo ORL com CID H90 ou H91 são essenciais.\n\n✅ A LC 142/2013 não foi alterada pela Reforma da Previdência. Seus requisitos e forma de cálculo continuam integralmente válidos — benefício calculado com 100% da média.'),
  (E'Apos. Idade — Pessoa com Deficiência', E'RG, CNH ou CIN — com comprovação de idade\nCPF\nComprovante de residência — Em nome do cliente, com no máximo 3 meses. Se estiver em nome do cônjuge, traga também a certidão de casamento. Sem comprovante em seu nome ou do cônjuge, avise seu advogado\nBiometria — Verifique se está atualizada na Justiça Eleitoral', E'▸ Documentos de trabalho e contribuições\nCarteira de Trabalho (CTPS)\nExtrato do CNIS atualizado — para verificar se os 15 anos de contribuição estão completos\nComprovantes de GPS — se houver períodos como autônomo\nDAS do MEI — se houver período como Microempreendedor\n▸ Laudos e documentos médicos gerais\nLaudo médico com diagnóstico (CID) e limitações funcionais — foco no impacto na vida diária\nRelatório do médico especialista\nExames de apoio ao diagnóstico\nHistórico de internações, cirurgias e tratamentos — com datas\nLaudos de outros profissionais — psicólogo, terapeuta, fisioterapeuta, fonoaudiólogo\n▸ Comprovação da data de início da deficiência\nProntuários antigos de posto de saúde ou hospital — quanto mais antigo, melhor\nReceitas médicas e prescrições antigas com data\nLaudos ou relatórios médicos de anos anteriores\nFicha de tratamento em reabilitação — com data de início\n▸ Deficiência auditiva — documentos específicos\nAudiometria tonal e vocal — nas frequências de 500, 1.000, 2.000 e 3.000 Hz\nLaudo de otorrinolaringologista — com CID (H90 ou H91), diagnóstico e data provável de início\nBERA — exame objetivo de audição\nRelatório fonoaudiológico — comunicação, linguagem e dificuldades funcionais\nPrescrição e histórico de uso de aparelho auditivo (AASI) ou implante coclear\n▸ Deficiência visual — documentos específicos\nExame de acuidade visual com correção óptica\nCampimetria (campo visual)\nLaudo de oftalmologista — com CID, diagnóstico e prognóstico\n▸ Coluna vertebral — hérnia de disco, osteofitose, estenose\nRessonância magnética (RM) da coluna — seriada se possível (2 exames em datas diferentes)\nEletroneuromiografia (ENMG) — documenta radiculopatia objetivamente\nLaudo do ortopedista ou neurocirurgião — com CIDs (M51.1, M47.8, M48.0), limitações e opinião sobre irreversibilidade\nRelatório de fisioterapia — evolução e limitações persistentes\nReceituários em série — gabapentina, pregabalina, opioides — uso contínuo indica impedimento permanente\nRelatório cirúrgico — se houve artrodese, discectomia ou laminectomia\nLaudos de afastamento pelo INSS (B31 ou B91) — se houve\n▸ Joelho — ruptura de ligamento, lesão meniscal, artrose\nRessonância magnética (RM) do joelho\nRadiografia com carga — redução do espaço articular (artrose)\nGoniometria — amplitude de movimento — comparação bilateral\nLaudo do ortopedista — com CID (M23.5, S83.5, M17) e limitações funcionais\nRelatório cirúrgico — se houve artroscopia, reconstrução de LCA ou prótese\n▸ Ombro — manguito rotador, instabilidade, artrose\nRessonância magnética (RM) do ombro\nGoniometria de elevação, abdução e rotações — comparação bilateral\nLaudo do ortopedista — com CID (M75.1, M75.0, M19.0) e limitações funcionais\nRelatório cirúrgico — se houve reparo artroscópico ou prótese\n▸ Outra deficiência física ou motora\nLaudo de ortopedista, neurologista, fisiatra ou reumatologista — com CID e limitações\nExames de imagem com laudo\nLaudo do Detran de habilitação especial — se houver\n▸ Deficiência intelectual, mental ou autismo — documentos específicos\nLaudo de psiquiatra ou neurologista — com CID e impacto funcional\nAvaliação neuropsicológica\nRelatório da APAE, CAPS ou instituição de atendimento — se houver\n▸ Documentos de inclusão e adaptação social\nCarteira de Passe Livre (Lei 8.899/94) — se houver\nCarteira de identificação de pessoa com deficiência\nHistórico escolar com AEE ou intérprete de Libras', E'A pessoa com deficiência pode se aposentar por idade com 5 anos a menos do que a regra geral. A idade exigida é de 55 anos para mulher e 60 anos para homem, com ao menos 15 anos de contribuição com deficiência comprovada nesse período.\n\n🔬 O INSS realizará a perícia biopsicossocial. Para esta modalidade, qualquer grau de deficiência (leve, moderada ou grave) dá direito ao benefício.\n\n⚠️ É necessário comprovar a deficiência durante pelo menos 15 anos de contribuição. Documentos antigos do início são indispensáveis. Presunção de continuidade favorece o segurado.\n\n✅ FIBROMIALGIA (Lei 15.176/2025) e DEFICIÊNCIA AUDITIVA (Lei 14.768/2023) também valem para esta modalidade. Reúna laudos específicos.\n\n✅ O cálculo começa em 70% da média e acrescenta 1% a cada 12 contribuições além de 15 anos. Seu advogado simulará o valor antes de protocolar.'),
  (E'Aux. Incapacidade Temporária', E'RG, CNH ou CIN\nCPF\nBiometria — Verifique se está atualizada na Justiça Eleitoral', E'▸ Documentos gerais de incapacidade\nAtestado médico — com CID, período de afastamento e assinatura com CRM — documento principal\nLaudo médico detalhado — relatório completo do médico sobre o caso, com descrição do impacto na capacidade de trabalho\nExames que sustentam o diagnóstico\nCarteira de Trabalho (CTPS)\nSe for empregado CLT, peça declaração da empresa com a data de início do afastamento — peça ao RH antes de protocolar\nCAT (Comunicação de Acidente de Trabalho) — se a empresa registrou\nReceituários de medicamento controlado\n▸ Coluna vertebral — hérnia de disco, osteofitose, estenose, lombalgia\nRessonância magnética (RM) da coluna — segmento acometido — exame principal para o perito\nEletroneuromiografia (ENMG) — se houver dor irradiada, formigamento ou perda de força\nLaudo do ortopedista ou neurocirurgião — com CIDs (M51.1, M47.8, M48.0, M54.4) e avaliação da capacidade laboral\nRelatório de fisioterapia — frequência e evolução\nReceituários de gabapentina, pregabalina, amitriptilina ou opioides — uso contínuo reforça gravidade\nRelatórios de bloqueios ou infiltrações — se realizados\nRelatório cirúrgico — se houve artrodese, discectomia ou laminectomia\n▸ Perda auditiva — surdez, hipoacusia\nAudiometria tonal e vocal — nas frequências de 500, 1.000, 2.000 e 3.000 Hz — recente\nBERA (Potencial Evocado Auditivo) — exame objetivo\nLaudo de otorrinolaringologista — com CID (H90 ou H91), diagnóstico, etiologia e data provável de início\nRelatório fonoaudiológico — avaliação funcional da comunicação\n▸ Perda visual — cegueira, baixa visão, visão monocular\nExame de acuidade visual com e sem correção óptica (tabela de Snellen)\nCampimetria visual — especialmente para glaucoma e doenças de retina\nLaudo de oftalmologista — com CID, diagnóstico e prognóstico\nOCT (Tomografia de Coerência Óptica) ou retinografia — se indicados\n▸ Joelho — ruptura de ligamento, lesão meniscal, artrose\nRessonância magnética (RM) do joelho\nRadiografia com carga — se artrose\nGoniometria — amplitude de movimento — comparação bilateral\nLaudo do ortopedista — com CID (M23.5, S83.5, M17) e avaliação da capacidade laboral\nRelatório cirúrgico — se houve artroscopia, reconstrução de LCA ou prótese\n▸ Ombro — manguito rotador, instabilidade, capsulite\nRessonância magnética (RM) do ombro\nGoniometria de elevação, abdução e rotações — comparação bilateral\nLaudo do ortopedista — com CID (M75.1, M75.0, M19.0) e avaliação da capacidade laboral\nRelatório cirúrgico — se houve reparo artroscópico ou acromioplastia\n▸ Transtorno mental — depressão, ansiedade, burnout\nLaudo de psiquiatra — com CID (F32, F33, F41, F43, QD85) e descrição do impacto funcional\nRelatório de psicólogo — avaliação de funcionalidade\nReceituários de medicação psiquiátrica em série cronológica\nGuias de internação psiquiátrica ou CAPS — se houve\nCAT — se o transtorno tiver nexo com o trabalho', E'Se você está impossibilitado de trabalhar por mais de 15 dias seguidos por doença ou acidente, pode ter direito a este benefício. Veja o que precisa reunir.\n\nℹ️ Empregado CLT — a empresa paga os primeiros 15 dias. O INSS paga a partir do 16º dia.\n\n⚠️ Doenças graves (câncer, AIDS, tuberculose, Parkinson, esclerose múltipla e outras do art. 151 Lei 8.213/91) dispensam carência. Informe seu advogado.\n\n⚠️ ANÁLISE DOCUMENTAL — A Portaria Conjunta MPS/INSS 13/2026 regulamenta a análise documental do B31 com limite de 30/90 dias e trava de 180 dias após 3 indeferimentos. Reforce o pedido com atestado bem fundamentado.\n\n⚠️ TELEPERÍCIA — A Portaria DPMF/INSS 19/2026 regula a perícia por videoconferência. Recusa por motivo legítimo (acessibilidade, comorbidade, dificuldade técnica) é direito do segurado. Documente.\n\n✅ Se o INSS fixar DCB e você ainda não estiver bem, peça prorrogação pelo Meu INSS com novo atestado, ANTES do término. Tema 1421 STF (limbo previdenciário-trabalhista) protege o trabalhador entre alta médica e retorno efetivo ao trabalho.'),
  (E'Aux. Acidente', E'RG, CNH ou CIN\nCPF\nBiometria — Verifique se está atualizada na Justiça Eleitoral', E'▸ Documentos gerais de sequela permanente\nCAT (Comunicação de Acidente de Trabalho) — se foi acidente de trabalho e a empresa registrou\nBoletim de ocorrência — se houve registro policial ou no SAMU\nLaudo descrevendo a sequela permanente — como a limitação afeta a capacidade de trabalho\nExames de imagem e laudos\nHistórico do tratamento após o acidente — cirurgias, fisioterapia, internações\nCarteira de Trabalho (CTPS)\n▸ Coluna vertebral — hérnia traumática, fratura vertebral, sequela pós-cirúrgica\nRessonância magnética (RM) da coluna — pós-consolidação da lesão\nEletroneuromiografia (ENMG) — documenta radiculopatia residual permanente\nLaudo do ortopedista ou neurocirurgião — com CID, descrição da sequela e redução funcional\nRelatório cirúrgico — artrodese, fixação — se houve cirurgia\nRelatório de fisioterapia — demonstrar limitação residual após reabilitação completa\n▸ Perda auditiva — trauma acústico, perda induzida por ruído\nAudiometria tonal e vocal — pré e pós-acidente se disponível\nLaudo de otorrinolaringologista — com CID (H90, H91, H83.3), nexo causal e perda residual\nBERA — exame objetivo de audição\nHistórico de exposição ao ruído — PPP, LTCAT, PGR\n▸ Perda visual — trauma ocular, descolamento de retina\nExame de acuidade visual com e sem correção\nCampimetria visual — se perda de campo\nLaudo de oftalmologista — com CID, nexo causal e sequela permanente\n▸ Joelho — sequela de ruptura ligamentar, fratura, meniscectomia\nRessonância magnética (RM) do joelho — pós-consolidação\nRadiografia com carga — se artrose pós-traumática\nGoniometria — amplitude residual — comparação bilateral\nLaudo do ortopedista — com CID, sequela permanente e redução funcional\nRelatório cirúrgico e de fisioterapia — demonstrar limitação residual após reabilitação\n▸ Ombro — sequela de ruptura do manguito, luxação recidivante, fratura\nRessonância magnética (RM) do ombro — pós-consolidação\nGoniometria de elevação, abdução e rotações — comparação bilateral\nLaudo do ortopedista — com CID, sequela permanente e limitação funcional residual\nRelatório cirúrgico e de fisioterapia — se houve', E'O auxílio-acidente é pago a quem sofreu acidente e ficou com limitação permanente que reduz a capacidade de trabalho — mesmo que continue trabalhando.\n\n🚨 Contribuintes individuais (autônomos) e segurados facultativos NÃO têm direito ao auxílio-acidente. O benefício é restrito a empregados urbanos e rurais, domésticos (acidentes a partir de 01/06/2015), trabalhadores avulsos e segurados especiais (art. 18 §1º Lei 8.213/91).\n\n⚠️ O Anexo III do Decreto 3.048/99 é EXEMPLIFICATIVO. A sequela não precisa estar literalmente listada — basta demonstrar redução parcial e permanente da capacidade habitual (Tema 416 STJ, Súmula 88 e Súmula 89 TNU). Mesmo sequela mínima dá direito (Tema 201 TNU).\n\n⚠️ INTEGRAÇÃO NA APOSENTADORIA — O Tema 862 STJ confirma que o B94 integra o salário-de-benefício de aposentadoria posterior. Se você se aposentar, exija o cômputo do B94 na média (art. 31 Lei 8.213/91).\n\nℹ️ O auxílio-acidente não impede que você continue trabalhando — é pago junto com o salário até a aposentadoria. A Súmula 507 STJ garante a cumulação para B94 com DIB anterior a 11/11/1997.\n\n⚠️ Não existe opção específica no Meu INSS. Agende a perícia médica pela plataforma como benefício por incapacidade, ou ligue para o 135. Informe seu advogado antes de protocolar.\n\n✅ Acidente de qualquer tipo conta — de trabalho, doméstico, de trânsito ou doença profissional. Sem carência (art. 26 II Lei 8.213/91).'),
  (E'Pensão por Morte', E'▸ Documentos sobre quem faleceu\nCertidão de óbito — Original e cópia\nRG e CPF do falecido — Se disponíveis\nCarteira de Trabalho do falecido\nÚltimas contribuições ou extrato CNIS do falecido — Seu advogado pode verificar no sistema\n▸ Documentos do requerente\nRG, CNH ou CIN\nCPF\nComprovante de residência — Em nome do cliente, com no máximo 3 meses. Se estiver em nome do cônjuge, traga também a certidão de casamento. Sem comprovante em seu nome ou do cônjuge, avise seu advogado\nBiometria — Verifique se está atualizada na Justiça Eleitoral', E'Certidão de casamento — Documento suficiente — não é necessário comprovar dependência econômica\nCertidão de nascimento de filho havido em comum\nCertidão de casamento religioso — Reconhecido pela comunidade\nDeclaração de Imposto de Renda com indicação do companheiro como dependente\nDisposições testamentárias (testamento)\nEscritura pública de união estável lavrada em cartório\nCertidão cível de sentença que reconheça a união estável\nComprovante de mesmo domicílio — Correspondência, conta de luz, água ou gás no mesmo endereço\nConta bancária conjunta\nRegistro em associação de classe com o companheiro como dependente\nAnotação na CTPS feita por órgão competente\nApólice de seguro de vida com companheiro como beneficiário\nFicha de tratamento médico ou odontológico com o falecido como responsável\nOutros documentos públicos ou privados que demonstrem vida em comum — IR em conjunto, plano de saúde como dependente, fotos com data, procuração com firma\nCertidão de nascimento\nCertidão de adoção ou termo de guarda com destinação à adoção\nFilho inválido ou com deficiência acima de 21 anos — laudo médico e avaliação pelo INSS\nCertidão de nascimento do falecido — Para demonstrar a filiação\nComprovação de dependência econômica — Exigida — por início de prova material\nCertidão de nascimento que comprove o parentesco\nComprovação de dependência econômica — Exigida — por início de prova material\nIrmão inválido ou com deficiência — laudo médico e avaliação pelo INSS', E'A pensão por morte é paga aos dependentes de quem contribuía para o INSS. A comprovação do vínculo com o falecido é fundamental. Os documentos variam conforme a classe do dependente (art. 158 e seguintes da IN 128/2022).\n\n🚨 PRAZO — Para filhos menores de 16 anos, pedido em até 180 dias do óbito retroage à data da morte. Para os demais dependentes, o prazo é de 90 dias (art. 74 I Lei 8.213/91). A Lei 15.108/2025 e a Portaria DIRBEN 4/2025 trouxeram regras de complementação post mortem que devem ser verificadas no caso concreto.\n\n⚠️ Para companheiro(a), o INSS exige no mínimo três documentos diferentes que comprovem a vida em comum. Súmula 63 TNU dispensa contemporaneidade absoluta. Tema 526 STF assegura paridade de tratamento.\n\n⚠️ DURAÇÃO — A pensão do cônjuge/companheiro segue regra escalonada do art. 77 §2º Lei 8.213/91. Quem casou há menos de 2 anos ou tinha menos de 18 contribuições do falecido pode ter pensão de apenas 4 meses. Avalie com seu advogado.\n\nℹ️ As classes são excludentes. Cônjuge/companheiro e filhos (Classe I) excluem pais (Classe II), que excluem irmãos (Classe III).'),
  (E'Auxílio-Reclusão', E'▸ Documentos do preso (segurado)\nRG e CPF do preso — Se disponíveis\nCarteira de Trabalho (CTPS) do preso\nExtrato CNIS ou comprovantes de contribuição ao INSS — Para comprovar que contribuía antes de ser preso\nÚltimo contracheque ou documento de renda do preso — Para verificar o enquadramento no limite de baixa renda\n▸ Documentos da prisão\nCertidão de Cárcere (Declaração de Reclusão) — Emitida pela unidade prisional ou pelo cartório do Foro — comprova que está em REGIME FECHADO e a data da prisão\nSentença condenatória ou mandado de prisão — Se disponível\n▸ Documentos dos dependentes\nRG/CIN e CPF de cada dependente\nComprovante de residência do dependente — Em nome do dependente, com no máximo 3 meses. Se estiver em nome do cônjuge, traga também a certidão de casamento. Sem comprovante em seu nome ou do cônjuge, avise seu advogado\nBiometria — Do dependente requerente — verifique se está atualizada na Justiça Eleitoral\nCônjuge — certidão de casamento\nCompanheiro(a) — documentos de união estável — IR em conjunto, conta conjunta, comprovante do mesmo endereço\nFilhos — certidão de nascimento de cada filho\nFilho inválido acima de 21 anos — laudo médico da invalidez\nPais (classe 2) — documentos de dependência econômica — Apenas se não houver cônjuge/companheiro ou filhos com direito', E'▸ Documentos do preso (segurado)\nRG e CPF do preso\nCarteira de Trabalho (CTPS) do preso — todas as páginas com registros\nExtrato CNIS do preso — para confirmar carência de 24 contribuições mensais (Lei 13.846/2019)\nComprovantes de GPS recolhidas pelo preso — se contribuinte individual\nDAS do MEI quitadas — se houve período como Microempreendedor\nHolerites ou contracheques dos 12 meses anteriores à prisão — para aferir o limite de baixa renda\nExtrato de FGTS do período anterior à prisão\nTermo de rescisão (TRCT) do último vínculo — para data exata da saída\n▸ Documentos sobre a prisão (regime fechado)\nCertidão de Cárcere ou Declaração de Reclusão — emitida pela unidade prisional ou pelo Foro — comprova regime fechado e data da prisão\nSentença condenatória — com indicação do regime de cumprimento\nMandado de prisão\nGuia de recolhimento do preso\nAtestado de permanência carcerária — atualizado\nExtrato do andamento processual no Tribunal de Justiça\n▸ Cônjuge ou companheiro(a) do preso\nCertidão de casamento — basta para cônjuge\nEscritura pública de união estável lavrada em cartório\nSentença civil reconhecendo união estável\nComprovante de mesmo domicílio com o preso antes da prisão\nConta bancária conjunta\nDeclaração de IR com o preso como dependente\nApólice de seguro com o preso como instituidor\nPlano de saúde com vínculo de dependência\nCertidão de nascimento de filho havido em comum\nFotos com data e procurações conjuntas anteriores à prisão\n▸ Filhos e equiparados\nCertidão de nascimento de cada filho\nRG/CIN e CPF de cada filho — CPF é obrigatório mesmo para crianças\nFilho inválido ou com deficiência acima de 21 anos — laudo médico detalhado e CIDs\nTermo de guarda judicial — para enteado, menor tutelado ou equiparado\nCertidão de adoção — se for o caso\nComprovante de matrícula escolar do filho — para comprovar guarda fática\n▸ Pais do preso (classe 2)\nDocumentos de dependência econômica do preso — IR, comprovante de transferências regulares antes da prisão\nComprovante de coabitação com o preso antes da prisão\nAtenção — pais só recebem se NÃO houver cônjuge, companheiro, filho ou equiparado com direito\n▸ Renda do preso (Tema 89 STF)\nHolerites dos 12 meses anteriores à prisão\nExtrato CNIS com salários-de-contribuição do período\nDECORE de contador — se contribuinte individual\nDeclaração de IR do ano anterior à prisão\nComprovante de desemprego antes da prisão — para Tema 89 STF (renda zero)\nTermo de rescisão — se houve perda de emprego antes da prisão', E'O auxílio-reclusão é pago aos familiares que dependiam do segurado do INSS preso em regime fechado. Quem recebe são os dependentes, não o preso. Reúna os documentos abaixo para solicitar.\n\n🚨 PRAZO — Pedido em até 90 dias da prisão retroage à data da prisão. Depois de 90 dias, paga apenas a partir do pedido. Para dependentes menores de 16 anos, o prazo é 180 dias.\n\n🚨 CARÊNCIA — Para prisões a partir de 18/01/2019, o segurado precisa ter pelo menos 24 contribuições mensais antes da prisão (Lei 13.846/2019). Sem essa carência, o benefício será negado mesmo com toda a documentação correta.\n\n⚠️ O preso precisa ter tido renda média de até R$ 1.980,38 nos 12 meses antes da prisão (Portaria Interministerial MPS/MF nº 13/2026). O benefício é de R$ 1.621,00/mês (1 salário mínimo), dividido entre todos os dependentes com direito.\n\nℹ️ A Certidão de Cárcere deve ser renovada a cada 3 meses no INSS. Sem renovação, o pagamento é suspenso. O preso precisa estar em REGIME FECHADO.\n\n✅ Assim que o preso for solto, transferido para regime aberto ou fugir, comunique o INSS imediatamente para encerrar o benefício e evitar devolução de valores.'),
  (E'BPC/LOAS', E'▸ Documentos de todos que moram na casa\nRG/CIN e CPF de TODOS da casa — Incluindo crianças — CPF é obrigatório para todos\nCertidão de nascimento ou casamento\nComprovante de residência — Em nome do cliente, com no máximo 3 meses. Se estiver em nome do cônjuge, traga também a certidão de casamento. Sem comprovante em seu nome ou do cônjuge, avise seu advogado\nBiometria — Verifique se está atualizada na Justiça Eleitoral\n▸ CadÚnico — imprescindível\nCadÚnico atualizado com CPF de todos — Se não tiver ou estiver desatualizado, vá ao CRAS ANTES de protocolar o BPC\n▸ Documentos de renda da família\nComprovante de renda de quem trabalha\nDeclaração de renda informal, se houver', E'▸ Laudos e documentos médicos gerais\nLaudo médico com diagnóstico (CID) e limitações — descreva O QUE A DEFICIÊNCIA IMPEDE ou dificulta, não apenas o nome da doença\nRelatório funcional de profissionais de saúde — psicólogo, terapeuta, fisioterapeuta, fonoaudiólogo\nExames que comprovam o diagnóstico\nHistórico de tratamentos e internações — com datas\nReceitas médicas e prescrições em uso\n▸ Deficiência auditiva — documentos específicos\nAudiometria tonal e vocal — nas frequências de 500, 1.000, 2.000 e 3.000 Hz\nLaudo de otorrinolaringologista — com CID (H90 ou H91), diagnóstico e data provável de início\nBERA — exame objetivo de audição, especialmente para crianças\nRelatório fonoaudiológico — comunicação, linguagem e dificuldades funcionais\nPrescrição de aparelho auditivo (AASI) ou implante coclear — demonstra necessidade de recurso assistivo\nRelatório de adaptação do aparelho auditivo — demonstra limitações persistentes mesmo com prótese\n▸ Deficiência visual — documentos específicos\nExame de acuidade visual com correção óptica\nCampimetria (campo visual)\nLaudo de oftalmologista — com CID, diagnóstico e prognóstico\n▸ Coluna vertebral — hérnia de disco, osteofitose, estenose\nRessonância magnética (RM) da coluna — seriada se possível\nEletroneuromiografia (ENMG) — documenta radiculopatia objetivamente\nLaudo do ortopedista ou neurocirurgião — com CIDs (M51.1, M47.8, M48.0) e limitações funcionais concretas\nRelatório de fisioterapia — evolução e limitações persistentes\nReceituários de medicação neuropática (gabapentina, pregabalina) — uso contínuo indica cronicidade\nRelatório cirúrgico — se houve artrodese, discectomia ou laminectomia\nLaudos de afastamento pelo INSS (B31 ou B91) — se houve\n▸ Joelho — ruptura de ligamento, lesão meniscal, artrose\nRessonância magnética (RM) do joelho\nRadiografia com carga — artrose e desvio de eixo\nGoniometria — amplitude de movimento\nLaudo do ortopedista — com CID (M23.5, S83.5, M17) e limitações\nRelatório cirúrgico — se houve artroscopia, reconstrução de LCA ou prótese\n▸ Ombro — manguito rotador, instabilidade, artrose\nRessonância magnética (RM) do ombro\nGoniometria de elevação, abdução e rotações\nLaudo do ortopedista — com CID (M75.1, M75.0, M19.0) e limitações\nRelatório cirúrgico — se houve reparo artroscópico ou prótese\n▸ Outra deficiência física ou motora\nLaudo de ortopedista, neurologista, fisiatra ou reumatologista — com CID e limitações\nExames de imagem com laudo\nLaudo do Detran de habilitação especial — se houver\nPrescrição de cadeira de rodas, órtese, prótese ou muleta\n▸ Deficiência intelectual, mental ou autismo — documentos específicos\nLaudo de psiquiatra ou neurologista — com CID e descrição do impacto funcional\nAvaliação neuropsicológica — com testes aplicados e resultados\nRelatório de psicólogo — funcionalidade e autonomia\nRelatório da APAE, CAPS ou instituição de atendimento — se houver\n▸ Crianças — documentos escolares e de desenvolvimento\nRelatório escolar ou laudo pedagógico — desempenho, dificuldades, necessidade de apoio\nPlano de ensino individualizado (PEI) — se existir\nRelatório de AEE (Atendimento Educacional Especializado)\nRelatório de professor de apoio — se houver\nCaderneta de saúde da criança — marcos de desenvolvimento\nRelatório de intervenção precoce — estimulação, fonoaudiologia, TO\n▸ Renda familiar e CadÚnico\nFolha Resumo do CadÚnico — com NIS de todos os membros da família\nComprovante de renda de todos que moram na mesma casa — holerite, extrato bancário, declaração de IR ou declaração de renda informal\nSe alguém da família recebe benefício do INSS, informar o número\nComprovante de aluguel ou declaração de residência\nConta de luz, água ou gás — para comprovar composição familiar e endereço', E'O BPC é pago a pessoas com deficiência em família de baixa renda. Não exige contribuição ao INSS, mas requer avaliação médica e social obrigatórias após o protocolo.\n\nℹ️ O INSS agendará duas avaliações obrigatórias, com assistente social e com perito médico. A Portaria DPMF/INSS 19/2026 admite a Teleperícia por videoconferência. Recusa por motivo legítimo é direito.\n\n⚠️ Laudo com apenas diagnóstico, sem descrever impacto no dia a dia, tem grande chance de negativa. Peça ao médico que detalhe o que a pessoa não consegue fazer. A Portaria 37/2026 atualizou o TCQ.\n\n✅ Benefício de até 1 salário mínimo recebido por idoso ou PCD da família NÃO entra no cálculo da renda (art. 20 §14 LOAS).\n\n✅ DISPENSA DE REAVALIAÇÃO — A Lei 15.157/2025 dispensa reavaliação periódica quando o impedimento é permanente, irreversível e irrecuperável. Comprove com laudo robusto.\n\n⚠️ BOLSA FAMÍLIA — O Decreto 12.534/2025 incluiu o Bolsa Família na renda do BPC, com forte controvérsia jurídica. Há tese de inconstitucionalidade por retrocesso social. Cessação do BPC por causa de Bolsa Família deve ser questionada.\n\n⚠️ FIBROMIALGIA — A Lei 15.176/2025 equipara fibromialgia (CID M79.7) à pessoa com deficiência, com critérios ACR. Reúna laudo de reumatologista, FIQ, BPI e relatório multidisciplinar.\n\n🏠 CADASTRO DOMICILIAR CADÚNICO — A IN SAGICAD/MDS 21/2026 disciplina a entrevista no domicílio da família para inclusão ou atualização do CadÚnico. É modalidade PREFERENCIAL para famílias com pessoas de mobilidade reduzida ou dificuldade de deslocamento (art. 2º §1º). PCD acamada ou com mobilidade reduzida tem direito subjetivo ao Cadastro Domiciliar. Recusa do CRAS enseja MS preventivo.\n\n🚨 QUANDO A ENTREVISTA EM DOMICÍLIO É OBRIGATÓRIA (IN 21/2026 art. 2º §2º). (I) Famílias UNIPESSOAIS elegíveis ou beneficiárias do BPC ou do PBF (Lei 15.077/2024). (II) Famílias em Ação de Qualificação Cadastral. (III) Famílias em apuração de indícios de irregularidade. Nas três hipóteses, a inclusão ou atualização SÓ pode ocorrer no domicílio, e não no posto do CadÚnico.\n\n✅ OITO HIPÓTESES DE DISPENSA (IN SAGICAD/MDS 20/2026 art. 1º). (I) Domicílio em ÁREA DE VIOLÊNCIA. (II) LOCAL DE DIFÍCIL ACESSO. (III) Município em CALAMIDADE, EMERGÊNCIA ou DESASTRE. (IV) Família em PROGRAMA DE PROTEÇÃO ou MEDIDA PROTETIVA. (V) SITUAÇÃO DE RUA. (VI) Família INDÍGENA. (VII) Família QUILOMBOLA. (VIII) DOMICÍLIO COLETIVO. Nessas hipóteses, o cadastro é feito em POSTO fixo ou MUTIRÃO.\n\n⚠️ DIREITOS DO SEGURADO DURANTE A ENTREVISTA. (a) Vedação ao caráter fiscalizatório — a IN 21/2026 art. 4º I proíbe expressamente. (b) Área externa por padrão — a entrevista ocorre fora da casa, salvo se o entrevistador for CONVIDADO a entrar (CF art. 5º XI). (c) Equipe mínima de dois servidores. (d) Interrupção legítima em caso de risco não equivale a recusa. (e) Direito a intérprete de Libras para PCD auditiva.'),
  (E'BPC/LOAS — Idoso', E'▸ Documentos de todos que moram na casa\nRG/CIN e CPF do idoso requerente\nCPF de todos da casa — Incluindo crianças — obrigatório\nCertidão de nascimento ou documento que comprove a idade\nComprovante de residência — Em nome do cliente, com no máximo 3 meses. Se estiver em nome do cônjuge, traga também a certidão de casamento. Sem comprovante em seu nome ou do cônjuge, avise seu advogado\nBiometria — Verifique se está atualizada na Justiça Eleitoral\n▸ CadÚnico\nCadÚnico atualizado com CPF de todos — Se desatualizado, vá ao CRAS antes\n▸ Documentos de renda da família\nComprovante de renda de quem trabalha\nSe alguém recebe benefício, informe número e valor\nDeclaração de renda informal, se houver', E'▸ Documentos pessoais do idoso requerente\nRG, CIN ou CNH\nCPF\nCertidão de nascimento ou de casamento\nComprovante de residência atualizado\nBiometria atualizada na Justiça Eleitoral\n▸ CadÚnico — imprescindível\nFolha Resumo do CadÚnico — com NIS de todos os membros da família\nCadastro atualizado nos últimos 24 meses no CRAS\nComprovante de vinculação do CPF do idoso ao NIS familiar\nComprovante de visita ao CRAS para atualização — se houve\n▸ Composição da família e renda (art. 20 §1º LOAS)\nRG/CIN e CPF de TODOS os moradores da casa — CPF obrigatório inclusive para crianças\nCertidão de nascimento ou casamento de cada morador\nHolerite ou contracheque dos parentes que trabalham — somente cônjuge, companheiro, pais, filhos solteiros e irmãos solteiros entram no grupo\nDeclaração de renda informal — para autônomos, diaristas, ambulantes\nExtrato bancário dos últimos 3 meses — para identificar entradas regulares\nDECORE — se algum membro for autônomo formalizado\nComprovação de auxílio Bolsa Família — atenção ao Decreto 12.534/2025 (controvérsia sobre cômputo)\n▸ Benefícios excluídos do cálculo da renda\nComprovante de BPC já recebido por outro idoso ou PCD da família — exclui automaticamente do cômputo (art. 20 §14 LOAS)\nComprovante de aposentadoria de até 1 salário mínimo de outro idoso da família — exclui o valor do cômputo (Estatuto do Idoso)\nComprovante de pensão por morte de até 1 salário mínimo recebida por outro idoso — exclui do cômputo\nAuxílio-inclusão — não compõe a renda\n▸ Despesas dedutíveis (Anexo I Portaria MDS 34/2025)\nComprovantes de despesas com medicamentos contínuos — receituário e nota fiscal\nDespesas com fraldas geriátricas — nota fiscal mensal\nDespesas com plano de saúde — boleto e comprovante de pagamento\nDespesas com aluguel — recibo ou contrato\nDespesas com cuidador formal — recibo, contrato ou holerite\n▸ Comprovação da idade\nCertidão de nascimento original\nRG, CIN ou CNH com data de nascimento clara\nDocumento eclesiástico — certidão de batismo, em caso de ausência de registro civil\nJustificação administrativa — em hipótese excepcional\n▸ Outros documentos de apoio\nConta de luz, água ou gás — confirma composição familiar e endereço\nComprovante de aluguel ou contrato de moradia\nDeclaração de testemunhas sobre composição familiar — apenas como reforço\nHistórico de internações ou acompanhamento médico do idoso — útil em caso de revisão', E'O BPC para idosos é pago a quem tem 65 anos ou mais e vive em família de baixa renda. Não exige contribuição ao INSS e não requer perícia médica.\n\nℹ️ Não há perícia médica para o BPC do idoso — o INSS verifica apenas a idade e a renda.\n\n✅ O valor do próprio BPC do idoso não é contado para que outro membro da família também possa receber BPC.\n\n🏠 CADASTRO DOMICILIAR CADÚNICO — A IN SAGICAD/MDS 21/2026 permite que a entrevista de inclusão ou atualização do CadÚnico seja feita no domicílio. É modalidade PREFERENCIAL para idoso com mobilidade reduzida ou dificuldade de deslocamento até o CRAS. Idoso acamado ou frágil tem direito subjetivo a essa modalidade. Recusa do CRAS enseja MS preventivo.\n\n🚨 OBRIGATORIEDADE DA ENTREVISTA EM DOMICÍLIO (IN 21/2026 art. 2º §2º + Lei 15.077/2024). Famílias UNIPESSOAIS (idoso morando sozinho) beneficiárias ou elegíveis do BPC devem ter a atualização feita no domicílio. Também são obrigatórias as hipóteses de Qualificação Cadastral e de apuração de indícios de irregularidade.\n\n✅ OITO HIPÓTESES DE DISPENSA (IN SAGICAD/MDS 20/2026 art. 1º). Área de violência, local de difícil acesso, município em calamidade, medida protetiva, situação de rua, indígena, quilombola e domicílio coletivo. Nesses casos o idoso é atendido em posto fixo ou em mutirão de cadastramento, sem visita domiciliar.\n\n⚠️ DIREITOS DO IDOSO DURANTE A ENTREVISTA. Vedação ao caráter fiscalizatório (IN 21/2026 art. 4º I). Entrevista preferencialmente em área externa (CF art. 5º XI). Equipe mínima de dois servidores. Interrupção legítima em caso de risco não equivale a recusa e não pode gerar exclusão do CadÚnico.'),
  (E'Salário-Maternidade', E'RG, CNH ou CIN\nCPF\nBiometria — Verifique se está atualizada na Justiça Eleitoral', E'Após o parto, certidão de nascimento\nSe ainda gestante, declaração médica com previsão de parto (DPP)\nEm caso de adoção, termo de guarda com destinação à adoção ou nova certidão de nascimento\nCarteira de Trabalho (CTPS) — A empresa paga os 120 dias e se reembolsa com o INSS — se não pagar, procure seu advogado\nDeclaração da empresa confirmando o afastamento — Se necessário para protocolo direto no INSS\nComprovantes das últimas contribuições ao INSS — Carência de 10 contribuições mensais (não precisam ser consecutivas, mas a segurada deve manter qualidade de segurada). GPS com código correto para CI\nCarteira de Trabalho ou comprovante de inscrição como autônoma\nInscrição em órgão de fiscalização profissional, se houver\nDAP ou CAF — Declaração de Aptidão ao PRONAF\nCertidão de casamento com qualificação de lavradora\nNota do bloco de produtor rural ou CCIR/cadastro no INCRA\nCarteira de filiação ao sindicato de trabalhadoras rurais\nCertidão de nascimento de filho com qualificação rural da mãe — Documentos antigos são muito valiosos\nAutodeclaração de segurada especial — Preenchida no Meu INSS — seu advogado orienta', E'O salário-maternidade é pago durante 120 dias para quem teve filho, adotou ou recebeu guarda para adoção. Para empregada CLT, a empresa faz o primeiro pagamento. Para segurada especial, o INSS paga diretamente.\n\nℹ️ Empregada CLT — a empresa paga o salário-maternidade e depois se reembolsa com o INSS. Se a empresa não pagar, procure seu advogado imediatamente.\n\n⚠️ Para autônomas e CI, a carência é de 10 contribuições mensais (art. 25, III, da Lei 8.213/91). Não precisam ser nos 10 meses imediatamente antes do parto, mas a segurada deve manter qualidade de segurada na data do fato gerador. Contribuição em atraso ou com código errado pode gerar negativa.\n\n✅ Segurada especial não precisa comprovar contribuições — basta comprovar que exercia atividade rural no período de carência de 10 meses antes do parto.'),
  (E'Acerto de CNIS', E'RG, CNH ou CIN\nCPF\nExtrato do CNIS atualizado — Seu advogado pode obter e identificar o que precisa ser corrigido\nBiometria — Verifique se está atualizada na Justiça Eleitoral', E'Carteira de Trabalho (CTPS)\nExtrato do FGTS do período\nHolerites (contracheques)\nTermo de rescisão (TRCT) ou carta de demissão\nSe a empresa fechou, qualquer documento com o nome dela e o seu\nComprovante original da GPS paga — Com autenticação bancária visível\nIdentificação do período e do código utilizado — Seu advogado identificará qual código deveria ter sido usado\nGPS quitadas com código correto para a sua categoria\nContratos de prestação de serviços, se houver\nNotas fiscais ou recibos emitidos por você\nDeclaração de IR com atividade e renda do período\nQualquer documento contemporâneo que comprove atividade rural — DAP, CCIR, bloco do produtor, certidão de nascimento de filho com qualificação de agricultor', E'O CNIS é o cadastro onde o INSS registra todo o seu histórico de trabalho e contribuições. Se algo está faltando ou errado, é preciso corrigir antes de pedir qualquer benefício.\n\n✅ O acerto pode ser feito a qualquer momento, mesmo sem benefício em andamento (art. 12 IN 128/2022). Se algum servidor disser o contrário, está errado.\n\n⚠️ INDICADORES — A Portaria 990/2022 (alterada pela 1.316/2025) lista os indicadores bloqueantes (PEXT, PREC-MENOR-MIN, PVIN-IRREG, PADM-EMPR). Cada indicador tem formulário próprio (Anexos I, I-A a I-F do RAC).\n\nℹ️ Converse com seu advogado antes de ir ao INSS. Dependendo do indicador, o procedimento e a documentação são diferentes.\n\n⚠️ Não recolha nova GPS para tentar corrigir um recolhimento errado — não resolve e pode gerar débito. A solução é o formulário de acerto de contribuições.'),
  (E'Apos. por Idade Híbrida', E'RG, CNH ou CIN — Original e cópia\nCPF\nCertidão de nascimento ou casamento — Para comprovar a idade\nComprovante de residência — Em nome do cliente, com no máximo 3 meses. Se estiver em nome do cônjuge, traga também a certidão de casamento. Sem comprovante em seu nome ou do cônjuge, avise seu advogado\nBiometria — Verifique se está atualizada na Justiça Eleitoral', E'▸ Períodos rurais\nCertidão de casamento com qualificação de lavrador(a)\nCertidão de nascimento dos filhos com qualificação rural dos pais\nTítulo de eleitor antigo com profissão de agricultor(a)\nDAP ou CAF — Declaração de Aptidão ao Pronaf\nBloco de notas do produtor rural\nContrato de arrendamento, parceria ou comodato rural\nCCIR ou documento do INCRA\nITR — comprovante de pagamento\nNotas fiscais de venda de produção rural\nFicha de associado em sindicato de trabalhadores rurais\nDocumentos rurais no nome do cônjuge (Tema 327 TNU) — traga certidão de casamento\nAutodeclaração de segurado especial — seu advogado orienta o preenchimento\n▸ Períodos urbanos (CLT, autônomo, MEI)\nCarteira de Trabalho (CTPS) — todas as páginas com registros\nExtratos do FGTS por empresa\nTermos de rescisão (TRCT)\nHolerites do período\nComprovantes de GPS — com autenticação bancária\nDAS do MEI — se houve período como Microempreendedor\nNotas fiscais e contratos como autônomo\nDeclaração de IR com pró-labore ou rendimentos\nInscrição em conselho profissional (CRM, OAB, CREA, CRC)\nContrato social de empresa\nExtrato do CNIS atualizado\n▸ Benefícios anteriores e contribuições intercaladas\nCarta de concessão de benefício anterior — auxílio-doença ou aposentadoria proporcional\nComprovantes de Defeso — pescador artesanal\nComprovantes de seguro-desemprego\nCartão de PIS/PASEP com data de cadastro\nSalário-maternidade rural — se houve\nDTC — Declaração de Tempo de Contribuição emitida pelo INSS', E'A aposentadoria híbrida soma o tempo de trabalho rural ao tempo de trabalho urbano para completar a carência. Ideal para quem trabalhou parte da vida no campo e parte na cidade. O Tema 1007 do STJ admite a soma independentemente da atividade exercida na DER e o Tema 168 da TNU dispensa o multiplicador da carência rural.\n\n✅ O Tema 1007 STJ admite soma do tempo rural e urbano independentemente do que o segurado exercia na DER. Não importa se você terminou trabalhando na cidade ou no campo. O Tema 168 TNU dispensou o multiplicador da carência rural na híbrida.\n\n⚠️ O tempo rural anterior a novembro de 1991 não exige indenização para fins de cômputo na aposentadoria híbrida (Súmula 272 STJ). O INSS resiste, mas a tese pró-segurado é firme.\n\nℹ️ Idade exigida — 65 anos (homem) ou 62 anos (mulher). Reúna comprovação dos dois períodos. O tempo rural exige documentos contemporâneos como na aposentadoria rural.'),
  (E'Aux. Incapacidade Temporária Acidentária (B91)', E'RG, CNH ou CIN\nCPF\nBiometria — Verifique se está atualizada na Justiça Eleitoral', E'▸ Documentos do acidente de trabalho\nCAT (Comunicação de Acidente de Trabalho) — original ou cópia, com número de protocolo no INSS\nBoletim de ocorrência — se houve registro policial ou do SAMU\nAtestado médico do dia do acidente\nAtestados subsequentes de afastamento\nRecibos de pagamento dos primeiros 15 dias pela empresa\nHolerites do período do afastamento\nCarteira de Trabalho (CTPS)\n▸ Doença ocupacional ou do trabalho\nPPP (Perfil Profissiográfico Previdenciário) — para demonstrar exposição\nPPRA, PGR ou LTCAT da empresa\nHistórico funcional na empresa — função, jornada, atividades\nLaudo do médico do trabalho\nLaudo de especialista — ortopedista, neurologista, psiquiatra\nExames de imagem ou laboratoriais comprobatórios\nReceituários cronológicos do tratamento\n▸ Coluna — LER/DORT, hérnia de disco ocupacional\nRessonância magnética da coluna — seriada se possível\nEletroneuromiografia (ENMG) com classificação do grau\nLaudo do ortopedista ou neurocirurgião — com CIDs (M51.1, M54.4, G56)\nHistórico de atividades repetitivas — descrição da função\nPPP com agente ergonômico no campo 15.3\nReceituários de gabapentina, pregabalina, anti-inflamatórios\n▸ Membros superiores — síndrome do túnel do carpo, tendinopatia\nRessonância magnética ou ultrassom do segmento\nEletroneuromiografia (ENMG) — exame chave\nLaudo de ortopedista ou neurologista — CIDs G56.0, M75.1, M77.1\nGoniometria de movimento residual\nRelatório fisioterapêutico\n▸ Transtorno mental ocupacional — burnout, depressão, ansiedade\nLaudo de psiquiatra — CID F32, F33, F41, F43, QD85 (burnout)\nRelatório de psicólogo com avaliação funcional\nReceituários cronológicos de medicação psiquiátrica\nAtestados de afastamento anteriores\nAvaliação do RH ou ergonomia organizacional — se houve\nPGR atualizado conforme NR-1 — riscos psicossociais\n▸ Doença infectocontagiosa ocupacional\nResultado de sorologia ou exame específico\nLaudo médico com CID\nHistórico de exposição ocupacional — saúde, agricultura, laboratório\nPPP com agente biológico identificado', E'O B91 é o benefício temporário pago quando a incapacidade decorre de acidente de trabalho, doença ocupacional ou doença equiparada. A diferença para o B31 é o reconhecimento do nexo, que assegura estabilidade pós-alta (art. 118), depósito do FGTS durante o afastamento e cômputo na aposentadoria especial.\n\n🚨 CAT (Comunicação de Acidente de Trabalho) é a peça-chave. Se a empresa não emitiu, o sindicato, o médico, o segurado ou seus dependentes podem emitir (art. 22 §2º Lei 8.213/91). NÃO aceite alta sem CAT registrada.\n\n⚠️ Se o INSS conceder como B31 sem reconhecer o nexo, peça revisão imediata para conversão em B91. A diferença vale FGTS, estabilidade e tempo especial.\n\nℹ️ O NTEP (art. 21-A) presume nexo entre o CID e o CNAE da empresa. Você não precisa provar — o INSS é que precisa afastar com prova robusta (ADI 3931 STF).\n\n✅ Sem carência. Para acidente de qualquer natureza, o art. 26 II da Lei 8.213/91 dispensa contribuições mínimas. Basta qualidade de segurado na data do acidente.'),
  (E'Apos. Incapacidade Permanente Acidentária (B92)', E'RG, CNH ou CIN\nCPF\nBiometria — Verifique se está atualizada na Justiça Eleitoral', E'▸ Documentos do acidente de trabalho\nCAT (Comunicação de Acidente de Trabalho) — original ou cópia, todas as emissões\nBoletim de ocorrência\nAtestado médico do dia do acidente\nHistórico completo do afastamento até a invalidez\nCarteira de Trabalho (CTPS)\nSentença trabalhista reconhecendo nexo — se houve\n▸ Documentos da incapacidade permanente\nLaudo do médico assistente com CID e prognóstico de irreversibilidade\nLaudos de especialistas\nExames de imagem e laboratoriais — seriados\nHistórico de internações, cirurgias e tratamentos\nReceituários cronológicos\nRelatório multidisciplinar — fisioterapia, psicologia, terapia ocupacional\nLaudo do INSS de B91/B92 anterior — se houve\n▸ Coluna vertebral — sequela traumática ou ocupacional\nRessonância magnética da coluna — pré e pós-cirúrgica\nEletroneuromiografia (ENMG) com radiculopatia objetiva\nLaudo do ortopedista ou neurocirurgião — com CIDs e prognóstico\nRelatório cirúrgico — artrodese, discectomia, laminectomia\nRM pós-operatória — síndrome pós-laminectomia (M96.1)\nReceituários de opioides, gabapentinoides\n▸ Membros superiores ou inferiores — amputação, sequela ortopédica\nRessonância magnética ou tomografia\nRadiografia com carga (joelho, quadril)\nGoniometria documental\nLaudo do ortopedista — com CID e descrição da sequela\nRelatório cirúrgico — prótese, artrodese, amputação\nRelatório fisioterapêutico de reabilitação\n▸ Transtorno mental severo ocupacional\nLaudo de psiquiatra — com CID, prognóstico reservado e descrição da incapacidade total\nRelatório de psicólogo com avaliação cognitiva e funcional\nInternações psiquiátricas — guias e relatórios de alta\nAvaliação neuropsicológica\nReceituários cronológicos com antipsicóticos, antidepressivos, estabilizadores\nRelatório CAPS — se há acompanhamento\n▸ Doença infectocontagiosa grave ocupacional\nLaudo médico com CID e prognóstico\nSorologia ou exame específico positivo\nHistórico de exposição com PPP, LTCAT, PGR\nRelatório de infectologista\n▸ Necessidade de assistência permanente — acréscimo de 25%\nLaudo do médico assistente descrevendo necessidade de cuidador\nAvaliação multidisciplinar — assistência social, terapia ocupacional\nRelatório do cuidador formal — se há\nComprovante de uso de cadeira de rodas, sonda ou outro recurso\nHistórico de quedas, internações por desorientação ou desassistência', E'O B92 é a aposentadoria por invalidez decorrente de acidente de trabalho ou doença ocupacional. A renda mensal é de 100% da média (art. 26 §3º II EC 103/2019), sem o redutor da regra geral. Reconhecimento exige nexo robusto e prognóstico de incapacidade definitiva.\n\n🚨 A diferença de RMI entre B91 (60% + 2% por ano excedente) e B92 (100% da média) pode ultrapassar 40% do benefício. Se houve acidente ou doença ocupacional, EXIJA o B92.\n\n🚨 CAT registrada é peça central. Sem CAT, o INSS rejeita o B92 mesmo com nexo evidente. Se a empresa se recusou, o segurado, médico, sindicato ou dependentes podem emitir (art. 22 §2º Lei 8.213/91).\n\n⚠️ Tema 1083 STJ — agravamento de doença preexistente por condições do trabalho gera direito ao B92. Burnout (QD85) e transtornos mentais ocupacionais também entram (Portaria MTE 1.419/2024 e NR-1).\n\n✅ Acréscimo de 25% (art. 45 da Lei 8.213/91) cabe quando a invalidez exige assistência permanente de terceiros. O dispositivo segue vigente após a EC 103/2019. Documente a necessidade com laudo detalhado.'),
  (E'Reabilitação Profissional (B26)', E'RG, CNH ou CIN\nCPF\nComprovante de residência — Em nome do cliente, com no máximo 3 meses. Se estiver em nome do cônjuge, traga também a certidão de casamento. Sem comprovante em seu nome ou do cônjuge, avise seu advogado\nBiometria — Verifique se está atualizada na Justiça Eleitoral\nCarteira de Trabalho (CTPS)', E'▸ Documentos da incapacidade e do programa\nCarteira de Trabalho (CTPS)\nExtrato do CNIS atualizado\nCarta de concessão do benefício por incapacidade vigente (B31 ou B91)\nEncaminhamento da PMF para reabilitação — se já houve\nHistórico do programa de reabilitação em curso — se já iniciado\nRelatórios da equipe de reabilitação\nLaudo do médico assistente com restrições para a função habitual\n▸ Documentos da função habitual e do empregador\nDescrição detalhada da função habitual\nCópia do contrato de trabalho\nHolerite com cargo registrado\nCarta da empresa sobre adaptações possíveis ou impossibilidade\nPPP — se houve agente nocivo\nPrograma de Controle Médico (PCMSO)\nPrograma de Gerenciamento de Riscos (PGR)\n▸ Resíduo de capacidade laboral — exames e laudos\nAvaliação de fisiatra ou médico do trabalho — capacidade residual\nGoniometria, ENMG, força muscular — para limites físicos\nAvaliação neuropsicológica — para limites cognitivos\nLaudo psiquiátrico atualizado — se transtorno mental\nHistórico de tentativas de retomada de trabalho\nAvaliação de habilidades transferíveis\n▸ Cessação ou suspensão indevida do PRP\nNotificação de cessação ou encerramento — com data e fundamento\nComprovantes de comparecimento ao programa\nAtestados que justificaram ausência\nTermo de exigência da PMF não cumprido por culpa do INSS\nHistórico de comunicações com a equipe de reabilitação\nCarta de Justificativa de Faltas — Portaria DIRBEN 1.310/2025 (até 7 dias)', E'A reabilitação profissional é serviço obrigatório do INSS quando há incapacidade para a função habitual mas resíduo de capacidade laboral. Está regulada pelas Portarias DIRBEN/INSS 1.310/2025 e 1.333/2026. Concluída com sucesso, garante certificado de reabilitação. Fracassada, deve resultar em aposentadoria por incapacidade.\n\n🚨 Cessação prematura ou encerramento abusivo do PRP é ilegal. O INSS não pode encerrar a reabilitação alegando ausência sem justificativa em 7 dias. Avise seu advogado imediatamente — cabe MS contra encerramento indevido.\n\n⚠️ Recusa de encaminhamento à reabilitação após incapacidade parcial é ilegal. Se a perícia médica concluir incapacidade para a função habitual com possibilidade de reabilitação, o INSS é obrigado a encaminhar (art. 89 Lei 8.213/91).\n\nℹ️ Durante a reabilitação, o segurado recebe o benefício por incapacidade. Suspensão, sob qualquer pretexto, sem justificativa formal e contraditório, é cabível MS.\n\n✅ Se a reabilitação fracassar (segurado não tem condições de exercer outra atividade), o INSS deve converter o B31 em B91. Conversão administrativa em B91 sem perícia adequada também pode ser questionada.'),
  (E'Indenização de Contribuições em Atraso', E'RG, CNH ou CIN\nCPF\nComprovante de residência — Em nome do cliente, com no máximo 3 meses. Se estiver em nome do cônjuge, traga também a certidão de casamento. Sem comprovante em seu nome ou do cônjuge, avise seu advogado\nBiometria — Verifique se está atualizada na Justiça Eleitoral\nExtrato do CNIS atualizado — Para identificar os períodos sem recolhimento', E'▸ Documentos do período sem contribuição\nExtrato do CNIS atualizado — destaque para os períodos a indenizar\nContrato social ou alteração contratual — se houve atividade como sócio\nInscrição em conselho profissional (CRM, OAB, CREA, CRC, CRO)\nNotas fiscais ou recibos emitidos como autônomo\nDeclaração de Imposto de Renda do período\nAlvará municipal ou inscrição no ISS\nRPA — Recibos de Prestação de Serviços\nGFIP de tomador de serviço — se prestava a empresas\nDocumentos de atividade rural posterior a novembro de 1991\n▸ Contagem recíproca com RPPS\nCertidão de Tempo de Contribuição (CTC) emitida pelo órgão público\nBoletim ou portaria de exoneração\nDocumentos do regime próprio do município ou estado\nHistórico funcional do servidor\n▸ Documentos para cálculo de juros e multa\nComprovantes de tentativa anterior de regularização\nJustificativa de impossibilidade de recolhimento na época\nComprovação de período de incapacidade temporária do contribuinte\nDocumentos de força maior — fechamento de empresa, calamidade\n▸ Tempo rural posterior a novembro de 1991\nDocumentos de atividade rural com data — DAP, CAF, ITR, CCIR\nNotas fiscais de comercialização\nComprovação de área plantada e colhida\nBloco de notas do produtor rural\nComprovantes de Defeso\nAtenção — tempo rural anterior a 11/1991 NÃO exige indenização (Súmula 272 STJ)', E'A indenização permite recolher contribuições previdenciárias em atraso para reconhecer tempo de filiação que não foi recolhido na época. É essencial para contribuintes individuais com períodos sem GPS, segurados especiais que perderam a qualidade rural e situações de contagem recíproca com RPPS. Os juros e multa do art. 45-A da Lei 8.212/91 e do art. 59 do Decreto 10.410/2020 podem inviabilizar a indenização — calcule antes.\n\n🚨 Tempo rural anterior a novembro de 1991 NÃO exige indenização para cômputo (Súmula 272 STJ). O INSS frequentemente cobra indenização indevida — não pague antes de consultar seu advogado.\n\n⚠️ O cálculo de juros e multa pode tornar a indenização absurdamente cara. O Tema 1103 STJ permite questionar critérios. Faça simulação antes de qualquer pagamento.\n\nℹ️ Indenização é cabível para contribuinte individual sem recolhimento, segurado especial após 1991, contagem recíproca com RPPS (art. 96 IV Lei 8.213/91) e regularização de tempo de empregador rural pessoa física.\n\n✅ O Comunicado DIVBEN3 e o Enunciado 5 do CRPS reconhecem o direito à indenização para fins de cômputo de carência. Não confunda com complementação EC 103 (que tem regime diferente).'),
  (E'Revisão', E'RG, CNH ou CIN\nCPF\nComprovante de residência — Em nome do cliente, com no máximo 3 meses. Se estiver em nome do cônjuge, traga também a certidão de casamento\nBiometria — Verifique se está atualizada na Justiça Eleitoral\nCarta de Concessão do benefício — Documento principal — contém DIB, RMI, regra utilizada, salários-de-contribuição\nHistórico de Crédito (HISCRE) — Para verificar reajustes e cálculo histórico\nCNIS atualizado — Para confirmar todos os vínculos e remunerações', E'▸ Documentos básicos do benefício\nCarta de Concessão do benefício — peça central da revisão\nHistórico de Crédito (HISCRE) — atualizado\nMemorial de cálculo da concessão\nHistórico de Pagamentos (HISBEN)\nCNIS atualizado e completo\nExtrato CONBAS — se disponível\nDocumentos administrativos do PA — DER, DIB, DCB, decisões\n▸ Revisão da Vida Toda (RVT) — Tema 1102 STF\nSalários-de-contribuição anteriores a julho de 1994\nCarteira de Trabalho com remunerações antigas\nHolerites antigos\nMicroficha do CNIS\nConfirmação de que o PA original não usou esses salários\nAtenção à modulação do Tema 1102 — verificar se a tese cabe no caso\n▸ Revisão do art. 29, II — melhor benefício (Tema 334 STF)\nCarteira de Trabalho com vínculos anteriores\nDemonstração de que o cálculo deveria ter considerado regra mais vantajosa na DIB\nDocumentos que comprovem o requisito implementado em data anterior\nComparativo entre as regras aplicáveis no histórico contributivo\n▸ Revisão do teto — buraco negro e buraco verde (Tema 327 STF)\nCarta de concessão original\nHistórico de remunerações no PA\nECs 20/1998 e 41/2003 — verificação de incidência\nMemorial de cálculo demonstrando glosa pelo teto\nRevisão pelo art. 144 da Lei 8.213/91 — se DIB anterior a 04/1991\n▸ Revisão pelo IRSM 02/1994 (Tema 415 STJ)\nSalários-de-contribuição anteriores a 03/1994\nComprovantes da conversão para URV\nHistórico de pagamento do FGTS\nMemorial de cálculo do INSS comprovando ausência do IRSM 39,67%\n▸ Revisão por atividades concomitantes (Tema 1.070 STJ)\nCNIS demonstrando vínculos simultâneos\nComprovantes de remunerações nas duas atividades\nCarta de concessão com identificação da atividade principal\nMemorial de cálculo do INSS\nCálculo independente da contadoria — para confronto\n▸ Revisão de RMI — inclusão de remunerações ou tempo\nHolerites, contracheques ou recibos não computados\nTRCT com verbas integráveis ao salário-de-contribuição\nSentença trabalhista reconhecendo verbas\nComprovantes de adicionais não computados\nComprovação de tempo especial ou rural não considerado', E'Diversas revisões podem aumentar a renda mensal de benefício já concedido. O prazo decadencial é de 10 anos a contar do primeiro pagamento ou da decisão indeferitória de revisão. Sob pena de perda do direito, NÃO aguarde o último mês para acionar.\n\n🚨 DECADÊNCIA — O prazo do art. 103 da Lei 8.213/91 é de 10 anos do primeiro pagamento. Se faltam menos de 12 meses, ajuíze imediatamente. Tema 975 STJ e ADI 6096 STF confirmaram a constitucionalidade do prazo.\n\n⚠️ Revisão da Vida Toda (Tema 1102 STF) — modulação restringe o cabimento. Verifique se há ação anterior, se a coisa julgada permite repropositura e se a regra de transição da Lei 9.876/1999 foi efetivamente aplicada.\n\nℹ️ Principais revisões — art. 29 II (melhor benefício, Tema 334 STF), teto (Tema 327 STF), IRSM 39,67% (Tema 415 STJ), atividades concomitantes (Tema 1.070 STJ), buraco negro/verde (art. 144 e art. 26 Lei 8.870/94), revisão de RMI por inclusão de remunerações.\n\n✅ O direito à revisão dispensa retorno à via administrativa quando se tem documento e tese jurídica disponível ao INSS na concessão. Tema 350 STF e Tema 1124 STJ disciplinam o interesse de agir.')
on conflict (beneficio) do update
  set itens = excluded.itens, extras = excluded.extras, observacoes = excluded.observacoes;

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

-- ══ WhatsApp do escritório ════════════════════════════════════════════════
-- Aqui mora a conversa de verdade: texto, áudio, foto, quem atendeu, para
-- quem transferiu. Quem põe e tira mensagem é a ponte (crm/fase2/ponte/),
-- um serviço que fica ligado com a sessão do WhatsApp do escritório.
--
-- Convive com `conversas` acima, que é o registro do SMBot: enquanto os dois
-- caminhos rodarem em paralelo, um não apaga o outro. Quando o nosso assumir
-- sozinho, `conversas` vira histórico e ninguém precisa migrar nada às pressas.
--
-- Uma conversa por número — não por caso, não por cliente. É assim que a
-- pessoa enxerga: ela tem UMA conversa com o escritório, mesmo tendo três
-- processos.
create table if not exists zap_conversas (
  id           uuid primary key default gen_random_uuid(),
  telefone     text not null,
  chave        text generated always as (fone_chave(telefone)) stored,
  nome_perfil  text,                      -- como a pessoa se chama no WhatsApp
  cliente_id   uuid references clientes(id) on delete set null,
  lead_id      uuid references leads(id) on delete set null,
  atendente_id uuid references colaboradores(id) on delete set null,
  status       text not null default 'aberta'
               check (status in ('aberta','pendente','resolvida')),
  nao_lidas    integer not null default 0,
  ultima_em    timestamptz,
  ultimo_texto text,                      -- prévia para a lista, sem abrir
  bot_ativo    boolean not null default true,
  fixada       boolean not null default false,
  criado_em    timestamptz not null default now()
);
create unique index if not exists zap_conversas_chave on zap_conversas (chave);
create index if not exists zap_conversas_fila on zap_conversas (status, ultima_em desc);
create index if not exists zap_conversas_cli on zap_conversas (cliente_id);

create table if not exists zap_mensagens (
  id          uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references zap_conversas(id) on delete cascade,
  externo_id  text unique,                -- id da mensagem no WhatsApp (dedupe)
  direcao     text not null check (direcao in ('entrada','saida')),
  autor_id    uuid references colaboradores(id) on delete set null,  -- null: cliente ou bot
  por_bot     boolean not null default false,
  tipo        text not null default 'texto',   -- texto|imagem|audio|video|documento|figurinha|local|contato
  texto       text,
  midia_url   text, midia_nome text, midia_mime text,
  -- 'fila' é o pedido de envio: a ponte assume e leva até 'enviada'
  status      text not null default 'enviada'
              check (status in ('fila','enviando','enviada','entregue','lida','erro')),
  erro        text,
  tentativas  integer not null default 0,
  quando_wa   timestamptz,                -- o relógio do WhatsApp, não o nosso
  criado_em   timestamptz not null default now(),
  enviada_em  timestamptz
);
create index if not exists zap_msg_conversa on zap_mensagens (conversa_id, criado_em);
-- índice só da fila: a ponte pergunta "tem o que enviar?" a cada 2 segundos
create index if not exists zap_msg_fila on zap_mensagens (criado_em) where status = 'fila';

create table if not exists zap_transferencias (
  id          uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references zap_conversas(id) on delete cascade,
  de_id       uuid references colaboradores(id) on delete set null,
  para_id     uuid references colaboradores(id) on delete set null,
  motivo      text,
  em          timestamptz not null default now()
);
create index if not exists zap_transf_conversa on zap_transferencias (conversa_id, em desc);

-- Toda mensagem mexe na conversa: a lista precisa mostrar a última linha e o
-- não-lidas sem varrer a tabela inteira. Como gatilho, vale para quem quer que
-- escreva — ponte, app ou bot — e não tem como alguém esquecer de atualizar.
create or replace function zap_toque() returns trigger
language plpgsql as $$
begin
  update zap_conversas set
    ultima_em    = coalesce(new.quando_wa, new.criado_em, now()),
    ultimo_texto = left(coalesce(nullif(trim(new.texto),''), '['||new.tipo||']'), 200),
    nao_lidas    = case when new.direcao='entrada' then nao_lidas + 1 else nao_lidas end,
    -- cliente que volta a escrever reabre a conversa: "resolvida" era a
    -- opinião do escritório, e ele acabou de discordar
    status       = case when new.direcao='entrada' and status='resolvida'
                        then 'aberta' else status end
  where id = new.conversa_id;
  return new;
end $$;
drop trigger if exists zap_toque_ins on zap_mensagens;
create trigger zap_toque_ins after insert on zap_mensagens
  for each row execute function zap_toque();

-- Acha (ou abre) a conversa daquele número e já a liga a quem for: cliente
-- primeiro, prospecto depois. É o mesmo casamento por 8 dígitos do resto do
-- sistema, para o número salvo com DDI e o digitado à mão serem a mesma pessoa.
create or replace function zap_abrir(p_telefone text, p_nome text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_chave text; v_id uuid; v_cli uuid; v_lead uuid;
begin
  v_chave := fone_chave(p_telefone);
  if v_chave is null or length(v_chave) < 8 then
    raise exception 'telefone inválido: %', p_telefone;
  end if;
  select id into v_id from zap_conversas where chave = v_chave;
  if v_id is not null then
    -- o nome do perfil muda quando a pessoa troca; e quem virou cliente
    -- depois de já ter conversado precisa ser religado à ficha
    update zap_conversas set
      nome_perfil = coalesce(nullif(trim(p_nome),''), nome_perfil),
      cliente_id  = coalesce(cliente_id,
                      (select id from clientes where fone_chave(telefone)=v_chave limit 1))
     where id = v_id;
    return v_id;
  end if;
  select id into v_cli from clientes where fone_chave(telefone) = v_chave limit 1;
  if v_cli is null then
    select id into v_lead from leads
     where fone_chave(telefone) = v_chave and etapa not in ('fechado','perdido')
     order by criado_em desc limit 1;
  end if;
  insert into zap_conversas (telefone, nome_perfil, cliente_id, lead_id)
  values (p_telefone, nullif(trim(p_nome),''), v_cli, v_lead)
  returning id into v_id;
  return v_id;
end $$;

-- Passar a conversa adiante deixa rastro: quem entregou, para quem, e por quê.
-- Sem isso, "eu achei que você ia responder" não tem como ser resolvido.
create or replace function zap_transferir(p_conversa uuid, p_para uuid, p_motivo text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare v_de uuid;
begin
  select atendente_id into v_de from zap_conversas where id = p_conversa;
  if not found then raise exception 'conversa inexistente'; end if;
  update zap_conversas set atendente_id = p_para, status = 'aberta' where id = p_conversa;
  insert into zap_transferencias (conversa_id, de_id, para_id, motivo)
  values (p_conversa, v_de, p_para, nullif(trim(p_motivo),''));
end $$;

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
                           'vinculos','frases_prontas','lembrar_motivos',
                           'inss_fila','orgao_producao',
                           'rotinas','rotinas_feitas','andamentos_lidos','anexos',
                           'aposentadorias','lista_pref','config_app',
                           'zap_conversas','zap_mensagens','zap_transferencias'] loop
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
