---
name: ponte-workflow-aposentadoria-especial
description: "Workflow pró-segurado de aposentadoria especial costurando auditoria de PPP, fundamento normativo das skills base-especial-* e produção da peça processual. Use SEMPRE que mencionar workflow aposentadoria especial, pipeline aposentadoria especial, ação aposentadoria especial, recurso CRPS aposentadoria especial, mandado de segurança aposentadoria especial, processo de aposentadoria especial, ruído frentista metalúrgico vigilante eletricista enfermagem, agente nocivo no PPP, conversão tempo especial, art. 57 Lei 8.213, EC 103/2019 especial, motociclista periculosidade, PPP com layout antigo, fluxo de tempo especial. Cruza com auditoria-ppp, defesa-probatoria-especial, tempo-especial-peticoes-por-rito, peticao-previdenciaria e revisao-peticao. NÃO use para incapacidade B31/B91 nem aposentadoria por idade comum."
---

# Workflow Aposentadoria Especial

## 1. Quando acionar

Sempre que o caso envolver aposentadoria especial, conversão de tempo especial em comum, recurso ao CRPS sobre tempo especial, mandado de segurança contra indeferimento de PPP ou ação judicial pleiteando enquadramento especial.

## 2. Pipeline executável

### Passo 1. Triagem documental

Solicitar ao cliente todos os PPP, LTCAT, PGR, laudos técnicos, CAT e CTPS. Solicitar também CNIS atualizado. Acionar `cnis-acerto-indicadores` para identificar indicadores bloqueantes ou pendências de vínculo.

### Passo 2. Auditoria do PPP

Acionar `auditoria-ppp` em cada PPP recebido. A auditoria gera diagnóstico técnico do agente nocivo, do enquadramento e dos vícios de preenchimento. Se houver vício, acionar `retificacao-ppp` para gerar a notificação à empresa antes do peticionamento.

### Passo 3. Fundamentação normativa pela base-*

Acionar a skill base-* correspondente ao agente nocivo identificado.

Ruído. `base-especial-ruido`.
EPI. `base-especial-epi` e `defesa-probatoria-especial`.
Agentes químicos. `base-especial-agentes-quimicos`.
Agentes biológicos. `base-especial-agentes-biologicos`.
Calor. `base-especial-calor-nho06`.
Frio. `base-especial-frio-camara-frigorifica`.
Vibração. `base-especial-vibracao`.
Eletricidade. `base-especial-eletricidade-periculosidade`.
Radiação ionizante. `base-especial-radiacao-ionizante`.
Penosidade enfermagem ou petroleiro. `base-especial-penosidade-enfermagem-petroleiro`.
Periculosidade motociclista. `base-especial-periculosidade-motociclista-nr16-anexov`.
Categoria profissional pré-1995. `base-especial-categoria-profissional-pre1995`.

Quando o PPP atravessar mudança de layout, acionar adicionalmente `base-especial-ppp-mudanca-layout-historico`.

### Passo 4. Enquadramento temporal

Identificar regime aplicável. Antes de 13/11/2019, regra do art. 57 da Lei 8.213/91 com `base-aposentadoria-direito-adquirido`. Após 13/11/2019, EC 103 com `base-aposentadoria-especial-transicao-ec103`. Conversão de tempo via `base-tempo-especial-conversao`.

### Passo 5. Definição de rito processual

Acionar `tempo-especial-peticoes-por-rito` para escolha entre JEF, rito ordinário TRF e CRPS. Considerar alçada e posicionamento do órgão julgador.

### Passo 6. Verificações obrigatórias

Tema 1124/STJ via `tema-1124-instrucao-administrativa` para confirmar que o PPP foi apresentado ao INSS. Se não foi, alertar risco de extinção sem mérito.

Período de graça via `periodo-graca-qualidade-segurado`.

Reafirmação da DER via `reafirmacao-der` quando houver dúvida sobre melhor DIB.

### Passo 7. Redação da peça

Acionar `peticao-previdenciaria` no padrão do escritório. Quando houver demora administrativa caracterizada, acionar `mandado-seguranca-previdenciario` em alternativa.

### Passo 8. Revisão automática

Acionar `revisao-peticao` para auditoria das quatro camadas (formal, normativa, fática, argumentativa).

## 3. Documentos essenciais a solicitar

PPP completo (todos os campos), LTCAT (mesmo extemporâneo), PGR atual, laudos técnicos, CAT, CTPS, CNIS, GFIP, contracheques quando relevante, declaração da empresa quando o PPP for parcial.

## 4. Pontos críticos pró-segurado

Tema 555/STF não neutraliza ruído acima de 85 dB. Refutar EPI eficaz para ruído mediante `defesa-probatoria-especial`.

PPP que não traz NEN para ruído após 18/11/2003 é insuficiente apenas se outros elementos não permitirem aferir a habitualidade. Refutar com `base-especial-ruido` e Comunicado CRPS 99/2025.

Empresa extinta ou recusa em retificar PPP. Acionar `documentos-comprobatorios-in128` para perícia indireta e prova testemunhal nos termos da Súmula 198/TFR.

Categoria profissional pré-1995 enquadrada por presunção de exposição. Acionar `base-especial-categoria-profissional-pre1995` para evitar exigência indevida de PPP em períodos anteriores aos Decretos 53.831/64 e 83.080/79.

## 5. Postura

Pró-segurado integral. Identificar fragilidades probatórias da posição do INSS, explorar a presunção qualitativa para agentes biológicos, químicos e cancerígenos, e levar o caso ao rito mais favorável.

## Fungibilidade aplicável

Fungibilidade previdenciária. Acionar `base-fungibilidade-previdenciaria` para análise da relação entre este benefício e outros eventualmente cabíveis (REsp 2.246.096/MG, Tema 217 TNU, Tema 1018 STJ, Tema 995 STJ, vedação à conversão prejudicial).
