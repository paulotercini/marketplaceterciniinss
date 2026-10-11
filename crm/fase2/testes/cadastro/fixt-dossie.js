// Fixturas do dossiê (ondas 1 a 5). Cada texto reproduz o LAYOUT das linhas
// que o CRM monta de um PDF real do portal (textoDoDocumento: linhas na ordem
// da folha), com TODO dado de pessoa e de empresa inventado: nomes, CPF, PIS,
// CNPJ, NB, datas e valores. Os rótulos e as descrições (causa de desligamento,
// tipo de admissão, nome do mês, situação) são vocabulário público do portal e
// ficam como estão, porque é o que os leitores procuram.
//
// Os casos de layout que os leitores precisam aguentar, vistos nos extratos
// reais em 10.10.2026:
//   CAGED · razão social quebrada em duas linhas, uma ACIMA e outra ABAIXO da
//           linha das datas; razão social COLADA à data de admissão; código só
//           com a raiz do CNPJ quando a fonte é o eSocial; vínculo "Aberto" sem
//           data de desligamento.
//   RAIS  · um bloco por vínculo e ano-base; "Data" sozinha quando não houve
//           desligamento no ano, "Data dd/mm/aaaa" quando houve; a causa na
//           linha de baixo; remuneração por mês, dois meses por linha.

const CAGED_TEXTO = [
  "MINISTÉRIO DO TRABALHO E EMPREGO",
  "Secretaria Executiva",
  "Subsecretaria de Estatísticas e Estudos do Trabalho",
  "Coordenação-Geral de Estudos e Estatísticas do Trabalho",
  "Relação de vínculos do trabalhador",
  "DADOS DO TRABALHADOR",
  "Nome: AURELIA FICTA DE SOUZA",
  "CPF: 123.456.789-09",
  "PIS/PASEP: Data Nascimento Sexo",
  "123.45678.90-1 14/03/1962 FEMININO",
  "VÍNCULOS",
  "Cod. Empregador Razão Social Data Adm. Data Deslig. Situação Fonte",
  "INDUSTRIA FICTICIA DE PARAFUSOS E",
  "11.222.333 15/04/2024 Aberto eSocial",
  "COMERCIO LTDA",
  "44.555.666 MERCADO INVENTADO LTDA 18/09/2019 31/12/2023 Fechado eSocial/eSocial",
  "22.333.444/0001-81 COMERCIAL IMAGINARIA DE FRUTAS LTD10/05/2009 15/07/2011 Fechado CAGED/CAGED",
  "EVENTOS FICTICIOS TRABALHO TEMP., ASSESS. E",
  "33.444.555/0001-90 11/11/2000 04/04/2002 Fechado RAIS/RAIS",
  "CONSULT. LTDA",
  "55.666.777/0001-02 OFICINA SUPOSTA ME 01/09/1998 Aberto CAGED",
  "1",
  "Autenticidade",
  "Chave de autenticidade",
  "abcd.efgh.ijkl.mnop",
  "Chave válida por 7 dias corridos a partir da data da consulta",
  "Consulta realizada em 08/10/2026 às 08:11:38",
  "Total de Vínculos: 5 2",
].join("\n");

