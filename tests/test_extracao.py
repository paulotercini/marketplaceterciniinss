"""Regressão da extração de andamentos do portal.

Cada teste marcado [BUG] reproduz um defeito REAL já corrigido em produção —
se falhar, o defeito voltou. Rode com: python3 -m pytest tests/ -q
(puro: sem rede, sem tokens, sem tocar docs/portal/data)."""
import datetime
import sys, pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from portal_common import split_blocks, cpf_from_task, dn_from_items, derivar_hash
from build_portal_listas import (
    classify, headline, is_internal, build_timeline, pericia_evento,
    ALTA_CONFIANCA, REGRAS, status_line,
)
from build_portal_escritorio import infer_status


# ---------------------------------------------------------------- primitivas

def test_split_blocks_ordena_do_mais_novo():
    body = "01.01.2024 (P): antigo.\n\n15.06.2026 (A): novo.\n"
    blocks = split_blocks(body)
    assert [d.isoformat() for d, _ in blocks] == ["2026-06-15", "2024-01-01"]


def test_split_blocks_ignora_data_invalida():
    assert split_blocks("31.02.2026 (P): não existe.") == []


def test_cpf_do_titulo_e_do_checklist():
    assert cpf_from_task("Fulano de Tal #30210871830", []) == "30210871830"
    assert cpf_from_task("Fulano", [{"displayName": "302.108.718-30"}]) == "30210871830"
    assert cpf_from_task("Fulano #1234", []) is None


def test_derivar_hash_estavel():
    # o app.js deriva a MESMA chave; mudar isso quebra o login de todos os clientes
    assert derivar_hash("00000000000", "01011990", "salt", 1000) == \
           derivar_hash("00000000000", "01011990", "salt", 1000)
    assert len(derivar_hash("00000000000", "01011990", "salt", 1000)) == 32


# ------------------------------------------------------------------ classify

def test_bug_reclamacao_nao_e_acao_judicial():
    """[BUG] 'reclamação protocolada' casava a regra 'ação protocolada' por
    substring — cliente via 'Ação judicial protocolada' sem ação existir."""
    assert classify("reclamação protocolada.") == (None, None)
    assert classify("fiz reclamação na ouvidoria.") == (None, None)


def test_indeferido_nao_vira_deferido():
    tipo, _ = classify("benefício indeferido pelo inss.")
    assert tipo == "Indeferimento do INSS"


def test_recursos_especificos_antes_do_generico():
    assert classify("recurso especial interposto.")[0] == "Recurso Especial interposto"
    assert classify("recurso inominado protocolado.")[0] == "Recurso inominado interposto"
    assert classify("recurso protocolado.")[0] == "Recurso protocolado"


def test_tipos_de_regras_sao_exibiveis_ou_suprimidos_conscientemente():
    # todo tipo em REGRAS que NÃO está em ALTA_CONFIANCA é supressão deliberada
    suprimidos = {t for t, _, _ in REGRAS} - ALTA_CONFIANCA
    assert suprimidos == {"Manifestação no processo judicial"}


# ------------------------------------------------------------------ headline

def test_bug_headline_classifica_so_o_cabecalho():
    """[BUG] classificar o bloco inteiro fazia narrativa antiga ('indeferido'
    no meio do texto do sistema) virar evento na data errada."""
    body = ("02.01.2023 (A): Não houve alteração no recurso.\n"
            "Alteração da APS Responsável ... o pedido foi indeferido ...\n")
    assert build_timeline(body) == []


def test_headline_resolve_rotulo_para_linha_seguinte():
    texto = "\nÚltimo andamento:\nDistribuído ao Conselheiro Relator - Fulano\n"
    assert headline(texto).startswith("Distribuído ao Conselheiro")


def test_headline_remove_marcador_de_autor():
    assert headline("\nP): Recurso Especial interposto.\n") == "Recurso Especial interposto."


# --------------------------------------------------------------- is_internal

def test_bug_nao_vaza_nota_interna():
    """[BUG] instruções à equipe e itens sensíveis apareciam como andamento."""
    for h in [
        "Amanda, faz reclamação na ouvidoria em razão da demora",
        "Marcão, agenda a perícia judicial, por favor.",
        "agendar perícia até 09/09.",
        "ver resultado da perícia.",
        "senha inválida",
        "fazer reclamação na ouvidoria.",
        "sem alteração.",
        "em análise.",
        "idem.",
    ]:
        assert is_internal(h), h


