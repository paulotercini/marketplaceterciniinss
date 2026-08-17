
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

## lembretes.js (F20) — o período de graça, e duas armadilhas de aba

Do programa, nada: a conta nasceu certa porque o texto da lei foi conferido no
Planalto ANTES de escrever. E a conferência derrubou duas coisas que eu tinha
escrito de memória:

- **o segurado FACULTATIVO tem 6 meses, não 12** (art. 15, VI da Lei 8.213/91).
  Metade do prazo. Teria saído errado em todo cliente que termina em
  recolhimento facultativo — que é justamente o caso do CNIS de exemplo.
- **o prazo conta também da cessação de BENEFÍCIO por incapacidade**
  (art. 13, II do Decreto 3.048/99), não só das contribuições. É por isso que
  os períodos de benefício que o CNIS traz entram na conta.

Do arquivo de teste, duas:

1. **A aba Lembretes é `data-vv="9"`, não `1`.** A numeração das abas não é a
   ordem em que elas aparecem na tela.
2. **Definir `abaAtiva` e chamar `pintarFicha()` não ativa o painel.** Quem põe
   a classe `.ativo` é o clique no botão da aba; sem ele o painel existe e fica
   invisível, e o teste espera para sempre por um seletor que está lá.

E uma de medida: dentro de um `<details>` fechado o Chromium **ainda devolve
caixa de layout** para os campos. Medir a altura dos campos não diz se a coisa
está aberta; medir a altura do próprio `<details>` diz.

## anotacoes.js (F21) — a anotação com tipo

O modelo veio de pesquisa (Clio, MyCase, Notion, Linear, Obsidian, Astrea,
ADVBOX, Tabelas do CNJ), e três decisões merecem registro:

1. **O tipo viaja como prefixo `[TIPO]` no texto.** Nenhuma coluna nova, o
   To Do recebe legível, a pesquisa acha, e a tela troca o colchete por chip.
2. **Não existe tipo OUTROS.** Viraria o dreno onde 80% cai. Sem tipo escolhido
   o comentário continua livre, que é o comportamento de sempre.
3. **O template preenche o VALOR, não o placeholder.** Esqueleto que a pessoa
   completa (lição do Notion/Linear); placeholder some ao digitar.

Armadilha de CSS: a `.escrever` pinta todo botão de azul por uma regra com
lista de `:not()`. Chip novo dentro dela PRECISA entrar na lista, ou nasce
azul sólido.

## casos2.js (F22) — os defeitos apontados por captura

A linha do tempo tinha TRÊS colunas à esquerda (avatar+data, trilho, bolinha
oca) e o texto preso a 72ch — numa tela larga sobrava um vão branco entre o
texto e o ✓ de "li". O redesenho: o avatar É o nó, o trilho passa por trás
dele, e o texto ocupa a largura que existir. O CRPS (.crps-tl) mantém o
desenho antigo, porque lá o nó é um ícone.

Armadilha de medição: a fita de atribuição mede 1px de recuo, e o recuo é a
PRÓPRIA borda do cartão — exigir 0px reprova o certo.

## cadastro3.js (F23) — RG fora, parceria, registro avulso, revisão

Duas armadilhas de teste: o registro avulso mora dentro do `<details>` "mais
opções", e `repintarFicha` o fecha de novo — `innerText` de conteúdo oculto
devolve vazio, `textContent` lê. E a pesquisa usa índice pré-montado
(`c._ix`): gravar `k.parceria` sem `reindexarCliente(dono)` só aparece na
busca depois de recarregar — esse era um defeito do programa, achado pelo
teste.

## precaso.js (F25) — o pré-caso

O arneço devolve 201 com o corpo ecoado nos POST com return=representation:
sem isso, `gerarCasoDoPre` não recebe o caso criado e a transferência não
roda. E o ＋ fullwidth (U+FF0B) conta como pictograma na regra da F9.2 — o
sinal de mais é o ASCII.

## novocliente.js (F27) — a tela da recepção

A tela não cria mais caso nenhum: cadastrar grava só o cliente, com o
relato do balcão como primeira anotação de `campos.atendimento` e, se o
benefício veio preenchido, um pré-caso em `campos.precasos`. O eco 201 do
POST de clientes continua obrigatório (criarCliente consome `cli.id`).

Armadilha: depois do cadastro o `carregar()` repõe a fixtura e o cliente
novo some da memória — a prova é o corpo do POST capturado, nunca a lista
renderizada. E `window.open` zerado antes do clique prova que o agendamento
no Google Agenda saiu de fato do fluxo.

## novocliente.js (F28) — sexo, CEPs de Monte Alto e menção da triagem

