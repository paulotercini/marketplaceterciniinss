"""F189 · O rito de cada caso, escolhido pelos dados do próprio CRM.

A trilha do caso (app.html, TRILHAS) tem um rito por fase: no INSS,
incapacidade, auxílio-acidente, BPC ou aposentadorias; no Conselho, Junta ou
Câmara; no Judicial, JEF de incapacidade, JEF de aposentadorias, Vara
Federal, mandado de segurança, acidentário ou competência delegada no TJSP.
O app escolhia só pela espécie, vazia na maioria das fichas, e errava.

Esta rotina lê os sinais que o banco já tem, do mais seguro ao menos seguro,
e grava em casos.conducao o rito sugerido por fase, com o motivo e a
confiança:

    {"v": 1, "ritos": {"judicial": {"r": "jef_inc", "c": "alta",
                                    "por": "JEF (4.03.63) e espécie B31"}}}

1. a escolha manual na trilha (casos.trilha) prevalece sempre: o app a lê
   antes desta coluna, e esta rotina nunca escreve em casos.trilha;
2. a classe processual (mandado de segurança);
3. o número CNJ (4.03.63 é JEF, 4.03.61 é Vara Federal, 8.26 é TJSP);
4. a espécie e, na falta dela, o benefício escrito;
5. os eventos já coletados (recurso especial no e-Recursos ou no PAT leva à
   Câmara; perícia designada no PJe indica incapacidade no JEF);
6. no TJSP, o benefício: acidentário, competência delegada ou a confirmar.

Confiança "baixa" é o rito provável sem sinal firme: o app mostra o motivo e
pede confirmação em um clique. Só regrava o caso quando o resultado muda.

Roda no crm-sync.yml (a cada 10 min) e no consultas-publicas.yml (depois do
DataJud). Exige SUPABASE_URL e SUPABASE_SERVICE_KEY. O log só tem números:
o repositório é público.
"""
import json, os, re, sys, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from crm.datajud import RE_CNJ, _rest  # noqa: E402

INCAP = {"B31", "B32", "B91", "B92"}
ACID_ESP = {"B91", "B92", "B93", "B94"}
AUX_ACID = {"B94", "B36"}
ASSIST = {"B87", "B88"}

RE_BEN = [  # benefício escrito à mão, quando a espécie está vazia
    (re.compile(r"acident", re.I), "acid"),
    (re.compile(r"incapacidade|aux[íi]lio[- ]doen|invalidez", re.I), "inc"),
    (re.compile(r"\bbpc\b|loas|assistencial|amparo", re.I), "bpc"),
    (re.compile(r"defici[êe]ncia", re.I), "pcd"),
    (re.compile(r"aposentad|pens[ãa]o|reclus|maternidade|revis|tempo de contrib", re.I), "apos"),
]


def _ben(k):
    t = k.get("beneficio") or ""
    for rx, g in RE_BEN:
        if rx.search(t):
            return g
    return None


def _cnj(k):
    m = RE_CNJ.search(k.get("processo") or "")
    if not m:
        return None
    n, dv, ano, j, trib, org = m.groups()
    return j, trib, org


def _classe(k):
    return " ".join(filter(None, [k.get("classe_judicial"),
                                  ((k.get("datajud") or {}).get("classe")
                                   if isinstance(k.get("datajud"), dict) else None)]))


def rito_inss(k):
    esp, sub = k.get("especie") or "", k.get("subespecie") or ""
    if esp in INCAP:
        return "inss_inc", "alta", f"espécie {esp}"
    if esp in AUX_ACID:
        return "inss_b94", "alta", f"espécie {esp}"
    if esp in ASSIST or ".PCD" in sub:
        return "inss_bpc", "alta", f"espécie {sub or esp}"
    if esp:
        return "inss_apos", "alta", f"espécie {esp}"
    g = _ben(k)
    por = "benefício escrito, sem espécie"
    return {"acid": ("inss_b94", "media", por), "inc": ("inss_inc", "media", por),
            "bpc": ("inss_bpc", "media", por), "pcd": ("inss_bpc", "media", por),
            "apos": ("inss_apos", "media", por)}.get(
        g, ("inss_apos", "baixa", "sem espécie nem benefício registrados"))


def rito_conselho(k, camara_pat=False):
    if k.get("re_protocolado_em"):
        return "crps_camara", "alta", "recurso especial protocolado"
    blocos = json.dumps(k.get("crps") or [], ensure_ascii=False)
    if re.search(r"C[âa]mara de Julgamento|Recurso Especial", blocos, re.I):
        return "crps_camara", "alta", "recurso especial ou Câmara no e-Recursos"
    if camara_pat:
        return "crps_camara", "media", "recurso especial no PAT"
    if k.get("ro_protocolado_em") or k.get("crps") or k.get("crps_nups"):
        return "crps_junta", "alta", "recurso ordinário no e-Recursos"
    return "crps_junta", "media", "fase Conselho sem NUP registrado"


