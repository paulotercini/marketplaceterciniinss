# Sonda do e-Recursos (CRPS) — passo a passo

A sonda é o primeiro passo do robô dos recursos administrativos: ela consulta
2 ou 3 processos SEUS na API que o site do INSS usa por baixo e salva as
respostas num arquivo. Com essa amostra eu desenho o robô definitivo (fichas
com histórico completo, atualização diária, aviso quando a sessão cair).

Use a **mesma máquina da ponte do WhatsApp** — é nela que o robô vai morar.

## 1. Instalar (uma vez só)

Abra o terminal na pasta `crm/fase2/robo-crps` e rode:

```
npm install
npx playwright install chromium
```

(O segundo comando baixa o navegador controlado — demora alguns minutos.)

## 2. Dizer quais processos sondar

Copie o arquivo `nups.exemplo.txt` com o nome `nups.txt` e cole nele 2 ou 3
links dos seus favoritos, um por linha (a URL inteira serve). Escolha
variados: um recurso recente, um antigo e, se tiver, um já julgado.
**Não** use os marcados "senha do cliente".

O `nups.txt` fica só na sua máquina — o git ignora ele de propósito.

## 3. Rodar

```
npm run sonda
```

Vai abrir uma janela de navegador. Se aparecer a tela do gov.br, **faça o
login normalmente** (senha, verificação no celular, o que pedir). A sonda
espera até 5 minutos e depois trabalha sozinha: consulta cada processo nos
dois sistemas (o novo e o antigo), com 4 segundos de pausa entre cada
consulta — sem afobação, do jeito que o site gosta — e tira uma foto da tela
de cada um.

## 4. Me mandar o resultado

Vai surgir a pasta `sonda_resultado`. Clique nela com o botão direito →
**Enviar para → Pasta compactada** e me mande o .zip **aqui pelo chat**.

⚠ O resultado tem dados de cliente (nome, CPF, teor do processo). Só por
este canal — nada de e-mail, grupo ou drive compartilhado.

## 5. Teste bônus (importante!)

No dia seguinte, rode `npm run sonda` de novo **sem fazer login**. Se
funcionar direto, a sessão do gov.br segura de um dia para o outro no perfil
salvo — e o robô poderá rodar diariamente sem te pedir login toda hora. Me
conte o que aconteceu, seja qual for o resultado.

## Se algo der errado

- **Captcha do gov.br dá "inválido" mesmo acertando**: é o gov.br percebendo
  que o navegador estava sendo automatizado e recusando por baixo dos panos.
  A sonda já usa o **seu Chrome instalado** e remove os sinais de automação
  justamente para evitar isso. Se ainda acontecer: feche tudo, apague a pasta
  `perfil` que aparece ali dentro e rode `npm run sonda` de novo. Persistindo,
  confirme que o **Google Chrome** está instalado na máquina (não o Edge).
- **Tudo deu HTTP 401/403**: a autenticação é diferente do que mapeei. Me
  mande o `resumo.txt` mesmo assim, que eu ajusto a sonda.
- **A janela não abre / erro do Playwright**: rode de novo o
  `npx playwright install chromium`.
- **"Falta o arquivo nups.txt"**: o passo 2 ficou pelo caminho. 😉