A rua se prova nas três formas: escolhida da lista ("Rua — Bairro"), digitada
por inteiro quando o nome é único, e AMBÍGUA quando existe em vários bairros
(aí não casa de propósito — "Rua dos Lirios" tem cinco). O endereço grava
pelo mesmo gravarEnderecoCli da ficha: as sete colunas + o espelho
`endereco` da procuração, tudo num PATCH capturado.

A fixtura ganha Amanda e Marcos (cargo advogado) SÓ dentro deste teste: a
menção da triagem deve ir aos dois e nunca a quem cadastrou.

## novocliente.js (F29) — o portão da triagem e a recepção completa

O portão: cliente sem caso e sem triagem encerrada não vê Lembretes nem
Anotações — os testes que dependiam da mesa (precaso.js, consulta.js)
ganharam na fixtura `triagem.atendimento`, a pré-condição nova do mundo
real. A prova do portão abre e fecha: some sem triagem, aparece com ela.

Armadilha de captura: a ficha aberta de um bloco anterior encolhe a
coluna do meio (F22) e a foto da tela sai estreita — fecharFicha() antes
do screenshot. No CNIS, mãe/NIT só preenchem campo VAZIO; a segunda
leitura não pode gerar PATCH de nome_mae.

## fluxo.js (F30) — o atendimento virou fluxo

O trilho do Cadastro é máquina de estados: Triagem só enquanto aberta;
Anotações da triagem encerrada até a decisão (caso gerado, lembrete ou
não gerar); Documentos nasce com o caso; Consulta e Mensagens têm casa
própria (o trilho interno anot-trilho morreu — irSubAnot é só casca de
compatibilidade).

Três armadilhas: os rótulos saem em MAIÚSCULAS pelo CSS (regex com /i);
depois de "Somente gerar lembrete" a ficha muda para a aba 9 e o trilho
do painel 0 não está mais .ativo (clicar Cadastro antes de medir); e o
botão "+ atendimento" no sub-menu NÃO pode ter classe cad-mini — o
consulta.js clica o primeiro .cad-mini do painel e navegaria para longe
(classe própria .trilho-mais).

## fluxo.js (F31) — documentos no fluxo e Consulta dentro de Documentos

Os documentos do escritório (caixaDocumentos) entram no FIM do fluxo do
atendimento, logo abaixo do "Gerar o caso" — a função não tem ids DOM,
então pode viver em dois lugares sem colisão. `especieDoCliente` ganhou o
fallback do pré-caso vivo: sem ele, o contrato impresso no fluxo sairia
na variante padrão em vez da do benefício escolhido.

A Consulta virou seção do painel Documentos: o painel junta caixa de
assinatura (.caixa-docs, sem .cad-cartao) + catálogo + os três cartões
da consulta (.cad-cartao) — por isso o consulta.js antigo continua
passando SEM mudança (os seletores .cad-cartao só existem na consulta).
irSubCad("consulta") é mapeado para "documentos".

## novocliente.js (F32) — o CPF confere enquanto se digita

`cpfValido` é o módulo 11 da Receita com a exclusão dos onze dígitos
iguais (111.111.111-11 passa no cálculo cru — a exclusão é obrigatória).
Os CPFs da fixtura (123.456.789-09 e 529.982.247-25) são os exemplos
clássicos VÁLIDOS, por isso servem de par com o dígito trocado
(123.456.789-00) para provar o aviso. O recado inline usa a memória
(D.clientes); a trava dura do submit continua conferindo o banco.

## fluxo.js (F33) — o bloco 2 fecha

Os documentos que o cliente vai trazer viraram <details> fechado: só o
summary (com o resumo "lista de N itens · já pedimos X") fica à vista.
O primeiro `details summary` da caixa deixou de ser o da cláusula de
honorários — seletor por texto, nunca por posição. Conteúdo de details
fechado tem innerText vazio (armadilha antiga): interação nos testes é
por evaluate ou abrindo o details antes.

## conversao.js (F34) — o caminho de volta

O inverso do gerarCasoDoPre. A prova central é a da INTEGRAÇÃO: cada
anotação copiada leva o MESMO id do andamento, porque é esse id que o
migrar.py usa no dedupe — a sincronização seguinte substitui em vez de
duplicar. Perícia e pagamento (caso_id NOT NULL no schema) travam a
conversão. O DELETE do caso é o que faz a sync parar de tratá-lo como
caso (o migrar só respeita casos que JÁ existem no banco).

