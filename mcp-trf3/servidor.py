# /// script
# requires-python = ">=3.11"
# dependencies = ["mcp>=2"]
# ///
"""Servidor MCP da jurisprudência do TRF3. Só lê o banco local, nunca toca na fonte.

    uv run servidor.py
"""
from mcp.server.mcpserver import MCPServer

import banco

mcp = MCPServer("trf3", instructions=(
    "Jurisprudência previdenciária do TRF3 (7ª a 10ª Turmas e 3ª Seção) e das Turmas Recursais de SP e MS, "
    "em base local coletada da Jurisprudência Unificada do CJF. Sem monocráticas. Nas recursais o CJF entrega o "
    "texto SEM os caracteres acentuados ('contribuio', 'Seo Judiciria'), então busque ali por palavras sem acento "
    "no original, como ruido, PPP, EPI, LOAS. Comece por visao_geral_trf3. Busque antes de obter, porque o id "
    "sai da busca. A busca ignora acentuação, aceita aspas para expressão exata e -palavra para excluir. "
    "'provido' NÃO quer dizer favorável ao segurado, verifique polo_recorrente. O campo resultado é inferido."))


def _con():
    if not (banco.DADOS / "trf3.db").exists():
        raise RuntimeError(f"Base ainda não coletada em {banco.DADOS}. Rode o coletor.py antes.")
    return banco.abrir(leitura=True)


@mcp.tool()
def visao_geral_trf3() -> dict:
    """Total de documentos, período coberto, acervos, órgãos, data da última coleta e avisos de metodologia."""
    return banco.visao_geral(_con())


@mcp.tool()
def buscar_acordaos_trf3(consulta: str = "", acervo: str = "", classe_sigla: str = "", orgao_julgador: str = "",
                         relator: str = "", data_inicial: str = "", data_final: str = "", resultado: str = "",
                         polo_recorrente: str = "", pagina: int = 1) -> dict:
    """Busca textual, dez por página. acervo: trf3 | recursais. Datas AAAA-MM-DD, de julgamento.
    resultado: provido | parcial | negado | nao_conhecido | outro. polo_recorrente: inss | segurado | ambos."""
    return banco.buscar(_con(), consulta, pagina, acervo=acervo, classe_sigla=classe_sigla,
                        orgao_julgador=orgao_julgador, relator=relator, data_inicial=data_inicial,
                        data_final=data_final, resultado=resultado, polo_recorrente=polo_recorrente)


@mcp.tool()
def obter_acordao_trf3(id: str, max_caracteres: int = 40000) -> dict:
    """Inteiro teor pelo id devolvido na busca. 'truncado' avisa quando o texto passou de max_caracteres."""
    return banco.obter(_con(), id, max_caracteres)


@mcp.tool()
def perfil_relator_trf3(relator: str, consulta: str = "", data_inicial: str = "", data_final: str = "") -> dict:
    """Distribuição de resultados de um relator por polo recorrente, opcionalmente restrita a um tema."""
    return banco.perfil(_con(), "relator", relator, consulta, data_inicial=data_inicial, data_final=data_final)


@mcp.tool()
def perfil_orgao_trf3(orgao_julgador: str, consulta: str = "", data_inicial: str = "", data_final: str = "") -> dict:
    """Distribuição de resultados de uma Turma por polo recorrente, opcionalmente restrita a um tema."""
    return banco.perfil(_con(), "orgao_julgador", orgao_julgador, consulta,
                        data_inicial=data_inicial, data_final=data_final)


if __name__ == "__main__":
    mcp.run()
