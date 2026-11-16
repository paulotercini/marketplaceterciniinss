// qual contrato a espécie pede — a escolha do Paulo, por palavra da espécie
function variantePorEspecie(especie){
  // F235 · o código do serviço (IIR, CTC…) vale pelo nome do catálogo: a isenção de IR é serviço, e não aposentadoria
  const b=dsa((ESPECIES.find(e=>e[0]===especie)||[])[1] || especie || "");
  // F235 · a certidão (CTC) e a regularização de contribuições (GPS) chegam pelo código do pré-caso: também são serviço
  if(/^(ctc|gps)$/.test(b.trim())) return "servico";
  if(!b) return "padrao";
  if(/revis|recalcul/.test(b)) return "revisao";
  // F235 · o serviço não tem "3 primeiros benefícios": certidão, cópia, justificação, isenção de IR, regularização, seguro-defeso
  if(/^sd$/.test(b)) return "servico";   // F235 · o seguro-defeso pelo código do pré-caso: o contrato padrão cobraria 3 das 4 parcelas
  // F235 · o pré-caso guarda o código (COPIA, JA, CNIS): ele também é serviço, e o acerto de CNIS não tem "3 primeiros benefícios"
  if(/certidao de tempo|copia de processo|copia do processo|justificacao administrativa|isencao de imposto|regularizacao de contribuicoes|seguro.?defeso|acerto de cnis/.test(b) || /^(copia|ja|ctc|iir|gps|sd|cnis)$/.test(b.trim())) return "servico";
  if(/acidente/.test(b) && !/auxilio doenca|incapacidade/.test(b)) return "acidente";
  // F235 · o restabelecimento é do benefício por incapacidade cortado: o contrato é o dele
  if(/incapacidade|auxilio doenca|invalidez|lo?as|bpc|deficien|restabelecimento/.test(b)) return "incapacidade";
  return "padrao";
}
function textoContrato(chave, ajuste){
  const v=CONTRATO_VARIANTES[chave]||CONTRATO_VARIANTES.padrao;
  const pars=[PAR_BRUTO];
  if(v.novoBen) pars.push(PAR_NOVO_BEN);
  pars.push(`PARÁGRAFO ${v.novoBen?"TERCEIRO":"SEGUNDO"}: Os valores de honorários mencionados nesta cláusula referem-se ao valor bruto do benefício ou dos atrasados, salvo disposição expressa em contrário.`);
  // F30 · o combinado do atendimento entra no contrato como a disposição
  // expressa em contrário que a própria cláusula já prevê
  if(ajuste) pars.push(`PARÁGRAFO ${v.novoBen?"QUARTO":"TERCEIRO"} — DISPOSIÇÃO EXPRESSA EM CONTRÁRIO: Fica ajustado entre as partes, prevalecendo sobre o padrão desta cláusula no que com ele conflitar: ${ajuste}`);
  // F181 · a cláusula de honorários é um marcador: preencherModeloDoc põe o
  // padrão da variante (texto idêntico ao de antes) ou o combinado da mesa
  return `${CONTRATO_PARTES}
<HONORARIOS>

${pars.join("\n\n")}

${CONTRATO_FIM}`;
}
// o ajuste de honorários combinado no atendimento, guardado por variante de
// contrato no cadastro do cliente — sobrevive ao pré-caso virar caso
function honorAjusteDe(c, especie){
  const aj=((c&&c.campos)||{}).honor_ajuste||{};
  return aj[variantePorEspecie(especie)]||"";
}
// os padrões do escritório, resumidos DO PRÓPRIO texto das variantes acima
const HONOR_RESUMO = {
  padrao:"3 primeiros benefícios (integrais e atualizados) + 30% dos atrasados (RPV/precatório)",
  acidente:"3 primeiros benefícios + 30% dos atrasados (RPV/precatório)",
  incapacidade:"deferido no INSS: 20% sobre os 6 primeiros benefícios · em recurso ou judicial: 30% sobre os 6 primeiros + 30% dos atrasados",
  revisao:"3 primeiras diferenças da revisão + 30% dos atrasados (RPV/precatório)",
};

// F181 · O COMBINADO EM CAMPOS. A mesa guarda, além do texto livre, os
// honorários em campos (primeiros benefícios, percentual dos atrasados,
// valor fixo, entrada, parcelas e datas) no pré-caso (pc.hon) e, por
// variante, em clientes.campos.honor_estrut — sobrevive ao caso, como o
// honor_ajuste. Dele saem a cláusula do contrato (<HONORARIOS>), o quadro
// Contratado e os lançamentos das parcelas.
function honorEstrutDe(c, especie){
  const h=((((c&&c.campos)||{}).honor_estrut)||{})[variantePorEspecie(especie)];
  return h && Object.keys(h).length ? h : null;
}
const EXT_U=["zero","um","dois","três","quatro","cinco","seis","sete","oito","nove","dez","onze","doze",
  "treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove"];
