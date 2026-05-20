# CHANGELOG DOU - Plugin base-conhecimento-inss

Registro automático de alterações no plugin oriundas da rotina diária de monitoramento do DOU. Entrada nova logo abaixo deste cabeçalho. Não remover entradas anteriores.

---

## 20/05/2026 — Monitoramento DOU

**Situação do portal:** Portal in.gov.br retornou HTTP 502 Bad Gateway em todas as tentativas de acesso à edição de 20/05/2026. Varredura realizada via fontes auxiliares (gov.br/inss, gov.br/previdencia, id-previdenciário, agência brasil, motores de busca). Conteúdo confirmado até 18/05/2026; possível publicação de hoje não pôde ser verificada diretamente.

---

### Alteração 1 — skill `base-incapacidade-b31-temporaria`

**Norma:** Portaria Conjunta MPS/INSS Nº 14, de 23 de março de 2026
**Órgão:** Ministério da Previdência Social e INSS
**DOU:** Seção 1, publicada em 24/03/2026, vigência a partir de 24/03/2026
**Vigência da portaria:** 180 dias (até aproximadamente 20/09/2026)
**Resumo:** Amplia excepcionalmente o prazo máximo do B31 via análise documental de 30 para 90 dias. Beneficiário não pode acumular mais de 90 dias totais em análise documental no período de vigência. Após vencimento, retorna ao limite padrão de 30 dias da Portaria 13/2026.
**Impacto:** Janela transitória favorável ao segurado. Estratégia de cobertura prolongada enquanto aguarda perícia presencial.
**Link oficial:** https://www.in.gov.br/en/web/dou (portaria conjunta mps/inss nº 14, de 23 de março de 2026)

---

### Alteração 2 — skill `base-meu-inss-pat-gerid-fluxo`

**Norma:** Instrução Normativa PRES/INSS Nº 203, de 22 de abril de 2026
**Órgão:** Instituto Nacional do Seguro Social
**DOU:** Seção 1, publicada em 24/04/2026, vigência imediata (sem vacatio legis)
**Resumo:** Insere art. 576-A na IN 128/2022 vedando novo requerimento de mesma espécie de benefício enquanto processo estiver em curso. Processo "em curso" é definido como aquele cujo prazo para recurso ao CRPS não transcorreu (regra geral 30 dias da notificação). Exceção para revisão de benefício já concedido. Revoga Resolução Nº 438/PRES/INSS/2014.
**Impacto:** Muda estratégia de reapresentação com novos documentos. Escritório deve orientar clientes a recorrer dentro de 30 dias ou aguardar prazo antes de novo protocolo.
**Link oficial:** https://idprevidenciario.com.br/legislacao/ (IN PRES/INSS Nº 203/2026)

---
