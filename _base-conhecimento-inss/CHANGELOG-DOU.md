# CHANGELOG DOU - Plugin base-conhecimento-inss

Registro automático de alterações no plugin oriundas da rotina diária de monitoramento do DOU. Entrada nova logo abaixo deste cabeçalho. Não remover entradas anteriores.

---

## 09/06/2026

### ALERTA URGENTE — ADI 6309 (STF, 03/06/2026)
- Skill alterada: `base-aposentadoria-especial-transicao-ec103`
- Norma fonte: Julgamento do Plenário do STF na ADI 6309 (acórdão não publicado até 09/06/2026)
- Alteração: Seção "Atualização DOU 09/06/2026" adicionada ao final do SKILL.md. Atualização também no frontmatter description (adicionadas keywords "ADI 6309", "STF derrubou idade mínima aposentadoria especial", "inconstitucionalidade idade mínima insalubridade")
- Resumo: O STF declarou inconstitucional a exigência de idade mínima para aposentadoria especial (art. 19 §1º III EC 103) por 6 votos a 5. Redator do acórdão: Min. André Mendonça. Efeitos definitivos pendentes de publicação e eventual modulação.
- Link: https://portal.stf.jus.br/processos/detalhe.asp?incidente=5848987

### IMPORTANTE — Portaria PRES/INSS nº 1.961/2026 (DOU 29/05/2026)
- Skill criada: `base-pensao-especial-feminicidio-lei14717` (nova skill)
- Norma fonte: Portaria PRES/INSS nº 1.961, de 28 de maio de 2026, publicada no DOU em 29/05/2026
- Alteração: Skill criada do zero com marco normativo completo (Lei 14.717/2023, Decreto 12.636/2025, Portaria 1.961/2026), requisitos, documentação, cenários operacionais e integração com outras skills
- Resumo: INSS regulamentou operacionalmente a pensão especial de um salário mínimo para filhos e dependentes de mulheres vítimas de feminicídio. Inclui explicitamente mulheres trans.
- Link: https://www.gov.br/inss/pt-br/assuntos/inss-publica-regras-para-concessao-de-pensao-a-filhos-e-dependentes-de-vitimas-de-feminicidio

### OBSERVAÇÃO TÉCNICA — Portaria PRES/INSS nº 1.962/2026 (DOU 02/06/2026)
- Skill não alterada (operacional interna)
- Norma fonte: Portaria PRES/INSS nº 1.962, de 01 de junho de 2026, publicada no DOU nº 102, em 02/06/2026
- Resumo: Altera a Portaria PRES/INSS nº 1.919/2026 (Programa de Gerenciamento de Benefícios e Pagamento Extraordinário), incluindo novos procedimentos para "Recurso - Acórdão com Implantação de Benefício/BI" e "Atualizar Vínculos e Remunerações e Código de Pagamento". Sem reflexo imediato em skills de advocacia; monitorar para ajustes operacionais futuros.

### OBSERVAÇÃO TÉCNICA — Portaria SGD/MGI nº 2.907/2026 (DOU 07/04/2026)
- Skill não alterada nesta entrada (aguardando criação de skill dedicada)
- Norma fonte: Portaria SGD/MGI nº 2.907, de 07 de abril de 2026 (vigência 30/04/2026)
- Resumo: Prorroga e redefine prazos para uso obrigatório da biometria CIN em benefícios do INSS. Novos prazos: novos cadastros a partir de jan/2027; quem tem biometria em TSE/CNH/passaporte até jan/2028; verificação biométrica unificada disponibilizada até 31/12/2026.

### FALHA TÉCNICA — DOU 09/06/2026
- Portal in.gov.br retornou HTTP 502 durante toda a janela de execução da rotina
- Último DOU acessível via buscas: DOU nº 102, de 02/06/2026
- Ação: Varredura executada via WebSearch como fallback; cobertura pode estar incompleta para publicações específicas de 09/06/2026

### MICROSOFT TO DO
- Conector Microsoft To Do indisponível nesta sessão de execução (MCP não carregado)
- Tarefa sugerida para criação manual: "DOU 09/06/2026 - 1 alerta urgente e 3 importantes"
- dueDateTime: 2026-06-09T23:59:00 (America/Sao_Paulo)
- reminderDateTime: 2026-06-09T09:00:00 (America/Sao_Paulo)
- isReminderOn: true
- importance: high
