---
name: base-ctc-estadual-conferencia-e-lancamento-previus
description: "Analisa Certidão de Tempo de Contribuição (CTC) de RPPS estadual para contagem recíproca no RGPS, confere a contagem de tempo, consolida as remunerações e gera os arquivos de importação do Prévius (tempo e salários de contribuição). Use SEMPRE que receber CTC estadual, CTC de SEDUC, CTC de professor, Relação das Bases de Cálculo de Contribuição, Anexo X da Portaria MTP 1.467/2022, Relação das Remunerações de Contribuições por competências, dias eventuais, professor eventual, substituições, vínculos concomitantes no serviço público, e sempre que precisar conferir se a contagem do Prévius bate com a CTC, montar planilha competência x remuneração, tratar tempo descontínuo, ou preparar CSV de importação de tempo e de salários no Prévius. Cruza com base-contagem-reciproca-rgps-rpps, base-cnis-acerto-indicadores, base-carencia-por-especie-art27a, base-calculo-rmi-ec103 e aposentadoria-professor-rgps. NÃO use para CTC federal SIPEC, tempo especial por agente nocivo, nem para CNIS puro do RGPS."
---

# Conferência de CTC Estadual e Lançamento no Prévius

## 1. Escopo e postura

Skill operacional pró-segurado. Orienta a leitura crítica de uma CTC de RPPS estadual, a conferência da contagem de tempo contra o certificado, a consolidação das remunerações por competência e a geração dos dois arquivos de importação do Prévius. Modo crítico por padrão. Nunca inventar dia, competência, valor ou período. Todo total deve ser conferido por soma independente antes de afirmar que confere.

Dado de cliente é sigiloso e nunca entra nesta skill. Aqui só entram método, formato e fundamento.

## 2. Estrutura documental da CTC estadual

Uma CTC estadual costuma vir em três blocos, quase sempre digitalizada (exige OCR ou leitura por imagem, página a página, da primeira à última).

Bloco 1, a CTC em si (folhas de tempo). Traz os dados do servidor, os períodos discriminados (destinação do tempo), a tabela de FREQUÊNCIA com o tempo bruto e o tempo LÍQUIDO por ano, as faltas e licenças deduzidas, e o total certificado em dias com a conversão em anos, meses e dias. O tempo líquido por ano é a referência oficial da contagem.

Bloco 2, a Relação das Bases de Cálculo de Contribuição (Anexo X da Portaria MTP 1.467/2022). É a tabela de remunerações, em matriz com o mês nas linhas e o ano nas colunas, valores em reais. Vem uma folha por PV (vínculo), identificada no campo PV do cabeçalho. Só relaciona bases a partir de julho de 1994. A linha "13º/Gratificação Natalina" é base separada.

Bloco 3, a Declaração de vínculos. Lista, vínculo a vínculo, as portarias de admissão e dispensa e, nos contratos de professor eventual, enumera dia a dia as datas de substituição, com o total de "dias eventuais" do período.

Atenção, páginas digitalizadas costumam vir em duplicidade (cada folha escaneada duas vezes). Confira o campo PV e as datas antes de tratar uma página como nova.

## 3. Leitura e extração

1. Renderizar as páginas em imagem e ler todas, mapeando cada bloco.
2. Extrair a tabela de FREQUÊNCIA, tempo líquido por ano, e o total certificado em dias.
3. Extrair o Anexo X de cada PV, competência a competência, guardando o valor por (ano, mês) e por PV. Guardar o 13º à parte, por ano.
4. Extrair, da Declaração, as datas exatas dos dias eventuais de cada ano e o total declarado de dias eventuais.
5. Extrair os períodos contínuos (contratos ACT), com admissão e dispensa. O último dia trabalhado é a véspera da dispensa.

## 4. Consolidação das remunerações

O salário-de-contribuição de cada competência é a SOMA dos valores dos PVs daquele mês, porque os vínculos foram concomitantes no mesmo regime. A partir da reforma, salários de atividades simultâneas somam-se, respeitado o teto. Confira sempre se a soma do mês supera o teto da época; abaixo do teto, some direto.

O 13º não entra como competência mensal na média do RGPS. Fica em base separada.

Competências anteriores a 07/1994 não têm remuneração no Anexo X e não geram salário-de-contribuição. O tempo delas conta, o salário não.

## 5. Conferência do tempo (o núcleo da skill)

O tempo certificado é a referência. Reproduza-o, não recrie intervalos.

Monte o modelo correto assim.

1. Períodos contínuos (contratos ACT), pelas datas reais da Declaração.
2. Dias eventuais, pelo total e pelas datas de cada ano.
3. Some contínuos mais eventuais e compare com o total certificado da CTC. A diferença aceitável é de 1 ou 2 dias por arredondamento de borda (ano de 365 dias, mês de 30).

Confira também ano a ano contra o tempo líquido da FREQUÊNCIA. Anos só de contrato contínuo têm que bater exato. As diferenças relevantes tendem a aparecer nos anos com substituição eventual.

