---
name: base-legislacao-fontes-primarias
description: Repositório verificado de fontes primárias da legislação previdenciária brasileira em texto literal. Use SEMPRE que precisar CITAR artigo de Constituição Federal de 1988, EC 103/2019 (Reforma da Previdência), EC 20/1998 (direito adquirido do professor art. 9º §2º), Lei 8.213/91 (Plano de Benefícios), Lei 8.212/91 (Custeio), Lei 8.742/93 (LOAS), LC 142/2013 (Aposentadoria PCD), Lei 13.146/2015 (Estatuto da Pessoa com Deficiência), CPC Lei 13.105/2015, Juizados Especiais Lei 9.099/1995, Juizados Especiais Federais Lei 10.259/2001, Mandado de Segurança Lei 12.016/2009, processo administrativo federal Lei 9.784/1999, Lei 13.460/2017 usuário do serviço público, Lei 7.713/1988 imposto de renda isenção doença grave RRA, Lei 8.112/1990 servidores contagem recíproca, Lei 10.666/2003, Lei 9.876/1999 fator previdenciário, Lei 9.494/1997 art. 1º-F, Lei 9.796/1999 compensação previdenciária, Lei 13.135/2015 pensão, Lei 13.846/2019, Lei 14.768/2023 deficiência auditiva, Lei 15.176/2025 fibromialgia, Lei 10.741/2003 Estatuto do Idoso, Lei 8.880/1994 IRSM, Lei 9.032/1995, Decreto 3.048/99 (Regulamento da Previdência Social), Decreto 53.831/1964 (Quadro Anexo de agentes nocivos pré-1995), Decreto 83.080/1979 quadro de agentes e categorias, Decreto 2.172/1997, Decreto 62.755/1968, Decreto 6.214/2007 Regulamento do BPC, Decreto 6.949/2009 Convenção de Nova York, Decreto 10.995/2022 estrutura regimental do INSS, Instrução Normativa 128/2022 INSS, Portaria Interministerial 1/2014 IF-BrA, Portaria Conjunta MDS/INSS 2/2015 avaliação BPC, Portarias DIRBEN/INSS 990 a 996 de 2022, Portaria DIRBEN/INSS 998/2022 compensação, Portaria INSS 914/2021 PRBI, Portaria DIRBEN/INSS 1.309/2025 supervisão técnica revisão de ofício, Portaria DIRBEN/INSS 1.318/2025, Portaria PRES/INSS 1.851/2025 estrutura Superintendências Regionais, Portaria MPS 125/2026 (Regimento Interno CRPS). Use ANTES de afirmar qualquer redação de artigo, redação de parágrafo, hipótese de incidência ou regra processual. Use ANTES de redigir qualquer petição, recurso, mandado de segurança ou auditoria. A skill aponta para o repositório local verificado em C:\Users\VAIO\INSS\base-legislacao\ com mais de 50 arquivos baixados das fontes oficiais (Planalto, Imprensa Nacional, sirc.gov.br, gov.br/previdencia), com SHA-256 registrado, encoding UTF-8 e marcações de revogação/redação preservadas, índice atualizado na Onda 73 (v1.63.0). SEMPRE que houver dúvida sobre redação literal de um artigo, ABRA o arquivo correspondente no workspace ANTES de citar. NUNCA invente texto de artigo. Postura pró-segurado exclusiva. Cruza com base-portarias-dpmf-inss-hub, precedentes-previdenciarios, peticao-previdenciaria, revisao-peticao, documentos-comprobatorios-in128, cnis-acerto-indicadores.
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

Índice atualizado na Onda 73 (v1.63.0), substituindo o índice congelado da Onda 31 (31/05/2026). Registra todas as normas presentes na pasta, inclusive as gravadas após maio de 2026 que antes não eram acionadas automaticamente.

