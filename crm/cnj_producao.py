"""Produção oficial de cada órgão julgador (painel Justiça em Números do CNJ).

O CNJ publica em justica-em-numeros.cnj.jus.br/painel-estatisticas um painel
Power BI com, para CADA órgão julgador do país:

  - quantos processos julgou no ano passado e no ano corrente;
  - quantos estão conclusos para julgamento;
  - o tempo médio entre a distribuição e o julgamento (indicador oficial).

É a peça que faltava para a previsão de julgamento: o painel do TRF3 diz em
que POSIÇÃO da fila o processo está, e este diz a que VELOCIDADE aquele
gabinete anda. Com os dois, dá para estimar a data já na primeira consulta,
sem esperar semanas medindo a fila.

    Gab. 37: 2.418 julgados no ano passado (~201/mês), 520 conclusos,
             tempo médio de julgamento 198 dias.

Grava na tabela orgao_producao. Roda junto com as demais consultas públicas
(workflow consultas-publicas.yml). Exige SUPABASE_URL e SUPABASE_SERVICE_KEY.
"""
import base64, datetime, gzip, json, os, re, ssl, sys, time, unicodedata, urllib.request

# painel público "Estatísticas" (link publicar-na-web do próprio CNJ)
PBI_BASE = "https://wabi-us-east-a-primary-api.analysis.windows.net"
PBI_R = ("eyJrIjoiY2MyNmU4NjYtOTcwOS00OGE5LTkzYWYtMGM0ZTVkMGJjOTllIiwidCI6"
         "ImFkOTE5MGU2LWM0NWQtNDYwMC1iYzVjLWVjYTU1NGNjZjQ5NyIsImMiOjJ9")
PBI_DATASET = "65185df1-393e-4827-9e0e-3ddf0ff2c619"
PBI_MODEL = 3223105

GRAUS = ["2º Grau", "1º Grau", "Juizado Especial", "Turma Recursal"]


def chave():
    return json.loads(base64.b64decode(PBI_R + "=="))["k"]


def _ctx():
    return ssl.create_default_context(cafile=os.environ.get("CA_BUNDLE") or None)


def _pbi(caminho, corpo=None):
    h = {"X-PowerBI-ResourceKey": chave(), "Accept": "application/json",
         "User-Agent": "Mozilla/5.0"}
    data = None
    if corpo is not None:
        h["Content-Type"] = "application/json;charset=UTF-8"
        data = json.dumps(corpo).encode()
    req = urllib.request.Request(PBI_BASE + caminho, data=data, headers=h)
    for i in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120, context=_ctx()) as r:
                raw = r.read()
                if r.headers.get("Content-Encoding") == "gzip":
                    raw = gzip.decompress(raw)
                return json.loads(raw)
        except Exception:
            if i == 3:
                raise
            time.sleep(2 ** (i + 1))


def _col(src, prop, nome):
    return {"Column": {"Expression": {"SourceRef": {"Source": src}}, "Property": prop},
            "Name": nome}


def _med(src, prop, nome):
    return {"Measure": {"Expression": {"SourceRef": {"Source": src}}, "Property": prop},
            "Name": nome}


def _igual(src, prop, valor):
    return {"Condition": {"In": {
        "Expressions": [{"Column": {"Expression": {"SourceRef": {"Source": src}},
                                    "Property": prop}}],
        "Values": [[{"Literal": {"Value": f"'{valor}'"}}]]}}}


def decode_dsr(data):
    """Achata o DSR do Power BI (mesmo formato do painel do TRF3)."""
    ds = data["dsr"]["DS"][0]
    dicts = ds.get("ValueDicts", {})
    linhas, schema, anterior = [], None, []
    for ph in ds.get("PH", []):
        for ent in ph.get("DM0", []):
            if "S" in ent:
                schema = ent["S"]
            if schema is None:
                continue
            C, R, ci = ent.get("C", []), ent.get("R", 0), 0
            bruta = []
            for i in range(len(schema)):
                if R >> i & 1:
                    bruta.append(anterior[i] if i < len(anterior) else None)
                else:
                    bruta.append(C[ci] if ci < len(C) else None)
                    ci += 1
            anterior = bruta
            linha = []
            for i, colspec in enumerate(schema):
                v = bruta[i]
                dn = colspec.get("DN")
                if dn is not None and isinstance(v, int):
                    vd = dicts.get(dn, [])
                    v = vd[v] if v < len(vd) else None
                linha.append(v)
            linhas.append(linha)
    return linhas


def _consultar(query, projecoes, top=1000):
    corpo = {"version": "1.0.0", "queries": [{
        "Query": {"Commands": [{"SemanticQueryDataShapeCommand": {
            "Query": query,
            "Binding": {"Primary": {"Groupings": [{"Projections": projecoes}]},
                        "DataReduction": {"DataVolume": 3,
                                          "Primary": {"Top": {"Count": top}}},
                        "Version": 1}}}]},
        "QueryId": "", "ApplicationContext": {"DatasetId": PBI_DATASET}}],
        "cancelQueries": [], "modelId": PBI_MODEL}
    d = _pbi("/public/reports/querydata?synchronous=true", corpo)
    return d["results"][0]["result"]["data"]


