---
name: base-auditoria-adversarial-decisao-judicial
description: "Skill de auditoria adversarial de decisão judicial contrária ao segurado (sentença, acórdão de Turma Recursal, acórdão de TRF, acórdão de STJ ou STF em capítulos desfavoráveis, decisão monocrática de relator, decisão interlocutória, tutela indeferida) para desconstruir o julgado antes de redigir recurso ou incidente. Use SEMPRE que mencionar auditar sentença, analisar sentença desfavorável, auditar acórdão, analisar acórdão contrário, preparar apelação, preparar recurso inominado, preparar embargos de declaração, preparar agravo interno, preparar PUIL, preparar recurso especial, encontrar falha na sentença, decisão sem fundamentação, art. 489 §1º violado, distinguishing de precedente colado pelo juiz, contradição interna do acórdão, decisão surpresa, argumento não enfrentado. NÃO use para auditoria de contestação, parecer da PFE-INSS ou acórdão do CRPS (skill base-auditoria-adversarial-contestacao-inss). NÃO use para triagem inicial de eixos processuais (skill base-analise-decisao-tres-eixos, que roda ANTES desta). NÃO use para auditoria de laudo pericial (skill auditoria-laudo-pericial) nem de PPP (skill auditoria-ppp). Acionar em conjunto com base-analise-decisao-tres-eixos (triagem prévia), base-cpc-fundamentacao-art489, base-cpc-embargos-declaracao, base-cpc-apelacao-efeitos-art1013, base-cpc-agravo-instrumento-art1015, base-recursos-jef, base-recurso-crps-peca-enxuta, base-tnu-admissibilidade-manual, base-precedentes-catalogo-vinculantes e peticao-previdenciaria."
---

## NOTA DE COEXISTÊNCIA (unificação de linhas, Onda 67, 12/07/2026)

O plugin passou a conter duas famílias de skills sobre leitura de peças adversárias, vindas de linhas paralelas de trabalho unificadas na Onda 67. A família base-analise-contestacao-inss com ponte-workflow-replica-contestacao e ponte-workflow-recurso-sentenca, e a família base-auditoria-adversarial-contestacao-inss com base-auditoria-adversarial-decisao-judicial. Enquanto não houver racionalização definitiva pelo escritório, usar as duas de forma complementar e, em caso de conflito de orientação, prevalece a que tiver citação [CONFERIDO] em fonte primária. Não citar em peça nada que apenas uma delas afirme sem selo de conferência.


# Auditoria Adversarial de Decisão Judicial Contrária

## Objetivo

Desconstruir tecnicamente a decisão judicial contrária ao segurado (sentença, acórdão, decisão monocrática, decisão interlocutória) antes de redigir embargos de declaração, apelação, recurso inominado, agravo interno, PUIL, REsp ou qualquer outro recurso. A auditoria roda em cinco etapas sequenciais. Cada etapa gera um produto concreto que alimenta a etapa seguinte. A última etapa entrega os tópicos da peça recursal.

Esta skill não substitui `base-analise-decisao-tres-eixos`, que faz a triagem prévia da decisão em três eixos (preliminares e prejudiciais, vícios de integração, mérito) e define qual peça cabe. Aquela skill responde à pergunta "qual recurso ou incidente cabe agora". Esta skill responde à pergunta "como desmontar o mérito da decisão para vencer o recurso escolhido".

Fluxo obrigatório do escritório. Primeiro, rodar `base-analise-decisao-tres-eixos` para triar. Segundo, se restar mérito a atacar, rodar esta skill sobre o eixo de mérito.

Também não substitui `base-auditoria-adversarial-contestacao-inss`, que audita a manifestação do adversário (contestação, parecer, decisão do CRPS). Esta skill audita a decisão do julgador que acolheu, no todo ou em parte, os argumentos do INSS ou rejeitou os argumentos do segurado.

## Regra Absoluta do Escritório

Toda decisão judicial contrária ao segurado passa por esta auditoria antes de qualquer recurso ser redigido. Não pular etapa. Não redigir a peça recursal direto da leitura superficial da decisão. Não confiar na primeira impressão, muitas decisões parecem sólidas na leitura corrida e revelam quebras técnicas na leitura auditada.

