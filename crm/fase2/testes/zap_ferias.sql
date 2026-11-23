-- Regressão da F679 (modo férias no WhatsApp).
-- ⚠ Este arquivo APAGA conversas: banco de teste só.
--   psql "postgres://…" -q -f crm/fase2/testes/zap_ferias.sql

\set QUIET on
delete from mencoes; delete from zap_mensagens; delete from zap_transferencias; delete from zap_conversas;
delete from colaboradores where inicial in ('X', 'Y');
insert into colaboradores (id, nome, inicial, cor, papel, atende_zap, setor, auth_id, ativo) values
  ('33333333-3333-3333-3333-333333333333','Titular t','X','#c19c00','equipe',true,'inss','44444444-4444-4444-4444-444444444444',true),
  ('55555555-5555-5555-5555-555555555555','Substituta t','Y','#c19c00','equipe',true,'inss','66666666-6666-6666-6666-666666666666',true);
update colaboradores set zap_cobre_id = '55555555-5555-5555-5555-555555555555' where inicial = 'X';
insert into config_app (chave, valor) values ('zap_bot_ligado','nao'), ('zap_ia_plantao','nao'),
  ('zap_cobertura','sim'), ('zap_offline_min','15'), ('zap_conf_ligado','nao')
  on conflict (chave) do update set valor = excluded.valor;
create temp table r(k text, v boolean);
create temp table v(id uuid);

-- titular entra em férias pelo RPC, com {fim} na mensagem
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
select zap_minhas_ferias(now() + interval '10 days', 'Em férias até {fim}.');
insert into r select 'f1 férias gravadas', (select zap_offline_desde is not null and zap_ferias_ate is not null
  from colaboradores where inicial = 'X');

-- primeira mensagem: aviso com a data e cobertura já aberta
insert into v select zap_abrir('5500000000011', 'Cliente Teste');
update zap_conversas set atendente_id = '33333333-3333-3333-3333-333333333333' where id = (select id from v);
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'preciso falar do processo' from v;
insert into r select 'f2 aviso com a data de retorno',
  exists (select 1 from zap_mensagens where por_bot and conversa_id = (select id from v)
           and texto like '%Em férias até ' || to_char((now() + interval '10 days') at time zone 'America/Sao_Paulo', 'DD/MM') || '.%');
insert into r select 'f3 cobertura aberta na primeira mensagem',
  (select cobertura->>'cobre' = '55555555-5555-5555-5555-555555555555' from zap_conversas where id = (select id from v));
insert into r select 'f4 menção à substituta', exists (select 1 from mencoes where para_id = '55555555-5555-5555-5555-555555555555');

-- segunda mensagem: sem novo aviso
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'alguém?' from v;
insert into r select 'f5 uma mensagem automática só',
  (select count(*) = 1 from zap_mensagens where por_bot and conversa_id = (select id from v));

-- o titular escreveu há 2 minutos: nas férias o repasse continua em outra conversa
delete from v; insert into v select zap_abrir('5500000000012', 'Cliente Teste');
update zap_conversas set atendente_id = '33333333-3333-3333-3333-333333333333' where id = (select id from v);
insert into zap_mensagens (conversa_id, direcao, texto, autor_id, criado_em)
  select id, 'saida', 'Já verifico.', '33333333-3333-3333-3333-333333333333', now() - interval '2 minutes' from v;
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'preciso de ajuda' from v;
insert into r select 'f6 mensagem do titular não interrompe o repasse',
  (select cobertura is not null from zap_conversas where id = (select id from v));

-- conversa sem cobertura: nem aviso nem repasse
delete from v; insert into v select zap_abrir('5500000000013', 'Cliente Teste');
update zap_conversas set atendente_id = '33333333-3333-3333-3333-333333333333', sem_cobertura = true where id = (select id from v);
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'oi, tudo certo para sábado?' from v;
insert into r select 'f9 sem cobertura: sem aviso e sem repasse',
  not exists (select 1 from zap_mensagens where por_bot and conversa_id = (select id from v))
  and (select cobertura is null from zap_conversas where id = (select id from v));

-- F683 · o aviso sai sem o cabeçalho do titular, e o simples agradecimento não o recebe
update colaboradores set assinatura_zap = 'Titular t' where inicial = 'X';
delete from v; insert into v select zap_abrir('5500000000014', 'Cliente Teste');
update zap_conversas set atendente_id = '33333333-3333-3333-3333-333333333333' where id = (select id from v);
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'Obrigada!' from v;
insert into r select 'f10 agradecimento: sem aviso',
  not exists (select 1 from zap_mensagens where por_bot and conversa_id = (select id from v));
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'tenho uma dúvida do processo' from v;
insert into r select 'f11 aviso sem o cabeçalho do titular',
  exists (select 1 from zap_mensagens where por_bot and conversa_id = (select id from v) and texto not like '*%');

-- F688 · outro colaborador atendeu há 4 minutos: sem aviso
delete from v; insert into v select zap_abrir('5500000000015', 'Cliente Teste');
update zap_conversas set atendente_id = '33333333-3333-3333-3333-333333333333' where id = (select id from v);
insert into zap_mensagens (conversa_id, direcao, texto, autor_id, criado_em)
  select id, 'saida', 'Pode trazer os documentos.', '55555555-5555-5555-5555-555555555555', now() - interval '4 minutes' from v;
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'Amanhã depois do meio dia então' from v;
insert into r select 'f12 colega atendendo: sem aviso',
  not exists (select 1 from zap_mensagens where por_bot and conversa_id = (select id from v));

-- retorno automático
update colaboradores set zap_ferias_ate = now() - interval '1 minute' where inicial = 'X';
select zap_ferias_fim();
insert into r select 'f7 retorno: Online e sem férias', (select zap_offline_desde is null and zap_ferias_ate is null
  from colaboradores where inicial = 'X');
insert into r select 'f8 retorno: coberturas encerradas',
  not exists (select 1 from zap_conversas where cobertura->>'titular' = '33333333-3333-3333-3333-333333333333');

select k, case when v then 'ok' else 'FALHOU' end from r;
