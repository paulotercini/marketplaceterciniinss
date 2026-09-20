---
name: base-acervo-escritorio
description: Acervo do escritório Paulo Roberto Tercini Filho em base LOCAL, respondendo pelo que o PRÓPRIO escritório já escreveu. Use SEMPRE que mencionar acervo do escritório, peça protocolada, como já sustentamos, o que já escrevemos, Modelo Ouro, buscar tese própria, trecho argumentativo, peça anterior, precedente já citado pelo escritório, em que peça usamos determinado Tema, e SEMPRE antes de redigir petição, recurso ou parecer. Detalha as seis ferramentas do MCP acervo e o vocabulário dos filtros de origem, tipo de peça, benefício e rito. VEDAÇÃO, o acervo existe para o advogado LER o que já sustentou, e reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. Não tem jurisprudência, que fica nos MCPs trf3 e iurisprudencia, nem rascunho, nem laudo, CNIS, PPP ou documento pessoal. Cruza com peticao-previdenciaria, inicial, inicial-inss, base-revisao-peticao-aprofundada e base-precedentes-catalogo-vinculantes.
---

# Acervo do escritório, o MCP `acervo`

## O que é

Terceiro MCP do escritório. O `trf3` responde pela jurisprudência do TRF3 e das Turmas Recursais. O `iurisprudencia` responde por TNU e CRPS. O `normas` responde pela legislação. O `acervo` é o único que responde **pelo que o próprio escritório escreveu**, e devolve o trecho argumentativo com a peça de origem.

Base **local**, na máquina do escritório. Nada do conteúdo sai do computador, nada vai para repositório, e a pasta de dados não entra em commit nenhum.

Está declarado em `_base-conhecimento-inss/.mcp.json`, com o nome `acervo`.

## As seis ferramentas

| Ferramenta | Para quê |
|---|---|
| `visao_geral_acervo` | o que a base cobre, primeira chamada da sessão |
| `buscar_tese_acervo` | trechos que casam com a consulta, com a peça de origem |
| `obter_trecho_acervo` | o trecho com os parágrafos vizinhos, para ler o argumento inteiro |
| `listar_pecas_acervo` | as peças pelo metadado, para achar o modelo certo |
| `precedentes_do_acervo` | em que peças o escritório já citou um precedente |
| `caminho_da_peca_acervo` | o caminho real do arquivo, para abrir a peça |

A consulta aceita aspas para expressão exata, `-palavra` para excluir, e ignora acentuação. A unidade de busca é o **parágrafo**.

## Vocabulário dos filtros

`origem` aceita `protocolado`, que é a peça efetivamente protocolada em PDF, mais `modelo_ouro`, `acervo`, `vault` e `exportado`.

`tipo_peca` aceita `inicial`, `recurso`, `contrarrazoes`, `embargos`, `agravo`, `apelacao`, `recurso_especial`, `replica`, `manifestacao`, `quesitos`, `cumprimento`, `mandado_seguranca`, `parecer`, `requerimento`, `procuracao` e `pedido_medico`.

`beneficio` aceita `aposentadoria_especial`, `aposentadoria_pcd`, `bpc_loas`, `auxilio_acidente`, `auxilio_reclusao`, `incapacidade`, `pensao_morte`, `rural`, `salario_maternidade`, `professor`, `aposentadoria_idade`, `aposentadoria_tempo` e `revisao`.

`rito` aceita `jef`, `trf3`, `tjsp`, `crps`, `administrativo` e `superior`.

## O que o acervo NÃO tem

Não tem jurisprudência. Quando um trecho cita um precedente, a referência vem em `precedentes_citados` e o inteiro teor está no `trf3` ou no `iurisprudencia`. A articulação entre as bases é a **remissão**, nunca a cópia.

Não tem rascunho. Só entra o que foi protocolado e o modelo, porque o rascunho em regra foi corrigido antes de ir aos autos.

Não tem laudo, CNIS, PPP nem documento pessoal de cliente. Indexa-se a produção do escritório.

O trecho é anonimizado na ingestão, então nome, CPF, número de benefício e CID aparecem como marcadores do tipo `[NOME]` e `[CPF]`. O arquivo de origem **não** é anonimizado.

## Roteiro de uso, quatro passos

1. `visao_geral_acervo`, para saber o que a base cobre.
2. `buscar_tese_acervo` com os termos do caso e, quando útil, o filtro de `beneficio` e de `tipo_peca`.
3. `obter_trecho_acervo` no trecho que interessa, para ler o argumento inteiro.
4. `precedentes_do_acervo` quando a pergunta for em que peças já se usou determinado Tema, Súmula ou Enunciado.

Exemplo de consulta, "ruído sem NEN" ou "qualidade de segurado período de graça".

## VEDAÇÃO

**O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova, conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o arquivo de origem não é.**
