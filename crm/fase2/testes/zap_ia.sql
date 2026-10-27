-- Regressão da IA no WhatsApp, ondas 2 a 5 (F272): o filtro do robô de outra
-- empresa, o áudio que espera a transcrição, a agenda pelo robô e o relato do
-- caso novo fora do expediente. A Edge Function zap_agenda é simulada chamando
-- as funções dela (zap_agenda_pegar, _oferecer, _marcado).
-- ⚠ Este arquivo APAGA conversas, clientes e casos: banco de teste só.
--   psql "postgres://…" -q -f crm/fase2/testes/zap_ia.sql

\set QUIET on
delete from zap_mensagens; delete from zap_transferencias; delete from zap_conversas;
delete from mencoes; delete from atribuicoes; delete from andamentos;
delete from leads; delete from casos; delete from clientes;
delete from colaboradores where inicial in ('X','Y');
insert into colaboradores (id, nome, inicial, cor, papel, atende_zap, setor) values
  ('33333333-3333-3333-3333-333333333333','Amanda t','X','#c19c00','equipe',true,'inss'),
  ('44444444-4444-4444-4444-444444444444','Marcos t','Y','#0f7b6c','equipe',true,'triagem');
insert into clientes (id, nome, telefone) values
  ('11111111-1111-1111-1111-111111111111','Maria Cliente','16 99999-0000');
insert into config_app (chave, valor) values ('zap_bot_ligado','sim'), ('zap_pausa_bot','0'), ('zap_robo_novo','nao'),
  ('zap_robo_ia','nao'), ('zap_triagem_url','https://exemplo.invalid/zap_triagem'),
  ('zap_filtro_auto','nao'), ('zap_robo_agenda','nao'), ('zap_agenda_url',''), ('zap_robo_noturno','nao'),
  ('zap_hora_inicio','00:00'), ('zap_hora_fim','23:59'), ('zap_dias_uteis','1,2,3,4,5,6,7')
  on conflict (chave) do update set valor = excluded.valor;
create temp table r(k text, v boolean);

drop function if exists _diz(text, text);
create function _diz(p_fone text, p_txt text) returns uuid
language plpgsql as $$
declare v uuid; m uuid; begin
  v := zap_abrir(p_fone, 'Fulano');
  insert into zap_mensagens (conversa_id, direcao, texto) values (v, 'entrada', p_txt) returning id into m;
  return m;
end $$;
create or replace function _audio(p_fone text) returns uuid
language plpgsql as $$
declare v uuid; m uuid; begin
  v := zap_abrir(p_fone, 'Fulano');
  insert into zap_mensagens (conversa_id, direcao, tipo, texto) values (v, 'entrada', 'audio', null) returning id into m;
  return m;
end $$;
create or replace function _conv(p_fone text) returns zap_conversas
language sql as $$ select * from zap_conversas where telefone = regexp_replace(p_fone,'\D','','g') $$;
create or replace function _ultima(p_fone text) returns text
language sql as $$
  select m.texto from zap_mensagens m join zap_conversas c on c.id = m.conversa_id
   where c.telefone = regexp_replace(p_fone,'\D','','g') and m.por_bot order by m.seq desc limit 1
$$;
create or replace function _nota(p_fone text, p_txt text) returns boolean
language sql as $$
  select exists (select 1 from zap_mensagens m join zap_conversas c on c.id = m.conversa_id
   where c.telefone = regexp_replace(p_fone,'\D','','g') and m.direcao = 'interna' and m.texto like p_txt)
$$;
create or replace function _robo(p_fone text) returns bigint
language sql as $$
  select count(*) from zap_mensagens m join zap_conversas c on c.id = m.conversa_id
   where c.telefone = regexp_replace(p_fone,'\D','','g') and m.por_bot
$$;
create temp table ids(k text, id uuid);
create temp table ped(k text, x jsonb);
\set QUIET off

-- ══ Onda 2 · a mensagem automática de outra empresa ═══════════════════════
select _diz('5511900000001','Olá! Este canal é utilizado exclusivamente para envio de mensagens.');
insert into r select 'a1 desligado, o robô de outra empresa recebe o menu como antes',
  not (_conv('5511900000001')).automatica and _robo('5511900000001') = 1;

