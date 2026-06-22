---
name: base-documentos-comprobatorios-in128
description: Skill versionada no plugin (Onda 50) sobre documentos comprobatórios da IN 128/2022, assinatura a rogo, cartas de documentos para clientes e checklists por benefício. Use SEMPRE que mencionar documentos para o INSS, provar vínculo, atividade rural, segurado especial, aposentadoria especial, contribuinte individual, PPP, LTCAT, SB-40, DSS-8030, provas de dependência, união estável, tempo de serviço, tempo militar, art. 46, art. 48, art. 54, art. 91, art. 116, art. 272, art. 275, art. 557 IN 128/2022, Justificação Administrativa, Pesquisa Externa, contemporaneidade, autodeclaração, DAP, CAF, PRONAF, bloco de notas, ITR, assinatura a rogo, Tema 1.116 STJ, carta de documentos, carta de documentos para cliente, gerador de carta, checklist documentos cliente, lista documentos benefício, refinamento checklist, documento que faltou, documento que fez diferença, documentos por benefício, doc B31 doc B91 doc B92 doc B94 doc B21 doc B25 doc B80 doc B41 doc B42 doc B87 doc B88, salário-maternidade documentos, BPC documentos, pensão por morte documentos, aposentadoria por idade documentos, aposentadoria PCD documentos, auxílio-doença documentos, RG CIN CNH CTPS CPF requerimento, procuração modelo INSS, termo de representação legal, tutela curatela termo de guarda, carta-documentos-inss, advprevidenciaria.netlify.app, central do escritório, atestado médico CRM CRO RMS, comprovante dependência financeira, certidão união estável, declaração de hipossuficiência, declaração CadÚnico, comprovante residência 180 dias, certidão nascimento adoção, termo de guarda. Aciona AUTOMATICAMENTE no início de qualquer fluxo de requerimento administrativo, recurso ao CRPS, petição inicial de concessão e revisão. Cruza com base-cnis-acerto-indicadores (Onda 50), peticao-previdenciaria, requerimento-administrativo-inss, base-portarias-dpmf-inss-hub, base-aluno-aprendiz, base-servico-militar-obrigatorio, base-tempo-rural-anterior-1991, perspectiva-genero-previdenciario, segurado-especial-rural, formacao-documentacao-did-pcd, base-modelo-relatorio-medico-incapacidade-b31-b91-b92, base-modelo-relatorio-medico-bpc-loas-deficiente, base-modelo-relatorio-medico-aposentadoria-pcd-lc142, base-modelo-relatorio-medico-auxilio-acidente-b94, carta-servicos-inss. Fonte primária sobre documentação perante o INSS e cartas de documentos para clientes.
---

# Documentos Comprobatórios - IN 128/2022 e Carta para Clientes - Versão Plugin v1.40

## VISÃO GERAL E POSTURA

Esta skill é a versão versionada no plugin `base-conhecimento-inss` (Onda 50) da skill local do escritório `documentos-comprobatorios-in128`. Centraliza dois eixos de uso.

**Eixo 1 - Marco normativo da IN 128/2022.** Documentos exigíveis pelo INSS, formas de produção da prova material, contemporaneidade, autodeclaração, Justificação Administrativa, Pesquisa Externa, assinatura a rogo (Tema 1.116/STJ).

**Eixo 2 - Carta de documentos para clientes.** Checklist operacional por benefício para entregar ao cliente no início do atendimento, baseado no site oficial do escritório `https://advprevidenciaria.netlify.app/` (Carta gerada para clientes - v43.0).

Postura exclusivamente pró-segurado. A carta deve PREVER documentos que não foram explicitamente pedidos pelo INSS para evitar exigências futuras e indeferimentos por insuficiência probatória.

## FONTE PRIMÁRIA

**Carta do escritório.** `https://advprevidenciaria.netlify.app/` - gerador interativo com checklist por benefício atualizado em 21/06/2026 (v43.0). Site mantido pela skill `carta-servicos-inss`.

