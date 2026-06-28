# Download de arquivos grandes do Google Drive (acima de 10 MB)

O conector MCP do Drive devolve o conteúdo do arquivo pela janela de contexto do
modelo, então arquivos acima de ~10 MB travam (PDF de processo, CNIS, laudo). O
script `gdrive_download.py` resolve isso baixando o arquivo por ID **direto para o
disco**, sem passar pelo contexto. Depois o arquivo local é lido normalmente (a
ferramenta de leitura renderiza páginas, inclusive escaneadas) ou fatiado com
`pdf_split.py`.

É o mesmo padrão do acesso ao Microsoft To Do (script local + token), só que para o
Google. Setup uma vez.

## 1. Criar o cliente OAuth no Google Cloud (uma vez)

1. Acesse o **Google Cloud Console** (console.cloud.google.com) com a conta do
   escritório e **crie ou selecione um projeto**.
2. **APIs e Serviços → Biblioteca →** procure **Google Drive API → Ativar**.
3. **APIs e Serviços → Tela de permissão OAuth**, tipo **Externo**, preencha nome do
   app e e-mail de suporte. Em **escopos**, adicione
   `https://www.googleapis.com/auth/drive.readonly`. Em **usuários de teste**,
   adicione a conta Google do escritório (a dona dos arquivos). Deixe o app em
   **modo de teste** (não precisa de verificação para usuários de teste).
4. **APIs e Serviços → Credenciais → Criar credenciais → ID do cliente OAuth**, tipo
   de aplicativo **Aplicativo para computador** (Desktop app). Copie o **client_id**
   e o **client_secret**. (O tipo "TVs e dispositivos com entrada limitada" NÃO serve,
   o device flow do Google não aceita escopos do Drive.)

## 2. Guardar as credenciais (não vão para o Git)

Crie na raiz do projeto o arquivo `gdrive_oauth.json` (já está no `.gitignore`):

```
{ "client_id": "SEU_CLIENT_ID", "client_secret": "SEU_CLIENT_SECRET" }
```

(Ou exporte `GDRIVE_CLIENT_ID` e `GDRIVE_CLIENT_SECRET` como variáveis de ambiente.)

## 3. Fazer o login (uma vez, authorization code)

O Drive não funciona com device flow (o Google rejeita o escopo), então usa-se o
fluxo de código de autorização, que funciona pelo celular.

```
python3 gdrive_authcode.py url
```

Mostra uma URL. Abra no navegador, **faça login com a conta Google do escritório** e
autorize (como o app está em modo de teste, aparece o aviso de "app não verificado",
prossiga como usuário de teste). O navegador será redirecionado para
`http://localhost/?code=...` e dará "não foi possível acessar", **isso é normal**.
Copie a **URL inteira** da barra de endereço. Depois:

```
python3 gdrive_authcode.py exchange "<URL_colada_ou_code>"
```

Grava o `gdrive_tokens.json` (gitignored). A partir daí o token se renova sozinho.

## 4. Usar

```
python3 gdrive_download.py <file_id> [destino]
```

Baixa o arquivo do Drive por ID direto para o disco (por padrão em `/tmp`). Em
seguida leia o arquivo local ou fatie com `pdf_split.py`. Arquivos nativos do Google
(Docs/Sheets/Slides) são exportados para .docx/.xlsx/.pptx automaticamente.

## Observações

- A conta que fez o login precisa **ter acesso** ao arquivo (ser dona ou ter
  compartilhamento). A conta do escritório é dona das pastas dos clientes.
- O escopo é **somente leitura**. Para criar, copiar e gravar no Drive continua
  valendo o conector MCP.
- Nunca versione `gdrive_tokens.json`, `gdrive_oauth.json` nem `gdrive_device.json`.
