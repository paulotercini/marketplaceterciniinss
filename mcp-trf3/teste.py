"""python teste.py — parser, banco e busca.

Primeiro sobre um documento sintético no layout do CJF (partes e advogado fictícios), depois,
se já houver coleta, sobre uma página real de TRF3_DADOS/bruto, que fica fora do repositório
porque traz nome de parte.
"""
import gzip, re

import banco, parser


def doc(id_, cnj, orgao, ementa=True):
    par = lambda r, v: (f'<div class="ui-outputpanel"> <tr> <td><span class="label_pontilhada">{r}</span></td> </tr>'
                        f' <tr> <td>{v}</td> </tr></div>')
    texto = ("PODER JUDICIÁRIO<br/>APELANTE: INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS<br/>APELADO: BELTRANO DA SILVA<br/>"
             "ADVOGADO do(a) APELADO: CICRANO SOUZA - SP000000-A<br/>E M E N T A<br/>DIREITO PREVIDENCI&Aacute;RIO. "
             "APOSENTADORIA ESPECIAL. RUÍDO.<br/>I. CASO EM EXAME<br/>1. Apelação do INSS.<br/>II. QUESTÃO EM DISCUSSÃO<br/>"
             "2. Saber se o PPP prova a exposição.III. RAZÕES DE DECIDIR<br/>3. O PPP indica ruído acima do limite.<br/>"
             "IV. DISPOSITIVO E TESE<br/>4. Apelação desprovida.<br/>_________<br/>Dispositivos relevantes citados: Lei 8.213/1991.")
    return (f'<table class="table_pesquisa_lista" id="doc_{id_}"><tbody>'
            + par("Tipo", "Acórdão") + par("Número", f"{cnj}<br/> 000")
            + par("Classe", "APELAÇÃO CÍVEL ..SIGLA_CLASSE: ApCiv") + par("Relator(a)", "Desembargador Federal FULANO DE TAL")
            + par("Órgão julgador", orgao) + par("Data", '<font color="blue"><b>21/08/2026</b></font>')
            + par("Data da publicação", "26/08/2026")
            + (par("Ementa", f'<div id="painel_ementa-{id_}">{texto}</div>') if ementa else "")
            + (par("Decisão", "RELATOR: CICLANA TITULAR MENDES<br/>APELADO: BELTRANO DA SILVA<br/>RELATÓRIO<br/>Trata-se de apelação.<br/>VOTO<br/>Nego provimento.")
               if ementa else par("Inteiro teor", "Acesse Aqui"))
            + "</tbody></table>")


resposta = ("<partial-response>" + doc("TRF31", "5004672-33.2021.4.03.6103", "8ª Turma")
            + doc("TRF32", "5000001-11.2022.4.03.6100", "4ª Turma")
            + doc("TRF33", "5000002-11.2022.4.03.6100", "9ª Turma", ementa=False) + "</partial-response>")

assert parser.ids(resposta) == ["TRF31", "TRF32", "TRF33"]
docs = parser.extrair(resposta, "trf3")
assert len(docs) == 1, "a 4ª Turma cai no recorte e o registro sem texto é pulado"
d = docs[0]
assert (d["id"], d["numero_cnj"], d["relator"]) == ("TRF31", "5004672-33.2021.4.03.6103", "FULANO DE TAL"), d
assert (d["classe_sigla"], d["classe_nome"]) == ("ApCiv", "APELAÇÃO CÍVEL")
assert (d["data_julgamento"], d["data_publicacao"]) == ("2026-08-21", "2026-08-26")
assert d["polo_recorrente"] == "inss" and d["resultado"] == "negado"
assert d["e_razoes"].startswith("3. O PPP") and d["e_dispositivo"] == "4. Apelação desprovida.", d
for campo in ("ementa_texto", "inteiro_teor"):
    assert "BELTRANO" not in d[campo] and "CICRANO" not in d[campo], "nome de parte ou advogado gravado"
assert len(parser.extrair(resposta, "trf3", so_previdenciario=False)) == 2
assert (d["relator_titular"], d["relator_acordao"]) == ("CICLANA TITULAR MENDES", None), d
assert parser.relator_titular("RELATOR: DES. FED. ANDRE MENDES SILVA") == "ANDRE MENDES SILVA"
assert parser.relator_titular("RELATORA: ANA LIMA") == "ANA LIMA"
for bruto in ("JUÍZA CONVOCADA VANESSA LIMA", "Juza Federal VANESSA LIMA", "Juiz Federal Convocado VANESSA LIMA",
              "Desembargadora Federal VANESSA LIMA"):
    assert parser._sem_cargo(bruto) == "VANESSA LIMA", bruto
assert parser.ORGAOS_PREV.search("Turma Regional de Uniformizao"), "TRU3 chega do CJF sem acento e não pode cair no recorte"

try:
    parser.extrair(resposta.replace("Órgão julgador", "Outro rótulo"), "trf3")
    raise SystemExit("layout alterado tinha de falhar")
except parser.LayoutMudou:
    pass

assert parser.resultado("recurso parcialmente provido") == "parcial"
assert parser.resultado("apelação não conhecida") == "nao_conhecido"
assert parser.resultado("dar provimento ao agravo") == "provido"
assert banco.para_fts('ruido "aposentadoria especial" -EPI') == '"ruido" AND "aposentadoria especial" NOT "EPI"'

con = banco.abrir(":memory:")
assert banco.gravar(con, docs) == 1 and banco.gravar(con, docs) == 0, "reingestão tem de ser idempotente"
r = banco.buscar(con, "aposentadoria especial ruido")           # sem acento
assert r["total"] == 1 and "partes" not in r["resultados"][0], r
assert banco.buscar(con, "ruido -PPP")["total"] == 0
assert banco.buscar(con, "ruido", orgao_julgador="8ª turma", polo_recorrente="inss")["total"] == 1
assert banco.obter(con, d["id"], 10)["truncado"] is True
assert banco.visao_geral(con)["total"] == 1
p = banco.perfil(con, "relator", "fulano")
assert p["por_polo_recorrente"]["inss"] == {"negado": 1, "taxa_provimento": 0.0}, p
assert banco.buscar(con, "", relator="ciclana")["total"] == 1, "relator titular também é filtro"

# regressão sobre página real, quando existir
reais = sorted((banco.DADOS / "bruto" / "trf3").glob("*/p0001.xml.gz"))
if reais:
    pagina = gzip.decompress(reais[-1].read_bytes()).decode("utf-8")
    todos = parser.extrair(pagina, "trf3", so_previdenciario=False)
    assert len(todos) == len(parser.ids(pagina)) > 0, "página real: documento perdido"
    for x in todos:
        assert x["numero_cnj"] and x["relator"] and x["data_julgamento"] and x["inteiro_teor"], x["id"]
        assert not re.search(r"(?m)^\s*(APELANTE|APELADO|ADVOGADO)[^:\n]*:", x["inteiro_teor"]), x["id"]
    print(f"página real {reais[-1].parent.name}: {len(todos)} documentos ok")
print("ok")
