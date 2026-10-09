# Dossiê do cliente — um botão, todos os documentos

Com o **gov.br do cliente já logado**, um clique baixa tudo para a pasta do cliente:

    G:\Meu Drive\Processos\<Letra>\<Nome #CPF>\Dossie\<CNIS | Processos administrativos | …>\

**Pasta que já existe vence**: o programa procura em todas as letras, primeiro pelo `#CPF` no nome
(aceita com pontos ou faltando o zero), depois pelo nome sem acento (pastas antigas sem CPF). Cliente
novo ganha `<Letra>\Nome Capitalizado #CPF`, com da/de/do/dos/das/e em minúscula
(ex.: `M\Maria da Silva #12345678901`). Se o CRM estiver conectado e o CPF tiver ficha,
cada PDF também é anexado ao cliente (origem `dossie`).

## Instalar (uma vez por computador)

1. `chrome://extensions` (ou no Comet) → **Modo do desenvolvedor** → **Carregar sem compactação** →
   esta pasta (`dossie`).
2. Programa que grava no Drive (precisa de Python 3 e do Google Drive para computador):
   ```
   powershell -ExecutionPolicy Bypass -File host\instalar.ps1
   ```
   Drive em outra letra: `... instalar.ps1 -Raiz "H:\Meu Drive\Processos"`.
   O popup mostra "Drive: G:\Meu Drive\Processos" quando está tudo certo. Sem o programa, os
   arquivos caem em `Downloads/Dossie/<Nome CPF>/`.
3. Ícone da extensão → **⚙ configurar o CRM**: endereço do Supabase, chave anônima, e-mail e senha
   (os mesmos da extensão do CRM).
4. Em `chrome://settings/downloads`, desligue "Perguntar onde salvar cada arquivo" (só importa sem o programa).

## Usar

1. **Meu INSS** (`meu.inss.gov.br`, logado como o cliente) → ícone → **Baixar tudo desta aba**.
   Desce: CNIS completo, resumido e ano civil · declaração de beneficiário · carta de concessão e laudo
   de cada benefício · extrato de pagamento dos últimos 12 meses · **cópia integral de todos os pedidos**
   (não só os do ano) · PPP eletrônico de cada vínculo · CAT.
2. **e-Recursos** (`consultaprocessos.inss.gov.br`) → mesmo botão → todos os documentos de cada recurso.
   Rode o Meu INSS antes: é dele que vem o CPF que separa os recursos do cliente quando a lista é do
   advogado.

3. **Emprega Brasil** (`servicos.mte.gov.br/spme-v2`) → **Entrar com gov.br** → espere abrir a área do
   trabalhador → mesmo botão. Desce: CTPS Digital e CTPS de outros vínculos (com todos os dados),
   extrato RAIS e extrato CAGED, na subpasta `CTPS RAIS CAGED`.

4. **HC Ribeirão** (`appiris.hcrp.usp.br`, logado — de preferência por **Entrar com gov.br**, que é
   de onde vem o CPF; com login pelo registro HC, vale o CPF do último dossiê do Meu INSS) → mesmo
   botão. A aba passa sozinha pelas três telas e grava em `HC Ribeirao\`:
   - **Exames**: só de imagem e de método (radiografia, tomografia, ressonância, ultrassom,
     eletroneuromiografia, densitometria, biópsia…), de **todo o período** (o filtro vai para
     "Exibir tudo"), um PDF por data. Exame de sangue fica de fora. Imagem "Em Realização" ou
     "Em processamento" ainda não tem laudo e aparece em "sem resultado".
   - **Internações**: a autorização/resumo de cada internação.
   - **Relatórios**: todos os relatórios médicos e multiprofissionais.

O progresso aparece na faixa azul no rodapé da página; no fim ela diz o que veio e o que faltou.

## O que ela não faz

- Não faz login, não digita senha, não resolve captcha. O extrato de pagamento pode pedir captcha
  (o INSS liga e desliga isso): aí ele aparece em "não vieram" e se baixa pela tela.
- Uma chamada por vez, com pausa — o portal é do INSS.

## Ainda não

- **HC Ribeirão**: conferido ao vivo em 08.10.2026 tela a tela (31 relatórios, 2 internações, 3 exames
  de imagem com laudo); a volta completa pela extensão ainda não rodou.
- A lista do que é "exame de imagem" está em `regras.js` (`IMAGEM`): exame que faltar, acrescente lá.
- **Emprega Brasil**: conferido ao vivo em 07.10.2026 (CTPS digital e outros vínculos com 12 contratos, RAIS, CAGED).
- Conferido ao vivo (07.10.2026): CNIS ×3, declaração, lista de pedidos e cópia de processo.
  Só pelo código do Meu INSS, falta ver numa conta com dado: carta de concessão, laudo, extrato de
  pagamento, PPP e CAT.

Testes: `node --test testes/regras.test.js`