## Etapa 1. Caçador de Falácias

Ler a decisão na íntegra, do início ao fim, e identificar falácias lógicas no raciocínio do julgador. Falácias em decisão judicial costumam ser mais sutis do que em contestação porque vêm com verniz técnico, precisam ser expostas com precisão.

Falácias recorrentes em decisões desfavoráveis ao segurado.

- Espantalho, quando o julgador rebate um argumento que o autor não fez, ignorando a tese realmente deduzida na inicial ou nas razões recursais.
- Petição de princípio, quando o julgador afirma como premissa exatamente o que deveria demonstrar (ex. "o segurado não comprovou a exposição" sem enfrentar o PPP juntado).
- Falsa correlação, quando o julgador extrai conclusão desfavorável de fato secundário desconectado do requisito legal (ex. baixa escolaridade como indício de fraude documental).
- Generalização indevida, quando o julgador aplica precedente ou entendimento a caso com base fática diversa sem demonstrar identidade.
- Ad hominem processual disfarçado, quando o julgador desqualifica a prova por presunções sobre o autor ou o patrono em vez de enfrentá-la tecnicamente.
- Argumento de autoridade nu, quando o julgador cita doutrina ou precedente como se bastasse a citação, sem confrontar os fundamentos determinantes com o caso.
- Non sequitur, quando a conclusão do dispositivo não decorre logicamente das premissas assentadas na fundamentação.

Para cada falácia localizada, registrar o trecho exato da decisão (com número da folha ou parágrafo), a falácia identificada e a explicação de por que o raciocínio está quebrado. Nunca apontar falácia inexistente para preencher a lista. Se a decisão for tecnicamente sólida, dizer isso honestamente e concentrar o recurso em eventuais divergências de mérito ou de interpretação sem simular vícios.

## Etapa 2. Filtro de Blefes

Montar tabela de duas colunas.

Primeira coluna, cada afirmação factual feita pelo julgador na fundamentação (ex. "o CNIS não registra vínculo no período", "não há laudo médico atestando incapacidade permanente", "o PPP não indica exposição a agente nocivo em intensidade superior ao limite legal").

Segunda coluna, verificação se a afirmação está ancorada em documento identificável nos autos ou é assertiva sem lastro. Consultar cada documento juntado, cruzar com o teor exato da fundamentação, apontar divergência.

Destacar em negrito toda afirmação fática do julgador que contrarie documento juntado, ou que ignore documento juntado, ou que cite documento inexistente. Isso configura ERRO DE FATO (art. 966, VIII do CPC quando cabível em rescisória; ou omissão passível de embargos de declaração no art. 1.022, II c/c art. 489, §1º, IV do CPC), a ser explorado na peça recursal.

Contestação padronizada do INSS induz decisão padronizada. Se a decisão apenas replicou a impugnação genérica do INSS sem enfrentar as provas específicas, nomear expressamente como decisão sem enfrentamento efetivo, com cruzamento à skill `base-cpc-fundamentacao-art489`.

## Etapa 3. Detector de Contradições Internas

Fazer leitura cruzada da própria decisão, comparando o que o julgador afirma em cada bloco.

Padrões comuns de contradição interna em decisão desfavorável.

- Reconhecer a qualidade de segurado no relatório e negá-la na fundamentação sem indicar o momento da perda.
- Admitir a existência da doença ou da sequela num trecho e negar a repercussão funcional em outro, sem esclarecer o critério de distinção.
- Reconhecer o preenchimento parcial dos requisitos e negar o benefício sem apreciar pedido sucessivo cabível (fungibilidade), o que caracteriza omissão apta a embargos de declaração.
- Aplicar precedente contra o segurado num tópico e, no tópico seguinte, admitir situação fática que o próprio precedente ressalva como excepcional a favor do segurado.
- Reformar a sentença por um fundamento e, no dispositivo, adotar solução incompatível com esse mesmo fundamento (contradição entre fundamentação e dispositivo, típica de acórdão apto a embargos declaratórios).

