-- Regressão do chatbot e do encaminhamento. As regras que importam aqui não
-- são de programação, são de convivência: robô não fala por cima de
-- advogado, cliente não fica preso em menu, e quem pergunta do processo cai
-- com quem cuida do processo.
-- ⚠ Este arquivo APAGA conversas, clientes, casos e leads: banco de teste só.
--   psql "postgres://…" -q -f crm/fase2/testes/zap_bot.sql

\set QUIET on
delete from zap_mensagens; delete from zap_transferencias; delete from zap_conversas;
delete from mencoes; delete from atribuicoes; delete from conversas;
delete from andamentos;
delete from leads; delete from casos; delete from clientes;
delete from colaboradores where inicial in ('X','Y','Z');
insert into colaboradores (id, nome, inicial, cor, papel, atende_zap, setor) values
  ('33333333-3333-3333-3333-333333333333','Amanda t','X','#c19c00','equipe',true,'inss'),
  ('44444444-4444-4444-4444-444444444444','Marcos t','Y','#0f7b6c','equipe',true,'triagem'),
  ('55555555-5555-5555-5555-555555555555','Ingrid t','Z','#8764b8','equipe',false,'inss');
insert into clientes (id, nome, telefone)
  values ('11111111-1111-1111-1111-111111111111','Maria','16999990000');
insert into casos (id, cliente_id, titulo, fase)
  values ('66666666-6666-6666-6666-666666666666','11111111-1111-1111-1111-111111111111','Idade','inss');
-- Ingrid cuida da Maria, mas NÃO atende WhatsApp: não pode ser escolhida
insert into atribuicoes (caso_id, colaborador_id)
  values ('66666666-6666-6666-6666-666666666666','55555555-5555-5555-5555-555555555555');
create temp table r(k text, v boolean);
-- Dentro de uma transação now() não anda, então a pausa de 15 segundos entre
-- falas do bot calaria o robô durante o teste inteiro. Ela fica desligada e é
-- ligada de novo só no caso que a testa (t21).
update config_app set valor='0' where chave='zap_pausa_bot';
-- e o expediente fica escancarado, senão a suíte passa de dia e falha de
-- noite: o aviso de "fora do horário" é uma mensagem a mais na contagem
update config_app set valor='00:00' where chave='zap_hora_inicio';
update config_app set valor='23:59' where chave='zap_hora_fim';
update config_app set valor='1,2,3,4,5,6,7' where chave='zap_dias_uteis';

-- helper: mensagem do cliente chegando
create or replace function _cliente_diz(p_fone text, p_txt text) returns void
language plpgsql as $$
declare v uuid; begin
  v := zap_abrir(p_fone, 'Fulano');
  insert into zap_mensagens (conversa_id, direcao, texto) values (v, 'entrada', p_txt);
end $$;
create or replace function _ultima_do_bot(p_fone text) returns text
language sql as $$
  select m.texto from zap_mensagens m join zap_conversas c on c.id=m.conversa_id
   where c.chave = fone_chave(p_fone) and m.por_bot
   order by m.seq desc limit 1
$$;

-- ── primeiro contato ──────────────────────────────────────────────────────
select _cliente_diz('16988881111','oi, bom dia');
insert into r select 't1 primeiro contato ganha o menu',
  _ultima_do_bot('16988881111') like '%Advocacia Previdenciária%';
insert into r select 't2 o menu sai como pedido de envio (fila)',
  (select m.status='fila' from zap_mensagens m join zap_conversas c on c.id=m.conversa_id
    where c.chave=fone_chave('16988881111') and m.por_bot order by m.seq desc limit 1);
insert into r select 't3 o bot não responde pergunta jurídica no menu',
  _ultima_do_bot('16988881111') not ilike '%você tem direito%';

-- ── escolher pelo número ──────────────────────────────────────────────────
select _cliente_diz('16988881111','2');
insert into r select 't4 tecla 2 leva para viabilidade',
  _ultima_do_bot('16988881111') like '%analisar seu direito%';
