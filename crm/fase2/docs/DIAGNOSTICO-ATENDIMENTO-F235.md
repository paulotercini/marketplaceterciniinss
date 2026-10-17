# Diagnóstico do atendimento por espécie (F235)

_Teste do atendimento do CRM em 31 espécies de benefício e serviço, com dois clientes fictícios por espécie: um com direito e um com o obstáculo típico. As telas foram lidas por 31 leitores, cada um com cinco lentes, e por 15 especialistas da base de conhecimento; depois de cada rodada de correção, uma conferência refez a leitura defeito por defeito. CRM 11.60, 17 de outubro de 2026._

## A conclusão

O catálogo de requisitos estava certo; o defeito estava em outro lugar. A Análise de Direito não usava o que o dossiê já trazia (o relatório do médico, as certidões, a carteira de trabalho, os papéis da roça, o PPP), e por isso deixava requisitos a informar, escondia prazos que estavam correndo e acabava sugerindo arquivar. Oito serviços também não tinham caminho próprio. Depois de duas rodadas de correção, o motor lê o dossiê e preenche o que ele responde (marcado para confirmar com a pessoa), o quadro Tempos nasce proposto, os serviços viraram opções com requisitos próprios e o Desfecho segue o prazo. Dos 244 defeitos graves, 219 estão corrigidos e 24 em parte; dos 485 que atrapalham o atendimento, 395 estão corrigidos. O que falta é sobretudo acabamento: listas de documentos ainda longas, alguns textos e a pré-marcação dos benefícios na escolha.

## Em números

- 31 espécies e serviços, 62 clientes fictícios (um com direito e um com o obstáculo típico em cada).
- Defeitos graves (A: levam a erro ou fazem perder direito): 244. Depois das correções, 219 corrigidos, 24 em parte, 1 aberto.
- Defeitos que atrapalham (B): 485. Depois das correções, 395 corrigidos, 69 em parte, 20 abertos e 1 sem como conferir na tela.
- Defeitos de acabamento (C): 283, não conferidos um a um.
- Pontos para o advogado decidir: 43.

## O que se repetia em todas as espécies, e o que mudou

- **A Análise de Direito não usava o que o dossiê já tinha** (22 espécies: incapacidade, acidente, pensão, reclusão, maternidade, PcD, isenção de IR). Um leitor do relatório médico (afastamento, acidente, sequela, definitivo, diagnóstico) e das certidões (óbito, prisão, nascimento) pré-preenche a análise e mostra de onde veio cada dado. Feito nesta rodada.
- **Prazos correndo ficavam escondidos** (B31, acidente, B32, pensão, B93, reclusão, recurso, cópia, justificação, revisão, regularização). O prazo vira requisito em vermelho, com a data e os dias que faltam, e aparece no alto e no Desfecho. Já aparecem os 30 dias do B31 e os 90 dias da pensão e da reclusão.
- **Oito serviços sem caminho próprio** (CTC, isenção de IR, regularização (GPS), B93, restabelecimento, cópia, justificação, seguro-defeso). Cada serviço ganha opção própria, já marcada pelo pré-caso, com requisitos, desfecho, documentos e contrato.
- **O Desfecho sugeria arquivar** (16 espécies). Quando falta resposta, o Desfecho diz qual. Com prazo correndo, nunca sugere arquivar. Arquivar pede confirmação. Aposentadorias futuras fica disponível sempre que houver data provável.
- **'Direito desde' soava como atrasados** (aposentadorias e BPC). A tela passa a dizer que o pagamento começa no dia do pedido (Lei 8.213, art. 49) e que cada mês sem pedir se perde.
- **O CNIS lido como se a pessoa fosse sempre a segurada** (pensão, reclusão, rural, pesca, servidor). Na pensão e na reclusão contam a qualidade e as contribuições de quem morreu ou foi preso. O segurado especial do CNIS não é 'empregador'. O cargo público (PRPPS) não é pendência.
- **Contribuições que não valem eram contadas como certas** (idade, transição, CTC, acerto, regularização). A tela separa o que o INSS conta hoje do que passa a contar depois do acerto: o vínculo com PEXT, o carnê de 11 % (que só vale para tempo e CTC complementado) e o de 5 % sem CadÚnico válido.
- **O quadro Tempos nascia vazio** (professor, especial, conversão, PcD, híbrida). Os vínculos do CNIS entram com a natureza que o dossiê mostra: magistério pela RAIS, especial pelo PPP, PcD depois da data de início da deficiência.
- **A lista de documentos vinha sem filtro** (todas). Filtrar o catálogo pela área médica e pela categoria do segurado. Casar o 'já temos' pela especialidade. Usar contrato e declarações próprios de cada serviço. Marcar a entrega antes do prazo.
- **Cartões da escolha com sinal falso** (todas). A incapacidade só aparece com documento médico (feito). O BPC exige 65 anos ou sinal de deficiência. O auxílio-acidente comum não pede ligação com o trabalho. Os sinais que faltavam passam a existir: certidão de óbito, de nascimento e da prisão, RAIS de professor, papel rural, servidor.
- **Vínculo sem data de saída tratado como erro** (17 espécies). Emprego atual, auxílio-doença em curso, limbo e cargo público não são pendência, e a tela nunca sugere a baixa do vínculo.
- **Um dependente só na pensão e na reclusão** (pensão, B93, reclusão). Uma linha por dependente, com o prazo (90 ou 180 dias), a cota e a duração de cada um.
- **Data de nascimento embaralhada e texto cru do HC** (todas). Corrigidos nesta rodada: a data aparece certa na ficha e nos documentos gerados, e o resumo do HC vira frase, com as frases que decidem inteiras.

## Por espécie

