"""Teste da base normativa. Roda com `python teste.py` e falha alto.

Duas camadas. A sintética cobre, uma a uma, as armadilhas medidas na SONDA-2026-09-20.md, com
fixture escrita aqui. A do corpus real cobra números fixos contra os 55 arquivos ingeridos, e é
ela que quebra quando o corpus muda ou o parser regride. A camada real é pulada em silêncio se
o banco ainda não foi carregado, para o teste rodar em máquina limpa.
"""
import sys

import banco, identidade, parser

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------- 1. tabela de identidade

todos = [p.name for p in __import__("ingestor").arquivos(incluir_fora=True)]
assert len(todos) == 60, f"o corpus tinha 60 arquivos .md em 20/09/2026, agora tem {len(todos)}"
faltam = [n for n in todos if n not in identidade.NORMAS]
assert not faltam, f"arquivos fora da tabela de identidade: {faltam}"
sobram = [n for n in identidade.NORMAS if n not in todos]
assert not sobram, f"tabela de identidade aponta arquivo que não existe: {sobram}"
assert all(n in identidade.NORMAS for n in identidade.FORA), "FORA cita arquivo fora da tabela"
assert len({v[0] for v in identidade.NORMAS.values()}) == 52, "52 normas em 60 arquivos"
try:
    identidade.identidade("Lei-inexistente.md")
    raise SystemExit("arquivo fora da tabela tinha de levantar KeyError")
except KeyError:
    pass

# ---------------------------------------------------------------- 2. armadilhas, uma fixture cada

def artigos(md, **kw):
    return parser.ler_arquivo(md, "fixture.md", **kw)["artigos"]


# negrito e texto simples convivem no corpus, 12 arquivos contra 42
a = artigos("**Art. 1º** Texto em negrito.\n\nArt. 2º Texto simples.")
assert [x["chave"] for x in a] == ["1", "2"], a
assert a[0]["texto"] == "Texto em negrito." and a[1]["texto"] == "Texto simples.", a

# o ponto do CPC é separador de milhar: 76 artigos acima de 999
assert artigos("Art. 1.046. Ao processo em curso aplica-se este Código.")[0]["chave"] == "1046"

# "art." minúsculo em início de linha são 328 referências cruzadas: não abrem artigo novo,
# e seguem como continuação do texto do artigo anterior
a = artigos("Art. 5º Caput.\n\nart. 5º da Constituição)")
assert len(a) == 1 and a[0]["chave"] == "5", a
assert "art. 5º da Constituição" in a[0]["texto"], a[0]["texto"]

# negrito que engole a primeira palavra do caput, generalizado no Decreto 3.048
a = artigos("**Art. 10. O** servidor civil é excluído do RGPS.")
assert a[0]["chave"] == "10" and a[0]["texto"] == "O servidor civil é excluído do RGPS.", a

# "Art. 1 o" com espaço antes do ordinal, e "Art 1º -" sem ponto
assert artigos("**Art. 1 o** O Regulamento entra em vigor.")[0]["texto"] == "O Regulamento entra em vigor."
assert artigos("Art 3º - Fica revogado o decreto anterior.")[0]["chave"] == "3"

# sufixo de artigo, com e sem ordinal antes
assert artigos("**Art. 21-A.** A perícia médica.")[0]["chave"] == "21-A"
assert artigos("**Art. 6º-F.** Fica instituído o CadÚnico.")[0]["chave"] == "6-F"

# caput vazio na linha do cabeçalho e corpo no bloco seguinte: 9 casos na Lei 8.213
a = artigos("**Art. 86.**\n\nO auxílio-acidente será concedido. (Redação dada pela Lei nº 9.528, de 1997)")
assert a[0]["texto"].startswith("O auxílio-acidente"), a
assert a[0]["alteracao_ano"] == 1997 and a[0]["alteracao_tipo"] == "redacao", a

# marcador partido em três blocos pelo hyperlink da origem
a = artigos("**Art. 86.** Texto novo.\n\n(Redação dada pela\n\n**Medida Provisória nº 905, de 2019)**\n\n"
            "(Vigência encerrada)")
assert a[0]["alteracao_ano"] == 2019 and a[0]["revogado"] == 1, a

# marcador órfão em linha própria: 740 na CF/88 e 682 na Lei 8.213
a = artigos("**Art. 6º** Haverá Ouvidoria-Geral.\n\n(Redação dada pela Lei nº 9.711, de 20.11.98)")
assert a[0]["alteracao_ano"] == 1998, a

