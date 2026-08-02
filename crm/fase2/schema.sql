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

-- ── Segurança (RLS) ───────────────────────────────────────────────────────
-- Regra geral: só usuário logado acessa; anônimo não vê NADA.
-- Tarefas particulares: só o dono. Credenciais: leitura logada + log no app.
do $$
declare t text;
begin
  foreach t in array array['colaboradores','clientes','credenciais','credencial_vis',
                           'casos','andamentos','eventos','pagamentos','tarefas',
                           'atribuicoes','meu_dia'] loop
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
  ('A', 'Amanda', '#c74e93'),
  ('M', 'Marcos', '#0b6a0b'),
  ('D', 'André',  '#b4530a'),
  ('I', 'Ingrid', '#5c2e91'),
  ('C', 'Claude', '#8a5cf6')
on conflict (inicial) do nothing;
