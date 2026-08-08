-- Regressão dos avisos automáticos. O que se testa aqui é o que dá processo
-- e constrangimento: mensagem repetida, mensagem para caso encerrado,
-- mensagem de perícia que foi cancelada, e mensagem fora de hora.
-- ⚠ Este arquivo APAGA conversas, eventos, casos e clientes: banco de teste só.
--   psql "postgres://…" -q -f crm/fase2/testes/zap_avisos.sql

\set QUIET on
delete from zap_mensagens; delete from zap_transferencias; delete from zap_conversas;
delete from mencoes; delete from atribuicoes; delete from andamentos;
delete from eventos; delete from casos; delete from clientes; delete from leads;
update config_app set valor='nao' where chave='zap_bot_ligado';   -- o robô tem suíte própria
create temp table r(k text, v boolean);

-- hoje é quinta, 06.08.2026 — dia útil, para o gerador não recusar por horário
\set HOJE '2026-08-06'

insert into clientes (id, nome, telefone) values
  ('11111111-1111-1111-1111-111111111111','Maria das Dores Ferreira','16999990000'),
  ('22222222-2222-2222-2222-222222222222','João Batista','16988881111'),
  ('33333333-3333-3333-3333-333333333333','Sem Telefone', null),
  ('44444444-4444-4444-4444-444444444444','Benedita Aparecida','16977772222');
insert into casos (id, cliente_id, titulo, beneficio, fase) values
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Auxílio','Auxílio-doença','inss'),
  ('aaaaaaaa-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','Judicial','Auxílio-doença','judicial'),
  ('aaaaaaaa-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333','Sem tel','BPC/LOAS','inss'),
  ('aaaaaaaa-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','Encerrado','Revisão','encerrado'),
  -- LOAS encerrado de propósito: o CadÚnico continua importando depois que o
  -- nosso trabalho acabou, e é isso que se está testando
  ('aaaaaaaa-0000-0000-0000-000000000005','44444444-4444-4444-4444-444444444444','BPC','BPC/LOAS','encerrado');
insert into eventos (id, caso_id, tipo, data_hora, local, status) values
  -- daqui a 3 dias: a regra pericia_3d deve pegar
  ('bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',
   'Perícia','2026-08-09 14:30:00-03','INSS de Franca','agendada'),
  -- daqui a 7 dias: audiencia_7d
  ('bbbbbbbb-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000002',
   'Audiência','2026-08-13 09:00:00-03','Vara Federal de Franca','agendada'),
  -- CANCELADA, e daqui a 3 dias: não pode avisar ninguém
  ('bbbbbbbb-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001',
   'Perícia','2026-08-09 08:00:00-03','INSS','cancelada'),
  -- cliente sem telefone
  ('bbbbbbbb-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000003',
   'Perícia','2026-08-09 10:00:00-03','INSS','agendada'),
  -- caso ENCERRADO
  ('bbbbbbbb-0000-0000-0000-000000000005','aaaaaaaa-0000-0000-0000-000000000004',
   'Perícia','2026-08-09 11:00:00-03','INSS','agendada'),
  -- daqui a 30 dias: nenhuma regra cobre
  ('bbbbbbbb-0000-0000-0000-000000000006','aaaaaaaa-0000-0000-0000-000000000001',
   'Perícia','2026-09-05 14:00:00-03','INSS','agendada');
\set QUIET off

-- ── o que sai ─────────────────────────────────────────────────────────────
insert into r select 't1 gera os avisos do dia', zap_gerar_avisos(:'HOJE') = 2;
insert into r select 't2 a perícia de 3 dias virou mensagem', (select count(*)=1
  from zap_mensagens where aviso_chave='pericia_3d');
insert into r select 't3 a audiência de 7 dias também', (select count(*)=1
  from zap_mensagens where aviso_chave='audiencia_7d');
insert into r select 't4 e nada mais', (select count(*)=2 from zap_mensagens);

