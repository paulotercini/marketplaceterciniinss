# CHANGELOG-DOU — Base Conhecimento INSS

Registro cronológico das atualizações normativas inseridas no plugin a partir do monitoramento diário do Diário Oficial da União.
Entradas novas são acrescentadas no topo. Entradas antigas são mantidas abaixo.

---

## 2026-05-02 — Monitoramento DOU 30/04/2026

Data alvo: 02/05/2026 (sábado — DOU não publicado)
Data feriado anterior: 01/05/2026 (Dia do Trabalho — DOU não publicado)
Edição efetivamente analisada: DOU 30/04/2026 (quinta-feira)
Portal DOU (in.gov.br): INDISPONÍVEL durante a sessão de monitoramento (erros HTTP 502)
Cobertura suplementar: varredura via fontes secundárias (gov.br/inss, gov.br/previdencia, legisweb.com.br, agenciabrasil.ebc.com.br, pprev.com.br, idprevidenciario.com.br, contadorperito.com)

### Matérias encontradas e classificadas

| Norma | Data DOU | Classificação |
|---|---|---|
| Portaria Conjunta MDS/MPS/INSS nº 37/2026 — Critérios avaliação BPC | 02/04/2026 | ALERTA URGENTE |
| IN PRES/INSS nº 203/2026 — Vedação novo requerimento em processo em curso | 24/04/2026 | ALERTA URGENTE |
| Portaria Conjunta MPS/INSS nº 13/2026 — Atestmed 90 dias B31 | 24/03/2026 | IMPORTANTE |
| Portaria Conjunta MPS/INSS nº 15/2026 — Análise documental auxílio-acidente | 24/03/2026 | IMPORTANTE |
| Portaria SGD/MGI nº 2.907/2026 — Prazo biometria CIN ampliado | 07/04/2026 | INFORMATIVO |

### Arquivos alterados nesta sessão

- `skills/base-incapacidade-b31-temporaria/SKILL.md`
  Alteração: Adicionada seção "Atualização DOU 30/04/2026" com detalhe da Portaria Conjunta MPS/INSS 13/2026 (Atestmed 90 dias) e da IN 203/2026 (vedação de novo requerimento)
  Norma fonte 1: Portaria Conjunta MPS/INSS nº 13/2026 — https://www.in.gov.br/en/web/dou
  Norma fonte 2: IN PRES/INSS nº 203/2026 — https://legisjet.com.br/conteudo/instrucao-normativa-presinss-n-203-de-22-de-abril-de-2026-dou-de-24-04-2026/

- `skills/base-bpc-impedimento-longo-prazo/SKILL.md`
  Alteração: Adicionada seção "Atualização DOU 02/04/2026" com detalhe da Portaria Conjunta MDS/MPS/INSS 37/2026 (novo quesito impedimento permanente/irreversível/irrecuperável, critério de indeferimento para resolubilidade menor que 2 anos, estratégia de documentação)
  Norma fonte: Portaria Conjunta MDS/MPS/INSS nº 37/2026 — https://www.legisweb.com.br/legislacao/?id=493676

- `skills/base-portarias-dpmf-inss-hub/SKILL.md`
  Alteração: Adicionada seção "Atualização DOU 30/04/2026" com IN 203/2026 e Portaria Conjunta 15/2026. Frontmatter description atualizado com novos gatilhos: IN 203/2026, art. 576-A, vedação requerimento, Portaria 15/2026, Resolução 438/2014 revogada.
  Norma fonte 1: IN PRES/INSS nº 203/2026 — https://legisjet.com.br/conteudo/instrucao-normativa-presinss-n-203-de-22-de-abril-de-2026-dou-de-24-04-2026/
  Norma fonte 2: Portaria Conjunta MPS/INSS nº 15/2026

### Pendências desta sessão

- Tarefa no Microsoft To Do: FALHOU — conector Microsoft To Do não disponível nesta sessão. Criar manualmente a tarefa "DOU 30/04/2026 - 2 alertas urgentes e 2 importantes" com prioridade ALTA e vencimento 02/05/2026.
- Screenshot do portal DOU: FALHOU — portal indisponível (HTTP 502).
- Commit e push: pendente de revisão humana conforme instruções do plugin (não executar git automaticamente).
