# /// script
# requires-python = ">=3.11"
# dependencies = ["mcp>=2"]
# ///
"""MCP do acervo do escritorio. Responde pelo que o ESCRITORIO ja escreveu.

    uv run servidor.py

Fachada fina. Toda a logica esta em banco.py, para ser testavel sem o SDK.
"""

from mcp.server.mcpserver import MCPServer

import banco

mcp = MCPServer("acervo", instructions=(
    "Acervo de pecas e modelos do escritorio Paulo Roberto Tercini Filho, em base LOCAL "
    "construida a partir dos Modelos Ouro 2.0, do Acervo de Modelos e das pecas "
    "PROTOCOLADAS, que sao os PDF assinados pelo escritorio guardados nas pastas de "
    "cliente. Responde 'como ja sustentamos X' devolvendo o TRECHO argumentativo e a "
    "peca de origem. Rascunho NAO entra, so o que foi protocolado e o modelo, porque "
    "o rascunho em regra foi corrigido antes de ir aos autos. "
    "VEDACAO. Esta base existe para o advogado LER o que ja sustentou. Reaproveitamento "
    "automatico de texto de um cliente em peca de outro e VEDADO, e o trecho devolvido e "
    "ponto de partida para redacao nova, conferida contra os autos. "
    "O trecho e anonimizado na ingestao, entao nome, CPF, numero de beneficio e CID nao "
    "aparecem, e no lugar deles ha marcadores como [NOME] e [CPF]. O ARQUIVO de origem nao "
    "e anonimizado, e quem o abrir vera o dado do cliente. "
    "Comece por visao_geral_acervo. Busque antes de obter, porque o id do trecho sai da "
    "busca. A busca ignora acentuacao, aceita aspas para expressao exata e -palavra para "
    "excluir. A unidade de busca e o PARAGRAFO, entao use obter_trecho_acervo para ler o "
    "argumento com os paragrafos vizinhos. "
    "Este MCP NAO tem jurisprudencia. Quando um trecho citar um precedente, a referencia "
    "vem em precedentes_citados, e o inteiro teor esta nos MCPs trf3 e iurisprudencia. "
    "A articulacao entre as bases e a remissao, nunca a copia. "
    "O campo resultado so existe onde foi anotado a mao, e em regra e nulo."))


def _con():
    if not (banco.DADOS / "acervo.db").exists():
        raise RuntimeError(f"Base ainda nao indexada em {banco.DADOS}. Rode o coletor.py antes.")
    return banco.abrir(leitura=True)


@mcp.tool()
def visao_geral_acervo() -> dict:
    """O que o acervo do escritorio cobre. Primeira chamada de qualquer sessao.

    Devolve quantas pecas e trechos existem, a distribuicao por origem, por tipo de peca
    e por beneficio, o periodo coberto e os avisos de metodologia.
    """
    return banco.visao_geral(_con())


@mcp.tool()
def buscar_tese_acervo(consulta: str = "", tipo_peca: str = "", beneficio: str = "",
                       rito: str = "", origem: str = "", resultado: str = "",
                       data_inicial: str = "", data_final: str = "",
                       pagina: int = 1) -> dict:
    """Trechos argumentativos do acervo que casam com a consulta.

    consulta: aspas para expressao exata, -palavra para excluir, espaco e E implicito.
    origem: protocolado (peca efetivamente protocolada, em PDF) | modelo_ouro |
      acervo | vault | exportado.
    tipo_peca: inicial | recurso | contrarrazoes | embargos | agravo | apelacao |
      recurso_especial | replica | manifestacao | quesitos | cumprimento |
      mandado_seguranca | parecer | requerimento | procuracao | pedido_medico.
    beneficio: aposentadoria_especial | aposentadoria_pcd | bpc_loas | auxilio_acidente |
      auxilio_reclusao | incapacidade | pensao_morte | rural | salario_maternidade |
      professor | aposentadoria_idade | aposentadoria_tempo | revisao.
    rito: jef | trf3 | tjsp | crps | administrativo | superior.
    Datas AAAA-MM-DD, tiradas do nome do arquivo. Dez trechos por pagina.
    """
    return banco.buscar(_con(), consulta, pagina=pagina, tipo_peca=tipo_peca,
                        beneficio=beneficio, rito=rito, origem=origem, resultado=resultado,
                        data_inicial=data_inicial, data_final=data_final)


@mcp.tool()
def obter_trecho_acervo(id: int, contexto: int = 2) -> dict:
    """O trecho com os paragrafos vizinhos, para ler o argumento inteiro.

    O id sai de buscar_tese_acervo. contexto e quantos paragrafos antes e depois.
    """
    return banco.obter(_con(), id, contexto)


@mcp.tool()
def listar_pecas_acervo(beneficio: str = "", tipo_peca: str = "", origem: str = "",
                        rito: str = "", resultado: str = "") -> dict:
    """As pecas do acervo pelo metadado, para achar o modelo certo antes de escrever."""
    return banco.listar_pecas(_con(), beneficio=beneficio, tipo_peca=tipo_peca,
                              origem=origem, rito=rito, resultado=resultado)


@mcp.tool()
def precedentes_do_acervo(referencia: str) -> dict:
    """Em que pecas o escritorio ja citou este precedente, e em que trecho.

    referencia aceita parte do nome, como "Tema 694", "Sumula 9" ou "Enunciado 13".
    Devolve a remissao e o trecho da peca, nunca o texto do precedente, que vive nos
    MCPs trf3 e iurisprudencia.
    """
    return banco.por_precedente(_con(), referencia)


@mcp.tool()
def caminho_da_peca_acervo(trecho_id: int) -> dict:
    """O caminho de VERDADE do arquivo de origem, para o advogado abrir a peca.

    As demais ferramentas devolvem o caminho e o nome do arquivo mascarados, porque o
    nome do cliente costuma estar ali. Esta devolve o caminho real, e por isso e um
    pedido separado e deliberado. O arquivo de origem nao e anonimizado.
    """
    return banco.caminho_real(_con(), trecho_id)


if __name__ == "__main__":
    mcp.run()
