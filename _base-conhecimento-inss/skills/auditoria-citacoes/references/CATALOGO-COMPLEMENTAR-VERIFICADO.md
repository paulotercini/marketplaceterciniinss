# Catálogo Complementar Verificado

Registro dos itens de jurisprudência CONFIRMADOS NA FONTE OFICIAL pela skill `auditoria-citacoes`, com redação literal e link. A entrada de um item aqui ENCERRA a quarentena daquele item de vez e o retira das varreduras futuras (o script `auditoria_citacoes.py` lê este arquivo e pula os IDs registrados).

## Regras de entrada (invioláveis)

Primeiro, só entra item confirmado em FONTE OFICIAL (portal do tribunal, DOU, CJF, Planalto). Fonte secundária não basta para registro aqui, por melhor que seja.

Segundo, a tese ou o dispositivo entram em REDAÇÃO LITERAL, copiada da fonte, nunca parafraseada.

Terceiro, todo item traz o link da fonte e a data da conferência.

Quarto, item DIVERGENTE ou NÃO LOCALIZADO jamais entra aqui. O lugar dele é o relatório da auditoria e a correção na skill de origem.

Quinto, o ID do item segue a normalização do script (exemplos, `TEMA 995/STJ`, `SUMULA 89/TNU`, `ENUNCIADO 17/CRPS`, `SUMULA VINCULANTE 22`, `PUIL 5000733`, `ADI 3931`). A linha de título de cada item é `### <ID>`, que é o que o script lê.

## Formato de item

```
### TEMA 999/XXX
- Situação. [vigente | cancelado | suspenso | com modulação]
- Tese literal. "[texto copiado da fonte oficial]"
- Órgão e leading case. [tribunal, processo, relator, data quando disponíveis]
- Fonte oficial. [URL]
- Conferido em. DD/MM/AAAA
```

## Itens verificados

(nenhum item registrado ainda. Os itens são adicionados exclusivamente pela execução da skill `auditoria-citacoes`, um a um, após confirmação na fonte oficial. Este arquivo nunca recebe item por presunção.)
