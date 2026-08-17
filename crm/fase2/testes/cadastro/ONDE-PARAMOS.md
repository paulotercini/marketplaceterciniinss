# Onde paramos — 17.08.2026, versão 09.38

## F39 · A pesquisa não prende mais o menu (09.38)

Com uma busca ativa, clicar em qualquer lista ou visão da barra lateral
não ia: o clique trocava a `visao`, mas o render() via `buscaTxt`
preenchido e repintava a pesquisa por cima — era preciso clicar no ✕
antes de conseguir sair. Agora um helper único (`limparBusca()`) zera
`buscaTxt`, esvazia os DOIS campos (desktop e celular) e esconde os
DOIS ✕; ele roda no clique de `.lista-item`, no ＋ Novo cliente e no
`irCel` da barra do celular (que já limpava o texto, mas deixava o ✕
aceso — corrigido de carona). O ✕ continua funcionando como antes.
Teste pesquisa.js, 13 provas; suíte 30 arquivos.

## F38 · Tarefas com Prazo no CRM e o deferido que continua (09.37)

Prazo processual não se perde: a anotação do caso marcada com ⏰ exige a
DATA FATAL, sai prefixada "[PRAZO DD.MM.AAAA]" na linha do tempo e move
o caso para 🗓 Tarefas com Prazo (fase outro + mover_para, o mesmo
canal do select — o To Do acompanha quando o ESCREVER_TODO ligar),
guardando a lista de origem em ronda.prazo_de (JSONB existente, sem
migração). A lista 🗓 ordena os GRUPOS pela menor data fatal. O "✔
prazo cumprido" propõe devolver à lista de ORIGEM já selecionada, com
seletor para trocar (decisão do Paulo), limpa o prazo e registra
"[PRAZO CUMPRIDO]". E a janela do Encerrar ganhou o terceiro caminho
"⚖️ Gerou — e o processo CONTINUA (cumprimento de sentença)": lança os
honorários em Pagamentos, grava o resultado e o marco [DECISÃO] SEM
mudar a fase — o caso segue em Judicial. Teste prazos.js, 16 provas;
suíte 29 arquivos.

## F37 · A ficha do caso com fundo próprio (09.36)

Pedido do Paulo (com captura): a grade de fatos (espécie, protocolo,
NB, DER, DIB, decisão, responsável, documentos solicitados) agora tem
fundo azulado (--azul-fundo, token que já existia) — dado oficial num
tom, conversa dos andamentos em branco. Só CSS (.fx, .fatos-pe,
.fx-prorrog). Alternativas creme e cinza apresentadas em
f37-opcoes.html; trocar é um token.

## F36 · De Lembretes também se gera o caso (09.35)

O lembrete que nasceu de um atendimento (origem precaso) tem agora DOIS
botões: "↺ voltar ao atendimento" e "Gerar o caso". Gerar dali reativa o
pré-caso e segue o MESMO gerarCasoDoPre da mesa — com três melhorias que
valem para os dois caminhos: a via da incapacidade é exigida pela
própria função (não só pelo botão), o lembrete de origem se desativa ao
gerar (o acompanhamento acabou — existe caso), e sem o select da mesa a
fase sai da via (adm→inss, jud→petição inicial), nunca "escritorio".

## REGRA PERMANENTE · A REGRA DA VOLTA (decisão do Paulo, 16.08.2026)

**Toda transição do CRM precisa do caminho de volta — por erro ou por
vontade. Toda atualização futura nasce pensando no "voltar/desfazer".**

## F35 · A regra da volta, aplicada ao sistema inteiro (09.34)

