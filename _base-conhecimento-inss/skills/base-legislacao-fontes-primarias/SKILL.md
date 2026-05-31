---
name: base-legislacao-fontes-primarias
description: Repositório verificado de fontes primárias da legislação previdenciária brasileira em texto literal. Use SEMPRE que precisar CITAR artigo de Constituição Federal de 1988, EC 103/2019 (Reforma da Previdência), Lei 8.213/91 (Plano de Benefícios), Lei 8.212/91 (Custeio), Lei 8.742/93 (LOAS), LC 142/2013 (Aposentadoria PCD), Lei 13.146/2015 (Estatuto da Pessoa com Deficiência), Decreto 3.048/99 (Regulamento da Previdência Social), Decreto 53.831/1964 (Quadro Anexo de agentes nocivos pré-1995), Decreto 62.755/1968, Instrução Normativa 128/2022 INSS, Portarias DIRBEN/INSS 990 a 996 de 2022, Portaria MPS 125/2026 (Regimento Interno CRPS). Use ANTES de afirmar qualquer redação de artigo, redação de parágrafo, hipótese de incidência ou regra processual. Use ANTES de redigir qualquer petição, recurso, mandado de segurança ou auditoria. A skill aponta para o repositório local verificado em C:\Users\VAIO\INSS\base-legislacao\ com 19 arquivos baixados das fontes oficiais (Planalto, Imprensa Nacional, sirc.gov.br, gov.br/previdencia) em 31/05/2026, todos com SHA-256 registrado, encoding UTF-8 e marcações de revogação/redação preservadas. SEMPRE que houver dúvida sobre redação literal de um artigo, ABRA o arquivo correspondente no workspace ANTES de citar. NUNCA invente texto de artigo. Postura pró-segurado exclusiva. Cruza com base-portarias-dpmf-inss-hub, precedentes-previdenciarios, peticao-previdenciaria, revisao-peticao, documentos-comprobatorios-in128, cnis-acerto-indicadores.
---

# Repositório de Fontes Primárias da Legislação Previdenciária

## OBJETIVO E POSTURA

Esta skill é o repositório de fontes primárias verificadas da legislação previdenciária brasileira do escritório Paulo Roberto Tercini Filho (OAB/SP 331.110). Postura pró-segurado exclusiva.

