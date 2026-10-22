# Agenda de atendimentos · implantação do Apps Script

O CRM fala com este Apps Script, que roda na conta do Paulo e é o único ponto que grava no Google Agenda. Copie `appsscript.json` e `Code.gs` desta pasta para o projeto no script.google.com.

## 6. Implantação (passos do Paulo, fora do CRM)

1. Acessar script.google.com com a conta paulotercini@gmail.com e criar o projeto "Agenda Quarta CRM".
2. Colar o `appsscript.json` e o `Code.gs` da seção 4.
3. No editor, selecionar a função `configurarTokens` e executar. Autorizar o acesso à agenda quando solicitado. Copiar do registro de execução o token de cada pessoa e entregar a cada colaborador individualmente.
4. Executar `testeDisponibilidade` e conferir no registro as próximas três quartas.
5. Implantar, em Nova implantação, tipo "App da Web", executar como "Eu", acesso "Qualquer pessoa". Copiar a URL gerada e entregá-la à sessão do CRM.
6. Depois de testada a agenda no CRM, abrir o Google Agenda no computador, em Configurações, na agenda paulotercini@gmail.com, seção "Compartilhar com pessoas específicas", e alterar a permissão de Amanda, André, Ingrid e Marcos para **"Ver todos os detalhes dos eventos"**. Sem essa alteração a equipe continua podendo lançar eventos por cima da agenda do CRM.
7. Toda alteração no `Code.gs` exige nova versão da implantação (Implantar, Gerenciar implantações, editar, Nova versão), mantendo a mesma URL.
8. Colaborador novo: no topo do bloco de tokens do `Code.gs`, escrever o nome em `COLABORADOR` (papel `equipe` ou `admin`), salvar e executar `adicionarColaborador`. O token sai no registro de execução e os tokens dos demais continuam valendo. Colaborador que sai: mesmo nome em `COLABORADOR`, executar `revogarColaborador`. Quem tem acesso hoje: `listarColaboradores`. Nada disso exige nova implantação. `configurarTokens` só serve para trocar os tokens de todos de uma vez.

## 7. Transição

1. Os agendamentos já lançados manualmente nas próximas quartas continuam válidos. O CRM os lê como ocupados e os conta no limite quando o título começa por 001 ou 002.
2. As sobreposições já existentes nas próximas quartas precisam ser resolvidas manualmente antes da virada, porque o sistema impede novas, mas não desfaz as antigas.
3. A partir da data de virada, agendamento só pelo CRM.


## Profissionais, cores e dias (F152)

Paulo, Marcos e Amanda agendam na MESMA agenda do Google (a do Paulo). A cor do evento diz de quem ele é: azul-mirtilo (colorId 9) é do Paulo, verde-manjericão (10) do Marcos e amarelo-banana (5) da Amanda. Um compromisso na cor de alguém bloqueia só essa pessoa; sem uma dessas cores, bloqueia todos. Um atendimento 001/002 sem cor conta no limite do Paulo. Se a equipe usar outro tom (por exemplo, pavão ou sálvia), ajuste `cor` em `CONFIG.PROFISSIONAIS`.

O limite de 14 por dia e o encaixe das 18h00 às 18h30 são só do Paulo. O Paulo atende às quartas; Marcos e Amanda, de segunda a sexta. O tratamento usado na mensagem de WhatsApp (por exemplo, "o Dr. Marcos") também está em `CONFIG.PROFISSIONAIS`: confira os nomes completos antes de implantar.

Os dias fixos e as trocas pontuais (a quarta 07/10 pela quinta 08/10, por exemplo) são mudados pelo próprio CRM, em "Dias de atendimento", só com o token do Paulo. Ficam nas propriedades do script (AJUSTES), sem editar o código. A agenda "Férias" bloqueia só o Paulo; a "Feriado", todos.

## Vagas no Google Agenda (F250, 21.10.2026)

O escritório deixa no Google Agenda os horários disponíveis com o título só do tipo: `001` (primeiro atendimento, 45 minutos) ou `002` (cliente do escritório, 30 minutos); `001 livre` também vale. Na cor do profissional, como os demais eventos.

- Num dia com vagas, só elas são oferecidas, dos dois tipos; num dia sem nenhuma vaga, o horário livre continua calculado como antes.
- A vaga não ocupa nem conta no limite do dia.
- Agendar pelo CRM troca o título do mesmo evento para `001 - Nome do cliente - Não confirmado`, com telefone e quem agendou na descrição.
- Cancelar ou remarcar devolve o evento à vaga (`001` ou `002`), em vez de apagá-lo.
- Quem preferir pode continuar trocando o título à mão no Google Agenda: o CRM passa a mostrar o horário como atendimento.

Esta mudança está no `Code.gs`: copie o arquivo inteiro para o projeto no script.google.com e faça uma nova versão da implantação, mantendo a mesma URL (passo 7 acima).

## Cores, evento sem cor e Editar (F250e, 22.10.2026)

- Cada profissional aceita os tons da sua cor no Google: Paulo, mirtilo (9), pavão (7) e lavanda (1); Marcos, manjericão (10) e sálvia (2); Amanda, banana (5) e tangerina (6).
- O atendimento e a vaga **sem cor** são do Paulo, dono da agenda: não aparecem nem ocupam a agenda do Marcos e da Amanda. O compromisso sem cor que não é atendimento (almoço, reunião) continua bloqueando todos.
- Ação nova `editar`: troca o nome e o telefone de um atendimento já marcado, inclusive o lançado à mão, mantendo o tipo e o status.
- O diagnóstico `?diag=1` mostra, só em contagens, as cores usadas pelos atendimentos e pelas vagas e quantas vagas cada profissional tem.

## O LIVRE do Marcos e da Amanda (F250f, 22.10.2026)

No Google do escritório o Marcos (sálvia) e a Amanda (banana) deixam o horário livre como `LIVRE 10:30-11:00` ou `LIVRE 09h30-10h00`, sem o código. O script lê esse título como vaga sem tipo: aparece tracejada na cor do profissional (no tom do 001 se tiver 45 minutos ou mais, no do 002 se tiver menos), o tipo vem do cliente na hora de agendar (001 primeiro atendimento, 002 cliente do escritório), o horário do evento não muda e cancelar devolve o título LIVRE original. O título com telefone anotado deixa de ser vaga.
