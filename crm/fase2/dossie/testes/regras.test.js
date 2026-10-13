// DOSSIÊ · nomes de pasta/arquivo, o PDF nos três formatos do INSS, a janela do extrato e o filtro de recursos
const test = require('node:test');
const assert = require('node:assert');
const R = require('../regras.js');

const PDF = Uint8Array.from('%PDF-1.5 corpo', c => c.charCodeAt(0));

test('comoPdf: bytes crus, base64 em JSON, base64 solto; JSON de erro vira null', () => {
  assert.deepEqual(R.comoPdf(PDF), PDF);
  const b64 = Buffer.from(PDF).toString('base64');
  const enc = s => new TextEncoder().encode(s);
  assert.deepEqual([...R.comoPdf(enc(JSON.stringify(b64)))], [...PDF]);   // consolidadorservices/pap
  assert.deepEqual([...R.comoPdf(enc(b64))], [...PDF]);
  assert.equal(R.comoPdf(enc('{"erro":"DEVE_RESOLVER_DESAFIO_CAPTCHA"}')), null);
  assert.equal(R.comoPdf(enc(JSON.stringify(Buffer.from('<html>').toString('base64')))), null);
  assert.equal(R.comoPdf(new Uint8Array()), null);
});

test('b64 ida e volta, inclusive acima do bloco de 32 KB', () => {
  const grande = new Uint8Array(100000).map((_, i) => i % 256);
  assert.deepEqual(Buffer.from(R.b64(grande), 'base64'), Buffer.from(grande));
});

test('nomes: pasta legível no Windows, caminho ASCII no Storage', () => {
  assert.equal(R.pastaCliente('João da Silva', '12345678901'), 'Dossie/João da Silva 12345678901');
  assert.equal(R.nomeSeguro('Carta: NB 123/456?'), 'Carta NB 123 456');
  assert.equal(R.slug('Cartas de concessão'), 'Cartas-de-concessao');
  assert.equal(R.slug('2025-07-02 123 Aposentadoria por Idade.pdf'), '2025-07-02-123-Aposentadoria-por-Idade.pdf');
});

test('jwt: lê sub e nome com acento; lixo vira null', () => {
  const p = Buffer.from(JSON.stringify({ sub: '12345678901', name: 'JOSÉ' })).toString('base64url');
  assert.deepEqual(R.jwt(`x.${p}.y`), { sub: '12345678901', name: 'JOSÉ' });
  assert.equal(R.jwt('não é jwt'), null);
});

test('extrato de pagamento: 12 competências terminando no mês corrente', () => {
  assert.deepEqual(R.janela12Meses(new Date(2026, 9, 7)), ['01-11-2025', '31-10-2026']);
  assert.deepEqual(R.janela12Meses(new Date(2026, 1, 10)), ['01-03-2025', '28-02-2026']);
});

test('recursos: NUP pelo formato; com o CPF na lista, só os do cliente', () => {
  const lista = [{ proc: '44233.123456/2024-11', cpf: '111.111.111-11' },
                 { proc: '44233.654321/2024-22', cpf: '222.222.222-22' }];
  assert.deepEqual(R.nupsDaLista(lista, '22222222222'), { nups: ['44233654321202422'], filtrouPorCpf: true });
  assert.equal(R.nupsDaLista(lista, '99999999999').nups.length, 2);
  assert.equal(R.nupsDaLista(lista, '99999999999').filtrouPorCpf, false);
});

test('mensagemDoPortal: a frase do INSS no lugar do PDF; nada quando não há', () => {
  const enc = s => new TextEncoder().encode(s);
  assert.equal(R.mensagemDoPortal(enc('{"mensagem":"Carta de concessão não encontrada"}')), 'Carta de concessão não encontrada');
  assert.equal(R.mensagemDoPortal(enc('{"result":"Benefício não possui laudo"}')), 'Benefício não possui laudo');
  assert.equal(R.mensagemDoPortal(enc('"JVBERi0="')), '');
  assert.equal(R.mensagemDoPortal(enc('%PDF-1.5')), '');
  assert.equal(R.mensagemDoPortal(enc('{"codigo":1}')), '');
});

