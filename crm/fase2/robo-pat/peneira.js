// A PENEIRA — a barreira de privacidade da sonda do PAT/GERID.
//
// A sonda existe para eu descobrir o FORMATO das respostas do portal. O
// conteúdo delas não pode chegar até mim: são CPF, data de nascimento,
// endereço, nome de arquivo médico. Peneirar não é capricho — é a diferença
// entre mandar um mapa e mandar a carteira de clientes.
//
// DUAS REGRAS, e a segunda existe porque a primeira não basta:
//
// 1. Por NOME do campo. Qualquer chave que cheire a pessoa some. É a defesa
//    óbvia, e cobre `cpf`, `nomeRequerente`, `dataNascimento`.
//
// 2. Por FORMA do valor. O portal é grande e vai ter campo que eu não
//    previ — `obs2`, `campoAdicional`, `valor`. Então o padrão é INVERTIDO:
//    texto livre some por ser texto livre. Só ficam três coisas, porque só
//    elas me servem e nenhuma identifica ninguém:
//      • datas (dizem o formato: ISO ou brasileiro)
//      • códigos em caixa alta (PENDENTE, CUMPRIMENTO_DE_EXIGENCIA, AGENDADO)
//      • números curtos (id de serviço, contagem, página)
//
// O comprimento do que saiu fica no lugar (`‹texto 34›`), porque saber que um
// campo tem 3 ou 300 caracteres me diz se é rótulo ou parecer médico — e
// comprimento não identifica ninguém.
//
// Listas: guardo o tamanho e a forma de UM item. Vinte anexos com a mesma
// forma não me ensinam nada que um ensine, e cada um a mais é risco a mais.

// NEM TODO "nome" É DE GENTE. A primeira sonda voltou com `nomeServico` e
// `nomeUnidade` apagados — e são justamente o nome do serviço do INSS e o da
// agência, que não identificam ninguém e são o que eu mais preciso ler. A
// lista abaixo passa NA FRENTE da regra por nome de campo. Ela é fechada de
// propósito: só entra chave que eu tenha visto e saiba ser institucional.
const INSTITUCIONAL = new Set([
  'nomeservico', 'siglaservico', 'descricaoservico', 'tiposervico', 'idservico',
  'nomeunidade', 'siglaunidade', 'unidaderesponsavel', 'unidadeprotocolo',
  'nomesituacao', 'descricaosituacao', 'situacao', 'situacaotarefa',
  'status', 'fase', 'canal', 'orgao', 'setor', 'tipotarefa',
]);
const PESSOAL = /cpf|cnpj|nome|nasc|email|mail|telefone|celular|fone|endere|logra|bairro|munic|cep|rg\b|documento|arquivo|anexo|titulo|descri|coment|observ|justific|motivo|senha|token|assinat/i;
// o `(?=.*[A-Z…])` não é enfeite: sem ele, "44234156897202017" é só dígitos
// e caixa alta, casa como código e o número do protocolo atravessa a peneira
const CODIGO  = /^(?=.*[A-ZÇÃÕÁÉÍÓÚÂÊÔ])[A-ZÇÃÕÁÉÍÓÚÂÊÔ0-9_\- ]{2,40}$/;
const DATA    = /^\d{4}-\d{2}-\d{2}|^\d{2}\/\d{2}\/\d{4}/;

function peneirar(v, chave = '', prof = 0) {
  if (v === null || v === undefined) return null;
  if (prof > 9) return '‹fundo›';
  if (Array.isArray(v))
    return v.length ? [`‹lista de ${v.length}›`, peneirar(v[0], chave, prof + 1)] : [];
  if (typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) o[k] = peneirar(v[k], k, prof + 1);
    return o;
  }
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return String(v).length <= 6 ? v : `‹num ${String(v).length} díg›`;
  const s = String(v);
  if (INSTITUCIONAL.has(String(chave).toLowerCase()))
    return s.length <= 60 ? s : `‹texto ${s.length}›`;
  if (PESSOAL.test(chave)) return `‹oculto ${s.length}›`;
  if (DATA.test(s))   return s;
  if (CODIGO.test(s)) return s;
  if (s.length <= 3)  return s;
  return `‹texto ${s.length}›`;
}

// A PENEIRA NÃO ALCANÇAVA A URL. Na primeira sonda, o endereço do teste do
// detalhe foi guardado cru — e ele TERMINA no número do protocolo. Peneirar
// o corpo e mandar o identificador no cabeçalho é peneirar pela metade.
function mascararUrl(url) {
  return String(url || '').replace(/\d{6,}/g, d => `‹num ${d.length} díg›`);
}

module.exports = { peneirar, mascararUrl, PESSOAL, CODIGO, DATA, INSTITUCIONAL };