const blocoRais = (ano, cnpj, nome, adm, tipoAdm, desl, causa, aviso, meses) => [
  "MINISTÉRIO DO TRABALHO E EMPREGO",
  "Secretaria-Executiva",
  `RELAÇÃO ANUAL DE INFORMAÇÕES SOCIAIS - RAIS - Ano-Base: ${ano}`,
  "Relatório Completo do Trabalhador",
  "VÍNCULOS",
  "PIS: 123.45678.90-1 Nome: AURELIA FICTA DE SOUZA",
  "CPF CTPS/Série Local Trabalho Nacionalidade",
  "123.456.789-09 12345.0 10 - BRASILEIRA",
  "Grau de instrução Pessoa com Deficiência",
  "7 - Ensino Médio completo Não",
  "CNPJ Razão Social",
  `${cnpj} ${nome}`,
  "Data Admissão Tipo de admissão",
  `${adm}${tipoAdm ? " " + tipoAdm : ""}`,
  "Tipo salário Horas semanais Salário contratual CBO",
  "1 - Mensal 44 1.100,00 784205 - ALIMENTADOR DE LINHA DE PRODUCAO",
  "De Até Motivo",
  "1) 0 - null",
  "Afastamento",
  "Quantidade de dias afastados: 0",
  desl ? `Data ${desl}` : "Data",
  `Valor aviso prévio ${aviso}`,
  causa ? `Causa ${causa}` : "Causa",
  "Desligamento",
  "Verbas Pagas na Rescisão",
  "Remuneração Hora extra Remuneração Hora extra",
  ...meses,
  "Contribuição",
  "1",
];
const RAIS_TEXTO = [
  ...blocoRais("2001", "33.444.555/0001-90", "EVENTOS FICTICIOS TRABALHO TEMPORARIO LTDA", "11/11/2000",
    "2 - Admissão de empregado com emprego anterior (reemprego).", "", "", "0,00",
    ["Janeiro 1.100,00 0 Julho 1.100,00 0", "Fevereiro 1.100,00 0 Agosto 1.100,00 0"]),
  ...blocoRais("2002", "33.444.555/0001-90", "EVENTOS FICTICIOS TRABALHO TEMPORARIO LTDA", "11/11/2000", "", "04/04/2002",
    "11 - Rescisão de contr. sem justa causa por iniciativa do empregador ou exoneração de cargo efetivo ou em comissão", "1.322,00",
    ["Janeiro 1.180,00 0 Julho 0,00 0", "Fevereiro 1.180,00 0 Agosto 0,00 0", "Março 1.180,00 0 Setembro 0,00 0", "Abril 393,33 0 Outubro 0,00 0"]),
  ...blocoRais("2016", "66.777.888/0001-11", "TRANSPORTADORA ILUSORIA LTDA", "03/02/2015", "", "20/08/2016",
    "21 - Rescisão sem justa causa por iniciativa do empregado ou exonerado de cargo efetivo a pedido do servidor", "0,00",
    ["Janeiro 1.500,00 0 Julho 1.500,00 0", "Fevereiro 1.500,00 0 Agosto 1.000,00 0"]),
].join("\n");

// itens de PDF a partir de linhas de texto: um item por linha, com a largura
// proporcional ao texto — o bastante para palavrasDoPdf e linhasDoPdf
const itensDeLinhas = (linhas, p = 1) => linhas.map((t, i) => ({ t, x: 30, y: 60 + i * 14, w: t.length * 5, p }));

// ── Onda 2 · laudo, carta de concessão, extrato de pagamento e cópia do
// processo. Os casos de layout vistos nos documentos reais em 10.10.2026:
//   laudo da PMF · os rótulos e os valores na mesma linha no quadro da
//           Conclusão; a data do exame por extenso ("CIDADE - UF, 11 de Junho
//           de 2025."); o CID do médico assistente na história clínica, antes
//           do CID Principal.
//   laudo do SABI · os valores UMA LINHA ACIMA dos rótulos (a DCB junto do nome
//           do benefício, acima de "Cessação do Benefício:"; a data do exame
//           abaixo da linha do "Sexo:"); página de perícia sem nenhum valor.
//   carta · a de hoje (rótulos em cima, valores em baixo) e a antiga ("Carta de
//           Concessão / Memória de Cálculo", os dados num parágrafo).
//   cópia do processo · a data do despacho quebrada no meio ("16/05" e "/2025"
//           em linhas seguidas); despachos de mais de uma tarefa; a comunicação
//           de decisão com a data da EMISSÃO da cópia, não da decisão.
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const porExtenso = br => { const [d, m, a] = br.split("/"); return `${+d} de ${MESES[+m - 1]} de ${a}`; };
const AUT = ["Você pode conferir a autenticidade do documento em https://meu.inss.gov.br/#", "/autenticidade com o código abaixo", "1234567ABCDE12"];

