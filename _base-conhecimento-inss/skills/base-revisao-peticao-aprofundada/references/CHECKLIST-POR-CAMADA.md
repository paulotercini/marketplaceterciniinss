# Checklist por Camada - Revisão Aprofundada

Checklist exaustivo de cada uma das 5 camadas da revisão aprofundada. Use como referência operacional ANTES de finalizar o relatório de revisão.

## CAMADA 1 - CONFORMIDADE FORMAL

### 1.1 Formatação e Padrão Visual

- [ ] Formato A4.
- [ ] Margens 851/1134/1560/1134 twips (esquerda/topo/cabeçalho/rodapé).
- [ ] Fonte Bookman Old Style 12pt no corpo.
- [ ] Espaçamento entre linhas 1,5.
- [ ] Cabeçalho timbrado presente com logo do escritório.
- [ ] Identificação em Bell MT 24pt e Arial Unicode MS conforme padrão.
- [ ] Títulos de seção em tabelas pretas com texto branco em negrito.
- [ ] Recuo de parágrafo. 2 cm para rito judicial. 4 cm para CRPS.
- [ ] Rodapé do escritório (Paulo Roberto Tercini Filho, OAB/SP 331.110, endereço, contatos).

### 1.2 Proibição de Dois-Pontos Lógicos

- [ ] Não há uso de dois-pontos para introduzir explicações.
- [ ] Não há uso de dois-pontos para introduzir listas (usar parágrafos independentes ou conjunções).
- [ ] Não há uso de dois-pontos para introduzir fundamentos.
- [ ] Não há uso de dois-pontos para introduzir conclusões.
- [ ] Dois-pontos apenas em citações literais que originalmente o continham.

### 1.3 Referenciação Documental

- [ ] Todo documento citado tem ID (ex. "CNIS - ID 13476890").
- [ ] Vedado "conforme documentos em anexo" sem ID.
- [ ] Vedado "documentos juntados na inicial" sem identificação específica.
- [ ] Em PJe, formato "(ID XXXXXXXX)" ou "(doc. ID XXXXXXXX)".

### 1.4 Estrutura Mínima por Tipo de Peça

**Petição inicial JEF.**
- [ ] Endereçamento à Vara JEF correta.
- [ ] Qualificação completa do autor.
- [ ] Valor da causa (limite 60 SM ou renúncia ao excedente).
- [ ] Fatos, fundamentos, pedidos, provas.
- [ ] Pedido de gratuidade da justiça se aplicável.

**Petição inicial rito ordinário.**
- [ ] Idem JEF.
- [ ] Acrescentar requerimento de citação na forma da lei.
- [ ] Indicação se há pedido de tutela provisória.

**Recurso inominado.**
- [ ] Endereçamento à Turma Recursal.
- [ ] Razões recursais com impugnação especificada (dialeticidade).
- [ ] Pedido de reforma da sentença.
- [ ] Prequestionamento para PUIL futuro.

**PUIL/PEDILEF.**
- [ ] Endereçamento à Turma Nacional de Uniformização.
- [ ] Indicação da hipótese de cabimento (art. 12 §1º RITNU).
- [ ] Paradigma indicado expressamente com cópia legível.
- [ ] Cotejo analítico em duas etapas (fato + tese).
- [ ] Prequestionamento.
- [ ] Pedido de não incidência das Súmulas 42 e 43/TNU.

**Recurso ordinário ao CRPS.**
- [ ] Endereçamento à Junta de Recursos.
- [ ] Dialeticidade contra a decisão administrativa.
- [ ] Pedido de provimento.

**Recurso especial ao CRPS.**
- [ ] Endereçamento à Câmara de Julgamento.
- [ ] Indicação da contrariedade a Enunciado ou orientação consolidada.
- [ ] Dialeticidade contra o acórdão da JR.

**Mandado de segurança.**
- [ ] Endereçamento ao juízo competente.
- [ ] Indicação da autoridade coatora.
- [ ] Direito líquido e certo com prova pré-constituída.
- [ ] Pedido liminar com fumus boni iuris e periculum in mora.
- [ ] Tempestividade (prazo decadencial 120 dias).

**Réplica.**
- [ ] Seção 1. Delimitação de pontos controvertidos/incontroversos.
- [ ] Seção 2. Réplica compartimentalizada.
- [ ] Seção 3. Reconsideração de tutela quando aplicável.
- [ ] Seção 4. Pedidos de prova direcionados.

**Memorial.**
- [ ] Limite de duas páginas.
- [ ] Framework EVO (Essencial, Visual, Organizado).
- [ ] Questão central, fundamento para reforma, provas e resultados, pedido final.

## CAMADA 2 - CONFORMIDADE NORMATIVA

