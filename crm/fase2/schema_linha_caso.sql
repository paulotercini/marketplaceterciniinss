-- F102 · A LINHA DO CASO. Mais de um NB no mesmo caso (o principal segue em
-- casos.nb; os demais entram aqui) e o comentário FIXO do caso, que aparece
-- em destaque acima dos prazos enquanto estiver preenchido.
--   nbs  : ["2161976766", ...]  (só dígitos)
--   fixo : {"texto": "...", "lembrar_em": "AAAA-MM-DD"|null, "por": uuid, "em": iso}
alter table casos add column if not exists nbs  jsonb not null default '[]'::jsonb;
alter table casos add column if not exists fixo jsonb;