insert into r select 't5 e entrega para quem é da triagem',
  (select atendente_id='44444444-4444-4444-4444-444444444444'
     from zap_conversas where chave=fone_chave('16988881111'));
insert into r select 't6 desligando o bot ao entregar',
  (select not bot_ativo from zap_conversas where chave=fone_chave('16988881111'));
insert into r select 't7 e avisando na caixa de entrada de quem recebeu',
  (select count(*)=1 from mencoes
    where para_id='44444444-4444-4444-4444-444444444444' and texto like '%esperando no WhatsApp%');
insert into r select 't8 entregue, o bot não fala mais',
  (select count(*) from zap_mensagens m join zap_conversas c on c.id=m.conversa_id
    where c.chave=fone_chave('16988881111') and m.por_bot) = 2;
select _cliente_diz('16988881111','e aí, alguém?');
insert into r select 't9 nem depois de o cliente insistir',
  (select count(*) from zap_mensagens m join zap_conversas c on c.id=m.conversa_id
    where c.chave=fone_chave('16988881111') and m.por_bot) = 2;

-- ── escolher escrevendo, sem número ───────────────────────────────────────
select _cliente_diz('16977772222','oi');
select _cliente_diz('16977772222','queria saber do meu PROCESSO, por favor');
insert into r select 't10 entende palavra, não só tecla',
  _ultima_do_bot('16977772222') like '%cuida do seu processo%';
select _cliente_diz('16966663333','oi');
select _cliente_diz('16966663333','minha pericia foi remarcada?');
insert into r select 't11 acento não atrapalha (pericia/perícia)',
  _ultima_do_bot('16966663333') like '%perícia ou audiência%';

-- ── ninguém fica preso no menu ────────────────────────────────────────────
select _cliente_diz('16955554444','oi');
select _cliente_diz('16955554444','xpto');
insert into r select 't12 na primeira confusão, repete o menu',
  _ultima_do_bot('16955554444') like 'Não entendi%';
insert into r select 't13 e ainda não entregou para ninguém',
  (select atendente_id is null from zap_conversas where chave=fone_chave('16955554444'));
select _cliente_diz('16955554444','xpto de novo');
insert into r select 't14 na segunda, chama gente em vez de insistir',
  _ultima_do_bot('16955554444') like '%chamar alguém do escritório%';
insert into r select 't15 com dono de verdade',
  (select atendente_id is not null from zap_conversas where chave=fone_chave('16955554444'));

-- ── quem pergunta do processo cai com quem cuida do processo ──────────────
-- Ingrid cuida da Maria mas não atende zap; Amanda é do setor inss
select _cliente_diz('16999990000','oi');
select _cliente_diz('16999990000','1');
insert into r select 't16 cliente conhecido: quem cuida dele tem preferência…',
  (select atendente_id <> '55555555-5555-5555-5555-555555555555'
     from zap_conversas where chave=fone_chave('16999990000'));
insert into r select 't17 …mas só entre quem atende WhatsApp',
  (select atendente_id='33333333-3333-3333-3333-333333333333'
     from zap_conversas where chave=fone_chave('16999990000'));
-- agora Amanda passa a cuidar da Maria: ela ganha a preferência de verdade
insert into atribuicoes (caso_id, colaborador_id)
  values ('66666666-6666-6666-6666-666666666666','33333333-3333-3333-3333-333333333333');
insert into r select 't18 a escolha prefere quem já cuida do cliente',
  zap_escolher_atendente((select id from zap_conversas where chave=fone_chave('16999990000')),'triagem')
  = '33333333-3333-3333-3333-333333333333';

-- ── o humano no comando cala o bot ────────────────────────────────────────
update zap_conversas set bot_ativo=true, atendente_id=null, bot_passo=null
  where chave=fone_chave('16944445555');
