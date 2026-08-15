# Onde paramos — 15.08.2026

Bilhete de passagem entre conversas. O contexto de uma sessão acaba; o
repositório não. Quem chegar agora lê isto primeiro, depois o `CLAUDE.md`.

> **Mapa completo em `cowork/`** — seis arquivos gerados nesta data, cada um
> com o seu gerador versionado ao lado, para o próximo retrato ser um comando:
> `01-DOSSIE-BANCO.md` (o banco de produção, tabela a tabela),
> `02-DOSSIE-SYNC-TODO.md` (como a sincronização funciona hoje),
> `03-MAPA-APP.md` (índice das 13.381 linhas do app),
> `04-ESTADO-E-PENDENCIAS.md` (o que falta, com esforço estimado),
> `05-AMBIENTE.md` (rodar, publicar, homologação) e
> `06-amostra-ficticia.json` (20 clientes inventados para testar).

## Em que pé estão as coisas

**App na versão 09.02**, publicada em
https://paulotercini.github.io/marketplaceterciniinss/crm/ (Ctrl+Shift+R para
ver a versão nova).

**A reforma visual F1 a F8 está inteira no ar**, mais duas auditorias, a
**F9.1** (a Identificação do Cadastro em grade de 12 colunas, com RG, sexo,
estado civil, profissão, nome da mãe, PIS/NIT e telefones em lista) e a
**F9.2**, em dois passos:

- a senha do Meu INSS saiu da caixa amarela (amarelo quer dizer prazo) e
  virou campo da grade, ao lado da pasta do cliente; sem senha, o campo fica
  tracejado e convida a cadastrar. Morreram o `.id-card.destaque` e o bloco
  `.id-grid` da aba;
- CPF e nascimento passaram a aceitar clique no cartão inteiro, como os
  demais campos — antes só o lápis de 4px abria o editor;
- `.cad-grade` ganhou `align-items:start`: o cartão alto de Telefones
  esticava o Endereço vazio para 200px com três palavras no meio;
- protocolos, parceria e parentes viraram o cartão **Ligações do cliente**;
- **zero emoji nas cinco divisões** do Cadastro (25 pictogramas saíram).
  Onde o desenho carregava informação, entrou o SVG do `CAD_IC`.

**Três listas do To Do deixaram de virar caso**, por decisão do Paulo:

- `💵 Pagamentos` → a aba 💰 Honorários da ficha do cliente (08.93);
- `🙏 Aposentadorias Futuras` → 🔔 Lembrete, com as anotações do To Do dentro
  e um botão que transfere cada uma para os andamentos de um caso (08.90);
- `🙋 Escritório` → anotação no Cadastro do cliente; quem está lá aparece como
  **🟡 Em atendimento — buscando documentos**, sem sub-abas de andamento
  (08.99).

**O Cadastro virou o ponto de partida do atendimento** (08.98/09.00): divisões
Identificação · Anotações · Documentos · Consulta · Mensagens; documentos do
escritório (procurações, contratos, declarações e termo) gerados a partir da
ficha; catálogo de documentos por benefício impresso para o cliente e
registrado no CRM; indicação de pagamento ao INSS virando lembrete com o
cronograma inteiro, sem criar caso.

**O menu da ficha ficou em cinco abas**: Cadastro · Lembretes · Casos ·
Perícias · Honorários.

**Sincronização To Do → CRM** de hora em hora, 07h–20h, seg–sáb. Escrita de
volta CRM → To Do **DESLIGADA de propósito**, com trava dupla
(`ESCREVER_TODO=1` no workflow e no próprio script). Não religue sem o Paulo
pedir.

## O que trava HOJE, e depende do Paulo

1. **As três linhas do índice de `pagamentos`** — fim do
   `crm/fase2/schema_conferencia.sql`. Sem elas, **2.621 parcelas** do To Do
   são recusadas a cada hora com 42P10 e nenhum honorário do To Do existe no
   CRM. O índice tinha sido criado como PARCIAL, e índice parcial não serve de
   alvo para o `ON CONFLICT` que o PostgREST monta.
2. **Rótulo da espécie B26** ("Auxílio-reclusão"?), ainda provisório.
3. **HAR do e-SAJ e do eproc**, para os próximos coletores.
4. **Decisão sobre os 9 resumos de acórdão** (8 precisam de OCR).

## O que o retrato do banco revelou (15.08)

- **`clientes.endereco` está em 0%** — nenhum dos 1.890 clientes tem endereço.
  Nove dos dez modelos de documento usam endereço: hoje toda peça sai com essa
  linha em branco. E a F9.2 **não tem legado para migrar**.
- **As colunas da F9 já existem no banco e estão todas zeradas.** O gargalo da
  geração de documentos não é código, é preenchimento.
- **270 casos não aparecem em lista nenhuma**: vieram de listas com nome quase
  igual ao mapeado, sem o emoji (`Escritório`, `Petição Inicial`, `Recurso
  Administrativo`, `Impugnações`, `Audiências`). 194 estão ativos.