Auditoria completa das transições. Já tinham volta: passos e porta da
triagem (clique alterna), reabrir triagem (F30), caso ↔ atendimento
(F34 + Gerar o caso), concluir tarefa com desfazer (F12), mover de
lista, importante/urgente, checklist de nota, apagar andamento e anexo
(autor). Cinco NÃO tinham e ganharam: (1) caso encerrado se REABRE — o
↺ ao lado do carimbo devolve à lista de origem, limpa resultado e
registra quem reabriu ([DECISÃO] na linha do tempo; honorários lançados
ficam); (2) "Somente gerar lembrete" se desfaz — "↺ voltar ao
atendimento" na aba Lembretes (e no card): o pré-caso volta à mesa e o
lembrete se desativa; (3) pré-caso tirado vai à lixeira
(campos.pc_lixeira) e a mesa oferece "↺ restaurar"; (4) "entregue"
marcado por engano se desmarca no clique (chip avisa); (5) anotação do
atendimento e registro avulso do PRÓPRIO autor se apagam (só o autor vê
o ×). Sem volta consciente, anotado como pendência: fundir casos
(reversão exigiria snapshot do estado anterior). Teste desfazer.js, 17
provas; suíte 28 arquivos.

## F34 · O caminho de volta — caso que não é caso vira atendimento (09.33)

O diagnóstico: a migração antiga transformou as tarefas da lista 🙋
Escritório em CASOS, mas quem está ali é cliente em NEGOCIAÇÃO (atrás de
documento), sem caso. Desde a 08.99 o migrar.py não cria mais caso para
tarefa nova dessa lista (vira anotação no cadastro); faltava desfazer os
657 legados. O que entrou: botão "↩ não é caso" ao lado do Encerrar
(qualquer caso ativo) e o lote "converter todos" no cabeçalho da lista
Escritório (decisão do Paulo: todos de uma vez). A conversão é o inverso
do gerarCasoDoPre: andamentos → anotações com o MESMO id (o id que o
migrar.py usa no dedupe — a sync substitui em vez de duplicar), tarefas
abertas → docs_pedidos no formato da sync (id = caso), anexos → cadastro,
benefício → pré-caso (id derivado do caso: reconverter não duplica), e o
caso é APAGADO — o que faz a sincronização passar a alimentar as
anotações do cliente (o migrar só trata como caso o que JÁ existe no
banco; a tarefa no To Do fica intacta). Perícia e pagamento (caso_id NOT
NULL) travam a conversão com aviso. Cliente convertido fica 🟡 em
atendimento com Anotações abertas. Teste conversao.js, 17 provas; suíte
27 arquivos. IMPORTANTE ao rodar o lote em produção: são ~657 casos,
alguns minutos de conversão com avisos de progresso a cada 25.

## F33 · A lista de documentos nasce fechada (09.32)

O bloco "2 · Documentos que o cliente vai trazer" do fluxo virou
`<details>` fechado: só o título com o resumo (quantos itens, quantos
já pedidos) fica à vista, e o clique abre a lista — tela mais limpa,
pedido do Paulo. O summary carrega a classe `.rotulo-caso` para a
prova de ordem do fluxo continuar valendo.

## F32 · O CPF é a chave, conferido enquanto se digita (09.31)

Na tela da recepção, o CPF digitado responde na hora, logo abaixo do
campo: já cadastrado mostra "⚠ Este CPF já é de <Nome> · N processo(s)
— não cadastre de novo" com o botão "Abrir o cadastro" (mesmo com o
nome escrito diferente, o CPF vincula — a regra do Paulo); válido e
livre ganha o ✓ verde; dígito verificador errado avisa e o submit barra
(cpfValido = módulo 11 + exclusão de dígitos repetidos). Cadastrar sem
CPF continua permitido, para nunca travar o balcão. A janela de CPF
repetido no submit segue como segunda trava (confere também o banco).

## F31 · Documentos no fluxo e Consulta dentro de Documentos (09.30)

A procuração, a declaração de pobreza, o contrato e o resto da
`caixaDocumentos` aparecem LOGO ABAIXO do "Gerar o caso", no fim do
fluxo do atendimento: quem está gerando imprime ali mesmo, colhe a
assinatura e clica, sem trocar de tela. `especieDoCliente` ganhou o
fallback do pré-caso vivo (o contrato do fluxo sai na variante certa —
antes sairia no padrão). O menu Documentos incorporou a Consulta
(pedido do Paulo): um painel só com documentos para assinar, catálogo
do INSS e os portais com CPF; o botão Consulta saiu do trilho
(`irSubCad("consulta")` mapeia para "documentos") e a visibilidade de
Documentos passou ao portão da triagem (triada OU com caso — o botão
carrega a Consulta, que já era desse portão). Suíte: 26 arquivos,
fluxo.js com 31 provas.

