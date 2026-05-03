---
description: Executa o monitor diário do Diário Oficial da União (DOU) buscando matérias com impacto previdenciário e gera tarefa em Microsoft To Do com o relatório classificado.
allowed-tools: Bash, Read, WebFetch, Write, Edit
argument-hint: (sem argumentos - usa edição corrente do DOU)
---

# Monitor Diário do DOU

Executa a Routine de monitoramento do Diário Oficial da União para o escritório Paulo Roberto Tercini Filho.

⚠️ **Status:** este comando é o ponto de entrada. A rotina completa está documentada na skill `routine-dou-monitor` (a criar) e no script `scripts/dou_monitor.py` (a criar).

## Premissa

Varrer a edição mais recente do DOU em busca de TODA matéria com impacto na advocacia previdenciária, classificar em três níveis (ALERTA URGENTE, IMPORTANTE, INFORMATIVO), gerar relatório e criar tarefa no Microsoft To Do com o conteúdo estruturado.

## Passos resumidos

1. **Pré-checagem** — confirmar conector Microsoft To Do autorizado e plugin `base-conhecimento-inss` instalado.

2. **Disponibilidade** — acessar https://www.in.gov.br/leiturajornal?secao=dou1 e verificar se há edição publicada hoje. Se não, navegar para o último dia útil.

3. **Varredura por órgão** — filtrar "Ministério da Previdência Social" e listar matérias da Seção 1.

4. **Varredura por busca avançada** — usar URL `https://www.in.gov.br/consulta/-/buscar/dou?...` com cada termo isoladamente da lista de gatilhos:
   "Previdência Social", INSS, CRPS, "Conselho de Recursos", RGPS, "benefício previdenciário", "benefício assistencial", BPC, LOAS, aposentadoria, "salário-maternidade", "pensão por morte", "auxílio-doença", "auxílio-acidente", biometria, PPP, "aposentadoria especial", "EC 103", "Lei 8.213", "Decreto 3.048", "Decreto 10.410", "tema 1102", "tema 1124", "tema 1117", PMF, "perícia médica federal", "Mercosul previdenciário", "acordo internacional previdenciário", "acumulação de benefícios".

5. **Cobertura suplementar** — repetir busca em DOU2 e DOU3 para atos com repercussão material (instruções normativas, portarias do MPS, comunicados do CRPS).

6. **Filtros de qualidade** — descartar atos administrativos puros (posse, nomeação, exoneração, designação, licença, extrato de contrato, etc).

7. **Classificação em 3 categorias**:
   - ALERTA URGENTE: muda regra/prazo/procedimento, cria risco de bloqueio/cessação
   - IMPORTANTE: relevante mas sem impacto imediato em clientes ativos
   - INFORMATIVO: gestão patrimonial sem reflexo previdenciário

8. **Estratégia de mitigação** — para cada ALERTA URGENTE escrever risco, estratégia administrativa, estratégia judicial e documentação que o cliente precisa preparar.

9. **Indicação de skill** — apontar criação ou atualização de skills do plugin `base-conhecimento-inss`.

10. **Tarefa no Microsoft To Do** — criar na lista 📰 DOU (criar a lista se não existir) com:
    - Título: `DOU [DD/MM/AAAA] - X alerta(s) urgente(s) e Y importante(s)`
    - dueDateTime: hoje 23:59 America/Sao_Paulo
    - reminderDateTime: hoje 09:00 America/Sao_Paulo
    - importance: high se houver ALERTA URGENTE, normal se só IMPORTANTE, low caso contrário
    - body: estrutura padrão com cabeçalho, resumo e detalhe por categoria

11. **Atualização do plugin** — apenas se houver ALERTA URGENTE ou IMPORTANTE. Aplicar em `_base-conhecimento-inss/skills/<skill>/SKILL.md` o bloco:
    ```
    ## Atualização DOU [DD/MM/AAAA]
    Norma: [tipo, número]
    Órgão: [...]
    Vigência: [...]
    Resumo da alteração: [...]
    Impacto na advocacia: [...]
    Estratégia: [...]
    Link oficial: [URL]
    ```
    E acrescentar entrada no `CHANGELOG-DOU.md` do plugin (criar se não existir).

12. **Relatório no chat** — entregar relatório estruturado com cabeçalho, publicações, quadro-resumo, bloco To Do (ID/lista), bloco plugin (arquivos modificados), recomendação operacional e Sources com link oficial de cada matéria citada.

## Regras gerais

- Nunca clicar em download nem aceitar termos no portal do DOU.
- Nunca inventar número de processo, decreto, lei ou portaria. Em dúvida, declarar "Não localizado".
- Nunca executar `git commit` ou `git push` automaticamente; apenas gravar arquivos para revisão humana.
- Em caso de exceção (timeout do portal, conector indisponível), entregar relatório parcial com indicação do que ficou pendente.

## Para implementar a rotina completa

A automação real desta rotina está documentada em conversas anteriores e precisa do conector Browser/WebFetch. Por enquanto, este slash command é o ponto de entrada que orienta a execução manual ou via Routine externa.
