# Duas Falhas de Método da Auditoria, e Como Evitá-las

Onda 143 (18/09/2026). Registrado a partir do caso do Tema 862 do STJ, apontado pelo titular.

## O caso

O Tema 862 do STJ é **termo inicial do auxílio-acidente**. A base o citava, em cinco arquivos distintos, como se fosse **integração ao salário-de-benefício**, com teses inventadas que nunca existiram.

A auditoria de 12/07/2026 detectou o erro e corrigiu. Dois meses depois, o erro continuava em vinte ocorrências, e o titular o encontrou. A correção tinha sido feita, mas incompleta, e é isso que este registro trata.

## Falha 1. Correção parcial, só na definição

A auditoria corrigiu a seção onde o tema é DEFINIDO, na skill própria, com nota datada e tudo. Não varreu os USOS do tema espalhados pelo restante da base.

Ficaram errados a description da skill, o parágrafo de escopo, dois cenários de aplicação, três blocos de refutação e as definições em outras cinco skills, cada uma com uma tese inventada diferente. Todas afirmavam integração, e todas citavam o mesmo número.

**Regra que passa a valer.** Corrigido um item, a Etapa 5 roda `grep -rn` do número do tema em TODA a base, e cada ocorrência é lida e classificada. A varredura de conferência não conta ocorrências, ela LÊ o contexto de cada uma. Ocorrência que não deixa claro o objeto do tema é reescrita para deixar.

O comando é este, e entra no roteiro.

```
grep -rn "Tema NNN" skills/ agents/ | grep -viE "<palavra-chave da tese correta>"
```

Toda linha que sobrar depois do filtro é suspeita, e se resolve lendo, não presumindo.

## Falha 2. O nome do arquivo contaminado

A skill se chamava `base-b94-integracao-salario-beneficio-tema862`. O nome amarrava, no próprio identificador, o tema errado ao assunto errado.

Nome de skill é lido pelo modelo antes do conteúdo, aparece em toda referência cruzada e sobrevive a qualquer correção interna. Enquanto o diretório se chamasse assim, a associação errada continuaria sendo reproduzida, mesmo com o corpo do arquivo correto.

Foi renomeada para `base-b94-integracao-salario-beneficio-art31`, que é o fundamento verdadeiro, com atualização das dezessete referências cruzadas.

**Regra que passa a valer.** A auditoria confere também o NOME do arquivo e o nome das seções. Achando número de tema, súmula ou enunciado no nome, verifica se a associação está correta. Estando errada, o item sobe como BLOQUEANTE e o arquivo é renomeado com `git mv`, seguido da atualização de todas as referências.

## Falha 3, menor. Paráfrase passando por tese literal

A correção de julho registrou a tese como "observando-se, se for o caso, a prescrição quinquenal de parcelas do benefício". A redação oficial é "observando-se a prescrição quinquenal da Súmula 85/STJ".

A diferença parece pequena e não é. A redação oficial NOMEIA a Súmula 85, que é fundamento adicional aproveitável em peça, e a paráfrase o perdeu.

**Regra que passa a valer.** Tese entre aspas é transcrição, e transcrição se confere caractere a caractere contra a fonte. Não cabendo a transcrição integral, o texto não vai entre aspas e se identifica como resumo.

## O que se ganhou ao refazer

A reconferência de 18/09/2026 trouxe três dados que a correção de julho não tinha.

O trânsito em julgado do Tema 862 está confirmado, e a matéria subiu ao STF como Tema 1225, onde o Supremo decidiu em 13/08/2022 que não há repercussão geral por ser questão infraconstitucional. A tese do STJ está firme e definitiva, o que permite citá-la sem ressalva de pendência.

A descrição oficial do Tema 1225 registra uma regra prática que a base não tinha. Sem auxílio-doença prévio e sem requerimento administrativo do auxílio-acidente, o STJ fixou o termo inicial na CITAÇÃO do INSS. É regra desfavorável, e por isso precisa ser conhecida, porque torna o requerimento administrativo prévio decisivo para não perder retroativos.

Lição geral. Auditoria que só conserta o ponto apontado deixa o erro vivo nos usos. E a reconferência de um item já auditado não é retrabalho, porque costuma trazer o que a primeira passada não viu.
