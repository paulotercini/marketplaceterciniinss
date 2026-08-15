---
name: relatorio-medico-assistente
description: Geração de modelos de relatório médico para o médico assistente do segurado, no padrão do escritório Paulo Roberto Tercini Filho, em duas vias (incapacidade B31 e deficiência LC 142/2013). Use SEMPRE que pedir para criar, montar ou redigir relatório para médico assistente, relatório para a reumatologista, relatório para encaminhar ao médico, pedido de relatório médico, modelo de laudo para o INSS, relatório de incapacidade, relatório de deficiência, relatório para perícia, relatório para auxílio-doença, relatório para aposentadoria PCD, relatório para BPC/LOAS, ou quando o usuário enviar documentos médicos (atestados, laudos, exames, ultrassom, relatórios de especialista) pedindo para sintetizar em um relatório a ser assinado pelo médico assistente. Acionar mesmo sem a palavra "skill". Complementar a aposentadoria-deficiencia, analise-documental-incapacidade, formacao-documentacao-did-pcd, documentos-comprobatorios-in128. NÃO use para petições.
---

# Relatório médico para o médico assistente

Sintetiza a documentação médica do segurado em um relatório claro, no padrão do escritório, para o médico assistente revisar, completar e assinar. O documento sai pronto, com os dados já preenchidos, e o médico apenas confirma o que está dentro da sua especialidade.

O objetivo é produzir prova médica que sobreviva à perícia do INSS. Relatório genérico não sustenta benefício.

## Passo 1: escolher a via

Há dois modelos. A escolha define tudo.

**Incapacidade (B31).** Quando o pedido é benefício por incapacidade temporária. O foco é a impossibilidade atual de trabalhar e a data de início da incapacidade (DII). Leia `references/modelo-incapacidade.md`.

**Deficiência (LC 142/2013, BPC/LOAS).** Quando o pedido é aposentadoria da pessoa com deficiência ou benefício assistencial. O foco é o impedimento de longo prazo de no mínimo 2 anos e a avaliação biopsicossocial por domínios. Leia `references/modelo-deficiencia.md`.

Se o caso comportar as duas vias, ou se não estiver claro, pergunte ao usuário antes de gerar. Não escolha sozinho quando houver dúvida real. Quando o médico assistente já vem emitindo atestados de afastamento, a via natural é incapacidade. Quando o quadro é crônico, estabilizado e antigo, em paciente perto da aposentadoria, alerte sobre a via de deficiência mesmo que o pedido tenha começado como incapacidade.

## Passo 2: ler toda a documentação antes de redigir

Leia cada documento enviado. Atestados, relatórios de especialista, exames de imagem, exames laboratoriais seriados, declarações. Extraia diagnósticos, CIDs, datas, achados objetivos e a evolução temporal. Não resuma por cima. O relatório se constrói com fato concreto, não com fórmula.

Cruze os documentos entre si. Procure a data mais antiga que ancora a doença, a progressão, a resposta ao tratamento e os marcadores objetivos que provam atividade da doença.

## Passo 3: aplicar os checks obrigatórios

Estes pontos são onde a maioria dos relatórios falha. Verifique todos antes de entregar.

**Enfrentar notações periciais adversas.** Expressões como "sem sinais de atividade", "marcha normal", "amplitude preservada" em exames anteriores serão usadas pelo perito para negar. O relatório precisa interpretar e distinguir essas notações, não ignorá-las. Exemplo de distinção válida, dano estrutural é permanente e independe de atividade inflamatória aguda no momento do exame; marcador laboratorial elevado prova atividade sistêmica ainda que a imagem focal esteja quiescente.

**DII ancorada no histórico.** A data de início da incapacidade ou da deficiência se fixa pelo documento mais antigo e pela evolução, nunca pela data de emissão do relatório. Aponte a data e a prova que a sustenta.

**Limitação amarrada à profissão real.** O impacto funcional só convence quando ligado à atividade habitual concreta do segurado. Se a profissão não constar nos documentos, NÃO invente. Deixe campo marcado como `[profissão da segurada]` e avise o usuário que precisa preencher.

**Respeitar o escopo do médico.** Cada médico atesta o que é da sua especialidade. Reumatologista não diagnostica transtorno mental. O relatório do especialista pode referir comorbidade de outra área como contexto, mas não pode atestar diagnóstico fora do seu campo. Não force.

**Alertar quando faltar laudo de especialista.** Se houver componente psíquico documentado só por psicólogo, avise que CID lançado por psicólogo tem peso probatório fraco e que relatório de psiquiatra fortalece o caso. O mesmo vale para qualquer comorbidade relevante sem laudo do especialista próprio.

**Não classificar grau de deficiência nem decidir a perícia.** O relatório descreve achados e limitações. A graduação (IF-BrA, grau leve, moderado, grave) é da perícia do INSS. Não asserte classificação no documento.

**Marcadores objetivos.** Sempre que houver exame que comprove atividade ou gravidade (VHS, PCR, imagem com dano estrutural, exames seriados), traga o valor, a data e o valor de referência. Objetividade vence a perícia.

## Passo 4: gerar o .docx no padrão do escritório

Antes de criar qualquer arquivo, leia `/mnt/skills/public/docx/SKILL.md`.

Formatação fixa do escritório. Fonte Bookman Old Style 12pt. Espaçamento entre linhas 1,5 (line 360). Página A4 (largura 11906, altura 16838). Margens superior e inferior 1440, esquerda e direita 1134. Rótulos de campo em negrito. Títulos de seção em negrito. Texto em prosa corrida e justificada, parágrafos curtos.

Gere o arquivo, valide com `validate.py`, copie para `/mnt/user-data/outputs/` e apresente com `present_files`.

## Passo 5: entregar com análise crítica

No corpo da conversa, comece pelo problema mais crítico do caso, não pelo elogio ao trabalho. Aponte fragilidades, lacunas e riscos de indeferimento. Liste o que o usuário ainda precisa resolver antes de mandar ao médico, como profissão faltante, laudo de especialista ausente ou data a confirmar.

## Estilo

Siga as regras de escrita do escritório. Sem travessão. Sem dois pontos para introduzir explicações no texto corrido (rótulos de campo de formulário podem usar). Sem a estrutura "não é X, é Y". Sem listas com bullet no relatório, prosa corrida. Linguagem formal e jurídico-médica.

## Sigilo

Esta skill guarda o método, nunca o caso concreto. Não registre nomes de clientes, CIDs específicos de um paciente real, nem dados pessoais nos arquivos da skill.
