#!/usr/bin/env python3
"""Monta cowork/01-DOSSIE-BANCO.md a partir de:
   dossie.json    — retrato do banco (estrutura + contagens), tirado no Actions
   catalogo.json  — índices e políticas declarados nos .sql do repositório
   uso.json       — quem escreve/lê cada tabela e coluna (mapeamento do código)
Nenhum dado de cliente entra aqui: só nome de tabela, nome de coluna e número.
"""
import json, os, datetime

BASE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(f"{BASE}/dossie.json", encoding="utf8"))
CAT = json.load(open(f"{BASE}/catalogo.json", encoding="utf8"))
USO = json.load(open(f"{BASE}/uso.json", encoding="utf8")) if os.path.exists(f"{BASE}/uso.json") else {}

ATOR = {"app": "app (CRM no navegador)", "sync_todo": "sincronização do To Do",
        "robo_pat": "robô do PAT/INSS", "robo_crps": "robô do CRPS", "datajud": "consulta CNJ (DataJud)",
        "dou": "monitor do DOU", "pje": "coletor do PJe", "smbot": "SMBot (WhatsApp)",
        "gatilho_sql": "gatilho no banco", "ninguem": "ninguém"}
RLS_LOOP = ['colaboradores','clientes','credenciais','credencial_vis','casos','andamentos','eventos',
  'pagamentos','tarefas','atribuicoes','meu_dia','modelos_mensagem','sugestoes','mencoes','leads',
  'documentos_beneficio','conversas','checklist_modelo','modelos_documento','vinculos','frases_prontas',
  'lembrar_motivos','inss_fila','orgao_producao','rotinas','rotinas_feitas','andamentos_lidos','anexos',
  'aposentadorias','lista_pref','config_app','zap_conversas','zap_mensagens','zap_transferencias',
  'zap_bot_passos','zap_avisos','inss_calendario','andamento_tarefas']


def limpar(txt):
    """Nenhum trecho de código citado como evidência pode carregar um número que
    pareça CPF, telefone ou NB — mesmo quando é exemplo de documentação."""
    import re as _re
    t = str(txt or "")
    t = _re.sub(r"\d{3}\.?\d{3}\.?\d{3}-?\d{2}", "[número removido]", t)
    t = _re.sub(r"\(?\d{2}\)?\s?\d{4,5}-?\d{4}", "[número removido]", t)
    t = _re.sub(r"\d{8,}", "[número removido]", t)
    return t.replace("|", "/")


def atores(lista):
    return ", ".join(ATOR.get(a, a) for a in (lista or [])) or "—"


def pct_txt(k, linhas):
    if not linhas:
        return "— (tabela vazia)"
    if k["pct"] is None:
        return "não medido"
    return f"{k['pct']:.1f}% ({k['preench']})"


def indices_de(t):
    vistos, saida = set(), []
    for i in CAT["indices"].get(t, []):
        chave = (i["nome"], i["colunas"])
        if chave in vistos:
            continue
        vistos.add(chave)
        saida.append(f"`{i['nome']}`{' único' if i['unico'] else ''} em ({i['colunas']})"
                     + (f" — parcial: `{i['parcial']}`" if i["parcial"] else ""))
    return saida


def politicas_de(t):
    p = [f"`{x['nome']}` — {x['acao']} para `{x['papel']}`" for x in CAT["politicas"].get(t, [])]
    if t in RLS_LOOP and not p:
        p = ["`autenticados` — todas as operações para `authenticated` (`using true`)"]
    return p


def rls_de(t):
    if t in RLS_LOOP or t in CAT["rls"]:
        return "ligada"
    return "**não declarada** no schema do repositório"


L = []
w = L.append
hoje = datetime.date.today().strftime("%d.%m.%Y")
total_linhas = sum(v["linhas"] or 0 for v in D.values())
total_cols = sum(len(v["colunas"]) for v in D.values())
vazias = sorted(t for t, v in D.items() if not v["linhas"])
milhar = f"{total_linhas:,}".replace(",", ".")

