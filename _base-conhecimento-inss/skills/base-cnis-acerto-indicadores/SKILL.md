---
name: base-cnis-acerto-indicadores
description: Skill versionada no plugin do escritório, consolidando indicadores do CNIS (Portaria DIRBEN/INSS 990/2022 alterada pela 1.316/2025, atualização normativa até 06/2026), formulários RAC (Anexo I, I-A, I-B, I-C, I-D, I-E, I-F da IN 128/2022 com redação da IN 164/2024), robotização (Portaria DIRBEN/INSS 1.087/2022 e 997/2022), checklist pré-requerimento e estratégia antirobotização. Use SEMPRE que analisar extrato CNIS, identificar pendências, indicadores bloqueantes, alertas, acerto de CNIS, acerto de vínculos remunerações e contribuições, RAC, impugnação de indicador, indicador acerto, ACNISVR ADIV-DADOS-GFIP AEXT AEXT-IND AEXT-INDJ AEXT-INDR AEXT-VI AEXT-VP AEXT-VPR AEXT-VPT AEXT-VT AEXT-VTJ AEXT-VTR ASE-DEF ASE-DEFJ ASE-DEFR ASE-IND ASE-INDR ASEF-DEF AVR-AGPVINC AVRC-AGPVINC AVRC-DEF AVRC-DGPVINC AVRC-IND, NDET PADM-EMPR PCEI-EQP-INV PCTC-NTR PDARF PDIV-DADOS-GFIP PDT-NASC-FIL-INV PEMP-CAD PEMP-IDINV PEXT PNIT-0094 PNIT-CRIT PNIT-IND PNIT-SC PNIT-SUP PREC-CDCONC PREC-COD1821 PREC-CSE PREC-FACULTCONC PREC-FBR PREC-FBR-ANT PREC-LC123-ANT PREC-LC150-DOM PREC-MENOR-MIN PREC-OBITO PREC-PMIG-DOM PREM-BLOQ-EC103 PREM-EMPR PREM-EXT PREM-FORA-ATIV-INTERM PREM-FORA-CONVOC PREM-FORA-REINTEG PREM-FVIN PREM-IVIN PREM-NASC PREM-OBITO PREM-POSGRT PREM-PER-QUARENTENA PREM-REINTEG PREM-TSVE PREM-VINC-PROC-TRAB PRES-EMPR PRPPS PRPSE PSC-MEN-SM-EC103 PSE-NEG PSE-PEN PSE-POS PSUC-DIVERG-DT-ADM PVIN-ADMISSAO PVIN-ADM-OBITO PVIN-AGRUP-INC PVIN-CAGED PVIN-DESLIG-JUSTIÇA-TRAB PVIN-DESLIG-OBITO PVIN-DESLIG-PROC-TRAB PVIN-IRREG PVIN-MAND-ELETIVO PVIN-OBITO PVIN-RE PVIN-REC-PROC-TRAB PVIN-RESP-INDIRETO PVIN-SUBSTIT-INC PVIN-TRAB-INTERM PVIN-UNIC-CONTR, FBR-AUT-BAT FBR-AUT-CONCBEN FBR-AUT-CONCQSA FBR-AUT-CONCSD FBR-AUT-DUPGRUPFAM FBR-AUT-EXPCAD FBR-AUT-FACULTCONC FBR-AUT-OBITO FBR-AUT-PENDCAD FBR-AUT-PENDPROCES FBR-AUT-RENPES FBR-AUT-RENSUP, GFIP IAGRU IAGRUP ICED-VR-EXC-EC103 ICOMPL-VR-SM-EC103 IDARF IDESINDEXA IDT IEAN IREC-DESINDEXA IREC-FBR IREC-INDPEND IREC-LC123 IREC-LIM-SM IREC-MEI IRECOL IREL-PREV-POSSUI-COMP-AJUST IREM-ACD IREM-PARC-CEDIDO IREM-PARC-DIR-SIND IREM-PERQRT IREM-RECL-TRAB IREM-REINTEG IREM-TRAB-INTERM IREM-VINC-PROC-TRAB ISALMIN ISE-CVU IUTILIZ-EXC-EC103 IVIN-AGRUP-VINC IVIN-DESLIG-JUSTICA-TRAB IVIN-JORN-DIFERENCIADA IVIN-MAND-ELETIVO IVIN-POSSUI-REG-PRELIM IVIN-POSSUI-REM-TRAB-INTERM IVIN-POSSUI-REM-TRANS IVIN-PROC-TRAB IVIN-REG-PRELIM IVIN-REINTEG IVIN-TRAB-INTERM IVIN-TRAB-VERDE-AMARELO IVIN-UNIC-CONTR IVLR-DARF-LIMITADO, GPS código errado, retificação GPS, complementação contribuição, NIT unificação, IN 164/2024, robotização, concessão automática, indeferimento automático, Portaria 1087/2022, Memorando-Circular 14, vínculo sem data rescisão, data fim igual data início, seguro-desemprego CNIS, microficha, doméstica sem vínculo, checklist pré-requerimento, antirobotização, art. 574 IN 128 motivação, art. 576 parágrafo único reabertura, Portaria 997 novos elementos. Aciona AUTOMATICAMENTE para todo benefício que dependa de tempo de contribuição ou carência (aposentadoria por idade, tempo, especial, BPC sem renda, etc), antes do requerimento. Cruza com base-documentos-comprobatorios-in128, peticao-previdenciaria, precedentes-previdenciarios, tema-1124-instrucao-administrativa, mandado-seguranca-previdenciario, admissibilidade-barreiras-crps, contribuicoes-complementacao-ec103, indenizacao-contribuicoes-atraso, base-revisao-peticao-aprofundada. NÃO use para RMI ou PPP isoladamente.
---

