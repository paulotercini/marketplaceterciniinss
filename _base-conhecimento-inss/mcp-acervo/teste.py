"""Asserts de modulo. Roda com  uv run teste.py  ou  python teste.py .

Sem pytest, sem fixture e sem SDK do MCP, porque toda resposta do servidor sai do
banco.py e da para exercitar em memoria.

Nao toca a base real, nao le o Drive e nao usa rede. O bloco final e uma regressao
opcional sobre um arquivo real, que so roda se a base ja existir.
"""


import pathlib
import tempfile
import zipfile

import banco
import extrator
import parser

# --------------------------------------------------------------------
# Extracao do .docx, que e feita a mao sobre o word/document.xml
# --------------------------------------------------------------------
W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
DOCX_XML = f"""<?xml version="1.0"?>
<w:document xmlns:w="{W}"><w:body>
 <w:p><w:r><w:t>DOS FATOS</w:t></w:r></w:p>
 <w:p><w:r><w:t>Primeiro paragrafo com</w:t></w:r><w:r><w:t> dois corridos.</w:t></w:r></w:p>
 <w:tbl>
  <w:tr><w:tc><w:p><w:r><w:t>Periodo</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>92 dB(A)</w:t></w:r></w:p></w:tc></w:tr>
 </w:tbl>
 <w:p><w:r><w:t>Depois da tabela.</w:t></w:r></w:p>
</w:body></w:document>"""

with tempfile.TemporaryDirectory() as tmp:
    alvo = pathlib.Path(tmp) / "peca.docx"
    with zipfile.ZipFile(alvo, "w") as z:
        z.writestr("word/document.xml", DOCX_XML)
    b = extrator.blocos(alvo)
    assert b == ["DOS FATOS", "Primeiro paragrafo com dois corridos.",
                 "Periodo; 92 dB(A)", "Depois da tabela."], b
    assert b[2].startswith("Periodo"), "a tabela tem de sair na ordem do corpo"
    md = pathlib.Path(tmp) / "m.md"
    md.write_text("um bloco\n\noutro bloco", encoding="utf-8")
    assert extrator.blocos(md) == ["um bloco", "outro bloco"]
    try:
        extrator.blocos(pathlib.Path(tmp) / "x.doc")
        raise SystemExit("extensao fora do escopo tinha de levantar NaoSuportado")
    except extrator.NaoSuportado:
        pass
    # PDF, que e o formato da peca protocolada nas pastas de cliente.
    import pymupdf
    pdf = pathlib.Path(tmp) / "protocolada.pdf"
    doc = pymupdf.open()
    pg = doc.new_page()
    pg.insert_text((72, 100), "DOS FATOS")
    pg.insert_text((72, 130), "O Autor esteve exposto a ruido acima do limite legal do periodo.")
    doc.save(pdf)
    doc.close()
    b = extrator.blocos(pdf)
    assert "DOS FATOS" in b, b
    assert any("ruido acima do limite" in x for x in b), b
    # Membro acessorio corrompido nao pode derrubar a leitura, porque 8 das 175 pecas
    # das pastas Claude estao assim no Drive, medido em 20/09/2026.
    ruim = pathlib.Path(tmp) / "ruim.docx"
    with zipfile.ZipFile(ruim, "w") as z:
        z.writestr("word/document.xml", DOCX_XML)
        z.writestr("word/styles.xml", "lixo que nao e xml valido <<<")
    assert len(extrator.blocos(ruim)) == 4, "membro acessorio quebrado derrubou a extracao"


# --------------------------------------------------------------------
# Peca sintetica com dado pessoal CONHECIDO, para provar a anonimizacao
# --------------------------------------------------------------------
NOMES = parser.normalizar_nomes(["Beltrano Aparecido da Silva #12345678901",
                                 "Cicrano Souza Mendes"])

