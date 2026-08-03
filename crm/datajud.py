"""Andamento oficial dos processos (API pública DataJud/CNJ) -> ficha do caso.

O CNJ mantém em api-publica.datajud.cnj.jus.br uma base pública com os
metadados e TODOS os movimentos oficiais de cada processo do país. Este
script pega os processos judiciais dos casos, consulta o tribunal certo
(deduzido do próprio número CNJ) e grava em casos.datajud um resumo:

    {"processo": "0000001-14.2015.4.03.9999", "tribunal": "TRF3",
     "grau": "G2", "classe": "Apelação / Remessa Necessária",
     "orgao": "GAB. 37 - DES.FED. NELSON PORFIRIO",
     "ajuizado_em": "2015-01-05",
     "ultimo": {"data": "2026-04-07", "nome": "Conclusão",
                "complemento": "para decisão",
                "claro": "Está concluso — aguardando decisão do relator."},
     "recentes": [...], "outras": [{"grau": "G1", ...}],
     "consultado_em": "2026-08-03"}

Diferente do painel do TRF3 (que só tem a fila de julgamento do 2º grau),
aqui entra QUALQUER processo judicial — 1º grau, JEF, Turma Recursal e
Justiça Estadual — com o movimento oficial mais recente. É o que permite ao
colaborador responder "onde está meu processo?" sem abrir o PJe.

Roda no workflow consultas-publicas.yml. Exige SUPABASE_URL e
SUPABASE_SERVICE_KEY; CA_BUNDLE opcional para o certificado do proxy.
"""
import datetime, json, os, re, ssl, sys, time, urllib.error, urllib.request

API = "https://api-publica.datajud.cnj.jus.br/api_publica_{alias}/_search"
# chave pública de consulta, divulgada pelo próprio CNJ na documentação da API
CHAVE = os.environ.get("DATAJUD_API_KEY",
                       "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==")

RE_CNJ = re.compile(r"(?<!\d)(\d{7})-?(\d{2})\.?(\d{4})\.?(\d)\.?(\d{2})\.?(\d{4})(?!\d)")

# J=8 (Justiça Estadual): código do tribunal -> sigla da UF
UF_ESTADUAL = {
    "01": "ac", "02": "al", "03": "ap", "04": "am", "05": "ba", "06": "ce",
    "07": "df", "08": "es", "09": "go", "10": "ma", "11": "mt", "12": "ms",
    "13": "mg", "14": "pa", "15": "pb", "16": "pr", "17": "pe", "18": "pi",
    "19": "rj", "20": "rn", "21": "rs", "22": "ro", "23": "rr", "24": "sc",
    "25": "se", "26": "sp", "27": "to",
}

# Tradução dos movimentos que mais aparecem nos nossos processos (códigos
# conferidos numa amostra real de processos previdenciários do TRF3).
# Movimento sem tradução aqui aparece com o nome oficial mesmo.
CLARO = {
    26: "O processo foi distribuído ao relator.",
    36: "O processo foi redistribuído a outro relator.",
    51: "Está concluso — aguardando decisão do julgador.",
    85: "Foi juntada uma petição aos autos.",
    92: "Houve publicação oficial no processo.",
    1061: "A decisão foi disponibilizada no Diário da Justiça Eletrônico.",
    123: "O processo foi remetido a outro setor/instância.",
    132: "O processo foi recebido no setor de destino.",
    981: "O processo foi recebido no setor de destino.",
    982: "O processo foi remetido a outro setor/instância.",
    848: "TRANSITOU EM JULGADO — não cabe mais recurso.",
    22: "Baixa definitiva: o processo foi encerrado e arquivado.",
    246: "Arquivamento definitivo.",
    219: "Pedido julgado PROCEDENTE.",
    220: "Pedido julgado IMPROCEDENTE.",
    218: "Pedido julgado PARCIALMENTE PROCEDENTE.",
    237: "Recurso PROVIDO.",
    238: "Recurso PARCIALMENTE PROVIDO.",
    239: "Recurso NÃO PROVIDO.",
    12200: "Julgamento do mérito.",
    12266: "Decisão confirmada pelo tribunal.",
    12065: "Processo suspenso/sobrestado (aguardando decisão de outro caso).",
    12066: "A suspensão foi levantada — o processo voltou a andar.",
    11010: "Despacho de mero expediente (andamento burocrático).",
    11022: "Julgamento convertido em diligência.",
    12265: "Documento expedido/certificado nos autos.",
}


# Marcos que mudam a vida do cliente (e do escritório): o dinheiro. Códigos
# conferidos numa amostra real de execuções previdenciárias do TRF3.
MARCOS = {
    848: ("transito", "Trânsito em julgado — não cabe mais recurso."),
    12457: ("requisitorio", "Requisitório expedido (precatório/RPV) — "
                            "o pagamento foi requisitado."),
    12548: ("alvara", "Alvará de levantamento expedido — "
                      "o dinheiro já pode ser sacado."),
    1049: ("pago", "Pagamento integral do débito."),
}