# CNIS - Indicadores e Acerto (RAC) - Versão Plugin v1.40

## VISÃO GERAL E POSTURA

Esta skill é a versão versionada no plugin `base-conhecimento-inss` (Onda 50) da skill local do escritório `cnis-acerto-indicadores`, ampliada com a lista integral de indicadores capturada do banco de dados `planilha.tramitacaointeligente.com.br/indicadores-cnis` atualizado até 06/2026.

Postura exclusivamente pró-segurado. A análise de indicadores CNIS é o PRIMEIRO PASSO em qualquer requerimento que envolva tempo de contribuição. Indicadores não impugnados a tempo podem causar concessão deficiente ou indeferimento automatizado.

## FONTES NORMATIVAS

**Indicadores.** Portaria DIRBEN/INSS nº 990/2022 (Anexo V), alterada pela Portaria 1.316/2025.

**RAC (Requerimento de Acerto Cadastral).** IN PRES/INSS nº 128/2022 (redação da IN 164/2024). Portaria DIRBEN/INSS nº 1.240/2024, art. 25.

**Robotização.** Portaria DIRBEN/INSS nº 1.087/2022. Portaria DIRBEN/INSS nº 997/2022, arts. 9º §2º e 11.

**Vínculos sem data fim e regras operacionais.** Memorando-Circular nº 14 DIRBEN/INSS, de 20/05/2013 (regras absorvidas pelo sistema CNIS).

**Catálogo de indicadores atualizado.** Banco de dados em `planilha.tramitacaointeligente.com.br/indicadores-cnis` consolidado até 06/2026 (com 11 grupos temáticos).

## CATEGORIAS DOS INDICADORES

O CNIS classifica indicadores em três categorias e onze grupos temáticos.

### Categorias (Tipo INSS)

1. **Pendência (Cs Pendencia).** Bloqueiam total ou parcialmente o cômputo de vínculos, remunerações ou contribuições. Foco principal da advocacia.
2. **Indicador (Cs Indicador).** Sinalizam situações sem bloquear automaticamente. Impacto indireto.
3. **Acerto (Cs Acerto).** Registram que uma pendência já foi tratada (deferido, indeferido, parcial). Prova de análise prévia.

### Grupos Temáticos (Grupo INSS)

