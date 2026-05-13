# CHANGELOG DOU - Plugin base-conhecimento-inss

Registro automático de alterações no plugin oriundas da rotina diária de monitoramento do DOU. Entrada nova logo abaixo deste cabeçalho. Não remover entradas anteriores.

---

## 13/05/2026

### base-bpc-loas-requisitos — ATUALIZAÇÃO
Norma: Portaria Conjunta MDS/INSS nº 36, de 10/02/2026 + Portaria SGD/MGI nº 2.907, de 06/04/2026
Motivo: Biometria CIN passou a ser requisito obrigatório para concessão do BPC. Prazo com bases alternativas (CNH/PF/TSE) para concessões expirou em 30/04/2026. Novos gatilhos adicionados ao frontmatter da skill.
Link: https://www.gov.br/inss/pt-br/assuntos/cadastro-biometrico-passa-a-ser-obrigatorio-para-novos-pedidos-de-beneficios-no-inss

### base-bpc-aposentadoria-pcd-procedimentos — ATUALIZAÇÃO
Norma: Portaria Conjunta MDS/INSS nº 36, de 10/02/2026 + Portaria SGD/MGI nº 2.907, de 06/04/2026
Motivo: Adicionada seção de biometria CIN ao fluxo do CadÚnico. Clientes sem biometria devem emitir CIN antes de protocolar pedido de BPC ou aposentadoria PCD.
Link: https://www.gov.br/inss/pt-br/assuntos/cadastro-biometrico-passa-a-ser-obrigatorio-para-novos-pedidos-de-beneficios-no-inss

### base-consignado-credito-inss — CRIAÇÃO (nova skill)
Norma: IN PRES/INSS nº 204, de 04/05/2026 (altera IN 138/2022) + Resolução CGCONSIG/MTE nº 2, de 23/04/2026
Motivo: Novas regras do crédito consignado (prazo máximo 108 parcelas, carência até 90 dias) sem skill existente no plugin. Criada skill completa com cenários, estratégias e alertas.
Link: https://www.legisweb.com.br/legislacao/?id=495243

---
