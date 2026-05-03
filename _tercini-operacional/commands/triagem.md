---
description: Triagem inteligente das tarefas do dia. Lista o que vence hoje agrupado por categoria de ação, separando tarefas suas (P) das delegadas (A/M/D/I).
allowed-tools: Bash, Read
argument-hint: (sem argumentos - usa data de hoje)
---

# Triagem do Dia

Execute a triagem das tarefas do Microsoft To Do com vencimento hoje.

## Passos

1. Renove o token do Microsoft Graph para garantir que está válido:
   ```bash
   cd scripts/graph && python3 refresh.py
   ```

2. Execute a triagem com a data de hoje:
   ```bash
   cd scripts && python3 triagem.py "$(date +%d/%m/%Y)"
   ```

3. Apresente o resultado ao usuário em formato estruturado:
   - **PRIORIDADE 1 — Risco de prazo** (se houver tarefas em 🗓 Tarefas com Prazo, casos com "Prazo XXX" no body, ou tarefas em 🌻 INSS com perícia/recurso)
   - **🌻 INSS — Verificar sistema** (tarefas que pedem checagem no PAT, Meu INSS, HISCRE)
   - **📞 Contatar cliente** (aniversários, retornos, follow-ups)
   - **💵 Pagamentos** (cobranças)
   - **📑 Aguardar/cobrar documento**
   - **🖥 Recurso administrativo**
   - **🙋 Outros administrativos**

4. Para cada tarefa, mostre lista, título (com `#CPF` mascarado se possível), e a primeira linha do body como contexto.

5. Ao final, sugira um plano para o dia separando manhã (urgência processual), meio-dia (relacionamento) e tarde (administrativo).

6. Liste também as tarefas delegadas a outros colaboradores (A, M, D, I) que vencem hoje, para acompanhamento.

## Atenção a padrões problemáticos

- Tarefas com "Prazo XXX" ou "Prazo: ?" no body → flag urgente para preencher
- Tarefas com body desatualizado (entrada datada de mais de 1 ano) → flag para revisão
- Tarefas em 🙏 Aposentadorias Futuras vencendo hoje → acionar a skill `base-aposentadoria-futura-pipeline`
