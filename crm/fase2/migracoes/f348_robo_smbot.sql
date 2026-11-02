-- F348 · o robô de triagem igual ao do SMBot, em paralelo ao robô do CRM (pedido do Paulo de 01.11.2026).
-- O robô do CRM (zap_bot_passos, F258 a F272) fica como está, para a fase da IA e dos botões.
-- config_app.zap_robo_modelo = 'smbot' troca o robô; 'crm' (padrão) é o de antes. O interruptor
-- geral continua o zap_bot_ligado. Textos e caminhos copiados do SMBot em 01.11.2026 (somente leitura).

alter table zap_conversas add column if not exists nome_informado text;

create table if not exists zap_smb_passos (
  chave     text primary key,
  mensagens text[] not null default '{}',   -- cada item é um balão, na ordem
  opcoes    jsonb  not null default '[]',   -- [{tecla, vai}]
  setor     text,                           -- nome em zap_setores: entrega à fila do setor, sem atendente
  ordem     integer,
  ativo     boolean not null default true
);
alter table zap_smb_passos enable row level security;
drop policy if exists autenticados on zap_smb_passos;
create policy autenticados on zap_smb_passos for all to authenticated using (true) with check (true);

insert into zap_smb_passos (chave, ordem, mensagens, opcoes, setor) values
('nome', 1, array[
  'Olá, seja bem-vindo(a) a *Advocacia Previdenciária*!',
  'Prestamos atendimento jurídico previdenciário especializado em benefícios e serviços do INSS.',
  'Aqui sua questão previdenciária é analisada com atenção e você recebe orientação clara para seguir com segurança.',
  'Informe seu nome completo para que possamos iniciar o atendimento.'], '[]', null),
('inicio', 2, array[
  E'Olá, bem-vindo(a) à *Advocacia Previdenciária*.\n\nNosso atendimento é de segunda a sexta-feira, das 07h às 17h.\n\n⚠️ ATENÇÃO ao golpe do falso advogado. Não solicitamos PIX/transferência para liberação de valores e não agendamos audiência por vídeo ou telefone ⚠️\n\nEste WhatsApp é exclusivo para mensagens. Ligações somente pelo telefone fixo *(16) 3242-2908*.\n\n*Digite apenas o número da opção desejada:*\n\n*1* - Agendar atendimento\n*2* - Consultar andamento de processo ou benefício\n*3* - Enviar documentos\n*4* - Financeiro\n*5* - Outras dúvidas ou orientações'],
  '[{"tecla":"1","vai":"agendar"},{"tecla":"2","vai":"consulta"},{"tecla":"3","vai":"documentos"},{"tecla":"4","vai":"financeiro"},{"tecla":"5","vai":"duvidas"}]', null),
('agendar', 3, array[
  '*Aguarde um momento. Nossa equipe irá fornecer o melhor horário para o seu atendimento.*',
  'Enquanto isso, informe brevemente o motivo do atendimento, por exemplo, se é sobre um benefício do INSS, aposentadoria ou outro assunto.'], '[]', 'Agendamentos'),
('consulta', 4, array[
  E'*Digite somente o número da opção desejada.*\n\n*1* - Consulta rápida\n*2* - Falar com a equipe jurídica'],
  '[{"tecla":"1","vai":"rapida"},{"tecla":"2","vai":"juridica"}]', null),
('rapida', 5, array[
  'A consulta de seu benefício ou processo pode ser realizada diretamente no site do INSS ou do Tribunal.',
  E'Informe a opção desejada e eu te guiarei no acesso de forma simples e rápida.\n\n*1* - Consultar o benefício no MEU INSS\n*2* - Consultar o processo no Conselho de Recursos\n*3* - Consultar processo judicial\n*4* - Não sei onde está localizado meu benefício ou processo'],
  '[{"tecla":"1","vai":"meuinss"},{"tecla":"2","vai":"crps"},{"tecla":"3","vai":"judicial"},{"tecla":"4","vai":"nao_sei"}]', null),
('meuinss', 6, array[
  'Acesse o site do *INSS*: https://meu.inss.gov.br/',
  'Digite seu CPF e senha do GOV.BR',
  'Se ainda restam dúvidas e gostaria de conversar com um atendente, digite 1'],
  '[{"tecla":"1","vai":"juridica"}]', null),
('crps', 7, array[
  'Acesse o site do *Conselho de Recursos do INSS* - https://consultaprocessos.inss.gov.br',
  'Digite seu CPF e senha do GOV.BR',
  'Se ainda restam dúvidas e gostaria de conversar com um atendente, digite 1'],
  '[{"tecla":"1","vai":"juridica"}]', null),
('judicial', 8, array[
  E'Processo no *Tribunal de Justiça de São Paulo*: https://esaj.tjsp.jus.br/cpopg/open.do\n\nProcesso no *TRF da 3ª Região*, 1ª instância: https://pje1g.trf3.jus.br/pje/ConsultaPublica/listView.seam\n\nProcesso no *TRF da 3ª Região*, 2ª instância: https://pje2g.trf3.jus.br/pje/ConsultaPublica/listView.seam',
  'Se ainda restam dúvidas e gostaria de conversar com um atendente, digite 1'],
  '[{"tecla":"1","vai":"juridica"}]', null),
