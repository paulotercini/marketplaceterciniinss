# Relatório — Site x Base de Conhecimento

**Comparação entre o site público do escritório e a base de conhecimento previdenciário (`base-conhecimento-inss`, v1.24.0 — 117 skills temáticas).**

- **Site:** https://advocacia-previdenciaria29.webnode.page
- **Escritório:** Dr. Paulo Roberto Tercini Filho — OAB/SP 331.110 — Monte Alto/SP
- **Data:** 2026-06-04

---

## 1. Resumo executivo

O site hoje divulga **3 serviços de destaque** (Aposentadoria Especial, Planejamento Previdenciário, Auxílio-doença) e menciona, em texto/notícias, cerca de **5 temas** no total. A base de conhecimento cobre **117 áreas temáticas** com fundamentação normativa.

**Conclusão:** o site expõe menos de **5%** do arsenal técnico do escritório. Existem dezenas de serviços de **alto apelo de captação** (revisões, BPC/LOAS, pensão por morte, benefícios por incapacidade, aposentadoria do professor e da PcD) que **não aparecem** no site e poderiam virar páginas de serviço e artigos de blog.

---

## 2. O que o site JÁ cobre

| Tema no site | Skill(s) correspondente(s) na base | Cobertura |
|---|---|---|
| Aposentadoria Especial (só ruído) | `base-especial-ruido` + 12 outras skills de agentes nocivos | **Parcial** — só ruído mencionado |
| Aposentadoria por tempo / direito adquirido / transição EC 103 | `base-aposentadoria-direito-adquirido`, `base-aposentadoria-transicao-ec103`, `base-aposentadoria-regra-permanente-ec103` | Parcial |
| Planejamento Previdenciário | `base-planejamento-previdenciario`, `base-aposentadoria-futura-pipeline` | OK |
| Auxílio-doença | `base-incapacidade-b31-temporaria` | Parcial |
| Carência | `base-carencia-por-especie-art27a` | Citado en passant |

---

## 3. LACUNAS — serviços da base ausentes no site

Agrupados por bloco temático e ordenados por potencial de captação.

### 3.1. Revisões de benefício (alto apelo — clientes que já recebem benefício)
- **Revisão da Vida Toda** — `base-revisao-vida-toda-rvt`
- **Revisão de atividades concomitantes (Tema 1070/STJ)** — `base-revisao-atividades-concomitantes-tema1070`
- **Revisão do teto / buraco negro e verde** — `base-revisao-teto-buraco-negro-verde`
- **Revisão do art. 29 / melhor benefício** — `base-revisao-art29-melhor-beneficio`
- **Revisão IRSM fev/1994 e ORTN/OTN** — `base-revisao-irsm-fevereiro-1994`, `base-revisao-reajuste-ortn-otn`
- **Desaposentação / reaposentação** — `base-desaposentacao-reaposentacao`

### 3.2. Benefício assistencial — BPC/LOAS (altíssima demanda)
- **BPC/LOAS — requisitos** — `base-bpc-loas-requisitos`
- **BPC ao idoso e à PcD** — `base-bpc-aposentadoria-pcd-procedimentos`, `base-bpc-impedimento-longo-prazo`
- **Renda per capita / miserabilidade** — `base-bpc-renda-per-capita-miserabilidade`
- **CadÚnico, PBF e regras 2026** — `base-bpc-pbf-anuencia-in54-2026`, `base-cadastro-domiciliar-cadunico-in21-2026`

### 3.3. Benefícios por incapacidade e acidentários
- **Aposentadoria por incapacidade permanente (B91)** — `base-incapacidade-b91-permanente`
- **Auxílio-acidente (B94)** — `base-auxilio-acidente-b94-pos-reforma` (+ skills de nexo NTEP, sequela mínima)
- **Auxílio por incapacidade acidentário (B92)** — `base-incapacidade-acidentaria-b92`
- **Reabilitação profissional** — `base-reabilitacao-profissional`

### 3.4. Pensões e dependentes
- **Pensão por morte (pós-reforma)** — `base-pensao-por-morte-pos-reforma`
- **Pensão e união estável — prova** — `base-pensao-por-morte-uniao-estavel-prova`
- **Auxílio-reclusão** — `base-auxilio-reclusao-pos-reforma`