PECA = [
    "EXCELENTISSIMO SENHOR DOUTOR JUIZ FEDERAL DO JUIZADO ESPECIAL FEDERAL DE CATANDUVA/SP",
    "Processo 5003392-39.2022.4.03.6314",
    "BELTRANO APARECIDO DA SILVA, brasileiro, nascido em 03/08/1970, do lar, portador da "
    "cedula de identidade RG n 30.556.884-1 e do CPF 123.456.789-01, residente e domiciliado "
    "na Rua das Flores, CEP 15910-000, e-mail beltrano@exemplo.com, telefone (16) 99123-4567.",
    "I - DOS FATOS",
    "O Autor esteve exposto a ruido de 92 dB(A) durante todo o periodo contratual, conforme o "
    "PPP juntado, e o formulario registra a tecnica de medicao por dosimetria, o que atende "
    "ao criterio do Enunciado 13 do CRPS e do Tema 174 da TNU sobre o registro da exposicao.",
    "O vinculo com Cicrano Souza Mendes, encerrado em 28/09/2019, foi confirmado pelo CNIS, e "
    "o beneficio n 703.456.789-0 foi concedido sob a CID S82.2 conforme a pericia medica "
    "federal que instruiu o requerimento administrativo do segurado.",
    "II - DO DIREITO",
    "A ausencia do Nivel de Exposicao Normalizado nao impede o enquadramento, porque o Tema "
    "694 do STJ veda a aplicacao retroativa do limite de 85 dB e a NHO-01 ja presume a "
    "normalizacao quando a medicao segue a tecnica da dosimetria por jornada efetiva.",
    "Nestes termos, pede deferimento.",
]

trechos = parser.trechos(PECA, NOMES)
inteiro = " ".join(t["texto"] for t in trechos) + " " + " ".join(
    t["secao"] or "" for t in trechos)

assert len(trechos) == 3, f"esperava 3 trechos argumentativos, veio {len(trechos)}"
for proibido in ("BELTRANO", "Beltrano", "Cicrano", "Mendes", "123.456.789-01",
                 "30.556.884", "15910-000", "beltrano@exemplo.com", "99123-4567",
                 "5003392-39.2022.4.03.6314", "S82.2", "703.456.789-0", "03/08/1970"):
    assert proibido not in inteiro, f"vazou dado pessoal: {proibido!r}"

# O que NAO pode sumir, porque e o valor do acervo.
assert "ruido de 92 dB(A)" in inteiro, "a anonimizacao comeu o dado tecnico"
assert "Tema 694" in inteiro and "Enunciado 13" in inteiro, "a anonimizacao comeu o precedente"
assert trechos[0]["secao"] == "I - DOS FATOS", f"secao errada: {trechos[0]['secao']!r}"
assert trechos[2]["secao"] == "II - DO DIREITO", f"secao errada: {trechos[2]['secao']!r}"

# Especie de beneficio nao e CID e tem de sobreviver.
assert "B31" in parser.anonimizar("o B31 foi cessado e o B91 negado", NOMES)

# A palavra comum do oficio e veto absoluto, ainda que esteja na lista negra. Sem isso
# "Nivel de Exposicao Normalizado" virava "[NOME] de Exposicao Normalizado".
tecnico = "Foi apurado o Nivel de Exposicao Normalizado na forma da NHO-01?"
assert parser.anonimizar(tecnico, NOMES | {"nivel"}, {"nivel"}) == tecnico
assert "[NOME]" in parser.anonimizar(tecnico + " Cicrano", NOMES | {"nivel"}, {"nivel"})

# A regua do .md nao pode entrar no titulo de secao nem virar trecho.
com_regua = ["─" * 60 + " 2. PARTE I — QUESITOS A PERICIA " + "─" * 60,
             "O laudo precisa dizer qual o agente nocivo e qual a tecnica de medicao usada."]
t = parser.trechos(com_regua, NOMES)
assert t[0]["secao"] == "2. PARTE I — QUESITOS A PERICIA", repr(t[0]["secao"])

# IDEMPOTENCIA. Reaplicar o anonimizador nao pode mudar nada, porque a auditoria da
# base e feita por ponto fixo. Gaveta gulosa entre rotulo e numero quebrava isto, e
# "NB 703456789, DER 10/02/2025" perdia a DER na segunda passada.
for cru in ("NB 703.456.789-0, DER 10/02/2025, indeferido por perda da qualidade",
            "auxilio NB 1234567890, mantido de 03/05/2024 a 29/10/2024, ids 355096133",
            "RG 30.556.884-1 e CPF 123.456.789-01, CEP 15910-000, CID S82.2",
            "o vinculo com Cicrano Souza Mendes consta do CNIS desde 28/09/2019"):
    uma = parser.anonimizar(cru, NOMES)
    assert parser.anonimizar(uma, NOMES) == uma, f"anonimizacao nao e idempotente: {uma!r}"
