# Evidência (medida em 17.09.2026, `medir_v10.js` sobre a fixtura da prova, viewport 1440×900)

## Estrutural
- Elementos interativos visíveis na ficha aberta: 44; no painel do caso: 30 (`medir_v10.js`, campo `inter`/`interPainel`).
- Profundidade máxima da árvore do painel: 11 níveis.
- Linha do caso fechada: 6 elementos (espécie+✎, benefício, DER+✎, tramitação, verificação, +) — `app.html:14123` (`linhaCaso`).
- Afordância repetida com o mesmo propósito: "+" abre os números (`lcNumeros`, `app.html:14073`) e "+ gestão do caso" abre a gestão (`lcGestao`, `app.html:14098`); os quatro botões de ação (fundir / não é caso / encerrar / reabrir) têm um único gerador, `acoesDoCaso` (`app.html:14374`), usado pela linha e pelo cartão.
- Duplicidade removida: a régua F81 (`reguaCaso`) e o quadro "O que cobra ação" (`.acao-caso`) saíram; o cartão de fatos sobrevive dentro do segundo ➕ com as linhas repetidas ocultas por CSS (`app.html:2163-2165`).

## Visual
- Escala tipográfica no tema: 10 / 11 / 12 / 13 / 17 / 20 px (tokens em `app.html:2003-2013`; fecho da escala em `app.html:2207-2214`). Antes da correção havia 11.5, 12.5, 13.333 e 18 px fora da escala (chips de tipo, autor, botões de sinal, o "+").
- Cores: placa `#EAEDEF` (linha do caso, quadro cinza), vermelho `#B3261E` (Manual, prazo processual), verde `#1B6E38` (verificado), petróleo `#0E5C58` (ação). 27 cores distintas na ficha inteira, das quais as cores de avatar são dados (cor do colaborador), não decoração.
- Contraste: branco sobre `#B3261E` = 6,5:1; `#B3261E` sobre `#EAEDEF` = 5,6:1; rótulos `#56656F` sobre `#EAEDEF` = 5,1:1 (todos ≥ 4,5:1).
- Estados: vazio (faixa sem prazos `app.html:13537`; "Incluir + NB/E-SisREC/Judicial" `lcNumeros`; "nenhum" protocolo `lcGestao`), carregando (`#app.logado` e o aviso `app.html:9356`), erro (aviso com o arquivo de schema a rodar, `lcGuardarNb`/`lcGuardarFixo`), sucesso (avisos de gravação), foco (`:focus-visible` `app.html:2213`), desativado (compositor bloqueado em caso encerrado, `app.html:14475`).

## Texto e honestidade
- Rótulos visíveis no painel: DER, Tramitação, Verificação, +, Andamentos do Escritório, INSS, Recurso (CRPS), Judicial, Caso completo, Prazo processual, Lembrar antes, Lembrete, Comentário fixo, saber mais, os oito tipos do compositor, copiar em texto, ✔ li.
- "(sem dados)" na aba com número mas sem andamento; "ninguém verificou ainda"; "não informada" na DER vazia; "a definir" na verificação sem escolha — nenhum rótulo promete o que não faz.
- Padrões escuros: nenhum (sem continuidade forçada, custo oculto, escassez falsa ou constrangimento).
- Rótulo → comportamento: "saber mais" leva à anotação de origem (`qdIrParaAndamento`) ou abre a ficha do prazo com as ações (`prazoSaberMais`, `app.html:13555`); "✓ verifiquei agora" grava `checado_em`/`checado_por`; "inserir no andamento" escreve no compositor e só nele (`popInserir`).

## Peso e fricção
- `app.html`: 1.391.676 bytes crus; 412.012 bytes com gzip (o GitHub Pages serve comprimido). Um único arquivo, sem dependências externas além das fontes (Google Fonts).
- Requisições ao abrir a ficha (mock): 37 (auth + tabelas). Interativo em 322 ms na fixtura.
- Animações em repouso: 0. `prefers-reduced-motion` respeitado (`app.html:102`). Modo escuro: não há.
- Modais/avisos ao carregar: 0.

## Acessibilidade
- Foco visível em botão, link, campo, summary e valor copiável (`app.html:2213`).
- O "+" da linha tem `aria-label` e `aria-expanded`; os "+" de incluir número têm `aria-label` igual ao título.
- Toda ação primária é alcançável por teclado (botões nativos); os valores copiáveis são spans com `data-cop` (clique), com o botão 📋 mantido fora do tema.
- Lacuna conhecida: não há `skip-link` nem landmarks além de `section[aria-label]` na linha do caso e nas faixas.