w(f"""# Dossiê do banco — CRM Tercini

Retrato tirado em **{hoje}**, do banco de produção, por conexão **somente de
leitura**: o script `crm/fase2/dossie_banco.py` só emite `GET` e `HEAD`, e conta
linhas com `limit=0` + `count=exact`, forma em que o banco devolve **o número no
cabeçalho e o corpo vazio**. Rodou de dentro do GitHub Actions, que é onde vivem
as credenciais (workflow `crm-dossie.yml`).

**Não há nenhum dado de cliente neste arquivo.** Nome, CPF, telefone, endereço,
senha e texto de andamento não passaram pelo processo em momento algum. Onde é
preciso mostrar um formato, o valor é **fictício** e está dito.

Origem de cada informação:

| Bloco | De onde veio |
|---|---|
| tabelas, colunas, tipo, nulidade, padrão, PK e FK | OpenAPI do PostgREST do projeto |
| total de linhas e preenchimento por coluna | contagens no banco de produção |
| índices e políticas de RLS | `crm/fase2/schema.sql`, `schema_por_em_dia.sql` e `schema_f9_cadastro.sql` (o que o repositório **declara**; a API não expõe o catálogo do Postgres) |
| quem escreve e quem lê | leitura do código: `app.html`, `migrar.py`, robôs, coletores e gatilhos |

**"Preenchida" não é o mesmo que "não nula".** Texto em branco não conta, e
jsonb que ficou no padrão (`[]` ou `{{}}`) também não — sem esse cuidado,
`clientes.telefones` apareceria com 100%, quando o que existe é a lista vazia
que o próprio `default` criou.

## O banco em números

| | |
|---|---|
| Tabelas expostas pela API | **{len(D)}** |
| Colunas | **{total_cols}** |
| Linhas somadas | **{milhar}** |
| Tabelas sem nenhuma linha | **{len(vazias)}** |
""")

w("| Tabela | Linhas | Colunas | Colunas em 0% |")
w("|---|---:|---:|---:|")
for t in sorted(D, key=lambda x: -(D[x]["linhas"] or 0)):
    v = D[t]
    zero = sum(1 for k in v["colunas"].values() if k["pct"] == 0.0)
    w(f"| `{t}` | {v['linhas'] or 0} | {len(v['colunas'])} | {zero if v['linhas'] else '—'} |")

w("""
---

## O que salta aos olhos

1. **`pagamentos` está com zero linha** — e não é por falta de uso: as 2.621
   parcelas do To Do são recusadas a cada sincronização com o erro 42P10,
   porque o índice único de `todo_item_id` foi criado como PARCIAL e o
   PostgREST não consegue usá-lo no `ON CONFLICT`. A correção são três linhas
   (`crm/fase2/schema_conferencia.sql`, no fim). Enquanto isso, **nenhum
   honorário do To Do existe no banco**.
2. **`clientes.endereco` está em 0%** — de 1.890 clientes, nenhum tem endereço
   guardado. Nove dos dez modelos de documento usam endereço; hoje toda peça
   sairia com essa linha em branco.
3. **As colunas novas da F9 já existem no banco** (RG, estado civil, profissão,
   sexo, endereço em pedaços, nome da mãe, PIS/NIT, telefones em lista) e
   **todas estão zeradas**. O gargalo da F12 não é código, é preenchimento.
4. **`casos` tem 53 colunas, 16 delas em 0%.** É a tabela que mais acumulou
   campo que nasceu de uma ideia e nunca foi preenchido.
5. **11 tabelas estão vazias**, entre elas todo o módulo de WhatsApp dentro do
   CRM e a tela de Vendas.

---

## Tabela por tabela

Cada bloco traz a finalidade em uma linha, quem escreve, quem lê, as colunas com
tipo, nulidade, padrão, chave estrangeira e percentual preenchido, os índices e
as políticas de RLS. As colunas em **0%** aparecem destacadas logo abaixo da
tabela — são as candidatas a morte, para conferência humana antes de qualquer
`drop column`.
""")

