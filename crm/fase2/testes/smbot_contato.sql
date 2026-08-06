-- Regressão da porta que aceita o webhook do SMBot como ele é: corpo no
-- formato deles, com o contato e SEM o conteúdo da mensagem.
-- ⚠ Este arquivo APAGA clientes, casos, leads e conversas: só rode num banco
--   de teste com o schema.sql aplicado, NUNCA no de produção.
--   psql "postgres://…" -q -f crm/fase2/testes/smbot_contato.sql

\set QUIET on
delete from conversas; delete from leads; delete from casos; delete from clientes;
insert into integracao_token (nome, token) values ('smbot','TK') on conflict (nome) do update set token='TK';
insert into clientes (id, nome, telefone) values ('11111111-1111-1111-1111-111111111111','Maria','16 99999-0000');
create temp table r(k text, v boolean);

-- ── acha o telefone e o nome onde quer que estejam ────────────────────────
insert into r select 't1 chave só no nível de baixo',
  (smbot_contato('{"token":"TK","contact":{"phone":"5516988881111","name":"João"}}')->>'ok')::boolean;
insert into r select 't2 lead nasce com o nome do contato',
  (select nome='João' and origem='whatsapp' and etapa='novo' from leads limit 1);
insert into r select 't3 formato pontuado é o mesmo número',
  (smbot_contato('{"token":"TK","telefone":"+55 (16) 98888-1111"}')->>'lead_novo')::boolean = false;
insert into r select 't4 um lead só depois de dois contatos',
  (select count(*)=1 from leads);
insert into r select 't5 telefone dentro de lista aninhada',
  (smbot_contato('{"token":"TK","dados":[{"vazio":true},{"celular":"16977772222"}]}')->>'lead_novo')::boolean;

-- ── o que NÃO pode virar telefone nem nome ────────────────────────────────
insert into r select 't6 corpo sem telefone é recusado',
  (smbot_contato('{"token":"TK","evento":"mensagem_recebida"}')->>'erro') is not null;
insert into r select 't7 id de contato não é telefone',
  (smbot_contato('{"token":"TK","id":"88213","contato":"Zé"}')->>'ok')::boolean = false;
insert into r select 't8 número não vira nome do lead',
  (select nome like 'WhatsApp%' from leads where telefone='16977772222');

-- ── token ─────────────────────────────────────────────────────────────────
insert into r select 't9 token errado é recusado',
  (smbot_contato('{"token":"errado","telefone":"16955553333"}')->>'ok')::boolean = false;
insert into r select 't10 sem token é recusado',
  (smbot_contato('{"telefone":"16955553333"}')->>'ok')::boolean = false;
insert into r select 't11 recusado não cria lead',
  (select count(*)=0 from leads where telefone like '%5555%');

-- ── quem já é cliente não volta para o funil ──────────────────────────────
insert into r select 't12 cliente é reconhecido',
  (smbot_contato('{"token":"TK","from":{"number":"5516999990000"}}')->>'cliente_id') is not null;
insert into r select 't13 cliente não vira lead',
  (smbot_contato('{"token":"TK","telefone":"16999990000"}')->>'lead_id') is null;

-- ── passagem sem conteúdo: registra, mas não repete a cada minuto ─────────
insert into r select 't14 segunda passagem em 10 min não repete',
  (smbot_contato('{"token":"TK","telefone":"16999990000"}')->>'registrado')::boolean = false;
insert into r select 't15 uma linha só para o cliente',
  (select count(*)=1 from conversas where fone_chave(telefone)=fone_chave('16999990000'));
insert into r select 't16 passagem fica sem texto (o conteúdo é do SMBot)',
  (select texto is null from conversas where fone_chave(telefone)=fone_chave('16999990000'));
insert into r select 't17 contatos contados no lead',
  (select contatos=1 and ultimo_contato is not null from leads where telefone like '%98888%');

-- ── se um dia o SMBot mandar o conteúdo, entra sem mexer no código ────────
insert into r select 't18 mensagem com texto é gravada',
  (smbot_contato('{"token":"TK","telefone":"16966664444","message":"quero me aposentar","message_id":"x1"}')->>'com_texto')::boolean;
insert into r select 't19 mesma mensagem não duplica',
  (smbot_contato('{"token":"TK","telefone":"16966664444","message":"quero me aposentar","message_id":"x1"}')->>'registrado')::boolean = false;
insert into r select 't20 texto guardado como veio',
  (select texto='quero me aposentar' from conversas where externo_id='x1');
\set QUIET off
select k, case when v then 'ok' else 'FALHOU' end as resultado
  from r order by (substring(k from '^t(\d+)'))::int;
select count(*) filter (where not v or v is null) as falhas from r;