assert "DER 10/02/2025" in parser.anonimizar(
    "NB 703.456.789-0, DER 10/02/2025, indeferido", NOMES), "a gaveta comeu a DER"
assert "29/10/2024" in parser.anonimizar(
    "auxilio NB 1234567890, mantido de 03/05/2024 a 29/10/2024", NOMES)

# Enderecamento, qualificacao e fecho sao descartados, nunca anonimizados.
assert parser.e_descartavel(PECA[0]) and parser.e_descartavel(PECA[2])
assert parser.e_descartavel(PECA[-1])
assert parser.e_titulo("I - DOS FATOS") and parser.e_titulo("1. GUIA DE USO")
assert not parser.e_titulo(PECA[4]), "paragrafo longo nao e titulo"

# --------------------------------------------------------------------
# Falha explicita quando a extracao quebra
# --------------------------------------------------------------------
try:
    parser.trechos(["DOS FATOS", "curto demais", "-----"], NOMES)
    raise SystemExit("documento sem trecho tinha de levantar LayoutMudou")
except parser.LayoutMudou:
    pass

# --------------------------------------------------------------------
# Citacoes, que sao a ponte para os outros MCPs
# --------------------------------------------------------------------
cits = parser.citacoes("aplica-se o Tema 694 do STJ, a Sumula 9 da TNU e o Enunciado 13/CRPS, "
                       "alem do PEDILEF 0001717-88.2013.4.03.6318")
assert ("STJ", "Tema 694") in cits, cits
assert ("TNU", "Sumula 9") in cits, cits
assert ("CRPS", "Enunciado 13") in cits, cits
assert any(c[0] == "PEDILEF" for c in cits), cits

# --------------------------------------------------------------------
# Metadados pelo caminho
# --------------------------------------------------------------------
m = parser.metadados(r"Aposentadoria Especial\MODELO OURO - Peticao Inicial.md", "modelo_ouro")
assert m["tipo_peca"] == "inicial" and m["beneficio"] == "aposentadoria_especial", m
m = parser.metadados(r"Fulano #123\Claude\Contrarrazoes - Fulano - 17.06.2026.docx", "cliente")
assert m["tipo_peca"] == "contrarrazoes", m
assert m["data_peca"] == "2026-06-17", m
assert parser.metadados("Recurso Inominado B94.docx", "acervo")["beneficio"] == "auxilio_acidente"

# --------------------------------------------------------------------
# Contrato da consulta
# --------------------------------------------------------------------
assert banco.para_fts('ruido "aposentadoria especial" -EPI') == \
    '"ruido" AND "aposentadoria especial" NOT "EPI"'
assert banco.para_fts("") is None
assert banco.para_fts("  e  and ") is None

# O nome do cliente tambem esta no nome do arquivo e no da pasta, no padrao
# "Parecer - Fulano de Tal - 17.06.2026.docx", entao o caminho devolvido e mascarado.
# O caminho real sai so por caminho_da_peca_acervo, que e um pedido deliberado.
banco._LISTAS = (NOMES, frozenset())
publico = banco._caminho_publico(
    r"G:\Processos\B\Beltrano Silva #12345678901\Claude\Parecer - Beltrano Silva.docx")
assert "#" not in publico, publico
assert "Beltrano" not in publico and "12345678901" not in publico, publico
assert "Claude" in publico and "Parecer" in publico, "o caminho tem de continuar util"

# --------------------------------------------------------------------
# Banco em memoria
# --------------------------------------------------------------------
con = banco.abrir(":memory:")
for t in trechos:
    t["citacoes"] = parser.citacoes(t["texto"])
peca = {"id": "abc123", "caminho": r"G:\X\Fulano #12345678901\Claude\Inicial.docx",
        "arquivo": "Inicial.docx", "hash": "h1", "origem": "cliente",
        "tipo_peca": "inicial", "beneficio": "aposentadoria_especial", "rito": "jef",
        "data_peca": "2026-06-17", "resultado": None, "trechos": len(trechos),
        "indexado_em": "2026-09-20T08:00:00"}
assert banco.gravar(con, peca, trechos) == 3

