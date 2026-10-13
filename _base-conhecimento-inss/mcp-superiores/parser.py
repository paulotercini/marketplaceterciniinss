"""Do bruto de cada fonte para as linhas de tema e documento. Funções puras, sem rede, testáveis.

Uma função por fonte. Todas recebem o texto ou o JSON já baixado e devolvem dicionários prontos para
banco.gravar.
"""
import csv, html, io, json, re

RE_PREV_TEXTO = re.compile(r"PREVIDENCI|8\.?213|8\.?212|8\.?742|LOAS|BENEF[ÍI]CIO ASSISTENCIAL|LC\s*N?\.?\s*142", re.I)
LINK_STJ_TEMA = ("https://processo.stj.jus.br/repetitivos/temas_repetitivos/pesquisa.jsp?novaConsulta=true"
                 "&tipo_pesquisa=T&cod_tema_inicial={n}&cod_tema_final={n}")
STF = "https://portal.stf.jus.br"
TIPOS_STJ = {"Tema": "tema", "Controvérsia": "controversia", "IAC": "iac", "PUIL": "puil", "SIRDR": "sirdr"}


def texto_html(t):
    t = re.sub(r"(?is)<(script|style).*?</\1>", " ", t or "")
    t = re.sub(r"(?i)<br\s*/?>|</p>|</tr>", "\n", t)
    t = html.unescape(re.sub(r"<[^>]+>", " ", t))
    return re.sub(r"[ \t\r\f\v]+", " ", re.sub(r"\n\s*\n+", "\n", t)).strip()


def decodificar(b):
    """O portal do STF mistura UTF-8 e Windows-1252 conforme a página."""
    try:
        return b.decode("utf-8")
    except UnicodeDecodeError:
        return b.decode("cp1252", "replace")


def _data(v):
    """AAAA-MM-DD a partir de AAAA-MM-DD, AAAAMMDD, DD/MM/AAAA ou milissegundos desde 1970."""
    v = (v or "").strip()
    if re.fullmatch(r"\d{12,13}", v):
        import datetime
        return datetime.datetime.fromtimestamp(int(v) / 1000, datetime.timezone(datetime.timedelta(hours=-3))).date().isoformat()
    if m := re.search(r"(\d{4})-?(\d{2})-?(\d{2})", v):
        return "-".join(m.groups())
    if m := re.search(r"(\d{2})/(\d{2})/(\d{4})", v):
        return f"{m[3]}-{m[2]}-{m[1]}"
    return None


def _nada(v):
    v = (v if isinstance(v, str) else json.dumps(v, ensure_ascii=False) if v else "").strip()
    return None if v in ("", "None", "null", "[]", "{}") else v


def codigos_previdenciarios(assuntos, prev):
    """True se algum código de assunto da tabela do CNJ cai sob Direito Previdenciário ou o BPC.
    Aceita os três formatos do STJ ('00195.06094.06101.', '6097- Aposentadoria', '3608;3608')."""
    for c in re.findall(r"\d+", assuntos or ""):
        if int(c) in prev:
            return True
    return False


# --- STJ, precedentes qualificados -------------------------------------------------------------

def _processual_do_inss(t):
    """Tema de processo civil ou administrativo julgado contra o INSS, que o assunto não marca como
    previdenciário. Tema tributário de contribuição fica de fora, porque o segurado não é parte."""
    if re.search(r"DIREITO TRIBUT|Contribuiç", t["Assuntos"]):
        return False
    return bool(re.search(r"\bINSS\b|benef[íi]cios? previdenci|8\.213",       # 'segurado' pegaria seguro privado
                          t["questaoSubmetidaAJulgamento"] + " " + t["teseFirmada"], re.I))


