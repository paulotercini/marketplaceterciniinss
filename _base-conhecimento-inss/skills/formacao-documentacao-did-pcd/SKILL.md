---
name: formacao-documentacao-did-pcd
description: "Formação de documentação médica pretérita para ancorar a Data de Início da Deficiência (DID) em aposentadoria PCD da LC 142/2013 quando o segurado NÃO possui documentos médicos antigos. Use SEMPRE que mencionar ausência de documentos médicos pretéritos, formar documentação DID, reconstruir histórico médico, DID sem prova, fixação retroativa da deficiência, laudo médico retrospectivo, prova médica reconstitutiva, roteiro ao médico assistente, busca prontuário retroativo, prontuário UBS antigo, ASO retroativo, ficha medicina do trabalho, fisiopatologia temporal, história natural da doença previdenciário, requerer documentação clínica, cliente sem documentos médicos. Acionar AUTOMATICAMENTE em casos de aposentadoria PCD quando o cliente não apresenta documentação médica anterior. Complementar a aposentadoria-deficiencia, base-documentos-comprobatorios-in128, peticao-previdenciaria. NÃO use para B31/B32 ou BPC sem componente PCD."
---

# Formação de Documentação Médica Pretérita para a DID na Aposentadoria PCD

## Escopo

Formar o conjunto probatório da data de início da deficiência (DID) quando o segurado não guarda documentos médicos antigos, em três frentes: busca em fontes que o cliente desconhece, produção de documentos novos e redação de peças instrumentais (requerimento de prontuário, roteiro ao médico, ofício ao empregador). Regras de fixação da DID em `base-pcd-did-retroativa`.

## Fluxo

1. Ler `references/HIERARQUIA-PROBATORIA.md` (peso de cada documento e ordem de produção), `references/FISIOPATOLOGIA-TEMPORAL.md` (evolução típica das patologias) e `references/FONTES-DOCUMENTAIS.md` (mapa de fontes).
2. Receber o caso com patologias, período laboral e PPP.
3. Fazer o diagnóstico documental, o plano de formação e as peças pedidas, com os modelos de `assets/`.

## Regras

- **Limite técnico.** Não projetar DID anterior ao que a evolução da doença sustenta. DID recente ainda pode viabilizar o benefício combinada com a conversão de tempo especial (Decreto 3.048/1999, art. 70-F, §1º, para períodos até 13/11/2019).
- **Nada inventado.** A skill orienta a busca e a organização de prova real. Falsificar documento médico configura crime (CP, arts. 171 e 299) e inviabiliza o caso.
- **Prova existente e prova nova.** Separar documentos em arquivo de terceiros (prontuários, ASO, prescrições, autorizações de convênio) dos documentos a produzir (relatório circunstanciado, laudo extrajudicial, autodeclaração).
- **Prova testemunhal.** O tempo anterior à vigência da LC 142 (novembro de 2013) não se prova por prova exclusivamente testemunhal (LC 142, art. 6º, §2º; Decreto 3.048/1999, art. 70-D, §1º). Testemunhas complementam.

## Marco normativo

- LC 142/2013, art. 6º, §1º: fixação obrigatória da data provável de início na primeira avaliação.
- Decreto 3.048/1999, art. 70-D, I e II, e §1º: DID, períodos por grau e documentos que subsidiem a avaliação.
- Portaria Interministerial SDH/MPS/MF/MOG/AGU nº 1/2014 (IF-BrA).
- Acesso a dados: CF, art. 5º, XIV e XXXIV; Lei 13.709/2018 (LGPD), arts. 9º e 18; Lei 13.460/2017, art. 6º; Código de Ética Médica (Resolução CFM 2.217/2018), art. 88; guarda do prontuário por 20 anos do último registro (Lei 13.787/2018, art. 6º; Resolução CFM 1.821/2007).
- Medicina do trabalho: CLT, art. 168, e NR-07 (PCMSO).
- Prova técnica: CPC, arts. 369 e 472.

## Modos de operação

**1. Diagnóstico documental.**
1. Patologias, CID e achados dos exames atuais.
2. Período contributivo e vínculos, sobretudo com PPP ou tempo especial.
3. Idade de início típica das patologias.
4. DID tecnicamente sustentável pela história natural da doença.
5. Fontes pretéritas prováveis.
6. Documentos a produzir, por impacto probatório.

**2. Plano em quatro camadas.**
1. Busca em fontes existentes: UBS, hospitais, convênio, farmácias, empregadores, SUS, com base legal e prazo.
2. Documentos novos: relatório circunstanciado do especialista assistente, laudo extrajudicial quando pertinente, autodeclaração assistida.
3. Nexo com o trabalho: cruzamento do PPP com as patologias; laudo de nexo pode recuar a DID ao início da exposição.
4. Prova complementar: fotografias, receitas, compra de órteses, declarações de médicos que atenderam pontualmente.

**3. Peças instrumentais.**
- A. Requerimento de cópia integral de prontuário (UBS, hospital, convênio), com prazo e registro da recusa para habeas data.
- B. Roteiro ao médico assistente: estrutura, CID, evolução temporal, DID estimada e limitações nos domínios do IF-BrA.
- C. Ofício ao antigo empregador: ficha clínica, ASO admissional, periódicos e demissional, exames ocupacionais (CLT, art. 168, e NR-07).

## Estrutura da saída

1. Diagnóstico documental: patologias, período relevante, DID sustentável com justificativa e inventário do que existe e do que falta.
2. Plano de formação: quatro camadas, prioridade e cronograma.
3. Peças a gerar.
4. Orientação ao cliente, em linguagem acessível, com prazos.
5. Alertas: fragilidades e alternativa.

## Integração

`aposentadoria-deficiencia` (IF-BrA e art. 70-F, §1º); `base-pcd-did-retroativa` (regras da DID); `auditoria-ppp` (nexo e período especial); `base-documentos-comprobatorios-in128` (documentos aceitos pelo INSS); `requerimento-administrativo-inss`; `peticao-previdenciaria`; `tema-1124-instrucao-administrativa`; `perspectiva-genero-previdenciario` (trabalho doméstico ou rural informal, em que a falta de documento é estrutural).

## Modelos em assets

- `assets/requerimento-prontuario-UBS.md`
- `assets/requerimento-prontuario-convenio.md`
- `assets/oficio-empregador-medicina-trabalho.md`
- `assets/roteiro-relatorio-medico.md`
- `assets/autodeclaracao-assistida.md`

## Observação final

A falta de documentos antigos não inviabiliza o benefício. O relatório atual fundamentado na evolução da doença é documento e subsidia a avaliação, mas a DID ganha força com a busca nas fontes de terceiros. Os dois desvios a evitar são desistir da DID retroativa por ausência aparente de prova e projetar DID sem suporte técnico.

## MCPs da casa

Pesquisa obrigatória. Norma, súmula, tema, enunciado ou acórdão citado nesta skill nasce [NÃO CONFIRMADO] e só entra em peça, parecer ou orientação depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`. A ordem de consulta dos MCPs (`normas`, `superiores`, `trf3`, `iurisprudencia` e `acervo`) e dos catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) está em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O acervo serve à leitura do que o escritório já sustentou, e o reaproveitamento automático de texto de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.