Erro clássico do operador, lançar um intervalo corrido fictício no lugar dos dias eventuais (por exemplo 01/01 a 17/02 para representar os dias do ano). Isso erra a quantidade (conta dias corridos, não os efetivos), erra a competência (joga tempo e salário em meses sem atividade), erra a carência (número de contribuições mensais) e impede que o tempo case com a remuneração na média. Identifique e remova esses intervalos fictícios.

## 6. Regra de lançamento dos dias eventuais

Dias eventuais lançam-se por competência, nas datas reais. Dias consecutivos viram um intervalo (início ao fim). Dia isolado tem início igual ao fim. O que importa é o par correto, número de dias no mês e competência certa, casado com a remuneração daquele mês.

## 7. Concomitância (verificação obrigatória)

Antes de fechar, cheque se algum dia eventual cai DENTRO de um período contínuo já existente. Se cair, não lance esse dia como tempo, porque o tempo já está contado uma vez e a contagem em duplicidade do mesmo período é vedada. A remuneração daquele mês permanece, porque a soma dos vínculos é do salário, não do tempo. Esse ajuste costuma explicar exatamente a diferença de 1 dia entre o modelo e o total da CTC.

Precisão normativa (conferida na fonte). O art. 96, II, da Lei 8.213/91 veda expressamente "a contagem de tempo de serviço público com o de atividade privada, quando concomitantes". A hipótese literal do inciso é público versus privado. O caso aqui é diferente, dois vínculos públicos concomitantes dentro do MESMO RPPS na mesma CTC, em que o vício é contar o mesmo dia duas vezes. A vedação de duplicidade se sustenta pela lógica geral da contagem recíproca (um dia não pode valer mais de um dia) e pelo art. 96, III (o tempo já aproveitado não se reconta), com o art. 96, II citado por analogia. Ao redigir peça, não afirme que o art. 96, II, na letra, proíbe duplicidade público-público. Ancore na vedação geral de contagem de um mesmo período em duplicidade e cite o art. 96, II por analogia e o art. 96, III diretamente.

## 8. Geração dos arquivos de importação do Prévius

Dois importadores distintos, dois arquivos. Ambos em CSV, separador PONTO E VÍRGULA (porque os números usam vírgula decimal, e é assim que o Excel em português grava "CSV separado por vírgulas"). Datas no formato DD/MM/AAAA no arquivo de tempo e MM/AAAA no de salários. Incluir a linha de cabeçalho conforme o modelo da tela; avisar o usuário que, se o importador acusar erro na primeira linha, basta removê-la.

### 8.1 Arquivo de TEMPO DE CONTRIBUIÇÃO

Sete colunas, na ordem do importador.

Coluna 1, Data Inicial. Coluna 2, Data Final. Coluna 3, Tipo (1 Normal, 2 Especial, 3 Dobrado, 4 Licença, 5 Marítimo, 6 Tempo Rural, 7 Período de Professor). Coluna 4, Fator. Coluna 5, Empresa. Coluna 6, Cargo. Coluna 7, Fonte.

Para CTC de professor, Tipo 7 e Fator 1,00. Empresa igual à que já consta no Prévius (por exemplo "ESTADO DE SAO PAULO - CTC"), Cargo "Professor", Fonte "CTC". Uma linha por bloco de dias. Excluir os dias em concomitância identificados no item 7. Este arquivo é só o tempo; os períodos contínuos que o operador já tenha lançado corretamente não precisam ser reimportados.

Cabeçalho, `Data Inicial;Data Final;Tipo;Fator;Empresa;Cargo;Fonte`.

### 8.2 Arquivo de SALÁRIOS DE CONTRIBUIÇÃO

Duas colunas quando o valor já vem consolidado. Coluna 1, Data (competência MM/AAAA). Coluna 2, Valor (salário-de-contribuição do mês). O importador aceita colunas de atividade secundária (Valor1 a Valor5), mas, quando a soma dos vínculos fica abaixo do teto, é mais seguro lançar o valor único já somado como atividade principal, sem secundárias, para garantir que a média use o total sem risco de tratamento proporcional.

Uma linha por competência, só as competências com remuneração no Anexo X (07/1994 em diante), sem o 13º. Valores com vírgula decimal e sem separador de milhar.

Cabeçalho, `Data;Valor`.

### 8.3 Ordem de execução no Prévius

Primeiro excluir os intervalos fictícios e ajustar os contínuos. Depois importar o tempo. Só então importar os salários. Importar o tempo antes de excluir os fictícios duplica a contagem nos anos afetados.

## 9. Fundamentos

Todos conferidos no repositório de fontes primárias `base-legislacao-fontes-primarias` e em fonte oficial, em 20/07/2026 (ver seção 14 para o carimbo de verificação).

Contagem recíproca e efeitos, art. 96 da Lei 8.213/91. O inciso I veda contagem em dobro ou em condições especiais na recíproca. O inciso II veda a contagem de tempo de serviço público com o de atividade privada, quando concomitantes. O inciso III veda reaproveitar por um sistema o tempo já usado para aposentadoria pelo outro. O inciso IV condiciona à indenização o tempo anterior ou posterior à obrigatoriedade de filiação.