update config_app set valor = 'sim' where chave = 'zap_filtro_auto';
select _diz('5511900000002','Olá! Sou a assistente virtual do Banco X. Digite o número da opção desejada.');
insert into r select 'a2 ligado, a conversa sai da fila e o robô não responde',
  (_conv('5511900000002')).automatica and (_conv('5511900000002')).status = 'resolvida'
  and _robo('5511900000002') = 0;
insert into r select 'a3 e fica a nota com o caminho para desfazer', _nota('5511900000002', '%Não é automática%');
select _diz('5511900000002','Opção inválida. Selecione uma das opções abaixo.');
insert into r select 'a4 as seguintes também ficam fora da fila, sem não lidas',
  (_conv('5511900000002')).status = 'resolvida' and (_conv('5511900000002')).nao_lidas = 0
  and _robo('5511900000002') = 0;
insert into r select 'a5 só uma nota, não uma por mensagem',
  (select count(*) from zap_mensagens where conversa_id = (_conv('5511900000002')).id and direcao = 'interna') = 1;
select _diz('5516999990000','esta é uma mensagem automática do meu celular');
insert into r select 'a6 cliente da ficha nunca é filtrado', not (_conv('5516999990000')).automatica;
insert into r select 'a7 texto de gente não é automático',
  not zap_eh_automatica('Bom dia, quero saber se minha aposentadoria saiu')
  and not zap_eh_automatica('pode me ligar? digitei errado o número');
delete from zap_mensagens where conversa_id = (_conv('5516999990000')).id;
delete from zap_conversas where id = (_conv('5516999990000')).id;

-- ══ Onda 2 · o áudio espera a transcrição ═════════════════════════════════
update config_app set valor = 'sim' where chave = 'zap_robo_ia';
select _diz('5516911110001','oi');
insert into ids select 'au1', _audio('5516911110001');
insert into r select 'b1 áudio sem texto no menu fica esperando a transcrição',
  (select bot_ia = 'audio:inicio' from zap_mensagens where id = (select id from ids where k='au1'))
  and _ultima('5516911110001') not like 'Não entendi%';
update zap_mensagens set texto = 'quero saber como está o meu processo' where id = (select id from ids where k='au1');
insert into r select 'b2 a transcrição chega e o robô segue a opção dita',
  (_conv('5516911110001')).bot_passo = 'processo'
  and (select bot_ia is null from zap_mensagens where id = (select id from ids where k='au1'));

select _diz('5516911110002','oi');
insert into ids select 'au2', _audio('5516911110002');
update zap_mensagens set criado_em = criado_em - interval '11 minutes' where id = (select id from ids where k='au2');
insert into r select 'b3 sem transcrição em 10 minutos, o relógio resolve', zap_triagem_vencidas() >= 1;
insert into r select 'b4 e o cliente recebe o "não entendi"', _ultima('5516911110002') like 'Não entendi%';
update zap_mensagens set texto = 'meu processo' where id = (select id from ids where k='au2');
insert into r select 'b5 transcrição atrasada não mexe de novo', (_conv('5516911110002')).bot_passo = 'inicio';

select _diz('5516911110003','oi');
insert into ids select 'au3', _audio('5516911110003');
select _diz('5516911110003','2');
update zap_mensagens set texto = 'meu processo' where id = (select id from ids where k='au3');
insert into r select 'b6 mensagem mais nova vence o áudio transcrito depois', (_conv('5516911110003')).bot_passo = 'novo';
update config_app set valor = 'nao' where chave = 'zap_robo_ia';
select _diz('5516911110004','oi');
insert into ids select 'au4', _audio('5516911110004');
insert into r select 'b7 com a IA desligada, o áudio segue como antes',
  (select bot_ia is null from zap_mensagens where id = (select id from ids where k='au4'))
  and _ultima('5516911110004') like 'Não entendi%';

-- ══ Onda 4 · a agenda pelo robô ═══════════════════════════════════════════
select _diz('5516922220001','oi');
insert into r select 'c1 agenda desligada, o menu não oferece a opção 6', _ultima('5516922220001') not like '%*6*%';
select _diz('5516922220001','6');
insert into r select 'c2 e quem pede horário vai para uma pessoa', (_conv('5516922220001')).bot_passo = 'humano';

update config_app set valor = 'sim' where chave = 'zap_robo_agenda';
update config_app set valor = 'https://exemplo.invalid/zap_agenda' where chave = 'zap_agenda_url';
select _diz('5516922220002','oi');
insert into r select 'c3 ligada, o menu mostra a opção 6', _ultima('5516922220002') like '%*6* — Agendar%';
select _diz('5516922220002','quero marcar um horário');
insert into r select 'c4 quem não é cliente informa o nome completo',
  (_conv('5516922220002')).bot_passo = 'agendar_nome' and _ultima('5516922220002') like '%nome completo%';
