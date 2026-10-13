"""Teste dos parsers e do banco, sem rede. Fixtures sintéticas no formato real de cada fonte, sem nome de parte.

    python teste.py
"""
import banco, parser

A = "2026-10-11T00:00:00"
PREV = {195, 6094, 6097, 6177}

# STJ, precedentes qualificados. Tema 1124 previdenciário pelo código, Tema 11240 inventado para o limite do número,
# Tema 5 tributário que menciona INSS e não pode entrar
cab = ("sequencialPrecedente,tipoPrecedente,numeroPrecedente,dataPrimeiraAfetacao,dataJulgamento,dataPublicacaoAcordao,"
       "situacao,questaoSubmetidaAJulgamento,teseFirmada,orgaoJulgador,Assuntos,numeroRepercussaoGeralSTF,descricaoRepercussaoGeral\n")
temas = cab + ('1,Tema,1124,2021-12-17,2025-10-08,2025-11-06,Acórdão Publicado,"Termo inicial dos efeitos financeiros",'
               '"O segurado deve apresentar requerimento administrativo apto",S1,"6097- Aposentadoria Urbana, 6177- Concessão",350,Prévio requerimento\n'
               '2,Tema,11240,,,,Afetado,"Questão qualquer","",S1,"6097- Aposentadoria Urbana",,\n'
               '3,Tema,5,,,,Trânsito em Julgado,"Contribuição do INSS sobre a folha","",S1,"14- DIREITO TRIBUTÁRIO, 6031- Contribuições",,\n'
               '4,Controvérsia,9,,,,Pendente,"Honorários em execução contra o INSS","",S1,"8826- DIREITO PROCESSUAL CIVIL",,\n')
procs = "sequencialPrecedente,Processo,leadingCase\n1,REsp 1913152,S\n1,REsp 1905830,N\n"
t = parser.stj_temas(temas, procs, PREV, A)
assert [x["previdenciario"] for x in t] == [1, 1, 0, 1], [x["previdenciario"] for x in t]
assert t[0]["leading_case"] == "REsp 1913152" and t[0]["vinculo"].startswith("STF Tema 350")
assert t[0]["link_oficial"].endswith("cod_tema_inicial=1124&cod_tema_final=1124") and t[3]["link_oficial"] is None
assert t[3]["id"] == "STJ-CONTROVERSIA-9"

# STF, uma linha da todostemas.asp no layout medido em 11/10/2026
linha = ('<tr>\n<td>\n<a target="_blank" href="verAndamentoProcesso.asp?incidente=5945131&numeroProcesso=1276977&classeProcesso=RE&numeroTema=1102">1102</a></td>'
         '<td><a target="_blank" href="verAndamentoProcesso.asp?incidente=5945131&numeroTema=1102">Revisão da vida toda.</a>'
         '<p><a href="#" title="Recurso extraordinário sobre o art. 29."><strong>Ver Descrição</strong></a></p>'
         '<p><a href="#" title="6132-DIREITO PREVIDENCIÁRIO | RMI"><strong>Ver Assuntos</strong></a></p></td>'
         '<td><a target="_blank" href="/processos/detalhe.asp?incidente=5945131" class="x">RE&nbsp;1276977</a></td>'
         '<td>MIN. MARCO AURÉLIO\n Plenário Virtual</td>'
         '<td><p class="text-success"><strong>Há repercussão geral</strong></p>28/08/2020<span title="15/05/2026"><strong>Trânsito em Julgado</strong></span></td>'
         '<td><a href="" onclick="x">01/12/2022</a></td></tr>')
it = parser.stf_lista_temas("<table>" + linha + "</table>")[0]
assert (it["numero"], it["leading_case"], it["incidente"], it["relator"]) == (1102, "RE 1276977", "5945131", "MIN. MARCO AURÉLIO"), it
assert it["situacao"] == "Há repercussão geral em 28/08/2020; Trânsito em Julgado em 15/05/2026", it["situacao"]
assert it["data_julgamento"] == "2022-12-01" and it["questao"].startswith("Recurso extraordinário")
tese = parser.stf_tese("<table><tr><td>Tema</td><td>Leading Case</td><td>Tese</td></tr><tr><td>1102</td><td>RE 1276977</td>"
                       "<td>1. A declaração de constitucionalidade do art. 3º da Lei n. 9.876/1999 impõe observância.</td></tr></table>")
assert tese.startswith("1. A declaração"), tese
st = parser.stf_tema(it, tese, A)
assert st["id"] == "STF-RG-1102" and st["previdenciario"] == 1

# STF, PDF de acórdão já convertido em texto
pdf = ("Ementa e Acórdão\n01/12/2022 PLENÁRIO\nRECURSO EXTRAORDINÁRIO 1.276.977\nRELATOR : MIN. MARCO AURÉLIO\n"
       "RECTE.(S) :INSTITUTO NACIONAL DO SEGURO SOCIAL\nADV.(A/S) :PROCURADORIA-GERAL FEDERAL\n"
       "Recurso extraordinário. Revisão da vida toda. Regra definitiva do art. 29 da Lei 8.213/1991 quando mais favorável.\n"
       "A C Ó R D Ã O\nVistos, relatados e discutidos estes autos, acordam os Ministros.")
ac = parser.stf_acordao("RE 1276977", "1", pdf, "RG-1102", A)
assert ac["data_julgamento"] == "2022-12-01" and ac["relator"] == "MARCO AURÉLIO", ac
assert ac["ementa"].startswith("Recurso extraordinário. Revisão") and "INSTITUTO" not in ac["ementa"], ac["ementa"]
assert parser.stf_pecas_acordao('<a href="downloadPeca.asp?id=9&ext=.pdf">Inteiro teor do acórdão</a>'
                                '<a href="downloadPeca.asp?id=8&ext=.pdf">Despacho</a>'
                                '<a href="downloadPeca.asp?id=9&ext=.pdf">Inteiro teor do acórdão</a>') == ["9"]

