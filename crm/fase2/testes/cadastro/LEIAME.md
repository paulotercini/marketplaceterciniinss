
## contraste.js (F15) — o que essa prova pega, e a armadilha dela

Mede contraste e alvo de toque nas nove telas, com **composição alfa**. A
primeira versão dessa auditoria estava errada e reprovou coisas que estavam
certas: ela lia `getComputedStyle(el).backgroundColor`, achava
`rgba(0,0,0,0)` e comparava o texto com preto transparente. Contraste sobre
fundo transparente não existe — o fundo real é a **pilha de fundos dos pais**,
composta de cima para baixo até o primeiro opaco. É o que `fundoDe()` faz.

Duas armadilhas a mais, ambas custaram uma rodada:

1. **`el.style.background` volta normalizado.** Escrever
   `style="background:#E6A700"` e ler de volta dá `rgb(230, 167, 0)`. Quem
   testar o hex com `startsWith("#")` nunca entra no ramo certo.
2. **A varredura sem deduplicação trava a página.** `document.querySelectorAll("body *")`
   com `getComputedStyle` em cada um percorre dezenas de milhares de nós nas
   listas grandes; a aba congela. A assinatura `TAG.classe>PAI.classe` mede
   uma vez por combinação e cai de minutos para 7 ms.

## desempenho.js (F16) — e a sexta vez que o vermelho era o teste

Mede o tempo de pintura com massa do tamanho do acervo real (7.000 tarefas).
Duas armadilhas, as duas do arquivo de teste:

1. **`D` é `let` no escopo do script — `window.D` não existe.** Um
   `waitForFunction(() => window.D && ...)` espera para sempre por dado que já
   chegou. Dentro de `page.evaluate` escreve-se `D` direto, ou
   `typeof D !== "undefined"`.
2. **O `page.route` das fixturas precisa respeitar o cabeçalho `Range`.**
   `todas()` pagina de mil em mil e só para quando a página vem incompleta;
   devolver as 7.000 linhas em toda página deixa o app carregando para sempre.

## atendimento.js (F17) — a espécie dentro da triagem

Prova a tabela `PONTOS_ESPECIE` família por família, com um cliente fictício
para cada uma. Duas armadilhas encontradas por ele, as duas no programa:

1. **"Recurso especial ou incidente" caía na aposentadoria especial.** O teste
   era `/especial|insalubr|agente nocivo/` e a palavra "especial" aparece nos
   dois. Um recurso ao CRPS mostrava PPP, EPI e LTCAT. Corrigido de duas
   formas ao mesmo tempo: a família do CRPS passou a ser avaliada ANTES, e o
   teste da especial passou a exigir a palavra colada em "apos".
2. **`casoSel` sobrevive à troca de ficha.** `fecharAtendimento` usava
   `casoSel` sem conferir de quem ele era: o atendimento do cliente B ia para
   o processo do cliente A, que ainda estava selecionado. Agora só vale se o
   caso estiver na lista DESTE cliente.

Terceira armadilha, no teste: um retrato de `.cad-cartao` corta justamente os
passos novos, porque eles ficam no fim de um cartão que rola. A captura clona
os passos da espécie num contêiner próprio antes de fotografar.

## pdfinss.js e fixt-pdf.js (F18) — ler o PDF do INSS

O risco não é abrir o PDF, é entender o layout. Por isso `lerCnisPdf` e
`lerDeclaracaoPdf` são funções PURAS sobre a lista de pedaços de texto com
posição, e o teste roda sobre elas, com as coordenadas exatas de dois PDFs de
verdade e todo dado de pessoa trocado.

**A fixtura é mascarada por LISTA BRANCA**, não por substituição. `extract_words`
já entrega o texto quebrado em palavras, então trocar "FULANO DE TAL" inteiro
nunca casa — e o que sobra é meio nome real no arquivo de teste. Só passa
palavra que esteja no vocabulário público do INSS; qualquer outra vira palavra
inventada. A pontuação do fim precisa sobreviver à troca: sem os dois-pontos de
`pertencente a FULANO:` o extrator não acha onde o nome termina.

Três armadilhas do próprio programa, achadas aqui:

1. **O pdf.js entrega PEDAÇOS de texto, não palavras.** Um pedaço pode vir
   `"123.456.789-0 CESSADO"` junto, e aí nenhuma comparação de palavra casa. O
   `palavrasDoPdf` quebra tudo em palavra repartindo o x pela largura, e o teste
   confere o mesmo resultado com a fixtura recolada em 38 pedaços.
2. **A legenda de indicadores tem duas colunas.** A descrição que transborda
   para a linha de baixo pertence à COLUNA em que ela está, não ao último código
   lido. Emendar no último jogava o "concomitante com outros vínculos" do
   PREC-FACULTCONC dentro do PREC-MENOR-MIN.
3. **A espécie da Declaração é escrita em TRÊS linhas em volta do NB.** Qualquer
   leitura por linha de texto corrida quebra ali. O extrator ancora no NB e pega
   a faixa do meio nas linhas vizinhas.

O que o teste NÃO cobre, e é honesto dizer: o carregamento do pdf.js pelo cdnjs,
porque o navegador do arneço não tem saída para a internet. Tudo o que vem
depois dele é coberto.

## cadastro2.js (F19) — vida contributiva, e onde cada coisa mora

Três armadilhas novas, todas do arquivo de teste:

1. **`abrirFicha` põe `casoSel` em `"__auto__"`.** Com mais de um processo em
   aberto, ele devolve a janela "escolher processo" e a ficha **não chega a ser
   pintada** — nem as abas existem. Definir `casoSel` depois do `abrirFicha`
   não adianta: é preciso limpar o `#modal` e chamar `pintarFicha()`. Esconder
   o modal com `style.display` também não basta, o `.modal-fundo` continua
   interceptando o clique.
2. **`innerText` ignora rótulo dentro de elemento escondido.** Para ler o texto
   de um `<label>` use `textContent`.
3. **A fixtura precisa conter a página que o teste afirma.** As três primeiras
   versões dela não tinham nem período de benefício nem vínculo em aberto, e o
   teste reprovava o programa por ausência de dado no arquivo de teste. As
   páginas escolhidas estão nomeadas no cabeçalho da fixtura, uma a uma.

E uma do programa: **"Empregado ou Agente Público" quebra em duas linhas.**
Quando o "Público" não cai na linha seguinte, o texto termina em "Empregado ou
Agente" e o casamento ingênuo caía no "Empregado" solto — 3 dos 30 vínculos
saíam com o tipo errado.
