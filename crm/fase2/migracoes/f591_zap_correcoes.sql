-- F591 (decisão do Paulo de 14.11.2026, análise da semana do WhatsApp): três correções.
-- 1 · O telefone do contato novo gravado sem o 55 (DDD + número, 10 ou 11 dígitos, ou com o 0 de
--     discagem) fez o robô falhar com "número não tem WhatsApp". A conversa passa a guardar 55 + DDD +
--     número em qualquer gravação (gatilho antes do insert e do update do telefone, que cobre o
--     zap_abrir e quem mais gravar), e as linhas já gravadas se acertam. A chave (8 últimos dígitos)
--     não muda, por isso nenhuma conversa se junta nem se separa.
-- 2 · A leitura da IA trocada pela mensagem nova do cliente vira 'plantao:substituida', e não
--     'plantao:falhou' (zap_relogio, recriado da F516 com só esse trecho mudado).
-- 3 · A primeira falha "número não tem WhatsApp" de uma conversa avisa quem atende ou, sem atendente,
--     a recepção e os gestores, uma vez por conversa e número.
-- Não destrutiva: só acerta o formato do telefone e acrescenta funções e gatilhos.

-- ── 1 · o telefone com o 55 ──────────────────────────────────────────────────────────────────
create or replace function public.zap_fone_norm(p text) returns text
language plpgsql immutable as $$
declare d text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
begin
  d := regexp_replace(d, '^0(?=[1-9][0-9]{9,10}$)', '');   -- 0 de discagem: 016…
  if length(d) in (10, 11) then return '55' || d; end if;  -- DDD + número sem o país
  return p;                                                 -- o resto fica como veio
end $$;

create or replace function public.zap_conversa_fone() returns trigger
language plpgsql as $$
begin
  new.telefone := zap_fone_norm(new.telefone);
  return new;
end $$;

drop trigger if exists zap_conversa_fone on public.zap_conversas;
create trigger zap_conversa_fone before insert or update of telefone on public.zap_conversas
  for each row execute function zap_conversa_fone();

do $$ begin
  perform set_config('zap.via_funcao', '1', true);
  update zap_conversas set telefone = zap_fone_norm(telefone)
   where telefone is distinct from zap_fone_norm(telefone);
end $$;

-- ── 2 · o relógio: substituída não é falha ───────────────────────────────────────────────────
create or replace function public.zap_relogio() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer := 0; r record;
begin
  -- ponte (30 s) e pg_cron (1 min) chamam os dois: a linha do relógio é a trava. A segunda
  -- chamada espera a primeira e, vendo o carimbo novo, sai; duas voltas juntas avisariam o
  -- retorno e chamariam a IA duas vezes
  insert into zap_saude (componente) values ('relogio') on conflict (componente) do nothing;
  update zap_saude set visto_em = now(), ok = true, detalhe = null
   where componente = 'relogio' and (visto_em is null or visto_em < now() - interval '20 seconds');
  if not found then return 0; end if;

  update zap_mensagens set status = 'fila'
   where status = 'agendada' and enviar_em <= now();
  get diagnostics n = row_count;
  for r in select z.id, z.conversa_id, coalesce(z.colaborador_id, c.atendente_id) quem, z.nota,
                  coalesce(nullif(trim(c.nome_perfil), ''), c.telefone) nome
             from zap_retornos z join zap_conversas c on c.id = z.conversa_id
            where z.feito_em is null and z.avisado_em is null and z.quando <= now() loop
    if r.quem is not null then
      insert into mencoes (para_id, conversa_id, texto)
      values (r.quem, r.conversa_id, '⏰ Retorno: responder ' || coalesce(r.nome, 'o contato')
              || coalesce(' — ' || nullif(trim(r.nota), ''), ''));
    end if;
    update zap_retornos set avisado_em = now() where id = r.id;
  end loop;
  perform zap_bot_esperas();
  perform zap_triagem_vencidas();
  perform zap_plantao_vencidas();
  perform zap_push_audios_vencidos();
  perform push_resumo_vez();
  -- faxina e saúde não podem derrubar o que veio antes
  begin
    -- a leitura da IA que ninguém mais espera (o pedido da conversa já é de outra mensagem).
    -- F591 · o cliente escreveu de novo e o pedido passou à mensagem nova: substituída, não falha
    update zap_mensagens m set bot_ia = 'plantao:substituida'
     where m.bot_ia = 'plantao:lendo'
       and not exists (select 1 from zap_conversas c
                        where c.id = m.conversa_id and c.plantao->>'pedido_msg' = m.id::text)
       and exists (select 1 from zap_mensagens n
                    where n.conversa_id = m.conversa_id and n.direcao = 'entrada' and n.seq > m.seq);
    update zap_mensagens m set bot_ia = 'plantao:falhou'
     where m.bot_ia = 'plantao:lendo'
       and not exists (select 1 from zap_conversas c
                        where c.id = m.conversa_id and c.plantao->>'pedido_msg' = m.id::text);
    perform set_config('zap.via_funcao', '1', true);
    update zap_conversas set sugestao_ia = null
     where sugestao_ia is not null and (sugestao_ia->>'em')::timestamptz < now() - interval '24 hours';
    perform zap_saude_vez();
  exception when others then null;
  end;
  return n;
end $$;

-- ── 3 · o primeiro "número não tem WhatsApp" avisa ───────────────────────────────────────────
-- O texto vem da ponte (enviar, reagir, alterarEnviada). Uma vez por conversa e número: a menção
-- com o mesmo texto na mesma conversa já é o aviso.
create or replace function public.zap_sem_whatsapp_aviso() returns trigger
language plpgsql security definer set search_path = public as $$
declare c zap_conversas; v_dig text; v_fmt text; v_txt text;
begin
  select * into c from zap_conversas where id = new.conversa_id;
  if c.id is null then return null; end if;
  v_dig := regexp_replace(coalesce(c.telefone, ''), '\D', '', 'g');
  if length(v_dig) in (12, 13) and left(v_dig, 2) = '55' then v_dig := substr(v_dig, 3); end if;
  v_fmt := case when length(v_dig) in (10, 11)
                then '(' || left(v_dig, 2) || ') ' || substr(v_dig, 3, length(v_dig) - 6) || '-' || right(v_dig, 4)
                else coalesce(c.telefone, 'o número') end;
  v_txt := 'O envio para ' || v_fmt || ' falhou: o número não tem WhatsApp. Confira o telefone na ficha.';
  if exists (select 1 from mencoes where conversa_id = c.id and texto = v_txt) then return null; end if;
  insert into mencoes (para_id, conversa_id, cliente_id, texto)
  select k.id, c.id, c.cliente_id, v_txt
    from colaboradores k
   where k.ativo and (k.id = c.atendente_id
                      or (c.atendente_id is null
                          and (k.cargo in ('recepcao', 'estagiario') or k.papel = 'admin' or coalesce(k.gestor_zap, false))));
  return null;
end $$;

drop trigger if exists zap_sem_whatsapp_upd on public.zap_mensagens;
create trigger zap_sem_whatsapp_upd after update of status on public.zap_mensagens
  for each row when (new.status = 'erro' and old.status is distinct from 'erro'
                     and new.direcao = 'saida' and new.erro like '%não tem WhatsApp%')
  execute function zap_sem_whatsapp_aviso();

revoke execute on function public.zap_sem_whatsapp_aviso(), public.zap_conversa_fone() from public, anon, authenticated;
