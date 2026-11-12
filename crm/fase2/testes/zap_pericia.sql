-- F549 · aviso da perícia ao cliente, com aprovação por perícia. Roda na cópia do banco de base (schema e migrações).
--   psql -d <cópia> -f crm/fase2/testes/zap_pericia.sql
-- Cada prova diz ok ou FALHOU. Nos fins de semana e feriados a rodada não envia, e as provas da rodada são puladas.
\set QUIET on
set client_min_messages = warning;
create temp table _r(n serial, prova text, ok bool);
create function pg_temp.ok(p text, c bool) returns void language sql as $$ insert into _r(prova, ok) values (p, coalesce(c, false)) $$;

-- a base pode já ter o Paulo (inicial P): usa a ficha dele
insert into colaboradores (id, inicial, nome, ativo, cargo)
select '00000000-0000-0000-0000-0000000000a1', 'P', 'Paulo', true, 'advogado'
 where not exists (select 1 from colaboradores where inicial = 'P');
update colaboradores set auth_id = '00000000-0000-0000-0000-0000000000f1', ativo = true where inicial = 'P';
insert into colaboradores (id, inicial, nome, ativo, cargo) values
  ('00000000-0000-0000-0000-0000000000a2', 'Ç', 'Recepção Teste', true, 'recepcao');
insert into clientes (id, nome, telefone) values ('00000000-0000-0000-0000-0000000000c1', 'Cliente Teste', '5500000000001');
insert into casos (id, cliente_id, titulo) values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'B31');
insert into zap_conversas (id, telefone, cliente_id, ultima_em) values
  ('00000000-0000-0000-0000-0000000000e1', '5500000000001', '00000000-0000-0000-0000-0000000000c1', now());
-- a perícia daqui a cerca de 20 dias úteis, às 14h
insert into eventos (id, caso_id, tipo, data_hora, local, status)
select '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'Perícia',
       ((current_date + 30)::timestamp + time '14:00') at time zone 'America/Sao_Paulo', 'APS Teste', 'agendada';

create function pg_temp.msgs(sufixo text) returns int language sql as $$
  select count(*)::int from zap_mensagens where aviso_chave like 'pericia:00000000-0000-0000-0000-0000000000b1:%' || sufixo $$;

-- 1. sem o Ligar nada sai
select pg_temp.ok('sem Ligar não envia', pericia_avisos_vez('tarde') = 0 and pg_temp.msgs('') = 0);

-- 2. o Ligar aprova a data registrada
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', false);
select pericia_ligar('00000000-0000-0000-0000-0000000000b1', true, 'amanda');
select pg_temp.ok('Ligar grava a data aprovada',
  (select ligado and data_aprovada = (select data_hora from eventos where id = evento_id) and estado = 'ligado'
     from pericia_avisos where evento_id = '00000000-0000-0000-0000-0000000000b1'));
select pg_temp.ok('Ligar guarda a profissional', (select profissional from pericia_avisos) = 'amanda');

do $$ begin
  if not pericia_util((now() at time zone 'America/Sao_Paulo')::date) then
    perform pg_temp.ok('(dia sem expediente: rodada pulada)', true); return;
  end if;
  -- 3. 1º aviso na rodada, uma vez só
  perform pericia_avisos_vez('tarde');
  perform pericia_avisos_vez('tarde');
  perform pg_temp.ok('1º aviso sai uma vez', pg_temp.msgs(':primeiro') = 1);
  perform pg_temp.ok('1º aviso cita a Dra. Amanda e o local',
    (select texto like '%a Dra. Amanda%' and texto like '%APS Teste%' and texto like 'Boa tarde, Cliente.%'
       and texto not like '%INSS agendou%' and texto not like '%Aqui é do escritório%' and texto like '%Qual horário fica melhor?%'
       from zap_mensagens where aviso_chave like '%:primeiro'));
  perform pg_temp.ok('conversa marcada aguardando',
    (select pericia->>'estado' from zap_conversas where id = '00000000-0000-0000-0000-0000000000e1') = 'aguardando');
  -- 4. sem resposta: repete na manhã do dia útil seguinte, e não à tarde
  update pericia_avisos set primeiro_em = now() - interval '1 day';
  perform pericia_avisos_vez('tarde');
  perform pg_temp.ok('a tarde não repete', pg_temp.msgs(':repete') = 0);
  perform pericia_avisos_vez('manha');
  perform pg_temp.ok('repete de manhã com o aviso de falta de resposta',
    (select texto like '%Ainda não recebemos a sua resposta.%' from zap_mensagens where aviso_chave like '%:repete'));
  -- 5. sem resposta à repetição: menção à recepção
  update pericia_avisos set repetido_em = now() - interval '1 day';
  perform pericia_avisos_vez('manha');
  perform pg_temp.ok('recepção recebe a menção para telefonar',
    exists (select 1 from mencoes where para_id = '00000000-0000-0000-0000-0000000000a2' and texto like '%telefonar%'));
  perform pg_temp.ok('estado sem_resposta', (select estado from pericia_avisos) = 'sem_resposta');
  -- 6. D-1 lista os documentos
  update pericia_avisos set respondeu_em = now() - interval '1 day';
  update eventos set data_hora = (pericia_util_depois((now() at time zone 'America/Sao_Paulo')::date)::timestamp + time '14:00')
                                 at time zone 'America/Sao_Paulo';
  perform pericia_avisos_vez('manha');
  perform pg_temp.ok('data mudada derruba a aprovação', (select estado from pericia_avisos) = 'data_mudou' and pg_temp.msgs(':d1') = 0);
  update pericia_avisos set data_aprovada = (select data_hora from eventos where id = evento_id);
  perform pericia_avisos_vez('manha');
  perform pg_temp.ok('D-1 sai com os documentos e os 30 minutos',
    (select texto like '%Leve: documento com foto%' and texto like '%30 minutos%' from zap_mensagens where aviso_chave like '%:d1'));
