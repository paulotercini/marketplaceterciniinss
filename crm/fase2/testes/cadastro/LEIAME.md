# Arneses de fumaça do Cadastro e das fases F10 a F14

Doze arquivos que sobem o `app.html` num servidor local, interceptam o Supabase
e o ViaCEP, e trabalham com quatro clientes **inventados**. Nenhum dado real de
cliente passa por aqui, e nenhuma chamada sai para a internet.

```bash
cd crm/fase2/testes/cadastro
npm i playwright          # só na primeira vez
cp ../../app.html .       # o arnês lê o app ao lado dele
node triagem.js && node avisos.js && node documentos.js
node trilha.js && node concluir.js && node teclado.js
node endereco.js
node fila.js && node importar.js
node interacao.js && node emoji.js && node fumaca.js
```

| Arquivo | O que prova | Asserções |
|---|---|---:|
| `fumaca.js` | a ficha pinta sem `undefined` nos dois estados de cliente, e gera as capturas antes/depois | captura |
| `interacao.js` | o clique no cartão abre o editor, a senha grava, o endereço vazio não estica | 10 |
| `emoji.js` | zero pictograma nas seis divisões do Cadastro, nos dois estados | varredura |
| `endereco.js` | o CEP só busca por botão, a PATCH única, o espelho montado e a qualificação gerada | 18 |
| `fila.js` | quem entra e quem não entra na fila de sem endereço, e o botão que abre no editor | 10 |
| `importar.js` | conferir não grava, o cabeçalho não vira linha, e só as linhas prontas são escritas | 13 |
| `triagem.js` | a leitura automática dos cinco passos que o CRM responde sozinho, e a marcação com autoria | 18 |
| `avisos.js` | o CadÚnico virando lembrete de 2 anos (criar, mover, desligar) e o caso novo gerando menção | 17 |
| `documentos.js` | nenhum marcador sai literal, a folha no padrão do escritório, e a conferência antes de gerar com lacuna | 25 |
| `trilha.js` | a raiz e os ramos do caso numa árvore só, e o marcador acompanhado gravando | 11 |
| `concluir.js` | conclusão em um clique sem janela, o histórico continuando, e o desfazer que reabre | 15 |
| `teclado.js` | setas, Enter, Espaço, N e ?, e o teclado devolvido ao texto quando se está escrevendo | 17 |

Cada um sai com código 1 quando alguma asserção falha, então servem em CI.

## Por que existem

O `tests/` do repositório cobre os scripts Python; o `crm/fase2/*/testes/`
cobre os robôs. O `app.html` não tinha teste nenhum, e é onde mora o sistema
inteiro. Duas lições que estes arneses registram:

- **captura de tela pega o que teste de texto não pega** — seis `undefined` na
  F9.1 passaram por todos os testes e apareceram na primeira imagem;
- **e o contrário também** — a imagem não diz se o cartão REAGE ao clique. Só a
  asserção de interação pegou o CPF que continuava abrindo o editor apenas
  pelo lápis de 4px.

O `fixturas.js` é o único lugar com dados. Para acrescentar um caso de teste,
mexa nele, não em cada arnês.

## Duas travas que já custaram tempo aqui

- **Cliente com mais de um caso ativo abre o modal "escolher processo"**, que
  segura a pintura da ficha e o arnês fica esperando um seletor que nunca
  aparece. O `triagem.js` mostra o contorno: escolher o primeiro caso e
  esconder o `#modal` antes de pintar.
- **`:first-of-type` conta entre irmãos do mesmo elemento**, não entre os da
  mesma classe. Dentro do cartão, `.tri-passo:first-of-type` casava com o
  título. Por isso os passos vivem num `.tri-lista` próprio.
- **Função que lê o formulário não roda sozinha no arnês.** `novoCaso()`
  procura `#nk-ben`, `#nk-fase` e `#nk-prazo`, que só existem com a ficha
  pintada. O `avisos.js` injeta os três antes de chamar.
- **Duas falhas em três eram expectativa minha, não código.** A fila acusou 2
  clientes onde eu esperava 3, e o padrão de quem recebe caso novo trouxe dois
  advogados onde eu tinha escrito um. O código estava certo nas duas.
- **Underscore não prova lacuna.** A linha de assinatura também é underscore.
  O que prova é o dado do cliente aparecendo no lugar certo, e
  `faltaParaDocs()` devolvendo lista vazia.
- **Cliente de teste sem caso não gera andamento.** `registrarDocGerado` sai
  cedo quando não há caso, e a asserção do registro falha sem culpa do código.
- **`innerText` devolve MAIÚSCULA onde o CSS tem `text-transform`.** Comparar
  com `/Recurso/` acusa defeito que não existe. Use `/recurso/i`.

- **`filtroColab` nasce ligado** em quem tem caso atribuído, e esconde da
  lista os clientes sem atribuição. É o app funcionando; no arnês, zere o
  filtro antes de contar cartões.

Quatro das cinco últimas falhas de asserção foram do arnês, não do app. Antes
de mexer no código por causa de um teste vermelho, confira a expectativa.
