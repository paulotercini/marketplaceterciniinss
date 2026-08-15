-- Regressão da porta de entrada do SMBot (WhatsApp).
-- ⚠ Este arquivo APAGA clientes, casos, leads e conversas: só rode num banco
--   de teste com o schema.sql aplicado, NUNCA no de produção.
--   psql "postgres://…" -q -f crm/fase2/testes/smbot_entrada.sql

\set QUIET on
delete from conversas; delete from leads; delete from casos; delete from clientes;
insert into integracao_token (nome, token) values ('smbot','TK') on conflict (nome) do update set token='TK';
insert into clientes (id, nome, telefone) values ('11111111-1111-1111-1111-111111111111','Maria','16 99999-0000');
create temp table r(k text, v boolean);
insert into r select 't1 token errado é recusado',      (smbot_entrada('errado','16999990000')->>'ok')::boolean = false;
insert into r select 't2 telefone curto é recusado',    (smbot_entrada('TK','123')->>'ok')::boolean = false;
insert into r select 't3 acha o cliente pelo telefone', (smbot_entrada('TK','5516999990000','M','oi','m1')->>'cliente_id') is not null;
insert into r select 't4 cliente não vira lead',        (smbot_entrada('TK','16999990000','M','oi2','m2')->>'lead_id') is null;
insert into r select 't5 número novo cria lead',        (smbot_entrada('TK','+55 (16) 98888-1111','J','quero','m3')->>'lead_novo')::boolean;
insert into r select 't6 segunda msg reaproveita lead', (smbot_entrada('TK','16988881111','J','de novo','m4')->>'lead_novo')::boolean = false;
insert into r select 't7 mesma msg não duplica',        (smbot_entrada('TK','16988881111','J','de novo','m4')->>'conversa_id') is null;
insert into r select 't8 um lead só no funil',          (select count(*)=1 from leads);
insert into r select 't9 quatro mensagens gravadas',    (select count(*)=4 from conversas);
insert into r select 't10 lead nasce em novo/whatsapp', (select etapa='novo' and origem='whatsapp' from leads limit 1);
insert into r select 't11 msg do cliente liga na ficha',(select count(*)=2 from conversas where cliente_id is not null);
insert into r select 't12 msg do atendente marcada',    (smbot_entrada('TK','16988881111','J','oi, tudo bem?','m5',false,'Amanda')->>'ok')::boolean;
insert into r select 't13 de_cliente false gravado',    (select not de_cliente from conversas where externo_id='m5');
\set QUIET off
select k, case when v then 'ok' else 'FALHOU' end as resultado from r order by k;
select count(*) filter (where not v or v is null) as falhas from r;
