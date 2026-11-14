-- F589 · gravação direta do colaborador Claude com desfazer. Roda na base montada (schema + migrações), não no Supabase.
-- Falha = linha "FALHOU".
\set QUIET on
create temp table t_res(nome text, ok bool);
create or replace function pg_temp.tenta(q text) returns text language plpgsql as $$
begin execute q; return 'ok'; exception when others then return 'erro: ' || sqlerrm; end $$;

-- o schema já semeia o Claude (inicial C); aqui ele vira o assistente_ia ativo
update colaboradores set papel = 'assistente_ia', ativo = true where inicial = 'C';
insert into colaboradores (id, auth_id, nome, inicial, papel, ativo) values
  ('00000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-0000000000a1', 'Admin Teste', 'X', 'admin', true),
  ('00000000-0000-0000-0000-0000000000b1', 'a0000000-0000-0000-0000-0000000000b1', 'Colaborador Teste', 'Y', 'colaborador', true),
  ('00000000-0000-0000-0000-0000000000d1', 'a0000000-0000-0000-0000-0000000000d1', 'Advogado Teste', 'Z', 'colaborador', true);
select id as claude from colaboradores where inicial = 'C' \gset
insert into clientes (id, nome, campos) values
  ('00000000-0000-0000-0000-00000000c111', 'Cliente Teste', '{"advogado_id":"00000000-0000-0000-0000-0000000000d1"}');
insert into casos (id, cliente_id, titulo, fase) values
  ('00000000-0000-0000-0000-00000000ca11', '00000000-0000-0000-0000-00000000c111', 'Caso Teste', 'inss');

-- 1. anotação direta entra no caso, em nome do Claude
select colab_gravar('{"tipo":"anotacao","chave":"t:an","caso_id":"00000000-0000-0000-0000-00000000ca11","texto":"Conferi o PAT: em análise."}'::jsonb) as id_an \gset
insert into t_res select 'anotacao gravada', exists(select 1 from andamentos where origem_id = 'colab:' || :'id_an'
  and autor_id = :'claude' and texto like 'Conferi o PAT%');
insert into t_res select 'anotacao marcada aprovada e direta', exists(select 1 from sugestoes_rotina where id = :'id_an'
  and estado = 'aprovada' and dados->>'direto' = 'true');

-- 2. tarefa direta cria andamento_tarefas para quem foi indicado
select colab_gravar('{"tipo":"tarefa","chave":"t:tf","caso_id":"00000000-0000-0000-0000-00000000ca11","texto":"Ligar ao cliente.","dados":{"para":"00000000-0000-0000-0000-0000000000b1","data":"2026-11-20"}}'::jsonb) as id_tf \gset
insert into t_res select 'tarefa criada', exists(select 1 from andamento_tarefas t join andamentos a on a.id = t.andamento_id
  where a.origem_id = 'colab:' || :'id_tf' and t.colaborador_id = '00000000-0000-0000-0000-0000000000b1' and t.lembrar_em = '2026-11-20' and t.natureza = 'compromisso');

-- 3. Prazo da IA sem indicação vai ao advogado do cliente, como lembrete
select colab_gravar('{"tipo":"prazo_ia","chave":"t:pz","caso_id":"00000000-0000-0000-0000-00000000ca11","texto":"Recurso ao CRPS.","dados":{"data":"2026-12-01"}}'::jsonb) as id_pz \gset
insert into t_res select 'prazo da IA ao advogado, lembrete', exists(select 1 from andamento_tarefas t join andamentos a on a.id = t.andamento_id
  where a.origem_id = 'colab:' || :'id_pz' and t.colaborador_id = '00000000-0000-0000-0000-0000000000d1' and t.natureza = 'lembrete' and a.texto like 'Prazo da IA 01/12/2026%');

