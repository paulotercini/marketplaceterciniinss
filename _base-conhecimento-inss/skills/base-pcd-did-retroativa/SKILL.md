---
name: base-pcd-did-retroativa
description: "Data de Início da Deficiência (DID) retroativa na aposentadoria PCD da LC 142/2013, fixação por prova documental e testemunhal, ônus do INSS, presunção de continuidade, repercussão no tempo computado por grau e formação de documentação pretérita. Use SEMPRE que mencionar DID retroativa, data de início da deficiência, fixação retroativa LC 142, prova pretérita PCD, presunção de continuidade da deficiência, deficiência preexistente, agravamento progressivo, conversão tempo PCD por grau, prova documental e testemunhal DID, ônus do INSS DID, formação de documentação retroativa, prontuário pretérito, ASO antigo PCD, perícia retrospectiva PCD. Cruza com aposentadoria-deficiencia, peticao-previdenciaria, revisao-peticao, base-pcd-if-bra-metodologia, base-pcd-conversao-tempo-especial-pcd e formacao-documentacao-did-pcd."
---

# DID Retroativa na Aposentadoria PCD

## Escopo

Fixação da data provável de início da deficiência (DID) em data anterior à DER, prova admitida e uso da DID e das variações de grau para ampliar o tempo de contribuição na condição de pessoa com deficiência. Formação da documentação pretérita em `formacao-documentacao-did-pcd`.

## Marco normativo

- CF, art. 201, §1º, I.
- LC 142/2013, art. 6º: §1º, a deficiência anterior à vigência da LC deve ser certificada, inclusive quanto ao grau, "sendo obrigatória a fixação da data provável do início da deficiência"; §2º, o tempo anterior à LC não se prova por prova exclusivamente testemunhal.
- Decreto 3.048/1999, art. 70-D (redação do Decreto 10.410/2020): a avaliação deve "fixar a data provável do início da deficiência e o seu grau" (I) e "identificar a ocorrência de variação no grau de deficiência e indicar os respectivos períodos em cada grau" (II); §1º, documentos que subsidiem a avaliação, vedada a prova exclusivamente testemunhal.
- Portaria Interministerial SDH/MPS/MF/MOG/AGU nº 1, de 27/01/2014 (IF-BrA, avaliação médica e funcional).
- Lei 13.146/2015, art. 2º.

## Regras de fixação

1. A DID e cada mudança de grau são objeto obrigatório da avaliação (Decreto 3.048/1999, art. 70-D, I e II). Laudo que fixa a DID na DER sem examinar a prova pretérita descumpre esse dever.
2. Prova documental é exigida para o período anterior; o testemunho complementa, mas não basta sozinho (LC 142, art. 6º, §2º).
3. Documentos úteis: prontuários, ASO e PCMSO, exames datados, receitas, atestados, relatórios escolares, laudos de acidente, fotografias, declarações do empregador sobre adaptações.
4. Doença degenerativa ou progressiva documentada sustenta a continuidade entre registros; intervalos sem tratamento não interrompem por si a deficiência.
5. Períodos com graus diferentes são convertidos proporcionalmente pelos multiplicadores do art. 70-E do Decreto 3.048/1999 (`base-pcd-conversao-tempo-especial-pcd`).
6. Na aposentadoria por idade, os 15 anos de contribuição na condição de pessoa com deficiência dependem da DID (Decreto 3.048/1999, art. 70-C, §1º).

## Cenários

- **Diagnóstico antigo com prontuário.** DID na origem documentada.
- **Agravamento gradual.** Uma data por mudança de grau, cada uma com documento contemporâneo.
- **Sem prontuário.** Pedido de segunda via à unidade de saúde e ao empregador; relatório do médico assistente que reconstrua a evolução com base em exames antigos.
- **Tratamento intermitente.** Exames e receitas espaçados, com testemunho complementar.
- **Sequela de acidente.** DID na consolidação documentada.
- **Deficiência congênita.** DID no nascimento ou no primeiro registro.

Sem enquadramento retroativo: ausência de qualquer documento anterior (DID tende à data do primeiro documento) e diagnóstico recente sem repercussão funcional anterior.

## Refutação a argumentos típicos do INSS

- **DID apenas na DER.** LC 142, art. 6º, §1º, e Decreto 3.048/1999, art. 70-D, I, obrigam a fixar a data provável de início.
- **Grau único para todo o período.** O art. 70-D, II, manda identificar a variação de grau e os períodos.
- **Testemunho sem valor.** Vedada apenas a prova exclusivamente testemunhal; somado a documento, o testemunho integra a prova.
- **Tratamento intermitente afasta a deficiência.** Condição crônica documentada mantém o impedimento entre os registros.
- **Avaliação sem serviço social.** O IF-BrA exige avaliação médica e funcional; a ausência da parte funcional é vício.
- **Perícia retrospectiva inviável.** O próprio art. 70-D pressupõe exame retrospectivo da documentação.

## Jurisprudência

O Tema 173 TNU, antes citado, não trata da LC 142 e foi retirado. As Súmulas 149 e 577 STJ tratam de tempo rural e servem apenas por analogia; a regra própria é a LC 142, art. 6º, §2º. Precedente específico sobre DID retroativa na LC 142: Não localizado.

## Integração

IF-BrA em `base-pcd-if-bra-metodologia`; conversão em `base-pcd-conversao-tempo-especial-pcd`; documentação em `formacao-documentacao-did-pcd`; aposentadoria em `aposentadoria-deficiencia`; portarias em `base-portarias-dpmf-inss-hub`.

## Lei Brasileira de Inclusão como fundamento obrigatório

Acionar sempre `base-lbi-inclusao-barreiras-lei13146`. Percorrer as seis barreiras do art. 3º, IV, da Lei 13.146/2015, com fato concreto e documento por ID, e cobrar os quatro incisos do art. 2º, §1º; a prova da barreira no passado também sustenta a DID.

## Redação da peça neste tema

Ao transpor esta matéria para peça, seguir o bloco "Aposentadoria da pessoa com deficiência" de `peticao-previdenciaria/references/REDACAO-POR-ESPECIE.md`, que traz os pares de redação genérica e precisa fixados pelo titular. A fórmula é afirmar o fato, localizar a prova por ID, explicar a relevância e formular a consequência, em parágrafos de três a quatro linhas e sem adjetivo de intensidade.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