select _cliente_diz('16944445555','oi');
insert into zap_mensagens (conversa_id, direcao, autor_id, texto, status)
  select id,'saida','33333333-3333-3333-3333-333333333333','Oi! Sou a Amanda, pode falar','fila'
    from zap_conversas where chave=fone_chave('16944445555');
insert into r select 't19 colaborador que responde assume a conversa',
  (select atendente_id='33333333-3333-3333-3333-333333333333' and not bot_ativo
     from zap_conversas where chave=fone_chave('16944445555'));
select _cliente_diz('16944445555','1');
insert into r select 't20 e o bot não interrompe a conversa dela',
  (select count(*) from zap_mensagens m join zap_conversas c on c.id=m.conversa_id
    where c.chave=fone_chave('16944445555') and m.por_bot) = 1;

-- ── três mensagens seguidas não viram três menus ──────────────────────────
delete from zap_conversas where chave=fone_chave('16933332222');
update config_app set valor='15' where chave='zap_pausa_bot';   -- a trava, ligada
do $$ declare v uuid; begin
  v := zap_abrir('16933332222','Apressado');
  insert into zap_mensagens (conversa_id, direcao, texto) values (v,'entrada','oi');
  insert into zap_mensagens (conversa_id, direcao, texto) values (v,'entrada','bom dia');
  insert into zap_mensagens (conversa_id, direcao, texto) values (v,'entrada','alguém aí?');
end $$;
update config_app set valor='0' where chave='zap_pausa_bot';
insert into r select 't21 cliente afobado recebe UM menu, não três',
  (select count(*) from zap_mensagens m join zap_conversas c on c.id=m.conversa_id
    where c.chave=fone_chave('16933332222') and m.por_bot) = 1;

-- ── horário ───────────────────────────────────────────────────────────────
-- aqui volta o expediente de verdade, que é o que se está testando
update config_app set valor='08:00' where chave='zap_hora_inicio';
update config_app set valor='18:00' where chave='zap_hora_fim';
update config_app set valor='1,2,3,4,5' where chave='zap_dias_uteis';
insert into r select 't22 quarta 10h é horário de atendimento',
  zap_no_horario('2026-08-05 10:00:00-03');
insert into r select 't23 quarta 22h não é',
  not zap_no_horario('2026-08-05 22:00:00-03');
insert into r select 't24 domingo 10h não é',
  not zap_no_horario('2026-08-09 10:00:00-03');
delete from zap_conversas where chave=fone_chave('16922221111');
do $$ declare v uuid; begin
  -- forçar "fora do horário" mudando a janela para uma que não contém agora
  update config_app set valor='23:58' where chave='zap_hora_inicio';
  update config_app set valor='23:59' where chave='zap_hora_fim';
  v := zap_abrir('16922221111','Noturno');
  insert into zap_mensagens (conversa_id, direcao, texto, criado_em)
  values (v,'entrada','oi', now() - interval '1 minute');
  update config_app set valor='00:00' where chave='zap_hora_inicio';
  update config_app set valor='23:59' where chave='zap_hora_fim';
  update config_app set valor='1,2,3,4,5,6,7' where chave='zap_dias_uteis';
end $$;
insert into r select 't25 fora do horário avisa antes de mostrar o menu',
  (select count(*)=2 from zap_mensagens m join zap_conversas c on c.id=m.conversa_id
    where c.chave=fone_chave('16922221111') and m.por_bot)
  and (select texto like '%próximo dia útil%' from zap_mensagens m
        join zap_conversas c on c.id=m.conversa_id
       where c.chave=fone_chave('16922221111') and m.por_bot
       order by m.seq limit 1);

-- ── transferência entre atendentes ────────────────────────────────────────
do $$ begin
  perform zap_transferir((select id from zap_conversas where chave=fone_chave('16999990000')),
                         '44444444-4444-4444-4444-444444444444','é caso judicial');