test('comoPdf: base64 dentro de objeto e com prefixo data: (Emprega Brasil)', () => {
  const b64 = Buffer.from(PDF).toString('base64');
  const enc = s => new TextEncoder().encode(s);
  assert.deepEqual([...R.comoPdf(enc(JSON.stringify({ nome: 'ctps.pdf', arquivo: b64 })))], [...PDF]);
  assert.deepEqual([...R.comoPdf(enc(JSON.stringify('data:application/pdf;base64,' + b64)))], [...PDF]);
  assert.equal(R.comoPdf(enc('{"mensagem":"Não há registros"}')), null);
});

test('HC: exame de imagem/método entra, exame de sangue fica de fora', () => {
  for (const n of ['RADIOGRAFIA SIMPLES - TORAX', 'ULTRA-SONOGRAFIA - JOELHO DIREITO', 'TOMOGRAFIA COMPUTADORIZADA DE CRANIO',
                   'RESSONÂNCIA MAGNÉTICA COLUNA LOMBAR', 'ELETRONEUROMIOGRAFIA', 'DENSITOMETRIA ÓSSEA', 'ECOCARDIOGRAMA'])
    assert.ok(R.ehExameDeImagem(n), n);
  for (const n of ['GLICOSIMETRIA', 'HEMOGRAMA COMPLETO', 'CREATININA', 'TIPAGEM ABO/RH', 'SOROLOGIA PARA HEPATITES',
                   'TP (TEMPO DE PROTROMBINA)', 'COOMBS DIRETO (POLIESPECIFICO)'])
    assert.ok(!R.ehExameDeImagem(n), n);
});

// o CLAUDE.md é como o CRM (e as outras sessões) ficam sabendo o que esta
// extensão entrega: subir a versão sem atualizar a seção quebra aqui
test('CLAUDE.md descreve esta versão da extensão', () => {
  const fs = require('node:fs'), path = require('node:path');
  const versao = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.json'), 'utf8')).version;
  const md = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'CLAUDE.md'), 'utf8');
  assert.ok(md.includes(`dossie-versao: ${versao}`), `CLAUDE.md ainda fala da versão antiga — atualize a seção "Dossiê do cliente" para ${versao}`);
  assert.ok(md.includes(`(versão **${versao}**)`), 'o número visível da versão no CLAUDE.md não bate com o manifest');
});

test('seguro-desemprego: JSON do MTE vira texto legível com parcelas e datas', () => {
  // o cabeçalho é o que a lista do MTE devolve (medido em 11.10.2026); o detalhe traz as parcelas
  const t = R.textoSeguroDesemprego([{ numeroRequerimento: 123, modalidade: { codigo: 0, descricao: 'Trabalhador Formal' },
    dataRequerimento: '2024-03-10', tipoInscricao: { codigo: 1, descricao: 'CNPJ' }, inscricao: 12345678000199,
    razaoSocial: 'EMPRESA X', dataAdmissao: '2020-01-02', dataDispensa: '2024-02-28',
    detalhe: { situacao: { descricao: 'DEFERIDO' },
      vinculos: [{ nomeEmpresa: 'EMPRESA X', dataAdmissao: '2020-01-02', dataDemissao: '2024-02-28' }],
      parcelas: [{ numero: 1, dataProgramada: '2024-04-10', dataPagamento: '2024-04-12', valorPagamento: '1412.00', situacaoParcela: 'Paga', tipoParcela: 'NORMAL' },
                 { numero: 2, dataProgramada: '2024-05-10', dataPagamento: '2024-05-12', valorPagamento: '1412.00', situacaoParcela: 'Paga', tipoParcela: 'NORMAL' }] } }]);
  assert.match(t, /Requerimento 123 · modalidade Trabalhador Formal · situação DEFERIDO/);
  assert.match(t, /Data do requerimento: 10\/03\/2024/);
  assert.match(t, /Empregador: EMPRESA X \(CNPJ 12345678000199\) · admissão 02\/01\/2020 · dispensa 28\/02\/2024/);
  assert.match(t, /Vínculo: EMPRESA X · admissão 02\/01\/2020 · demissão 28\/02\/2024/);
  assert.match(t, /Parcela 1: programada 10\/04\/2024 · paga em 12\/04\/2024 · R\$ 1412.00 · Paga/);
  assert.match(t, /Última parcela paga em 12\/05\/2024/);
  assert.match(t, /dados brutos/);
});

