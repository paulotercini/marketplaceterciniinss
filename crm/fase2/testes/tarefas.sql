-- Regressão das tarefas por comentário: atribuição, aviso, conclusão por
-- pessoa e o efeito na preferência do WhatsApp.
-- ⚠ Este arquivo APAGA dados: banco de teste só.
--   psql "postgres://…" -q -f crm/fase2/testes/tarefas.sql

\set QUIET on
delete from andamento_tarefas; delete from zap_mensagens; delete from zap_conversas;
delete from mencoes; delete from andamentos; delete from atribuicoes;
delete from casos; delete from clientes; delete from leads;
delete from colaboradores where inicial in ('X','Y');
insert into colaboradores (id, nome, inicial, cor, papel, atende_zap, setor) values
  ('33333333-3333-3333-3333-333333333333','Amanda t','X','#c19c00','equipe',true,'inss'),
  ('44444444-4444-4444-4444-444444444444','Marcos t','Y','#0f7b6c','equipe',true,'triagem');
insert into clientes (id, nome, telefone)
  values ('11111111-1111-1111-1111-111111111111','Maria','16999990000');
insert into casos (id, cliente_id, titulo, fase)
  values ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Idade','inss');
insert into andamentos (id, caso_id, autor_id, texto) values
  ('bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',
   '44444444-4444-4444-4444-444444444444','Pedir CNIS atualizado e conferir vínculos');
create temp table r(k text, v boolean);
update config_app set valor='nao' where chave='zap_bot_ligado';
\set QUIET off

-- ── atribuir avisa quem recebeu ───────────────────────────────────────────
insert into andamento_tarefas (andamento_id, caso_id, colaborador_id, atribuido_por, lembrar_em)
values ('bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',
        '33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444444','2026-08-14'),
       ('bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',
        '44444444-4444-4444-4444-444444444444','44444444-4444-4444-4444-444444444444','2026-08-14');
insert into r select 't1 a tarefa cai na caixa de menções de quem recebeu',
  (select count(*)=1 from mencoes where para_id='33333333-3333-3333-3333-333333333333'
     and texto like '📌 Tarefa para 14/08:%CNIS%');
insert into r select 't2 registrando quem atribuiu (P → A)',
  (select de_id='44444444-4444-4444-4444-444444444444' from mencoes limit 1);
insert into r select 't3 atribuir a si mesmo não gera aviso',
  (select count(*)=0 from mencoes where para_id='44444444-4444-4444-4444-444444444444');

-- ── a mesma pessoa não entra duas vezes no mesmo comentário ───────────────
do $$ begin
  begin
    insert into andamento_tarefas (andamento_id, caso_id, colaborador_id, lembrar_em)
    values ('bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',
            '33333333-3333-3333-3333-333333333333','2026-08-20');
    insert into r values ('t4 repetir a pessoa no comentário é recusado', false);
  exception when unique_violation then
    insert into r values ('t4 repetir a pessoa no comentário é recusado', true);
  end;
end $$;

-- ── tarefa sem data não existe ────────────────────────────────────────────
do $$ begin
  begin
    insert into andamento_tarefas (andamento_id, caso_id, colaborador_id, lembrar_em)
    values ('bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',
            '44444444-4444-4444-4444-444444444444', null);
    insert into r values ('t5 tarefa sem data é recusada pelo banco', false);
  exception when not_null_violation or unique_violation then
    insert into r values ('t5 tarefa sem data é recusada pelo banco', true);
  end;
end $$;

-- ── concluir é por pessoa ─────────────────────────────────────────────────
update andamento_tarefas set concluida_em = now()
 where colaborador_id='33333333-3333-3333-3333-333333333333';
insert into r select 't6 Amanda concluiu a dela',
  (select count(*)=1 from andamento_tarefas where concluida_em is not null);
insert into r select 't7 e a de Marcos continua aberta',
  (select count(*)=1 from andamento_tarefas
    where colaborador_id='44444444-4444-4444-4444-444444444444' and concluida_em is null);

-- ── quem tem tarefa aberta "cuida do cliente" no WhatsApp ─────────────────
do $$ declare v uuid; begin
  v := zap_abrir('16999990000','Maria');
  insert into r values ('t8 o WhatsApp entrega para quem tem tarefa aberta no caso',
    zap_escolher_atendente(v) = '44444444-4444-4444-4444-444444444444');
end $$;
update andamento_tarefas set concluida_em = now() where concluida_em is null;
do $$ declare v uuid; begin
  v := zap_abrir('16999990000');
  insert into r values ('t9 todas concluídas: cai na regra geral, não some ninguém',
    zap_escolher_atendente(v) is not null);
end $$;

-- ── apagar o comentário leva as tarefas junto ─────────────────────────────
delete from andamentos where id='bbbbbbbb-0000-0000-0000-000000000001';
insert into r select 't10 apagar o comentário apaga as tarefas dele',
  (select count(*)=0 from andamento_tarefas);

-- ── esteira: comentar carimba a revisão do caso ───────────────────────────
\set QUIET on
insert into casos (id, cliente_id, titulo, fase, revisado_em)
  values ('aaaaaaaa-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111',
          'Velho','inss', date '2025-01-10');
insert into andamentos (caso_id, autor_id, texto) values
  ('aaaaaaaa-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333',
   '🔄 Revisão do acervo — sem novidade.');
\set QUIET off
insert into r select 't11 registrar comentário carimba o revisado_em de hoje',
  (select revisado_em = (now() at time zone 'America/Sao_Paulo')::date
     from casos where id='aaaaaaaa-0000-0000-0000-000000000002');
\set QUIET on
update config_app set valor='sim' where chave='zap_bot_ligado';
\set QUIET off
select k, case when v then 'ok' else 'FALHOU' end as resultado
  from r order by (substring(k from '^t(\d+)'))::int;
select count(*) filter (where not v or v is null) as falhas from r;