-- ── o texto ───────────────────────────────────────────────────────────────
insert into r select 't5 chama pelo primeiro nome, não pelo nome inteiro',
  (select texto like 'Olá, Maria!%' from zap_mensagens where aviso_chave='pericia_3d');
insert into r select 't6 com a data e a hora de Brasília',
  (select texto like '%09/08/2026 às 14:30%' from zap_mensagens where aviso_chave='pericia_3d');
insert into r select 't7 e o local, quando existe',
  (select texto like '%em INSS de Franca%' from zap_mensagens where aviso_chave='pericia_3d');
insert into r select 't8 avisa o que faltar sem justificar custa',
  (select texto like '%faltar sem justificar%' from zap_mensagens where aviso_chave='pericia_3d');
insert into r select 't9 sai como pedido de envio, marcado como automático',
  (select status='fila' and por_bot and direcao='saida'
     from zap_mensagens where aviso_chave='pericia_3d');
insert into r select 't10 na conversa do cliente certo',
  (select c.cliente_id='11111111-1111-1111-1111-111111111111'
     from zap_mensagens m join zap_conversas c on c.id=m.conversa_id
    where m.aviso_chave='pericia_3d');

-- ── o que NÃO pode sair ───────────────────────────────────────────────────
insert into r select 't11 perícia cancelada não avisa ninguém',
  (select count(*)=0 from zap_mensagens where aviso_ref='bbbbbbbb-0000-0000-0000-000000000003');
insert into r select 't12 cliente sem telefone não gera mensagem órfã',
  (select count(*)=0 from zap_mensagens where aviso_ref='bbbbbbbb-0000-0000-0000-000000000004');
insert into r select 't13 caso encerrado não incomoda mais o cliente',
  (select count(*)=0 from zap_mensagens where aviso_ref='bbbbbbbb-0000-0000-0000-000000000005');
insert into r select 't14 evento distante ainda não é hora',
  (select count(*)=0 from zap_mensagens where aviso_ref='bbbbbbbb-0000-0000-0000-000000000006');

-- ── nunca duas vezes ──────────────────────────────────────────────────────
insert into r select 't15 rodar de novo no mesmo dia não repete', zap_gerar_avisos(:'HOJE') = 0;
insert into r select 't16 e não duplica a mensagem', (select count(*)=2 from zap_mensagens);
insert into r select 't17 dez chamadas seguidas continuam não repetindo',
  (zap_gerar_avisos(:'HOJE') + zap_gerar_avisos(:'HOJE') + zap_gerar_avisos(:'HOJE')) = 0;

-- ── a véspera é outra regra, e pode mandar de novo ────────────────────────
insert into r select 't18 no dia seguinte sai o aviso de véspera',
  zap_gerar_avisos('2026-08-08') = 1;
insert into r select 't19 que é o texto de amanhã, não o de três dias',
  (select texto like '%é amanhã%' from zap_mensagens where aviso_chave='pericia_1d');

-- ── modo revisar: alguém confere antes ────────────────────────────────────
update zap_avisos set revisar=true where chave='audiencia_1d';
insert into r select 't20 regra com revisão gera rascunho', zap_gerar_avisos('2026-08-12') = 1;
insert into r select 't21 e o rascunho NÃO entra na fila de envio',
  (select status='rascunho' from zap_mensagens where aviso_chave='audiencia_1d');
update zap_avisos set revisar=false where chave='audiencia_1d';

-- ── CadÚnico ──────────────────────────────────────────────────────────────
update casos set cadunico='2024-10-05' where id='aaaaaaaa-0000-0000-0000-000000000005';
insert into r select 't22 CadÚnico avisa 60 dias antes de vencer',
  zap_gerar_avisos('2026-08-06') = 1;
insert into r select 't23 dizendo a data de vencimento',
  (select texto like '%vence em *05/10/2026*%' from zap_mensagens where aviso_chave='cadunico_60d');
insert into r select 't24 e mandando ao CRAS, que é o que resolve',
  (select texto like '%CRAS%' and texto like '%ATUALIZAÇÃO CADASTRAL%'
     from zap_mensagens where aviso_chave='cadunico_60d');
