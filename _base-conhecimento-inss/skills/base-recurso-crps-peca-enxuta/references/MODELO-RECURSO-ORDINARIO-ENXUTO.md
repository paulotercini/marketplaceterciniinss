# Modelo de Recurso Ordinário ao CRPS - Versão Enxuta

Modelo de estrutura mínima de recurso ordinário à Junta de Recursos do CRPS, pró-segurado, em padrão enxuto, direto e claro. A fundamentação é normativa, sem citação de julgados judiciais como base principal, e segue a regra da Onda 184 de linguagem simples, com artigo de lei apenas quando extremamente necessário.

## DO CABEÇALHO

```
EXCELENTÍSSIMO SENHOR PRESIDENTE DA [X]ª JUNTA DE RECURSOS DO
CONSELHO DE RECURSOS DA PREVIDÊNCIA SOCIAL


[Nome do Recorrente], CPF [XXX.XXX.XXX-XX], nos autos do processo
administrativo nº [protocolo], referente ao benefício nº [NB], vem,
respeitosamente, interpor RECURSO ORDINÁRIO contra a decisão de
[indeferimento/cessação] de DD/MM/AAAA, pelas razões a seguir.
```

## DO CORPO DA PEÇA

O corpo foi revisto na auditoria de 03/10/2026 e na Onda 184, que alinhou a forma ao quadro "A mesma peça em todos os ritos" do `ESTILO-MODELO.md`.

```
1. DA TEMPESTIVIDADE E DA ADMISSIBILIDADE

A decisão de [indeferimento/cessação] foi cientificada ao Recorrente em
DD/MM/AAAA, conforme [aviso ou extrato do Meu INSS, protocolo]. O recurso
é apresentado em DD/MM/AAAA, dentro do prazo de 30 dias (art. 77 do
Regimento Interno do CRPS). O Recorrente tem legitimidade e interesse na
reforma, porque não renunciou ao recurso nem ajuizou ação judicial sobre
a mesma matéria.


2. DOS FATOS

Em DD/MM/AAAA, o Recorrente requereu [benefício] no NB [número], conforme
o protocolo [número]. A perícia médica administrativa de DD/MM/AAAA
registrou [achado objetivo do laudo, folha __], e em DD/MM/AAAA a Agência
da Previdência Social [indeferiu/cessou] o benefício por [motivo
declarado na comunicação de decisão, folha __].

O CNIS de DD/MM/AAAA (folha __) registra [X] contribuições, a última em
MM/AAAA, e [o vínculo ou o benefício que mantém a qualidade de segurado,
com as datas].


3. DO MÉRITO

3.1. DA [QUALIDADE DE SEGURADO, CARÊNCIA, INCAPACIDADE OU OUTRO REQUISITO
NEGADO]

A decisão recorrida negou [o requisito] com a seguinte fundamentação:
"[trecho literal da comunicação de decisão, folha __]". Ocorre que o
[documento], de DD/MM/AAAA (folha __), registra [o fato, com o número], e
a decisão não o examinou.

Desse modo, o Recorrente cumpre [o requisito], porque [consequência do
fato, com a data e o número]. [Remissão curta à norma, como "(art. 15,
II, da Lei 8.213/91)", apenas se a decisão contrariou norma expressa ou
se o pedido depender dela.]

[Um tópico por requisito ou por erro da decisão, na mesma ordem. O
Decreto 3.048/99 e a IN 128/2022 entram apenas quando a decisão
contrariou dispositivo deles, por remissão curta, e nunca como lista de
normas que confirmam a hipótese.]


3.2. DO ENUNCIADO DO CRPS CONTRARIADO

[Tópico apenas quando a decisão contrariou Enunciado. É a única
transcrição admitida na peça, ao lado do fato que faz o caso caber nele.]

A decisão recorrida contrariou o Enunciado [número] do CRPS, que dispõe:
"[trecho exato do Enunciado aplicável]". No caso, [fato do Recorrente,
com o documento e a folha], o que corresponde exatamente à hipótese do
Enunciado.

[Se cabível e estritamente necessário, uma frase de remissão a
precedente vinculante do art. 109 do Regimento Interno do CRPS, sem
transcrição de ementa.]


3.3. DA EXIGÊNCIA SEM PREVISÃO NORMATIVA

A decisão recorrida exigiu [documento ou requisito] (folha __), que
nenhuma norma prevê para o [benefício]. O [documento já apresentado],
de DD/MM/AAAA (folha __), comprova o mesmo fato, razão pela qual a
exigência deve ser afastada (art. 5º, IV, XI, XIII e XV, da Lei
13.460/2017).


4. DOS PEDIDOS

Pelo exposto, requer o conhecimento e provimento do presente recurso
ordinário para reformar a decisão recorrida e reconhecer ao Recorrente
o direito ao [benefício] desde a DER de DD/MM/AAAA, com a respectiva
implantação pela Agência da Previdência Social de origem.

Requer ainda a juntada dos documentos relacionados ao fim, cada um com a
indicação da folha, como reforço da demonstração já feita na via
administrativa.


[Cidade], [data].


[Assinatura]
Paulo Roberto Tercini Filho
OAB/SP 331.110
```

## DAS INSTRUÇÕES OPERACIONAIS

**Tamanho final esperado.** O recurso tem de 3 a 6 páginas, conforme o tema, e a peça muito acima disso merece busca de repetição, que é o único trecho a cortar.

**Forma do tópico (Onda 184).** Cada tópico abre pelo fato e pelo erro da decisão, e a norma entra depois, por remissão curta e apenas quando a decisão contrariou norma expressa ou o pedido depende dela.

Por sua vez, o título nomeia o requisito ou o vício, como DA QUALIDADE DE SEGURADO, e nunca o número do artigo. Não se transcreve lei em bloco, salvo o trecho exato da norma ou do Enunciado do CRPS que a decisão contrariou, uma vez na peça.

**Cabeçalho timbrado.** O cabeçalho segue o padrão Tercini da `base-peticao-previdenciaria-padrao-visual`, com recuo de 5 cm, próprio do CRPS, fonte Bookman Old Style 12pt e espaçamento 1,5.

**Negrito.** O negrito se reserva aos fatos-chave e aos dispositivos centrais, na faixa de 2 a 3 destaques por página.

**Documentos.** Toda afirmação fática indica o documento pela folha ou pelo protocolo, e não se admite a menção genérica aos anexos.

**Subscrição final.** A assinatura é digital, no PJe ou no Fala.BR, conforme o canal de protocolo.

## DA INTEGRAÇÃO COM AS SKILLS

Ao gerar a peça pela skill `peticao-previdenciaria`, acionam-se esta skill, `base-recurso-crps-peca-enxuta`, para a redação, a `admissibilidade-barreiras-crps`, para a verificação de cabimento, a `base-legislacao-fontes-primarias`, para a conferência literal de cada artigo, a `base-portarias-dpmf-inss-hub`, para a citação correta das Portarias, e a `base-revisao-peticao-aprofundada`, para a auditoria após a geração.