def _num(v):
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def producao(tribunal, grau):
    """Um tribunal/grau -> [{orgao, julgados_ano_anterior, ...}] do painel."""
    q = {"Version": 2,
         "From": [{"Name": "o", "Entity": "orgao_julgador_ordenado_grau", "Type": 0},
                  {"Name": "g", "Entity": "medidas_gestao_processual", "Type": 0},
                  {"Name": "t", "Entity": "Medidas Tempos", "Type": 0}],
         "Select": [_col("o", "nome_orgao", "org"),
                    _med("g", "ano_anterior_julgados", "ja"),
                    _med("g", "ano_atual_julgados", "jat"),
                    _med("g", "ultimo_mes_conc_parajulgamento", "cj"),
                    _med("t", "média_julgamento_oj", "dias")],
         "Where": [_igual("o", "sigla_tribunal", tribunal), _igual("o", "Grau", grau)]}
    saida = []
    for org, ja, jat, cj, dias in decode_dsr(_consultar(q, [0, 1, 2, 3, 4])):
        if not org:
            continue
        d = _num(dias)
        saida.append({"tribunal": tribunal, "grau": grau, "orgao": org,
                      "julgados_ano_anterior": int(ja) if ja is not None else None,
                      "julgados_ano_atual": int(jat) if jat is not None else None,
                      "conclusos_julgamento": int(cj) if cj is not None else None,
                      "dias_medios_julgamento": int(round(d)) if d else None})
    return saida


def julgados_por_mes(p):
    """Ritmo mensal do órgão: o ano fechado é a base mais estável que existe.

    Sem ano anterior (órgão novo), cai para o ano corrente dividido pelos
    meses já decorridos. Devolve None quando não há produção conhecida.
    """
    if not p:
        return None
    ja = p.get("julgados_ano_anterior")
    if ja:
        return round(ja / 12, 1)
    jat = p.get("julgados_ano_atual")
    meses = p.get("meses_decorridos") or datetime.date.today().month
    if jat and meses:
        return round(jat / meses, 1)
    return None


def _norm(s):
    s = unicodedata.normalize("NFD", (s or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def _gabinete(nome):
    """'Gab. 37 Des. Fed. Nelson Porfirio' / 'GABINETE 37 - ...' -> '37'."""
    m = re.match(r"\s*gab(?:\.|inete)?\s*0*(\d{1,3}|[a-z])\b", _norm(nome))
    return m.group(1) if m else None


def casar_orgao(nome_painel, producoes):
    """Órgão do painel do TRF3 -> órgão do painel do CNJ.

    Casa pelo NÚMERO do gabinete (é o que os dois painéis escrevem igual) e,
    na falta dele, por palavras do nome. Sem casamento seguro devolve None —
    previsão com o ritmo do gabinete errado seria pior do que previsão nenhuma.
    """
    if not nome_painel:
        return None
    gab = _gabinete(nome_painel)
    if gab:
        iguais = [p for p in producoes if _gabinete(p["orgao"]) == gab]
        if len(iguais) == 1:
            return iguais[0]
        if iguais:      # desempata pelo sobrenome do desembargador
            alvo = set(_norm(nome_painel).split()) - {"gab", "des", "fed"}
            iguais.sort(key=lambda p: len(alvo & set(_norm(p["orgao"]).split())),
                        reverse=True)
            return iguais[0]
    alvo = {w for w in _norm(nome_painel).split() if len(w) > 3}
    melhor, nota = None, 0
    for p in producoes:
        n = len(alvo & {w for w in _norm(p["orgao"]).split() if len(w) > 3})
        if n > nota:
            melhor, nota = p, n
    return melhor if nota >= 2 else None


def _rest(metodo, caminho, corpo=None, prefer=None):
    url = os.environ["SUPABASE_URL"].rstrip("/") + caminho
    ch = os.environ["SUPABASE_SERVICE_KEY"]
    req = urllib.request.Request(
        url, data=json.dumps(corpo).encode() if corpo is not None else None,
        method=metodo,
        headers={"apikey": ch, "Authorization": f"Bearer {ch}",
                 "Content-Type": "application/json",
                 **({"Prefer": prefer} if prefer else {})})
    with urllib.request.urlopen(req, timeout=120, context=_ctx()) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def tribunais_dos_casos():
    """Siglas de tribunal onde temos processo (do que o datajud já gravou)."""
    casos = _rest("GET", "/rest/v1/casos?datajud=not.is.null"
                         "&select=datajud") or []
    siglas = {(k.get("datajud") or {}).get("tribunal") for k in casos}
    return sorted(s for s in siglas if s)


def main():
    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_SERVICE_KEY"):
        sys.exit("Defina SUPABASE_URL e SUPABASE_SERVICE_KEY.")
    hoje = datetime.date.today().isoformat()
    siglas = tribunais_dos_casos() or ["TRF3"]
    print(f"tribunais com processo nosso: {', '.join(siglas)}")

    linhas = []
    for sigla in siglas:
        for grau in GRAUS:
            try:
                achados = producao(sigla, grau)
            except Exception as e:
                print(f"  {sigla}/{grau}: {e}")
                continue
            if achados:
                print(f"  {sigla} · {grau}: {len(achados)} órgão(s)")
                linhas.extend(achados)
    if not linhas:
        print("nada devolvido pelo painel.")
        return
    for l in linhas:
        l["atualizado_em"] = hoje
    for i in range(0, len(linhas), 500):
        _rest("POST", "/rest/v1/orgao_producao", linhas[i:i + 500],
              prefer="resolution=merge-duplicates,return=minimal")
    print(f"gravadas {len(linhas)} linhas na tabela orgao_producao")


if __name__ == "__main__":
    main()
