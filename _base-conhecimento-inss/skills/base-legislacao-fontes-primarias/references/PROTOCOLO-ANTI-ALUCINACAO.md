# Protocolo Anti-Alucinação para Citação de Normas Previdenciárias

Protocolo obrigatório pró-segurado para garantir que NENHUMA citação de artigo de lei, decreto, instrução normativa ou portaria seja inventada. Implementa o princípio de honestidade radical do escritório Paulo Roberto Tercini Filho.

## 5 NÍVEIS DE VERIFICAÇÃO ANTES DE CITAR

### Nível 1 - Existência

Antes de mencionar qualquer artigo, conferir que ele EXISTE na norma de referência. Procedimento.

1. Identificar a norma (Lei, Decreto, IN, Portaria, EC, LC).
2. Localizar o arquivo no repositório `/sessions/fervent-bold-lovelace/mnt/INSS/base-legislacao/`.
3. Usar Grep ou Read para confirmar que o artigo existe.
4. Se NÃO existe, declarar "Artigo X da Lei Y não localizado no arquivo verificado" e suspender a afirmação.

### Nível 2 - Vigência

Confirmar que o artigo está VIGENTE. Procedimento.

1. Após confirmar existência, ler o artigo INTEIRO incluindo notas de rodapé.
2. Verificar se há marcação de "Revogado pela Lei X.XXX" ou "Vide".
3. Se revogado, alertar expressamente "O artigo X da Lei Y FOI REVOGADO pela Lei Z em ano W, mas seus efeitos podem persistir em situações de direito adquirido (citar fundamento)".
4. Se "Vide", consultar a norma que vide aponta antes de finalizar a citação.

### Nível 3 - Redação literal

A citação deve corresponder à redação ATUAL do artigo. Procedimento.

1. Copiar a redação exata do arquivo, sem paráfrase.
2. Preservar marcação "Redação dada pela Lei X.XXX" entre parênteses no final.
3. Se houver redação anterior preservada no arquivo (cf. art. 103 da Lei 8.213/91 que tem 3 redações sucessivas), atentar para qual versão é aplicável ao caso pelo tempus regit actum.
4. Se a redação foi alterada por MP que não foi convertida em lei, conferir status atual.

### Nível 4 - Modulação

Verificar se há modulação temporal de efeitos. Procedimento.

1. Quando o artigo foi alterado por lei posterior, verificar se a alteração tem efeitos retroativos ou apenas prospectivos.
2. Verificar se houve ADI ou ADPF que modulou a aplicação do artigo.
3. Para artigos da EC 103/2019, atentar à data de promulgação (13/11/2019) como marco temporal.

### Nível 5 - Número de processo/precedente

Quando o artigo for citado em conjunto com precedente, verificar.

1. O número do tema/repetitivo/súmula está correto.
2. O órgão julgador está correto (STF, STJ, TNU, TRF).
3. A data de julgamento está correta.
4. A tese fixada está corretamente parafraseada ou transcrita.

## CASO PRÁTICO 1 - PORTARIA 992/2022 (ERRO RECORRENTE)

PROBLEMA. Em várias skills do plugin entre as Ondas 23 e 30, eu (Claude) repeti que "Portaria DIRBEN/INSS 992/2022 trata do cálculo da RMI".

VERIFICAÇÃO PELO PROTOCOLO. Abrir o arquivo `06-Portarias/Portaria-DIRBEN-INSS-992-2022-manutencao.md` no workspace. Ler o art. 1º.

REDAÇÃO LITERAL VERIFICADA. A Portaria 992/2022 aprova o Livro III - Manutenção de Benefícios e Serviços. Trata de folha de pagamento, descontos, consignações, suspensão e cessação. NÃO trata de cálculo de RMI.

CONCLUSÃO. Citação anterior era ERRADA. A RMI é regulada pela IN 128/2022 e pela Portaria 991/2022 (Livro II - Reconhecimento).

LIÇÃO. Toda menção a "Portaria X/2022 trata de Y" deve passar pela leitura do art. 1º da portaria correspondente.

## CASO PRÁTICO 2 - CÓDIGO 2.5.7 DO DECRETO 53.831/1964 (ERRO POTENCIAL)

PROBLEMA. Em rascunho anterior eu (Claude) ia citar "código 2.5.7 telefonista" do Decreto 53.831/1964.

VERIFICAÇÃO PELO PROTOCOLO. Abrir o arquivo `04-Decretos/Decreto-53831-1964-quadro-agentes-nocivos.md` no workspace. Buscar a tabela de códigos.

REDAÇÃO LITERAL VERIFICADA. O código 2.5.7 é "Extinção de fogo, guarda" (bombeiros, vigilantes). O código de telefonista é 2.4.5.

CONCLUSÃO. Citação anterior teria sido ERRADA.

LIÇÃO. Códigos de categoria profissional do Decreto 53.831/1964 são frequentemente confundidos. Sempre consultar o quadro tabular antes de citar.

## CASO PRÁTICO 3 - LEI 8.213/91 ART. 103 (MÚLTIPLAS REDAÇÕES)

PROBLEMA. O art. 103 da Lei 8.213/91 (decadência) tem 3 redações sucessivas preservadas no arquivo (original, MP 871/2019, Lei 13.846/2019, com referência a ADI 6096/STF).

VERIFICAÇÃO PELO PROTOCOLO. Conferir qual redação se aplica ao caso pelo critério da DIB do benefício e da data do pedido de revisão.

REDAÇÃO ATUAL. Lei 13.846/2019. Prazo de 10 anos.

LIÇÃO. Para benefícios concedidos antes da vigência da MP 871/2019, conferir cuidadosamente o regime aplicável.

## REGRA OPERACIONAL FINAL

Em TODA petição, recurso, MS, auditoria ou orientação que cite artigo de Lei, Decreto, IN ou Portaria das normas catalogadas nesta skill, o Claude DEVE.

1. Acionar a skill base-legislacao-fontes-primarias.
2. Abrir o arquivo correspondente do workspace.
3. Buscar o artigo.
4. Aplicar os 5 níveis de verificação.
5. Transcrever literalmente com nota de redação preservada.

SE A VERIFICAÇÃO FALHAR EM QUALQUER NÍVEL, declarar a falha expressamente e suspender ou ajustar a afirmação.

A honestidade radical não admite exceções.
