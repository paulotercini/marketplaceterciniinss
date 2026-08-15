---
name: base-aposentadoria-futura-pipeline
description: "Pipeline operacional pró-segurado de gestão da carteira de Aposentadorias Futuras, identificando o momento exato de acionamento, antecipação documental e contato preventivo. Use SEMPRE que mencionar carteira de aposentadoria futura, lista 🙏 Aposentadorias Futuras, cliente esperando direito amadurecer, monitoramento de DER próxima, marco etário próximo, completar idade para aposentadoria, completar tempo de contribuição, gatilho de acionamento, contato preventivo cliente, maturação de direito, janela de protocolo, carteira potencial INSS, conversão futuro em ativo, follow-up de cliente em espera, dueDateTime D-60, contato D-90 preventivo, próxima ação aposentadoria futura, abandonadas Aposentadorias Futuras. Cruza com base-aposentadoria-regra-permanente-ec103, base-aposentadoria-transicao-ec103, base-aposentadoria-pcd-lc142, base-aposentadoria-direito-adquirido, ponte-orquestrador-previdenciario e base-cnis-conferencia-divergencias."
---

# Pipeline de Aposentadorias Futuras

## Escopo

Skill operacional pró-segurado do escritório Paulo Roberto Tercini Filho. Orienta a gestão sistemática da lista 🙏 Aposentadorias Futuras do Microsoft To Do, que concentra clientes JÁ atendidos cujo direito ainda não amadureceu. Hoje a lista tem 377 tarefas, 89 % abertas, sendo 154 abandonadas há mais de 180 dias e apenas 11 % de taxa de fechamento. É a maior carteira potencial inativa do escritório e exige tratamento de funil ativo.

## Premissa central

Cliente em Aposentadorias Futuras NÃO é cliente arquivado. É cliente em "stand-by" com acordo prévio de retorno. A janela útil de acionamento é estreita. Se o escritório não contata no momento certo, o cliente:
1. Esquece de retornar e procura outro advogado
2. Protocola sozinho pelo Meu INSS
3. Perde a janela ideal e recebe benefício menor

A boa gestão da carteira converte espera em receita futura. A má gestão é perda silenciosa.

## Regra dos 3 marcos temporais

Para cada tarefa em 🙏 Aposentadorias Futuras com data alvo definida, configurar três marcos:

**Marco D-90 (90 dias antes da data alvo).** Contato preventivo. Não pede ação. Apenas reativa o relacionamento. Mensagem padrão "estamos chegando perto, vamos preparar a documentação". Confirma telefone, endereço, e checa se o cliente continuará com o escritório.

**Marco D-60 (60 dias antes da data alvo).** Contato operacional. Solicita CTPS atualizada, comprovante de residência recente, documento de identidade vigente, e atualiza CNIS. Marca atendimento presencial ou virtual para acerto de documentos.

**Marco D-0 (data alvo).** Protocolar requerimento administrativo no Meu INSS imediatamente após o cliente cumprir o requisito (idade, tempo de contribuição, deficiência caracterizada). Se o cliente atrasou a documentação, segurar até estar pronto, mas reabrir contato semanal.

## Configuração no Microsoft To Do

Cada tarefa em 🙏 Aposentadorias Futuras deve ter no body, em formato fixo:

```
[BENEFÍCIO ALVO]: Aposentadoria por Idade Urbana / TC / PCD LC 142 / etc
[REQUISITO PENDENTE]: idade 65 / 35 anos contribuição / etc
[DATA ALVO]: 01/05/2027 (data exata em que o requisito é cumprido)
[ÚLTIMO CONTATO]: 02/05/2026 (data da última conversa registrada)
[CADÊNCIA DE CONTATO]: a cada 6 meses (entre acordos verbais com o cliente)
[HONORÁRIOS]: 30% atrasados + 1 mensalidade (preacordados)

FIXO: cliente quer ser avisado por WhatsApp antes
FIXO: tem documentos físicos no envelope X do armário
```

E no `dueDateTime` da tarefa, configurar a data alvo MENOS 60 dias (D-60). O Microsoft Graph não suporta múltiplos dueDateTimes, então adota-se o D-60 como gatilho operacional principal.

## Diagnóstico atual da carteira

A auditoria identificou:
- 377 tarefas totais, 336 abertas, 41 concluídas
- 154 abandonadas há mais de 180 dias
- 68 sem nenhuma entrada datada (vácuo informacional)
- 74 com data alvo nos próximos 180 dias (acionamento iminente)
- 271 onde Paulo é último autor (ou sem autor)

Há concentração de Aposentadoria por Idade Urbana (186 dos 336 abertos = 55 %), seguida de TC (54), Especial (43), PCD (37) e BPC (28).

## Rotina mensal de varredura