Para cada contradição, registrar os dois trechos exatos em confronto, com folha ou parágrafo, e a conclusão sobre qual das duas afirmações favorece o segurado. Atenção especial ao critério do art. 1.022, parágrafo único, II do CPC, contradição interna do julgado autoriza embargos de declaração, contradição EXTERNA entre o decidido e a prova ou entre o decidido e a jurisprudência divergente NÃO autoriza embargos, autoriza recurso próprio. Cruzar com `base-cpc-embargos-declaracao` para escolher a via correta.

## Etapa 4. Aniquilador de Ementas (Distinguishing)

Quando a decisão citar precedente, súmula, tema ou acórdão para sustentar a solução contrária ao segurado, aplicar o seguinte procedimento antes de qualquer resposta.

Primeiro, conferir o precedente citado pelo juiz ou pelo colegiado no catálogo do escritório (skill `base-precedentes-catalogo-vinculantes`). Verificar status atual, vigente, superado, cancelado, suspenso ou aguardando julgamento. Se o precedente estiver superado, cancelado ou modulado e a decisão o citar como fundamento vigente e aplicável, isso é falha grave de dupla natureza, ausência de fundamentação idônea (art. 489, §1º, V do CPC) e error in judicando, a ser explorado no recurso.

Segundo, se o precedente estiver vigente, comparar os fundamentos determinantes do precedente (ratio decidendi) com a base fática do caso concreto. Extrair do próprio precedente os elementos fáticos que motivaram a tese (agente nocivo específico, tipo de prova, época dos fatos, tipo de benefício, condição pessoal do requerente) e demonstrar, ponto a ponto, a diferença em relação ao caso do cliente. Precedente sem os mesmos fundamentos determinantes não vincula. Cruzar com `pedilef-cotejo-analitico-tnu` e `base-tnu-admissibilidade-manual` quando o recurso for PUIL, para preparar o cotejo analítico exigido pela TNU.

Terceiro, se a decisão IGNOROU precedente favorável ao segurado indicado na inicial ou nas razões recursais, esse é ponto de omissão relevante (art. 489, §1º, VI do CPC) apto a embargos de declaração com prequestionamento e, na sequência, apelação, recurso inominado ou PUIL conforme o rito.

Quarto, redigir o distinguishing ou a arguição de violação a precedente em bloco autônomo, primeiro citando a tese e os fundamentos determinantes, depois demonstrando a diferença ou a violação, sempre com base fática comparada.

Nunca aceitar a aplicação do precedente pela decisão sem essa conferência. Nunca desistir da tese apenas porque o julgador colou uma ementa.

## Etapa 5. Redação Final do Recurso ou Incidente

Com base nas etapas anteriores, redigir os tópicos da peça recursal (embargos de declaração, apelação, recurso inominado, agravo interno, agravo de instrumento, PUIL, REsp) conforme o rito e o resultado da triagem feita em `base-analise-decisao-tres-eixos`.

Estrutura recomendada, cada tópico corresponde a um achado da auditoria, ajustado ao objeto do recurso escolhido.

Primeiro tópico, das falácias identificadas na etapa 1, demonstrando a quebra lógica do raciocínio do julgador. Em embargos declaratórios, apontar como obscuridade ou omissão de premissa. Em apelação ou inominado, apontar como error in judicando.

Segundo tópico, das afirmações fáticas sem lastro identificadas na etapa 2, aplicando o art. 489, §1º do CPC contra a decisão que se limitou a repetir a impugnação padronizada. Em ED com prequestionamento, requerer explicitamente o enfrentamento de cada documento ignorado.

Terceiro tópico, das contradições internas identificadas na etapa 3, com cuidado técnico de distinguir contradição interna (embargos declaratórios) de contradição externa (recurso próprio). Cruzar com `base-cpc-embargos-declaracao` para a redação enxuta em 1 a 2 páginas quando for ED.

