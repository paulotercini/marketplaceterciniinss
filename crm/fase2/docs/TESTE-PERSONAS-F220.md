# Teste do CRM por persona (F220, versão 11.48)

O CRM atingiu **100 de 100 pontos** no teste por persona (`testes/cadastro/f220.js`), depois das correções desta entrega, e a suíte de tela fechou com os 142 testes verdes, inclusive os quatro que falhavam desde antes da F220 (`cnj71`, `consulta`, `extracoes` e `paineis`), cujas asserções estavam presas a telas e datas antigas. O ponto mais grave encontrado era estrutural, porque o atendimento corria por três caminhos paralelos (Triagem, mesa das Anotações e modo atendimento) e a menção do cliente novo não levava a lugar algum; os dois problemas foram corrigidos, e o que ainda pesa é a convivência da mesa antiga com a tela de atendimento.

## 1. Como o teste foi feito

O teste roda no navegador (Chromium, no computador e no celular de 390 px) contra um banco simulado que guarda estado (`banco-simulado.js`), com dados fictícios. Quatro pessoas usam o sistema na mesma rodada, cada uma no seu cargo, a recepcionista Bruna, a advogada Amanda, o advogado Marcos e o Paulo como sócio, e dois clientes inventados atravessam o fluxo, um cliente novo e um cliente com vários casos misturados pelo To Do.

| Seção | O que se mede | Pontos | Nota |
|---|---|---|---|
| 1 | Recepção cadastra e avisa | 8 | 8 |
| 2 | Advogada abre o atendimento | 12 | 12 |
| 3 | Desfecho e formação do caso | 14 | 14 |
| 4 | INSS, Conselho, Judicial e Pagamento | 16 | 16 |
| 5 | Cliente de vários casos | 24 | 24 |
| 6 | Matérias por benefício | 12 | 12 |
| 7 | Divisão de tarefas | 8 | 8 |
| 8 | Integridade visual | 6 | 6 |

## 2. Cliente novo, do atendimento ao pagamento

**O fluxo ficou contínuo.** A recepção cadastra o CPF, a ficha nasce, Amanda e Paulo recebem a menção "abrir o atendimento", e o botão da menção abre a tela cheia já no Primeiro atendimento. Antes da F220 a menção pedia "dar seguimento na triagem", o clique levava à ficha sem destino, e o colaborador escolhia entre Triagem, Anotações e o "+ atendimento" sem saber qual valia. Sem dossiê, o Primeiro atendimento mostra o relato da recepção e deixa o benefício para o advogado escolher, quando antes marcava sozinho a incapacidade.

**O CRM auxilia nos pontos que decidem o caso.** O Desfecho sugere gerar o caso quando a análise o justifica, pergunta antes de criá-lo sem procuração e contrato gerados e, no benefício por incapacidade, pede a via (administrativa ou judicial) para o caso nascer na lista certa. O protocolo anotado no caso do Escritório leva o caso ao INSS com a etapa "requerimento protocolado"; com a DER, os quadros mostram o prazo de análise do acordo homologado no RE 1.171.152; a exigência ganhou rótulo próprio e sai com a decisão, que arma o prazo do recurso ordinário; protocolado o recurso, o prazo some; o acórdão contrário da Junta arma o recurso especial; no judicial o prazo administrativo de 30 dias não aparece, e a trilha registra que houve Conselho. Na sentença, a janela de encerramento lança os honorários em Pagamentos e mantém o caso no Judicial para o cumprimento; paga a RPV, o caso vai a Pagamentos e o CRM pergunta se abre o caso seguinte.

**O que ainda pode melhorar na estrutura** é retirar a mesa antiga das Anotações e a Triagem depois que a equipe adotar a tela de atendimento, porque hoje as duas registram a mesma coisa por caminhos diferentes.

## 3. As matérias por benefício