**IN PRES/INSS nº 128/2022.** Texto integral em `/sessions/fervent-bold-lovelace/mnt/INSS/base-legislacao/05-Instrucoes-Normativas/` (Onda 31). Atualizada pela IN 164/2024.

**Portaria DIRBEN/INSS 991/2022.** Concessão e revisão (Livro II).

## NÚCLEO COMUM A TODO REQUERIMENTO

Em PRATICAMENTE TODOS os benefícios, são exigidos do titular.

1. **Documento de identificação.** RG, CIN, CNH ou CTPS.
2. **CPF.**
3. **Comprovante de residência.** Até 180 dias da propositura, em nome do titular ou de terceiro (com declaração + RG do terceiro).
4. **Procuração.** Modelo INSS ou pública, datada de até 12 meses.
5. **Em caso de procuração eletrônica.** Plataforma credenciada pela ICP-Brasil (art. 1º §2º III "a" Lei 11.419/2006 e MP 2.200-2/2001).
6. **Em caso de representação legal.** Identificação e CPF do representante + termo de representação (tutela, curatela, guarda).

Cruzar com `base-cnis-acerto-indicadores` para o CNIS analisado e indicadores tratados ANTES do requerimento.

## CHECKLIST POR BENEFÍCIO

### APOSENTADORIA POR IDADE URBANA

Documentos do núcleo comum. Não há documentos comprobatórios adicionais específicos além do tempo/contribuição já registrado no CNIS.

**Documentos adicionais pró-segurado.**
- Histórico de Vínculos e Remunerações (HISCRE) e Resumo de Períodos do CNIS.
- Cópia de CTPS completa (para reforço se houver indicador PEXT ou PVIN-CAGED).
- Cópia de PIS-PASEP e NIT.

Cruzar com `aposentadoria-idade-hibrida`.

### APOSENTADORIA POR IDADE HÍBRIDA (art. 48 §3º Lei 8.213)

Soma de tempo rural + urbano.

**Documentos rurais (núcleo de prova material - rol exemplificativo).**
- Certidão de casamento qualificando como rural.
- Certidão de nascimento de filhos com mesma qualificação.
- Declaração do Sindicato dos Trabalhadores Rurais.
- Declaração de Aptidão ao PRONAF (DAP) ou Cadastro Nacional de Agricultor Familiar (CAF).
- Documentos do imóvel (ITR, escritura, comodato, parceria).
- Bloco de notas do produtor rural.
- Comprovantes de aquisição de insumos rurais.
- Histórico escolar rural dos filhos.
- Cartão SUS rural.
- Boletim de Ocorrência rural.
- Fotos da família em atividade rural.

**Provas testemunhais.** Rol de 3-5 testemunhas qualificadas.

Cruzar com `segurado-especial-rural`, `documentos-comprobatorios-in128`, `aposentadoria-idade-hibrida`, `perspectiva-genero-previdenciario`.

### APOSENTADORIA POR IDADE RURAL (60 H / 55 M)

Análogo à híbrida no aspecto rural. Idade reduzida.

### APOSENTADORIA POR TEMPO DE CONTRIBUIÇÃO (regras de transição EC 103/2019)

Documentos do núcleo comum. CNIS analisado e tratado.

**Documentos adicionais.**
- CTPS completa.
- Carnê de contribuinte individual.
- Comprovantes de GPS antigos.
- DARF EC 103 (códigos 1163/1457/1503/1554/1872/1873).
- CTC de outros regimes (se aplicável - cruzar com `base-contagem-reciproca-rgps-rpps`).

### APOSENTADORIA ESPECIAL

Documentos do núcleo comum.

**Documentos por agente nocivo.**
- PPP (Perfil Profissiográfico Previdenciário) - obrigatório (art. 272 IN 128).
- LTCAT (Laudo Técnico das Condições Ambientais).
- DSS-8030, SB-40 (períodos antigos).
- CAT (Comunicação de Acidente do Trabalho) - se aplicável.
- Comprovante de exposição a EPI (laudo médico).
- PGR/PCMSO.

