# CHANGELOG DOU - Plugin base-conhecimento-inss

Registro automático de alterações no plugin oriundas da rotina diária de monitoramento do DOU. Entrada nova logo abaixo deste cabeçalho. Não remover entradas anteriores.

---

## 27/05/2026 — Varredura DOU (edição alvo 27/05/2026; portal in.gov.br indisponível — 502; cobertura via WebSearch e LegisWeb)

### Skills criadas

| Skill | Norma fonte | Link |
|---|---|---|
| `base-vedacao-novo-requerimento-in203-in208` | IN PRES/INSS nº 203/2026 e IN PRES/INSS nº 208/2026 | https://www.legisweb.com.br/legislacao/?id=495991 |

### Skills atualizadas

| Skill | Norma fonte | Tipo de alteração |
|---|---|---|
| `base-meu-inss-pat-gerid-fluxo` | IN 203/2026 + IN 208/2026 — art. 576-A IN 128/2022 | Adicionado bloco de atualização com vedação de novo requerimento e prazo de 30 dias |
| `base-incapacidade-b31-temporaria` | IN 208/2026 — art. 576-A IN 128/2022 | Adicionado bloco de atualização com exceção expressa para B31 e estratégia de P1 e restabelecimento |

### Publicações classificadas como INFORMATIVO (não geraram alteração em skill)

- Resolução CNPC nº 65/2026 (DOU 25/05/2026) — previdência complementar, vigência 01/06/2026
- IN PRES/INSS nº 204/2026 (DOU 05/05/2026) — consignado INSS: 108 parcelas, margem 40%, biometria
- Portaria DTI/DIRBEN/INSS nº 156/2026 (vigência 15/05/2026) — INSS Empresa
- Resolução CGCONSIG/MTE nº 2/2026 (DOU abril 2026) — consignado MTE, limite CET

### Observações operacionais

Portal in.gov.br retornou HTTP 502 em todas as tentativas de acesso direto. Varredura realizada por fallback (WebSearch + LegisWeb + portais gov.br). Edição específica de 27/05/2026 não foi verificada diretamente. Publicações mais recentes localizadas datam até 25/05/2026. Tarefa Microsoft To Do não criada — conector não disponível neste ambiente de execução.