### 3.5. Pessoa com Deficiência (PcD)
- **Aposentadoria da PcD (LC 142/2013)** — `base-aposentadoria-pcd-lc142`
- **Conversão de tempo especial em comum para PcD** — `base-pcd-conversao-tempo-especial-pcd`
- **Deficiência auditiva/visual, fibromialgia (Lei 15.176)** — `base-pcd-deficiencia-auditiva-visual`, `base-pcd-fibromialgia-lei15176`

### 3.6. Aposentadoria do professor
- **Direito adquirido (EC 20)** — `base-professor-direito-adquirido-ec20`
- **Regras de transição (pontos, pedágio, idade progressiva)** — `base-professor-regra-transicao-*`
- **Professor de educação infantil (Lei 15.326)** — `base-professor-educacao-infantil-lei15326`

### 3.7. Tempo rural, segurado especial e pesca
- **Tempo rural anterior a 1991** — `base-tempo-rural-anterior-1991`
- **Segurado especial — autodeclaração** — `base-segurado-especial-autodeclaracao-arts-92-93-94`
- **Seguro-defeso do pescador artesanal** — `base-seguro-defeso-pescador-artesanal`

### 3.8. Família e maternidade
- **Salário-maternidade (pós-reforma)** — `base-salario-maternidade-pos-reforma`
- **Salário-família** — `base-salario-familia-quota`

### 3.9. Cômputo de tempo especial e outros tempos
- **Aposentadoria Especial — TODOS os agentes** (hoje o site só cita ruído):
  químicos, biológicos, calor, frio, eletricidade/periculosidade, radiação ionizante, vibração, penosidade (enfermagem/petroleiro), periculosidade motociclista, categoria profissional pré-1995, EPI.
- **Conversão de tempo especial em comum** — `base-tempo-especial-conversao`
- **Aluno-aprendiz, serviço militar, contagem recíproca RGPS/RPPS** — `base-aluno-aprendiz`, `base-servico-militar-obrigatorio`, `base-contagem-reciproca-rgps-rpps`
- **Reclamatória trabalhista como prova previdenciária** — `base-reclamatoria-trabalhista-prova-previdenciaria`

### 3.10. Atuação judicial e administrativa (mostra força do escritório)
- Ações no **JEF**, recursos, **mandado de segurança** contra o INSS, **cumprimento de sentença / RPV / precatório**, recursos no **CRPS**, dano moral previdenciário.

---

## 4. Recomendações práticas para o site

1. **Expandir a página "Serviços"** de 3 para ~10 blocos, agrupando: *Aposentadorias · Revisões · Benefícios por incapacidade · BPC/LOAS · Pensão por morte · Salário-maternidade · PcD · Professor · Rural*.
2. **Criar um "hub de revisões"** — é o tema com maior conversão (cliente já recebe benefício e quer aumentar).
3. **Ampliar a página de Aposentadoria Especial** para listar todos os agentes nocivos (não só ruído) — capta categorias específicas (vigilante, frentista, soldador, enfermagem, eletricista, motociclista de entrega).
4. **Pauta de blog/notícias** alimentada pelas skills da base — 1 artigo por tema gera SEO local em Monte Alto/SP.
5. **Adicionar CTA e prova de atuação judicial** (JEF, mandado de segurança, RPV) para passar autoridade.

---

## 5. Tabela de priorização sugerida (próximas páginas)

| Prioridade | Página/serviço a criar | Justificativa |
|---|---|---|
| 1 | Revisão da Vida Toda + hub de revisões | Maior demanda/conversão |
| 2 | BPC/LOAS (idoso e PcD) | Altíssimo volume de público |
| 3 | Pensão por morte | Demanda recorrente e urgente |
| 4 | Benefícios por incapacidade (B91/B92/B94) | Complementa o auxílio-doença já existente |
| 5 | Aposentadoria Especial — todos os agentes | Aproveita estrutura já existente |
| 6 | Aposentadoria do professor | Nicho com regras próprias |
| 7 | Rural / segurado especial | Público regional (interior de SP) |
