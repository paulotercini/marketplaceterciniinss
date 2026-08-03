"""Fila do INSS (dados abertos) -> quanto tempo o pedido do cliente pode demorar.

O INSS publica em dadosabertos.inss.gov.br (CKAN) o conjunto "requerimentos
administrativos pendentes de análise": quantos pedidos de cada serviço estão
esperando, por unidade e por DATA DE CRIAÇÃO. Com isso dá para dizer ao
cliente, com dado oficial (retrato de 30/06/2026, SP):

    "Havia 101.092 pedidos de Benefício por Incapacidade aguardando análise em
     SP, e metade deles já esperava há mais de 15 dias."

Não é o processo do cliente — é a régua para calibrar a expectativa dele, que
é justamente o que falta quando o Meu INSS só diz "em análise".

O arquivo tem ~90 MB (800 mil linhas) e sai uma vez por mês; os recursos mais
antigos da mesma série vêm em .xlsx, lido aqui direto do zip para não depender
de openpyxl. A idade dos pedidos é medida até a data do RETRATO, nunca até
hoje: o INSS publica com atraso e medir contra hoje inflaria a espera.

Grava na tabela inss_fila (servico, uf, pendentes, dias_mediana, dias_p90,
referencia) e, em cada caso na fase INSS, a régua já casada com o benefício
(casos.inss_fila). Roda no workflow inss-fila.yml, uma vez por mês.
"""
import csv, datetime, io, json, os, re, ssl, sys, unicodedata, urllib.request, zipfile

CKAN = "https://dadosabertos.inss.gov.br/api/3/action/"
DATASET = ("dados-de-requerimentos-administrativos-pendentes"
           "-plano-de-dados-abertos-jun-2023-a-jun-2025")
# Como o escritório chama x como o INSS chama. Os nomes à direita são os
# serviços exatos do arquivo — as chaves mais específicas mandam primeiro
# (BPC do idoso não é o mesmo balcão do BPC do deficiente).
ASSIST_IDOSO = "Benefício Assistencial ao Idoso"
ASSIST_PCD = "Benefício Assistencial à Pessoa com Deficiência"
INCAPACIDADE = "Benefício por Incapacidade"
APELIDOS = {
    "bpc idoso": [ASSIST_IDOSO], "loas idoso": [ASSIST_IDOSO],
    "assistencial ao idoso": [ASSIST_IDOSO],
    "bpc deficien": [ASSIST_PCD], "loas deficien": [ASSIST_PCD],
    "assistencial a pessoa": [ASSIST_PCD],
    "bpc": [ASSIST_IDOSO, ASSIST_PCD], "loas": [ASSIST_IDOSO, ASSIST_PCD],
    "amparo": [ASSIST_IDOSO, ASSIST_PCD],
    # auxílio-doença virou "benefício por incapacidade" no balcão do INSS
    "auxilio doenca": [INCAPACIDADE], "auxilio por incapacidade": [INCAPACIDADE],
    "incapacidade": [INCAPACIDADE], "invalidez": [INCAPACIDADE],
}
# qualificadores que o nosso nome quase nunca traz e que não mudam o balcão
NEUTROS = {"rural", "urbano", "urbana"}


def _ctx():
    return ssl.create_default_context(cafile=os.environ.get("CA_BUNDLE") or None)


def _http(url, timeout=300):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout, context=_ctx()) as r:
        return r.read()


def recurso_mais_novo(pacote):
    """Pega o recurso publicado mais recentemente (o mês corrente da série)."""
    recs = [r for r in pacote.get("resources", [])
            if (r.get("format") or "").upper() in ("CSV", "XLSX") and r.get("url")]
    if not recs:
        return None
    recs.sort(key=lambda r: (r.get("created") or r.get("last_modified") or ""),
              reverse=True)
    return recs[0]


def _data_ddmmaaaa(v):
    """'18112023' (e '1112023', quando a planilha comeu o zero) -> date."""
    d = re.sub(r"\D", "", v or "")
    if len(d) == 7:
        d = "0" + d
    if len(d) != 8:
        return None
    try:
        return datetime.date(int(d[4:8]), int(d[2:4]), int(d[0:2]))
    except ValueError:
        return None