end $$;
insert into r select 't26 transferir troca o dono e deixa rastro',
  (select para_id='44444444-4444-4444-4444-444444444444' and motivo='é caso judicial'
     from zap_transferencias order by em desc limit 1);

-- ── sem ninguém marcado para atender ──────────────────────────────────────
update colaboradores set atende_zap=false;
delete from zap_conversas where chave=fone_chave('16911110000');
select _cliente_diz('16911110000','oi');
select _cliente_diz('16911110000','0');
insert into r select 't27 sem atendente marcado, a conversa fica na fila sem dono',
  (select atendente_id is null and not bot_ativo
     from zap_conversas where chave=fone_chave('16911110000'));
insert into r select 't28 e mesmo assim o cliente foi respondido',
  _ultima_do_bot('16911110000') like '%chamando alguém%';

-- ── da conversa para o processo: quem decide é gente ──────────────────────
insert into clientes (id, nome, telefone)
  values ('77777777-7777-7777-7777-777777777777','Antonio','16912345678')
  on conflict (id) do nothing;
insert into casos (id, cliente_id, titulo, fase)
  values ('88888888-8888-8888-8888-888888888888','77777777-7777-7777-7777-777777777777','Auxílio','inss')
  on conflict (id) do nothing;
do $$ declare v uuid; m uuid; a1 uuid; a2 uuid; begin
  v := zap_abrir('16912345678','Antonio');
  update zap_conversas set bot_ativo=false where id=v;
  insert into zap_mensagens (conversa_id, direcao, tipo, texto, midia_nome, quando_wa)
  values (v,'entrada','documento','segue o laudo do médico','laudo.pdf','2026-08-05 14:00:00-03')
  returning id into m;
  insert into r values ('t29 mensagem NÃO vira andamento sozinha',
    (select count(*)=0 from andamentos where caso_id='88888888-8888-8888-8888-888888888888'));
  a1 := zap_virar_andamento(m,'88888888-8888-8888-8888-888888888888',
                            '33333333-3333-3333-3333-333333333333');
  insert into r values ('t30 promovida à mão, entra no processo escolhido', a1 is not null);
  a2 := zap_virar_andamento(m,'88888888-8888-8888-8888-888888888888',
                            '33333333-3333-3333-3333-333333333333');
  insert into r values ('t31 promover duas vezes não duplica', a1 = a2);
end $$;
insert into r select 't32 o andamento diz que veio do cliente, e cita o anexo',
  (select texto like 'Cliente pelo WhatsApp (Antonio): segue o laudo%'
      and texto like '%📎 laudo.pdf%' and origem='whatsapp'
     from andamentos where caso_id='88888888-8888-8888-8888-888888888888' limit 1);
insert into r select 't33 e guarda a data da mensagem, não a de hoje',
  (select criado_em='2026-08-05 14:00:00-03'
     from andamentos where caso_id='88888888-8888-8888-8888-888888888888' limit 1);
insert into r select 't34 nasce privado: publicar no portal é outra decisão',
  (select not publico from andamentos where caso_id='88888888-8888-8888-8888-888888888888' limit 1);

-- devolver o expediente e a pausa ao normal: teste que deixa o bot aberto
-- 24 horas é uma armadilha esperando alguém rodar no banco errado
update config_app set valor='08:00'   where chave='zap_hora_inicio';
update config_app set valor='18:00'   where chave='zap_hora_fim';
update config_app set valor='1,2,3,4,5' where chave='zap_dias_uteis';
update config_app set valor='15'      where chave='zap_pausa_bot';
update colaboradores set atende_zap=false where inicial in ('X','Y','Z');
drop function if exists _cliente_diz(text,text);
drop function if exists _ultima_do_bot(text);
\set QUIET off
select k, case when v then 'ok' else 'FALHOU' end as resultado
  from r order by (substring(k from '^t(\d+)'))::int;
select count(*) filter (where not v or v is null) as falhas from r;
