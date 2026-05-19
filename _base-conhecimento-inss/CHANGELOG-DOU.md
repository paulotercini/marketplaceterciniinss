# CHANGELOG DOU - Plugin base-conhecimento-inss

Registro automático de alterações no plugin oriundas da rotina diária de monitoramento do DOU. Entrada nova logo abaixo deste cabeçalho. Não remover entradas anteriores.

---

## 19/05/2026 — Monitoramento DOU (edição 19/05/2026 — portal in.gov.br inacessível, varredura via fontes alternativas)

### Skill atualizada: base-crps-panorama-geral
Norma fonte: IN PRES/INSS nº 203, de 22 de abril de 2026 (DOU 24/04/2026)
Alteração: inserção de bloco "Atualização DOU 24/04/2026" ao final da skill, antes de "O que NÃO está nesta skill", documentando a vedação de novo requerimento durante processo pendente (art. 576-A inserido na IN 128/2022) e a estratégia de mitigação.
Link oficial: https://www.in.gov.br/web/dou/-/instrucao-normativa-pres/inss-n-203-de-22-de-abril-de-2026-701153846

### Skill criada: base-salario-paternidade-lei15371-2026
Norma fonte: Lei nº 15.371, de 31 de março de 2026 (DOU 01/04/2026)
Alteração: criação de skill completa com frontmatter, escopo, marco normativo, duração gradual da licença, segurados beneficiados, carência, hipóteses de concessão, cálculo, estabilidade no emprego, estratégia pró-segurado, integrações e alertas.
Link oficial: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/lei/l15371.htm

### Observação operacional
Portal in.gov.br retornou HTTP 502 Bad Gateway em todos os endpoints durante a execução da rotina em 19/05/2026. A edição do DOU do dia não pôde ser acessada diretamente. Varredura realizada via buscas web alternativas e portais de legislação. Normas identificadas são de publicações anteriores (março a maio 2026) não capturadas em ciclos anteriores. Se o portal voltar a operar, recomenda-se executar a rotina novamente para verificar se houve publicações específicas na edição de 19/05/2026.
