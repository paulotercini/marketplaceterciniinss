---
name: ponte-workflow-reabilitacao-profissional
description: "Workflow pró-segurado de Reabilitação Profissional do INSS, costurando regime das Portarias DIRBEN 1.310/2025 e 1.333/2026, defesa contra cessação prematura, suspensão indevida e encerramento abusivo do PRP, e produção de mandado de segurança ou peça administrativa. Use SEMPRE que mencionar workflow reabilitação, pipeline RP, ação RP, mandado de segurança RP, suspensão PRP, encerramento PRP, recusa de encaminhamento à PMF, conversão administrativa B31 em B32, alta sem reabilitação, retorno ao trabalho não compatível, certificado de reabilitação. Cruza com mandado-seguranca-previdenciario, ms-competencia-autoridade-coatora, peticao-previdenciaria. NÃO use para B32 sem componente de reabilitação ou para BPC."
---

# Workflow Reabilitação Profissional

Convenção de espécies (códigos INSS): B31 auxílio por incapacidade temporária previdenciário; B91 acidentário; B32 aposentadoria por incapacidade permanente previdenciária; B92 acidentária. A reabilitação profissional é serviço (arts. 89 a 92 da Lei 8.213/91), sem código de benefício próprio.

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

Cessação do benefício antes da conclusão do PRP (art. 62, §1º, da Lei 8.213/91). Suspensão por recusa ou abandono sem despacho circunstanciado e sem notificação com prazo de defesa de 60 dias (Livro X, art. 13). Negativa de reagendamento pedido em até 7 dias corridos com justificativa plausível (Livro X, art. 10, §1º). Recusa de encaminhamento à PMF para PRP. Determinação de retorno ao trabalho em função incompatível. Insuscetibilidade de reabilitação reconhecida sem a conversão administrativa em aposentadoria por incapacidade permanente (Livro X, art. 29, §2º-A).

### Passo 5. Definição da via processual

Em geral o caminho mais rápido é mandado de segurança contra ato comissivo ou omissivo do INSS.

Acionar `ms-competencia-autoridade-coatora` para definir a autoridade coatora (Gerente Executivo, CEAB, equipe de reabilitação local) e a competência territorial.

Acionar `mandado-seguranca-previdenciario` para técnica processual.

Quando não couber MS por exigir dilação probatória, ação ordinária pelo rito comum.

### Passo 6. Verificações obrigatórias

Tema 1124/STJ via `tema-1124-instrucao-administrativa` para o termo inicial dos efeitos financeiros quando houver prova nova não apresentada ao INSS.

Lei 13.460/2017 via `lei-13460-usuario-servico-publico` para barreiras formais excessivas.

Período de graça via `periodo-graca-qualidade-segurado` quando houver risco de perda durante RP suspensa.

### Passo 7. Redação da peça

Acionar `peticao-previdenciaria` no padrão MS ou ação ordinária. Em fase administrativa, acionar `requerimento-administrativo-inss`. Em recurso, acionar `admissibilidade-barreiras-crps`.

### Passo 8. Revisão automática

Acionar `revisao-peticao`.

## 3. Documentos essenciais

Convocações da equipe de reabilitação. Justificativas médicas anteriores. Decisão de cessação ou encerramento. Laudos médicos do assistente. Laudo da PMF quando houver. Documentos da empresa sobre função compatível ofertada ou recusada. CAT em casos acidentários.

## 4. Pontos críticos pró-segurado

O segurado pode pedir reagendamento em até 7 dias corridos da falta, com justificativa plausível, e o benefício suspenso é reativado (Livro X, arts. 10, §1º, e 12, parágrafo único, nas redações das Portarias 1.310/2025 e 1.333/2026).

A recusa ou o abandono geram suspensão com prazo de defesa de 60 dias; o desligamento exige comunicação de decisão após esse prazo (Livro X, arts. 13 e 18, II). Benefício suspenso sem decisão formal configura omissão impugnável por mandado de segurança.

Cessação do auxílio por incapacidade temporária de segurado insuscetível de recuperação para a atividade habitual, sem encaminhamento à reabilitação, viola o art. 62, caput e §1º, da Lei 8.213/91. Constatada a insuscetibilidade de reabilitação, o INSS converte o benefício em aposentadoria (Livro X, art. 29, §2º-A).

Função compatível deve respeitar limitações funcionais comprovadas, não basta existir vaga. Recusa de retorno em função incompatível não caracteriza abandono.

O programa concluído exige certificado (art. 92 da Lei 8.213/91).

## 5. Postura

Pró-segurado integral. Reabilitação profissional é direito subjetivo do segurado e o INSS atua como executor. Identificar atos coativos, omissões e violações ao devido processo administrativo, e impugná-los pela via mais rápida disponível, geralmente o mandado de segurança.

## Hub de portarias administrativas

As Portarias DPMF, DIRBEN e INSS que regem procedimento, cálculo e recurso estão em `base-portarias-dpmf-inss-hub`.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Cadeia de cada pedido (regra permanente, 12/10/2026)

Toda peça produzida com esta skill passa, antes da entrega, pela conferência individual de cada pedido, ligando pedido, fatos, provas por ID, cálculo ou critério e conclusão jurídica, com correção pontual e sem reescrever a peça. Protocolo em `base-revisao-peticao-aprofundada/references/CADEIA-DO-PEDIDO.md` e Fase 2-A da `peticao-previdenciaria`.