### 2.1 Verificação de Normas Primárias

Para CADA citação de Lei, Decreto, IN, Portaria, EC ou LC, aplicar protocolo de 5 níveis.

- [ ] Nível 1. Existência. Abrir arquivo correspondente em `base-legislacao-fontes-primarias`. Buscar artigo.
- [ ] Nível 2. Vigência. Conferir notas de "Revogado" ou "Vide".
- [ ] Nível 3. Redação literal. Copiar exato com nota de redação.
- [ ] Nível 4. Modulação. Conferir efeitos retroativos ou prospectivos.
- [ ] Nível 5. Número de processo. Conferir órgão, data, relator.

### 2.2 Verificação de Precedentes

Para CADA citação de Tema STF/STJ/TNU, Súmula, IRDR, IAC, Enunciado CRPS.

- [ ] Tema/Súmula existe e está VIGENTE.
- [ ] Tese literal corresponde à fixada no julgamento.
- [ ] Número do processo está correto.
- [ ] Órgão julgador está correto.
- [ ] Relator e data estão corretos.
- [ ] Não há overruling posterior (Tema 503/STF, Súmula 86/TNU cancelada, etc).
- [ ] Modulação verificada (Tema 1102/STF e outros).
- [ ] Aplicação ao caso concreto é pertinente.

### 2.3 Verificações Automáticas Obrigatórias

- [ ] Competência territorial e material verificada.
- [ ] Política de tutela de urgência aplicada (se peça inicial).
- [ ] Tema 1124/STJ verificado (se concessão ou revisão).
- [ ] Prazo decadencial verificado (se revisão).
- [ ] Documentação IN 128 verificada.
- [ ] BPC menor 16 anos com critérios diferenciados.
- [ ] Tempestividade recursal verificada.
- [ ] CNIS cruzado com documentação.
- [ ] Cálculo previdenciário só com dados completos.

### 2.4 Hub de Acionamento de Skills

Conforme tipo de peça, verificar se as skills abaixo foram acionadas pela skill geradora.

- [ ] `base-legislacao-fontes-primarias` (sempre que houver citação de norma).
- [ ] `precedentes-previdenciarios` (sempre que houver citação de precedente).
- [ ] `tema-1124-instrucao-administrativa` (concessão/revisão).
- [ ] `decadencia-revisao-previdenciaria` (revisão de benefício concedido).
- [ ] `ms-competencia-autoridade-coatora` (MS).
- [ ] `base-tnu-admissibilidade-manual` (PUIL/PEDILEF).
- [ ] `pedilef-cotejo-analitico-tnu` (PUIL/PEDILEF).
- [ ] `documentos-comprobatorios-in128` (matriz probatória).
- [ ] `auditoria-ppp` (aposentadoria especial com PPP).
- [ ] `base-portarias-dpmf-inss-hub` (citação de Portarias DPMF).
- [ ] `analise-documental-incapacidade` (B31/B91/B94).
- [ ] `reafirmacao-der` (concessão com requisitos completados após DER).
- [ ] `admissibilidade-barreiras-crps` (recurso CRPS).
- [ ] `base-cpc-honorarios-sucumbencia-previdenciaria` (honorários).
- [ ] `base-juros-correcao-monetaria` (juros e correção).
- [ ] `tributacao-beneficios-previdenciarios` (IR sobre atrasados).

## CAMADA 3 - COERÊNCIA FÁTICA

### 3.1 Suporte Documental

- [ ] Cada afirmação fática tem documento de suporte por ID.
- [ ] Datas declaradas conferem com documentos.
- [ ] Vínculos empregatícios declarados conferem com CNIS.
- [ ] Valores declarados conferem com documentos.
- [ ] Períodos declarados conferem com documentos.

### 3.2 Documentos Ignorados

- [ ] Documento relevante anexado ao processo NÃO foi citado na peça.
- [ ] Documento relevante mencionado na narrativa fática NÃO foi juntado.
- [ ] Documento que sustenta tese principal NÃO foi mencionado no momento da tese.
- [ ] Documento que enfraquece tese NÃO foi confrontado (escondido).

### 3.3 Classificação de Fatos (Componente Visual Law 3)

Para CADA fato classificado como "incontroverso".

- [ ] O fato decorre de documento objetivo irrefutável (CNIS, certidão oficial), OU
- [ ] O fato não foi impugnado pelo INSS em decisão administrativa, contestação ou manifestação.

Achado BLOQUEANTE quando.

- [ ] Fato classificado como "incontroverso" foi expressamente NEGADO pelo INSS.
- [ ] Fato classificado como "incontroverso" depende de prova testemunhal ainda não produzida.

