---
description: Lista pagamentos pendentes da lista 💵 Pagamentos com diagnóstico (sem body, abandonado, próximo de cobrar) e sugestão de ação.
allowed-tools: Bash, Read
argument-hint: (sem argumentos)
---

# Cobranças Pendentes

Roda a varredura da lista 💵 Pagamentos conforme a skill `base-honorarios-contratuais-cobranca`.

## Passos

1. Renove o token:
   ```bash
   cd scripts/graph && python3 refresh.py
   ```

2. Execute o script de cobranças:
   ```bash
   cd scripts && python3 cobrancas.py
   ```

   Se ainda não existir, gerar a partir do `inspect_tasks.py`:
   - Listar todas as tarefas em 💵 Pagamentos com status diferente de completed
   - Para cada uma, extrair: título, body, checklist (geralmente registra pagamentos), última entrada datada

3. Categorize em quatro grupos:

   **🚨 SEM REGISTRO ALGUM (cobrança cega)**
   Tarefas sem body e sem checklist. Não se sabe se já foi cobrado, valor combinado, ou status. Precisa preencher antes de cobrar.

   **💸 COBRANÇA PREVENTIVA (cliente vai receber em breve)**
   Body indica "aguardar crédito de atrasados" ou "implantado, falta cobrar mensalidade". Disparar mensagem em D-7 da expectativa.

   **⏰ COBRANÇA AMIGÁVEL (>30 dias sem pagamento)**
   Cliente já recebeu crédito mas não pagou. Mensagem padrão lembrando do contrato. Tom respeitoso.

   **🔴 INADIMPLÊNCIA PROLONGADA (>60 dias)**
   Cliente não respondeu a duas tentativas. Escalar para mensagem formal ou notificação extrajudicial.

4. Para cada grupo, listar:
   - Cliente (nome + CPF mascarado)
   - Valor combinado (extrair do body se mencionado, formato "R$ X")
   - Última atualização (data)
   - Próxima ação sugerida

5. Ao final, ofereça gerar mensagem WhatsApp para os 5 mais críticos (ordenados por inadimplência prolongada primeiro). Tons:
   - Cobrança preventiva: descontraído e útil ("seu crédito chegou, vamos acertar?")
   - Cobrança amigável: respeitoso ("vi que ainda não recebemos, está tudo bem?")
   - Cobrança formal: direto e referenciando o contrato

## Cross-reference

Para fundamento normativo (EAOAB art. 22, modelo 30%+1 mensalidade, destaque RPV/precatório), acionar `base-honorarios-contratuais-cobranca`.

Para sucumbência (não confundir), acionar `base-cpc-honorarios-sucumbencia-previdenciaria`.

## Privacidade

Não exibir o valor exato do honorário em saída visível por terceiros. Quando gerar mensagem ao cliente, ok mostrar valor (ele já sabe). Quando gerar relatório, mascarar.
