# Inventário do acervo do escritório — 20/09/2026

Levantamento feito antes de qualquer código, para dimensionar o índice do MCP do acervo.
Somente metadados de arquivo. Nenhum documento foi copiado, baixado em massa ou aberto para
leitura de conteúdo, salvo três amostras usadas para medir estrutura, descritas na seção 5.

## 1. Método

Varredura recursiva por `Get-ChildItem` em `G:\Meu Drive`, `C:\Users\VAIO\segundo-cerebro` e
`C:\Users\VAIO\INSS`. Agregação por extensão, por pasta de topo e por faixa de tamanho.
Classificação de produção contra documento recebido por palavra-chave no nome do arquivo, com
desempate por extensão. Contagem de pastas de cliente pelo padrão `Processos\<LETRA>\<Nome #CPF>`.
Tempo total da varredura de 38.684 arquivos, 14,5 segundos.

Nenhum nome de cliente foi registrado neste documento.

## 2. Volume global

`G:\Meu Drive` tem 38.684 arquivos e 34,15 GB. A distribuição é fortemente assimétrica, porque
97% do volume está em `Processos` e 2,7% no `Acervo de Modelos`.

| Pasta de topo | Arquivos | MB |
|---|---:|---:|
| Processos | 37.480 | 34.607 |
| Acervo de Modelos | 1.051 | 156,5 |
| Documentos Antigos | 141 | 166,8 |
| Demais | 11 | 38,5 |

Por extensão, no Drive inteiro.

| Ext | Qtd | MB |
|---|---:|---:|
| .pdf | 27.639 | 32.360,7 |
| .ini | 3.120 | 0,7 |
| .doc | 2.358 | 165,3 |
| .docx | 2.304 | 110,9 |
| .gdoc | 446 | 0,1 |
| .md | 218 | 1,5 |
| imagens (.jpg .jpeg .png) | 1.635 | 510,3 |
| .zip | 246 | 1.264,1 |
| demais | 718 | — |

Universo de texto jurídico, somando doc, docx, pdf, odt, rtf, md e gdoc, 32.985 arquivos.
Desses, apenas 5.346 são editáveis, ou seja 16,2%. PDF no acervo é quase sinônimo de documento
baixado ou recebido.

## 3. Modelos Ouro 2.0

`G:\Meu Drive\Acervo de Modelos\Modelos Ouro 2.0`, 73 arquivos e 1,07 MB, em 14 subpastas
temáticas. Datas de 30/06/2026 e 04/07/2026, lote único revisado em duas ondas.

Sessenta e sete arquivos `.md`, cinco sem extensão e um `.gdoc`. Os cinco sem extensão são as
peças de BPC-LOAS, e um indexador por glob `*.md` perderia todas as cinco.

Estrutura canônica por benefício, com Petição Inicial sempre a maior peça, de 24 a 44 KB, mais
Recurso, Embargos de Declaração, Quesitos e Alegações Finais, Contrarrazões e, conforme o caso,
Manifestação sobre Laudo. Os catorze benefícios cobertos são Aposentadoria Especial,
Aposentadoria PcD LC 142, Aposentadoria por Idade urbana e híbrida, Aposentadoria por Tempo de
Contribuição na transição da EC 103, Auxílio-Acidente B94, Auxílio-Reclusão B25, BPC-LOAS,
Cumprimento de Sentença, Incapacidade B31 e B91, Mandado de Segurança, Pensão por Morte B21,
Revisão de Benefício, Rural e Segurado Especial, e Salário-Maternidade.

Convivem três prefixos de nomenclatura, o que exige normalização na ingestão.
`MODELO OURO - <Benefício> - <Peça>.md`, `MODELO OURO 2.0 - <Peça> - <Benefício>` sem extensão e
com a ordem invertida, e `MODELO OURO — <Peça> — <Benefício> (<foro>).gdoc` com travessão.

## 4. Pastas de cliente e produção viva

| Métrica | Valor |
|---|---:|
| Pastas de cliente ativas | 563 |
| Pastas em `_Arquivo` | 1.121 |
| Pastas em `_ASSISTÊNCIA JUDICIÁRIA` | 134 |
| Total de pastas de cliente | 1.818 |
| Com marcador `#CPF` no nome | 849 |
| Com subpasta `Claude` no primeiro nível | 167 |
| Pastas `Claude` distintas, em qualquer profundidade | 170 |