## F30 · O Atendimento virou FLUXO (09.29)

A ordem do Paulo, na tela: 1) espécie (select com "outros — escrever")
e natureza concessão/revisão/acerto, com a via administrativa ou
judicial OBRIGATÓRIA nos benefícios por incapacidade (adm pré-seleciona
fase INSS e mostra o padrão de 20% sobre as parcelas); 2) documentos que
o cliente vai trazer; 3) anotações com atribuir/lembrar/anexar (📎 novo
no compositor); 4) honorários — o padrão do escritório vem da variante
do CONTRATO (HONOR_RESUMO + cláusula completa num details), e o ajuste
combinado grava em `campos.honor_ajuste[variante]` e entra no contrato
impresso como "DISPOSIÇÃO EXPRESSA EM CONTRÁRIO" (textoContrato ganhou o
parâmetro); 5) decisão por último — Gerar o caso (leva direto ao botão
Documentos, que só nasce com o caso), Somente gerar lembrete (as
anotações passam a aparecer na aba Lembretes) ou Não gerar.

O trilho virou máquina de estados: Triagem some quando encerrada (o
resumo com atenções vira a primeira informação das Anotações, com
"reabrir triagem" — rastro em triagem.reaberta); Anotações some quando o
atendimento se resolve; Consulta e Mensagens subiram para o trilho
principal (anot-trilho morreu; irSubAnot é casca); "+ atendimento"
(classe .trilho-mais, NUNCA cad-mini) abre pré-caso novo para qualquer
cliente, inclusive quem já tem caso. Suíte: 26 arquivos, 528 provas
(fluxo.js com 26).

## F29 · O portão da triagem e a recepção que colhe tudo (09.28)

A tela da recepção colhe também a senha do Meu INSS (POST em credenciais,
o caminho da ficha, ao lado do CPF), o estado civil e a profissão (a
procuração precisa) e a cidade/UF com padrão Monte Alto/SP — cliente de
outra cidade grava a cidade digitada e a lista de CEPs não casa de
propósito. O portão novo: cliente sem caso e sem triagem encerrada vê SÓ
o Cadastro, e dentro dele só Identificação e Triagem; `triagemFechada(c)`
(= `triagemDe(c).atendimento`, que o fecharAtendimento já gravava) abre
Lembretes e Anotações. Até lá o relato do balcão aparece DENTRO da
Triagem (`.tri-balcao`), e o pré-caso da recepção já responde a porta
(familiaDaTriagem lê precasos). Encerrar a triagem sem caso leva direto
às Anotações recém-abertas. O CNIS anexado preenche sozinho nome da mãe
e NIT vazios da Identificação (campo preenchido não se toca). Testes:
novocliente.js 49 provas, pdfinss.js 48; precaso.js e consulta.js
ganharam a pré-condição do portão na fixtura.

## F28 · A recepção completa: sexo, endereço por CEP e menção da triagem (09.27)

Sexo (Mulher/Homem, valores F/M da coluna `sexo`) entra no cadastro da
recepção porque decide a data da aposentadoria (o `sexoDe` prefere o
confirmado ao palpite pelo nome). O endereço sai da lista de 1.048 CEPs de
Monte Alto (arquivo do Paulo, embutido no app como `CEPS_MONTE_ALTO`): a
recepção digita a rua, o CEP, o bairro e Monte Alto/SP saem sozinhos, e a
gravação usa o MESMO `gravarEnderecoCli` da ficha (sete colunas + espelho
`endereco` da procuração). Rua ambígua (existe em mais de um bairro) exige
escolher da lista; rua de fora grava como digitada, sem CEP inventado.
Todo cliente novo dispara menção aos advogados (mesma escolha de ⚙️ do
aviso de caso novo; quem cadastrou não se avisa) com "dar seguimento na
triagem" — a menção nasce presa ao cliente (`mencoes.cliente_id`, ALTER
idempotente acrescentado ao `schema_por_em_dia.sql`; sem rodar o ALTER o
app cai no fallback e a menção chega só com o texto). A caixa 📥 resolve
a ficha também por `cliente_id`. Teste `novocliente.js` com 32 provas.