Cruzar com `auditoria-ppp`, `defesa-probatoria-especial`, `tempo-especial-peticoes-por-rito`.

### APOSENTADORIA DO PROFESSOR

Documentos do núcleo comum + identificação do magistério.

**Documentos específicos.**
- Atestado/declaração da escola comprovando exercício de magistério na educação básica.
- Cópia da CTPS com função magistério.
- Comprovantes de exercício como diretor, coordenador pedagógico (se aplicável - Lei 11.301/2006).

Cruzar com `aposentadoria-professor-rgps`.

### APOSENTADORIA POR TEMPO - PCD (LC 142/2013)

Documentos do núcleo comum + comprovação da deficiência.

**Documentos específicos.**
- Laudo médico completo (modelo `base-modelo-relatorio-medico-aposentadoria-pcd-lc142`).
- Relatórios de especialista (reumatologia, ortopedia, psiquiatria, neurologia conforme CID).
- Exames complementares.
- Documentos pretéritos de tratamento desde a DID.
- Carteira CIPTEA (se autista).
- Histórico social.

Cruzar com `aposentadoria-deficiencia`, `formacao-documentacao-did-pcd`.

### APOSENTADORIA POR IDADE - PCD (LC 142/2013)

Idem aposentadoria PCD por tempo, mas idade reduzida (60 H / 55 M).

### AUXÍLIO POR INCAPACIDADE TEMPORÁRIA (B31)

Documentos do núcleo comum.

**Documento comprobatório central.**
- Laudo, relatório e/ou atestado médico legível, sem rasuras, contendo:
  - Nome completo do paciente.
  - Data de emissão.
  - Período estimado de repouso.
  - Assinatura e carimbo com CRM/CRO/RMS (assinatura eletrônica admitida).
  - Doença ou CID.

**Documentos adicionais pró-segurado.**
- Receituários médicos.
- Resultados de exames.
- Atestados de internação.
- Prontuário (se disponível).
- CTPS com afastamento.

Cruzar com `base-incapacidade-b31-temporaria`, `analise-documental-incapacidade`, `base-modelo-relatorio-medico-incapacidade-b31-b91-b92`.

### AUXÍLIO POR INCAPACIDADE TEMPORÁRIA ACIDENTÁRIA (B91-acidentário, na nomenclatura nova B32)

Documentos do B31 + CAT (Comunicação de Acidente do Trabalho).

Sem CAT da empresa, requerer CAT equiparada (art. 22 §2º Lei 8.213).

Cruzar com `ntep-nexo-acidentario`, `base-incapacidade-acidentaria-b92`.

### AUXÍLIO-ACIDENTE (B94)

Documentos do B31 + sequela permanente comprovada.

Aplicação do **padrão Núcleo 4.0 do TJSP** (9 tópicos) em ações judiciais. Cruzar com `base-auxilio-acidente-b94-pos-reforma` (Onda 43 atualizada).

### APOSENTADORIA POR INCAPACIDADE PERMANENTE ACIDENTÁRIA (B92)

Documentos do B91 + acidente de trabalho + nexo.

Cruzar com `base-incapacidade-acidentaria-b92`.

### REABILITAÇÃO PROFISSIONAL (B26)

Documentos do B31 + indicação de reabilitação.

Cruzar com `base-reabilitacao-profissional` e `base-reabilitacao-profissional-portaria-1310-1333`.

### PENSÃO POR MORTE URBANA (B21)

**Documentos da pessoa falecida.**
- Identificação (RG, CIN, CNH, CTPS).
- Certidão de óbito.

**Documentos dos dependentes.**
- Identificação.
- **Comprovação de dependência (vínculo com o falecido).**

**Tipos de comprovação de dependência.**

