-- FUNÇÕES TRAZIDAS DO MICROSOFT TO DO
-- Acrescenta colunas e troca duas funções do WhatsApp: rodar duas vezes dá no mesmo que rodar uma.

-- Lembrete com horário: a tarefa continua com a data em lembrar_em; a hora é
-- opcional e, quando existe, o CRM avisa naquele horário da data.
alter table andamento_tarefas add column if not exists lembrar_hora time;

-- Atribuição com autor e data (o assigner e o assigned_datetime do To Do):
-- quem pôs a pessoa no caso, e quando. O banco preenche sozinho pelo login;
-- a sincronização com o To Do, que entra sem login, deixa o autor vazio.
alter table atribuicoes add column if not exists atribuido_por uuid
  references colaboradores(id) on delete set null default eu_colab();
alter table atribuicoes add column if not exists atribuido_em timestamptz default now();

-- Data de início no prazo fatal (o startDateTime do Planner): quando começar,
-- além de quando vence. No dia, o prazo entra no Meu Dia de quem cuida do caso.
alter table casos add column if not exists prazo_inicio date;

-- Progresso em três estados (o percentComplete do Planner): a tarefa aberta
-- com iniciada_em preenchido está em andamento; concluida_em continua igual.
alter table andamento_tarefas add column if not exists iniciada_em timestamptz;

-- Etapas da tarefa (os steps do To Do, o checklist do Planner): os passos para
-- cumprir a tarefa, cada um com feito, quem e quando.
alter table andamento_tarefas add column if not exists etapas jsonb not null default '[]'::jsonb;

-- ATENDIMENTO COMPARTILHADO NO WHATSAPP (decisão do Paulo, 24.10.2026): quem não é o atendente também
-- responde ao cliente; a conversa continua com o atendente, que recebe uma menção dizendo quem respondeu.
-- O cliente vê quem escreveu pela assinatura (F188). Substitui a trava de "só o dono ou o gestor responde".
create or replace function zap_guarda_mensagem() returns trigger
language plpgsql as $$
begin
  return new;   -- responder é de todos; quem atende continua sendo o dono (zap_guarda_conversa segue valendo)
end $$;

create or replace function zap_avisa_resposta_compartilhada() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_dono uuid; v_nome text;
begin
  if new.direcao <> 'saida' or new.autor_id is null then return new; end if;
  select atendente_id, coalesce(nullif(trim(nome_perfil),''), telefone) into v_dono, v_nome
    from zap_conversas where id = new.conversa_id;
  if v_dono is null or v_dono = new.autor_id then return new; end if;
  -- uma menção por pessoa e conversa enquanto o atendente não a lê: dez respostas não viram dez avisos
  if exists (select 1 from mencoes where para_id = v_dono and de_id = new.autor_id
               and conversa_id = new.conversa_id and lida_em is null) then return new; end if;
  insert into mencoes (de_id, para_id, conversa_id, texto)
  values (new.autor_id, v_dono, new.conversa_id,
          '💬 ' || zap_nome_colab(new.autor_id) || ' respondeu a ' || coalesce(v_nome, 'o cliente') || ' na conversa que está com você');
  return new;
end $$;
drop trigger if exists zap_avisa_resposta on zap_mensagens;
create trigger zap_avisa_resposta after insert on zap_mensagens
  for each row execute function zap_avisa_resposta_compartilhada();