const laudoPmf = ({ nb, exame, did, dii, dcb }) => [
  "PERÍCIA MÉDICA FEDERAL",
  "Perícia Médica de Benefício de Incapacidade",
  "Avaliação Médico Pericial BI - Perícia de Prorrogação",
  "Dados Cadastrais",
  `Protocolo INSS: 123456789 Protocolo PMF: 987654321 Espécie/NB: --/${nb}`,
  "Nome do Requerente: AURELIA FICTA DE SOUZA",
  "Nome Social:",
  "Data de Nascimento: 14/03/1962 - 64 anos",
  "NIT: 123.45678.90-1 CPF: 529.982.247-25",
  "História Clínica",
  "Costureira autônoma. Dor lombar irradiada, declaração do médico assistente com CID:M545, datada de 02/09/2026.",
  "Diagnóstico",
  "CIDs",
  "CID Principal M51.1 - Transtornos de discos lombares com radiculopatia",
  "CID Secundário Não existe CID Secundário",
  `${exame} 08:50 Página 1 de 3`,
  "Avaliado: AURELIA FICTA DE SOUZA",
  "Capacidade Laborativa",
  "X SIM NÃO",
  "Houve/Há comprovação da incapacidade?",
  "Considerações Médico Periciais: Incapaz",
  "Data do Início da Doença (DID)",
  did,
  "DID",
  "Data do Início da Incapacidade (DII)",
  `DII ${dii}`,
  "Classificação da Incapacidade",
  "Tipo de Grau de Incapacidade Total e temporária",
  `Data de Cessação do Benefício (DCB) ${dcb}`,
  "Conclusão",
  "Dados Técnicos",
  "CID Principal M51.1 - Transtornos de discos lombares com radiculopatia",
  "Doença isenta de carência? Não",
  "Capacidade Laborativa Houve comprovação da incapacidade",
  `DID ${did}`,
  `DII ${dii}`,
  "Total e temporária",
  `DCB ${dcb}`,
  "Nexo Técnico Não",
  "Perito Médico",
  "CADMED 1234567",
  `CIDADE INVENTADA - SP, ${porExtenso(exame)}.`,
  ...AUT,
  `${exame} 08:50 Página 2 de 3`,
].join("\n");

const LAUDO_SABI_TEXTO = [
  "INSS - INSTITUTO NACIONAL DO SEGURO SOCIAL",
  "SABI - Sistema de Administração de Benefícios por Incapacidade",
  "Laudo Médico",
  "Requerente: AURELIA FICTA DE SOUZA NB: 6001234567",
  "Sexo: Feminino Nasc: 14/03/1962 Nº Requer: 123456789",
  "123456789 26/03/2019",
  "Est. Civil: RG: Emissão: Dt Exame:",
  "Ocupação: Ordem: 2.0",
  "CADMED: 7654321",
  "Benefício: Início da Doença: 06/03/2019",
  "Auxílio - Doença 28/07/2019",
  "Cessação do Benefício:",
  "História: Início da Incapacidade: 06/03/2019",
  "Ax1 - costureira; BI anterior; refere dor lombar a CID: M545",
  "irradiada; atestado do médico assistente, CID: M51, pede 90 dias",
  "Considerações:",
  "Resultado: Existe incapacidade laborativa.",
  "Exame Físico:",
  "Lasègue positivo à direita.",
  "Ac do Trabalho: Não Reab. Profissional: Não",
  "Espécie de Nexo: Sem Nexo",
  "Isenção de Carência: Não",
  "Auxílio Acidente: Não Apos. por Invalidez: Não",
  "Vistoria Técnica:",
  "O INSS poderá rever a qualquer tempo as informações constantes neste extrato, conforme art. 19, § 3° do Decreto 3.048/99.",
  "26/03/2019 23:33 Página 1 de 2",
  "INSS - INSTITUTO NACIONAL DO SEGURO SOCIAL",
  "SABI - Sistema de Administração de Benefícios por Incapacidade",
  "Laudo Médico",
  "Requerente: AURELIA FICTA DE SOUZA NB: 6001234567",
  "Sexo: Feminino Nasc: 14/03/1962 Nº Requer: 123456780",
  "123456789 14/01/2019",
  "Est. Civil: RG: Emissão: Dt Exame:",
  "Ocupação: Ordem: 1.0",
  "Benefício: Início da Doença:",
  "Auxílio - Doença",
  "Cessação do",
  "Benefício:",
  "História:",
  "Início da Incapacidade:",
  "Ax1 - sem condição de segurada; refere dor lombar",
  "CID:",
  "Considerações:",
  "Resultado:",
  "O INSS poderá rever a qualquer tempo as informações constantes neste extrato, conforme art. 19, § 3° do Decreto 3.048/99.",
  "14/01/2019 16:00 Página 2 de 2",
].join("\n");