Para cônjuge/companheiro.
- Certidão de casamento ou união estável.
- Comprovantes de coabitação (contas no mesmo endereço).
- Plano de saúde conjunto.
- Conta-conjunta bancária.
- Declarações de IRPF como dependente.
- Fotos do casal.

Para filhos menores de 21 ou inválidos.
- Certidão de nascimento.
- Laudo médico de invalidez (se aplicável).

Para pais idosos com dependência econômica.
- Certidão de nascimento do falecido (filiação).
- Comprovantes de contribuição financeira (depósitos, transferências, despesas comuns).

Para irmãos menores ou inválidos.
- Certidão de nascimento + comprovantes de dependência.

Cruzar com `pensao-por-morte` e `base-pensao-por-morte-uniao-estavel-prova`.

### AUXÍLIO-RECLUSÃO (B25)

Documentos do núcleo comum + certidão de prisão.

**Documentos específicos.**
- Certidão judicial de prisão.
- Comprovante do regime fechado.
- Comprovante de baixa renda do segurado preso (atualizado).
- Comprovantes de dependência (idem pensão por morte).

Cruzar com `auxilio-reclusao-previdenciario`.

### BPC/LOAS - PESSOA COM DEFICIÊNCIA (B87)

**Documentos do titular e de TODAS as pessoas que moram na mesma casa.**
- Identificação (RG, CIN, CNH, CTPS).
- CPF de cada um.

**Documentos específicos.**
- Inscrição no CadÚnico ATUALIZADA (máx. 24 meses).
- Comprovantes de renda de cada membro.
- Comprovantes de despesas (Anexo I Portaria 34/2025 sobre comprometimento de renda).
- Laudo médico completo (modelo `base-modelo-relatorio-medico-bpc-loas-deficiente`).
- Exames complementares.
- Histórico social.
- Comprovante de baixa renda familiar.
- Comprovante de residência.

Cruzar com `analise-bpc-loas`, `bpc-renda-grupo-familiar`, `base-bpc-loas-requisitos`, `formacao-documentacao-did-pcd`, `base-cadastro-domiciliar-cadunico-in21-2026`.

### BPC/LOAS - IDOSO (B88)

Idem BPC PCD, mas sem documentação de deficiência. Comprovação de idade 65+ e baixa renda familiar.

### SALÁRIO-MATERNIDADE (B80)

Documentos do núcleo comum.

**Documentos por situação.**

Afastamento 28 dias antes do parto.
- Atestado médico original específico para gestante.

Adoção.
- Nova certidão de nascimento emitida após decisão judicial.

Guarda para adoção.
- Termo de Guarda indicando finalidade de adoção.

Cruzar com `base-salario-maternidade-pos-reforma`.

### SEGURADO ESPECIAL (todas modalidades)

**Documentos do núcleo comum + comprovação de atividade rural.**

Autodeclaração rural com base no art. 94 §5º Lei 8.213/91 (Portaria DIRBEN/INSS específica). Lista exemplificativa.

Material complementar.
- DAP/CAF (Cadastro Nacional do Agricultor Familiar).
- Sindicato rural.
- ITR.
- Bloco de notas.
- Contas de luz/água com endereço rural.
- Certidões com qualificação rural.
- PRONAF.

Cruzar com `segurado-especial-rural`, `base-segurado-especial-autodeclaracao-arts-92-93-94`.

### CONTRIBUINTE INDIVIDUAL

**Documentos do núcleo comum.**
- GPS dos períodos.
- Carnê de contribuinte individual.
- DARF EC 103 (se aplicável).
- Notas fiscais como prestador de serviço.
- Contratos de prestação.
- Recibos.
- Comprovação da categoria específica (autônomo, profissional liberal, MEI, sócio, médico-residente, cartorário, etc).

Cruzar com `contribuinte-individual-in128`.

## SERVIÇOS COMPLEMENTARES

### ACERTO DE CNIS

Documentos do núcleo comum + documentos comprobatórios da pendência.

