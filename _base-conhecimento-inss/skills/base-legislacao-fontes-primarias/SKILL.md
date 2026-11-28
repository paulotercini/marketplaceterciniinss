---
name: base-legislacao-fontes-primarias
description: Repositório verificado de fontes primárias da legislação previdenciária brasileira em texto literal. Use SEMPRE que precisar CITAR artigo de Constituição Federal de 1988, EC 103/2019 (Reforma da Previdência), EC 20/1998 (direito adquirido do professor art. 9º §2º), Lei 8.213/91 (Plano de Benefícios), Lei 8.212/91 (Custeio), Lei 8.742/93 (LOAS), LC 142/2013 (Aposentadoria PCD), Lei 13.146/2015 (Estatuto da Pessoa com Deficiência), CPC Lei 13.105/2015, Juizados Especiais Lei 9.099/1995, Juizados Especiais Federais Lei 10.259/2001, Mandado de Segurança Lei 12.016/2009, processo administrativo federal Lei 9.784/1999, Lei 13.460/2017 usuário do serviço público, Lei 7.713/1988 imposto de renda isenção doença grave RRA, Lei 8.112/1990 servidores contagem recíproca, Lei 10.666/2003, Lei 9.876/1999 fator previdenciário, Lei 9.494/1997 art. 1º-F, Lei 9.796/1999 compensação previdenciária, Lei 13.135/2015 pensão, Lei 13.846/2019, Lei 14.768/2023 deficiência auditiva, Lei 15.176/2025 fibromialgia, Lei 10.741/2003 Estatuto do Idoso, Lei 8.880/1994 IRSM, Lei 9.032/1995, Decreto 3.048/99 (Regulamento da Previdência Social), Decreto 53.831/1964 (Quadro Anexo de agentes nocivos pré-1995), Decreto 83.080/1979 quadro de agentes e categorias, Decreto 2.172/1997, Decreto 62.755/1968, Decreto 6.214/2007 Regulamento do BPC, Decreto 6.949/2009 Convenção de Nova York, Decreto 10.995/2022 estrutura regimental do INSS, Instrução Normativa 128/2022 INSS, Portaria Interministerial 1/2014 IF-BrA, Portaria Conjunta MDS/INSS 2/2015 avaliação BPC, Portarias DIRBEN/INSS 990 a 996 de 2022, Portaria DIRBEN/INSS 998/2022 compensação, Portaria INSS 914/2021 PRBI, Portaria DIRBEN/INSS 1.309/2025 supervisão técnica revisão de ofício, Portaria DIRBEN/INSS 1.318/2025, Portaria PRES/INSS 1.851/2025 estrutura Superintendências Regionais, Portaria MPS 125/2026 (Regimento Interno CRPS). Use ANTES de afirmar qualquer redação de artigo, redação de parágrafo, hipótese de incidência ou regra processual. Use ANTES de redigir qualquer petição, recurso, mandado de segurança ou auditoria. A skill aponta para o repositório local verificado em C:\Users\VAIO\INSS\base-legislacao\ com mais de 50 arquivos baixados das fontes oficiais (Planalto, Imprensa Nacional, sirc.gov.br, gov.br/previdencia), com SHA-256 registrado, encoding UTF-8 e marcações de revogação/redação preservadas. SEMPRE que houver dúvida sobre redação literal de um artigo, ABRA o arquivo correspondente no workspace ANTES de citar. NUNCA invente texto de artigo. MCP normas é a PRIMEIRA via de localização de dispositivo, LOCALIZA sem conferir, e tem quatro limitações medidas, vigência INFERIDA com parágrafo e inciso EMPILHADOS sem marca de qual vale, histórico por ANO da norma alteradora, Anexos II a IV do Decreto 3.048 fora da base com o Decreto 53.831/1964 no lugar para agente nocivo, e campo dispositivos que quebra em artigo com remissão interna, de modo que se transcreve o campo texto. Enunciado do CRPS segue no iurisprudencia. Postura pró-segurado exclusiva. Cruza com base-portarias-dpmf-inss-hub, precedentes-previdenciarios, peticao-previdenciaria, revisao-peticao, documentos-comprobatorios-in128, cnis-acerto-indicadores.
---

# Repositório de Fontes Primárias da Legislação Previdenciária

## OBJETIVO E POSTURA

