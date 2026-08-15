# Estado e pendências — CRM Tercini

Fechado em **15.08.2026**, com o app na versão **09.00** no ar. Este documento
é para ser lido inteiro por quem vai decidir o que fazer a seguir: o que foi
feito, o que ficou diferente do combinado, o que está quebrado e o que você
pediu e ainda não existe.

---

## 1. A reforma visual, fase por fase

Todas as oito fases estão **no ar**. A coluna "o que efetivamente alterou" é o
diff, não a intenção.

| Fase | Commit | O que efetivamente alterou | Tamanho |
|---|---|---|---|
| **F1** | `8f840f2` | Tokens novos (`--azul`, `--cinza`, `--borda`, raio e sombra) e a inversão da grade: a ficha passou a `1fr` e a lista congelou em 380px | +22/−8 |
| **F2** | `38cb86f` | Menu lateral no padrão aprovado, com **29 ícones SVG** no lugar dos emojis, estado recolhido e etiqueta ao passar o mouse | +68/−19 |
| **F3** | `610957f` | Linha do cliente reescrita: nome em cima, data embaixo, chips de semáforo (vermelho/laranja/verde) e o campo de adicionar no rodapé | +40/−26 |
| **F4** | `7e8685e` | Cards de Novidades sem sobreposição e cabeçalho da lista fixo em azul-escuro | +56/−30 |
| **F5** | `4c639a8` | Cabeçalho da ficha no padrão aprovado; a faixa escura das abas virou aba clara com sublinhado | +24/−17 |
| **F6** | `9cc190d` | Corpo da ficha: fio na linha do tempo, células brancas, coluna de casos clara, chips e o toast do rodapé | +50/−37 |
| **F7** | `7d3ad68` | Varredura: abas e sub-abas sem emoji, sino e sincronização em SVG, modais nos tokens | +21/−19 |
| **F8** | `f7753d0` | Ficha do caso em duas colunas (`@container`) e composer que só abre ao escrever | +80/−20 em dois arquivos |

Depois delas, e ainda dentro da mesma linha de trabalho:

| Rodada | Commit | O que fez |
|---|---|---|
| Auditoria da F8 | `00c41e0` | três defeitos que o patch trouxe: sobreposição nas sub-abas, primeiro clique engolido pelo composer, ícones que não pintavam |
| Auditoria geral | `911d0fd` | os 20 achados restantes: rascunho preservado, caixas órfãs, celular e contraste |
| **F9.1** | `f273c2a` | a Identificação do Cadastro em grade de 12 colunas, com os campos novos e a varredura de emojis da aba |

---

## 2. O que ficou pela metade ou saiu diferente da especificação

### F8 — o `@media` que virou `@container`

A especificação pedia duas colunas a partir de 900px de janela. Implementado
com `@media`, o resultado ficou errado: a 1280px de janela, a coluna de
trabalho da ficha tinha 241px, porque quem manda ali é a largura **da ficha**,
não a da janela. Trocado por `@container` — e, com isso, a regra **não vale no
celular**: `.app.celular .escrever` é `position:fixed` dentro do painel, e
`container-type` criaria contenção de layout que prende o composer.

### F9.1 — RG e órgão emissor: um campo na tela, duas colunas no banco

A grade da especificação pede "RG e órgão emissor" em 4 colunas, um campo só.
No banco ficaram **duas** colunas (`rg` e `rg_orgao`). Motivo: guardar
"12.345.678-9 SSP/SP" num campo único obriga a fatiar string na hora de montar
a procuração, e fatiar string erra dentro de uma peça assinada.

### F9.1 — onde o dado mora, enquanto a migração não roda

A tela grava na **coluna** de `clientes` e, se o banco recusar por não ter a
coluna (`PGRST204`), cai em `campos.civil` sozinha. Não estava na
especificação; foi acrescentado para a tela funcionar antes e depois da
migração. `civilDe()` lê dos dois caminhos.

### F9 §2 — a ordem das sub-abas

A especificação lista `Identificação · Triagem · Documentos · Anotações ·
Consulta`. No ar está `Identificação · Anotações · Documentos · Consulta ·
Mensagens`: **Triagem é a F9.4**, ainda não feita, e **Mensagens** precisou de
um lugar quando o menu de cima foi reduzido a cinco abas — a seu pedido.

### F9 §12.7 — "zero emoji na aba Cadastro"

Verdadeiro **na divisão Identificação**, com teste que falha se aparecer um.
As divisões Anotações, Documentos e Consulta ainda têm emoji, conforme a §2 do
próprio documento, que as deixa para F11–F13.

### 08.99 — o Escritório deixou de criar caso, mas os antigos ficaram

Combinado: a lista 🙋 Escritório não é lista de casos. O que foi feito: tarefa
**nova** não cria caso. Os **657 casos** que já existiam com essa origem
continuam lá, porque carregam meses de andamento. Eles aparecem na lista, numa
seção "Casos antigos desta lista".

---

## 3. Bugs conhecidos e não corrigidos