Armadilhas: abrirFicha com dois casos abre o modal de escolher processo
(limpar #modal e fixar casoSel antes de mirar .fatos-topo); e o botão do
lote não pode depender de filtroColab — o filtro nasce LIGADO no chip do
usuário, e a condição `!filtroColab` escondia o cabeçalho para sempre.

## desfazer.js (F35) — a regra da volta

Decisão permanente do Paulo (16.08.2026): TODA transição nova do CRM
nasce com o seu desfazer. O teste percorre os cinco que faltavam:
reabrir caso encerrado (fase pela origem_lista, encerrado_por pode não
existir no banco — retry sem a coluna), lembrete→mesa (o botão mora na
ABA LEMBRETES, porque a mesa se recolhe quando o atendimento se
resolve), lixeira do pré-caso, entregue-toggle e apagar nota/registro
do próprio autor (a nota da colega NÃO ganha ×).

Mapa do que já tinha volta: passos e porta da triagem (alternam),
reabrir triagem (F30), caso↔atendimento (F34+gerar), concluir tarefa
(desfazer F12), mover de lista, checklist de nota, andamento e anexo do
autor. Sem volta CONSCIENTE: fundir casos (reversão exigiria snapshot —
anotado como pendência).

## desfazer.js (F36) — gerar o caso de dentro dos Lembretes

O botão fica na linha do lembrete de origem precaso, ao lado do "voltar
ao atendimento". gerarCasoDoLembrete reativa o pré-caso e delega ao
gerarCasoDoPre — que agora valida a via da incapacidade NA FUNÇÃO (não
só no botão da mesa), desativa os lembretes do pré-caso ao gerar, e sem
o select da mesa manda a fase para inss/peticao_inicial pela via, nunca
para "escritorio" (que desde a F34 não é lista de casos). O eco 201 do
POST de casos entrou no route deste teste.

Armadilha de edição que virou lição: âncora de Edit dentro do CORPO de
uma função aninha a função nova ali dentro — gerarCasoDoLembrete nasceu
dentro do gerarCasoDoPre e "is not defined" no escopo global.

## F37 — o fundo da ficha do caso

Só CSS: .fx, .fatos-pe e .fx-prorrog trocaram o branco pelo token
--azul-fundo (#F3F7FE), que já existia. Ficha (dado oficial) num tom,
andamentos em branco. contraste.js seguiu verde (texto #1A1C20 sobre
#F3F7FE ≈ 15:1). Alternativas creme e cinza mostradas ao Paulo em
f37-opcoes.html — trocar é mudar um token.

## prazos.js (F38) — tarefas com prazo e o deferido que continua

O ⏰ do compositor guarda a origem em ronda.prazo_de (coluna JSONB que já
existia — sem migração) e move com fase "outro" + mover_para, como o
select de listas. Três armadilhas de teste: a caixa "para quem/quando"
do compositor (tf-box) barra ANTES do guard do prazo — responder tfQuem
e tfData; grupoClientes reordena os grupos (o sort de casosSel não
basta — a lista 🗓 ordena os GRUPOS pela menor data fatal, ignorando o
seletor de ordem); e o checkbox novo virou o primeiro `.conta-ck input`
da página, quebrando o clique posicional do lembretes.js (seletor agora
escopado ao painel 9).

## pesquisa.js (F39) — a pesquisa não prende o menu

render() atende buscaTxt ANTES da visao: navegação que não limpa a busca
parece quebrada. A regra virou função (limparBusca) chamada em todo ponto
que escreve em `visao` por navegação do usuário (lista-item, btn-novo-cli,
irCel). Armadilha de teste: o campo tem debounce de 200ms — esperar
~500ms depois do fill antes de afirmar qualquer coisa; e o nome pesquisado
tem de existir nas fixturas ("Aurelia", não "Ficticio").

## novidades.js (F40) — nada da importação entra calado

ingerirDetalheNoCaso lê `arquivoPat` global (a coleta ainda em memória
na conferência) e deduplica contra o BANCO na hora (GET de origem_id e
eventos), não contra o D — juntar duas vezes não duplica. Armadilhas:
o mock de rota precisa responder GET de andamentos e eventos por
caso_id (o helper consulta antes de gravar); os POSTs de novidade usam
return=representation (o id volta para o D.novid — sem ele, o "✔ li"
não funcionaria); e a data do portal pode vir com ano de 2 dígitos
("24/08/26 14:20"), o eventoNoTexto normaliza para 20xx. A concordância
dos textos sai de evFem(tipo) — tipo terminado em "o" é masculino.

## comentarios.js (F41) — anotações e comentários

Três armadilhas. (1) As Anotações do atendimento só renderizam com a
triagem ENCERRADA (F29/F30): a fixtura precisa de clientes[].triagem.
atendimento preenchido, senão #at-nota nunca aparece. (2) Ao remover um
bloco de código por âncoras de comentário, conferir os VIZINHOS: o
bloco ENCAMINHAR tinha semMarcador/emItens/alternarFrase no meio —
vivas e usadas pelas sugestões (restauradas). (3) equipeAtiva() é o
único predicado de equipe: teste com colaborador ativo=null para
garantir que ele aparece em toda superfície.
