-- Regressão da F348: o robô igual ao do SMBot, em paralelo ao robô do CRM.
-- ⚠ Este arquivo APAGA conversas: banco de teste só.
--   psql "postgres://…" -q -f crm/fase2/testes/zap_smbot.sql

\set QUIET on
delete from zap_mensagens; delete from zap_transferencias; delete from zap_conversas;
insert into config_app (chave, valor) values ('zap_bot_ligado','sim'), ('zap_pausa_bot','0'),
  ('zap_robo_modelo','smbot'),
  ('zap_hora_inicio','00:00'), ('zap_hora_fim','23:59'), ('zap_dias_uteis','1,2,3,4,5,6,7')
  on conflict (chave) do update set valor = excluded.valor;
create temp table r(k text, v boolean);
create temp table v(id uuid);
insert into v select zap_abrir('5516922220001', 'Fulano');
create temp view bot as select texto from zap_mensagens where por_bot and conversa_id = (select id from v);

insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'oi' from v;
insert into r select 's1 sem ficha, pede o nome em 4 balões',
  (select count(*) = 4 from bot) and (select bot_passo = 'smb:nome' from zap_conversas where id = (select id from v));

insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'Maria da Silva' from v;
insert into r select 's2 guarda o nome e manda o menu de 5 opções',
  (select nome_informado = 'Maria da Silva' and bot_passo = 'smb:inicio' from zap_conversas where id = (select id from v))
  and exists (select 1 from bot where texto like '%*5* - Outras dúvidas%');

insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'quero falar' from v;
insert into r select 's3 resposta sem número pede o número e repete o menu',
  exists (select 1 from bot where texto like '*Por favor, digite o número%')
  and (select bot_passo = 'smb:inicio' from zap_conversas where id = (select id from v));

insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', '2' from v;
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', '1' from v;
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', '1' from v;
insert into r select 's4 consulta rápida, Meu INSS',
  exists (select 1 from bot where texto like '%meu.inss.gov.br%')
  and (select bot_passo = 'smb:meuinss' from zap_conversas where id = (select id from v));

insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', '1' from v;
insert into r select 's5 digita 1: fila do Jurídico, sem atendente, robô calado',
  (select setor = 'Jurídico' and atendente_id is null and not bot_ativo and bot_passo = 'smb:fila'
     from zap_conversas where id = (select id from v));

-- cliente da ficha não recebe a pergunta do nome
delete from v; insert into v select zap_abrir('5516922220002', 'Beltrano');
update zap_conversas set cliente_id = (select id from clientes limit 1) where id = (select id from v);
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'bom dia' from v;
insert into r select 's6 cliente vai direto ao menu',
  (select bot_passo = 'smb:inicio' from zap_conversas where id = (select id from v));
insert into zap_mensagens (conversa_id, direcao, tipo, texto) select id, 'entrada', 'audio', '' from v;
insert into r select 's7 áudio não suportado', exists (select 1 from bot where texto = 'Mensagem de áudio não suportada.');
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', '4' from v;
insert into r select 's8 financeiro sem mensagem, fila do Financeiro',
  (select setor = 'Financeiro' and atendente_id is null from zap_conversas where id = (select id from v));

-- modelo do CRM: o robô de antes
update config_app set valor = 'crm' where chave = 'zap_robo_modelo';
delete from v; insert into v select zap_abrir('5516922220003', 'Cicrano');
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'oi' from v;
insert into r select 's9 com o modelo crm, vale o robô do CRM',
  (select bot_passo = 'inicio' from zap_conversas where id = (select id from v));

select k, case when v then 'ok' else 'FALHOU' end as resultado from r order by k;
select count(*) filter (where not v) as falhas from r;