Carência como número de contribuições mensais, art. 24 da Lei 8.213/91 ("Período de carência é o número mínimo de contribuições mensais indispensáveis para que o beneficiário faça jus ao benefício").

CTC acompanhada da Relação das Remunerações de Contribuições por competências para períodos posteriores a junho de 1994, art. 70 da IN PRES/INSS 128/2022 (a CTC segue o modelo do Anexo XV e é acompanhada da Relação das Remunerações conforme Anexo XXIII, quando o período for posterior à competência junho de 1994). Do lado do RPPS emissor, a Relação das Bases de Cálculo de Contribuição segue o Anexo X da Portaria MTP 1.467/2022.

Descarte das competências que reduzem a média, mantido o tempo mínimo, art. 26, §6º, da EC 103/2019 ("Poderão ser excluídas da média as contribuições que resultem em redução do valor do benefício, desde que mantido o tempo mínimo de contribuição exigido, vedada a utilização do tempo excluído para qualquer finalidade"). O caput do art. 26 fixa a média de 100% do período contributivo desde a competência julho de 1994.

A redação literal dos dispositivos confere-se em `base-legislacao-fontes-primarias` (arquivos da Lei 8.213/91, EC 103/2019 e IN 128/2022) ou no Planalto antes de citar em peça.

## 10. Entregáveis padrão

1. Planilha .xlsx com abas de remunerações consolidadas por competência (com detalhe por vínculo), 13º em base separada, conferência do tempo ano a ano (CTC x Prévius), confronto do que manter, ajustar, lançar e remover, e o kit de blocos eventuais.
2. CSV de tempo de contribuição no formato do item 8.1.
3. CSV de salários de contribuição no formato do item 8.2.

Toda planilha com fórmula passa por recálculo e sai com zero erro. Todo total é conferido por soma independente. Acionar a skill `xlsx` para a geração da planilha.

## 11. Checklist de verificação (rodar antes de entregar)

1. Soma dos contínuos mais eventuais bate com o total certificado da CTC (tolerância de 1 a 2 dias de borda, sempre explicada).
2. Cada ano só de contrato contínuo bate exato contra a FREQUÊNCIA.
3. Nenhum dia eventual cai dentro de período contínuo (concomitância tratada).
4. Intervalos fictícios identificados e listados para exclusão.
5. Remunerações somadas por competência, 13º fora, nada antes de 07/1994.
6. CSVs com separador ponto e vírgula e vírgula decimal, datas no formato certo.
7. Diferença residual de dias explicada (tipicamente o dia em concomitância).

## 12. Integração com outras skills

Para o direito à contagem recíproca e à CTC, `base-contagem-reciproca-rgps-rpps`. Para cruzar com o CNIS e indicadores, `base-cnis-acerto-indicadores`. Para carência, `base-carencia-por-especie-art27a`. Para a média e a RMI pela EC 103, `base-calculo-rmi-ec103`. Para o enquadramento do professor, `aposentadoria-professor-rgps`. Para a fonte literal das normas, `base-legislacao-fontes-primarias`. Para a geração da planilha, a skill `xlsx`. Para a peça, `peticao-previdenciaria`.

## 13. Alertas

Primeiro, o total bruto da CTC pode embutir dia contado em duplicidade por concomitância; o modelo correto pode ficar 1 dia abaixo, e isso é o certo. Segundo, remuneração de mês de substituição costuma ficar abaixo do salário mínimo da época, o que é normal na contagem recíproca e o Prévius trata pelo descarte. Terceiro, confira sempre se a correção do tempo antecipa o cumprimento do requisito, porque isso muda a DER e pode dispensar projeção e contribuições a pagar.

## 14. Carimbo de verificação de fundamentos (Onda 74)

Conferido em 20/07/2026 contra fonte primária, antes da criação desta skill.

Art. 96, incisos I a IV, da Lei 8.213/91. CONFERIDO no arquivo local `Lei-8213-91-beneficios.md`. O inciso II trata de público versus privado concomitantes (ver a precisão da seção 7).

Art. 24 da Lei 8.213/91 (carência como número de contribuições mensais). CONFERIDO no arquivo local.

Art. 26, caput e §6º, da EC 103/2019 (média de 100% desde 07/1994 e exclusão das competências que reduzem a média mantido o tempo mínimo). CONFERIDO no arquivo local `EC-103-2019.md`, texto literal do §6º transcrito na seção 9.

Art. 70 da IN PRES/INSS 128/2022 (CTC pelo Anexo XV, acompanhada da Relação das Remunerações pelo Anexo XXIII, período posterior a 06/1994). CONFERIDO no arquivo local `IN-128-2022-INSS-parte1`.

Portaria MTP 1.467/2022, Anexo X (Relação das Bases de Cálculo de Contribuição, RBCC). CONFERIDO em fonte oficial (gov.br, Manual de CTC do INSS e Portal IN/INSS), por não constar do repositório local de legislação. Registrado nas notas de manutenção da `base-legislacao-fontes-primarias` como norma a baixar.

Prévius. O formato dos importadores (colunas, tipos, separador) é do software de cálculo do escritório, não é norma. Descrição operacional, não jurídica.
