# /// script
# requires-python = ">=3.11"
# dependencies = ["mcp>=2"]
# ///
"""Servidor MCP de STF e STJ. Só lê o banco local, nunca toca na fonte.

    uv run servidor.py
"""
from mcp.server.mcpserver import MCPServer

import banco

mcp = MCPServer("superiores", instructions=(
    "Temas e decisões previdenciárias do STF e do STJ em base local, coletada de fontes oficiais. STF, os temas de "
    "repercussão geral com a tese literal e os acórdãos dos leading cases previdenciários e das ADI, ADC e ADPF citadas "
    "nas skills do escritório. STJ, os temas repetitivos, IAC, PUIL, SIRDR e controvérsias com a tese firmada, a "
    "Jurisprudência em Teses do previdenciário, os espelhos de acórdãos e as decisões e acórdãos desde 2021. Comece por "
    "visao_geral_superiores. Para saber o que o tribunal fixou, busque o tema (buscar_temas, obter_tema). Para ver como "
    "ele aplica o tema, busque as decisões. Busque antes de obter, porque o id sai da busca. A busca ignora acentuação, "
    "aceita aspas para expressão exata e -palavra para excluir. Situação e tese são as da data da coleta, e citação em "
    "peça exige conferência no link_oficial."))


def _con():
    if not (banco.DADOS / "superiores.db").exists():
        raise RuntimeError(f"Base ainda não coletada em {banco.DADOS}. Rode o coletor.py antes.")
    return banco.abrir(leitura=True)


@mcp.tool()
def visao_geral_superiores() -> dict:
    """Contagem de temas e decisões por tribunal e fonte, período coberto, cobertura das íntegras do STJ por ano,
    data da última coleta e avisos de metodologia."""
    return banco.visao_geral(_con())


@mcp.tool()
def buscar_temas(consulta: str = "", tribunal: str = "", tipo: str = "", situacao: str = "", numero: int | None = None,
                 previdenciario: bool | None = None, pagina: int = 1) -> dict:
    """Busca nos temas, dez por página. tribunal: STF | STJ. tipo: repercussao_geral | tema | controversia | iac |
    puil | sirdr | jurisprudencia_em_teses. situacao por parte do texto (Trânsito, Afetado, Sobrestado, Cancelado).
    previdenciario=true restringe ao recorte previdenciário e assistencial."""
    return banco.buscar_temas(_con(), consulta, tribunal, tipo, situacao, numero, previdenciario, pagina)


@mcp.tool()
def obter_tema(id: str = "", tribunal: str = "", numero: int | None = None, tipo: str = "") -> dict:
    """Tema completo, pelo id da busca ou por tribunal e numero (STF Tema 1102, STJ Tema 1124). Traz a tese
    literal, a questão, a situação, o leading case, o tema vinculado do outro tribunal, o link oficial e as decisões
    da base que o citam ou que são o leading case."""
    return banco.obter_tema(_con(), id or None, tribunal, numero, tipo)


@mcp.tool()
def buscar_decisoes_superiores(consulta: str = "", tribunal: str = "", fonte: str = "", tipo: str = "",
                               orgao_julgador: str = "", classe: str = "", relator: str = "", tema: str = "",
                               data_inicial: str = "", data_final: str = "", pagina: int = 1) -> dict:
    """Busca textual em acórdãos e decisões, dez por página. tribunal: STF | STJ. fonte: espelho | integra | djen |
    stf_acordao. tipo: acordao | decisao. classe pela sigla (REsp, AREsp, RE). tema pelo número citado. Datas
    AAAA-MM-DD, de julgamento. Íntegras e DJEN só têm data de publicação."""
    return banco.buscar_decisoes(_con(), consulta, tribunal, fonte, tipo, orgao_julgador, classe, relator, tema,
                                 data_inicial, data_final, pagina)


@mcp.tool()
def obter_decisao_superiores(id: str, max_caracteres: int = 40000) -> dict:
    """Inteiro teor pelo id devolvido na busca. 'truncado' avisa quando o texto passou de max_caracteres."""
    return banco.obter_decisao(_con(), id, max_caracteres)


if __name__ == "__main__":
    mcp.run()
