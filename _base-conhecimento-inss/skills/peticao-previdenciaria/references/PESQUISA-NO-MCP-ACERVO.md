# Pesquisa no MCP `acervo`, o que o escritório já escreveu

Medido ao vivo em 20/09/2026, chamando as seis ferramentas do servidor. O que está aqui saiu da resposta do servidor, não do enunciado do projeto.

## O que a base é

Base LOCAL construída dos Modelos Ouro, das Petições Ouro e das peças das pastas Claude dos clientes. Responde "como já sustentamos X" devolvendo o trecho argumentativo e a peça de origem. Não tem jurisprudência, e o inteiro teor do precedente citado num trecho vive nos MCPs `trf3` e `iurisprudencia`.

A unidade de busca é o PARÁGRAFO, e o trecho vem cortado no meio da frase quando é longo. Quem lê só o resultado da busca lê meio argumento, e por isso `obter_trecho_acervo` com os parágrafos vizinhos é parte do fluxo, não um extra.

## Vedação, que vem em toda resposta

O servidor devolve o campo `vedacao` em todas as ferramentas. A base existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO, e o trecho é ponto de partida para redação nova, conferida contra os autos.

## Anonimização, o que foi medido

O trecho é anonimizado na ingestão e o nome do cliente sai como `[NOME]`, inclusive no nome do arquivo e no caminho. Medido em peça real, o arquivo aparece como `[NOME] — Recurso Inominado.docx`.

**O arquivo de origem NÃO é anonimizado.** `caminho_da_peca_acervo` devolve o caminho de verdade, com nome e CPF do cliente no nome do arquivo, e vem com aviso próprio. É chamada deliberada e separada, e quem a usa está abrindo dado de cliente.

**A anonimização não cobre tudo.** Medido em 20/09/2026, um trecho de BPC devolveu o número do protocolo administrativo e a data do requerimento em claro. Número de protocolo, número de processo e data não são mascarados, e podem identificar o caso.

**E erra para mais.** Nas cinco peças de aposentadoria por tempo de contribuição, a palavra "Contribuição" foi trocada por `[NOME]` no nome do arquivo e da pasta, de modo que a busca por "tempo de contribuição" no nome do arquivo não encontra nada. Falso positivo medido em 5 de 5.

## Sintaxe da busca

Igual à dos outros MCPs da casa. Ignora acentuação, aceita aspas para expressão exata e `-palavra` para excluir, e o espaço vale E implícito. Não há operador OU. Dez trechos por página.

A busca é literal e casa palavra, não conceito. `miserabilidade renda per capita` devolveu zero, e `miserabilidade` sozinho devolveu um trecho. Consulta larga com três ou quatro palavras costuma zerar, e o caminho é começar por uma palavra e apertar depois.

## Os filtros e o que se pode confiar neles

| Filtro | Estado medido |
|---|---|
| `origem` | Confiável. `modelo_ouro`, `acervo` e `vault` |
| `tipo_peca` | Confiável na maioria, com 5 peças em `indefinido` |
| `beneficio` | **Pouco confiável.** 22 de 112 peças em `indefinido`, e há peça de BPC classificada como `incapacidade` |
| `rito` | Preenchido em parte, nulo na maioria dos Modelos Ouro |
| `data_peca` | **Vazio.** `periodo.primeira` e `periodo.ultima` vêm nulos, e o filtro por data não seleciona nada |
| `resultado` | **Inexistente.** `com_resultado_anotado` é 0, e o filtro nunca devolve nada |

A distribuição por benefício da `visao_geral_acervo` não é estatística do escritório. É contagem de arquivo classificado por heurística, e a classificação erra.

## Tamanho medido em 20/09/2026

112 peças, 2.955 trechos e 222 precedentes citados. Por origem, 67 Modelos Ouro, 26 do acervo e 19 do vault.

**Divergência a registrar.** O enunciado do projeto informava 294 peças, 8.284 trechos e 169 peças de benefício indefinido. A chamada ao servidor nesta sessão devolveu 112, 2.955 e 22. A sessão parece apontar para ingestão anterior, e o número há de ser reconferido pela própria `visao_geral_acervo` antes de qualquer afirmação sobre cobertura.

## Cobertura desigual, o que zera a busca

A cobertura por matéria é muito desigual e a busca zera sem avisar por quê. Em BPC/LOAS há quatro peças, e três são pedido ao médico assistente, nenhuma é inicial nem recurso. Uma busca sobre miserabilidade não encontra tese sustentada porque ela não está lá, não porque o escritório nunca a sustentou.

## Precedentes, a via que funciona bem

`precedentes_do_acervo` aceita parte do nome, como `Tema 1090`, `Súmula 9` ou `Enunciado 13`, e devolve em que peças o escritório já usou aquele precedente e em que trecho. Medido com o Tema 1090, nove ocorrências em cinco Modelos Ouro de aposentadoria especial.

Devolve a remissão e o trecho da peça, nunca o texto do precedente. A nota vem na própria resposta. O inteiro teor está no `trf3` e no `iurisprudencia`, e a articulação entre as bases é a remissão, nunca a cópia.

## Fluxo recomendado

1. `visao_geral_acervo` uma vez na sessão, para ver o tamanho e reler os avisos.
2. `buscar_tese_acervo` com UMA palavra central, apertando com aspas e `-palavra` depois.
3. `obter_trecho_acervo` no id devolvido, com contexto 2 ou 3, porque o trecho da busca vem cortado.
4. `precedentes_do_acervo` quando a pergunta for por precedente e não por tese.
5. `listar_pecas_acervo` para achar o Modelo Ouro certo antes de escrever.
6. `caminho_da_peca_acervo` só quando for abrir o arquivo, sabendo que ali há dado de cliente.

## O que este MCP não autoriza

Não autoriza `[CONFERIDO]`. O precedente citado num trecho foi conferido na data da peça, e a legislação, a jurisprudência e o entendimento do INSS podem ter mudado desde então. A conferência se refaz pela `base-precedentes-catalogo-vinculantes` e pelos MCPs de jurisprudência.
