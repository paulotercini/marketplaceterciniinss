---
name: ponte-workflow-crps
description: "Workflow pró-segurado de recurso ao CRPS (Junta de Recursos e Câmara de Julgamento), costurando admissibilidade, instrução, mérito vinculante e produção da peça recursal no padrão CRPS. Use SEMPRE que mencionar workflow CRPS, pipeline CRPS, recurso ordinário CRPS, recurso especial CRPS, JR Junta de Recursos, CAJ Câmara de Julgamento, embargos CRPS, agravo CRPS, sustentação oral Fala.BR, PUJ Conselho Pleno, art. 89 art. 90 art. 91, Portaria 462/2026 admissibilidade. Cruza com admissibilidade-barreiras-crps, incidentes-instrucao-crps, recursos-superiores-crps, peticao-previdenciaria. NÃO use para mandado de segurança, ação judicial originária ou recursos no JEF."
---

# Workflow CRPS

## 1. Quando acionar

Sempre que houver decisão administrativa do INSS recorrível ao CRPS. Inclui recurso ordinário contra decisão do INSS, recurso especial às Câmaras de Julgamento, embargos, revisão de acórdão, agravo, PUJ ao Conselho Pleno e Reclamação.

## 2. Pipeline executável

### Passo 1. Triagem do ato recorrido

Identificar o ato. Indeferimento administrativo, cessação, revisão de ofício, decisão da JR (para recurso especial), acórdão da CAJ (para PUJ).

Localizar protocolo, data de ciência, prazo recursal.

### Passo 2. Admissibilidade primeiro

Acionar `admissibilidade-barreiras-crps` antes de qualquer mérito. Verificar tempestividade, legitimidade, interesse recursal, perda de objeto, renúncia por ação judicial com identidade de partes, causa de pedir e pedido (art. 86 do RICRPS; Lei 8.213/1991, art. 126, § 3º) e a restrição do art. 112, § 7º (revisão sem elemento novo).

Quando houver risco de não conhecimento, planejar relevação de intempestividade ou fungibilidade entre recursos.

### Passo 3. Estratégia de competência

Recurso contra decisão do INSS (APS ou CEAB) vai à JR. Recurso especial contra acórdão de JR vai à CAJ, salvo matéria de alçada exclusiva (art. 89, § 3º) e decisão de diligência (art. 90, § 2º).

Acionar `base-crps-panorama-geral` para mapa do regimento.

### Passo 4. Fundamentação normativa do mérito

Acionar a skill base-* específica do benefício e do tema controvertido. A pesquisa normativa vai até o fim, mas a peça leva apenas a norma que a decisão contrariou ou de que o pedido depende, por remissão curta e em linguagem simples, e cada tópico abre pelo fato e pelo erro da decisão.

Aposentadoria especial. Skills `base-especial-*` correspondentes.
Incapacidade. Skills `base-incapacidade-*` ou `base-auxilio-acidente-b94-*`.
BPC. Skills `base-bpc-*`.
Pensão. Skills `base-pensao-*`.
Revisões. Skills `base-revisao-*`.
Aposentadorias. Skills `base-aposentadoria-*`, `base-calculo-rmi-ec103`.

### Passo 5. Precedentes vinculantes

Acionar `precedentes-previdenciarios` para identificar súmulas, temas repetitivos, repercussão geral e enunciados do CRPS aplicáveis. Indicar expressamente os pareceres vinculantes (art. 108 do RICRPS) quando houver.

Quando o tema envolver normas vinculantes do CRPS (art. 114 RICRPS), citar resolução ou enunciado.

### Passo 6. Incidentes processuais

Omissão, contradição, obscuridade, ambiguidade ou erro material em acórdão: embargos (art. 92).

Violação literal de lei ou decreto, divergência de parecer vinculante ou enunciado, ou vício insanável: revisão de acórdão (art. 116). Inadmissão de PUJ ou de reclamação: agravo (art. 93).

Acionar `incidentes-instrucao-crps`.

### Passo 7. Sustentação oral e diligências

Quando relevante, requerer sustentação oral via Fala.BR. Avaliar pedido de diligência para juntada de documentos novos. Acionar `incidentes-instrucao-crps`.

### Passo 8. Recurso especial e PUJ

Quando o caso comportar recurso especial à CAJ, acionar `recursos-superiores-crps` e enquadrar o pedido de anulação no art. 91, § 1º, se houver.

Quando houver divergência entre Câmaras, ou entre Juntas em matéria de alçada, planejar PUJ ao Conselho Pleno, com acórdão paradigma dos últimos três anos (art. 122). Acionar `recursos-superiores-crps`.

### Passo 9. Verificações obrigatórias

