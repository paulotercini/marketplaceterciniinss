# Recursos, Prazos Legais e Checklists Pré-Atendimento
## Base: Lei 8.213/1991 | Decreto 3.048/1999 | IN 128/2022 | Lei 9.784/1999 | Decreto 9.830/2019

---

## Parte 1 — Recursos contra indeferimento de RAC ou benefício

### 1.1 Recurso Ordinário ao CRPS

**Prazo para interpor:** 30 dias a partir da ciência da decisão (art. 305, Decreto 3.048/1999).

**Para quem:** o segurado ou seu representante legal / advogado constituído.

**Canal:** Meu INSS (para pessoas físicas) ou presencialmente na APS (para pessoas jurídicas e casos específicos).

**Quem julga:** Junta de Recurso do CRPS (Conselho de Recursos da Previdência Social) — primeiro grau recursal.

**Efeito:** suspensivo. O benefício não é cancelado enquanto o recurso estiver pendente de julgamento, se já estava sendo pago.

**Peça:** petição de recurso ordinário. A skill `peticao-previdenciaria` deve ser usada para redigir a peça.

### 1.2 Recurso Especial ao CRPS (Câmara de Julgamento)

**Cabimento:** quando a decisão da Junta contrariar lei, decreto ou regulamento; quando houver divergência entre decisões de Juntas diferentes sobre a mesma matéria.

**Prazo:** 30 dias da ciência da decisão da Junta.

**Canal:** mesmo que o recurso ordinário.

**Quem julga:** Câmara de Julgamento do CRPS — segundo grau recursal.

### 1.3 Recurso administrativo contra indeferimento de acerto de CNIS (RAC)

**Situação:** INSS indefere o pedido de acerto de vínculo, remuneração ou contribuição.

**Importante:** o segurado tem direito a recurso administrativo, com prazo de 30 dias, salvo nas hipóteses de decisão conclusiva da JA (que é irrecorrível na via administrativa).

**O que alegar:** violação ao art. 12 da IN 128/2022 (direito de solicitar acerto a qualquer momento), com documentação probatória insuficientemente analisada.

**Se o servidor negar abertura do RAC sem benefício em andamento:** isso é ilegal. Citar expressamente o art. 12 da IN 128/2022 (com redação da IN 164/2024): "O filiado poderá solicitar, a qualquer momento, a inclusão, alteração, ratificação ou exclusão das informações divergentes... independentemente de requerimento de benefício." Registrar a negativa e formalizar reclamação na Ouvidoria do INSS.

### 1.4 Via judicial após esgotamento administrativo

**Quando ir ao Judiciário:**
- Recurso ordinário e especial no CRPS foram negados
- JA foi declarada ineficaz (não cabe recurso administrativo)
- INSS está em silêncio além do prazo legal (omissão administrativa)
- Negativa clara de direito legalmente assegurado

**Foros:**
- Juizado Especial Federal (JEF): causas até 60 salários mínimos, sem necessidade de advogado (mas recomendável)
- Vara Federal comum: causas acima de 60 salários mínimos

**Ação recomendada:** ação de concessão ou restabelecimento de benefício previdenciário, cumulada com pedido de reconhecimento de tempo de serviço quando necessário.

**Mandado de segurança:** cabível quando há direito líquido e certo violado por ato ilegal da autoridade — ex: INSS se recusa a processar RAC contrariando a IN 128/2022. Prazo: 120 dias da ciência do ato.

---

## Parte 2 — Prazos legais de resposta do INSS

### 2.1 Prazos por tipo de demanda

