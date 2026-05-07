"""
Busca publicações no DOU usando curl (User-Agent de browser).
O WebFetch é bloqueado pelo in.gov.br; o curl com UA correto retorna 200.

Uso:
  python3 dou_busca.py "07/05/2026" "INSS"
  python3 dou_busca.py "07/05/2026"          # busca todos os termos previdenciários padrão
"""

import json
import re
import subprocess
import sys
from datetime import date

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

TERMOS_PREVID = [
    "Previdência Social",
    "INSS",
    "CRPS",
    "Conselho de Recursos",
    "RGPS",
    "benefício previdenciário",
    "benefício assistencial",
    "BPC",
    "LOAS",
    "aposentadoria",
    "salário-maternidade",
    "pensão por morte",
    "auxílio-doença",
    "auxílio-acidente",
    "biometria",
    "PPP",
    "aposentadoria especial",
    "EC 103",
    "Lei 8.213",
    "Decreto 3.048",
    "Decreto 10.410",
    "tema 1102",
    "tema 1124",
    "tema 1117",
    "PMF",
    "perícia médica federal",
    "Mercosul previdenciário",
    "acordo internacional previdenciário",
    "acumulação de benefícios",
]

# Atos administrativos de pessoal sem repercussão material — descartar automaticamente
DESCARTE_TITULOS = [
    "posse", "nomeação", "exoneração", "designação", "substituição",
    "licença para tratamento", "licença capacitação", "extrato de contrato",
    "extrato de apostilamento", "extrato de inexigibilidade",
    "extrato de dispensa", "extrato de aditivo", "extrato de rescisão",
    "termo aditivo", "dispensa de licitação", "alienação de imóvel",
    "dação em pagamento", "concessão de diária", "gratificação interna",
    "balanco patrimonial", "balanço patrimonial", "aviso de licitação",
    "aviso de pregão", "resultado de licitação", "resultado de pregão",
    "edital de convocação", "edital de retificação",
    "declaração de vencedor", "ata de registro de preços",
    "concessão de benefício rppu", "aposentadoria rppu", "pensão rppu",
]

# Tipos de ato que raramente têm repercussão material previdenciária
DESCARTE_TIPOS = [
    "Extrato de Contrato", "Extrato de Apostilamento", "Extrato de Aditivo",
    "Extrato de Inexigibilidade", "Aviso de Licitação-Pregão",
    "Balanço Patrimonial", "Ata",
]

# Órgãos emissores que indicam matéria previdenciária real
ORGAOS_PREVID = [
    "Ministério da Previdência Social",
    "Instituto Nacional do Seguro Social",
    "Conselho de Recursos da Previdência Social",
    "INSS",
    "MPS",
    "CRPS",
    "Ministério do Desenvolvimento Social",
    "Ministério da Gestão",
]


def _curl_dou(termo: str, data_br: str, secao: str = "DOU1", start: int = 0) -> str:
    """Faz a requisição ao DOU via curl e retorna o HTML."""
    from urllib.parse import quote
    d = data_br  # formato DD/MM/AAAA
    url = (
        f"https://www.in.gov.br/consulta/-/buscar/dou"
        f"?q={quote(termo)}&s=todos"
        f"&exactDate=personalizado"
        f"&publishFrom={quote(d)}&publishTo={quote(d)}"
        f"&secao={secao}&delta=100"
        + (f"&start={start}" if start else "")
    )
    result = subprocess.run(
        ["curl", "-s", "--max-time", "30", url,
         "-H", f"User-Agent: {UA}",
         "-H", "Accept-Language: pt-BR,pt;q=0.9"],
        capture_output=True, text=True, timeout=35,
    )
    if result.returncode != 0:
        raise RuntimeError(f"curl falhou com código {result.returncode}: {result.stderr}")
    return result.stdout