| # | O que está errado | Onde | Gravidade |
|---|---|---|---|
| 1 | **As 2.621 parcelas do To Do não entram no banco.** O índice de `pagamentos.todo_item_id` foi criado como PARCIAL e o PostgREST não consegue usá-lo no `ON CONFLICT`; a cada sincronização o banco devolve 42P10 | banco (não é código) | **alta** — nenhum honorário do To Do existe no CRM |
| 2 | **270 casos não aparecem em lista nenhuma.** Vieram de tarefas com CPF em listas cujo nome é quase igual ao mapeado, sem o emoji (`Escritório`, `Petição Inicial`, `Recurso Administrativo`, `Impugnações`, `Audiências`): entram com fase `outro` e somem do fluxo. 194 estão ativos | `migrar.py` + `app.html` | **alta** |
| 3 | **243 clientes sem CPF** são duplicata à espera: quando alguém escrever o CPF no título da tarefa, a chave do `uuid5` muda de nome para CPF e nasce um segundo cadastro | `migrar.py` | média |
| 4 | **Bloco editado no To Do entra como andamento novo**, ao lado do antigo — o md5 do texto faz parte do id. Corrigir um texto lá não corrige o que já entrou | `migrar.py` | baixa, mas confunde |
| 5 | **O CRM não escreve no To Do.** É decisão, não defeito — mas quem trabalha nos dois vê realidades diferentes, e são 22 andamentos escritos no CRM até hoje | `escrever_todo.py`, desligado | a decidir |
| 6 | **33 funções sem chamador aparente** no `app.html`. Parte é gancho de `onclick` montado em string; parte pode ser código morto | `app.html` | baixa |
| 7 | **457 linhas com `style=` dentro de template** e 86 pontos de `style.X =`: o CSS por classe ainda não chegou nesses lugares | `app.html` | baixa |

---

## 4. Seus pedidos que ainda não foram implementados

Um por linha, na ordem em que você pediu. O esforço é honesto: **P** = até meio
dia, **M** = um a dois dias, **G** = mais que isso, e o que estiver marcado
como *dependente* não começa antes da coisa de que depende.

| # | Pedido | Esforço | Observação |
|---|---|---|---|
| 1 | **F9.2** — endereço estruturado com busca por CEP e migração do legado | **P** | mais barato do que parecia: `clientes.endereco` está em 0%, então **não há legado para migrar** |
| 2 | **F9.3** — credenciais num `<details>` cinza, fim do destaque amarelo | **P** | a caixa amarela do Meu INSS continua lá |
| 3 | **F9.4** — sub-aba Triagem com os oito passos da Amanda | **G** | é a maior peça da F9: CNIS, indicadores, ação judicial anterior, CRPS, CadÚnico, benefício ativo, requerimentos, conclusão |
| 4 | **F9.5** — CadÚnico gerando lembrete de 2 anos; caso novo notificando Paulo, Amanda e Marcos | **M** | a parte da aposentadoria provável mudando de aba **já foi feita** (08.98) |
| 5 | **Tela de novo cliente para a recepção**, com vários telefones, senha do Meu INSS, sexo, profissão, estado civil, indicação, endereço | **M** | os campos já existem no banco (F9.1); falta a tela dedicada |
| 6 | **Anexar CNIS e Declaração de Beneficiário, com leitura automática** e conferência humana antes de gravar | **G** | PDF de texto extrai bem; escaneado exige OCR. É a F11 |
| 7 | **Gerar todos os documentos** a partir do cadastro | *feito na 08.98*, mas **depende de dado** | os sete modelos estão no ar; com RG e endereço em 0%, toda peça sai com lacuna |
| 8 | **Checklist de documentos para imprimir e registrar no CRM** | *feito na 08.98* | conferir no uso: a lista sai do catálogo do benefício |
| 9 | **Ponto de partida e ramificações do caso** (protocolo ou NB → recursos e processos) exibidos como trilha | **M** | a lista de processos já existe (08.97); falta a trilha desenhada |
| 10 | **Arquivamento sugerido quando o recurso do CRPS tem decisão final** | **P** | ofereci e você não confirmou |
| 11 | **Consulta sem `iframe`** — o site interno reconstruído dentro do CRM | **G** | é a F13; hoje é `iframe`, que funciona mas não integra |
| 12 | **Ligar a escrita CRM → To Do** | **P** para ligar, **M** para conferir | uma variável de repositório. Com 22 andamentos escritos no CRM, é barato agora e fica mais caro a cada semana |

### Pendências que dependem de você, não de código

| O que | Por que trava |
|---|---|
| **Rodar as três linhas do índice de `pagamentos`** (`schema_conferencia.sql`, no fim) | sem elas, 2.621 parcelas continuam recusadas a cada hora |
| **Confirmar o rótulo da espécie B26** | entrou como "Auxílio-reclusão" provisório |
| **Capturar os HAR do e-SAJ e do eproc** | são os próximos coletores; sem a captura, não há o que programar |
| **Decidir sobre os 9 resumos de acórdão** (8 precisam de OCR) | vem do fluxo do acervo |

