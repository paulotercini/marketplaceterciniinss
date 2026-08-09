# PAT/GERID — sonda, antes de qualquer robô

## O que a sonda responde

Duas perguntas. A segunda decide o projeto.

1. **Qual é o formato exato das respostas do portal?** Preciso dele para
   escrever o robô sem adivinhar nome de campo.

2. **O DETALHE de um requerimento abre só com a sessão, ou pede reCAPTCHA
   novo?** É aqui que o projeto se define:

   - **Abre sem captcha** → um clique seu por dia traz a carteira inteira:
     situação, exigências, perícias agendadas e remarcadas.
   - **Pede captcha** → a lista ainda diz QUAIS mudaram desde ontem, e você
     abre só esses. É o que já faz hoje, mas sem procurar quais.

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

`testes/peneira.test.js` cobre isso com formas reais de dado do portal. Um
dos testes já pegou um vazamento: o número de protocolo, por ser só dígitos
em caixa alta, atravessava a regra de "código".

```
cd crm/fase2/robo-pat
node --test "testes/*.test.js"
```

## Como rodar

1. Entre no PAT/GERID e faça login no gov.br **normalmente**.
2. Vá para a tela de tarefas. Aperte **F12** → aba **Console**.
   (Se pedir, digite `allow pasting` e Enter.)
3. Abra **`sonda-no-navegador.js`**, copie tudo, cole no Console, Enter.
   Aparece **"sonda ligada"**.
4. **Agora clique em "Buscar"** na tela. Se der para escolher 500 por
   página, escolha.
5. Ela avisa no Console e baixa **`sonda_pat.json`**.
6. **Abra o arquivo e confira** antes de mandar. Se encontrar qualquer nome
   ou CPF, não mande — me avise que eu conserto a peneira.

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
