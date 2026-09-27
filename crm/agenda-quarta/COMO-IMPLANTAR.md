# Agenda de quarta · implantação do Apps Script

O CRM fala com este Apps Script, que roda na conta do Paulo e é o único ponto que grava no Google Agenda. Copie `appsscript.json` e `Code.gs` desta pasta para o projeto no script.google.com.

## 6. Implantação (passos do Paulo, fora do CRM)

1. Acessar script.google.com com a conta paulotercini@gmail.com e criar o projeto "Agenda Quarta CRM".
2. Colar o `appsscript.json` e o `Code.gs` da seção 4.
3. No editor, selecionar a função `configurarTokens` e executar. Autorizar o acesso à agenda quando solicitado. Copiar do registro de execução o token de cada pessoa e entregar a cada colaborador individualmente.
4. Executar `testeDisponibilidade` e conferir no registro as próximas três quartas.
5. Implantar, em Nova implantação, tipo "App da Web", executar como "Eu", acesso "Qualquer pessoa". Copiar a URL gerada e entregá-la à sessão do CRM.
6. Depois de testada a agenda no CRM, abrir o Google Agenda no computador, em Configurações, na agenda paulotercini@gmail.com, seção "Compartilhar com pessoas específicas", e alterar a permissão de Amanda, André, Ingrid e Marcos para **"Ver todos os detalhes dos eventos"**. Sem essa alteração a equipe continua podendo lançar eventos por cima da agenda do CRM.
7. Toda alteração no `Code.gs` exige nova versão da implantação (Implantar, Gerenciar implantações, editar, Nova versão), mantendo a mesma URL.
8. Para revogar um token, executar `configurarTokens` de novo e redistribuir os tokens.

## 7. Transição

1. Os agendamentos já lançados manualmente nas próximas quartas continuam válidos. O CRM os lê como ocupados e os conta no limite quando o título começa por 001 ou 002.
2. As sobreposições já existentes nas próximas quartas precisam ser resolvidas manualmente antes da virada, porque o sistema impede novas, mas não desfaz as antigas.
3. A partir da data de virada, agendamento só pelo CRM.