('nao_sei', 9, array['Iremos auxiliá-lo(a) na consulta de seu benefício ou processo'], '[]', 'Jurídico'),
('juridica', 10, array[
  '*Nossa equipe jurídica já está ciente do seu contato e irá retornar em breve.*',
  'Enquanto isso, informe sua dúvida para agilizarmos o atendimento.'], '[]', 'Jurídico'),
('documentos', 11, array['Envie todos os documentos e iremos verificar na sequência.'], '[]', 'Atendimento'),
('financeiro', 12, '{}', '[]', 'Financeiro'),
('duvidas', 13, array[
  E'*Digite somente o número da opção desejada.*\n\n*1* - Dúvidas relacionadas a benefícios ou serviços do INSS\n*2* - Dúvidas relacionadas a outros assuntos'],
  '[{"tecla":"1","vai":"duvida_inss"},{"tecla":"2","vai":"duvida_outros"}]', null),
('duvida_inss', 14, array[
  '*Nossa equipe já está ciente do seu contato e irá retornar em breve.*',
  'Enquanto isso, informe sua dúvida para agilizarmos o atendimento.'], '[]', 'Atendimento'),
('duvida_outros', 15, array[
  '*Nossa equipe já está ciente do seu contato e irá retornar em breve.*',
  'Enquanto isso, informe sua dúvida para agilizarmos o atendimento.'], '[]', 'Atendimento'),
('invalida', 90, array['*Por favor, digite o número da sua opção para que possa ser atendido.*'], '[]', null),
('sem_atendente', 91, array['Desculpe, no momento não temos atendentes online, mas logo entraremos em contato.'], '[]', null),
('recado', 92, array[
  '*Recebi sua mensagem. Retornarei em breve.*',
  '⚠️ ATENÇÃO ao golpe do falso advogado. Não solicitamos PIX/transferência para liberação de valores e não agendamos audiência por vídeo ou telefone ⚠️',
  '📞 Ligações com o escritório são realizadas exclusivamente pelo telefone fixo *(16) 3242-2908*, de segunda a sexta-feira, das 07h às 17h.'], '[]', null)
on conflict (chave) do nothing;

-- manda os balões de um passo, na ordem
create or replace function zap_smb_falar(p_conversa uuid, p_chave text) returns void
language sql security definer set search_path = public as $$
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
  select p_conversa, 'saida', true, t.m, 'fila'
    from zap_smb_passos p, unnest(p.mensagens) with ordinality t(m, i)
   where p.chave = p_chave and p.ativo
   order by t.i
$$;

-- leva a conversa a um passo; o passo com setor entrega à fila do setor, sem atendente (como no SMBot)
create or replace function zap_smb_ir(p_conversa uuid, p_chave text) returns void
language plpgsql security definer set search_path = public as $$
declare p zap_smb_passos;
begin
  select * into p from zap_smb_passos where chave = p_chave and ativo;
  if not found then return; end if;
  perform zap_smb_falar(p_conversa, p_chave);
  if p.setor is null then
    update zap_conversas set bot_passo = 'smb:' || p_chave, bot_erros = 0, bot_desde = now() where id = p_conversa;
    return;
  end if;
  update zap_conversas
     set bot_passo = 'smb:fila', bot_erros = 0, bot_desde = now(), bot_ativo = false,
         setor = p.setor, setor_id = (select id from zap_setores where nome = p.setor),
         status = case when status = 'resolvida' then 'aberta' else status end
   where id = p_conversa;
  if not zap_no_horario() then perform zap_smb_falar(p_conversa, 'sem_atendente'); end if;
end $$;

create or replace function zap_smb_bot(p_msg uuid) returns void
language plpgsql security definer set search_path = public as $$
declare m zap_mensagens; c zap_conversas; p zap_smb_passos; op jsonb; achou text; txt text;
        ultimo timestamptz; pausa integer; nome text;
