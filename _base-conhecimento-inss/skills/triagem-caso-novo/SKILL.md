---
name: triagem-caso-novo
description: "Skill de triagem e classificação de caso novo na advocacia previdenciária. Use SEMPRE que mencionar caso novo, cliente novo, consulta inicial, triagem, qual benefício cabe, que ação propor, que documentos pedir, avaliar viabilidade, estudar caso, aceitar caso, viabilidade do caso, estratégia inicial, plano de ação, ou novo cliente para avaliação. Use quando apresentar dados iniciais de segurado sem especificar skill. Use quando perguntar 'o que faço com esse caso', 'qual o caminho', 'por onde começo', 'esse caso tem chance'. Ponto de entrada do ecossistema, roteia para skills especializadas pertinentes. NÃO use quando já souber exatamente o que quer (ex. 'faça a petição de B31', 'audite esse laudo')."
---

# Triagem de Caso Novo — Escritório Paulo Tercini

## Visão Geral

Esta skill é o ponto de entrada do ecossistema de skills do escritório. Recebe os dados iniciais de um caso novo, classifica o tipo de benefício ou direito em discussão, identifica o rito processual adequado, roteia para as skills especializadas pertinentes e gera um plano de ação estruturado com documentação necessária, riscos iniciais e próximos passos.

Funciona como um roteador inteligente. Não substitui nenhuma skill especializada, mas garante que nenhuma deixe de ser acionada quando pertinente.

## Protocolo de Coleta de Dados

### Dados mínimos obrigatórios

Antes de classificar o caso, coletar os seguintes dados. Se o usuário não fornecer algum, perguntar objetivamente. Não prosseguir com a classificação sem os itens marcados como críticos.

**Dados do segurado (críticos)**
- Idade atual
- Sexo
- Atividade ou profissão atual e anterior
- Situação contributiva atual (empregado, desempregado, autônomo, facultativo, rural, sem contribuição)

**Dados do caso (críticos)**
- Queixa principal do cliente (o que ele quer do INSS)
- Já fez requerimento administrativo? Se sim, qual foi o resultado (deferido, indeferido, cessado, em análise)
- Se indeferido ou cessado, sabe informar o motivo?
- Tem documentos médicos, PPP, CNIS ou outros documentos disponíveis?

**Dados complementares (importantes, mas não bloqueantes)**
- Tempo de contribuição aproximado
- Histórico de benefícios anteriores (já recebeu auxílio-doença, aposentadoria, BPC?)
- Se incapacidade, há CAT registrada?
- Se deficiência, qual tipo e desde quando?
- Composição familiar e renda (para BPC)
- Se aposentadoria especial, quais atividades e agentes nocivos?

### Regra de coleta progressiva

Não bombardear o cliente com todas as perguntas de uma vez. Fazer a coleta em duas rodadas.

**Rodada 1.** Dados críticos. Classificar provisoriamente o caso.

**Rodada 2.** Dados complementares relevantes à classificação provisória. Confirmar ou ajustar a classificação.

Se o usuário enviar documentos (CNIS, carta de indeferimento, laudo, PPP), extrair automaticamente os dados sem perguntar o que já está nos documentos.

## Classificação do Caso

Após a coleta, classificar o caso em uma ou mais das categorias abaixo. Ler o arquivo `references/MAPA-CLASSIFICACAO.md` para a árvore decisória completa com critérios de enquadramento.

### Categorias principais

1. **Incapacidade temporária (B31/B91)** — auxílio por incapacidade temporária
2. **Incapacidade permanente (B32/B92)** — aposentadoria por incapacidade permanente
3. **Auxílio-acidente (B94)** — sequela com redução da capacidade
4. **Aposentadoria especial** — atividade com agentes nocivos
5. **Aposentadoria por tempo de contribuição** — regras de transição EC 103/2019
6. **Aposentadoria por idade urbana** — idade + carência
7. **Aposentadoria por idade rural** — segurado especial ou contribuinte rural
7A. **Aposentadoria por idade híbrida** — soma de períodos rurais e urbanos (art. 48, §3º)
8. **Aposentadoria da pessoa com deficiência (LC 142/2013)** — por tempo ou por idade
9. **BPC/LOAS deficiência** — benefício assistencial PCD
10. **BPC/LOAS idoso** — benefício assistencial 65+
11. **Pensão por morte** — dependentes de segurado falecido
12. **Auxílio-reclusão** — dependentes de segurado preso
13. **Salário-maternidade** — inclusive segurada especial
14. **Revisão de benefício** — qualquer revisão de benefício já concedido
15. **Acerto de CNIS/RAC** — correção de dados no cadastro
16. **Recurso administrativo (CRPS)** — recurso contra decisão do INSS
17. **Mandado de segurança** — contra ato ilegal ou abusivo do INSS
18. **Cumprimento de decisão** — INSS não cumpre decisão judicial ou administrativa
19. **Aposentadoria do professor (RGPS)** — professor da educação básica, regras diferenciadas, Lei 15.326/2026

