---
name: base-auditoria-adversarial-contestacao-inss
description: "Skill de auditoria adversarial de contestação, parecer da PFE-INSS, decisão administrativa ou acórdão do CRPS contrário ao segurado, para desconstruir a peça do adversário antes da réplica ou impugnação. Use SEMPRE que mencionar auditar contestação, analisar contestação do INSS, réplica à contestação, impugnação à contestação, parecer da Procuradoria contrário, desconstruir parecer do INSS, acórdão desfavorável do CRPS, encontrar falácia na defesa, alegação sem prova do INSS, contradição na contestação, distinguishing de acórdão colado pelo INSS, blefe argumentativo da autarquia, narrativa vazia sem lastro probatório, ou qualquer situação em que o INSS ou a autarquia apresentar defesa, parecer ou decisão a ser rebatida. NÃO use para auditoria de laudo pericial médico (skill auditoria-laudo-pericial) nem para auditoria de PPP (skill auditoria-ppp). Acionar em conjunto com precedentes-previdenciarios, base-analise-decisao-tres-eixos, base-cpc-onus-prova-art373, base-cpc-fundamentacao-art489 e peticao-previdenciaria."
---

## NOTA DE COEXISTÊNCIA (unificação de linhas, Onda 67, 12/07/2026)

O plugin passou a conter duas famílias de skills sobre leitura de peças adversárias, vindas de linhas paralelas de trabalho unificadas na Onda 67. A família base-analise-contestacao-inss com ponte-workflow-replica-contestacao e ponte-workflow-recurso-sentenca, e a família base-auditoria-adversarial-contestacao-inss com base-auditoria-adversarial-decisao-judicial. Enquanto não houver racionalização definitiva pelo escritório, usar as duas de forma complementar e, em caso de conflito de orientação, prevalece a que tiver citação [CONFERIDO] em fonte primária. Não citar em peça nada que apenas uma delas afirme sem selo de conferência.


# Auditoria Adversarial de Contestação, Parecer e Decisão Contrária

## Objetivo

Desconstruir tecnicamente a peça do INSS, da PFE-INSS ou do CRPS antes de redigir a réplica, a impugnação ou o recurso. A auditoria roda em cinco etapas sequenciais. Cada etapa gera um produto concreto que alimenta a etapa seguinte. A última etapa entrega os tópicos da peça final.

Esta skill não substitui `base-analise-decisao-tres-eixos`, que audita a decisão judicial (sentença ou acórdão) em três eixos, preliminares, vícios de integração e mérito. Esta skill audita a manifestação do adversário (contestação, parecer, decisão administrativa, acórdão do CRPS desfavorável) que antecede ou sustenta a decisão.

## Regra Absoluta do Escritório

Toda contestação, parecer ou decisão contrária recebida passa por esta auditoria antes de qualquer réplica, impugnação ou recurso ser redigido. Não pular etapa. Não redigir a peça final direto da leitura superficial da defesa.

## Etapa 1. Caçador de Falácias

Ler a peça adversária na íntegra, do início ao fim, e identificar falácias lógicas no raciocínio apresentado.

Falácias recorrentes em defesa do INSS.

- Espantalho, quando a autarquia rebate um argumento que o segurado não fez, distorcendo o pedido original.
- Petição de princípio, quando a autarquia afirma como premissa exatamente o que deveria provar (ex. "não há prova de exposição" sem enfrentar o PPP juntado).
- Falsa correlação, quando a autarquia associa fato irrelevante a conclusão desfavorável (ex. idade do segurado como indício de fraude).
- Generalização indevida, quando a autarquia aplica entendimento de outro tipo de caso ou de outra época sem demonstrar identidade fático-jurídica.
- Ad hominem processual, quando a autarquia questiona a boa-fé do segurado ou do advogado em vez de enfrentar a prova.

Para cada falácia localizada, registrar o trecho exato (com página ou ID do documento), a falácia identificada e a explicação de por que o raciocínio está fática ou juridicamente quebrado. Nunca apontar falácia inexistente para preencher a lista. Se a peça adversária não contiver falácia relevante, registrar essa conclusão honestamente e passar à etapa seguinte.