-- 4. o externo não grava direto, e sem caso também não
insert into t_res select 'peca recusada', pg_temp.tenta($q$select colab_gravar('{"tipo":"peca","chave":"t:pc","caso_id":"00000000-0000-0000-0000-00000000ca11","texto":"x"}'::jsonb)$q$) like 'erro%';
insert into t_res select 'sem caso recusado', pg_temp.tenta($q$select colab_gravar('{"tipo":"anotacao","chave":"t:sc","texto":"x"}'::jsonb)$q$) like 'erro%';
insert into t_res select 'nada da peca gravado', not exists(select 1 from sugestoes_rotina where chave in ('t:pc','t:sc'));

-- 5. a mesma chave já decidida não grava de novo
insert into t_res select 'chave repetida devolve nulo',
  colab_gravar('{"tipo":"anotacao","chave":"t:an","caso_id":"00000000-0000-0000-0000-00000000ca11","texto":"Outra vez."}'::jsonb) is null;
insert into t_res select 'chave repetida sem andamento novo', (select count(*) from andamentos where texto = 'Outra vez.') = 0;

-- 6. desfazer: colaborador comum não pode; admin apaga a anotação e as tarefas e vai ao histórico
set request.jwt.claim.sub = 'a0000000-0000-0000-0000-0000000000b1';
insert into t_res select 'colaborador nao desfaz', pg_temp.tenta(format('select colab_desfazer(%L)', :'id_tf')) like 'erro%';
set request.jwt.claim.sub = 'a0000000-0000-0000-0000-0000000000a1';
insert into t_res select 'admin desfaz', (colab_desfazer(:'id_tf')->>'apagadas')::int = 1;
insert into t_res select 'andamento e tarefa apagados', not exists(select 1 from andamentos where origem_id = 'colab:' || :'id_tf')
  and not exists(select 1 from andamento_tarefas where colaborador_id = '00000000-0000-0000-0000-0000000000b1');
insert into t_res select 'desfeito no histórico', exists(select 1 from andamentos_apagados where origem_id = 'colab:' || :'id_tf');
insert into t_res select 'marcado descartado com desfeito', exists(select 1 from sugestoes_rotina where id = :'id_tf' and estado = 'descartada' and dados ? 'desfeito');
insert into t_res select 'desfazer duas vezes recusado', pg_temp.tenta(format('select colab_desfazer(%L)', :'id_tf')) like 'erro%';

-- 7. o externo continua pela aprovação
reset request.jwt.claim.sub;
select colab_pregravar('{"tipo":"peca","chave":"t:pc2","caso_id":"00000000-0000-0000-0000-00000000ca11","texto":"Minuta.","dados":{"titulo":"Recurso ordinário","link":"https://exemplo"}}'::jsonb) as id_pc \gset
insert into t_res select 'peca fica aberta', exists(select 1 from sugestoes_rotina where id = :'id_pc' and estado = 'aberta');
set request.jwt.claim.sub = 'a0000000-0000-0000-0000-0000000000b1';
insert into t_res select 'colaborador sem revisao nao aprova', pg_temp.tenta(format('select colab_aprovar(%L)', :'id_pc')) like 'erro%';
set request.jwt.claim.sub = 'a0000000-0000-0000-0000-0000000000a1';
insert into t_res select 'aprovar devolve andamento', (colab_aprovar(:'id_pc') ? 'andamento_id');
insert into t_res select 'peca no caso', exists(select 1 from andamentos where origem_id = 'colab:' || :'id_pc' and texto like 'Recurso ordinário (colaborador Claude)%');
reset request.jwt.claim.sub;

-- 8. permissões: colab_gravar só para a service_role; colab_levar para ninguém
insert into t_res select 'gravar fechado a authenticated', not has_function_privilege('authenticated', 'colab_gravar(jsonb)', 'execute');
insert into t_res select 'levar fechado', not has_function_privilege('authenticated', 'colab_levar(uuid,text,uuid)', 'execute')
  and not has_function_privilege('service_role', 'colab_levar(uuid,text,uuid)', 'execute');

\set QUIET off
select case when ok then 'ok      ' else 'FALHOU  ' end || nome from t_res;
select 'falhas | ' || count(*) filter (where not ok) from t_res;
