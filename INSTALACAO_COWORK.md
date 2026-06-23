# Instalação no cowork (máquina do escritório)

Guia para colocar o assistente do escritório (skills `triagem`, `inicial`,
`inicial-inss` e o cérebro `CLAUDE.md`) para rodar numa máquina nova, por exemplo
em `C:\Users\VAIO\Claude\Projects\Triagem`.

Resumo honesto. **Nada precisa ser reconstruído.** Todos os arquivos vivem no
repositório Git privado `paulotercini/marketplaceterciniinss`. O único item que não
vem no clone é o `graph_tokens.json` (é credencial, fica fora do Git de propósito),
e ele é **regerado por login**, não depende de backup. É trabalho de configuração.

---

## 1. O que vive no repositório (e já vai junto no clone)

- **Scripts** (raiz): `graph_bootstrap.py`, `graph_client.py`, `graph_refresh.py`,
  `graph_devflow.py`, `triagem.py`, `triagem_do_dia.py`, `todo_anexo.py`,
  `todo_conclusao.py`, `pdf_split.py`, `docx_escritorio.py`.
- **Cérebro**: `CLAUDE.md` (doutrina, personalização, mapa de ativação de skills,
  verificações automáticas).
- **Base de conhecimento**: `_base-conhecimento-inss/skills/` (skills `base-*` e
  `ponte-*`).
- **Skills operacionais**: `.claude/skills/triagem/`, `.claude/skills/inicial/`,
  `.claude/skills/inicial-inss/` e os comandos equivalentes em `.claude/commands/`.

## 2. O que NÃO vem no clone (e por quê)

- `graph_tokens.json` e `graph_device.json` estão no `.gitignore` porque são
  credenciais. **Não procure por backup.** O `graph_tokens.json` é recriado pelo
  login do passo 5. O `CLIENT_ID` do aplicativo Microsoft já está no código
  (`graph_devflow.py`), então o login é interativo e não exige segredo guardado.

## 3. Pré-requisitos

- **Git** instalado.
- **Python 3** instalado e no PATH. (No Windows o comando costuma ser `python`, não
  `python3`.)
- **Conta Microsoft do escritório** (para o To Do).
- **Conta Google do escritório** (para o Drive).

## 4. Clonar o repositório

Importante. As novidades recentes (as três skills, o `docx_escritorio.py`, o
`CLAUDE.md` atualizado, a trava de acentos do `todo_conclusao.py`, as skills
`base-cnis-acerto-indicadores` e `base-documentos-comprobatorios-in128`) estão na
branch `claude/todo-drive-integration-c6z0aa`. **Faça o merge dela para a `main`
antes**, ou clone essa branch. Se clonar só a `main` sem o merge, esses itens faltam.

```
cd C:\Users\VAIO\Claude\Projects
git clone <URL do repo privado> Triagem
cd Triagem
git checkout main        # após o merge da branch, ou:
# git checkout claude/todo-drive-integration-c6z0aa
```

## 5. Conectar o Microsoft To Do (gerar o token)

No nosso setup o **To Do não é um conector MCP**. Ele é acessado pelos scripts via
Microsoft Graph, usando o `graph_tokens.json`. "Conectar o To Do" significa rodar o
login abaixo, que cria esse arquivo.

```
python graph_devflow.py start
```

O comando mostra um código e um endereço (microsoft.com/devicelogin). Abra o
endereço, digite o código e entre com a **conta Microsoft do escritório**. Depois:

```
python graph_devflow.py poll
```

Isso grava o `graph_tokens.json`. A partir daí, o `graph_bootstrap.py` renova o
acesso sozinho no início de cada sessão. **Nunca** versione o `graph_tokens.json`.

## 6. Conectar o Google Drive

O Drive **é** um conector MCP, à parte dos scripts. Ligue o conector do Google
Drive nas integrações do cowork, autorizando com a **conta Google do escritório**.
As skills usam as operações de buscar, ler, baixar, criar e copiar arquivos.

## 7. Instalar as dependências Python das peças

A maioria dos scripts usa só a biblioteca padrão. Dois precisam de instalação:

```
pip install pypdf python-docx
```

- `pypdf` é usado pelo `pdf_split.py` (fatiar PDFs combinados).
- `python-docx` é usado pelo `docx_escritorio.py` (gerar a petição em .docx no
  padrão do escritório).

## 8. Conferir que funcionou

```
python graph_bootstrap.py
python triagem_do_dia.py
```

O primeiro deve responder `access_token renovado`. O segundo deve listar as tarefas
do Paulo vencendo hoje (ou avisar que não há). Se ambos rodarem, o To Do está
conectado.

## 9. Como usar as skills

- **`triagem`** processa a fila do dia, ou um cliente específico passado como
  argumento. Cruza o To Do com o Drive e a base, grava conclusão (C) e parecer, e
  mantém a seção "Pendências em aberto".
- **`inicial`** monta a petição inicial e o jogo de provas para distribuir
  (PJe/ESAJ/Eproc).
- **`inicial-inss`** monta o requerimento administrativo para anexar no Meu INSS.

Cada `SKILL.md` traz, no fim, a seção **Dependências**, listando os scripts, os MCP
e as skills `base-*` de que precisa.

## 10. Avisos

- O assistente **nunca** protocola, envia mensagem, renomeia ou apaga no Drive. Só
  prepara e deixa pronto.
- Toda saída em português do Brasil com acentuação correta. Datas em horário de
  Brasília.
- O `graph_tokens.json` é credencial. Se for trocar de máquina, basta refazer o
  login do passo 5 na nova máquina; não copie o arquivo por canais inseguros.
