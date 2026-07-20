# Publicação no Netlify Drop

Documento de referência para o ciclo de publicação da carta no Netlify Drop. Use sempre que precisar atualizar a versão online e quando orientar o usuário.

## Pré-requisitos

Conta no Netlify cadastrada com o e-mail do escritório. O cadastro é gratuito e basta uma vez. Sem cadastro, a URL gerada é provisória e pode ser perdida em alguns dias.

Arquivo final validado, com `node --check` no script JS, contagens conferidas e versão e data atualizadas no rodapé do cabeçalho.

## Passo 1, preparação do arquivo

Renomeie o arquivo para `index.html`. O Netlify só serve a raiz da URL diretamente quando o arquivo se chama `index.html`. Sem isso, será necessário digitar o caminho completo da URL para acessar.

A versão e a data devem estar no rodapé do cabeçalho da página, no formato `vN.N — DD/MM/AAAA`.

## Passo 2, upload

Acesse `app.netlify.com/drop`. Arraste o arquivo `index.html` para a área indicada.

A URL é gerada automaticamente. Para o site nominado do escritório, escolha o nome em "Site settings" e a URL fica como `nome-escolhido.netlify.app`.

## Passo 3, atualização periódica

Cada nova versão exige novo upload. Renomeie sempre para `index.html` e arraste de novo.

Se quiser preservar o histórico de versões para referência interna, mantenha cópias com nome versionado (`carta-documentos-inss-v8.html`, `carta-documentos-inss-v9.html`) no workspace folder do projeto. Para o Netlify, sempre `index.html`.

## Passo 4, domínio próprio do escritório (opcional)

Se o escritório tem domínio (`tercini.adv.br` ou similar), configure subdomínio.

No painel da Netlify, em "Domain management", adicione o subdomínio escolhido (por exemplo `cartadeservicos.tercini.adv.br`).

No registrador do domínio, crie registro CNAME apontando o subdomínio para o endereço fornecido pela Netlify. A propagação leva até 24 horas.

Após validar, a Netlify oferece SSL automático via Let's Encrypt sem custo. Ative.

## Controle de acesso

A URL é pública por padrão. A página não tem dados sigilosos e pode ficar pública sem problema.

Para restringir, três caminhos.

Cloudflare Access permite proteger a URL com login. Gratuito até 50 usuários. Requer configurar Cloudflare como CDN do domínio.

Senha simples no JavaScript pode servir como barreira informal. Adiciona-se prompt antes de exibir o conteúdo. Não é seguro contra atacante determinado.

Hospedagem dentro do site institucional do escritório, com diretório protegido por `.htaccess` ou autenticação do hosting. Mais robusto, mas exige configuração no servidor.

## Boas práticas

Antes de publicar, abra a página localmente em navegador para confirmar que cards renderizam, painéis abrem e impressão sai correta.

Após publicar, abra a URL e teste em outro navegador (Chrome, Firefox, Edge) e em celular.

Comunique a equipe a cada nova versão publicada. Indique o número da versão e a data, com resumo do que mudou.

Mantenha cópia do arquivo final em pasta do projeto para histórico e auditoria.

## Solução de problemas comuns

URL retorna erro 404. Verifique se o arquivo se chama exatamente `index.html` e não `index.html.txt` ou `index.htm`.

Cards não renderizam. Verifique a sintaxe JS com `node --check`. Erro silencioso de JS quebra a página.

Estilos quebrados. Verifique se o arquivo foi salvo em UTF-8. Encoding errado quebra acentos e emojis.

Página em branco no Safari. Verifique se há recurso externo bloqueado (CORS). A página atual usa apenas Google Fonts via CDN, que não bloqueia.

Atualização não aparece. Pode ser cache do navegador. Force recarregar com Ctrl+F5 ou Cmd+Shift+R. Em caso persistente, verifique se o upload da nova versão foi feito como `index.html`.