# versões empilham em ordem cronológica e a última não revogada é a vigente
a = artigos("**Art. 9º** Redação original.\n\n**Art. 9º** Segunda. (Redação dada pela Lei nº 9.032, de 1995)\n\n"
            "**Art. 9º** Terceira. (Redação dada pela Lei nº 9.528, de 1997)")
assert [x["versao"] for x in a] == [1, 2, 3] and [x["vigente"] for x in a] == [0, 0, 1], a
assert all(x["total_versoes"] == 3 for x in a)

# última versão revogada: a vigente recua para a última viva
a = artigos("**Art. 7º** Vale. \n\n**Art. 7º** Some. (Revogado pela Lei nº 9.528, de 1997)")
assert [x["vigente"] for x in a] == [1, 0] and a[1]["revogado"] == 1, a

# inciso com travessão, só a IN 128 usa, 1.410 dispositivos
a = artigos("Art. 3º São segurados:\n\nI – o empregado;\n\nII – o avulso.")
rot = [d["rotulo"] for d in parser.dispositivos(a[0]["texto"])]
assert rot == ["I", "II"], rot

# parágrafo único é texto puro, nunca glifo §, e são 1.437 no corpus
d = parser.dispositivos(artigos("Art. 4º Caput.\n\nParágrafo único. Complemento.")[0]["texto"])
assert [x["tipo"] for x in d] == ["paragrafo_unico"], d

# § achatado dentro da linha do caput, como no Decreto 3.048
d = parser.dispositivos(artigos("**Art. 10. O** servidor. § 1º Caso exerça. § 2º Entende-se por regime.")[0]["texto"])
assert [x["rotulo"] for x in d] == ["§ 1º", "§ 2º"], d

# o compilado empilha também a redação do parágrafo, e o rótulo repete
d = parser.dispositivos("Caput.\n§ 1º Primeira.\n§ 1º Segunda. (Redação dada pela Lei nº 9.032, de 1995)")
assert [x["ocorrencia"] for x in d] == [1, 2], d

# quebra de linha dura no meio da frase, Portarias 991 a 995, zero linha em branco
a = artigos("Art. 2º Os dependentes de uma mesma classe concorrem entre si em\nigualdade de condições.\n"
            "I - o cônjuge, a companheira, o companheiro e o filho não\nemancipado;")
assert "entre si em igualdade" in a[0]["texto"], a[0]["texto"]
assert [d["rotulo"] for d in parser.dispositivos(a[0]["texto"])] == ["I"], a[0]["texto"]

# ADCT é parte separada: 139 números de artigo existem nas duas partes da CF
a = artigos("**Art. 92.** São órgãos do Poder Judiciário.\n\n"
            "## ATO DAS DISPOSIÇÕES CONSTITUCIONAIS TRANSITÓRIAS\n\n"
            "**Art. 92.** São acrescidos dez anos ao prazo.")
assert [x["parte"] for x in a] == ["principal", "adct"], a
assert all(x["total_versoes"] == 1 for x in a), "artigo do ADCT não é versão do artigo da CF"

# ANEXO em caixa alta abre parte nova; "Anexo desta Lei." é referência cruzada e não abre
a = artigos("Art. 1º Fica aprovado o Livro II.\n\nANEXO\n\nLIVRO II\n\nArt. 1º São beneficiários.")
assert [x["parte"] for x in a] == ["principal", "anexo"], a
a = artigos("**Art. 1º** Caput.\n\n## Anexo desta Lei.\n\n**Art. 2º** Outro.")
assert {x["parte"] for x in a} == {"principal"}, "referência cruzada não pode partir a norma"

# numeração que recomeça sem marcador é parte nova, não versão: Decreto 3.048 e Portarias
a = artigos("**Art. 1 o** O Regulamento passa a vigorar.\n\n**Art. 2 o** Este Decreto entra em vigor.\n\n"
            "**Art. 3 o** Ficam revogados.\n\n**Art. 1 º** A seguridade social compreende.")
assert [x["parte"] for x in a] == ["principal"] * 3 + ["principal-cont"], a

# cabeçalho hierárquico, com nome na mesma linha e na linha seguinte
a = artigos("## TÍTULO III DO REGIME GERAL\n\n### Capítulo II DAS PRESTAÇÕES\n\n**Art. 18.** Caput.")
assert a[0]["contexto"] == "TÍTULO III DO REGIME GERAL > Capítulo II DAS PRESTAÇÕES", a[0]["contexto"]
a = artigos("LIVRO I\nDA ADMINISTRAÇÃO\n\nArt. 1º Caput.")
assert a[0]["contexto"] == "LIVRO I DA ADMINISTRAÇÃO", a[0]["contexto"]
# referência cruzada com vírgula não é cabeçalho
a = artigos("Seção III , especialmente no art. 33 desta Lei.\n\n**Art. 86.** Caput.")
assert a[0]["contexto"] == "", a[0]["contexto"]