Tema 1124/STJ via `tema-1124-instrucao-administrativa` para evitar recurso sobre matéria não levada à instrução administrativa.

Decadência de revisão via `decadencia-revisao-previdenciaria`.

Documentos comprobatórios via `base-documentos-comprobatorios-in128` para juntada complementar.

CNIS via `base-cnis-acerto-indicadores` para divergências cadastrais que sustentem o recurso.

### Passo 10. Redação da peça e revisão

Acionar `base-recurso-crps-peca-enxuta` para diretrizes de redação enxuta, direta e clara no padrão CRPS pró-segurado. A peça deve ser puramente fundada em normativo (Constituição, leis, decretos, IN 128/2022, Portarias DIRBEN/INSS, Portaria MPS 125/2026 RICRPS, Pareceres CONJUR/AGU vinculantes, Enunciados, Resoluções e Súmulas do CRPS), com vedação ao uso de julgados judiciais como fundamento principal.

Acionar `peticao-previdenciaria` ou `base-peticao-previdenciaria-padrao-visual` no padrão administrativo (opção `--crps`: recuo de primeira linha de 4 cm, Bookman Old Style 12pt, espaçamento 1,5).

Tamanho típico esperado.
- Recurso ordinário. 3 a 6 páginas.
- Recurso especial. 5 a 8 páginas.
- Embargos. 1 a 2 páginas, máximo 3.

Acionar `base-revisao-peticao-aprofundada` para auditoria pós-redação. Atenção especial aos anti-patterns 5 (argumentação genérica), 6 (excesso de jurisprudência judicial transcrita) e 11 (excesso de destaques).

## 3. Documentos essenciais

Decisão recorrida (cópia). Comprovante de ciência. Procuração com poderes específicos para CRPS. CNIS atualizado. Documentação que fundamenta o pedido. Acórdão paradigma quando for recurso especial.

## 4. Pontos críticos pró-segurado

Tempestividade é o primeiro requisito. Intempestividade pode ser superada por relevação quando o direito for líquido e certo nos autos ou nas bases governamentais (RICRPS, art. 112, §§ 1º e 2º), sem diligência (§ 8º). Não confundir com o art. 112 da Lei 8.213/1991, que trata de valores não recebidos em vida.

Renúncia tácita por ação judicial simultânea pode ser evitada com desistência da ação ou esclarecimento da diversidade de causas de pedir.

Pareceres vinculantes da Consultoria Jurídica (art. 108) e enunciados do Conselho Pleno (art. 124) podem ser favoráveis ou desfavoráveis. Mapeá-los antes de recorrer.

Processo pautado para decisão monocrática (art. 110) passa ao colegiado quando se pede sustentação oral (art. 81, § 13).

Diligência prévia ou em mesa pode reverter decisão. Acionar `incidentes-instrucao-crps` para planejar.

## 5. Postura

Pró-segurado. Esgotar a pesquisa normativa, levar à peça apenas o artigo necessário, citar enunciados e pareceres vinculantes e, dos tribunais, apenas o que o art. 109 do RICRPS admite. Usar os incidentes cabíveis e impugnar todo não conhecimento mal fundamentado.

## Hub de portarias administrativas

As Portarias DPMF, DIRBEN e INSS que regem procedimento, cálculo e recurso estão em `base-portarias-dpmf-inss-hub`.

## Decisores simulados no fluxo

Último passo do workflow, antes do protocolo. Recurso ordinário ao `conselheiro-junta-de-recursos`, recurso especial e incidentes ao `conselheiro-camara-de-julgamento`. Se o decisor simulado devolver não conhecimento, o fluxo volta à correção da admissibilidade antes do protocolo.

## MCPs da casa

Pesquisa obrigatória. Norma, súmula, tema, enunciado ou acórdão citado nesta skill nasce [NÃO CONFIRMADO] e só entra em peça, parecer ou orientação depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`. A ordem de consulta dos MCPs (`normas`, `superiores`, `trf3`, `iurisprudencia` e `acervo`) e dos catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) está em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O acervo serve à leitura do que o escritório já sustentou, e o reaproveitamento automático de texto de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Cadeia de cada pedido (regra permanente)

Toda peça produzida com esta skill passa, antes da entrega, pela conferência individual de cada pedido, ligando pedido, fatos, provas por ID, cálculo ou critério e conclusão jurídica, com correção pontual e sem reescrever a peça. Protocolo em `base-revisao-peticao-aprofundada/references/CADEIA-DO-PEDIDO.md` e Fase 2-A da `peticao-previdenciaria`.

Forma da peça: `peticao-previdenciaria/references/ESTILO-MODELO.md`, seção "A mesma peça em todos os ritos".
