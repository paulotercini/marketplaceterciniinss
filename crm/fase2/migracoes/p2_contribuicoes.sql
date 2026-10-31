-- P2 dos prazos (31.10.2026): o plano de contribuições diz para quê se paga e de onde veio.
alter table qualidade_planos
  add column if not exists finalidade text not null default 'qualidade',
  add column if not exists lembrete_id uuid references lembretes(id) on delete set null,
  add column if not exists caso_id uuid references casos(id) on delete set null;
do $$ begin
  alter table qualidade_planos add constraint qualidade_planos_finalidade_chk
    check (finalidade in ('qualidade','carencia','aposentadoria','complementacao','indenizacao'));
exception when duplicate_object then null; end $$;
create index if not exists qualidade_planos_lembrete on qualidade_planos(lembrete_id) where lembrete_id is not null;
