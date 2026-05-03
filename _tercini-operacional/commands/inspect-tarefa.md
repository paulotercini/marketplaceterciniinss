---
description: Mostra todas as tarefas de um cliente específico em todas as listas, com body completo, checklist (telefones, senhas, processos) e contexto.
allowed-tools: Bash, Read
argument-hint: <CPF de 11 dígitos OU nome parcial do cliente>
---

# Inspecionar Tarefas de um Cliente

O usuário forneceu uma busca: $ARGUMENTS

## Passos

1. Renove o token:
   ```bash
   cd scripts/graph && python3 refresh.py
   ```

2. Execute a inspeção:
   ```bash
   cd scripts && python3 inspect_tasks.py "$ARGUMENTS"
   ```

   O script aceita:
   - CPF de 11 dígitos (ex: `12345678901`) — busca exata via `#CPF` no título
   - Nome parcial (ex: `Sumara`) — busca contains case-insensitive no título

3. Para cada tarefa encontrada, mostre:
   - **Lista** onde está
   - **Título completo**
   - **Importance** (com ★ se high)
   - **dueDateTime** se houver (formatado em DD/MM/AAAA)
   - **Body completo**, com as entradas datadas mais recentes em destaque
   - **Checklist** (telefones, senhas, processos, observações fixas)

4. Ao final, faça **diagnóstico do cliente**:
   - Em quantas listas tem tarefa (espalhamento)
   - Tem tarefas duplicadas na mesma lista? (suspeita de erro)
   - Tem tarefa abandonada (>180 dias sem entrada)? (precisa retomar)
   - Há cliente sob nome ligeiramente diferente que pode ser duplicação? (alertar)

5. Sugira **próximas ações** com base no contexto:
   - Se há body indicando "verificar em DD/MM" — propor criar dueDateTime
   - Se há entrada antiga com `(P) Aguardar até X` e X já passou — propor reativar
   - Se há tarefa em 💵 Pagamentos sem registro recente — propor cobrar

6. Se o usuário pedir para **gerar mensagem para o cliente**, use as skills do plugin `base-conhecimento-inss` quando aplicável e o glossário do escritório (Solicitei → Em análise → Aguardar até → Verifiquei).

## Privacidade

Cuidado para não vazar CPF completo, telefone ou senha em mensagens que possam ser logadas. Se o usuário pedir saída para terceiro, mascarar dados sensíveis.