Cruzar com `base-cnis-acerto-indicadores` (Onda 50).

### INDENIZAÇÃO DE CONTRIBUIÇÕES EM ATRASO (art. 45-A Lei 8.212)

Documentos do núcleo comum + comprovação do período a indenizar + atividade no período + cálculo da indenização.

Cruzar com `indenizacao-contribuicoes-atraso`.

### REVISÕES DE BENEFÍCIO

Documentos do benefício original (CONCAL, CONBAS, CONPRI) + nova documentação que justifica a revisão.

Cruzar com `base-revisao-vida-toda-rvt`, `base-revisao-art29-melhor-beneficio`, `base-revisao-teto-buraco-negro-verde`, `base-revisao-irsm-fevereiro-1994`, `base-revisao-atividades-concomitantes-tema1070`.

## ASSINATURA A ROGO E ANALFABETO (Tema 1.116/STJ)

Quando o segurado for analfabeto ou impossibilitado de assinar.

**Procedimento.**
- Aposição de impressão digital na presença de funcionário do INSS (art. 15 §2º Decreto 6.214 para BPC).
- Para outros benefícios, presença de duas testemunhas (assinatura a rogo).
- Tema 1.116/STJ. Validade da procuração pública e cuidados procedimentais.

## JUSTIFICAÇÃO ADMINISTRATIVA E PESQUISA EXTERNA (IN 128/2022)

Quando faltar prova documental suficiente.

**Justificação Administrativa (JA).** Art. 557 IN 128/2022. Audiência administrativa com testemunhas. Útil para tempo rural, união estável, dependência econômica.

**Pesquisa Externa (PEXT).** Realizada pelo servidor do INSS. Útil para confirmar fato controvertido.

REQUERER NO PRÓPRIO REQUERIMENTO. Anexar declaração de testemunhas e endereço do imóvel rural.

## CARTA DE DOCUMENTOS DO ESCRITÓRIO

O escritório mantém site dedicado com gerador interativo de carta de documentos por benefício.

URL. `https://advprevidenciaria.netlify.app/`

Skill responsável pela manutenção. `carta-servicos-inss`.

Versão atual. v43.0 (21/06/2026).

Funcionalidade. Cliente recebe carta personalizada com lista de documentos específicos do seu benefício, incluindo orientações sobre formatos aceitos e validade.

## CRUZAMENTO COM OUTRAS SKILLS

- `base-cnis-acerto-indicadores` (Onda 50). Análise CNIS antes do requerimento.
- `peticao-previdenciaria`. Geração de petição com documentos referenciados por ID.
- `requerimento-administrativo-inss`. Protocolo administrativo.
- `base-portarias-dpmf-inss-hub`. Portarias 990-996.
- `base-aluno-aprendiz`. Documentos específicos.
- `base-servico-militar-obrigatorio`. CTC militar.
- `base-tempo-rural-anterior-1991`. Tempo rural pré-1991.
- `perspectiva-genero-previdenciario`. Resolução CNJ 492/2023 (Protocolo de Gênero).
- `segurado-especial-rural`. Autodeclaração e prova material.
- `formacao-documentacao-did-pcd`. DID retroativa para PCD.
- `base-modelo-relatorio-medico-*` (4 skills). Modelos prontos para médicos.
- `carta-servicos-inss`. Manutenção do site.
- `analise-documental-incapacidade`. Portarias Conjuntas 13, 14, 15/2026.

## ALERTA FINAL

Documento ENVIADO ao INSS no requerimento administrativo é IMPRESCINDÍVEL para fundamentar petição judicial posterior, em razão do Tema 1124/STJ (instrução administrativa adequada). Cruzar com `tema-1124-instrucao-administrativa`.

Documento NÃO ENVIADO administrativamente pode causar EXTINÇÃO SEM MÉRITO na via judicial por falta de prévio requerimento adequado.

Verificar checklist do escritório ANTES do requerimento administrativo e ANTES da petição judicial.