def marcos(movs):
    """Movimentos -> marcos financeiros com a data de CADA um (o mais recente).

    {"requisitorio": {"data": "2026-05-12", "nome": "Expedição de
      precatório/rpv", "claro": "..."}, "transito": {...}}
    """
    achados = {}
    for m in sorted(movs or [], key=lambda x: x.get("dataHora") or ""):
        alvo = MARCOS.get(m.get("codigo"))
        if not alvo:
            continue
        chave, claro = alvo
        achados[chave] = {"data": _dia(m.get("dataHora")),
                          "nome": m.get("nome"), "claro": claro}
    return achados


def cnj(texto):
    """Extrai um nº CNJ de um texto -> (20 dígitos, formatado, alias do tribunal).

    O alias sai do próprio número: 4.03 -> trf3, 8.26 -> tjsp. Devolve None
    se não houver número ou se for de um ramo que não consultamos.
    """
    m = RE_CNJ.search(texto or "")
    if not m:
        return None
    n, dv, ano, j, trib, org = m.groups()
    if j == "4" and trib in ("01", "02", "03", "04", "05", "06"):
        alias = f"trf{int(trib)}"
    elif j == "8" and trib in UF_ESTADUAL:
        alias = f"tj{UF_ESTADUAL[trib]}"
    else:
        return None            # trabalhista, eleitoral, militar: fora do escopo
    return (f"{n}{dv}{ano}{j}{trib}{org}",
            f"{n}-{dv}.{ano}.{j}.{trib}.{org}", alias)


def _ctx():
    return ssl.create_default_context(cafile=os.environ.get("CA_BUNDLE") or None)


def _buscar(alias, corpo):
    req = urllib.request.Request(
        API.format(alias=alias), data=json.dumps(corpo).encode(),
        headers={"Authorization": f"APIKey {CHAVE}", "Content-Type": "application/json"})
    for i in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120, context=_ctx()) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code == 404:          # tribunal sem índice público
                return {"hits": {"hits": []}}
            if e.code not in (429, 500, 502, 503, 504) or i == 3:
                raise
            time.sleep(2 ** (i + 1))
        except Exception:
            if i == 3:
                raise
            time.sleep(2 ** (i + 1))


def _dia(txt):
    """'2026-04-07T13:14:31.000Z' ou '20150105000000' -> '2026-04-07'."""
    if not txt:
        return None
    if "-" in txt:
        return txt[:10]
    return f"{txt[0:4]}-{txt[4:6]}-{txt[6:8]}" if len(txt) >= 8 else None


def _complemento(mov):
    return "; ".join(c.get("nome", "") for c in mov.get("complementosTabelados", [])
                     if c.get("nome"))


def resumir(fonte):
    """Um registro do DataJud -> dicionário enxuto (sem os 110 movimentos)."""
    movs = sorted(fonte.get("movimentos", []), key=lambda m: m.get("dataHora") or "")
    recentes = []
    for m in movs[-6:][::-1]:
        recentes.append({"data": _dia(m.get("dataHora")), "nome": m.get("nome"),
                         "complemento": _complemento(m) or None})
    ultimo = None
    if movs:
        u = movs[-1]
        ultimo = {"data": _dia(u.get("dataHora")), "nome": u.get("nome"),
                  "codigo": u.get("codigo"), "complemento": _complemento(u) or None,
                  "claro": CLARO.get(u.get("codigo"))}
    return {
        "tribunal": fonte.get("tribunal"),
        "grau": fonte.get("grau"),
        "sistema": (fonte.get("sistema") or {}).get("nome"),
        "classe": (fonte.get("classe") or {}).get("nome"),
        "orgao": (fonte.get("orgaoJulgador") or {}).get("nome"),
        "ajuizado_em": _dia(fonte.get("dataAjuizamento")),
        "ultimo": ultimo,
        "recentes": recentes,
        "marcos": marcos(movs),
    }


def _peso(r):
    """Para escolher onde o processo 'está' hoje: o movimento mais recente."""
    return ((r.get("ultimo") or {}).get("data") or "", r.get("grau") or "")


def consultar(alias, numeros):
    """Consulta um lote de números num tribunal -> {numero20: resumo}.

    Um mesmo número existe em mais de um grau (1º e 2º). Fica valendo o
    registro com o movimento mais recente; os demais viram 'outras'.
    """
    d = _buscar(alias, {"query": {"terms": {"numeroProcesso": list(numeros)}},
                        "size": max(20, len(numeros) * 4)})
    por_numero = {}
    for h in d.get("hits", {}).get("hits", []):
        f = h.get("_source", {})
        n = f.get("numeroProcesso")
        if not n:
            continue
        por_numero.setdefault(n, []).append(resumir(f))
    saida = {}
    for n, rs in por_numero.items():
        rs.sort(key=_peso, reverse=True)
        principal, outras = rs[0], rs[1:]
        principal["outras"] = [{"grau": o.get("grau"), "orgao": o.get("orgao"),
                                "classe": o.get("classe"),
                                "ultimo_data": (o.get("ultimo") or {}).get("data"),
                                "ultimo_nome": (o.get("ultimo") or {}).get("nome")}
                               for o in outras]
        saida[n] = principal
    return saida


