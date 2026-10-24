-- Regressão do robô que responde a situação do processo, espera e pode ser
-- conduzido (F258). O que importa aqui é não dizer a etapa a quem não é o
-- cliente, não dizer etapa que o portal não diria, e não insistir com quem
-- não respondeu.
-- ⚠ Este arquivo APAGA conversas, clientes, casos e leads: banco de teste só.
--   psql "postgres://…" -q -f crm/fase2/testes/zap_robo.sql

\set QUIET on
delete from zap_mensagens; delete from zap_transferencias; delete from zap_conversas;
delete from mencoes; delete from atribuicoes; delete from andamentos;
delete from leads; delete from casos; delete from clientes;
delete from colaboradores where inicial in ('X');
insert into colaboradores (id, nome, inicial, cor, papel, atende_zap, setor) values
  ('33333333-3333-3333-3333-333333333333','Amanda t','X','#c19c00','equipe',true,'inss');
insert into clientes (id, nome, telefone) values
  ('11111111-1111-1111-1111-111111111111','Maria','16 99999-0000'),
  ('22222222-2222-2222-2222-222222222222','Sem Etapa','16988881111');
insert into casos (id, cliente_id, titulo, beneficio, fase, etapa, pre_caso, trilha, ronda) values
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Auxílio','Auxílio-doença','inss','aguardando perícia',false,null,'{}'),
  -- encerrado, pré-caso, etapa de outra fase e etapa desatualizada não saem
  ('aaaaaaaa-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Revisão','Revisão','encerrado','decidido',false,null,'{}'),
  ('aaaaaaaa-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','BPC','BPC/LOAS','escritorio','em atendimento',true,null,'{}'),
  ('aaaaaaaa-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','Pensão','Pensão por morte','judicial','aguardando perícia',false,null,'{}'),
  ('aaaaaaaa-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','Idade','Aposentadoria por idade','conselho','em pauta',false,'{"velha":{"etapa":"em pauta"}}','{}'),
  -- no prazo fatal, a etapa vale pela lista de origem
  ('aaaaaaaa-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','Prazo','Salário-maternidade','outro','em exigência',false,null,'{"prazo_de":"🌻 INSS"}'),
  ('aaaaaaaa-0000-0000-0000-000000000007','22222222-2222-2222-2222-222222222222','Novo','Auxílio-doença','inss',null,false,null,'{}');
insert into config_app (chave, valor) values ('zap_bot_ligado','sim'), ('zap_pausa_bot','0'),
  ('zap_hora_inicio','00:00'), ('zap_hora_fim','23:59'), ('zap_dias_uteis','1,2,3,4,5,6,7')
  on conflict (chave) do update set valor = excluded.valor;
create temp table r(k text, v boolean);

create or replace function _diz(p_fone text, p_txt text) returns void
language plpgsql as $$
declare v uuid; begin
  v := zap_abrir(p_fone, 'Fulano');
  insert into zap_mensagens (conversa_id, direcao, texto) values (v, 'entrada', p_txt);
end $$;
create or replace function _conv(p_fone text) returns zap_conversas
language sql as $$ select * from zap_conversas where telefone = regexp_replace(p_fone,'\D','','g') $$;
create or replace function _ultima(p_fone text) returns text
language sql as $$
  select m.texto from zap_mensagens m join zap_conversas c on c.id = m.conversa_id
   where c.telefone = regexp_replace(p_fone,'\D','','g') and m.por_bot order by m.seq desc limit 1
$$;
\set QUIET off

-- ── a etapa, só a que o portal diria ──────────────────────────────────────
insert into r select 't1 DDD e 8 dígitos, com ou sem o nono dígito',
  fone_ddd8('5516999990000') = '1699990000' and fone_ddd8('551699990000') = '1699990000'
  and fone_ddd8('(16) 99999-0000') = '1699990000' and fone_ddd8('99990000') is null;
insert into r select 't2 etapa do catálogo na fase atual sai',
  zap_etapa_publica((select k from casos k where id='aaaaaaaa-0000-0000-0000-000000000001')) = 'aguardando perícia';
insert into r select 't3 etapa de outra fase não sai',
  zap_etapa_publica((select k from casos k where id='aaaaaaaa-0000-0000-0000-000000000004')) is null;
insert into r select 't4 etapa desatualizada não sai',
  zap_etapa_publica((select k from casos k where id='aaaaaaaa-0000-0000-0000-000000000005')) is null;
insert into r select 't5 no prazo fatal vale a lista de origem',
  zap_etapa_publica((select k from casos k where id='aaaaaaaa-0000-0000-0000-000000000006')) = 'em exigência';

-- ── quem pergunta do processo recebe a resposta na hora ───────────────────
select _diz('5516999990000','oi');
select _diz('5516999990000','1');
insert into r select 't6 o cliente recebe a situação dos casos abertos',
  _ultima('5516999990000') like '%Auxílio-doença: *aguardando perícia*%'
  and _ultima('5516999990000') like '%Salário-maternidade: *em exigência*%';
insert into r select 't7 sem o encerrado, o pré-caso, a outra fase e a desatualizada',
  _ultima('5516999990000') not like '%Revisão%' and _ultima('5516999990000') not like '%BPC%'
  and _ultima('5516999990000') not like '%Pensão%' and _ultima('5516999990000') not like '%em pauta%';
insert into r select 't8 e o robô fica com ele, sem chamar a equipe',
  (select bot_passo = 'situacao' and atendente_id is null and bot_ativo from _conv('5516999990000'));