begin
  select * into m from zap_mensagens where id = p_msg;
  select * into c from zap_conversas where id = m.conversa_id;
  if c.automatica then return; end if;

  -- na fila do setor, sem ninguém, fora do expediente: o recado do SMBot, uma vez por hora
  if c.bot_passo = 'smb:fila' then
    if c.atendente_id is null and not zap_no_horario()
       and not exists (select 1 from zap_mensagens where conversa_id = c.id and por_bot
                         and criado_em > now() - interval '1 hour') then
      perform zap_smb_falar(c.id, 'recado');
    end if;
    return;
  end if;
  if c.atendente_id is not null or not c.bot_ativo then return; end if;

  if c.bot_passo is null or c.bot_passo not like 'smb:%' then   -- primeiro contato
    if c.cliente_id is null and coalesce(trim(c.nome_informado), '') = '' then
      perform zap_smb_ir(c.id, 'nome');
    else
      perform zap_smb_ir(c.id, 'inicio');
    end if;
    return;
  end if;

  -- o nome: qualquer resposta escrita vale, como no SMBot
  if c.bot_passo = 'smb:nome' then
    nome := left(trim(coalesce(m.texto, '')), 80);
    if nome = '' then return; end if;
    update zap_conversas set nome_informado = nome where id = c.id;
    perform zap_nota_sistema(c.id, null, 'Nome informado ao robô: ' || nome);
    perform zap_smb_ir(c.id, 'inicio');
    return;
  end if;

  select * into p from zap_smb_passos where chave = substr(c.bot_passo, 5) and ativo;
  if not found then return; end if;

  if m.tipo in ('audio', 'video') and trim(coalesce(m.texto, '')) = '' then
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
    values (c.id, 'saida', true, case m.tipo when 'audio' then 'Mensagem de áudio não suportada.'
                                           else 'Mensagem de vídeo não suportada.' end, 'fila');
    return;
  end if;

  txt := lower(trim(regexp_replace(coalesce(m.texto, ''), '[*.)\s]', '', 'g')));
  for op in select * from jsonb_array_elements(p.opcoes) loop
    if txt = op->>'tecla' then achou := op->>'vai'; exit; end if;
  end loop;
  if achou is not null then perform zap_smb_ir(c.id, achou); return; end if;

  -- resposta que não é número: pede o número e repete o menu, sem limite (como no SMBot);
  -- várias mensagens seguidas recebem uma resposta só
  pausa := coalesce((select valor from config_app where chave = 'zap_pausa_bot'), '15')::int;
  select max(criado_em) into ultimo from zap_mensagens where conversa_id = c.id and por_bot;
  if ultimo is not null and pausa > 0 and ultimo > now() - make_interval(secs => pausa) then return; end if;
  perform zap_smb_falar(c.id, 'invalida');
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
  values (c.id, 'saida', true, p.mensagens[array_length(p.mensagens, 1)], 'fila');
end $$;

-- o zap_bot escolhe o robô; o do CRM segue igual quando o modelo não é 'smbot'
create or replace function public.zap_bot()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
  c zap_conversas; p zap_bot_passos; ultimo timestamptz; pausa integer;
begin
  if new.direcao <> 'entrada' or zap_eh_historico(new) then return new; end if;
  -- interruptor geral: dia de escritório cheio, ou robô dando problema, a
  -- equipe desliga tudo numa linha sem precisar de programador
  if coalesce((select valor from config_app where chave='zap_bot_ligado'),'sim') <> 'sim'
    then return new; end if;
  -- F348: o robô igual ao do SMBot, em paralelo
  if coalesce((select valor from config_app where chave='zap_robo_modelo'),'crm') = 'smbot' then
    perform zap_smb_bot(new.id);
    return new;
  end if;
  select * into c from zap_conversas where id = new.conversa_id;
  -- humano no comando: o bot cala a boca. Nada é pior que robô falando por
  -- cima do advogado. Robô de outra empresa (onda 2) também não recebe menu.
  if c.atendente_id is not null or not c.bot_ativo or c.automatica then return new; end if;

  -- cliente que manda três mensagens seguidas não merece três menus; no meio
  -- de um fluxo (nome, relato, escolha do horário) a resposta é esperada
  pausa := coalesce((select valor from config_app where chave='zap_pausa_bot'), '15')::int;
  select max(criado_em) into ultimo from zap_mensagens
   where conversa_id = new.conversa_id and por_bot;
  if ultimo is not null and pausa > 0 and coalesce(c.bot_passo,'') not in ('agendar_nome','agendar_escolha','novo_relato')
     and ultimo > now() - make_interval(secs => pausa) then return new; end if;

  if c.bot_passo is null then                       -- primeiro contato
    if not zap_no_horario() then
      insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
      select new.conversa_id, 'saida', true, texto, 'fila'
        from zap_bot_passos where chave='fora_horario' and ativo;
    end if;
    select * into p from zap_bot_passos where chave='inicio' and ativo;
    if not found then return new; end if;
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
    values (new.conversa_id, 'saida', true, zap_menu_texto('inicio'), 'fila');
    update zap_conversas set bot_passo='inicio' where id=new.conversa_id;
    return new;
  end if;

  select * into p from zap_bot_passos where chave=c.bot_passo and ativo;
  if not found then return new; end if;

  -- áudio ainda sem transcrição num passo de menu (onda 2): o robô espera o
  -- texto do transcrever.py em vez de dizer que não entendeu; sem texto em
  -- 10 minutos, o relógio segue o caminho de antes (zap_triagem_vencidas)
  if new.tipo = 'audio' and trim(coalesce(new.texto,'')) = '' and jsonb_array_length(p.opcoes) > 1
     and coalesce((select valor from config_app where chave='zap_robo_ia'),'nao') = 'sim' then
    update zap_mensagens set bot_ia = 'audio:' || c.bot_passo where id = new.id;
    return new;
  end if;

  perform zap_bot_ler(new.id);
  return new;
end $function$;

revoke execute on function zap_smb_falar(uuid, text), zap_smb_ir(uuid, text), zap_smb_bot(uuid) from public, anon, authenticated;
insert into config_app (chave, valor) values ('zap_robo_modelo', 'crm') on conflict (chave) do nothing;
