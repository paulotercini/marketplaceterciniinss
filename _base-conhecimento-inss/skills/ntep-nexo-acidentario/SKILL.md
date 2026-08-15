---
name: ntep-nexo-acidentario
description: "Skill GERAL do nexo acidentário e do NTEP para todas as espécies, conversão B31 para B91 e B32 para B92, enquadramento dos arts. 19 a 21 da Lei 8.213 e riscos psicossociais da NR-1. Use SEMPRE que mencionar NTEP, nexo causal, acidente de trabalho, doença profissional, doença do trabalho, CAT, conversão de espécie, estabilidade art. 118, FGTS afastamento, art. 21-A, Lista B Lista C Anexo II Decreto 3.048, CNAE CID, concausa, ADI 3931, contestação NTEP, burnout QD85, transtorno mental ocupacional, Portaria MTE 1.419/2024, PGR omisso, acidente de trajeto, MP 905/2019 trajeto, equiparação a acidente, contaminação acidental, agressão no trabalho, doença degenerativa concausa, limbo trabalhista-previdenciário. Use AUTOMATICAMENTE em auditoria de laudo e petição por incapacidade. Para o nexo ESPECÍFICO do auxílio-acidente, ver base-b94-nexo-acidentario-ntep e auxilio-acidente-b94. NÃO use para aposentadoria especial, BPC/LOAS ou aposentadoria por deficiência."
---

# Análise do Nexo Causal Acidentário, NTEP e Conversão de Espécie

## Visão Geral

Esta skill orienta a análise sistemática do nexo causal entre trabalho e incapacidade em todos os benefícios por incapacidade (auxílio-doença, aposentadoria por invalidez, auxílio-acidente), a verificação da aplicação do NTEP pela perícia e pelo INSS, e a estratégia de conversão de espécie de benefício (B31→B91, B32→B92) na via administrativa e judicial.

## Premissa Fundamental

Todo benefício por incapacidade exige verificação da natureza acidentária. O INSS sistematicamente concede como previdenciário (B31/B32) benefícios que deveriam ser acidentários (B91/B92), especialmente quando a empresa não emite CAT. A ausência de CAT não impede o reconhecimento do nexo. O NTEP foi criado justamente para corrigir essa distorção e o STF declarou sua constitucionalidade (ADI 3931, Plenário, Rel. Min. Cármen Lúcia).

## Fluxo de Trabalho

1. Leia este SKILL.md completamente
2. Leia `references/ANALISE-NEXO-CAUSAL.md` para a metodologia de análise em 4 espécies de nexo
3. Leia `references/NTEP-MARCO-NORMATIVO.md` para o marco normativo completo
4. Se a análise envolver conversão de espécie, leia `references/CONVERSAO-B31-B91.md`
5. Se envolver transtorno mental ocupacional, leia `references/RISCOS-PSICOSSOCIAIS-NR1.md`
6. Para pontos de integração com outras skills, consulte `references/INTEGRACAO-SKILLS.md`

## Gatilho Automático em Benefícios por Incapacidade

### Quando esta skill deve ser acionada automaticamente

Em TODA análise de benefício por incapacidade, independentemente de o usuário mencionar nexo ou NTEP, aplicar o seguinte protocolo

**Passo 1 — Identificar a atividade econômica**
Verificar o CNAE do empregador nos documentos disponíveis (CNIS, CTPS, PPP, contrato de trabalho). Se o segurado teve múltiplos vínculos, verificar o CNAE de cada empregador no período relevante.

**Passo 2 — Identificar o CID da incapacidade**
Verificar o CID-10 atribuído pelo médico assistente, pelo perito do INSS ou pelo perito judicial.

**Passo 3 — Cruzar CNAE × CID na Lista B e Lista C**
Consultar o Anexo II do Decreto 3.048/99. Se houver correlação, o NTEP se aplica com presunção relativa de nexo. Alertar o usuário.

**Passo 4 — Verificar CAT**
Identificar se houve emissão de CAT. Se não houve, verificar se o NTEP supre a ausência. Se houve, verificar se a perícia reconheceu o nexo.