Caminho base no Windows. `C:\Users\VAIO\INSS\base-legislacao\`

Caminho base no Linux mount (Cowork). `/sessions/<sessão>/mnt/INSS/base-legislacao/`. O `<sessão>` muda a cada sessão do Cowork, resolver dinamicamente (ver a lição da Onda 69). Nesta sessão é `/sessions/fervent-bold-lovelace/mnt/INSS/base-legislacao/`.

### 01-Constituicao
- `CF-1988-completa.md` Constituição Federal de 1988. Última alteração EC 139/2026.
- `EC-103-2019.md` Emenda Constitucional 103/2019, Reforma da Previdência.
- `EC-20-1998.md` Emenda Constitucional 20/1998, direito adquirido do professor, art. 9º §2º.

### 02-Leis-Complementares
- `LC-142-2013-aposentadoria-PCD.md` LC 142/2013, aposentadoria da pessoa com deficiência.

### 03-Leis-Ordinarias
- `Lei-7713-1988-IR.md` Lei 7.713/1988, imposto de renda, isenção por doença grave, RRA art. 12-A.
- `Lei-8112-1990-servidores.md` Lei 8.112/1990, regime dos servidores, RPPS, contagem recíproca. Última alteração Lei 14.509/2022.
- `Lei-8212-91-custeio.md` Lei 8.212/91, Custeio da Seguridade Social. Última alteração Lei 15.371/2026. Restaurada em 06/07/2026.
- `Lei-8213-91-beneficios.md` Lei 8.213/91, Plano de Benefícios. Última alteração Lei 15.415/2026.
- `Lei-8742-93-LOAS.md` Lei 8.742/93, LOAS. Última alteração Lei 15.157/2025.
- `Lei-8880-1994.md` Lei 8.880/1994, URV e IRSM, base da revisão de fevereiro/1994.
- `Lei-9032-1995.md` Lei 9.032/1995, fim do enquadramento por categoria, tempo especial.
- `Lei-9099-1995-juizados-especiais.md` Lei 9.099/1995, Juizados Especiais, subsidiária ao JEF.
- `Lei-9494-1997.md` Lei 9.494/1997, art. 1º-F, tutela contra a Fazenda. Última alteração Lei 11.960/2009.
- `Lei-9784-1999-processo-administrativo.md` Lei 9.784/1999, processo administrativo federal. Última alteração Lei 14.210/2021.
- `Lei-9796-1999-compensacao-previdenciaria.md` Lei 9.796/1999, compensação entre regimes. Última alteração Lei 15.265/2025.
- `Lei-9876-1999.md` Lei 9.876/1999, fator previdenciário, PBC, base da Revisão da Vida Toda.
- `Lei-10259-2001-JEF.md` Lei 10.259/2001, Juizados Especiais Federais.
- `Lei-10666-2003.md` Lei 10.666/2003, art. 3º, desvinculação da qualidade, retenção do contribuinte individual.
- `Lei-10741-2003-estatuto-idoso.md` Lei 10.741/2003, Estatuto do Idoso. Última alteração Lei 15.163/2025.
- `Lei-12016-2009-mandado-seguranca.md` Lei 12.016/2009, Mandado de Segurança.
- `Lei-13105-2015-CPC.md` Lei 13.105/2015, CPC. Última alteração Lei 14.976/2024.
- `Lei-13135-2015-pensao.md` Lei 13.135/2015, pensão por morte, alterou a Lei 8.213/91.
- `Lei-13146-15-EPCD.md` Lei 13.146/2015, Estatuto da Pessoa com Deficiência. Última alteração Lei 15.249/2025.
- `Lei-13460-2017-usuario-servico-publico.md` Lei 13.460/2017, usuário do serviço público. Última alteração Lei 14.534/2023.
- `Lei-13846-2019.md` Lei 13.846/2019, MP 871 convertida, pensão, carência art. 27-A.
- `Lei-14768-2023-deficiencia-auditiva.md` Lei 14.768/2023, deficiência auditiva.
- `Lei-15176-2025-fibromialgia.md` Lei 15.176/2025, fibromialgia como deficiência.

### 04-Decretos
- `Decreto-2172-1997-RBPS.md` Decreto 2.172/1997, Regulamento anterior dos benefícios, agentes nocivos 1997 a 1999. Revogado pelo Decreto 3.048/99.
- `Decreto-3048-99-RPS-parte1-arts-1-100.md` Decreto 3.048/99, RPS, parte 1. Última alteração Decreto 10.410/2020.
- `Decreto-3048-99-RPS-parte2-arts-101-200.md` Decreto 3.048/99, RPS, parte 2.
- `Decreto-3048-99-RPS-parte3-arts-201-300.md` Decreto 3.048/99, RPS, parte 3.
- `Decreto-3048-99-RPS-parte4-arts-301-fim.md` Decreto 3.048/99, RPS, parte 4.
- `Decreto-53831-1964-quadro-agentes-nocivos.md` Decreto 53.831/1964, Quadro Anexo, enquadramento por categoria pré-95. ATENÇÃO. O código 2.4.5 é telefonista. O 2.5.7 é extinção de fogo/guarda (bombeiros, vigilantes). Conferir o arquivo antes de citar código.
- `Decreto-6214-2007-Regulamento-BPC.md` Decreto 6.214/2007, Regulamento do BPC, já com o Decreto 12.534/2025 incorporado.
- `Decreto-62755-1968.md` Decreto 62.755/1968, cadeia normativa do enquadramento.
- `Decreto-6949-2009-convencao-NY-PCD.md` Decreto 6.949/2009, Convenção de Nova York sobre a pessoa com deficiência.
- `Decreto-83080-1979.md` Decreto 83.080/1979 completo, aprovação (arts. 1º a 4º), Anexo I (agentes nocivos 1.x.x) e Anexo II (categorias profissionais 2.x.x). Revogado pelo Decreto 3.048/99.
- `Decreto-10995-2022.md` Decreto 10.995/2022, Estrutura Regimental do INSS, base do mapeamento institucional. Última alteração Decreto 12.764/2025. (Verificado a mais na pasta na Onda 73, não constava do índice da Onda 31.)

### 05-Instrucoes-Normativas
- `IN-128-2022-INSS-parte1-arts-1-170.md` IN PRES/INSS 128/2022, parte 1. Consolidada até IN 170/2024.
- `IN-128-2022-INSS-parte2-arts-171-340.md` IN PRES/INSS 128/2022, parte 2.
- `IN-128-2022-INSS-parte3-arts-341-510.md` IN PRES/INSS 128/2022, parte 3.
- `IN-128-2022-INSS-parte4-arts-511-674.md` IN PRES/INSS 128/2022, parte 4.

### 06-Portarias

TAXONOMIA CORRIGIDA DAS PORTARIAS DIRBEN/INSS DE 28/03/2022. A Portaria 992/2022 trata de MANUTENÇÃO de benefícios, não de cálculo de RMI.

| Portaria | Livro | Tema |
|---|---|---|
| 990/2022 | I | CNIS, RAC, indicadores |
| 991/2022 | II | Reconhecimento de benefícios (concessão e revisão) |
| 992/2022 | III | Manutenção de benefícios e serviços |
| 993/2022 | IV | Processo administrativo previdenciário |
| 994/2022 | V | Acumulação de benefícios pós EC 103/2019 |
| 995/2022 | VI | Acordos internacionais |
| 996/2022 | VII | Recursos |
| 998/2022 | IX | Compensação previdenciária |

- `Portaria-DIRBEN-INSS-990-2022-CNIS.md` Livro I, CNIS, RAC, indicadores. Última alteração Portaria 1.299/2025.
- `Portaria-DIRBEN-INSS-991-2022-concessao-revisao.md` Livro II, reconhecimento, concessão e revisão.
- `Portaria-DIRBEN-INSS-992-2022-manutencao.md` Livro III, manutenção de benefícios.
- `Portaria-DIRBEN-INSS-993-2022-processo-administrativo.md` Livro IV, processo administrativo.
- `Portaria-DIRBEN-INSS-994-2022-acumulacao.md` Livro V, acumulação de benefícios.
- `Portaria-DIRBEN-INSS-995-2022-acordos-internacionais.md` Livro VI, acordos internacionais.
- `Portaria-DIRBEN-INSS-996-2022-recursos.md` Livro VII, recursos.
- `Portaria-DIRBEN-INSS-998-2022-compensacao-previdenciaria.md` Livro IX, compensação previdenciária.
- `Portaria-INSS-914-2021-PRBI.md` Programa de Revisão de Benefícios por Incapacidade de Longa Duração.
- `Portaria-MPS-125-2026.md` RICRPS, Regimento Interno do CRPS. Última alteração Portarias MPS 235 e 462/2026.
- `Portaria-Conjunta-MDS-INSS-2-2015-BPC-avaliacao.md` Avaliação social e médica do BPC, Anexos I a V com formulários.
- `Portaria-Interministerial-1-2014-IF-BrA.md` Instrumento IF-BrA da aposentadoria da pessoa com deficiência.
- `Portaria-DIRBEN-INSS-1309-2025-supervisao-tecnica-revisao.md` Supervisão Técnica, Revisão de Ofício e erro administrativo, códigos 13975 e 9428. Revoga a 1.056/2022 e a 1.231/2024.
- `Portaria-DIRBEN-INSS-1318-2025.md` Altera a Portaria 1.309/2025.
- `Portaria-PRES-INSS-1851-2025-anexo-VI-estrutura-SR.md` Anexo VI, estrutura das Superintendências Regionais, mapeamento institucional. Consolidado com a Portaria 1.878/2025.

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

O repositório foi baixado em 31/05/2026 (Onda 31). Índice reconciliado com a pasta na Onda 73 (v1.63.0). Atualizações devem ser registradas em log próprio. A regra é.

- Para Leis e Decretos. Re-baixar do Planalto sempre que houver nova lei de alteração relevante (Lei 8.213 e Lei 8.212 mudam com frequência).
- Para IN 128/2022. Re-baixar quando novas INs alterarem (IN 170/2024 já consolidada, conferir IN 174+).
- Para Portarias. Re-baixar quando novas portarias revogarem ou alterarem.
- Portaria MPS 125/2026 (RICRPS). Conferir alterações posteriores às Portarias 235 e 462/2026.

A reexecução desta atualização deve ser feita em onda corretiva específica no plugin, com bump de versão.

### Notas de manutenção (Onda 73)

Correção de status cruzada. A Portaria 1.309/2025 revoga a 1.056/2022 e a 1.231/2024. Tratamento já corrigido na skill `base-erro-administrativo-iea-13975` na Onda 64 (v1.54.0), com a 1.309/2025 alterada pela 1.318/2025 como norma vigente.

Arquivos avulsos a apagar na pasta, pendentes de exclusão manual pelo escritório (o mount bloqueia exclusão pura pela skill). `04-Decretos/Decreto-83080-1979-quadro-agentes-nocivos.PARCIAL.md`, superado pelo `Decreto-83080-1979.md` completo. E o `.__wtest` na raiz da pasta, artefato de teste de gravação. Nenhum dos dois está no índice, por não serem fontes primárias válidas.

Ainda faltam na pasta, sem fonte oficial acessível na data. Portaria DPMF/INSS 19/2026 (Teleperícia) e Portarias Conjuntas MPS/INSS 13, 14 e 15/2026 (análise documental B31, B91, B94). Observação. A Portaria Conjunta 13/2026 já foi conferida por inteiro teor no DOU na Onda 72, mas ainda não foi baixada como arquivo neste repositório. Baixar quando houver PDF oficial ou captura do DOU.

Segunda prioridade, mapeada mas ainda não baixada. Lei 15.157/2025, Lei 11.301/2006, Lei 15.326/2026, Lei 13.183/2015, Lei 11.718/2008, EC 41/2003, EC 113/2021, IN 164/2024 e IN 188/2025.

Registro de incidente. A Lei 8.212/91 sumiu da pasta em rodada de gravação de 06/07/2026 e foi restaurada do Planalto na mesma data, causa não confirmada. Conferir periodicamente a integridade da pasta contra este índice.

## LIMITAÇÃO CONHECIDA

Esta skill APONTA para os arquivos no workspace, NÃO duplica o conteúdo nas references. Isso preserva o tamanho do plugin. O acesso ao texto literal exige o workspace do escritório Tercini disponível. Em sessões sem o workspace, a skill ainda serve como índice e protocolo, e a verificação deve ser feita via WebFetch direto da URL oficial registrada no índice acima.

## VERIFICAÇÃO DINÂMICA EM CASCATA (Onda 36 - v1.26.0)

Quando o artigo solicitado NÃO estiver no repositório local (o índice atual cobre mais de 50 arquivos de normas), esta skill aciona a cascata de verificação dinâmica documentada em `base-revisao-peticao-aprofundada/references/PROTOCOLO-VERIFICACAO-DINAMICA.md`.

**Fluxo automatizado.**

1. Nível 1 - Repositório local em `INSS\base-legislacao\`.
2. Nível 2 - WebFetch direto da URL oficial registrada no índice.
3. Nível 3 - WebSearch + WebFetch em fonte alternativa.
4. Nível 4 - Navegador Comet/Chrome via MCP (requer autorização do usuário).
5. Nível 5 - Reporte de falha apenas se TUDO falhar.

A skill NUNCA registra "verificação não realizada" antes de esgotar os 4 níveis automáticos.

**URLs oficiais prioritárias.** Conforme catálogo na seção INDICE-FONTES-COMPLETO.md.

**Operação.** Esta skill é fonte de URLs oficiais e do repositório literal. A execução da cascata é responsabilidade da skill `base-revisao-peticao-aprofundada` quando acionada durante revisão de petição.
