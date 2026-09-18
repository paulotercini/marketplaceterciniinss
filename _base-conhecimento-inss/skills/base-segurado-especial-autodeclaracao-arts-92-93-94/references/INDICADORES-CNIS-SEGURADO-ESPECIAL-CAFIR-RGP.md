# Indicadores do CNIS na Validação Automática do Segurado Especial

Onda 142 (18/09/2026). Conferido no Anexo V da Portaria DIRBEN/INSS nº 990/2022, baixado do `portalin.inss.gov.br` e lido na íntegra em 18/09/2026. A versão consultada traz a nota "Alterado pela Portaria DIRBEN/INSS nº 1.316, de 24 de novembro de 2025".

## Correção de nomenclatura, registrada com honestidade

Material de divulgação em circulação em setembro de 2026 atribui ao CNIS os indicadores **"ASE VAUT"**, como período validado por batimento automático, e **"ASE IAUT"**, como período invalidado automaticamente.

**Esses dois indicadores NÃO existem.** A conferência foi dupla. O Anexo V oficial, com oitenta e sete páginas, não os traz em nenhum ponto, e a busca por "VAUT" em todo o DOU entre 01/01/2025 e 18/09/2026 devolveu um único resultado, que é falso positivo, a razão social "VAUTO POSTO GRAND PRIX DE INTERLAGOS LTDA" num comunicado sobre combustíveis.

O CONCEITO, porém, existe e é real. O INSS migra períodos de segurado especial de bases governamentais e os classifica automaticamente. O que está errado é a sigla, não a substância. Os indicadores verdadeiros são seis, e vêm abaixo com a redação oficial.

## As duas bases de origem

**CAFIR**, o Cadastro de Imóveis Rurais, e o critério é a área total. **RGP**, o Registro Geral da Atividade Pesqueira, e o critério é a modalidade de pesca.

## Os três indicadores de PENDÊNCIA, grupo Segurado Especial

Aparecem antes de qualquer tratamento e todos exigem providência no Portal CNIS.

**PSE-POS, Período Segurado Especial Positivo.** Período migrado de CAFIR ou RGP classificado como positivo e ainda não ratificado. No CAFIR, proprietário de imóvel rural com área total de até quatro módulos fiscais. No RGP, pescador artesanal não embarcado. O Anexo adverte que, mesmo sendo indicador "positivo", trata-se de período PENDENTE que necessita de tratamento, por ratificação ou exclusão.

**PSE-PEN, Período Segurado Especial Pendente.** Período migrado classificado como pendente. No CAFIR, área total superior a quatro módulos fiscais com data de registro ANTERIOR a 23/06/2008, data da publicação da Lei 11.718/2008. No RGP, pescador artesanal embarcado. O procedimento previsto é a exclusão, e aqui está a janela que interessa ao segurado, porque o texto oficial ressalva que, "até que o Módulo de Comprovação do Portal CNIS esteja em produção, caso o segurado comprove que exerceu atividade, o período poderá ser ratificado e incluído no Portal CNIS".

**PSE-NEG, Período Segurado Especial Negativo.** Período migrado classificado como negativo. No CAFIR, área total superior a quatro módulos fiscais com data de registro A PARTIR de 23/06/2008. No RGP, pescador industrial.

## Os três indicadores de ACERTO, depois do tratamento

**ASE-RPOS, Acerto Período Segurado Especial Positivo Ratificado.** Período positivo cuja condição foi confirmada pelo segurado, com acerto feito por servidor do INSS via Requerimento no CNIS.

**ASE-RNEG, Acerto Período Segurado Especial Negativo Ratificado.** Período negativo, descaracterizado como segurado especial, cuja condição foi confirmada pelo segurado, com acerto por servidor via Requerimento no CNIS.

**ASE-NSE, Acerto Período Não Segurado Especial.** Período excluído por requerimento no CNIS, após análise e conclusão quanto à descaracterização da condição de segurado especial.

## O ALERTA que decide casos, e que a divulgação não traz

O Anexo V diz, sobre o ASE-NSE, em texto literal. "Períodos excluídos com esse motivo só poderão ser comprovados posteriormente mediante decisão judicial ou recursal."

A consequência é severa. Uma vez excluído o período com esse motivo, a via administrativa comum se fecha, e o segurado só o recupera por recurso ao CRPS ou por ação judicial. O ASE-RNEG produz efeito equivalente, porque registra que o próprio segurado CONFIRMOU a descaracterização.

**Regra do escritório.** Antes de qualquer ratificação ou exclusão no Portal CNIS, o período passa pela análise do escritório. Cliente que ratifica sozinho uma classificação negativa, ou que aceita a exclusão para "limpar pendência", entrega o período e transforma acerto administrativo simples em litígio. O alerta vale sobretudo para quem procura o escritório com o CNIS já tratado.

## Os quatro módulos fiscais e o Tema 1115 do STJ

O critério automático do CAFIR é a área superior a quatro módulos fiscais, e ele NÃO é intransponível. O Tema 1115 do STJ trata da questão do tamanho da propriedade na caracterização do segurado especial, e a tese literal está em `base-precedentes-catalogo-vinculantes`, de consulta obrigatória antes da citação.

O que a classificação automática faz é inverter o ponto de partida, e não encerrar a discussão. O que caracteriza o segurado especial é o regime de economia familiar e o trabalho pessoal, não a metragem isolada, e a prova disso continua sendo a do art. 106 da Lei 8.213/91 e dos arts. 92 a 94 da Portaria 990/2022.

## Cruzamentos

`base-cnis-acerto-indicadores` para o tratamento dos indicadores e o RAC.
`segurado-especial-rural` e esta skill para a caracterização e a autodeclaração.
`base-precedentes-catalogo-vinculantes` para o Tema 1115 e os demais temas rurais.
`admissibilidade-barreiras-crps` para o recurso quando o período já estiver excluído por ASE-NSE.