**Passo 5 — Verificar a espécie concedida**
Se o benefício foi concedido como B31 ou B32 e há elementos para classificação acidentária, alertar e orientar conversão.

## Regras Críticas

### Proibição Absoluta de Dois-Pontos
NUNCA utilizar dois-pontos para introduzir explicações, listas ou conclusões. Reestruturar em frases independentes ou conectadas por conjunções.

### Verificação de Fontes
Nunca inventar correlações CNAE-CID. Se não houver certeza sobre a inclusão na Lista B ou Lista C do Decreto 3.048/99, orientar consulta direta ao Anexo II. Todos os artigos, precedentes e dispositivos citados devem ser verificados.

### Honestidade Radical
Se o CID não consta nas listas para o CNAE do empregador, declarar que o NTEP não se aplica automaticamente. Se a documentação não demonstra nexo por nenhuma das quatro vias, declarar sem rodeios. Nunca forçar a existência de nexo onde não há base probatória.

### Posição do Segurado
Toda análise deve ser orientada à defesa do segurado. Identificar todas as vias possíveis de demonstração do nexo e recomendar a mais robusta. Nunca apresentar estratégias que favoreçam o INSS ou a empresa.

### Alerta Obrigatório
Sempre que identificar que o benefício foi concedido como previdenciário e há indícios de natureza acidentária, emitir alerta destacado com a seguinte estrutura

**⚠️ ALERTA — POSSÍVEL NATUREZA ACIDENTÁRIA NÃO RECONHECIDA**
Indicar o fundamento (NTEP, CAT, documentação médica, nexo individual) e a estratégia recomendada (revisão administrativa, ação judicial, complementação probatória).

## Enquadramento Legal do Acidente do Trabalho (Arts. 19 a 21)

A Lei 8.213/91 classifica as situações de acidente do trabalho em duas categorias, as diretamente consideradas (art. 19 caput, art. 20 I e II) e as equiparadas (art. 21, incisos I a IV e §1º). Ambas produzem os mesmos efeitos jurídicos.

O mapa completo com todas as hipóteses, alíneas, exclusões (art. 20, §1º), rol exemplificativo (art. 20, §2º), alerta sobre a MP 905/2019 e acidente de trajeto, presunção de exercício do trabalho e erros frequentes do INSS está em `references/ANALISE-NEXO-CAUSAL.md`. Esse mapa deve ser consultado como primeira etapa de toda análise de nexo, antes de aplicar as quatro espécies abaixo.

## Quatro Espécies de Nexo Causal

A análise completa das quatro espécies está em `references/ANALISE-NEXO-CAUSAL.md`. Em resumo

1. **Nexo Técnico Epidemiológico (NTEP)** — presunção legal por correlação estatística CNAE × CID (art. 21-A, Lei 8.213/91)
2. **Nexo Profissional (NP)** — doença profissional ou do trabalho constante das Listas A e B do Anexo II do Decreto 3.048/99 (arts. 20, I e II, Lei 8.213/91)
3. **Nexo Individual (NI)** — estabelecido por perícia médica caso a caso, sem correlação estatística, pela avaliação clínica e ocupacional
4. **Acidente típico** — evento único, identificável, com data certa (art. 19, Lei 8.213/91), incluindo acidente de trajeto (art. 21, IV, d)

## Impactos da Classificação Correta

A classificação como acidentário (B91/B92/B94) gera direitos que o benefício previdenciário (B31/B32/B36) não confere