### Classificação múltipla

Um caso pode ter mais de uma classificação. Exemplo comum é o segurado que precisa de acerto de CNIS para viabilizar aposentadoria por tempo. Ou o segurado incapaz que tem direito a B91 mas foi classificado como B31 e precisa de conversão de espécie. Indicar todas as classificações aplicáveis e a ordem de prioridade estratégica.

## Roteamento de Skills

Após a classificação, acionar automaticamente as skills pertinentes conforme a tabela em `references/MAPA-ROTEAMENTO.md`. O roteamento não é exaustivo. Se durante a análise surgir necessidade de skill não prevista na tabela, acionar igualmente.

### Skills universais (acionadas em TODO caso)

Estas skills são acionadas independentemente da classificação.

- **documentos-comprobatorios-in128** — documentação obrigatória por categoria e espécie
- **precedentes-previdenciarios** — temas vinculantes aplicáveis ao caso
- **cartas-documentos-previdencia** — gerar lista de documentos para o cliente
- **inss-canais-atendimento** — orientar canal adequado se for via administrativa
- **requerimento-administrativo-inss** — quando o caso exigir requerimento administrativo, gerar peça no formato adequado ao servidor do INSS (linguagem instrutiva, normas internas, formato tabular)

### Skills condicionais (acionadas conforme classificação)

Ler `references/MAPA-ROTEAMENTO.md` para a tabela completa de roteamento por classificação.

## Determinação do Rito e Foro

### Árvore de decisão processual

**Caso sem requerimento administrativo**
→ Orientar requerimento administrativo primeiro (Tema 350/STF, Tema 1124/STJ)
→ Acionar `requerimento-administrativo-inss` para gerar o requerimento no formato adequado ao servidor do INSS
→ Exceção para MS quando o ato ilegal é a recusa de protocolo ou exigência abusiva
→ Acionar `inss-canais-atendimento` para o canal correto
→ Acionar `cartas-documentos-previdencia` para a lista de documentos

**Caso com indeferimento ou cessação**
→ Avaliar viabilidade de recurso administrativo vs. ação judicial
→ Se recurso administrativo, verificar tempestividade (30 dias) e acionar skills do CRPS
→ Se ação judicial, definir valor da causa para escolha do rito
→ Valor até 60 salários mínimos → JEF (36ª Subseção, Catanduva)
→ Valor acima de 60 SM → Rito ordinário federal (36ª Subseção, Catanduva)
→ Se MS, acionar `ms-competencia-autoridade-coatora`

**Caso com benefício concedido mas incorreto**
→ Classificar como revisão
→ Acionar `decadencia-revisao-previdenciaria` imediatamente para verificar prazo

**Caso acidentário (B91/B92/B94)**
→ Verificar se a competência é da Justiça Estadual (TJSP) ou Federal
→ Acidentárias contra o INSS → Vara da Fazenda Pública (TJSP) ou Núcleo de Justiça 4.0
→ Acionar `ntep-nexo-acidentario` para análise de nexo

### Alertas automáticos de rito

Gerar alerta quando identificar qualquer das seguintes situações.

**ALERTA — Requerimento administrativo ausente.** Tema 350/STF exige prévio requerimento. Orientar requerimento antes de ajuizar, salvo se o caso se enquadrar nas dispensas previstas no Tema 350.

**ALERTA — Tempestividade recursal.** Se o cliente trouxer carta de indeferimento, calcular o prazo de 30 dias para recurso ordinário ao CRPS. Se menos de 10 dias restantes, alertar urgência.

