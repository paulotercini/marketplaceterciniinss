"""
Consulta automatizada de andamentos de recursos no e-Sisrec / CRPS.

COMO FUNCIONA
-------------
- Usa um perfil de navegador PERSISTENTE: voce faz login no gov.br UMA unica
  vez e a sessao fica salva (na pasta .perfil_navegador) para as proximas
  execucoes — nao precisa logar de novo todo dia.
- Le um arquivo de FAVORITOS exportado do navegador (HTML). Cada favorito é a
  pagina de um cliente. O script visita cada pagina e extrai situacao,
  andamentos e a DER (Data de Entrada do Requerimento).
- Salva o resultado em JSON, Excel e em TXT (texto bruto de cada pagina, para
  conferencia / ajuste de extracao).

IMPORTANTE — SEGURANCA
----------------------
- O script NAO armazena, NAO digita e NAO conhece sua senha gov.br.
- VOCE faz o login manualmente na janela do navegador que abre. O script
  apenas reaproveita a sessao que VOCE autenticou, no SEU computador.
- Rode sempre na sua propria maquina.

PRE-REQUISITOS (rodar uma vez no terminal)
------------------------------------------
    pip install playwright openpyxl beautifulsoup4
    playwright install chromium

COMO EXPORTAR OS FAVORITOS
--------------------------
Chrome/Edge: Gerenciador de favoritos (Ctrl+Shift+O) > (tres pontos) >
"Exportar favoritos" > salva um arquivo .html.
Se os recursos estiverem numa pasta especifica de favoritos, pode usar a
opcao --pasta para filtrar so aquela pasta.

USO
---
    python consultar_recursos.py favoritos.html
    python consultar_recursos.py favoritos.html --pasta "Recursos"
    python consultar_recursos.py favoritos.html --pasta "Recursos" --espera 6

Na primeira execucao abre uma janela do Chrome. Faca login no gov.br
(senha + 2FA). Quando a pagina inicial do e-Sisrec carregar, volte ao
terminal e pressione ENTER. O script entao visita cada favorito.
"""
import sys
import re
import json
import time
import argparse
from pathlib import Path
from datetime import datetime

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("Falta a biblioteca beautifulsoup4. Rode: pip install beautifulsoup4")
    sys.exit(1)

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("Falta o Playwright. Rode: pip install playwright && playwright install chromium")
    sys.exit(1)


# --------------------------------------------------------------------------
# Configuracao
# --------------------------------------------------------------------------
PASTA_SCRIPT = Path(__file__).resolve().parent
PERFIL_NAVEGADOR = PASTA_SCRIPT / ".perfil_navegador"   # sessao persistente
PASTA_SAIDA = PASTA_SCRIPT / "saida"
PASTA_SAIDA.mkdir(exist_ok=True)

# Padroes para localizar a DER no texto da pagina
RE_DER = [
    re.compile(r"Data\s+de\s+Entrada\s+do\s+Requerimento[\s:]*(\d{2}/\d{2}/\d{4})", re.IGNORECASE),
    re.compile(r"\bDER\b[\s:\(\-]*(\d{2}/\d{2}/\d{4})", re.IGNORECASE),
    re.compile(r"Data\s+do\s+Requerimento[\s:]*(\d{2}/\d{2}/\d{4})", re.IGNORECASE),
    re.compile(r"Requerimento\s+em[\s:]*(\d{2}/\d{2}/\d{4})", re.IGNORECASE),
]
# Padroes para situacao / ultimo andamento
RE_SITUACAO = re.compile(r"Situa[çc][ãa]o[\s:]*([^\n]{3,80})", re.IGNORECASE)
RE_ULTIMO_EVENTO = re.compile(r"[ÚU]ltimo\s+evento[\s:]*([^\n]{3,120})", re.IGNORECASE)


def parse_favoritos(caminho_html: str, pasta_filtro: str | None):
    """Le o HTML de favoritos (formato Netscape) e devolve lista (nome, url).

    Se pasta_filtro for informada, retorna apenas os favoritos dentro da
    pasta de favoritos com aquele nome.
    """
    html = Path(caminho_html).read_text(encoding="utf-8", errors="ignore")
    soup = BeautifulSoup(html, "html.parser")

    favoritos = []

    if pasta_filtro:
        # Acha o <H3> com o nome da pasta e pega o <DL> irmao seguinte
        alvo = None
        for h3 in soup.find_all("h3"):
            if pasta_filtro.strip().lower() in h3.get_text(strip=True).lower():
                alvo = h3.find_next("dl")
                break
        if alvo is None:
            print(f"[AVISO] Pasta de favoritos '{pasta_filtro}' nao encontrada. "
                  f"Usando todos os favoritos.")
            ancoras = soup.find_all("a")
        else:
            ancoras = alvo.find_all("a")
    else:
        ancoras = soup.find_all("a")

    for a in ancoras:
        url = a.get("href", "").strip()
        nome = a.get_text(strip=True)
        if url.startswith("http"):
            favoritos.append((nome, url))
    return favoritos


def extrair_dados(texto: str):
    """Extrai DER, situacao e ultimo evento do texto bruto da pagina."""
    der = None
    for rx in RE_DER:
        m = rx.search(texto)
        if m:
            der = m.group(1)
            break
    situacao = None
    m = RE_SITUACAO.search(texto)
    if m:
        situacao = m.group(1).strip()
    ultimo = None
    m = RE_ULTIMO_EVENTO.search(texto)
    if m:
        ultimo = m.group(1).strip()
    return der, situacao, ultimo