test('cadastro do CNIS: campos com o nome das colunas do CRM', () => {
  const { cadastro: c, texto } = R.cadastroDoCnis({ filiadoTO: { nit: 12345678901, nitFormatado: '123.45678.90-1', nome: 'MARIA APARECIDA DA SILVA',
    nomeMae: 'ANA DA SILVA', sexo: 'FEMININO', dataNascimento: '1960-01-01', dataUltimaAtualizacao: '2020-12-29', cpf: 1234567890,
    listaIdentidadeTO: [{ numero: '123456789', uf: 'SP', orgaoEmissorIdentidade: 'SSP' }],
    listaCtpsTO: [{ numero: '23652', serie: '334', uf: 'SP' }], numeroTitulo: '000000000000',
    enderecoPrincipalTO: { logradouro: 'Rua das Flores 10', bairro: 'Centro', cep: 14000000, municipio: 'Monte Alto', siglaUf: 'SP' },
    municipioOrigem: 'Monte Alto', ufOrigem: 'SP', nacionalidade: 'Brasileira', grauInstrucao: 'Ensino fundamental' } });
  assert.equal(c.cpf, '01234567890');                       // o CNIS devolve número: volta o zero à esquerda
  assert.equal(c.dn, '1960-01-01'); assert.equal(c.sexo, 'F'); assert.equal(c.pis_nit, '123.45678.90-1');
  assert.equal(c.rg, '123456789'); assert.equal(c.rg_orgao, 'SSP/SP');
  assert.deepEqual(c.ctps, ['23652 334 SP']); assert.equal(c.cep, '14000000'); assert.equal(c.cidade, 'Monte Alto');
  assert.match(texto, /Nascimento: 01\/01\/1960/); assert.match(texto, /RG: 123456789 SSP\/SP/);
});

test('CadÚnico: família com renda per capita e integrantes, legível e no resumo', () => {
  const { familia, texto } = R.textoCadunico(
    { numeroFamiliar: 1234567890, nome: 'MARIA APARECIDA DA SILVA', tipoPerfil: { codigo: 1, nome: 'Responsável Familiar' },
      municipio: 'Monte Alto', uf: 'SP', dataCadastroFamilia: '2019-03-01', dataAtualizacaoFamilia: '2025-06-15',
      tipoEstadoCadastralFamilia: { codigo: 3, nome: 'Cadastrado' }, tipoCondicaoCadastroFamiliar: { codigo: 1, nome: 'Atualizado' },
      rendaFamiliarTotal: 1412, rendaFamiliarPorPessoa: 706, faixaRendaFamiliarTotal: 'Até 1 SM', faixaRendaFamiliarPorPessoa: 'Até 1/2 SM',
      quantidadeIntegrantes: 2, qtPessoasCalculoRenda: 2, familiaEmSituacaoDeRua: { codigo: 0, nome: 'Não' }, quantidadePendencias: 0 },
    { integranteFamiliaDTOs: [
      { identificador: 0, isResponsavelFamiliar: true, tipoRelacaoParentescoRF: { nome: 'Pessoa Responsável pela Unidade Familiar' },
        pessoaDadosCadastroDTO: { nomePessoa: 'MARIA APARECIDA DA SILVA', dataNascimentoPessoa: '1960-01-01', numeroCpfPessoa: 1234567890, numeroNisPisPasepPessoa: 12345678901, tipoEstadoCadastralMembro: { nome: 'Cadastrado' } } },
      { isResponsavelFamiliar: false, tipoRelacaoParentescoRF: { nome: 'Cônjuge ou companheiro(a)' },
        pessoaDadosCadastroDTO: { nomePessoa: 'JOSÉ DA SILVA', dataNascimentoPessoa: '1950-01-02', numeroCpfPessoa: 98765432100 } } ] }, [],
    { extrato: [{ tipoExtrato: { nome: 'BPC' }, nomeEspecie: 'BPC para Idoso', nomeBeneficiario: 'MARIA APARECIDA DA SILVA', numeroCompetencia: 202609, valorBeneficio: 1621 },
                { tipoExtrato: { nome: 'BPC' }, nomeEspecie: 'BPC para Idoso', nomeBeneficiario: 'MARIA APARECIDA DA SILVA', numeroCompetencia: 202504, valorBeneficio: 1518 }],
      tipos: { tarifaSocialEnergiaEletrica: { numeroCompetencia: 202609, valorDesconto: 42.94 } }, consignacoes: [],
      pendencias: { pendenciasOcorrenciasFamilia: [], pendenciasOcorrenciasPessoas: [] }, info: { familiaDespesaDTO: { valorDespesasEnergia: 120, valorDespesasAluguel: 0 } },
      rendas: { '0': { renda: { possuiAlgumaRemuneracao: true, competenciaReferencia: '2026-08',
        rendasBeneficios: { total: 1621, beneficios: [{ nb: 1234567890, especie: { descricao: 'AMPARO SOCIAL AO IDOSO' }, valor: 1621, dataInicioPagamento: '2025-02-28' }] } },
        trabalho: { remuneracaoTrabalhoMesAnteriorEntrevista: 0, valorAposentadoriaPensaoBpcLoas: 1621 } } } });
  assert.equal(familia.numero_familiar, '1234567890'); assert.equal(familia.renda_por_pessoa, 706); assert.equal(familia.integrantes, 2);
  assert.equal(familia.membros[0].cpf, '01234567890');       // CPF numérico volta com o zero
  assert.match(texto, /Renda por pessoa: R\$ 706,00 \(Até 1\/2 SM\) · 2 integrante\(s\), 2 no cálculo da renda/);
  assert.match(texto, /★ MARIA APARECIDA DA SILVA · Pessoa Responsável pela Unidade Familiar · nasc. 01\/01\/1960/);
  assert.equal(familia.beneficios_pagos[0].primeira_competencia, '202504'); assert.equal(familia.beneficios_pagos[0].meses, 2);
  assert.match(texto, /BPC · BPC para Idoso · MARIA APARECIDA DA SILVA · 04\/2025 a 09\/2026 \(2 mês\/meses\) · último R\$ 1.621,00/);
  assert.match(texto, /Tarifa Social de Energia Elétrica: desconto R\$ 42,94/);
  assert.match(texto, /Benefício INSS NB 1234567890 · AMPARO SOCIAL AO IDOSO · R\$ 1.621,00 · início 28\/02\/2025/);
  assert.match(texto, /DESPESAS DECLARADAS: energia R\$ 120,00/);
});

