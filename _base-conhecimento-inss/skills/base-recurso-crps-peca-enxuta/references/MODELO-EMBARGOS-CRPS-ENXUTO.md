# Modelo de Embargos de Declaração ao CRPS - Versão Enxuta

Modelo de embargos de declaração do art. 92 do RICRPS, pró-segurado, em padrão ULTRA-ENXUTO. Embargos são peças MUITO CURTAS, com função específica de sanar vício.

## CABEÇALHO

```
EXCELENTÍSSIMO SENHOR PRESIDENTE DA [X]ª JUNTA DE RECURSOS DO
CONSELHO DE RECURSOS DA PREVIDÊNCIA SOCIAL

ou

EXCELENTÍSSIMO SENHOR PRESIDENTE DA [X]ª CÂMARA DE JULGAMENTO DO
CONSELHO DE RECURSOS DA PREVIDÊNCIA SOCIAL


Acórdão embargado. [número, data]
Processo Administrativo nº [protocolo]
Benefício nº [NB]
Embargante. [Nome do segurado], CPF [XXX.XXX.XXX-XX]
```

## CORPO

```
1. TEMPESTIVIDADE

Intimação em DD/MM/AAAA. Embargos protocolados em DD/MM/AAAA, dentro
do prazo de 5 dias do art. 92 do RICRPS (Portaria MPS 125/2026).


2. DO VÍCIO

[Escolher UM dos 4 vícios. Embargos com mais de um vício devem indicar
cada um em tópico separado, mas sem inflar a peça.]

OPÇÃO 1 - OMISSÃO

O acórdão omitiu manifestação sobre o fundamento [específico] suscitado
pelo recorrente. O fundamento foi expressamente apresentado nas razões
recursais (página X) e consiste em [tese específica].

A omissão deve ser sanada com pronunciamento expresso sobre a tese
pretendida.

OPÇÃO 2 - CONTRADIÇÃO

Há contradição entre [trecho A] (página X do acórdão) e [trecho B]
(página Y do acórdão). [Identificar com objetividade a antinomia.]

A contradição deve ser sanada com a definição da tese vencedora.

OPÇÃO 3 - OBSCURIDADE

O acórdão é obscuro ao afirmar [trecho específico] sem deixar claro
[ponto que demanda esclarecimento].

A obscuridade deve ser sanada com esclarecimento expresso.

OPÇÃO 4 - ERRO MATERIAL

Há erro material na [identificação específica do erro - data, valor,
NB, CPF, nome]. O erro decorre de [origem do equívoco] e deve ser
corrigido para [correção pretendida].


3. DO PEDIDO

Pelo exposto, requer o conhecimento e provimento dos presentes
embargos para [sanar o vício específico] e, se cabível, emprestar
efeito infringente em razão de [justificativa].


[Cidade], [data].


[Assinatura]
Paulo Roberto Tercini Filho
OAB/SP 331.110
```

## INSTRUÇÕES OPERACIONAIS

**Tamanho final esperado.** 1 a 2 páginas. Embargos com 3 páginas já é prolixo. Embargos com 5+ páginas é frequentemente sinal de tentativa de rediscutir o mérito, o que não é função dos embargos.

**Cuidado crítico.**

- Embargos NÃO são instrumento de rediscussão de mérito.
- Embargos com efeito infringente são EXCEÇÃO, não regra. Justificar caso a caso.
- Apontar vício específico com referência a trecho do acórdão.

**Função estratégica dos embargos.**

1. Sanar vício técnico para limpar o caminho do recurso especial.
2. Provocar prequestionamento de matéria não enfrentada.
3. Corrigir erro material que impacta a execução.

**Vedações específicas.**

- Vedado rediscutir mérito por meio de embargos.
- Vedado apresentar novos fundamentos não suscitados anteriormente.
- Vedada extensa fundamentação argumentativa. A peça deve ser cirúrgica.

**Integração obrigatória.**

- `incidentes-instrucao-crps` (skill local) para o regime dos embargos no CRPS.
- `base-revisao-peticao-aprofundada` para auditoria.
