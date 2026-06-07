"""
Rotina diária de monitoramento do DOU para advocacia previdenciária.
Executa varredura, classifica por regras e cria tarefa no Microsoft To Do.
"""

import datetime
import os
import pathlib
import re
import urllib.parse
import urllib.request

import graph_client as gc

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

FERIADOS_NACIONAIS = {
    # Formato MM-DD — feriados fixos
    "01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25",
}


# ---------------------------------------------------------------------------
# Utilitários de data
# ---------------------------------------------------------------------------

def _easter(year):
    a = year % 19
    b, c = divmod(year, 100)
    d, e = divmod(b, 4)
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = divmod(c, 4)
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = (h + l - 7 * m + 114) % 31 + 1
    return datetime.date(year, month, day)


def feriados_moveis(year):
    easter = _easter(year)
    return {
        easter - datetime.timedelta(days=2),   # Sexta-feira Santa
        easter,                                 # Páscoa
        easter + datetime.timedelta(days=60),   # Corpus Christi
    }


def eh_dia_util(d: datetime.date) -> bool:
    if d.weekday() >= 5:
        return False
    if f"{d.month:02d}-{d.day:02d}" in FERIADOS_NACIONAIS:
        return False
    if d in feriados_moveis(d.year):
        return False
    return True


def ultimo_dia_util(referencia: datetime.date) -> datetime.date:
    d = referencia
    while not eh_dia_util(d):
        d -= datetime.timedelta(days=1)
    return d


# ---------------------------------------------------------------------------
# Acesso ao DOU
# ---------------------------------------------------------------------------

def _fetch(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="replace")


def buscar_edicao(data: datetime.date) -> str:
    data_fmt = data.strftime("%d-%m-%Y")
    return _fetch(f"https://www.in.gov.br/leiturajornal?secao=dou1&data={data_fmt}")


def verificar_disponibilidade(html: str, data: datetime.date) -> bool:
    data_str = data.strftime("%d-%m-%Y")
    # Se o HTML é muito pequeno, não há edição para essa data
    if len(html) < 200_000:
        return False
    return True


def extrair_materias_json(html: str) -> list[dict]:
    pattern = r'\{(?:[^{}]|\{[^{}]*\})*"editionNumber"\s*:\s*"\d+"(?:[^{}]|\{[^{}]*\})*\}'
    items = []
    for raw in re.findall(pattern, html):
        item = {}
        for field in ["title", "pubDate", "numberPage", "artType", "urlTitle", "content", "pubName"]:
            m = re.search(rf'"{field}"\s*:\s*"((?:[^"\\]|\\.)*)"', raw)
            if m:
                item[field] = m.group(1).replace("\\n", "\n").replace('\\"', '"').replace("\\/", "/")
        if item.get("title") and item.get("content"):
            items.append(item)
    return items


def filtrar_previdenciarios(items: list[dict]) -> list[dict]:
    relevantes = [
        "previdência", "previdencia", "inss", "rgps", "benefício", "beneficio",
        "seguridade", "aposentadoria", "pensão", "pensao", "auxílio", "auxilio",
        "bpc", "loas", "mps", "pres/inss", "crps", "regime geral",
        "perícia médica", "previdenciário", "previdenciaria", "instrução normativa inss",
        "portaria inss", "portaria mps", "ec 103", "lei 8.213", "decreto 3.048",
        "salário-maternidade", "auxílio-doença", "pensão por morte", "ppf", "pmf",
        "acordo internacional previdenciário", "acumulação de benefícios",
    ]
    descartar_orgaos = [
        "siape", "magistério superior", "analista judiciário", "técnico judiciário",
        "stj", "trf", "trt", "universidade federal", "instituto federal",
        "decipex", "rpps", "militar", "mgi",
    ]
    resultado = []
    for item in items:
        texto = (item.get("content", "") + " " + item.get("title", "")).lower()
        if not any(kw in texto for kw in relevantes):
            continue
        if any(kw in texto for kw in descartar_orgaos):
            continue
        resultado.append(item)
    return resultado


def buscar_secoes(data: datetime.date) -> list[dict]:
    todas = []
    for secao in ["dou2", "dou3"]:
        try:
            data_fmt = data.strftime("%d-%m-%Y")
            html = _fetch(f"https://www.in.gov.br/leiturajornal?secao={secao}&data={data_fmt}")
            items = extrair_materias_json(html)
            filtrados = filtrar_previdenciarios(items)
            # Para seções 2 e 3, aplica filtro mais restrito: apenas INSS/MPS/CRPS
            orgaos_alvo = ["inss", "mps", "crps", "previc", "ministério da previdência"]
            filtrados = [
                i for i in filtrados
                if any(o in (i.get("content", "") + i.get("title", "")).lower() for o in orgaos_alvo)
            ]
            todas.extend(filtrados)
        except Exception as e:
            print(f"Aviso: erro ao buscar seção {secao}: {e}")
    return todas


# ---------------------------------------------------------------------------
# Classificação por regras (sem IA externa)
# ---------------------------------------------------------------------------

