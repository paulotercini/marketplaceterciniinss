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

module.exports = { CAGED_TEXTO, RAIS_TEXTO, itensDeLinhas };