---

## 5. O que está no working tree e não foi commitado

**Nada** — no commit que traz este documento, `git status --short` fica limpo.
A branch `claude/retomar-crm-fase2-j1mk4m` está publicada e a `main` está com
tudo: 09.00 no ar, os dossiês em `cowork/` e os geradores versionados junto,
para o próximo retrato ser um comando só.

O que **nunca** entra no repositório, por conter dado de cliente ou
credencial (está no `.gitignore`):

| Caminho | O que é |
|---|---|
| `crm/data/` | o espelho bruto do To Do — CPF, telefone, senha e texto de andamento |
| `graph_tokens.json`, `graph_device.json` | os tokens da Microsoft |
| `crm/fase2/ponte/.env` e `ponte/sessao/` | a service key e a sessão do WhatsApp |
| `crm/fase2/robo-crps/perfil/`, `nups.txt`, `crps_coletado.json`, `sonda_resultado/` | a sessão gov.br e o que o robô do CRPS coletou |
| `/tmp/audit_cache.json` | cache das auditorias do To Do |

E os arquivos de trabalho desta sessão que **ficaram no scratchpad**, fora do
repositório: os harnesses de navegador (`teste-f9.js`, `teste-atendimento.js`,
`teste-escritorio.js`, `teste-abas.js` e mais cinco). Eles rodam com
Playwright e dados fictícios; se forem virar suíte de verdade, o lugar é
`crm/fase2/testes/` — hoje **não estão versionados**.

---

## 6. Travas conhecidas: o que quebra fácil

Cada item aqui já quebrou de verdade pelo menos uma vez.

### No banco

- **Índice único parcial não serve para upsert.** `ON CONFLICT (coluna)` do
  PostgREST não infere índice com `WHERE`. Deu 42P10 e segurou 2.621 parcelas
  por dias — e o SQL Editor não acusa nada, porque criar o índice funciona.
- **O SQL Editor roda o arquivo como uma transação só.** Uma linha com erro
  desfaz tudo, e a tela mostra só o erro daquela linha. Por isso existe o
  `schema_conferencia.sql`.
- **O PostgREST corta em 1000 linhas sem avisar.** Lista grande pede `todas()`
  no app e `_rest_todas()` no Python. Já causou duplicação em série (23505).
- **Upsert com `merge-duplicates` manda a linha INTEIRA.** Campo ausente vira
  nulo: foi assim que o `processo` vinculado à mão sumia a cada sincronização.
  Hoje o `migrar.py` resgata do banco o que o To Do não trouxe.

### No app

- **`.id-grid` e `.id-card` são usados em mais de um lugar.** Renomear classe
  sem `grep` no arquivo inteiro quebra tela que ninguém estava olhando.
- **184 ids e 52 classes são procurados por string.** Renomear qualquer um
  quebra **em silêncio** — sem erro no console. A lista está no
  `03-MAPA-APP.md`.
- **`fill` de SVG escrito como atributo congela na primeira pintura.** Tem que
  vir do CSS; a estrela do cartão passou uma rodada sem preencher por isso.
- **`:focus-within` não serve para o composer.** Chip é `<span>`, que não
  recebe foco, e no Safari e no Firefox botão também não: o painel fechava no
  `mousedown`, antes do `mouseup`. Hoje é a classe `.esc-aberto`.
- **Grade CSS coloca filho não posicionado na primeira célula livre.** Sem
  `>*{grid-column:2}`, cartão novo vai parar na coluna estreita.
- **`${/* comentário */""}` fora de template literal é erro de sintaxe.** Já
  aconteceu duas vezes; o teste de sintaxe pega, mas só se for rodado.
- **Cliente com dois casos ativos abre o modal "escolher processo"**, que
  bloqueia a pintura em teste automatizado. Nos testes, defina `casoSel` e
  esconda o `#modal`.

### Na sincronização

- **A lista casa pelo nome EXATO, com emoji.** Lista homônima sem emoji não
  casa — é a causa dos 270 casos invisíveis.
- **Erro de esquema (42P10, 42703, PGRST204) pula a tabela inteira** com aviso,
  em vez de derrubar a rodada. Antes disso, um dia inteiro sem sincronizar por
  causa de uma tabela.
- **O carimbo `todo_sync_em` é gravado mesmo com tabela pulada** — senão o CRM
  diz "sem sincronizar" num dia em que quase tudo entrou.

### No processo de trabalho

- **A `main` recebe push de outras sessões** (as ondas da base de
  conhecimento). Sempre `git fetch origin main` e merge antes do push.
- **O diretório do shell volta à raiz entre comandos.** Use caminho absoluto.
- **Teste que filtra o que ele deveria olhar não testa nada.** O harness da F8
  excluía a classe `.fatos` — justamente a que estava quebrada.
- **Captura de tela pega o que teste de texto não pega.** O `undefined` em seis
  lugares da F9.1 passou por todos os testes e apareceu na primeira imagem.
