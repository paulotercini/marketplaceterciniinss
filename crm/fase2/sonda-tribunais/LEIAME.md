# Sonda do acervo — e-SAJ e eproc do TJSP

## Por que sonda, e não já o robô

Duas vezes o atalho custou caro: as regras do resumo do acórdão nasceram
contra um acórdão inventado e nenhuma sobreviveu ao texto real; o
`pje-regras.js` só ficou de pé porque foi escrito contra HAR real de
11.08.2026. O e-SAJ e o eproc são páginas que ninguém aqui abriu ainda —
escrever seletor agora seria escrever contra uma página imaginária.

Esta sonda faz **uma leitura da tela que você abriu**, guarda a forma e
mostra o que achou. As regras vêm depois, contra o que voltou.

## O problema que ela existe para resolver

Hoje você chega nos processos do TJSP por link, o que obriga a cadastrar
cada processo novo na mão — e o que se cadastra na mão, se esquece. É o
mesmo buraco que já houve com os recursos.

Para o robô descobrir processo sozinho, ele precisa saber ler a **lista** do
seu acervo. Três coisas decidem se isso é fácil ou difícil, e a sonda mede
as três:

1. **Qual é a marca de uma linha de processo** no HTML — é o que o robô varre.
2. **Quantos processos existem** — a herança do e-SAJ pode ser enorme.
3. **Dá para saber que está arquivado sem abrir os autos?** — se der, o robô
   filtra antes de escrever no CRM; se não der, ele teria que abrir milhares
   de processos, e aí o desenho muda.

## Como rodar

Uma vez em cada uma das quatro telas:

| Sistema | Tela para abrir |
|---|---|
| e-SAJ 1º grau | consulta processual de 1º grau, resultado da busca **por OAB** |
| e-SAJ 2º grau | consulta processual de 2º grau, resultado da busca **por OAB** |
| eproc 1º grau | painel do advogado / lista de processos |
| eproc 2º grau | painel do advogado / lista de processos |

1. Abra a tela **logado**, com a lista de processos na frente.
2. `F12` → aba **Console**.
3. Cole o conteúdo inteiro de `sonda-acervo.js` e dê Enter.
4. Ela baixa `sonda-acervo-<sistema>-<grau>.json` e imprime o resumo.

Não clica em nada, não vira página, não navega e não escreve no CRM. Só lê.

## O que ela devolve

- **onde** — sistema, grau, host e caminho reais (o endereço do eproc do TJSP
  é uma das coisas que precisamos aprender aqui)
- **contagem** — linhas achadas, números distintos e o que a tela *declara*
  ("Resultados 1 a 25 de 1.243" é o número que dimensiona a herança)
- **linha** — a assinatura (tag + classes) e até 3 linhas de HTML mascarado:
  é daqui que saem as regex
- **rotulos_repetidos** — os textos que aparecem em duas ou mais linhas
  ("Último movimento:", "Distribuído em"). São âncoras estáveis
- **links** — o formato do link que abre os autos
- **arquivamento** — quais palavras de situação aparecem na tela
- **paginacao** — os controles de virar página
- **acervo_por_ano** — a contagem por ano, tirada do próprio número CNJ

## O que é mascarado (e por que dá para colar no chat)

O robô precisa da **estrutura**, não dos nomes. A máscara usa o fato de que
rótulo se repete entre linhas e dado não: texto que aparece em duas ou mais
linhas é rótulo do sistema e **fica**; texto que aparece numa linha só é dado
e vira forma — letra vira `a`/`A`, dígito vira `9`.

- Nome de parte → `Aaaa aa Aaaaa`
- Número do processo → `9999999-99.2019.8.26.9999` (mantém ano, justiça e
  tribunal, que é o que o robô usa para achar o tribunal)
- Data e hora → **ficam** (são estrutura, não identificam ninguém)
- Valor de atributo com corrida longa de caractere (id de processo, chave de
  acesso) → vira forma

O que sobra é esqueleto de HTML. **O JSON gerado pode ser colado no chat.**

Se em algum momento você quiser o HTML cru para conferir alguma coisa, ele
sai do próprio navegador (botão direito → inspecionar) e **fica na sua
máquina** — cru tem nome de cliente e não vai para o git, mesma regra da
sonda do DJEN.

## Provas

As partes puras (máscara, leitura do número, contagem por ano) têm teste em
`crm/fase2/regras/testes/sonda_acervo.test.js`:

```
node --test crm/fase2/regras/testes/sonda_acervo.test.js
```

Duas delas trancam defeito real:

- **regex global em `.test()` dentro de laço** — uma regex com `/g` guarda o
  `lastIndex` entre chamadas e responde `true, false, true, false` para a
  mesma pergunta. A sonda leria metade do acervo e diria que era o todo.
  Por isso há duas cópias do padrão: a com `/g` colhe, a sem `/g` pergunta.
- **máscara que não mascara** — se `forma` deixar passar letra acentuada,
  vaza nome de cliente num arquivo feito justamente para sair da máquina.

A metade que fala com o DOM não tem prova em node: ela só encontra a página
de verdade quando você rodar. É o combinado da sonda — se a estrutura
surpreender, a surpresa **é** o achado.

## Depois

Com os quatro JSON na mão eu escrevo `esaj-regras.js` e `eproc-regras.js` no
mesmo molde do `pje-regras.js`: funções puras sobre o HTML da linha, testadas
no node contra a amostra real. Só então entram no `fundo.js` como mais duas
fontes do disparo automático.
