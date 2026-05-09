---
name: base-honorarios-contratuais-cobranca
description: "Honorários contratuais e cobrança de clientes em advocacia previdenciária pró-segurado, distintos de honorários de sucumbência. Use SEMPrE que mencionar honorários contratuais, contrato de honorários advocatícios, cobrança de cliente, lista 💵 Pagamentos, Microsoft To Do Pagamentos, percentual sobre atrasados, percentual sobre mensalidade, honorários ad exitum, honorários iniciais, honorários por etapa, parcelamento de honorários, inadimplência cliente, distrato com cliente, retenção de documentos por inadimplência, ação de cobrança honorários, execução honorários OAB, retenção art 22 EAOAB, contrato escrito advocatício, honorários em RPV, destaque de honorários no precatório, antecipação cliente, cobrança preventiva, lembrete de pagamento, código de ética OAB cobrança. Cruza com base-cpc-honorarios-sucumbencia-previdenciaria, base-cumprimento-sentenca-rpv-precatorio, base-canais-falabr-corregedoria-cgu e base-aposentadoria-futura-pipeline."
---

# Honorários Contratuais e Cobrança de Clientes

## Escopo

Skill operacional pró-segurado do escritório Paulo Roberto Tercini Filho. Diferente da skill de sucumbência (`base-cpc-honorarios-sucumbencia-previdenciaria`), esta skill trata da relação contratual com o cliente. Cobre desde a fixação do honorário no início do caso até a cobrança em caso de inadimplência. A auditoria identificou 51 tarefas abertas em 💵 Pagamentos, sendo 20 sem body (cobrança cega, sem registro de tentativa anterior).

## Premissa central

Honorário contratual é receita do escritório. Honorário de sucumbência é prêmio adicional. Os dois NÃO se confundem. Súmula 47 STJ. O cliente paga o contratual; o vencido paga a sucumbência. Quando a parte é vencedora, o escritório recebe os dois. Quando perde, recebe apenas o contratual já pago.

A boa gestão do contratual garante o caixa do escritório e elimina o conflito posterior com o cliente. A má gestão acumula tarefas em 💵 Pagamentos sem clareza, vira dívida de difícil recuperação.

## Fundamento normativo

**EAOAB (Estatuto da OAB) art. 22.** Honorário advocatício é direito do advogado.
**EAOAB art. 22 §4º.** Destaque do honorário no pagamento (RPV ou precatório), inclusive em ação previdenciária.
**EAOAB art. 24.** Execução do contrato de honorários como título executivo extrajudicial.
**Código de Ética OAB.** Veda cobrança vexatória, mas autoriza cobrança regular e protesto via órgão de classe se necessário.
**Lei 8.906/1994 art. 35.** Diferenças entre honorários contratual, fixado e arbitrado.

## Modalidades de fixação no escritório

### Modelo padrão pró-segurado previdenciário

**A. Honorário ad exitum (mais comum).** Percentual sobre o resultado, somente devido se houver êxito. Padrão do escritório:
- 30 % sobre o valor dos atrasados (parcelas vencidas até a sentença ou implantação)
- 1 mensalidade do benefício concedido (devida apenas após implantação)

**B. Honorário inicial fixo.** Valor pago no momento da contratação para cobrir despesas e início do trabalho. Padrão sugerido R$ 500 a R$ 1.500 dependendo da complexidade.

**C. Honorário por etapa.** Para casos longos (recurso, ação judicial), divisão por etapa procedimental. Cada etapa concluída gera nota.

**D. Honorário fixo total.** Pouco usado em previdenciário. Mais comum em cível e consultivo.

### Acordo verbal vs escrito

Regra do escritório, todo cliente novo deve ter contrato escrito assinado. Quando o cliente recusa o escrito (pessoa idosa, baixa instrução), reduzir a termo no body da tarefa do To Do com data e testemunhas, e gravar áudio de aceitação se possível.

## Configuração no Microsoft To Do

Cada cliente em 💵 Pagamentos deve ter no body:

```
[CASO]: Aposentadoria por Idade Urbana, processo XXX
[HONORÁRIOS CONTRATUAIS]: 30% atrasados + 1 mensalidade
[HONORÁRIO INICIAL]: R$ 800 quitado em DD/MM/AAAA
[FORMA DE PAGAMENTO]: PIX 11999999999 ou parcelado em 3x
[STATUS]: Aguardando crédito de atrasados / Implantado, falta cobrar mensalidade / Inadimplente

FIXO: cliente prefere PIX direto
FIXO: tem documento na pasta cinza para devolver
```

Itens de checklist devem registrar cada pagamento com data e valor: `(A): Pagou R$ 1.300 em 13/04/2026`. Padrão atual já em uso, manter.

## Diagnóstico atual

Auditoria revelou:
- 51 tarefas abertas em 💵 Pagamentos
- 20 sem body (cobrança cega, sem histórico de tentativa)
- 7 abandonadas há mais de 180 dias

Recomendação imediata é preencher os 20 bodies vazios. Não se sabe se houve contato anterior, valor combinado, status de pagamento.

