# Estilo-modelo das peças do escritório

Onda 163, 29/09/2026. Calibragem aprovada pelo titular, que pediu texto compreensível, humano, formal e jurídico, no registro fluido que ele aprecia nas peças produzidas pelo ChatGPT e pelo Manus. Esta referência é lida ANTES de redigir qualquer peça, e os parágrafos abaixo são o padrão a imitar em extensão, ritmo e encadeamento. Os casos são fictícios e servem apenas ao estilo.

**Onda 174, 04/10/2026.** A estrutura, as fórmulas e a voz das peças passaram a ser as do `METODO-PETICAO-TERCINI.md`, extraído do modelo do próprio titular, que prevalece sobre esta referência em caso de diferença. Daqui continuam valendo as medidas, as transições e as vedações. Nos exemplos abaixo, a peça entregue escreve "a Parte Autora" e, depois da primeira menção na seção, "a Autarquia Federal", e o documento é citado por ID nas peças intermediárias e "em anexo" na petição inicial.

## As medidas

O parágrafo tem de quatro a cinco linhas, com teto de seis, o que no papel do escritório corresponde a 40 a 55 palavras, com teto de 65. A frase tem de 15 a 35 palavras e passa de 45 só em citação literal. Cada parágrafo desenvolve uma ideia em três ou quatro frases ligadas entre si, e cada parágrafo, a partir do segundo da seção, abre retomando o anterior. O acervo do escritório, medido em 20/09/2026, tem mediana de 42 palavras por parágrafo e percentil 90 de 75, de modo que a nova medida corresponde ao que o titular já escrevia.

## As transições

Para acrescentar, além disso, soma-se a isso, também. Para dar a causa, porque, uma vez que, já que, isso porque. Para tirar a consequência, por isso, por essa razão, de modo que, assim. Para contrapor, ocorre que, todavia, ainda assim, mesmo diante disso. Para refutar, nem se diga que, tampouco procede. Para concluir, desse modo, portanto. Para marcar o tempo, na sequência, a partir de então, três meses depois.

A transição é escolhida pela relação lógica entre as frases, e nunca por ornamento. A mesma transição não se repete em parágrafos seguidos.

## O que continua vedado e o que foi liberado

Continuam vedados o adjetivo de intensidade (manifestamente, flagrante, absurdo, cristalino, obviamente, claramente), o travessão como separador, a miniconclusão abrindo o parágrafo, a frase-decreto repetida no mesmo texto, a construção "não é X, é Y" e o título que não seja formal e nominal.

Foram liberados os dois-pontos antes de citação literal e de enumeração de pedidos ou requisitos, as fórmulas próprias do registro forense, como "data venia", "com o devido respeito" e "não há que se falar", usadas com moderação, e os termos técnicos que a lista anterior tratava como adjetivo, como decisão teratológica, fato notório, ciência inequívoca e pedido inadmissível. A regra "uma ideia por frase" foi substituída por "uma ideia por parágrafo", e o corte fixo de 20% deu lugar à retirada do que não decide.

## Exemplo 1, aposentadoria especial por ruído

> O autor trabalhou como operador de prensa hidráulica na Metalúrgica Alfa Ltda. de 03/03/2005 a 10/08/2023, exposto durante toda a jornada a ruído de 89 dB(A), conforme o Perfil Profissiográfico Previdenciário emitido pela empregadora (ID 4521). Ainda assim, o INSS deixou de enquadrar o período como especial e indeferiu o pedido em 12/03/2025, sem apontar qualquer falha no documento (ID 4530).

> Ocorre que o limite de tolerância ao ruído, desde 19/11/2003, é de 85 dB(A), e o nível registrado no Perfil Profissiográfico Previdenciário o supera em quatro decibéis durante todo o período. Por essa razão, o documento apresentado ao INSS já bastava para o reconhecimento da atividade especial, de modo que a decisão administrativa deixou de aplicar o critério que a própria autarquia adota.

> Nem se diga que o fornecimento de protetor auricular afastaria a especialidade. No Tema 555, o Supremo Tribunal Federal fixou que a declaração de eficácia do equipamento de proteção individual não descaracteriza o tempo especial quando o agente é o ruído acima do limite. Por isso, a anotação feita pela empregadora no Perfil Profissiográfico Previdenciário não altera a conclusão.

## Exemplo 2, auxílio por incapacidade temporária

> A autora exerce a função de costureira industrial desde 2012 e, em 04/02/2025, foi afastada pelo ortopedista assistente em razão de síndrome do túnel do carpo bilateral, confirmada por eletroneuromiografia (ID 7710). Três meses depois, o INSS indeferiu o benefício sob o fundamento de ausência de incapacidade, sem examinar o exame apresentado (ID 7722).

> Ocorre que a costura industrial exige movimentos repetitivos de pinça e de flexão do punho durante toda a jornada, justamente os gestos que a compressão do nervo mediano impede, conforme descreve o relatório médico (ID 7715). Por isso, a incapacidade deve ser aferida diante da atividade habitual da segurada, como exige o art. 59 da Lei 8.213/1991, e não em abstrato.

## Por que esses parágrafos funcionam

Cada um abre por um elemento diferente, fato, norma ou objeção, e nenhum começa por uma miniconclusão. As frases se ligam por transições que mostram a relação lógica, e o leitor não precisa costurar sozinho o raciocínio. O dado decisivo aparece com número, data e ID, e a força do texto vem da precisão, não do adjetivo.

O texto antigo, que o medidor passa a reprovar, era este. "O autor trabalhou na Metalúrgica Alfa. Operava prensa hidráulica. Havia ruído de 89 dB(A). O PPP comprova (ID 4521). O INSS não enquadrou o período." As mesmas informações, sem transição e em frases soltas, obrigam o julgador a reconstruir o raciocínio.

## Aferição

O `scripts/medir_peca.py` confere as medidas. Parágrafo acima de 65 palavras e sequência de três frases com menos de doze palavras são achados IMPORTANTES. Frase acima de 45 palavras e parágrafo de três ou mais frases sem nenhuma transição são achados MENORES.