### 3.4 Cruzamento com CNIS

Quando CNIS estiver disponível.

- [ ] Vínculos do CNIS conferem com a narrativa fática.
- [ ] Indicadores de pendência (PEXT, PREC-MENOR-MIN, PVIN-IRREG etc) foram analisados.
- [ ] Períodos de hiato no CNIS foram explicados.
- [ ] Atividades concomitantes do CNIS foram declaradas.

## CAMADA 4 - QUALIDADE ARGUMENTATIVA

Ver o catálogo completo de 22 anti-patterns no arquivo `CATALOGO-ANTI-PATTERNS.md`. Resumo abaixo.

- [ ] 1. Fundamentação principiológica sem ancoragem fática.
- [ ] 2. Pedidos sem correspondência com fatos.
- [ ] 3. Argumentação repetitiva.
- [ ] 4. Ausência de confronto direto entre prova e tese.
- [ ] 5. Argumentação genérica (superlativos sem fato).
- [ ] 6. Excesso de jurisprudência transcrita.
- [ ] 7. Urgência sinalizada por formatação.
- [ ] 8. Títulos burocráticos genéricos.
- [ ] 9. Réplica respondendo ponto a ponto.
- [ ] 10. Memorial com mais de duas páginas.
- [ ] 11. Excesso de destaques (Von Restorff).
- [ ] 12. Latim desnecessário.
- [ ] 13. Teste do leigo na seção fática.
- [ ] 14. Cotejo analítico ausente em PUIL.
- [ ] 15. Paradigma de TRF em PUIL.
- [ ] 16. Portaria 992/2022 como cálculo de RMI.
- [ ] 17. Súmula 86/TNU como vigente.
- [ ] 18. Revisão da Vida Toda sem mencionar modulação.
- [ ] 19. Pedido genérico de tutela.
- [ ] 20. Petição sem seção de Efeitos Financeiros.
- [ ] 21. Discussão de matéria processual em PUIL.
- [ ] 22. Citação de norma sem leitura do arquivo verificado.

## CAMADA 5 - INTEGRIDADE PROBATÓRIA

### 5.1 Provas Documentais

- [ ] Cada documento juntado tem referência por ID na peça.
- [ ] Cada documento que sustenta tese é citado no momento da tese.
- [ ] Documentos que enfraquecem a tese estão sendo confrontados.
- [ ] Documentos pendentes de juntada estão sendo pleiteados.

### 5.2 Pedidos de Prova

- [ ] Pedidos de prova são direcionados a fatos específicos.
- [ ] Em réplicas, a especificação de provas segue `especificacao-provas`.
- [ ] Vedado "protesta por todas as provas em direito admitidas" sem direcionamento.
- [ ] Perícia técnica solicitada com indicação do quesito a ser respondido.

### 5.3 Cruzamentos Críticos por Tema

**Aposentadoria especial.**
- [ ] PPP cruzado com LTCAT.
- [ ] PPP cruzado com PGR.
- [ ] PPP cruzado com Súmulas e Temas relevantes (Tema 555/STF EPI, Tema 174/TNU ruído).

**BPC/LOAS.**
- [ ] IFBrM/TCQ cruzado com prontuários médicos.
- [ ] Grupo familiar cruzado com CadÚnico atualizado.
- [ ] Renda per capita cruzada com documentos de renda.

**Tempo rural.**
- [ ] Início de prova material com data inicial documentada.
- [ ] Cobertura temporal da prova material adequada ao período pleiteado.
- [ ] Testemunhas indicadas se a prova material for fragmentária.

**União estável.**
- [ ] Prova material da convivência.
- [ ] Temporalidade da prova (contemporaneidade ao período).
- [ ] Início de prova material adequado.

**Incapacidade B31/B91/B94.**
- [ ] Laudos médicos por especialidade adequada ao CID.
- [ ] Análise documental conforme Portarias 13, 14 e 15/2026.
- [ ] CID e laudo em consistência com a tese de incapacidade.
- [ ] Para B94, sequela consolidada documentada.

## CONCLUSÃO DA REVISÃO

Após percorrer as 5 camadas, sintetizar.

- [ ] Total de achados BLOQUEANTES.
- [ ] Total de achados CRÍTICOS.
- [ ] Total de achados IMPORTANTES.
- [ ] Total de achados MENORES.
- [ ] Skills mencionadas no relatório como NÃO ACIONADAS pela skill geradora.

Se houver BLOQUEANTES, alertar com selo "PEÇA NÃO DEVE SER PROTOCOLADA" no topo do relatório.

Se houver apenas CRÍTICOS, IMPORTANTES ou MENORES, perguntar sobre correção automática.

Se não houver achados, registrar conformidade integral.