def ler_dados(conteudo):
    """Bytes do recurso -> gerador de (servico, uf, data_criacao, quantidade).

    O INSS publica esse conjunto como CSV agregado (uma linha por unidade /
    serviço / data, com a quantidade de tarefas pendentes). Recursos antigos
    da mesma série vêm em .xlsx — os dois formatos entram aqui.
    """
    if conteudo[:2] == b"PK":                  # .xlsx: zip com o dicionário
        z = zipfile.ZipFile(io.BytesIO(conteudo))
        textos = re.findall(r"<t[^>]*>(.*?)</t>",
                            z.read("xl/sharedStrings.xml").decode("utf-8", "ignore"), re.S)
        sheet = z.read("xl/worksheets/sheet1.xml").decode("utf-8", "ignore")
        for linha in re.finditer(r"<row[^>]*>(.*?)</row>", sheet, re.S):
            cel = {}
            for c in re.finditer(r'<c r="([A-Z]+)\d+"([^>]*)>(.*?)</c>',
                                 linha.group(1), re.S):
                v = re.search(r"<v>(.*?)</v>", c.group(3), re.S)
                if not v:
                    continue
                valor = v.group(1)
                if 't="s"' in c.group(2):
                    try:
                        valor = textos[int(valor)]
                    except (ValueError, IndexError):
                        valor = ""
                cel[c.group(1)] = valor
            if cel:
                yield (cel.get("D", ""), cel.get("E", ""),
                       _data_ddmmaaaa(cel.get("F", "")), cel.get("G", "1"))
        return
    texto = conteudo.decode("latin-1", "ignore")
    for linha in csv.reader(io.StringIO(texto)):
        if len(linha) >= 7:
            yield linha[3], linha[4], _data_ddmmaaaa(linha[5]), linha[6]


def _percentil(pares, p):
    """pares = [(dias, quantidade)] ordenado por dias -> percentil ponderado."""
    total = sum(q for _, q in pares)
    if not total:
        return None
    alvo, acumulado = total * p, 0
    for dias, q in pares:
        acumulado += q
        if acumulado >= alvo:
            return dias
    return pares[-1][0]


def agregar(linhas, referencia=None):
    """Linhas -> {(servico, uf): {pendentes, dias_mediana, dias_p90}}.

    A idade de cada pedido é contada até a data de REFERÊNCIA do arquivo (a
    fotografia da fila), nunca até hoje: o INSS publica com alguns meses de
    atraso, e medir contra hoje inflaria a espera. Sem referência, usa o
    pedido mais recente do próprio arquivo. Cada UF entra separada e o
    Brasil inteiro entra como 'BR'.
    """
    registros = []
    for servico, uf, criada, qtd in linhas:
        if not servico or not criada or servico == "Nome do serviço":
            continue
        try:
            q = int(float(qtd))
        except (TypeError, ValueError):
            continue
        if q <= 0:
            continue
        registros.append((servico.strip(), (uf or "").strip().upper(), criada, q))
    if not registros:
        return {}
    ref = referencia or max(r[2] for r in registros)

    contagem = {}
    for servico, uf, criada, q in registros:
        dias = (ref - criada).days
        if dias < 0:
            continue
        for chave in ((servico, uf), (servico, "BR")):
            porIdade = contagem.setdefault(chave, {})
            porIdade[dias] = porIdade.get(dias, 0) + q
    saida = {}
    for chave, porIdade in contagem.items():
        pares = sorted(porIdade.items())
        saida[chave] = {"pendentes": sum(porIdade.values()),
                        "dias_mediana": _percentil(pares, 0.5),
                        "dias_p90": _percentil(pares, 0.9),
                        "referencia": ref.isoformat()}
    return saida