| Demanda | Prazo legal | Base normativa |
|---|---|---|
| Requerimento de benefício (regra geral) | 45 dias corridos | Art. 41-A, Lei 8.213/1991 |
| Benefício de aposentadoria por tempo de contribuição | 45 dias úteis | Carta de Serviços INSS 2025 |
| BPC à pessoa com deficiência | 45 dias corridos | Carta de Serviços INSS 2025 |
| Salário-maternidade | 45 dias corridos | Carta de Serviços INSS 2025 |
| Pensão por morte | 45 dias corridos | Carta de Serviços INSS 2025 |
| Acerto de CNIS (RAC) | 30 a 45 dias corridos | Carta de Serviços INSS 2025 |
| Recurso ordinário no CRPS | Não há prazo legal expresso fixado | — |
| Análise de JA após oitiva | 60 dias (estimado pelo INSS) | Gov.br/INSS |
| Resposta a requerimento administrativo geral | 30 dias (prorrogáveis por mais 30) | Art. 49, Lei 9.784/1999 |
| Decisão em processo administrativo com partes | 30 dias (prorrogáveis) | Art. 49, Lei 9.784/1999 |

### 2.2 O que fazer quando o INSS não responde no prazo

**Passo 1 — Ouvidoria do INSS:**
Registrar manifestação em https://www.gov.br/inss > "Fale com o INSS" > Ouvidoria. Ou pelo 135 solicitando abertura de manifestação de reclamação. O INSS tem prazo de 20 dias para responder.

**Passo 2 — Reclamação no Fala.BR (plataforma integrada de ouvidorias):**
https://falabr.cgu.gov.br — registrar reclamação contra o INSS. O órgão tem prazo de 20 dias para responder.

**Passo 3 — Mandado de segurança por omissão:**
Após esgotado o prazo legal e configurada a mora administrativa, o MS é cabível para compelir o INSS a decidir. Prazo: 120 dias da ciência da omissão (contado do dia em que o prazo legal venceu).

**Passo 4 — Ação ordinária com tutela de urgência:**
Para casos em que a demora causa dano grave ao segurado (ex: doente que precisa do auxílio-doença). Pedir tutela de urgência antecipada para concessão provisória do benefício.

### 2.3 Benefícios com DER — data de entrada do requerimento

O benefício, uma vez deferido, é pago desde a DER (data da entrada do requerimento), não da data da concessão. Atrasos do INSS não prejudicam o segurado em relação ao período de competência — apenas geram atrasados (parcelas retroativas).

---

## Parte 3 — Checklists pré-atendimento por tipo de caso

### Checklist A — GPS recolhida em código errado

- [ ] Identificar o código GPS utilizado e o código correto
- [ ] Verificar o perfil do segurado: categoria, modalidade de contribuição, tipo de atividade
- [ ] Reunir comprovante original da GPS (com autenticação bancária visível)
- [ ] Obter extrato do CNIS para verificar como a contribuição está registrada
- [ ] Identificar se a contribuição está em NIT correto com código errado (acerto simples) ou em NIT errado (transferência)
- [ ] Definir se usar Anexo I-F (simplificado) ou RAC completo
- [ ] Abrir requerimento pelo 135 ou APS antes de enviar o formulário
- [ ] Preparar declaração para caso de contestação pelo INSS

### Checklist B — Vínculo CLT ausente no CNIS

- [ ] Reunir CTPS com anotações do período
- [ ] Reunir holerites ou extrato FGTS do período
- [ ] Verificar se a empresa ainda existe (CNPJ ativo)
- [ ] Se empresa extinta: obter certidão da Junta Comercial, buscar documentos alternativos
- [ ] Verificar se o período é anterior ou posterior ao eSocial (muda o procedimento)
- [ ] Para período no eSocial: solicitar Declaração de Confirmação (Anexo II) da empresa
- [ ] Para período pré-eSocial: reunir CTPS, holerites, TRCT, extrato FGTS
- [ ] Definir formulário: Anexo I-B (empregado/doméstico) ou RAC completo
- [ ] Avaliar se JA é necessária (empresa extinta sem documentos)
- [ ] Abrir requerimento pelo 135 ou APS

### Checklist C — Período como CI sem lançamento no CNIS

