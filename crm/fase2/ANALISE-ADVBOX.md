# O QUE A ADVBOX TEM, ITEM POR ITEM, E O QUE SERVE PARA NÓS

Análise dos vinte prints enviados em 18.09.2026. Quatro deles são transição de vídeo, abertura
animada ou tela desfocada e não trazem informação (prints 4, 5, 6 e 17). Os demais mostram
tarefas, financeiro, painel, inteligência artificial e workflow.

Comparação sempre contra o que o nosso CRM já faz hoje, versão 10.09.

---

## 1. CONCLUSÃO

Vale copiar quatro coisas, e nenhuma delas é a mais vistosa. **O prazo fatal separado da data do
compromisso**, **o cálculo em dias úteis**, **o roteiro de tarefas por tipo de caso** e **a
conclusão de tarefa que move a etapa do processo**. As três primeiras cabem no que acabamos de
construir na F113 e na F114, porque a espécie escolhida é exatamente o gatilho que falta para
disparar um roteiro.

Não vale copiar a pontuação por tarefas, que é o carro-chefe deles. Em escritório de três
pessoas ela mede volume e não resultado, e cria incentivo para fazer a tarefa que pontua em
lugar da que o caso precisa. Também não vale construir financeiro de contas bancárias nem
assistente de conversa dentro do CRM, porque no primeiro caso o trabalho é do contador e no
segundo já temos o Claude lendo o Supabase, que faz mais.

A diferença estrutural entre os dois sistemas é essa. A ADVBOX é um CRM jurídico genérico, que
serve a qualquer área, e por isso resolve tudo por configuração do usuário, tarefas, workflows e
etapas que cada escritório desenha. O nosso é previdenciário e sabe o que é um B31, uma DCB e
uma DER. Copiar a camada genérica deles enfraquece justamente o que temos de melhor.

---

## 2. O QUE VALE COPIAR, EM ORDEM

### 2.1 Prazo fatal separado da data do compromisso (prints 1 e 10)

**O que eles têm.** No mesmo formulário há três campos, Data, Hora e Prazo fatal. A data é
quando a pessoa vai trabalhar, o prazo fatal é quando o direito morre. Na tela da inteligência
artificial aparecem lado a lado, Data do compromisso e Prazo fatal, ligados por uma seta.

**O que temos.** Um campo só por caso, o `prazo`, mais o `exigencia_prazo`. A anotação com ⏰
cria o prazo e o "lembrar em" cria o lembrete, mas os dois vivem em lugares diferentes e nada
diz qual deles é fatal.

**O que fazer.** Separar, na anotação com prazo, a data de fazer e a data de vencer, e marcar a
segunda como fatal. O quadro vermelho passa a mostrar as duas, e o vermelho fica reservado ao
fatal. Onda pequena, e é a de maior retorno.

### 2.2 Prazo em dias úteis, com o método D-1 (print 10)

**O que eles têm.** Um seletor Dias úteis ou Dias corridos, com a marca "calculando no método
D-1", isto é, o lembrete cai um dia antes do vencimento.

**O que temos.** Toda a nossa contagem é em dias corridos. Nos 15 dias da prorrogação da DCB e
nos 90 dias da pensão isso está certo, porque a lei conta assim. Nos prazos processuais está
errado, porque o CPC conta em dias úteis.

**O que fazer.** Marcar cada prazo como legal ou processual e contar cada um do seu jeito, com
feriados nacionais e os do TRF3. É a correção mais séria da lista, porque hoje um prazo
recursal anotado à mão pode vencer antes do que o CRM mostra. Onda média, pela tabela de
feriados.

### 2.3 Roteiro de tarefas por tipo de caso, o workflow deles (prints 13, 14 e 16)

**O que eles têm.** Uma sequência nomeada, por exemplo ANALISE DE CASO com quatro tarefas, cada
uma com responsável e prazo em dias contados da data de hoje. Ao criar a tarefa, escolhe-se o
workflow e ele aparece como lista numerada, "Tarefa 1 de 5", com a opção Pular tarefa. Eles têm
roteiros por matéria, inclusive um chamado BPC com seis tarefas.

**O que temos.** Nada equivalente. Temos as sugestões de anotação e o checklist de documentos,
que é parecido mas serve só ao cliente.

**O que fazer.** É o encaixe natural da F113. A espécie escolhida passa a sugerir o roteiro do
benefício, com responsável e prazo relativo, e a equipe aceita, pula ou muda. O B31 abre
requerimento, perícia, acompanhamento da DCB e prorrogação. O B21 abre certidão de óbito, prova
de união estável e protocolo dentro dos 90 dias. A matéria já está levantada em
REGRAS-POR-ESPECIE.md. Onda média.

### 2.4 Concluir a tarefa move a etapa do processo (print 16)