**ALERTA — Decadência.** Se revisão de benefício, calcular prazo do art. 103 da Lei 8.213/91 a partir do primeiro pagamento. Se menos de 12 meses restantes, alertar em destaque.

**ALERTA — Conversão de espécie.** Se o segurado tem B31 e há indicadores de nexo acidentário (CAT, NTEP, doença ocupacional), alertar oportunidade de conversão B31→B91 com efeitos na estabilidade acidentária e no FGTS.

**ALERTA — Perspectiva de gênero.** Se a segurada é mulher em atividade rural, informal ou doméstica, acionar `perspectiva-genero-previdenciario`.

**ALERTA — Segurado analfabeto.** Se identificado que o segurado não sabe ou não pode assinar, acionar `assinatura-a-rogo` para orientar procedimento de procuração e documentos.

**ALERTA — Análise documental (B31/B91/B94).** Se o caso envolver requerimento de B31, B91 ou B94, acionar `analise-documental-incapacidade` para verificar o regime das Portarias Conjuntas 13/14/15/2026.

**ALERTA — Portaria 462 (armadilha processual).** Se o segurado fez pedido de revisão do ato de indeferimento antes de recorrer, alertar sobre a restrição do art. 112 §7º e acionar `portaria-462-restricao-recursal`.

**ALERTA — Segurado especial rural.** Se o caso envolver segurado especial, atividade rural em regime de economia familiar, aposentadoria rural por idade ou período rural a computar, acionar `segurado-especial-rural` para regime jurídico completo, estratégia probatória e precedentes específicos. Se CNPJ ativo no CPF do segurado, acionar imediatamente para defesa preventiva.

**ALERTA — Aposentadoria por idade híbrida.** Se o segurado combina períodos rurais e urbanos e está próximo da idade mínima (62F/65M) ou já a implementou, avaliar viabilidade de aposentadoria por idade híbrida (art. 48, §3º). Acionar `aposentadoria-idade-hibrida` para regime completo. A IN 188/2025 dispensou qualidade de segurado e exercício de atividade na DER. O Tema 1007/STJ garante cômputo de rural pré-1991 sem contribuição. A TNU (PEDILEF 2024) dispensou contribuição para rural pós-1991 na híbrida. Alertar sobre o Tema 1104/STF pendente.

**ALERTA — Aposentadoria do professor (RGPS).** Se o segurado exerceu magistério na educação básica (educação infantil, ensino fundamental ou médio), inclusive em cargos de direção escolar, coordenação pedagógica ou funções com nomenclatura diversa (auxiliar de creche, técnico em desenvolvimento infantil, agente pedagógico), acionar `aposentadoria-professor-rgps` para regime completo. Verificar se há direito adquirido pré-EC 103/2019, qual regra de transição é mais favorável, se o acréscimo de 17%/20% da EC 20/98 se aplica, e se a Lei 15.326/2026 amplia o enquadramento. Distinguir RGPS de RPPS antes de prosseguir.

**ALERTA — Manutenção da qualidade de segurado.** Se o segurado já cumpriu carência para aposentadoria por idade mas ainda não atingiu a idade mínima, NUNCA orientar cessação total de contribuições, mesmo que a perda da qualidade não impeça a aposentadoria por idade (art. 3º, §1º, Lei 10.666/2003). A qualidade de segurado protege contra incapacidade (B31/B32) e garante pensão por morte (B21/B93) aos dependentes. Orientar manutenção de contribuições periódicas até implementação de todos os requisitos das aposentadorias programáveis. Acionar `periodo-graca-qualidade-segurado` para prazos e estratégia.

**ALERTA — Doença preexistente à filiação (art. 59, parágrafo único).** Se a doença que fundamenta o pedido de incapacidade existia antes da filiação ou do reinício das contribuições, NÃO propor isenção de carência pelo art. 151 como argumento isolado. A isenção pressupõe doença surgida após a filiação. Para doença preexistente, o único fundamento viável é o agravamento posterior (art. 59, parágrafo único, Lei 8.213/91). Verificar se há prova clínica do agravamento e em que data ele ocorreu. Contar a carência nessa data antes de afirmar que o requisito está cumprido. Esse alerta se aplica especialmente quando o segurado inicia contribuições como facultativo após longo período sem filiação e já possui diagnóstico prévio.