Quarto tópico, do distinguishing dos precedentes citados na etapa 4, afastando a aplicação ao caso concreto com base fática comparada, ou arguindo violação a precedente ignorado. Em PUIL, ajustar ao cotejo analítico do art. 14 do RITNU. Em REsp, ao dissídio jurisprudencial ou à violação a lei federal com prequestionamento.

Tom técnico, firme e sem adjetivação vazia. Confronto direto entre prova documental, norma e fato concreto. Sem retórica abstrata. Seguir as regras de estilo do escritório, sem travessão, sem dois-pontos introduzindo lista ou conclusão, sem a estrutura "não é X, é Y", parágrafos curtos, referências por folha ou parágrafo da decisão.

## Adaptação por Peça Recursal

### Embargos de Declaração

Aplicar as etapas 2 e 3 em primeiro plano, filtro de blefes e contradições internas rendem naturalmente omissão e contradição interna, hipóteses de cabimento do art. 1.022 do CPC. Etapa 4 entra para arguir omissão por precedente ignorado. Peça enxuta, 1 a 2 vícios por bloco, 1 a 2 páginas totais. Cruzar com `base-cpc-embargos-declaracao`.

### Recurso Inominado no JEF

Aplicar todas as etapas em versão condensada, priorizar contradição interna e distinguishing porque a TR trabalha em pauta ágil. Prequestionamento explícito para eventual PUIL. Cruzar com `base-recursos-jef` e `base-jef-trf3-manual-2025` quando for TRF3.

### Apelação em rito ordinário federal

Aplicar todas as etapas com fundamentação normativa completa. Sustentar teoria da causa madura do art. 1.013, §3º do CPC quando cabível para pedir julgamento direto do mérito pelo TRF. Cruzar com `base-cpc-apelacao-efeitos-art1013` e `base-rito-ordinario-trf`.

### Agravo Interno

Priorizar etapa 2 (afirmações sem lastro) e etapa 3 (contradições) da decisão monocrática, e apontar violação ao contraditório se a decisão do relator não enfrentou argumentos essenciais. Cruzar com `base-cpc-agravo-instrumento-art1015` e com o rito específico.

### Agravo de Instrumento

Etapa 4 e etapa 3 são as mais úteis para atacar decisão interlocutória urgente, priorizar demonstração de probabilidade do direito e periculum e distinguishing quando a decisão negou tutela citando precedente inadequado. Cruzar com `base-cpc-agravo-instrumento-art1015`.

### PUIL

Etapa 4 é a coluna vertebral, cotejo analítico com paradigma válido. Cruzar com `base-tnu-admissibilidade-manual`, `pedilef-cotejo-analitico-tnu` e `base-puil-pedilef-vedacao-materia-processual` para não incorrer em Súmula 43/TNU (matéria processual) nem em Súmula 42/TNU (reexame de fato).

### Recurso Especial ao STJ

Etapa 4 no formato de dissídio jurisprudencial ou violação a lei federal, com prequestionamento explícito. Não esquecer o RESUMO ANALÍTICO obrigatório do art. 343-A do RISTJ, cruzar com `base-rito-ordinario-trf/references/ART-343-A-RISTJ-RESUMO-ANALITICO.md`.

## Interação com Outras Skills

### base-analise-decisao-tres-eixos

Skill anterior obrigatória. Faz a triagem em preliminares, vícios de integração e mérito, define qual peça cabe. Esta skill (auditoria adversarial) atua no eixo de mérito depois da triagem.

### base-cpc-fundamentacao-art489

Fundamento normativo da etapa 2 (afirmações sem lastro) e da etapa 4 (precedente sem fundamentos determinantes). Toda decisão que se enquadre no art. 489, §1º do CPC é decisão sem fundamentação válida, aberta a arguição de nulidade.

### base-cpc-embargos-declaracao

Vinculação direta com a etapa 3 (contradições internas). Ajuda a distinguir vícios de integração (ED) de erros de mérito (recurso próprio) e a redigir peça enxuta.

### base-cpc-apelacao-efeitos-art1013 e base-cpc-agravo-instrumento-art1015