As matérias estão relacionadas a cada benefício pelo catálogo `BENEF`, e a Análise de Direito abre só os quadros que a espécie pede. O teste encontrou e corrigiu cinco lacunas. Faltava a aposentadoria por idade da pessoa com deficiência (LC 142), que entrou com 60 anos para o homem e 55 para a mulher e 15 anos de contribuição na condição (art. 311 da IN 128). A carência não dizia quais benefícios a dispensam nem a isenção do art. 196, II, e passou a trazer os arts. 195, 196, 198 e 199. O auxílio-reclusão não pedia nem media a baixa renda, que agora sai da média dos 12 salários anteriores ao mês da prisão, comparada ao valor da portaria (art. 383), com campos que só aparecem nessa opção. A aposentadoria especial ganhou as regras dos arts. 260 a 262 e a nota da ADI 6309, e a CTC do regime próprio passou a apontar o Anexo IX da Portaria MTP 1.467/2022 (art. 70). O comprovante de residência deixou de exigir validade, porque o art. 32, § 2º, III, admite o endereço por declaração.

Os números dos requisitos (`IDADE_EXIG`, `CAR_EXIG`, `ADM_CALC`) vêm das skills da base e dos artigos conferidos acima; a tela continua avisando que o cálculo é de apoio e não substitui a conferência.

## 4. Benefícios por incapacidade com vários casos

**O CRM responde em parte.** Quatro peças cobrem o ciclo de cessação e novo pedido. A janela de encerramento pergunta, depois do resultado, se abre o caso seguinte do mesmo cliente, que é o ciclo comum da incapacidade. O Desfecho pede a via de cada novo pedido. O organizador liga ao caso certo o processo judicial e o recurso que citam o NB de outro caso, e junta as cascas duplicadas. A seção "Pedidos ao INSS" da Análise de Direito lista cada NB com DER, resultado e laudo pericial.

Falta uma linha do tempo única da incapacidade, com DIB, DCB, pedido de prorrogação, novo NB e a ação que discute cada cessação, lida de todos os casos do cliente. É o próximo passo recomendado para esse público.

## 5. Anotações e comunicação da equipe

**As anotações funcionam e chegam a quem foi citado.** A tela de atendimento tem a "Conversa da equipe", que grava a anotação no atendimento e transforma o @nome em menção para a pessoa; a menção abre o caso ou o atendimento de que trata. No caso, a anotação tipada (protocolo, exigência, petição, decisão) muda a fase, a etapa e os prazos sozinha, e a tarefa atribuída aparece em "Atribuídas a mim" e no Meu Dia do responsável, na data marcada. A equipe consegue se entender pelo CRM, desde que a conversa do atendimento fique na tela de atendimento e a do caso fique no caso, o que a interface agora conduz.

## 6. Cliente que já tem caso

Abrir um caso novo ou uma análise para quem já é cliente segue o mesmo caminho do cliente novo, pelo "+ atendimento", e a tela abre direto mesmo quando o cliente tem vários processos, porque a janela de escolher o processo deixou de bloquear o atendimento. A ficha de quem tem caso em andamento mostra Identificação, Documentos e Análise de Direito, com a procuração, o contrato e o que falta ao caso à mão. A Análise de Direito traz o que o dossiê já tem e o que foi levado do Primeiro atendimento.

## 7. Recepção

**A recepção ficou fácil de entender**, porque a barra lateral passou a depender do cargo. A recepcionista vê Meu Dia, Menções, WhatsApp, Calendário, Agenda, Atribuídas a mim, Particulares, Rotinas, Escritório, Tarefas com Prazo, Perícias e audiências e Novo cliente, sem as listas de processo que não usa, e o cargo `recepcao` foi aceito no banco. No Novo cliente, Voltar e Inserir CNIS passaram a botões secundários, o rodapé diz quem será avisado e deixou de prometer tarefa no To Do. Uma parte se liga à outra pela menção, que é o único passo que a recepção precisa dar depois do cadastro.

## 8. Advogado colaborador

**O CRM permite a divisão de tarefas.** A tarefa criada no caso, com responsável e data, chega ao colaborador em "Atribuídas a mim" e no Meu Dia, e a barra do advogado inclui Aposentadorias futuras, Análise de Direito e Perícias e audiências. O colaborador entende o Primeiro atendimento, a Análise de Direito e os Documentos pela tela de atendimento, que mostra os quatro passos, quem concluiu cada um e quando; entende o caso pela trilha, que marca INSS, Conselho e Judicial pelo que de fato aconteceu, e pelos quadros de prazo, que dizem qual prazo é cada um.

## 9. Clientes com mais de um caso

