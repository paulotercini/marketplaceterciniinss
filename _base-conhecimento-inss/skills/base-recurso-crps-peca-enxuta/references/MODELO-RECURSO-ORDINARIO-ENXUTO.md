# Modelo de Recurso Ordinário ao CRPS - Versão Enxuta

Modelo de estrutura mínima de recurso ordinário à Junta de Recursos do CRPS, pró-segurado, em padrão enxuto, direto e claro. Fundamentação puramente normativa. Sem citação de julgados judiciais como base principal.

## CABEÇALHO

```
EXCELENTÍSSIMO SENHOR PRESIDENTE DA [X]ª JUNTA DE RECURSOS DO
CONSELHO DE RECURSOS DA PREVIDÊNCIA SOCIAL


Processo Administrativo nº [protocolo]
Benefício nº [NB]
Recorrente. [Nome do segurado], CPF [XXX.XXX.XXX-XX]
Decisão recorrida. [DC, data, fundamento]
```

## CORPO

```
1. TEMPESTIVIDADE E ADMISSIBILIDADE

A decisão de [indeferimento/cessação] foi cientificada ao segurado em
DD/MM/AAAA. O presente recurso é apresentado em DD/MM/AAAA, dentro do
prazo de 30 dias do art. 126 da Lei 8.213/91. O recorrente tem
legitimidade e interesse na reforma. Não houve renúncia tácita nem
ajuizamento de ação judicial sobre a mesma matéria.


2. DOS FATOS

Em DD/MM/AAAA o segurado protocolou requerimento de [benefício] no
NB [número]. A perícia médica administrativa foi realizada em
DD/MM/AAAA e o laudo registrou [achado objetivo conforme protocolo
identificado]. Em DD/MM/AAAA a APS proferiu decisão de
[indeferimento/cessação] sob o fundamento de [motivo declarado].

O segurado conta com [X] contribuições e qualidade de segurado nos
termos do art. 15 da Lei 8.213/91, conforme CNIS de [data] (protocolo
identificado).


3. DO MÉRITO

3.1. DA INCIDÊNCIA DO ART. [X] DA LEI 8.213/91

O dispositivo assegura a concessão de [benefício] ao segurado que
preenche [requisitos]. Redação do art. [X], com nota de redação dada
pela Lei [Y/AAAA] preservada.

No caso, o recorrente preenche os requisitos. Demonstra [requisito 1]
pelo documento [identificação]. Demonstra [requisito 2] pelo
documento [identificação]. A perícia administrativa, por sua vez,
indicou [achado favorável ou indicou ausência sem fundamentação
adequada].

O Decreto 3.048/99 confirma a regulamentação no art. [Y], que reitera
a hipótese.

A IN 128/2022 INSS regulamenta a matéria no art. [Z], que prevê
expressamente a hipótese do recorrente.


3.2. DA APLICAÇÃO DA NORMA AO CASO CONCRETO

A decisão recorrida fundamenta-se em [motivo declarado]. O motivo é
juridicamente equivocado porque [explicação curta vinculada à norma].

O Enunciado [número/CRPS], aprovado pelo Conselho Pleno, dispõe que
[transcrição literal do enunciado]. A hipótese se aplica ao caso.

[Se cabível e estritamente necessário, uma frase de remissão a
precedente vinculante do art. 109 RICRPS, sem transcrição de ementa.]


3.3. DA VIOLAÇÃO DA LEI 13.460/2017

A decisão recorrida exigiu [documento ou requisito não previsto em lei]
em violação ao art. 5º, IV, XI, XIII e XV da Lei 13.460/2017, que veda
exigência sem previsão legal e impõe simplicidade no atendimento ao
usuário do serviço público.


4. DOS PEDIDOS

Pelo exposto, requer o conhecimento e provimento do presente recurso
ordinário para reformar a decisão recorrida e reconhecer ao recorrente
o direito ao [benefício] desde a DER de DD/MM/AAAA, com a respectiva
implantação pela APS de origem.

Requer ainda a juntada dos documentos anexos como reforço da
demonstração já feita na via administrativa.


[Cidade], [data].


[Assinatura]
Paulo Roberto Tercini Filho
OAB/SP 331.110
```

## INSTRUÇÕES OPERACIONAIS

**Tamanho final esperado.** 3 a 6 páginas, dependendo do tema. Recurso muito acima disso é sinal de prolixidade. Cortar.

**Cabeçalho timbrado.** Padrão Tercini conforme `base-peticao-previdenciaria-padrao-visual`.

**Recuo.** 5 cm (padrão CRPS).

**Fonte e espaçamento.** Bookman Old Style 12pt, espaçamento 1,5.

**Negrito.** Apenas em fatos-chave e dispositivos legais centrais. Faixa ideal de 2 a 3 negritos por página.

**Documentos.** Toda afirmação fática deve referenciar documento por ID ou protocolo. Vedado "documentos em anexo" genericamente.

**Subscrição final.** Assinatura digital no PJe ou Fala.BR conforme o canal.

## INTEGRAÇÃO COM SKILLS

Ao gerar a peça pela skill `peticao-previdenciaria`, acionar.

- `base-recurso-crps-peca-enxuta` (esta) para diretrizes de redação.
- `admissibilidade-barreiras-crps` para verificação de cabimento.
- `base-legislacao-fontes-primarias` para verificação literal de cada artigo.
- `base-portarias-dpmf-inss-hub` para citação correta das Portarias.
- `base-revisao-peticao-aprofundada` para auditoria após geração.
