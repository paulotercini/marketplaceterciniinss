---
name: revisao-peticao
description: "Redirecionamento (Onda 139). Skill legada de revisão de petições em quatro camadas, SUBSTITUÍDA pela base-revisao-peticao-aprofundada. Ao ser acionada por qualquer gatilho (revisar petição, auditar petição, checar petição, revisão da peça, verificar petição, conferir petição, revisão após peticao-previdenciaria), NÃO execute a revisão aqui. Acione a base-revisao-peticao-aprofundada, que contém tudo o que esta skill continha (regra zero antialucinação, camadas formal, normativa, fática e argumentativa, severidades) mais a camada de integridade probatória, a severidade BLOQUEANTE, o orçamento de extensão, a ordem única de execução e os agentes do plugin. Mantida apenas para que as 122 referências cruzadas ao nome revisao-peticao continuem resolvendo."
---

# revisao-peticao (redirecionamento)

Esta skill foi absorvida pela `base-revisao-peticao-aprofundada` na Onda 139 (14/09/2026). Todo o conteúdo anterior, regra zero antialucinação, quatro camadas de auditoria e três severidades, está contido na versão aprofundada, que acrescenta a camada de integridade probatória, a severidade BLOQUEANTE, a camada de extensão e legibilidade, a ordem única de execução e os agentes do plugin.

Ao ser acionada, faça uma única coisa. Acione `base-revisao-peticao-aprofundada` e siga a seção ORDEM ÚNICA DE EXECUÇÃO dela. Não execute revisão paralela, porque duas revisões da mesma peça dobram o relatório sem acrescentar achado.

O nome `revisao-peticao` permanece porque mais de cem skills e agentes do plugin o citam em "Cruza com". Toda referência a `revisao-peticao` lê-se como referência à `base-revisao-peticao-aprofundada`.

## MCPs da casa

Pesquisa obrigatória (Onda 169). Nenhuma norma, súmula, tema, enunciado ou acórdão citado nesta skill entra em peça, parecer ou orientação sem passar antes pelo MCP próprio, e nenhum MCP autoriza sozinho a marca [CONFERIDO]. O achado nasce [NÃO CONFIRMADO] e só sobe a [CONFERIDO] depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`.

Legislação. O dispositivo se transcreve do MCP `normas`, por `obter_artigo` no identificador da norma e no número do artigo (exemplo, `lei-8213-1991` e `57`), lendo o campo `texto` e a última ocorrência de cada parágrafo, e a redação de outra época se lê por `redacao_na_data`. A IN 128/2022 se confere também pelo `norma_inss` do MCP `iurisprudencia`, que versiona parágrafo a parágrafo e já traz alterações ausentes da base local, como as da IN PRES/INSS 212/2026. Norma ausente das duas bases exige a fonte oficial a cada uso.

Jurisprudência. Tema, súmula e enunciado se conferem primeiro no catálogo `base-precedentes-catalogo-vinculantes` e no catálogo complementar da `auditoria-citacoes`, com atenção ao homônimo de outra corte. Enunciado do CRPS se lê em `enunciados_pleno_inss_crps`, na redação vigente e nas anteriores. Acórdão da TNU se localiza em `buscar_acordaos_tnu`. Acórdão do TRF3 e das Turmas Recursais se localiza em `buscar_acordaos_trf3`, na base local, e em `buscar_acordaos_trf3_jef`, consulta ao vivo. Ação civil pública que o INSS cumpre se lê no `norma_inss`, Portaria Conjunta 94/2024.

Acervo do escritório. O que o escritório já sustentou se lê no MCP `acervo`, por `buscar_tese_acervo`, `obter_trecho_acervo` e `precedentes_do_acervo`, cujo campo `corte` evita o homônimo. Detalhe em `base-acervo-escritorio`.

**Vedação.** O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova, conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o arquivo de origem não é.

Protocolo completo, coberturas e limites medidos em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs".

Entrega no chat (Onda 171). O achado chega ao titular pela corrente e pelo órgão, sem número de processo, relator ou data, em até três parágrafos e com no máximo três dados concretos. A lista completa, com a marcação de cada item, vai em planilha anexa e na peça, na forma de `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.