select _diz('5516999990000','quero falar com a doutora');
insert into r select 't9 respondeu de novo: vai para quem cuida do processo',
  (select not bot_ativo from _conv('5516999990000'))
  and _ultima('5516999990000') like '%cuida do seu processo%';

-- conta antiga do WhatsApp, sem o nono dígito: é o mesmo telefone
insert into clientes (id, nome, telefone) values
  ('44444444-4444-4444-4444-444444444444','Conta Antiga','16 98777-6666');
insert into casos (cliente_id, titulo, beneficio, fase, etapa) values
  ('44444444-4444-4444-4444-444444444444','Idade','Aposentadoria por idade','inss','aguardando análise');
select _diz('551687776666','oi');
select _diz('551687776666','processo');
insert into r select 't10 número sem o nono dígito também recebe',
  _ultima('551687776666') like '%aguardando análise%';

-- a conversa ligada à ficha à mão (a filha, outro DDD) não recebe a etapa
select _diz('5521977775555','oi');
update zap_conversas set cliente_id = '11111111-1111-1111-1111-111111111111' where telefone = '5521977775555';
select _diz('5521977775555','1');
insert into r select 't11 número que não é o da ficha não recebe a etapa',
  _ultima('5521977775555') not like '%aguardando perícia%'
  and _ultima('5521977775555') like '%cuida do seu processo%';

-- cliente sem etapa declarada: como antes, vai para a equipe
select _diz('5516988881111','oi');
select _diz('5516988881111','1');
insert into r select 't12 sem etapa, o robô chama a equipe',
  _ultima('5516988881111') like '%cuida do seu processo%'
  and (select not bot_ativo from _conv('5516988881111'));

-- ── espera com prazo ──────────────────────────────────────────────────────
select _diz('5516977772222','oi');
create or replace function _atrasar(p_fone text, p_tempo interval) returns void
language sql as $$
  update zap_mensagens set criado_em = criado_em - p_tempo
   where conversa_id = (select id from zap_conversas where telefone = p_fone);
  update zap_conversas set bot_desde = bot_desde - p_tempo where telefone = p_fone;
$$;
select _atrasar('5516977772222', interval '3 hours');
insert into r select 't13 menu sem resposta em 2 horas recebe um lembrete',
  zap_bot_esperas() = 1 and _ultima('5516977772222') like 'Olá! Ainda podemos ajudar?%'
  and (select bot_passo = 'lembrete' from _conv('5516977772222'));
insert into r select 't14 e não repete o lembrete',
  zap_bot_esperas() = 0;
select _atrasar('5516977772222', interval '2 days');
select zap_bot_esperas();
insert into r select 't15 lembrete sem resposta: volta ao começo calado',
  (select bot_passo is null from _conv('5516977772222'))
  and (select count(*) = 2 from zap_mensagens m join zap_conversas c on c.id = m.conversa_id
        where c.telefone = '5516977772222' and m.por_bot);
select _diz('5516977772222','bom dia');
insert into r select 't16 a próxima mensagem recebe o menu de novo',
  _ultima('5516977772222') like '%responda com um número%';
-- quem respondeu não recebe lembrete, mesmo que o robô, na pausa, não tenha
-- mudado de passo
update config_app set valor='15' where chave='zap_pausa_bot';
select _diz('5516977772222','ok');
update config_app set valor='0' where chave='zap_pausa_bot';
update zap_conversas set bot_desde = now() - interval '3 hours' where telefone = '5516977772222';
insert into r select 't17 quem respondeu depois do passo não recebe lembrete',
  zap_bot_esperas() = 0 and (select bot_passo = 'inicio' from _conv('5516977772222'));

-- ── a equipe conduz o robô ────────────────────────────────────────────────
do $$ begin perform zap_bot_ir((_conv('5516999990000')).id, 'inicio'); end $$;
insert into r select 't18 devolver ao robô tira o atendente e religa o robô',
  (select atendente_id is null and bot_ativo and bot_passo = 'inicio' from _conv('5516999990000'));
insert into r select 't19 o cliente recebe o texto do passo',
  _ultima('5516999990000') like '%responda com um número%';
insert into r select 't20 e fica a nota de quem levou',
  exists (select 1 from zap_mensagens m join zap_conversas c on c.id = m.conversa_id
           where c.telefone = '5516999990000' and m.direcao = 'interna' and m.texto like '%levou o robô ao passo "inicio"%');
do $$ begin
  begin
    perform zap_bot_ir((_conv('5516999990000')).id, 'nao_existe');
    insert into r values ('t21 passo inexistente é recusado', false);
  exception when others then
    insert into r values ('t21 passo inexistente é recusado', true);
  end;
end $$;
do $$ begin perform zap_bot_ir((_conv('5516999990000')).id, 'financeiro'); end $$;
insert into r select 't22 passo que entrega a um setor chama a equipe',
  (select not bot_ativo from _conv('5516999990000'));

-- robô desligado: a espera também para
update config_app set valor='nao' where chave='zap_bot_ligado';
update zap_conversas set bot_passo = 'inicio', bot_desde = now() - interval '3 hours',
       atendente_id = null, bot_ativo = true where telefone = '5516988881111';
insert into r select 't23 com o robô desligado, ninguém recebe lembrete', zap_bot_esperas() = 0;
update config_app set valor='sim' where chave='zap_bot_ligado';

select k, case when v then 'ok' else 'FALHOU' end as resultado from r order by k;
select count(*) filter (where not v) as falhas from r;