# cabeçalho de estrutura não vaza para o texto do artigo anterior: o § 6º do art. 86 da Lei
# 8.213 terminava em "#### Subseção XII Do Abono de Permanência em Serviço"
a = artigos("**Art. 86.** Caput.\n\n§ 6º Último parágrafo.\n\n#### Subseção XII Do Abono\n\n**Art. 87.** Outro.")
assert a[0]["texto"].endswith("§ 6º Último parágrafo."), a[0]["texto"]
assert a[1]["contexto"] == "Subseção XII Do Abono", a[1]["contexto"]
# na IN 128 o nome do LIVRO vem na linha de baixo, e sai junto
a = artigos("Art. 510. Caput.\n\nLIVRO III\nDA CONTAGEM RECÍPROCA\n\nArt. 511. Outro.")
assert a[0]["texto"] == "Caput.", a[0]["texto"]
# ANEXO sai do texto do artigo, mas abre a parte nova do mesmo jeito
a = artigos("Art. 2º Caput.\n\nANEXO\n\nArt. 1º Do anexo.")
assert a[0]["texto"] == "Caput." and a[1]["parte"] == "anexo", a
# pedaço de artigo que a conversão promoveu a heading fica no texto, só sem os '#'.
# Cortar ali perderia 2.319 linhas no corpus.
a = artigos("**Art. 12.** Caput:\n\nVI - em cada Estado, na\n\n## parte do País;\n\nVII - o outro.")
assert "na parte do País;" in a[0]["texto"] and "#" not in a[0]["texto"], a[0]["texto"]

# frontmatter: quatro famílias de chave, uma saída canônica, e arquivo sem frontmatter não quebra
m, corpo, _ = parser.frontmatter("---\nfonte_oficial: http://x\ndata_captura: 2026-07-06\n"
                                 "hash_sha256_corpo: abc\n---\n\nArt. 1º Caput.")
c = parser.meta_canonica(m)
assert (c["fonte_oficial"], c["data_download"], c["hash_origem"], c["hash_chave"]) == \
       ("http://x", "2026-07-06", "abc", "hash_sha256_corpo"), c
assert parser.frontmatter("# Título\n\nArt. 1º Caput.")[0] == {}

assert parser.idade_dias("2026-05-31", __import__("datetime").date(2026, 9, 20)) == 112

# ---------------------------------------------------------------- 3. banco em memória

con = banco.abrir(":memory:")
lido = parser.ler_arquivo(
    "---\nfonte_oficial: http://planalto/x\ndata_download: 2026-05-31\nhash_sha256: deadbeef\n---\n\n"
    "## TÍTULO I DO RUÍDO\n\n"
    "**Art. 1º** Caracteriza atividade especial a exposição a ruído acima do limite.\n\n"
    "§ 1º O PPP deve indicar a técnica.\n\n"
    "**Art. 1º** Caracteriza atividade especial a exposição a ruído contínuo. "
    "(Redação dada pela Lei nº 9.032, de 1995)\n\n"
    "**Art. 2º** Este artigo foi revogado. (Revogado pela Lei nº 9.528, de 1997)\n", "fixture.md")
norma = {"id": "lei-teste-1991", "tipo": "lei", "numero": "1", "ano": 1991, "titulo": "Lei de teste",
         "ementa": "", "fonte_oficial": "http://planalto/x", "data_download": "2026-05-31",
         "hash_origem": "deadbeef", "hash_chave": "hash_sha256", "impressao": "i",
         "ultima_alteracao_conhecida": "", "compilado": 1, "arquivos": "[]", "ingerido_em": "2026-09-20"}
assert banco.gravar_norma(con, norma, lido["artigos"]) == 3
assert banco.gravar_norma(con, norma, lido["artigos"]) == 3, "reingestão tem de ser idempotente"
assert con.execute("SELECT count(*) FROM artigo").fetchone()[0] == 3, "reingestão duplicou"
assert con.execute("SELECT count(*) FROM dispositivo").fetchone()[0] > 0