## Etapa 2. Filtro de Blefes

Montar tabela de duas colunas.

Primeira coluna, cada alegação de fato feita pela autarquia ou pelo CRPS.

Segunda coluna, verificação se a alegação veio acompanhada de prova documental correspondente nos autos ou no processo administrativo.

Destacar em negrito toda alegação sem lastro probatório, aplicando o art. 373, II do CPC (ônus do réu quanto a fato impeditivo, modificativo ou extintivo) e o art. 341 do CPC (ônus da impugnação especificada). Contestação padronizada do INSS costuma repetir texto genérico sem enfrentar o caso concreto. Esse padrão, quando identificado, deve ser nomeado expressamente como impugnação genérica insuficiente, com cruzamento à skill `base-cpc-onus-prova-art373`.

## Etapa 3. Detector de Contradições Internas

Fazer leitura cruzada da própria peça adversária, comparando o que a autarquia afirma no início com o que afirma ao final.

Padrões comuns de contradição interna em manifestação do INSS.

- Reconhecer a qualidade de segurado no relatório de benefícios e negá-la na fundamentação da contestação.
- Admitir a exposição a agente nocivo em um trecho do parecer e negar a nocividade em outro, sem explicar a mudança de posição.
- Impugnar genericamente "todos os fatos" na abertura e, no desenvolvimento, admitir tacitamente fatos específicos ao discutir apenas o direito.

Para cada contradição, registrar os dois trechos exatos em confronto, com página ou ID, e a conclusão sobre qual das duas afirmações prevalece contra o próprio autor da peça (regra do venire contra factum proprium administrativo, quando aplicável).

## Etapa 4. Aniquilador de Ementas (Distinguishing)

Quando a peça adversária citar precedente, súmula, tema ou acórdão para sustentar a tese contrária ao segurado, aplicar o seguinte procedimento antes de qualquer resposta.

Primeiro, conferir o precedente citado pelo INSS no catálogo do escritório (skill `base-precedentes-catalogo-vinculantes` e `CATALOGO-COMPLEMENTAR-VERIFICADO`). Verificar status atual, vigente, superado, cancelado ou sem tese firmada. Se o precedente estiver superado ou cancelado e o INSS o citar como vigente, isso é falha grave a ser exposta na réplica.

Segundo, se o precedente estiver vigente, comparar a base fática do precedente com a base fática do caso concreto. Extrair do próprio precedente os elementos fáticos que motivaram a tese (agente nocivo específico, tipo de prova, época dos fatos, tipo de benefício) e demonstrar, ponto a ponto, a diferença em relação ao caso do cliente.

Terceiro, redigir o distinguishing em bloco autônomo, primeiro citando a tese firmada no precedente, depois demonstrando a diferença fático-jurídica que afasta a aplicação ao caso concreto.

Nunca aceitar a aplicação do precedente citado pelo INSS sem essa conferência. Nunca admitir a tese contrária apenas porque veio com jurisprudência colada, sem checagem.

## Etapa 5. Redação Final da Réplica ou Impugnação

Com base nas etapas anteriores, redigir os tópicos da peça final (réplica, impugnação à contestação, contrarrazões de recurso administrativo ou recurso ao CRPS conforme o rito aplicável).

Estrutura recomendada, cada tópico corresponde a um achado da auditoria.

Primeiro tópico, das falácias identificadas na etapa 1, demonstrando a quebra lógica do raciocínio adversário.

Segundo tópico, das alegações sem prova identificadas na etapa 2, aplicando o ônus do art. 373, II do CPC contra a autarquia.

Terceiro tópico, das contradições internas identificadas na etapa 3, expondo a inconsistência da própria narrativa adversária.

Quarto tópico, do distinguishing dos precedentes citados na etapa 4, afastando a aplicação ao caso concreto com base fática comparada.