Dentro das 170 pastas `Claude`, 600 arquivos e 20,9 MB, dos quais 171 são `desktop.ini` e devem
ser descartados. Restam 429 arquivos úteis, sendo 385 peças em `.gdoc` e `.docx`, ou seja cerca
de 90% do conteúdo. Média de 2,5 peças por pasta.

O tipo mais frequente é o **Parecer**, que é o documento-pivô do fluxo, produzido antes da peça.

## 5. Três achados que mudaram o desenho

**O `.gdoc` não é legível pelo disco.** O Google Drive File Stream recusa a leitura com o erro
"Função incorreta", tanto por `ReadAllText` quanto por `ReadAllBytes`. Os 333 `.gdoc` do escopo,
sendo 211 nas pastas `Claude`, só saem pelo conector Drive ou por
exportação. Confirmado pelo conector que são Google Docs com `fileId` válido, portanto o
download de pasta pelo Drive web os converte em `.docx`.

**O `.docx` de peça não tem estilo de título.** Amostra de um `.docx` de peça com 107 parágrafos,
todos com estilo `Normal`, 21 tabelas, mediana de 42 palavras por parágrafo e p90 de 75.
Segmentar por seção via estilo é impossível, e o parágrafo já nasce na medida do padrão de
redação do escritório, que é de trinta a quarenta palavras.

**O dado sensível está dentro do parágrafo argumentativo.** A mesma amostra trouxe, no corpo do
argumento e não na qualificação, nome de terceiro, data de nascimento, número de RG e código
CID. A técnica de apagar linha de rótulo, que o MCP trf3 usa em `parser.py:24-26`, não basta
para este acervo.

## 6. Produção do escritório contra documento recebido

Classificação por palavra-chave no nome do arquivo, com desempate por extensão, sobre os 32.985
arquivos de texto jurídico do Drive.

| Classe | Arquivos | % |
|---|---:|---:|
| Produção do escritório | ~8.376 | ~25% |
| Documento recebido | ~24.609 | ~75% |

O cruzamento que sustenta o número é a proporção de PDF, que é de 83,8% do universo, e da qual
apenas 8,7% tem nome de peça.

## 7. Armadilhas de ingestão

Catorze das 34 pastas de topo do Acervo de Modelos têm gêmea com sufixo `(1)`, duplicação de
sincronismo do Drive que inflaria o índice em cerca de 40%.

Existem 3.120 arquivos `desktop.ini` no Drive, sendo 171 dentro das pastas `Claude`.

Cinco peças de BPC-LOAS do Modelos Ouro 2.0 estão salvas sem extensão.

Acentuação inconsistente no mesmo tipo de peça, com `Petição Inicial` e `Peticao Inicial`
convivendo, o que exige normalização de diacríticos no índice.

Muitos arquivos têm nome genérico, como `Petição Inicial.docx` ou `Recurso Inominado.docx`, e
só o caminho da pasta identifica o caso. O índice não pode depender apenas do nome do arquivo.

## 8. Vault `segundo-cerebro`

Mil setecentos e cinco arquivos `.md`, dos quais 1.688 em `clients/`. A pasta `research/`, que o
`CLAUDE.md` do vault declara ser o coração, tem um único `.md` e 51 binários, e é biblioteca de
formulários, não de teses. As pastas `daily/`, `decisions/` e `inbox/` estão vazias.

Só 4 das 1.688 notas de cliente citam Súmula, Tema ou precedente, ou seja 0,24%. A nota mediana
tem 430 bytes e contém protocolo, telefone e controle de honorários. Várias contêm CPF em texto
claro e pelo menos duas contêm senha de acesso a sistema governamental.

Decidido em 20/09/2026 que as notas de `clients/` ficam fora do índice. Entram apenas os 39
arquivos úteis de `research/modelos`, que são formulários e pedidos médicos do escritório.

## 9. Escopo da primeira versão

| Recorte | Arquivos | Indexar |
|---|---:|---|
| Modelos Ouro 2.0 | 73 | Sim, núcleo canônico |
| Petições Ouro, `.gdoc` | 122 | Não, versão anterior superada pelo Modelos Ouro 2.0 |
| Peças nas pastas `Claude` | 385 | Sim, produção viva |
| Acervo de Modelos, `.docx` | 136 | Sim |
| `segundo-cerebro\research\modelos` | 39 | Sim |
| Acervo de Modelos, `.doc` legado | 382 | Não, pacote de terceiro |
| Peças dispersas em pastas de cliente | ~7.200 | Segunda onda |
| Documentos recebidos | ~24.600 | Nunca |

Índice da primeira versão, cerca de 755 peças e 100 MB. Nenhum OCR é necessário.
