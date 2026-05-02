# CHANGELOG-DOU — Atualizações Automáticas por Monitoramento do DOU

Registro cronológico de atualizações no plugin realizadas pelo agente de monitoramento do Diário Oficial da União. Entradas mais recentes no topo.

---

## 2026-05-02 — DOU analisado: 30/04/2026 (Edição corrente; 01/05 feriado e 02/05 sábado)

### Skills criadas

| Skill | Norma fonte | Link oficial |
|---|---|---|
| base-biometria-cin-seguridade-social | Portaria Conjunta MGI/MDS/MPS nº 23/2026 + SGD/MGI 2907/2026 + MDS/INSS 36/2026 | https://www.in.gov.br/web/dou/-/portaria-conjunta-mgi/mds/mps-n-23-de-29-de-abril-de-2026-702405857 |

### Skills atualizadas

| Skill | Norma fonte | Tipo de alteração | Link oficial |
|---|---|---|---|
| base-incapacidade-b31-temporaria | IN PRES/INSS nº 203, de 22/04/2026 (DOU 24/04/2026) | Adicionado bloco de atualização sobre vedação de novo requerimento enquanto processo em curso | https://www.in.gov.br/en/web/dou |
| base-bpc-loas-requisitos | Portaria Conjunta MGI/MDS/MPS nº 23/2026 (DOU 30/04/2026) + MDS/INSS 36/2026 (DOU 11/02/2026) | Adicionado bloco de atualização sobre biometria CIN obrigatória para BPC | https://www.in.gov.br/web/dou/-/portaria-conjunta-mgi/mds/mps-n-23-de-29-de-abril-de-2026-702405857 |
| base-portarias-dpmf-inss-hub | Portaria Conjunta MGI/MDS/MPS nº 23/2026 + IN PRES/INSS nº 203/2026 | Adicionado bloco de atualização com as duas normas novas no hub de portarias | https://www.in.gov.br/en/web/dou |

### Matérias identificadas no DOU 30/04/2026 (Seção 1 — edição corrente)

**ALERTA URGENTE**
1. Portaria Conjunta MGI/MDS/MPS nº 23, de 29/04/2026 — Biometria CIN obrigatória até 31/12/2026 para benefícios previdenciários e assistenciais
2. IN PRES/INSS nº 203, de 22/04/2026 (DOU 24/04/2026) — Vedação de novo requerimento enquanto houver processo em curso (incluída na análise por impacto imediato ainda não coberto pelo plugin)

**IMPORTANTE**
3. Portaria SGD/MGI nº 2.907/2026 (DOU 06/04/2026, vigência 30/04/2026) — Calendário escalonado de biometria CIN (jan/2027 e jan/2028)
4. Portaria Conjunta MPS/INSS nº 13/2026 (vigência 30/03/2026) — Perícia documental para B31 (já coberta parcialmente pelo plugin; não alterada neste ciclo)
5. Portaria MPS nº 125/2026 (DOU 27/01/2026) — Novo Regimento Interno do CRPS (já coberta pelo plugin como Portaria 462/2026; não alterada neste ciclo)

**INFORMATIVO**
6. Portaria Conjunta MDS/INSS nº 36/2026 (DOU 11/02/2026) — Biometria BPC (incorporada à skill base-bpc-loas-requisitos e à nova skill base-biometria-cin-seguridade-social)

### Observações

Conector Microsoft To Do indisponível nesta sessão. Tarefa do To Do não criada automaticamente. Criar manualmente com título "DOU 30/04/2026 - 2 alertas urgentes e 3 importantes" e prioridade ALTA.

Arquivos modificados (revisar antes do commit):
- _base-conhecimento-inss/skills/base-incapacidade-b31-temporaria/SKILL.md
- _base-conhecimento-inss/skills/base-bpc-loas-requisitos/SKILL.md
- _base-conhecimento-inss/skills/base-portarias-dpmf-inss-hub/SKILL.md
- _base-conhecimento-inss/skills/base-biometria-cin-seguridade-social/SKILL.md (novo)
- _base-conhecimento-inss/CHANGELOG-DOU.md (novo)