## F27 · Novo Cliente = a tela da recepção (09.26)

Só o nome é obrigatório. O benefício é opcional e, preenchido, vira
PRÉ-CASO em `campos.precasos` (nunca caso — coerente com a F25: caso é
procuração + contrato). O relato do balcão é a primeira anotação de
`campos.atendimento`, com autor, e é ela que põe o cliente 🟡 na lista
Escritório; a escolha de fase e o agendamento no Google Agenda saíram da
tela. `clientesEmAtendimento` agora também conta quem só tem pré-caso.
Depois de cadastrar, a ficha abre direto em Anotações → Atendimento.
Teste `novocliente.js` (19 provas); suíte com 25 arquivos, 470 verificações.

## A rodada dos quinze pedidos (F22 a F26)

**F22 · layout dos Casos** (09.22). Ficha aberta encolhe a lateral para os
ícones (o ☰ é exceção da sessão, não preferência); fita colorida de
atribuição na borda dos cartões; o texto do andamento perdeu o teto de 72ch e
ocupa a largura; a bolinha oca morreu — o avatar é o nó da linha do tempo.

**F23 · cadastro** (09.23). O RG saiu do sistema e de TODOS os modelos
(inclusive o dos advogados — OAB, CPF e NIT qualificam); parceria com nome de
advogado buscável e editável do cadastro (com reindexação na hora); "mais
opções" trocou credencial por registro avulso com autor e data; cliente já
aposentado + caso de aposentadoria = aviso "provável revisão, não concessão",
derivado.

**F24 · triagem** (09.24). A porta de entrada "De qual caso se trata?" com as
doze famílias e o "ainda não sei" honesto (ficam só os passos padrão); as
perguntas do escritório que a advogada acrescenta e valem para todos (autor e
data); "Encerrar a triagem" manda o resumo para as Anotações SÓ com atenção
ou não conferido.

**F25 · o pré-caso** (09.25). "Gerado o caso" = procuração + contrato
assinado. Antes disso: pré-casos nas Anotações (mais de um, pelo +), com
espécie, natureza (concessão/revisão/acerto), marcadores rural/especial/
deficiência que abrem os tópicos das famílias, honorários, anexo que passa
para o caso, e o caminho alternativo "não gerar — acompanhar em Lembretes"
(data + responsável viram lembrete). Anotações com atribuição, lembrar (cria
lembrete com responsável, pronto para o WhatsApp), importante/urgente e
checklist assinado. Cliente amarelo "Em formação", menu dinâmico (só Cadastro
e Lembretes até o caso nascer), Cadastro com TRÊS divisões (Documentos/
Consulta/Mensagens viraram trilho dentro de Anotações). Gerar o caso
transfere as anotações como andamentos com data e autor originais.

**F26 · os modelos .docx da pasta do Drive**. Os dez modelos de
"_Modelos Procurações/Nova pasta" foram sobrescritos sem RG (do segurado e
dos advogados, remoção cirúrgica preservando negrito) e uniformizados em
Bookman Old Style 12, espaçamento 1,5. Os originais estão em
"_originais-antes-do-ajuste", dentro da mesma pasta.

## A suíte

451 verificações em 24 arquivos, todas passando. O LEIAME registra as
armadilhas de cada fase.

## O que continua com você

- 243 clientes sem CPF; a mão de volta CRM → To Do; confirmar as 2.621
  parcelas da F9.0; o rótulo do B26/Espécie 57; HARs do e-SAJ/eproc.
- Os ~555 ms da Agenda ao vivo seguem sem reprodução no arneço — medição ao
  vivo com DevTools antes de mexer.
- Conferir no seu navegador o leitor de PDF (Triagem → Ler o CNIS).

## Para a próxima rodada

1. O schema do banco não ganhou coluna nova: pré-casos, registros e porta da
   triagem moram em campos JSONB — nada a rodar no Supabase.
2. As perguntas do escritório usam config_app (chave triagem_extra) — também
   sem migração.
3. Se quiser o pré-caso também para clientes que JÁ têm casos (um caso novo
   se desenhando ao lado dos existentes), é uma evolução pequena: hoje o
   bloco aparece só para quem não tem caso nenhum.
