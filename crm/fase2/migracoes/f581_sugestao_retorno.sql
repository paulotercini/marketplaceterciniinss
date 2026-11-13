-- F581 · o que a equipe fez com a sugestão da IA no WhatsApp (etapa 4 das melhorias do Outra e do Aprofundar,
-- aprovadas pelo Paulo em 13.11.2026): usada como veio, editada antes de enviar ou descartada.
-- A zap_assistente lê as editadas e as descartadas dos últimos 30 dias e as põe no pedido como preferências da equipe.
create table if not exists public.zap_sugestao_retorno (
  id          uuid primary key default gen_random_uuid(),
  conversa_id uuid references public.zap_conversas(id) on delete set null,
  modo        text,
  sugestao    text not null,
  enviado     text,
  acao        text not null check (acao in ('usada','editada','descartada')),
  por         uuid references public.colaboradores(id) on delete set null,
  em          timestamptz not null default now()
);
create index if not exists zap_sugestao_retorno_em on public.zap_sugestao_retorno (em desc) where acao <> 'usada';

alter table public.zap_sugestao_retorno enable row level security;
drop policy if exists zsr_ler on public.zap_sugestao_retorno;
create policy zsr_ler on public.zap_sugestao_retorno for select to authenticated
  using ((select public.sou_ativo()));
-- grava apenas em nome próprio
drop policy if exists zsr_criar on public.zap_sugestao_retorno;
create policy zsr_criar on public.zap_sugestao_retorno for insert to authenticated
  with check ((select public.sou_ativo())
    and por in (select c.id from public.colaboradores c where c.auth_id = auth.uid()));

revoke all on public.zap_sugestao_retorno from anon;
grant select, insert on public.zap_sugestao_retorno to authenticated;
