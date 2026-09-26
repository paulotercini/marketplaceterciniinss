---
name: base-peticao-previdenciaria-padrao-visual
description: "Padrão visual das petições do escritório Paulo Tercini, IMPLEMENTADO por script desde a Onda 140. A peça é redigida em Markdown pela peticao-previdenciaria, medida por scripts/medir_peca.py e convertida por scripts/md2docx.js, que aplica A4, Bookman Old Style 12pt, espaçamento 1,5, timbre com logo de fundo branco, títulos em tabela preta, recuo 2 cm ou 4 cm no CRPS, citações recuadas, tabelas e fecho com Monte Alto – SP e data. Use SEMPRE que mencionar padrão visual petição, formatação Tercini, timbre, título preto, tabela preta, Visual Law, layout, docx-js Tercini, A4, dois-pontos vedado, recuo CRPS, linha do tempo, quadro-resumo, síntese do caso em duas ou três linhas, teto de três componentes, regras anti-poluição, teste do relance, fatos incontroversos, tabela comparativa, efeitos financeiros Tema 1124. Cruza com peticao-previdenciaria, base-revisao-peticao-aprofundada, tema-1124-instrucao-administrativa e printscreen-impacto."
---

# Padrão Visual das Petições, implementado por script

A partir da Onda 140 (16/09/2026) esta skill não descreve mais a mecânica do .docx em prosa, porque a prosa não era seguida e ocupava dez mil palavras de contexto. O padrão visual está IMPLEMENTADO em `peticao-previdenciaria/scripts/md2docx.js`, que recebe a peça em Markdown e devolve o .docx pronto. Quem redige não escreve docx-js.

## O que o script garante

A4 com margens de 1,5, 2, 2,75 e 2 cm. Bookman Old Style 12pt, justificado, espaçamento 1,5, recuo de primeira linha de 2 cm nas peças judiciais e 4 cm nas administrativas com `--crps`. Cabeçalho timbrado só na primeira página, com a logo de fundo branco, "ADVOCACIA PREVIDENCIÁRIA" em Bell MT 24pt, nome e OAB. Rodapé da primeira página com endereço e telefones. Títulos de seção em tabela preta de uma célula com texto branco em negrito. Citações recuadas 4 cm em itálico. Tabelas em 10pt com bordas e primeira coluna em negrito. Fecho com "Nestes termos, pede deferimento.", "Monte Alto – SP, [data por extenso]." e a assinatura centralizada.

## O que continua sendo decisão de quem redige

A síntese do caso em duas ou três linhas, com o ponto controvertido e o que se pede, sem nome, idade ou data de nascimento. O teto de TRÊS componentes Visual Law por peça, com o quadro-resumo sempre entre eles. Títulos persuasivos que antecipam a conclusão. Tudo isso está documentado em `peticao-previdenciaria/references/VISUAL-LAW.md`, e os endereçamentos, a qualificação e as peças de duas partes em `peticao-previdenciaria/references/MECANICA-DOCX.md`.

## Verificação pós-geração

Converter o .docx em PDF e abrir a primeira página. Conferir a logo com fundo branco, o timbre, o primeiro título preto e o recuo. Abrir a última página e conferir o fecho com a unidade federativa. Sem essa conferência a peça não é entregue.

## Cruzamentos

`peticao-previdenciaria` é a dona do fluxo e dos scripts. `base-revisao-peticao-aprofundada` usa o mesmo `medir_peca.py` na Camada 6. `printscreen-impacto` insere os destaques no .docx gerado.

## MCPs da casa

Antes de redigir, consulte os três servidores locais do plugin, nesta ordem. Os três localizam e não conferem, e nenhum autoriza a marca [CONFERIDO].

Legislação. Todo dispositivo citado nesta skill se transcreve do MCP `normas`, por `obter_artigo` no identificador da norma e no número do artigo (exemplo, `lei-8213-1991` e `57`), lendo o campo `texto` e a última ocorrência de cada parágrafo. Para tese de direito adquirido, `redacao_na_data`, que responde por ano. A citação em peça exige a `fonte_oficial` que a resposta devolve. Detalhe em `base-legislacao-fontes-primarias`.

Jurisprudência do TRF3 e das Turmas Recursais. Localize pelo MCP `trf3`, com `buscar_acordaos_trf3` (consulta, `polo_recorrente`, `resultado`, `orgao_julgador` e datas) e `obter_acordao_trf3` no id devolvido. `resultado` e `polo_recorrente` são inferidos. O achado nasce [NÃO CONFIRMADO] e só entra na peça depois de aberto no portal do TRF3, na forma de `pesquisa-jurisprudencia-chrome`. TNU e CRPS ficam no MCP `iurisprudencia`.

Acervo do escritório. Consulte pelo MCP `acervo` o que o escritório já sustentou neste tema. Comece por `buscar_tese_acervo` com os termos centrais desta skill e, achando trecho útil, leia o argumento inteiro com `obter_trecho_acervo`. Para saber em que peças um precedente já foi usado, chame `precedentes_do_acervo` e leia o campo `corte` da resposta, porque o mesmo número de Tema existe em mais de uma corte. Detalhe em `base-acervo-escritorio`.

**Vedação.** O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova, conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o arquivo de origem não é.
