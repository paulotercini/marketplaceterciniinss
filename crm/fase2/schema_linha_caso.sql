-- F102 · A LINHA DO CASO. Mais de um NB no mesmo caso (o principal segue em
-- casos.nb; os demais entram aqui) e o comentário FIXO do caso, que aparece
-- em destaque acima dos prazos enquanto estiver preenchido.
--   nbs  : ["2161976766", ...]  (só dígitos)
--   fixo : {"texto": "...", "lembrar_em": "AAAA-MM-DD"|null, "por": uuid, "em": iso}
alter table casos add column if not exists nbs  jsonb not null default '[]'::jsonb;
alter table casos add column if not exists fixo jsonb;
-- F113 · a SUBESPÉCIE do escritório (chave do catálogo SUBESPECIES do app,
-- ex.: "B42.PCD.ESP"); o título do caso passa a ser o nome dela.
alter table casos add column if not exists subespecie text;
-- F114 · as DATAS ESSENCIAIS que cada espécie exige e que o CRM ainda não
-- tinha. Entram na linha do caso só na espécie que precisa delas (o mapa
-- ESSENCIAL do app decide); nas outras espécies ficam em gestão do caso.
--   obito_em             pensão por morte, janela de 90 e 180 dias do art. 74, I
--   prisao_em            auxílio-reclusão, define o regime jurídico inteiro
--   parto_em             salário-maternidade (também a data da guarda ou adoção)
--   did                  Data de Início da Deficiência ou da Doença (PCD, BPC, preexistente)
--   consolidacao_em      consolidação das lesões, separa o B31 do auxílio-acidente
--   cat_em               emissão da CAT, distinta da DAT
--   primeiro_pagamento_em  conta a decadência do art. 103 nas revisões
--   grau_deficiencia     leve, moderada ou grave (LC 142/2013)
alter table casos add column if not exists obito_em date;
alter table casos add column if not exists prisao_em date;
alter table casos add column if not exists parto_em date;
alter table casos add column if not exists did date;
alter table casos add column if not exists consolidacao_em date;
alter table casos add column if not exists cat_em date;
alter table casos add column if not exists primeiro_pagamento_em date;
alter table casos add column if not exists grau_deficiencia text;