const EXT_D=["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
const EXT_C=["","cento","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];
function porExtenso(n){
  n=+n; if(!Number.isInteger(n) || n<0 || n>999) return "";
  if(n===100) return "cem";
  if(n<20) return EXT_U[n];
  if(n<100) return EXT_D[Math.floor(n/10)]+(n%10?" e "+EXT_U[n%10]:"");
  return EXT_C[Math.floor(n/100)]+(n%100?" e "+porExtenso(n%100):"");
}
const comExtenso = n => { const e=porExtenso(n); return e ? `${n} (${e})` : String(n); };
const pctExtenso = n => { const e=porExtenso(n); return `${String(n).replace(".",",")}%${e?` (${e} por cento)`:""}`; };
// o mesmo dia N meses depois, sem o pulo do 31 (31.01 + 1 mês = fim de fevereiro)
function mesDepois(iso, m){
  const [a,ms,d]=iso.split("-").map(Number);
  const fim=new Date(Date.UTC(a, ms-1+m+1, 0));
  return new Date(Date.UTC(fim.getUTCFullYear(), fim.getUTCMonth(), Math.min(d, fim.getUTCDate()))).toISOString().slice(0,10);
}
// as parcelas do valor fixo: a entrada (se houver) e as N mensais; a última
// leva o centavo que sobra da divisão
function parcelasHon(h){
  if(!h || !(+h.valor>0)) return [];
  const out=[], ent=Math.min(+h.entrada||0, +h.valor);
  if(ent>0) out.push({k:"e", desc:"Honorários · entrada", valor:ent, venc:h.entrada_em||h.primeira_em||""});
  const saldo=Math.round((+h.valor-ent)*100)/100;
  if(saldo>0){
    const q=Math.max(1, Math.floor(+h.parcelas||1)), y=Math.floor(Math.round(saldo/q*1e4)/100)/100;
    for(let i=0;i<q;i++) out.push({k:String(i+1),
      desc: q>1 ? `Honorários · parcela ${i+1}/${q}` : (ent>0 ? "Honorários · saldo" : "Honorários · valor fixo"),
      valor: i===q-1 ? Math.round((saldo-y*(q-1))*100)/100 : y,
      venc: h.primeira_em ? mesDepois(h.primeira_em, i) : ""});
  }
  return out;
}
const moedaTxt = v => moeda(v).replace(/\s/g," ");
// a linha curta (quadro Contratado, mesa recolhida)
function resumoHon(h){
  if(!h) return "";
  const p=[], n=+h.nben;
  if(n) p.push(`${n} primeiro${n>1?"s":""} benefício${n>1?"s":""}`);
  if(+h.pct) p.push(`${String(h.pct).replace(".",",")}% dos atrasados`);
  if(+h.valor>0){
    const ms=parcelasHon(h).filter(x=>x.k!=="e");
    p.push(`${moedaTxt(+h.valor)}${+h.entrada>0?` (entrada de ${moedaTxt(+h.entrada)})`:""}`
      + (ms.length>1 ? ` em ${ms.length} parcelas de ${moedaTxt(ms[0].valor)}` : ""));
  }
  return p.join(" + ");
}
// a cláusula do contrato: o padrão da variante, idêntico ao de antes, ou o
// combinado da mesa em português de contrato
function clausulaHonorarios(c, especie){
  const v=CONTRATO_VARIANTES[variantePorEspecie(especie)]||CONTRATO_VARIANTES.padrao;
  const h=honorEstrutDe(c, especie);
  if(!h) return v.honor;
  const itens=[], dt=iso=>iso?fmtBarra(iso):"data a combinar";
  if(+h.nben) itens.push(`Os ${comExtenso(+h.nben)} primeiros benefícios, na forma integral e com valor atualizado, após a implantação do benefício, com vencimento na data do recebimento de cada benefício`);
  if(+h.pct) itens.push(`${pctExtenso(+h.pct)} sobre o valor bruto dos atrasados que serão recebidos por meio de Requisição de Pequeno Valor (RPV) ou Precatório, com vencimento na data do recebimento da RPV ou do Precatório`);
  if(+h.valor>0){
    const ps=parcelasHon(h), ent=ps.find(x=>x.k==="e"), ms=ps.filter(x=>x.k!=="e");
    const soma=ms.reduce((t,x)=>t+x.valor,0);
    const mensais = ms.length>1
      ? `em ${comExtenso(ms.length)} parcelas mensais de ${moedaTxt(ms[0].valor)}${ms[ms.length-1].valor!==ms[0].valor?`, sendo a última de ${moedaTxt(ms[ms.length-1].valor)}`:""}, vencendo a primeira em ${dt(ms[0].venc)}`
      : ms.length ? `com vencimento em ${dt(ms[0].venc)}` : "";
    let t=`O valor fixo de ${moedaTxt(+h.valor)}`;
    if(ent) t += `, sendo ${moedaTxt(ent.valor)} de entrada, com vencimento em ${dt(ent.venc)}`
      + (ms.length ? `, e o saldo de ${moedaTxt(soma)} ${mensais}` : "");
    else t += ms.length>1 ? ` ${mensais}` : `, ${mensais}`;
    itens.push(t);
  }
  return itens.map((t,i)=>t+(i===itens.length-1?".":i===itens.length-2?"; e,":";")).join("\n\n");
}

const DOCS_ESCRITORIO = {
  proc_judicial: {rot:"Procuração Judicial", titulo:"PROCURAÇÃO “AD JUDICIA ET EXTRA”", texto:
`OUTORGANTE: ${QUALIF};

OUTORGADOS: PAULO ROBERTO TERCINI FILHO, inscrito na OAB/SP sob nº 331.110; MARCOS HENRIQUE DE PÁDUA AMORIM, inscrito na OAB/SP sob nº 464.306; AMANDA CRISTIANE CARNEIRO GARCEZ, inscrita na OAB/SP sob o nº. 511.528, todos com escritório profissional na Rua Rui Barbosa, nº 663, Centro, na cidade de Monte Alto, Estado de São Paulo;

PODERES: Para o foro em geral, com cláusula “ad judicia et extra”, podendo representar a outorgante em qualquer Juízo, Instância ou Tribunal, podendo propor contra quem de direito as ações competentes e defendê-la nas contrárias, usando os recursos legais e praticando os atos judiciais necessários, e, especialmente, para propor AÇÃO PREVIDENCIÁRIA, com poderes para transigir, transferir, renunciar, dar e receber quitação, assinar termos, firmar compromissos, substabelecer, enfim, praticar em conjunto ou isoladamente todos os demais atos que lhe convier e entender necessários para o cabal e fiel cumprimento do presente mandato.

<DATAEXTENSO>

______________________________________
<NOMESEGURADO>`},

  proc_adm: {rot:"Procuração Administrativa", titulo:"PROCURAÇÃO", texto:
`Pelo presente instrumento particular de procuração, ${QUALIF}, nomeia e constitui seu bastante procurador o Dr. Paulo Roberto Tercini Filho, brasileiro, solteiro, advogado, inscrito no CPF nº. 224.627.048-09, inscrito na OAB/SP sob o nº. 331.110 e portador do NIT nº. 11966884529; Dr. Marcos Henrique de Pádua Amorim, brasileiro, solteiro, advogado, inscrito no CPF nº. 105.950.296-80, inscrito na OAB/SP sob o nº. 464.306 e portador do NIT nº. 20061810473; e Dra. Amanda Cristiane Carneiro Garcez, brasileira, solteira, advogada, inscrita no CPF nº. 381.533.048-36, inscrita na OAB/SP sob o nº. 511.528 e portador do NIT nº. 2725914270-2, todos com escritório profissional na cidade de Monte Alto, Estado de São Paulo, na Rua Rui Barbosa, n. 663, Centro, fone: (16) 3242-2908, CEP 15.910-000, com poderes em qualquer Foro, Juízo, Tribunal ou ente da administração pública, onde com esta se apresentar, defender os interesses do outorgante, podendo peticionar, acompanhar e requerer benefícios/serviços, revisão e interpor recursos perante o INSS – Instituto Nacional do Seguro Social, usando os recursos legais e acompanhando-os, conferindo-lhe ainda, os poderes especiais para renunciar, receber, dar quitação, fazer acordos, desistir, transigir, solicitar e receber documentos, inclusive laudos médicos e laudos sociais, nos termos do inc. II, §1º do art. 31, da Lei nº 12.527/2011, além de possibilitar o requerimento de senha do GOV.BR/MEUINSS, bem como praticar os demais atos para o perfeito desempenho deste mandato, o que dará por bom, firme e valioso, podendo os outorgados substabelecer no todo ou em parte, com ou sem reserva de iguais poderes.

<DATAEXTENSO>

________________________________
<NOMESEGURADO>`},

  pobreza: {rot:"Declaração de Pobreza", titulo:"DECLARAÇÃO DE POBREZA", texto:
`Eu, ${QUALIF}, DECLARO que sou pobre, e que não posso arcar com as custas processuais e despesas judiciais, sem que haja prejuízo para o meu próprio sustento.

Assim sendo, requeiro os benefícios da Justiça Gratuita, de acordo com os dispositivos contidos na Lei Federal nº 1060/50.

<DATAEXTENSO>

______________________________________
<NOMESEGURADO>`},

  beneficiario: {rot:"Declaração de Não Recebimento de Benefício", titulo:"DECLARAÇÃO DE RECEBIMENTO DE PENSÃO OU APOSENTADORIA EM OUTRO REGIME DE PREVIDÊNCIA", texto:
`ANEXO XXIV — INSTRUÇÃO NORMATIVA PRES/INSS Nº 128, DE 28 DE MARÇO DE 2022

Eu, <NOMESEGURADO>, portador(a) do CPF nº <CPF>, declaro, sob as penas do art. 299 do Código Penal, que:

( X ) não recebo aposentadoria/pensão de outro regime e previdência.
(   ) recebo aposentadoria/pensão de outro regime de previdência.

Caso receba aposentadoria ou pensão de outro regime de previdência, deverá declarar:
Tipo do benefício: (   ) Pensão*   (   ) Aposentadoria
*Caso opção seja Pensão, informar se a relação com o instituidor era como cônjuge ou companheiro(a) - S/N (   )
- Ente de origem: (   ) Estadual   (   ) Municipal   (   ) Federal
- Tipo de servidor: (   ) Civil   (   ) Militar
Data de início do benefício no outro regime: _______/_______/_______
Nome do órgão da pensão/aposentadoria: ______________________________________
Última remuneração bruta*: R$___________________   Mês/ano: ______/_______
*última remuneração bruta sem considerar valores de 13º salário (abono anual).

Na Emenda Constitucional nº 103, de 12 de novembro de 2019, art. 24, § 1º, a acumulação de pensão por morte com outro benefício, sujeita à redução do valor daquele menos vantajoso, é admitida nas seguintes situações:
I - pensão por morte deixada por cônjuge ou companheiro (a) do RGPS com pensão por morte concedida por outro regime de previdência social, inclusive as decorrentes das atividades militares, exceto regime de previdência complementar; e
II - pensão por morte deixada por cônjuge ou companheiro (a) de qualquer regime de previdência social, inclusive as decorrentes das atividades militares, com aposentadoria concedida por qualquer regime de previdência social ou com proventos de inatividade decorrentes das atividades militares, exceto regime de previdência complementar.

A declaração falsa ou diversa de fato ou situação real ocorrida, além de obrigar à devolução de eventuais importâncias recebidas indevidamente, quando for o caso, sujeitar-me-á às penalidades previstas nos arts. 171 e 299 do Código Penal.

<DATAEXTENSO>

_____________________________________________________
Assinatura e identificação do (a) requerente ou representante legal`},

  termo: {rot:"Termo de Representação", titulo:"TERMO DE REPRESENTAÇÃO E AUTORIZAÇÃO DE ACESSO A INFORMAÇÕES PREVIDENCIÁRIAS", texto:
`Eu, <NOMESEGURADO>, inscrito (a) no CPF nº <CPF>, residente e domiciliado (a) na <ENDERECO>, <BAIRRO>, na cidade de <CIDADE>, Estado de <ESTADO>, CEP <CEP>, representado pelos advogados DR. PAULO ROBERTO TERCINI FILHO, CPF nº 224.627.048-09, inscrito na OAB/SP Nº 331.110, NIT nº 11966884529 e DR. MARCOS HENRIQUE DE PÁDUA AMORIM, brasileiro, solteiro, advogado, inscrito no CPF nº. 105.950.296-80, inscrito na OAB/SP sob o nº. 464.306 e portador do NIT nº. 20061810473; DRA. AMANDA CRISTIANE CARNEIRO GARCEZ, brasileira, solteira, advogada, inscrita no CPF nº. 381.533.048-36, inscrita na OAB/SP sob o nº. 511.528 e portador do NIT nº. 2725914270-2, CONFIRO PODERES ESPECÍFICOS para me representar perante o INSS na solicitação do serviço ou benefício abaixo indicado e AUTORIZO o (a) referido (a) profissional a ter acesso apenas às informações pessoais necessárias a subsidiar o requerimento eletrônico do serviço ou benefício abaixo elencado:

( X ) Atualização Cadastral
( X ) Atualização de Vínculos e Remunerações
( X ) <ESPECIE>

Podendo, para tanto, praticar os atos necessários ao cumprimento deste mandato, em especial, prestar informações, acompanhar requerimentos, cumprir exigências, ter vistas e tomar ciência de decisões sobre processos de requerimento de benefícios operacionalizados pelo Instituto.

<DATAEXTENSO>

________________________
Assinatura do (a) Representado (a)

TERMO DE RESPONSABILIDADE

Por este Termo de Responsabilidade, comprometo-me a comunicar ao INSS qualquer evento que possa anular esta Procuração, no prazo de trinta dias, a contar da data que o mesmo ocorra, principalmente o óbito do segurado / pensionista, mediante apresentação da respectiva certidão.
Estou ciente de que o descumprimento do compromisso ora assumido, além de obrigar a devolução de importâncias recebidas indevidamente, quando for o caso, sujeitar-me-á às penalidades previstas nos arts. 171 e 299, ambos do Código Penal.

<DATAEXTENSO>

__________________________
Assinatura do (a) Procurador (a)

CÓDIGO PENAL
Art. 171. Obter, para si ou para outrem, vantagem ilícita, em prejuízo alheio, induzindo ou manter alguém em erro, mediante artifício, ardil ou qualquer outro meio fraudulento.
Art. 299. Omitir, em documento público ou particular, declaração que devia constar, ou nele inserir ou fazer inserir declaração falsa ou diversa da que devia ser escrita, com o fim de prejudicar direito, criar, obrigação ou alterar a verdade sobre fato juridicamente relevante.`},

  contrato: {rot:"Contrato de Honorários", titulo:"CONTRATO PARTICULAR DE HONORÁRIOS ADVOCATÍCIOS", porEspecie:true, texto:""},

  // o par separado do B31: procuração administrativa própria + contrato só
  // do procedimento administrativo (pedido do Paulo — sai fora do "gerar
  // todos", é a folha que o cliente do auxílio por incapacidade assina)
  b31_proc: {rot:"Procuração Adm. — Incapacidade Temporária (B31)", titulo:"PROCURAÇÃO ADMINISTRATIVA", texto:
`Pelo presente instrumento particular de procuração, <NOMESEGURADO>, brasileiro(a), nascido(a) em <DATANASCIMENTO>, <ESTADOCIVIL>, <PROFISSAO>, inscrito(a) no CPF nº <CPF>, residente e domiciliado(a) <ENDERECO>, <BAIRRO>, na cidade de <CIDADE>, Estado de <ESTADO>, CEP <CEP>, nomeia e constitui seus bastantes procuradores os Drs. PAULO ROBERTO TERCINI FILHO, brasileiro, solteiro, advogado, CPF nº 224.627.048-09, OAB/SP nº 331.110, NIT nº 11966884529; MARCOS HENRIQUE DE PÁDUA AMORIM, brasileiro, solteiro, advogado, CPF nº 105.950.296-80, OAB/SP nº 464.306, NIT nº 20061810473; e AMANDA CRISTIANE CARNEIRO GARCEZ, brasileira, solteira, advogada, CPF nº 381.533.048-36, OAB/SP nº 511.528, NIT nº 2725914270-2, todos com escritório profissional na Rua Rui Barbosa, 663, Centro, Monte Alto/SP, CEP 15.910-000, telefone (16) 3242-2908, conferindo-lhes poderes especiais para representá-lo(a) perante o INSS — Instituto Nacional do Seguro Social, em qualquer agência ou unidade administrativa, podendo requerer benefícios por incapacidade, em especial AUXÍLIO POR INCAPACIDADE TEMPORÁRIA (B31), protocolar pedidos, cumprir exigências, peticionar, juntar e retirar documentos, prestar informações, acompanhar requerimentos, ter vistas e tomar ciência de decisões, interpor recursos administrativos, requerer prorrogação, reconsideração e revisão, receber laudos médicos e sociais, nos termos do inciso II, §1º do art. 31 da Lei nº 12.527/2011, requerer e utilizar a senha do GOV.BR e do MEU INSS, podendo praticar todos os demais atos necessários ao perfeito desempenho deste mandato, com cláusula ad judicia et extra e poderes para transigir, desistir, renunciar, dar quitação, fazer acordos e substabelecer, com ou sem reserva de iguais poderes.

Ademais, DECLARO, sob as penas dos arts. 171 e 299 do Código Penal, que NÃO recebo aposentadoria, pensão por morte ou qualquer outro benefício de caráter previdenciário em regime próprio de previdência social, federal, estadual, municipal, civil ou militar, e que esta declaração é a expressão da verdade.

<DATAEXTENSO>

_____________________________________________
<NOMESEGURADO>

TERMO DE RESPONSABILIDADE

Pelo presente Termo, comprometo-me a comunicar ao INSS qualquer evento que possa anular a presente procuração, no prazo de 30 (trinta) dias a contar da ocorrência, em especial o óbito do(a) outorgante, mediante apresentação da respectiva certidão. Estou ciente de que o descumprimento, além de obrigar à devolução de importâncias recebidas indevidamente, sujeitará o(a) procurador(a) às penalidades dos arts. 171 e 299 do Código Penal.

<DATAEXTENSO>

_____________________________________________
PAULO ROBERTO TERCINI FILHO
MARCOS HENRIQUE DE PÁDUA AMORIM
AMANDA CRISTIANE CARNEIRO GARCEZ
Advogados Contratados`},

  b31_contrato: {rot:"Contrato — Incapacidade Temporária (B31)", titulo:"CONTRATO DE HONORÁRIOS ADVOCATÍCIOS", texto:
`(Procedimento administrativo de benefício por incapacidade — B31)

CONTRATANTE: <NOMESEGURADO>, brasileiro(a), nascido(a) em <DATANASCIMENTO>, <ESTADOCIVIL>, <PROFISSAO>, inscrito(a) no CPF nº <CPF>, residente e domiciliado(a) <ENDERECO>, <BAIRRO>, na cidade de <CIDADE>, Estado de <ESTADO>, CEP <CEP>.

CONTRATADOS: PAULO ROBERTO TERCINI FILHO, OAB/SP nº 331.110, CPF nº 224.627.048-09; MARCOS HENRIQUE DE PÁDUA AMORIM, OAB/SP nº 464.306, CPF nº 105.950.296-80; e AMANDA CRISTIANE CARNEIRO GARCEZ, OAB/SP nº 511.528, CPF nº 381.533.048-36, todos com escritório profissional na Rua Rui Barbosa, 663, Centro, Monte Alto/SP, CEP 15.910-000, telefone (16) 3242-2908, celular (16) 98140-9271.

CLÁUSULA PRIMEIRA — OBJETO. Os Contratados são contratados pelo Contratante para patrocinar, exclusivamente na esfera administrativa, perante o INSS, o requerimento de AUXÍLIO POR INCAPACIDADE TEMPORÁRIA (B31), incluindo protocolo do pedido, juntada de documentos e laudos, perícia médica, cumprimento de exigências e pedido de prorrogação.
PARÁGRAFO PRIMEIRO. A presente contratação não abrange recurso administrativo nem ação judicial, hipóteses em que será celebrado novo contrato de honorários.
PARÁGRAFO SEGUNDO. A contratação tem por objeto um único requerimento de AUXÍLIO POR INCAPACIDADE TEMPORÁRIA (B31). Qualquer novo requerimento administrativo do mesmo ou de outro benefício, inclusive em razão de cessação, indeferimento, novo afastamento, agravamento, novo CID, prorrogação após cessação ou pedido de restabelecimento que demande novo protocolo, caracteriza serviço autônomo e exigirá a celebração de novo contrato de honorários.

CLÁUSULA SEGUNDA — HONORÁRIOS. Pela prestação dos serviços, o Contratante pagará aos Contratados, após a implantação do benefício, o equivalente a:
a) 20% (vinte por cento) sobre o valor bruto dos atrasados pagos pelo INSS em razão da concessão do benefício, com vencimento na data do efetivo recebimento; e,
b) 20% (vinte por cento) sobre cada uma das 6 (seis) primeiras mensalidades do benefício, com vencimento na data do recebimento de cada uma. Caso o benefício seja pago por período inferior a 6 (seis) meses, os honorários incidirão sobre cada mensalidade efetivamente recebida pelo Contratante, na mesma proporção de 20% (vinte por cento).
PARÁGRAFO ÚNICO. Por valor bruto entende-se aquele apurado antes de qualquer desconto de imposto de renda ou contribuição previdenciária.

CLÁUSULA TERCEIRA — DESPESAS. Despesas necessárias ao andamento do procedimento (cópias, autenticações, deslocamentos, certidões, assistente técnico) serão reembolsadas pelo Contratante mediante apresentação de demonstrativo consolidado e respectivos comprovantes.

CLÁUSULA QUARTA — INADIMPLEMENTO. O atraso no pagamento implica multa de 10% (dez por cento), atualização pelo INPC e juros de mora de 1% (um por cento) ao mês, sem prejuízo de notificação extrajudicial e execução do presente contrato como título executivo.

CLÁUSULA QUINTA — ACESSO AO MEU INSS. O Contratante autoriza os Contratados a utilizarem sua senha GOV.BR para acesso ao MEU INSS, exclusivamente para o cumprimento deste mandato.

CLÁUSULA SEXTA — CANAIS OFICIAIS. São canais oficiais de comunicação do escritório o telefone (16) 3242-2908, o celular (16) 98140-9271 e o endereço Rua Rui Barbosa, 663, Centro, Monte Alto/SP. O Contratante compromete-se a não atender ligações ou mensagens de outros números atribuídos aos Contratados.

CLÁUSULA SÉTIMA — FORO. Fica eleito o Foro da Comarca de Monte Alto/SP para dirimir quaisquer questões oriundas deste contrato. E, por estarem assim contratados, assinam o presente em 2 (duas) vias de igual teor.

<DATAEXTENSO>

______________________________
<NOMESEGURADO>
Contratante

______________________________
PAULO ROBERTO TERCINI FILHO
MARCOS HENRIQUE DE PÁDUA AMORIM
AMANDA CRISTIANE CARNEIRO GARCEZ
Advogados Contratados`},
};
// a ordem dos botões e o que entra no "gerar todos"
const DOCS_PADRAO = ["proc_judicial","proc_adm","pobreza","contrato","termo","beneficiario"];

// troca os <MARCADORES> pelos dados do cliente — o que falta vira linha para
// preencher à caneta, nunca "undefined" nem espaço mudo
function preencherModeloDoc(txt, c, especie){
  const v=civilDe(c), lac="____________________";
  const dn = dnIso(c.dn) ? fmtBarra(dnIso(c.dn)) : "___/___/______";
  const dataExt = new Date(hoje()+"T12:00:00").toLocaleDateString(IDIOMA,{day:"numeric",month:"long",year:"numeric"});
  const mapa={
    "<NOMESEGURADO>": c.nome||lac, "<CPF>": c.cpf?fmtCpf(c.cpf):lac,
    "<DATANASCIMENTO>": dn, "<ESTADOCIVIL>": v.estado_civil||lac, "<PROFISSAO>": v.profissao||lac,
    // o marcador traz a preposição junto porque ela depende do logradouro:
    // "na Rua", "no Sítio", "em Boa Esperança"
    "<ENDERECO>": c.endereco ? `${prepEndereco(c.endereco)} ${c.endereco}` : `em ${lac}`,
    "<BAIRRO>": v.bairro||lac, "<CIDADE>": v.cidade||lac,
    // a qualificação escreve "Estado de ___" por extenso. Enquanto a UF era
    // sempre vazia isto nunca apareceu; com a captura da F9.3 gravando "SP",
    // a peça sairia "Estado de SP"
    "<ESTADO>": UF_NOME[v.uf] || v.uf || "São Paulo", "<CEP>": v.cep?fmtCep(v.cep):lac,
    "<ESPECIE>": especie||"Benefício/serviço a definir",
    "<DATAEXTENSO>": `Monte Alto - SP, ${dataExt}.`,
    // F160 · o representante legal entra logo depois do CEP da qualificação,
    // em todos os modelos de uma vez; sem representante, o marcador some
    "<REPRESENTANTE>": fraseRepresentante(c),
    "<HONORARIOS>": clausulaHonorarios(c, especie),
  };
  txt = txt.split("CEP <CEP>").join("CEP <CEP><REPRESENTANTE>");
  return Object.entries(mapa).reduce((t,[ph,val])=>t.split(ph).join(val), txt);
}
// a espécie que manda no contrato e no termo: a do caso escolhido; sem caso,
// a que o atendimento anotou no cadastro
// integração · o contrato e o termo leem a espécie do CASO (a
// mesma do título); o benefício escrito à mão só vale sem espécie
const especieDoContrato = (c, ks) => especieDoCliente(c, ks, true);
function especieDoCaso(k){
  return k ? ((k.especie||k.subespecie) ? tituloCaso(k) : (k.beneficio||"")) : "";
}
function especieDoCliente(c, ks, doc){
  // F227 · o pré-caso não responde como caso: vale o caso de verdade, depois o pré-caso escolhido no atendimento
  const sel = casoSel && D.casoPorId.get(casoSel);
  const vivo = (sel && !ehPreCaso(sel) ? sel : null) || (ks||[]).find(x=>x.fase!=="encerrado" && !ehPreCaso(x));
  const pa = !vivo && preCasoAberto(c);
  if(pa && pa.especie) return pa.especie;
  // F235 · o pré-caso sem espécie usa o primeiro benefício marcado no atendimento
  // F235 · a conversão não é pedido à parte: o contrato segue o benefício em que o tempo convertido entra (a B42)
  if(pa){ const os = opcoesSel(c), o = os.find(z=>z.o!=="conv") || (os[0] && {...os[0], cod:"B42"}); if(o) return (ESPECIES.find(e=>e[0]===o.cod)||[])[1] || o.rot; }
  const k = vivo || (ks||[]).find(x=>!ehPreCaso(x));
  // a triagem lê o benefício escrito (ele diz "rural", "híbrida"…); o contrato
  // e o termo leem a espécie do caso (especieDoContrato)
  if(k && (doc ? especieDoCaso(k) : k.beneficio)) return doc ? especieDoCaso(k) : k.beneficio;
  // F31 · sem caso, a espécie do PRÉ-CASO vivo responde: a procuração e o
  // contrato impressos no fluxo saem da variante certa
  const pcs = precasosDe(c).filter(p=>p.especie && !p.so_lembrete);
  return (pcs[0]||{}).especie || ((c.campos||{}).especie||"");
}
function corpoDoDoc(chave, c, especie){
  const m=DOCS_ESCRITORIO[chave]; if(!m) return null;
  const texto = chave==="contrato"
    ? textoContrato(variantePorEspecie(especie), honorAjusteDe(c, especie)) : m.texto;
  return {titulo:m.titulo, rot:m.rot, corpo:preencherModeloDoc(texto, c, especie)};
}
// timbre em cima e rodapé embaixo, em toda folha: o documento sai com a cara
// do escritório e com o endereço para onde a intimação volta
const DOC_TIMBRE = `<div class="timbre"><b>Paulo Roberto Tercini Filho</b>
  <span>Advocacia Previdenciária · OAB/SP 331.110</span></div>`;
// a folha sai com a forma do modelo do escritório: rótulos (OUTORGANTE:,
// CLÁUSULA PRIMEIRA…) e nomes em negrito, parágrafo com recuo, data à
// direita, assinatura e quem assina centralizados
const DOC_ADVOGADOS = ["Paulo Roberto Tercini Filho","Marcos Henrique de Pádua Amorim","Amanda Cristiane Carneiro Garcez"];
const MAI = "A-ZÁÉÍÓÚÂÊÔÃÕÇÀ";
const RX_CAIXA_ALTA = new RegExp(`(?<![\\wÀ-ÿ])([${MAI}][${MAI}.]+(?:\\s+(?:DE|DA|DO|DOS|DAS|E|[${MAI}][${MAI}.]+)){2,})(?![\\wÀ-ÿ])`, "g");
const RX_ROTULO = new RegExp(`^((?:CLÁUSULA|PARÁGRAFO|§\\s?\\d+º)[^:.]*[:.]|[${MAI}][${MAI} ]{3,}:)`);
function negritoDoc(t, c){
  const m=t.match(RX_ROTULO), rot=m?m[1]:"";
  let resto=esc(t.slice(rot.length)).replace(RX_CAIXA_ALTA,"<b>$1</b>");
  [...DOC_ADVOGADOS, c&&c.nome].filter(Boolean).forEach(n=>{ resto=resto.split(esc(n)).join(`<b>${esc(n)}</b>`); });
  return (rot?`<b>${esc(rot)}</b>`:"") + resto;
}
function folhaDoc(d, c){
  let assin=false;
  const linhas=d.corpo.split("\n").map(l=>{
    const t=l.trim();
    if(!t){ assin=false; return "<p class='vazio'></p>"; }
    if(/^_{4,}/.test(t)){ assin=true; return `<p class="assin">${esc(t)}</p>`; }
    if(assin) return `<p class="quem">${esc(t)}</p>`;
    if(/^Monte Alto - SP,/.test(t)) return `<p class="data">${esc(t)}</p>`;
    if(t.length<120 && t===t.toUpperCase() && /[A-Z]/.test(t)) return `<p class="sub">${esc(t)}</p>`;
    // linha curta de formulário ou item ( X ), a), I -: sem recuo nem justificação
    if(t.length<110 || /^(\(|-|\*|[a-z]\)|[IVX]+ -)/.test(t)) return `<p class="item">${negritoDoc(t, c)}</p>`;
    return `<p>${negritoDoc(t, c)}</p>`;
  });
  return `<section>${DOC_TIMBRE}<h1>${esc(d.titulo)}</h1>${linhas.join("")}
    <div class="rodape">${esc(ESCRITORIO_RODAPE)}</div></section>`;
}
function janelaImpressao(titulo, folhas){
  const w=window.open("","_blank");
  if(!w) return aviso("O navegador bloqueou a janela — libere os pop-ups deste site");
  w.document.write(htmlImpressao(titulo, folhas));
  w.document.close();
}
// F219 · a página impressa é também o que fica guardado em anexos (origem 'gerado')
function htmlImpressao(titulo, folhas){
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
  <title>${esc(titulo)}</title><style>
    /* F11 — o padrão do escritório, e não o do navegador: Bookman Old Style
       12, espaçamento 1,5. Georgia fica de reserva para quem abrir num
       aparelho sem a fonte instalada. */
    body{font-family:"Bookman Old Style", Bookman, Georgia, serif;color:#111;
      font-size:12pt;line-height:1.5;margin:0;padding:10mm 0;background:#e7e7e4}
    /* na tela, cada documento é uma folha A4; na impressão, a folha é o papel */
    section{page-break-after:always;position:relative;background:#fff;width:210mm;
      box-sizing:border-box;min-height:297mm;margin:0 auto 10mm;padding:20mm 18mm 16mm;
      box-shadow:0 1px 3px rgba(0,0,0,.18)}
    section:last-child{page-break-after:auto}
    .timbre{text-align:center;border-bottom:1.2pt solid #111;padding-bottom:6pt;margin-bottom:16pt}
    .timbre b{display:block;font-size:13pt;letter-spacing:.6pt;text-transform:uppercase}
    .timbre span{font-size:9pt;letter-spacing:.2pt}
    h1{font-size:12pt;font-weight:bold;text-align:center;text-transform:uppercase;
      letter-spacing:.5pt;margin:0 0 16pt}
    p{margin:0 0 7pt;text-align:justify;text-indent:12.5mm}
    p.item{text-align:left;text-indent:0;white-space:pre-wrap}
    p.vazio{margin:0 0 7pt;height:2pt}
    p.data{text-align:right;text-indent:0;margin-top:10pt}
    p.sub{text-align:center;text-indent:0;font-weight:bold;margin-top:12pt}
    p.assin{text-align:center;text-indent:0;margin:26pt 0 0}
    p.quem{text-align:center;text-indent:0;margin:0}
    b{font-weight:bold}
    .rodape{margin-top:20pt;padding-top:5pt;border-top:.6pt solid #999;
      font-size:8.5pt;text-align:center;color:#333;line-height:1.3}
    @media print{ body{padding:0;background:none}
      section{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}
      @page{size:A4;margin:20mm 18mm} }
  </style></head><body>${folhas}
  <script>window.print()<\/script></body></html>`;
}
// F11 · NADA SAI COM LACUNA SEM ALGUÉM SABER
// Antes, faltando RG e endereço, a procuração imprimia com a linha em branco
// e ninguém era avisado: o defeito só aparecia na hora da assinatura, com o
// cliente na frente. Agora o sistema mostra o que vai sair vazio e pergunta.
// Quem escolher gerar assim mesmo, gera — mas a escolha fica registrada.
let _docPendente = null;
function gerarDocEscritorio(chave, cliId){ conferirAntesDeGerar(cliId, [chave]); }
function gerarTodosDocs(cliId, chaves){ conferirAntesDeGerar(cliId, chaves||DOCS_PADRAO); }
function conferirAntesDeGerar(cliId, chaves){
  const c=D.cliPorId.get(cliId); if(!c) return;
  const falta=faltaParaDocs(c);
  if(!falta.length) return imprimirDocsEscritorio(cliId, chaves, []);
  _docPendente={cliId, chaves, falta};
  caixa(`<h3>Faltam ${falta.length} campo${falta.length>1?"s":""} no cadastro</h3>
    <p class="meio-sub">Estes saem como linha em branco, para preencher à caneta.
      Se o documento é para assinar hoje, preencha antes.</p>
    <div class="form-linha" style="flex-wrap:wrap;margin:10px 0">
      ${falta.map(f=>`<span class="chip neutro">${esc(f)}</span>`).join(" ")}
    </div>
    <div class="form-linha">
      <button onclick="fecharCaixa();irPreencherCadastro('${cliId}')" title="Preencher agora">Preencher<span class="sr-only"> agora</span></button>
      <button class="btn-mini" onclick="seguirComLacunas()" title="Gerar assim mesmo, com as lacunas">Gerar<span class="sr-only"> assim mesmo, com as lacunas</span></button>
      <button class="btn-mini" onclick="fecharCaixa()">cancelar</button>
    </div>`);
}
function seguirComLacunas(){
  const d=_docPendente; fecharCaixa(); _docPendente=null;
  if(d) imprimirDocsEscritorio(d.cliId, d.chaves, d.falta);
}
// a aba tem de ser escolhida DEPOIS de abrirFicha: quando o cliente ainda não
// estava aberto, ela mesma decide a aba (Casos, se houver caso) e engolia a
// escolha feita antes. O botão prometia o Cadastro e entregava os andamentos.
async function irPreencherCadastro(cliId){
  _docPendente=null;
  await abrirFicha(cliId);
  abaAtiva=0; subCad="identificacao"; guardar("crm_subcad","identificacao");
  repintarFicha();
}
function imprimirDocsEscritorio(cliId, chaves, falta){
  const c=D.cliPorId.get(cliId); if(!c) return;
  const ks=D.casosDoCliente.get(cliId)||[];
  const esp=especieDoContrato(c, ks);
  const docs=(chaves||[]).map(ch=>corpoDoDoc(ch, c, esp)).filter(Boolean);
  if(!docs.length) return;
  const titulo=docs.length===1 ? `${docs[0].rot} — ${c.nome}` : `Documentos — ${c.nome}`, folhas=docs.map(d=>folhaDoc(d, c)).join("");
  janelaImpressao(titulo, folhas);
  registrarDocGerado(cliId, docs.map(d=>d.rot), falta);
  guardarDocGerado(cliId, docs.map(d=>d.rot), htmlImpressao(titulo, folhas), falta);
}
// F219 · a folha exata que saiu (com as lacunas que saíram em branco) fica no bucket
// privado, em gerados/<cliente>/, e numa linha de anexos presa ao cliente e ao caso
// quando ele existe — meses depois se reimprime o mesmo texto
// F236 · o caso do documento: no atendimento, a linha do pré-caso escolhido (antes ia ao primeiro caso aberto, que podia ser
// outro pré-caso ou um caso antigo); fora dele, o caso aberto na ficha ou o primeiro caso de verdade em andamento
function casoDoDoc(cliId){
  const c = D.cliPorId.get(cliId), pc = c && _atendAberto.has(cliId) && preCasoAberto(c);
  const lin = pc && pc.caso_id && D.casoPorId.get(pc.caso_id); if(lin) return lin;
  const ks = (D.casosDoCliente.get(cliId)||[]).filter(x=>x.fase!=="encerrado"), sel = casoSel && D.casoPorId.get(casoSel);
  return (sel && sel.cliente_id===cliId && sel.fase!=="encerrado" ? sel : null) || ks.find(x=>!ehPreCaso(x)) || ks[0] || null;
}
async function guardarDocGerado(cliId, rots, html, falta){
  const k=casoDoDoc(cliId);
  const stamp=new Date().toISOString().replace(/[:.]/g,"-").toLowerCase();
  const caminho=`gerados/${cliId}/${hoje()}-${nomeSeguro(rots.join("-")).slice(0,60)}-${stamp.slice(11,19)}.html`;
  const blob=new Blob([html],{type:"text/html"});
  try{
    await subirArquivo(caminho, blob);
    const [an]=await api(`/rest/v1/anexos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:k?k.id:null, cliente_id:cliId, autor_id:eu.id, origem:"gerado",
        nome:`Gerado · ${rots.join("; ")}${(falta||[]).length?` (lacunas: ${falta.join(", ")})`:""}`, caminho, tipo:"text/html", tamanho:blob.size})});
    if(an) (D.anexos=D.anexos||[]).unshift(an);
    repintarFicha();
  }catch(e){ aviso("Imprimiu, mas a cópia não ficou guardada em Documentos — tente de novo"); }
}
// o PDF assinado entra pelo mesmo caminho, com origem 'assinado'
async function anexarAssinado(cliId, inpId){
  const inp=document.getElementById(inpId), arq=inp&&inp.files&&inp.files[0]; if(!arq) return;
  inp.value="";
  if(arq.size > MAX_ARQ) return aviso("Arquivo grande demais (máximo 20 MB)");
  const k=casoDoDoc(cliId);   // F236
  const caminho=`assinados/${cliId}/${hoje()}-${nomeSeguro(arq.name)}`;
  aviso("Enviando o arquivo…", false);
  try{
    await subirArquivo(caminho, arq);
    const [an]=await api(`/rest/v1/anexos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:k?k.id:null, cliente_id:cliId, autor_id:eu.id, origem:"assinado",
        nome:`Assinado · ${arq.name}`, caminho, tipo:arq.type||null, tamanho:arq.size})});
    if(an) (D.anexos=D.anexos||[]).unshift(an);
    aviso("📎 Documento assinado guardado");
    repintarFicha();
  }catch(e){ aviso("Não consegui enviar o arquivo — tente de novo"); }
}
// F195 · o documento gerado ou assinado vai ao cliente pelo WhatsApp, sem baixar
// e anexar à mão: o assinado (PDF ou foto) vai como está; o gerado, que é HTML,
// vira PDF no navegador. Sempre com confirmação, porque sai para o cliente.
async function docAoZap(id){
  const a=(D.anexos||[]).find(x=>x.id===id); if(!a) return;
  const cli=D.cliPorId.get(a.cliente_id); if(!cli) return;
  const zs=await todas("zap_conversas",`select=id,telefone,contato_nome,contato_relacao&cliente_id=eq.${cli.id}&order=ultima_em.desc.nullslast`).catch(()=>[]);
  const conv=zs[0]||null, fone=conv ? conv.telefone : cli.telefone;
  if(!conv && soDig(fone||"").length<10) return aviso("Este cliente não tem telefone nem conversa no WhatsApp");
  const para=conv && conv.contato_nome ? `${conv.contato_nome}${conv.contato_relacao?` (${conv.contato_relacao} de ${cli.nome.split(" ")[0]})`:""}` : cli.nome;
  const nomeDoc=String(a.nome||"documento").replace(/^(Gerado|Assinado) · /,"").replace(/ \(lacunas:.*\)$/,"");
  const leg=`Olá, ${(conv&&conv.contato_nome||cli.nome).split(" ")[0]}! Segue o documento: ${nomeDoc}.`;
  caixa(`<h3>Mandar pelo WhatsApp?</h3>
    <p class="meio-sub">${esc(nomeDoc)}${a.origem==="gerado"?" (vai em PDF)":""}<br>para <b>${esc(para)}</b> · <span class="mono">${esc(foneZap(fone))}</span></p>
    <textarea id="dz-leg" rows="3" style="width:100%;box-sizing:border-box">${esc(leg)}</textarea>
    <div class="form-linha" style="margin-top:10px"><button class="btn-rap" id="dz-ok">Enviar</button></div>`);
  document.getElementById("dz-ok").onclick = async () => {
    const legenda=(document.getElementById("dz-leg").value||"").trim();
    fecharCaixa(); aviso("Preparando o documento…", false);
    try{
      const cid = conv ? conv.id : await api(`/rest/v1/rpc/zap_abrir`,{method:"POST", body:JSON.stringify({p_telefone:fone, p_nome:null})});
      const url = await linkArquivo(a.caminho);
      let blob, nome = nomeSeguro(nomeDoc).slice(0,80);
      if(/^text\//.test(a.tipo||"") || a.origem==="gerado"){ blob = await pdfDoGerado(await (await fetch(url)).text()); nome += ".pdf"; }
      else { blob = await (await fetch(url)).blob(); const ext=(a.caminho.match(/\.[a-z0-9]{2,5}$/i)||[""])[0]; if(ext && !nome.endsWith(ext)) nome += ext; }
      const caminho=`zap/${cid}/enviados/${Date.now()}-${nome}`;
      await subirArquivo(caminho, blob);
      await api(`/rest/v1/zap_mensagens`,{method:"POST",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({conversa_id:cid, direcao:"saida", autor_id:eu.id, tipo:tipoDoArquivo(blob),
          texto:legenda||null, midia_url:caminho, midia_nome:nome, midia_mime:blob.type||null, status:"fila"})});
      aviso(`📲 Enviado a ${para.split(" ")[0]} pelo WhatsApp`, false);
    }catch(e){ aviso("Não consegui mandar pelo WhatsApp: "+msgErro(e)); }
  };
}
// o HTML do gerado (uma <section> por folha A4) vira PDF: cada folha numa
// imagem, e a folha que passa do A4 se divide entre parágrafos, nunca no meio da linha
function cdnScript(url, global){
  if(window[global]) return Promise.resolve();
  return new Promise((ok, erro) => { const t=document.createElement("script"); t.src=url; t.onload=ok; t.onerror=()=>erro(new Error("sem internet para gerar o PDF")); document.head.appendChild(t); });
}
async function pdfDoGerado(html){
  await cdnScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js", "html2canvas");
  await cdnScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", "jspdf");
  const ifr=document.createElement("iframe");
  ifr.style.cssText="position:fixed;left:-10000px;top:0;width:820px;height:1200px;border:0";
  document.body.appendChild(ifr);
  try{
    await new Promise(r => { ifr.onload=r; ifr.srcdoc=html; });
    const doc=ifr.contentDocument;
    doc.body.style.background="#fff"; doc.body.style.padding="0";
    const pdf=new window.jspdf.jsPDF({unit:"mm", format:"a4"}); let pagina=0;
    for(const sec of doc.querySelectorAll("section")){
      sec.style.margin="0"; sec.style.boxShadow="none";
      const cv=await window.html2canvas(sec, {scale:2, backgroundColor:"#fff"});
      const r=sec.getBoundingClientRect(), k=cv.width/r.width, mm=cv.width/210, folha=297*mm, margem=16*mm;
      const fins=[...sec.querySelectorAll("p,h1,div")].map(e=>(e.getBoundingClientRect().bottom-r.top)*k).sort((x,y)=>x-y);
      for(let y=0; y < cv.height-1; ){
        const topo = y ? margem : 0;
        let fim = y + folha - topo;
        if(fim < cv.height){ fim -= margem; fim = fins.filter(f=>f>y+10 && f<=fim).pop() || fim; }
        else fim = cv.height;
        fim = Math.round(fim);   // corte em pixel inteiro: o fracionado deixava uma linha cinza no pé da folha
        const pd=document.createElement("canvas"); pd.width=cv.width; pd.height=fim-y;
        const g=pd.getContext("2d"); g.fillStyle="#fff"; g.fillRect(0, 0, pd.width, pd.height);
        g.drawImage(cv, 0, y, cv.width, fim-y, 0, 0, cv.width, fim-y);
        if(pagina++) pdf.addPage();
        pdf.addImage(pd.toDataURL("image/jpeg", 0.92), "JPEG", 0, topo/mm, 210, (fim-y)/mm);
        y = fim;
      }
    }
    return pdf.output("blob");
  } finally { ifr.remove(); }
}
// fica registrado no CRM o que foi impresso para o cliente assinar
// o andamento passa a dizer TAMBÉM o que estava em branco na hora de gerar.
// Sem isso, meses depois ninguém sabe se a lacuna da procuração assinada foi
// descuido ou escolha consciente daquele dia.
async function registrarDocGerado(cliId, rots, falta){
  const k=casoDoDoc(cliId);   // F236 · o mesmo caso em que o documento ficou guardado
  if(!k) return;                       // sem caso ainda: o registro vem depois
  const lacunas=(falta||[]).length
    ? ` Saiu com lacuna para preencher à caneta: ${falta.join(", ")}.` : "";
  try{
    await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({caso_id:k.id, autor_id:eu.id,
        texto:`Documento(s) gerado(s) para assinatura: ${rots.join("; ")}.${lacunas}`})});
  }catch(e){ /* impressão não pode falhar por causa do registro */ }
}
function caixaDocumentos(c, ks){
  const esp=especieDoContrato(c, ks);
  const vr=CONTRATO_VARIANTES[variantePorEspecie(esp)];
  const falta=faltaParaDocs(c);
  // F236 · o caso já está na Justiça (ou em Petições Iniciais): a procuração judicial e a declaração vêm primeiro, "para esta
  // ação", com o contrato; os papéis do INSS ficam recolhidos. No atendimento de um pré-caso novo, vale o de sempre
  const kSel = (ks||[]).find(x=>x.id===casoSel && !x.pre_caso && x.fase!=="encerrado");
  const kJ = !(_atendAberto.has(c.id) && preCasoAberto(c)) && (kSel ? (["judicial","peticao_inicial"].includes(kSel.fase) ? kSel : null)
    : (ks||[]).find(x=>!x.pre_caso && ["judicial","peticao_inicial"].includes(x.fase)));
  // F236 · cada documento diz se já foi gerado ou assinado, e quando: o caso que já existe não pede de novo o que tem
  const feito = docFeitoDe(c, !!kJ);
  const bt=(ch)=>`<button class="btn-mini" onclick="gerarDocEscritorio('${ch}','${c.id}')"><span class="ic-bt">${CAD_IC.doc}</span>${DOCS_ESCRITORIO[ch].rot}</button>${(f=>f ? `<small class="doc-ja-feito">✔ ${f.assinado ? "assinado" : "gerado"} ${fmtBarra(f.em).slice(0,5)}</small>` : "")(feito(ch))}`;
  return `<div class="caixa-docs" style="margin-bottom:12px">
    <div class="rotulo-caso">Documentos para o cliente assinar</div>
    <p class="meio-sub" style="margin:2px 0 8px">Saem preenchidos com o cadastro.
      Contrato e termo de representação seguem a espécie${esp?`: <b>${esc(esp)}</b>, contrato de <b>${esc(vr.rot)}</b>`
      :` — <b>ainda não definida</b>, o contrato sai no modelo padrão`}.</p>
    ${/* F235 · o contrato de serviço não tem os "3 primeiros benefícios": os honorários saem em branco até o advogado combinar */""}${variantePorEspecie(esp)==="servico" && !honorEstrutDe(c, esp) && !honorAjusteDe(c, esp)
      ? `<p class="meio-sub doc-aviso"><b>Contrato de serviço:</b> os honorários saem em branco. O advogado os combina com o cliente antes de gerar (o pedido no INSS e o que houver a receber, como a devolução do imposto já descontado) e preenche à mão, ou grava o combinado na mesa do atendimento.</p>` : ""}
    ${(()=>{ // F235 · o B31 tem procuração e contrato próprios: o genérico some, e o que é da Justiça fica à parte
      const b31 = /incapacidade tempor|\bB31\b/i.test(esp||"") || opcoesSel(c).some(o=>o.o==="b31");
      const recebe = !!aposentadoriaAtiva(c) || beneficiosDoCnis(cnisDe(c)).some(b=>b.ativo && !/^(36|94)$/.test(b.especie));
      const semDecl = recebe || variantePorEspecie(esp)==="servico" || /revis/.test(dsa(esp||""));
      // F235 · a cópia do processo instrui o recurso ou o pedido novo que o advogado escolher: só a procuração; o contrato vem com a escolha
      const soProc = /^copia$|copia d[eo] processo/.test(dsa(esp||"").trim());
      const caso = soProc ? ["proc_adm"] : (b31 ? ["b31_proc","b31_contrato","termo","beneficiario"] : ["proc_adm","contrato","termo","beneficiario"]).filter(k=>!(semDecl && k==="beneficiario"));
      const lista = JSON.stringify(caso).replace(/"/g, "'");
      // F236 · "Gerar os N" gera só o que falta assinar: o contrato já assinado (anexado na aba Honorários) não sai de novo
      const gerar = ls => { const f = ls.filter(ch=>!(feito(ch)||{}).assinado);
        return !f.length ? `<span class="meio-sub doc-ja-feito">✔ todos assinados</span>` : f.length===1 ? ""
          : `<button onclick="gerarTodosDocs('${c.id}',${JSON.stringify(f).replace(/"/g, "'")})" title="uma janela só, uma folha por documento; o já assinado fica de fora">Gerar os ${f.length}</button>`; };
      // F236 · o caso em Pagamentos: o contrato sustenta os honorários; os papéis de pedido novo não servem a ele
      const emAt = _atendAberto.has(c.id) && preCasoAberto(c), kDv = casoDaVez(c);
      const kPg = !emAt && (kSel ? (kSel.fase==="pagamento" ? kSel : null) : (kDv && kDv.fase==="pagamento" ? kDv : null));
      if(kPg){ const ct = caso.filter(x=>/contrato/.test(x));
        return `<div class="form-linha" style="flex-wrap:wrap"><span class="meio-sub" style="flex-basis:100%">Para esta fase (Pagamentos): o contrato sustenta os honorários, na aba Honorários; os papéis de pedido novo não servem a este caso.</span>
          ${(ct.length ? ct : ["contrato"]).map(bt).join("")}</div>`; }
      if(kJ){ const jud = ["proc_judicial","pobreza", ...caso.filter(x=>/contrato/.test(x))], adm = caso.filter(x=>!/contrato/.test(x));
        // F236 · a ação já distribuída teve a procuração e a declaração assinadas: nada a gerar, só nova via se precisar
        const distrib = kJ.fase==="judicial" && !!(kJ.ajuizado_em || processosDoCaso(kJ).some(p=>p.nosso));
        return `<div class="form-linha" style="flex-wrap:wrap"><span class="meio-sub" style="flex-basis:100%">Para esta ação (${esc(NOME_FASE[kJ.fase]||kJ.fase)}):</span>
          ${jud.map(bt).join("")}${distrib ? `<span class="meio-sub">A ação já foi distribuída: estes papéis já foram assinados; gere um só se precisar de nova via.</span>` : gerar(jud)}</div>
        ${adm.length ? `<details class="doc-inss" style="margin-top:6px;border-top:1px dashed var(--borda);padding-top:6px"><summary class="meio-sub" style="cursor:pointer">Papéis do INSS, só se houver pedido administrativo: ${esc(adm.map(x=>DOCS_ESCRITORIO[x].rot).join(", "))}</summary>
          <div class="form-linha" style="flex-wrap:wrap">${adm.map(bt).join("")}</div></details>` : ""}`; }
      return `<div class="form-linha" style="flex-wrap:wrap"><span class="meio-sub" style="flex-basis:100%">Para este caso${b31 ? " (auxílio por incapacidade temporária)" : ""}:</span>
        ${caso.map(bt).join("")}${caso.length > 1 ? gerar(caso) : `<span class="meio-sub">Contrato: o advogado define, com a escolha entre o recurso e o pedido novo.</span>`}</div>
      <div class="form-linha" style="flex-wrap:wrap;margin-top:6px;border-top:1px dashed var(--borda);padding-top:6px">
        <span class="meio-sub" style="flex-basis:100%">Só se o caso for à Justiça:</span>${bt("proc_judicial")}${bt("pobreza")}</div>`; })()}
    ${falta.length?`<p class="meio-sub" style="margin-top:6px"><b>Faltam no cadastro:</b> ${esc(falta.join(", "))}: o documento sai com <b>____</b> no lugar.
      <button type="button" class="btn-mini" onclick="irSubCad('identificacao')" title="Completar agora">Completar<span class="sr-only"> agora</span></button></p>`:""}
    ${docsDaAnalise(c)}
  </div>`;
}
// F195 · o que a Análise de Direito já deu aos documentos, e o que falta
// informar nela para a espécie, com o caminho de volta ao formulário
function docsDaAnalise(c){
  const a = analisesDaVez(c)[0], d = (a&&a.detalhes)||{}, sv = d.servico;
  const ir = `<button class="btn-mini" onclick="docsInformar('${c.id}')" title="Informar na análise">Informar<span class="sr-only"> na análise</span></button>`;
  if(!a) return `<div class="docs-ad form-linha" style="flex-wrap:wrap"><span class="meio-sub" style="flex:1 1 260px"><b>Análise de Direito:</b> nenhuma registrada; os documentos saem só com o cadastro.</span>${ir}</div>`;
  const ks = camposDoServico(sv||{}).filter(k=>AD_ROT[k] && !/^periodos_/.test(k));
  const falta = ks.filter(k=>d[k]==null || d[k]==="");
  const nome = (sv&&sv.nome) || "serviço não escolhido";
  return `<div class="docs-ad form-linha" style="flex-wrap:wrap"><span class="meio-sub" style="flex:1 1 260px"><b>Análise de Direito de ${esc(fmt(a.data_analise))}, ${esc(nome)}:</b> ${
    !sv ? "sem espécie escolhida; escolha na análise para saber o que ela pede."
    : falta.length ? `falta informar ${esc(falta.map(k=>AD_ROT[k].toLowerCase()).join(", "))}.`
    : `pronta, com ${ks.length===1?"o campo":"os "+ks.length+" campos"} que a espécie pede.`}</span>${!sv||falta.length?ir:""}</div>`;
}
function docsInformar(cliId){ adAbrir = true; adVisivel.add(cliId); abaAtiva = 0; irSubCad("direito"); }

// ══════════════════════════════════════════════════════════════════════════
// F219 · A INTEGRAÇÃO DO ATENDIMENTO (ondas 2 a 5 de INTEGRACAO-ATENDIMENTO.md)
// ══════════════════════════════════════════════════════════════════════════
// O pré-caso é o atendimento: cada tela do modo atendimento grava nele a etapa
// que fechou (etapas.<tela> = {em, quem}) e o desfecho (lembrete, caso ou
// arquivado). A Análise de Direito decide pela base da pesquisa de 12.10.2026:
// direito hoje ou ato que não espera → caso; data futura → lembrete (card em
// Lembretes com D-90 em aposentadorias e D-60 em proximo_em); nada → arquivar
// com motivo. Os Documentos executam em seis quadros.
const ETAPA_DE = {identificacao:"identificacao", pa:"pa", direito:"analise", documentos:"documentos"};
// o pré-caso do atendimento em curso: o último vivo (o "Abrir atendimento" do card acrescenta no fim)
// F227 · o colaborador escolhe o pré-caso (cartão do Escritório, Casos ▾ ou o seletor do modo
// atendimento); sem escolha, vale o último vivo
const _pcSel = new Map();
function preCasosVivos(c){ return precasosDe(c).filter(p=>!p.so_lembrete && p.especie!==ESPECIE_PAGAMENTOS); }
function preCasoAberto(c){
  const vs = preCasosVivos(c);
  return vs.find(p=>p.id===_pcSel.get(c.id)) || vs[vs.length-1] || null;
}
// F231 · o estado da sessão é do pré-caso: trocar de pré-caso grava o que esperava
// e recomeça a escolha da tela
function trocarPreCaso(cliId, pcId){
  if(_pcSel.get(cliId)===pcId) return;
  admGravarAgora();
  for(const m of [_paEsc, _paCartao, _paBloco, _paAnalise, _paForaBl, _mapaLente, _mapaFora]) m.delete(cliId);
  _pcSel.set(cliId, pcId);
}
function escolherPreCaso(cliId, pcId){ trocarPreCaso(cliId, pcId); repintarFicha(); }
async function mudarPreCasoCampos(cliId, pcId, muda){
  const c = D.cliPorId.get(cliId); if(!c) return false;
  return gravarPrecasos(cliId, precasosDe(c).map(p=>{ if(p.id!==pcId) return p; const n = {...p}; muda(n); return n; }));
}
// "Concluir esta etapa": grava quem e quando, avisa quem vem depois (o mesmo aviso do cliente novo) e abre o passo seguinte
async function concluirEtapa(cliId, sub){
  const c = D.cliPorId.get(cliId), pc = c && preCasoAberto(c), k = ETAPA_DE[sub]; if(!pc || !k) return;
  await admGravarAgora();
  if(sub==="direito") await salvarAnaliseSePreenchida(cliId);
  const extra = sub==="identificacao" ? {faltam: faltaParaDocs(c).length} : sub==="pa" ? {beneficios: benefSel(c)} : {};
  if(!await mudarPreCasoCampos(cliId, pc.id, p=>{ p.etapas = {...(p.etapas||{}), [k]:{...((p.etapas||{})[k]||{}), ...extra, em:hoje(), quem:eu.id}}; })) return;
  _pcNovo.delete(pc.id);   // F277 · salvo: sair do atendimento não o descarta mais
  const rot = Object.fromEntries(SUB_CAD), seq = ["identificacao", "pa", "direito", "documentos"];   // F220 · o Primeiro atendimento existe sem dossiê
  const prox = seq[seq.indexOf(sub)+1];
  await avisarClienteNovo(cliId, `${rot[sub]} concluída no atendimento de ${c.nome}${prox ? ` — próximo passo: ${rot[prox]}` : " — pronto para o desfecho"}`);
  aviso(`Pré-caso salvo · ${rot[sub]} concluída ✔`, false);
  if(prox) irSubCad(prox); else repintarFicha();
}
// ── a base da decisão ────────────────────────────────────────────────────
// ato que não espera (triagem-caso-novo e base-aposentadoria-futura-pipeline): o pedido não tem data futura a esperar
const DESF_IMEDIATO = {rev:"revisão com decadência correndo", acerto:"acerto de CNIS que precede o requerimento", crps:"recurso ao CRPS em 30 dias",
  b31:"benefício por incapacidade", b32:"benefício por incapacidade", acid:"benefício por incapacidade", b94:"auxílio-acidente", b36:"auxílio-acidente",
  morte:"pensão por morte", reclusao:"auxílio-reclusão", urb:"salário-maternidade", rur:"salário-maternidade", def:"BPC", idoso:"BPC",
  // F235 · os serviços: o ato cabe já
  REST:"restabelecimento do auxílio cortado", B93:"pensão por morte acidentária", IIR:"pedido de isenção de imposto de renda no Meu INSS",
  CTC:"pedido da certidão de tempo de contribuição no Meu INSS", COPIA:"entrega da cópia do processo ao titular", JA:"justificação administrativa dentro do pedido do benefício",
  SD:"pedido do seguro-defeso no Ministério do Trabalho"};
// ══ F235 · OS SERVIÇOS COMO OPÇÃO: certidão, isenção de IR, regularização, pensão acidentária, restabelecimento,
// cópia, justificação e seguro-defeso. Cada um tem a lista própria, na ordem da conversa (catálogo em
// crm/fase2/docs/REQUISITOS-POR-BENEFICIO.md e o gabarito do teste por espécie de 16.10.2026) ══
(()=>{
  // F235 · o acerto de CNIS começa pela carteira de trabalho que o cliente trouxe
  if(REQ_BENEF.acerto && !REQ_BENEF.acerto.some(r=>r.id==="ctps_fora_cnis")) REQ_BENEF.acerto.unshift(REQ_CTPS);
  const _vincs = x => ((x.g||{}).vinculos||[]).filter(v=>v.tipo!=="Benefício" && v.inicio).map(v=>({v, de:isoBr(v.inicio),
    ate: isoBr(v.fim||"") || (v.ultRemun ? isoBr(fimDoMes(v.ultRemun)) : x.hoje), ind:(v.indicadores||[]).map(String)}));
  const _rotV = w => w.v.origem ? tituloOrgao(w.v.origem) : String(w.v.tipo||"contribuições").toLowerCase();
  const _ativosS = x => (x.benefCnis||[]).filter(b=>b.ativo);
  const _nomeS = b => `${nomeBenef(b.especie).toLowerCase()}${b.nb ? ` (NB ${fmtNb(b.nb)})` : ""}`;
  // ── CTC ─────────────────────────────────────────────────────────────────
  const _ctcPosse = x => x.v.ctc_posse || ((_vincs(x).find(w=>w.ind.some(i=>/^PRPPS/.test(i)))||{}).de) || null;
  // F235 · os meses de carnê reduzido antes da posse, com a alíquota de cada vínculo
  const _ctcReduz = x => { const posse = _ctcPosse(x);
    return _vincs(x).filter(w=>w.ind.some(i=>/LC123|MEI|FBR/.test(i)) && (!posse || w.de < posse)).map(w=>{ const al = w.ind.some(i=>/FBR|MEI/.test(i)) ? 5 : 11, ms = [];
      let a = ymDe(w.de); const b = ymDe(posse && w.ate >= posse ? diaAnterior(posse) : w.ate);
      for(let k = 0; a <= b && k < 600; k++, a = ymDe(somarMeses(a+"-01", 1))) ms.push(a.split("-").reverse().join("/"));
      return {w, al, ms}; }).filter(r=>r.ms.length); };
  function _ctcPeriodos(x){
    const posse = _ctcPosse(x), out = {ja:[], compl:[], acerto:[], nao:[], meses:0};
    for(const w of _vincs(x)){
      if(w.ind.some(i=>/^PRPPS/.test(i))) continue;
      let ate = w.ate;
      if(posse && ate >= posse){
        out.nao.push(`${_rotV(w)}, de ${fmtBarra(w.de > posse ? w.de : posse)} a ${fmtBarra(ate)} (ao mesmo tempo que o cargo público)`);
        if(w.de >= posse) continue; ate = diaAnterior(posse); }
      const rot = `${_rotV(w)}, ${fmtBarra(w.de)} a ${fmtBarra(ate)}`;
      if(w.ind.some(i=>/^(PEXT|PADM)/.test(i))) out.acerto.push(`${rot} (pendência no CNIS: provar antes)`);
      else if(w.ind.some(i=>/LC123|MEI|FBR/.test(i))) out.compl.push(`${rot} (alíquota reduzida: complementar até 20 %)`);
      else { out.ja.push(rot); out.meses += mesesEntreYm(ymDe(w.de), ymDe(ate)); }
    }
    return out;
  }
  registrarReq("CTC", [
    {id:"ctc_destino", rot:"Para qual órgão vai a certidão, e para quê?", base:"IN 128/2022, art. 511, caput e § 3º", conf:"conferido", campos:["ctc_orgao","ctc_finalidade"],
     mede:x=>x.v.ctc_orgao ? {est:"ok", txt:`${x.v.ctc_orgao}${x.v.ctc_finalidade ? `, para ${x.v.ctc_finalidade.toLowerCase()}` : ""}`, fonte:"campo"}
       : {est:"informar", txt:"informe o órgão de destino: a declaração do RH diz para que é o tempo"}},
    {id:"ctc_cargo", rot:"Desde quando a pessoa tem o cargo no regime próprio?", base:"Lei 8.213/91, art. 96, II; IN 128/2022, art. 512", conf:"conferido", campos:["ctc_posse"],
     mede:x=>{ const w = _vincs(x).find(w=>w.ind.some(i=>/^PRPPS/.test(i)));
       if(x.v.ctc_posse) return {est:"ok", txt:`posse em ${fmtBarra(x.v.ctc_posse)}: o tempo trabalhado ao mesmo tempo não vai na certidão`, fonte:"campo"};
       if(w) return {est:"ok", txt:`cargo em ${_rotV(w)} desde ${fmtBarra(w.de)} (CNIS, PRPPS): é o destino da certidão; não conta no INSS e não se acerta`, fonte:"CNIS"};
       return {est:"informar", txt:"informe a data da posse no cargo público: corta o tempo trabalhado ao mesmo tempo"}; }},
    {id:"ctc_periodos", rot:"Que períodos vão na certidão?", base:"Lei 8.213/91, art. 96, I a III; IN 128/2022, arts. 511, § 2º, 513 e 514, I", conf:"conferido", campos:[],
     mede:x=>{ if(!x.g) return {est:"informar", txt:"o CNIS não foi lido"};
       const p = _ctcPeriodos(x), partes = [p.ja.length && `vai já: ${p.ja.join("; ")}`, p.compl.length && `só vai complementado: ${p.compl.join("; ")}`,
         p.acerto.length && `vai depois do acerto: ${p.acerto.join("; ")}`, p.nao.length && `não vai: ${p.nao.join("; ")}`].filter(Boolean);
       // F235 · cada parte da lista com maiúscula (antes só a primeira)
       return {est: p.ja.length ? "ok" : p.compl.length || p.acerto.length ? "risco" : "falta", txt: partes.map(cap1).join(". ") || "nenhum período no CNIS", fonte:"CNIS"}; }},
    // F235 · o carnê reduzido e o mês abaixo do mínimo: o custo, a decisão do advogado com o RH e a revisão da certidão depois
    {id:"ctc_minimo", rot:"O carnê de 5, 11 ou 12 % e os meses abaixo do mínimo vão na certidão?", base:"IN 128/2022, arts. 513, VIII e § 7º, e 514, I", conf:"conferido", campos:[],
     mede:x=>{ const ab = (x.an && x.an.abaixo) || [], ws = _ctcReduz(x), ps = [];
       if(!ab.length && !ws.length) return {est:"ok", txt:"nenhum carnê reduzido nem mês abaixo do mínimo no CNIS", fonte:"CNIS"};
       if(ws.length){ const ms = ws.reduce((n, w)=>n + w.ms.length, 0), custo = ws.reduce((s, w)=>s + w.ms.reduce((t, m)=>t + (20 - w.al)/100*(salarioMinimo(m) || 0), 0), 0);
         ps.push(`carnê de ${[...new Set(ws.map(w=>w.al))].join(" e ")} % (${ws.map(w=>`${w.ms[0]} a ${w.ms[w.ms.length-1]}`).join("; ")}, ${plu(ms, "mês", "meses")}): não vai na certidão assim; só vai pagando a diferença até 20 % (${[...new Set(ws.map(w=>20 - w.al))].join(" e ")} % do salário mínimo de cada mês, cerca de ${moeda(custo)} antes dos juros e da multa)`); }
       if(ab.length) ps.push(`${ab.map(a=>a.comp).join(", ")} ${ab.length===1 ? "foi pago" : "foram pagos"} abaixo do mínimo: antes, completar até o mínimo (${ab.map(a=>moeda(+a.minimo)).join(" e ")})`);
       ps.push("é decisão de custo do advogado com o RH: dá para pedir já sem esse período e incluí-lo depois, pedindo a revisão da certidão");
       return {est:"risco", txt:ps.join("; "), fonte:"CNIS"}; }},
    {id:"ctc_beneficio", rot:"Recebe ou recebeu benefício do INSS?", base:"IN 128/2022, arts. 511, §§ 5º e 8º, e 514, § 1º", conf:"conferido", campos:[],
     mede:x=>{ const at = _ativosS(x), apo = x.apos, inc = at.find(b=>/^(31|91)$/.test(b.especie)), aa = at.find(b=>/^(36|94)$/.test(b.especie));
       if(apo) return {est:"risco", txt:`aposentado no INSS (${apo.especie}): só vai o tempo que não serviu à aposentadoria`, fonte:"CNIS"};
       if(inc) return {est:"risco", txt:`${_nomeS(inc)} em curso: precisa cessar antes do pedido`, fonte:"CNIS"};
       if(aa) return {est:"info", txt:`${_nomeS(aa)}: acaba com a emissão da certidão`, fonte:"CNIS"};
       return {est:"ok", txt:"nenhum benefício em manutenção", fonte: x.g ? "CNIS" : ""}; }},
    {id:"ctc_especial", rot:"Tem tempo especial ou com deficiência?", base:"Lei 8.213/91, art. 96, I; IN 128/2022, art. 513, I e II", conf:"conferido", campos:[],
     mede:x=>({est:"info", txt:"saem discriminados na certidão, sem conversão; o regime próprio decide como conta (o PPP vai junto)"})},
    {id:"ctc_aviso", rot:"O que muda no INSS?", base:"Lei 8.213/91, art. 96, III e VIII; IN 128/2022, arts. 517 e 519", conf:"conferido", campos:[],
     mede:x=>{ const p = x.g ? _ctcPeriodos(x) : null, n = x.ct ? x.ct.carencia : null;
       return {est:"info", txt:`o tempo que vai para o regime próprio deixa de contar no INSS e não volta depois de render vantagem lá${n!=null && p ? `. Hoje o CNIS tem ${n} contribuições; levando o que vai já (${p.meses} meses), ficam cerca de ${Math.max(0, n - p.meses)}` : ""}. Decidir com o advogado o que levar`}; }},
  ], {ctc_orgao:["Órgão de destino (prefeitura, estado, União)", "text"], ctc_finalidade:["Para quê", "select", ["","Aposentar no regime próprio","Adicional ou licença-prêmio","Outra averbação"]],
      ctc_posse:["Posse no cargo público", "date"]},
    {resumo:"Certifica o tempo de contribuição do INSS para o regime próprio do servidor. Cada período vai uma vez só, e o que vai deixa de contar no INSS.",
     veredito: (x, a)=>{ if(!x.g) return null; const p = _ctcPeriodos(x); if(!p.ja.length) return null;
       return {tom:"sim", txt:`Pode pedir já, com ${anosMeses(Math.floor(p.meses/12), p.meses%12)} que vão sem acerto${p.compl.length ? "; os meses de alíquota reduzida só vão depois de complementar" : ""}${p.acerto.length ? "; o vínculo com pendência, depois do acerto" : ""}${p.nao.length ? "; o tempo trabalhado ao mesmo tempo que o cargo não vai" : ""}.`}; },
     agora: x=>{ const p = x.g ? _ctcPeriodos(x) : {compl:[], acerto:[]};
       return [`Pedir já no Meu INSS: Certidão de Tempo de Contribuição${x.v.ctc_orgao ? ` para ${x.v.ctc_orgao}` : ""}, com os períodos que vão já. Não há prazo para pedir.`,
         // F235 · o caminho do período reduzido: cálculo, guias e revisão da certidão
         ...(p.compl.length || ((x.an||{}).abaixo||[]).length ? ["Se o advogado decidir complementar: pedir ao INSS o cálculo da diferença até 20 % (e, antes, até o mínimo nos meses abaixo dele; cálculo no Meu INSS ou na Receita), pagar as guias e depois pedir a revisão da certidão para incluir o período."] : []),
         ...(p.acerto.length ? ["O vínculo com pendência vai depois do acerto do CNIS, com a carteira de trabalho."] : [])]; }});

  // ── isenção de imposto de renda ─────────────────────────────────────────
  const RX_IIR = /tuberculose ativa|aliena[çc][ãa]o mental|esclerose m[úu]ltipla|neoplasia maligna|c[âa]ncer|carcinoma|adenocarcinoma|linfoma|leucemia|cegueira|hansen[íi]ase|paralisia irrevers|cardiopatia grave|parkinson|espondiloartrose anquilosante|nefropatia grave|hepatopatia grave|paget|oste[íi]te deformante|contamina[çc][ãa]o por radia|aids|imunodefici[êe]ncia adquirida|fibrose c[íi]stica|mol[ée]stia profissional/i;
  const RX_CID_IIR = /^(A1[5-9]|F0[0-3]|F2\d|G35|C\d\d|H54|A30|G20|M45|N1[78]|K7[0-4]|M88|B2[0-4]|E84)/i;
  const _iirDoc = x => (x.clin||[]).map(i=>({i, t:`${i.titulo} ${i.resumo} ${(i.cids||[]).join(" ")}`})).find(({i, t})=>RX_IIR.test(t) || (i.cids||[]).some(c=>RX_CID_IIR.test(c)));
  registrarReq("IIR", [
    {id:"iir_beneficio", rot:"Recebe aposentadoria ou pensão?", base:"Lei 7.713/88, art. 6º, XIV; IN 128/2022, art. 625, III", conf:"conferido", campos:[],
     mede:x=>{ const at = _ativosS(x), ap = at.find(b=>/^(4[1-6]|57|32|92|21|93)$/.test(b.especie));
       if(ap || x.apos) return {est:"ok", txt:`recebe ${ap ? _nomeS(ap) : x.apos.especie}: a isenção vale sobre ela`, fonte:"CNIS"};
       if(at.some(b=>/^(31|91|36|94)$/.test(b.especie))) return {est:"info", txt:"o auxílio por incapacidade e o auxílio-acidente já não sofrem desconto de imposto (Portaria DIRBEN 992/2022, art. 291)", fonte:"CNIS"};
       return x.g ? {est:"falta", txt:"a isenção vale sobre aposentadoria, reforma ou pensão; salário não entra", fonte:"CNIS"} : {est:"informar", txt:"o CNIS não foi lido: confira se recebe aposentadoria ou pensão"}; }},
    {id:"iir_doenca", rot:"A doença está na lista da lei?", base:"Lei 7.713/88, art. 6º, XIV; Portaria DIRBEN/INSS 992/2022, art. 291, II", conf:"conferido", campos:["iir_doenca"],
     mede:x=>{ if(x.v.iir_doenca) return {est: RX_IIR.test(x.v.iir_doenca) ? "ok" : "risco", txt: RX_IIR.test(x.v.iir_doenca) ? `${x.v.iir_doenca}: está na lista` : `${x.v.iir_doenca}: confira se está na lista da lei`, fonte:"campo"};
       const d = _iirDoc(x); if(!d) return {est:"informar", txt:"informe a doença como está no laudo: só as da lista isentam (câncer, Parkinson, cardiopatia grave, cegueira, esclerose múltipla e outras)"};
       return {est:"ok", txt:`${cap1(d.i.titulo)}${(d.i.cids||[]).length ? ` (CID ${d.i.cids.join(", ")})` : ""}, no ${String(d.i.tipo||"documento").toLowerCase()} de ${fmtBarra(d.i.data)}: está na lista`, fonte:d.i.fonte}; }},
    {id:"iir_laudo", rot:"O laudo é de serviço médico oficial, com o CID e a data do diagnóstico?", base:"Portaria DIRBEN/INSS 992/2022, art. 291, §§ 1º a 4º; Lei 9.250/95, art. 30", conf:"conferido", campos:[],
     mede:x=>{ const d = _iirDoc(x); if(!d) return {est:"informar", txt:"traga o laudo do médico do SUS ou de hospital público, com o CID e a data do diagnóstico"};
       const oficial = /^HC\b/i.test(d.i.fonte||"") || /hospital das cl|\bSUS\b|p[úu]blic/i.test(d.t), cid = (d.i.cids||[]).length, dg = d.i.fatos && d.i.fatos.diag;
       const exame = (x.clin||[]).filter(i=>/bi[óo]psia|anatomopatol/i.test(`${i.titulo}`)).sort((a, b)=>a.data < b.data ? -1 : 1)[0];
       if(oficial && cid && dg) return {est:"ok", txt:`laudo do serviço público com CID e diagnóstico em ${fmtBarra(dg)}: serve`, fonte:d.i.fonte};
       // F235 · o laudo oficial com o CID, sem a data do diagnóstico, não impede: a isenção sai, mas começa no mês do laudo (a provar a data)
       return {est: oficial && cid ? "provar" : "risco", txt:`${oficial ? "o laudo é do serviço público, mas" : "o laudo precisa ser de serviço médico oficial (SUS, hospital público) e"} ${!cid ? "não traz o CID" : "não traz a data do diagnóstico"}: sem ela a isenção começa só no mês do laudo. Peça um laudo para fins de isenção de imposto de renda com o CID e a data do diagnóstico${exame ? `, que provavelmente é a do exame de ${fmtBarra(exame.data)}` : ""}`, fonte:d.i.fonte}; }},
    {id:"iir_inicio", rot:"Desde quando vale a isenção?", base:"Portaria DIRBEN/INSS 992/2022, art. 291, §§ 2º e 3º", conf:"conferido", campos:[],
     mede:x=>{ const d = _iirDoc(x), dg = d && d.i.fatos && d.i.fatos.diag;
       return dg ? {est:"info", txt:`desde ${fmtBarra(dg).slice(3)}, o mês do diagnóstico`, fonte:d.i.fonte} : {est:"info", txt:"desde o mês do laudo; com a data do diagnóstico no laudo, desde ela"}; }},
    {id:"iir_restituicao", rot:"E o imposto já descontado?", base:"Portaria DIRBEN/INSS 992/2022, art. 293, § 1º; CTN, art. 168, I; Tema 1373/STF", conf:"conferido", campos:[],
     // F235 · o dinheiro do caso: o período descontado (do diagnóstico, ou da aposentadoria, até o extrato mostrar que parou) e o primeiro ano a vencer
     mede:x=>{ const d = _iirDoc(x), dg = d && d.i.fatos && d.i.fatos.diag, exame = (x.clin||[]).filter(i=>/bi[óo]psia|anatomopatol/i.test(`${i.titulo}`)).sort((a, b)=>a.data < b.data ? -1 : 1)[0];
       const ini = dg || (exame && exame.data) || (d && d.i.data) || "", ap = _ativosS(x).find(b=>/^(4[1-6]|57|32|21|93)$/.test(b.especie)), de = [ini, ap && ap.de].filter(Boolean).sort().pop() || "";
       const ex = (x.fd.extratos||[]).map(e=>descontoDoExtrato(e)).find(Boolean), ano0 = de ? +de.slice(0, 4) : null, anoHoje = +x.hoje.slice(0, 4);
       const via = "corrigindo as declarações de imposto de renda dos anos ou com ação contra a União na Justiça Federal (não contra o INSS), sem pedir antes (Tema 1373 STF)";
       if(!ano0) return {est:"info", txt:`o imposto descontado desde o diagnóstico se pede de volta ${via}; o prazo é de 5 anos (conferir o marco). A via é do advogado`};
       const fim = ex && !ex.atual ? ex.ult : null, periodo = `de ${ymDe(de).split("-").reverse().join("/")} ${fim ? `a ${fim}` : "até hoje"}`, fonte = ex ? "extrato de pagamento" : d.i.fonte;
       if(ano0 >= anoHoje) return {est:"info", txt:`o imposto descontado ${periodo}, deste ano, volta na declaração do ano que vem, informando o benefício como rendimento isento por doença grave; não há anos anteriores a recuperar`, fonte};
       const vence = ano0 + 6, perto = vence <= anoHoje + 2;
       return {est: perto ? "risco" : "info", txt:`${perto ? "prazo correndo: " : ""}o imposto descontado ${periodo}${fim ? " (desde então o desconto parou, pelo extrato)" : ""} se pede de volta ${via}. Prazo: 5 anos; o desconto de ${ano0} é o primeiro a vencer, em ${vence}, se os 5 anos contarem da declaração entregue em ${ano0 + 1} (conferir). Peça ao cliente os informes de rendimentos e as declarações de ${ano0} a ${fim ? fim.slice(3) : anoHoje - 1}`, fonte}; }},
    {id:"iir_atual", rot:"Precisa estar doente hoje?", base:"Súmula 627/STJ", conf:"conferido", campos:[],
     mede:x=>({est:"info", txt:"não: a doença em remissão mantém a isenção"})},
  ], {iir_doenca:["Doença (como está no laudo)", "text"]},
    {resumo:"Tira o desconto do imposto de renda da aposentadoria ou pensão de quem tem doença da lista da lei, desde o diagnóstico; o que já foi descontado pode voltar.",
     // F235 · com a doença da lista e a aposentadoria, o direito existe: o laudo sem a data e o prazo da devolução são o que fazer, e não "ainda não"
     veredito: (x, a)=>{ const r = id => a.rs.find(r=>r.id===id) || {};
       if(r("iir_beneficio").est!=="ok" || r("iir_doenca").est!=="ok") return null;
       return {tom:"sim", txt:`Sim: a doença está na lista da lei e o benefício é aposentadoria ou pensão; não precisa estar doente hoje.${r("iir_laudo").est==="provar" ? " Antes de pedir, peça ao serviço público um laudo com a data do diagnóstico: sem ela, a isenção começa só no mês do laudo." : ""}${r("iir_restituicao").est==="risco" ? " O imposto já descontado se pede de volta à parte, e o prazo corre." : ""}`}; },
     // F235 · quanto o INSS desconta hoje (o extrato) mostra quanto vale pedir já; e por que o desconto parou em 2026
     agora: x=>{ const ds = (x.fd.extratos||[]).map(e=>descontoDoExtrato(e)).find(Boolean);
       return ["Pedir a isenção no Meu INSS (Solicitar Isenção de Imposto de Renda), com o laudo do serviço público.",
         ...(ds && ds.atual ? [`Hoje o INSS desconta cerca de ${moedaBR(ds.valor)} por mês (o crédito líquido fica abaixo da renda, pelo extrato): cada mês de espera é mais imposto descontado.`]
           : ds ? [`O desconto parou em ${ds.parou}: desde 2026 o imposto mensal zera para rendimento tributável de até R$ 5.000 (Lei 9.250/95, art. 3º-A, red. Lei 15.270/2025). Os reajustes podem trazê-lo de volta: peça a isenção mesmo assim.`] : []),
         "Guardar os informes de rendimentos e as declarações dos últimos 5 anos: são a base da devolução."]; }});

  // ── regularização de contribuições (GPS) ────────────────────────────────
  const _gpsUlt = x => (x.gr && x.gr.ultima) || ""; // "MM/AAAA"
  // F235 · os atrasados que ainda se podem pagar (facultativo na graça), o carnê de 5 % sem validação e a conta em datas
  const _gpsPagaveis = x => { const gr = x.gr || {}; return _gpsFac(x)==="fac" && !gr.vencida && gr.mantidaAte ? _gpsAtrasados(x) : []; };
  const _gpsFbr = x => _vincs(x).filter(w=>w.ind.some(i=>/^PREC-FBR/.test(i)));
  const _gpsFbrMeses = x => _gpsFbr(x).reduce((n, w)=>n + mesesEntreYm(ymDe(w.de), ymDe(w.ate)), 0);
  const _gpsIni = x => { const ult = ((x.ct||{}).periodos||[]).map(p=>p[1]).sort().pop(); return ult && ult < ymDe(x.hoje) ? ymDe(x.hoje) : ymDe(somarMeses(x.hoje, 1)); };
  const _gpsCompAtual = x => _gpsIni(x).split("-").reverse().join("/");
  // o vencimento do carnê: dia 15 do mês seguinte, e o dia útil depois quando não há banco (Lei 8.212/91, art. 30, II e § 2º, I)
  const _gpsVenc = x => proxDiaUtil(`${ymDe(somarMeses(_gpsIni(x)+"-01", 1))}-15`);
  const _gpsBase = (x, semAtr, semFbr) => (x.ct||{}).carencia + (semAtr ? 0 : _gpsPagaveis(x).length) - (semFbr ? _gpsFbrMeses(x) : 0);
  const _gps180 = (x, semAtr, semFbr) => { const n = _gpsBase(x, semAtr, semFbr); return n >= 180 ? "já cumprida" : ymDe(somarMeses(_gpsIni(x)+"-01", 180 - n - 1)).split("-").reverse().join("/"); };
  // a data provável da aposentadoria por idade pelo caminho que o serviço propõe: os atrasados que ainda se podem pagar,
  // a diferença do 5 % sem validação e o carnê em dia (car_cumprida leva a carência de hoje com eles; a projeção soma o resto)
  const _gpsQuando = (x, semAtr, semFbr) => { const q = (REQ_EXTRA.idade||{}).quando, n0 = (x.ct||{}).carencia; if(!q || n0==null) return null;
    const n = _gpsBase(x, semAtr, semFbr);
    try{ return q(ctxComV(x, {apo_segue:"Sim", ...(n!==n0 ? {car_cumprida:String(n)} : {})})); }catch(e){ return null; } };
  const _gpsFaixa = l => l.length===1 ? l[0] : `${l[0]} a ${l[l.length-1]}`;
  const _gpsFac = x => { const w = _vincs(x).filter(w=>/facultativ|individual/i.test(w.v.tipo||"")).sort((a, b)=>a.ate < b.ate ? -1 : 1).pop(); return w ? (/facultativ/i.test(w.v.tipo) ? "fac" : "ci") : ""; };
  const _gpsAtrasados = x => { const u = _gpsUlt(x); if(!/^\d{2}\/\d{4}$/.test(u)) return [];
    const out = []; let k = somarMeses(`${chaveComp(u)}-01`, 1).slice(0,7); const lim = somarMeses(`${x.hoje.slice(0,7)}-01`, -1).slice(0,7);
    for(let n = 0; k <= lim && n < 120; n++){ out.push(k.split("-").reverse().join("/")); k = somarMeses(`${k}-01`, 1).slice(0,7); }
    return out; };
  registrarReq("GPS", [
    {id:"gps_categoria", rot:"Como a pessoa paga o INSS?", base:"Lei 8.212/91, art. 21; IN 128/2022, art. 107", conf:"conferido", campos:[],
     mede:x=>{ const w = _vincs(x).filter(w=>/facultativ|individual|MEI/i.test(w.v.tipo||"") || w.ind.some(i=>/LC123|MEI|FBR/.test(i))).sort((a, b)=>a.ate < b.ate ? -1 : 1).pop();
       if(!w) return {est:"informar", txt:"o CNIS não mostra carnê: informe se paga como facultativo, autônomo ou MEI"};
       const al = w.ind.some(i=>/FBR/.test(i)) ? "5 % (baixa renda)" : w.ind.some(i=>/LC123/.test(i)) ? "11 % (plano simplificado)" : w.ind.some(i=>/MEI/.test(i)) ? "5 % (MEI)" : "20 %";
       return {est:"ok", txt:`${String(w.v.tipo||"").toLowerCase()}, alíquota de ${al}; último mês pago ${_gpsUlt(x) || "não lido"}`, fonte:"CNIS"}; }},
    {id:"gps_atraso", rot:"Pode pagar os meses atrasados? Até quando?", base:"Decreto 3.048/99, art. 11, § 4º; IN 128/2022, arts. 103, II, e 107, § 1º; Lei 8.213/91, art. 27, II", conf:"conferido", campos:[],
     mede:x=>{ const at = _gpsAtrasados(x), cat = _gpsFac(x), gr = x.gr || {};
       if(!at.length) return {est:"ok", txt:"está em dia: não há mês atrasado", fonte:"CNIS"};
       const faixa = at.length===1 ? at[0] : `${at[0]} a ${at[at.length-1]}`;
       if(cat==="fac" && gr.vencida) return {est:"impedido", txt:`não pode pagar ${faixa}: perdeu a cobertura em ${fmtBarra(gr.perda)}, e o facultativo só paga atrasado enquanto está coberto. Não emita guia desses meses; pode voltar a pagar a partir de agora`, fonte:"CNIS"};
       if(cat==="fac" && gr.mantidaAte) return {est:"risco", txt:`prazo correndo: pode pagar ${faixa}, com juros e multa, até ${fmtBarra(gr.mantidaAte)}; depois disso não pode mais. Esses meses contam para a carência, porque não houve perda`, fonte:"CNIS", quando:gr.mantidaAte};
       if(cat==="ci") return {est:"info", txt:`${faixa}: o autônomo paga o atrasado com prova da atividade (indenização); se houve perda da qualidade, o atraso não conta para a carência`, fonte:"CNIS"};
       return {est:"informar", txt:`${faixa} sem pagamento: informe a categoria (facultativo ou autônomo), que decide se pode pagar`}; }},
    {id:"gps_5pc", rot:"O carnê de 5 % foi validado?", base:"IN 128/2022, arts. 103, V, e 107, § 2º, XIV", conf:"divergente", campos:[],
     mede:x=>{ const ws = _vincs(x).filter(w=>w.ind.some(i=>/^PREC-FBR/.test(i)));
       if(!ws.length) return {est:"info", txt:"nenhum mês de 5 % pendente de validação no CNIS", fonte:"CNIS"};
       const ms = ws.reduce((n, w)=>n + mesesEntreYm(ymDe(w.de), ymDe(w.ate)), 0);
       return {est:"divergente", txt:`${plu(ms, "mês", "meses")} de 5 % sem validação (${ws.map(w=>`${fmtBarra(w.de)} a ${fmtBarra(w.ate)}`).join("; ")}): não contam para a carência até o acerto`, fonte:"CNIS",
         div:{inss:"pagar a diferença até 11 % (IN 128, art. 103, V)", judicial:"atualizar o CadÚnico antes da exclusão e pedir a validação retroativa (Tema 285 TNU, conferir)"}}; }},
    // F235 · o carnê de 5 % só vale com o CadÚnico em dia: o vencido explica os meses sem validação e trava o 5 % de agora
    {id:"gps_cadunico", rot:"O CadÚnico está atualizado para o carnê de 5 %?", base:"Lei 8.212/91, art. 21, § 4º; IN 128/2022, art. 107, § 2º, XIV, b e d", conf:"conferido", campos:[],
     mede:x=>{ const fbr = _vincs(x).some(w=>w.ind.some(i=>/FBR/.test(i))); if(!fbr) return {est:"info", txt:"não paga o carnê de 5 %"};
       const at = (x.cad||{}).atualizada_em, iso = at ? (isoBr(at) || String(at).slice(0,10)) : null, venceu = iso && somarMeses(iso, 24) < x.hoje;
       if(iso && !venceu) return {est:"ok", fonte:"CadÚnico", txt:`atualizado em ${fmtBarra(iso)}, dentro dos 24 meses`};
       return {est:"informar", fonte: iso ? "CadÚnico" : "", txt:`${iso ? `atualizado em ${fmtBarra(iso)}, passou de 24 meses` : "o dossiê não trouxe a ficha"}: atualize no CRAS antes de voltar a pagar 5 % e traga a folha resumo do CadÚnico atualizada`}; }},
    {id:"gps_11pc", rot:"O carnê de 11 % precisa de complemento?", base:"Lei 8.212/91, art. 21, §§ 2º e 3º; Lei 8.213/91, art. 55, § 4º", conf:"conferido", campos:[],
     mede:x=>_vincs(x).some(w=>w.ind.some(i=>/LC123/.test(i))) ? {est:"info", txt:"vale para a aposentadoria por idade; para a por tempo de contribuição e para a certidão, só complementado até 20 %", fonte:"CNIS"}
       : {est:"info", txt:"sem carnê de 11 % no CNIS"}},
    {id:"gps_valor", rot:"Quanto custa por mês?", base:"Lei 8.212/91, arts. 21 e 30, II; Portaria Interministerial MPS/MF 13/2026", conf:"conferido", campos:[],
     mede:x=>{ const sm = smEm(x.hoje), r = v => `R$ ${(sm*v).toLocaleString("pt-BR", {minimumFractionDigits:2, maximumFractionDigits:2})}`;
       return {est:"info", txt:`sobre o salário mínimo de hoje: 5 % = ${r(0.05)}, 11 % = ${r(0.11)}, 20 % = ${r(0.20)}; vence no dia 15 do mês seguinte`}; }},
    {id:"gps_efeito", rot:"O que muda na aposentadoria?", base:"Lei 8.213/91, art. 25, II", conf:"conferido", campos:[],
     // F235 · a conta em datas: a 180ª com e sem os atrasados (ou a diferença do 5 %), e a data provável pela idade; nunca "pagando os atrasados" que não se podem pagar
     mede:x=>{ if(!x.ct) return {est:"informar", txt:"o CNIS não foi lido"};
       const n = x.ct.carencia, at = _gpsPagaveis(x).length, fbr = _gpsFbrMeses(x), d = _gpsQuando(x), ps = [];
       ps.push(`hoje ${n} contribuições para a carência${fbr ? `, ${fbr} delas de 5 % sem validação, que só contam pagando a diferença (valem hoje ${n - fbr})` : ""}`);
       if(n + at < 180 || fbr){ const sem = at ? _gps180(x, true, false) : fbr ? _gps180(x, false, true) : null;
         ps.push(`${at ? `pagando os ${plu(at, "mês atrasado", "meses atrasados")} e ` : fbr ? "pagando a diferença e " : ""}seguindo em dia, a 180ª é a competência ${_gps180(x, false, false)}${sem ? `; sem ${at ? "os atrasados" : "a diferença"}, a ${sem}` : ""}`); }
       else ps.push("as 180 estão cumpridas");
       if(d) ps.push(`com a idade, a data provável da aposentadoria por idade é ${fmtBarra(d)}`);
       return {est:"info", txt:ps.join("; "), fonte:"CNIS"}; }},
  ], {}, {resumo:"Põe as contribuições em ordem: o que ainda dá para pagar atrasado, até quando, o que precisa complementar e quanto custa.",
     // F235 · a data provável pelo caminho que o serviço propõe (os atrasados que ainda se podem pagar, a diferença do 5 % e o carnê em dia)
     quando: x=>_gpsQuando(x),
     veredito: (x, a)=>{ const r = a.rs.find(r=>r.id==="gps_atraso"), fbr = _gpsFbrMeses(x), d = _gpsQuando(x);
       if(r && r.est==="impedido") return {tom:"ainda", txt:`Não pode pagar os meses atrasados: ${r.txt.replace(/^não pode pagar\s*/i, "")}. O que dá para fazer: ${fbr ? `pagar a diferença dos ${fbr} meses de 5 % e ` : ""}voltar a pagar em dia${d ? `; assim, a aposentadoria por idade vem em ${fmtBarra(d)}` : ""}. A perda da qualidade não impede a aposentadoria por idade (Lei 10.666/2003, art. 3º, § 1º).`};
       if(r && r.est==="risco") return {tom:"sim", txt:`Pode regularizar já: ${r.txt.replace(/^prazo correndo:\s*/i, "")}${d ? `. Com eles e o carnê em dia, a aposentadoria por idade vem em ${fmtBarra(d)}` : ""}.`};
       return null; },
     agora: x=>{ const at = _gpsPagaveis(x), todos = _gpsAtrasados(x), gr = x.gr || {}, fbr = _gpsFbr(x), out = [];
       if(at.length) out.push(`Emitir no Meu INSS (SAL) as guias de ${_gpsFaixa(at)} e pagar até ${fmtBarra(gr.mantidaAte)}: depois disso não se pode mais.`);
       else if(todos.length && _gpsFac(x)==="fac" && gr.vencida) out.push(`Não emitir guia de ${_gpsFaixa(todos)}: sem a cobertura, a facultativa não paga atrasado, e a guia paga não conta.`);
       if(fbr.length) out.push(`Pedir ao INSS o cálculo da diferença dos ${plu(_gpsFbrMeses(x), "mês", "meses")} de 5 % (${fbr.map(w=>`${fmtBarra(w.de).slice(3)} a ${fmtBarra(w.ate).slice(3)}`).join("; ")}) e pagar: sem ela, esses meses não contam (IN 128, art. 103, V).`,
         "Atualizar o CadÚnico no CRAS antes de voltar a pagar o carnê de 5 %: sem o cadastro em dia, o 5 % não é validado.");
       const v = _gpsVenc(x);
       out.push(`Pagar a competência ${_gpsCompAtual(x)} até ${fmtBarra(v)}${v.slice(8)!=="15" ? " (o dia 15 cai em fim de semana)" : ""} e, depois, todo dia 15, sem parar.`);
       const d = _gpsQuando(x); if(d && d > x.hoje) out.push(`Enviar a Aposentadorias futuras com a data provável de ${fmtBarra(d)}.`);
       return out; },
     // F235 · o desfecho do serviço: o que se faz agora e Aposentadorias futuras com a data provável (antes: "arquive", ou um caso sem objeto)
     desfecho: (x, a)=>{ const d = _gpsQuando(x); if(!d || d <= x.hoje) return null;
       const at = _gpsPagaveis(x), fbr = _gpsFbrMeses(x), gr = x.gr || {}, antes = [];
       if(at.length) antes.push(`emitir no SAL as guias de ${_gpsFaixa(at)} e pagar até ${fmtBarra(gr.mantidaAte)}`);
       if(fbr) antes.push(`pedir ao INSS o cálculo da diferença dos ${fbr} meses de 5 % e atualizar o CadÚnico no CRAS`);
       antes.push(`pagar em dia (a competência ${_gpsCompAtual(x)} vence em ${fmtBarra(_gpsVenc(x))})`);
       const sem = at.length ? `sem os ${plu(at.length, "mês atrasado", "meses atrasados")}, as 180 só fecham na competência ${_gps180(x, true, false)}` : fbr ? `sem a diferença, a 180ª só na competência ${_gps180(x, false, true)}` : "";
       return {acao:"lembrete", data:d, txt:`agora, ${antes.join("; ")}. Depois, envie a Aposentadorias futuras: direito provável em ${fmtBarra(d)}${sem ? `; ${sem}` : ""}${gr.vencida ? "; a perda da qualidade não impede a aposentadoria por idade" : ""}`}; }});

  // ── pensão por morte acidentária (B93): a lista da pensão, sem a acumulação genérica, mais o acidente ─
  const _b93Causa = x => { const c = (x.cert||[]).find(c=>c.obito); return c ? c.causa || "" : ""; };
  // F235 · a pensão deste óbito que já saiu (DIB no óbito): o pedido é a revisão dela, com a troca de espécie
  const _b93Mesma = x => { const f = x.v.dep_fato; if(!f) return null;
    return (x.benefCnis||[]).find(b=>/^(21|93)$/.test(b.especie) && b.de && Math.abs(Date.parse(b.de) - Date.parse(f)) <= 40*864e5) || null; };
  window.b93MesmaDe = _b93Mesma;
  const _b93Trajeto = x => !!x.c && /voltando do (?:servi[çc]o|trabalho)|indo para o (?:servi[çc]o|trabalho)|a caminho do (?:servi[çc]o|trabalho)|no (?:caminho|trajeto) (?:de casa|para o|do)/i.test(relatoDe(x.c));
  const _b93Filhos = x => { const f = x.v.dep_fato; return f && typeof depFilhosX==="function" ? depFilhosX(x).filter(k=>{ const id = k.nasc ? idadeEm(k.nasc, f) : k.idadeFato; return id!=null && id < 21; }) : []; };
  // F235 · na revisão o prazo de 90 dias não se aplica, e a cota cortada pela regra dos 4 meses volta (morte por acidente)
  const _b93Base = (REQ_BENEF.morte||[]).map(r=>
    r.id==="prazo_requerimento" ? {...r, mede:x=>{ const b = _b93Mesma(x);
      return b ? {est:"info", txt:`a pensão deste óbito já foi pedida e sai desde ${fmtBarra(b.de)} (B${b.especie}${b.nb ? `, NB ${b.nb}` : ""}): o prazo de 90 dias não se aplica à revisão, que tem 10 anos do primeiro pagamento`, fonte:"CNIS"} : r.mede(x); }}
    : r.id==="duracao_cota_conjuge" ? {...r, mede:x=>{ const m = r.mede(x), corte = x.c ? cotaCortadaDe(x.c) : null;
      if(!corte || !m.quando || m.quando <= corte.ate) return m;
      return {...m, est:"risco", txt:`a parte de quem pede foi cortada em ${fmtBarra(corte.ate)} pela regra dos 4 meses (${corte.rot}); na morte por acidente essa regra não vale (Lei 8.213, art. 77, § 2º-A): ${m.txt.replace(/;\s*o acidente[^;]*$/, "")}; cabe a revisão, com a volta da parte dela e as diferenças desde ${fmtBarra(diaSeguinte(corte.ate))}`}; }}
    : r);
  registrarReq("B93", [
    ..._b93Base,
    {id:"b93_acidente", rot:"A morte foi acidente do trabalho, no caminho do serviço ou doença do trabalho?", base:"Lei 8.213/91, arts. 19, 20 e 21, IV, d", conf:"conferido", campos:["aci_tipo"],
     mede:x=>{ const cat = (x.fd.cats||[])[0], causa = _b93Causa(x);
       if(cat) return {est:"ok", txt:`CAT ${cat.numero || ""} de ${cat.data || "data não lida"}: a morte está ligada ao trabalho`, fonte:"CAT"};
       // F235 · a CAT em papel que a família trouxe (cópia da empresa) também liga a morte ao trabalho
       const cp = x.c ? catDoDossie(x.c) : null;
       if(cp && cp.data) return {est:"ok", txt:`CAT da empresa (${cp.rot}): acidente ${cp.tipo ? cp.tipo.toLowerCase() : "do trabalho"} em ${fmtBarra(cp.data)}${cp.registro ? `, registrada em ${fmtBarra(cp.registro)}` : ""}: a morte está ligada ao trabalho`, fonte:"CAT"};
       if(/T[íi]pico|Trajeto|Doen[çc]a profissional/.test(x.v.aci_tipo||"")) return {est:"ok", txt:`${x.v.aci_tipo}: acidente do trabalho`, fonte:"campo"};
       // F235 · "voltando do serviço" no relato: é o acidente de trajeto, equiparado ao do trabalho
       if(_b93Trajeto(x)) return {est:"provar", txt:`pelo relato, ele ia para o serviço ou voltava dele: é acidente do trabalho por equiparação (Lei 8.213, art. 21, IV, d)${causa ? `; a certidão de óbito dá: ${causa}` : ""}. Sem a CAT da empresa, a família faz a CAT no Meu INSS (art. 22, § 2º), com o boletim de ocorrência e o laudo do IML`, fonte:"relato da recepção"};
       if(/acidente|queda|tr[âa]nsito|motocicleta/i.test(causa)) return {est:"provar", txt:`a certidão de óbito dá: ${causa}. Confirme se foi no trabalho ou no caminho de casa para o serviço (trajeto); sem CAT, a família pode fazê-la (art. 22, § 2º)`, fonte:"certidão de óbito"};
       return {est:"informar", txt:"informe como foi a morte: no trabalho, no caminho do serviço ou por doença do trabalho"}; }},
    {id:"b93_categoria", rot:"O falecido era empregado, doméstico, avulso ou segurado especial?", base:"Lei 8.213/91, art. 18, § 1º", conf:"conferido", campos:["aci_categoria"],
     mede:x=>{ if(x.v.aci_categoria) return {est: /Contribuinte individual|Facultativo/.test(x.v.aci_categoria) ? "risco" : "ok", txt: /Contribuinte individual|Facultativo/.test(x.v.aci_categoria) ? `${x.v.aci_categoria}: não tem a espécie acidentária; a pensão é a comum (B21)` : `${x.v.aci_categoria} no dia da morte`, fonte:"campo"};
       // F235 · a CAT diz o empregador e a admissão; o relato, "registrado" ou "com carteira"
       const cp = x.c ? catDoDossie(x.c) : null;
       if(cp && (cp.admissao || /empregador/i.test(cp.emitente))) return {est:"ok", txt:`empregado${cp.empregador ? ` de ${tituloOrgao(cp.empregador)}` : ""}${cp.admissao ? ` desde ${fmtBarra(cp.admissao)}` : ""}, pela CAT: tem a espécie acidentária`, fonte:"CAT"};
       if(x.c && /registrad[oa]|com carteira/i.test(relatoDe(x.c))) return {est:"ok", txt:"empregado com carteira, pelo relato: tem a espécie acidentária; confira o vínculo no CNIS dele", fonte:"relato da recepção"};
       return {est:"informar", txt:"informe a categoria do falecido no dia (o CNIS dele não vem no dossiê do dependente)"}; }},
    {id:"b93_cota", rot:"A cota do cônjuge escapa da regra dos 4 meses?", base:"Lei 8.213/91, art. 77, § 2º-A", conf:"conferido", campos:[],
     mede:x=>({est:"info", txt:"sim: na morte por acidente de qualquer natureza ou doença do trabalho, a cota não cai nos 4 meses, mesmo sem 18 contribuições ou 2 anos de união; vale a tabela pela idade no óbito"})},
    // F235 · o valor pelo número de dependentes, e a conta com o salário do relato: B93 (100 % da média) contra B21 (60 %)
    {id:"b93_valor", rot:"Quanto paga?", base:"EC 103/2019, arts. 23, caput, e 26, §§ 2º, III, e 3º, II", conf:"conferido", campos:[],
     mede:x=>{ const sal = (typeof relatoDepDe==="function" ? relatoDepDe(x) : {}).sal, fs = _b93Filhos(x);
       const n = (/^(Cônjuge|Companheiro|Ex-cônjuge)/.test(x.v.dep_classe||"") ? 1 : 0) + fs.length, pc = Math.min(100, 50 + 10*Math.max(1, n));
       const base = `${pc} % (50 % mais 10 % por dependente${n ? `; aqui, ${n} ${n===1 ? "dependente" : "dependentes"}` : ""}) da aposentadoria por incapacidade a que o falecido teria direito: na acidentária (B93), essa base é 100 % da média dos salários; na comum (B21), 60 % (mais 2 % por ano acima de 20 anos de contribuição)`;
       if(!sal) return {est:"info", txt:`${base}; nunca abaixo do salário mínimo`};
       const b93 = sal*pc/100, b21 = sal*0.6*pc/100, sm = smEm(x.der);
       return {est:"info", txt:`${base}. Com a média de ${moedaBR(sal)} do relato (confira no CNIS dele): B93 ${moedaBR(Math.max(b93, sm))}; B21 ${moedaBR(b21)}${b21 < sm ? `, que sobe ao mínimo (${moedaBR(sm)})` : ""}`, fonte:"relato da recepção"}; }},
    {id:"b93_foro", rot:"Se for à Justiça, qual?", base:"CF, art. 109, I (as causas de acidente do trabalho ficam fora da Justiça Federal)", conf:"conferido", campos:[],
     mede:x=>({est:"info", txt:"a ação acidentária vai à Justiça Estadual; a cota da pensão comum por acidente vai à Justiça Federal. Decisão do advogado"})},
    // F235 · a pensão que já saiu como comum: revisão com troca de espécie, o prazo do recurso e o da revisão
    {id:"b93_revisao", rot:"A pensão deste óbito já saiu como comum (B21)?", base:"Lei 8.213/91, arts. 21, IV, d, 77, § 2º-A, e 103; EC 103/2019, art. 26, § 3º, II", conf:"conferido", campos:[],
     mede:x=>{ const b = _b93Mesma(x); if(!b) return {est:"info", txt:"não: nenhuma pensão deste óbito no CNIS; o pedido é a pensão por acidente do trabalho (B93)"};
       const p = (x.fd.processos||[]).find(p=>b.nb && soDig(p.nb||"")===soDig(b.nb)), dec = p && p.atualizado ? isoBr(p.atualizado) : null, rec = dec ? somaDias(dec, 30) : null;
       const corte = x.c ? cotaCortadaDe(x.c) : null;
       return {est:"info", txt:`sim: B${b.especie}${b.nb ? ` (NB ${b.nb})` : ""} desde ${fmtBarra(b.de)}. O pedido é a revisão com a troca para B93 (base de 100 % da média, em vez de 60 %, e sem a regra dos 4 meses)${corte ? `, com a volta da parte de quem pede, cortada em ${fmtBarra(corte.ate)}` : ""}; ${rec ? (rec < x.hoje ? `o recurso de 30 dias contra a concessão acabou em ${fmtBarra(rec)}, mas a revisão cabe em até 10 anos do primeiro pagamento` : `ainda dá para recorrer até ${fmtBarra(rec)} (30 dias da decisão; conferir a data da ciência)`) : "a revisão cabe em até 10 anos do primeiro pagamento"}; antes, a família faz a CAT (art. 22, § 2º)`, fonte:"CNIS"}; }},
  ], {}, {resumo:"É a pensão por morte quando a morte vem de acidente do trabalho, de trajeto ou de doença do trabalho: sem a regra dos 4 meses para o cônjuge e com base de cálculo maior.",
     quando:x=>null,
     // F235 · a B21 deste óbito já concedida: a resposta é revisão, nunca pensão nova
     veredito:(x, a)=>{ const b = _b93Mesma(x); if(!b) return null; const corte = x.c ? cotaCortadaDe(x.c) : null;
       return {tom:"sim", txt:`Cabe a revisão, não uma pensão nova: a pensão deste óbito já sai como B${b.especie}${b.nb ? ` (NB ${b.nb})` : ""}. Peça a troca para a pensão por acidente do trabalho (B93)${corte ? ` e a volta da parte de quem pede, cortada em ${fmtBarra(corte.ate)}` : ""}.`}; },
     desfecho:(x, a)=>{ const b = _b93Mesma(x); if(!b) return null; const corte = x.c ? cotaCortadaDe(x.c) : null;
       const txt = `a B${b.especie}${b.nb ? ` (NB ${b.nb})` : ""} deste óbito já foi concedida: o pedido é a revisão, com a troca para B93${corte ? " e a volta da parte de quem pede" : ""}, juntando a CAT feita pela família, o boletim de ocorrência e o laudo do IML`;
       return (x.ops||[]).some(o=>o.o==="rev") ? {acao:"", txt:`não peça pensão nova: ${txt} (veja a linha da revisão)`} : {acao:"caso", txt:`gere o caso de revisão: ${txt}`}; },
     agora: x=>{ const b = _b93Mesma(x), cp = x.c ? catDoDossie(x.c) : null, f = x.v.dep_fato;
       if(b){ const corte = x.c ? cotaCortadaDe(x.c) : null;
         return [cp ? "Junte a CAT que já existe." : "Fazer agora a CAT pela família, no Meu INSS: a empresa não fez (Lei 8.213, art. 22, § 2º); junte o boletim de ocorrência e o laudo do IML.",
           `Pedir ao INSS a revisão da pensão${b.nb ? ` (NB ${b.nb})` : ""} com a troca para B93${corte ? ` e a volta da parte de quem pede, cortada em ${fmtBarra(corte.ate)}` : ""}: cabe em até 10 anos do primeiro pagamento.`]; }
       const fs = _b93Filhos(x);
       return [cp ? "Juntar a CAT da empresa, o boletim de ocorrência, o laudo do IML e a certidão de óbito com a causa." : "Se a empresa não fez a CAT, a família faz no Meu INSS (art. 22, § 2º); junte o boletim de ocorrência e o laudo do IML.",
         ...(fs.length && f ? [`Pedir no mesmo pedido a parte de ${fs.map(k=>k.curto || fraseClinica(k.nome).split(" ")[0]).join(" e ")}, antes de ${fmtBarra(somaDias(f, 90))}, quando vence o prazo de quem pede.`] : []),
         "Se a pensão já saiu como comum (B21), o pedido é revisão com troca para B93, não uma pensão nova."]; }});

  // ── restabelecimento: a lista do auxílio, com a frase do restabelecimento ─
  registrarReq("REST", [...(REQ_BENEF.b31 || []), ...((REQ_EXTRA.b31||{}).soREST || [])], {}, {...(REQ_EXTRA.b31||{}),
    resumo:"Devolve o auxílio cortado: o recurso e a ação devolvem desde o corte; o pedido novo pela mesma doença, com a nova DIB até 60 dias do corte, restabelece o benefício anterior (IN 128, art. 347)."});

  // ── cópia do processo ───────────────────────────────────────────────────
  registrarReq("COPIA", [
    {id:"copia_quem", rot:"Quem pede é o titular, ou tem procuração dele?", base:"IN 128/2022, art. 602, caput e §§ 2º e 4º", conf:"conferido", campos:["copia_quem"],
     mede:x=>{ const q = x.v.copia_quem || "";
       // F235 · quem veio sem procuração não recebe nada, mas o serviço segue: o titular assina a procuração (o prazo não espera)
       if(/sem procura/i.test(q)) return {est:"risco", txt:"a cópia e os dados do processo são só do titular ou do advogado com procuração dele (IN 128, art. 602, § 2º): não entregue nada a quem veio e não solicite a senha do gov.br do titular; o titular assina a procuração em casa", fonte: x.preUsado && x.preUsado.copia_quem ? "dossiê" : "campo"};
       return q ? {est:"ok", txt:q.toLowerCase(), fonte:"campo"} : {est:"informar", txt:"informe quem pede: o titular, o advogado com procuração ou outra pessoa"}; }},
    {id:"copia_dossie", rot:"A cópia já está no dossiê?", base:"IN 128/2022, art. 602", conf:"conferido", campos:[],
     mede:x=>{ const ps = x.fd.processos || [];
       // F235 · os laudos do INSS vêm junto da cópia; quem baixou foi o próprio titular, com o gov.br dele
       // F235 · sem "peça", "baixe" ou "traga" nestas frases: o quadro "Pedir ao cliente" de Documentos as cortava no ponto do gov.br e trocava o sentido
       const ls = (x.fd.laudos||[]).filter(l=>l.exame).sort((a, b)=>isoBr(a.exame) < isoBr(b.exame) ? -1 : 1);
       if(ps.length) return {est:"ok", txt:`sim: ${ps.map(p=>`${p.servico || "pedido"}${p.protocolo ? ` (protocolo ${p.protocolo})` : ""}${p.entrada ? `, de ${p.entrada}` : ""}`).join("; ")}${ls.length ? `; e ${plu(ls.length, "laudo do INSS", "laudos do INSS")} (${ls.length===1 ? "perícia" : "perícias"} de ${ls.map(l=>l.exame).join(" e ")})` : ""}; baixados com o gov.br do titular: entregue a ele, sem procuração`, fonte:"dossiê"};
       const bronze = /bronze/i.test(relatoDe(x.c));
       return {est:"informar", txt:`${bronze ? "o gov.br bronze não abre tudo no Meu INSS: com o do titular em prata ou ouro, a cópia digital sai pela extensão Dossiê" : "com o gov.br prata ou ouro do titular, a cópia digital sai pela extensão Dossiê"}; sem canal remoto, a cópia sai na agência, com a declaração de que não consegue usar os canais remotos (IN 128, art. 602, § 1º) e a procuração`}; }},
    {id:"copia_decisao", rot:"Que decisão a cópia vai mostrar? (o pedido, a data e o motivo)", base:"IN 128/2022, art. 602; Regimento do CRPS, art. 80, § 1º", conf:"conferido", campos:["copia_decisao"],
     mede:x=>{ const pc = (x.fd.processos||[]).filter(p=>((p.comunicacoes||[]).slice(-1)[0]||{}).contra).pop(), d = x.v.copia_decisao;
       if(pc){ const c0 = pc.comunicacoes.slice(-1)[0]; return {est:"ok", txt:`${pc.servico || "pedido"}${pc.entrada ? ` de ${pc.entrada}` : ""}: ${String(c0.decisao||"").toLowerCase()}${pc.atualizado ? ` em ${pc.atualizado}` : ""}${c0.motivo ? ` (${c0.motivo})` : ""}`, fonte:"cópia do processo"}; }
       return d ? {est:"ok", txt:d, fonte:"campo"} : {est:"informar", txt:"anote a decisão da carta: o pedido (espécie, NB ou protocolo), a data da decisão e o motivo"}; }},
    {id:"copia_prazo", rot:"Há recurso com prazo correndo?", base:"Regimento do CRPS, arts. 77, 78 e 80, § 1º", conf:"conferido", campos:["copia_ciencia"],
     mede:x=>{ const pz = x.c ? (prazosDoDossie(x.c)||[])[0] : null;
       if(pz) return {est:"risco", txt:`prazo correndo: ${pz.texto} (${faltamTxt(pz.fatal)}); anote já e não espere a cópia`, fonte:"dossiê", quando:pz.fatal};
       if(x.v.copia_ciencia){ const f0 = new Date(Date.parse(x.v.copia_ciencia+"T12:00:00") + 30*864e5).toISOString().slice(0,10), f = typeof proxDiaUtil==="function" ? proxDiaUtil(f0) : f0;
         return f && f >= x.hoje ? {est:"risco", txt:`prazo correndo: recurso ao CRPS até ${fmtBarra(f)} (${faltamTxt(f)}), contado da ciência em ${fmtBarra(x.v.copia_ciencia)}`, fonte:"campo", quando:f}
           : {est:"info", txt:`o prazo de 30 dias da ciência (${fmtBarra(x.v.copia_ciencia)}) já passou`, fonte:"campo"}; }
       return {est:"informar", txt:"informe a data da ciência da decisão (AR, Meu INSS): o recurso conta 30 dias dela"}; }},
    {id:"copia_social", rot:"Há laudo social no processo?", base:"IN 128/2022, art. 602, § 4º", conf:"conferido", campos:[],
     mede:x=>({est:"info", txt:"se houver, a procuração precisa do consentimento expresso para o laudo social"})},
  ], {copia_quem:["Quem pede a cópia", "select", ["","O titular","Advogado com procuração","Familiar ou outra pessoa sem procuração"]], copia_ciencia:["Ciência da decisão (AR, Meu INSS)", "date"],
      copia_decisao:["Decisão da carta (pedido, data e motivo)", "text"]},
    {resumo:"Entrega ao titular a cópia do processo do INSS. O prazo do recurso não espera a cópia.",
     // F235 · a cópia responde o que o balcão precisa: o que já está aqui, a quem entregar, o prazo que corre e a escolha do advogado
     veredito: (x, a) => { const pz = a.rs.find(r=>r.id==="copia_prazo"), quem = a.rs.find(r=>r.id==="copia_quem"), dz = a.rs.find(r=>r.id==="copia_dossie");
       const prazo = pz && pz.est==="risco" ? pz.txt.replace(/^prazo correndo:\s*/i, "") : "", ps = [];
       if(quem && quem.est==="risco") ps.push(`Não entregar nada a quem veio: ${quem.txt.replace(/^a cópia/, "a cópia")}.`);
       if(dz && dz.est==="ok") ps.push(`A cópia já está aqui: ${dz.txt.replace(/^sim:\s*/, "")}.`);
       else if(dz) ps.push(`Para ter a cópia: ${dz.txt}.`);
       if(prazo) ps.push(`O prazo corre: ${prazo}${/anote/.test(prazo) ? "" : "; anote já e não espere a cópia"}.`);
       const neg = (x.fd.processos||[]).filter(p=>((p.comunicacoes||[]).slice(-1)[0]||{}).contra).pop(), mot = neg ? String(((neg.comunicacoes||[]).slice(-1)[0]||{}).motivo||"") : String(x.v.copia_decisao||relatoDe(x.c));
       const med = /incapacidade|per[íi]cia|m[ée]dic/i.test(mot), doc = /an[áa]lise documental/i.test(mot), dd = (String(x.v.copia_decisao||relatoDe(x.c)).match(/negad[oa] em (\d{2}\/\d{2}\/\d{4})/i)||[])[1];
       if(prazo) ps.push(`O advogado escolhe entre o recurso à Junta${med ? " (matéria médica: a Junta decide em definitivo, ouvida a Perícia Médica Federal; Regimento do CRPS, art. 89, § 3º)" : ""} e um pedido novo${doc && indefDocumentaisSeguidos(x) >= 2 ? `, que vai à perícia (presencial ou por telemedicina), e não só com atestado: são dois indeferimentos seguidos por análise documental (Portaria Conjunta 13/2026, art. 8º, com a redação da Portaria Conjunta 54/2026; conferir se o mantido na reanálise e o de ciência anterior a 06/11/2026 entram na conta)` : doc && dd ? ` por análise documental, só a partir de ${fmtBarra(somaDias(isoBr(dd), 30))} (30 dias da decisão; Portaria Conjunta 13/2026, art. 6º, VI, com a redação da Portaria Conjunta 54/2026; conferir se os 30 dias contam da decisão original ou da reanálise)` : ""}${doc && dd && isoBr(dd) >= PC54_DESDE ? `; antes dos dois, a reanálise em 10 dias da ciência, com relatório médico novo, mantém a DER (art. 8º-A)` : ""}.`);
       if(!ps.length) return null;
       return {tom: prazo ? "sim" : "informar", txt:ps.join(" "), ...(prazo ? {desf:{acao:"caso", prazo:true, txt:`gere o caso já: ${prazo.replace(/;\s*anote já e não espere a cópia$/, "")}; anote o prazo e não espere a cópia${quem && quem.est==="risco" ? "; a procuração do titular vem antes de qualquer entrega" : ""}`}} : {})}; },
     agora: (x, a) => { const out = [], quem = a.rs.find(r=>r.id==="copia_quem"), dz = a.rs.find(r=>r.id==="copia_dossie"), pz = a.rs.find(r=>r.id==="copia_prazo");
       if(pz && pz.est==="risco") out.push(`Anotar o prazo na agenda: ${pz.txt.replace(/^prazo correndo:\s*/i, "")}.`);
       if(quem && quem.est==="risco") out.push("Gerar só a procuração do titular para o escritório; ele assina em casa, e quem veio leva e traz. Não entregar cópia nem detalhe do processo antes disso.");
       else if(dz && dz.est==="ok") out.push("Entregar a cópia e os laudos ao próprio titular, que tem o gov.br: não precisa de procuração.");
       if(dz && dz.est!=="ok") out.push(dz.txt.charAt(0).toUpperCase() + dz.txt.slice(1) + ".");
       out.push("Passar ao advogado a escolha entre o recurso e um pedido novo.");
       return out; }});
  // F235 · quem pede a cópia e a decisão da carta saem do relato da recepção
  Object.assign(PRE_DOSSIE, {
    copia_quem: x => { if(x.op!=="COPIA" || !x.c) return null;
      if(terceiroSemProcuracao(x.c)) return {val:"Familiar ou outra pessoa sem procuração", fonte:"relato da recepção"};
      return /\b(ele|ela) mesm[oa]\b|\bo pr[óo]prio\b|\ba pr[óo]pria\b|\bo titular\b/i.test(relatoDe(x.c)) ? {val:"O titular", fonte:"relato da recepção"} : null; },
    copia_decisao: x => { if(x.op!=="COPIA" || !x.c) return null;
      const m = relatoDe(x.c).match(/pedido de (\d{2}\/\d{2}\/\d{4}),?\s*negad[oa] em (\d{2}\/\d{2}\/\d{4})(?:\s*por ([^,;]+?(?:\([^)]*\))?))?(?=[,;.]|$)/i);
      return m ? {val:`pedido de ${m[1]}, negado em ${m[2]}${m[3] ? ` por ${m[3].trim()}` : ""}`, fonte:"relato da recepção (carta do INSS)"} : null; },
  });

  // ── justificação administrativa ─────────────────────────────────────────
  registrarReq("JA", [
    {id:"ja_fato", rot:"Que fato a justificação vai provar?", base:"Decreto 3.048/99, art. 142; IN 128/2022, art. 570", conf:"conferido", campos:["ja_fato","ja_periodo"],
     mede:x=>x.v.ja_fato ? {est:"ok", txt:`${x.v.ja_fato}${x.v.ja_periodo ? `: ${x.v.ja_periodo}` : ""}`, fonte:"campo"} : {est:"informar", txt:"informe o fato e o período que as testemunhas vão confirmar"}},
    {id:"ja_prova_material", rot:"Há documento da época que dê início de prova?", base:"Lei 8.213/91, art. 55, § 3º; IN 128/2022, art. 571, III e IV; Decreto 3.048/99, art. 22, § 14", conf:"conferido", campos:[],
     mede:x=>{
       // F235 · o emprego dos papéis da época (marco inicial e final) e os papéis da união com a janela dos 24 meses
       const pe = x.c ? empregosDosPapeis(x.c.id)[0] : null;
       if(pe) return {est:"ok", txt:`${pe.docs}: marcam o começo e o fim do emprego em ${pe.onde}, de ${fmtBarra(pe.de)} a ${fmtBarra(pe.ate)} (${plu(pe.meses, "mês", "meses")}); são o marco inicial e o final (IN 128, art. 571, III)`, fonte:"papéis trazidos"};
       const u = x.c && _opDep(x, /^(morte|B93|reclusao)$/) ? provasDaUniao(x.c) : null;
       if(u && u.docs.length) return {est: u.n24 ? "ok" : "falta", txt:`${plu(u.docs.length, "documento da união", "documentos da união")} (${u.docs.map(d=>`${d.rot}${d.iso ? `, de ${fmtBarra(d.iso)}` : ""}`).join("; ")}); ${u.n24===1 ? `só 1 é dos 24 meses antes do óbito (${fmtBarra(u.ini24)} a ${fmtBarra(u.obito)}): a justificação administrativa supre esse período (Decreto 3.048, art. 22, § 14)` : u.n24 ? `${u.n24} são dos 24 meses antes do óbito` : `nenhum é dos 24 meses antes do óbito (${fmtBarra(u.ini24)} a ${fmtBarra(u.obito)}): falta ao menos um desse período`}`, fonte:"papéis trazidos"};
       const ds = (x.c ? docsDoDossie(x.c.id) : []).filter(a=>/trazid|Declaracao/i.test(a.nome||"") && !/Dados cadastrais|CNIS/i.test(a.nome||""));
       return ds.length ? {est:"ok", txt:`${plu(ds.length, "papel trazido", "papéis trazidos")}: ${ds.slice(0, 4).map(a=>String(a.nome).split(" · ").pop().replace(/\.pdf$/i, "")).join("; ")}. Confira que cada um é da época do fato`, fonte:"dossiê"}
         : {est:"falta", txt:"a justificação não vale sozinha: precisa de ao menos um documento da época do fato"}; }},
    {id:"ja_testemunhas", rot:"As testemunhas servem?", base:"IN 128/2022, art. 570, caput e parágrafo único", conf:"conferido", campos:["ja_testemunhas","ja_parente"],
     // F235 · quem não pode depor, por inteiro, e o aviso de que o INSS não chama as testemunhas (Portaria DIRBEN 993, art. 89, § 1º)
     mede:x=>{ const leva = "o INSS não as intima: a própria pessoa as avisa e leva no dia marcado (Portaria DIRBEN 993, art. 89, § 1º)";
       const nao = "não podem depor o menor de 16, o cônjuge ou companheiro e os parentes até o 3º grau, de sangue ou por casamento: pais, avós, filhos, netos, irmãos, tios, sobrinhos, sogros, cunhados, genro e nora (IN 128, art. 570, parágrafo único)";
       if(x.v.ja_parente==="Sim") return {est:"risco", txt:`parente não serve de testemunha: ${nao}. Indique de 2 a 6 pessoas de fora da família que conheciam os fatos (vizinhos, colegas, o dono da casa alugada); ${leva}`, fonte: ((x.preUsado||{}).ja_parente) ? "dossiê" : "campo"};
       const n = +x.v.ja_testemunhas || 0;
       if(!x.v.ja_testemunhas) return {est:"informar", txt:`informe quantas testemunhas de fora da família (de 2 a 6); ${nao}`};
       return n >= 2 && n <= 6 ? {est:"ok", txt:`${n} testemunhas de fora da família; ${leva}`, fonte: ((x.preUsado||{}).ja_testemunhas) ? "dossiê" : "campo"} : {est:"falta", txt:"são de 2 a 6 testemunhas", fonte:"campo"}; }},
    {id:"ja_empresa", rot:"Se prova tempo de serviço: há prova de que a empresa existiu no período?", base:"IN 128/2022, art. 571, §§ 1º e 2º", conf:"conferido", campos:["ja_empresa"],
     mede:x=>!/Tempo de servi/.test(x.v.ja_fato||"") ? {est:"info", txt:"só se pede na justificação de tempo de serviço"}
       : x.v.ja_empresa==="Sim" ? {est:"ok", txt:"certidão da Junta Comercial, da Prefeitura ou da Fazenda", fonte:"campo"}
       // F235 · sem o verbo "traga": a certidão já vem marcada na lista de Documentos, e o pedido repetido confundia
       : {est:"falta", txt:"falta a certidão da Junta Comercial, da Prefeitura ou da Fazenda com o nome, o endereço e o encerramento da empresa (está na lista de Documentos)"}},
    {id:"ja_recurso", rot:"E se a justificação não convencer?", base:"Decreto 3.048/99, art. 147", conf:"conferido", campos:[],
     mede:x=>({est:"info", txt:"contra o resultado da justificação não cabe recurso; recorre-se da decisão do benefício (30 dias) ou vai-se à Justiça"})},
  ], {ja_fato:["O que a justificação vai provar", "select", ["","Tempo de serviço (vínculo sem registro ou fora do CNIS)","União estável ou dependência econômica","Atividade rural","Outro fato"]],
      ja_periodo:["Período ou fato (de quando a quando)", "text"], ja_testemunhas:["Testemunhas de fora da família", "number"], ja_parente:["Alguma testemunha é parente ou interessada", "select", SN],
      ja_empresa:["Prova de que a empresa existiu no período", "select", SN]},
    {resumo:"Prova um fato com testemunhas, dentro do pedido do benefício, quando há documento da época que dê o início da prova.",
     // F235 · a justificação vai dentro do pedido do benefício (Portaria DIRBEN 993, art. 78, § 1º): o caso é o do benefício, com a JA
     veredito: (x, a) => { const ben = (x.ops||[]).find(o=>o.o!=="JA" && o.fam!=="crps"), r = id => a.rs.find(q=>q.id===id) || {}, dn = ben && _JA_DO[ben.o];
       const pm = r("ja_prova_material"), ts = r("ja_testemunhas"), em = r("ja_empresa");
       if(pm.est!=="ok" && pm.est!=="falta") return null;
       const ps = [`Cabe a justificação administrativa${x.v.ja_periodo ? ` (${x.v.ja_periodo})` : ""}, dentro do pedido ${dn || "do benefício"}: ${pm.txt}.`];
       if(em.est==="falta") ps.push(`Falta ${em.txt.replace(/^(traga|falta) /, "").replace(/ \(está na lista de Documentos\)$/, "")} (IN 128, art. 571, §§ 1º e 2º).`);
       if(ts.est==="risco" || ts.est==="ok") ps.push(cap1(ts.txt) + ".");
       ps.push("Contra o resultado da justificação não há recurso; se o benefício for negado, recurso ao CRPS em 30 dias ou a Justiça.");
       return {tom: ts.est==="risco" || em.est==="falta" ? "ainda" : "sim", txt:ps.join(" "),
         desf:{acao:"caso", txt:`gere o caso ${dn || "do benefício"} com a justificação administrativa no mesmo pedido${ts.est==="risco" ? "; antes, troque as testemunhas parentes por pessoas de fora da família" : ""}${em.est==="falta" ? "; junte a prova de que a empresa existiu" : ""}`}}; },
     agora: (x, a) => { const ts = a.rs.find(q=>q.id==="ja_testemunhas") || {}, em = a.rs.find(q=>q.id==="ja_empresa") || {};
       return ["Pedir a justificação administrativa no mesmo pedido do benefício, com o relato escrito dos fatos (período, lugar e pessoas) e os papéis da época.",
         ...(em.est==="falta" ? [`Trazer ${em.txt.replace(/^(traga|falta) /, "").replace(/ \(está na lista de Documentos\)$/, "")} (IN 128, art. 571, §§ 1º e 2º).`] : []),
         ts.est==="risco" ? "Trocar as testemunhas parentes por 2 a 6 pessoas de fora da família, com nome, CPF, endereço e telefone." : "Anotar nome, CPF, endereço e telefone de 2 a 6 testemunhas de fora da família.",
         "Avisar que o INSS não intima as testemunhas: a própria pessoa as leva no dia marcado (Portaria DIRBEN 993, art. 89, § 1º)."]; }});
  // F235 · o benefício em que a justificação entra, pelo nome que se diz ao cliente
  const _JA_DO = {idade:"da aposentadoria por idade", hibrida:"da aposentadoria híbrida", idade_rural:"da aposentadoria rural", transicao:"da aposentadoria por tempo de contribuição",
    professor:"da aposentadoria do professor", morte:"da pensão por morte", B93:"da pensão por morte", reclusao:"do auxílio-reclusão", urb:"do salário-maternidade", rur:"do salário-maternidade"};
  // F235 · o que o dossiê já responde na justificação: o fato e o período (papéis da época ou da união) e quantas testemunhas o relato traz
  Object.assign(PRE_DOSSIE, {
    ja_fato: x => { if(x.op!=="JA" || !x.c) return null;
      if(empregosDosPapeis(x.c.id).length) return {val:"Tempo de serviço (vínculo sem registro ou fora do CNIS)", fonte:"papéis da época trazidos"};
      return _opDep(x, /^(morte|B93|reclusao)$/) && /companheir|viviam juntos|moravam juntos|uni[ãa]o est[áa]vel/i.test(relatoDe(x.c)) ? {val:"União estável ou dependência econômica", fonte:"relato da recepção"} : null; },
    ja_periodo: x => { if(x.op!=="JA" || !x.c) return null; const p = empregosDosPapeis(x.c.id)[0];
      if(p) return {val:`${p.onde}, de ${fmtBarra(p.de)} a ${fmtBarra(p.ate)}`, fonte:p.docs};
      const u = _opDep(x, /^(morte|B93|reclusao)$/) ? provasDaUniao(x.c) : null, m = relatoDe(x.c).match(/(?:juntos|uni[ãa]o)[^.\n]{0,25}?desde\s+((?:19|20)\d{2})/i);
      return u ? {val:`união com ${u.instituidor}${m ? ` desde ${m[1]}` : ""} até o óbito, em ${fmtBarra(u.obito)}`, fonte:"certidão de óbito e relato"} : null; },
    ja_testemunhas: x => { if(x.op!=="JA" || !x.c) return null;
      const m = relatoDe(x.c).match(/\b(duas|dois|tr[êe]s|quatro|cinco|seis|\d)\s+(?:ex-?colegas|colegas|vizinh[oa]s|testemunhas|amig[oa]s)\b/i);
      const n = m ? ({duas:2, dois:2, "três":3, tres:3, quatro:4, cinco:5, seis:6}[m[1].toLowerCase()] || +m[1]) : 0;
      return n && !/testemunh[^.\n]{0,80}\b(irm[ãa]o?|filh[oa]|sobrinh[oa])\b|\b(irm[ãa]o?|filh[oa]|sobrinh[oa])\b[^.\n]{0,80}testemunh/i.test(relatoDe(x.c)) ? {val:String(n), fonte:"relato da recepção"} : null; },
  });

  // ── seguro-defeso ───────────────────────────────────────────────────────
  // F235 · a janela desta piracema, as parcelas, o RGP com a homologação da prefeitura, o período que tem de ser só de pesca (do fim do
  // último defeso ao início deste), as notas, o REAP, a biometria e um defeso por ano, com os papéis do dossiê lidos (pescaDoDossie)
  const _sdMes = iso => `${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  const _sdComp = s => { const d = soDig(s); return d.length===6 ? (/^(19|20)/.test(d) ? `${d.slice(4, 6)}/${d.slice(0, 4)}` : `${d.slice(0, 2)}/${d.slice(2, 6)}`) : String(s||""); };
  // o período que tem de ser só de pesca: do fim do defeso anterior ao início deste, ou os 12 meses antes, o que for menor
  const _sdPeriodo = x => { const p = piracemaDe(x.hoje); if(!p) return {de:somarMeses(x.hoje, -12), ate:x.hoje, p:null};
    const doze = somarMeses(p.ini, -12); return {de: p.depoisDoAnterior > doze ? p.depoisDoAnterior : doze, ate: diaAnterior(p.ini), p}; };
  // o emprego (ou outra renda do CNIS) dentro do período que tem de ser só de pesca
  const _sdOutra = x => { if(!x.g) return null; const {de, ate} = _sdPeriodo(x); return _vincs(x).find(w=>!/segurado especial/i.test(w.v.tipo||"") && w.ate >= de && w.de <= ate) || null; };
  registrarReq("SD", [
    {id:"sd_canal", rot:"Onde se pede?", base:"Lei 10.779/2003, art. 2º (red. Lei 15.265/2025)", conf:"conferido", campos:[],
     mede:x=>({est:"info", txt:"no Ministério do Trabalho, pelo gov.br (Portal Emprega Brasil) ou pelo app Carteira de Trabalho Digital; não no Meu INSS"})},
    {id:"sd_prazo", rot:"Até quando pedir, e quanto recebe?", base:"Resolução Codefat/MTE 1.027/2025, art. 15, na redação da Resolução 1.045/2026 (30 dias antes a 90 dias depois do início); Lei 10.779/2003, art. 1º, caput e § 13", conf:"conferido", campos:[],
     mede:x=>{ const p = piracemaDe(x.hoje); if(!p) return {est:"info", txt:"confira as datas do defeso no ato do Ministério da Pesca"};
       const per = `piracema de ${fmtBarra(p.ini)} a ${fmtBarra(p.fim)}`, sm = smEm(p.ini);
       const parc = `${p.parcelas} parcelas, uma por mês de defeso, de 1 salário mínimo${sm ? ` (${moedaBR(sm)} em ${anoDe(p.ini)}; as do ano seguinte pelo mínimo novo)` : ""}, pagas durante o defeso`;
       if(_sdOutra(x)) return {est:"info", txt:`${per}, com o pedido de ${fmtBarra(p.abre)} a ${fmtBarra(p.fecha)}: neste caso não se pede, porque houve outra renda no período que tem de ser só de pesca`};
       if(x.hoje < p.abre) return {est:"info", txt:`${per}: o pedido abre em ${fmtBarra(p.abre)} e vai até ${fmtBarra(p.fecha)}; ${parc} (conferir o ato do defeso e a resolução do Codefat)`, quando:p.abre};
       return {est:"risco", txt:`pedido até ${fmtBarra(p.fecha)}: a ${per} tem a janela do pedido de ${fmtBarra(p.abre)} a ${fmtBarra(p.fecha)} (30 dias antes a 90 dias depois do início); ${parc} (conferir o ato do defeso e a resolução do Codefat)`, quando:p.fecha}; }},
    {id:"sd_local", rot:"Pesca na área do defeso e mora em município do ato, ou vizinho?", base:"Lei 10.779/2003, art. 1º, § 11; Decreto 8.424/2015, art. 2º, VII", conf:"conferido", campos:[],
     mede:x=>{ const r = x.c ? pescaDoDossie(x.c).rgp : null, mora = x.c ? [x.c.cidade, x.c.uf].filter(Boolean).join("/") : "";
       return r && r.local ? {est:"info", txt:`pelo RGP, pesca no ${r.local.replace(/\s*·\s*/g, ", em ")}${r.especies ? ` (${r.especies})` : ""}${mora ? `; mora em ${mora}` : ""}: confira se o município está no ato do defeso da piracema`, fonte:"RGP"}
         : {est:"informar", txt:"pergunte em que rio ou represa pesca, que peixe e em que cidade mora: o defeso vale para quem mora em município do ato ou vizinho"}; }},
    {id:"sd_rgp", rot:"Tem o registro de pescador (RGP) há pelo menos 1 ano, ativo e homologado pela prefeitura?", base:"Lei 10.779/2003, art. 2º, § 2º, I; Decreto 8.424/2015, arts. 2º, VIII, e 2º-A (homologação de 1 ano; conferir)", conf:"conferido", campos:["sd_rgp"],
     mede:x=>{ const r = x.c ? pescaDoDossie(x.c).rgp : null, h = r && r.homolog, venceu = !!(h && somarAnos(h, 1) < x.hoje);
       const hom = !r ? "" : h ? (venceu ? `; a homologação da prefeitura é de ${fmtBarra(h)} e passou de 1 ano: renove antes do pedido` : `; homologado pela prefeitura em ${fmtBarra(h)} (vale 1 ano)`) : "; o papel não mostra a homologação da prefeitura: confira";
       if(x.v.sd_rgp) return x.v.sd_rgp <= somarMeses(x.hoje, -12) ? {est: venceu ? "risco" : "ok", txt:`RGP desde ${fmtBarra(x.v.sd_rgp)}${r && r.situacao ? `, ${r.situacao}` : ""}${hom}`, fonte:"campo"} : {est:"falta", txt:`RGP de ${fmtBarra(x.v.sd_rgp)}: ainda não tem 1 ano do pedido`, fonte:"campo"};
       return r ? {est:"provar", txt:"há documento do RGP no dossiê: confira a data do primeiro registro", fonte:"dossiê"} : {est:"informar", txt:"informe desde quando tem o RGP"}; }},
    {id:"sd_so_pesca", rot:"Viveu só da pesca, sem outra renda, desde o último defeso?", base:"Lei 10.779/2003, art. 1º, §§ 3º e 4º, e art. 2º, § 2º, III (conferir a alínea)", conf:"conferido", campos:[],
     mede:x=>{ if(!x.g) return {est:"informar", txt:"o CNIS não foi lido"};
       const {de, ate} = _sdPeriodo(x), per = `de ${_sdMes(de)} a ${_sdMes(ate)}`, w = _sdOutra(x);
       if(!w) return {est:"ok", txt:`o CNIS não mostra emprego nem outra renda no período que tem de ser só de pesca (${per})`, fonte:"CNIS"};
       const dias = Math.round((Date.parse(w.ate+"T12:00:00") - Date.parse(w.de+"T12:00:00"))/864e5) + 1;
       return {est:"impedido", txt:`${String(w.v.tipo||"").toLowerCase()} em ${_rotV(w)}, de ${fmtBarra(w.de)} a ${fmtBarra(w.ate)}: outra renda no período que tem de ser só de pesca (${per}) tira o direito neste defeso. Não peça como se só pescasse: declaração falsa cancela o RGP e impede novo pedido por 3 anos (Lei 10.779, art. 3º; conferir)`
         + (dias <= 120 ? `. Para a aposentadoria, os ${dias} dias ficam abaixo de 120 no ano e não tiram a condição de segurado especial (IN 128, art. 112, IX, d), mas essa folga não vale para o defeso; levar a tese à Justiça é decisão do advogado` : ""), fonte:"CNIS"}; }},
    {id:"sd_notas", rot:"Tem notas de venda do pescado em pelo menos 6 dos 12 meses antes do defeso?", base:"Lei 10.779/2003, art. 2º, § 2º, II", conf:"conferido", campos:["sd_notas"],
     mede:x=>x.v.sd_notas==="" || x.v.sd_notas==null ? {est:"informar", txt:"informe em quantos meses há nota de venda (ou contribuição sobre a venda)"}
       : +x.v.sd_notas >= 6 ? {est:"ok", txt:`${x.v.sd_notas} meses com nota`, fonte:"campo"} : {est:"falta", txt:`só ${x.v.sd_notas} meses com nota; a lei pede 6`, fonte:"campo"}},
    {id:"sd_reap", rot:"Entregou o relatório anual da pesca (REAP)?", base:"Lei 10.779/2003, art. 2º, § 12 (redação da Lei 15.399/2026); Decreto 8.424/2015, art. 2º, § 1º, II", conf:"conferido", campos:["sd_reap"],
     mede:x=>x.v.sd_reap==="Sim" ? {est:"ok", txt:"entregue", fonte:"campo"} : x.v.sd_reap==="Não" ? {est:"falta", txt:"sem o relatório anual, o pedido não sai", fonte:"campo"} : {est:"informar", txt:"pergunte se entregou o relatório anual da pesca"}},
    {id:"sd_beneficio", rot:"Recebe algum benefício continuado?", base:"Lei 10.779/2003, art. 2º, § 1º; Decreto 8.424/2015, art. 2º, IV", conf:"conferido", campos:[],
     mede:x=>{ const b = _ativosS(x).find(b=>!/^(21|93|36|94)$/.test(b.especie));
       return b ? {est:"impedido", txt:`recebe ${_nomeS(b)}: não acumula com o seguro-defeso (pensão e auxílio-acidente podem)`, fonte:"CNIS"} : {est:"ok", txt:"nenhum benefício que impeça", fonte: x.g ? "CNIS" : ""}; }},
    {id:"sd_cadunico", rot:"Está no CadÚnico, atualizado?", base:"Lei 10.779/2003, art. 1º, § 10 (redação da Lei 15.399/2026)", conf:"conferido", campos:[],
     mede:x=>x.cad ? {est:"ok", txt:`família no CadÚnico${x.cad.atualizada_em ? `, atualizada em ${x.cad.atualizada_em}` : ""}: o cadastro é exigido, sem limite de renda, e o Bolsa Família não impede o defeso`, fonte:"CadÚnico"} : {est:"informar", txt:"confira se a família está no CadÚnico, atualizado: o cadastro é exigido"}},
    {id:"sd_biometria", rot:"Tem documento com biometria (CIN, título ou CNH) e a conta gov.br?", base:"Lei 10.779/2003, art. 1º, § 10 (redação da Lei 15.399/2026); Decreto 8.424/2015, art. 2º, VI", conf:"conferido", campos:[],
     mede:x=>{ const ci = x.c ? pescaDoDossie(x.c).cin : null, gov = !!(x.c && Object.keys(x.c.dossie||{}).some(k=>k!=="transparencia"));
       return ci ? {est:"ok", txt:`CIN com biometria${ci.emitida ? `, emitida em ${fmtBarra(ci.emitida)}` : ""}${gov ? "; o dossiê foi baixado com o gov.br dele" : ""}`, fonte:"dossiê"}
         : {est:"informar", txt:"confira se tem a identidade nova (CIN), o título ou a CNH com biometria, e o acesso ao gov.br"}; }},
    {id:"sd_um_por_ano", rot:"Já recebeu seguro-defeso neste defeso, ou de outro peixe neste ano?", base:"Lei 10.779/2003, art. 1º, § 5º", conf:"conferido", campos:[],
     mede:x=>{ const cpf = soDig((x.c||{}).cpf), ps = (x.transp||{}).pessoas||[], p = cpf ? ps.find(p=>soDig(p.cpf)===cpf) : ps.length===1 ? ps[0] : null;
       const d = p && (p.programas||[]).find(g=>/defeso/i.test(`${g.programa} ${g.rotulo||""}`));
       if(!d) return {est:"informar", txt:"pergunte se já pediu ou recebeu seguro-defeso neste ano, de outro peixe: é um por ano"};
       const pi = piracemaDe(x.hoje), u = _sdComp(d.ultima_competencia), uk = u.length===7 ? `${u.slice(3)}-${u.slice(0, 2)}` : "";
       if(pi && uk && uk >= ymDe(pi.ini)) return {est:"risco", txt:`o Portal da Transparência já mostra seguro-defeso até ${u}: confira se este defeso já foi pedido`, fonte:"Portal da Transparência"};
       return {est:"ok", txt:`recebeu ${d.meses} ${+d.meses===1 ? "parcela" : "parcelas"} de seguro-defeso${d.primeira_competencia ? `, de ${_sdComp(d.primeira_competencia)}` : ""}${u ? ` a ${u}` : ""}, em defesos passados (Portal da Transparência); o defeso recebido também prova a atividade de pescador (Portaria DIRBEN 990/2022, art. 92, § 4º)`, fonte:"Portal da Transparência"}; }},
  ], {sd_rgp:["RGP desde", "date"], sd_notas:["Meses com nota de venda nos 12 meses antes do defeso", "number"], sd_reap:["Relatório anual da pesca (REAP) entregue", "select", SN]},
    {resumo:"Paga ao pescador artesanal um salário mínimo por mês de defeso. O pedido é no Ministério do Trabalho, e qualquer outra renda entre os defesos tira o direito.",
     // F235 · o que fazer já: pedir dentro da janela; sem direito, a orientação para o próximo defeso
     agora: (x, a)=>{ const p = piracemaDe(x.hoje), prox = p && piracemaDe(somaDias(p.fecha, 1));
       if(a && a.rs.some(r=>r.est==="impedido")) return ["Não peça neste defeso: declaração falsa cancela o RGP e impede novo pedido por 3 anos (Lei 10.779, art. 3º; conferir).",
         ...(prox ? [`Para o próximo defeso (de ${fmtBarra(prox.ini)}): de ${_sdMes(prox.depoisDoAnterior)} a ${_sdMes(diaAnterior(prox.ini))}, só pescar, sem outro trabalho, e tirar nota de venda em ao menos 6 meses; o pedido abre em ${fmtBarra(prox.abre)}.`] : [])];
       return p && x.hoje >= p.abre ? [`Pedir até ${fmtBarra(p.fecha)} no gov.br (Portal Emprega Brasil) ou no app Carteira de Trabalho Digital, com a conta gov.br dele.`,
         `São ${p.parcelas} parcelas de 1 salário mínimo, uma por mês de defeso, pagas durante o defeso.`] : []; },
     desfechoTxt: (x, a)=>{ const r = a && a.rs.find(r=>r.id==="sd_notas"), p = piracemaDe(x.hoje), prox = p && piracemaDe(somaDias(p.fecha, 1));
       if(!(a && a.rs.some(r=>r.est==="impedido"))) return "";
       return `${r && r.est==="falta" ? `; ${r.txt}` : ""}${prox ? `; para o próximo defeso (de ${fmtBarra(prox.ini)}), de ${_sdMes(prox.depoisDoAnterior)} a ${_sdMes(diaAnterior(prox.ini))} só pescar e tirar nota de venda em ao menos 6 meses` : ""}`; }});
})();
// F235 · a aposentadoria cujo direito depende de tempo ainda não reconhecido: o contrato da carteira fora do CNIS ou o vínculo com
// pendência (o acerto do CNIS vem antes do pedido) e o emprego dos papéis da época (a justificação administrativa vai dentro do pedido
// do benefício: Portaria DIRBEN 993, art. 78, § 1º). A conclusão mostra os cenários, a data do direito é a de sem o tempo pendente, e o
// desfecho segue: com acerto, a aposentadoria espera o CNIS corrigido; com a JA, pede-se já, com a justificação no mesmo pedido
(()=>{
  const _pend = r => /justificação administrativa/.test(r.prova||"") ? "ja" : /fora do CNIS|com pendência \(PEXT\)/.test(r.prova||"") ? "acerto" : "";
  const _ym1 = (ym, n) => ymDe(somarMeses(ym+"-01", n));
  const _tirar = (ps, [a, b]) => ps.flatMap(([p, q])=>q < a || p > b ? [[p, q]] : [...(p < a ? [[p, _ym1(a, -1)]] : []), ...(q > b ? [[_ym1(b, 1), q]] : [])]);
  // o contexto com só as linhas dadas; as que não estão no CNIS entram na carência mês a mês, e a pendência PEXT sai dela
  const _ctx = (x, sel, periodos) => ({...x, tempos:sel, ct:{...x.ct, periodos}, tot:admTotaisDe(sel, x.sx, x.der < x.hoje ? x.der : x.hoje), totEm: iso => admTotaisDe(sel, x.sx, iso)});
  function _cenarios(x, q0){
    if(!q0 || !x.temposAuto || !x.ct || !x.c) return null;
    const ls = x.tempos || [], pend = ls.filter(_pend); if(!pend.length) return null;
    const fora = pend.filter(r=>!/PEXT/.test(r.prova||"")), pext = pend.filter(r=>/PEXT/.test(r.prova||""));
    const xc = _ctx(x, ls, [...(x.ct.periodos||[]), ...fora.map(r=>[ymDe(r.de), ymDe(r.ate)])]);
    const xs = _ctx(x, ls.filter(r=>!_pend(r)), pext.map(r=>[ymDe(r.de), ymDe(r.ate || x.hoje)]).reduce(_tirar, x.ct.periodos||[]));
    let qc = null, qs = null; try{ qc = q0(xc); }catch(e){} try{ qs = q0(xs); }catch(e){}
    if(!qc || (qs && qs <= qc)) return null;
    return {xc, xs, qc, qs, fora, pext, ja: pend.filter(r=>_pend(r)==="ja"), acerto: pend.some(r=>_pend(r)==="acerto")};
  }
  // o tempo da aposentadoria por tempo numa data: sem os meses de alíquota reduzida não complementados (IN 128, art. 216, V, a)
  const _tempoEm = (x, sel, iso) => admTotaisDe(x.v.tra_aliq_compl==="Sim" ? sel : sel.filter(r=>!/alíquota reduzida/.test(r.prova||"")), x.sx, iso).comum;
  const _nome = r => String(r.onde||"").trim() || "o período";
  function _vered(op, x, a, s){
    const q = s.qc, ja = s.ja[0];
    if(!s.acerto && ja){
      const n0 = carenciaAte(x, x.der), n1 = carenciaAte(s.xc, x.der), ex = CAR_EXIG[op] || 180;
      const txt = `Com a justificação administrativa de ${_nome(ja)} (${fmtBarra(ja.de)} a ${fmtBarra(ja.ate)}, ${plu(mesesEntreYm(ymDe(ja.de), ymDe(ja.ate)), "mês", "meses")}, pelos papéis da época), ${tratDe(x.c)} passa de ${n0} para ${n1} contribuições e cumpre os requisitos desde ${fmtBarra(q)}. Pedir já a aposentadoria, com a justificação administrativa no mesmo pedido: ela se paga desde a data do pedido.${n0 < ex ? ` Sem a justificação, faltam ${ex - n0} contribuições.` : ""}`;
      return {tom:"sim", txt, desf:{acao:"caso", txt:`gere o caso e peça já a aposentadoria, com a justificação administrativa de ${_nome(ja)} no mesmo pedido: com ela, cumpre os requisitos desde ${fmtBarra(q)}; o pagamento começa no dia do pedido`}};
    }
    if(op==="transicao"){
      const sB = (x.tempos||[]).filter(r=>!/fora do CNIS/.test(r.prova||"")), sH = s.xs.tempos;
      const fp = ((a.rs.find(r=>r.id==="direito_adquirido_integral")||{}).txt||"").match(/(com|sem) fator previdenciário \([^)]*\)/), p100 = x.dn ? dataDaIdade(x.dn, x.sx==="F" ? 57 : 60) : null;
      const quem = [...s.fora.map(r=>`${_nome(r)}, da carteira`), ...s.pext.map(r=>`${_nome(r)}, com pendência`)].join("; ");
      const txt = `Depende do acerto do CNIS. Com o acerto (${quem}), tinha ${tempoFmt(_tempoEm(x, x.tempos, EC103))} de contribuição em 13/11/2019 e cumpre os requisitos desde ${fmtBarra(q)}${q <= EC103 ? " (direito adquirido antes da Reforma)" : ""}${fp ? `, ${fp[0]}` : ""}`
        + `${p100 && p100 > x.hoje ? `; o advogado compara com esperar o pedágio de 100 % aos ${x.sx==="F" ? 57 : 60} anos (${fmtBarra(p100)}), com 100 % da média` : ""}. `
        + `${s.fora.length ? `Sem ${s.fora.map(_nome).join(" e ")}, seriam ${tempoFmt(_tempoEm(x, sB, EC103))}; ` : ""}hoje, sem o acerto, o INSS conta ${tempoFmt(_tempoEm(x, sH, EC103))} até 13/11/2019${s.qs ? ` (direito só em ${fmtBarra(s.qs)})` : ", sem direito"}. A aposentadoria se pede depois do CNIS corrigido.`;
      return {tom:"ainda", txt, desf:{acao:"", txt:`pedir só depois do CNIS corrigido: com o acerto, cumpre os requisitos desde ${fmtBarra(q)}${q <= EC103 ? " (direito adquirido)" : ""}; sem ele, ${s.qs ? `só em ${fmtBarra(s.qs)}` : "não há direito"}`}};
    }
    // F235 · a data com o acerto ainda no futuro: o card de Aposentadorias futuras leva a data de quem prova o vínculo, e a outra fica à vista
    const quem = [...s.fora.map(r=>`${_nome(r)}, da carteira`), ...s.pext.map(r=>`${_nome(r)}, com pendência`)].join("; ");
    if(q > x.hoje) return {tom:"ainda", txt:`Depende do acerto do CNIS: com ele, cumpre os requisitos em ${fmtBarra(q)}; sem ele, ${s.qs ? `só em ${fmtBarra(s.qs)}` : "não há direito"}.`,
      desf:{acao:"lembrete", data:q, txt:`agora, pedir o acerto do CNIS${quem ? ` (${quem})` : ""} com a carteira de trabalho; depois, envie a Aposentadorias futuras: com o acerto, direito provável em ${fmtBarra(q)} (veja em "O que dá para fazer agora" a diferença e os meses a pagar); sem ele, ${s.qs ? `só em ${fmtBarra(s.qs)}` : "não há direito"}`}};
    return {tom:"ainda", txt:`Depende do acerto do CNIS: com ele, cumpre os requisitos desde ${fmtBarra(q)}; sem ele, ${s.qs ? `só em ${fmtBarra(s.qs)}` : "não há direito"}. A aposentadoria se pede depois do CNIS corrigido.`,
      desf:{acao:"", txt:`pedir só depois do CNIS corrigido: com o acerto, cumpre os requisitos desde ${fmtBarra(q)}`}};
  }
  for(const op of ["idade", "transicao"]){
    const ex = REQ_EXTRA[op]; if(!ex || !ex.quando) continue;
    const q0 = ex.quando, v0 = ex.veredito, ag0 = ex.agora;
    // F235 · com o mesmo benefício negado e o recurso no prazo, vale o recurso (a prova já estava no pedido): a data é a do pedido
    const rec = (x, a) => !(a && a.rs.some(r=>r.est==="impedido")) && recursoDoBenef(x, RE_RECURSO[op]);
    ex.quando = x => { if(rec(x)) return q0(x); const s = _cenarios(x, q0); return s ? s.qs : q0(x); };
    ex.veredito = (x, a) => { const rc = rec(x, a); if(rc) return vereditoDoRecurso(op, x, a, rc);
      const s = _cenarios(x, q0); return (s && _vered(op, x, a, s)) || (v0 ? v0(x, a) : null); };
    ex.agora = (x, a) => { const rc = rec(x, a); if(rc) return vereditoDoRecurso(op, x, a, rc).agora;
      const s = _cenarios(x, q0), base = ag0 ? (ag0(x, a) || []) : []; if(!s) return base;
      const ja = s.ja[0];
      return [...(!s.acerto && ja ? [`Pedir já a aposentadoria no Meu INSS e, no mesmo pedido, a justificação administrativa de ${_nome(ja)} (${fmtBarra(ja.de)} a ${fmtBarra(ja.ate)}), com os papéis da época e de 2 a 6 testemunhas de fora da família, que a própria pessoa avisa e leva no dia marcado (o INSS não as intima: Portaria DIRBEN 993, art. 89, § 1º).`]
        : ["Primeiro o acerto do CNIS (veja o Acerto de CNIS); a aposentadoria se pede depois do extrato corrigido, para não haver indeferimento."]), ...base]; };
    // F235 · na idade, o tempo e a carência que só se cumprem com o período fora do CNIS (carteira ou justificação) dizem que dependem dele
    if(op==="idade") for(const r of (REQ_BENEF.idade||[]).filter(r=>/^(tempo_minimo|carencia_180)$/.test(r.id))){
      const m0 = r.mede;
      r.mede = x => { const m = m0(x); if(!m || recursoDoBenef(x, RE_RECURSO.idade)) return m;
        const s = _cenarios(x, q0); if(!s || !s.fora.length) return m;
        const mc = m0(s.xc), ms = m0(s.xs); if(!mc || !ms || mc.est==="falta" || ms.est!=="falta") return m;
        const seg = (t, i) => String(t||"").split("; ")[i] || "", falta = (String(ms.txt).match(/faltam [^;)]*/)||[""])[0];
        const ja = !s.acerto && s.ja.length, pend = s.fora.map(l=>`${plu(mesesEntreYm(ymDe(l.de), ymDe(l.ate || x.hoje)), "mês", "meses")} de ${_nome(l)}`).join(" e ");
        return {...mc, est:"provar", txt:`${seg(mc.txt, 0)}, contando ${pend}, que ${ja ? "dependem da justificação administrativa" : "dependem do acerto do CNIS"}; ${String(mc.txt).split("; ").slice(1).join("; ")}; sem ${ja ? "a justificação" : "o acerto"}, ${seg(ms.txt, 0)}${falta ? `, ${falta}` : ""}`}; };
    }
  }
  // F235 · o auxílio negado com recurso no prazo: o recurso paga desde o pedido; não há prorrogação de benefício que nunca foi pago,
  // e a perícia que já reconheceu a incapacidade dispensa a pergunta do atestado (Atestmed)
  for(const op of ["b31", "b32", "acid"]){
    const ex = REQ_EXTRA[op]; if(!ex) continue; const v0 = ex.veredito, ag0 = ex.agora;
    const rec = (x, a) => !(a && a.rs.some(r=>r.est==="impedido")) && recursoDoBenef(x, RE_RECURSO[op]);
    ex.veredito = (x, a) => { const rc = rec(x, a); return rc ? vereditoDoRecurso(op, x, a, rc) : (v0 ? v0(x, a) : null); };
    ex.agora = (x, a) => { const rc = rec(x, a); return rc ? vereditoDoRecurso(op, x, a, rc).agora : (ag0 ? ag0(x, a) || [] : []); };
  }
  // F235 · com a justificação no pedido da pensão: duas provas e só uma dos 24 meses cumprem o caput do art. 180 da IN 128, mas o
  // parágrafo único e o Decreto 3.048, art. 22, § 14, admitem a JA para esse período: fica a conferir, com a JA pedida junto
  { const pu = (REQ_BENEF.morte||[]).find(r=>r.id==="prova_uniao"); if(pu){ const m0 = pu.mede;
    pu.mede = x => { const m = m0(x); const t = +x.v.dep_provas_total || 0, q = +x.v.dep_provas_24m || 0;
      if(m && m.est==="ok" && t >= 2 && q===1 && (x.ops||[]).some(o=>o.o==="JA"))
        return {...m, est:"provar", txt:`união estável: ${t} provas materiais, só 1 dos 24 meses antes do óbito. O caput do art. 180 da IN 128 se cumpre com ela; o parágrafo único e o Decreto 3.048, art. 22, § 14, admitem a justificação administrativa para esse período: o advogado decide, e a JA vai no mesmo pedido, por segurança`}; 
      return m; }; } }
  const _b31 = id => (REQ_BENEF.b31||[]).find(r=>r.id===id);
  { const rp = _b31("prorrogacao_novo_pedido"); if(rp){ const m0 = rp.mede;
    rp.mede = x => { const rc = recursoDoBenef(x, RE_RECURSO.b31), nb = rc ? soDig(rc.c.nb || rc.p.nb || "") : "";
      const pago = rc && (x.benefCnis||[]).some(b=>/^(31|91)$/.test(String(b.especie)) && (!nb || soDig(b.nb||"")===nb));
      if(rc && !pago && !/prorroga/i.test(rc.p.servico||"")){ const l = (x.fd.laudos||[]).filter(l=>l.dcb).sort((p, q)=>isoBr(p.exame||"") < isoBr(q.exame||"") ? 1 : -1)[0];
        return {est:"info", txt:`Não há o que prorrogar: o auxílio foi negado e não chegou a ser pago.${l ? ` A perícia fixou a incapacidade até ${l.dcb}; se a pessoa continuar sem condições de trabalhar depois disso, leve ao advogado antes dessa data.` : ""} O recurso (até ${fmtBarra(rc.fatal)}) mantém o pedido de ${fmtBarra(rc.der)}`, fonte:"cópia do processo"}; }
      return m0(x); }; } }
  { const ra = _b31("documentos_analise_documental"); if(ra){ const m0 = ra.mede;
    ra.mede = x => { const l = (x.fd.laudos||[]).find(l=>l.resultado==="incapaz");
      if(l && recursoDoBenef(x, RE_RECURSO.b31)) return {est:"info", txt:`a perícia de ${l.exame || "do pedido"} já reconheceu a incapacidade: o atestado (Atestmed) não é a questão; o que falta é o recurso`, fonte:"laudo do INSS"};
      // F415 · dois indeferimentos sucessivos por análise documental levam o pedido seguinte à perícia (art. 8º)
      if(indefDocumentaisSeguidos(x) >= 2) return {est:"info", txt:`dois indeferimentos seguidos por análise documental: o pedido seguinte vai à perícia (presencial ou por telemedicina), e não só com atestado (Portaria Conjunta 13/2026, art. 8º, com a redação da Portaria Conjunta 54/2026). Conferir se o indeferimento mantido na reanálise e o de ciência anterior a 06/11/2026 entram na conta`, fonte:"cópia do processo"};
      const m = m0(x), soma = _incSomaDocumental(x);
      if(!soma || !m || !/repouso de \d+ dias/.test(m.txt||"")) return m;
      const n = +((m.txt.match(/repouso de (\d+) dias/)||[])[1]||0), tot = n + soma;
      const pre = `já foram ${soma} dias por análise documental desde a última perícia favorável, ${tot} com este repouso (a soma recomeça com a perícia favorável: Portaria Conjunta 13/2026, art. 3º, § 2º, com a redação da Portaria Conjunta 54/2026)`;
      if(tot <= 30) return {...m, txt:`${m.txt}; ${pre}`};
      if(tot <= 90) return {...m, est:"divergente", txt:`${pre}: a via administrativa aceita até 90 dias somados, a lei fala em 30`, div:m.div || {inss:"Portarias Conjuntas 14/2026 e 43/2026: até 90 dias somados", judicial:"Lei 8.213/91, art. 60, § 11-F: no máximo 30 dias somados"}};
      return {est:"info", txt:`${pre}, acima de 90: vai à perícia (presencial ou por telemedicina)`, fonte:m.fonte}; }; } }
})();
// F415 · quantos indeferimentos do auxílio por análise documental vêm seguidos no fim do histórico do dossiê
// (cópia do processo: a última comunicação de cada pedido de incapacidade, do mais novo ao mais antigo)
function indefDocumentaisSeguidos(x){
  const dt = p => isoBr(p.atualizado || p.entrada || "") || "";
  const ps = (x.fd.processos||[]).filter(p=>/incapacidade|aux[íi]lio|doen[çc]a/i.test(p.servico||"") && (p.comunicacoes||[]).length)
    .sort((a, b)=>dt(a) < dt(b) ? 1 : -1);
  let n = 0;
  for(const p of ps){ const c = p.comunicacoes.slice(-1)[0] || {};
    if(c.contra && RX_DOCUMENTAL.test(`${c.motivo||""} ${c.decisao||""}`)) n++; else break; }
  return n;
}