def stj_temas(temas_csv, processos_csv, prev, agora):
    temas = list(csv.DictReader(io.StringIO(temas_csv)))
    lc = {}
    for p in csv.DictReader(io.StringIO(processos_csv)):
        if p.get("leadingCase") == "S":
            lc.setdefault(p["sequencialPrecedente"], []).append(p["Processo"].strip())
    linhas = []
    for t in temas:
        tipo = TIPOS_STJ.get(t["tipoPrecedente"], t["tipoPrecedente"].lower())
        n = int(t["numeroPrecedente"]) if t["numeroPrecedente"].isdigit() else None
        rg = t.get("numeroRepercussaoGeralSTF", "").strip()
        linhas.append({
            "id": f"STJ-{tipo.upper()}-{t['numeroPrecedente']}", "tribunal": "STJ", "tipo": tipo, "numero": n,
            "titulo": None, "questao": _nada(t["questaoSubmetidaAJulgamento"]), "tese": _nada(t["teseFirmada"]),
            "situacao": _nada(t["situacao"]), "leading_case": "; ".join(lc.get(t["sequencialPrecedente"], [])) or None,
            "orgao_julgador": _nada(t["orgaoJulgador"]), "relator": None,
            "data_afetacao": _data(t["dataPrimeiraAfetacao"]), "data_julgamento": _data(t["dataJulgamento"]),
            "data_publicacao": _data(t["dataPublicacaoAcordao"]), "assuntos": _nada(t["Assuntos"]),
            "previdenciario": int(codigos_previdenciarios(t["Assuntos"], prev) or _processual_do_inss(t)),
            "vinculo": f"STF Tema {rg} - {t.get('descricaoRepercussaoGeral', '').strip()}" if rg else None,
            "link_oficial": LINK_STJ_TEMA.format(n=n) if tipo == "tema" else None, "coletado_em": agora})
    return linhas


# --- STF, repercussão geral --------------------------------------------------------------------

def stf_lista_temas(pagina):
    """Uma linha por tema da todostemas.asp. A tese vem depois, de verTeseTema.asp."""
    temas = []
    for b in re.split(r'<tr>\s*<td>\s*<a target="_blank" href="verAndamentoProcesso', pagina)[1:]:
        n = int(re.search(r"numeroTema=(\d+)", b)[1])
        link = "verAndamentoProcesso" + b[:b.find('"')]
        tit = re.search(r'numeroTema=\d+">\s*(.*?)</a>', b[b.find("</a>") + 4:], re.S)
        dica = lambda rotulo: (m[1] if (m := re.search(rf'title="([^"]*)"><strong>{rotulo}', b, re.S)) else "")
        lc = re.search(r'detalhe\.asp\?incidente=(\d+)"[^>]*>\s*(.*?)</a>', b, re.S)
        tds = re.findall(r"(?s)<td>(.*?)</td>", b + "</td>")
        # coluna de estado, "<strong>Há repercussão geral</strong></p>02/02/2011<span title="09/02/2021"><strong>Trânsito..."
        col = tds[3] if len(tds) > 3 else ""
        fortes = [texto_html(s) for s in re.findall(r"(?s)<strong>(.*?)</strong>", col)]
        d_rg, d_sit = re.search(r"</p>\s*(\d{2}/\d{2}/\d{4})", col), re.search(r'title="(\d{2}/\d{2}/\d{4})"', col)
        estado = "; ".join(filter(None, [
            fortes[0] + (f" em {d_rg[1]}" if d_rg else "") if fortes else None,
            fortes[1] + (f" em {d_sit[1]}" if d_sit else "") if len(fortes) > 1 else None]))
        temas.append({
            "numero": n, "titulo": texto_html(tit[1]) if tit else None, "questao": texto_html(dica("Ver Descri")) or None,
            "assuntos": texto_html(dica("Ver Assuntos")) or None,
            "leading_case": texto_html(lc[2]).replace("\xa0", " ") if lc else None, "incidente": lc[1] if lc else None,
            "relator": texto_html(tds[2]).splitlines()[0].strip() if len(tds) > 2 and texto_html(tds[2]) else None, "situacao": estado or None,
            "data_julgamento": _data(texto_html(tds[4])) if len(tds) > 4 else None,
            "link_oficial": f"{STF}/jurisprudenciaRepercussao/{html.unescape(link)}"})
    return temas


