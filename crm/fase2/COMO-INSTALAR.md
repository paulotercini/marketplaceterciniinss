# CRM Fase 2 — instalação (uma vez, ~30 minutos)

A Fase 2 dá ao escritório um banco de dados próprio na nuvem (Supabase, plano
gratuito), login individual por colaborador e escrita dupla com o Microsoft
To Do — ninguém precisa mudar de rotina de uma vez.

## 1. Criar o projeto no Supabase

1. Acesse https://supabase.com → "Start your project" → crie a conta (pode usar
   o e-mail do escritório) e um projeto chamado `crm-tercini`, região
   `South America (São Paulo)`. Guarde a senha do banco.
2. No painel do projeto, anote em **Settings → API**:
   - `Project URL` (algo como `https://xxxx.supabase.co`)
   - `anon public` key
   - `service_role` key (⚠ secreta — fica só na máquina do Paulo, como o
     `graph_tokens.json`; nunca no git, nunca no app).

## 2. Criar as tabelas

No painel, **SQL Editor → New query**: cole o conteúdo de `schema.sql` e
execute (Run). Deve terminar sem erros — os colaboradores P/A/M/D/I/C já
ficam cadastrados.

## 3. Criar o login de cada colaborador

Em **Authentication → Users → Add user**: crie um usuário por colaborador
(e-mail + senha provisória) — Paulo, Amanda, Marcos, André, Ingrid.

Depois, vincule cada usuário ao colaborador. No SQL Editor:

```sql
update colaboradores set auth_id = (select id from auth.users where email = 'paulo@exemplo.com')  where inicial = 'P';
update colaboradores set auth_id = (select id from auth.users where email = 'amanda@exemplo.com') where inicial = 'A';
update colaboradores set auth_id = (select id from auth.users where email = 'marcos@exemplo.com') where inicial = 'M';
update colaboradores set auth_id = (select id from auth.users where email = 'andre@exemplo.com')  where inicial = 'D';
update colaboradores set auth_id = (select id from auth.users where email = 'ingrid@exemplo.com') where inicial = 'I';
```

(O "C" é o Claude — não tem login; aparece como autor dos lançamentos
automáticos, como o monitor do DOU.)

## 4. Primeira carga dos dados

Na máquina que tem o `graph_tokens.json` (a do Paulo):

```bash
python3 graph_refresh.py
python3 crm/sync_todo.py                      # To Do -> crm/data/crm.json

export SUPABASE_URL="https://xxxx.supabase.co"
export SUPABASE_SERVICE_KEY="a service_role key"
python3 crm/fase2/migrar.py                   # crm.json -> banco
```

(Alternativa mais rápida para a 1ª carga: `python3 crm/fase2/migrar.py --sql
carga.sql` e rodar o arquivo via psql/SQL Editor.)

## 5. Configurar e distribuir o app

Abra `crm/fase2/app.html` e preencha as duas linhas do `CONFIG` no topo com o
`Project URL` e a `anon public` key (a anon key pode ficar no app — o que
protege os dados são o login e as políticas RLS do banco).

Distribuição: mandar o arquivo para cada colaborador abrir no navegador, ou
publicar num host com senha do escritório (o Netlify que já usam serve). O
app NÃO contém dados — busca tudo do banco após o login.

## 6. Escrita dupla (rotina diária, automatizável)

```bash
python3 graph_refresh.py
python3 crm/fase2/escrever_todo.py   # o que foi escrito no app -> To Do
python3 crm/sync_todo.py             # To Do -> espelho
python3 crm/fase2/migrar.py          # espelho -> banco (idempotente, sem duplicar)
```

Os andamentos escritos no app chegam ao To Do no formato `DD.MM.AAAA (X): ...`
de sempre, e tarefas novas criadas no To Do aparecem no app na importação
seguinte.

## 7. Sincronização automática (recomendado)

O ciclo acima roda sozinho no GitHub Actions — mesmo mecanismo que o monitor
do DOU já usa (`.github/workflows/crm-sync.yml`, de hora em hora, 07h–20h,
segunda a sábado). Para ligar, basta cadastrar dois segredos novos no GitHub:

1. No repositório: **Settings → Secrets and variables → Actions → New
   repository secret**:
   - `SUPABASE_URL` = o Project URL
   - `SUPABASE_SERVICE_KEY` = a service_role key
   (o `GRAPH_REFRESH_TOKEN` já existe — é o mesmo do monitor do DOU.)
2. Pronto. Enquanto os segredos não existirem, o workflow roda e se pula sem
   erro. Para testar na hora: **Actions → CRM — sincronização To Do ↔ banco →
   Run workflow**.

Com isso, nada precisa rodar na máquina de ninguém.

## O que fica onde

| Arquivo | Sensível? | Onde vive |
|---|---|---|
| `schema.sql`, `migrar.py`, `escrever_todo.py`, `app.html` (sem CONFIG) | não | git |
| `service_role` key | ⚠ sim | só na máquina do Paulo (env) |
| `anon` key + URL no app.html distribuído | ok expor à equipe | app/host |
| dados dos clientes | ⚠ sim | só no banco (RLS) — nunca no git |
