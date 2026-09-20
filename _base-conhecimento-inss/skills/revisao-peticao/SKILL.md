---
name: revisao-peticao
description: "Redirecionamento (Onda 139). Skill legada de revisão de petições em quatro camadas, SUBSTITUÍDA pela base-revisao-peticao-aprofundada. Ao ser acionada por qualquer gatilho (revisar petição, auditar petição, checar petição, revisão da peça, verificar petição, conferir petição, revisão após peticao-previdenciaria), NÃO execute a revisão aqui. Acione a base-revisao-peticao-aprofundada, que contém tudo o que esta skill continha (regra zero antialucinação, camadas formal, normativa, fática e argumentativa, severidades) mais a camada de integridade probatória, a severidade BLOQUEANTE, o orçamento de extensão, a ordem única de execução e os agentes do plugin. Mantida apenas para que as 122 referências cruzadas ao nome revisao-peticao continuem resolvendo."
---

# revisao-peticao (redirecionamento)

Esta skill foi absorvida pela `base-revisao-peticao-aprofundada` na Onda 139 (14/09/2026). Todo o conteúdo anterior, regra zero antialucinação, quatro camadas de auditoria e três severidades, está contido na versão aprofundada, que acrescenta a camada de integridade probatória, a severidade BLOQUEANTE, a camada de extensão e legibilidade, a ordem única de execução e os agentes do plugin.

Ao ser acionada, faça uma única coisa. Acione `base-revisao-peticao-aprofundada` e siga a seção ORDEM ÚNICA DE EXECUÇÃO dela. Não execute revisão paralela, porque duas revisões da mesma peça dobram o relatório sem acrescentar achado.

O nome `revisao-peticao` permanece porque mais de cem skills e agentes do plugin o citam em "Cruza com". Toda referência a `revisao-peticao` lê-se como referência à `base-revisao-peticao-aprofundada`.

## Acervo do escritório

Antes de redigir, consulte pelo MCP `acervo` o que o escritório já sustentou neste tema. Comece
por `buscar_tese_acervo` com os termos centrais desta skill e, achando trecho útil, leia o
argumento inteiro com `obter_trecho_acervo`. Para saber em que peças um precedente já foi usado,
chame `precedentes_do_acervo`. O detalhamento das ferramentas e dos filtros está em
`base-acervo-escritorio`.

**Vedação.** O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático
de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova,
conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o
arquivo de origem não é.
