---
description: Sugere mensagem WhatsApp pronta para um cliente, baseada no contexto da tarefa no Microsoft To Do e nos templates oficiais do escritório (padroes-v3.md).
allowed-tools: Bash, Read
argument-hint: <CPF de 11 dígitos OU nome parcial do cliente>
---

# Gerar mensagem WhatsApp para o cliente

O usuário forneceu uma busca de cliente: $ARGUMENTS

## Passos

1. **Renove o token do Microsoft Graph:**
   ```bash
   cd scripts/graph && python3 refresh.py
   ```

2. **Busque a(s) tarefa(s) do cliente:**
   ```bash
   cd scripts && python3 inspect_tasks.py "$ARGUMENTS"
   ```

3. **Leia os templates canônicos:**
   ```
   templates/whatsapp/padroes-v3.md
   templates/whatsapp/integracao-to-do.md
   ```

4. **Identifique o contexto da tarefa:**
   - Lista (🌻 INSS, 🖥 CRPS, 👪 Judicial, 💵 Pagamentos, etc.)
   - Última entrada datada do body (autor + texto)
   - Sinais-chave (concedido, indeferido, perícia agendada, sistema fora do ar, etc.)
   - Marcadores no título (★, 🤖, 🎂)

5. **Selecione o template apropriado** consultando a tabela em `integracao-to-do.md`. Em caso de múltiplas opções, prefira o mais específico.

6. **Determine a voz que assina:**
   - Decisão técnica/cálculo/concessão/recurso → Dr. Paulo Tercini
   - INSS administrativo + última entrada (A) → Dra. Amanda Garcez
   - Pagamento/alerta golpe curto → Dr. Marcos
   - Triagem/agendamento → André Dellavechia ou Ingrid
   - Genérico → {{ATENDENTE}} (sugerir Dra. Amanda como default)

7. **Determine o tratamento:**
   - Idade ≥ 60 ou primeiro contato → senhor/senhora
   - Cliente já respondeu "você" → você (coerência)
   - Default sem info → senhor/senhora

8. **Preencha os placeholders** com dados extraídos:
   - `{{NOME}}` do título da tarefa (sem o `#CPF`)
   - `{{TURNO}}` baseado na hora atual ("Bom dia" 06h-12h, "Boa tarde" 12h-18h, "Boa noite" após 18h)
   - `{{DATA}}`, `{{HORARIO}}`, `{{VALOR}}`, etc. extraídos do body
   - `{{TIPO_BENEFICIO}}` inferido do contexto

9. **Apresente a mensagem pronta**, formatada para copiar e colar no WhatsApp:

```
[VOZ ESCOLHIDA]: {{ATENDENTE}}
[TEMPLATE USADO]: 6.1 — Concessão administrativa
[TRATAMENTO]: senhor

═══════════════════════════════════════
*Dr. Paulo Tercini:*

Sr. José, bom dia! Tudo bem?

Aposentadoria por idade foi concedida 🙏🙏

O senhor pode considerar que o benefício foi concedido de 01/05/2026 a 01/05/2027.
═══════════════════════════════════════

Próximos passos sugeridos:
- Aguardar 7 dias para divulgação do primeiro pagamento
- Enviar template 7.1 (aviso de valor) quando soubermos
- Atualizar body com `02.05.2026 (P): Mensagem de concessão enviada ao cliente.`
```

10. **Pergunte ao usuário se a mensagem está correta**. Se sim, oferecer:
    - **(a)** Atualizar o body da tarefa com a entrada da mensagem enviada (prepend `(P)` ou `(A)`)
    - **(b)** Gerar mensagem complementar (ex: PIX para honorários após concessão)
    - **(c)** Gerar variante alternativa (mais formal/informal)

## Casos especiais

### Cliente com múltiplas tarefas (carteira pesada)
Se o cliente aparecer em mais de uma lista, **priorize** pela mais ativa e específica:
- 🗓 Tarefas com Prazo > 🌻 INSS > 🖥 CRPS > 👪 Judicial > 💵 Pagamentos > 🙏 Aposentadorias Futuras > 🙋 Escritório

### Cliente sem CPF no título (lista ☕ Marcos)
Se a tarefa for da lista de Marcos, alertar que o template padrão pode não se aplicar e sugerir consultar com o próprio Marcos antes de enviar.

### Tarefa fantasma (sem body)
Se body vazio, **NÃO gerar mensagem**. Pedir ao usuário para preencher o contexto antes.

### Risco de golpe
Se o cliente mencionou "ligaram de outro número", "PIX para liberar", "indenização milionária" — **bloco XIII (Aviso) ou XVII (Golpe sofisticado)**. Atenção redobrada.

### Acordo administrativo proposto
Se INSS oferece acordo — escalonar para Dr. Paulo (ver 20.7 Acordo administrativo — alerta).

## Privacidade

Não vazar CPF completo, telefone ou senha em saída visível por terceiros. Em mensagens ao próprio cliente, OK mostrar dados (ele já sabe).

## Cross-reference com skills

Para fundamento jurídico de qualquer ato citado na mensagem (recurso, MS, decadência, especial, BPC), acionar a skill correspondente do plugin `base-conhecimento-inss`.
