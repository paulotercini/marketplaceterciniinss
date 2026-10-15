-- F226 · migração única dos pré-casos para linhas de `casos` (docs/PRE-CASOS.md, item 8).
-- Roda depois de schema_pre_caso.sql. Pode rodar de novo: cada passo pula o que já foi feito.
-- campos.precasos e campos.especie NÃO são apagados aqui: o app ignora o item cujo id já
-- tem linha e limpa o cadastro na primeira gravação do cliente.

-- 1 · D3 · os casos antigos da fase Escritório viram pré-casos
update casos set pre_caso = true
 where fase = 'escritorio' and not pre_caso;

-- 2 · cada item de clientes.campos.precasos vira uma linha (o id pc_… fica em precaso.id)
insert into casos (cliente_id, titulo, fase, beneficio, pre_caso, precaso, origem_lista)
select c.id, c.nome,
       case when coalesce((e->>'so_lembrete')::boolean, false) then 'encerrado' else 'escritorio' end,
       nullif(e->>'especie', ''), true, e - 'especie', '🙋 Escritório'
  from clientes c, jsonb_array_elements(c.campos->'precasos') e
 where not exists (select 1 from casos k where k.cliente_id = c.id and k.pre_caso
                     and k.precaso->>'id' = e->>'id');

-- 3 · a espécie única de antes (o "legado") de quem não tem caso vivo vira pré-caso
insert into casos (cliente_id, titulo, fase, beneficio, pre_caso, precaso, origem_lista)
select c.id, c.nome, 'escritorio', c.campos->>'especie', true,
       jsonb_build_object('id', 'legado', 'natureza', '', 'marc', '{}'::jsonb, 'honorarios', ''),
       '🙋 Escritório'
  from clientes c
 where coalesce(c.campos->>'especie', '') not in ('', 'Indicação de pagamentos ao INSS')
   and c.campos->'precasos' is null
   and not exists (select 1 from casos k where k.cliente_id = c.id and k.fase <> 'encerrado');