select _diz('5516922220002','João');
insert into r select 'c5 nome sem sobrenome não vale', _ultima('5516922220002') like 'Não entendi%'
  and (_conv('5516922220002')).bot_passo = 'agendar_nome';
select _diz('5516922220002','joão da silva');
insert into r select 'c6 com o nome, o robô pede as vagas à agenda',
  (_conv('5516922220002')).bot_passo = 'agendar' and (_conv('5516922220002')).bot_dados ? 'pedido'
  and (_conv('5516922220002')).bot_dados->>'nome' = 'João Da Silva';
select _robo('5516922220002') as antes \gset
select _diz('5516922220002','alô?');
insert into r select 'c7 enquanto a agenda responde, o robô não fala por cima', _robo('5516922220002') = :antes;

insert into r select 'c8 pedido errado não abre a conversa',
  zap_agenda_pegar((_conv('5516922220002')).id, 'outro') is null;
insert into ped select 'p1', zap_agenda_pegar((_conv('5516922220002')).id, (_conv('5516922220002')).bot_dados->>'pedido');
insert into r select 'c9 a função lê o pedido com o nome e os profissionais',
  (select x->>'acao' = 'oferecer' and x->>'nome' = 'João Da Silva' and x->>'cliente_id' is null
          and x->>'profissionais' = 'marcos,amanda' from ped where k='p1');
insert into r select 'c10 e o pedido é de uso único',
  not (_conv('5516922220002')).bot_dados ? 'pedido' and (_conv('5516922220002')).bot_dados ? 'pedido_em';

select zap_agenda_oferecer((_conv('5516922220002')).id, '001',
  '[{"rotulo":"segunda, 27/10, às 9h00, com Marcos","profissional":"marcos","data":"2026-10-27","inicio":"09:00","eventoId":"e1"},
    {"rotulo":"segunda, 27/10, às 10h00, com Amanda","profissional":"amanda","data":"2026-10-27","inicio":"10:00","eventoId":"e2"}]');
insert into r select 'c11 as vagas viram lista numerada com o 0',
  (_conv('5516922220002')).bot_passo = 'agendar_escolha'
  and _ultima('5516922220002') like '%*1* — segunda, 27/10, às 9h00, com Marcos%*2*%*0* — nenhum%';
select _diz('5516922220002','7');
insert into r select 'c12 número fora da lista repete as opções', _ultima('5516922220002') like 'Não entendi%'
  and (_conv('5516922220002')).bot_passo = 'agendar_escolha';
select _diz('5516922220002','2');
insert into ped select 'p2', zap_agenda_pegar((_conv('5516922220002')).id, (_conv('5516922220002')).bot_dados->>'pedido');
insert into r select 'c13 a escolha vai à função com a vaga',
  (select x->>'acao' = 'marcar' and (x->>'escolha')::int = 2 and x->'vagas'->1->>'eventoId' = 'e2'
          and x->>'tipo' = '001' from ped where k='p2');
select zap_agenda_marcado((_conv('5516922220002')).id, 'segunda, 27/10, às 10h00, com Amanda');
insert into r select 'c14 marcado, o cliente recebe a confirmação com as orientações',
  _ultima('5516922220002') like 'Pronto!%10h00%Meu INSS%individual%'
  and (_conv('5516922220002')).bot_passo is null and _nota('5516922220002', '%robô marcou%');
insert into r select 'c15 e nada do pedido fica guardado',
  not ((_conv('5516922220002')).bot_dados ?| array['pedido','pedido_em','vagas','escolha']);

select _diz('5516999990000','oi');
select _diz('5516999990000','6');
insert into ped select 'p3', zap_agenda_pegar((_conv('5516999990000')).id, (_conv('5516999990000')).bot_dados->>'pedido');
insert into r select 'c16 a cliente da ficha agenda sem informar o nome',
  (select x->>'cliente_id' = '11111111-1111-1111-1111-111111111111' and x->>'nome' = 'Maria Cliente' from ped where k='p3');