O organizador (`Organizar os casos`) mostra, para cada caso do cliente, o NB, o protocolo, o recurso (NUP) e o processo judicial, e sugere o que fazer quando o mesmo número está em dois casos ou quando o texto de um caso cita o NB de outro. Levar um número a outro caso leva junto os andamentos, os documentos e as tarefas desses andamentos, o histórico do e-Recursos e as consultas do processo; juntar dois casos deixa a casca encerrada. Essas decisões ficam gravadas em `casos.arquivados`, e a sincronização com o To Do passou a respeitá-las, de modo que a próxima rodada não desfaz a organização. O "Cuidar do acervo" lista os clientes com mais de um caso aberto, primeiro os que têm número repetido, e o cliente sai da fila quando marcado como organizado.

## 10. O que foi corrigido nesta entrega

Foram corrigidos a menção que não levava ao trabalho, a janela de escolher o processo que travava o atendimento, a pré-seleção de incapacidade sem dossiê, o cabeçalho do atendimento que transbordava no celular, a trilha que dizia "Conselho não houve" quando houve, a regra visual que deformava toda etiqueta de benefício, o prazo de recorrer que aparecia no judicial e depois do recurso protocolado, o protocolo que a sincronização apagava, o caso movido que a sincronização devolvia, a casca juntada que reabria, as cinco lacunas de matéria descritas na seção 3 e um emoji que restava na aba Documentos. Dez testes antigos foram atualizados para o comportamento novo, e o teste por persona ganhou a passagem por Pagamento. Na integração contínua, o portão da publicação não passava desde 30/08/2026 (o site seguia no ar pela publicação direta da pasta `docs`), e hoje o reprovavam três testes da ponte do WhatsApp, que carregavam a biblioteca do WhatsApp ao abrir o arquivo, e os quatro testes antigos; a ponte passou a carregá-la só quando conecta, o teste do áudio se dispensa quando o ffmpeg não está instalado, o f219 passou a esperar a gravação em vez do relógio, e cada prova que falhar na integração passa a aparecer pelo nome na página da rodada. Com isso, a suíte de tela e o portão da publicação voltaram ao verde na integração contínua em 13/10/2026.

## 11. O que fica e o que não foi verificado

Ficam a mesa antiga das Anotações e a Triagem ao lado da tela de atendimento, o texto das tarefas do To Do com os números misturados (o CRM corrige a sua cópia, e o To Do continua como está) e a ponte estreita de volta ao To Do, que passa a concluir tarefas de cards na próxima sincronização publicada e desliga com `PONTE_CARDS=0`. As marcas do organizador só produzem efeito na próxima rodada da sincronização, e as listas de documentos das 16 páginas do site institucional mudaram para o catálogo.

Não foi verificado o acórdão da ADI 6309 no portal do STF (a fonte é o IBDP). Os prazos de análise do acordo do RE 1.171.152 para os benefícios por incapacidade e a suspensão durante a exigência foram conferidos depois, no texto do acórdão, e entraram na versão 11.49 (F221): 45 dias para a incapacidade temporária e a permanente e 60 para o auxílio-acidente, contados da perícia, com a contagem suspensa pela exigência e retomada com pelo menos 30 dias.

## Fontes

IN PRES/INSS 128/2022, texto consolidado, arts. [32](https://iurisprudencia.com.br/inss/normas/in-128/art-32), [70](https://iurisprudencia.com.br/inss/normas/in-128/art-70), [196](https://iurisprudencia.com.br/inss/normas/in-128/art-196), [260](https://iurisprudencia.com.br/inss/normas/in-128/art-260), [311](https://iurisprudencia.com.br/inss/normas/in-128/art-311) e [383](https://iurisprudencia.com.br/inss/normas/in-128/art-383), e dos anexos da Consulta, arts. [69](https://iurisprudencia.com.br/inss/normas/in-128/art-69), [105](https://iurisprudencia.com.br/inss/normas/in-128/art-105), [115](https://iurisprudencia.com.br/inss/normas/in-128/art-115), [281](https://iurisprudencia.com.br/inss/normas/in-128/art-281), [527](https://iurisprudencia.com.br/inss/normas/in-128/art-527), [534](https://iurisprudencia.com.br/inss/normas/in-128/art-534) e [669](https://iurisprudencia.com.br/inss/normas/in-128/art-669). ADI 6309, segundo o [IBDP](https://www.ibdp.org.br/?p=20801).