A skill foi criada na **Onda 31** (31/05/2026) como resposta ao protocolo de honestidade radical do escritório. Toda citação de artigo de lei, decreto, instrução normativa ou portaria DEVE ser verificada CONTRA os arquivos do workspace `C:\Users\VAIO\INSS\base-legislacao\` ANTES de ser inserida em qualquer petição, recurso, parecer ou orientação.

## PROTOCOLO ANTI-ALUCINAÇÃO OBRIGATÓRIO

Toda vez que for citar um artigo de norma primária, o Claude DEVE seguir este protocolo de 4 passos.

**Passo 1. Identificar a norma.** Localizar no índice abaixo qual arquivo do workspace contém a norma.

**Passo 2. Abrir o arquivo.** Usar o Read tool no caminho absoluto do workspace correspondente ao mount Linux `/sessions/fervent-bold-lovelace/mnt/INSS/base-legislacao/...` ou no caminho Windows `C:\Users\VAIO\INSS\base-legislacao\...`.

**Passo 3. Buscar o artigo.** Usar Grep ou Read com offset/limit para localizar o artigo, parágrafo, inciso ou alínea exato. Para o Quadro Anexo do Decreto 53.831/1964, consultar o arquivo `Decreto-53831-1964-quadro-agentes-nocivos.md` que tem o quadro em formato tabular.

**Passo 4. Transcrever LITERALMENTE.** Copiar a redação preservando notas de "Redação dada pela Lei X.XXX", "Incluído pela Lei X.XXX" ou "Revogado pela Lei X.XXX". Estas marcações são essenciais para o trabalho pró-segurado.

Se o artigo NÃO for localizado, declarar expressamente "Não localizado no arquivo X" e propor alternativa (consultar fonte oficial em link, contactar fonte direta, ou suspender a afirmação).

## ÍNDICE COMPLETO DO REPOSITÓRIO

Caminho base no Windows. `C:\Users\VAIO\INSS\base-legislacao\`

Caminho base no Linux mount. `/sessions/fervent-bold-lovelace/mnt/INSS/base-legislacao/`

### 01-Constituicao

**CF-1988-completa.md** (907 KB)
- Constituição Federal de 1988 completa, 250 artigos + ADCT.
- Fonte. https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm
- SHA-256 (bruto). `4f0d32c8a346ad69b43c5ae7efe75ee64455997da69f730fa5bb3c397a90aea0`
- Última alteração consolidada. EC 139/2026 e LC 230/2026.
- Artigos críticos para o trabalho. Arts. 194-204 (Seguridade Social), 201 (Previdência), 203-204 (Assistência Social/BPC), 109 §3º (competência delegada JEF), 5º X (dano moral), 7º (direitos trabalhistas).

**EC-103-2019.md** (84 KB)
- Emenda Constitucional 103/2019 (Reforma da Previdência).
- Fonte. https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc103.htm
- SHA-256 (bruto). `2d172a073f5e1c326aa0a09cc1f90e6f4af156e44ba08704c1a05deb37fd6fdd`
- 36 artigos próprios, sem alterações posteriores.
- Artigos críticos. Art. 3º (direito adquirido), 4º (transição geral), 15-21 (regras de transição), 23-24 (acumulação), 25-26 (cálculo da RMI pós-reforma).

### 02-Leis-Complementares

**LC-142-2013-aposentadoria-PCD.md** (5.8 KB)
- Lei Complementar 142/2013 (Aposentadoria da Pessoa com Deficiência).
- Fonte. https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp142.htm
- SHA-256 (bruto). `3905f7201448dd51d939514a5b8df2e5c247e7e1fd36ba94b0ac8b4e54975a86`
- 11 artigos. Sem alterações textuais (apenas "Vide Decreto 3.048/99").
- Artigos críticos. Art. 3º (idade e tempo por grau), 5º (avaliação biopsicossocial), 7º (conversão e direito ao melhor benefício).

### 03-Leis-Ordinarias

**Lei-8213-91-beneficios.md** (326 KB)
- Lei 8.213/91 (Plano de Benefícios da Previdência Social).
- Fonte. https://www.planalto.gov.br/ccivil_03/leis/l8213cons.htm
- SHA-256 (bruto). `01802c53059b5b4ff821d6ed991df8a27b017b7584252fee967ea62338201900`
- 156 artigos. Última alteração. Lei 15.415/2026.
- Artigos críticos pró-segurado. Arts. 11-16 (segurados e dependentes), 18 (rol de benefícios), 25-27-A (carência), 29 (cálculo SB), 39-42 (aposentadoria especial e por invalidez), 48-56 (aposentadoria por idade), 59-63 (auxílio-doença), 71-73 (salário-maternidade), 74-80 (pensão por morte e auxílio-reclusão), 86 (auxílio-acidente), 89 (reabilitação), 103 (decadência), 118 (estabilidade).

**Lei-8212-91-custeio.md** (312 KB)
- Lei 8.212/91 (Custeio da Seguridade Social).
- Fonte. https://www.planalto.gov.br/ccivil_03/leis/l8212cons.htm
- SHA-256 (bruto). `60e47eeb1933102f1dead645b2a40b5a852d8b494b1cbff6a142ae91509594f6`
- 105 artigos. Última alteração. Lei 15.363/2026.
- Artigos críticos. Arts. 11-14 (filiação), 20-23 (contribuições), 28 (salário-de-contribuição), 32 (atividades concomitantes), 45-A (indenização de contribuições em atraso).

**Lei-8742-93-LOAS.md** (99 KB)
- Lei Orgânica da Assistência Social (LOAS).
- Fonte. https://www.planalto.gov.br/ccivil_03/leis/l8742.htm
- SHA-256 (bruto). `51b970f837e2183e0eee29d03ccf3469ce8cb8b81c9c2fae4aa868b3e16dc96b`
- 65 artigos. Última alteração. Lei 15.157/2025.
- Artigos críticos. Art. 20 (requisitos BPC), 21 (revisão), 21-A (reativação), 20-A (deficiência), 21-B (auxílio-inclusão).

**Lei-13146-15-EPCD.md** (119 KB)
- Lei Brasileira de Inclusão da Pessoa com Deficiência (Estatuto da PCD).
- Fonte. https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm
- SHA-256 (bruto). `6358329e9b45c3f1e69fc53d2c789c549f0a9747ad1d3891d8209eacaedb0a9f`
- 129 artigos. Última alteração. Lei 15.249/2025.
- Artigos críticos. Arts. 2º (conceito de deficiência), 9º (atendimento prioritário), 93 (Lei de Cotas reflexa).

### 04-Decretos

**Decreto-3048-99-RPS-parte1-arts-1-100.md** (365 KB)
**Decreto-3048-99-RPS-parte2-arts-101-200.md** (235 KB)
**Decreto-3048-99-RPS-parte3-arts-201-300.md** (309 KB)
**Decreto-3048-99-RPS-parte4-arts-301-fim.md** (102 KB)
- Decreto 3.048/99 (Regulamento da Previdência Social - RPS) em 4 partes.
- Fonte. https://www.planalto.gov.br/ccivil_03/decreto/d3048.htm
- SHA-256 (bruto, todas as partes). `459aea1f4b3bdd31c31bfd823dfb139c6d271338d89e922e65afdaa45cc637b0`
- 470 artigos. Última alteração identificada no HTML do Planalto. Decreto 10.410/2020.
- ALERTA. O HTML consolidado do Planalto pode estar defasado em relação a alterações posteriores (Decreto 12.534/2025 etc). Conferir DOU se houver dúvida.

**Decreto-53831-1964-quadro-agentes-nocivos.md** (23 KB) — A JOIA DO REPOSITÓRIO
- Decreto 53.831/1964 com QUADRO ANEXO em formato tabular.
- Status. REVOGADO em 1979, mas seu Quadro Anexo continua sendo aplicado para enquadramento por categoria profissional até 28/04/1995, por força da Súmula 198/TFR e Súmula 555/STJ.
- Fonte do HTML. https://www.planalto.gov.br/ccivil_03/decreto/D53831.htm
- Fonte do Quadro Anexo. https://www.planalto.gov.br/ccivil_03/decreto/1950-1969/anexo/an53831-64.pdf
- SHA-256. `da9f86fe9d7fca79b36696fb9f013473b084809e9a59903f8b74961fee42f424`
- 30 códigos. Físicos (1.1.1 a 1.1.8), químicos (1.2.1 a 1.2.11), biológicos (1.3.1 e 1.3.2), liberais/técnicos (2.1.1 a 2.1.4), agrícolas (2.2.1 a 2.2.3), construção (2.3.1 a 2.3.3), transportes (2.4.1 a 2.4.5), artesanato (2.5.1 a 2.5.7).

**ATENÇÃO CRÍTICA SOBRE CÓDIGOS DE CATEGORIA**. O código 2.4.5 é telefonista (e NÃO 2.5.7). O código 2.5.7 é Extinção de fogo, guarda (bombeiros, vigilantes). Sempre consultar o arquivo antes de citar código.

**Decreto-62755-1968.md** (3.2 KB)
- Decreto 62.755/1968 que revogou o Decreto 53.831/1964.
- Fonte. https://www.planalto.gov.br/ccivil_03/decreto/1950-1969/d62755.htm
- SHA-256. `752aff51f6c33549111298b1700b021ad37875803011e03179b6cbdb4fbb79ac`
- 3 artigos. Importante para entender a cadeia normativa histórica do enquadramento por categoria.

### 05-Instrucoes-Normativas

**IN-128-2022-INSS-parte1-arts-1-170.md** (254 KB)
**IN-128-2022-INSS-parte2-arts-171-340.md** (213 KB)
**IN-128-2022-INSS-parte3-arts-341-510.md** (139 KB)
**IN-128-2022-INSS-parte4-arts-511-674.md** (166 KB)
- Instrução Normativa 128/2022 INSS em 4 partes.
- 674 artigos. Versão CONSOLIDADA até IN 170/2024.
- Fonte. https://www.sirc.gov.br/instrucao-normativa-pres-inss-no-128-de-28-de-marco-de-2022/
- Anexos I-XXIX. NÃO incluídos nesta extração (são arquivos separados em gov.br/inss/anexo/). Conferir caso a caso quando necessário.

### 06-Portarias

**TAXONOMIA CORRIGIDA DAS PORTARIAS DIRBEN/INSS DE 28/03/2022**

A Portaria 992/2022 NÃO trata de cálculo de RMI conforme repetido em ondas anteriores do plugin. Trata de Manutenção de Benefícios e Serviços. A taxonomia correta é a seguinte.

| Portaria | Livro | Tema |
|---|---|---|
| **990/2022** | I | CNIS, RAC, indicadores |
| **991/2022** | II | Reconhecimento de benefícios (concessão e revisão) - 567 arts |
| **992/2022** | III | **Manutenção** de Benefícios e Serviços (folha, descontos, suspensão, cessação) - 330 arts |
| **993/2022** | IV | Processo Administrativo Previdenciário - 131 arts |
| **994/2022** | V | Acumulação de Benefícios pós EC 103/2019 - 14 arts |
| **995/2022** | VI | Acordos Internacionais (totalização, Mercosul, Ibero-Americano) - 60 arts |
| **996/2022** | VII | Recursos (ordinário, especial, contrarrazões) - 81 arts |

**Portaria-DIRBEN-INSS-991-2022-concessao-revisao.md** (431 KB, 567 arts)
**Portaria-DIRBEN-INSS-992-2022-manutencao.md** (243 KB, 330 arts)
**Portaria-DIRBEN-INSS-993-2022-processo-administrativo.md** (105 KB, 131 arts)
**Portaria-DIRBEN-INSS-994-2022-acumulacao.md** (18 KB, 14 arts)
**Portaria-DIRBEN-INSS-995-2022-acordos-internacionais.md** (45 KB, 60 arts)
**Portaria-DIRBEN-INSS-996-2022-recursos.md** (57 KB, 81 arts)

**Portaria-MPS-125-2026.md** (239 KB, 154 arts) — RICRPS
- Regimento Interno do Conselho de Recursos da Previdência Social.
- Fonte. PDF consolidado 20/03/2026 em gov.br/previdencia.
- Alterações posteriores. Portaria MPS 235/2026 e Portaria MPS 462/2026 (revogou art. 153).

## REGRA DE OURO PARA O CLAUDE

ANTES de citar QUALQUER artigo destas normas em uma petição, recurso, MS, auditoria ou orientação ao cliente, o Claude DEVE.

1. Identificar o arquivo correspondente no índice acima.
2. Abrir o arquivo no caminho do mount Linux.
3. Buscar o artigo com Grep ou Read.
4. Transcrever LITERALMENTE preservando notas de redação.

SE NÃO LOCALIZAR O ARTIGO, declarar "Não localizado no arquivo X em fonte verificada" e propor caminho de verificação adicional. NÃO INVENTAR.

## CRUZAMENTO COM OUTRAS SKILLS DO PLUGIN

Esta skill deve ser acionada AUTOMATICAMENTE em conjunto com.

- `peticao-previdenciaria` antes de qualquer redação que cite artigos das normas listadas.
- `revisao-peticao` durante a auditoria, conferindo cada citação contra o repositório.
- `base-portarias-dpmf-inss-hub` quando for citar Portarias 990-996/2022 (a taxonomia corrigida está aqui).
- `precedentes-previdenciarios` quando for amarrar artigo de norma a precedente jurisprudencial.
- `documentos-comprobatorios-in128` quando for citar arts. da IN 128/2022 sobre documentação.
- `cnis-acerto-indicadores` quando for citar arts. das Portarias 990/2022 e 991/2022.

## ATUALIZAÇÃO DO REPOSITÓRIO

O repositório foi baixado em 31/05/2026. Atualizações devem ser registradas em log próprio. A regra é.

- Para Leis e Decretos. Re-baixar do Planalto sempre que houver nova lei de alteração relevante (Lei 8.213 e Lei 8.212 mudam com frequência).
- Para IN 128/2022. Re-baixar quando novas INs alterarem (IN 170/2024 já consolidada, conferir IN 174+).
- Para Portarias. Re-baixar quando novas portarias revogarem ou alterarem.
- Portaria MPS 125/2026 (RICRPS). Conferir alterações posteriores às Portarias 235 e 462/2026.

A reexecução desta atualização deve ser feita em onda corretiva específica no plugin, com bump de versão.

## LIMITAÇÃO CONHECIDA

Esta skill APONTA para os arquivos no workspace, NÃO duplica o conteúdo nas references. Isso preserva o tamanho do plugin. O acesso ao texto literal exige o workspace do escritório Tercini disponível. Em sessões sem o workspace, a skill ainda serve como índice e protocolo, e a verificação deve ser feita via WebFetch direto da URL oficial registrada no índice acima.