const cartaNova = ({ nb, der, concessao, dib, dip, rmi }) => [
  "Instituto Nacional do Seguro Social",
  "07/10/2026 11:03:22",
  "CARTA DE",
  "CONCESSÃO",
  "TITULAR: AURELIA FICTA DE SOUZA",
  "CPF: 529.982.247-25",
  "Comunicamos que foi concedido seu benefício:",
  "APOSENTADORIA POR IDADE",
  "NÚMERO DO BENEFÍCIO VALOR DO BENEFÍCIO*",
  `${nb} R$ ${rmi}`,
  "Solicitado em Concedido em",
  "DATA DE PAGAMENTO",
  `${der} ${concessao}`,
  "2° dia útil do mês **",
  "Início do benefício Início do pagamento",
  `${dib} ${dip}`,
  "Local de Pagamento",
  "DESISTÊNCIA DO BENEFÍCIO Banco: BANCO FICTICIO",
  "1 / 3",
  "Instituto Nacional do Seguro Social",
  "REGRAS DE",
  "DIREITO AO BENEFÍCIO",
  "Valor do Benefício Regra",
  "Artigo 18 da EC 103/2019 - Idade Mínima + Tempo de Contribuição",
].join("\n");

const CARTA_ANTIGA_TEXTO = [
  "Página 1 de 2",
  "INSS - INSTITUTO NACIONAL DO SEGURO SOCIAL",
  "Carta de Concessão / Memória de Cálculo do Benefício",
  "30/01/2026 10:57:12",
  "Nome: AURELIA FICTA DE SOUZA",
  "Nit: 1234567890-1",
  "Aps: 21.0.22.999 - AGÊNCIA DA PREVIDÊNCIA SOCIAL CIDADE INVENTADA",
  "Número do Benefício: 180123456-0",
  "Data de Concessão do Benefício: 20/10/2016",
  "Comunicamos que lhe foi concedido APOSENTADORIA POR IDADE (41) número 180123456-0",
  "requerido em 20/10/2016 com renda mensal de R$ 1.181,28 , calculada conforme abaixo, com início de vigência a partir de",
  "17/04/2016 .",
  "Dados do Pagamento do Benefício",
  "Seq. Data Salário Índice Sal. Corrigido Observação",
  "001 03/2016 3.131,64 1,0018 3.137,27",
].join("\n");

const extratoPag = ({ nb, dib, dip, credito }) => [
  "Página 1 de 1",
  "INSS - INSTITUTO NACIONAL DO SEGURO SOCIAL",
  "Histórico de Créditos",
  "08/10/2026 08:10:35",
  "Identificação do Filiado",
  "NIT: 123.45678.90-1 CPF: 529.982.247-25 Data de Nascimento: 14/03/1962",
  "Nome: AURELIA FICTA DE SOUZA",
  "Créditos do Benefício",
  `NB: ${nb}`,
  "Espécie: 41 - APOSENTADORIA POR IDADE",
  "APS: 21022999 - AGÊNCIA DA PREVIDÊNCIA SOCIAL CIDADE INVENTADA",
  `Data de Início do Benefício (DIB): ${dib} Data de Cessação do Benefício (DCB):`,
  `Data de Início do Pagamento (DIP): ${dip} MR: R$ 1.518,00`,
  "Valor Previsão do Data do Crédito",
  "Competência Período Meio de Pagamento Status Isento IR",
  "Líquido Pagamento Pagamento Invalidado",
  `${credito.comp} ${dip} R$ 1.212,00 CMG - CARTAO Pago ${credito.previsao} ${credito.pagoEm} Não Sim`,
  "a MAGNETICO",
  credito.fimPeriodo,
  "Banco: 999 - BANCO FICTICIO OP: 12345 - CIDADE INVENTADA SP Ocorrência: Pagamento efetivado",
].join("\n");