**O que eles têm.** Um bloco azul dentro do formulário, "Alteração de Etapa processual, o
processo será movido para ADMINISTRATIVO / BPC TESTE", com a pergunta se o cliente deve ser
notificado por SMS ou e-mail.

**O que temos.** A mudança de lista e de fase é sempre manual. A regra da volta existe, mas
ninguém é levado adiante sozinho.

**O que fazer.** Amarrar a conclusão de certas providências à fase. Protocolar o recurso move de
🌻 INSS para 🖥 Conselho de Recursos. Distribuir a ação move para 👪 Judicial. O aviso ao
cliente fica para depois, porque hoje falamos por WhatsApp e não por SMS. Onda pequena, se
limitada a três ou quatro gatilhos.

### 2.5 Sugerir tarefas a partir da publicação, com aprovar e descartar (print 10)

**O que eles têm.** A partir da intimação, quatro ações sugeridas com base no histórico do
escritório, cada uma com colaborador, descrição, data e prazo, um botão Aprovar tudo, um
percentual de confiança e um Descartar que ensina o sistema a não sugerir de novo.

**O que temos.** Leitura de texto por expressão regular, que já transforma "DCB 16/09" em data
do caso e "protocolo 210..." em protocolo. A coleta do PJe e do DataJud traz os andamentos, mas
ninguém propõe o que fazer com eles.

**O que fazer.** Vale, e temos vantagem, porque a nossa base de conhecimento previdenciária é
melhor fonte do que o histórico de cliques deles. Copiar exatamente três detalhes, a sugestão
sempre com prazo calculado, o aprovar em lote e o descartar que não volta. Onda grande, e só
depois de 2.1 e 2.2, que são a fundação.

### 2.6 Copiar link da tarefa e encaminhar (print 18)

**O que eles têm.** Na tarefa aberta, Concluir, Copiar link, Editar, Excluir, e as abas
Atividade, Enviar por e-mail e Encaminhar.

**O que temos.** Copiar em texto o caso completo, e o clique que copia número. Não há endereço
para uma anotação específica.

**O que fazer.** Dar endereço próprio a cada anotação e a cada prazo, para mandar a alguém da
equipe. Onda pequena e útil no dia a dia.

### 2.7 Contador de compromissos por dia no calendário (print 11)

**O que eles têm.** O calendário lateral com uma bolinha vermelha e o número de compromissos em
cada dia.

**O que temos.** Calendário com itens por tipo, mas sem o contador no número do dia.

**O que fazer.** Acrescentar o contador. Onda pequena, valor pequeno, faz quando passar por
perto.

---

## 3. O QUE NÃO VALE COPIAR

**Pontuação por tarefas, Taskscore, pontos acumulados e metas** (prints 2, 3, 6, 11 e 18). É o
produto deles, com pontuação por tarefa, de 5 a 150 pontos, e ranking por pessoa. Serve a
escritório grande, com equipe que o dono não vê trabalhar. Em três pessoas mede volume, não
resultado, e premia quem faz muitas tarefas pequenas. Um agravo vale 100 e avisar o cliente da
audiência vale 5, o que é exatamente o incentivo errado quando o cliente que não é avisado é o
que liga reclamando.

**Assistente de conversa dentro do CRM, a I.A. Donn@** (print 12). As perguntas do exemplo,
prazos fatais da semana e contratos fechados no mês, já são respondidas hoje pelo Claude lendo
o Supabase, com mais alcance e sem a ressalva que eles próprios exibem, de que a assistente
ainda erra.

**Financeiro de contas bancárias, transferências e saldo previsto** (prints 8 e 9). Construir
caixa, conciliação e categorias de despesa é outro sistema, e o escritório já tem contador.
Aproveitável só o vocabulário, separar competência, vencimento e pagamento, e nomear a receita
por origem, mensalidade, contratual final, sucumbência ou êxito. Isso cabe na aba Honorários
que já existe.

**Menu Adicionar, modal de processo com abas e ficha lateral do processo** (prints 15, 18 e
19). Já temos equivalente, e o nosso é mais direto. A ⚡ anotação rápida faz o que o menu deles
faz, e o Caso completo mostra mais do que o modal de quatro abas.

**Campos Privada, Retroativa, Dia inteiro e Local** (print 1). Baixo valor para nós. Local só
importa em perícia e audiência, que já vivem em eventos com data, hora e local.

---

## 4. O QUE NÓS FAZEMOS MELHOR, E NÃO SE DEVE PERDER

O nosso CRM sabe direito previdenciário e o deles não. A linha do caso mostra DCB, DID, óbito ou
consolidação conforme a espécie, calcula a janela dos 90 dias da pensão e avisa a decadência do
art. 103. Na ADVBOX tudo isso seria um campo de texto livre e uma tarefa chamada
APOSENTADORIA FUTURA, com dez pontos.

