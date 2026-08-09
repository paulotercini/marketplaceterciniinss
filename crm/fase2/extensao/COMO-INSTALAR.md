# A extensão — um botão por portal

## O que ela faz

Roda **na sua sessão já logada**, coleta o que mudou e entrega ao CRM. Você
não abre mais o Console, não cola script e não baixa arquivo.

Ela **coleta e entrega — não decide nada**. O que vira caso, o que atualiza
e o que pode ser duplicado continua sendo decidido na tela 📥 Importar do
INSS, com o plano na sua frente, como já era.

## Os dois botões

**🖥 Recursos (e-Recursos)** — faz tudo sozinho. Depois do login não há
captcha nenhum: ela pega no CRM os processos com número de recurso, consulta
um a um e entrega. Um clique, e pronto.

**🌻 INSS (PAT/GERID)** — faz tudo **menos um clique**. A lista do PAT exige
um token de reCAPTCHA, que a página só gera quando uma PESSOA aciona a
busca. A extensão abre a tela e preenche a data da última atualização e o
500 por página; **você clica em "Buscar"**; daí em diante ela faz o resto
sozinha — o detalhe de cada requerimento e a entrega.

Não mando o script clicar em "Buscar" de propósito. Seria exatamente o robô
que o captcha existe para barrar, e o convênio está no seu nome.

Depois da lista não há mais captcha: o detalhe abre com a mesma sessão. Foi
o que a sonda provou.

## Instalar (uma vez)

1. Rode o `schema_por_em_dia.sql` no Supabase — ele cria a tabela `coletas`,
   que é a fila onde a extensão entrega.
2. Chrome → `chrome://extensions` → ligue o **Modo do desenvolvedor** (canto
   superior direito).
3. **Carregar sem compactação** → escolha esta pasta (`extensao`).
4. Clique no ícone da extensão → **configurar e entrar no CRM** → cole o
   endereço do Supabase e a chave anônima. São os dois mesmos valores que
   estão no seu `app.html`.
5. Na mesma tela, mais abaixo, **entre com o seu e-mail e senha do CRM**.

O passo 5 não é opcional. O banco só devolve dados para quem entrou: com a
chave anônima sozinha, toda consulta responde "ok" com **lista vazia** — e a
extensão anuncia, convicta, que não há nenhum recurso cadastrado. A senha não
fica guardada: ela é usada uma vez, ali, para obter um crachá renovável, e
depois só o crachá vive na máquina. Dá para revogá-lo no Supabase e para sair
pelo botão **Sair** da mesma tela.

O popup avisa em vermelho enquanto esse login não existir.

## O dia a dia

1. Esteja logado no portal (gov.br, como sempre).
2. Clique no ícone da extensão.
3. **Recursos**: clique e espere.
   **INSS**: clique, e quando a faixa laranja pedir, clique em "Buscar".
4. Abra o CRM em **📥 Importar do INSS**. A coleta aparece esperando: você
   confere o plano e aplica.

O popup mostra há quantos dias cada portal foi atualizado. Quem não abre há
uma semana vê "faz 7 dias" antes de clicar.

## Quando não acontecer nada

Duas ferramentas, e as duas respondem em um clique.

**Para o CRM**, no popup: **🔎 Testar a ligação com o CRM**. Ele responde as
três perguntas de uma vez — quem está logado, quantas fichas o banco devolve e
quantas têm número de recurso. `0 ficha(s) visíveis` significa que o login não
está valendo; muitas fichas e `0 com número de recurso` significa que os
números realmente não estão cadastrados.

**Para o PAT**, no console da página (F12 → Console), procure as linhas com a
etiqueta azul **[CRM]**. Elas contam a história inteira:

- `extensão no ar nesta página` — a extensão está instalada e vale para esta
  página. **Se esta linha não existir, nada mais importa**: o problema é a
  instalação. Abra `chrome://extensions`, confira a versão e veja se há um
  erro em vermelho no cartão da extensão.
- `coletor confirmado dentro da página` — o coletor subiu. Se em vez dela vier
  uma faixa vermelha dizendo que o portal bloqueou o coletor, o problema é a
  política de segurança do site.
- `xhr: …/tarefa/consulta ← é a lista` — o gancho viu a busca.
- `resposta da lista: 184 tarefa(s)` — a lista chegou.
- `guardei 184 — clique em 🌻 INSS` — chegou antes do seu clique, e está
  guardada esperando.

A ordem dos cliques não importa mais: se você buscar primeiro e clicar na
extensão depois, ela continua de onde a busca parou.

## O que ela não faz, e não vai fazer

- Não gera, guarda ou reaproveita token de reCAPTCHA.
- Não faz login por você.
- Não clica em "Buscar".
- Não roda em servidor nem com você fora da máquina.

E respeita o limite de velocidade do portal: 3 segundos entre chamadas, e
para na primeira recusa em vez de insistir. Se parar, espere alguns minutos
e clique de novo — ela continua de onde estava.