# FTS ignora acento e entende aspas e exclusão
assert banco.buscar(con, "ruido")["total"] == 1, "busca sem acento tem de achar 'ruído'"
assert banco.buscar(con, "ruido", so_vigente=False)["total"] == 3, "o contexto também é indexado"
assert banco.buscar(con, '"ruído contínuo"')["total"] == 1
assert banco.buscar(con, "ruido -contínuo", so_vigente=False)["total"] == 2
assert banco.buscar(con, "inexistentessimo")["total"] == 0

# a declaração de inferência sai em TODA resposta com texto de artigo
for r in (banco.buscar(con, "ruido"), banco.obter(con, "lei-teste-1991", "1"),
          banco.na_data(con, "lei-teste-1991", "1", "1993")):
    assert "inferencia" in r and "vigencia" in r["inferencia"], r.keys()

r = banco.obter(con, "lei-teste-1991", "1")
assert len(r["versoes"]) == 1 and r["versoes"][0]["versao"] == 2, r
assert r["versoes"][0]["contexto"] == "TÍTULO I DO RUÍDO"
assert [d["rotulo"] for d in r["versoes"][0]["dispositivos"]] == [], r["versoes"][0]["dispositivos"]
assert r["idade_dias"] is not None and r["fonte_oficial"] == "http://planalto/x", r
assert r["verificacao"] == "ainda não verificado"

h = banco.obter(con, "lei-teste-1991", "1", historico=True)
assert len(h["historico"]) == 2 and h["historico"][0]["alteracao_tipo"] == "original", h

# artigo revogado e nunca reeditado NÃO tem versão vigente, e a resposta diz isso
rev = banco.obter(con, "lei-teste-1991", "2")
assert rev["versoes"][0]["revogado"] is True and rev["versoes"][0]["vigente"] is False, rev
assert "não tem redação vigente" in rev["sem_versao_vigente"], rev

# redação numa data, com o aviso de granularidade anual
d1993 = banco.na_data(con, "lei-teste-1991", "1", "1993-04-01")
d2020 = banco.na_data(con, "lei-teste-1991", "1", "2020")
assert d1993["versoes"][0]["versao"] == 1 and d2020["versoes"][0]["versao"] == 2, (d1993, d2020)
assert "ANUAL" in d1993["aviso"]
assert banco.na_data(con, "lei-teste-1991", "1", "ontem")["erro"] == "data_invalida"
assert banco.obter(con, "lei-teste-1991", "999")["erro"] == "nao_localizado"

v = banco.visao_geral(con)
assert v["normas_na_base"] == 1 and v["versoes_gravadas"] == 3 and v["artigos_vigentes"] == 1, v
assert v["avisos"] and v["arquivos_fora_da_base"] == identidade.FORA

banco.registrar_verificacao(con, "lei-teste-1991", "exige_navegador", {"url": "http://planalto/x"})
assert banco.obter(con, "lei-teste-1991", "1")["verificacao"].startswith("exige_navegador em ")

# ---------------------------------------------------------------- 4. corpus real, números fixos

try:
    real = banco.abrir(leitura=True)
    real.execute("SELECT 1 FROM artigo LIMIT 1").fetchone()
except Exception:
    print("ok (camada sintética; rode `python ingestor.py` para cobrar o corpus real)")
    raise SystemExit(0)

um = lambda s, *a: real.execute(s, a).fetchone()[0]

# medido em 20/09/2026 contra os 55 arquivos ingeridos
assert um("SELECT count(*) FROM norma") == 48, um("SELECT count(*) FROM norma")
assert um("SELECT count(*) FROM artigo") == 6728, um("SELECT count(*) FROM artigo")
assert um("SELECT count(*) FROM artigo WHERE vigente=1 AND revogado=1") == 0, \
    "nenhuma versão revogada pode estar marcada como vigente"

# Lei 8.213, o arquivo que mais exercita a pilha de versões
L = "norma_id='lei-8213-1991'"
assert um(f"SELECT count(DISTINCT chave) FROM artigo WHERE {L}") == 183
assert um(f"SELECT count(*) FROM artigo WHERE {L}") == 290
assert um(f"SELECT count(*) FROM artigo WHERE {L} AND versao=total_versoes AND revogado=1") == 26
assert um(f"SELECT count(*) FROM artigo WHERE {L} AND chave='21-A'") == 2
assert um(f"SELECT count(*) FROM artigo WHERE {L} AND vigente=1") == 160,     "23 dos 183 artigos da Lei 8.213 estão revogados sem reedição e não têm redação vigente"
assert um(f"SELECT total_versoes FROM artigo WHERE {L} AND chave='86' LIMIT 1") == 7
assert um(f"SELECT alteracao_ano FROM artigo WHERE {L} AND chave='86' AND vigente=1") == 1997, \
    "o art. 86 vigente é o da Lei 9.528/1997, com as duas redações da MP 905 revogadas"