_TIPOS_NORMATIVOS = [
    "instrução normativa", "portaria", "decreto", "resolução", "resolucao",
    "medida provisória", "medida provisoria", "lei complementar",
    "emenda constitucional", "circular",
]
_VERBOS_URGENTES = [
    "suspende", "suspensão", "suspensao", "cessa", "cessação", "cessacao",
    "cancela", "cancelamento", "revoga", "revogação", "revogacao",
    "altera", "alteração", "alteracao", "veda", "proíbe", "proibição",
    "prazo", "obrigatório", "obrigatorio",
]
_VERBOS_IMPORTANTES = [
    "institui", "estabelece", "regulamenta", "aprova", "autoriza",
    "define", "determina", "dispõe", "dispoe", "cria", "fixa", "homologa",
]
_TITULOS_DESCARTAR = [
    "nomeação", "nomeacao", "exoneração", "exoneracao", "designação", "designacao",
    "licença sem remuneração", "extrato de contrato", "extrato do contrato",
    "dispensa de licitação", "dispensa de licitacao", "termo de rescisão",
]


def classificar_por_regras(items: list[dict], data: datetime.date) -> dict:
    if not items:
        return {"alertas_urgentes": [], "importantes": [], "informativos": [], "descartados": []}

    alertas_urgentes = []
    importantes = []
    informativos = []
    descartados = []

    for item in items:
        url = f"https://www.in.gov.br/web/dou/-/{item.get('urlTitle', '')}"
        titulo = item.get("title", "")
        conteudo = item.get("content", "")
        art_type = item.get("artType", "")
        texto = (titulo + " " + conteudo + " " + art_type).lower()
        titulo_lower = titulo.lower()

        if any(kw in titulo_lower for kw in _TITULOS_DESCARTAR):
            descartados.append({"titulo": titulo, "motivo": "Ato de pessoal ou administrativo"})
            continue

        is_normativo = any(kw in texto for kw in _TIPOS_NORMATIVOS)
        has_urgente = any(kw in texto for kw in _VERBOS_URGENTES)

        if is_normativo or has_urgente:
            alertas_urgentes.append({
                "titulo": titulo,
                "orgao": art_type,
                "link": url,
                "pagina": item.get("numberPage", ""),
                "sintese": conteudo[:600].strip(),
                "risco": "Verificar impacto em benefícios ativos",
                "mitigacao_adm": "Analisar integralmente o ato normativo",
                "mitigacao_judicial": "Verificar jurisprudência aplicável",
                "skill_sugerida": "",
            })
        elif any(kw in texto for kw in _VERBOS_IMPORTANTES):
            importantes.append({
                "titulo": titulo,
                "orgao": art_type,
                "link": url,
                "pagina": item.get("numberPage", ""),
                "sintese": conteudo[:600].strip(),
                "skill_sugerida": "",
            })
        else:
            informativos.append({
                "titulo": titulo,
                "orgao": art_type,
                "link": url,
                "sintese_curta": conteudo[:250].strip(),
            })

    return {
        "alertas_urgentes": alertas_urgentes,
        "importantes": importantes,
        "informativos": informativos,
        "descartados": descartados,
    }


# ---------------------------------------------------------------------------
# Criação da tarefa no To Do
# ---------------------------------------------------------------------------

def criar_tarefa_todo(analise: dict, data: datetime.date, list_id: str):
    n_alertas = len(analise.get("alertas_urgentes", []))
    n_importantes = len(analise.get("importantes", []))
    data_fmt = data.strftime("%d/%m/%Y")

    if n_alertas == 0 and n_importantes == 0:
        titulo = f"DOU {data_fmt} - sem matérias previdenciárias relevantes"
        body = (
            f"Edição analisada: DOU de {data_fmt}.\n"
            f"Resultado: nenhum alerta urgente ou matéria importante identificada.\n"
            f"Informativos: {len(analise.get('informativos', []))} item(s). Veja o relatório completo nos artefatos do GitHub Actions."
        )
        return gc.create_task(
            list_id=list_id,
            title=titulo,
            body_content=body,
            content_type="text",
            importance="low",
        )

    titulo = f"DOU {data_fmt} - {n_alertas} alerta(s) urgente(s) e {n_importantes} importante(s)"

    linhas = [f"DOU {data_fmt} — Relatório de monitoramento previdenciário\n"]
    for a in analise.get("alertas_urgentes", []):
        linhas.append(f"[ALERTA URGENTE] {a['titulo']}")
        linhas.append(f"Órgão: {a.get('orgao', '')}")
        linhas.append(f"Link: {a.get('link', '')}")
        linhas.append(f"Síntese: {a.get('sintese', '')}")
        linhas.append(f"Risco: {a.get('risco', '')}")
        linhas.append(f"Mitigação: {a.get('mitigacao_adm', '')}")
        linhas.append("")
    for i in analise.get("importantes", []):
        linhas.append(f"[IMPORTANTE] {i['titulo']}")
        linhas.append(f"Órgão: {i.get('orgao', '')}")
        linhas.append(f"Link: {i.get('link', '')}")
        linhas.append(f"Síntese: {i.get('sintese', '')}")
        linhas.append("")

    body = "\n".join(linhas)

    hoje = data.strftime("%Y-%m-%dT23:59:00")
    lembrete = data.strftime("%Y-%m-%dT09:00:00")

    return gc.create_task(
        list_id=list_id,
        title=titulo,
        body_content=body,
        content_type="text",
        importance="high",
        due_date_iso=hoje,
        time_zone="America/Sao_Paulo",
    )


