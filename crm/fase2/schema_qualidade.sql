-- ════════════════════════════════════════════════════════════════════════════
-- F282 · MANUTENÇÃO DA QUALIDADE DE SEGURADO (pedido do Paulo, 26.10.2026)
-- O plano de pagamento ao INSS de quem ainda não tem direito a benefício e
-- precisa manter a qualidade de segurado: como paga (a guia e o valor), quando
-- (o calendário) e até quando. É do CLIENTE, não de um caso: vale para quem busca
-- BPC ou pensão por morte (é acessório) e segue vivo depois que os atendimentos
-- se encerram. Com o aviso ligado, o WhatsApp lembra o cliente sozinho no
-- primeiro dia útil do mês do pagamento, pelo mesmo caminho dos avisos de perícia
-- (zap_mensagens, uma vez só por mês e plano).
-- F284 · os ajustes do Paulo (26.10.2026): "Pagar até" com dia, mês e ano (o
-- vencimento do primeiro pagamento, que ancora o calendário), a primeira
-- competência, a forma anual e o aviso no primeiro dia útil do mês.
-- Rode no Supabase (SQL Editor). Pode rodar de novo sem estragar nada.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists qualidade_planos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete cascade,
  -- pagar direto (todo mês), uma vez a cada 6 meses, 6 meses e depois a cada 6, uma vez a cada 12, ou outra forma
  modalidade  text not null,
  codigo      text,                         -- 'MEI', '1007', '1163', '1406', '1473', '1929' ou outro
  valor       numeric(10,2),
  dia         smallint not null default 15 check (dia between 1 and 31),
  inicio      date not null default current_date,   -- a primeira competência (o mês dela)
  fim         date,                         -- o último pagamento (vazio: até encerrar)
  meses       jsonb not null default '[]',  -- outra forma: os meses de pagamento, ["2026-11","2027-05"]
  aviso_zap   boolean not null default false,
  ativo       boolean not null default true,
  motivo      text,                         -- por que paga: a perda em…, o benefício que protege
  analise_id  uuid,                         -- a Análise de Direito que deu o parecer
  criado_por  uuid default eu_colab(),
  criado_em   timestamptz not null default now()
);
-- F284 · o vencimento do primeiro pagamento; os seguintes caem no mesmo dia, pelo calendário da forma
alter table qualidade_planos add column if not exists pagar_ate date;
alter table qualidade_planos drop constraint if exists qualidade_planos_modalidade_check;
alter table qualidade_planos add constraint qualidade_planos_modalidade_check
  check (modalidade in ('mensal','semestral','seis_semestral','anual','caso_a_caso'));
alter table qualidade_planos drop constraint if exists qualidade_planos_dia_check;
alter table qualidade_planos add constraint qualidade_planos_dia_check check (dia between 1 and 31);
create index if not exists qualidade_planos_cliente on qualidade_planos (cliente_id) where ativo;
alter table qualidade_planos enable row level security;
drop policy if exists qualidade_autenticados on qualidade_planos;
create policy qualidade_autenticados on qualidade_planos for all to authenticated
  using (true) with check (true);

-- o mês de pagamento: a mesma conta da tela (qualidadePagaNoMes no app.html). O
-- calendário conta do mês do primeiro vencimento (pagar_ate; sem ele, o início)
create or replace function qualidade_paga_no_mes(p qualidade_planos, p_mes date)
returns boolean language sql immutable as $$
  with b as (select date_trunc('month', coalesce(p.pagar_ate, p.inicio))::date as m0),
       i as (select m0, ((extract(year from p_mes)*12 + extract(month from p_mes))
                         - (extract(year from m0)*12 + extract(month from m0)))::int as n from b)
  select case
    when p_mes < i.m0 then false
    when p.fim is not null and p_mes > date_trunc('month', p.fim)::date then false
    when p.modalidade = 'mensal' then true
    when p.modalidade = 'semestral' then i.n % 6 = 0
    when p.modalidade = 'anual' then i.n % 12 = 0
    when p.modalidade = 'seis_semestral' then i.n < 6 or (i.n - 5) % 6 = 0
    else p.meses ? to_char(p_mes, 'YYYY-MM')
  end from i
$$;

-- o vencimento do plano dentro de um mês: o dia do pagar_ate (o último dia, nos meses mais curtos)
create or replace function qualidade_vencimento(p qualidade_planos, p_mes date)
returns date language sql immutable as $$
  select (date_trunc('month', p_mes)::date
    + (least(coalesce(extract(day from p.pagar_ate)::int, p.dia),
             extract(day from (date_trunc('month', p_mes) + interval '1 month - 1 day'))::int) - 1))::date
$$;