def salvar_excel(resultados, caminho):
    try:
        from openpyxl import Workbook
    except ImportError:
        print("[AVISO] openpyxl nao instalado — pulando Excel. (pip install openpyxl)")
        return
    wb = Workbook()
    ws = wb.active
    ws.title = "Recursos"
    ws.append(["Cliente", "DER", "Situacao", "Ultimo evento", "URL", "Status consulta"])
    for r in resultados:
        ws.append([r["cliente"], r["der"] or "", r["situacao"] or "",
                   r["ultimo_evento"] or "", r["url"], r["status"]])
    wb.save(caminho)


def main():
    ap = argparse.ArgumentParser(description="Consulta andamentos de recursos no e-Sisrec.")
    ap.add_argument("favoritos", help="Arquivo HTML de favoritos exportado do navegador")
    ap.add_argument("--pasta", default=None,
                    help="Nome da pasta de favoritos a filtrar (opcional)")
    ap.add_argument("--espera", type=float, default=5.0,
                    help="Segundos de espera apos carregar cada pagina (padrao 5)")
    args = ap.parse_args()

    favoritos = parse_favoritos(args.favoritos, args.pasta)
    if not favoritos:
        print("Nenhum favorito encontrado. Verifique o arquivo / a pasta.")
        return
    print(f"{len(favoritos)} favoritos carregados.\n")

    resultados = []
    carimbo = datetime.now().strftime("%Y%m%d_%H%M%S")

    with sync_playwright() as p:
        # Contexto persistente: a sessao do gov.br fica salva entre execucoes
        contexto = p.chromium.launch_persistent_context(
            user_data_dir=str(PERFIL_NAVEGADOR),
            headless=False,                       # janela visivel para voce logar
            viewport={"width": 1280, "height": 900},
            args=["--disable-blink-features=AutomationControlled"],
        )
        pagina = contexto.pages[0] if contexto.pages else contexto.new_page()

        # Passo de login manual
        pagina.goto("https://www.gov.br/", wait_until="domcontentloaded")
        print("=" * 70)
        print("LOGIN MANUAL")
        print("=" * 70)
        print("1. Na janela do navegador, faca login no gov.br (senha + 2FA).")
        print("2. Confirme que consegue acessar o e-Sisrec normalmente.")
        print("3. Volte aqui e pressione ENTER para iniciar a varredura.")
        print("   (Nas proximas execucoes a sessao ja estara salva — pode so")
        print("    apertar ENTER se ainda estiver logado.)")
        input("\n>>> Pressione ENTER quando estiver logado... ")

        for i, (nome, url) in enumerate(favoritos, 1):
            print(f"[{i:3d}/{len(favoritos)}] {nome[:45]:<45} ", end="", flush=True)
            registro = {"cliente": nome, "url": url, "der": None,
                        "situacao": None, "ultimo_evento": None,
                        "status": "", "texto": ""}
            try:
                pagina.goto(url, wait_until="domcontentloaded", timeout=45000)
                try:
                    pagina.wait_for_load_state("networkidle", timeout=15000)
                except Exception:
                    pass
                time.sleep(args.espera)
                texto = pagina.evaluate("document.body.innerText")
                registro["texto"] = texto
                der, situacao, ultimo = extrair_dados(texto)
                registro["der"] = der
                registro["situacao"] = situacao
                registro["ultimo_evento"] = ultimo
                registro["status"] = "ok"
                print(f"DER={der or '-'} | {situacao or '-'}")
            except Exception as e:
                registro["status"] = f"erro: {type(e).__name__}"
                print(f"ERRO: {type(e).__name__}")
            resultados.append(registro)

        contexto.close()

    # Salvar resultados
    json_path = PASTA_SAIDA / f"recursos_{carimbo}.json"
    json_path.write_text(json.dumps(resultados, ensure_ascii=False, indent=2),
                         encoding="utf-8")

    txt_path = PASTA_SAIDA / f"recursos_textos_{carimbo}.txt"
    with txt_path.open("w", encoding="utf-8") as f:
        for r in resultados:
            f.write("=" * 78 + "\n")
            f.write(f"CLIENTE: {r['cliente']}\nURL: {r['url']}\n")
            f.write(f"DER: {r['der']} | SITUACAO: {r['situacao']}\n")
            f.write("-" * 78 + "\n")
            f.write((r["texto"] or "")[:4000] + "\n\n")

    xlsx_path = PASTA_SAIDA / f"recursos_{carimbo}.xlsx"
    salvar_excel(resultados, xlsx_path)

    ok = sum(1 for r in resultados if r["status"] == "ok")
    com_der = sum(1 for r in resultados if r["der"])
    print(f"\n{'='*70}")
    print(f"CONCLUIDO: {ok}/{len(resultados)} paginas lidas | {com_der} com DER detectada")
    print(f"JSON:  {json_path}")
    print(f"TXT:   {txt_path}   (texto bruto p/ conferencia)")
    print(f"EXCEL: {xlsx_path}")
    print(f"{'='*70}")


if __name__ == "__main__":
    main()