test('Portal da Transparência: pagamentos por integrante, agrupados por programa', () => {
  const { pessoas, texto } = R.textoTransparencia([{ nome: 'MARIA APARECIDA DA SILVA', cpf: '01234567890', nis: '12345678901' }, { nome: 'JOSÉ DA SILVA', cpf: '98765432100' }],
    { '01234567890': { programas: { bpc: [
        { dataMesCompetencia: '202609', valor: 1621, concedidoJudicialmente: 'Sim', beneficiario: { nomeRepresentanteLegal: 'ANA' }, municipio: { nomeIBGE: 'MONTE ALTO', uf: { sigla: 'SP' } } },
        { dataMesCompetencia: '202504', valor: 1518, concedidoJudicialmente: 'Sim', municipio: { nomeIBGE: 'MONTE ALTO', uf: { sigla: 'SP' } } }],
      novo_bolsa_familia: [{ dataMesReferencia: '202401', valorSaque: 600 }],
      auxilio_emergencial: [{ mesDisponibilizacao: '05/2020', valor: 600 }, { mesDisponibilizacao: '12/2020', valor: 300 }] } },
      '98765432100': { programas: {} } });
  assert.equal(pessoas[0].programas.length, 3);
  assert.match(texto, /Auxílio Emergencial: 05\/2020 a 12\/2020 · 2 pagamento\(s\)/);
  const bpc = pessoas[0].programas.find(p => p.programa === 'bpc');
  assert.equal(bpc.meses, 2); assert.equal(bpc.total, 3139); assert.equal(bpc.concedido_judicialmente, true); assert.equal(bpc.representante_legal, 'ANA');
  assert.match(texto, /BPC: 04\/2025 a 09\/2026 · 2 pagamento\(s\) · último R\$ 1.621,00 · total R\$ 3.139,00 · CONCEDIDO JUDICIALMENTE · representante legal: ANA · MONTE ALTO\/SP/);
  assert.match(texto, /JOSÉ DA SILVA[^\n]*\n  nenhum pagamento encontrado/);
});