-- o primeiro dia útil do mês: nem sábado, nem domingo, nem 1º de janeiro, nem 1º de maio
create or replace function qualidade_primeiro_util(p_mes date)
returns date language plpgsql immutable as $$
declare d date := date_trunc('month', p_mes)::date;
begin
  while extract(isodow from d) > 5 or to_char(d, 'MM-DD') in ('01-01','05-01') loop d := d + 1; end loop;
  return d;
end $$;

-- o texto do aviso fica nas Configurações, com os outros avisos automáticos
alter table zap_avisos drop constraint if exists zap_avisos_sobre_check;
alter table zap_avisos add constraint zap_avisos_sobre_check
  check (sobre in ('evento','cadunico','dcb','aniversario','qualidade'));
insert into zap_avisos (chave, descricao, sobre, tipo_ev, dias_antes, texto, revisar, ordem) values
('qualidade_pagamento','Manutenção da qualidade de segurado — 1º dia útil do mês do pagamento','qualidade',null,0,
E'Olá, {nome}! Aqui é do escritório Paulo R. Tercini Filho. 🙂\n\nEste mês tem pagamento do INSS para manter a sua qualidade de segurado: guia *{codigo}*{valor}, *até {data}*.\n\nSe precisar da guia ou tiver qualquer dúvida, é só responder por aqui.',
 false, 9)
on conflict (chave) do nothing;
-- F284 · o texto da primeira versão (ainda não mexido) passa a dizer o vencimento do mês
update zap_avisos set descricao = 'Manutenção da qualidade de segurado — 1º dia útil do mês do pagamento',
  texto = E'Olá, {nome}! Aqui é do escritório Paulo R. Tercini Filho. 🙂\n\nEste mês tem pagamento do INSS para manter a sua qualidade de segurado: guia *{codigo}*{valor}, *até {data}*.\n\nSe precisar da guia ou tiver qualquer dúvida, é só responder por aqui.'
 where chave = 'qualidade_pagamento' and texto like '%é dia de pagar o INSS%';

-- Roda de hora em hora (cron abaixo), mas só manda no primeiro dia útil do mês
-- do pagamento. Idempotente: a chave do mês e o plano impedem a segunda mensagem.
create or replace function zap_gerar_avisos_qualidade(p_hoje date default null)
returns integer
language plpgsql security definer set search_path = public as $$
declare r record; a record; v_conv uuid; v_txt text; n integer := 0; v_hoje date; v_mes date;
begin
  if coalesce((select valor from config_app where chave='zap_avisos_ligado'),'sim') <> 'sim' then return 0; end if;
  if p_hoje is null and not zap_no_horario() then return 0; end if;
  v_hoje := coalesce(p_hoje, (now() at time zone 'America/Sao_Paulo')::date);
  if v_hoje <> qualidade_primeiro_util(v_hoje) then return 0; end if;
  v_mes := date_trunc('month', v_hoje)::date;
  select * into a from zap_avisos where chave = 'qualidade_pagamento' and ativo;
  if not found then return 0; end if;
  for r in
    select q as pl, c.nome, c.telefone
      from qualidade_planos q join clientes c on c.id = q.cliente_id
     where q.ativo and q.aviso_zap and coalesce(c.telefone,'') <> ''
       and qualidade_paga_no_mes(q, v_mes)
  loop
    v_conv := zap_abrir(r.telefone, r.nome);
    v_txt := zap_texto_aviso(a.texto, r.nome,
      (qualidade_vencimento(r.pl, v_mes)::timestamp at time zone 'America/Sao_Paulo'));
    v_txt := replace(replace(v_txt, '{codigo}',
        case when (r.pl).codigo = 'MEI' then 'DAS do MEI' else coalesce('GPS ' || nullif(nullif((r.pl).codigo,''),'outro'), 'do INSS') end),
      '{valor}', coalesce(', no valor de R$ ' || replace(to_char((r.pl).valor, 'FM999990.00'), '.', ','), ''));
    begin
      insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, aviso_chave, aviso_ref)
      values (v_conv, 'saida', true, v_txt, case when a.revisar then 'rascunho' else 'fila' end,
              'qualidade:' || to_char(v_hoje, 'YYYY-MM'), (r.pl).id);
      n := n + 1;
    exception when unique_violation then null;   -- este pagamento já foi lembrado
    end;
  end loop;
  return n;
end $$;
revoke all on function zap_gerar_avisos_qualidade(date) from public;
grant execute on function zap_gerar_avisos_qualidade(date) to authenticated;

select cron.unschedule('zap-qualidade') where exists (select 1 from cron.job where jobname = 'zap-qualidade');
select cron.schedule('zap-qualidade', '5 * * * *', 'select zap_gerar_avisos_qualidade()');
