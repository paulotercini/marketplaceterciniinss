---
name: ponte-workflow-pensao-por-morte
description: "Workflow pró-segurado de pensão por morte (B21/B93) costurando análise de qualidade de segurado do falecido, prova de dependência (especialmente união estável) e produção da peça processual. Use SEMPRE que mencionar workflow pensão por morte, pipeline pensão por morte, ação pensão por morte, recurso CRPS pensão, MS pensão, B21 B93 viúvo viúva companheiro companheira, união estável previdenciária, dependência presumida, art. 16 Lei 8.213, Tema 526 STF, Súmula 63 TNU, prova material companheiro, fluxo pensão dependente. Cruza com pensao-por-morte, documentos-comprobatorios-in128, peticao-previdenciaria e revisao-peticao. NÃO use para auxílio-reclusão (B25) nem benefício originário do falecido."
---

# Workflow Pensão por Morte

## 1. Quando acionar

Sempre que o caso envolver concessão, restabelecimento ou revisão de pensão por morte. Acionar tanto em fase administrativa quanto judicial. Inclui rateio entre dependentes, perda de qualidade do falecido, união estável questionada e concubinato impuro.

## 2. Pipeline executável

### Passo 1. Triagem documental

Solicitar ao cliente certidão de óbito, RG e CPF do dependente, comprovante de residência, CNIS do falecido, CTPS do falecido, todos os documentos da relação afetiva (certidões, escrituras, declarações de IR, contas conjuntas, plano de saúde, fotografias datadas), documentos de filhos comuns quando houver.

### Passo 2. Análise da qualidade de segurado do falecido

Acionar `cnis-acerto-indicadores` no CNIS do falecido. Identificar indicadores bloqueantes, vínculos não computados, pendências GFIP. Acionar `periodo-graca-qualidade-segurado` para verificar se o falecido mantinha qualidade na DOF (data do óbito).

Quando o falecido fosse contribuinte individual com gaps, acionar `contribuinte-individual-in128` e `indenizacao-contribuicoes-atraso`.

Quando o falecido fosse rurícola, acionar `segurado-especial-rural`.

### Passo 3. Análise da dependência

Filhos menores de 21 e cônjuge formal têm dependência presumida (art. 16 §4º Lei 8.213/91). Companheiro também tem presunção, mas precisa provar a união estável.

Para companheiro, acionar `base-pensao-por-morte-uniao-estavel-prova` para fundamentação normativa e `documentos-comprobatorios-in128` para mapa de provas materiais.

Para união estável anterior à CF/88 ou em concorrência com ex-cônjuge, acionar `base-pensao-por-morte-pos-reforma`.

Para união estável simultânea (concubinato), acionar `base-pensao-por-morte-uniao-estavel-prova` e avaliar exceções jurisprudenciais ao Tema 526/STF.

### Passo 4. Cálculo e rateio

A regra atual é EC 103/2019 com art. 23. Cota familiar 50% mais 10% por dependente. Acionar `pensao-por-morte` para teses de duração e rateio.

Quando houver direito adquirido a regime anterior, acionar `base-aposentadoria-direito-adquirido` aplicado por analogia ao falecido.

### Passo 5. Definição de rito

Alçada do JEF para valor de causa abaixo de 60 salários mínimos. Acionar `base-jef-previdenciario`. Acima, rito ordinário com `base-rito-ordinario-trf`.

Em recurso administrativo, acionar `admissibilidade-barreiras-crps` antes do mérito.

### Passo 6. Verificações obrigatórias

Tema 1124/STJ via `tema-1124-instrucao-administrativa` para confirmar prévio requerimento administrativo.

Decadência de revisão via `decadencia-revisao-previdenciaria` quando se tratar de revisão.

Perspectiva de gênero via `perspectiva-genero-previdenciario` quando a dependente for mulher rurícola, doméstica ou em situação de invisibilidade.

### Passo 7. Redação da peça

Acionar `peticao-previdenciaria`. Em caso de demora administrativa, `mandado-seguranca-previdenciario`.

### Passo 8. Revisão automática

Acionar `revisao-peticao`.

## 3. Documentos essenciais

Certidão de óbito. CNIS do falecido. CTPS do falecido. Carteiras de filiação sindical. Documentos da relação (qualquer documento que indique convivência). Documentos de filhos comuns. Justificação administrativa quando houver lacunas documentais.

## 4. Pontos críticos pró-segurado

Recusa do INSS em aceitar prova testemunhal pura. Refutar com Súmula 63/TNU e art. 22 do Decreto 3.048/99.

Exigência de escritura pública de união estável. Refutar com art. 1.723 CC e Súmula 63/TNU.

Indeferimento por questionamento de contemporaneidade. Refutar com a continuidade da relação demonstrada por qualquer documento de qualquer época da convivência.

Concorrência com ex-cônjuge alimentando. Verificar se houve renúncia expressa aos alimentos ou prestação efetiva.

Perda de qualidade do falecido por afastamento longo. Verificar prorrogações do art. 15 §§1º e 2º da Lei 8.213/91, desemprego involuntário e Tema 1421/STF (limbo previdenciário).

## 5. Postura

Pró-segurado integral. Identificar a vulnerabilidade do dependente, explorar presunção de dependência econômica, refutar barreiras infralegais e exigências documentais excessivas com base na Lei 13.460/2017.