def titulo(nome):
    """'GAB. 37 - DES.FED. NELSON PORFIRIO' -> 'Gab. 37 - Des.Fed. Nelson Porfirio'.

    Os nomes vêm em CAIXA ALTA do CNJ; numa mensagem ao cliente isso parece
    grito. Só mexe quando está tudo em maiúsculas.
    """
    if not nome or nome != nome.upper():
        return nome
    miudas = {"de", "da", "do", "das", "dos", "e", "com", "em"}
    saida = []
    for p in nome.split(" "):
        b = p.lower()
        saida.append(b if b in miudas and saida else
                     ".".join(x[:1].upper() + x[1:] for x in b.split(".")))
    return " ".join(saida)


def frase_cliente(t):
    """Texto pronto para o cliente com o andamento oficial."""
    u = t.get("ultimo") or {}
    if not u.get("data"):
        return ""
    dbr = lambda i: f"{i[8:10]}/{i[5:7]}/{i[0:4]}" if i else ""
    mov = u.get("nome") or "movimentação"
    comp = f" ({u['complemento']})" if u.get("complemento") else ""
    claro = f" {u['claro']}" if u.get("claro") else ""
    onde = f" O processo está em {titulo(t['orgao'])}." if t.get("orgao") else ""
    return (f"O processo nº {t['processo']} teve como último andamento oficial "
            f"“{mov}{comp}”, em {dbr(u['data'])}.{claro}{onde} "
            f"Fonte: base pública do CNJ (DataJud), consulta de "
            f"{dbr(t.get('consultado_em'))}.")


def frase_marco(t):
    """Mensagem ao cliente sobre o marco financeiro mais adiantado do processo."""
    mc = t.get("marcos") or {}
    dbr = lambda i: f"{i[8:10]}/{i[5:7]}/{i[0:4]}" if i else ""
    for chave, texto in (
            ("pago", "o pagamento do débito foi registrado nos autos"),
            ("alvara", "foi expedido o alvará de levantamento — o valor já pode "
                       "ser sacado"),
            ("requisitorio", "foi expedido o requisitório de pagamento "
                             "(precatório/RPV)"),
            ("transito", "o processo transitou em julgado, ou seja, não cabe "
                         "mais recurso")):
        m = mc.get(chave)
        if m and m.get("data"):
            return (f"No processo nº {t['processo']}, {texto}, em "
                    f"{dbr(m['data'])} (movimento oficial “{m.get('nome')}”). "
                    f"Fonte: base pública do CNJ (DataJud), consulta de "
                    f"{dbr(t.get('consultado_em'))}.")
    return ""


def _rest(metodo, caminho, corpo=None, prefer=None):
    url = os.environ["SUPABASE_URL"].rstrip("/") + caminho
    chave = os.environ["SUPABASE_SERVICE_KEY"]
    req = urllib.request.Request(
        url, data=json.dumps(corpo).encode() if corpo is not None else None,
        method=metodo,
        headers={"apikey": chave, "Authorization": f"Bearer {chave}",
                 "Content-Type": "application/json",
                 **({"Prefer": prefer} if prefer else {})})
    with urllib.request.urlopen(req, timeout=60, context=_ctx()) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def main():
    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_SERVICE_KEY"):
        sys.exit("Defina SUPABASE_URL e SUPABASE_SERVICE_KEY.")
    hoje = datetime.date.today().isoformat()

    casos = _rest("GET", "/rest/v1/casos?processo=not.is.null"
                         "&fase=neq.encerrado&select=id,processo") or []
    porTribunal = {}                    # alias -> {numero20: (formatado, [caso_ids])}
    for k in casos:
        achado = cnj(k["processo"])
        if not achado:
            continue
        n20, fmt, alias = achado
        d = porTribunal.setdefault(alias, {})
        d.setdefault(n20, (fmt, []))[1].append(k["id"])
    if not porTribunal:
        print("nenhum caso com processo judicial reconhecido.")
        return

    achados = encontrados = ausentes = 0
    for alias, mapa in sorted(porTribunal.items()):
        numeros = sorted(mapa)
        print(f"{alias}: {len(numeros)} processo(s)")
        res = {}
        for i in range(0, len(numeros), 50):
            res.update(consultar(alias, numeros[i:i + 50]))
        for n20, (fmt, ids) in mapa.items():
            t = res.get(n20)
            if t:
                t = {"processo": fmt, **t, "consultado_em": hoje}
                encontrados += 1
            else:
                t = {"processo": fmt, "ultimo": None, "consultado_em": hoje}
                ausentes += 1
            for cid in ids:
                _rest("PATCH", f"/rest/v1/casos?id=eq.{cid}", {"datajud": t},
                      prefer="return=minimal")
            achados += 1
    print(f"processos consultados: {achados} · com andamento: {encontrados} "
          f"· sem registro público: {ausentes}")


if __name__ == "__main__":
    main()