def stf_tese(pagina):
    """Texto da tese em verTeseTema.asp, que traz Tema, Leading Case e Tese numa tabela curta."""
    t = texto_html(pagina)
    m = re.search(r"Tese\s+\d+\s+\S+\s+\S+\s+(.*)", t, re.S)
    tese = (m[1] if m else "").strip()
    return None if not tese or tese.lower().startswith(("não", "sem tese")) and len(tese) < 40 else tese


def stf_tema(item, tese, agora):
    prev = bool(re.search(r"DIREITO PREVIDENCI|DIREITO ASSISTENCIAL|Benef[íi]cio Assistencial", item["assuntos"] or "", re.I))
    return {"id": f"STF-RG-{item['numero']}", "tribunal": "STF", "tipo": "repercussao_geral", "numero": item["numero"],
            "titulo": item["titulo"], "questao": item["questao"], "tese": tese, "situacao": item["situacao"],
            "leading_case": item["leading_case"], "orgao_julgador": "Plenário", "relator": item["relator"],
            "data_afetacao": None, "data_julgamento": item["data_julgamento"], "data_publicacao": None,
            "assuntos": item["assuntos"], "previdenciario": int(prev), "vinculo": None,
            "link_oficial": item["link_oficial"], "coletado_em": agora}


def stf_pecas_acordao(aba_andamentos):
    """ids dos PDFs rotulados 'Inteiro teor do acórdão' na aba de andamentos, sem repetição e na ordem."""
    vistos = []
    for m in re.finditer(r'(?s)href="downloadPeca\.asp\?id=(\d+)&ext=\.pdf"[^>]*>(.*?)</a>', aba_andamentos):
        if re.search(r"inteiro teor do ac[óo]rd", texto_html(m[2]), re.I) and m[1] not in vistos:
            vistos.append(m[1])
    return vistos


def stf_acordao(processo, peca_id, texto, temas, agora):
    datas = re.findall(r"\b(\d{2}/\d{2}/\d{4})\b", texto[:600])      # a primeira é a da sessão de julgamento
    # a ementa fica entre a última linha de parte ("ADV.(A/S) :", "INTDO.(A/S) :") e o "A C Ó R D Ã O"
    fim = re.search(r"A\s?C\s?[ÓO]\s?R\s?D\s?[ÃA]\s?O\s*\n", texto)
    cab = texto[:fim.start()] if fim else ""
    partes = list(re.finditer(r"(?m)^[A-ZÀ-Ú][A-ZÀ-Ú. ()/]{2,30}\s*:.*$", cab))
    ementa = cab[partes[-1].end():] if partes else ""
    ementa = re.sub(r"\s+", " ", re.sub(r"(?m)^.*Documento assinado digitalmente.*$|^\s*\d+\s*$", "", ementa)).strip()
    rel = re.search(r"RELATORA?\s*:\s*MIN(?:ISTRO|ISTRA|\.)?\s*(.+)", texto)
    return {"id": f"STF-PECA-{peca_id}", "tribunal": "STF", "fonte": "stf_acordao", "tipo": "acordao",
            "processo": processo, "classe": processo.split()[0], "orgao_julgador": "Plenário" if "PLENÁRIO" in texto[:4000].upper() else None,
            "relator": rel[1].strip() if rel else None, "data_julgamento": _data(datas[0]) if datas else None,
            "data_publicacao": None, "ementa": ementa if len(ementa) > 80 else None, "tese_juridica": None,
            "temas": temas, "referencias": None, "inteiro_teor": texto,
            "link_oficial": f"{STF}/processos/downloadPeca.asp?id={peca_id}&ext=.pdf", "coletado_em": agora}


# --- STJ, espelhos de acórdãos -----------------------------------------------------------------

