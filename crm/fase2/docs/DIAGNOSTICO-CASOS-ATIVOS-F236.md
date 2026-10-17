# Diagnóstico dos casos em andamento (F236)

_Como o CRM mostra e conduz os casos que já estão andando: no INSS, no Conselho de Recursos, na Justiça e no pagamento. Teste da versão 11.60 e correções na 11.61, em 17/10/2026._

## A conclusão

O caso ativo tinha os dados certos, mas não se mexia sozinho: a etapa ficava parada (11 de 628 casos abertos tinham etapa), os prazos misturavam alarme falso com prazo escondido, perícias e honorários não fechavam o ciclo, o pré-caso que virava caso perdia o que foi decidido e a sincronização com o To Do desfazia o que a equipe gravava no CRM. Na 11.61 o CRM passou a sugerir a etapa pelos fatos oficiais (com um clique, porque a etapa é o que o escritório declara), tirou os alarmes falsos, lê certo o Conselho, pergunta o resultado da perícia, propõe os honorários na concessão, leva o pré-caso inteiro ao caso, põe no Meu Dia o que cada pessoa tem de fazer, e a sincronização parou de apagar prazo, nome, CPF, espécie e parcela recebida. Dos 55 defeitos graves, 47 estão corrigidos e 8 em parte; nenhum ficou aberto.

## Em números

- 32 clientes fictícios em casos ativos: INSS, Conselho de Recursos, Judicial, Pagamento e situações que atravessam as fases (pré-caso que virou caso, card de aposentadoria, vários casos, cadastro incompleto, prazo fatal, lista pessoal, menções).
- Defeitos graves (A: levam a erro ou fazem perder prazo, direito ou dinheiro): 55. Depois das correções e da rodada final: 47 corrigido, 8 em parte.
- Defeitos que atrapalham (B): 272. Depois das correções e da rodada final: 152 corrigido, 92 em parte, 28 aberto.
- Defeitos de acabamento (C): 103, não conferidos um a um.
- Lacunas do pré-caso ao caso: 17; 10 corrigido, 5 em parte, 2 aberto.
- Erros novos que as correções criaram e ainda estão abertos (A ou B): 4.

## Como o escritório trabalha hoje (banco de produção, 17/10/2026, só contagens)

- **628** casos abertos (fora 132 pré-casos e 2.672 encerrados)
- **11** com a etapa marcada (1,8% dos casos abertos)
- **126** perícias e avaliações já passadas ainda “agendada”
- **1.021** honorários em aberto em casos encerrados
- **89** das 107 menções sem leitura
- **132** pré-casos no Escritório
- **0** casos abertos vindos de pré-caso
- **1** análise de direito registrada
- **404** cards de aposentadoria ativos, nenhum com etapa

## O que se repetia e o que mudou

- **A etapa não anda sozinha. Nenhuma importação (PAT, e-Recursos, PJe, DataJud) mexe nela, o caso nasce sem etapa e a tela mostra duas etapas que discordam: a da placa e a da trilha.** No banco, 11 dos 628 casos abertos têm etapa. Nas telas, as trilhas dizem “Agora: a definir”; quando há etapa, ela costuma ser velha (“perícia realizada” depois da sentença) e é ela que o portal do cliente publica. _Correção:_ Feito: a placa mostra “Sugestão: … (pelo fato de dd/mm) — Aceitar” e avisa “etapa desatualizada”; a lista por fase também avisa; placa, trilha e jornada leem a mesma etapa; mudar de fase limpa a etapa de outra fase; o portal só publica a etapa da fase atual e não a desatualizada. Gravar sozinho continua com o escritório (F119).
- **Os prazos misturam alarme falso com prazo escondido. O vermelho manda impetrar mandado de segurança por benefício já concedido e recorrer de decisão favorável; o visual clássico, que é o padrão, esconde o prazo do recurso; a sugestão do cartão dá outra data para o mesmo ato que o PJe já contou.** É a frente com mais achados graves. A ordem decrescente põe o vencido e o mais próximo no fim do quadro, e os prazos dos tribunais não entram no Meu Dia, no Planejado nem no Calendário. _Correção:_ Feito: o prazo de análise para quando o pedido foi decidido e só conta da perícia confirmada; o recurso especial não se arma em recurso ganho nem em matéria de alçada; o cartão usa a data do PJe; a DCB da sentença ou do acórdão vira a DCB do caso; o visual clássico mostra as mesmas datas; o prazo fatal não apaga mais a fase, a etapa e a fila do TRF3. A ordem decrescente ficou (F145), com o selo “próximo”.
- **A perícia não fecha o ciclo. A que passou continua “agendada” e sem resultado; o aviso já dado ao cliente não é reconhecido; a perícia que só o PJe conhece não vira compromisso; o julgamento do CRPS aparece como “Perícia”.** No banco, 126 perícias e avaliações sociais com data passada continuam “agendada”. _Correção:_ Feito: a perícia que passou pergunta “Compareceu?”, grava o andamento e cria a conferência do resultado; a perícia que só o processo conhece vira “a agendar”; julgamento não é perícia; o falso “cliente avisado” saiu; o aviso em dobro virou um só.
- **Os honorários não acompanham o caso. Concessão, sentença e RPV não abrem o lançamento; a parcela vencida aparece como “próximo vencimento”; a parcela de caso encerrado some; o contrato assinado já anexado não é reconhecido.** No banco há 1.239 lançamentos abertos: 1.021 em casos encerrados, 137 vencidos e 21 com valores de R$ 100 mil a R$ 6,2 milhões, que parecem erro de digitação. _Correção:_ Feito: a concessão propõe os honorários do contrato com um clique; cada parcela é de um caso; valor absurdo fica “conferir valor” fora dos totais; os 30 % sem valor ficam “a calcular” e à vista; o contrato assinado de Documentos é reconhecido.
- **O CRM lê errado o Conselho de Recursos. Acórdão que nega provimento vira “Acórdão publicado”; movimento que não é decisão rearma o prazo do recurso especial, até em recurso ganho; a remarcação da sessão mostra a data antiga; a pauta não vira compromisso nem tarefa de sustentação oral.** As cinco situações do Conselho e a dos três casos cruzados. No banco há dezenas de acórdãos negativos gravados como “publicado”. _Correção:_ Feito: “negar-lhe provimento” é negativa; movimento que só cita acórdão não é decisão; a remarcação mostra a data nova; a pauta propõe o julgamento e a sustentação oral com um clique, só da sessão que vale.
- **O pré-caso que vira caso perde o que foi decidido. O card de Aposentadorias futuras continua vivo e oferece gerar o caso de novo; etapa, análise, desfecho e honorários combinados não passam ao caso.** No banco há 132 pré-casos e ainda nenhum caso aberto vindo de pré-caso; 404 cards ativos, nenhum com etapa. As 17 lacunas estão na seção “Do pré-caso ao caso”. _Correção:_ Feito: o card que virou caso fecha e não oferece gerar de novo; o caso mostra o quadro “Do atendimento” (nos dois visuais); o gerar não apaga notas se a gravação falha; natureza, marcadores e análise passam ao caso; a régua do cadastro conta o que a peça pede.
- **O trabalho não chega a quem faz. O Meu Dia mostra só o hoje e esconde as vencidas da pessoa; as Novidades, por onde entram prazos e perícias, só o Paulo vê; as listas abrem filtradas e em ordem alfabética; o contador da barra conta o escritório inteiro.** Nos quatro cargos lidos, nenhum Meu Dia conduz o dia. No banco, 89 das 107 menções estão sem leitura. _Correção:_ Feito: o Meu Dia de cada pessoa traz as vencidas, os prazos dos tribunais, recurso, exigência, perícia sem confirmação, honorário vencido e card com direito alcançado, de quem responde pelo caso. A barra do colaborador ficou a do To Do (F131).

## Do pré-caso ao caso

1. O card de Aposentadorias futuras não fica sabendo que virou caso: continua vivo e oferece “Gerar o caso” de novo, com risco de caso duplicado. — **corrigido**
2. O desfecho do atendimento é gravado, mas nenhuma tela do caso o mostra. — **corrigido**
3. Quando a análise aponta mais de um benefício a pedir, nasce um caso só, e o registro da decisão não lista os outros. — **em parte**: O [DECISÃO] continua só com a espécie do pré-caso, sem o outro benefício; o aviso é só na hora e não fica registrado.
4. A espécie decidida na Análise de Direito não prevalece sobre a espécie anotada antes no pré-caso. — **corrigido**
5. Pelo Desfecho, o caso nasce sempre no INSS ou em Petições Iniciais; Conselho e Judicial só pela mesa antiga das Anotações. — **aberto**: Oferecer no Desfecho o destino (Conselho, Judicial) quando o atendimento é de recurso ou de ação em curso.
6. Natureza e marcadores do pré-caso não viram campos do caso: ficam só no texto do registro da decisão. — **corrigido**
7. O caso nasce sem etapa, e a etapa velha não é apagada quando a linha muda de fase. — **corrigido**
8. O que o pré-caso guardou (passos do atendimento, honorários combinados, via, cidade, desfecho) fica gravado e invisível no caso. — **corrigido**
9. A Análise de Direito não se liga ao caso: os requisitos, a data do direito e o que veio do primeiro atendimento não aparecem depois que o caso nasce. — **corrigido**
10. Primeiro atendimento e Mapa do dossiê somem; com dois casos, a tela pode mostrar a escolha do atendimento do caso errado. — **em parte**: Não há como rever o Primeiro atendimento e o Mapa de um caso já gerado (só no modo atendimento de pré-caso).
11. As notas do atendimento passam ao caso sem as marcas de pendente, urgente e importante e sem os atribuídos, com o autor achado pelo primeiro nome; com mais de um pré-caso, as notas sem dono ficam para trás. — **em parte**: Com mais de um pré-caso, a nota sem precaso_id fica no cadastro; a nota “⚖️ Análise de Direito registrada” que salvarAnalise grava sem caso continua sem precaso_id.
12. Se a gravação falha no meio, as notas e os pedidos de documentos do cadastro são apagados mesmo assim. — **corrigido**
13. Os documentos pedidos ao cliente perdem a marca de entregue e a data combinada, e pedidos de outro pré-caso vão para este caso. — **corrigido**
14. Anexos de outro pré-caso vão para este caso, e documentos gerados ou assinados podem ficar presos a um caso antigo. — **corrigido**
15. A conferência de procuração e contrato olha o cliente inteiro, de qualquer época, e não exige a via assinada; gerar o caso “assim mesmo” não fica registrado. — **aberto**: Conferir a procuração e o contrato deste atendimento (desde a data do pré-caso, e assinados) e gravar a escolha “assim mesmo”/“sem direito” no desfecho e no [DECISÃO].
16. Os honorários combinados ficam fora do registro da decisão; o ajuste vale por tipo de contrato para todos os casos do cliente; as parcelas se prendem ao primeiro caso aberto naquele momento. — **em parte**: O combinado segue por variante no cadastro (honor_ajuste/honor_estrut), não por caso; sincronizarParcelasHon ainda grava caso_id = primeiro caso não encerrado do cliente (pode ser a linha de outro pré-caso).
17. O modo atendimento não reabre para o caso, e o atendimento continua marcado como aberto depois de gerar o caso. — **em parte**: Reabrir o modo atendimento para um caso sem passar por “↩ não é caso”.