// cópia do processo: cabeçalho da tarefa e despachos ([data de envio, linhas])
const processo = ({ protocolo, servico, status, entrada, nb, despachos, comunicacao }) => [
  "Página 1 de 3",
  "INSS - Instituto Nacional do Seguro Social",
  "PROTOCOLO DE REQUERIMENTO",
  "Portal de Atendimento INSS",
  protocolo,
  "Informações da Tarefa",
  `Data de entrada: ${entrada} - Central de Serviços -`,
  "Dados Básicos",
  "Serviço Status Prioridade",
  `${servico} ${status} Normal`,
  "Dados Informados Pelo Solicitante",
  "NB",
  nb,
  "Emitido em: 09/10/2026 08:51",
  ...despachos.flatMap(([em, linhas], i) => [`Página ${i + 2} de 3`, `Despacho (${900000000 + i})`, `Enviado em ${em} 10:44:11`, ...linhas, "Emitido em: 09/10/2026 08:51"]),
  ...(comunicacao || []),
].join("\n");
const EXIGENCIA_AGENDAR = ["Prezado(a) Sr.(a),",
  "Para dar continuidade ao seu pedido de Benefício por Incapacidade, é necessário agendar a perícia médica .",
  "No pedido solicitado, vá em 'Cumprir Exigência' e selecione 'Agendar';",
  "Atenção! O agendamento deve ser feito em até 30 (trinta) dias. Depois desse prazo, o pedido será concluído",
  "por desistência."];
// a data agendada quebra no meio, como no documento real
const agendamento = (solicitacao, data, hora) => {
  const [dm, a] = [data.slice(0, 5), data.slice(6)];
  return [`Agendamento de perícia realizado com sucesso (protocolo: 3344556677 - data e hora da solicitação: ${solicitacao} 12:53 - data e hora agendada: ${dm}`,
    `/${a} ${hora} (horário de Brasília) - unidade: (21022999) -`, "AGÊNCIA DA PREVIDÊNCIA SOCIAL CIDADE INVENTADA)"];
};
const comunicacaoIndeferimento = (nbFmt, mantido) => ["Página 1 de 1", "INSTITUTO NACIONAL DO SEGURO SOCIAL", "COMUNICAÇÃO DE DECISÃO",
  "NIT: 123.45678.90-1 CPF: 529.982.247-25", `Número do Benefício: ${nbFmt} Espécie: 31`, "Ao Sr. (a): AURELIA FICTA DE SOUZA",
  "Assunto: Requerimento de Pedido de Prorrogação.", "Decisão: INDEFERIDO.", "Motivo: Não constatação da incapacidade laborativa.",
  "Fundamentação Legal:", "A perícia médica não reconheceu a sua incapacidade para o trabalho ou atividade habitual e o seu benefício não foi",
  "prorrogado.", `O pagamento do benefício será mantido até ${mantido}.`,
  "Se não concordar com a decisão, é possível entrar com Recurso, em até 30 dias, após receber este comunicado. Para",
  "isso, acesse o Meu INSS ou ligue para a Central 135.", "Data: 9 de outubro de 2026."];

