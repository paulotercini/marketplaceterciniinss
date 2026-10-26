-- ════════════════════════════════════════════════════════════════════════════
-- F282 · MANUTENÇÃO DA QUALIDADE DE SEGURADO (pedido do Paulo, 26.10.2026)
-- O plano de pagamento ao INSS de quem ainda não tem direito a benefício e
-- precisa manter a qualidade de segurado: como paga (a guia e o valor), quando
-- (o calendário) e até quando. É do CLIENTE, não de um caso: vale para quem busca
-- BPC ou pensão por morte (é acessório) e segue vivo depois que os atendimentos
-- se encerram. Com o aviso ligado, o WhatsApp lembra o cliente sozinho no dia do
-- pagamento, pelo mesmo caminho dos avisos de perícia (zap_mensagens, uma vez só).
-- Rode uma vez no Supabase (SQL Editor). Pode rodar de novo sem estragar nada.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists qualidade_planos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete cascade,
  -- mensal (o MEI), semestral, os 6 primeiros meses e depois semestral, ou caso a caso
  modalidade  text not null check (modalidade in ('mensal','semestral','seis_semestral','caso_a_caso')),
  codigo      text,                         -- 'MEI', '1007', '1163', '1406', '1473', '1929' ou outro
  valor       numeric(10,2),
  dia         smallint not null default 15 check (dia between 1 and 28),
  inicio      date not null default current_date,   -- o primeiro pagamento (o mês dele)
  fim         date,                         -- até quando pagar (vazio: até desligar)
  meses       jsonb not null default '[]',  -- caso a caso: ["2026-11","2027-05"]
  aviso_zap   boolean not null default false,
  ativo       boolean not null default true,
  motivo      text,                         -- por que paga: a perda em…, o benefício que protege
  analise_id  uuid,                         -- a Análise de Direito que deu o parecer
  criado_por  uuid default eu_colab(),
  criado_em   timestamptz not null default now()
);
create index if not exists qualidade_planos_cliente on qualidade_planos (cliente_id) where ativo;
alter table qualidade_planos enable row level security;
drop policy if exists qualidade_autenticados on qualidade_planos;
create policy qualidade_autenticados on qualidade_planos for all to authenticated
  using (true) with check (true);

-- o mês de pagamento: a mesma conta que a tela faz (qualidadeDevido no app.html)
create or replace function qualidade_paga_no_mes(p qualidade_planos, p_mes date)
returns boolean language sql immutable as $$
  select case
    when p_mes < date_trunc('month', p.inicio)::date then false
    when p.fim is not null and p_mes > date_trunc('month', p.fim)::date then false
    when p.modalidade = 'mensal' then true
    when p.modalidade = 'semestral' then
      ((extract(year from p_mes)*12 + extract(month from p_mes)) - (extract(year from p.inicio)*12 + extract(month from p.inicio)))::int % 6 = 0
    when p.modalidade = 'seis_semestral' then (
      with i as (select ((extract(year from p_mes)*12 + extract(month from p_mes)) - (extract(year from p.inicio)*12 + extract(month from p.inicio)))::int as n)
      select n < 6 or (n - 5) % 6 = 0 from i)
    else p.meses ? to_char(p_mes, 'YYYY-MM')
  end
$$;

-- o texto do aviso fica nas Configurações, com os outros avisos automáticos
alter table zap_avisos drop constraint if exists zap_avisos_sobre_check;
alter table zap_avisos add constraint zap_avisos_sobre_check
  check (sobre in ('evento','cadunico','dcb','aniversario','qualidade'));
insert into zap_avisos (chave, descricao, sobre, tipo_ev, dias_antes, texto, revisar, ordem) values
('qualidade_pagamento','Manutenção da qualidade de segurado — dia do pagamento','qualidade',null,0,
E'Olá, {nome}! Aqui é do escritório Paulo R. Tercini Filho. 🙂\n\nHoje, *{data}*, é dia de pagar o INSS para manter a sua qualidade de segurado: guia *{codigo}*{valor}.\n\nSe precisar da guia ou tiver qualquer dúvida, é só responder por aqui.',
 false, 9)
on conflict (chave) do nothing;

-- Roda de hora em hora (cron abaixo). Idempotente: a chave do mês e o plano
-- impedem a segunda mensagem do mesmo pagamento.
create or replace function zap_gerar_avisos_qualidade(p_hoje date default null)
returns integer
language plpgsql security definer set search_path = public as $$
declare r record; a record; v_conv uuid; v_txt text; n integer := 0; v_hoje date;
begin
  if coalesce((select valor from config_app where chave='zap_avisos_ligado'),'sim') <> 'sim' then return 0; end if;
  if p_hoje is null and not zap_no_horario() then return 0; end if;
  v_hoje := coalesce(p_hoje, (now() at time zone 'America/Sao_Paulo')::date);
  select * into a from zap_avisos where chave = 'qualidade_pagamento' and ativo;
  if not found then return 0; end if;
  for r in
    select q.*, c.nome, c.telefone
      from qualidade_planos q join clientes c on c.id = q.cliente_id
     where q.ativo and q.aviso_zap and coalesce(c.telefone,'') <> ''
       and q.dia = extract(day from v_hoje)
       and qualidade_paga_no_mes(q, date_trunc('month', v_hoje)::date)
  loop
    v_conv := zap_abrir(r.telefone, r.nome);
    v_txt := zap_texto_aviso(a.texto, r.nome, (v_hoje::timestamp at time zone 'America/Sao_Paulo'));
    v_txt := replace(replace(v_txt, '{codigo}', coalesce(nullif(r.codigo,''), 'do INSS')),
      '{valor}', coalesce(', no valor de R$ ' || replace(to_char(r.valor, 'FM999990.00'), '.', ','), ''));
    begin
      insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, aviso_chave, aviso_ref)
      values (v_conv, 'saida', true, v_txt, case when a.revisar then 'rascunho' else 'fila' end,
              'qualidade:' || to_char(v_hoje, 'YYYY-MM'), r.id);
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
