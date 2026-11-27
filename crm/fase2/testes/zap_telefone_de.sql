-- Auditoria de 27.11.2026, item 9b: "Este telefone é de" na ficha preenche o quem conversa da conversa que nasce
-- ou é ligada ao cliente depois. Roda na base montada (schema + migrações). Falha = linha "FALHOU".
\set QUIET on
create temp table t_res(nome text, ok bool);
insert into clientes (id, nome, telefone, telefones) values
  ('00000000-0000-0000-0000-00000000c931', 'Cliente Teste', '5500000000001',
   '[{"numero":"5500000000001","zap":true},{"numero":"5500000000002","de":"mãe","de_nome":"Pessoa Teste"},
     {"numero":"5500000000003","de":"outro"},{"numero":"5500000000004","de":"próprio"},
     {"numero":"5500000000005","de":"cônjuge"},{"numero":"5500000000006","de":"filho(a)"},{"numero":"5500000000007","de":"mãe"}]');

-- 1. conversa nova do número da mãe: relação e nome vêm da ficha
insert into zap_conversas (id, telefone, cliente_id, nome_perfil) values
  ('00000000-0000-0000-0000-0000000009a1', '5500000000002', '00000000-0000-0000-0000-00000000c931', 'Perfil');
insert into t_res select 'conversa nova do telefone da mãe recebe relação e nome', exists(select 1 from zap_conversas
  where id = '00000000-0000-0000-0000-0000000009a1' and contato_relacao = 'mãe' and contato_nome = 'Pessoa Teste');
-- 2. "outro" sem nome: outra pessoa, com o nome do perfil
insert into zap_conversas (id, telefone, cliente_id, nome_perfil) values
  ('00000000-0000-0000-0000-0000000009a2', '5500000000003', '00000000-0000-0000-0000-00000000c931', 'Perfil Dois');
insert into t_res select 'outro vira outra pessoa, com o nome do perfil', exists(select 1 from zap_conversas
  where id = '00000000-0000-0000-0000-0000000009a2' and contato_relacao = 'outra pessoa' and contato_nome = 'Perfil Dois');
-- 3. o próprio e o principal sem relação ficam como estão
insert into zap_conversas (id, telefone, cliente_id) values
  ('00000000-0000-0000-0000-0000000009a3', '5500000000004', '00000000-0000-0000-0000-00000000c931'),
  ('00000000-0000-0000-0000-0000000009a4', '5500000000001', '00000000-0000-0000-0000-00000000c931');
insert into t_res select 'próprio e principal sem relação', not exists(select 1 from zap_conversas
  where id in ('00000000-0000-0000-0000-0000000009a3', '00000000-0000-0000-0000-0000000009a4') and contato_relacao is not null);
-- 4. conversa sem cliente ligada depois ao cliente recebe a relação
insert into zap_conversas (id, telefone) values ('00000000-0000-0000-0000-0000000009a5', '5500000000005');
update zap_conversas set cliente_id = '00000000-0000-0000-0000-00000000c931' where id = '00000000-0000-0000-0000-0000000009a5';
insert into t_res select 'vincular depois preenche a relação', exists(select 1 from zap_conversas
  where id = '00000000-0000-0000-0000-0000000009a5' and contato_relacao = 'cônjuge');
-- 5. relação já informada na conversa não é trocada
insert into zap_conversas (id, telefone, cliente_id, contato_nome, contato_relacao) values
  ('00000000-0000-0000-0000-0000000009a6', '5500000000006', '00000000-0000-0000-0000-00000000c931', 'Nome Dito', 'irmão(ã)');
insert into t_res select 'relação já informada fica', exists(select 1 from zap_conversas
  where id = '00000000-0000-0000-0000-0000000009a6' and contato_relacao = 'irmão(ã)' and contato_nome = 'Nome Dito');
-- 6. telefones mal formados não derrubam a conversa
update clientes set telefones = '{"x":1}', campos = '{"telefones":"errado"}' where id = '00000000-0000-0000-0000-00000000c931';
with r as (insert into zap_conversas (id, telefone, cliente_id) values
  ('00000000-0000-0000-0000-0000000009a7', '5500000000007', '00000000-0000-0000-0000-00000000c931') returning 1)
insert into t_res select 'lista mal formada não impede a conversa', (select count(*) from r) = 1;
insert into t_res select 'gatilho fechado a authenticated', not has_function_privilege('authenticated', 'zap_conversa_tel_de()', 'execute');

\set QUIET off
select case when ok then 'ok      ' else 'FALHOU  ' end || nome from t_res;
select 'falhas | ' || count(*) filter (where not ok) from t_res;