## Rotina de cobrança preventiva

**Antes do crédito chegar.** Quando benefício é implantado e atrasados liberados, gerar tarefa em 💵 Pagamentos com prazo igual à data de previsão de crédito + 7 dias. No D-7, contato proativo perguntando se o crédito chegou.

**No vencimento.** Se cliente não respondeu em 30 dias após crédito confirmado, cobrança formal por WhatsApp ou e-mail.

**Cobrança formal.** Mensagem padronizada respeitosa lembrando do contrato e do crédito.

**Inadimplência prolongada.** Após 60 dias sem pagamento e sem resposta a duas tentativas, escalar para cobrança escrita formal (carta com AR).

**Notificação extrajudicial.** Após 90 dias, notificação extrajudicial via OAB ou cartório. Skill `base-notificacao-extrajudicial-mapeamento-institucional`.

**Execução do contrato.** Última instância. Ação de execução de título extrajudicial pela soma devida + correção + juros + multa.

## Estratégia de retenção (RPV/precatório)

Em ação judicial, o destaque do honorário contratual no RPV ou precatório (art. 22 §4º EAOAB) garante que o escritório receba diretamente, sem depender da boa-fé do cliente. Procedimento:

1. No início da ação, juntar contrato de honorários nos autos.
2. Antes da expedição do RPV/precatório, pedir destaque dos honorários contratuais no valor X ou %.
3. Juiz determina destaque. Escritório recebe diretamente do tribunal.

Falha na retenção é causa frequente de inadimplência posterior. Skill `base-cumprimento-sentenca-rpv-precatorio`.

## Hipóteses-armadilha

**Cliente quer renegociar após êxito.** Ouvir, mas registrar que o contrato é título executivo. Se a renegociação for por dificuldade comprovada, conceder desconto pontual mas formalizado por aditivo.

**Cliente diz que não tinha conhecimento do honorário.** Se foi acordo verbal sem registro, fica difícil. Por isso, padrão do escritório deve ser sempre escrito ou com áudio gravado.

**Cliente faleceu.** Honorário contratual é dívida do espólio. Habilitar crédito no inventário. Pensão por morte para dependentes pode gerar novo contrato com sucessores.

**Distrato a pedido do cliente.** Cliente pede para sair, escritório ainda não recebeu. Calcular honorários proporcionais ao trabalho já feito. Cobrança formal ou ação se houver resistência.

**Cliente trocou de advogado durante o caso.** Honorários proporcionais ao trabalho já feito. Comunicar ao novo patrono e ao juízo (em ação judicial).

## Estratégia tributária

Honorário contratual é receita tributável do escritório. Emitir nota fiscal correspondente. Recolhimento de tributos conforme regime (Simples Nacional, lucro presumido, lucro real). Manter controle por cliente para apuração.

Em cobrança após anos, atualização monetária e juros pelo IPCA + 1% ao mês (ou índice da cidade) podem ser exigidos.

## Comunicação com cliente

Ton de cobrança: respeitoso, lembrancete, sem agressividade. Padrão pró-segurado significa também tratar o cliente como parceiro mesmo na cobrança.

Templates oficiais sugeridos (a serem construídos como artefatos do escritório):
- **Cobrança preventiva.** "Olá Sr./Sra. X, conforme combinado, seu benefício foi implantado e os atrasados foram liberados. Quando puder, podemos acertar o honorário contratual? Valor R$ Y, PIX [chave]."
- **Cobrança de mensalidade.** "Olá, como foi acordado, no mês da implantação fica devida 1 mensalidade do honorário. Valor R$ Y. Combina passar por aqui ou faço PIX?"
- **Lembrete de inadimplência (30+ dias).** "Olá Sr./Sra. X, vi que ainda não recebemos o pagamento combinado. Se houver alguma dificuldade, podemos conversar e ver alternativa."
- **Última tentativa amigável (60+ dias).** Texto formal lembrando do contrato e abrindo espaço para parcelamento.

## Integração com outras skills do escritório

- `base-cpc-honorarios-sucumbencia-previdenciaria` (sucumbência, complementar)
- `base-cumprimento-sentenca-rpv-precatorio` (destaque em RPV/precatório)
- `base-notificacao-extrajudicial-mapeamento-institucional` (notificação extrajudicial)
- `base-canais-falabr-corregedoria-cgu` (Ouvidoria do INSS quando cliente abandona pós-concessão)

## Métrica de sucesso

- Tempo médio entre implantação e quitação do contratual (meta < 30 dias)
- Taxa de inadimplência (meta < 5 % da carteira)
- Tarefas abertas em 💵 Pagamentos (meta < 30, hoje em 51)
- Tarefas em 💵 Pagamentos sem body (meta zero, hoje em 20)
- Cobranças que evoluem para ação executiva (meta < 1 % - sinal de boa relação)

## Link operacional

Lista no Microsoft To Do, `💵 Pagamentos`. Acessível pelo conector Microsoft Graph.

EAOAB (Lei 8.906/1994), arts. 22 a 35, fundamento dos honorários.