| Espécie | A corrigidos | B corrigidos | O que o leitor concluiu na primeira leitura |
|---|---|---|---|
| B31 · Auxílio por incapacidade temporária | 11 de 11 | 8 de 11 | Não conduz: o Primeiro atendimento lê certo o CNIS e os relatórios do HC, mas a Análise de Direito do B31 não usa o que está na tela (pede a data do afastamento, o CID e o atestado que o dossiê já tra… |
| B32 · Aposentadoria por incapacidade permanente | 11 de 11 | 8 de 12 | Não conduz: o Primeiro atendimento lê bem o dossiê, mas a Análise de Direito nega a aposentadoria por invalidez a quem tem direito ('Ainda não… é caso de B31', porque só ouve o laudo do INSS, que no a… |
| B91/92 · Benefício acidentário | 3 de 4 | 17 de 21 | Não conduz bem: com CAT no dossiê o CRM acerta a espécie e os requisitos do auxílio por acidente de trabalho, mas esconde o prazo de 28/10/2026 e pede o relatório que já tem; sem CAT, não lê o acident… |
| REST · Restabelecimento | 8 de 8 | 11 de 14 | Não conduz: acerta o corte por decisão (Sandra: recurso até 05/11/2026, ação, Atestmed fechado até 04/04/2027), mas no obstáculo típico (Cláudia: fim na data marcada, sem prorrogação, empresa recusand… |
| B94 · Auxílio-acidente acidentário | 3 de 4 | 15 de 19 | Não conduz sozinho: acerta os requisitos, o início no dia seguinte ao fim do auxílio acidentário e o desfecho "Gerar o caso", mas deixa "a informar" a sequela e o relatório médico que já estão no doss… |
| B36 · Auxílio-acidente previdenciário | 6 de 6 | 15 de 22 | Não conduz: o CRM chega ao B36 e acerta o início (01/09/2026 e 01/06/2024), a dispensa de carência e a soma com o salário, mas mede o acidente fora do trabalho pela régua do B94 (pede a ligação com o … |
| IIR · Isenção de imposto de renda | 9 de 9 | 9 de 13 | Não conduz: o CRM lê o laudo do HC e mostra que a pessoa é aposentada, mas a isenção de imposto de renda não é benefício que se escolha nem tem requisitos, então nenhuma tela diz se há direito, desde … |
| B41 · Aposentadoria por idade urbana | 4 de 8 | 10 de 12 | Conduz a cliente com direito (acha a idade de 2020 pela escada do art. 18 e desfaz o medo de ter perdido tudo, mas não avisa que não há atrasados) e não conduz a cliente com obstáculo: a Análise de Di… |
| B42 · Tempo de contribuição e transição | 8 de 8 | 16 de 18 | Não conduz: no caso simples acerta o direito pela idade progressiva desde 10/08/2026 e manda pedir já, mas no obstáculo típico conta os 80 meses de carnê de 11 % como se valessem, afirma "direito desd… |
| B57 · Aposentadoria do professor | 7 de 7 | 13 de 15 | Não conduz: o CRM lê na RAIS que a pessoa é professora, mas não lança esse tempo como magistério nem calcula as regras do professor, então nenhum dos dois clientes, ambos com direito hoje, ouve "já po… |
| CTC · Certidão de tempo de contribuição | 12 de 12 | 8 de 8 | Não conduz: o CRM só reconhece a certidão no rótulo do pré-caso e conta certo o CNIS do caso simples, mas não tem quadro de CTC (não lista o que vai já, o que depende de complementar e o que não vai, … |
| GPS · Regularização de contribuições | 11 de 11 | 16 de 19 | Não conduz: o GPS não tem opção própria e o acerto de CNIS marcado nunca diz se a cliente pode pagar o atrasado, até quando e quanto custa; no obstáculo a tela conta 177 contribuições quando valem 138… |
| PcD · PcD por tempo (LC 142) | 8 de 8 | 10 de 13 | Não conduz: sem a avaliação do INSS o CRM não simula os três graus nem lê o relatório médico que está no dossiê, então deixa sem conclusão a Sandra, que já tem direito em qualquer grau (no Desfecho só… |
| PcD · PcD por idade (LC 142) | 8 de 8 | 12 de 14 | Não conduz: acerta a idade, a carência e o valor, mas não usa a data de início da deficiência que já está no dossiê nem traz o tempo do CNIS, então não conta os 15 anos depois da deficiência — o Bened… |
| B46 · Aposentadoria especial | 7 de 7 | 15 de 17 | Não conduz: o CRM lê os PPPs e acerta o limite do ruído de cada época e o EPI, mas não leva ao quadro Tempos os períodos especiais que já leu. Por isso o forjador com direito adquirido desde 2017 fica… |
| CONV · Conversão de tempo especial | 8 de 9 | 14 de 16 | Não conduz: o CRM lê o PPP e o IEAN do dossiê, mas não os leva à conta. A conversão fica com 6 perguntas 'a informar', a B42 é calculada sem ela, e o Desfecho manda o cliente para Aposentadorias futur… |
| B41R · Idade rural | 6 de 7 | 13 de 15 | Não conduz: a Análise de Direito acerta a idade e tem as perguntas e o catálogo de papéis certos, mas o CRM não lê os papéis da roça do dossiê, deixa 9 de 11 requisitos "a informar" sem conclusão nem … |
| B41H · Aposentadoria híbrida | 5 de 6 | 11 de 13 | Não conduz: acerta a idade, a dispensa da qualidade de segurado e a não acumulação, mas não lê os papéis da roça que estão no dossiê, conta 0 meses rurais e, nos dois clientes que têm direito hoje, co… |
| B80 · Salário-maternidade urbano | 4 de 4 | 17 de 21 | Conduz só em parte: o Primeiro atendimento acerta o ponto difícil (Jéssica segue segurada até 15/04/2027 pelo seguro-desemprego; Mariana, até 16/10/2028) e o Desfecho manda gerar o caso, mas o CRM não… |
| B80R · Salário-maternidade rural | 4 de 4 | 15 de 19 | Não conduz: escolhido o salário-maternidade rural, a Análise tem o resumo certo, o valor certo (R$ 1.621) e as perguntas na ordem da conversa, mas o CRM não usa o dossiê (pede a data do parto que está… |
| SD · Seguro-defeso | 8 de 10 | 10 de 12 | Não conduz: o seguro-defeso só existe como o rótulo "SD" do pré-caso (não há opção nem requisitos dele, o botão para a Análise de Direito fica desligado e Análise, Desfecho e Documentos saem iguais pa… |
| B87 · BPC da pessoa com deficiência | 5 de 6 | 12 de 18 | Não conduz: no caso com direito acerta a conta (R$ 325 por pessoa, com o Bolsa Família) e manda gerar o caso, mas no obstáculo típico do BPC repete o erro que a família trouxe (soma o salário de apren… |
| B88 · BPC do idoso | 6 de 6 | 14 de 16 | Não conduz: no caso com direito chega ao pedido certo (R$ 300,00 por pessoa, Gerar o caso), mas no obstáculo típico cai na conta errada: conta o filho divorciado como solteiro (R$ 766,67, "Ainda não",… |
| B21 · Pensão por morte | 4 de 4 | 16 de 16 | Não conduz: o catálogo de requisitos da pensão (B21) está certo e na ordem da conversa, mas o CRM não reconhece o caso nem lê a certidão de óbito que está no dossiê, por isso não mostra o prazo dos 90… |
| B93 · Pensão por morte acidentária | 10 de 12 | 8 de 11 | Não conduz: sem opção B93, o CRM trata a pensão acidentária como pensão comum (B21), não lê a certidão de óbito nem a CAT que estão no dossiê (por isso não mostra o prazo de 90/180 dias, a duração da … |
| B25 · Auxílio-reclusão | 4 de 5 | 16 de 18 | Não conduz: o catálogo de requisitos do B25 está certo e na ordem da conversa, mas o CRM não reconhece o caso, não lê a certidão de prisão que está no dossiê, deixa os 8 requisitos 'a informar' e não … |
| REV · Revisão de benefício | 9 de 9 | 15 de 17 | Não conduz: o CRM acha o benefício e não cai na armadilha da DIB, mas não diz qual revisão cabe (o PPP de ruído do dossiê fica num 'informativo' genérico, sem tese, sem conversão e sem o ganho), respo… |
| CNIS · Acerto de CNIS | 5 de 10 | 20 de 21 | Não conduz: o CRM reconhece e traduz bem o aviso PEXT, mas não lê a CTPS que o cliente trouxe (a Serralheria Beta, motivo da visita, some), soma como certo o tempo bloqueado e o MEI, responde Ainda nã… |
| CRPS · Recurso ao CRPS | 9 de 10 | 12 de 15 | Não conduz: o CRM acerta e destaca o prazo do recurso nas duas clientes (09/11 e 21/10/2026, contados da última atualização do pedido, e não da data da cópia) e copia o motivo da negativa, mas não diz… |
| CÓPIA · Cópia do processo | 9 de 10 | 8 de 13 | Não conduz: no cliente com direito o CRM acerta e destaca o prazo do recurso (terça, 03/11/2026, 18 dias) e mostra as duas cópias de processo e os dois laudos lidos, mas nenhuma tela diz que a cópia j… |
| JA · Justificação administrativa | 7 de 10 | 11 de 16 | Não conduz: o CRM não tem a justificação administrativa (não lê os papéis da época nem a certidão de óbito, não fala de testemunhas e não pede o rol nem a prova da empresa); na aposentadoria conclui '… |

## O que ainda falta

Os defeitos A e B que a última conferência deu como abertos ou corrigidos só em parte, com o que falta.

### B31 · Auxílio por incapacidade temporária

- **B · em parte** · Análise de Direito: O selo "INSS e Justiça divergem" segue sem dizer o que diverge, o pé ainda diz que esses itens "pedem a decisão do advogado antes de virar pedido ou peça", e a tela não conclui que o atestado de 60 dias cabe no limite de 90 do INSS ("acima disso, com perícia" deixa a dúvida).
- **B · em parte** · Primeiro atendimento: A tabela da RAIS ainda marca em amarelo, na coluna "A CONFERIR", "sem data de saída; última RAIS de 2024" para o emprego ativo (2-pa-paq-rais.jpg).
- **B · em parte** · Documentos: O atestado ("documento principal") e a declaração da empresa com o último dia trabalhado não vêm pré-marcados nem à vista: ficam escondidos entre os 18 papéis; na cliente de 51 anos a lista ainda tem "54 itens", e não dá para ver se a caderneta da criança e o PEI saíram.

### B32 · Aposentadoria por incapacidade permanente

- **B · aberto** · Escolha dos benefícios: Acender o auxílio-acidente só com sinal de acidente ou de nexo com o trabalho (AVC e artrose são doença) e dar à aposentadoria programável o sinal de tempo e idade (33 anos e 1 mês; 55 anos).
- **B · aberto** · Análise de Direito: Uma linha por carta e, na carência da b32-direito, "397 contribuições até a DII; exige 12", com a isenção só como informação (como já faz o obstáculo).
- **B · em parte** · Análise de Direito: No b32-obstaculo a reabilitação segue "A INFORMAR" com texto genérico ("até que série estudou"): a 4ª série do "Por que veio" e do cadastro do CNIS não entra, e é o que pesa contra a reabilitação.
- **B · em parte** · Documentos: Ainda casa "RM pós-operatória ver 10-03-2025 RESSONANCIA MAGNETICA - CRANIO": a ressonância do AVC vale por exame pós-operatório de quem nunca operou.

### B91/92 · Benefício acidentário

- **A · em parte** · Documentos: Contrato e termo de representação ainda "seguem a espécie: Auxílio por incapacidade acidentário", e não a troca da aposentadoria comum pela acidentária (32 → 92), então o cliente assina papéis com o benefício errado.
- **B · em parte** · Análise de Direito: A conta diverge do esperado e do título (68 % da média, cerca de R$ 3.100, uns R$ 992 por mês desde 15/07/2025), e é o número que se diz ao cliente; Pedidos ao INSS ainda mostra o 31 e o 32 só como "concedido", e o último item segue "INFORMATIVO … (só na skill)".
- **B · em parte** · Análise de Direito: Os campos "CNAE do empregador na data" e "O CID combina com o CNAE da empresa (NTEP)" seguem no acidente típico, e a lista "Nexo" continua só com "CAT NTEP Perícia Sem nexo", sem o documento médico que registra o acidente.
- **B · em parte** · Primeiro atendimento: No acid-obstaculo a tabela da RAIS ainda marca em amarelo "sem data de saída; última RAIS de 2024" na coluna A CONFERIR para o contrato suspenso pela aposentadoria por invalidez (2-pa-paq-rais.jpg).
- **B · em parte** · Análise de Direito: O aviso de NTEP continua no acidente típico com CAT: "CNAE 46.35-4/02 e CID S923: confira o NTEP na Lista C do Anexo II do RPS" (e, no quadro PPP e CAT, "o nexo pelo CNAE 46.35-4/02 se confere na Lista C").

### REST · Restabelecimento

- **B · aberto** · Análise de Direito: Uma data de fim só, a do CNIS (15/12/2028), contando o benefício que veio depois do último mês pago.
- **B · em parte** · Primeiro atendimento: A conclusão do relatório (sem condições de trabalhar de cabeleireira, afastamento de 120 dias) e o CRM da médica seguem fora do resumo, que ainda abre com "Hipótese:" para um câncer já operado.
- **B · em parte** · Escolha dos benefícios: A "Aposentadoria programável" segue "Falta um dado" com o sinal "O laudo médico de 06/10/2026 marca a isenção de carência", e o cartão do auxílio-acidente fala em "Na data do acidente (20/03/2026)" para um câncer, sem acidente.

### B94 · Auxílio-acidente acidentário

- **A · em parte** · Desfecho: Documentos continua só com a guia do pedido no Meu INSS (com a análise documental prévia) e a lista impressa não traz o comprovante de residência nem a procuração ICP-Brasil da via judicial; o Desfecho também não diz que a perícia de 2022 permite a ação sem pedido novo.
- **B · aberto** · Escolha dos benefícios: Tirar a isenção de carência do laudo do B91 como sinal da aposentadoria e, se o cartão ficar, mostrar as contribuições e a idade.
- **B · em parte** · Escolha dos benefícios: A Incapacidade ainda vem primeiro para quem já voltou ao trabalho, nada vem pré-marcado ("Vão: nenhum benefício marcado"), o cartão do auxílio-acidente segue "Falta um dado" sem dizer qual, e a escolha "Acidentário · B94 / Previdenciário · B36" não diz que a CAT aponta o B94.
- **B · em parte** · Escolha dos benefícios: Na b94-direito o sinal ainda é o reconhecimento da incapacidade ("Na perícia de 24/02/2026, o INSS reconheceu a incapacidade desde 14/01/2026…"), e não a CAT, o B91 cessado e a sequela do relatório, e o selo "Falta um dado" não diz o que falta.

### B36 · Auxílio-acidente previdenciário

- **B · aberto** · Escolha dos benefícios: Usar a carência do CNIS (296 contribuições, as 180 completas) como sinal, e não a isenção do laudo do auxílio-doença.
- **B · aberto** · Desfecho: Sem análise registrada, o botão principal do Desfecho deve ser registrar a análise do B36; só depois "3 · Gerar o caso B36".
- **B · em parte** · Análise de Direito: "Desde quando é devido?" segue só com a DIB ("DIB em 01/06/2024, dia seguinte à cessação do auxílio"), sem dizer até quando os atrasados estão seguros (01/06/2029 no obstáculo; 01/09/2031 no direito).
- **B · em parte** · Documentos: O título continua "Conforme a atividade do cliente" (a escolha é pela lesão), e na b36-direito o topo não traz a ficha do pronto-socorro ou o boletim que a própria Análise pede ("traga o boletim ou o prontuário do atendimento") nem um exame atual da sequela.
- **B · em parte** · Documentos: Na b36-direito a radiografia do dia da queda ainda conta como exame da sequela ("Radiografia com carga ver 08-03-2026 RADIOGRAFIA - PUNHO DIREITO" e "Exames de imagem e laudos", o mesmo documento duas vezes), e o relatório vale por dois itens; com isso não se pede o exame atual.
- **B · em parte** · Escolha dos benefícios: O cartão ainda conta "1 alerta(s)" e termina em "não é erro do CNIS e não se corrige por formulário; RAC pelo Anexo certo", e a tela chama de "Carnê de 11 % (plano simplificado)" o pagamento de quem é MEI (5 %), o que muda a diferença a complementar.
- **B · em parte** · Análise de Direito: Continua sem lugar para registrar a ficha trazida: Documentos só tem "Anexar o assinado", e a ficha não entra em "Já temos".

### IIR · Isenção de imposto de renda

- **B · aberto** · Primeiro atendimento: Uma linha só, sem caixa alta e sem sigla solta: aposentadoria por tempo de contribuição desde 10/06/2019, valor inicial de R$ 5.368,82, revisão até 01/07/2029.
- **B · em parte** · Escolha dos benefícios: A escolha ainda mostra só os dois cartões "Impedido", sem cartão da isenção com o laudo do HC como sinal, e o laudo segue descrito como "Relatório médico recente, de 20/08/2026, para levar à perícia".
- **B · em parte** · Escolha dos benefícios: A escolha continua só com cartões "Impedido" e com "O relatório médico mais recente é de 12/11/2025, com mais de 90 dias: pedir relatório atualizado para a…", sem o cartão da isenção que diria que a doença não precisa existir hoje.
- **B · em parte** · Análise de Direito: Falta a parcela isenta dos maiores de 65 anos (ela fez 65 em 30/01/2025), que explica por que a renda de R$ 5.830,00 cabe nos R$ 5.000 tributáveis e reduz o que se devolve de 2025.

### B41 · Aposentadoria por idade urbana

- **A · em parte** · Análise de Direito: O Desfecho e o card devem dar 12/02/2028 com a Beta provada (D-90 em 14/11/2027) e deixar 2031 como o cenário sem a prova; hoje 12/02/2028 só aparece no topo da Análise ("com ele, cumpre os requisitos desde 12/02/2028").
- **A · em parte** · Análise de Direito: Com a diferença (e a Beta provada) o direito é 12/02/2028 e sem ela por volta de 03/2028; o próprio requisito diz "a 180ª na competência 12/2027, o direito em 01/09/2031", que não fecha, e o efeito de responder Sim no campo não aparece na captura.
- **A · em parte** · Análise de Direito: Os três cenários no Desfecho: 12/02/2028 provando a Beta e complementando; sem a complementação, por volta de 03/2028; sem a Beta, 2031; hoje 12/02/2028 não aparece no Desfecho.
- **A · em parte** · Desfecho: Aposentadorias futuras com 12/02/2028 (D-90 em 14/11/2027; D-60 em 14/12/2027), condicionada à prova da Beta e à diferença de 01 e 02/2026.
- **B · em parte** · Análise de Direito: A tela ainda se contradiz: logo abaixo vem "Requisitos cumpridos em 01/09/2031", e o Desfecho e Documentos mandam "Aposentadorias futuras — direito em 01.09.2031", a data de quem não prova a Beta, em vez de 12/02/2028 (ver o erro novo de idade-obstaculo).
- **B · em parte** · Primeiro atendimento: Para quem ainda não tem as 180, a Análise de Direito mantém o requisito "Não precisa estar contribuindo hoje" (INFORMATIVO), e o "Em uma frase" ainda termina com "não precisa estar contribuindo hoje".

### B42 · Tempo de contribuição e transição

- **B · em parte** · Escolha dos benefícios: O cartão ainda termina com "RAC pelo Anexo certo", contra o "não se corrige por formulário" da mesma linha, e mantém "Falta um dado" e o "Confira no extrato se…" cortado.
- **B · em parte** · Documentos: No obstáculo, "Já temos no dossiê 4 itens" ainda dá "Comprovantes de GPS (guias ao INSS)", "DAS do MEI recolhido" (ele não tem MEI) e "GPS com autenticação bancária visível" como "ver CNIS completo".

### B57 · Aposentadoria do professor

- **B · em parte** · Análise de Direito: O nível continua um só para a carreira ("Nível de ensino Fundamental ... antes, também infantil"), sem nível por linha, e a função de cada linha vem em branco ("Função"), embora a RAIS mostre professora na Alfa e na Gama.
- **B · em parte** · Primeiro atendimento: A B57 não vem mais pré-marcada: as duas fichas abrem com "Vão: nenhum benefício marcado" ("escolha_automatica": {}), quando na rodada anterior vinha "Vão: Professor · B57".

### GPS · Regularização de contribuições

- **B · em parte** · Documentos: "Já temos no dossiê" ainda dá "Carnês e guias pagos que não aparecem no CNIS · ver CNIS completo", que deveria ir ao que a cliente traz ("se houver"), deixando em "Já temos" só o extrato do CNIS; igual no obstáculo.
- **B · em parte** · Documentos: A ficha do CadÚnico saiu de "Já temos no dossiê" (a rodada anterior a mostrava), sem a nota de que está vencida, e lá ficou "Carnês e guias pagos que não aparecem no CNIS · ver CNIS completo".
- **B · em parte** · Documentos: Nas duas personas "Já temos no dossiê" ainda trata o CNIS como prova das guias ("Carnês e guias pagos que não aparecem no CNIS · ver CNIS completo"), em vez de pedi-las à cliente.

### PcD · PcD por tempo (LC 142)

- **B · em parte** · Primeiro atendimento: Tipo (sensorial) e CID H90.3 vêm em branco, o primeiro requisito continua 'A INFORMAR' pedindo o impedimento de 2 anos, e a escolha não dá sinal de PcD por tempo (só 'Requisitos à vista · Aposentadoria programável').
- **B · em parte** · Documentos: Ainda repete: o mesmo relatório do otorrino aparece em três itens e as duas audiometrias em dois. 'Laudos ou relatórios médicos de anos anteriores' aponta para o relatório de 05/10/2026.
- **B · em parte** · Escolha dos benefícios: Na escolha dos benefícios, o chip Auxílio-acidente continua sem sinal, e o aviso só aparece se a PcD já estiver em análise.

### PcD · PcD por idade (LC 142)

- **B · em parte** · Documentos: 'Já temos' ainda repete os mesmos três documentos em quatro itens, e o relatório de 18/08/2026 aparece até em 'Prontuários antigos' e 'Atendimentos de emergência da época'. A CTPS não está entre os essenciais do topo.
- **B · em parte** · Escolha dos benefícios: Falta o sinal próprio de PcD por idade na escolha ('idade cumprida; contar 15 anos de contribuição depois da DID').

### B46 · Aposentadoria especial

- **B · aberto** · Análise de Direito: Nenhuma tela pergunta se o PPP traz o NEN ou a NHO-01 a partir de 2004, nem manda pedir o LTCAT ou a retificação quando não traz. O NEN só aparece no link da calculadora de ruído.
- **B · em parte** · Documentos: O LTCAT da Metalúrgica Beta (1997 a 2003) e a carteira de trabalho não abrem a lista nem vêm marcados: ficam entre os 20 recolhidos.

### CONV · Conversão de tempo especial

- **A · em parte** · Desfecho: No mesmo Desfecho a linha da B42 continua "envie a Aposentadorias futuras: direito em 05/11/2028" (e o botão 2 segue ativo), sem dizer que é a conta sem o PPP, e falta o cenário do meio (PPP de 2004 a 2010 mais o cargo até 28/04/1995: pedágio de 100 % por volta de 06/2028).
- **B · aberto** · Escolha dos benefícios: Sugerir a conversão para a aposentadoria por tempo (7 anos e 6 meses de ruído, cerca de 3 anos a mais) e deixar marcadas Conversão de tempo especial e Tempo de contribuição · B42.
- **B · em parte** · Documentos: Não abre com os itens deste caso (a CTPS do período da Tecelagem; formulário antigo ou laudo, se o PPP falhar), que continuam entre os 20 recolhidos.

### B41R · Idade rural

- **A · em parte** · Escolha dos benefícios: O cartão da aposentadoria programável não avisa que a conta urbana não inclui os meses de roça (lido à cliente, "a 180ª em 11/2040" confirma o medo dela), a rural não vem pré-marcada (escolha automática vazia) e, nos chips, "Aposentadoria por idade ou tempo" vem antes de "Rural, híbrida e seguro-defeso".
- **B · aberto** · Documentos: Dar o endereço por preenchido quando houver logradouro, bairro e cidade (aceitando "km 7" ou "s/n") e pedir só o CEP.
- **B · em parte** · Escolha dos benefícios: Nada vem pré-marcado ("Vão: nenhum benefício marcado", escolha_automatica {}), o cartão não aponta "Por idade rural" com a idade (57; mulher 55), e o segundo sinal, "Aposentadoria programável · Carência: 10 de 180; a 180ª em 11/2040", reforça o medo da lavradora de que precisa pagar.

### B41H · Aposentadoria híbrida

- **A · em parte** · Primeiro atendimento: O cartão "Aposentadoria programável" ainda faz só a conta urbana sem citar a roça ("Carência: 122 de 180; a 180ª em 07/2031" e, na obstáculo, "a 180ª em 09/2033", os 7 anos que a cliente acha que tem de pagar), o quadro da roça não diz quantos meses ela soma, e a híbrida não vem pré-marcada (escolha automática vazia; o chip "Aposentadoria por idade ou tempo" vem antes do rural).
- **B · aberto** · Escolha dos benefícios: Uma linha sob cada opção (rural pura: só roça até o pedido ou a idade, 55/60; híbrida: roça antiga mais cidade, 62/65) e, para quem saiu da roça em 1990, a Híbrida pré-marcada com o aviso de que a rural pura não cabe.
- **B · em parte** · Escolha dos benefícios: A Híbrida não vem pré-marcada nem nomeada no cartão ("Vão: nenhum benefício marcado"), falta a frase "some os anos de roça antes de concluir que faltam contribuições", e o segundo cartão, "Aposentadoria programável · Carência: 122 de 180; a 180ª em 07/2031", ainda puxa para a leitura urbana.

### B80 · Salário-maternidade urbano

- **B · aberto** · Documentos: Modelo próprio de contrato para o salário-maternidade, ou travar o "Gerar os 4" até informar os honorários combinados.
- **B · em parte** · Escolha dos benefícios: "Urbana" não vem marcada ("Vão: nenhum benefício marcado") e seguem os cartões "Aposentadoria programável" e "CNIS e contribuições", este aceso só pelo alerta normal do MEI ("1 alerta(s)").
- **B · em parte** · Primeiro atendimento: Dizer no Primeiro atendimento por que disseram que ela perdeu o direito (sem o seguro-desemprego a cobertura acabaria em 15/04/2026, antes do parto) e marcar o parto e esse fim na linha do tempo.
- **B · em parte** · Primeiro atendimento: O alerta do plano simplificado ainda conta como "1 ponto no cadastro do INSS para conferir" (em laranja) e acende o cartão "CNIS e contribuições" na escolha; e o texto novo chama o DAS de "Carnê de 11 %" (ver o erro novo).

### B80R · Salário-maternidade rural

- **B · aberto** · Análise de Direito: A pergunta "A terra é de quem e como vocês trabalham nela?" (própria, emprestada sem contrato, emprestada com contrato, a meia, arrendada) com a orientação do contrato de comodato com firma reconhecida, que vale da data em diante.
- **B · aberto** · Documentos: Conferir o logradouro gravado e pedir só o que falta: "Falta o CEP. Sítio sem número: use 's/n'."
- **B · em parte** · Escolha dos benefícios: "Rural · B80" não vem marcado ("Vão: nenhum benefício marcado"), e o segundo cartão, "Rural, híbrida e seguro-defeso", pode levar a marcar a família da aposentadoria rural em vez do salário-maternidade rural.
- **B · em parte** · Documentos: As notas de produtor de 2025 e 2026, no nome da Patrícia e lidas, não vão a "Já temos": a lista ainda traz "Nota do bloco de produtor rural ou CCIR" e já marca "Papéis da roça no nome dela ou do marido... notas, CCIR, ITR, sindicato", e o período de segurada especial do CNIS não aparece como já obtido.

### SD · Seguro-defeso

- **A · aberto** · Documentos: O seguro-defeso continua caindo no contrato padrão (honorários de 3 das 4 parcelas e pedido ao INSS), sem o aviso de combinar os honorários com o advogado, e a declaração do Anexo XXIV continua no "Gerar os 4".
- **A · em parte** · Primeiro atendimento: O cartão "Aposentadoria programável" continua projetando o carnê ("Carência: 7 de 180; a 180ª em 02/2041, e em dia"; no SD-direito, "a 180ª em 10/2039") e nenhuma tela diz que a carência da aposentadoria rural se cumpre com os meses de pesca, sem pagar carnê.
- **B · aberto** · Primeiro atendimento: Conferir o logradouro que a extensão grava e pedir só o que falta: "Falta no cadastro: CEP".
- **B · em parte** · Desfecho: As saídas continuam as da aposentadoria ("1 · Arquivar…" com "Já aposentado", "2 · Enviar a Aposentadorias futuras"): não há como gravar a orientação e criar o lembrete para o começo de 10/2027 sem arquivar como "Sem direito".

### B87 · BPC da pessoa com deficiência

- **A · em parte** · Análise de Direito: Esses campos continuam sem entrada à vista: em def-direito e idoso-direito os requisitos de renda excluída e de gastos seguem "INFORMATIVO" ("nenhuma renda a excluir") sem campo, e no obstáculo só aparecem como "a confirmar", então um aprendiz, um estagiário ou uma fralda que a pessoa conte no balcão e não estejam no dossiê não têm onde entrar na conta.
- **B · em parte** · Primeiro atendimento: Cobrar o representante legal no cadastro e em Documentos (propor a Jéssica, do CadÚnico), preencher o nome da mãe e gerar procuração e contrato em nome do Davi "representado por" ela.
- **B · em parte** · Documentos: Pedir renda só de quem entra na conta: "de quem trabalha" inclui a avó do Davi, que fica fora, e vem marcado também para a Simone, em cuja casa ninguém trabalha.
- **B · em parte** · Documentos: Casar o relatório do HC da Simone com o item do laudo médico (CID e limitações) e mostrar a campimetria uma vez só.
- **B · em parte** · Documentos: No Davi, filtrar pelo autismo e já marcar os relatórios da fono, da terapia ocupacional e da psicologia e o da escola (mediador em sala), que seguem perdidos entre os 43 papéis recolhidos.
- **B · em parte** · Primeiro atendimento: Mostrar no Primeiro atendimento o que responde ao BPC: no Davi, o tratamento contínuo (ABA, fono, TO, aripiprazol) e "condição de longo prazo"; na Simone, a cegueira desde 2012 e o acompanhante.
- **B · em parte** · Desfecho: Gerar o contrato e o termo de representação próprios do BPC, e não os de benefícios por incapacidade.

### B88 · BPC do idoso

- **B · em parte** · Documentos: Tirar da lista recolhida as repetições e o Bolsa Família como "controvérsia" e acabar com a contradição do endereço.
- **B · em parte** · Documentos: Tirar da lista recolhida plano de saúde e aluguel como desconto e trocar "Estatuto do Idoso" por "LOAS, art. 20, § 14" (a tela não mostra o texto dos 28 papéis recolhidos).

### B93 · Pensão por morte acidentária

- **A · em parte** · Análise de Direito: O Desfecho ainda abre com "Sem desfecho sugerido — sem data de direito nem ato a praticar: complete a análise" e a linha da Revisão manda "antes do caso, resolva: Ainda não. É a primeira revisão pedida ao INSS?", sem o prazo da revisão, então quem atende não recebe o fecho "pedir a revisão com a troca para B93, até 01/05/2036".
- **A · em parte** · Documentos: A guia da B93 ainda se chama "Cadastrar a CAT (pela família, se a empresa não fez) e Pedir Pensão por Morte — Meu INSS" para quem já tem a pensão, e a guia da Revisão ainda manda "Anexe a prova da tese (no tempo especial, o PPP) e peça o período como especial", que não é a tese deste caso.
- **B · em parte** · Primeiro atendimento: Abrir pela pessoa que faleceu com o que a CAT já diz (eletricista da construtora desde 06/03/2017, estava trabalhando: era segurado no dia), sem mandar perguntar o último emprego, e dizer para que serve aqui o CNIS dela (só mostra se recebe outro benefício; o salário não impede a pensão).
- **B · em parte** · Escolha dos benefícios: No direito, acender em primeiro o cartão da pensão com o óbito por acidente do trabalho (certidão e CAT) no lugar da aposentadoria; no obstáculo, acender e marcar a Revisão pela carta do B21 com a cota cortada.
- **B · em parte** · Documentos: Tirar a CAT repetida e o texto de tempo especial da guia da revisão, e conferir se os 23 papéis recolhidos ainda são os da revisão genérica (holerites antigos, FGTS, duas atividades).

### B25 · Auxílio-reclusão

- **A · em parte** · Análise de Direito: No obstáculo o topo do atendimento (Identificação e Primeiro atendimento) não tem faixa de prazo: como os 90 dias da Tainá passaram, a faixa some, e os 180 dias do Enzo (até 07/12/2026) só aparecem depois de escolher o benefício, na Análise e no Desfecho.
- **B · aberto** · Escolha dos benefícios: Abrir a escolha com o auxílio-reclusão marcado e em palavras de prisão ("preso em 25/08/2026, certidão no dossiê; pedir até 23/11/2026").
- **B · em parte** · Documentos: No obstáculo, tirar as duplicatas e os holerites (ele não teve salário nesse período) e conferir os 34 papéis recolhidos, que a tela não mostra.

### REV · Revisão de benefício

- **B · em parte** · Análise de Direito: Chamar o campo do alto de "Data deste pedido de revisão (vazio = hoje)" e juntar num item só a pergunta da revisão anterior, com o campo das datas.
- **B · em parte** · Análise de Direito: Mostrar o campo da pensão só quando o benefício revisado for pensão.

### CNIS · Acerto de CNIS

- **A · em parte** · Primeiro atendimento: No obstáculo, dar o tempo de hoje sem a Gama e sem o MEI (cerca de 17 anos e 2 meses) e o tempo com o acerto (35 anos, 3 meses e 10 dias até 07/2019), e pintar na linha do tempo o período com PEXT como "não conta até provar" (o MEI já aparece como "Se complementada").
- **A · em parte** · Análise de Direito: Tirar do quadro Tempos os meses de MEI sem complemento e trocar as ações da aposentadoria por "primeiro o acerto; depois, direito adquirido de 2019 ou pedágio de 100 % em 14/05/2027", sem complementação nem 2032.
- **A · em parte** · Desfecho: No obstáculo, a linha da aposentadoria deve dizer que ela espera o CNIS corrigido e que, com o acerto, há direito adquirido desde 21/04/2019 (antes dos meses de MEI) ou o pedágio de 100 % em 14/05/2027, sem mandar pagar complementação nem citar 14/05/2032.
- **A · em parte** · Desfecho: No Desfecho, a aposentadoria fica para depois do CNIS limpo, com o direito adquirido de 2019 sem complementação (os meses de MEI começam em 08/2019, depois do direito) e sem a data de 2032.
- **A · em parte** · Primeiro atendimento: Dar o tempo que o INSS conta hoje, sem a Gama e sem o MEI (206 meses, 17 anos e 2 meses), e o tempo com o acerto, sem o MEI (35 anos, 3 meses e 10 dias), com a diferença que o acerto vale.
- **B · em parte** · Documentos: Tirar as duas GPS que apontam para o CNIS e pôr ali a RAIS e o CAGED do dossiê.

### CRPS · Recurso ao CRPS

- **A · em parte** · Primeiro atendimento: Tirar da carência do B41 e da lista de Documentos o pedido da carteira do Hotel B, que já está no pedido, para ela não ser entregue de novo como documento novo.
- **B · em parte** · Análise de Direito: Mostrar a ciência estimada como "a confirmar", e não como FALTA.
- **B · em parte** · Análise de Direito: Uma conta só da carência na data do pedido, igual à do recurso (189, e 160 sem o Hotel B), também no campo.
- **B · em parte** · Análise de Direito: Juntar como soube, o dia da ciência e o feriado num bloco só, acima do prazo calculado, como já acontece no crps-direito.

### CÓPIA · Cópia do processo

- **A · em parte** · Primeiro atendimento: Com parente sem procuração, tirar o "peça agora" da senha e o campo em vermelho (a senha é da titular) e perguntar na Identificação quem veio.
- **B · aberto** · Desfecho: Dar à cópia as saídas próprias (entregue ao titular; aguardando procuração ou gov.br, com o prazo na agenda; virou recurso ou pedido novo, gerando o caso na espécie que o advogado escolher).
- **B · aberto** · Primeiro atendimento: Uma linha por fato: a negativa com o motivo e o prazo numa só, e a carta de concessão uma vez.
- **B · aberto** · Primeiro atendimento: Mostrar as cópias e os laudos já baixados na caixa do dossiê e no começo do Primeiro atendimento, com "ver" e "baixar para entregar".
- **B · em parte** · Escolha dos benefícios: Tirar a aposentadoria programável da cópia e apresentar a Incapacidade como pedido novo, sem o selo do prazo do recurso.
- **B · em parte** · Primeiro atendimento: Mostrar também "Mantém dor e limitação para andar muito e para subir em andaime", com acento.

### JA · Justificação administrativa

- **A · em parte** · Primeiro atendimento: Desenhar 1979 a 1981 como "a provar" na linha do tempo e dizer no cartão da aposentadoria que os 26 meses da Malharia, provados pela JA, completam a carência hoje.
- **A · em parte** · Análise de Direito: Levar à pensão a contagem que a JA já fez (3 documentos da união, 1 nos 24 meses antes do óbito), para a pensão concluir sem pedir o que já está na tela.
- **A · em parte** · Análise de Direito: Preencher na pensão as provas (3) e as dos 24 meses (1) com o que a JA já contou, com a nota de que a JA supre o período.
- **B · aberto** · Primeiro atendimento: Fonte própria "Trazido pela cliente", contada à parte na caixa do dossiê, e quadro próprio no Primeiro atendimento.
- **B · em parte** · Análise de Direito: Com 2 ou mais provas e só 1 nos 24 meses, marcar "a conferir" na pensão e dizer que o caput do art. 180 aceita e o RPS, art. 22, § 14, manda suprir pela JA, para o advogado decidir.
- **B · em parte** · Análise de Direito: Listar ali os 3 documentos do dossiê com a data e preencher as contagens (3 e 1).
- **B · em parte** · Desfecho: Nomear o caso pelo benefício com a JA no topo, no Desfecho e no botão ("Gerar o caso de pensão por morte, com o pedido de JA").
- **B · em parte** · Documentos: Tirar do "Já temos" do direito os comprovantes de GPS que apontam para o CNIS.

## Erros novos que a última conferência achou

- **idade-obstaculo** · A data do card piorou: na rodada anterior o Desfecho dava 12/02/2028 e agora diz "Aposentadorias futuras — direito em 01.09.2031" e "direito provável em 01/09/2031, se pagar a diferença até 31/12/2026 e o INSS em dia; sem a diferença, só em 01/11/2031", com o botão 2 em destaque e o aviso só em 30/0…  
  corrigido depois: o card vai a Aposentadorias futuras com 12/02/2028, a data com o acerto da Malharia Beta, e diz que sem ele só em 01/09/2031
- **B93-obstaculo** · A Revisão passou a marcar "FALTA" em "É a primeira revisão pedida ao INSS?" (antes "A INFORMAR") mesmo com o dossiê respondendo "Não", e abre com "Ainda não. É a primeira revisão pedida ao INSS?", o que tira do Desfecho o "gere o caso: revisão" de antes e põe "Sem desfecho sugerido"; e o extrato gan…  
  corrigido depois: a reabertura da concessão virou cautela, o Desfecho manda gerar o caso da revisão, e o primeiro crédito proporcional não é mais lido como desconto
- **idoso-obstaculo** · "Já temos no dossiê" passou a listar "Comprovante de visita ao CRAS para atualização · na ficha" (também em idoso-direito), enquanto a guia manda "Atualizar o CadÚnico no CRAS informando que Carlos não é solteiro, antes do pedido" e a ficha de 18/03/2025 ainda traz o Carlos só como "Filho(a)".  
  corrigido depois: o comprovante de atualização no CRAS fica em "Para o cliente providenciar"
- **b31-direito** · No requisito "Se já recebe ou recebeu, ainda dá para pedir prorrogação ou um novo pedido?", a tela antiga dizia "sem benefício anterior: é pedido novo, não prorrogação"; a de agora toma o fim do atestado como data de fim de um benefício que nem foi pedido: "DCB em 23/11/2026: a prorrogação se pede d…  
  corrigido depois: sem benefício concedido, volta a dizer que é pedido novo, e não prorrogação
- **acid-obstaculo** · Apareceu no acidentário o requisito "O pedido foi feito em até 30 dias do afastamento?" com "Não se aplica: o auxílio foi pago de 30/03/2024 a 14/07/2025. Se o recurso ou a ação devolverem o auxílio, os atrasados contam de 15/07/2025; passados 60 dias do corte, um pedido novo paga só desde ele", tra…  
  corrigido depois: o auxílio que virou aposentadoria por invalidez não é tratado como corte
- **pcd_idade-obstaculo** · O quadro Saúde da Lúcia classifica a internação por AVC e os relatórios de sequela de AVC como "3 documentos médicos, da área de mão, punho e cotovelo"; na tela antiga eram "da área de doenças graves".  
  corrigido depois: a sequela de AVC volta à área de doenças graves (o CID pesa mais que a palavra "mão")
- **b46-obstaculo** · Com a conversão, a B42 marca "Pedágio de 50 % ... EM ORDEM: cumprida em 14/11/2019: 34 anos, 11 meses e 30 dias (35 anos e 50 % do que faltava em 13/11/2019)", e a conversão repete "Pedágio de 50 % (art. 17): exige 35 anos, 0 meses e 0 dias", embora ele já tivesse 38 anos, 8 meses e 1 dia em 13/11/2…  
  em parte: o RAC sem pendência diz que o IEAN não é erro; o texto do pedágio de 50 % para quem já tinha 35 anos continua
- **rur-direito** · Documentos da mãe cuja roça o CNIS já prova vem com quatro itens marcados para a lista impressa ("Extrato de pagamento do salário-maternidade: baixe no Meu INSS", "Papéis da roça no nome dela ou do marido, com data anterior ao parto", "Cartão da gestante..." e "Certidão de casamento — vale a profiss…  
  A corrigir: Gravidade baixa: os papéis do caso com obstáculo passaram a vir marcados para quem não precisa deles; com o período de segurada especial no CNIS, não marcar esses itens (e o extrato do benefício de 2021) nem pedir entrega antes do pedido.
- **acerto-obstaculo** · Piorou: a aposentadoria por tempo passou a mandar pagar uma complementação que não existe ("Pedir ao INSS o cálculo da complementação de (de 11 % para 20 %: 9 % do mínimo de cada mês, cerca de R$ 0,00 antes dos acréscimos (...))"), o Desfecho diz "sem complementar, nenhuma regra fecha; complementand…  
  corrigido depois: sem mês a complementar antes do direito, não se fala em complementação
- **COPIA-direito** · Documentos, que nas telas julgadas pedia para marcar um benefício, agora contradiz a Análise: marca para a lista impressa "Procuração do titular para o escritório", "Documento de identificação com foto — do titular e de quem vier por ele", "Número do protocolo ou do NB" e "Acesso gov.br prata ou our…  
  A corrigir: Com a cópia e os laudos no dossiê, mostrá-los em "Já temos no dossiê" e não pedir ao titular o acesso para baixar o que já foi baixado; a procuração só se o escritório for recorrer.
- **idade-obstaculo** · Piorou: 1) a data que vai às Aposentadorias futuras virou 01/09/2031, a de quem não prova a Beta (a tela antiga dava 12.02.2028): "Requisitos cumpridos em 01/09/2031", "Enviar a Aposentadorias futuras com a data provável de 01/09/2031: o aviso sai em 30/05/2031" e, no Desfecho, "direito provável em …  
  corrigido depois: o card vai a Aposentadorias futuras com 12/02/2028, a data com o acerto da Malharia Beta, e diz que sem ele só em 01/09/2031
- **GPS-direito** · Piorou: a linha do tempo passou a desenhar o carnê de 11 % de 03/2017 a 05/2026 com a trama tracejada de "Se complementada" (na rodada anterior era contribuição normal), embora a cliente pague para a aposentadoria por idade, em que esses meses contam sem complemento, como o próprio item diz ("vale p…  
  corrigido depois: os carnês "que não aparecem no CNIS" ficam com o cliente, e não em "Já temos"
- **CTC-direito** · Piorou: o item da qualidade passou a mandar "Pergunte: depois de 02/2014, parou de trabalhar e se cadastrou no SINE ou recebeu seguro-desemprego até 15/04/2016? ... o Emprega Brasil não foi consultado: rode-o antes de concluir", com o botão "Teve desemprego registrado: somar 12 meses", a um servidor…  
  corrigido depois: a pergunta do SINE só aparece onde a qualidade decide (incapacidade, auxílio-acidente e maternidade)
- **morte-direito** · Piorou: a escolha dos benefícios não acende nem marca a pensão; o único cartão é "Falta um dado · Aposentadoria programável · Carência: 83 de 180; a 180ª em 10/2034, e em dia", o único botão com sinal é "Aposentadoria por idade ou tempo" e o Primeiro atendimento diz "Vão: nenhum benefício marcado", …  
  corrigido depois: o cartão da pensão volta à escolha, com o óbito e o prazo
- **morte-obstaculo** · Piorou: a escolha abre sem nenhum cartão ("Marque os benefícios que vão à Análise de Direito") e com "Vão: nenhum benefício marcado", embora o topo diga "Prazo: Pedir a pensão por morte até 18/11/2026 ... faltam 33 dias" (na rodada anterior vinha "Prazo até 17/11/2026 · Dependentes" e a pensão marca…  
  corrigido depois: o cartão da pensão volta à escolha, com o óbito e o prazo
- **B93-obstaculo** · Piorou: o Desfecho, que na rodada anterior mandava gerar o caso, agora diz "Sem desfecho sugerido — sem data de direito nem ato a praticar: complete a análise" e "Revisão de benefício: antes do caso, resolva: Ainda não. É a primeira revisão pedida ao INSS? Ela reabre a concessão inteira..."; a revis…  
  corrigido depois: a reabertura da concessão virou cautela, o Desfecho manda gerar o caso da revisão, e o primeiro crédito proporcional não é mais lido como desconto
- **b31-direito** · Piorou: para quem nunca recebeu benefício, ad_b31.txt agora diz "Se já recebe ou recebeu, ainda dá para pedir prorrogação…? INFORMATIVO DCB em 23/11/2026: a prorrogação se pede de 09/11/2026 até a DCB (IN 128, art. 339, § 3º) · dossiê" (a tela antiga dizia "sem benefício anterior: é pedido novo, não…  
  corrigido depois: sem benefício concedido, volta a dizer que é pedido novo, e não prorrogação
- **b31-obstaculo** · Piorou: no BPC da cliente com câncer, o impedimento de 2 anos passou de "A INFORMAR" para "EM ORDEM impedimento de longo prazo, CID C50.9, desde 20/03/2026", com "Impedimento de longo prazo (2 anos) Sim (relatório do HC de 14/07/2026: condição de longo prazo…)", mas o relatório diz só "Sem condições…  
  corrigido depois: "tempo indeterminado" não conta como impedimento de 2 anos; fica a provar
- **b94-obstaculo** · Piorou: em "Desde quando é devido?" surgiu o campo vazio "Fim do auxílio por incapacidade que veio antes (DCB)" (3-ad-b94.jpg), sem o "Usando … (do dossiê)" das outras telas, embora a data esteja logo acima ("o auxílio que veio antes cessou em 31/08/2022") e no CNIS.  
  corrigido depois: o fim do auxílio anterior vem do CNIS, com a fonte
- **pcd_idade-obstaculo** · O quadro Saúde passou a dizer '3 documentos médicos, da área de mão, punho e cotovelo' para a sequela de AVC com hemiparesia. Antes dizia 'da área de doenças graves'.  
  corrigido depois: a sequela de AVC volta à área de doenças graves (o CID pesa mais que a palavra "mão")
- **b46-direito** · O cartão da escolha passou a marcar 'Falta um dado' na aposentadoria especial, com 'Falta: a regra para converter o tempo especial'. Esse cliente tem a B46 por direito adquirido, que não depende de conversão; antes, o cartão não tinha essa falta.  
  A corrigir: Não pedir a regra de conversão quando os 25 anos de especial já fecham a B46.
- **b46-obstaculo** · Em Documentos, a B42 agora lista os seis RAC com 'RAC só se o CNIS tiver indicador: requerer com o CNIS limpo'. O único indicador do CNIS é o IEAN da Metalúrgica Beta, que o Primeiro atendimento diz não ser erro.  
  em parte: o RAC sem pendência diz que o IEAN não é erro; o texto do pedágio de 50 % para quem já tinha 35 anos continua
- **conv-obstaculo** · Em Documentos, a B42 agora lista os seis RAC com 'RAC só se o CNIS tiver indicador', e o único indicador é o IEAN do hospital, que o Primeiro atendimento diz não ser erro. O Desfecho abre com 'Caso — o pedido cabe já' e manda 'peça já a aposentadoria por tempo' na linha da conversão, mas a linha seg…  
  corrigido depois: a linha da B42 acompanha o "peça já" da conversão, e o RAC sem pendência diz que o IEAN não é erro
- **hibrida-direito** · Em "Quanto vai receber?" a Análise mostra ao colaborador o jargão interno do sistema: "ou ficam fora pela leitura da skill" e "No INSS: IN 128, art. 257, § 2º: calcula como a idade comum (o art. 233, VI, não foi lido); a skill entende que a média usa só os salários pagos" (igual na hibrida-obstaculo…  
  A corrigir: Dizer em linguagem de balcão, sem "skill" nem "não foi lido": "No INSS, a média usa só os salários pagos; na Justiça, a roça entra com o salário mínimo (Lei 8.213, art. 48, § 4º)".
- **urb-direito** · O CNIS da MEI passou a chamar o DAS de "Carnê de 11 % (plano simplificado), 09/2019 a 08/2026, 84 meses" e diz "porque o carnê de 11 % só conta com a diferença", e o cartão da escolha manda "complementar o carnê de 11 % até 20 %"; o DAS do MEI é de 5 % (a tela antiga dizia só "Recolhimento no Plano …  
  corrigido depois: o DAS do MEI aparece como DAS de 5 %, e não como carnê de 11 %
- **urb-obstaculo** · Documentos pôs na lista da desempregada em graça, para marcar, "Comprovantes das últimas contribuições ao INSS — Carência de 10 contribuições mensais (não precisam ser consecutivas, mas a segurada deve manter qualidade de segurada). GPS com código correto para CI" (antes o item ficava em "Já temos",…  
  A corrigir: Tirar o item da lista da desempregada e a frase da carência de 10 contribuições do catálogo do salário-maternidade.
- **rur-direito** · Na Patrícia, cujo CNIS já tem o período de segurada especial (a guia diz "O CNIS já tem o período de segurada especial: ele basta como prova da roça"), Documentos agora marca para a lista impressa "Papéis da roça no nome dela ou do marido, com data anterior ao parto — notas, CCIR, ITR, sindicato; o …  
  A corrigir: Com o período de segurada especial no CNIS, não pré-marcar papéis da roça e mostrar só o que se aplica ao caso, sem a nota do sogro nem a do "do lar".
- **rev-obstaculo** · A caixa do dossiê na Identificação piorou: era "✗ Processos administrativos: nenhum pedido na lista do Meu INSS" e agora é "✗ Processos administrativos: o portal informou que não existe", o que desmente o quadro "Pedidos ao INSS" ("Aposentadoria por tempo de contribuição, NB 177.458.901-2, pedido em…  
  corrigido depois: a Identificação mostra o que o portal disse ("nenhum pedido na lista do Meu INSS")
- **acerto-obstaculo** · Duas telas pioraram. 1) Complementação que não existe: a aposentadoria manda "Pedir ao INSS o cálculo da complementação de (de 11 % para 20 %: ... cerca de R$ 0,00 antes dos acréscimos ...)" e "Pagar as guias da complementação", o Desfecho diz "sem complementar, nenhuma regra fecha; complementando p…  
  corrigido depois: sem mês a complementar antes do direito, não se fala em complementação
- **crps-obstaculo** · Documentos passou a marcar para a lista impressa "Traga a carteira de trabalho com o contrato e a saída na Hotel Ficticio B Ltda de 02/1995 a 06/1997, a rescisão, os holerites e o extrato do FGTS do período" (e a carência da aposentadoria repete "traga a carteira de trabalho..."), quando o Primeiro …  
  A corrigir: No recurso com a prova já no pedido, não pedir a carteira ao cliente nem marcá-la na lista impressa.
- **JA-obstaculo** · A escolha perdeu o cartão da pensão: na rodada anterior abria com "Prazo até 17/11/2026 — Dependentes — Falta: se quem faleceu era segurado na data do óbito; a prova da união estável", e agora o único cartão é "Falta um dado — Aposentadoria programável — Carência: 104 de 180; a 180ª em 01/2033", par…  
  corrigido depois: o cartão da pensão volta à escolha (a mesma causa da pensão por morte)

## Para o advogado decidir

Pontos em que a lei, o INSS e a Justiça divergem, ou em que a base de conhecimento precisa de revisão. O CRM só segue depois da decisão.

- **CNIS · acerto-obstaculo** · Com o CNIS corrigido, há opções de regra que o CRM não mostra. Primeira: direito adquirido à regra anterior, média dos 80 % maiores salários com fator. Segunda: art. 17, porque ele tinha mais de 33 anos em 13/11/2019 e o pedágio é zero, com média de 100 % e fator. Terceira: art. 20 aos 60 anos (14/05/2027), sem fator. Há ainda a complementação dos meses de MEI, que aumenta o tempo e os pontos. A escolha é estratégica. _EC 103, art. 3º, conferido no MCP normas; EC 103, arts. 17 e 20, e Lei 8.212, art. 21, § 3º (conferir)_
- **PcD · pcd-direito** · O valor é dado como '100% da média' sem mencionar a tese de que o art. 22 da EC 103, ao manter a LC 142 'inclusive quanto aos critérios de cálculo', preserva o salário de benefício pela regra anterior, com os 80% maiores salários, e não pela média de todos. A tese muda a renda e não o direito. _EC 103, art. 22 (texto conferido no MCP normas); a corrente e a aplicação pelo INSS (conferir)_
- **PcD · pcd_idade-obstaculo** · O requisito dos 15 anos aparece como 'conferido' só na leitura do Decreto e da IN, que exigem os 15 anos de contribuição 'na condição de pessoa com deficiência'. O texto da LC 142 exige 15 anos de contribuição e a 'existência de deficiência durante igual período', sem dizer que devem coincidir. Pela corrente ampliativa, Lúcia fecharia em 10/06/2028, quando a deficiência completa 15 anos, e não em 30/06/2029. A corrente restritiva é a majoritária: a TNU a uniformizou e a maior parte das Turmas Recursais de SP a segue. Uma Turma Recursal de SP já adotou a ampliativa. A tela devia mostrar o requisito como divergente. _LC 142, art. 3º, IV, contra Decreto 3.048, art. 70-C, § 1º, e IN 128, art. 311, II (os três conferidos no MCP normas e norma_inss); TNU, PUIL sobre o art. 3º, IV, conhecido e improvido [NÃO CONFIRMADO, id e9d6f41f-911c-42b2-b783-71e1a2cfc7ab]; 15ª TR SP, 5007139-51.2023.4.03.6317, 'desnecessidade de concomitância' [NÃO CONFIRMADO, id TRF35309373807]; 9ª TR SP, 5003777-03.2025.4.03.6307, concomitância exigida [NÃO CONFIRMADO, id TRF35379781405]_
- **B94 · b94-obstaculo** · O único caminho mostrado é o pedido no Meu INSS. A via que o esperado admite, ação acidentária direto na Justiça Estadual sem pedido novo porque a perícia de 31/08/2022 já examinou a sequela consolidada, não aparece. Na mesma guia, a frase sobre o canal ('a base diverge') deixa a atendente sem orientação. _Portaria Conjunta 15/2026, arts. 1º e 4º (MCP normas, não confirmado na fonte oficial); dispensa de novo requerimento: embargos do Tema 1124/STJ e REsp 2.270.389/RS (só no gabarito e na skill, conferir com o verificador-precedentes)_
- **B87 · def-obstaculo** · O CRM afirma como certo que o Bolsa Família entra na renda, mas a inclusão feita pelo Decreto 12.534/2025 é contestada pela própria base: retrocesso social, decreto que inova contra lei e o art. 20, § 3º-A, que veda deduções e acréscimos não previstos em lei. Neste caso a tese pesa no resultado. Sem o Bolsa Família, a renda é 700 ÷ 3 = R$ 233,33, abaixo do limite mesmo sem as negativas do SUS. É a rede de segurança judicial se o desconto dos gastos não for aceito. _LOAS, art. 20, § 3º-A, Lei 15.077/2024, e § 4º, Lei 14.601/2023 (conferido, normas); skill base-bpc-renda-per-capita-miserabilidade, seção Decreto 12.534/2025 (conferir)_
- **REV · rev-obstaculo** · A guia indicada chama o pedido de 'Recurso de Benefício', o que confunde com o recurso ao CRPS, que tem prazo de 30 dias e outro rito. A tela também afirma sem fonte que 'não cabe reafirmação da DER em revisão'. Entre os documentos para assinar está a 'Declaração de Não Recebimento de Benefício', que um aposentado em manutenção não pode assinar com verdade. _(conferir); IN 128, arts. 583 a 586 (pedido de revisão, art. 586 conferido)_
- **GPS · GPS-obstaculo** · Corrente favorável não explorada. O CRM só oferece complementar ('complemente a contribuição'). A TNU, no Tema 285, admite que a atualização ou revalidação extemporânea do CadÚnico, feita antes da exclusão do cadastro, valida retroativamente as contribuições de 5 %, sem pagar a diferença. A família aparece como 'Cadastrada'. No Tema 359, a TNU admite que a complementação posterior mantém a qualidade e a carência com efeito retroativo. A primeira via pode poupar à cliente o custo das 39 diferenças. O INSS aplica a leitura restritiva, e por isso a escolha é do advogado. _TNU, Tema 285 e Tema 359 [NÃO CONFIRMADO: ids e94b39e3-a686-4b40-a3c8-5e830eb68a78, 2e3035ca-e264-4176-b0ae-aecf341cbf4e e db7d1a1a-23bc-4a90-b582-d0329a05068e (tese do Tema 359) no MCP de jurisprudência; conferir a tese literal na fonte oficial]_
- **B21 · morte-obstaculo** · Com um só documento dos 24 meses, a tela não oferece saída. O INSS admite completar a prova por justificação administrativa (entrevista de testemunhas no INSS), e a corrente judicial ampliativa admite início de prova material somado a testemunhas, sem exigir dois documentos. _IN 128, art. 180, parágrafo único (conferido no MCP norma_inss); corrente ampliativa sobre início de prova material e testemunhas (conferir)_
- **B21 · morte-obstaculo** · Na qualidade do instituidor, o campo do desemprego só aceita registro no MTE ou seguro-desemprego. A corrente ampliativa aceita provar o desemprego involuntário por qualquer meio, e o campo fechado leva a responder 'Não' e a perder 12 meses de graça. _IN 128, art. 184, § 5º (conferido, leitura restritiva); corrente ampliativa sobre a prova do desemprego por qualquer meio (conferir)_
- **B93 · B93-obstaculo** · Dois pontos de estratégia não aparecem. Primeiro, desde quando a troca para B93 paga diferenças, já que a CAT é documento novo levado só na revisão. Segundo, se a ação da dependente vai à Justiça Estadual (acidentária) ou à Federal (só a cota do B21 por acidente de qualquer natureza). _CF, art. 109, I; Tema 414/STF; Tema 1053/STJ (conferir os três)_
- **B25 · reclusao-obstaculo** · O campo do desemprego do preso só aceita registro no MTE ou seguro-desemprego, e a corrente ampliativa aceita outros meios de prova. Neste caso o seguro existe, mas no preso que não recebeu o seguro o campo fechado faz perder 12 meses de graça. _IN 128, art. 184, § 5º (conferido, leitura restritiva); corrente ampliativa sobre a prova do desemprego (conferir)_
- **B31 · b31-obstaculo** · A qualidade na DII fica como "a informar", embora o relatório do HC de 14/07/2026 dê a quimioterapia desde 10/07/2026 e a incapacidade por tempo indeterminado. Com essa DII o requisito deveria sair como falta. A tela também não traz a única saída a favor da segurada, que é procurar documento anterior a 16/05/2026 para retroagir a DII. A mamografia de 20/03/2026 mostra o tumor, e não a incapacidade. _Corrente ampliativa que admite retroagir a DII pela documentação médica anterior (skill base-incapacidade-b31-temporaria; conferir); esperado do roteiro_
- **B31 · b31-direito** · O motorista de caminhão de uma transportadora tem hérnia discal lombar (M51.1), e a tela não pergunta se o serviço causou ou piorou a doença nem sugere conferir o NTEP. Se houver nexo, a espécie é a 91, com estabilidade de 12 meses, FGTS do afastamento e foro estadual. _Lei 8.213, arts. 20, 21-A e 118 (catálogo F232); Lista C do Anexo II do Decreto 3.048 (conferir o par M51 com o CNAE 4930)_
- **B32 · b32-obstaculo** · O requisito do valor diz 70 % da média e não avisa que isso dá cerca de R$ 500 a menos que o auxílio atual (91 %). O roteiro exige aviso por escrito ao cliente antes de pedir a aposentadoria, e a tela não traz a comparação que decide se vale pedir. _EC 103, art. 26, § 2º, III, e § 3º, II (conferido no MCP normas); Tema 1300/STF, com trânsito em 18/04/2026 (conferido no MCP superiores)_
- **B32 · b32-direito** · A reabilitação fica "a informar", embora o relatório do HC já registre 18 meses de reabilitação sem melhora. Também falta a pergunta sobre nexo (artrose de servente piorada pelo serviço), que mudaria o valor para 100 %. _Lei 8.213, art. 21, I (concausa; conferir); EC 103, art. 26, § 3º, II (conferido no MCP normas)_
- **B91/92 · acid-obstaculo** · A tela não mostra a diferença de valor (100 % contra os 68 % pagos, cerca de R$ 992 por mês desde 15/07/2025) nem o prazo do art. 104 (5 anos do reconhecimento da incapacidade permanente, 15/07/2030). Mostra só a decadência de revisão do art. 103. O nexo fica "a informar" apesar de o relato e a internação no HC no dia descreverem a queda dentro da usina. _EC 103, art. 26, § 3º, II (conferido no MCP normas); Lei 8.213, art. 104, II (conferido no MCP normas; o alcance sobre o fundo do direito é controvertido, e há corrente que o trata como prescrição só das parcelas)_
- **REST · REST-obstaculo** · A tela oferece ação na Justiça Federal com efeito desde 01/10/2026 e cita o recurso, mas a cliente não pediu prorrogação e não há decisão para recorrer. Pela tese da TNU, sem prorrogação, recurso ou pedido novo não há interesse de agir. O ato certo é o pedido novo hoje, que pode ser só com atestado porque o benefício anterior veio de perícia presencial. _Tema 277/TNU, aplicado pela TNU como compatível com o Tema 350/STF (MCP TNU, PUIL 0500604-98.2021.4.05.8500, [NÃO CONFIRMADO] id 2a713b12-261f-4b13-a773-7b8604b361c5); PC 13/2026, art. 6º, III; IN 128, art. 347 (conferidos no MCP)_
- **REST · REST-obstaculo** · No limbo, o vínculo aberto é a prova do emprego e da qualidade de segurada. A tela diz que o CRM encerrou o vínculo na última remuneração e oferece "Acerto de CNIS" com RAC. Isso induz a pedir a baixa do vínculo, o que o roteiro proíbe. Também falta qualquer roteiro do limbo: ASO inapto, apresentação por escrito à empresa até 30/10/2026 e aviso ao advogado. _Tema 300/TNU (só na skill base-limbo-previdenciario-tema300; conferir); prazo de 30 dias para o abandono, pela Súmula 32 do TST (conferir)_
- **CRPS · crps-obstaculo** · O item de preclusão pergunta "leva documento novo?" sem avisar a consequência. Documento juntado só depois da decisão, em revisão ou recurso, gera efeito financeiro a partir da entrega. Isso decide os atrasados nas duas personas: na do obstáculo a prova já estava no pedido, e na do direito convém conferir se o seguro-desemprego constava da base do INSS. _IN 128, art. 566, §§ 6º a 8º, e art. 184, § 5º. Conferido no norma_inss_
- **CRPS · crps-obstaculo** · Para o PEXT do Hotel B a tela sugere o RAC Vínculos, um acerto paralelo, quando o recurso pede que a Junta compute o vínculo pela CTPS já juntada. Um acerto em curso pode gerar exigência e confundir a estratégia. _Decreto 3.048/99, art. 19, § 3º (conferir)_
- **CÓPIA · COPIA-obstaculo** · A negativa foi por análise documental, e a tela não mostra a alternativa ao recurso, um novo pedido documental a partir de 31/10/2026. Também não diz que o recurso preserva a data do pedido (25/08/2026) e o pedido novo não preserva. _Portaria Conjunta MPS/INSS 13/2026, art. 6º, VI (conferir); Regimento do CRPS, art. 89, §§ 3º a 5º (conferido)_
- **B41H · hibrida-obstaculo** · A cliente trabalhou na roça a partir dos 12 anos (03/1976), e a tela não avisa que o INSS pode recusar o período abaixo da idade que aceita. A corrente ampliativa computa o labor rural desde tenra idade, com fundamento protetivo. O gabarito mostra que, mesmo sem 1976 a 1980, o direito continua (220 meses). _IN 128, art. 5º (conferir); a corrente ampliativa do cômputo desde tenra idade é tese judicial (conferir)_
- **B80R · rur-direito** · A base do 'não precisa pagar' está desatualizada. A IN 188/2025, depois da ADI 2110, revogou o art. 197 da IN 128, que exigia 10 contribuições também da segurada especial. Fica aberta a questão de saber se os 12 meses de atividade do art. 39, parágrafo único, sobrevivem como requisito autônomo. A corrente ampliativa sustenta que eles funcionam como carência e caíram com a ADI. A corrente restritiva os mantém como prova da condição de segurada especial. _ADI 2110, acórdão de 21/03/2024 (localizado no MCP superiores); IN 128, art. 197, revogado pela IN 188/2025, e art. 357, caput (conferido no norma_inss)_
- **SD · SD-obstaculo** · A tela não distingue as duas regras. Para a aposentadoria, os 91 dias de obra ficaram abaixo de 120 no ano e não tiram a condição de segurado especial. Para o seguro-defeso, qualquer outra renda no período entre defesos impede. A skill da casa sugere levar a tese dos 120 dias à via judicial, e a escolha cabe ao advogado. _IN 128, art. 112, IX, 'd' (conferir); Lei 10.779, art. 2º, § 2º, III, 'c' (conferido); skill base-seguro-defeso-pescador-artesanal, desatualizada (ainda fala em INSS e CRPS)_
- **IIR · IIR-obstaculo** · A tela não fala da devolução do imposto já descontado, que é o ato que vale dinheiro nesse caso (03/2022 a 12/2025), nem do prazo de 5 anos. Não diz que a devolução se pede corrigindo as declarações ou em ação contra a União, e não contra o INSS, sem pedido prévio. Também não aponta que o primeiro ano vence em 2028. _Portaria DIRBEN/INSS 992/2022, art. 293, § 1º (corpus); CTN, art. 168, I (conferir); Tema 1373/STF, RE 1.525.407 (skill, conferir no superiores); termo a quo na declaração de ajuste, REsp 1.472.182/PR (skill, conferir)_
- **IIR · IIR-direito** · O CRM manda gerar a 'Declaração de Não Recebimento de Benefício' para quem recebe aposentadoria; assinada, é uma declaração falsa. O contrato também segue o modelo de aposentadoria e pensão, que não é o do serviço tributário. Acontece nos dois clientes. _(conferir) modelo de contrato do escritório_
- **B42 · transicao-obstaculo** · A escolha entre complementar agora (cerca de R$ 9,3 mil mais acréscimos, B42 já, com 100 % da média) e esperar a idade aos 65 (10/05/2029, sem custo, coeficiente menor e 31 meses sem benefício) não aparece. Com esse custo de complementação em jogo, a decisão é do advogado e precisa da conta dos dois lados. _EC 103, art. 20, IV, conferido no MCP normas (ec-103-2019:principal:20:v1, NÃO CONFIRMADO); EC 103, art. 26, §§ 2º e 3º, I (conferir)_
- **B57 · professor-direito** · A regra permanente do professor aparece como 'INFORMATIVO' e 'conferido', mas a própria nota admite que a leitura é discutível. O caput do art. 19 da EC 103 restringe ao filiado depois da EC, e o § 1º, II, não repete a restrição. Pela convenção do CRM, isso é 'divergente', com as duas posições. Aqui não muda o resultado: Marcelo cumpriria (60 anos e mais de 25 de magistério), mas o pedágio de 100 % paga mais. _EC 103, art. 19, caput e § 1º, II (conferido no MCP normas); IN 128, art. 250 (conferir)_
- **CTC · CTC-direito** · O cartão Aposentadoria programável empurra o caso para uma aposentadoria no INSS ("faltam 2 para as 180"). Ele não avisa que o tempo levado na certidão sai do INSS. Também pergunta se a pessoa já foi servidora, quando o CNIS já mostra o PRPPS. Escolher entre levar o tempo para a prefeitura ou guardá-lo para um benefício do INSS é decisão de estratégia, e a tela tem de mostrar as duas saídas. O mesmo vale para CTC-obstaculo ("as 180 cumpridas"). _Lei 8.213, art. 96, III e VIII (conferidos no MCP normas). IN 128, arts. 517 e 519, sobre revisão e cancelamento da CTC (conferir)._
- **CTC · CTC-direito** · Faltam no módulo da espécie, que não existe, os avisos que mudam a estratégia em outros casos de CTC. O auxílio-acidente acaba na emissão. O auxílio por incapacidade temporária tem de ser cessado a pedido antes. O aposentado no INSS só certifica o período depois da DIB. O tempo especial e o da PcD saem discriminados e sem conversão. Rural anterior a 11/1991 e segurado especial só entram indenizados. Aluno-aprendiz só até 15/12/1998 e se o ente não tinha regime próprio. _IN 128, arts. 511, §§ 5º e 8º, 513, I e II, e 514, § 1º, III a V (conferidos no norma_inss). Lei 8.213, art. 96, I e IX (conferidos). Cabe dizer ao advogado que a vedação de converter o especial na certidão é a leitura do INSS, e que o cômputo convertido no regime próprio tem corrente judicial própria (STF, Tema 942, conferir)._
- **Incapacidade** · Pedido novo depois do corte do auxílio: a IN 128, art. 346, conta 30 dias da DCB; a Portaria Conjunta 13/2026, art. 6º, aceita o pedido no dia seguinte à cessação. Decidir qual regra a tela mostra ao atendente.
- **Incapacidade** · Recurso no Atestmed: a Portaria Conjunta 13/2026, art. 9º, conta o prazo da decisão; o Decreto 3.048, art. 305, conta da ciência. Decidir o marco do prazo.
- **Acidentário** · Ação acidentária: a Lei 8.213, art. 104, dá 5 anos; as skills tratam o direito como imprescritível. Decidir o que a tela mostra como prazo.
- **PcD por tempo** · Grau preponderante quando há mais tempo sem deficiência: a norma não diz se 'sem deficiência' conta como grau (Decreto 3.048, art. 70-E, § 1º; IN 128, art. 309, § 1º). Fixar a regra que o motor deve usar.
- **Transição** · Ajustes da EC 103 (complementação, agrupamento, utilização do excedente): no mesmo ano civil, pela EC, ou a qualquer tempo, pelo RPS. Decidir a regra do prazo que a tela mostra.
- **Especial** · Tema 1291/STJ (tempo especial do autônomo não cooperado) não está no catálogo: o requisito de categoria da B46 deveria ser divergente. Confirmar o tema e marcar o requisito.
- **Pensão** · Filho inválido: o catálogo exige invalidez antes dos 21 anos; a Portaria Conjunta 94/2024, Anexo X (ACP 0059826-86.2010.4.01.3800), aceita a invalidez depois dos 21, até o óbito. Confirmar a ACP vigente e ajustar o requisito.
- **Pensão** · Menor sob guarda: as ADIs 4878 e 5083 valem para óbitos de 14/10/1996 a 13/11/2019; a ACP de SP tem alcance incerto depois disso. Decidir a posição para óbitos posteriores à EC 103.
- **Seguro-defeso** · Seguro-defeso com salário-maternidade da pescadora: a IN 128, art. 639, § 3º, veda a acumulação; o Decreto 8.424, art. 1º, § 8º, aceita a do período anterior. Decidir a orientação.
- **Revisão** · Revisão com documento novo e prazo no fim: a skill de decadência manda protocolar e ajuizar ao mesmo tempo; a do Tema 1124 aponta extinção sem mérito. Escrever a regra do escritório.
- **Recurso** · O art. 126-A da Lei 8.213 (MP 1.113/2022) aparece vigente, mas o Regimento do CRPS de 2026 manda a Junta julgar a matéria médica. Conferir a vigência antes de orientar.
- **BPC** · As skills se contradizem sobre o instrumento de avaliação do BPC: a analise-bpc-loas diz Portaria Conjunta 2/2015; a base-bpc-impedimento-longo-prazo diz IFBrM. Unificar a base numa onda própria.
- **Erros na base** · Skill da JA: cita a IN 128, arts. 595 e 596 (prescrição), admite nova JA do mesmo fato, fala em 'entrevista rural obrigatória' e dá 60 dias de análise sem fonte. Glossário: DPR é Data do Pedido da Revisão, RAC é Requerimento de Atualização do CNIS, PAT tem duas definições. Seguro-defeso: chama o benefício de B04, manda pedir no INSS e conta o ano do RGP pelo defeso. inss-canais: pontos e idade progressiva errados. PcD: recurso em '30 dias úteis'. Híbrida: marco dos 20 anos em 13/11/2019 (é 14/11/2019). IR: diz que a Lei 14.126/2021 incluiu a cegueira monocular na isenção. Corrigir numa onda da base de conhecimento, separada do CRM.

## Como foi feito

Cada espécie ganhou dois clientes fictícios, montados a partir de um gabarito escrito com a norma conferida.

O CRM rodou com banco simulado. Um robô percorreu Identificação, Primeiro atendimento, escolha dos benefícios, Análise de Direito, Desfecho e Documentos, e gravou o texto e a imagem de cada tela.

Trinta e um leitores julgaram as telas por cinco lentes (reconhecer o caso, instruir quem atende, interpretar a norma, linguagem simples e visual), e quinze especialistas da base conferiram o que o CRM afirma.

A: leva a erro ou faz perder direito. B: atrapalha o atendimento. C: acabamento.

Primeira rodada de correção no próprio CRM; primeira conferência (65 dos 244 graves corrigidos). Segunda rodada em seis frentes paralelas, uma por família, cada uma com a sua cópia do CRM e o seu servidor de teste, juntadas por fusão de três vias; terceira conferência nas telas novas. Os erros novos que ela achou foram corrigidos em seguida, e as telas desta página são as do CRM final (11.60). A suíte de testes do CRM passa inteira (152 provas).