# STJ, íntegras nos dois formatos de metadado (2023 com código-folha, 2026 com caminho)
meta = [{"seqDocumento": "1", "tipoDocumento": "ACÓRDÃO", "processo": "REsp 1     ", "ministro": "FULANO", "recurso": "AGRAVO INTERNO",
         "dataPublicacao": "1696906800000", "assuntos": "6097;6097"},
        {"SeqDocumento": "2", "tipoDocumento": "DECISÃO", "processo": "AREsp 2", "NM_MINISTRO": "BELTRANO", "recurso": "None",
         "dataPublicacao": "2026-10-08", "assuntos": "00195.06094.06101."},
        {"SeqDocumento": "3", "tipoDocumento": "DECISÃO", "processo": "AREsp 3", "dataPublicacao": "2026-10-08", "assuntos": "00195.06094."},
        {"SeqDocumento": "4", "tipoDocumento": "DECISÃO", "processo": "HC 4", "dataPublicacao": "2026-10-08", "assuntos": "3608"}]
textos = {"1": "ACÓRDÃO<br>acordam os Ministros da SEGUNDA TURMA do Superior Tribunal", "2": "DECISÃO<br>Nego provimento.", "4": "x"}
docs, total, sem = parser.stj_integras(meta, textos, PREV, A)
assert (len(docs), total, sem) == (2, 3, 1), (len(docs), total, sem)
assert docs[0]["processo"] == "AGRAVO INTERNO no REsp 1" and docs[0]["data_publicacao"] == "2023-10-10", docs[0]
assert docs[0]["orgao_julgador"] == "SEGUNDA TURMA" and docs[1]["relator"] == "BELTRANO" and docs[1]["tipo"] == "decisao"

# STJ, DJEN
djen = [{"id": 7, "tipoDocumento": "DESPACHO / DECISÃO", "data_disponibilizacao": "2026-09-03", "link": "l",
         "texto": "<b>AREsp 3269463/RS (2026/0194005-0)</b><br>RELATOR : MINISTRO AFRÂNIO VILELA<br>AGRAVANTE : X<br>DECISÃO "
                  "Recurso especial já decidido no Tema 1.124/STJ. " + "texto " * 200},
        {"id": 8, "tipoDocumento": "DESPACHO / DECISÃO", "data_disponibilizacao": "2026-09-03", "texto": "Distribua-se."},
        {"id": 9, "tipoDocumento": "ATA DE DISTRIBUIÇÃO", "data_disponibilizacao": "2026-09-03", "texto": "x" * 2000}]
dj = parser.stj_djen(djen, A)
assert len(dj) == 1 and dj[0]["processo"] == "AREsp 3269463" and dj[0]["relator"] == "AFRÂNIO VILELA", dj
assert dj[0]["temas"] == "1124", dj[0]["temas"]

# Jurisprudência em Teses, innerText de uma edição
jt = parser.stj_jt("198", "AUXÍLIO-ACIDENTE", "EDIÇÃO N. 198\n1) O auxílio-acidente de remuneração variável usa a média.\n"
                   "Julgados\nSaiba mais\n2) O segurado vítima de novo acidente faz jus a um único benefício.\nJulgados\n", A)
assert [x["id"] for x in jt] == ["STJ-JT-198-1", "STJ-JT-198-2"] and jt[1]["tese"].endswith("único benefício.")
outro = parser.stj_jt("128", "HONORÁRIOS", "Ramo: DIREITO PROCESSUAL CIVIL\nEDIÇÃO N. 128\n1) Tese de honorários.\nJulgados\n", A)
assert outro[0]["assuntos"] == "DIREITO PROCESSUAL CIVIL" and outro[0]["previdenciario"] == 0 and jt[0]["previdenciario"] == 1

# banco: regravar não duplica, tema é substituído, a busca acha com e sem acento, e o 11240 não entra no 1124
con = banco.abrir(":memory:")
for _ in range(2):
    banco.gravar(con, "tema", t + [st] + jt, substituir=True)
    banco.gravar(con, "documento", docs + dj + [ac])
assert con.execute("SELECT count(*) FROM tema").fetchone()[0] == 7
assert con.execute("SELECT count(*) FROM documento").fetchone()[0] == 4
assert banco.buscar_temas(con, "requerimento administrativo", tribunal="stj")["total"] == 1
assert banco.buscar_temas(con, "auxilio-acidente", tipo="jurisprudencia_em_teses")["total"] == 2   # o título da edição também conta
assert banco.buscar_temas(con, previdenciario=True, tribunal="STJ")["total"] == 5   # 3 temas e 2 teses
dec = banco.obter_tema(con, tribunal="STJ", numero=1124)["decisoes_na_base"]
assert [d["processo"] for d in dec] == ["AREsp 3269463"], dec
assert [d["processo"] for d in banco.obter_tema(con, tribunal="STF", numero=1102)["decisoes_na_base"]] == ["RE 1276977"]
assert banco.buscar_decisoes(con, "provimento", tribunal="STJ", data_inicial="2026-01-01")["total"] == 1
assert banco.obter_decisao(con, "nao-existe")["erro"] == "nao_encontrado"
v = banco.visao_geral(con)
assert v["temas"]["STJ tema"]["total"] == 3 and "avisos" in v
print("ok")
