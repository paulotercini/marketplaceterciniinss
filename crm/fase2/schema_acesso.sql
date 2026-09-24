-- F130 · acesso dos colaboradores (24.09.2026)
-- Paulo é admin. Só admin edita a equipe, vê o token do GitHub e a área
-- ⚙️ Configurações. O login nasce no painel do Supabase (Authentication →
-- Users → Add user); o e-mail cadastrado na equipe liga o usuário sozinho.
alter table colaboradores add column if not exists email text unique;
update colaboradores set papel='admin' where inicial='P';

-- security definer: a policy de colaboradores não pode consultar colaboradores
create or replace function sou_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from colaboradores where auth_id = auth.uid() and papel = 'admin');
$$;

drop policy if exists autenticados on colaboradores;
drop policy if exists colab_ler on colaboradores;
drop policy if exists colab_admin on colaboradores;
create policy colab_ler   on colaboradores for select to authenticated using (true);
create policy colab_admin on colaboradores for all    to authenticated using (sou_admin()) with check (sou_admin());

-- config_app: todo mundo lê e grava o que é do dia a dia; o gh_token só o admin
drop policy if exists autenticados on config_app;
drop policy if exists cfg_todos on config_app;
create policy cfg_todos on config_app for all to authenticated
  using (chave <> 'gh_token' or sou_admin()) with check (chave <> 'gh_token' or sou_admin());

-- usuário criado no painel liga-se ao colaborador pelo e-mail
create or replace function ligar_colaborador() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update colaboradores set auth_id = new.id
   where auth_id is null and lower(email) = lower(new.email);
  return new;
end $$;
drop trigger if exists ligar_colaborador on auth.users;
create trigger ligar_colaborador after insert on auth.users
  for each row execute function ligar_colaborador();

-- quem já existe nos dois lados
update colaboradores c set auth_id = u.id from auth.users u
 where c.auth_id is null and lower(c.email) = lower(u.email);
update colaboradores c set email = u.email from auth.users u
 where c.email is null and c.auth_id = u.id;