Esta skill é o repositório de fontes primárias verificadas da legislação previdenciária brasileira do escritório Paulo Roberto Tercini Filho (OAB/SP 331.110). Postura pró-segurado exclusiva.

Toda citação de artigo de lei, decreto, instrução normativa ou portaria DEVE ser verificada CONTRA os arquivos do workspace `C:\Users\VAIO\INSS\base-legislacao\` ANTES de ser inserida em qualquer petição, recurso, parecer ou orientação.

## MCP `normas`, primeira via de localização

Desde 20/09/2026 existe o servidor MCP `normas`, base local montada deste mesmo corpus, e é por ele que a localização do dispositivo COMEÇA. Ele responde qual é o texto do artigo, qual era a redação em determinado ano e onde a expressão aparece no corpus, sem abrir arquivo a arquivo.

**Ele LOCALIZA e não confere.** É a mesma regra do `trf3` e do `iurisprudencia`. Nenhuma resposta dele autoriza a marca `[CONFERIDO]`, e a citação em peça exige a `fonte_oficial` que a própria resposta devolve. O protocolo anti-alucinação abaixo continua valendo inteiro, e o MCP entra como Passo 1, sem substituir a transcrição literal.

**A idade do texto é critério.** Toda resposta traz `data_download`, `idade_dias` e `verificacao`, e o corpus foi baixado em 31/05/2026, com a Lei 8.213 já registrando alteração de 2026 no cabeçalho do arquivo. Antes de citar dispositivo de norma que muda com frequência, roda-se `verificar_atualizacao`. Medido em 20/09/2026, o Planalto NÃO responde a cliente HTTP comum na máquina do escritório, e a ferramenta devolve estado `exige_navegador` com a URL e o que conferir à mão, sem jamais reportar a norma como inexistente.

**Quatro limitações mudam a conduta e precisam ser ditas na resposta.**

1. **Vigência inferida, e o parágrafo vem empilhado.** O servidor toma como vigente a última versão não revogada da pilha, o que é inferência de ordem e não leitura de marca, e o bloco `inferencia` diz isso em TODA resposta. Pior que o caput, o parágrafo e o inciso também vêm empilhados dentro do texto do artigo, sem marca de qual vale. Medido, o § 1º do art. 57 da Lei 8.213 aparece com os 85% antes dos 100% da Lei 9.032/1995, e o § 3º do art. 20 da LOAS aparece quatro vezes, uma delas com o meio salário mínimo que não vale. **Transcrever a primeira ocorrência de um parágrafo é o erro mais caro aqui.**
2. **Histórico por ANO, e o ano da alteração é ambíguo.** Pedir data completa não devolve erro, devolve o ano. Medido no art. 29 da Lei 8.213, `1998-06-15` traz a redação original, correta, e `1999-01-10` traz a redação da Lei 9.876 **de 26/11/1999**, que naquele janeiro ainda não existia. Caindo a consulta no ano em que a norma alteradora entrou, a data exata se confere na norma alteradora.
3. **Os Anexos II, III e IV do Decreto 3.048/99 ficaram de fora,** por serem pseudo-tabela. Medido, uma busca por ruído devolve dez resultados e nenhum do Decreto 3.048. O substituto é o **Decreto 53.831/1964**, mas o Quadro Anexo dele foi gravado dentro do art. 6º, que é a cláusula de vigência, de modo que a busca por agente nocivo casa sempre naquele artigo e o quadro se lê abrindo o artigo inteiro.
4. **O campo `texto` é fiel, o `dispositivos` não é.** Em artigo com remissão interna o separador quebra, e no art. 20 da LOAS o § 3º-A foi cortado em "ressalvadas as hipóteses previstas no", virando um falso § 14. Para transcrever em peça lê-se o `texto`, e o `dispositivos` serve para navegar.

**Enunciado do CRPS não está no `normas`.** Continua no MCP `iurisprudencia`, cujo `enunciados_pleno_inss_crps` devolve o texto vigente, as redações anteriores e a resolução que alterou cada uma, e cujo `acordaos_por_precedente_inss_crps` devolve os acórdãos que o aplicaram. Não achar enunciado no `normas` não significa que ele não exista.

A forma de pesquisar, com as cinco ferramentas, os casos de exercício e o estado da medição, está em `references/PESQUISA-NO-MCP-NORMAS.md`. Os agentes do plugin chamam o `normas` diretamente, com a mesma regra de marcação.

## Os outros três MCPs da casa

O `normas` é um de quatro servidores locais, ao lado do `trf3`, do `iurisprudencia` e do `acervo`. O mapa dos quatro e a regra de articulação entre eles estão na `ponte-orquestrador-previdenciario`.

## PROTOCOLO ANTI-ALUCINAÇÃO OBRIGATÓRIO

Toda vez que for citar um artigo de norma primária, o Claude DEVE seguir este protocolo de 4 passos.

**Passo 1. Identificar a norma.** Localizar pelo MCP `normas`, e não estando ele disponível, localizar no índice abaixo qual arquivo do workspace contém a norma.

**Passo 2. Abrir o arquivo.** Ler o campo `texto` de `obter_artigo` ou, sem o MCP, o arquivo do workspace (caminhos abaixo). No plugin, o mesmo corpus está em `_base-conhecimento-inss/mcp-normas/corpus/`.

**Passo 3. Buscar o artigo.** Usar Grep ou Read com offset/limit para localizar o artigo, parágrafo, inciso ou alínea exato. Para o Quadro Anexo do Decreto 53.831/1964, consultar o arquivo `Decreto-53831-1964-quadro-agentes-nocivos.md` que tem o quadro em formato tabular.

**Passo 4. Transcrever LITERALMENTE.** Copiar a redação preservando notas de "Redação dada pela Lei X.XXX", "Incluído pela Lei X.XXX" ou "Revogado pela Lei X.XXX". Estas marcações são essenciais para o trabalho pró-segurado.

Se o artigo NÃO for localizado, declarar expressamente "Não localizado no arquivo X" e propor alternativa (consultar fonte oficial em link, contactar fonte direta, ou suspender a afirmação).

## ÍNDICE COMPLETO DO REPOSITÓRIO

Registra todas as normas presentes na pasta do workspace.

Caminho base no Windows. `C:\Users\VAIO\INSS\base-legislacao\`

Caminho base no Linux mount (Cowork). `/sessions/<sessão>/mnt/INSS/base-legislacao/`, com o `<sessão>` resolvido a cada sessão.

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
- `Decreto-10995-2022.md` Decreto 10.995/2022, Estrutura Regimental do INSS, base do mapeamento institucional. Última alteração Decreto 12.764/2025.

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

## CRUZAMENTO COM OUTRAS SKILLS DO PLUGIN

Esta skill deve ser acionada AUTOMATICAMENTE em conjunto com.

- `peticao-previdenciaria` antes de qualquer redação que cite artigos das normas listadas.
- `revisao-peticao` durante a auditoria, conferindo cada citação contra o repositório.
- `base-portarias-dpmf-inss-hub` quando for citar Portarias 990-996/2022 (a taxonomia corrigida está aqui).
- `precedentes-previdenciarios` quando for amarrar artigo de norma a precedente jurisprudencial.
- `base-documentos-comprobatorios-in128` quando for citar arts. da IN 128/2022 sobre documentação.
- `base-cnis-acerto-indicadores` quando for citar arts. das Portarias 990/2022 e 991/2022.

## ATUALIZAÇÃO DO REPOSITÓRIO

O repositório foi baixado em 31/05/2026. Regras de atualização:

- Para Leis e Decretos. Re-baixar do Planalto sempre que houver nova lei de alteração relevante (Lei 8.213 e Lei 8.212 mudam com frequência).
- Para IN 128/2022. Re-baixar quando novas INs alterarem (IN 170/2024 já consolidada, conferir IN 174+).
- Para Portarias. Re-baixar quando novas portarias revogarem ou alterarem.
- Portaria MPS 125/2026 (RICRPS). Conferir alterações posteriores às Portarias 235 e 462/2026.

### Pendências do repositório

A Portaria 1.309/2025, alterada pela 1.318/2025, revoga a 1.056/2022 e a 1.231/2024 (tratamento na `base-erro-administrativo-iea-13975`).

Arquivos avulsos a apagar na pasta, pendentes de exclusão manual pelo escritório (o mount bloqueia exclusão pura pela skill). `04-Decretos/Decreto-83080-1979-quadro-agentes-nocivos.PARCIAL.md`, superado pelo `Decreto-83080-1979.md` completo. E o `.__wtest` na raiz da pasta, artefato de teste de gravação. Nenhum dos dois está no índice, por não serem fontes primárias válidas.

Ainda faltam na pasta, sem fonte oficial acessível na data. Portaria DPMF/INSS 19/2026 (Teleperícia) e Portarias Conjuntas MPS/INSS 13, 14 e 15/2026 (análise documental B31, B91, B94). A Portaria Conjunta MPS/INSS 43/2026, que prorroga por 365 dias o teto de 90 dias da 14/2026, entrou no corpus do MCP normas em 22/09/2026, a partir do PDF do DOU, com hash e URL do in.gov.br no frontmatter. Observação. A Portaria Conjunta 13/2026 já foi conferida por inteiro teor no DOU, mas ainda não foi baixada como arquivo neste repositório. Baixar quando houver PDF oficial ou captura do DOU. A Portaria Conjunta MPS/INSS 54/2026 (DOU de 06/11/2026), que altera os arts. 3º, 8º e 9º da 13/2026 e acrescenta o art. 8º-A, ENTROU no corpus em 06/11/2026 (`Portaria-Conjunta-MPS-INSS-54-2026.md`), com URL do in.gov.br no frontmatter; a 13/2026 está no corpus na redação original, com remissão à 54/2026 no frontmatter.

Segunda prioridade, mapeada mas ainda não baixada. Lei 15.157/2025, Lei 11.301/2006, Lei 15.326/2026, Lei 13.183/2015, Lei 11.718/2008, EC 41/2003, EC 113/2021, IN 164/2024 e IN 188/2025. Também a Portaria MTP 1.467/2022 (consolidação dos RPPS, cujo Anexo X é a Relação das Bases de Cálculo de Contribuição usada na CTC estadual), invocada pela skill base-ctc-estadual-conferencia-e-lancamento-previus e por ora conferida apenas em fonte oficial gov.br, sem arquivo local.

Registro de incidente. A Lei 8.212/91 sumiu da pasta em rodada de gravação de 06/07/2026 e foi restaurada do Planalto na mesma data, causa não confirmada. Conferir periodicamente a integridade da pasta contra este índice.

## LIMITAÇÃO CONHECIDA

Esta skill APONTA para os arquivos no workspace, NÃO duplica o conteúdo nas references. Isso preserva o tamanho do plugin. O acesso ao texto literal exige o workspace do escritório Tercini disponível. Em sessões sem o workspace, a skill ainda serve como índice e protocolo, e a verificação deve ser feita via WebFetch direto da URL oficial registrada no índice acima.

## Verificação dinâmica em cascata

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

## Protocolo de pesquisa obrigatória nas MCPs

Todas as skills remetem a este protocolo pelo bloco "MCPs da casa". A regra é uma só. Norma, súmula, tema, enunciado ou acórdão só entra em peça, parecer ou orientação depois de localizado no MCP próprio e lido na fonte oficial, e até lá leva [NÃO CONFIRMADO].

A consulta precede a redação e tem dupla função. A primeira é conferir a citação. A segunda é controlar a tese pelo que os órgãos já decidiram sobre a mesma questão. Antes de concluir, a skill busca no `iurisprudencia` (TNU, CRPS, Turmas Recursais e TRU) e no `trf3` (Turmas, 3ª Seção e Turmas Recursais de SP e MS) ao menos as decisões recentes sobre o ponto controvertido, e no `acervo` o que o escritório já sustentou. O resultado entra na análise como corrente dominante, corrente divergente e ausência de julgado, e a decisão contrária à tese é enfrentada por distinção ou superação antes do protocolo. Análise sem essa consulta declara a omissão e não se apresenta como conclusiva.

Cada tipo de citação tem um MCP de primeira via. O dispositivo de lei, decreto, emenda e portaria do corpus local se lê no `normas`, por `obter_artigo` e `redacao_na_data`. A IN 128/2022 se lê também no `norma_inss` do `iurisprudencia`, texto consolidado pelo INSS e versionado parágrafo a parágrafo, que já traz alterações ausentes da base local, como o art. 369-A incluído pela IN PRES/INSS 212, de 06/08/2026. O mesmo `norma_inss`, com `norma` igual a `portaria-conjunta-94`, traz as ações civis públicas que o INSS cumpre, com a situação de cada uma. O enunciado do CRPS se lê em `enunciados_pleno_inss_crps`, com a redação vigente e as anteriores. O acórdão da TNU se localiza em `buscar_acordaos_tnu`, pelo número CNJ ou por termo. O acórdão do TRF3 se localiza no `trf3` local e, nas Turmas Recursais, também em `buscar_acordaos_trf3_jef`, que consulta o tribunal ao vivo. Tema e súmula se conferem antes no catálogo `base-precedentes-catalogo-vinculantes` e no catálogo complementar da `auditoria-citacoes`.

As coberturas foram medidas em 03/10/2026. A base local de normas é fotografia de 31/05/2026. O MCP da TNU cobre de 18/01/2019 a 02/10/2026, e o PEDILEF anterior a 2019 só aparece citado em acórdão posterior. O `trf3` local cobre acórdãos de 10/2021 a 09/2026, sem o Órgão Especial e sem as 3ª, 4ª e 6ª Turmas, e o JEF ao vivo não alcança a 2ª Seção e aceita de 12 a 15 consultas por minuto. Ausência em MCP não prova inexistência.

A pesquisa obrigatória não se confunde com a forma de entregá-la. O resultado chega ao titular, no chat, pela corrente e pelo órgão, sem número de processo, relator ou data, e a lista completa, com a marcação de cada item, vai em planilha anexa e na peça (`base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`).

Os portais do STF, do STJ (repetitivos e SCON), do CJF e do TST recusam o acesso automatizado por WebFetch, e a leitura oficial desses itens se faz pelo navegador do usuário, com os endereços e a técnica da seção 9 de `pesquisa-jurisprudencia-chrome`. O arquivo de verbetes do STJ (www.stj.jus.br/docs_internet/VerbetesSTJ_asc.txt) abre por WebFetch, mas está desatualizado e não serve de fonte. O que foi lido em fonte oficial fica registrado no catálogo complementar da `auditoria-citacoes`, que as próximas auditorias reconhecem. A cota de WebSearch de uma sessão se esgota em cerca de duzentas buscas, e a conferência em massa deve poupá-la.

A auditoria da base usa três scripts, rodados depois de cada lote de alterações. O `scripts/auditoria_normas.py`, nesta skill, confere a existência de artigo, parágrafo e inciso no banco do `normas`. O `auditoria_citacoes.py` e o `triagem_catalogo.py`, na `auditoria-citacoes`, extraem os precedentes e os cruzam com o catálogo. Os erros mais frequentes da rodada de 03/10/2026 foram o número de tema atribuído a assunto de outro tema, o homônimo de outra corte (Súmula 632 do STJ e do STF, Súmula 44 da TNU e do STJ, Tema 640 do STJ e do STF) e o dispositivo existente citado para conteúdo que está em outro parágrafo, como o art. 26, §3º, II, da EC 103/2019 citado para a regra de 60% mais 2%, que está no §2º, III.

## Auditoria mecânica das citações normativas

O script `scripts/auditoria_normas.py` varre skills e agentes, extrai cada citação de artigo, parágrafo e inciso e a confere no banco local do MCP `normas`, sem internet. Roda com `python scripts/auditoria_normas.py --so-problemas` depois de cada lote de alterações, e com `--demo` para o autoteste.

A saída classifica cada ocorrência em artigo inexistente, revogado, parágrafo inexistente ou só em redação anterior, inciso inexistente e número divergente. Achado não é erro certo. A base é fotografia de 31/05/2026, e norma posterior aparece como inexistente, como os arts. 369-A, 532, §4º, e 566, §9º, da IN 128/2022, incluídos pela IN PRES/INSS 212, de 06/08/2026 (DOU de 11/08/2026). Todo achado se confere na fonte oficial antes da correção.

O script confere a existência do dispositivo, e não a fidelidade da paráfrase. A paráfrase se confere pela leitura do campo `texto` de `obter_artigo`, e a primeira rodada (03/10/2026) mostrou o padrão de erro mais frequente, que é o dispositivo existente atribuído ao conteúdo errado, como o art. 26, §3º, II, da EC 103/2019 citado para a regra de 60% mais 2%, que está no §2º, III.

Normas citadas na base e ausentes do banco exigem fonte oficial a cada uso. As mais frequentes na rodada de 03/10/2026 foram o Decreto 6.214/2007, a IN PRES/INSS 21/2026, a Lei 10.779/2003, o Decreto 10.410/2020, a Lei 8.870/1994, a Portaria Conjunta MPS/INSS 13/2026, a Lei 13.709/2018 e a IN PRES/INSS 212/2026.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.