- [ ] Verificar o período com precisão (início e fim)
- [ ] Reunir GPS quitadas do período (com código correto)
- [ ] Verificar se o código GPS usado está correto para a modalidade do CI
- [ ] Obter extrato CNIS para confirmar que o período está mesmo ausente
- [ ] Se GPS está lançada mas com código errado: usar Anexo I-F
- [ ] Se GPS está lançada no NIT certo mas atividade não está: usar Anexo I-E
- [ ] Se GPS foi recolhida mas não está no CNIS: verificar se o NIT do recolhimento está correto
- [ ] Para CI prestador a PJ: verificar se a empresa recolheu e identificar o contratante
- [ ] Definir formulário: Anexo I-D (CI prestador), I-E (atividade) ou I-F (contribuição)

### Checklist D — Trabalho rural / segurado especial sem documentação

- [ ] Identificar exatamente o período a ser comprovado
- [ ] Mapear todos os documentos contemporâneos disponíveis (mesmo que incompletos)
- [ ] Verificar se há documento em nome de familiar do grupo familiar (pode servir como início de prova)
- [ ] Identificar 2 a 6 testemunhas idôneas sem impedimento legal
- [ ] Verificar se a situação é de segurado especial (economia familiar) ou empregado rural
- [ ] Para segurado especial: reunir comprovantes de venda de produção, DAP, CCIR
- [ ] Para empregado rural: reunir CTPS rural ou declaração do empregador rural
- [ ] Avaliar se JA é necessária (geralmente é para períodos antigos)
- [ ] Se JA: preparar requerimento com descrição clara dos fatos e lista de testemunhas
- [ ] Alertar cliente: decisão da JA é definitiva na via administrativa

### Checklist E — Benefício negado ou cancelado (recurso)

- [ ] Verificar a data de ciência da decisão (prazo de 30 dias começa a contar daqui)
- [ ] Obter cópia integral do processo administrativo (direito do segurado)
- [ ] Identificar o fundamento da negativa (incapacidade, carência, qualidade de segurado, tempo etc.)
- [ ] Reunir documentação que contradiz ou complementa o que foi analisado
- [ ] Se negativa por incapacidade: avaliar laudo pericial (skill `auditoria-laudo-pericial`)
- [ ] Se negativa por tempo insuficiente: verificar se há períodos a regularizar no CNIS
- [ ] Verificar se houve JA negada no processo (nesse caso, recurso ao CRPS não ataca a JA)
- [ ] Redigir recurso ordinário (skill `peticao-previdenciaria`)
- [ ] Protocolar no Meu INSS ou presencialmente na APS dentro do prazo

### Checklist F — Problema sistêmico / NITs duplicados

- [ ] Identificar todos os NITs associados ao CPF do cliente
- [ ] Verificar quais contribuições estão em cada NIT
- [ ] Identificar qual NIT é o principal (geralmente o mais antigo ou com mais contribuições)
- [ ] Verificar se há PIS (Caixa) ou PASEP (Banco do Brasil) envolvidos
- [ ] Se PIS: acionar a Caixa Econômica Federal para desfazimento de elo indevido
- [ ] Se PASEP: acionar o Banco do Brasil
- [ ] Para unificação no INSS: abrir requerimento pelo 135 com os NITs a unificar
- [ ] Acompanhar a tarefa no Meu INSS para juntada de documentos
- [ ] Verificar se contribuições dos NITs secundários foram transferidas ao NIT principal após unificação

---

## Parte 4 — Reclamações e canais de controle

### Ouvidoria do INSS
- Canal online: https://www.gov.br/inss/pt-br/fale-com-o-inss/ouvidoria
- Telefone: 135 (opção Ouvidoria)
- Prazo de resposta: 20 dias

### Fala.BR (plataforma federal de ouvidorias)
- https://falabr.cgu.gov.br
- Serve para: denúncias, reclamações, sugestões e elogios a qualquer órgão federal incluindo INSS
- Prazo de resposta: 20 dias

### CGU (Controladoria-Geral da União)
- Para omissões graves ou sistemáticas do INSS
- https://www.cgu.gov.br/assuntos/auditoria-e-fiscalizacao

### Defensorias Públicas Federais
- Assistência gratuita ao segurado que não tem advogado
- https://www.dpu.def.br (Defensoria Pública da União)