- **243 clientes sem CPF** — cada um é uma duplicata à espera de alguém
  escrever o CPF no título da tarefa.
- **De 20.639 andamentos, 22 foram escritos dentro do CRM.** O resto veio do
  To Do (19.068) e dos robôs.

## O que vem a seguir (detalhe e esforço em `cowork/04`)

F9.3 (endereço e RG **capturados** pela primeira vez — não há legado para
migrar, **M**) · F10 (Triagem da Amanda, **G**) · F11 (terminar a geração de
documentos, que já existe pela metade, **M**) · F12 (raiz e ramos
processuais, **G**) · F13 (Consulta sem iframe, **M**).

A ordem acima é a de `cowork/00-PROJETO-CRM-COWORK.md`, escrita depois do
retrato do banco. A ordem antiga era de reforma visual e ficou para trás.

## Erros que já custaram caro (não repetir)

- **Reescrever bloco por cima apaga o que não veio do portal.** Merge não
  destrutivo sempre (`fundirBlocoCrps`; curados nunca regenerados).
- **Supabase corta em 1000 linhas SEM avisar.** Lista grande = `todas()` no
  app, `_rest_todas()` no Python. Já causou duplicação em série (23505).
- **Memória de dedupe vem do banco NA HORA, no conferir E no aplicar.**
  D.novid só tem 30 dias; plano que replaneja com D cru mente na tela.
- **`criado_em` decide onde o andamento aparece**: agora = 📣 Novidades;
  data do movimento = só história. Escolha consciente em cada fonte.
- **Entidade HTML não protege dentro de onclick** — o parser devolve o
  apóstrofo antes de virar JS. Lá é `escJs`, não `esc`.
- **Lote é tudo ou nada no PostgREST**; o `migrar.py` parte o lote até achar
  a linha culpada. **Erro sem a mensagem do servidor é silêncio** — repasse o
  corpo da resposta.
- **A coluna do autor em `andamentos` é `autor_id`** (teste barra a volta).
- **O navegador do Paulo é o Comet** (Chromium); manifesto com chave nova
  demais pode ser recusado inteiro, sem console.
- **Índice único PARCIAL não serve de alvo para upsert.** O PostgREST monta
  `ON CONFLICT (coluna)` sem o predicado, e o Postgres devolve 42P10 — mesmo
  com o índice criado sem erro nenhum. Segurou 2.621 parcelas por dias.
- **O SQL Editor do Supabase roda o arquivo como UMA transação.** Uma linha com
  erro desfaz tudo e a tela mostra só o erro dela: dá para achar que "rodou
  quase todo" quando não gravou nada. Confira com `schema_conferencia.sql`.
- **A lista do To Do casa pelo nome EXATO, com emoji.** `Escritório` sem emoji
  não é `🙋 Escritório`: a tarefa com CPF entra como fase `outro` e o caso não
  aparece em lista nenhuma.
- **`:focus-within` não segura o composer** — `<span>` não recebe foco, e em
  Safari/Firefox botão também não: o painel fechava no `mousedown`. É a classe
  `.esc-aberto`.
- **`fill` de SVG como atributo congela na primeira pintura**; tem que vir do
  CSS.
- **Captura de tela pega o que teste de texto não pega.** Seis `undefined` na
  tela da F9.1 passaram por todos os testes e apareceram na primeira imagem.
- **E o contrário também.** A imagem da F9.2 não dizia se o cartão novo
  REAGIA ao clique: só a asserção de interação pegou o CPF que continuava
  abrindo o editor apenas pelo lápis. Imagem e asserção são duas provas
  diferentes, e cada entrega precisa das duas.
- **Grade CSS estica o item baixo até a altura do vizinho alto.** Sem
  `align-items:start`, o Endereço vazio virava um retângulo de 200px.
- **Git no diretório conectado não apaga o próprio `index.lock`.** Pelo
  `device_bash`, todo comando que escreve o índice deixa um lock que o mount
  se recusa a remover, e o commit seguinte falha com "File exists". O
  caminho que funciona é o PowerShell na máquina (Windows-MCP), que apaga o
  lock e roda o git normalmente.
- **`pytest` não está instalado na máquina do escritório.** As 199 do
  `tests/` rodam no GitHub Actions; localmente sobra o teste de sintaxe do
  `<script>` e os arneses de fumaça.

## Como conferir se está tudo de pé

```bash
python3 -m pytest tests/ -q          # 199
node --test "crm/fase2/*/testes/*.test.js"   # 278 pass
# sintaxe do app: node -e "vm.Script sobre os blocos <script> do app.html"
# fumaça no navegador (Playwright, dados fictícios): os harnesses ficam no
# scratchpad da sessão — teste-f9.js, teste-atendimento.js, teste-escritorio.js,
# teste-abas.js, teste-multiproc.js, teste-pgto.js, teste-composer.js.
# NÃO estão versionados; se virarem suíte, o lugar é crm/fase2/testes/.
```
