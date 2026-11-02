-- ════════════════════════════════════════════════════════════════════════════
-- F290 · SUGESTÕES DA EQUIPE (pedido do Paulo, 28.10.2026)
-- O botão fixo acima do ⚡ abre a janela em que qualquer colaborador, em qualquer
-- nível e tela, anota um erro, uma correção ou uma melhoria do CRM. Somente o
-- titular (o Paulo, inicial 'P') lê: a barreira é a RLS, e não a tela. Quem
-- escreve não lê nem a própria anotação, por isso o app grava com
-- Prefer: return=minimal (o INSERT com retorno pediria a leitura).
-- Rode no Supabase (SQL Editor). Pode rodar de novo sem estragar nada.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists sugestoes_equipe (
  id         uuid primary key default gen_random_uuid(),
  autor      uuid default eu_colab() references colaboradores(id) on delete set null,
  tipo       text not null check (tipo in ('erro','correcao','melhoria')),
  tela       text,                 -- onde a pessoa estava ao escrever
  texto      text not null check (length(trim(texto)) > 0),
  criado_em  timestamptz not null default now(),
  lida_em    timestamptz
);
-- os anexos (print, vídeo): [{caminho, nome, tipo}] no bucket privado "sugestoes"
alter table sugestoes_equipe add column if not exists arquivos jsonb not null default '[]';

-- o titular: o Paulo, e não qualquer admin, porque a anotação pode ser sobre outro admin
create or replace function sou_titular() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from colaboradores where auth_id = auth.uid() and inicial = 'P' and ativo);
$$;

alter table sugestoes_equipe enable row level security;
drop policy if exists sug_escrever on sugestoes_equipe;
drop policy if exists sug_titular_ler on sugestoes_equipe;
drop policy if exists sug_titular_marcar on sugestoes_equipe;
drop policy if exists sug_titular_apagar on sugestoes_equipe;
-- qualquer colaborador logado escreve, sempre em nome próprio
create policy sug_escrever on sugestoes_equipe for insert to authenticated
  with check (autor = eu_colab() and lida_em is null);
create policy sug_titular_ler on sugestoes_equipe for select to authenticated using (sou_titular());
create policy sug_titular_marcar on sugestoes_equipe for update to authenticated
  using (sou_titular()) with check (sou_titular());
create policy sug_titular_apagar on sugestoes_equipe for delete to authenticated using (sou_titular());
revoke all on sugestoes_equipe from anon;

-- o bucket dos anexos: privado, 50 MB por arquivo, só imagem e vídeo; todos enviam, somente o titular lê e apaga
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('sugestoes','sugestoes',false, 52428800, array['image/*','video/*'])
  on conflict (id) do update set public = false, file_size_limit = 52428800, allowed_mime_types = array['image/*','video/*'];
drop policy if exists sugestoes_enviar on storage.objects;
drop policy if exists sugestoes_ler on storage.objects;
drop policy if exists sugestoes_apagar on storage.objects;
create policy sugestoes_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'sugestoes');
create policy sugestoes_ler on storage.objects for select to authenticated
  using (bucket_id = 'sugestoes' and sou_titular());
create policy sugestoes_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'sugestoes' and sou_titular());
