-- F615 · a matéria do caso (onda 1 dos casos não previdenciários, decisões do Paulo de 15.11.2026).
-- Fora da previdenciária o caso é genérico, só anotações. Não chuta matéria: o caso da lista Marcos
-- sem espécie fica 'previdenciaria' e o CRM pede a escolha no cartão.
alter table public.casos add column if not exists area text not null default 'previdenciaria';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'casos_area_check') then
    alter table public.casos add constraint casos_area_check
      check (area in ('previdenciaria','civil','trabalhista','familia','criminal','tributaria'));
  end if;
end $$;