A nossa conversa do caso é uma linha do tempo única, com a fonte de cada registro, INSS, CRPS,
PJe ou escritório. Eles separam em abas que não se falam.

O nosso compositor escreve o comentário padronizado e extrai dele a data, o protocolo e a DCB.
O deles é uma caixa de descrição livre.

E o nosso registro é o Microsoft To Do, que a equipe já usa, sem obrigar ninguém a viver dentro
de um sistema novo.

---

## 5. ORDEM RECOMENDADA (primeiro lote)

Primeiro 2.1 e 2.2, que são fundação e corrigem um erro real de contagem de prazo. Depois 2.3 e
2.4, que aproveitam a espécie que acabamos de implantar. Depois 2.6 e 2.7, que são acabamento.
Por último 2.5, que é a mais cara e só rende sobre a fundação pronta.

---
---

# PARTE 2. SEGUNDO LOTE DE PRINTS (18.09.2026)

Dezoito prints novos, dois deles transição de vídeo sem informação (prints 22 e 35). O tema
central deste lote não é tela, é **arquitetura**, e nela está o achado mais importante das duas
análises.

## 6. FASE, ETAPA E TAREFA. A PEÇA QUE FALTA NO NOSSO CRM

**O que eles têm** (prints 21, 23, 33, 34, 36, 37 e 38). Três níveis encaixados.

A **fase processual** é o trilho grande. As deles são Marketing, Negociação, Administrativo,
Judicial, Recursal, Execução e Cobrança, Serviços e Consultorias, e RH e Financeiro.

A **etapa** é o passo dentro da fase. Dentro de Judicial, por exemplo, Ação iniciada, Processo
protocolado, Audiência marcada, Audiência próxima, Perícia e Aguardando sentença. O cadastro
tem dois campos apenas, nome da etapa e fase a que pertence.

A **tarefa** é o trabalho de alguém.

O desenho fica claro no print 37, e a própria tela de cadastro o diz em uma frase. A tarefa liga
os COLABORADORES, é vida interna. A etapa liga o CLIENTE, é vida externa. Nas palavras deles,
as etapas são "utilizadas para facilitar a transmissão de informação aos clientes". O print 21
fecha o raciocínio, a etapa muda e o cliente recebe o aviso.

**O que temos.** Fase sim, tarefa sim, etapa não. Nossas listas são fases e são melhores que as
deles para o nosso trabalho, porque falam a língua certa, 🌻 INSS, 🖥 Conselho de Recursos, 👪
Judicial. Desde a versão 10.10 a fase até anda sozinha quando a providência é registrada. Mas
entre a fase e a tarefa não há nada. O caso fica meses em 🌻 INSS sem que o sistema saiba dizer
se está aguardando perícia, em exigência ou aguardando análise.

**A consequência mais séria está no portal do cliente**, que já existe e já está publicado. Hoje
a frase que o cliente lê é montada por dedução, a função `status_line` pega o último evento
classificado da timeline e escreve "Última atualização em tal data". Quando o texto do To Do não
é classificável, o cliente lê "Em andamento", que não informa nada. O escritório sabe em que
pé está o caso, mas não tem onde dizer isso.

**O que fazer.** Criar a etapa como estado nomeado do caso dentro da fase, em três frentes ao
mesmo tempo. Na linha do caso, ao lado da tramitação. No portal, substituindo a frase deduzida
pela etapa declarada. E no automático, porque a etapa muda pelos mesmos gestos que já movem a
fase, protocolar, receber decisão, agendar perícia.

Etapas prováveis por fase, a confirmar com o Paulo. Em 🌻 INSS, requerimento protocolado,
aguardando perícia, perícia realizada, em exigência, aguardando análise e decidido. Em 🖥
Conselho de Recursos, recurso protocolado, aguardando distribuição, em pauta e julgado. Em 👪
Judicial, ação distribuída, aguardando contestação, perícia designada, aguardando sentença,
sentença publicada e em recurso. Onda média, e é a que recomendo fazer primeiro no próximo
bloco.

## 7. A ETAPA AVISA O CLIENTE (print 21)

**O que eles têm.** A troca de etapa dispara notificação ao cliente, com o envelope aparecendo
no desenho.

**O que temos.** Portal passivo, o cliente entra e lê. Já existe a mensagem pronta de exigência,
que o `copiarMsgExigencia` copia para o WhatsApp.

**O que fazer.** Quando a etapa mudar, gerar o texto pronto para o WhatsApp, no mesmo molde da
exigência, e deixar o envio na mão de quem fala com o cliente. Não construir SMS nem e-mail
automático. Onda pequena, e só depois da etapa existir.

