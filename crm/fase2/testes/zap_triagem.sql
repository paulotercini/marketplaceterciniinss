-- Regressão da triagem do texto livre por IA (F259). A IA só escolhe uma
-- opção do menu; o que importa aqui é que ela não invente destino, não mexa
-- na conversa que andou enquanto lia e que, sem resposta, o cliente não fique
-- sem atendimento. A Edge Function é simulada chamando as duas funções dela.
-- ⚠ Este arquivo APAGA conversas: banco de teste só.
--   psql "postgres://…" -q -f crm/fase2/testes/zap_triagem.sql

\set QUIET on
delete from zap_mensagens; delete from zap_transferencias; delete from zap_conversas;
insert into config_app (chave, valor) values ('zap_bot_ligado','sim'), ('zap_pausa_bot','0'), ('zap_robo_novo','nao'),
  ('zap_robo_ia','nao'), ('zap_triagem_url','https://exemplo.invalid/zap_triagem'),
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
create or replace function _conv(p_fone text) returns zap_conversas
language sql as $$ select * from zap_conversas where telefone = regexp_replace(p_fone,'\D','','g') $$;
create or replace function _ultima(p_fone text) returns text
language sql as $$
  select m.texto from zap_mensagens m join zap_conversas c on c.id = m.conversa_id
   where c.telefone = regexp_replace(p_fone,'\D','','g') and m.por_bot order by m.seq desc limit 1
$$;
create temp table ids(k text, id uuid);
\set QUIET off

-- ── desligada (o padrão), o texto livre segue como antes ──────────────────
select _diz('5516911110000','oi');
insert into ids select 'a', _diz('5516911110000','minha aposentadoria saiu?');
insert into r select 't1 desligada: nada é pedido à IA',
  (select bot_ia is null from zap_mensagens where id = (select id from ids where k='a'));
insert into r select 't2 desligada: o robô diz que não entendeu', _ultima('5516911110000') like 'Não entendi%';

-- ── ligada: a mensagem espera a IA, e o robô não responde por cima ────────
update config_app set valor = 'sim' where chave = 'zap_robo_ia';
select _diz('5516922220000','oi');
insert into ids select 'b', _diz('5516922220000','quero mandar o laudo do ortopedista');
-- "laudo" está nas palavras da opção 4: não precisa de IA
insert into r select 't3 palavra do menu dispensa a IA',
  (select bot_ia is null from zap_mensagens where id = (select id from ids where k='b'))
  and (_conv('5516922220000')).bot_passo = 'documentos';

select _diz('5516933330000','oi');
insert into ids select 'c', _diz('5516933330000','minha aposentadoria saiu?');
insert into r select 't4 texto livre fica pedido à IA, com o passo',
  (select bot_ia = 'pedida:inicio' from zap_mensagens where id = (select id from ids where k='c'));
insert into r select 't5 e o robô não responde enquanto ela lê', _ultima('5516933330000') not like 'Não entendi%';

-- a função pega uma vez só
insert into r select 't6 a função recebe o texto, o menu e as opções',
  (select x->>'texto' = 'minha aposentadoria saiu?' and x->>'passo' = 'inicio'
          and jsonb_array_length(x->'opcoes') > 1 from (select zap_triagem_pegar((select id from ids where k='c')) x) q);
insert into r select 't7 a segunda chamada não pega de novo', zap_triagem_pegar((select id from ids where k='c')) is null;

select zap_triagem_aplicar((select id from ids where k='c'), 'processo');
insert into r select 't8 a escolha da IA leva ao passo', (_conv('5516933330000')).bot_passo = 'processo';
insert into r select 't9 e fica a nota do que a IA entendeu',
  exists (select 1 from zap_mensagens m where m.conversa_id = (_conv('5516933330000')).id
            and m.direcao = 'interna' and m.texto like '%como a opção "processo"%');
insert into r select 't10 e a mensagem guarda a escolha',
  (select bot_ia = 'ia:processo' from zap_mensagens where id = (select id from ids where k='c'));

-- destino inventado não vale: vira "não entendi"
select _diz('5516944440000','oi');
insert into ids select 'd', _diz('5516944440000','bom dia, tudo bem?');
select zap_triagem_aplicar((select id from ids where k='d'), 'aposentar_ja');
insert into r select 't11 opção que o menu não tem é ignorada',
  (select bot_ia = 'ia:nenhuma' from zap_mensagens where id = (select id from ids where k='d'))
  and _ultima('5516944440000') like 'Não entendi%' and (_conv('5516944440000')).bot_passo = 'inicio';

-- a conversa andou enquanto a IA lia: não mexe
select _diz('5516955550000','oi');
insert into ids select 'e', _diz('5516955550000','preciso de ajuda com o INSS');
select _diz('5516955550000','2');
select zap_triagem_aplicar((select id from ids where k='e'), 'financeiro');
insert into r select 't12 mensagem mais nova vence a leitura atrasada', (_conv('5516955550000')).bot_passo = 'novo';

-- sem resposta da função em 60 s, segue o caminho de antes
select _diz('5516966660000','oi');
insert into ids select 'f', _diz('5516966660000','alguém pode me ligar?');
update zap_mensagens set criado_em = criado_em - interval '2 minutes' where id = (select id from ids where k='f');
insert into r select 't13 o relógio resolve a leitura que não voltou', zap_triagem_vencidas() >= 1;
insert into r select 't14 e o cliente recebe o "não entendi"', _ultima('5516966660000') like 'Não entendi%';

-- só a função (service_role) chama as duas portas
insert into r select 't15 o colaborador não chama a triagem',
  not has_function_privilege('authenticated', 'zap_triagem_aplicar(uuid, text)', 'execute')
  and not has_function_privilege('anon', 'zap_triagem_pegar(uuid)', 'execute');

update config_app set valor = 'nao' where chave = 'zap_robo_ia';
select k, case when v then 'ok' else 'FALHOU' end as resultado from r order by k;
select count(*) filter (where not v) as falhas from r;
