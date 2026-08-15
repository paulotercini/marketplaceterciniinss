# Modelo de Recurso Especial ao CRPS - Versão Enxuta

Modelo de recurso especial à Câmara de Julgamento (CAJ) do CRPS, pró-segurado, em padrão enxuto. Fundamentação normativa pura. Demonstração específica de uma das hipóteses do art. 91 do RICRPS.

## CABEÇALHO

```
EXCELENTÍSSIMO SENHOR PRESIDENTE DA [X]ª CÂMARA DE JULGAMENTO DO
CONSELHO DE RECURSOS DA PREVIDÊNCIA SOCIAL


Acórdão recorrido. [número, data, [X]ª Junta de Recursos]
Processo Administrativo nº [protocolo]
Benefício nº [NB]
Recorrente. [Nome do segurado], CPF [XXX.XXX.XXX-XX]
```

## CORPO

```
1. TEMPESTIVIDADE

A intimação do acórdão recorrido ocorreu em DD/MM/AAAA. O presente
recurso é apresentado em DD/MM/AAAA, dentro do prazo de 30 dias do
art. 91 do RICRPS (Portaria MPS 125/2026).


2. CABIMENTO. HIPÓTESE DO ART. 91 DO RICRPS

O presente recurso especial fundamenta-se na hipótese do art. 91,
inciso [I, II, III ou IV] do RICRPS, configurada conforme demonstração
abaixo.

[Escolher UMA hipótese e demonstrar com clareza.]

OPÇÃO 1 (Divergência entre Câmaras).
Acórdão paradigma. [identificação, data, Câmara].
Tese divergente. [transcrição literal da tese contrária].
Tese do acórdão recorrido. [transcrição literal da tese aplicada].
Demonstração da divergência. [análise objetiva da contrariedade].

OPÇÃO 2 (Contrariedade a Enunciado vinculante).
Enunciado afrontado. [número/CRPS, transcrição literal].
Demonstração da contrariedade. [comparação objetiva].

OPÇÃO 3 (Contrariedade a Parecer CONJUR/AGU vinculante).
Parecer afrontado. [número, transcrição da tese].
Demonstração da contrariedade.

OPÇÃO 4 (Súmula CRPS afrontada).
Súmula afrontada. [número, transcrição].
Demonstração da contrariedade.


3. DOS FATOS RELEVANTES PARA O RECURSO ESPECIAL

[Apenas os fatos que pertencem ao núcleo da divergência. Sem repetir
fatos já consolidados em primeira instância.]


4. DO MÉRITO

4.1. DA TESE PRÓ-SEGURADO CONFORME A NORMA APLICÁVEL

[Mesma estrutura do recurso ordinário, mas centrada na hipótese de
cabimento do recurso especial. Indicar a tese normativa correta e o
fundamento legal específico.]


4.2. DA APLICAÇÃO AO CASO

[Aplicação concreta da tese ao caso, com referência a documentos
por ID/protocolo.]


5. DOS PEDIDOS

Pelo exposto, requer o conhecimento e provimento do presente recurso
especial para reformar o acórdão da [X]ª Junta de Recursos e
reconhecer ao recorrente o direito ao [benefício] desde a DER de
DD/MM/AAAA.

Caso a Câmara entenda pelo desprovimento, requer expressamente o
prequestionamento da matéria de direito federal para fins de eventual
recurso administrativo subsequente.


[Cidade], [data].


[Assinatura]
Paulo Roberto Tercini Filho
OAB/SP 331.110
```

## INSTRUÇÕES OPERACIONAIS

**Tamanho final esperado.** 5 a 8 páginas. Recurso especial exige demonstração técnica da hipótese de cabimento, então é levemente mais longo que o ordinário.

**Diferença chave.** O recurso especial precisa COMPROVAR uma das 4 hipóteses do art. 91 do RICRPS. A simples discordância com a decisão da JR não é hipótese de cabimento.

**Cuidado especial.**

1. Identificar com PRECISÃO a hipótese de cabimento.
2. Citar o paradigma (acórdão divergente, enunciado, parecer ou súmula) com transcrição literal.
3. Demonstrar a CONTRARIEDADE de forma objetiva, sem retórica.
4. Mostrar que a tese pró-segurado encontra fundamento no normativo.

**Vedações específicas.**

- Vedado utilizar recurso especial como segundo recurso ordinário. Se a tese é só de reexame fático, o recurso será inadmitido.
- Vedado usar jurisprudência judicial como paradigma. Os paradigmas válidos no CRPS são acórdãos do próprio CRPS, enunciados, súmulas e pareceres vinculantes.

**Integração obrigatória com.**

- `recursos-superiores-crps` (skill local) para o detalhamento das 4 hipóteses do art. 91.
- `admissibilidade-barreiras-crps` para verificação de cabimento.
- `base-revisao-peticao-aprofundada` para auditoria após geração.