## 8. FINANCEIRO, O LANÇAMENTO PARCELADO E O RECORRENTE (prints 24, 25, 26 e 28)

**O que eles têm.** No lançamento, Pessoa, Processo, Descrição, Valor, Vencimento, Competência,
Pagamento, a marca "apenas registro interno", e a repetição em duas formas, Recorrente, que é
lançamento fixo mensal, ou Parcelado, em que se informa o valor total e o número de parcelas e
o sistema escreve "6 parcelas de R$ 1.000,00". Há ainda gerar cobrança em boleto ou cartão e
anexar arquivo. Uma regra deles merece nota, a competência do lançamento recorrente é sempre
atualizada para o mês atual.

**O que temos.** A aba Honorários guarda os pagamentos do caso. Não há parcelamento automático,
não há competência separada do vencimento e não há recorrência.

**O que fazer.** Só o **parcelamento**, que é o caso real do escritório. Contratado o honorário
em seis parcelas, o sistema cria as seis com vencimento mensal, em vez de alguém lançar uma a
uma. Junto vem a separação entre vencimento, competência e pagamento, que já estava apontada na
parte 1. Recorrente só se houver contrato de mensalidade. Boleto e cartão, não, porque é
integração de meio de pagamento e o escritório não cobra assim. Onda pequena a média.

## 9. INTIMAÇÕES, MONITORAMENTO DE DIÁRIOS (prints 29 e 30)

**O que eles têm.** Monitoramento da OAB e de nomes nos diários oficiais e tribunais
eletrônicos, com a lista das publicações recebidas trazendo processo, data da publicação,
tribunal, responsável e o botão ANALISAR. Filtro lateral por período, cliente, tribunal e
número do processo, e o selo "todos os monitoramentos estão ativos, atualizado hoje".

**O que temos.** Coleta por número de processo, pelo DataJud e pelo PJe, mais a sonda de
tribunais. Não monitoramos publicação por OAB.

**Avaliação honesta.** Monitoramento de diário é serviço comprado de terceiro, não é código. O
ganho específico dele é pegar publicação de processo que não está cadastrado, o que no
previdenciário acontece pouco, porque o caso nasce no escritório antes de existir processo. Não
recomendo obra. Vale a pergunta ao Paulo sobre contratar o serviço, se já aconteceu de perder
publicação de processo não cadastrado.

**O que copiar de graça.** A coluna SITUAÇÃO e o botão ANALISAR, isto é, tratar cada publicação
como item com estado, pendente ou resolvida. Nós já temos o ✔ li nos andamentos do CNJ, falta o
filtro que mostra só o que ninguém analisou.

## 10. ATIVIDADES, OS FILTROS QUE FALTAM NO NOSSO PLANEJADO (prints 31 e 32)

**O que eles têm.** Filtro lateral com Tarefa, Responsável, Origem, Situação, Fase do processo,
Período e Prioridade, mais a caixa "mostrar futuras". Dois valem ser copiados. A **Origem**, com
a opção "que eu recebi", separa o que me atribuíram do que eu mesmo criei. E a **Situação**,
pendente ou resolvida, que eles explicam na própria tela.

**O que temos.** O Planejado filtra por pessoa e por janela de tempo, vencidas, hoje, três dias,
sete dias e todas.

**O que fazer.** Acrescentar ao Planejado o "que eu recebi" e o "mostrar futuras". São dois
filtros e resolvem a pergunta que a equipe faz todo dia, o que caiu no meu colo e o que ainda
não chegou. Onda pequena.

## 11. O QUE NÃO SERVE NESTE LOTE

As fases Marketing, Negociação, Serviços e Consultorias e RH e Financeiro (print 33) mostram
que o CRM deles atende o escritório inteiro, inclusive o comercial. Não é o nosso caso, e
acrescentar fase vazia só suja a barra lateral.

Gerar cobrança em boleto ou cartão dentro do CRM (prints 25 e 28) é integração de meio de
pagamento, com custo e responsabilidade, para um escritório que cobra por transferência.

## 12. ORDEM RECOMENDADA DOS DOIS LOTES, CONSOLIDADA

Primeiro a **etapa** da parte 2, item 6, porque é a peça que falta na arquitetura e porque ela
conserta o portal do cliente, que hoje fala por dedução. Depois o **prazo fatal separado** e o
**cálculo em dias úteis** da parte 1, itens 2.1 e 2.2, sendo que o prazo fatal já foi entregue
na versão 10.10. Depois o **roteiro por espécie** da parte 1, item 2.3, que a etapa deixa mais
fácil, porque cada passo do roteiro termina numa etapa. Depois o **parcelamento de honorários**
da parte 2, item 8, e os **dois filtros do Planejado** da parte 2, item 10. Por último a
**sugestão de tarefas a partir da intimação** da parte 1, item 2.5.
