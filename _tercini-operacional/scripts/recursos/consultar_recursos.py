"""
Consulta automatizada de andamentos de recursos no e-Sisrec / CRPS.

COMO FUNCIONA
-------------
- Le AO VIVO os favoritos do navegador Comet (pasta "Recursos"). Voce nao
  precisa exportar nada: adicionou/removeu um favorito na pasta "Recursos",
  o script ja pega na proxima execucao.
- Usa um perfil de navegador PERSISTENTE para a automacao: voce faz login no
  gov.br UMA vez e a sessao fica salva (pasta .perfil_navegador) para as
  proximas execucoes.
- Visita a pagina de recurso de cada cliente e extrai situacao, andamentos e
  a DER (Data de Entrada do Requerimento).
- Salva o resultado em JSON, Excel e TXT (texto bruto p/ conferencia).

IMPORTANTE — SEGURANCA
----------------------
- O script NAO armazena, NAO digita e NAO conhece sua senha gov.br.
- VOCE faz o login manualmente na janela que abre. O script apenas reaproveita
  a sessao que VOCE autenticou, no SEU computador.
- O script so roda quando VOCE o executa. Nao fica em segundo plano.

PRE-REQUISITOS (rodar uma vez no terminal)
------------------------------------------
    pip install playwright openpyxl
    playwright install chromium

USO
---
    # le a pasta "Recursos" dos favoritos do Comet automaticamente:
    python consultar_recursos.py

    # apontar manualmente o arquivo Bookmarks (se a deteccao falhar):
    python consultar_recursos.py --bookmarks "/caminho/para/Bookmarks"

    # usar outra pasta de favoritos / outro tempo de espera:
    python consultar_recursos.py --pasta "Recursos" --espera 6

    # ainda aceita um HTML exportado, se preferir:
    python consultar_recursos.py --bookmarks favoritos.html

Na primeira execucao abre uma janela do navegador. Faca login no gov.br
(senha + 2FA). Quando o e-Sisrec carregar, volte ao terminal e tecle ENTER.
"""
import os
import re
import sys
import json
import time
import platform
import argparse
from pathlib import Path
from datetime import datetime

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("Falta o Playwright. Rode: pip install playwright && playwright install chromium")
    sys.exit(1)


PASTA_SCRIPT = Path(__file__).resolve().parent
PERFIL_NAVEGADOR = PASTA_SCRIPT / ".perfil_navegador"
PASTA_SAIDA = PASTA_SCRIPT / "saida"
PASTA_SAIDA.mkdir(exist_ok=True)

RE_DER = [
    re.compile(r"Data\s+de\s+Entrada\s+do\s+Requerimento[\s:]*(\d{2}/\d{2}/\d{4})", re.IGNORECASE),
    re.compile(r"\bDER\b[\s:\(\-]*(\d{2}/\d{2}/\d{4})", re.IGNORECASE),
    re.compile(r"Data\s+do\s+Requerimento[\s:]*(\d{2}/\d{2}/\d{4})", re.IGNORECASE),
    re.compile(r"Requerimento\s+em[\s:]*(\d{2}/\d{2}/\d{4})", re.IGNORECASE),
]
RE_SITUACAO = re.compile(r"Situa[çc][ãa]o[\s:]*([^\n]{3,80})", re.IGNORECASE)
RE_ULTIMO_EVENTO = re.compile(r"[ÚU]ltimo\s+evento[\s:]*([^\n]{3,120})", re.IGNORECASE)


# --------------------------------------------------------------------------
# Localizacao do arquivo de favoritos do Comet
# --------------------------------------------------------------------------
def candidatos_bookmarks_comet():
    """Devolve caminhos provaveis do arquivo Bookmarks do navegador Comet."""
    home = Path.home()
    sistema = platform.system()
    cand = []
    if sistema == "Windows":
        local = os.environ.get("LOCALAPPDATA", str(home / "AppData/Local"))
        base = Path(local)
        cand += [
            base / "Perplexity/Comet/User Data/Default/Bookmarks",
            base / "Comet/User Data/Default/Bookmarks",
        ]
    elif sistema == "Darwin":
        sup = home / "Library/Application Support"
        cand += [
            sup / "Comet/Default/Bookmarks",
            sup / "Perplexity/Comet/Default/Bookmarks",
            sup / "Comet/User Data/Default/Bookmarks",
        ]
    else:  # Linux
        cfg = home / ".config"
        cand += [
            cfg / "Comet/Default/Bookmarks",
            cfg / "Perplexity/Comet/Default/Bookmarks",
            cfg / "comet/Default/Bookmarks",
        ]
    return cand


def achar_bookmarks(caminho_informado):
    """Resolve o caminho do arquivo de favoritos a usar."""
    if caminho_informado:
        p = Path(caminho_informado).expanduser()
        if p.exists():
            return p
        print(f"[ERRO] Arquivo informado nao existe: {p}")
        sys.exit(1)
    for c in candidatos_bookmarks_comet():
        if c.exists():
            print(f"Favoritos do Comet encontrados em:\n  {c}\n")
            return c
    print("[ERRO] Nao encontrei o arquivo de favoritos do Comet automaticamente.")
    print("Procure o arquivo chamado 'Bookmarks' dentro da pasta de perfil do")
    print("Comet e rode novamente com:  --bookmarks \"/caminho/para/Bookmarks\"")
    print("\nCaminhos testados:")
    for c in candidatos_bookmarks_comet():
        print(f"  {c}")
    sys.exit(1)