def stj_espelhos(itens, agora):
    docs = []
    for x in itens:
        ementa, refs = _nada(x.get("ementa")), _nada(x.get("referenciasLegislativas"))
        if not RE_PREV_TEXTO.search(f"{ementa} {refs} {_nada(x.get('termosAuxiliares'))}"):
            continue
        proc = f"{(x.get('siglaClasse') or '').strip()} {(x.get('numeroProcesso') or '').strip()}".strip()
        docs.append({
            "id": f"STJ-ESP-{x['id']}", "tribunal": "STJ", "fonte": "espelho", "tipo": "acordao", "processo": proc,
            "classe": (x.get("siglaClasse") or "").split()[-1] if x.get("siglaClasse") else None,
            "orgao_julgador": _nada(x.get("nomeOrgaoJulgador")), "relator": _nada(x.get("ministroRelator")),
            "data_julgamento": _data(str(x.get("dataDecisao"))), "data_publicacao": _data(str(x.get("dataPublicacao"))),
            "ementa": ementa, "tese_juridica": _nada(x.get("teseJuridica")), "temas": _nada(x.get("tema")),
            "referencias": refs, "inteiro_teor": "\n\n".join(filter(None, (_nada(x.get("decisao")), _nada(x.get("notas")),
                                                                          _nada(x.get("informacoesComplementares"))))) or None,
            "link_oficial": None, "coletado_em": agora})
    return docs


# --- STJ, íntegras de decisões terminativas e acórdãos (dados abertos) --------------------------

def orgao_do_texto(t):
    """O órgão só aparece no acórdão ('acordam os Ministros da SEGUNDA TURMA'). Decisão monocrática fica sem."""
    m = re.search(r"(?i)acordam\s+os\s+(?:Srs\.\s+)?Ministros\s+d[ao]\s+((?:PRIMEIRA|SEGUNDA|TERCEIRA|QUARTA|QUINTA|SEXTA)"
                  r"\s+(?:TURMA|SE[ÇC][ÃA]O)|CORTE\s+ESPECIAL)", t or "")
    return re.sub(r"\s+", " ", m[1]).upper() if m else None


def _campo(x, *nomes):
    for k, v in x.items():
        if k.lower().replace("ç", "c").replace("ã", "a") in nomes:
            return v
    return None


def stj_integras(meta, textos, prev, agora):
    """meta é a lista do metadados AAAAMMDD.json e textos o dict SeqDocumento -> texto do ZIP do mesmo dia.
    Devolve (documentos previdenciários com texto, previdenciários do dia, previdenciários sem texto)."""
    docs, total, sem = [], 0, 0
    for x in meta:
        if not codigos_previdenciarios(str(_campo(x, "assuntos") or ""), prev):
            continue
        total += 1
        seq = str(_campo(x, "seqdocumento"))
        if seq not in textos:
            sem += 1
            continue
        tipo = "acordao" if str(_campo(x, "tipodocumento") or "").upper().startswith("AC") else "decisao"
        proc = re.sub(r"\s+", " ", str(_campo(x, "processo") or "")).strip()
        recurso = _nada(str(_campo(x, "recurso") or ""))
        docs.append({
            "id": f"STJ-INT-{seq}", "tribunal": "STJ", "fonte": "integra", "tipo": tipo,
            "processo": f"{recurso} no {proc}" if recurso and tipo == "acordao" else proc,
            "classe": proc.split()[0] if proc else None, "orgao_julgador": orgao_do_texto(textos[seq]),
            "relator": _nada(str(_campo(x, "nm_ministro", "ministro") or "")),
            "data_julgamento": None, "data_publicacao": _data(str(_campo(x, "datapublicacao"))),
            "ementa": None, "tese_juridica": None, "temas": None, "referencias": None,
            "inteiro_teor": texto_html(textos[seq]), "link_oficial": None, "coletado_em": agora})
    return docs, total, sem


# --- STJ, Diário de Justiça Eletrônico Nacional (CNJ), consulta pela parte INSS -----------------

TIPOS_DJEN = {"EMENTA / ACORDÃO": "acordao", "DESPACHO / DECISÃO": "decisao"}