1. AJUSTES EC103 - AGRUPAMENTO
2. AJUSTES EC103 - COMPLEMENTAÇÃO
3. AJUSTES EC103 - OUTROS INDICADORES
4. AJUSTES EC103 - UTILIZAÇÃO
5. CONTRIBUIÇÕES
6. CONTRIBUIÇÕES/VÍNCULOS E REMUNERAÇÕES
7. DARF - ERROS DE PROCESSAMENTO
8. DARF - EVENTOS
9. GERAIS DO NIT OU DE DADOS CADASTRAIS
10. SEGURADO ESPECIAL
11. VÍNCULOS E REMUNERAÇÕES

Catálogo completo de indicadores em `references/INDICADORES-COMPLETO-2026.md`.

## INDICADORES DE PENDÊNCIA - PRIORITÁRIOS PRÓ-SEGURADO

### Vínculos e Remunerações

**PEXT.** Vínculo extemporâneo. Passível de comprovação. Não bloqueia se houver prova do vínculo (CTPS, holerite, processo trabalhista).

**PVIN-IRREG.** Vínculo em situação de irregularidade. Conferir documentação.

**PVIN-RE.** Causa de rescisão estimada (não informada por RAIS/FGTS/GRE). Conferir CTPS.

**PVIN-CAGED.** Vínculo oriundo da fonte CAGED. Conferir contemporaneidade.

**PADM-EMPR / PRES-EMPR / PREM-EMPR.** Empresa encerrada, restrita ou com CNPJ cancelado. NÃO PODE prejudicar o segurado (art. 29-A Lei 8.213/91).

**PEMP-CAD / PEMP-IDINV.** Empregador com identificador inválido ou faltam dados cadastrais. Impugnar.

**PDIV-DADOS-GFIP.** Divergência GFIP. Algoritmo Levenshtein gera falsos positivos.

**NDET.** Data de início de atividade estimada na migração. Confirmar com CTPS.

**PSUC-DIVERG-DT-ADM.** Divergência entre vínculo sucedido e sucessor.

### Vínculos com Processo Trabalhista

**PVIN-REC-PROC-TRAB.** Reconhecimento de vínculo oriundo de processo trabalhista (pendente de análise). Cruzar com `base-rt-ajuizamento-vinculo-previdenciario`.

**PVIN-RESP-INDIRETO-PROC-TRAB.** Vínculo informado por responsável indireto em processo trabalhista.

**PVIN-ADMISSAO-PROC-TRAB / PVIN-DESLIG-PROC-TRAB.** Alteração de data de admissão ou desligamento oriunda de processo trabalhista.

**PVIN-UNIC-CONTR-PROC-TRAB / PVIN-UNIC-CONTR-TSVE-PROC-TRAB.** Unicidade contratual oriunda de processo trabalhista (CLT ou TSVE).

**PREM-VINC-PROC-TRAB / PREM-TSVE-PROC-TRAB.** Reconhecimento de remuneração oriunda de processo trabalhista.

**PREM-REINTEG / PVIN-DESLIG-JUSTIÇA-TRAB.** Reintegração oriunda de processo trabalhista (Evento S-8299 do eSocial).

### Contribuições

**PREC-MENOR-MIN.** Recolhimento abaixo do mínimo. Exige complementação (GPS códigos 1872/1873 + DARF). Cruzar com `contribuicoes-complementacao-ec103`.

**PSC-MEN-SM-EC103.** Salário de contribuição abaixo do mínimo após EC 103/2019. Passível de complementação, utilização ou agrupamento.

**PREC-OBITO.** Competência posterior ao óbito. Verificar via documental.

**PREC-CSE.** Recolhimento de segurado especial pendente de comprovação. Cruzar com `segurado-especial-rural`.

**PREC-CDCONC.** Contribuinte em dobro concomitante com outro TFV. Cruzar com `base-contribuinte-em-dobro-lops-art9`.

**PREC-FACULTCONC.** Contribuinte facultativo concomitante com outros vínculos.

**PREC-LC150-DOM.** Pagamento doméstica em GPS em período com fonte eSocial.

**PREC-PMIG-DOM.** Recolhimento empregado doméstico sem comprovação de vínculo.

### Facultativo de Baixa Renda (FBR)

