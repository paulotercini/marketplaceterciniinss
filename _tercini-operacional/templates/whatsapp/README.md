# Templates de WhatsApp — Guia Rápido

Documento canônico em [`padroes-v3.md`](./padroes-v3.md) — 173 templates em 20 blocos consolidados a partir de 39 conversas reais.

## Como o sistema funciona

1. **Você ou Claude Code escolhe um template** com base no contexto da tarefa do Microsoft To Do (ver [`integracao-to-do.md`](./integracao-to-do.md))
2. **Os placeholders `{{...}}` são preenchidos** com dados extraídos do title, body, checklist da tarefa
3. **A mensagem pronta é apresentada** para você revisar e enviar pelo WhatsApp

## Vozes do escritório

| Voz | Quando usa |
|---|---|
| **Dr. Paulo Tercini** | Decisão técnica, cálculos, projeções, concessão, indeferimento, estratégia, recursos, MS, ações judiciais |
| **Dra. Amanda Garcez** | Incapacidade, BPC, acompanhamento processual, IREC-INDPEND, cota PCD |
| **Dr. Marcos** | CRPS, alertas curtos sobre pagamentos, golpes, defesa apresentada |
| **André Dellavechia** | Triagem inicial, agendamento, desculpa por demora |
| **Ingrid** | Triagem inicial, confirmação de consulta, ondas de golpe |
| `{{ATENDENTE}}` | Voz genérica que assume a persona apropriada conforme o contexto |

## Placeholders mais usados

| Placeholder | Significado | Exemplo |
|---|---|---|
| `{{NOME}}` | Primeiro nome ou nome completo do cliente | Sumara |
| `{{TRATAMENTO}}` | "senhor" ou "senhora" (formal) ou "você" (informal) | senhor |
| `{{TRATAMENTO_POSSESSIVO}}` | "seu" ou "sua" | seu |
| `{{POSSESSIVO}}` | "seu" / "sua" coincidente com o caso | seu |
| `{{DATA}}` | Data no formato DD/MM/AAAA | 11/05/2026 |
| `{{HORARIO}}` | Hora no formato HH:MM ou HHh | 09:00 ou 14h |
| `{{VALOR}}` | Valor em reais | 4.250,00 |
| `{{CIDADE}}` | Cidade | Monte Alto |
| `{{BANCO}}` | Banco que vai pagar | Banco do Brasil |
| `{{ATENDENTE}}` | Nome do atendente que assina | Dra. Amanda Garcez |
| `{{TURNO}}` | "Bom dia" / "Boa tarde" / "Boa noite" | Bom dia |
| `{{DIB}}` | Data de início do benefício | 01/05/2026 |
| `{{DCB}}` | Data de cessação do benefício | 01/05/2027 |
| `{{DER}}` | Data de entrada do requerimento | 01/05/2026 |
| `{{TIPO_BENEFICIO}}` | Espécie do benefício | aposentadoria por idade |
| `{{COMARCA}}` | Comarca / vara | Monte Alto |
| `{{PERCENTUAL}}` | Percentual de honorários | 30 |

## Convenções operacionais

### Atendimento presencial
- **Endereço:** Rua Rui Barbosa, 663 — Centro, Monte Alto-SP (frente ao INSS)
- **Telefone:** (16) 3242-2908
- **Horário:** Segunda a sexta, 07h às 17h
- **Dr. Paulo:** Atende presencial em Monte Alto **somente quartas-feiras** (mora em Matão; demais dias atende por ligação ou mensagem)

### PIX para honorários
- **Chave:** 224.627.048-09 (CPF)
- **Titular:** Paulo Roberto Tercini Filho

### Estilo
- Coloquial, próximo do cliente, sem jargão técnico desnecessário
- DIFERENTE do estilo técnico das peças processuais
- Empático em situações sensíveis (saúde, golpes, demora processual)
- Direto e objetivo em comunicações operacionais (perícia agendada, pagamento, prazo)

## Quando consultar este conjunto

**Use quando:**
- Cliente do To Do precisa receber comunicação por WhatsApp
- Quer manter consistência da voz do escritório
- Precisa de fórmula testada para situação delicada (golpe, indeferimento, demora)
- Vai redigir mensagem em massa ou rotina (lembrete de perícia D-7, D-3, D-1)

**NÃO use para:**
- Petição processual (use skills do plugin `base-conhecimento-inss`)
- Decisão estratégica de mérito (consultar Dr. Paulo)
- Resposta automatizada sem revisão (sempre validar antes de enviar)

## Mapeamento contexto → template

Ver [`integracao-to-do.md`](./integracao-to-do.md) para a tabela completa de "que template usar quando".

## Slash command

```
/mensagem <CPF ou nome>
```

Identifica a tarefa do cliente, extrai o contexto e sugere o template apropriado preenchido.
