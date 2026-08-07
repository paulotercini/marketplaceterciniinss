-- Confere o calendário de pagamento do INSS contra a tabela oficial de 2026.
-- Errar aqui é dizer ao cliente uma data que não vai acontecer, então cada
-- conferência abaixo foi lida célula a célula do PDF do INSS.
--   psql "postgres://…" -q -f crm/fase2/testes/inss_calendario.sql

\set QUIET on
create temp table r(k text, v boolean);
create or replace function _pg(comp text, fx text, f int) returns text
language sql as $$
  select to_char(pagamento,'DD/MM/YYYY') from inss_calendario
   where competencia = comp::date and faixa = fx and final = f
$$;
\set QUIET off

-- ── tamanho e cobertura ───────────────────────────────────────────────────
insert into r select 't1 13 competências x 10 finais x 2 faixas',
  (select count(*)=260 from inss_calendario);
insert into r select 't2 começa na competência dez/25',
  (select min(competencia)='2025-12-01' from inss_calendario);
insert into r select 't3 e termina na de dez/26',
  (select max(competencia)='2026-12-01' from inss_calendario);
insert into r select 't4 nenhum final ficou de fora',
  (select count(distinct final)=10 from inss_calendario);

-- ── até 1 salário mínimo: paga DENTRO do mês da competência ───────────────
insert into r select 't5 jan/26 final 1 = 26/01',      _pg('2026-01-01','ate',1)='26/01/2026';
insert into r select 't6 jan/26 final 5 = 30/01',      _pg('2026-01-01','ate',5)='30/01/2026';
insert into r select 't7 mar/26 final 5 = 31/03',      _pg('2026-03-01','ate',5)='31/03/2026';
insert into r select 't8 ago/26 final 5 = 31/08',      _pg('2026-08-01','ate',5)='31/08/2026';
insert into r select 't9 dez/25 final 1 = 22/12/2025', _pg('2025-12-01','ate',1)='22/12/2025';
insert into r select 't10 dez/26 final 3 = 28/12/2026',_pg('2026-12-01','ate',3)='28/12/2026';
insert into r select 't11 set/26 final 4 = 29/09',     _pg('2026-09-01','ate',4)='29/09/2026';
insert into r select 't12 nov/26 final 2 = 25/11',     _pg('2026-11-01','ate',2)='25/11/2026';

-- ── até 1 SM, finais 6 a 0: paga no mês SEGUINTE ──────────────────────────
insert into r select 't13 jan/26 final 6 = 02/02',     _pg('2026-01-01','ate',6)='02/02/2026';
insert into r select 't14 abr/26 final 6 = 04/05',     _pg('2026-04-01','ate',6)='04/05/2026';
insert into r select 't15 out/26 final 0 = 09/11',     _pg('2026-10-01','ate',0)='09/11/2026';
insert into r select 't16 mai/26 final 9 = 05/06',     _pg('2026-05-01','ate',9)='05/06/2026';
insert into r select 't17 set/26 final 8 = 05/10',     _pg('2026-09-01','ate',8)='05/10/2026';
insert into r select 't18 dez/26 final 6 = 04/01/2027 (vira o ano)',
  _pg('2026-12-01','ate',6)='04/01/2027';
insert into r select 't19 dez/26 final 0 = 08/01/2027',_pg('2026-12-01','ate',0)='08/01/2027';

-- ── acima de 1 salário mínimo: sempre no mês seguinte ─────────────────────
insert into r select 't20 jan/26 final 1 = 02/02',     _pg('2026-01-01','acima',1)='02/02/2026';
insert into r select 't21 jan/26 final 6 = 02/02 (mesmo dia do 1)',
  _pg('2026-01-01','acima',6)='02/02/2026';
insert into r select 't22 jan/26 final 5 = 06/02',     _pg('2026-01-01','acima',5)='06/02/2026';
insert into r select 't23 jan/26 final 0 = 06/02 (mesmo dia do 5)',
  _pg('2026-01-01','acima',0)='06/02/2026';
insert into r select 't24 abr/26 final 2 = 05/05',     _pg('2026-04-01','acima',2)='05/05/2026';
insert into r select 't25 out/26 final 5 = 09/11',     _pg('2026-10-01','acima',5)='09/11/2026';
insert into r select 't26 dez/26 final 4 = 07/01/2027',_pg('2026-12-01','acima',4)='07/01/2027';

-- ── quem recebe acima NUNCA recebe no mês da competência ──────────────────
insert into r select 't27 acima do mínimo é sempre no mês seguinte', (select bool_and(
  date_trunc('month', pagamento) > competencia) from inss_calendario where faixa='acima');
-- ── e os finais 1 a 5 do mínimo, sempre dentro do mês ─────────────────────
insert into r select 't28 até o mínimo, finais 1 a 5 caem no próprio mês', (select bool_and(
  date_trunc('month', pagamento) = competencia)
  from inss_calendario where faixa='ate' and final between 1 and 5);

-- ── fora do intervalo não existe: o sistema tem de avisar, não chutar ─────
insert into r select 't29 não há nada de 2027 cadastrado',
  (select count(*)=0 from inss_calendario where competencia >= '2027-01-01');
insert into r select 't30 nem antes de dez/25',
  (select count(*)=0 from inss_calendario where competencia < '2025-12-01');
\set QUIET on
drop function if exists _pg(text,text,int);
\set QUIET off
select k, case when v then 'ok' else 'FALHOU' end as resultado
  from r order by (substring(k from '^t(\d+)'))::int;
select count(*) filter (where not v or v is null) as falhas from r;