end $$;

-- 7. a resposta não vai à IA com a Agenda da IA desligada
insert into zap_mensagens (id, conversa_id, direcao, texto) values
  ('00000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-0000000000e1', 'entrada', 'Pode ser');
update zap_conversas set pericia = jsonb_build_object('evento', '00000000-0000-0000-0000-0000000000b1', 'estado', 'aguardando',
  'profissional', 'paulo', 'data', current_date + 30) where id = '00000000-0000-0000-0000-0000000000e1';
select pg_temp.ok('IA desligada: resposta segue o caminho comum', not pericia_resposta('00000000-0000-0000-0000-000000000099'));

-- 8. o contexto para a IA
update eventos set data_hora = ((current_date + 30)::timestamp + time '14:00') at time zone 'America/Sao_Paulo';
select pg_temp.ok('contexto: até 3 h antes e telefonema fora da quarta',
  (select x->>'ate_hora' = '11:00' and extract(isodow from to_date(x->>'telefone_em', 'DD/MM/YYYY')) <> 3
     from (select pericia_contexto('00000000-0000-0000-0000-0000000000e1') x) y));

-- 9. o atendimento agendado vira andamento e tarefa do Dr. Paulo no dia útil anterior
select pericia_atendimento_marcado('00000000-0000-0000-0000-0000000000e1', (current_date + 29)::text, '10:30');
select pg_temp.ok('tarefa "Preparar o estudo" ao Dr. Paulo',
  exists (select 1 from andamento_tarefas t join andamentos a on a.id = t.andamento_id
           where t.colaborador_id = (select id from colaboradores where inicial = 'P') and a.texto like '%Preparar o estudo sobre a perícia%'
             and t.lembrar_em = pericia_util_antes(current_date + 29, 1)));
select pg_temp.ok('estado agendado', (select estado from pericia_avisos) = 'agendado');

-- 10. 16:30 da perícia: Compareceu?
do $$ begin
  if not pericia_util((now() at time zone 'America/Sao_Paulo')::date) then return; end if;
  update eventos set data_hora = now();
  perform pericia_compareceu_vez();
  perform pericia_compareceu_vez();
  perform pg_temp.ok('Compareceu? uma vez ao advogado',
    (select count(*) from mencoes where texto like '🩺 Compareceu?%' and para_id = (select id from colaboradores where inicial = 'P')) = 1);
end $$;

-- 11. o Desligar limpa a conversa
select pericia_ligar('00000000-0000-0000-0000-0000000000b1', false);
select pg_temp.ok('Desligar limpa a conversa',
  (select pericia from zap_conversas where id = '00000000-0000-0000-0000-0000000000e1') is null);
-- 12. F562: cliente já orientado recebe apenas os lembretes, sem o 1º aviso
insert into eventos (id, caso_id, tipo, data_hora, local, status)
select '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000d1', 'Perícia',
       ((current_date + 40)::timestamp + time '14:00') at time zone 'America/Sao_Paulo', 'Fórum Teste', 'agendada';
select pericia_so_lembretes('00000000-0000-0000-0000-0000000000b2', true);
select pericia_ligar('00000000-0000-0000-0000-0000000000b2', true, 'paulo');
select pericia_avisos_vez('tarde');
select pg_temp.ok('Já orientado: sem 1º aviso',
  (select so_lembretes from pericia_avisos where evento_id = '00000000-0000-0000-0000-0000000000b2')
  and not exists (select 1 from zap_mensagens where aviso_chave like 'pericia:00000000-0000-0000-0000-0000000000b2:primeiro'));
select pg_temp.ok('anon não executa a rodada', not has_function_privilege('anon', 'pericia_avisos_vez(text)', 'execute'));

\set QUIET off
select n, case when ok then 'ok' else 'FALHOU' end, prova from _r order by n;
select count(*) filter (where not ok) as falhas from _r;
