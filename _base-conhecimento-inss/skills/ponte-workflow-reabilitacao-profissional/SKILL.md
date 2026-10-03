---
name: ponte-workflow-reabilitacao-profissional
description: "Workflow pró-segurado de Reabilitação Profissional do INSS, costurando regime das Portarias DIRBEN 1.310/2025 e 1.333/2026, defesa contra cessação prematura, suspensão indevida e encerramento abusivo do PRP, e produção de mandado de segurança ou peça administrativa. Use SEMPRE que mencionar workflow reabilitação, pipeline RP, ação RP, mandado de segurança RP, suspensão PRP, encerramento PRP, recusa de encaminhamento à PMF, conversão administrativa B31 em B32, alta sem reabilitação, retorno ao trabalho não compatível, certificado de reabilitação. Cruza com mandado-seguranca-previdenciario, ms-competencia-autoridade-coatora, peticao-previdenciaria. NÃO use para B32 sem componente de reabilitação ou para BPC."
---

# Workflow Reabilitação Profissional

## 1. Quando acionar

Sempre que o caso envolver Programa de Reabilitação Profissional (PRP), suspensão de benefício durante RP, encerramento abusivo, recusa de encaminhamento à PMF, alta sem reabilitação, conversão administrativa de B31 em B32 ou pleito de certificado de reabilitação.

## 2. Pipeline executável

### Passo 1. Triagem documental

Solicitar ao cliente toda a documentação do PRP em curso ou cessado. Documentos típicos. Convocações, atas de avaliação, laudos da equipe de reabilitação, comprovantes de comparecimento, justificativas médicas para ausências, ofícios da PMF, decisões de cessação ou encerramento, CNIS atualizado, CAT (quando houver acidentário).

### Passo 2. Diagnóstico do estágio

Identificar em que fase do PRP o segurado está. Avaliação inicial, programa profissional em curso, encerramento por compatibilização, encerramento por abandono ou recusa, encerramento por insucesso, certificado já emitido.

### Passo 3. Fundamentação normativa

Acionar `base-reabilitacao-profissional-portaria-1310-1333` para regime atual. Acionar `base-reabilitacao-profissional` para visão geral histórica. Quando o PRP envolver acidente do trabalho, acionar `ntep-nexo-acidentario`.

Quando o segurado for PCD encaminhado à RP, acionar `aposentadoria-deficiencia` em paralelo para avaliar conversão para LC 142/2013.

### Passo 4. Identificação da violação

Cessação prematura sem alta médica formalizada. Suspensão por mais de 60 dias sem justificativa legal. Encerramento por abandono sem oportunidade de justificativa em 7 dias. Recusa de encaminhamento à PMF para PRP. Determinação de retorno ao trabalho em função incompatível. Conversão administrativa de B31 em B32 sem cumprir o devido processo administrativo.

### Passo 5. Definição da via processual

Em geral o caminho mais rápido é mandado de segurança contra ato comissivo ou omissivo do INSS.

Acionar `ms-competencia-autoridade-coatora` para definir a autoridade coatora (Gerente Executivo, CEAB, equipe de reabilitação local) e a competência territorial.

Acionar `mandado-seguranca-previdenciario` para técnica processual.

Quando não couber MS por exigir dilação probatória, ação ordinária pelo rito comum.

### Passo 6. Verificações obrigatórias

Tema 1124/STJ via `tema-1124-instrucao-administrativa` para confirmar pedido administrativo prévio quando o pleito for de novo direito.

Lei 13.460/2017 via `lei-13460-usuario-servico-publico` para barreiras formais excessivas.

Período de graça via `periodo-graca-qualidade-segurado` quando houver risco de perda durante RP suspensa.

### Passo 7. Redação da peça

Acionar `peticao-previdenciaria` no padrão MS ou ação ordinária. Em fase administrativa, acionar `requerimento-administrativo-inss`. Em recurso, acionar `admissibilidade-barreiras-crps`.