Treze indicadores específicos da família FBR (FBR-AUT-BAT, FBR-AUT-CONCBEN, FBR-AUT-CONCQSA, FBR-AUT-CONCSD, FBR-AUT-DUPGRUPFAM, FBR-AUT-EXPCAD, FBR-AUT-FACULTCONC, FBR-AUT-OBITO, FBR-AUT-PENDCAD, FBR-AUT-PENDPROCES, FBR-AUT-RENPES, FBR-AUT-RENSUP).

Cruzar com `base-facultativo-baixa-renda` para estratégia.

### DARF (EC 103/2019 e EC 113/2021)

**PDARF-ALT-COMP-FORA-VIG / PDARF-ALT-CPF / PDARF-EVENTO-INCONSISTENTE / PDARF-INV-ALT-CODRECEITA / PDARF-RESTIT-PARCIAL / PDARF-RESTIT-TOTAL.** Pendências de DARF que impactam contribuições EC 103. Cruzar com `contribuicoes-complementacao-ec103`.

### NIT - Identificação

**PNIT-0094 / PNIT-O094.** NIT em faixa crítica (Ofício INSS 094). Unificação obrigatória.

**PNIT-CRIT.** NIT em faixa crítica.

**PNIT-IND.** NIT Indeterminado.

**PNIT-SC.** NIT não cadastrado.

**PNIT-SUP.** NIT com superposição.

### Segurado Especial

**PSE-NEG.** Período segurado especial negativo.

**PSE-POS.** Período positivo (favorável).

**PSE-PEN.** Período pendente.

Cruzar com `segurado-especial-rural`.

### Outros

**PCTC-NTR.** CTC pendente de análise.

**PRPPS.** Vínculo com informações de RPPS. Cruzar com `base-contagem-reciproca-rgps-rpps`.

## INDICADORES DE ACERTO (já tratados)

Os indicadores começam com **A** (AVRC, AEXT, ASE, ADIV, ACNISVR). Sinalizam que o INSS, decisão judicial ou recursal já tratou a pendência.

Sub-classificação.
- **DEF/DEFJ/DEFR.** Deferido pelo INSS, judicial ou recursal.
- **IND/INDJ/INDR.** Indeferido pelo INSS, judicial ou recursal.
- **VI/VP/VPR/VPT/VT/VTJ/VTR.** Variações de extemporaneidade.
- **AGPVINC/DGPVINC.** Agrupamento ou desagrupamento de vínculos.
- **RPOS/RNEG.** Ratificado positivo ou negativo (segurado especial).

ESTRATÉGIA. Em caso de IND (indeferido), conferir motivação. Em caso de DEF, prova de tratamento prévio.

## INDICADORES INFORMATIVOS - APROVEITAMENTO

### Reclamatória Trabalhista e Reintegração

**IREM-RECL-TRAB.** Remuneração com parcela de reclamatória trabalhista. Cruzar com `base-rt-ajuizamento-vinculo-previdenciario`.

**IVIN-REINTEG.** Reintegração no último desligamento.

**IVIN-REINTEG-ANISTIA.** Reintegração por Anistia Legal (Lei 8.878/1994).

**IREM-REINTEG-PARC-PROC-TRAB / IREM-REINTEG-TOT-PROC-TRAB.** Período de reintegração parcial ou total.

### Trabalho Intermitente

**IVIN-TRAB-INTERM / IREM-TRAB-INTERM.** Vínculo ou remuneração de trabalho intermitente. Conferir convocatórias.

### Agente Nocivo

**IEAN.** Exposição a agente nocivo informada pelo empregador, passível de comprovação. Cruzar com `auditoria-ppp`.

### Demanda Trabalhista

**IDT.** Indicador de Demanda de Natureza Trabalhista. Cruzar com base-rt-ajuizamento-vinculo-previdenciario.

### EC 103/2019 - Agrupamento e Utilização

**IAGRUP-MN-SM-EC103.** Competência objeto de agrupamento que permaneceu abaixo do mínimo (favorecida).

**IAGRUP-SM-EC103.** Competência objeto de agrupamento que resultou em SC igual ao mínimo (favorecida).

**IAGRUP-VR-EC103.** Competência que cedeu valor residual (desfavorecida).

**IAGRUP-ZER-EC103.** Competência zerada após agrupamento (desfavorecida).

**ICED-VR-EXC-EC103.** Competência que cedeu valor excedente.

