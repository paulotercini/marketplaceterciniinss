"""Ordem de julgamento no TRF3 -> ficha do processo no CRM.

O TRF3 publica em Power BI ("publicar na web") a lista de processos conclusos
com a ORDEM DE JULGAMENTO de cada gabinete. Este script consulta a API pública
desse painel, localiza os processos judiciais dos casos (numeração CNJ do TRF3,
`.4.03.`) e grava em casos.trf3 um resumo:

    {"processo": "0000001-14.2015.4.03.9999", "ordem": 60, "total": 944,
     "orgao": "Gab. 37 Des. Fed. Nelson Porfirio", "turma": "10ª Turma",
     "grau": 2, "prioridade": "S", "fase_desde": "2026-04-07",
     "consultado_em": "2026-08-03"}

O app usa isso para mostrar ao cliente, com todas as letras, em que posição
da fila o processo dele está. "Ordem" é a posição na fila do gabinete
(conferido: máx(Ordem) == nº de processos do gabinete). Processos que não
aparecem no painel (não conclusos, sigilosos, baixados) ficam com ordem null
— o app não mostra nada nesses casos.

Roda diariamente no workflow trf3-ordem.yml (a carga do painel é diária).
Exige env SUPABASE_URL e SUPABASE_SERVICE_KEY. Proxy/CA opcionais:
HTTPS_PROXY é respeitado pelo urllib; CA_BUNDLE aponta um cacert extra.
"""
import datetime, json, gzip, os, re, ssl, sys, time, urllib.request

# identificação do painel público (do link app.powerbi.com/view?r=...)
PBI_BASE = "https://wabi-brazil-south-d-primary-api.analysis.windows.net"
PBI_KEY = "2eccc31f-d9e8-4fc0-9194-376da1fe5064"
PBI_DATASET = "6cf087cc-299c-4951-ba72-e6b2cc02bb43"
PBI_MODEL = 196733

RE_TRF3 = re.compile(r"(?<!\d)(\d{7})-?(\d{2})\.?(\d{4})\.?4\.?03\.?(\d{4})(?!\d)")
LOTE = 100          # processos por consulta


def canonico(texto):
    """Extrai e normaliza um nº CNJ do TRF3 ('.4.03.') para o formato do painel."""
    m = RE_TRF3.search(texto or "")
    if not m:
        return None
    n, dv, ano, org = m.groups()
    return f"{n}-{dv}.{ano}.4.03.{org}"


def _ctx():
    return ssl.create_default_context(cafile=os.environ.get("CA_BUNDLE") or None)


