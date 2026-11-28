---
name: base-peticao-previdenciaria-padrao-visual
description: "Padrão visual das petições do escritório Paulo Tercini, IMPLEMENTADO por script desde a Onda 140. A peça é redigida em Markdown pela peticao-previdenciaria, medida por scripts/medir_peca.py e convertida por scripts/md2docx.js, que aplica A4, Bookman Old Style 12pt, espaçamento 1,5, timbre com logo de fundo branco, títulos em tabela preta, recuo 2 cm ou 4 cm no CRPS, citações recuadas, tabelas e fecho do titular (Termos em que, Pede deferimento, Monte Alto/SP e data). Use SEMPRE que mencionar padrão visual petição, formatação Tercini, timbre, título preto, tabela preta, Visual Law, layout, docx-js Tercini, A4, recuo CRPS, linha do tempo, quadro-resumo, síntese do caso em duas ou três linhas, teto de três componentes, regras anti-poluição, teste do relance, fatos incontroversos, tabela comparativa, efeitos financeiros Tema 1124. Cruza com peticao-previdenciaria, base-revisao-peticao-aprofundada, tema-1124-instrucao-administrativa e printscreen-impacto."
---

# Padrão Visual das Petições, implementado por script

A partir da Onda 140 (16/09/2026) esta skill não descreve mais a mecânica do .docx em prosa, porque a prosa não era seguida e ocupava dez mil palavras de contexto. O padrão visual está IMPLEMENTADO em `peticao-previdenciaria/scripts/md2docx.js`, que recebe a peça em Markdown e devolve o .docx pronto. Quem redige não escreve docx-js.

## O que o script garante

A4 com margens de 1,5, 2, 2,75 e 2 cm. Bookman Old Style 12pt, justificado, espaçamento 1,5, recuo de primeira linha de 2 cm nas peças judiciais e 4 cm nas administrativas com `--crps`. Cabeçalho timbrado apenas na primeira página, com a logo de fundo branco, "ADVOCACIA PREVIDENCIÁRIA" em Bell MT 24pt, nome e OAB. Rodapé da primeira página com endereço e telefones. Títulos de seção em tabela preta de uma célula com texto branco em negrito. Citações recuadas 4 cm em itálico. Tabelas em 10pt com bordas e primeira coluna em negrito. Linha centralizada em negrito para o nome da ação, as razões e os quesitos (`#`), trecho de documento em negrito e itálico (`***"..."***`) e quebra de página entre interposição e razões (`@quebra`). Fecho do titular (Onda 174) com "Termos em que,", "Pede deferimento.", "Monte Alto/SP, [data por extenso]." e a assinatura centralizada, mantidos na mesma página.

## O que continua sendo decisão de quem redige

O uso de componente Visual Law, opcional desde a Onda 174 e limitado a três por peça, sem síntese inicial nem quadro-resumo na petição do método do titular (o memorial mantém o quadro-resumo). A estrutura de seções e a voz do `peticao-previdenciaria/references/METODO-PETICAO-TERCINI.md` (Onda 174), com títulos formais e nominais (Onda 162). Tudo isso está documentado em `peticao-previdenciaria/references/VISUAL-LAW.md`, e os endereçamentos, a qualificação e as peças de duas partes em `peticao-previdenciaria/references/MECANICA-DOCX.md`.

## Verificação pós-geração

Converter o .docx em PDF e abrir a primeira página. Conferir a logo com fundo branco, o timbre, o primeiro título preto e o recuo, depois de rodar as três checagens do cabeçalho de `peticao-previdenciaria/references/MECANICA-DOCX.md`, seção Logo do escritório, porque o script gera a peça sem logo e sem aviso quando o caminho de `--logo` falha. Abrir a última página e conferir o fecho com a unidade federativa. Sem essa conferência a peça não é entregue.

## Cruzamentos

`peticao-previdenciaria` é a dona do fluxo e dos scripts. `base-revisao-peticao-aprofundada` usa o mesmo `medir_peca.py` na Camada 6. `printscreen-impacto` insere os destaques no .docx gerado.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.