# Reingestao substitui, nao duplica.
assert banco.gravar(con, peca, trechos) == 3
assert con.execute("SELECT count(*) FROM trecho").fetchone()[0] == 3, "reingestao duplicou"
assert con.execute("SELECT count(*) FROM citacao").fetchone()[0] > 0
assert banco.hash_gravado(con, "abc123") == "h1"
assert banco.hash_gravado(con, "nao-existe") is None

# Busca sem acento e com exclusao.
r = banco.buscar(con, "Tema")
assert r["total"] == 2, r["total"]                      # Tema 174 nos fatos, Tema 694 no direito
assert banco.buscar(con, "ruido")["total"] == 1
assert banco.buscar(con, "ruído")["total"] == 1, "a busca tem de ignorar acentuacao"
assert banco.buscar(con, "Tema -694")["total"] == 1
assert banco.buscar(con, '"Tema 694"')["total"] == 1
assert banco.buscar(con, "Tema", beneficio="bpc_loas")["total"] == 0
assert banco.buscar(con, "Tema", tipo_peca="inicial")["total"] == 2
assert "\u00ab" in r["trechos"][0]["trecho"], "o snippet tem de marcar onde a tese aparece"
assert r["vedacao"] == banco.VEDACAO, "a vedacao entra em toda resposta de busca"
assert "#" not in r["trechos"][0]["caminho"], "o #CPF nao pode sair no caminho"

# Contexto e remissao.
alvo = r["trechos"][0]["id"]
ctx = banco.obter(con, alvo, contexto=1)
assert any(t["alvo"] for t in ctx["trechos"]), ctx
assert banco.obter(con, 99999)["erro"] == "nao_encontrado"
pre = banco.por_precedente(con, "Tema 694")
assert pre["total"] == 1 and "trf3" in pre["nota"], pre
assert all("acordao" not in str(o).lower() for o in pre["ocorrencias"]), \
    "a remissao nao carrega o texto do precedente"

vg = banco.visao_geral(con)
assert vg["pecas"] == 1 and vg["trechos"] == 3
assert vg["por_beneficio"] == {"aposentadoria_especial": 1}, vg["por_beneficio"]
assert banco.VEDACAO in vg["avisos"][0]
assert banco.listar_pecas(con, beneficio="aposentadoria_especial")["total"] == 1

assert banco.aplicar_resultados(con, [("Inicial.docx", "procedente")]) == 1
assert banco.visao_geral(con)["com_resultado_anotado"] == 1

# O gatilho trecho_au, que falta no trf3. Sem ele o FTS mentiria apos uma edicao.
con.execute("UPDATE trecho SET texto = 'agora fala de calor e nao de outra coisa' WHERE id = ?",
            (alvo,))
con.commit()
assert banco.buscar(con, "calor")["total"] == 1, "o gatilho de update nao sincronizou o FTS"

# Auditoria: base limpa nao acusa, base suja acusa.
assert banco.auditar(con, NOMES) == [], banco.auditar(con, NOMES)
con.execute("UPDATE trecho SET texto = 'contato com Cicrano Souza sobre o caso' "
           "WHERE id = ?", (alvo,))
con.commit()
assert banco.auditar(con, NOMES)[0]["tipo"] == "NOME", "nome nao anonimizado passou"
con.execute("UPDATE trecho SET texto = 'o CPF 123.456.789-01 vazou' WHERE id = ?", (alvo,))
con.commit()
vazou = banco.auditar(con, NOMES)
assert "CPF" in [v["tipo"] for v in vazou], vazou

# Peca que sumiu da fonte sai da base.
assert banco.esquecer(con, ["outro-id"]) == 1
assert banco.visao_geral(con)["pecas"] == 0

# --------------------------------------------------------------------
# Regressao opcional sobre a base real, se ja existir
# --------------------------------------------------------------------
if (banco.DADOS / "acervo.db").exists():
    real = banco.abrir(leitura=True)
    n = real.execute("SELECT count(*) FROM trecho").fetchone()[0]
    if n:
        import coletor
        sujeira = banco.auditar(real, *coletor.nomes())
        assert not sujeira, f"a base real tem {len(sujeira)} vazamentos, rode --auditar"
        print(f"base real limpa, {n} trechos")

print("ok")