def _pbi(caminho, corpo=None):
    h = {"X-PowerBI-ResourceKey": PBI_KEY, "Accept": "application/json",
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


def _consultar(query, top=1000):
    corpo = {"version": "1.0.0", "queries": [{
        "Query": {"Commands": [{"SemanticQueryDataShapeCommand": {
            "Query": query,
            "Binding": {"Primary": {"Groupings": [{"Projections":
                            list(range(len(query["Select"])))}]},
                        "DataReduction": {"DataVolume": 3,
                                          "Primary": {"Top": {"Count": top}}},
                        "Version": 1}}}]},
        "QueryId": "", "ApplicationContext": {"DatasetId": PBI_DATASET}}],
        "cancelQueries": [], "modelId": PBI_MODEL}
    d = _pbi("/public/reports/querydata?synchronous=true", corpo)
    return d["results"][0]["result"]["data"]


def decode_dsr(data):
    """Achata o DSR do Power BI em linhas [v0, v1, ...] na ordem do Select.

    Cada linha traz só os valores que mudaram: o bitmask R diz quais colunas
    repetem a linha anterior; índices inteiros em colunas com dicionário (DN)
    apontam para ValueDicts.
    """
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
                    bruta.append(anterior[i])
                else:
                    bruta.append(C[ci] if ci < len(C) else None)
                    ci += 1
            anterior = bruta
            linha = []
            for i, col in enumerate(schema):
                v = bruta[i]
                dn = col.get("DN")
                if dn is not None and isinstance(v, int):
                    vd = dicts.get(dn, [])
                    v = vd[v] if v < len(vd) else None
                linha.append(v)
            linhas.append(linha)
    return linhas


def _data_ms(ms):
    if not isinstance(ms, (int, float)):
        return None
    return datetime.datetime.utcfromtimestamp(ms / 1000).date().isoformat()


def consultar_processos(numeros):
    """Consulta um lote de números CNJ; devolve {numero: dados} dos achados."""
    q = {"Version": 2,
         "From": [{"Name": "d", "Entity": "DADOS", "Type": 0},
                  {"Name": "s", "Entity": "D_SERVENTIA", "Type": 0},
                  {"Name": "j", "Entity": "D_SERVENTIA_ORGAO_JULGAD", "Type": 0}],
         "Select": [_col("d", "PROCESSO", "p"), _col("d", "Ordem", "o"),
                    _col("s", "DES_ORGAO_RESUMI", "org"),
                    _col("j", "DES_ORGAO_RESUMI", "turma"),
                    _col("d", "IDE_GRAU", "grau"), _col("d", "SIN_PRIORI", "pri"),
                    _col("d", "DAT_FASE", "df")],
         "Where": [{"Condition": {"In": {
             "Expressions": [{"Column": {"Expression": {"SourceRef": {"Source": "d"}},
                              "Property": "PROCESSO"}}],
             "Values": [[{"Literal": {"Value": f"'{n}'"}}] for n in numeros]}}}]}
    achados = {}
    for p, ordem, org, turma, grau, pri, df in decode_dsr(_consultar(q, top=len(numeros) * 4)):
        if p and p not in achados:          # dedupe: 1ª linha vale
            achados[p] = {"ordem": ordem, "orgao": org, "turma": turma,
                          "grau": grau, "prioridade": pri,
                          "fase_desde": _data_ms(df)}
    return achados


def totais_por_gabinete():
    """{gabinete: nº de processos na fila} — uma consulta só, agrupada."""
    q = {"Version": 2,
         "From": [{"Name": "d", "Entity": "DADOS", "Type": 0},
                  {"Name": "s", "Entity": "D_SERVENTIA", "Type": 0}],
         "Select": [_col("s", "DES_ORGAO_RESUMI", "org"),
                    {"Aggregation": {"Expression": {"Column":
                        {"Expression": {"SourceRef": {"Source": "d"}},
                         "Property": "PROCESSO"}}, "Function": 2}, "Name": "n"}]}
    return {org: n for org, n in decode_dsr(_consultar(q, top=5000)) if org}


MAX_HISTORICO = 24          # ~1 ano de amostras semanais
MIN_DIAS_PROJECAO = 14      # abaixo disso o ruído do dia a dia domina


def novo_historico(anterior, hoje_iso, ordem):
    """Acrescenta a amostra de hoje ao histórico de posições do processo.

    Uma amostra por dia (regravar no mesmo dia substitui). Guarda as últimas
    MAX_HISTORICO — é o que permite medir o ritmo real da fila.
    """
    hist = [h for h in (anterior or [])
            if isinstance(h, dict) and h.get("data") and h.get("data") != hoje_iso
            and isinstance(h.get("ordem"), int)]
    hist.sort(key=lambda h: h["data"])
    if isinstance(ordem, int):
        hist.append({"data": hoje_iso, "ordem": ordem})
    return hist[-MAX_HISTORICO:]


def projecao(historico):
    """Ritmo observado da fila -> previsão ESTIMADA de julgamento.

    Compara a primeira e a última amostra: quantas posições o processo
    andou por dia. Só projeta com base suficiente (>= 14 dias) e fila
    andando para frente — nada de estimativa em cima de ruído.
    """
    hist = sorted([h for h in (historico or []) if h.get("data")],
                  key=lambda h: h["data"])
    if len(hist) < 2:
        return None
    prim, ult = hist[0], hist[-1]
    d0 = datetime.date.fromisoformat(prim["data"])
    d1 = datetime.date.fromisoformat(ult["data"])
    dias = (d1 - d0).days
    avanco = prim["ordem"] - ult["ordem"]        # posições que subiu na fila
    if dias < MIN_DIAS_PROJECAO or avanco <= 0:
        return None
    ritmo_dia = avanco / dias
    faltam = int(round(ult["ordem"] / ritmo_dia))
    return {"ritmo_mes": int(round(ritmo_dia * 30)),
            "dias_restantes": faltam,
            "previsao": (d1 + datetime.timedelta(days=faltam)).isoformat(),
            "base_dias": dias, "amostras": len(hist)}


MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
         "agosto", "setembro", "outubro", "novembro", "dezembro"]


