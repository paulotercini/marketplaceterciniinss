---
description: Lista clientes em 🙏 Aposentadorias Futuras maturando nos próximos 60 dias (acionamento D-60), 60 a 120 dias (pré-acionamento D-90) e em hibernação saudável.
allowed-tools: Bash, Read
argument-hint: (sem argumentos)
---

# Maturação de Aposentadorias Futuras

Roda a varredura mensal da carteira 🙏 Aposentadorias Futuras conforme a skill `base-aposentadoria-futura-pipeline`.

## Passos

1. Renove o token:
   ```bash
   cd scripts/graph && python3 refresh.py
   ```

2. Execute o script de maturação:
   ```bash
   cd scripts && python3 maturacao.py
   ```

   Se o script ainda não existir, gerar inline:
   - Listar todas as tarefas em 🙏 Aposentadorias Futuras com status diferente de completed
   - Para cada uma, identificar a data alvo (preferir `dueDateTime`; se ausente, varrer body por padrão `[DATA ALVO]: DD/MM/AAAA` ou similar)
   - Classificar em três faixas

3. Apresente em três blocos:

   **🚨 ACIONAMENTO IMINENTE (D-0 a D-60)**
   Listar com nome, CPF mascarado, benefício alvo, data alvo, dias até a data.
   Sugerir: enviar mensagem D-60 hoje ainda.

   **⏰ PRÉ-ACIONAMENTO (D-60 a D-120)**
   Listar com mesma estrutura.
   Sugerir: enviar contato preventivo D-90 ainda este mês.

   **💤 HIBERNAÇÃO SAUDÁVEL (D-120+)**
   Apenas contagem por benefício. Sem ação imediata.

4. Sinalizar tarefas problemáticas:
   - **Sem data alvo definida** → precisa preencher
   - **Sem entrada datada nos últimos 6 meses** → contato preventivo
   - **Sem body** → onboarding incompleto

5. Para cada cliente em ACIONAMENTO IMINENTE, oferecer gerar a mensagem WhatsApp D-60 padrão. A mensagem usa o tom do escritório (formal mas próximo) e cita o benefício alvo, a data e os documentos necessários.

## Cross-reference

Para fundamento e regras detalhadas, acionar a skill `base-aposentadoria-futura-pipeline` do plugin `base-conhecimento-inss`.

Para gerar a mensagem, usar templates oficiais do plugin `tercini-operacional` em `templates/mensagens/maturacao_d60.txt` (a criar).
