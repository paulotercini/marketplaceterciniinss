# PAT/GERID — sonda, antes de qualquer robô

## O que a v1 já respondeu

A lista funciona: `POST .../ec/tarefa/consulta` devolveu 200, com
`quantidadeTotalTarefa: 184` e uma linha por requerimento contendo
`protocolo`, `status`, `cpfRequerente`, `nomeServico`, `siglaServico`,
`nomeRequerente`, `nomeUnidade`, `dataCriacao` e `dataUltimaAtualizacao`.

É o bastante para detectar mudança: `protocolo` é a chave e
`dataUltimaAtualizacao` é o gatilho.

## O que a v2 vai responder

Ao tentar o detalhe por conta própria, a v1 levou **401
INSUFFICIENT_PERMISSIONS**. Isso NÃO é erro de captcha — é erro de crachá.
O portal manda um cabeçalho de autorização em cada chamada e a tentativa foi
só com o cookie. O teste estava errado, não a porta fechada.

A v2 não adivinha: ela olha COMO a própria página se identifica e ESCUTA o
detalhe que a página busca quando você abre uma tarefa. Depois refaz a mesma
chamada com o mesmo crachá.

- **Se refizer** → um clique seu por dia traz a carteira inteira: situação,
  exigências, perícias agendadas e remarcadas.
- **Se não refizer** → a lista ainda diz QUAIS mudaram desde ontem, e você
  abre só esses. É o que já faz hoje, sem a parte de procurar quais.

Nos dois casos há sistema para construir. Muda o tamanho, não a existência.

## O que a sonda não faz

Não gera, não guarda e não reaproveita token de reCAPTCHA. Não faz login
sozinha. Não roda em servidor. O reCAPTCHA é uma defesa contra robô e não
passamos por cima dela — nem pela via técnica, nem pela contratual do
convênio.

Quem consulta é você, clicando em "Buscar" como sempre. A sonda escuta a
resposta que a página **já recebeu**.

## O que sai daqui e chega até mim

Só o formato. A peneira (`peneira.js`) troca por `‹oculto›` tudo que
identifica alguém — CPF, nome, nascimento, endereço, nome de arquivo, texto
de comentário — e mantém três coisas, que são as que me servem e não
identificam ninguém:

- datas (para eu saber se vêm em ISO ou em brasileiro)
- códigos em caixa alta (`PENDENTE`, `CUMPRIMENTO_DE_EXIGENCIA`, `AGENDADO`)
- números curtos (id de serviço, contagem, página)

O padrão é invertido de propósito: **texto livre some por ser texto livre**,
mesmo em campo de nome inocente. Defender só por nome de campo não basta —
o portal é grande e vai ter chave que eu não previ.

O comprimento do que saiu fica no lugar (`‹texto 34›`), porque saber se um
campo tem 3 ou 3000 caracteres me diz se é rótulo ou parecer médico.

Do cabeçalho de autorização sai só o tipo e o tamanho (`‹Bearer · 812 car›`),
nunca o valor. Do endereço, os números longos saem mascarados.

`testes/peneira.test.js` e `testes/sonda.test.js` cobrem isso com as formas
reais que o portal devolveu — o segundo roda a sonda inteira num navegador de
verdade, contra um portal de mentira, e confere o arquivo que teria saído.

Três vazamentos já foram pegos por esses testes, todos meus:

- o número de protocolo, por ser só dígitos, atravessava a regra de "código";
- a URL guardada crua levava o protocolo no fim do endereço — peneirar o
  corpo e mandar o identificador no cabeçalho é peneirar pela metade;
- `nomeServico` e `nomeUnidade` iam apagados por terem "nome" na chave, sendo
  que são o serviço do INSS e a agência, que não identificam ninguém.

```
cd crm/fase2/robo-pat
node --test "testes/*.test.js"
```

## Como rodar

1. Entre no PAT/GERID e faça login no gov.br **normalmente**.
2. Vá para a tela de tarefas. Aperte **F12** → aba **Console**.
   (Se pedir, digite `allow pasting` e Enter.)
3. Abra **`sonda-no-navegador.js`**, copie tudo, cole no Console, Enter.
   Aparece **"sonda v2 ligada"**.
4. **Clique em "Buscar"** na tela. Se der para escolher 500 por página,
   escolha.
5. **Abra UMA tarefa** (clique numa linha). É este passo que responde a
   pergunta que sobrou.
6. Volte ao Console e digite `sondaPat.provar()`. Ele baixa
   **`sonda_pat2.json`**.
7. **Abra o arquivo e confira** antes de mandar. Se encontrar qualquer nome
   ou CPF, não mande — me avise que eu conserto a peneira.

## A resposta veio: verde

`"detalhe repetido pelo script": status 200`. O detalhe abre com o mesmo
crachá da sessão. A lista continua exigindo o seu clique (o reCAPTCHA está
no corpo dela, 2361 caracteres), mas depois dela o script busca sozinho o
detalhe de todos.

**Um clique por dia cobre a carteira.**

O detalhe traz, por requerimento: `dataEntradaRequerimento` (a DER),
`especieBeneficio` (o código do INSS, que vira a espécie sem adivinhação),
`status`, `nomeUnidade`, `nomeServico`, e — o mais valioso —
`agendamentosPericia` e `agendamentosAvaliacaoSocial` com data, hora,
agência e `situacaoAgendamento` (AGENDADO / REMARCADO).

## O coletor de todo dia

`coletar-no-navegador.js`. Mesmo caminho da sonda, propósito diferente:

**ATENÇÃO — este arquivo é o contrário da sonda.** Aqui vai dado real do
escritório, para o CRM. Fica na sua máquina. Não me mande.

1. PAT/GERID logado → Tarefas → F12 → Console.
2. Cole o coletor, Enter.
3. Na tela: data da última sincronização em "Data de atualização inicial",
   **500 por página**, e "Buscar".
4. Ele busca o detalhe do que veio (700ms entre um e outro), mostra o resumo
   no Console e baixa `pat_AAAA-MM-DD.json`.

Paginar é POST novo, e POST novo é captcha novo — por isso quem pagina é
você, pondo 500 por página. O coletor junta todas as páginas que você pedir.

**O que ele não leva:** anexo, comentário, campo adicional e dado dos
interessados. São laudo médico e relato de doença. O CRM guarda o LINK para
o portal; quem precisa ler abre lá, com o login dele. Anexos e comentários
viram CONTAGEM — dizem que há o que olhar, sem trazer o que é.

**O que ele vai me pedir:** no fim, o Console mostra uma tabela de serviços
que eu ainda não sei traduzir em espécie. `traduzir.js` só conhece os códigos
que eu VI numa resposta real — hoje, um. Mande essa tabela (é código de
serviço, não tem dado de cliente) e eu completo o mapa.

## Depois da sonda

Com o formato em mãos, a ordem é esta:

1. **Medir a cobertura.** Quantos dos 184 requerimentos do PAT casam com um
   caso do CRM pelo protocolo? E pelo CPF? Quantos casos do INSS no CRM não
   têm par no PAT? Essa conta decide o resto — e por si só já acha caso
   esquecido dos dois lados.
2. **Trazer a lista.** Um clique seu, o CRM compara com o que já sabe e
   escreve andamento só onde mudou.
3. **Trazer o detalhe** (exigências, perícias, remarcações), no formato que
   a resposta da pergunta 2 permitir.
4. **Pedir o webservice oficial** ao INSS/Dataprev pelo convênio. Demora
   meses; por isso começa em paralelo, não depois.
