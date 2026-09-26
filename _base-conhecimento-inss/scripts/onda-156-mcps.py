# scripts/onda-156-mcps.py
# Onda 156 (26/09/2026). Leitura dos MCPs normas, trf3 e acervo por todas as skills e por 36 agentes.
# Idempotente. Roda na raiz do plugin. Faz os itens 3.1, 2.1, 2.3, 3.3 e a troca do nome morto, e confere ao final.
import re, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent

BLOCO_SKILL = """## MCPs da casa

Antes de redigir, consulte os três servidores locais do plugin, nesta ordem. Os três localizam e não conferem, e nenhum autoriza a marca [CONFERIDO].

Legislação. Todo dispositivo citado nesta skill se transcreve do MCP `normas`, por `obter_artigo` no identificador da norma e no número do artigo (exemplo, `lei-8213-1991` e `57`), lendo o campo `texto` e a última ocorrência de cada parágrafo. Para tese de direito adquirido, `redacao_na_data`, que responde por ano. A citação em peça exige a `fonte_oficial` que a resposta devolve. Detalhe em `base-legislacao-fontes-primarias`.

Jurisprudência do TRF3 e das Turmas Recursais. Localize pelo MCP `trf3`, com `buscar_acordaos_trf3` (consulta, `polo_recorrente`, `resultado`, `orgao_julgador` e datas) e `obter_acordao_trf3` no id devolvido. `resultado` e `polo_recorrente` são inferidos. O achado nasce [NÃO CONFIRMADO] e só entra na peça depois de aberto no portal do TRF3, na forma de `pesquisa-jurisprudencia-chrome`. TNU e CRPS ficam no MCP `iurisprudencia`.

Acervo do escritório. Consulte pelo MCP `acervo` o que o escritório já sustentou neste tema. Comece por `buscar_tese_acervo` com os termos centrais desta skill e, achando trecho útil, leia o argumento inteiro com `obter_trecho_acervo`. Para saber em que peças um precedente já foi usado, chame `precedentes_do_acervo` e leia o campo `corte` da resposta, porque o mesmo número de Tema existe em mais de uma corte. Detalhe em `base-acervo-escritorio`.

**Vedação.** O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova, conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o arquivo de origem não é."""

BLOCO_AGENTE = """## MCPs da casa

Você alcança os servidores locais `normas`, `trf3` e `acervo` do plugin. Use-os antes de WebSearch e de WebFetch. Os três localizam e não conferem, e nenhum autoriza a marca [CONFERIDO].

Dispositivo legal se lê por `obter_artigo` no `normas`, com o identificador da norma e o número do artigo, no campo `texto`, e vale a última ocorrência de cada parágrafo. Redação de outra época se lê por `redacao_na_data`, que responde por ano. Acórdão do TRF3 e das Turmas Recursais se localiza por `buscar_acordaos_trf3` e se lê por `obter_acordao_trf3`, lembrando que `resultado` e `polo_recorrente` são inferidos. O que o escritório já sustentou se lê por `buscar_tese_acervo`, `obter_trecho_acervo` e `precedentes_do_acervo`, sem reaproveitar texto de um cliente em peça de outro. TNU e CRPS ficam no servidor `iurisprudencia`, quando disponível.

No parecer, todo achado de MCP sai marcado [NÃO CONFIRMADO] com o id devolvido pelo servidor, para a sessão principal conferir na fonte oficial. Achado de MCP nunca sobe a [CONFERIDO] dentro do agente.
"""

LINHA_TOOLS = "tools: [Read, Grep, Glob, Bash, WebSearch, WebFetch]\n"
INICIO_ANTIGO = "## Acervo do escritório"
FIM_ANTIGO = "arquivo de origem não é."

def agentes_alvo():
    for p in sorted((RAIZ / "agents").glob("*.md")):
        if not p.stem.startswith("medico-"):
            yield p

def main():
    trocadas = 0
    for skill in sorted((RAIZ / "skills").glob("*/SKILL.md")):
        t = skill.read_text(encoding="utf-8")
        if "## MCPs da casa" in t:
            continue
        i = t.find(INICIO_ANTIGO)
        if i < 0:
            continue
        j = t.find(FIM_ANTIGO, i)
        assert j > i, f"bloco sem fim em {skill}"
        j += len(FIM_ANTIGO)
        skill.write_text(t[:i] + BLOCO_SKILL + t[j:], encoding="utf-8")
        trocadas += 1

    liberados = 0
    for p in agentes_alvo():
        t = p.read_text(encoding="utf-8")
        if p.stem not in ("black-team", "triagem-caso") and LINHA_TOOLS in t:
            t = t.replace(LINHA_TOOLS, "", 1)
            liberados += 1
        if "## MCPs da casa" not in t:
            t = t.rstrip("\n") + "\n\n" + BLOCO_AGENTE
        p.write_text(t, encoding="utf-8")

    for f in list((RAIZ / "skills").rglob("*.md")) + list((RAIZ / "agents").glob("*.md")):
        t = f.read_text(encoding="utf-8")
        n = t.replace("[NÃO CONFERIDO]", "[NÃO CONFIRMADO]").replace("`mcp__workspace__web_fetch`", "`WebFetch`")
        if n != t:
            f.write_text(n, encoding="utf-8")

    # conferência
    com_bloco = sum("## MCPs da casa" in s.read_text(encoding="utf-8") for s in (RAIZ / "skills").glob("*/SKILL.md"))
    antigos = sum(INICIO_ANTIGO in s.read_text(encoding="utf-8") for s in (RAIZ / "skills").glob("*/SKILL.md"))
    presos = [p.stem for p in (RAIZ / "agents").glob("*.md") if LINHA_TOOLS in p.read_text(encoding="utf-8")]
    mortos = [str(f) for f in RAIZ.rglob("*.md") if "mcp__workspace__web_fetch" in f.read_text(encoding="utf-8")]
    print(f"skills com bloco novo {com_bloco}, trocadas agora {trocadas}, com bloco antigo {antigos}")
    print(f"agentes liberados agora {liberados}, ainda com tools fechado {presos}")
    print(f"nome morto restante {mortos}")
    assert antigos == 0 and all(s.startswith("medico-") for s in presos) and not mortos, "conferência falhou"

if __name__ == "__main__":
    main()
