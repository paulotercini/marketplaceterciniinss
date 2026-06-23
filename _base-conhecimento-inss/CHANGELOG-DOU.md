# CHANGELOG DOU - Plugin base-conhecimento-inss

Registro automático de alterações no plugin oriundas da rotina diária de monitoramento do DOU. Entrada nova logo abaixo deste cabeçalho. Não remover entradas anteriores.

---

## 23/06/2026 - Rotina DOU

**Situação do portal:** in.gov.br retornou HTTP 502 Bad Gateway em todos os endpoints durante a execução da rotina. Edição de 23/06/2026 não pôde ser acessada diretamente. Conteúdo apurado via fontes secundárias (gov.br/inss, legisweb.com.br, idprevidenciario.com.br, contabeis.com.br).

**Skills alteradas nesta rodada:**

1. `base-meu-inss-pat-gerid-fluxo` — Atualização com novas regras de procuração eletrônica do Meu INSS (Portaria Conjunta DTI/DIRBEN/INSS nº 21, de 09/06/2026, DOU extra de 10/06/2026).
   - Link oficial: https://www.in.gov.br/en/web/dou (portal indisponível em 23/06/2026; conteúdo verificado via https://www.contabeis.com.br/noticias/77380/inss-altera-regras-da-procuracao-eletronica-no-meu-inss/)

2. `base-portarias-dpmf-inss-hub` — Registro da Portaria Conjunta DTI/DIRBEN/INSS nº 21/2026 na tabela de portarias do hub.

**Matérias verificadas mas sem alteração de skill:**

- Portaria PRES/INSS nº 1.962, de 01/06/2026 (DOU nº 102, 02/06/2026, Seção 1, p. 67) — altera regras do Programa de Gerenciamento de Benefícios e Pagamento Extraordinário, incluindo implantação por acórdão CRPS. Classificada como IMPORTANTE. Skill `base-portarias-dpmf-inss-hub` já cobre o contexto. Monitorar se vier Portaria posterior ou IN regulamentando o fluxo de implantação de acórdão.

- Portaria MPS (número não identificado) de 12/06/2026 — índices de correção do INSS para junho de 2026 (1.001687; 1.004993; 1.006500). Classificada como INFORMATIVO. Skill `base-juros-correcao-monetaria` não requer atualização estrutural; índices são rotineiros e não alteram regras.

**Microsoft To Do:** conector não disponível nesta sessão. Tarefa não criada. Body reservado para criação manual: "DOU 23/06/2026 - 1 importante e 2 informativos - Portal DOU indisponível (502). Principal: Portaria Conjunta DTI/DIRBEN/INSS nº 21/2026 - novas regras de procuração eletrônica Meu INSS."
