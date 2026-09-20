# Pesquisa no MCP `acervo`, o que o escritório já escreveu

Medido ao vivo em 20/09/2026, chamando as seis ferramentas. **Número não entra nesta página nem em skill**, porque a base cresce. Entre duas medições do mesmo dia ela passou de 112 para 1.807 peças, e depois mudou de novo enquanto eu media. O tamanho, o período coberto e a distribuição saem de `visao_geral_acervo`, que é a primeira chamada de qualquer sessão.

## O que a base é

Base LOCAL construída dos Modelos Ouro, das Petições Ouro, das peças das pastas Claude dos clientes e dos processos protocolados. Responde "como já sustentamos X" devolvendo o trecho argumentativo e a peça de origem. Não tem jurisprudência, e o inteiro teor do precedente citado num trecho vive nos MCPs `trf3` e `iurisprudencia`.

A unidade de busca é o PARÁGRAFO, e o trecho vem cortado no meio da frase quando é longo. Quem lê só o resultado da busca lê meio argumento, e por isso `obter_trecho_acervo` com os parágrafos vizinhos é parte do fluxo, não um extra.

## Vedação, que vem em toda resposta

O servidor devolve o campo `vedacao` em todas as ferramentas. A base existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO, e o trecho é ponto de partida para redação nova, conferida contra os autos.

## Anonimização, o que funciona e o que falha

O trecho é anonimizado na ingestão. O nome do cliente sai como `[NOME]` e o número do processo como `[PROCESSO]`, no trecho, no nome do arquivo e no caminho.

**O arquivo de origem NÃO é anonimizado.** `caminho_da_peca_acervo` devolve o caminho de verdade, com nome e CPF no nome do arquivo, e vem com aviso próprio. É chamada deliberada e separada, e quem a usa está abrindo dado de cliente.

**Falha 1, nome embutido sem separador escapa.** Medido em 20/09/2026, o arquivo `Inicial_Ivair_BPC_JEF_RibeiraoPreto.docx` voltou com o primeiro nome do cliente em claro, porque o padrão snake_case não foi reconhecido. A pasta do mesmo caso estava corretamente mascarada, e só o nome do arquivo vazou.

**Falha 2, protocolo e data ficam em claro.** Um trecho de BPC devolveu `protocolo 1095612540` e a data do requerimento, e outros devolveram datas de decisão administrativa. Número de protocolo e data não são mascarados, e juntos identificam o caso.

**Falha 3, o anonimizador erra para mais e apaga palavra comum.** Medido, "Aposentadoria por Tempo de Contribuição" virou "Aposentadoria por Tempo de `[NOME]`" nos cinco Modelos Ouro daquela matéria, e "Coordenação-Geral de Benefícios Previdenciários" virou "Coordenação-Geral de `[NOME]` Previdenciários" dentro de um trecho. A consequência prática é que busca por "contribuição" ou "benefícios" no nome do arquivo não encontra.

As três estão registradas como pendência do servidor, e nenhuma delas dispensa a conferência antes de qualquer uso.

## Sintaxe da busca

Igual à dos outros MCPs da casa. Ignora acentuação, aceita aspas para expressão exata e `-palavra` para excluir, e o espaço vale E implícito. Não há operador OU. Dez trechos por página.

A busca é literal e casa palavra, não conceito. O tamanho da base muda o resultado da mesma consulta, e `miserabilidade renda per capita` devolveu zero na base pequena e dezenas depois da ingestão dos protocolados. Consulta que zera pede uma palavra a menos antes de virar conclusão sobre o acervo.

## Os filtros e o que se pode confiar neles

| Filtro | Estado medido em 20/09/2026 |
|---|---|
| `origem` | Confiável. `protocolado`, `modelo_ouro`, `acervo` e `vault` |
| `tipo_peca` | Confiável na maior parte, com uma fatia em `indefinido` |
| `beneficio` | **Não confiável.** A maioria esmagadora das peças protocoladas veio com o campo nulo, e há peça de BPC classificada como incapacidade |
| `rito` | Preenchido em parte, nulo na maioria |
| `data_peca` | Nulo no trecho, embora a visão geral já declare o período coberto |
| `resultado` | **Inexistente.** `com_resultado_anotado` é 0, e o filtro nunca devolve nada |

A distribuição por benefício da `visao_geral_acervo` não é estatística do escritório. É contagem de arquivo classificado por heurística, e a heurística piorou quando entraram os protocolados. Filtrar por matéria hoje esconde mais do que seleciona, e o caminho é buscar pelo termo da tese, sem filtro de benefício.

## Cobertura, que muda a cada ingestão

A cobertura por matéria é desigual e a busca zera sem dizer por quê. Antes dos protocolados não havia uma única inicial de BPC, e uma busca sobre miserabilidade não achava tese sustentada porque ela não estava lá, não porque o escritório nunca a tivesse sustentado. Com a base grande isso mudou. A conclusão de que o escritório nunca escreveu sobre um tema só se tira depois de conferir o tamanho e o período na `visao_geral_acervo`.

## Precedentes, a via mais confiável

`precedentes_do_acervo` aceita parte do nome, como `Tema 1090`, `Súmula 9` ou `Enunciado 13`, e devolve em que peças o escritório já usou aquele precedente e em que trecho. É a ferramenta que menos depende da classificação por benefício, que é o campo fraco.

Devolve a remissão e o trecho da peça, nunca o texto do precedente, e a nota vem na própria resposta. O inteiro teor está no `trf3` e no `iurisprudencia`, e a articulação entre as bases é a remissão, nunca a cópia.

## Fluxo recomendado

1. `visao_geral_acervo` uma vez na sessão, para ver o tamanho, o período e reler os avisos.
2. `buscar_tese_acervo` pelo termo da tese, sem filtro de benefício, apertando com aspas e `-palavra`.
3. `obter_trecho_acervo` no id devolvido, com contexto 2 ou 3, porque o trecho da busca vem cortado.
4. `precedentes_do_acervo` quando a pergunta for por precedente e não por tese.
5. `listar_pecas_acervo` para achar o Modelo Ouro certo antes de escrever.
6. `caminho_da_peca_acervo` só quando for abrir o arquivo, sabendo que ali há dado de cliente.

## O que este MCP não autoriza

Não autoriza `[CONFERIDO]`. O precedente citado num trecho foi conferido na data da peça, e a legislação, a jurisprudência e o entendimento do INSS podem ter mudado desde então. A conferência se refaz pela `base-precedentes-catalogo-vinculantes` e pelos MCPs de jurisprudência.