# ---------------------------------------------------------------------------
# Relatório em texto
# ---------------------------------------------------------------------------

def gerar_relatorio(analise: dict, data: datetime.date, data_alvo: datetime.date) -> str:
    linhas = [
        f"RELATÓRIO DOU — {data.strftime('%d/%m/%Y')}",
        f"Data alvo da rotina: {data_alvo.strftime('%d/%m/%Y')} | Edição efetiva analisada: {data.strftime('%d/%m/%Y')}",
        "=" * 70,
        "",
    ]

    for a in analise.get("alertas_urgentes", []):
        linhas += [
            "ALERTA URGENTE",
            f"Título: {a['titulo']}",
            f"Órgão: {a.get('orgao', '')}",
            f"Link: {a.get('link', '')}",
            f"Síntese: {a.get('sintese', '')}",
            f"Risco: {a.get('risco', '')}",
            f"Mitigação administrativa: {a.get('mitigacao_adm', '')}",
            f"Mitigação judicial: {a.get('mitigacao_judicial', '')}",
            f"Skill sugerida: {a.get('skill_sugerida', '')}",
            "",
        ]

    for i in analise.get("importantes", []):
        linhas += [
            "IMPORTANTE",
            f"Título: {i['titulo']}",
            f"Órgão: {i.get('orgao', '')}",
            f"Link: {i.get('link', '')}",
            f"Síntese: {i.get('sintese', '')}",
            f"Skill sugerida: {i.get('skill_sugerida', '')}",
            "",
        ]

    for inf in analise.get("informativos", []):
        linhas.append(f"INFORMATIVO: {inf['titulo']} — {inf.get('sintese_curta', '')}")

    linhas += [
        "",
        f"RESUMO: {len(analise.get('alertas_urgentes', []))} alerta(s) urgente(s), "
        f"{len(analise.get('importantes', []))} importante(s), "
        f"{len(analise.get('informativos', []))} informativo(s), "
        f"{len(analise.get('descartados', []))} descartado(s).",
    ]
    return "\n".join(linhas)


# ---------------------------------------------------------------------------
# Ponto de entrada
# ---------------------------------------------------------------------------

def main():
    # Determina data alvo
    data_env = os.environ.get("DATA_ALVO", "").strip()
    if data_env:
        data_alvo = datetime.datetime.strptime(data_env, "%d-%m-%Y").date()
    else:
        data_alvo = datetime.date.today()

    data = ultimo_dia_util(data_alvo)
    print(f"Data alvo: {data_alvo} | Edição a analisar: {data}")

    # Busca edição
    print("Buscando edição DOU Seção 1...")
    html_s1 = buscar_edicao(data)

    if not verificar_disponibilidade(html_s1, data):
        # Tenta dia anterior
        data = ultimo_dia_util(data - datetime.timedelta(days=1))
        print(f"Sem conteúdo. Tentando {data}...")
        html_s1 = buscar_edicao(data)

    # Extrai e filtra matérias
    items_s1 = filtrar_previdenciarios(extrair_materias_json(html_s1))
    print(f"Matérias Seção 1 após filtro: {len(items_s1)}")

    items_s23 = buscar_secoes(data)
    print(f"Matérias Seções 2+3 após filtro: {len(items_s23)}")

    todos_items = items_s1 + items_s23
    print(f"Total para análise: {len(todos_items)}")

    # Classifica por regras
    print("Classificando matérias...")
    analise = classificar_por_regras(todos_items, data)

    n_a = len(analise.get("alertas_urgentes", []))
    n_i = len(analise.get("importantes", []))
    print(f"Resultado: {n_a} alerta(s) urgente(s), {n_i} importante(s)")

    # Cria tarefa no To Do
    print("Criando tarefa no Microsoft To Do...")
    listas = gc.list_lists()
    dou_list = next((l for l in listas if l["displayName"].strip() == "DOU"), None)
    if not dou_list:
        dou_list = next((l for l in listas if "atualizações" in l["displayName"].lower()), None)
    if not dou_list:
        dou_list = next(l for l in listas if l["displayName"] == "Tarefas")

    tarefa = criar_tarefa_todo(analise, data, dou_list["id"])
    print(f"Tarefa criada: {tarefa.get('title', '')} (ID: {tarefa.get('id', '')[:30]}...)")

    # Gera relatório em arquivo
    relatorio = gerar_relatorio(analise, data, data_alvo)
    nome_arquivo = f"relatorio_dou_{data.strftime('%Y%m%d')}.txt"
    pathlib.Path(nome_arquivo).write_text(relatorio, encoding="utf-8")
    print(f"Relatório salvo em: {nome_arquivo}")
    print(relatorio)


if __name__ == "__main__":
    main()