def stj_djen(itens, agora, minimo=800):
    """Só acórdão e decisão, e decisão com mais de `minimo` caracteres, porque o resto é 'distribua-se'."""
    docs = []
    for x in itens:
        tipo = TIPOS_DJEN.get((x.get("tipoDocumento") or "").strip())
        teor = texto_html(x.get("texto"))
        if not tipo or (tipo == "decisao" and len(teor) < minimo):
            continue
        cab = re.match(r"\s*([A-Za-z]+(?: (?:no|nos|na|nas) [A-Za-z]+)*(?: [A-Za-z]+)* \d+)/", teor)
        rel = re.search(r"RELATORA?\s*:\s*MINISTR[OA]\s+(.+?)\s+(?:[A-Z]+\s*:|$)", teor[:600])
        docs.append({
            "id": f"STJ-DJEN-{x['id']}", "tribunal": "STJ", "fonte": "djen", "tipo": tipo,
            "processo": cab[1] if cab else None, "classe": cab[1].split()[0] if cab else None,
            "orgao_julgador": orgao_do_texto(teor), "relator": rel[1].strip() if rel else None,
            "data_julgamento": None, "data_publicacao": _data(x.get("data_disponibilizacao")),
            "ementa": None, "tese_juridica": None,
            "temas": ", ".join(sorted({n.replace(".", "") for n in re.findall(r"Tema\s*n?º?\.?\s*(\d[\d.]*)\s*/\s*STJ", teor)})) or None,
            "referencias": None, "inteiro_teor": teor, "link_oficial": x.get("link"), "coletado_em": agora})
    return docs


# --- STJ, Jurisprudência em Teses (lida pelo navegador) ----------------------------------------

def stj_jt(edicao, titulo, texto, agora):
    """texto é o innerText da edição. Cada tese começa por 'N) ' e termina antes de 'Julgados'."""
    linhas, d = [], re.search(r"disponibilizada em:\s*(\d{2}/\d{2}/\d{4})", texto)
    # edição de outro ramo (processo civil, administrativo...) traz "Ramo: X" na primeira linha
    ramo = (m[1].strip() if (m := re.search(r"(?m)^Ramo:\s*(.+)$", texto)) else "DIREITO PREVIDENCIÁRIO")
    texto = texto.split("Clique nos links abaixo para consultar")[0]       # rodapé com a lista de edições
    # a página traz, escondida, a lista de julgados de cada tese; só vale a numeração sequencial, para que uma
    # linha dessa lista que comece por número não vire tese
    marcas, esperado = [], 1
    for m in re.finditer(r"(?:^|\n)\s*(\d{1,2})\)\s", texto):
        if int(m[1]) == esperado:
            marcas.append(m); esperado += 1
    for i, m in enumerate(marcas):
        bloco = texto[m.end(): marcas[i + 1].start() if i + 1 < len(marcas) else len(texto)]
        j = re.search(r"\n\s*Julgados\b", bloco)
        tese, julgados = (bloco[:j.start()], bloco[j.end():]) if j else (bloco, "")
        refs = re.findall(r"[A-Za-z]+(?: (?:no|nos|na|nas|em) [A-Za-z]+)* \d[\d.]*/[A-Z]{2}, Rel\. Min(?:istr[oa])?\.? [^,]+, [^,]+, "
                          r"(?i:DJe|DJ|DJEN) \d{2}/\d{2}/\d{4}", re.sub(r"\s+", " ", julgados))
        linhas.append({"id": f"STJ-JT-{edicao}-{m[1]}", "tribunal": "STJ", "tipo": "jurisprudencia_em_teses",
                       "numero": int(m[1]), "titulo": f"Edição {edicao}: {titulo}", "questao": None,
                       "tese": re.sub(r"\s+", " ", tese).strip(), "situacao": None,
                       "leading_case": "; ".join(refs[:5]) or None,          # julgados que a edição indica para a tese
                       "orgao_julgador": None, "relator": None, "data_afetacao": None, "data_julgamento": None,
                       "data_publicacao": _data(d[1]) if d else None, "assuntos": ramo, "previdenciario": int(ramo == "DIREITO PREVIDENCIÁRIO"),
                       "vinculo": None, "link_oficial": "https://scon.stj.jus.br/SCON/jt/", "coletado_em": agora})
    return linhas
