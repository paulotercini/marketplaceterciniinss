-- F821 · conferência de 25.11.2026 (dia de muitos golpes): robôs de banco, pedágio e divulgação de aula
-- não eram reconhecidos e recebiam o amparo e a IA. Novos padrões e marcação das conversas sem ficha
-- que já receberam texto de robô nos últimos 30 dias.
create or replace function public.zap_eh_automatica(p text)
 returns boolean language sql immutable
as $function$
  select lower(translate(replace(coalesce(p, ''), '*', ''),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
    ~ ('(este canal (e|eh) (utilizado|usado) exclusivamente|esta e uma mensagem automatica|mensagem automatica'
       '|nao responda (a )?esta mensagem|utilize as opcoes|digite (o numero da opcao|uma das opcoes|a opcao)'
       '|opcao invalida|selecione uma das opcoes|escolha uma das opcoes abaixo|sou (o|a) assistente virtual'
       '|(nosso|seu) atendimento virtual|numero nao recebe mensagens|este numero nao (e|eh) monitorado'
       '|^assistente [^:]{1,30}:|assistente virtual do bb|^\[mensagem de tipo template'
       '|exclusivo para (o )?envio de notificacoes|nao foi possivel entender o que voce disse'
       '|ofertas de produtos e servicos|pre-venda exclusiva|so preciso confirmar uma coisa antes de chamar nosso time'
       '|aula magna|participacao gratuita)')
$function$;

update zap_conversas z set automatica = true
 where z.cliente_id is null and not z.automatica
   and exists (select 1 from zap_mensagens m where m.conversa_id = z.id and m.direcao = 'entrada'
                and m.criado_em > now() - interval '30 days' and zap_eh_automatica(m.texto));

do $$ begin
  assert zap_eh_automatica('Ops, este número é EXCLUSIVO para envio de notificações aos nossos clientes.');
  assert zap_eh_automatica('Hum... não foi possível entender o que você disse.');
  assert not zap_eh_automatica('Bom dia dr td bem Mandei um dinheiro pra vc');
end $$;