def test_fato_ocorrido_nao_e_interno():
    for h in [
        "Recurso Especial interposto.",
        "Perícia médica agendada para o dia 12/06/2026 as 10:30h em Matão",
        "Aposentadoria Deferida (carta de concessão em anexo)",
    ]:
        assert not is_internal(h), h


# ------------------------------------------------------------ perícia

BASE = datetime.date(2026, 5, 30)


def test_pericia_agendada_com_data_hora_cidade():
    h = "perícia médica agendada para o dia 12/06/2026 as 10:30h em matão"
    bloco = "Perícia médica agendada para o dia 12/06/2026 as 10:30h em Matão."
    tipo, desc = pericia_evento(h, bloco, BASE)
    assert tipo == "Perícia médica agendada"
    assert "12/06/2026" in desc and "10:30" in desc and "Matão" in desc


def test_pericia_realizada_com_resultado():
    h = "a perícia médica não reconheceu a sua incapacidade para o trabalho"
    tipo, desc = pericia_evento(h, h, BASE)
    assert tipo == "Perícia médica realizada"
    assert "não reconhecida" in desc


def test_avaliacao_social_e_distinta():
    h = "avaliação social agendada para o dia 10/07 às 09h00"
    tipo, _ = pericia_evento(h, h, BASE)
    assert tipo == "Avaliação social agendada"


def test_imperativo_de_pericia_nao_vira_evento():
    # 'agendar perícia' é instrução interna; is_internal barra antes
    body = "01.06.2026 (P): Necessário agendar perícia.\n"
    assert build_timeline(body) == []


# ------------------------------------------------------- infer_status (Escritório)

def test_bug_rosangela_nota_recente_decide():
    """[BUG] gatilhos de notas ANTIGAS ('vai trazer', 'comprovante') marcavam
    'Aguardando documento do cliente' num caso cuja nota atual diz que a
    petição está pronta — o cliente via culpa que não era dele."""
    body = ("21.06.2026 (C): inicial concluída, pronto para distribuir. "
            "Falta só revisão/assinatura do Paulo.\n\n"
            "01.02.2025 (P): cliente irá trazer comprovante de endereço.\n")
    assert infer_status(body) == "Em elaboração de petição pelo escritório"


def test_trouxe_nao_significa_aguardando():
    # [BUG] 'trouxe' (já entregue) estava na lista de pendência do cliente
    body = "10.06.2026 (P): Cliente trouxe os documentos, seguir com o pedido.\n"
    assert infer_status(body) != "Aguardando documento/providência do cliente"


def test_pendencia_real_do_cliente_e_detectada():
    body = "10.06.2026 (C): Aguardando o cliente retornar com o relatório médico.\n"
    assert infer_status(body) == "Aguardando documento/providência do cliente"


def test_sem_gatilho_cai_no_neutro():
    assert infer_status("10.06.2026 (P): Caso revisado.\n") == "Em análise pelo escritório"


# ------------------------------------------------------------ timeline integrada

def test_timeline_jose_roberto_caso_real():
    body = ("05.07.2025 (P): Interpus Recurso Especial à CAJ.\n\n"
            "22.06.2025 (A): Sessão de julgamento agendada.\n\n"
            "06.04.2025 (P): manifestar.\n\n"
            "02.01.2023 (A): Não houve alteração no recurso.\nfoi indeferido...\n\n"
            "06.12.2021 (A): Aposentadoria Deferida (carta de concessão em anexo)\n")
    tl = [(e["data_br"], e["tipo"]) for e in build_timeline(body)]
    assert tl == [
        ("05/07/2025", "Recurso Especial interposto"),
        ("22/06/2025", "Sessão de julgamento agendada"),
        ("06/12/2021", "Benefício deferido pelo INSS"),
    ]


def test_status_usa_descricao_completa():
    tl = build_timeline("05.07.2025 (P): Interpus Recurso Especial à CAJ.\n")
    s = status_line(tl, None)
    assert s.startswith("Última atualização em 05/07/2025")


def test_dedup_mesmo_tipo_mesma_data():
    body = ("10.06.2026 (P): Prorrogação solicitada.\n\n"
            "10.06.2026 (A): Pedido de prorrogação feito.\n")
    assert len(build_timeline(body)) == 1