select zap_agenda_oferecer((_conv('5516999990000')).id, '002', '[]');
insert into r select 'c17 sem vaga, o cliente é avisado e vai para uma pessoa',
  _ultima('5516999990000') like 'Não consegui ver os horários%'
  and (_conv('5516999990000')).bot_passo = 'humano' and not (_conv('5516999990000')).bot_ativo;
select zap_agenda_oferecer((_conv('5516999990000')).id, '002', '[{"rotulo":"x"}]');
insert into r select 'c18 resposta atrasada não volta a oferecer', (_conv('5516999990000')).bot_passo = 'humano';

select _diz('5516922220003','oi');
select _diz('5516922220003','Ana Souza Lima');
select _diz('5516922220003','6');
select _diz('5516922220003','Ana Souza Lima');
update zap_conversas set bot_dados = jsonb_set(bot_dados, '{pedido_em}', to_jsonb(now() - interval '3 minutes'))
 where id = (_conv('5516922220003')).id;
select zap_triagem_vencidas();
insert into r select 'c19 a agenda que não responde em 2 minutos: a conversa vai para uma pessoa',
  (_conv('5516922220003')).bot_passo = 'humano' and _nota('5516922220003', '%agenda não respondeu%');

-- ══ Onda 5 · o relato do caso novo fora do expediente ═════════════════════
update config_app set valor = 'nao' where chave = 'zap_robo_agenda';
update config_app set valor = '8' where chave = 'zap_dias_uteis';
select _diz('5516933330001','oi');
select _diz('5516933330001','2');
insert into r select 'd1 desligado, o caso novo fora do expediente vai para a fila como antes',
  (_conv('5516933330001')).bot_passo = 'novo';

update config_app set valor = 'sim' where chave = 'zap_robo_noturno';
select _diz('5516933330002','oi');
select _diz('5516933330002','2');
insert into r select 'd2 ligado, o robô pede o relato', (_conv('5516933330002')).bot_passo = 'novo_relato'
  and _ultima('5516933330002') like '%Conte em poucas palavras%';
select _diz('5516933330002','Fui demitido e tenho problema na coluna, o INSS negou o auxílio.');
insert into r select 'd3 o relato vira nota da equipe e a conversa vai para a triagem',
  _nota('5516933330002', 'Relato do caso novo%coluna%') and (_conv('5516933330002')).bot_passo = 'novo_relato_fim'
  and not (_conv('5516933330002')).bot_ativo;

update config_app set valor = 'sim' where chave = 'zap_robo_ia';
select _diz('5516933330003','oi');
select _diz('5516933330003','2');
insert into ids select 'au5', _audio('5516933330003');
insert into r select 'd4 relato por áudio espera a transcrição',
  (select bot_ia = 'audio:novo_relato' from zap_mensagens where id = (select id from ids where k='au5'));
update zap_mensagens set texto = 'minha mãe faleceu e quero a pensão' where id = (select id from ids where k='au5');
insert into r select 'd5 e a transcrição vira o relato', _nota('5516933330003', 'Relato do caso novo%pensão%');

update config_app set valor = 'sim' where chave = 'zap_robo_agenda';
update config_app set valor = 'https://exemplo.invalid/zap_agenda' where chave = 'zap_agenda_url';
select _diz('5516933330004','oi');
select _diz('5516933330004','2');
select _diz('5516933330004','quero me aposentar por idade');
insert into r select 'd6 com a agenda ligada, depois do relato o robô oferece o horário',
  (_conv('5516933330004')).bot_passo = 'agendar_nome'
  and (_conv('5516933330004')).bot_dados->>'relato' = 'quero me aposentar por idade';

-- ══ as portas da Edge Function ═══════════════════════════════════════════
insert into r select 'e1 o colaborador não chama as portas da agenda',
  not has_function_privilege('authenticated', 'zap_agenda_pegar(uuid, text)', 'execute')
  and not has_function_privilege('anon', 'zap_agenda_marcado(uuid, text)', 'execute')
  and not has_function_privilege('authenticated', 'zap_agenda_chamar(uuid, text, jsonb)', 'execute');

update config_app set valor = 'nao' where chave in ('zap_filtro_auto','zap_robo_ia','zap_robo_agenda','zap_robo_noturno');
update config_app set valor = '' where chave = 'zap_agenda_url';
update config_app set valor = '1,2,3,4,5,6,7' where chave = 'zap_dias_uteis';
select k, case when v then 'ok' else 'FALHOU' end as resultado from r order by k;
select count(*) filter (where not v) as falhas from r;
drop function _diz(text, text);