## Análise de Viabilidade

Após a classificação, o roteamento e a definição do rito, emitir uma avaliação de viabilidade do caso com três indicadores.

### Viabilidade jurídica

Fundamento legal e jurisprudencial sustentam a pretensão? Há precedente vinculante favorável ou contrário? Existe controvérsia aberta?

Classificar em ALTA (precedente vinculante favorável + legislação clara), MÉDIA (jurisprudência majoritária favorável sem precedente vinculante, ou legislação ambígua) ou BAIXA (jurisprudência majoritariamente contrária ou ausência de fundamento legal).

### Viabilidade probatória

O cliente tem ou pode obter a prova necessária? Há lacunas documentais suprímíveis?

Classificar em ALTA (documentação completa ou facilmente obtenível), MÉDIA (documentação parcial com lacunas supríveis) ou BAIXA (prova principal ausente e de difícil obtenção).

### Risco processual

Há risco de extinção sem mérito, prescrição, decadência, incompetência ou perda de objeto?

Classificar em ALTO (risco concreto identificado), MÉDIO (risco potencial controlável) ou BAIXO (sem riscos processuais identificados).

## Formato do Relatório de Triagem

O relatório é entregue no corpo da conversa. A estrutura segue o modelo abaixo.

### Cabeçalho

```
TRIAGEM DE CASO NOVO
Data: [data atual]
```

### Seção 1 — Dados do Caso

Resumo dos dados coletados em formato narrativo (não tabular). Duas a quatro frases.

### Seção 2 — Classificação

Categoria(s) identificada(s), com justificativa em uma frase por categoria.

### Seção 3 — Rito e Foro

Via processual recomendada (administrativa, JEF, ordinária, MS), foro competente e justificativa.

### Seção 4 — Viabilidade

Os três indicadores (jurídica, probatória, risco processual) com classificação e justificativa em uma frase cada.

### Seção 5 — Alertas

Todos os alertas automáticos disparados, ordenados por urgência.

### Seção 6 — Documentação Necessária

Lista de documentos que o cliente precisa providenciar, gerada a partir da skill `cartas-documentos-previdencia` e complementada pela skill `documentos-comprobatorios-in128`. Se o usuário autorizar, gerar a carta de documentos completa em formato para envio ao cliente.

### Seção 7 — Plano de Ação

Sequência numerada de próximos passos concretos, do imediato ao final. Cada passo indica a ação, o responsável (advogado ou cliente) e o prazo estimado quando aplicável.

### Seção 8 — Skills Acionadas

Lista das skills consultadas durante a triagem, para rastreabilidade.

## Regras de Comportamento

**Nunca classificar sem dados mínimos.** Se os dados críticos estão ausentes, perguntar antes de classificar. Não chutar.

**Nunca omitir alertas.** Se um alerta foi disparado, ele aparece no relatório independentemente de o usuário ter perguntado.

**Sempre verificar Tema 1124.** Em toda triagem de caso que envolva concessão ou revisão, verificar se há risco relacionado ao Tema 1124/STJ. Se o segurado não fez requerimento administrativo ou não apresentou documentos essenciais ao INSS, alertar expressamente.

**Sempre verificar decadência.** Em toda triagem de revisão, verificar o prazo decadencial antes de qualquer outra análise. Se decaiu, informar imediatamente.

**Classificação provisória é revisável.** Se durante a análise dos documentos ou da conversa surgirem elementos que alterem a classificação, reclassificar sem necessidade de reiniciar a triagem.

**Não calcular RMI.** A triagem não realiza cálculos de renda mensal inicial. Se o caso envolver análise de valor, indicar que o cálculo exige CNIS completo e remeter ao fluxo de planejamento previdenciário.

**Registrar aprendizados.** Se durante a triagem o usuário relatar resultado de caso anterior que revele aprendizado documental, acionar `cartas-documentos-previdencia` no Fluxo B.

## Referências

Antes de classificar qualquer caso, consultar os arquivos de referência.

- `references/MAPA-CLASSIFICACAO.md` — árvore decisória de classificação por dados do segurado
- `references/MAPA-ROTEAMENTO.md` — tabela de roteamento de skills por classificação
