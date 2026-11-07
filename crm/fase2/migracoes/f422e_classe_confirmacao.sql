-- F422e · "Estarei ocupado nesse dia" virava SIM e confirmaria o atendimento (teste do Paulo de 07.11.2026).
-- Ocupado, compromisso, imprevisto e "não estarei" valem NÃO; o SIM só vale na mensagem curta (até 40
-- caracteres) que começa pela afirmação; o resto vai à IA como dúvida. Aplicada no banco em 07.11.2026.
create or replace function public.zap_conf_classe(p_txt text)
 returns text language sql immutable as $function$
  select case
    when t ~ '(remarc|desmarc|cancel|^n(ao)?\M|nao (vou|posso|poderei|consigo|da|estarei|irei)|outro (dia|horario)|ocupad|compromisso|imprevisto|impossibilit)' then 'nao'
    when length(t) <= 40 and t ~ '^(s|sim|ok|okay|certo|combinado|confirm\w*|claro|pode ser|positivo|estarei (la|presente|ai)|vou sim|irei sim|👍)([ ,.!]|$)' then 'sim'
    else 'duvida' end
  from (select lower(translate(trim(coalesce(p_txt, '')), 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç', 'AAAAEEIOOOUCaaaaeeiooouc')) t) x;
$function$;

-- textos revistos pelo Paulo no mesmo dia: o advogado antes da data, e GOV.BR em maiúsculas somente depois do SIM
update config_app set valor = E'Olá, {nome}. Seu atendimento com {advogado} está agendado para {dia}, {data}, às {hora}. Responda *SIM* para confirmar ou *NÃO* se precisar remarcar.' where chave = 'zap_conf_texto';
update config_app set valor = E'\n\nPedimos que compareça com a senha do GOV.BR (Meu INSS), porque precisamos consultar os seus dados previdenciários durante o atendimento.' where chave = 'zap_conf_govbr';
