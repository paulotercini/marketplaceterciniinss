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

-- F819 · o titular escreveu há 2 minutos: a conversa segue com ele, sem aviso (antes a F679 abria o repasse)
delete from v; insert into v select zap_abrir('5500000000012', 'Cliente Teste');
update zap_conversas set atendente_id = '33333333-3333-3333-3333-333333333333' where id = (select id from v);
insert into zap_mensagens (conversa_id, direcao, texto, autor_id, criado_em)
  select id, 'saida', 'Já verifico.', '33333333-3333-3333-3333-333333333333', now() - interval '2 minutes' from v;
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'preciso de ajuda' from v;
insert into r select 'f6 titular escreveu: sem aviso',
  not exists (select 1 from zap_mensagens where por_bot and conversa_id = (select id from v));

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

-- F819 · a substituta escreveu há 20 horas, depois do início das férias: sem aviso
update colaboradores set zap_offline_desde = now() - interval '2 days' where inicial = 'X';
delete from v; insert into v select zap_abrir('5500000000016', 'Cliente Teste');
update zap_conversas set atendente_id = '33333333-3333-3333-3333-333333333333' where id = (select id from v);
insert into zap_mensagens (conversa_id, direcao, texto, autor_id, criado_em)
  select id, 'saida', 'Recebi.', '55555555-5555-5555-5555-555555555555', now() - interval '20 hours' from v;
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'e agora, como fica?' from v;
insert into r select 'f13 substituta escreveu nas férias: sem aviso',
  not exists (select 1 from zap_mensagens where por_bot and conversa_id = (select id from v));

-- F819 · a IA agendou há 1 hora: sem aviso
delete from v; insert into v select zap_abrir('5500000000017', 'Cliente Teste');
update zap_conversas set atendente_id = '33333333-3333-3333-3333-333333333333' where id = (select id from v);
insert into zap_mensagens (conversa_id, direcao, por_bot, texto, criado_em)
  select id, 'saida', true, 'O seu atendimento está agendado para 26/11, 14h.', now() - interval '1 hour' from v;
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'vou levar a carteira de trabalho' from v;
insert into r select 'f14 logo depois do agendamento: sem aviso',
  not exists (select 1 from zap_mensagens where por_bot and conversa_id = (select id from v) and texto like '%férias%');

-- F819 · agradecimentos
insert into r select 'f15 agradecimentos; "Bom dia" sozinho abre conversa', zap_despedida('texto', 'Ok gratidão Bom dia')
  and not zap_despedida('texto', 'Bom dia') and not zap_despedida('texto', 'boa tarde doutora') and zap_despedida('texto', 'valeu') and zap_conf_agradece('texto', 'Ok gratidão Bom dia') and zap_conf_agradece('texto', 'Grato!')
  and zap_conf_agradece('texto', '👍') and zap_conf_agradece('texto', 'Agradeço a atenção') and zap_conf_agradece('texto', 'Obrigadão')
  and not zap_conf_agradece('texto', 'ok, mas quero remarcar') and not zap_conf_agradece('texto', 'obrigada, e o processo?');

-- F819 · conta automática: texto de robô, ou resposta em 5 s a mensagem automática nossa; sem aviso
delete from v; insert into v select zap_abrir('5500000000018', 'Cliente Teste');
update zap_conversas set atendente_id = '33333333-3333-3333-3333-333333333333' where id = (select id from v);
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'Esta é uma mensagem automática. Sua fatura vence amanhã.' from v;
insert into r select 'f16 robô por texto: marcado e sem aviso',
  (select automatica from zap_conversas where id = (select id from v))
  and not exists (select 1 from zap_mensagens where por_bot and conversa_id = (select id from v));
delete from v; insert into v select zap_abrir('5500000000019', 'Cliente Teste');
insert into zap_mensagens (conversa_id, direcao, por_bot, texto, criado_em) select id, 'saida', true, 'Olá!', now() - interval '2 seconds' from v;
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'Olá! Confira as ofertas da semana no nosso site agora' from v;
insert into r select 'f17a uma resposta em 2 s: ainda não', not (select automatica from zap_conversas where id = (select id from v));
insert into zap_mensagens (conversa_id, direcao, por_bot, texto, criado_em) select id, 'saida', true, 'Em que posso ajudar?', now() - interval '1 second' from v;
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'Olá! Confira as ofertas da semana no nosso site agora' from v;
insert into r select 'f17 robô que responde duas vezes em 2 s: marcado', (select automatica from zap_conversas where id = (select id from v));
delete from v; insert into v select zap_abrir('5500000000020', 'Cliente Teste');
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'Bom dia, gostaria de saber do meu processo' from v;
insert into r select 'f18 pessoa: não marcada', not (select automatica from zap_conversas where id = (select id from v));

-- F819 · amparo uma vez por dia; encaminhamento ao advogado em férias vai à substituta
insert into r select 'f19 amparo uma vez por dia', position('F819' in pg_get_functiondef('public.zap_amparo_vez'::regproc)) > 0;
insert into r select 'f20 plantão: férias vão à substituta',
  position('zap_cobre_id' in pg_get_functiondef('public.zap_plantao_aplicar(uuid,text,text,text,boolean,text,text,text)'::regprocedure)) > 0;

-- retorno automático
update colaboradores set zap_ferias_ate = now() - interval '1 minute' where inicial = 'X';
select zap_ferias_fim();
insert into r select 'f7 retorno: Online e sem férias', (select zap_offline_desde is null and zap_ferias_ate is null
  from colaboradores where inicial = 'X');
insert into r select 'f8 retorno: coberturas encerradas',
  not exists (select 1 from zap_conversas where cobertura->>'titular' = '33333333-3333-3333-3333-333333333333');

-- F819 · Offline comum (sem férias): "Ok" sem aviso; o aviso sai sem o nome no cabeçalho
update colaboradores set zap_offline_desde = now() - interval '1 hour', zap_offline_msg = '*Titular t:* Estou fora.' where inicial = 'X';
delete from v; insert into v select zap_abrir('5500000000021', 'Cliente Teste');
update zap_conversas set atendente_id = '33333333-3333-3333-3333-333333333333' where id = (select id from v);
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'Ok' from v;
insert into r select 'f21 Offline: "Ok" sem aviso', not exists (select 1 from zap_mensagens where por_bot and conversa_id = (select id from v));
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'preciso de um documento' from v;
insert into r select 'f22 Offline: aviso sem cabeçalho',
  (select texto = 'Estou fora.' from zap_mensagens where por_bot and conversa_id = (select id from v));

-- F822 · "A IA não responde esta conversa" cala também o aviso do Offline
delete from v; insert into v select zap_abrir('5500000000022', 'Cliente Teste');
update zap_conversas set atendente_id = '33333333-3333-3333-3333-333333333333', sem_ia = true where id = (select id from v);
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'preciso de um documento' from v;
insert into r select 'f23 Offline com a IA calada: sem aviso', not exists (select 1 from zap_mensagens where por_bot and conversa_id = (select id from v));

select k, case when v then 'ok' else 'FALHOU' end from r;