**ICOMPL-VR-SM-EC103.** Recolhimento de complementação para valor mínimo.

**IUTILIZ-EXC-EC103.** Competência favorecida por valor excedente de outra.

**IREL-PREV-POSSUI-COMP-AJUST.** Relação previdenciária com ajuste.

Cruzar com `contribuicoes-complementacao-ec103`.

## CHECKLIST OPERACIONAL PRÉ-REQUERIMENTO

Antes de protocolar requerimento de qualquer benefício que dependa de tempo de contribuição ou carência.

1. **Baixar extrato CNIS completo** (com indicadores).
2. **Identificar todos os indicadores de PENDÊNCIA.** Listar com prazo de tratamento.
3. **Identificar indicadores de ALERTA com impacto indireto.**
4. **Verificar indicadores de ACERTO** para histórico de análises.
5. **Protocolar RAC (Anexo I, I-A, I-B, I-C, I-D, I-E, I-F)** correspondente a cada pendência.
6. **Aguardar tratamento (prazo variável).**
7. **Conferir extrato após tratamento.**
8. **Protocolar requerimento** apenas quando o CNIS estiver "limpo" para a estratégia.

## ESTRATÉGIA ANTIROBOTIZAÇÃO

A robotização do INSS (Portaria DIRBEN 1.087/2022 e 997/2022) processa requerimentos por algoritmo. Indeferimento automatizado é frequente quando há indicadores de pendência.

### Como evitar a armadilha

1. **Resolver pendências ANTES de requerer.** RAC adequado.
2. **Anexar documentos** desde a inicial, mesmo que não solicitado.
3. **Protocolo de Tema 1124** quando aplicável.
4. **Pedido de PA físico** se houver fundamento (situação atípica).
5. **Indeferimento automático.** Analisar motivação (art. 574 IN 128/2022) e pedir REABERTURA via art. 576 par. único IN 128.

Cruzar com `tema-1124-instrucao-administrativa`.

## FORMULÁRIOS RAC (Anexos da IN 128/2022)

**Anexo I.** Acerto de vínculos.
**Anexo I-A.** Acerto de remunerações.
**Anexo I-B.** Acerto de contribuições.
**Anexo I-C.** Unificação de NIT.
**Anexo I-D.** Acerto de dados cadastrais.
**Anexo I-E.** Acerto específico (variável).
**Anexo I-F.** Acerto específico (variável).

Detalhamento operacional dos RAC em `references/RAC-FORMULARIOS-2026.md`.

## CRUZAMENTO COM OUTRAS SKILLS

- `base-documentos-comprobatorios-in128` (Onda 50). Documentos para sanar indicadores.
- `peticao-previdenciaria`. Geração de peças com base nos indicadores.
- `precedentes-previdenciarios`. Jurisprudência sobre indicadores impugnáveis.
- `tema-1124-instrucao-administrativa`. Estratégia ANTIROBOTIZAÇÃO.
- `mandado-seguranca-previdenciario`. MS por demora no tratamento RAC.
- `admissibilidade-barreiras-crps`. Recurso contra indeferimento por indicador.
- `contribuicoes-complementacao-ec103`. Complementação EC 103.
- `indenizacao-contribuicoes-atraso`. Indenização art. 45-A.
- `base-revisao-peticao-aprofundada`. Auditoria com checklist CNIS.
- `base-rt-ajuizamento-vinculo-previdenciario`. RT para vincular ao CNIS.
- `base-contribuinte-em-dobro-lops-art9`. Contribuinte em dobro.
- `segurado-especial-rural`. Segurado especial.
- `base-facultativo-baixa-renda`. FBR.
- `base-contagem-reciproca-rgps-rpps`. RPPS.
- `auditoria-ppp`. IEAN como gatilho de auditoria.

## FONTE PRIMÁRIA - BANCO DE DADOS

Catálogo dinâmico de indicadores. https://planilha.tramitacaointeligente.com.br/indicadores-cnis

Atualização normativa até 06/2026 (Portaria 1.316/2025).

A reference `INDICADORES-COMPLETO-2026.md` traz a transcrição literal da lista publicada, organizada por grupo temático e categoria, para consulta rápida.