for t in sorted(D, key=lambda x: -(D[x]["linhas"] or 0)):
    v, u = D[t], USO.get(t, {})
    w(f"\n### `{t}`\n")
    w(f"**{u.get('finalidade','—')}**\n")
    w(f"- **Escreve:** {atores(u.get('escritores'))}")
    w(f"- **Lê:** {atores(u.get('leitores'))}")
    w(f"- **Linhas:** {v['linhas']}")
    w(f"- **RLS:** {rls_de(t)}")
    pol = politicas_de(t)
    w("- **Políticas:** " + ("; ".join(pol) if pol else "nenhuma declarada"))
    idx = indices_de(t)
    w("- **Índices:** " + ("; ".join(idx) if idx else "só a chave primária"))
    if u.get("observacoes"):
        w(f"- **Nota:** {u['observacoes']}")
    w("")
    w("| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |")
    w("|---|---|---|---|---|---|")
    for c in sorted(v["colunas"], key=lambda x: (not v["colunas"][x]["pk"], x)):
        k = v["colunas"][c]
        w(f"| `{c}`{' 🔑' if k['pk'] else ''} | {k['tipo']} | {'sim' if k['nulo'] else 'não'} "
          f"| {('`'+str(k['padrao'])+'`') if k['padrao'] else '—'} "
          f"| {('`'+k['fk']+'`') if k['fk'] else '—'} | {pct_txt(k, v['linhas'])} |")
    zero = sorted(c for c, k in v["colunas"].items() if k["pct"] == 0.0)
    if zero:
        w(f"\n> **Em 0%, candidatas a morte:** " + ", ".join(f"`{c}`" for c in zero))

# ── A ─────────────────────────────────────────────────────────────────────
w("""
---

## A) Tabelas que existem no schema mas estão vazias ou ninguém lê

Vazia não quer dizer inútil: parte destas é estrutura pronta esperando o
recurso ser ligado. A coluna "o que fazer" separa as duas coisas.
""")
# por que cada uma está vazia: o motivo real, quando é sabido
NOTAS_VAZIAS = {
 "pagamentos": ("**vazia por defeito, não por desuso**",
   "as 2.621 parcelas do To Do são recusadas a cada rodada com 42P10 — falta o índice único "
   "NÃO PARCIAL de `todo_item_id`. Última tentativa: sincronização de 15.08, 14h18 UTC"),
 "lembrete_avisos": ("recurso ligado, ainda sem uso",
   "há 419 lembretes vivos, mas ninguém registrou um aviso ainda — o histórico começa no primeiro clique"),
 "anexos": ("recurso pronto, nunca ligado", "o upload existe na tela; nenhum arquivo foi enviado até hoje"),
 "conversas": ("substituída na prática", "o histórico de WhatsApp passou a viver no painel do SMBot"),
 "leads": ("recurso pronto, nunca ligado", "a tela de Vendas existe e nenhum lead foi cadastrado"),
 "rotinas": ("recurso pronto, nunca ligado", "as rotinas internas continuam no To Do, não aqui"),
 "rotinas_feitas": ("depende de `rotinas`", "sem rotina cadastrada, não há o que marcar como feita"),
 "integracao_token": ("por desenho", "RLS ligada e nenhuma política: a API não lê nem escreve; é cofre de token"),
 "zap_conversas": ("recurso pronto, nunca ligado", "o atendimento de WhatsApp dentro do CRM não foi ativado"),
 "zap_mensagens": ("depende de `zap_conversas`", "sem conversa, não há mensagem"),
 "zap_transferencias": ("depende de `zap_conversas`", "sem conversa, não há transferência entre atendentes"),
}
w("| Tabela | Linhas | Por que está vazia | Detalhe |")
w("|---|---:|---|---|")
for t in vazias:
    sit, det = NOTAS_VAZIAS.get(t, ("sem uso registrado", "conferir antes de qualquer `drop table`"))
    w(f"| `{t}` | 0 | {sit} | {det} |")

