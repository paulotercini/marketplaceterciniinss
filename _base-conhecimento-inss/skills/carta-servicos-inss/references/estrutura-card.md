# Estrutura de card

Documento de referência para criação e edição de cards do gerador. Cada benefício precisa de quatro elementos sincronizados — card estático no HTML, entrada em `GRUPOS`, entrada em `B` e entrada em `EX`.

## 1. Card estático no HTML

Card estático fica no bloco da tela inicial, dentro do agrupamento correspondente. Estrutura mínima abaixo.

```html
<div class="card" onclick="mostra('id')">
  <div class="ico">EMOJI</div>
  <div>
    <h3>Nome completo do benefício</h3>
    <p>Descrição curta de uma linha</p>
  </div>
</div>
```

O id deve ser o mesmo usado em B e EX.

## 2. Entrada em GRUPOS

Adicionar o id no array `ids` do agrupamento certo. Os agrupamentos atuais são "Aposentadorias regras gerais", "Aposentadoria do professor e da pessoa com deficiência", "Benefícios por incapacidade e acidente", "Benefícios a dependentes", "Benefícios assistenciais" e "Outros serviços".

## 3. Entrada em B

Estrutura completa de uma entrada em B.

```js
id:{
  ico:"EMOJI",
  t:"Título do benefício",
  r:"Resumo curto que aparece sob o título",
  c:"azul",
  intro:"Parágrafo introdutório dirigido ao cliente. Explica o benefício, cita a base legal principal e instrui o cliente a reunir os documentos antes da consulta.",
  s:[
    {h:"Documentos pessoais",d:[
      {n:"RG, CNH ou CIN",o:"Original e cópia"},
      {n:"CPF"},
      {n:"Comprovante de residência",o:"Em nome do cliente, com no máximo 3 meses..."},
      {n:"Biometria",o:"Verifique se está atualizada na Justiça Eleitoral"}
    ]}
  ],
  al:[
    {t:"vermelho",i:"🚨",x:"Alerta crítico..."},
    {t:"laranja",i:"⚠️",x:"Alerta de atenção..."},
    {t:"azul",i:"ℹ️",x:"Informação operacional..."},
    {t:"verde",i:"✅",x:"Reforço pró-segurado..."}
  ]
},
```

Cores válidas para `c` são `azul`, `verde`, `laranja`, `vermelho`, `roxo`, `cinza`. A cor define o cabeçalho da carta.

Cores válidas para alertas (`al[].t`) são `vermelho`, `laranja`, `azul`, `verde`, `roxo`. Roxo é reservado para tópicos da PCD.

Ícones recomendados para alertas. Vermelho usa 🚨, laranja usa ⚠️, azul usa ℹ️, verde usa ✅, roxo usa 🔬.

A introdução tem entre dois e quatro períodos, sempre dirigida ao cliente. Não usar tom de petição.

## 4. Entrada em EX

Há dois formatos.

Formato simples para benefícios com poucos exemplos.

```js
id:[
  "Documento exemplo 1",
  "Documento exemplo 2 com observação opcional",
  "Documento exemplo 3"
],
```

Formato com grupos para benefícios complexos. Use sempre que houver mais de uma categoria.

```js
id:{grupos:[
  {g:"Categoria A",i:[
    "Documento 1",
    "Documento 2",
  ]},
  {g:"Categoria B",i:[
    "Documento 3",
    "Documento 4",
  ]}
]},
```

O usuário pode clicar em cada exemplo para preencher o campo de adição na tela de personalização.

## Diretrizes de redação

A introdução fala diretamente ao cliente, com instrução acionável. Frase curta. Verbo no imperativo ou infinitivo.

Documento listado em `s` deve ter nome objetivo e, quando precisar, observação curta no campo `o`.

Alerta deve indicar prazo, requisito, controvérsia ou dica. Não é espaço para teoria. Use no máximo cinco alertas por benefício para não cansar o cliente.

Cite Tema, Súmula, Lei ou Portaria sempre que afirmar regra jurídica. Confirme antes a vigência.

Não use dois-pontos para introduzir lista ou explicação dentro do alerta. Reestruture em frases independentes.

## Checklist final do card

Card estático adicionado no HTML.

Id incluído no array `ids` do `GRUPOS`.

Entrada em `B` criada com `ico`, `t`, `r`, `c`, `intro`, `s` e `al`.

Entrada em `EX` criada, preferencialmente com `grupos`.

`grep -c "mostra('id')"` retorna 1.

`grep -c "id:"` retorna 2 (uma em B, uma em EX).

`node --check` no script extraído passa sem erro.

Versão e data atualizadas no cabeçalho.