def _norm(s):
    s = unicodedata.normalize("NFD", (s or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def casar_servicos(beneficio, servicos):
    """'Aposentadoria por Idade' -> ['... Idade Rural', '... Idade Urbana'].

    Casamento por palavras em comum, com os apelidos do escritório. Quando o
    nosso nome não diz rural/urbano, os dois empatam e os DOIS voltam — a
    fila mostrada é a soma, em vez de escolher um no chute. Sem duas palavras
    fortes em comum, devolve [] (melhor não mostrar do que mostrar errado).
    """
    alvo = _norm(beneficio)
    if not alvo:
        return []
    # apelido conhecido resolve na hora (do mais específico para o mais geral)
    for apelido in sorted(APELIDOS, key=len, reverse=True):
        if _norm(apelido) in alvo:
            return sorted(s for s in APELIDOS[apelido] if s in set(servicos))
    palavras = {p for p in alvo.split() if len(p) > 3} - NEUTROS
    if not palavras:
        return []
    # nota = palavras em comum; desempate = menos palavras sobrando no nome do
    # INSS (rural/urbano não contam, porque o nosso nome quase nunca diz)
    notas = {}
    for s in servicos:
        ps = {p for p in _norm(s).split() if len(p) > 3}
        notas[s] = (len(palavras & ps), -len(ps - palavras - NEUTROS))
    melhor = max(notas.values(), default=(0, 0))
    if melhor[0] < 2:
        return []
    return sorted(s for s, n in notas.items() if n == melhor)


def somar(dados, servicos, uf):
    """Junta a fila de vários serviços (ex.: rural + urbano) numa régua só."""
    linhas = [dados[(s, uf)] for s in servicos if (s, uf) in dados]
    if not linhas:
        return None
    total = sum(l["pendentes"] for l in linhas)
    # mediana/p90 do conjunto: média ponderada pelo tamanho de cada fila
    pond = lambda campo: int(round(
        sum(l[campo] * l["pendentes"] for l in linhas if l.get(campo) is not None)
        / max(1, sum(l["pendentes"] for l in linhas if l.get(campo) is not None))))
    return {"pendentes": total, "dias_mediana": pond("dias_mediana"),
            "dias_p90": pond("dias_p90"), "referencia": linhas[0]["referencia"],
            "servicos": list(servicos), "uf": uf}


def frase_cliente(f):
    """Mensagem ao cliente com a régua oficial da fila."""
    if not f or not f.get("pendentes"):
        return ""
    uf = f.get("uf")
    onde = f"em {uf}" if uf and uf != "BR" else "no país"
    ref = f.get("referencia") or ""
    quando = (f" (retrato de {ref[8:10]}/{ref[5:7]}/{ref[0:4]})"
              if len(ref) >= 10 else "")
    quantos = f"{f['pendentes']:,}".replace(",", ".")
    nome = " e ".join(f.get("servicos") or []) or "esse benefício"
    return (f"Segundo os dados abertos do INSS{quando}, havia {quantos} pedidos "
            f"de {nome} aguardando análise {onde}, e metade deles já esperava há "
            f"mais de {f['dias_mediana']} dias. É a régua da fila naquele "
            f"momento, e não uma data do seu pedido.")


def _rest(metodo, caminho, corpo=None, prefer=None):
    url = os.environ["SUPABASE_URL"].rstrip("/") + caminho
    chave = os.environ["SUPABASE_SERVICE_KEY"]
    req = urllib.request.Request(
        url, data=json.dumps(corpo).encode() if corpo is not None else None,
        method=metodo,
        headers={"apikey": chave, "Authorization": f"Bearer {chave}",
                 "Content-Type": "application/json",
                 **({"Prefer": prefer} if prefer else {})})
    with urllib.request.urlopen(req, timeout=120, context=_ctx()) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def main():
    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_SERVICE_KEY"):
        sys.exit("Defina SUPABASE_URL e SUPABASE_SERVICE_KEY.")
    pacote = json.loads(_http(CKAN + f"package_show?id={DATASET}", 120))["result"]
    rec = recurso_mais_novo(pacote)
    if not rec:
        sys.exit("nenhum recurso publicado no conjunto de requerimentos pendentes.")
    print(f"baixando {rec.get('name', '')[:70]} "
          f"(publicado em {(rec.get('created') or '')[:10]})")
    conteudo = _http(rec["url"], 600)
    print(f"{len(conteudo) / 1e6:.1f} MB — lendo a planilha…")

    dados = agregar(ler_dados(conteudo))
    print(f"combinações serviço/UF: {len(dados)}")

    hoje = datetime.date.today().isoformat()
    linhas = [{"servico": s, "uf": uf, **v, "atualizado_em": hoje}
              for (s, uf), v in sorted(dados.items())]
    for i in range(0, len(linhas), 500):       # em lotes, para não estourar
        _rest("POST", "/rest/v1/inss_fila", linhas[i:i + 500],
              prefer="resolution=merge-duplicates,return=minimal")
    ref = linhas[0]["referencia"] if linhas else "?"
    print(f"gravadas {len(linhas)} linhas na tabela inss_fila (referência {ref})")

    # o casamento benefício -> serviço do INSS é feito aqui (uma vez), e cada
    # caso na fase INSS já guarda a régua pronta para a ficha mostrar
    uf_casa = (os.environ.get("UF_ESCRITORIO") or "SP").upper()
    servicos = sorted({s for s, _ in dados})
    casos = _rest("GET", "/rest/v1/casos?fase=eq.inss&beneficio=not.is.null"
                         "&select=id,beneficio") or []
    cache, casados = {}, 0
    for k in casos:
        ben = k["beneficio"]
        if ben not in cache:
            achados = casar_servicos(ben, servicos)
            cache[ben] = (somar(dados, achados, uf_casa)
                          or somar(dados, achados, "BR")) if achados else None
        f = cache[ben]
        _rest("PATCH", f"/rest/v1/casos?id=eq.{k['id']}", {"inss_fila": f},
              prefer="return=minimal")
        casados += 1 if f else 0
    print(f"casos na fase INSS: {len(casos)} · com régua da fila: {casados}")


if __name__ == "__main__":
    main()