## Sincronização com o To Do

A cada 10 minutos, das 7h às 21h, o To Do é copiado para o CRM, e a escrita do CRM no To Do está desligada. Até a 11.60, o que se marcava no CRM num caso, cliente ou parcela vindos do To Do podia ser desfeito na rodada seguinte, sem aviso. Na 11.61 o CRM vence: o To Do só preenche o que está vazio.

- **Prazo fatal e ⭐.** A sincronização reenvia o prazo e a importância da tarefa do To Do a cada rodada. O prazo fatal ou a ⭐ marcados no CRM num caso vindo do To Do voltam ao valor da tarefa, ou ficam vazios se a tarefa não tem data. Corrigido na 11.61: o prazo e a ⭐ do CRM ficam; o To Do só preenche prazo vazio. _No banco, um caso que o CRM mandou para Tarefas com Prazo está hoje sem prazo e de volta à fase Escritório. O prazo fatal do CRM quase não é usado: há 1 carimbo de prazo e 4 “prazo cumprido”._
- **Nome do cliente.** O nome é regravado a cada rodada com o nome mais longo entre as tarefas do To Do com o mesmo CPF. Telefone e nascimento são preservados; o nome, não. Corrigido na 11.61: o nome do CRM fica; o To Do só preenche nome vazio ou provisório. O CPF e a espécie gravados no CRM também ficam. _Lido no código da sincronização e da migração; não rodado._
- **Parcela recebida.** A parcela marcada “recebido” no CRM volta ao estado do item do checklist 💵 no To Do. Corrigido na 11.61: o To Do só promove a parcela a recebida, nunca a volta a aberto; valor que não parece dinheiro não é gravado, e a senha do checklist vai para a credencial. _Lido no código da migração; não rodado._
- **Fase mudada no Quadro.** Arrastar o cartão no 📌 Quadro muda só a fase; a rodada seguinte devolve a fase da lista do To Do. O arrasto é desfeito em até 10 minutos. _Lido no código; não rodado._
- **Telas que prometem o To Do.** Várias telas dizem que o To Do acompanha o que se faz no CRM, mas a escrita do CRM no To Do está desligada; só a ponte dos cards conclui tarefas. Mover o caso no CRM exige mover a tarefa à mão no To Do, ou a sincronização desfaz. _Lido no código e na configuração da sincronização._
- **Marcas do CRM ignoradas.** A leitura das decisões do CRM (caso movido, números levados, fusões) buscava a carteira inteira numa página só, cortada em 1.000 casos. Corrigido na 11.61: a leitura é só dos casos marcados, paginada. _No banco, 10 das 11 marcas ficavam de fora; uma delas é o caso que voltou ao Escritório sem prazo._

## Por situação