def frase_projecao(t):
    """Frase da estimativa — sempre marcada como estimativa, nunca como data."""
    p = t.get("projecao")
    if not p:
        return ""
    d = datetime.date.fromisoformat(p["previsao"])
    return (f"Nos últimos {p['base_dias']} dias o processo subiu na fila a um "
            f"ritmo de cerca de {p['ritmo_mes']} posições por mês. Mantido esse "
            f"ritmo, a previsão ESTIMADA de julgamento fica em torno de "
            f"{MESES[d.month - 1]} de {d.year}. Trata-se de estimativa feita a "
            f"partir do painel público do TRF3, e não de data designada pelo "
            f"tribunal.")


def frase_cliente(t):
    """Texto pronto para mandar ao cliente, com todas as letras."""
    pos = f"a posição {t['ordem']}"
    total = f" de uma fila de {t['total']} processos" if t.get("total") else ""
    orgao = t.get("orgao") or "o gabinete responsável"
    turma = f" ({t['turma']})" if t.get("turma") else ""
    pri = " O processo tramita com prioridade." if t.get("prioridade") == "S" else ""
    desde = (f" Está concluso para julgamento desde "
             f"{t['fase_desde'][8:10]}/{t['fase_desde'][5:7]}/{t['fase_desde'][0:4]}."
             if t.get("fase_desde") else "")
    data = (f"{t['consultado_em'][8:10]}/{t['consultado_em'][5:7]}/{t['consultado_em'][0:4]}"
            if t.get("consultado_em") else "")
    return (f"O processo nº {t['processo']} aguarda julgamento no TRF3 e hoje ocupa "
            f"{pos}{total} na ordem de julgamento do órgão responsável — "
            f"{orgao}{turma}.{desde}{pri} "
            f"Fonte: painel público de estatísticas do TRF3 (consulta de {data}).")


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
                         "&fase=neq.encerrado&select=id,processo,trf3") or []
    alvo = {}                       # numero canonico -> [caso_ids]
    antes = {}                      # caso_id -> histórico já gravado
    for k in casos:
        n = canonico(k["processo"])
        if n:
            alvo.setdefault(n, []).append(k["id"])
            antes[k["id"]] = ((k.get("trf3") or {}).get("historico")) or []
    if not alvo:
        print("nenhum caso com processo do TRF3.")
        return
    print(f"processos do TRF3 nos casos ativos: {len(alvo)}")

    totais = totais_por_gabinete()
    numeros = sorted(alvo)
    achados = {}
    for i in range(0, len(numeros), LOTE):
        achados.update(consultar_processos(numeros[i:i + LOTE]))

    na_fila = fora = projetados = 0
    for n, ids in alvo.items():
        base = achados.get(n)
        if base:
            base = {"processo": n, **base, "total": totais.get(base.get("orgao")),
                    "consultado_em": hoje}
            na_fila += 1
        else:                       # não consta no painel: limpa, sem inventar
            base = {"processo": n, "ordem": None, "consultado_em": hoje}
            fora += 1
        for cid in ids:
            # o histórico é por caso (cada um guarda a série que já tinha)
            hist = novo_historico(antes.get(cid), hoje, base.get("ordem"))
            t = {**base, "historico": hist}
            p = projecao(hist)
            if p:
                t["projecao"] = p
                projetados += 1
            _rest("PATCH", f"/rest/v1/casos?id=eq.{cid}", {"trf3": t},
                  prefer="return=minimal")
    print(f"na fila de julgamento: {na_fila} · fora do painel: {fora} "
          f"· com previsão estimada: {projetados}")


if __name__ == "__main__":
    main()
