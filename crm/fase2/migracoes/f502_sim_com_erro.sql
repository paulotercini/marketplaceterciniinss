-- F502: "Sin" (erro de digitação) não confirmava o atendimento (pedido do Paulo de 10.11.2026)
CREATE OR REPLACE FUNCTION public.zap_conf_classe(p_txt text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case
    when t ~ '(remarc|desmarc|cancel|^n(ao)?\M|nao (vou|posso|poderei|consigo|da|estarei|irei)|outro (dia|horario)|ocupad|compromisso|imprevisto|impossibilit)' then 'nao'
    when length(t) <= 40 and t ~ '^(s|ss|si|sin|cim|sim+|ok|okay|certo|combinado|confirm\w*|claro|pode ser|positivo|estarei (la|presente|ai)|vou sim|irei sim|👍)([ ,.!]|$)' then 'sim'
    else 'duvida' end
  from (select lower(translate(trim(coalesce(p_txt, '')), 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç', 'AAAAEEIOOOUCaaaaeeiooouc')) t) x;
$function$;