### Passo 8. Revisão automática

Acionar `revisao-peticao`.

## 3. Documentos essenciais

Convocações da equipe de reabilitação. Justificativas médicas anteriores. Decisão de cessação ou encerramento. Laudos médicos do assistente. Laudo da PMF quando houver. Documentos da empresa sobre função compatível ofertada ou recusada. CAT em casos acidentários.

## 4. Pontos críticos pró-segurado

Justificativa de faltas em até 7 dias é direito do segurado pelas Portarias 1.310/2025 e 1.333/2026. INSS não pode encerrar PRP por abandono sem oportunizar a justificativa.

Suspensão de até 60 dias é regra. Acima disso, INSS deve formalmente encerrar ou retomar o PRP. Limbo administrativo é ilegal.

Conversão administrativa de B31 em B32 sem encaminhamento à RP viola art. 62 §2º da Lei 8.213/91. Pleitear via MS.

Função compatível deve respeitar limitações funcionais comprovadas, não basta existir vaga. Recusa de retorno em função incompatível não caracteriza abandono.

Certificado de reabilitação é direito. INSS não pode encerrar PRP sem emitir certificado quando o programa foi concluído.

## 5. Postura

Pró-segurado integral. Reabilitação profissional é direito subjetivo do segurado e o INSS atua como executor. Identificar atos coativos, omissões e violações ao devido processo administrativo, e atacar pela via mais rápida disponível, geralmente o mandado de segurança.

## Hub de portarias administrativas

Hub das Portarias DPMF/DIRBEN/INSS aplicáveis a este benefício. Acionar `base-portarias-dpmf-inss-hub` para identificar quais Portarias regem o procedimento administrativo, o cálculo, as ratificações e os recursos no caso concreto.

## MCPs da casa

Pesquisa obrigatória (Onda 169). Nenhuma norma, súmula, tema, enunciado ou acórdão citado nesta skill entra em peça, parecer ou orientação sem passar antes pelo MCP próprio, e nenhum MCP autoriza sozinho a marca [CONFERIDO]. O achado nasce [NÃO CONFIRMADO] e só sobe a [CONFERIDO] depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`.

Legislação. O dispositivo se transcreve do MCP `normas`, por `obter_artigo` no identificador da norma e no número do artigo (exemplo, `lei-8213-1991` e `57`), lendo o campo `texto` e a última ocorrência de cada parágrafo, e a redação de outra época se lê por `redacao_na_data`. A IN 128/2022 se confere também pelo `norma_inss` do MCP `iurisprudencia`, que versiona parágrafo a parágrafo e já traz alterações ausentes da base local, como as da IN PRES/INSS 212/2026. Norma ausente das duas bases exige a fonte oficial a cada uso.

Jurisprudência. Tema, súmula e enunciado se conferem primeiro no catálogo `base-precedentes-catalogo-vinculantes` e no catálogo complementar da `auditoria-citacoes`, com atenção ao homônimo de outra corte. Enunciado do CRPS se lê em `enunciados_pleno_inss_crps`, na redação vigente e nas anteriores. Acórdão da TNU se localiza em `buscar_acordaos_tnu`. Acórdão do TRF3 e das Turmas Recursais se localiza em `buscar_acordaos_trf3`, na base local, e em `buscar_acordaos_trf3_jef`, consulta ao vivo. Ação civil pública que o INSS cumpre se lê no `norma_inss`, Portaria Conjunta 94/2024.

Acervo do escritório. O que o escritório já sustentou se lê no MCP `acervo`, por `buscar_tese_acervo`, `obter_trecho_acervo` e `precedentes_do_acervo`, cujo campo `corte` evita o homônimo. Detalhe em `base-acervo-escritorio`.

**Vedação.** O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova, conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o arquivo de origem não é.

Protocolo completo, coberturas e limites medidos em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs".