def _por_especie_jef(k, base, pericia):
    esp = k.get("especie") or ""
    if esp in INCAP | ASSIST | AUX_ACID:
        return "jef_inc", "alta", f"{base} e espécie {esp}"
    if esp:
        return "jef_apos", "alta", f"{base} e espécie {esp}"
    g = _ben(k)
    if g in ("inc", "bpc", "acid", "pcd"):
        return "jef_inc", "media", f"{base} e benefício escrito"
    if g == "apos":
        return "jef_apos", "media", f"{base} e benefício escrito"
    if pericia:
        return "jef_inc", "media", f"{base} e perícia designada no PJe"
    return "jef_apos", "baixa", f"{base}, sem espécie nem benefício"


def rito_judicial(k, pericia=False):
    if re.search(r"^MS|Mandado de Seguran", _classe(k), re.I):
        return "ms", "alta", "classe mandado de segurança"
    p = _cnj(k)
    if not p:
        r, _, por = _por_especie_jef(k, "sem número de processo", pericia)
        return r, "baixa", por
    j, trib, org = p
    if (j, trib) == ("8", "26"):
        esp = k.get("especie") or ""
        if esp in ACID_ESP or _ben(k) == "acid":
            return "acid", "alta", "TJSP (8.26) e benefício acidentário"
        if esp in INCAP:
            return "acid", "media", f"TJSP (8.26) e espécie {esp}, a confirmar se acidentária"
        if esp or _ben(k):
            return "delegada", "media", "TJSP (8.26) e benefício comum"
        return "acid", "baixa", "TJSP (8.26) sem benefício registrado"
    if (j, trib) == ("4", "03") and org.startswith("63"):
        return _por_especie_jef(k, "JEF (4.03.63)", pericia)
    if (j, trib) == ("4", "03") and org.startswith("61"):
        return "vara", "alta", "Vara Federal (4.03.61)"
    r, _, por = _por_especie_jef(k, f"processo {j}.{trib}.{org}", pericia)
    return r, "baixa", por


def classificar(k, pericia=False, camara_pat=False):
    """O rito sugerido por fase. Escritório e petição ficam com o app."""
    fase = k.get("fase")
    ritos = {}
    if fase in ("inss", "conselho", "judicial", "pagamento") or k.get("protocolos") or k.get("der"):
        ritos["inss"] = rito_inss(k)
    if fase == "conselho" or k.get("crps") or k.get("crps_nups") or k.get("ro_protocolado_em"):
        ritos["conselho"] = rito_conselho(k, camara_pat)
    if fase in ("judicial", "pagamento") or k.get("processo"):
        ritos["judicial"] = rito_judicial(k, pericia)
    return {"v": 1, "ritos": {f: {"r": r, "c": c, "por": por}
                              for f, (r, c, por) in ritos.items()}}


def _todas(caminho):
    out, ini = [], 0
    while True:
        sep = "&" if "?" in caminho else "?"
        lote = _rest("GET", f"{caminho}{sep}limit=1000&offset={ini}") or []
        out += lote
        if len(lote) < 1000:
            return out
        ini += 1000


def main():
    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_SERVICE_KEY"):
        sys.exit("Defina SUPABASE_URL e SUPABASE_SERVICE_KEY.")
    casos = _todas("/rest/v1/casos?fase=neq.encerrado&select=id,fase,especie,subespecie,"
                   "beneficio,processo,classe_judicial,datajud,protocolos,der,crps,crps_nups,"
                   "ro_protocolado_em,re_protocolado_em,conducao&order=id")
    filtro = urllib.parse.quote("(texto.ilike.*perícia agendada*,texto.ilike.*perícia designada*,"
                                "texto.ilike.*nomeado perito*,texto.ilike.*nomeação de perito*)")
    pericia = {a["caso_id"] for a in _todas(f"/rest/v1/andamentos?origem=eq.pje&or={filtro}"
                                            "&select=caso_id")}
    # recurso especial no PAT: a tarefa "Recurso Especial ou Incidente" do protocolo
    re_pat = set()
    for c in _todas("/rest/v1/coletas?fonte=eq.pat&select=lista:dados->lista&order=criado_em"):
        for t in c.get("lista") or []:
            if str(t.get("nomeServico") or "").lower().startswith("recurso especial"):
                re_pat.add(re.sub(r"\D", "", str(t.get("protocolo") or "")))
    mudou, conf = 0, {}
    for k in casos:
        prots = {re.sub(r"\D", "", str(p)) for p in (k.get("protocolos") or [])}
        novo = classificar(k, k["id"] in pericia, bool(prots & re_pat))
        for v in novo["ritos"].values():
            conf[v["c"]] = conf.get(v["c"], 0) + 1
        if novo == k.get("conducao") or (not novo["ritos"] and not k.get("conducao")):
            continue
        _rest("PATCH", f"/rest/v1/casos?id=eq.{k['id']}", {"conducao": novo},
              prefer="return=minimal")
        mudou += 1
    print(f"{len(casos)} casos lidos, {mudou} regravados; confiança: {conf}")


if __name__ == "__main__":
    main()
