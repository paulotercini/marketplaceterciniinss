# /// script
# requires-python = ">=3.11"
# dependencies = ["mcp>=2"]
# ///
"""Servidor MCP da base normativa previdenciária. Só lê o banco local.

    uv run servidor.py

O corpus de origem em C:\\Users\\VAIO\\INSS\\base-legislacao nunca é alterado por aqui. Para
recarregar o banco, `python ingestor.py`.
"""
from mcp.server.mcpserver import MCPServer

import banco, ingestor, verificacao

mcp = MCPServer("normas", instructions=(
    "Legislação previdenciária brasileira em base local: CF/88 e ADCT, EC 20, 103 e 136, LC 142, "
    "Leis 8.212 e 8.213, LOAS, CPC, Lei 10.259, Lei 13.146, Decretos 3.048, 2.172, 53.831 e "
    "83.080, IN 128/2022 e as Portarias DIRBEN e MPS. Comece por visao_geral_normas, que traz o "
    "identificador de cada norma, a idade do texto e o que ficou de fora. Busque antes de obter. "
    "O texto foi baixado do Planalto e dos portais oficiais em 31/05/2026 e toda resposta traz "
    "data_download e idade_dias. A redação VIGENTE é inferida, é a última versão não revogada da "
    "pilha do texto compilado. O histórico tem granularidade de ANO, e o ano é o da norma "
    "alteradora, não o início da vigência. IN 128 e Portarias 990 a 996 são fotografia "
    "consolidada e não têm histórico interno. A busca ignora acentuação, aceita aspas para "
    "expressão exata e -palavra para excluir. Enunciados do CRPS não estão aqui, ficam no MCP de "
    "jurisprudência. Citação em peça exige conferência na fonte_oficial."))


def _con():
    # ponytail: na primeira execução o banco é montado a partir do corpus que veio junto, em
    # série e sem trava. É um usuário por instalação; havendo concorrência, põe lockfile.
    if not (banco.DADOS / "normas.db").exists():
        if not banco.CORPUS.exists():
            raise RuntimeError(
                f"Base não carregada e corpus não encontrado em {banco.CORPUS}. Aponte "
                f"NORMAS_CORPUS para a pasta dos .md e rode `python ingestor.py`.")
        ingestor.ingerir(banco.abrir())
    return banco.abrir(leitura=True)


@mcp.tool()
def visao_geral_normas() -> dict:
    """Catálogo das normas na base, com o identificador que as outras ferramentas pedem, quantos
    artigos vigentes cada uma tem, a data do download e a idade do texto em dias. Traz também os
    arquivos que ficaram de fora e por quê, o comportamento previsto de cada norma difícil e os
    avisos de metodologia."""
    return banco.visao_geral(_con())


@mcp.tool()
def buscar_normas(consulta: str = "", norma: str = "", tipo: str = "", parte: str = "",
                  so_vigente: bool = True, pagina: int = 1) -> dict:
    """Busca textual em todo o corpus, dez por página. Ignora acentuação, aceita aspas para
    expressão exata e -palavra para excluir. norma é o identificador da visão geral, por exemplo
    lei-8213-1991 ou in-128-2022. tipo: lei | lei-complementar | decreto | constituicao | emenda |
    in | portaria. parte separa corpo permanente de ADCT e de anexo: principal | adct | anexo.
    so_vigente=False inclui as redações anteriores e as revogadas. O cabeçalho hierárquico também
    é indexado, então uma busca pode casar pelo nome do Capítulo."""
    return banco.buscar(_con(), consulta, pagina, norma=norma, tipo=tipo, parte=parte,
                        so_vigente=so_vigente)


@mcp.tool()
def obter_artigo(norma: str, artigo: str, parte: str = "", versao: int = 0,
                 historico: bool = False) -> dict:
    """Texto do artigo, na redação vigente. artigo aceita '86', 'art. 86' ou '21-A'. O mesmo
    número pode existir em mais de uma parte da norma, e a resposta lista quais. versao pede uma
    redação específica da pilha, numerada de 1 até total_versoes. historico=True devolve a pilha
    inteira, da redação mais antiga para a mais nova, cada uma com o marcador literal e a norma
    alteradora. Artigo revogado e nunca reeditado volta sem versão vigente, dizendo isso. A
    resposta traz os parágrafos, incisos e alíneas do artigo já separados por rótulo."""
    return banco.obter(_con(), norma, artigo, parte, versao, historico)


@mcp.tool()
def redacao_na_data(norma: str, artigo: str, data: str, parte: str = "") -> dict:
    """Redação do artigo num momento dado. A granularidade é ANUAL, e a resposta declara isso:
    92,7% dos marcadores do texto compilado trazem só o ano da norma alteradora, e esse ano é o
    da norma que alterou, não o início da vigência, que difere por vacatio, por medida provisória
    com vigência encerrada e por efeito retroativo. Para data exata, confira a norma alteradora
    na fonte. data aceita AAAA-MM-DD ou só o ano."""
    return banco.na_data(_con(), norma, artigo, data, parte)


@mcp.tool()
def verificar_atualizacao(norma: str = "") -> dict:
    """Confronta o texto local com a fonte oficial e grava a impressão digital do que a fonte
    devolveu, para a próxima conferência acusar mudança. Sem norma, verifica todas, o que leva
    tempo. Estados: primeira_leitura, igual, mudou, nao_localizado, sem_fonte e exige_navegador.
    Este último é o caso do Planalto nesta máquina, que não responde a cliente HTTP comum: a
    resposta traz a URL e o que conferir à mão, e nunca reporta a norma como inexistente. O
    cliente não é disfarçado e nenhum bloqueio é contornado."""
    return verificacao.conferir_todas(banco.abrir(), norma)


if __name__ == "__main__":
    mcp.run()