# --------------------------------------------------------------------------
# Leitura dos favoritos
# --------------------------------------------------------------------------
def _coletar_urls(no, dentro_da_pasta):
    """Percorre recursivamente a arvore de favoritos do Chromium."""
    out = []
    tipo = no.get("type")
    if tipo == "folder":
        eh_alvo = dentro_da_pasta
        for filho in no.get("children", []):
            out += _coletar_urls(filho, eh_alvo)
    elif tipo == "url" and dentro_da_pasta:
        nome = no.get("name", "").strip()
        url = no.get("url", "").strip()
        if url.startswith("http"):
            out.append((nome, url))
    return out


def _achar_pasta(no, nome_pasta):
    """Encontra o no da pasta com o nome dado (busca recursiva)."""
    if no.get("type") == "folder":
        if no.get("name", "").strip().lower() == nome_pasta.strip().lower():
            return no
        for filho in no.get("children", []):
            achado = _achar_pasta(filho, nome_pasta)
            if achado:
                return achado
    return None


def parse_bookmarks_json(caminho, nome_pasta):
    """Le o arquivo Bookmarks (JSON do Chromium) e devolve [(nome, url)]."""
    dados = json.loads(Path(caminho).read_text(encoding="utf-8", errors="ignore"))
    roots = dados.get("roots", {})
    pasta = None
    for chave in ("bookmark_bar", "other", "synced"):
        raiz = roots.get(chave)
        if not raiz:
            continue
        pasta = _achar_pasta(raiz, nome_pasta)
        if pasta:
            break
    if not pasta:
        print(f"[ERRO] Pasta de favoritos '{nome_pasta}' nao encontrada no Comet.")
        sys.exit(1)
    return _coletar_urls(pasta, dentro_da_pasta=True)


def parse_bookmarks_html(caminho, nome_pasta):
    """Le um HTML de favoritos exportado (formato Netscape)."""
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        print("Para ler HTML instale: pip install beautifulsoup4")
        sys.exit(1)
    soup = BeautifulSoup(Path(caminho).read_text(encoding="utf-8", errors="ignore"),
                         "html.parser")
    alvo = None
    for h3 in soup.find_all("h3"):
        if nome_pasta.strip().lower() in h3.get_text(strip=True).lower():
            alvo = h3.find_next("dl")
            break
    ancoras = (alvo.find_all("a") if alvo else soup.find_all("a"))
    return [(a.get_text(strip=True), a.get("href", "").strip())
            for a in ancoras if a.get("href", "").startswith("http")]


def carregar_favoritos(caminho, nome_pasta):
    """Decide se le JSON (Bookmarks) ou HTML exportado."""
    p = Path(caminho)
    if p.suffix.lower() in (".html", ".htm"):
        return parse_bookmarks_html(p, nome_pasta)
    return parse_bookmarks_json(p, nome_pasta)


# --------------------------------------------------------------------------
# Extracao de dados da pagina
# --------------------------------------------------------------------------
def extrair_dados(texto):
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


# --------------------------------------------------------------------------
# Principal
# --------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="Consulta andamentos de recursos no e-Sisrec.")
    ap.add_argument("--bookmarks", default=None,
                    help="Caminho do arquivo Bookmarks do Comet ou de um HTML exportado. "
                         "Se omitido, detecta o Comet automaticamente.")
    ap.add_argument("--pasta", default="Recursos",
                    help="Nome da pasta de favoritos a varrer (padrao: Recursos)")
    ap.add_argument("--espera", type=float, default=5.0,
                    help="Segundos de espera apos carregar cada pagina (padrao 5)")
    args = ap.parse_args()

    arquivo = achar_bookmarks(args.bookmarks)
    favoritos = carregar_favoritos(arquivo, args.pasta)
    if not favoritos:
        print(f"Nenhum favorito na pasta '{args.pasta}'.")
        return
    print(f"{len(favoritos)} favoritos na pasta '{args.pasta}'.\n")

    resultados = []
    carimbo = datetime.now().strftime("%Y%m%d_%H%M%S")

    with sync_playwright() as p:
        contexto = p.chromium.launch_persistent_context(
            user_data_dir=str(PERFIL_NAVEGADOR),
            headless=False,
            viewport={"width": 1280, "height": 900},
            args=["--disable-blink-features=AutomationControlled"],
        )
        pagina = contexto.pages[0] if contexto.pages else contexto.new_page()

        pagina.goto("https://www.gov.br/", wait_until="domcontentloaded")
        print("=" * 70)
        print("LOGIN MANUAL")
        print("=" * 70)
        print("1. Na janela do navegador, faca login no gov.br (senha + 2FA).")
        print("2. Confirme que consegue acessar o e-Sisrec normalmente.")
        print("3. Volte aqui e pressione ENTER para iniciar a varredura.")
        print("   (Se a sessao ja estiver salva de antes, e so apertar ENTER.)")
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
                registro.update(der=der, situacao=situacao,
                                ultimo_evento=ultimo, status="ok")
                print(f"DER={der or '-'} | {situacao or '-'}")
            except Exception as e:
                registro["status"] = f"erro: {type(e).__name__}"
                print(f"ERRO: {type(e).__name__}")
            resultados.append(registro)

        contexto.close()

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