# IN 128: 674 artigos, zero repetido, zero marcador, e o inciso é com travessão
assert um("SELECT count(DISTINCT chave) FROM artigo WHERE norma_id='in-128-2022'") == 674
assert um("SELECT count(*) FROM artigo WHERE norma_id='in-128-2022'") == 674
assert um("SELECT count(*) FROM artigo WHERE norma_id='in-128-2022' AND alteracao_tipo<>'original'") == 0
assert um("SELECT count(*) FROM dispositivo d JOIN artigo a ON a.id=d.artigo_id"
          " WHERE a.norma_id='in-128-2022' AND d.tipo='inciso'") == 1410

# Decreto 3.048: o regulamento tem 382 artigos, e o frontmatter diz 470
assert um("SELECT count(DISTINCT num) FROM artigo WHERE norma_id='decreto-3048-1999'"
          " AND parte<>'principal'") == 382
assert um("SELECT count(DISTINCT parte) FROM artigo WHERE norma_id='decreto-3048-1999'") == 2

# CF e ADCT no mesmo arquivo: 139 números coincidem, e a chave escopada por parte os separa
assert um("SELECT count(*) FROM (SELECT chave FROM artigo WHERE norma_id='cf-1988' AND parte='principal'"
          " INTERSECT SELECT chave FROM artigo WHERE norma_id='cf-1988' AND parte='adct')") == 139
assert len(banco.obter(real, "cf-1988", "92")["partes_com_este_artigo"]) == 2

# CPC acima de 999, que o separador de milhar quebraria
assert um("SELECT count(*) FROM artigo WHERE norma_id='lei-13105-2015' AND chave='1046'") == 1
assert um("SELECT count(*) FROM artigo WHERE norma_id='lei-13105-2015' AND num>999") >= 76

# comportamento previsto, declarado em identidade.py: não derruba a carga e não passa em silêncio
assert um("SELECT count(*) FROM artigo WHERE norma_id='decreto-2172-1997'"
          " AND alteracao_tipo<>'original'") == 0, "Decreto 2.172 sem marcador é caso previsto"
assert um("SELECT count(*) FROM artigo WHERE norma_id='decreto-2172-1997'") == 258
assert um("SELECT total_versoes FROM artigo WHERE norma_id='decreto-83080-1979' AND chave='1'") == 2
for nid in identidade.CASOS_PREVISTOS:
    assert um("SELECT count(*) FROM norma WHERE id=?", nid) == 1, f"caso previsto sumiu: {nid}"

# nenhum arquivo excluído entrou, e a exclusão é declarada
assert um("SELECT count(*) FROM norma WHERE id IN ('portaria-inss-1851-2025','decreto-6214-2007',"
          "'portaria-dirben-998-2022','portaria-inss-914-2021')") == 0
assert um("SELECT count(*) FROM artigo WHERE arquivo LIKE '%anexos-II-III-IV%'") == 0

# toda norma na base tem fonte e data, que é a razão de os três sem frontmatter ficarem fora
assert um("SELECT count(*) FROM norma WHERE fonte_oficial='' OR data_download=''") == 0

# nenhum '#' de Markdown no texto gravado: antes da correção eram 247 artigos
assert um("SELECT count(*) FROM artigo WHERE texto LIKE '%#%'") == 0,     um("SELECT group_concat(id) FROM artigo WHERE texto LIKE '%#%'")
assert um(f"SELECT texto FROM artigo WHERE {L} AND chave='86' AND vigente=1").endswith(
    "(Vigência encerrada)"), "o art. 86 não pode terminar no título da Subseção XII"

# nada de texto vazio, que é o modo silencioso de a extração falhar
assert um("SELECT count(*) FROM artigo WHERE length(trim(texto))<3") == 0, \
    um("SELECT group_concat(id) FROM artigo WHERE length(trim(texto))<3")

# busca sem acento contra o corpus real
assert banco.buscar(real, "ruido")["total"] > 0
assert banco.buscar(real, '"auxílio-acidente"', norma="lei-8213-1991")["total"] > 0

print(f"ok — {um('SELECT count(*) FROM norma')} normas, {um('SELECT count(*) FROM artigo')} versões, "
      f"{um('SELECT count(*) FROM dispositivo')} dispositivos")