// ── Onda 3 · o resumo de documentos para cálculo de tempo de contribuição,
// no layout do sistema antigo do INSS (cabeçalho repetido por página, os
// totais no fim, o período especial não enquadrado)
const RESUMO_INSS_TEXTO = [
  "21.023.999 - APS CIDADE INVENTADA * RESUMO DE DOCUMENTOS PARA CALCULO DE TEMPO DE CONTRIBUICAO * 04/03/2020 * PAG. 1",
  "****************** ATE 10/09/2019 **********************",
  "NB..........: 194.803.283-7 ESPECIE..: 42 DER.........: 10/09/2019 DIB........: 10/09/2019",
  "SEGURADO....: AURELIA FICTA DE SOUZA DATA NASC...: 14/03/1962 DAT........:",
  "P E R I O D O S D O S D O C U M E N T O S",
  "ND NP DATA INI. DATA FIM TBC A TP RA FF SP/RD ANO MES DIA CARENCIA D TC 1a DIA EMPREGADOR",
  "01 0001 03/01/2000 30/06/2010 30 TS 2 1 10 05 28 FABRICA FICTICIA LTDA",
  "10 05 28 120",
  "04 0002 03/01/2000 30/06/2010 25 4 TS 2 1 10 05 28 FABRICA FICTICIA LTDA",
  "CODIGO ANEXO 2.0.1 00 00 00",
  "NAO ENQUADRADO Motivo 00 (*)",
  "TEMPO DE CONTRIBUICAO COMUM ( BASE CONSIDERADA 30 ANOS ) : 10 ANOS 05 MESES 28 DIAS",
  "TOTAL DE CARENCIA EM CONTRIBUICOES.......................................: 126",
  "TOTAL DE CARENCIA CONSIDERADA............................................: 120",
  "TEMPO A CUMPRIR : 19 ANOS 06 MESES 02 DIAS",
].join("\n");

// ── Onda 4 · a CAT e o PPP do eSocial, como o Meu INSS os gera: na CAT, o
// valor na linha de baixo do rótulo (o CNAE depois do CNPJ, a data e o tipo
// do acidente na mesma linha); no PPP, um bloco por fator de risco, com a
// intensidade na linha do fator e o período quebrado em duas linhas
const CAT_TEXTO = [
  "CAT - Comunicação de Acidente de Trabalho",
  "2025-123456-7/01",
  "I - DADOS DE IDENTIFICAÇÃO",
  "1 - Emitente: Empregador",
  "2 - Tipo de CAT: Inicial",
  "II - EMITENTE",
  "7 - Razão Social/Nome: TRANSPORTADORA ILUSORIA LTDA",
  "8 - Tipo: 9 - Número de inscrição:",
  "10 - CNAE:",
  "CNPJ 66.777.888/0001-11 49.302",
  "ACIDENTE OU DOENÇA",
  "19 - Data do Acidente: 20 - Hora do Acidente: 21 - Após quantas horas de trabalho? 22 - Tipo:",
  "12/03/2025 09:15 02:00 Típico",
  "31 - Parte do corpo atingida no acidente:",
  "753000000 - Mão (exceto punho ou dedos)",
  "47 - CID-10:",
  "S626 - Fratura de outros dedos",
  "1 / 2",
].join("\n");
const riscoPpp = (linha, ini, fim) => [linha, "12345", "15.9 - Atendimento aos requisitos das NR-06 e NR-01 do MTP", `${ini} a`, "pelos EPIs informados (*)", fim,
  "Medida de Condição de Prazo de", "SIM SIM SIM SIM"];
const PPP_TEXTO = [
  "Perfil Profissiográfico Previdenciário - PPP",
  "29/09/2026 05:28:14",
  "DADOS ADMINISTRATIVOS",
  "1 - CNPJ do Domicílio Tributário/CEI/CAEPF/CNO 2 - Nome Empresarial 3 - CNAE",
  "77.888.999 FUNDICAO IMAGINARIA LTDA 2451-2/00",
  "15 - EXPOSIÇÃO A FATORES DE RISCOS:",
  ...riscoPpp("F 02.01.001 - Ruído 88.0 decibel (A) NR-15 - NA SIM", "01/01/1995", "31/12/1998"),
  ...riscoPpp("F 02.01.001 - Ruído 92.4 decibel (A) NR-15 - NA SIM", "01/01/2004", "31/12/2006"),
  ...riscoPpp("Q 01.18.001 - Sílica livre NA NA NA SIM", "01/01/2004", "31/12/2006"),
  "16 - RESPONSÁVEL PELOS REGISTROS AMBIENTAIS:",
].join("\n");

module.exports = { CAGED_TEXTO, RAIS_TEXTO, itensDeLinhas, laudoPmf, LAUDO_SABI_TEXTO, cartaNova, CARTA_ANTIGA_TEXTO, extratoPag,
  processo, EXIGENCIA_AGENDAR, agendamento, comunicacaoIndeferimento, RESUMO_INSS_TEXTO, blocoRais, CAT_TEXTO, PPP_TEXTO };
