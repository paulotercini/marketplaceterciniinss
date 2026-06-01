# CHANGELOG DOU - Plugin base-conhecimento-inss

Registro automático de alterações no plugin oriundas da rotina diária de monitoramento do DOU. Entrada nova logo abaixo deste cabeçalho. Não remover entradas anteriores.

---

## 2026-06-01 — Monitoramento DOU 01/06/2026

**Observação operacional:** Portal in.gov.br retornou HTTP 502 em todas as tentativas de acesso (9 requisições distintas). A edição de 01/06/2026 não pôde ser verificada diretamente. As publicações processadas nesta entrada foram identificadas via fontes alternativas (gov.br/inss, legisweb.com.br, pprev.com.br e pesquisa web) e cobrem o período de abril a maio de 2026.

### Skills atualizadas

**1. base-incapacidade-b31-temporaria**
- Norma fonte: IN PRES/INSS nº 208, de 19/05/2026 (DOU 20/05/2026) + IN PRES/INSS nº 203, de 22/04/2026 (DOU 24/04/2026)
- Tipo de alteração: adição de seção "Atualização DOU 01/06/2026" ao final da skill; atualização do frontmatter description para incluir gatilhos "IN 203/2026", "IN 208/2026", "art 576-A IN 128/2022", "vedação novo requerimento pendente", "vedação reprotocolo", "processo em curso mesmo espécie"
- Link oficial: https://www.legisweb.com.br/legislacao/?id=495991

**2. base-meu-inss-pat-gerid-fluxo**
- Norma fonte (1): IN PRES/INSS nº 208, de 19/05/2026 + IN PRES/INSS nº 203, de 22/04/2026 — vedação de novo requerimento
- Norma fonte (2): Portaria SGD/MGI nº 2.907/2026 — biometria obrigatória CIN, prazo 31/12/2026
- Tipo de alteração: adição de duas seções "Atualização DOU 01/06/2026" antes da seção "Link operacional"; atualização do frontmatter description para incluir gatilhos "IN 203/2026", "IN 208/2026", "art 576-A vedação novo requerimento", "reprotocolo bloqueado", "processo pendente mesma espécie", "biometria CIN 2026", "Portaria SGD/MGI 2907/2026", "prazo biometria 31/12/2026", "bloqueio benefício biometria", "CIN Carteira Identidade Nacional"
- Link oficial biometria: https://www.gov.br/inss/pt-br/assuntos/governo-amplia-prazo-para-uso-obrigatorio-da-biometria-da-cin-em-beneficios-do-inss-e-sociais

**3. base-auxilio-acidente-b94-pos-reforma**
- Norma fonte: Portaria PRES/INSS nº 1.959, de 25/05/2026 (DOU 26/05/2026) — inclui B94 e demandas judiciais no Programa de Gerenciamento de Benefícios
- Tipo de alteração: adição de seção "Atualização DOU 01/06/2026" ao final da skill
- Link oficial: https://www.legisweb.com.br/legislacao/?id=496207

### Arquivos modificados (aguardando revisão humana antes do commit)

- `_base-conhecimento-inss/skills/base-incapacidade-b31-temporaria/SKILL.md`
- `_base-conhecimento-inss/skills/base-meu-inss-pat-gerid-fluxo/SKILL.md`
- `_base-conhecimento-inss/skills/base-auxilio-acidente-b94-pos-reforma/SKILL.md`
- `_base-conhecimento-inss/CHANGELOG-DOU.md` (este arquivo)