Tom técnico, firme e sem adjetivação vazia. Confronto direto entre prova documental, norma e fato concreto. Sem retórica abstrata. Seguir as regras de estilo do escritório, sem travessão, sem dois-pontos introduzindo lista ou conclusão, sem a estrutura "não é X, é Y", parágrafos curtos.

## Adaptação por Rito

### JEF

Réplica ou impugnação enxuta, direto aos pontos essenciais, sem digressão doutrinária. Priorizar a etapa 2 (blefes) e a etapa 3 (contradições), que rendem mais no rito sumaríssimo.

### Rito ordinário federal

Peça mais densa, com fundamentação expressa de cada etapa, inclusive citação normativa completa (art. 373, art. 341, art. 489, §1º do CPC quando a decisão futura precisar enfrentar os pontos).

### CRPS

Aplicar a mesma lógica ao parecer que embasou a decisão de primeira instância administrativa ou ao acórdão desfavorável da Junta de Recursos, adaptando referências a protocolo e folha do processo administrativo em vez de ID do PJe. Cruzar com `admissibilidade-barreiras-crps` quando a decisão do CRPS impuser barreira formal, e com `recursos-superiores-crps` quando o caso comportar recurso especial ao Conselho Pleno.

## Interação com Outras Skills

### precedentes-previdenciarios e base-precedentes-catalogo-vinculantes

Consulta obrigatória na etapa 4, antes de qualquer distinguishing ou de qualquer citação de precedente próprio na réplica.

### base-analise-decisao-tres-eixos

Quando a peça a ser rebatida já for uma decisão judicial ou administrativa (não apenas contestação ou parecer), acionar primeiro `base-analise-decisao-tres-eixos` para triagem de preliminares, vícios de integração e mérito, e usar esta skill para a etapa de mérito quando a decisão incorporar os argumentos da contestação ou do parecer.

### base-cpc-onus-prova-art373 e base-cpc-fundamentacao-art489

Fundamento normativo da etapa 2 (ônus da prova) e apoio para arguir, se cabível, ausência de fundamentação da decisão que acolheu alegação sem lastro probatório.

### especificacao-provas

Se a auditoria revelar que o INSS não impugnou especificamente fatos documentados, usar essa constatação para reforçar a manifestação de suficiência probatória e o requerimento de julgamento antecipado.

### peticao-previdenciaria e base-peticao-previdenciaria-padrao-visual

A peça final gerada na etapa 5 segue o padrão visual e formal do escritório quando materializada em .docx.

## Alertas Automáticos

**ALERTA 1.** Se a contestação ou o parecer não citar nenhum precedente, pular a etapa 4 e registrar essa ausência, sem forçar distinguishing sobre precedente inexistente.

**ALERTA 2.** Se o precedente citado pelo INSS estiver desatualizado, superado ou cancelado conforme o catálogo do escritório, isso deve abrir o tópico correspondente da réplica, por ser o ponto de maior força argumentativa.

**ALERTA 3.** Se a auditoria não encontrar falácia, contradição ou blefe relevante, informar isso com honestidade e não inflar a réplica com apontamentos frágeis. Peça de má qualidade contra defesa tecnicamente robusta enfraquece a posição do cliente.

**ALERTA 4.** Se a contestação impugnar documento essencial que não foi juntado com ID identificável nos autos, alertar antes de redigir a réplica, porque a fragilidade pode ser do próprio processo do escritório, não do adversário.

## Checklist de Validação

Antes de finalizar a réplica ou impugnação, verificar.

1. Cada falácia apontada tem trecho exato e explicação da quebra lógica.
2. Cada alegação sem prova está identificada com base no art. 373, II do CPC.
3. Cada contradição interna traz os dois trechos exatos em confronto.
4. Cada precedente citado pelo adversário foi conferido no catálogo antes do distinguishing.
5. O distinguishing compara base fática do precedente com o caso concreto, não apenas afirma diferença.
6. Nenhuma falácia, contradição ou blefe foi inventado para preencher a peça.
7. A proibição de dois-pontos, travessão e "não é X, é Y" está observada.
8. O formato segue o padrão do escritório quando gerado como .docx.
