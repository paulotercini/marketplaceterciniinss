-- F829 · honorários (ordem do Paulo de 27.11.2026): o lançamento se edita e se cancela com motivo.
-- Só acrescenta colunas e um gatilho; nada se apaga. O cancelado continua na tabela (riscado na tela).
-- Quem e quando vêm do login (auth.uid() → colaboradores.auth_id), e não do navegador.
alter table public.pagamentos add column if not exists cancelado_motivo text;
alter table public.pagamentos add column if not exists cancelado_por uuid references public.colaboradores(id);
alter table public.pagamentos add column if not exists cancelado_em timestamptz;
alter table public.pagamentos add column if not exists editado_por uuid references public.colaboradores(id);
alter table public.pagamentos add column if not exists editado_em timestamptz;

create or replace function public.pagamentos_autoria() returns trigger
language plpgsql security definer set search_path = public as $$
declare quem uuid := (select id from colaboradores where auth_id = auth.uid() limit 1);
begin
  if new.status = 'cancelado' and old.status is distinct from 'cancelado' then
    if coalesce(btrim(new.cancelado_motivo), '') = '' then
      raise exception 'F829: cancelar o lançamento pede o motivo';
    end if;
    new.cancelado_em := now();
    new.cancelado_por := coalesce(quem, new.cancelado_por);
  elsif (old.status = 'aberto' and new.status = 'aberto'
         and (new.valor, new.vencimento) is distinct from (old.valor, old.vencimento))
     or (old.status = 'recebido' and new.status = 'aberto') then
    new.editado_em := now();
    new.editado_por := coalesce(quem, new.editado_por);
  end if;
  return new;
end $$;
revoke all on function public.pagamentos_autoria() from public, anon, authenticated;

drop trigger if exists pagamentos_autoria on public.pagamentos;
create trigger pagamentos_autoria before update on public.pagamentos
  for each row execute function public.pagamentos_autoria();
