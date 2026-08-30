# Ambiente — rodar, publicar e ter um banco de homologação

Escrito em 15.08.2026, com o app na versão 09.00. Tudo aqui foi conferido no
repositório; onde algo depende de uma ação sua, está dito.

---

## 1. Rodar o CRM na sua máquina

O CRM é **um arquivo só**: `crm/fase2/app.html`. Não tem build, não tem
`npm install`, não tem servidor. O navegador abre e pronto.

```bash
git clone https://github.com/paulotercini/marketplaceterciniinss.git
cd marketplaceterciniinss
```

Duas formas de abrir:

**a) Clicar no arquivo** — funciona, com uma ressalva: em `file://` o navegador
é mais rígido com algumas coisas (o `iframe` do site interno na divisão
Consulta pode não abrir). Bom para conferir tela.

**b) Servir numa porta local** — é o mais parecido com o que o escritório usa:

```bash
python3 -m http.server 8000
# depois: http://localhost:8000/crm/fase2/app.html
```

Em qualquer uma das duas, a primeira tela pede **e-mail e senha** de
colaborador. Antes disso, o aparelho precisa saber **qual banco** usar — é a
seção 3.

### Conferir se não quebrou nada

```bash
python3 -m pytest tests/ -q                       # 199 testes
node --test "crm/fase2/*/testes/*.test.js"        # 281 testes

# a suíte de TELA (59 provas que abrem o app num Chromium de verdade):
cd crm/fase2/testes/cadastro
npm install && npx playwright install chromium chromium-headless-shell   # uma vez
node rodar.js                                     # ~2 min, 4 em paralelo
cd -

# sintaxe do app (o erro mais comum ao mexer num arquivo de 13 mil linhas):
node -e '
const fs=require("fs"),vm=require("vm");
const s=fs.readFileSync("crm/fase2/app.html","utf8");
const re=/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g;
let m,n=0,bad=0;
while((m=re.exec(s))){n++;try{new vm.Script(m[1])}catch(e){bad++;console.log("ERRO",e.message)}}
console.log("blocos",n,"erros",bad);'
```

---

## 2. Publicar

```bash
python3 crm/publicar.py
git add -A && git commit -m "…" && git push origin main
```

`publicar.py` copia `crm/fase2/app.html` para `docs/crm/index.html`. O push na
`main` tocando `docs/**` dispara o workflow do GitHub Pages, e em um a dois
minutos o sistema está em

**https://paulotercini.github.io/marketplaceterciniinss/crm/**

Três coisas que o `publicar.py` faz por você:

- **recusa publicar com segredo dentro.** Se alguém tiver colado o endereço do
  Supabase ou a chave no lugar do texto `COLE_AQUI_`, ele para. O que vai para
  o ar não tem credencial nenhuma;
- avisa o tamanho do arquivo publicado;
- lembra do push, que é o que efetivamente publica.

Depois de publicar, quem já tem o sistema aberto precisa de **Ctrl+Shift+R**
(recarregar ignorando o cache) para ver a versão nova. A versão aparece ao lado
do título, na tela de login.

---

## 3. Onde o navegador guarda o endereço do banco e a chave

**No `localStorage`, numa chave só: `crm_cfg`.** O valor é um JSON com dois
campos:

```json
{"url": "https://xxxx.supabase.co", "key": "a anon key do projeto"}
```

O arquivo publicado nasce com `COLE_AQUI_…` nos dois campos (linhas 1513–1514 do
`app.html`); na primeira abertura, `faltaConfig()` percebe isso e a tela de
login mostra o botão **"configurar este aparelho"**.

Outras chaves que o app guarda no mesmo lugar: `crm_sessao` (o token da
sessão), `crm_subaba`, `crm_subcad`, `crm_menu`, `crm_som` e `crm_cal_visao` —
todas de preferência, nenhuma de segurança. O rascunho do andamento fica em
`sessionStorage`, na chave `rasc:<id do caso>`, e morre ao fechar a aba.

### Configurar um aparelho novo

1. abra **https://paulotercini.github.io/marketplaceterciniinss/crm/**;
2. clique em **configurar este aparelho**, no rodapé da caixa de login;
3. cole o **endereço do projeto** (`https://xxxx.supabase.co`) e a **anon key**;
4. entre com e-mail e senha do colaborador.

A anon key **não é segredo grave**: sozinha ela não abre nada, porque toda
tabela tem RLS e as políticas exigem usuário autenticado. O que não pode
circular é a **service key** — essa vive só nos secrets do GitHub e no seu
computador, nunca no navegador.

### Trocar de banco depois

O mesmo botão troca. Para limpar tudo num aparelho, no console do navegador:

```js
localStorage.removeItem("crm_cfg");    // esquece o banco
localStorage.removeItem("crm_sessao"); // desloga
location.reload();
```

---

## 4. Um projeto Supabase de HOMOLOGAÇÃO, sem nenhum dado real

A ideia: um segundo projeto, gratuito, com o mesmo esquema e só gente
inventada. É onde se testa migração, se treina alguém novo e se erra à vontade.

### 4.1 Criar o projeto

1. https://supabase.com → **New project**;
2. nome: `crm-tercini-homolog` (nome diferente do de produção, para ninguém
   confundir na hora de copiar a URL);
