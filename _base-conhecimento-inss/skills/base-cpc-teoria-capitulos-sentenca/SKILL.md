---
name: base-cpc-teoria-capitulos-sentenca
description: "Teoria dos capítulos da sentença no processo previdenciário, recurso parcial, sucumbência e trânsito em julgado por capítulos, ótica pró-segurado. Use SEMPRE que mencionar teoria dos capítulos, capítulos da sentença, capítulo autônomo, decisão em capítulos, recurso parcial, impugnação parcial, trânsito em julgado parcial, coisa julgada por capítulos, capítulo não impugnado, tantum devolutum quantum appellatum, sucumbência recíproca, art. 86 CPC, sucumbência mínima art. 86 parágrafo único, vedação de compensação de honorários art. 85 §14, execução do incontroverso, cumprimento imediato de capítulo, IRDR 18 TRF4, Tema 28 STF. Base para dosar o recurso, preservar o capítulo favorável e executar desde logo a parte incontroversa. Cruza com base-analise-decisao-tres-eixos, base-cpc-coisa-julgada-progressiva, base-cpc-apelacao-efeitos-art1013, base-cpc-honorarios-sucumbencia-previdenciaria, peticao-previdenciaria e revisao-peticao. NÃO use para ação rescisória nem para o mérito do benefício isolado."
---

# Teoria dos Capítulos da Sentença

## Escopo

Skill pró-segurado sobre os capítulos da decisão. A sentença previdenciária costuma ter mais de um capítulo, por exemplo o reconhecimento do tempo, a concessão do benefício, a DIB, os atrasados e os honorários. Cada capítulo tem vida própria para fins de recurso e de coisa julgada.

## Conceito

Capítulo é cada unidade decisória autônoma do dispositivo, que poderia existir como decisão isolada. O CPC reconhece a figura, inclusive no art. 966, §3º, ao admitir rescisória de capítulo.

## Consequências práticas

Primeiro, recurso parcial. Impugnado só um capítulo, os demais transitam em julgado. O tantum devolutum quantum appellatum limita o tribunal ao que foi atacado.

Segundo, trânsito em julgado por capítulos. O capítulo não recorrido estabiliza-se antes do fim do processo, tema aprofundado em `base-cpc-coisa-julgada-progressiva`.

Terceiro, execução do incontroverso. O capítulo já estável pode ser cumprido desde logo, sem esperar o julgamento do recurso sobre os demais, IRDR 18/TRF4 e Tema 28/STF.

## Sucumbência e honorários

Primeiro, sucumbência recíproca, art. 86, quando cada parte perde em parte. A distribuição é proporcional.

Segundo, sucumbência mínima, art. 86, parágrafo único, quando a parte decai de parte ínfima, o adversário responde sozinho pelas verbas.

Terceiro, vedação de compensação de honorários, art. 85, §14. Cálculo detalhado em `base-cpc-honorarios-sucumbencia-previdenciaria`.

## Estratégia pró-segurado

Primeiro, ao recorrer, mapear os capítulos e impugnar apenas os desfavoráveis, preservando o capítulo favorável que já transitou.

Segundo, requerer o cumprimento imediato do capítulo incontroverso, a implantação do benefício reconhecido, enquanto se discute a DIB ou os atrasados.

Terceiro, na resposta ao recurso do INSS, delimitar que o capítulo não atacado por ele está precluso.

## Alertas

Primeiro, recurso amplo demais reabre capítulo já favorável, cuidado com a extensão.

Segundo, o trânsito parcial exige que o capítulo seja realmente autônomo, não mera parte da fundamentação.

Terceiro, a execução do incontroverso depende de capítulo líquido e certo.

## MCPs da casa

Antes de redigir, consulte os três servidores locais do plugin, nesta ordem. Os três localizam e não conferem, e nenhum autoriza a marca [CONFERIDO].

Legislação. Todo dispositivo citado nesta skill se transcreve do MCP `normas`, por `obter_artigo` no identificador da norma e no número do artigo (exemplo, `lei-8213-1991` e `57`), lendo o campo `texto` e a última ocorrência de cada parágrafo. Para tese de direito adquirido, `redacao_na_data`, que responde por ano. A citação em peça exige a `fonte_oficial` que a resposta devolve. Detalhe em `base-legislacao-fontes-primarias`.

Jurisprudência do TRF3 e das Turmas Recursais. Localize pelo MCP `trf3`, com `buscar_acordaos_trf3` (consulta, `polo_recorrente`, `resultado`, `orgao_julgador` e datas) e `obter_acordao_trf3` no id devolvido. `resultado` e `polo_recorrente` são inferidos. O achado nasce [NÃO CONFIRMADO] e só entra na peça depois de aberto no portal do TRF3, na forma de `pesquisa-jurisprudencia-chrome`. TNU e CRPS ficam no MCP `iurisprudencia`.

Acervo do escritório. Consulte pelo MCP `acervo` o que o escritório já sustentou neste tema. Comece por `buscar_tese_acervo` com os termos centrais desta skill e, achando trecho útil, leia o argumento inteiro com `obter_trecho_acervo`. Para saber em que peças um precedente já foi usado, chame `precedentes_do_acervo` e leia o campo `corte` da resposta, porque o mesmo número de Tema existe em mais de uma corte. Detalhe em `base-acervo-escritorio`.

**Vedação.** O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova, conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o arquivo de origem não é.

## Integração com outras skills

Acionada pelo eixo 3 de `base-analise-decisao-tres-eixos`.
Para coisa julgada progressiva, acionar `base-cpc-coisa-julgada-progressiva`.
Para a apelação e a dimensão do efeito devolutivo, acionar `base-cpc-apelacao-efeitos-art1013`.
Para honorários, acionar `base-cpc-honorarios-sucumbencia-previdenciaria`.
Para redigir, acionar `peticao-previdenciaria`.

## O que NÃO está nesta skill

Coisa julgada progressiva detalhada está em `base-cpc-coisa-julgada-progressiva`. Rescisória de capítulo está em `base-cpc-acao-rescisoria-previdenciaria`. O mérito do benefício está nas skills temáticas.