def _parse_items(html: str) -> list[dict]:
    """Extrai itens do JSON embutido no HTML do DOU."""
    # O DOU serializa os resultados como array JS dentro da página
    # Cada item tem: urlTitle, title, pubDate, editionNumber, artType, hierarchyStr, content, pubName, numberPage
    items = []
    pattern = (
        r'"urlTitle":"([^"]+)"'
        r'.*?"numberPage":"([^"]*)"'
        r'.*?"title":"(.*?)"'
        r'.*?"pubDate":"([^"]+)"'
        r'.*?"editionNumber":"([^"]*)"'
        r'.*?"content":"(.*?)"'
        r'.*?"hierarchyLevelSize":\d+'
        r'.*?"artType":"([^"]*)"'
        r'.*?"hierarchyStr":"([^"]*)"'
    )
    for m in re.finditer(pattern, html, re.S):
        url_title, page, raw_title, pub_date, edition, raw_content, art_type, hierarchy = m.groups()
        title = re.sub(r"<[^>]+>|\\u[0-9a-fA-F]{4}|\\n|\\t", "", raw_title).strip()
        content_preview = re.sub(r"<[^>]+>|\\u[0-9a-fA-F]{4}|\\n|\\t", "", raw_content)[:300].strip()
        items.append({
            "title": title,
            "url": f"https://www.in.gov.br/web/dou/-/{url_title}",
            "date": pub_date,
            "edition": edition,
            "page": page,
            "art_type": art_type,
            "hierarchy": hierarchy,
            "content_preview": content_preview,
        })
    return items


def _is_relevant(item: dict) -> bool:
    """Filtra por órgão emissor previdenciário e descarta atos de pessoal."""
    title_lower = item["title"].lower()
    hierarchy_lower = item["hierarchy"].lower()
    # Descartar por tipo de ato
    if item.get("art_type") in DESCARTE_TIPOS:
        return False
    # Descartar atos de pessoal/administrativos pelo título
    for descarte in DESCARTE_TITULOS:
        if descarte in title_lower:
            return False
    # Descartar portarias de DGP/RPPU (atos de pessoal de servidores civis)
    if "diretoria de gestão de pessoas" in hierarchy_lower:
        return False
    if "divisão de concessão e manutenção de benefícios do rppu" in hierarchy_lower:
        return False
    # Descartar editais de notificação em processo administrativo de cobrança
    if "edital de notificação" in title_lower:
        return False
    # Verificar se o órgão é previdenciário
    for orgao in ORGAOS_PREVID:
        if orgao.lower() in hierarchy_lower:
            return True
    return False


def buscar_data(data_br: str, termos: list[str] | None = None, secoes: list[str] | None = None) -> list[dict]:
    """Busca o DOU pela data dada e retorna lista de publicações relevantes (sem duplicatas)."""
    if termos is None:
        termos = TERMOS_PREVID
    if secoes is None:
        secoes = ["DOU1", "DOU2", "DOU3"]

    vistas: set[str] = set()
    relevantes: list[dict] = []

    for secao in secoes:
        for termo in termos:
            start = 0
            while True:
                try:
                    html = _curl_dou(termo, data_br, secao, start)
                except RuntimeError as e:
                    print(f"[AVISO] Falha ao buscar '{termo}' em {secao}: {e}", file=sys.stderr)
                    break
                items = _parse_items(html)
                if not items:
                    break
                for item in items:
                    if item["url"] in vistas:
                        continue
                    vistas.add(item["url"])
                    if _is_relevant(item):
                        item["termo_busca"] = termo
                        item["secao"] = secao
                        relevantes.append(item)
                # Paginação: se retornou 100, há mais
                if len(items) < 100:
                    break
                start += 100

    return relevantes


def main():
    data = sys.argv[1] if len(sys.argv) > 1 else date.today().strftime("%d/%m/%Y")
    termos = sys.argv[2:] if len(sys.argv) > 2 else None
    print(f"Buscando DOU de {data}...", file=sys.stderr)
    resultados = buscar_data(data, termos)
    print(json.dumps(resultados, ensure_ascii=False, indent=2))
    print(f"\n[Total de matérias previdenciárias relevantes: {len(resultados)}]", file=sys.stderr)


if __name__ == "__main__":
    main()