so_le = [t for t, u in USO.items() if (u.get("escritores") in ([], ["ninguem"], None)) and D.get(t, {}).get("linhas")]
if so_le:
    w("\nTabelas **com dado, mas que nenhum código escreve** (foram semeadas por SQL e vivem de leitura):")
    for t in sorted(so_le):
        w(f"- `{t}` — {D[t]['linhas']} linha(s); {USO[t].get('finalidade','')}")

# ── B ─────────────────────────────────────────────────────────────────────
ALEG = json.load(open(f"{BASE}/alegacoes.json", encoding="utf8")) if os.path.exists(f"{BASE}/alegacoes.json") else []
conf = [a for a in ALEG if a.get("confirmado")]
refut = [a for a in ALEG if a.get("confirmado") is False]
w(f"""
---

## B) Colunas que o app grava e nunca lê, e o contrário

**Como foi apurado.** Primeiro, uma leitura do código levantou {len(ALEG)}
candidatas. Depois, cada uma passou por uma verificação mecânica: buscar TODA
menção ao nome da coluna **nos arquivos que falam daquela tabela** e classificar
cada menção como escrita (`coluna:` num corpo de POST/PATCH, atribuição) ou
leitura (`.coluna`, `select=`, filtro `coluna=eq.`, uso em template).

O recorte por tabela importa: procurar o nome solto pelo repositório inteiro
salva colunas mortas por homonímia — a palavra `cidade` aparece no gerador do
portal (a cidade da perícia) e `uf` aparece no importador da fila do INSS, e
nenhuma das duas diz coisa alguma sobre `clientes.cidade`.

Sobreviveu quem continuou sem nenhuma menção do lado negado: **{len(conf)} de
{len(ALEG)}**. As outras {len(refut)} caíram e estão no fim da seção — saber o
que NÃO é candidato também vale.

**Cuidado com a palavra "nunca escrita".** Não quer dizer vazia: `criado_em`
com `default now()`, sequências e gatilhos do banco preenchem sozinhos. Quer
dizer que **nenhum código do escritório escreve ali** — e isso muda o que
significa apagar a coluna.
""")

def bloco(titulo, tipo, nota):
    itens = [a for a in conf if a["tipo"] == tipo]
    w(f"\n### {titulo} ({len(itens)})\n")
    w(nota + "\n")
    if not itens:
        w("_Nenhuma._")
        return
    w("| Coluna | Quem mexe | Preenchida | Onde se procurou | Evidência |")
    w("|---|---|---|---|---|")
    for a in sorted(itens, key=lambda x: (x["tabela"], x["coluna"])):
        k = D.get(a["tabela"], {}).get("colunas", {}).get(a["coluna"], {})
        linhas = D.get(a["tabela"], {}).get("linhas")
        n = a.get("arquivos_olhados", 0)
        onde = (f"{n} arquivo(s) que citam a tabela" if n
                else "**nenhum arquivo fora do banco cita esta tabela**")
        w(f"| `{a['tabela']}.{a['coluna']}` | {a.get('quem') or '—'} | {pct_txt(k, linhas) if k else '—'} "
          f"| {onde} | {limpar(a.get('ev'))[:100]} |")

bloco("Gravadas e nunca lidas", "nunca lida",
      "O sistema escreve e ninguém consulta. São as que mais pesam: custam gravação "
      "toda vez e não devolvem nada. Antes de apagar, olhe se a coluna não é o registro "
      "de auditoria de algo (quem fez, quando) que um dia será cobrado.")
bloco("Lidas e nunca escritas pelo código", "nunca escrita",
      "A tela mostra, mas nada no sistema preenche: ou o dado entra à mão pelo SQL "
      "(catálogo semeado), ou é campo de recurso que nunca foi ligado.")

if refut:
    w("\n### Alegações derrubadas na verificação\n")
    w("Foram apresentadas como candidatas e **não são** — há uso de verdade:\n")
    for a in sorted(refut, key=lambda x: (x["tabela"], x["coluna"])):
        w(f"- `{a['tabela']}.{a['coluna']}` — {limpar(a.get('contra'))[:160]}")

