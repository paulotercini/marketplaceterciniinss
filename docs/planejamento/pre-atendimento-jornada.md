# Jornada do cliente: da Identificação à conclusão

Proposta de 14.11.2026, para aprovação do Paulo. Nada aqui está em produção.

## 1. O problema de hoje

O atendimento passa por "+ atendimento", "modo atendimento", "Salvar pré-caso", "Desfecho", "Criar caso" e "Encerrar". As anotações do atendimento ficam no cadastro do cliente (`campos.atendimento`), e as do caso ficam no caso. O colaborador não sabe onde está nem onde a anotação vai parar.

## 2. A regra da proposta

**Uma linha, cinco estações, sempre à vista no alto da ficha:**

Identificação › Pré-atendimento › Caso › Honorários › Conclusão

1. **O pré-caso já é o caso.** É a mesma linha de `casos` (`pre_caso = true`, F226). Toda anotação do pré-atendimento grava nessa linha, e não no cadastro. Ao virar caso, nada muda de lugar.
2. **Um botão por passagem**, de uma palavra: **Atender**, **Salvar**, **Criar**, **Cobrar**, **Concluir**.
3. **A estação atual fica colorida**, as anteriores em cinza com ✓ (o padrão da F323).
4. A inicial de quem responde segue a cor da pessoa: Paulo azul, Marcos verde sálvia, Amanda amarelo.

## 3. Simulação passo a passo

Cliente fictícia: Cliente Teste, 58 anos, diz que o INSS negou o auxílio por incapacidade.

**Passo 1. Chegada (recepção, nível 2).**
A recepção toca **Chegou** na Agenda. A ficha abre na Identificação, com a janela do balcão: CPF, senha do gov.br e dossiê.
*Vê:* a linha das estações com a Identificação colorida.
*Grava:* `clientes` (cadastro e `campos.gov`) e o dossiê em `anexos`. Menção ao advogado: "Cliente Teste chegou, dossiê com 31 documentos".

**Passo 2. Atender (advogado, nível 3 ou mais).**
A Dra. Amanda toca **Atender** na Identificação. O CRM cria a linha do pré-caso e abre o Pré-atendimento em tela cheia, com três telas em sequência:
- **Leitura** (o Primeiro atendimento em quadros: CNIS, pedidos, saúde, CadÚnico);
- **Direito** (a Análise de Direito do benefício escolhido, com os requisitos);
- **Documentos** (assinar, pedir ao cliente, guia do pedido).

À direita, sempre aberta, a gaveta **Anotações deste pré-caso**. O que se escreve ali grava como andamento da linha do pré-caso, com o autor.
*Grava:* `casos` (pre_caso, espécie, `ad`), `andamentos` do pré-caso, `analises_direito`.

**Passo 3. Salvar (advogado).**
Sem decisão ainda, a Dra. Amanda toca **Salvar**. O pré-caso fica no 🙋 Escritório com o selo "Pré-caso · Direito" e a cor amarela dela.
*Grava:* `casos.precaso.etapas`. Nada se perde ao sair.

**Passo 4. Decidir (advogado).**
No fim de Documentos há três saídas, lado a lado, sempre na mesma ordem:
- **Criar**: vira caso.
- **Futura**: vai às Aposentadorias futuras, com a data do direito.
- **Arquivar**: com o motivo; a linha fica encerrada e visível no histórico do cliente.

A Dra. Amanda toca **Criar**, escolhe "INSS" e informa o protocolo.
*Grava:* a mesma linha passa a `pre_caso = false`, fase INSS, protocolo em `protocolos`. As anotações do pré-atendimento continuam no topo do histórico do caso, na aba Escritório.

**Passo 5. Caso (equipe).**
A ficha abre direto no caso. A linha das estações mostra Caso colorido, com a fase atual (INSS azul, Conselho marrom, Judicial roxo). O trabalho segue como já é hoje: prazos, andamentos dos portais, perícias.
*Grava:* o que já grava hoje.

**Passo 6. Cobrar (advogado ou financeiro).**
Quando o caso recebe a concessão (carta, sentença, RPV), o CRM propõe os honorários do contrato (F236) e acende a estação Honorários. **Cobrar** abre as parcelas, a data e quem confere o pagamento.
*Grava:* `pagamentos` com `caso_id`. Nada se grava sem o clique.

**Passo 7. Concluir (advogado).**
Com todas as parcelas recebidas, **Concluir** encerra o caso e pergunta se o cliente segue com outro trabalho (Aposentadoria futura, nova revisão) ou se a relação termina.
*Grava:* caso encerrado, `ronda.conclusao = {em, por, motivo}`. A Identificação mostra "Concluído em dd/mm/aaaa".

## 4. O que cada pessoa vê

| Pessoa | Estações que usa | Botões |
|---|---|---|
| Recepção (nível 2) | Identificação | Chegou, Dossiê, Pronto |
| Advogado (nível 3 e 4) | Todas | Atender, Salvar, Criar, Futura, Arquivar, Cobrar, Concluir |
| Estagiário (nível 3) | Caso | anotações e prazos |

O nível abaixo do 3 vê a linha das estações, mas sem os botões.

## 5. O que muda no código

1. As notas de `campos.atendimento` passam a andamentos da linha do pré-caso (migração de cópia, sem apagar).
2. "+ atendimento", "modo atendimento" e "Salvar pré-caso" dão lugar a **Atender** e **Salvar**.
3. A linha das estações (`faixaJornada`) entra no alto da ficha, acima das fases.
4. Honorários e Conclusão ganham estado próprio na mesma linha de `casos`.

## 6. Pontos para decisão do Paulo

- Se o Arquivar do pré-caso fica visível no histórico do cliente ou apenas no Cuidar do acervo.
- Se a estagiária pode tocar **Atender** em retorno de cliente já existente.
- Se **Cobrar** fica com o advogado ou com uma pessoa do financeiro.