Suporte para dimensionar o efeito devolutivo, o efeito translativo e a causa madura no TRF, ou o cabimento do agravo com base no rol do art. 1.015 e na taxatividade mitigada (Tema 988/STJ).

### base-recursos-jef, base-jef-previdenciario, base-jef-trf3-manual-2025

Suporte para inominado, IUJEF e PUIL no rito do JEF.

### base-tnu-admissibilidade-manual, pedilef-cotejo-analitico-tnu, base-puil-pedilef-vedacao-materia-processual

Suporte para PUIL na TNU.

### base-precedentes-catalogo-vinculantes

Consulta obrigatória na etapa 4, para conferir status, tese e ratio decidendi dos precedentes citados pelo julgador.

### base-auditoria-adversarial-contestacao-inss

Skill irmã. Quando o julgador replicou os fundamentos da contestação ou do parecer, a auditoria feita nesta skill pode se alimentar dos achados registrados naquela.

### peticao-previdenciaria e base-peticao-previdenciaria-padrao-visual

A peça recursal final segue o padrão visual do escritório.

### base-revisao-peticao-aprofundada

Após a redação final, submeter a peça à revisão aprofundada antes de protocolar.

## Alertas Automáticos

**ALERTA 1.** Se a decisão não citar nenhum precedente, pular a etapa 4 e registrar essa ausência, sem forçar distinguishing sobre precedente inexistente. Ao mesmo tempo, ausência de precedente na fundamentação pode configurar violação ao art. 489, §1º, V ou VI do CPC quando houver precedente aplicável ao caso.

**ALERTA 2.** Se o precedente citado pelo julgador estiver desatualizado, superado, cancelado ou modulado conforme o catálogo do escritório, esse é o ponto de maior força argumentativa e deve abrir o tópico principal do recurso.

**ALERTA 3.** Se a auditoria não encontrar falácia, contradição ou blefe relevante, informar isso com honestidade e não inflar o recurso com apontamentos frágeis. Recurso de má qualidade contra decisão tecnicamente sólida enfraquece a posição do cliente e pode gerar honorários recursais.

**ALERTA 4.** Se a decisão for de acórdão de Turma Recursal ou de TRF, verificar prazo do recurso subsequente ANTES de rodar as etapas, priorizando embargos de declaração se o prazo estiver curto e houver omissão evidente, para interromper o prazo do recurso principal.

**ALERTA 5.** Se a decisão for monocrática (relator ou juiz singular em pauta), verificar se cabe agravo interno ou se o caso comporta ED antes do agravo, com base no regimento aplicável (RITNU, RI do TRF, RI do STJ).

**ALERTA 6.** Se a decisão foi proferida sem contraditório sobre ponto essencial (decisão surpresa, art. 9º e 10 do CPC), acrescentar tópico específico de nulidade por violação ao contraditório. Cruzar com `base-cpc-nulidades-cerceamento`.

## Checklist de Validação

Antes de finalizar o recurso, verificar.

1. Cada falácia apontada tem trecho exato da decisão e explicação da quebra lógica.
2. Cada afirmação fática sem lastro está identificada com o documento que a contraria ou com a ausência de documento que a suporte.
3. Cada contradição interna traz os dois trechos exatos em confronto, com folha ou parágrafo.
4. A distinção entre contradição interna (ED) e contradição externa (recurso próprio) foi respeitada.
5. Cada precedente citado pela decisão foi conferido no catálogo, com status atual verificado, antes do distinguishing.
6. O distinguishing compara os fundamentos determinantes do precedente com o caso concreto, não apenas afirma diferença.
7. Precedentes favoráveis ao segurado que foram IGNORADOS pela decisão estão arguidos como omissão do art. 489, §1º, VI do CPC.
8. O prequestionamento foi explicitado quando o recurso for PUIL, REsp ou RE.
9. Nenhuma falácia, contradição ou blefe foi inventado para preencher a peça.
10. A proibição de dois-pontos, travessão e "não é X, é Y" está observada.
11. Em REsp ao STJ, foi incluído o RESUMO ANALÍTICO obrigatório do art. 343-A do RISTJ.
12. O padrão visual do escritório foi observado no .docx final.