# ── C ─────────────────────────────────────────────────────────────────────
cli = D["clientes"]
F9 = {
 "rg": "RG", "rg_orgao": "órgão emissor do RG", "estado_civil": "estado civil",
 "profissao": "profissão", "sexo": "sexo", "logradouro": "logradouro", "numero": "número",
 "complemento": "complemento", "bairro": "bairro", "cidade": "cidade", "uf": "estado (UF)",
 "cep": "CEP", "nome_mae": "nome da mãe", "pis_nit": "PIS/NIT", "telefones": "telefones em lista",
}
w(f"""
---

## C) `clientes` hoje, campo a campo — e o que a F9 pede

A tabela tem **{len(cli['colunas'])} colunas** e **{cli['linhas']} linhas**. Abaixo, o
que existe HOJE no banco, com o quanto está preenchido, para comparar com a
lista da F9.
""")
w("| Campo | Tipo | Preenchida | Pedido pela F9 | Observação |")
w("|---|---|---|---|---|")
for c in sorted(cli["colunas"]):
    k = cli["colunas"][c]
    pedido = "**sim** — " + F9[c] if c in F9 else "—"
    obs = ""
    if k["pct"] == 0.0:
        obs = "existe e está zerada"
    elif k["pct"] is not None and k["pct"] < 50:
        obs = "existe e está pela metade"
    w(f"| `{c}` | {k['tipo']} | {pct_txt(k, cli['linhas'])} | {pedido} | {obs} |")

faltando = [c for c in F9 if c not in cli["colunas"]]
w(f"""
### O veredicto da comparação

**Todas as {len(F9)} colunas que a F9 pede já existem no banco**{' — exceto ' + ', '.join('`'+c+'`' for c in faltando) if faltando else ''}.
A migração (`crm/fase2/schema_f9_cadastro.sql`) já rodou: o que falta não é
estrutura, é **conteúdo**.
""")
zeradas = [c for c in F9 if c in cli["colunas"] and cli["colunas"][c]["pct"] == 0.0]
meio = [(c, cli["colunas"][c]["pct"]) for c in F9 if c in cli["colunas"] and (cli["colunas"][c]["pct"] or 0) > 0]
w("Situação de cada campo da F9:\n")
w(f"- **Zeradas ({len(zeradas)}):** " + ", ".join(f"`{c}`" for c in sorted(zeradas)))
for c, p in sorted(meio, key=lambda x: -x[1]):
    w(f"- `{c}`: {p:.1f}% preenchida")

end = cli["colunas"].get("endereco", {})
w(f"""
### O achado que muda a F9.2

`clientes.endereco` — o campo de endereço em texto livre, que a F9.2 iria
migrar para o formato estruturado — está **{pct_txt(end, cli['linhas'])}**. Não
há endereço nenhum guardado hoje: nem no campo antigo, nem nos novos.

Duas consequências práticas:

1. **Não há legado para migrar.** A parte da F9.2 que trata do "endereço em
   formato antigo, revisar" não tem sobre o que rodar. `endereco_legado`
   também está em 0%, pelo mesmo motivo.
2. **A procuração não sai para ninguém hoje.** Os modelos usam `<ENDERECO>`,
   `<BAIRRO>`, `<CIDADE>`, `<ESTADO>` e `<CEP>` em 9 dos 10 documentos. Com
   todos em 0%, toda peça gerada agora sai com a linha de endereço em branco.

O caminho mais curto para a F12 (geração de documentos) não é código: é o
preenchimento do endereço e do RG dos clientes que estão em atendimento agora.
""")

texto = "\n".join(L) + "\n"
destino = "/home/user/marketplaceterciniinss/cowork/01-DOSSIE-BANCO.md"
os.makedirs(os.path.dirname(destino), exist_ok=True)
open(destino, "w", encoding="utf8").write(texto)
print(f"{destino}: {len(texto.splitlines())} linhas, {len(texto)} caracteres")
