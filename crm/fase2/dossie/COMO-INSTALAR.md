# Dossiê do cliente — um botão, todos os documentos

Com o **gov.br do cliente já logado**, um clique baixa tudo para
`Downloads/Dossie/<Nome CPF>/` e, se o CRM estiver conectado e o CPF tiver ficha,
anexa cada PDF ao cliente (origem `dossie`).

## Instalar

1. `chrome://extensions` → **Modo do desenvolvedor** → **Carregar sem compactação** → esta pasta (`dossie`).
2. Ícone da extensão → **⚙ configurar o CRM**: endereço do Supabase, chave anônima, e-mail e senha
   (os mesmos da extensão do CRM). Sem isso, os arquivos vão só para a pasta.
3. Em `chrome://settings/downloads`, desligue "Perguntar onde salvar cada arquivo".

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

O progresso aparece na faixa azul no rodapé da página; no fim ela diz o que veio e o que faltou.

## O que ela não faz

- Não faz login, não digita senha, não resolve captcha. O extrato de pagamento pode pedir captcha
  (o INSS liga e desliga isso): aí ele aparece em "não vieram" e se baixa pela tela.
- Uma chamada por vez, com pausa — o portal é do INSS.

## Ainda não

- **HCRP**: login próprio, ainda não mapeado.
- **Emprega Brasil**: conferido ao vivo em 07.10.2026 (CTPS digital e outros vínculos com 12 contratos, RAIS, CAGED).
- Conferido ao vivo (07.10.2026): CNIS ×3, declaração, lista de pedidos e cópia de processo.
  Só pelo código do Meu INSS, falta ver numa conta com dado: carta de concessão, laudo, extrato de
  pagamento, PPP e CAT.

Testes: `node --test testes/regras.test.js`