3. região: **South America (São Paulo)**;
4. guarde a senha do banco que ele pede — ela não é usada pelo app, mas é a
   única forma de abrir o SQL por fora;
5. em **Project Settings → API**, anote o **Project URL** e a **anon key**.

### 4.2 Aplicar o esquema

No **SQL Editor** do projeto novo, rode nesta ordem, um arquivo por vez,
conferindo que terminou sem erro antes de ir para o próximo:

| Ordem | Arquivo | O que faz |
|---|---|---|
| 1 | `crm/fase2/schema.sql` | cria tudo: tabelas, índices, funções, gatilhos e RLS |
| 2 | `crm/fase2/schema_por_em_dia.sql` | as seções que vieram depois (11 a 15) |
| 3 | `crm/fase2/schema_f9_cadastro.sql` | os campos do cadastro da F9 |
| 4 | `crm/fase2/schema_conferencia.sql` | **não altera nada** — só devolve ✅/❌ do que entrou |

O SQL Editor roda cada arquivo **como uma transação só**: se uma linha falhar,
tudo volta atrás e só o erro daquela linha aparece. Por isso o passo 4 existe —
foi o que revelou, em produção, que o índice das parcelas não tinha entrado.

### 4.3 Criar um colaborador para entrar

O login é do Supabase Auth, e a tabela `colaboradores` amarra o usuário ao
escritório:

1. **Authentication → Users → Add user**, com e-mail e senha (pode ser
   `homolog@exemplo.invalido`);
2. copie o **UUID** do usuário criado;
3. no SQL Editor:

```sql
update colaboradores
   set auth_id = 'cole-o-uuid-do-usuario-aqui'
 where inicial = 'P';
```

A amostra já cria quatro colaboradores fictícios (P, A, M e I). Amarre o seu
usuário a um deles.

---

## 5. Popular com dados fictícios

A amostra está versionada em **`cowork/06-amostra-ficticia.json`**: 20 clientes
inventados, CPF gerado por algoritmo (dígito verificador válido), casos em
todas as fases, andamentos das cinco origens, perícias, exigências com prazo,
pagamentos e lembretes. Nada ali veio do banco real.

```bash
export SUPABASE_URL=https://xxxx.supabase.co          # o de HOMOLOGAÇÃO
export SUPABASE_SERVICE_KEY=a-service-key-do-homolog

python3 crm/fase2/semear_homolog.py                   # ensaio: não grava nada
HOMOLOG=1 python3 crm/fase2/semear_homolog.py         # grava
HOMOLOG=1 python3 crm/fase2/semear_homolog.py --limpar   # remove só a amostra
```

Três travas, porque escrever no banco errado não se desfaz:

1. **sem `HOMOLOG=1` ele não grava** — imprime o que faria e sai;
2. **se o banco tiver mais de 50 clientes, ele para**: isso é cara de produção;
3. **o endereço aparece na tela antes** e, no terminal, ele pede que você
   digite `sim`.

Para regerar a amostra (por exemplo, depois de o esquema ganhar colunas):

```bash
python3 cowork/gerar_amostra.py
```

A semente é fixa: rodar de novo devolve exatamente o mesmo arquivo, e as
colunas saem de `cowork/dossie.json` — o retrato do banco real. Assim a amostra
acompanha o esquema **sem ninguém copiar dado**.

---

## 6. Apontar o app para homologação sem tocar em produção

**A troca é no aparelho, não no arquivo.** O `app.html` publicado não tem
endereço nenhum: quem manda é o `crm_cfg` de cada navegador. Isso significa que
você pode ter, ao mesmo tempo, o mesmo endereço aberto em dois lugares
apontando para bancos diferentes.

O jeito mais seguro, na ordem de preferência:

**a) Outro perfil do navegador** (o mais seguro). Chrome → *Adicionar perfil* →
abra o CRM lá e configure com a URL e a anon key de **homologação**. Perfis não
compartilham `localStorage`: produção continua intacta no perfil de sempre.

**b) Janela anônima.** Configure o aparelho na janela anônima; ao fechá-la,
some tudo. Bom para uma conferência rápida.

**c) O mesmo perfil, trocando de banco.** Use o botão "configurar este
aparelho" e cole a URL de homologação. **Risco real**: esquecer de voltar e
achar que está vendo produção quando não está.

Para tornar a confusão impossível, dê um **fundo diferente** às listas da
homologação: 🎨 no cabeçalho da lista. O fundo é guardado na tabela
`lista_pref` — ou seja, **no banco**, não no navegador — então uma cor forte
escolhida na homologação fica só lá, e produção nem fica sabendo. Uma olhada
na cor já diz de que lado você está.

> **Verificação de um segundo**, antes de qualquer coisa que grave: abra o
> console e rode `JSON.parse(localStorage.crm_cfg).url`. Ele diz, sem margem
> para dúvida, em qual banco você está.

### O que NUNCA apontar para homologação

- os **secrets do GitHub** (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`): eles
  alimentam a sincronização com o To Do de hora em hora. Trocá-los faria a
  sincronização escrever no banco errado — e o To Do é a fonte da verdade;
- a **extensão do navegador** e os robôs (PAT, CRPS, PJe): eles leem a mesma
  configuração; se for testar coleta em homologação, faça e devolva no mesmo
  dia, anotando no `ONDE-PARAMOS.md`.
