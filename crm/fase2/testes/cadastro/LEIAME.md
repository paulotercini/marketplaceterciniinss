
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
