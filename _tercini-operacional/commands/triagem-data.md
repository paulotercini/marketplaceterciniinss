---
description: Triagem das tarefas para uma data específica (DD/MM/AAAA). Útil para preparar a próxima segunda-feira ou auditar uma data passada.
allowed-tools: Bash, Read
argument-hint: DD/MM/AAAA [DD/MM/AAAA ...]
---

# Triagem para Data Específica

O usuário forneceu uma ou mais datas no formato DD/MM/AAAA: $ARGUMENTS

## Passos

1. Renove o token do Microsoft Graph:
   ```bash
   cd scripts/graph && python3 refresh.py
   ```

2. Execute a triagem para as datas fornecidas:
   ```bash
   cd scripts && python3 triagem.py $ARGUMENTS
   ```

3. Apresente o resultado seguindo o mesmo padrão do `/triagem` (categorização, prioridade, sugestão de plano).

4. Se a data fornecida estiver no passado (anterior a hoje), adicione observação destacando que se trata de auditoria de uma data já passada e foque em:
   - Quais tarefas daquela data foram cumpridas (ver concluídas com aquela data)
   - Quais ainda estão abertas com aquele prazo (atrasadas)

5. Se a data fornecida for sábado, domingo ou feriado nacional, alerte o usuário e sugira a próxima data útil ou a anterior.

6. Se múltiplas datas foram fornecidas, apresente cada uma em seção separada para comparação.

## Detecção de erro de digitação

Se o usuário digitou uma data muito antiga (mais de 60 dias no passado) ou muito futura (mais de 365 dias à frente), pergunte se foi intencional antes de prosseguir, sugerindo a data próxima como alternativa (ex: 04/04/2026 quando hoje é 02/05/2026 — talvez tenha querido 04/05/2026).