No primeiro dia útil de cada mês, executar `maturacao_aposentadorias.py` (a construir) que percorre a lista 🙏 Aposentadorias Futuras e gera três relatórios:

1. **Acionamento iminente.** Tarefas cujo dueDateTime está nos próximos 60 dias. Aciona D-60.
2. **Pré-acionamento.** Tarefas cujo dueDateTime está entre 60 e 120 dias. Aciona D-90.
3. **Hibernação saudável.** Tarefas cuja data alvo está a mais de 120 dias. Apenas confirmar que não estão abandonadas (último contato há menos de 6 meses).

Para cada caso de acionamento, o script gera mensagem WhatsApp pronta usando os templates oficiais do escritório.

## Tratamento das 154 abandonadas

Triagem em sessão dedicada (Paulo + Amanda) com 4 destinos possíveis:

**Manter na lista.** Cliente confirmado em contato recente, data alvo ainda longe.

**Mover para Clientes Encerrados.** Cliente sumiu há mais de 2 anos sem retornar contato, ou já se aposentou em outro escritório (verificar Meu INSS).

**Acionar agora.** Data alvo já passou ou está a menos de 90 dias e tarefa estava sem ação. Tratar como urgência.

**Cancelar.** Cliente faleceu (verificar). Sucessores podem ser candidatos a pensão por morte.

## Documentação prévia obrigatória

Por padrão, ao cadastrar cliente em 🙏 Aposentadorias Futuras, registrar no body:

- Espécie de benefício e regra de cálculo aplicável
- Lista de contribuições já comprovadas
- Lista de contribuições faltantes ou questionáveis
- Acordo de honorários (escrito ou verbal documentado)
- Telefone, e-mail, endereço atualizados
- Forma de contato preferida (WhatsApp, ligação, presencial)

Isso evita que, na hora do acionamento, perca-se tempo refazendo onboarding.

## Hipóteses-armadilha

**Cliente perdeu qualidade de segurado durante a espera.** Verificar período de graça, contribuições facultativas em manutenção. Se perdeu, recalcular janela.

**Surgiu nova regra mais favorável.** Periodicamente reavaliar se o caso ganhou hipótese alternativa (transição vs permanente, RVT, especial pós-Pareceres Fundacentro).

**Cliente já contribuiu o suficiente para aposentadoria proporcional.** Avaliar se vale antecipar com cálculo menor antes da data alvo.

**Cliente faleceu sem aposentar.** Pensão por morte para dependentes. Skill `base-pensao-por-morte-pos-reforma`.

## Estratégia administrativa

Protocolo no Meu INSS deve ser feito **no dia em que o requisito é cumprido**, não antes. Pedidos antecipados são indeferidos por ausência de requisito e geram retrabalho. Uma exceção é a aposentadoria especial pós-Tema 709 STF, em que se pode pedir antes da DER se já há tempo especial computado e o cliente continuar exposto.

Quando o cliente PODE escolher entre regras (transição vs permanente), simular ambas e protocolar a mais vantajosa. Se houver dúvida, protocolar a mais fácil (idade ou TC) e, em paralelo, instruir judicial pela mais vantajosa.

## Estratégia judicial

Se INSS demora mais de 60 dias após DER, MS por mora administrativa pelo acordo do RE 1.171.152/STF (ex-Tema 1066, cancelado em 22/02/2021). Skill `base-ms-decadencia-omissao-demora`.

Se INSS indefere DER cumprida, recurso ordinário ao CRPS em 30 dias. Skill `ponte-workflow-crps`.

Se há divergência de cálculo, ação ordinária revisional pós-concessão. Não esperar. Decadência pode aproximar.

## Integração com outras skills do escritório

- `base-aposentadoria-direito-adquirido` para regras transitórias
- `base-aposentadoria-regra-permanente-ec103`, `base-aposentadoria-transicao-ec103` para enquadramento
- `base-aposentadoria-pcd-lc142` para PCD
- `base-cnis-conferencia-divergencias` para auditoria documental antes do protocolo
- `base-ms-decadencia-omissao-demora` para mora pós-DER
- `ponte-orquestrador-previdenciario` para casos com pluralidade de hipóteses

## Métrica de sucesso

Indicadores a acompanhar mensalmente:
- Quantidade de clientes em 🙏 Aposentadorias Futuras (estável é OK)
- Conversões para protocolado (meta crescente)
- Taxa de abandono (clientes sem contato há mais de 1 ano - meta zero)
- Tempo médio entre data alvo e protocolo efetivo (meta 0 a 30 dias)

## Link operacional

Lista no Microsoft To Do, `🙏 Aposentadorias Futuras`. Acessível pelo conector Microsoft Graph com escopo `Tasks.ReadWrite`.

Script auxiliar `maturacao_aposentadorias.py` (em construção no repositório `paulotercini/marketplaceterciniinss`).
