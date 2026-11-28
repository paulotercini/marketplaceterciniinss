---
name: tempo-especial-peticoes-por-rito
description: "Skill para transposição de análise de PPP em petições de tempo especial adaptadas ao rito e posicionamento do órgão julgador. Use SEMPRE que análise de PPP estiver concluída e for necessário redigir petição perante CRPS, JEF ou rito ordinário TRF3. Use quando mencionar 'petição tempo especial', 'recurso CRPS tempo especial', 'ação JEF aposentadoria especial', 'ação rito comum tempo especial', 'recurso inominado tempo especial', 'apelação TRF3', 'posicionamento CRPS sobre EPI', 'posicionamento TRF3 ruído', 'diferença JEF rito comum especial', 'estratégia processual tempo especial', ou conversão de análise técnica de PPP em peça processual adaptada ao órgão julgador. Complementar a auditoria-ppp, base-especial-agentes-quimicos, defesa-probatoria-especial e peticao-previdenciaria. NÃO use para análise isolada de PPP sem peticionamento."
---

# Petições de tempo especial por rito

## 1. Função

Converte a auditoria do PPP (`auditoria-ppp`) em peça adaptada ao órgão que vai decidir: CRPS, JEF ou rito ordinário do TRF3. A forma da peça segue `peticao-previdenciaria/references/METODO-PETICAO-TERCINI.md`, com o PPP identificado pelo emitente e pela data e o trecho do agente transcrito em negrito e itálico; o esqueleto está nos Modelos Ouro 3.0 de aposentadoria especial.

## 2. Diferenças entre ritos

| | CRPS | JEF | Rito ordinário (TRF3) |
|---|---|---|---|
| Fundamento primário | Decreto 3.048/99, IN 128/2022, enunciados e pareceres vinculantes | CF, Lei 8.213/91, STF, STJ, TNU e TRF3 | CF, Lei 8.213/91, STF, STJ e TRF3; TNU como persuasiva |
| Prova | Documental; não há perícia técnica | Perícia simplificada (art. 12 da Lei 10.259/2001) e prova oral em audiência | Perícia com quesitos e assistente técnico |
| Uniformização | Câmaras de Julgamento | Turma Recursal, TRU e TNU | TRF3 e STJ |
| Skills de apoio | `base-recurso-crps-peca-enxuta`, `admissibilidade-barreiras-crps`, `recursos-superiores-crps`, `incidentes-instrucao-crps`, `ponte-workflow-crps` | `base-jef-previdenciario`, `base-recursos-jef` | `base-rito-ordinario-trf` |

A IN 128/2022 e os enunciados do CRPS orientam o INSS e o CRPS, mas não vinculam o juiz. A tese uniformizada pela TNU vincula o microssistema dos juizados; no rito ordinário, funciona como precedente persuasivo.

## 3. Mapa de decisão

- **Indeferimento administrativo.** Recurso ordinário ao CRPS, com fundamento normativo antes do jurisprudencial. Se já houver acórdão de Junta, `recursos-superiores-crps`.
- **Ação judicial até 60 salários mínimos.** JEF. Acima, rito ordinário. Foro e prática local em `base-juizo-catanduva`.
- **Ruído de 06/03/1997 a 18/11/2003.** Limite de 90 dB nas duas vias (Enunciado 13 do CRPS; Tema 694 do STJ). Teses em `base-especial-ruido`.
- **PPP de ruído sem NEN ou sem técnica.** Na via judicial, a menção à NHO-01 ou à NR-15 gera presunção relativa de regularidade (TNU, PUIL 0001717-22.2019.4.03.6318/SP); sem NEN, o Tema 1083 do STJ admite o pico de ruído com perícia judicial que comprove a habitualidade e a permanência. O Tema 317 da TNU é adverso quando o PPP informa apenas "dosimetria". Na via administrativa, o CRPS tem aplicado a Nota 00792/2025/CONJUR-MPS/CGU/AGU, cujo conteúdo é [NÃO CONFIRMADO]. A diferença entre as vias orienta a escolha, à luz do Tema 1124 do STJ.
- **Empregador recusa emitir ou retificar o PPP.** Notificação (`retificacao-ppp`) e, se necessário, ação trabalhista de obrigação de fazer (Tema 132 do TST, imprescritibilidade [NÃO CONFIRMADO]). Apresentado o PPP retificado ao INSS antes da ação, examinar os efeitos financeiros pelo Tema 1124 do STJ (`tema-1124-instrucao-administrativa`).
- **Frentista.** Benzeno com avaliação qualitativa e EPI irrelevante (TNU, PUIL 0136882-97.2017.4.02.5167/RJ, j. 24/02/2026; Tema 170 da TNU). O Tema 157 da TNU nega presunção legal pela função, e a prova da exposição é indispensável. Ver `base-especial-agentes-quimicos`.
- **EPI controvertido.** Roteiro do Tema 1090 do STJ e do Tema 213 da TNU em `base-especial-epi` e `defesa-probatoria-especial`. No TRF3, o IRDR 15 do TRF4 entra como precedente persuasivo.
- **Sentença sem perícia.** Cerceamento de defesa (`defesa-probatoria-especial`, seção 2; `base-cpc-nulidades-cerceamento`).
- **Tutela de urgência.** `base-cpc-tutela-provisoria-previdenciaria`.