- **Estabilidade provisória** de 12 meses após a cessação do benefício (art. 118, Lei 8.213/91). O Tema 125/TST (IRR-0020465-17.2022.5.04.0521, Tribunal Pleno, j. 25/04/2025) dispensa afastamento superior a 15 dias e percepção de B91 para fins de estabilidade, bastando reconhecimento posterior de nexo causal/concausal entre doença ocupacional e atividade laboral. A decisão trabalhista que reconhece nexo fundamenta diretamente a conversão de espécie B31→B91 no INSS.
- **Depósito de FGTS** durante o afastamento (art. 15, §5º, Lei 8.036/90)
- **Auxílio-acidente** (B94) em caso de sequela redutora da capacidade (art. 86, Lei 8.213/91)
- **Dispensa de carência** (art. 26, II, Lei 8.213/91)
- **Base de cálculo diferenciada** para fatos geradores anteriores à EC 103/2019 (100% do salário de benefício, sem aplicação do coeficiente de 60% + 2%)
- **Ação indenizatória** contra o empregador (art. 7º, XXVIII, CF; art. 927, CC)
- **Ação regressiva** do INSS contra a empresa (art. 120, Lei 8.213/91)
- **Impacto no FAP** da empresa (art. 10 da Lei 10.666/2003)

## Limbo Trabalhista-Previdenciário

Quando o INSS cessa o benefício acidentário (alta de B91) mas o segurado permanece com limitações, e o empregador recusa o retorno, nasce o "limbo jurídico". Dois precedentes vinculantes do TST disciplinam essa situação.

**Tema TST 88** — O empregador que impede o retorno do empregado ao trabalho após alta previdenciária e inviabiliza a percepção de remuneração pratica conduta ilícita que configura dano moral in re ipsa, sendo devida indenização.

**Tema TST 226** — Presume-se abandono de emprego se o trabalhador não retornar ao serviço no prazo de 30 dias após cessação do benefício previdenciário nem justificar o motivo.

Orientação preventiva ao cliente. O segurado deve se reapresentar formalmente ao empregador dentro de 30 dias da cessação, por escrito (e-mail, protocolo, AR), declarando estar à disposição para retorno. Se houver limitação funcional, deve levar documentação médica e solicitar avaliação do médico do trabalho ou readaptação. Toda documentação de reapresentação deve ser preservada como prova.

A estratégia integrada em caso de limbo é dupla. Requerer novo benefício por incapacidade ao INSS com documentação atualizada, e simultaneamente acionar a Justiça do Trabalho para responsabilizar o empregador pelo período sem remuneração e sem benefício.

## Riscos Psicossociais NR-1 e Nexo Acidentário — Síntese

A Portaria MTE 1.419/2024 incluiu expressamente os fatores de risco psicossociais no PGR (NR-1). Vigência plena a partir de 26/05/2026 (prorrogada pela Portaria MTE 765/2025). Período educativo (fiscalização orientativa) de 26/05/2025 a 25/05/2026.

Os CIDs relevantes são F32/F33 (depressão), F41 (ansiedade), F43 (TEPT), QD85 CID-11 (burnout). Quando o CNAE do empregador está correlacionado ao CID do transtorno mental na Lista B, o NTEP se aplica automaticamente. Burnout (QD85 CID-11) é fenômeno exclusivamente ocupacional pela OMS.

**PGR que reconhece riscos psicossociais** é prova pré-constituída a favor do segurado. **PGR que omite riscos** demonstra negligência e reforça o nexo. A requisição judicial do PGR (art. 396 CPC) é estratégia obrigatória em toda ação de benefício por incapacidade decorrente de transtorno mental.

Consulte `references/RISCOS-PSICOSSOCIAIS-NR1.md` para fundamentação completa, estratégias probatórias (5 linhas de argumentação), dados epidemiológicos e particularidades do burnout.

## Referências

Antes de realizar a análise, ler obrigatoriamente os seguintes arquivos conforme a necessidade do caso

- `references/ANALISE-NEXO-CAUSAL.md` — Metodologia de análise das 4 espécies de nexo
- `references/NTEP-MARCO-NORMATIVO.md` — Marco normativo completo do NTEP
- `references/CONVERSAO-B31-B91.md` — Estratégia de conversão de espécie
- `references/INTEGRACAO-SKILLS.md` — Cruzamento com skills do escritório
- `references/RISCOS-PSICOSSOCIAIS-NR1.md` — Riscos psicossociais NR-1, PGR como prova, burnout e estratégias probatórias para transtornos mentais ocupacionais
