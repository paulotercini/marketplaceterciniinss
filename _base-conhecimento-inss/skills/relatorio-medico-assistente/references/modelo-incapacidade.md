# Modelo de relatório de incapacidade

Serve à incapacidade temporária (B31 previdenciária, B91 acidentária) e à permanente (B32 previdenciária, B92 acidentária). Onda 165, 03/10/2026: alinhado ao modelo curto de `base-modelo-relatorio-medico-incapacidade-b31-b91-b92/references/MODELO-BASE.md`, que prevalece em caso de divergência.

## O que o relatório precisa conter

1. Nome, CPF, data de nascimento, profissão e data de emissão.
2. Diagnóstico com CID e quarto dígito, lado e origem (primária ou pós-traumática).
3. Exames datados com o achado objetivo e o grau da escala quando houver.
4. Tratamento realizado, com sessões, medicação e tempo de uso, e situação cirúrgica.
5. Limitação em verbos com medida, ligada às tarefas da profissão.
6. Duas datas, a do início da doença e a do início da incapacidade, cada uma com o documento que a prova.
7. Prazo de afastamento em dias ou, na permanente, a frase de que o quadro não permite reabilitação para outra atividade.
8. Local, data, assinatura, CRM legível e carimbo. O relatório não cita artigo de lei.

## Estrutura do relatório

```
RELATÓRIO MÉDICO

Paciente: [nome]. CPF: [número]. Nascimento: [data].
Profissão: [função e tarefas].
Diagnóstico: [CID com quarto dígito], [nome, lado e origem].

Acompanho o(a) paciente desde [mês/ano]. A doença foi diagnosticada em [data]
por [exame], e o exame de [data] mostra [achado e grau]. Ao exame físico, [sinais
com medida].

Já realizou [tratamento], sem melhora suficiente para voltar ao trabalho.

Na função de [profissão], precisa [tarefas]. Hoje não consegue [limitações com
medida], de modo que não pode exercer essa atividade.

A doença está documentada desde [DID], e a incapacidade começou em [DII], quando
[marco]. Indico afastamento por [X] dias a partir de [data].

[Local], [data].
[Nome do médico], [especialidade], CRM [número legível] e carimbo.
```

## Entregar três blocos

Quando o usuário pedir um modelo para o médico, entregue no mesmo arquivo:

1. A orientação do que o relatório precisa conter (os itens acima).
2. O modelo com lacunas mínimas, já com os CIDs e doenças do caso preenchidos.
3. Um exemplo completo preenchido com os dados reais, para o médico ver o nível de detalhe esperado.

Se o usuário enviou um modelo próprio para seguir, espelhe a estrutura dele e ignore este esqueleto.