| Situação | A corrigidos | B corrigidos | O que o leitor concluiu antes das correções |
|---|---|---|---|
| inss-pericia-futura | — | 6 de 10 | Conduz em parte. A perícia de 26/10/2026 às 08:40 na APS Ribeirão Preto Centro está à vista, mas o topo dos prazos é um “Prazo fatal” vermelho que só marca a conferência do resultado, e o cartão segue pedindo “Avisar cli… |
| inss-pericia-passada | — | 3 de 5 | Conduz em parte. O prazo de análise (19/11/2026) e a tarefa vencida da Ingrid estão à vista. Mas a perícia de 05/10 que pede “Compareceu” só aparece no Caso completo, a etapa fica vazia, a tarefa vem rotulada como “Compr… |
| inss-bpc-avaliacoes | 1 de 1 | 1 de 5 | Não conduz e induz a erro. Mostra como certo o prazo de análise até 09/01/2027, contado de uma avaliação social de 11/10 que ninguém confirmou. Esconde essa avaliação da visão do caso, sem oferecer “Faltou”, e deixa CadÚ… |
| jef-sentenca-procedente | 4 de 4 | 3 de 5 | Não conduz. A nota do Paulo de 13/10 resume a sentença, mas a ficha a contradiz: etapa “perícia realizada” (que vai ao portal da cliente), DCB “a informar” apesar da DCB de 11/06/2027 fixada na sentença, e o cartão da se… |
| jef-sentenca-improcedente | — | 1 de 4 | Conduz em parte: o prazo de 28/10/2026 está no topo do quadro (e no clássico, em “Lembretes e datas”) e a nota da Amanda traz prós e contras com a tarefa do Paulo para 23/10; mas o cartão da sentença dá outro vencimento … |
| trf3-apelacao-fila | — | 2 de 5 | Conduz: etapa “em recurso” certa, nenhum prazo nosso (correto) e a fila do TRF3 na placa; falta dizer que o recurso é do INSS e que o benefício é pago por tutela, a data da consulta da fila e a previsão (só no title e na… |
| cumprimento-rpv-expedida | 3 de 3 | 5 de 7 | Não conduz: a ficha diz “sentença publicada” e “INSS concedido” num caso com trânsito, cálculos homologados e RPVs expedidas; não há data provável de pagamento, os Honorários dizem “A receber R$ 3.242,00” sem os R$ 16.48… |
| paulo | 2 de 3 | 3 de 5 | Não conduz o dia. O Paulo entra no Meu Dia filtrado por ele: “HOJE 1” (conferir no caixa a parcela 2/3 do Valdir, pedida pela Amanda) e “Delegadas por mim 8”, a melhor parte da tela para quem distribui o trabalho; Mençõe… |
| amanda | 2 de 2 | 0 de 1 | Não conduz. A Amanda entra num Meu Dia que diz “Nada vence hoje e 6 vencidas no Planejado” e mostra só “Delegadas por mim 5”, trabalho que ela passou ao Paulo e à Ingrid. As 6 vencidas dela, entre elas a prorrogação do E… |
| andre | 1 de 1 | 1 de 2 | Não conduz. O André entra num Meu Dia vazio: “Nada vence hoje e 1 vencida no Planejado”, e a vencida é o pedido de receitas do caso da Ingrid; embaixo, uma tarefa que ele delegou à Amanda. O que é dele e está parado, con… |
| rita | 0 de 1 | 3 de 4 | Não conduz. A Rita entra num Meu Dia em “Todos” (ela não tem caso atribuído) com duas tarefas de outras pessoas, o aviso da perícia da Luciana (da Ingrid, útil a ela por acaso) e a conferência de honorários do Valdir (do… |
| geral | 0 de 1 | 4 de 9 | O CRM tem as peças, mas a rotina não as junta. O Meu Dia mostra só o hoje de cada um e esconde o atrasado; o contador da barra é do escritório inteiro; prazos dos tribunais, honorários vencidos, cards de aposentadoria, e… |
| v10-x-classico | 1 de 1 | 2 de 5 | Nenhum dos dois conduz sozinho. O clássico, que é o padrão, é mais denso (33% a 66% menos rolagem), mostra o número do processo, a vara e o próximo retorno no cabeçalho e lista as datas em ordem crescente, mas esconde a … |
| linha-do-caso | 1 de 1 | 3 de 7 | A estrutura é boa (placa com DER, DII, DCB e etapa; jornada de quatro fases; trilha do rito; linha da incapacidade com o “próximo”), mas nas 30 telas ela fala “a definir” em quase tudo, repete o mesmo fato em vários luga… |
| prazos-e-compromissos | 3 de 3 | 3 de 5 | O quadro “Prazos e compromissos” é o melhor elemento do v10: junta recurso, prazo de análise, exigência, PJe, DCB e honorários com “em N d”. Mas a ordem decrescente põe o vencido e o mais perto no fim, os rótulos não diz… |
| andamentos | — | 0 de 5 | O cartão v10 separa bem a equipe das fontes oficiais e mostra a tarefa como faixa legível (“Ingrid · atrasada desde 16/10 · tarefa”). Atrapalham: a decisão oficial é a linha mais apagada da tela, há três sinais de “não l… |
| sub-abas | — | 1 de 4 | As sub-abas têm boas ideias (a Recurso abre com “SITUAÇÃO” e “Copiar situação para o cliente”, o acórdão traz resumo automático, o Caso completo filtra por fonte), mas cada uma tem nome, controles e lugar próprio para as… |
| abas-da-ficha | — | 4 de 6 | As abas da ficha são o que o CRM tem de mais limpo (Honorários, com quatro números e a tabela de lançamentos, é exemplar), mas aparecem e somem conforme o dado, o atalho “Nas outras abas” leva aonde o item não está e Doc… |
| listas | 1 de 1 | 4 de 6 | As listas têm o visual mais limpo e consistente do CRM (Meu Dia e Planejado são bons modelos), mas não trazem os prazos dos tribunais nem recurso, exigência e prazo de análise, abrem com filtros que escondem o que existe… |
| escrita | — | 0 de 1 | A escrita é clara na maior parte (“Ingrid · atrasada desde 16/10 · tarefa”, “Copiar situação para o cliente”), mas carrega jargão do sistema, textos com cara de código, datas em três formatos e instruções que apontam par… |
| inss-exigencia | 1 de 1 | 7 de 8 | Conduz em parte: o quadro 'Exigência do INSS · 13/11/2026 · em 27 d' está em vermelho e as notas de Marcos (15.10) e André (16.10) contam o plano, mas a etapa e a trilha ficam 'a definir' com o PAT em 'Em exigência', a d… |
| inss-mora | — | 3 de 8 | Conduz em parte: a mora está certa e em vermelho (DER 09/06/2026 + 90 dias = 07/09/2026, 'venceu há 40 d') e a troca Marcos/Paulo está no topo, mas a mora fica por último no quadro, ainda diz 'avalie o mandado de seguran… |
| inss-indeferido | 2 de 2 | 1 de 4 | Conduz no visual novo e não conduz no clássico (o padrão): o v10 põe 'Recurso ordinário · 09/11/2026 · em 23 d' no topo e a linha da incapacidade repete o prazo com o NB, mas a fase e a placa dizem 'aguardando perícia' o… |
| inss-concedido | 3 de 3 | 5 de 8 | Não conduz. Num BPC deferido em 12/10/2026, a ficha diz 'INSS · em exigência' e 'Prazo de análise do INSS 21/11/2026', e o que importa agora não aparece: o 1º crédito (até 26/11/2026) e os 30% dos atrasados (≈ R$ 1.864,1… |
| inss-dcb-prorrogacao | 3 de 3 | 4 de 6 | Não conduz. O topo diz 'Mora do INSS · venceu há 30 d' e manda 'avaliar o MS por mora' num B31 concedido em 08/08/2026, enquanto a única ação que importa (pedir a prorrogação, com a janela aberta desde 14/10 e a DCB em 2… |
| avisos-e-mencoes | — | 5 de 10 | Conduz em parte. A perícia de 23/10 às 08:20 está bem marcada e as duas tarefas da Ingrid aparecem nos cartões ('hoje' e 'atrasada desde 13/10'), mas falta o bloco do que é dela agora: os prazos dizem só 'Compromisso', a… |
| crps-aguardando-distribuicao | 0 de 1 | 6 de 7 | Conduz em parte: a aba Recurso diz onde o recurso está (“Aguardando distribuição”, 12ª Junta) e a ficha acerta ao não mostrar “Recorrer até” nem prazo de análise do INSS; mas etapa e trilha estão vazias, pede “DCB a info… |
| crps-diligencia | — | 8 de 10 | Não conduz: o prazo certo (04/11/2026, em 18 d, da notificação de 05/10) está no alto, mas como “Exigência do INSS”; a situação do recurso é a notificação crua do e-Recursos, o que a Junta pediu só se lê na sub-aba INSS,… |
| crps-pauta | 2 de 2 | 3 de 5 | Não conduz e engana: a ficha diz que a sessão é em 21/10/2026 (a data antiga) na situação, nos cartões e nas mensagens à cliente, quando foi remarcada para 23/10/2026 às 09:00; o quadro de prazos está vazio, sem o julgam… |
| crps-acordao-favoravel | 3 de 3 | 5 de 7 | Não conduz. A ficha arma em vermelho “Recurso especial 09/11/2026” e avisa “Da Junta cabe Recurso Especial” num recurso ganho em matéria médica, que é alçada da Junta e decisão definitiva; não diz que o INSS tem de cumpr… |
| crps-acordao-desfavoravel | — | 7 de 9 | Conduz com ressalvas: o prazo do recurso especial (27/10/2026) está certo e no alto, e as anotações do Paulo e da Ingrid dizem o resultado e a decisão a tomar. Mas o sistema chama o acórdão negado de “Acórdão publicado”,… |
| varios-casos | 1 de 2 | 4 de 6 | Não conduz a leitura da pessoa: cada caso aparece isolado e nada avisa que o BPC não se acumula com a pensão nem com o B31, decisão que precisa sair antes do julgamento de 04/11/2026. Nos prazos, a sessão do CRPS vira “P… |
| precaso-virou-caso | 2 de 2 | 5 de 9 | Conduz em parte. A história está na tela: conversa migrada, [DECISÃO], protocolo 1977008841, DER 16/10/2026 e prazo de análise até 14/01/2027. Mas a conversão não fechou o card de Aposentadorias futuras, que segue “Pront… |
| card-apos-pronto | 1 de 2 | 2 de 4 | Não conduz. O direito à aposentadoria por idade existe desde 27/09/2026 (há 20 dias) e a ficha só diz “Pronto para protocolar” num selo bege e “🟡 Sem processo — 1 lembrete ativo”. A ligação do cliente de 14/10 virou anot… |
| cadastro-incompleto | — | 5 de 6 | Conduz em parte. A perícia de 29/10 (12 dias), a DCB de 31/12 e a janela da prorrogação estão à vista, e a anotação do André explica o problema. Mas o caso não avisa que a ficha está sem CPF, nascimento e endereço, não o… |
| pagamento-rpv-paga | 1 de 1 | 4 de 8 | Não conduz. A tabela marca o lançamento como “vencido há 3 dias” e a Cobrança traz a mensagem pronta, mas o alto da tela e o cartão do caso contam outra história (“Pagamento · RPV expedida”, “Próximo vencimento 14.10.202… |
| honorarios-caso-encerrado | 2 de 2 | 4 de 8 | Não conduz. O dinheiro em aberto é do B31 encerrado, mas a ficha o põe no B46 ativo (“Honorários 06/11” nos prazos, quadro Contratado e contrato do B46) e o tira do B31 (“Sem prazos ou lembretes em aberto”); a parcela ve… |
| prazo-fatal-outro | 2 de 2 | 2 de 5 | Conduz em parte. Os dois prazos aparecem (19/10 interno e 21/10 do PJe, também no clássico) e a volta a 👪 Judicial é sugerida pela ronda.prazo_de, mas a linha do caso perde a identidade judicial (“B46 · OUTROS”, sem etap… |
| lista-pessoal | 0 de 1 | 1 de 5 | Não conduz. A ficha trata como caso previdenciário em andamento, com “Prazo fatal 21/10/2026”, uma tarefa da lista pessoal ☕ Ficto (renegociar empréstimo no banco); não diz o que é nem de onde veio, mistura a vida do col… |
| jef-laudo-desfavoravel | 2 de 2 | 8 de 9 | Conduz em parte: o prazo do PJe (30/10) aparece no alto e a anotação do Paulo traz o plano, com a minuta da Amanda (26/10) e a revisão do Paulo (27/10). Mas o cartão do laudo sugere outra data (05/11) para a mesma manife… |
| jef-pericia-designada | 1 de 2 | 3 de 6 | Não conduz. A perícia judicial de 30/10 às 13:40 só existe no movimento do PJe e na anotação do André: a aba Perícias diz “Nenhuma perícia ou audiência marcada”, nada vai à agenda nem ao aviso do cliente, e o prazo de qu… |
| esaj-acidentario | 1 de 1 | 3 de 6 | Conduz pouco. As anotações contam o laudo favorável e a manifestação de 17/09, mas o cartão “Conclusos para Sentença” sugere “Apelação · vence 03.11.2026”, um prazo que não existe. O laudo e os demais papéis da pasta dig… |
| peticao-a-redigir | — | 2 de 6 | Conduz só para quem lê as anotações de baixo para cima: o alto da tela não diz que a inicial está em redação, chama de “Prazo fatal” o prazo interno de 23/10 sem dizer do que é, mostra o INSS como “a vir” e trata a ação … |
| jef-aguardando-citacao | — | 3 de 6 | Conduz em parte: a fase e a etapa (“ação distribuída”) estão certas e a nota de 03/10 explica o próximo passo, mas o quadro de prazos está vazio (sem a contestação do INSS até 26/11 nem o pedido à cliente até 06/11), a t… |
| ms-mora-inss | 1 de 1 | 3 de 5 | Não conduz: o alto da tela chama o MS de “Judicial a vir”, mantém o alarme “avalie o mandado de segurança por mora” e um “Prazo no PJe” vermelho que não pede ação, e não mostra a data que importa (o INSS decidir até 06/1… |

## O que ainda falta

Os defeitos A e B que a última conferência deu como em parte ou abertos, com o que falta.

### inss-pericia-futura

- **B · em parte** · caso · “Compromisso 25/10” não diz o que é nem de quem, e no clássico vira o começo da nota do CNIS: Levar o rótulo do pedido (resumoAgenda) à pílula do clássico e à linha de Lembretes e datas, que ainda usam o começo da anotação (rot = texto.slice(0,70)).
- **B · em parte** · aba:pericias · O “Preparar” abre o roteiro da perícia judicial e, no padrão, duplica a ligação e troca a data do caso: A mensagem ao cliente continua o modelo genérico, sem o que levar a partir dos anexos do PAT (atestado de 90 dias, ressonância, relatório com a indicação de microdiscectomia), receitas e CTPS; o item '📄 Documentos médicos novos' segue genérico.
- **B · em parte** · caso · A placa não diz a DIB provável nem quando começa o prazo de análise, e pede a DCB, que ainda não existe: A DIB provável (18/09/2026, o 16º dia do afastamento, com o pedido em até 30 dias) e não pedir a DCB antes da decisão: o B31 em análise ainda mostra 'DCB a informar'.
- **B · em parte** · cad:analise · A Análise de Direito do caso B31 abre vazia e contradiz o resto da ficha: Ler o CNIS recebido (tempo e carência) no quadro e mostrar a DIB provável.

### inss-pericia-passada

- **B · aberto** · caso · Nada avisa que o atestado de 60 dias termina em 18/10/2026: O lembrete 'o atestado de 60 dias acaba em 18/10: pedir relatório atualizado ao psiquiatra e orientar a cliente a não voltar ao trabalho sem alta', com a data lida do anexo do PAT.
- **B · em parte** · caso · A tarefa vencida da Ingrid aparece como “Compromisso”, sem a próxima conferência nem a data da última coleta do PAT: Propor a próxima conferência pela cadência da nota (de 2 em 2 dias: 19/10) no Reagendar; 'última coleta do PAT: 11/10' na placa; o rótulo do pedido no clássico.

### inss-bpc-avaliacoes

- **B · aberto** · caso · O campo diz “CadÚnico a informar”, e a data está no dossiê: Preencher 'CadÚnico 31/03/2026 · vale até 31/03/2028' de dossie.cadunico.familia.atualizada_em (do dossiê, a confirmar) e marcar o passo da trilha; estender a caixa e o lembrete de 24 meses ao B87.
- **B · aberto** · caso · DID “a informar” e o impedimento de longo prazo sem fonte, com o relatório do HC no dossiê: Preencher a DID do caso pelo relatório do HC ('03/2024, do dossiê, a confirmar') e dizer 'impedimento há mais de 2 anos (LOAS, art. 20, § 10)', como o PRE_DOSSIE já faz na Análise de Direito.
- **B · em parte** · aba:pericias · A avaliação social que passou não tem “Faltou” nem a ligação ao marido, e não aparece na visão do caso: Nada propõe ligar ao marido, que é quem atende ('📞 Avisei o marido…' de 23/09): o CRM não guarda esse contato nem o oferece no Confirmar.
- **B · em parte** · cad:analise · A renda da LOAS não aparece em lugar nenhum do caso, e o motor que já a calcula certo fica desligado: A renda da LOAS à vista na placa e na Análise: R$ 0,00 por pessoa no grupo de Benedita e do marido, sem a aposentadoria de 1 SM do marido de 67 anos (LOAS, art. 20, § 14), limite de R$ 405,25, e o aviso de que os R$ 810,50 do CadÚnico não são a renda da LOAS.

### jef-sentenca-procedente

- **B · aberto** · sub:tudo · O Caso completo repete o mesmo fato e marca tudo como novo: 5.354 px de rolagem para 22 registros.: Dobrar o espelho do CNJ no movimento do PJe do mesmo dia, pôr no cartão da perícia o link do laudo em vez do trecho e separar “não lido” de “pede ação”. As duas frentes deixaram o Caso completo sem dono.
- **B · em parte** · caso · Quadro de prazos em ordem decrescente e com rótulo genérico: o compromisso vencido fica embaixo e não diz o que é nem de quem.: Na coluna o cartão continua cortado em “Amand…” (a bolinha e o “venceu há 3 d” comem o rótulo; só a linha PRÓXIMO ganhou a segunda linha): o que fazer só se lê no title e no “saber mais”.

### jef-sentenca-improcedente

- **B · em parte** · caso · Nada estruturado diz que houve sentença improcedente nem que há uma decisão pendente.: Selo ou frase de decisão pendente (“Sentença improcedente de 13/10 — Paulo decide se recorre até 23/10; recurso inominado vence 28/10”); e o prazo com o nome do recurso (“Recurso inominado”), que segue “PJe: Sentença”.
- **B · em parte** · caso · Quadro de prazos sem o que é cada data e com a mais próxima embaixo.: O prazo continua sem dizer “recurso inominado (sentença improcedente)”; a tarefa de 23/10 continua solta do prazo de 28/10 (não aparece como lembrar-antes dele).
- **B · em parte** · classico · No clássico, o gesto natural “⏰ é o prazo do caso” tira o caso da fase Judicial, e a lembrança da decisão vem cortada.: A lembrança ainda corta no meio da palavra (“o juiz neg”, 70 caracteres) e o efeito do “⏰ é o prazo do caso” segue só no title.

### trf3-apelacao-fila

- **B · aberto** · caso · O órgão onde o processo está não aparece, e o campo guardado está velho.: Atualizar o órgão pelo movimento do 2º grau ou por casos.trf3 (guardando o anterior) e mostrar “TRF3 · 10ª Turma · Gab. 31 · concluso desde 30/04/2026”.
- **B · em parte** · caso · Fila sem a data da consulta e sem a previsão na tela.: A previsão e o selo “prioridade” cabendo na placa; o “era 395º em 19/06”, o gabinete e a turma; um “copiar mensagem” à vista (hoje só no title). Nenhuma frente mexeu na placa.
- **B · em parte** · caso · Nenhum lugar diz que a sentença foi procedente, que a apelação é do INSS e que o benefício é pago por tutela.: Dizer na etapa ou na placa que a apelação é do INSS e pôr o selo “benefício pago por tutela desde 27/02/2026” com o alerta ao cliente (CPC, art. 1.012, § 1º, V; Tema 692/STJ; Tema 709/STF).

### cumprimento-rpv-expedida

- **B · em parte** · caso · O passo esperado (mover para Pagamentos) esconde o caso da aba Casos e não ajusta a etapa.: Manter o caso em Pagamentos no Casos ▾ (grupo “💰 Pagamentos”) também para o cliente com mais de um caso.
- **B · em parte** · caso · A trilha diz que a execução está “a vir”.: Marcar a implantação (04/09, nota da Amanda) e a homologação dos cálculos (25/09, “Proferidas outras decisões”).

### paulo

- **A · em parte** · novidades · As 84 novidades, por onde entram os prazos e as perícias, ficam escondidas em “Mais 22 visões” e chegam misturadas com ruído.: O informativo segue solto por dia (HOJE abre com “Requerimento recebido…” e “Situação registrada: Em análise” da Cleusa); as decisões não foram separadas; os prazos do topo não dizem o responsável; e os 7 “Prazos dos tribunais”, contados entre os 9 que pedem ação, ainda trazem o Ato Ordinatório de 21/10 da Rosângela Albuquerque (respondido em 11/10) e os atos favoráveis (sentença da Rosângela Siqueira, liminar do Sebastião Moura).
- **B · em parte** · acervo · A revisão do acervo diz “último registro: nunca” para casos mexidos nesta semana e, em produção, conta andamento de robô como revisão.: Em produção o gatilho caso_tocado (crm/fase2/schema.sql) segue carimbando casos.revisado_em a cada andamento inserido, inclusive de robô (PAT, CRPS, PJe, DOU), e ultimoRegistro lê revisado_em: o movimento do robô ainda tira o caso da fila como se fosse revisão.
- **B · em parte** · patinss · Importar não diz quando cada portal foi lido nem quem deve rodar a extensão.: Dizer quem deve rodar a extensão; a barra acender quando a fonte fica velha (hoje conta só coleta esperando); a linha das últimas leituras segue sem poder ser vista nas telas.

### amanda

- **B · em parte** · minhas · Atribuídas a mim (20) em ordem alfabética, com os atrasados espalhados e selos que não dizem a ação.: A linha da Aparecida Barreto continua a tarefa (“os 30% dos atrasados dependem só da Aparecida: acompanhe o pagamento combinado para…”), sem o valor nem “cobrar R$ 14.620,96”, que só aparece no Meu Dia, em linha separada.

### andre

- **B · aberto** · barra · O estagiário não tem Perícias & Audiências, e a “Agenda” da barra dele é outra coisa.: Decisão do advogado sobre Perícias & Audiências na barra do estagiário; renomear “Agenda” (atendimento presencial).

### rita

- **A · em parte** · agenda · A perícia judicial que só o PJe conhece fica fora de Perícias & Audiências.: O prazo de 28/10 continua “Ato Ordinatório (10 dias)”, sem dizer que é de quesitos e assistente técnico (a frente agenda registrou “não corrigido”: o texto do ato só se lê com a ficha aberta); o dia 30 do Calendário fica sem a perícia até alguém clicar na proposta.
- **B · em parte** · meudia · O Meu Dia da recepção abre em “Todos” e o link das vencidas leva a uma tela que ela não tem.: Não há a fila de retornos a dar (a Luciana ligou em 11/10 e em 16/10 sem retorno).

### geral

- **A · em parte** · calendario · Os prazos dos tribunais não entram em agenda nenhuma: só nas Novidades, que só o Paulo vê, e dentro do caso.: Nada marca “só acompanhar”: a sentença procedente da Rosângela Siqueira (27/10) e a liminar do Sebastião Moura (30/10) seguem como prazo vermelho no Planejado, no Calendário, nas listas (“Prazo PJe 27/10”, “Prazo PJe 30/10”) e nas Novidades; o de 21/10 da Rosângela Albuquerque, já respondido, segue em “Prazos dos tribunais (7)” das Novidades. Depende também da resposta do advogado sobre o “só acompanhar”.
- **B · em parte** · planejado · A linha da agenda não diz o que fazer: repete a primeira frase do comentário (Planejado) ou não diz nada (Calendário).: “19/10 Rosângela Ficta Albuquerque, A declaração de não acumulação precisa falar do B31 em discussão no JEF e do BPC em…” ainda engole o “confere antes de ela assinar?”; “22/10 Luzia…, temos 30 dias para o recurso especial à Câmara de Julgamento · revisa” e “27/10 Marlene…, laudo desfavorável… · revisa” seguem pela primeira frase; o prazo fatal sem motivo continua só o título (“19/10 Osvaldo Ficto Pereira, Aposentadoria especial · Prazo fatal”, e o mesmo em 23/10 Valdir e 27/10 Joaquim).
- **B · em parte** · fase-inss · As listas abrem filtradas por quem entra e a barra conta o escritório todo; “meu” tem três definições.: O Escritório do Paulo continua “mostrando 0 de 0 · Nenhum cliente aqui.” com a barra “Escritório 1” (o Sebastião, cujo card é do Paulo, não é atendimento dele por doAtendimentoDe); card, atendimento, lista e agenda ainda usam regras diferentes de dono.
- **B · em parte** · fase-judicial · As listas por fase não ajudam a trabalhar a carteira: ordem alfabética, sem etapa, sem situação nem prazo da fase.: Sem seções pela situação. Tarefas com Prazo segue “18/10 Osvaldo…, manifestar… · Prazo PJe 21/10 · em recurso”, sem o selo do prazo fatal de 19/10; Petições, “20/10 Valdir…, amanda, redija a inicial…”, sem o prazo fatal de 23/10; no Conselho a Luzia (“decidido (desatualizada)”) não mostra o recurso especial até 27/10.
- **B · em parte** · acervo · Rotinas, conferências e filas do acervo prometem o Meu Dia, mas só o Paulo as vê, no Cuidar do acervo.: “Sem próxima ação”, “mais de um caso aberto”, os recursos fora do robô (blocoCrpsManual) e o CadÚnico seguem só no Cuidar do acervo do Paulo, sem dono no Meu Dia de ninguém.
- **B · em parte** · minhas · Cliente com três casos que dependem um do outro aparece em listas diferentes, com duplas diferentes, sem aviso.: A dependência entre os casos (o BPC não se acumula com a pensão e com o B31, a decidir com a cliente antes de 04/11) não vira pendência do advogado na lista nem no Meu Dia; só o quadro do recurso na ficha avisa.

### v10-x-classico

- **B · aberto** · personas/jef-laudo-desfavoravel/caso.jpg · O v10 tira da placa o número do processo, a vara e a distribuição: Número principal (processo, NUP ou protocolo, e o NB) formatado, com copiar, logo abaixo do título da placa, e a vara. Ficou sem dono nesta rodada (RELATO da agenda: “sem dono · a placa e a jornada”).
- **B · aberto** · personas/inss-pericia-futura/caso.jpg · O v10 gasta de 33% a 66% mais rolagem que o clássico para o mesmo conteúdo, por excesso de caixas: A passada de densidade (cartão sem moldura, ações no ⋯ ou ao passar o mouse, data só no cabeçalho do dia). Nenhuma frente pegou.
- **B · em parte** · personas/prazo-fatal-outro/caso.jpg · O v10 achata a hierarquia do prazo fatal e perde o “prazo cumprido” que o clássico tem: Lembretes recuados sob o prazo a que servem (o “↳ LEMBRAR” do clássico), o prazo do tribunal na mesma linha do interno (“19/10 nosso · 21/10 TRF3”) e o prazo fatal voltar a dizer o ato (“Manifestar sobre a proposta de acordo”).

### linha-do-caso

- **B · em parte** · personas/jef-sentenca-improcedente/caso.jpg · A trilha judicial rola para o lado e esconde a parte em que o caso está: Centrar na etapa gravada ou sugerida e, sem elas, no passo cumprido de data mais recente, e não no último cumprido da ordem da trilha.
- **B · em parte** · personas/inss-pericia-futura/caso.jpg · O alto da ficha é ocupado por uma faixa vazia: Trilha recolhida quando não há etapa, com “Parece estar em: … — confirmar”, e a frase de situação, próximo passo e prazo mais perto no alto.
- **B · em parte** · personas/inss-indeferido/caso.jpg · A melhor frase da tela está recolhida e só existe para incapacidade: O “Próximo” sob o título da placa, dizendo o passo do caso (na RPV, aguardar o pagamento até ~01/12) e não a data mais perto.
- **B · em parte** · personas/inss-pericia-futura/caso.jpg · O mesmo fato aparece em quatro lugares da coluna, sem dizer o que falta: Tirar de “Nas outras abas” (e do resumo) o que já está no quadro; pendurar a ligação da véspera (André, 25/10) na linha da perícia.

### prazos-e-compromissos

- **B · em parte** · personas/jef-laudo-desfavoravel/caso.jpg · O quadro diz o tipo da data, não do que ela é: O cartão em duas linhas (rótulo inteiro) também nas linhas finas; o mesmo rótulo da tarefa e da revisão na ficha e no Planejado; “Manifestar sobre o laudo” só no ato que manda manifestar.
- **B · em parte** · personas/inss-exigencia/caso.jpg · A cor diz a natureza da data, não a urgência: Fundo e borda pela contagem de dias (vencido, até 3, até 10, depois); a natureza só no ícone ou na palavra.

### andamentos

- **B · aberto** · personas/inss-indeferido/caso.jpg · A decisão do INSS é o item mais apagado da linha do tempo: Decisão e exigência como marco com a cor do estado (vermelho no indeferido, âmbar na exigência).
- **B · aberto** · personas/inss-pericia-futura/sub-inss.jpg · A ação genérica é o elemento mais forte da tela: Botões do cartão em estilo secundário ou no ⋯; cheio só quando há prazo ou agendamento sugerido.
- **B · em parte** · personas/crps-acordao-desfavoravel/caso.jpg · Três sinais de “não lido” que se contradizem: Um modelo só de novidade (o mesmo no PJe e no PAT) e o contador igual ao número de selos.
- **B · em parte** · personas/inss-pericia-futura/caso.jpg · Hora falsa “12:00” em toda anotação vinda do To Do: Esconder a hora 12:00 do To Do também no Caso completo (fatosDoCasoTodo).
- **B · em parte** · personas/inss-pericia-futura/sub-tudo.jpg · O mesmo fato repetido na linha do tempo: Não gravar o aviso do CRM quando o comentário do PAT já diz o mesmo e dobrar as situações repetidas.

### sub-abas

- **B · em parte** · personas/inss-pericia-futura/sub-inss.jpg · “✓ fase encerrada” parece estado e é botão: “🗄 arquivar” dizer o que arquiva e, marcada, a faixa “Fase encerrada em …”.
- **B · em parte** · personas/crps-pauta/sub-recurso.jpg · O número fica no pé da sub-aba, cru e diferente do alto: O cabeçalho comum (número formatado, com copiar, no alto) também nas sub-abas Judicial e INSS.
- **B · em parte** · personas/inss-pericia-futura/sub-tudo.jpg · Caso completo abre com três fileiras de controles e contadores que não batem: Uma fileira de filtros, sem zeros e com a contagem certa (segue sem dono).

### abas-da-ficha

- **B · em parte** · personas/jef-laudo-desfavoravel/cad-documentos.jpg · Documentos é o mesmo formulário para todo cliente, com tudo em botão primário: Um botão primário por bloco (papel já assinado em estilo secundário) e consultas, anexos da IN 128 e site interno recolhidos; a frente docs registrou como não corrigido.
- **B · em parte** · personas/card-apos-pronto/aba-apos.jpg · O card de Aposentadorias futuras é um painel de botões sem hierarquia: Ações de aviso e as demais no ⋯ ou em estilo secundário; uma ação só para as notas antigas.

### listas

- **B · em parte** · visoes/paulo/fase-inss.jpg · O contador da barra não bate com a lista que abre: Contar com o filtro da abertura (ou dizer na barra o que o número conta) e acertar o Escritório “1” × “0 de 0”.
- **B · em parte** · visoes/paulo/barra.jpg · Paulo não vê “Tarefas com Prazo” na barra, e cada um vê nomes diferentes: “Tarefas com Prazo” fixa na barra do administrador.

### escrita

- **B · em parte** · personas/prazo-fatal-outro/caso.jpg · Rótulos do sistema no lugar da linguagem do escritório: A tabela única de rótulos para os que restam.

### inss-exigencia

- **B · em parte** · caso · A conta que decide o pedido só está numa nota de agosto: No topo do caso: idade 63 de 62 ✓, carência 166 de 180 ✗, 232 com o vínculo da tecelagem ✓ e o aviso de que, sem o vínculo, o pedido será negado por carência.

### inss-mora

- **B · aberto** · sub:inss · A unidade do comprovante, que define a autoridade coatora, não aparece: Na placa, 'Onde está: CEAB Reconhecimento de Direito · SR I (comprovante de 09/06/2026), conferir no PAT'.
- **B · aberto** · sub:tudo · 'Pede ação' só mostra rotina: A situação repetida do PAT e o 'Requerimento recebido' como rotina; a tarefa aberta (Marcos · 20/10) e a mora vencida em 'Pede ação'.
- **B · em parte** · caso · A mora cita o acordo sem a ressalva de vigência e sem o reforço legal: O Tema 350/STF, item I (interesse de agir quando excedido o prazo legal de análise), que a frente deixou de fora por falta de conferência.
- **B · em parte** · caso · O caso não diz que o MS está travado pelo cadastro: Ligar a falta de CPF e nascimento ao MS (a inicial exige os dois) e listar no quadro da mora a prova pré-constituída: comprovante do requerimento, telas do PAT e CNIS.
- **B · em parte** · caso · Rótulos que não dizem o que é: 'Compromisso' e tarefa da equipe chamada de documento: No MS, rotular pela tarefa do Marcos ('preparar o MS: completar CPF e nascimento, conferir exigência nova, juntar comprovante e tela do PAT'); no indeferido, dizer 'recurso à Junta ou JEF'; os rótulos no clássico.

### inss-indeferido

- **B · aberto** · caso · O risco de limbo não é sinalizado: Alerta de limbo também sem CNIS (pela nota da equipe ou pelo vínculo informado), no topo do caso: orientar o cliente a se apresentar à empresa com o resultado e pedir o exame de retorno, e registrar a resposta.
- **B · em parte** · caso · Só o recurso é proposto, com a escolha ainda em aberto: As saídas lado a lado no próprio caso (Linha da incapacidade e quadro) enquanto a escolha não está registrada, com a ação no JEF com perícia por ortopedista (Tema 350/STF, item I) e o pedido novo.
- **B · em parte** · sub:inss · O laudo pericial que decide não está à mão nem ligado à perícia: O laudo no topo do caso (placa, quadro ou Linha da incapacidade) e o confronto com a ruptura parcial do supraespinhal da ressonância e com a desossa com os braços elevados.

### inss-concedido

- **B · aberto** · sub:tudo · 'Pede ação · 9' conta avisos velhos e já resolvidos: Não lido anterior à última mudança de situação (ou já resolvido) deixar de pedir ação e o 'Novo' cair; 'Pede ação' só com o que pede ação hoje (o 1º crédito em 06/11 e a parcela de 11/11).
- **B · aberto** · aba:honorarios · Lembrete de cobrança desligado e parcelas soltas do 1º crédito: Ligar o lembrete nas parcelas que já existem e, ao registrar o 1º crédito, oferecer mover a parcela 1 para o mês dele.
- **B · em parte** · caso · A concessão vira linha cinza de sistema, com o peso de 'Situação registrada: Em análise': O marco no alto do caso ('Concedido em 12/10/2026 · NB 715.334.209-5 · R$ 1.621,00 · DIB 19/06/2026 · DIP 12/10/2026') e tirar o peso de sistema da linha da concessão.

### inss-dcb-prorrogacao

- **B · em parte** · sub:inss · O INSS ensinou como pedir a prorrogação, e o aviso ficou 70 dias 'não lido', sem virar tarefa: A tarefa datada nascida do comentário (pedir a prorrogação de 14/10 a 28/10, presa à DCB, com responsável) e o comentário deixar de ficar não lido por 70 dias.
- **B · em parte** · aba:honorarios · Os honorários não mostram que o 4º ao 6º benefício dependem da prorrogação: O valor em jogo (3 × R$ 436,86 = R$ 1.310,58) no 'saber mais' da linha da DCB ou da prorrogação.

### avisos-e-mencoes

- **B · aberto** · caso · As duas ligações da cliente não viram retorno pendente: A anotação da recepção com ligação e pedido de retorno criar a tarefa de retorno para quem atende, com a data do dia, e juntar a segunda ligação à primeira ('aguarda retorno desde 11/10 · 2 ligações').
- **B · em parte** · caso · Não há um bloco 'o que é seu agora'; as pendências da Ingrid estão em quatro lugares: Faixa 'Para você' com o que é de quem abre, em ordem de urgência, com a origem e quem pediu (Paulo 17/10, Marcos 08/10) e o retorno à cliente (Rita, 11/10 e 16/10); concluir ali fechando tarefa, menção e aviso.
- **B · em parte** · caso · Os prazos dizem só 'Compromisso': nem o quê, nem de quem: Nome curto do que fazer em cada linha ('Juntar no PAT o relatório do psiquiatra · vencida'), sem o nome repetido: o resumoAgenda tem de reconhecer a anotação que começa com '@Nome,'.
- **B · em parte** · caso · Menção, tarefa e 📞 são três controles do mesmo aviso, e só parte deles conversa: Ler a menção não fecha a tarefa nem o aviso, e o aviso dado por outra pessoa (a recepção, pelo cartão) conclui o 📞 da Ingrid mas deixa a menção dela sem leitura (baixarMencoes só baixa a de quem clica): falta o gesto único que feche os três para todos.
- **B · em parte** · aba:pericias · O roteiro 'Preparar' trata a perícia do INSS como perícia judicial (pelo código; o roteiro não foi capturado): Listar no roteiro as tarefas abertas do caso (relatório do psiquiatra com CID, tempo e medicação; relatório da internação no HC; receitas; declaração do CAPS; documento com foto) e responder que a mãe pode acompanhar.

### crps-aguardando-distribuicao

- **A · em parte** · caso · Nada avisa que o acórdão da Junta será definitivo, e a ficha vai armar prazo de recurso especial que não cabe: O aviso de alçada na tela do caso ou na trilha (a frente agenda passou à docs, que não tratou). Com alçada só “provável” (sem parecer da PMF nos autos), o acórdão negativo ainda arma “Recurso especial”.
- **B · em parte** · sub:tudo · Cada movimento do e-Recursos aparece duas vezes e “Pede ação” conta o que não pede nada: “Pede ação” ainda não aponta a tarefa da Ingrid nem o relatório a juntar até 27/10 (os 4 são da Fase 1, INSS). O Caso completo ficou sem dono nas duas frentes.

### crps-diligencia

- **B · em parte** · cad:documentos · A lista para a cliente é a genérica do rural, não a da diligência: Usar o pedido inteiro (o comentário do PAT, que pedidoDaDiligencia já lê para a aba Recurso) em itens separados — papéis dela ou do marido de 11/2010 à DER, autodeclaração atualizada, nome, endereço e CPF das testemunhas — com o aviso de que os papéis do pai só valem até 2012.
- **B · em parte** · sub:inss · O que a Junta pediu só se lê na sub-aba INSS, de fase encerrada: A mensagem cola o texto do PAT como veio (“requerente”, “DER”, “Justificação Administrativa”), sem linguagem simples nem o aviso dos papéis do pai, e diz à cliente que “a resposta tem de ser entregue até 04/11/2026”, e não a data em que o escritório precisa dos papéis.

### crps-pauta

- **B · em parte** · caso · O que mais chama a atenção é o CadÚnico, não o julgamento: Deixar o CadÚnico discreto e propor a data pela nota de 26/03 (“CadÚnico atualizado este ano”) ou por dossie.cadunico.familia.atualizada_em (ficou sem dono).
- **B · em parte** · sub:tudo · Quatro cartões com a mesma data errada e “Pede ação” sem a única ação que importa: Fazer o “Pede ação” ou o prazo sugerido do Caso completo apontar a sustentação oral (até 20/10); o PRAZOS_CATALOGO ficou sem o item por decisão da frente (conta para trás da sessão).

### crps-acordao-favoravel

- **B · em parte** · caso · Falta o prazo do INSS para cumprir o acórdão: A Linha da incapacidade continua “próximo: Pedir a prorrogação a partir de 01/12/2026” e pula o cumprimento de 09/11; a subtarefa GET 1987654321 não vai à linha.
- **B · em parte** · caso · Cadastro mínimo sem aviso: sem CPF, sem nascimento e sem senha do Meu INSS, e a tarefa é conferir no Meu INSS: Pedir a senha ou o acesso ao Meu INSS junto da tarefa de conferir no Meu INSS (a frente docs deixou para depois).

### crps-acordao-desfavoravel

- **B · aberto** · classico · Os documentos que o Paulo mandou pedir não viram “Documentos solicitados”, e nada marca a janela de 24 meses: Oferecer gravar os itens pedidos em Documentos solicitados com a data da tarefa (20/10) e a janela de 24 meses antes do óbito, avisando que o plano funerário de 08/2023 fica fora da janela e que fotos não são início de prova material.
- **B · em parte** · caso · A decisão a tomar (RE × JEF até 22/10) e o pedido de documentos (20/10) aparecem só como “Compromisso”, e o mais próximo fica por último: Na linha do Paulo, a decisão (“Decidir: recurso especial ou ação no JEF · 22/10”, a frase da nota que cita a data); na da Ingrid, a janela de 30/01/2024 a 30/01/2026.

### varios-casos

- **A · em parte** · caso · Nenhuma tela junta os três casos nem avisa que o BPC não se acumula com a pensão nem com o B31: A faixa “Casos desta pessoa” com o aviso de acumulação (o BPC não se acumula com o B31 nem com a pensão; a pensão se acumula com o B31) à vista nos três casos, e a tarefa de decidir com a cliente, antes de 04/11, o que o recurso do BPC ainda busca.
- **B · em parte** · caso · O prazo do laudo segue vermelho e pendente, mas a manifestação já foi protocolada: Tirar o prazo respondido do PRÓXIMO e do “Próximo:” do topo (é registro, não o passo seguinte); sem outro compromisso, o quadro deveria dizer “nada à frente”.
- **B · em parte** · caso · Etapas paradas nos três casos: No JEF, propor “aguardando sentença” (laudo juntado em 05/10 e manifestação protocolada em 11/10); a frente docs não fez, para não deduzir etapa de petição juntada.

### precaso-virou-caso

- **B · aberto** · cad:analise · “Desempregado” para quem é facultativa e só parou de pagar: Rotular “sem contribuir desde 07/2026 (última: facultativa 11%, 06/2026)” em vez de “Desempregado” (recolheDe/rotRecolhe); docsDaAnalise aceitar o valor do cenário (R$ 1.621,00).
- **B · em parte** · cad:analise · A análise que gerou o caso aparece sem os requisitos que gravou: O quadrado não diz qual é o “1 a informar” nem leva ao campo.
- **B · em parte** · cad:documentos · Documentos não sabe que o caso nasceu e foi protocolado: As 📄 de Pendências do caso (CTPS antiga e comprovante) continuam sem data (📅 vazio); a lista de providenciar segue à parte delas, com “Imprimir e registrar o pedido”.
- **B · em parte** · classico · No visual padrão some o prazo de análise: O botão continua oferecido em caso com protocolo e DER (acoesDoCaso só olha a fase e o pré-caso).

### card-apos-pronto

- **A · em parte** · cad:analise · O recado do cliente ficou sem destinatário: O recado já gravado não vira menção; a sugestão só acrescenta o @ (não cria tarefa com data para o retorno).
- **B · em parte** · cad:analise · A Análise começa do zero apesar do card e da análise antiga: Medir com a análise de 30/04/2024 e o card (filiado antes de 13/11/2019, 212 contribuições, 17 anos e 8 meses) ou dizer que falta ler o CNIS.
- **B · em parte** · aba:apos · Os avisos D-90 e D-60 venceram sem dono: Responsável gravado no card (lembretes.responsavel_id só nasce no “Passar ao advogado”); antes do direito, o item do Meu Dia com a lista do D-60; dizer na tela quem pede os documentos.

### cadastro-incompleto

- **B · aberto** · aba:pericias · A perícia não é preparada para o que se pede: o acréscimo de 25%: Marcador “com acréscimo de 25%” no caso; “Preparar” com o roteiro (texto da decisão, quesito da assistência permanente, declaração de quem ajuda no banho e para se vestir, relatório do neurologista e exames do AVC, aviso ao cliente e à filha); a filha Cristiane em Parentes ou amigos.

### pagamento-rpv-paga

- **B · em parte** · aba:honorarios · O lançamento dos 30% não mostra a base nem a data do contrato, e o CRM não aceita lançar honorário já vencido.: A linha mostrar a conta (30% de R$ 48.736,52, bruto da RPV) e o vencimento do contrato (09/10/2026, recebimento da RPV) ao lado da data combinada (14/10); a mensagem de cobrança levar a conta e a cláusula.
- **B · em parte** · aba:honorarios · Fora da ficha, nada leva a Amanda (atribuída) ao vencido com o valor.: Dizer que o “Lembrar em” é a cobrança (e juntar as três linhas); o botão da mensagem na linha do Meu Dia; na ficha, “lembrar 3 dias antes de cada vencimento” segue desmarcado e o “Lembrar em 14/10/2026” sem cor de vencido.
- **B · em parte** · cad:identificacao · A ficha não avisa que a cliente deve R$ 14.620,96, e a filha que responde por ela não está no cadastro.: Selo no cabeçalho com o valor e a ação (“💰 R$ 14.620,96 vencido há 3 dias — cobrar”) para quem atende no balcão; propor cadastrar a filha Simone (citada no andamento de 16/10) em Parentes, com telefone.
- **B · em parte** · cad:documentos · Documentos trata o caso em Pagamentos como pedido novo e não reconhece o contrato assinado.: Mostrar a requisição e o comprovante do depósito (hoje só citados: “chegam pelos autos”) e oferecer o recibo de honorários e a notificação de cobrança.

### honorarios-caso-encerrado

- **B · em parte** · aba:honorarios · A aba se apresenta como do B46 e mostra o combinado do B46, mas as três parcelas são do acordo do B31.: Um quadro por caso (lançamentos, totais e combinado do B31 juntos; os do B46 à parte) ou abrir a aba no caso que tem o dinheiro.
- **B · em parte** · aba:honorarios · Contrato e destaque valem para o cliente, não para o caso.: O B46 deixar de herdar “não pedido” (deveria ser “a pedir na expedição”); o contrato de 31.12.2024, do acordo do B31, ir ao bloco do B31, e o bloco dizer qual contrato é o dele.
- **B · em parte** · aba:honorarios · A Cobrança convida a cobrar uma parcela contestada, sem a conferência pedida.: Estado “em conferência” na 2/3, ligado à menção da Amanda e à tarefa do Paulo (conferir o caixa de 11/06), e a mensagem só depois da conferência.
- **B · em parte** · caso:2 · O caso encerrado não aceita anotação, e a cobrança dele foi parar no B46.: Levar a nota ao B31 (ou o “Levar a outro caso…” sugerir o B31 quando a nota cita o B31).

### prazo-fatal-outro

- **B · aberto** · caso · A decisão do cliente vai sem os números que mudam a escolha.: Quadro do acordo: 60 salários mínimos (R$ 97.260,00), precatório ou renúncia ao excedente para receber por RPV, líquido do cliente depois dos 30% com e sem acordo, as cláusulas que pedem decisão (sucumbência de 10% e renúncia ampla) e a mensagem ao cliente com o termo de decisão.
- **B · em parte** · caso · Os prazos não dizem do que são nem que se referem ao mesmo ato.: Ligar os dois prazos do mesmo ato (interno 19/10 e do tribunal 21/10) e a origem (despacho de 13/10 no PJe 2º grau, ciência 14/10); o cartão do despacho no Judicial continua sem o prazo e sem o [PRAZO] do Marcos, e oferece “Criar tarefa ou prazo”.
- **B · em parte** · caso · Os honorários do escritório não aparecem no caso nem na conta do acordo.: Os honorários na conta do acordo (30% de R$ 151.470,00 = R$ 45.441,00, contra R$ 50.490,00 sem acordo; 3 benefícios depois da implantação) e o lembrete de juntar o contrato antes da requisição, para o destaque.

### lista-pessoal

- **A · em parte** · caso · Um lembrete pessoal vira caso em andamento com prazo fatal.: Não criar o caso: crm/fase2/migrar.py segue com fase “outro” para toda lista fora de LISTA_FASE com CPF (linhas 195-199) e importa o “Concluir em” como prazo; nenhuma frente assumiu (o relato da agenda o deixou sem dono).
- **B · aberto** · classico · Não há saída que sirva e que fique.: Saída “Não é do acervo previdenciário”, com motivo, gravada como marca em casos.arquivados e respeitada por aplicar_marcas_do_crm.
- **B · aberto** · caso · A vida do colaborador entra na ficha da cliente.: Não importar blocos da lista pessoal; enquanto isso, um “não é deste cliente” no ⋯ que leve a nota às Minhas Tarefas do autor.
- **B · aberto** · caso · Trabalho para a cliente sem contrato e fora da matéria do escritório.: Opção “demanda não previdenciária” nos serviços (BENEF), com contrato de serviço avulso e caso próprio, ou indicação a parceiro, e a decisão registrada.
- **B · em parte** · caso · O caso não diz o que é nem de onde veio.: Dizer que é lista pessoal do To Do, fora do fluxo, e oferecer “tirar do acervo” ou “passar a demanda não previdenciária”; no clássico, o título da tarefa no lugar de “Benefício não definido”.

### jef-laudo-desfavoravel

- **B · em parte** · caso · Prazos e compromissos não dizem o que é cada data e vêm em ordem decrescente: Na coluna os rótulos continuam cortados (“Manifestar sobre o l…”, “Paulo revisa: p…”, “Amanda: prepa…”, “Confirmar …”); as tarefas de 26 e 27/10 seguem soltas do prazo de 30/10 (não viram filhas dele).

### jef-pericia-designada

- **A · em parte** · caso · O prazo de quesitos e assistente técnico (28/10) não diz de que é, não tem responsável e não chega a nenhuma agenda: Dizer quesitos e assistente técnico também na agenda; um responsável sem depender do roteiro do agendar (botão de atribuir no cartão); a base (Lei 10.259, art. 12, § 2º) e a ciência de 14/10 no “saber mais”.
- **B · em parte** · caso · A pergunta do André ao Marcos sobre quesitos e assistente não aparece como pendente: Pendência com data-limite (antes de 28/10), respostas rápidas (quesitos sim/não, assistente sim/não) que criem as tarefas, e visibilidade para quem não é o Marcos (passado à frente rotina).
- **B · em parte** · caso · Cliente com ação no JEF e CPF em branco, sem aviso no caso: Sugerir o CPF da parte autora a partir do PJe (a coleta não o grava; a frente docs deu como não corrigido).
- **B · em parte** · caso · O catálogo de prazos dá 15 dias para quesitos, mas no JEF previdenciário são 10: Escolher o item “Quesitos e assistente técnico (JEF)” pelo número do processo (mv.jef) e dizer quesitos no cartão; o “Criar tarefa ou prazo” ainda oferece o item do CPC (15 dias) ao lado.

### esaj-acidentario

- **B · aberto** · sub:judicial · A pasta digital do e-SAJ fica solta: o laudo do IMESC não está no movimento “Laudo Pericial Juntado”: Casar documento e movimento do e-SAJ pela data e pelo nome e mostrar a conclusão do laudo no movimento e na perícia (ficou sem dono).
- **B · aberto** · caso · Falta a frase da situação, e a aba que abre não mostra que o processo está concluso: A frase da situação no alto (“Laudo do IMESC favorável (02/09) · manifestação em 17/09 · concluso para sentença desde 09/10”).
- **B · aberto** · caso · A linha do caso não diz o que se pede no B94: Rotular “DCB do B91”, mostrar “DIB pedida 17/11/2024” (Lei 8.213, art. 86, § 2º) e preencher a consolidação pela DCB ou pelo laudo.

### peticao-a-redigir

- **B · em parte** · caso · O quadro de prazos não diz do que é cada data e chama de “Prazo fatal” o prazo interno do To Do: Na coluna o cartão vermelho de 23/10 mostra só “eu reviso em 2…”, o pedaço que fala da revisão, e não do protocolo; falta “protocolar a inicial no JEF” à vista no próprio cartão.
- **B · em parte** · caso · A jornada diz “INSS a vir” e “Conselho a vir” num pedido indeferido em 28/08 em que se decidiu não recorrer: A petição inicial como passo entre INSS/Conselho e Judicial (a trilha dela segue dentro do Escritório).
- **B · em parte** · sub:judicial · A ação de 2024 de outro advogado é tratada como processo do caso, e nada diz que a inicial precisa declará-la: Tirar o processo de outro advogado de “principal”, do cabeçalho da aba e das fases; esconder “Copiar situação” e “Mensagem ao cliente” nele; selo “ação anterior: declarar na inicial (Lei 8.213, art. 129-A, I, d)”. A frente docs deu como não corrigido.
- **B · em parte** · caso · Não há a conferência do art. 129-A da Lei 8.213 nem os papéis da inicial reunidos; Documentos manda “marcar um benefício”: A conferência do art. 129-A (I-a a I-d e II), cada item ligado ao anexo ou à nota que o cumpre, ou marcado como falta.

### jef-aguardando-citacao

- **B · aberto** · caso · Nada aponta o provável direito atual à aposentadoria por idade: No caso de incapacidade com 62 anos (mulher) ou 65 (homem), avisar do provável direito à B41 (EC 103, art. 18) e pedir o CNIS; o pedido no INSS não prejudica os atrasados da ação (Tema 1.018/STJ).
- **B · aberto** · sub:tudo · Cada movimento do PJe aparece duas vezes no Caso completo: Juntar no painelTudo o espelho do CNJ ao movimento do PJe da mesma data e do mesmo tipo (ficou sem dono).
- **B · em parte** · caso · A trilha do JEF não tem o passo atual e está na ordem errada para este juízo: A contestação antes da perícia na trilha deste juízo (despacho de 02/10); a frente docs deu como não corrigido.

### ms-mora-inss

- **B · em parte** · caso · A data que importa, o INSS cumprir a liminar até 06/11/2026, não está no quadro, e os seis cartões não dizem do que são: O cartão do Marcos deve dizer o que ele faz em 07/11 (conferir o cumprimento da liminar e decidir o pedido de multa); a repetição semanal do André não aparece.
- **B · em parte** · caso · As duas trilhas não aparecem: “Judicial a vir” com o MS em curso, o INSS sem etapa e o MS escondido no ➕: A trilha do MS abaixo da do INSS (impetração 04/09, liminar 07/10, informações, parecer do MPF, sentença) e o número do MS na placa (ficou sem dono).

## Erros novos ainda abertos

- **B · aberto** · crps-acordao-desfavoravel|caso|a linha da revisão do paulo (22/10) repete o pedido feito à ingrid, e não a decisão entre recurso especial e jef: Na revisão, usar a frase da nota que cita a data da revisão (fraseDaData, como já se faz no prazo fatal) e só na falta dela o pedido feito a quem executa.
- **B · aberto** · prazo-fatal-outro|personas/prazo-fatal-outro/caso.jpg|o prazo fatal passou a se chamar “o nosso é 19.10.2026.”: Cortar só em frase inteira e, quando a frase da data não disser o ato, usar a primeira frase da anotação (“Manifestar sobre a proposta de acordo…”); sem “eu”/“nosso” no rótulo.
- **B · aberto** · varios-casos|personas/varios-casos/caso.jpg|o prazo já respondido é o próximo do quadro, com contagem regressiva: Respondido em cinza, sem PRÓXIMO nem “em 4 d”, fora do resumo e da seção das Novidades que pede ação; o resumo dizer o que vem (aguardar a sentença).
- **B · aberto** · cadastro-incompleto|personas/cadastro-incompleto/caso.jpg|a trilha passou a abrir em “citação e contestação” e esconde a perícia designada, onde o caso está: Centrar na etapa gravada ou sugerida e, sem elas, no passo cumprido de data mais recente.

## Para o advogado decidir

- **Prazo fatal.** A data “Concluir em” do To Do deve continuar virando “Prazo fatal” em vermelho, mesmo quando só marca uma conferência, como o resultado de uma perícia? _Opções:_ Manter: toda data do To Do é prazo fatal · Prazo fatal só com o carimbo ⏰ ou quando o texto fala em protocolar, recorrer, manifestar ou cumprir; o resto vira compromisso com o motivo · Chamar de “prazo interno” e reservar “fatal” ao prazo processual
- **Visual.** Desligar o visual clássico, que é o padrão e esconde o prazo do recurso, e ficar só com o visual novo enxugado? _Opções:_ Um visual só: o novo, com a densidade do clássico · Manter os dois e levar ao clássico todas as datas do novo
- **Etapa.** O CRM pode propor a etapa sozinho pelos fatos (PAT, e-Recursos, PJe) e gravá-la com um clique? A etapa é o que o portal do cliente mostra. _Opções:_ Propor e esperar o clique · Gravar sozinho, avisar e permitir desfazer · Continuar só à mão
- **Prazo de análise do INSS.** Usar a contagem do acordo do RE 1.171.152 (da perícia feita, pausada na exigência, retomando com no mínimo 30 dias)? O texto do acordo não está na base de normas e a vigência tem ressalva. _Opções:_ Usar o acordo como hoje · Mostrar só como referência, sem vermelho · Basear o aviso na Lei 9.784, art. 49
- **Prorrogação.** Qual o último dia para pedir a prorrogação: a DCB, como hoje, ou a véspera (IN 128, art. 339, § 3º: nos 15 dias que antecedem a DCB)? E o CRM pode abrir a tarefa e mandar a mensagem ao cliente sozinho quando a janela abre? _Opções:_ Véspera da DCB, com tarefa e mensagem automáticas · Véspera da DCB, com tarefa automática e mensagem pelo advogado · DCB, como hoje
- **Novidades.** O Paulo continua triando todas as novidades, ou cada uma vai direto ao atribuído do caso e ficam com ele só as decisões e o que não tem dono? _Opções:_ Direto ao atribuído; o Paulo vê o que ficar sem dono · O Paulo continua triando tudo
- **Prazo do tribunal sem ato nosso.** O CRM pode marcar sozinho como “só acompanhar” o prazo do tribunal que não pede ato do escritório, como sentença favorável, liminar concedida ou expediente já cumprido? _Opções:_ Sim, com o motivo à vista · Só o advogado marca
- **Honorários.** Para o CRM lançar sozinho: os “6 primeiros benefícios” contam meses de prorrogação e de reativação? Os 30% dos atrasados valem também para pagamento administrativo? O destaque fica registrado no processo, e não no cliente? _Opções:_ Fixar as três regras no contrato padrão · Lançar só o que é certo e perguntar o resto ao advogado
- **Quando vai a Pagamentos.** O caso passa a 💵 Pagamentos na concessão ou na RPV expedida, ou só depois do primeiro crédito? Hoje, ao passar, ele some da aba Casos. _Opções:_ Só depois do primeiro crédito · Na concessão, e a aba Casos passa a mostrar a fase Pagamento
- **Cobrança.** Quem cobra o honorário vencido (o atribuído do caso, a recepção ou o Paulo) e quem pode ver valores? _Opções:_ O atribuído do caso cobra; valores só para advogados · A recepção cobra com roteiro; o Paulo vê tudo · Só o Paulo
- **Sustentação oral no CRPS.** Quando o recurso entra em pauta, o CRM cria sempre a tarefa da sustentação (oral, memoriais ou vídeo, até 3 dias úteis antes da sessão), ou só quando o advogado pede? _Opções:_ Sempre, e o advogado dispensa · Só quando pedida nas razões ou pelo advogado
- **Aposentadorias futuras.** Quem responde pelos 404 cards ativos: um advogado por card, um advogado para a carteira inteira, ou a recepção com revisão do advogado? _Opções:_ Um advogado por card · Um advogado para a carteira · Recepção com revisão do advogado
- **Cargos.** A recepção vê Aposentadorias futuras e o Planejado? O aviso de perícia vai por padrão à recepção ou ao estagiário do caso? O estagiário pode marcar “faltou” e pedir o reagendamento sozinho? _Opções:_ Recepção avisa e vê os cards; estagiário marca e o advogado aprova o reagendamento · Tudo pelo estagiário do caso, recepção só com avisos na ficha
- **O que não é previdenciário.** Tarefas de listas pessoais do To Do, como “Renegociar empréstimo do banco”, saem do acervo? O escritório atende essas demandas com contrato e caso próprios, ou indica parceiro? _Opções:_ Sair do acervo e indicar parceiro · Atender com contrato de serviço e caso próprio
- **Parcelas falsas já gravadas.** Cerca de 580 “parcelas” de honorários vindas do checklist do To Do são, na verdade, senha (125), CPF (213), telefone (75), aniversário, protocolo, “Padrão” e parceria; as senhas aparecem na aba Honorários. A sincronização já não cria novas. Apagar as já gravadas (só as abertas e nunca tocadas no CRM)? _Opções:_ Apagar (ligar LIMPAR_PARCELAS_FALSAS=1 na sincronização) · Esconder da aba sem apagar · Deixar como está
- **Gravações ao abrir a ficha.** Na 11.61, abrir a ficha grava sozinho a DCB fixada numa sentença, acórdão ou carta (com a fonte), a natureza do caso gerado antes da F236 e a marca de etapa desatualizada. Manter assim ou pedir confirmação? _Opções:_ Manter (grava uma vez, com a fonte) · Pedir um clique antes de gravar
- **Conferência do resultado da perícia.** Depois do “Compareceu”, a tarefa de conferir o resultado nasce para o dia útil seguinte (INSS) ou em 15 dias (judicial). São esses os prazos do escritório? _Opções:_ Manter · Outros prazos
- **Robô do CRPS de linha de comando.** O robô que grava o e-Recursos fora do CRM (robo-crps) ainda usa as regras antigas do tradutor e grava como “app”. A tela já relê ao abrir; atualizar o robô também? _Opções:_ Atualizar o robô · Deixar a tela corrigir

## Como foi feito

Montamos 32 clientes fictícios num servidor de demonstração do CRM 11.60, cada um numa situação real de caso em andamento: 8 no INSS, 5 no Conselho de Recursos, 10 na Justiça, 2 no pagamento e 7 que atravessam as fases (pré-caso que virou caso, card de aposentadoria vencido, cadastro incompleto, vários casos, menções, prazo fatal, tarefa pessoal). Cada cliente tem um gabarito escrito antes do teste: o que a ficha deveria mostrar e propor naquele dia.

Fotografamos 173 telas dos clientes (o caso no visual novo e no clássico, as sub-abas, as abas da ficha e o cadastro) e 32 telas da rotina de quatro pessoas da equipe: Paulo, Amanda, André e Rita.

Doze leitores leram as telas contra o gabarito: dez por grupo de situações, um pela rotina de cada cargo e um pelo visual. Cada leitor olhou com cinco lentes: quem pega o caso hoje, o especialista da fase, as ligações com o resto da ficha, o desenho da tela e o que o CRM poderia resolver sozinho. Prazos e artigos foram conferidos na base de normas quando possível; o que não foi conferido está dito no próprio achado.

Gravidade: A leva a erro, faz perder prazo, direito ou dinheiro, ou mostra informação falsa; B atrapalha, porque confunde, esconde o que importa ou obriga a trabalho dobrado; C é acabamento.

O contexto vem de quatro mapas do código (do pré-caso ao caso; etapas e prazos; ligações do caso; rotina do escritório) e das contagens do banco de produção em 17/10/2026, feitas só para leitura e sem dado de cliente.

Os achados A e B foram divididos em sete frentes de correção: etapa, prazos, perícias, honorários, Conselho de Recursos, pré-caso e rotina. Oito frentes corrigiram em paralelo, cada uma na sua cópia do CRM e com teste próprio (etapa, prazos, Conselho, honorários, pré-caso, perícias, rotina e a sincronização com o To Do); as correções foram juntadas, a suíte inteira passou e as telas foram fotografadas de novo. Doze conferentes marcaram cada achado como corrigido, em parte ou aberto e apontaram os erros novos que as correções criaram; uma rodada final corrigiu os erros novos e os graves que tinham ficado em parte, e quatro conferentes reconferiram os pendentes nas telas finais.

Três decisões do Paulo foram respeitadas e não contam como defeito: a ordem decrescente dos prazos (F145), a barra do colaborador igual às listas do To Do (F131) e a etapa declarada pelo escritório (F119), que o CRM só sugere. As listas por fase abrem filtradas na pessoa, por decisão de 17/10/2026.