insert into r select 't25 vale mesmo com o caso encerrado',
  (select k.fase='encerrado' from zap_mensagens m
     join casos k on k.id=m.aviso_ref where m.aviso_chave='cadunico_60d');


-- ── DCB: o alarme que não pode falhar ─────────────────────────────────────
\set QUIET on
update casos set dcb = date '2026-09-16'
 where id='aaaaaaaa-0000-0000-0000-000000000001';
-- prorrogação já pedida: o alarme tem de calar
update casos set dcb = date '2026-09-16', dcb_prorrogacao_pedida = true
 where id='aaaaaaaa-0000-0000-0000-000000000002';
-- caso encerrado com DCB: não incomoda
update casos set dcb = date '2026-09-16'
 where id='aaaaaaaa-0000-0000-0000-000000000004';
\set QUIET off
insert into r select 't29 15 dias antes da DCB, UM aviso sai (pedida e encerrado calam)',
  zap_gerar_avisos('2026-09-01') = 1;
insert into r select 't30 para o cliente do caso certo, com a data da cessação',
  (select texto like '%cessação programada para 16/09/2026%'
      and texto like '%atestado ou laudo%'
     from zap_mensagens where aviso_chave='dcb_15d');
insert into r select 't31 pedir a prorrogação depois cala o alarme de vez',
  (select count(*)=1 from zap_mensagens where aviso_chave='dcb_15d');


-- ── aniversário 🎂 ────────────────────────────────────────────────────────
\set QUIET on
update clientes set dn='06081960' where id='11111111-1111-1111-1111-111111111111';
update clientes set dn='06081955' where id='33333333-3333-3333-3333-333333333333';  -- sem telefone
\set QUIET off
insert into r select 't32 no dia, o parabéns sai (e só para quem tem telefone)',
  zap_gerar_avisos(:'HOJE') = 1;
insert into r select 't33 com o texto do bolo, chamando pelo primeiro nome',
  (select texto like 'Feliz aniversário, Maria!%' from zap_mensagens
    where aviso_chave like 'aniversario:%');
insert into r select 't34 rodar de novo hoje não repete o parabéns',
  zap_gerar_avisos(:'HOJE') = 0;
-- (gerar e conferir em comandos separados: o snapshot de um SELECT não
--  enxerga o que a própria função inseriu)
do $$ begin
  insert into r values ('t35 mas ano que vem repete — a chave leva o ano',
    zap_gerar_avisos('2027-08-06') = 1);
end $$;
insert into r select 't36 com a mensagem do ano novo gravada',
  (select count(*)=1 from zap_mensagens where aviso_chave='aniversario:2027');

-- ── travas gerais ─────────────────────────────────────────────────────────
update config_app set valor='nao' where chave='zap_avisos_ligado';
insert into r select 't26 interruptor geral desliga tudo', zap_gerar_avisos('2026-08-10') = 0;
update config_app set valor='sim' where chave='zap_avisos_ligado';
update zap_avisos set ativo=false where chave='pericia_1d';
insert into r select 't27 regra desligada não dispara', zap_gerar_avisos('2026-08-08') = 0;
update zap_avisos set ativo=true where chave='pericia_1d';
-- sem data explícita, o gerador respeita o expediente
update config_app set valor='23:58' where chave='zap_hora_inicio';
update config_app set valor='23:59' where chave='zap_hora_fim';
insert into r select 't28 fora do expediente não dispara nada', zap_gerar_avisos() = 0;
update config_app set valor='08:00' where chave='zap_hora_inicio';
update config_app set valor='18:00' where chave='zap_hora_fim';

\set QUIET on
update config_app set valor='sim' where chave='zap_bot_ligado';
\set QUIET off
select k, case when v then 'ok' else 'FALHOU' end as resultado
  from r order by (substring(k from '^t(\d+)'))::int;
select count(*) filter (where not v or v is null) as falhas from r;