## 4. Regras

- **Riscos.** Registrar com clareza a tese adversa e o ponto vulnerável do PPP.
- **Posicionamento dos órgãos.** Afirmar a posição de um órgão apenas com acórdão conferido; sem ele, escrever "posicionamento a confirmar em jurisprudência atualizada".
- **Procedimento recursal.** Esta skill complementa as skills de procedimento do CRPS e do JEF; usar as duas.

Retirados nesta revisão:
- remissões a quatro arquivos de referência e a oito skills inexistentes;
- o Comunicado CRPS 99/2025 (Não localizado);
- a afirmação genérica sobre a posição de TRF2 e TRF6 quanto ao frentista;
- o processo administrativo do CRPS citado sem conferência.

## Extensão

Extensão de referência da peça por rito, 7 páginas na inicial, 4 no recurso inominado e 3 no recurso ao CRPS. É referência preferencial, e não limite obrigatório: a peça tem a extensão que a compreensão de cada pedido exige, e dela sai apenas a repetição, nunca fato, prova, cálculo, explicação de norma ou transição. Antes de escrever, nomear em uma frase o ponto que decide, e o dado que o prova acompanha cada pedido. Regra 10 do protocolo e `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Redação da peça neste tema

Seguir o bloco "Aposentadoria especial" de `peticao-previdenciaria/references/REDACAO-POR-ESPECIE.md`. A fórmula é afirmar o fato, localizar a prova por ID, explicar a relevância e formular a consequência, em parágrafos de três a quatro linhas e sem adjetivo de intensidade.

## Juízo de Catanduva

O juízo examina o PPP período a período, pelo regime de prova de cada época, parte do que o INSS já reconheceu no processo administrativo e extingue por falta de interesse o período já enquadrado. A peça separa os períodos por regime de prova, indica o código do decreto, requer na inicial o ofício à empregadora para juntar o LTCAT e pede, em ordem subsidiária, especial, tempo de contribuição, reafirmação da DER e declaração dos períodos. Blocos literais e esqueleto da sentença em `base-juizo-catanduva/references/BLOCOS-ESPECIAL-PROCESSO.md`.

## Hub de portarias administrativas

As Portarias DPMF, DIRBEN e INSS que regem procedimento, cálculo e recurso estão em `base-portarias-dpmf-inss-hub`.

## MCPs da casa

Pesquisa obrigatória. Norma, súmula, tema, enunciado ou acórdão citado nesta skill nasce [NÃO CONFIRMADO] e só entra em peça, parecer ou orientação depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`. A ordem de consulta dos MCPs (`normas`, `superiores`, `trf3`, `iurisprudencia` e `acervo`) e dos catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) está em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O acervo serve à leitura do que o escritório já sustentou, e o reaproveitamento automático de texto de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Integração com outras skills

PPP em `auditoria-ppp` e `retificacao-ppp`. Agentes nas `base-especial-*`. Prova em `defesa-probatoria-especial`. Conversão em `base-tempo-especial-conversao`. Transição em `base-aposentadoria-especial-transicao-ec103`. Formatação em `peticao-previdenciaria`.
