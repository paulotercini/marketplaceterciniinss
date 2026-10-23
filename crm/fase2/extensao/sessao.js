// 1.25 · A SESSÃO CAÍDA ANTES DA RODADA, e não no meio dela. A aba esquecida
// aberta de um dia para o outro está na tela de login (ou responde com ela), e
// a rodada só descobria isso depois de minutos, com a fonte em "⚠". As marcas
// são as mesmas que os coletores já usam para desistir: o endereço do login
// (SSO do PJe, gov.br, CAS do e-SAJ, login do eproc) e o formulário de senha.
const RX_URL_LOGIN = /sso\.|auth\/realms|login\.seam|acesso\.gov\.br|sajcas\/login|identificacao\.do|acao=login|externo_controlador/i;
const RX_HTML_LOGIN = /type=["']?password|kc-form-login|Sua sess[aã]o foi encerrada|j_spring_security/i;

export const sessaoCaida = (url, html = '') =>
  RX_URL_LOGIN.test(url || '') || RX_HTML_LOGIN.test(String(html).slice(0, 20000));
