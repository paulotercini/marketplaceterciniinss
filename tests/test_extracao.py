"""Regressão da extração de andamentos do portal.

Cada teste marcado [BUG] reproduz um defeito REAL já corrigido em produção —
se falhar, o defeito voltou. Rode com: python3 -m pytest tests/ -q
(puro: sem rede, sem tokens, sem tocar docs/portal/data)."""
import datetime, json
import pytest
import sys, pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from portal_common import (split_blocks, cpf_from_task, dn_from_items, derivar_hash, derivar,
                           gravar_ficha, ler_ficha)
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


def test_derivar_vetor_fixo():
    # F122 · vetor conferido contra o derivar() do docs/portal/app.js no Node;
    # mudar qualquer lado sem o outro tranca todos os clientes fora do portal
    h, chave = derivar("00000000000", "01011990", "salt", 1000)
    assert h == derivar_hash("00000000000", "01011990", "salt", 1000) == \
        "66d76c9f264e042ca899711076f8b663"
    assert chave.hex() == "248cfb7057cd9e2078093a2770aaa976c4f724a2884a798937d738605c193a44"


def test_ficha_cifrada_nao_expoe_nada_e_volta_inteira(tmp_path):
    ficha = {"nome": "Fulana de Tal", "processos": [{"lista": "🌻 INSS", "origem": "curado"}]}
    h, chave = derivar("00000000000", "01011990", "salt", 1000)
    path = tmp_path / f"{h}.json"
    gravar_ficha(path, ficha, chave, h)
    bruto = path.read_text(encoding="utf-8")
    assert "Fulana" not in bruto and "INSS" not in bruto and "curado" not in bruto
    assert set(json.loads(bruto)) == {"v", "iv", "ct"}
    assert ler_ficha(path, chave, h) == ficha


def test_ficha_com_chave_errada_nao_se_le(tmp_path):
    # a ficha ilegível levanta erro, para o gerador NÃO regravar por cima dos curados
    h, chave = derivar("00000000000", "01011990", "salt", 1000)
    _, outra = derivar("00000000000", "02011990", "salt", 1000)
    path = tmp_path / f"{h}.json"
    gravar_ficha(path, {"nome": "X", "processos": []}, chave, h)
    with pytest.raises(ValueError):
        ler_ficha(path, outra, h)
    # nem copiada para o endereço de outro cliente (o nome do arquivo é autenticado)
    with pytest.raises(ValueError):
        ler_ficha(path, chave, "0" * 32)


def test_ficha_em_claro_antiga_ainda_se_le(tmp_path):
    h, chave = derivar("00000000000", "01011990", "salt", 1000)
    path = tmp_path / f"{h}.json"
    path.write_text(json.dumps({"nome": "Antiga", "processos": []}), encoding="utf-8")
    assert ler_ficha(path, chave, h)["nome"] == "Antiga"
    assert ler_ficha(tmp_path / "inexistente.json", chave, h) is None


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


# ------------------------------------------------- F120 · a etapa no portal
# A etapa que o escritorio DECLARA no CRM passa a ser a frase que o cliente le.
# Tres regras: ela vence a deducao do ultimo comentario, ela NAO vence a
# pericia marcada (que traz data e hora), e etapa escrita a mao nao e publicada.

def test_etapa_do_crm_vence_a_frase_deduzida():
    from build_portal_listas import montar_processo_safe
    body = "10.09.2026 (P): Recurso ordinário protocolado.\n"
    item = {"lista": "🌻 INSS", "nome": "Fulano", "body": body}
    sem = montar_processo_safe("1" * 11, "01012000", item)
    com = montar_processo_safe("1" * 11, "01012000", item, {"etapa": "aguardando análise"})
    assert sem["status"].startswith("Última atualização")
    assert com["status"] == "Aguardando análise"


def test_pericia_marcada_vence_a_etapa():
    from build_portal_listas import montar_processo_safe
    hoje = datetime.date.today()
    futuro = hoje + datetime.timedelta(days=20)
    body = (f"{hoje.strftime('%d.%m.%Y')} (P): Perícia médica marcada para o dia "
            f"{futuro.strftime('%d/%m')} às 09h20 em Monte Alto.\n")
    item = {"lista": "🌻 INSS", "nome": "Fulano", "body": body}
    p = montar_processo_safe("1" * 11, "01012000", item, {"etapa": "aguardando análise"})
    assert "Perícia" in p["status"] and futuro.strftime("%d/%m/%Y") in p["status"]


def test_caso_sem_marco_e_sem_etapa_mantem_a_frase_neutra():
    from build_portal_listas import montar_processo_safe
    item = {"lista": "🌻 INSS", "nome": "Fulano", "body": "10.09.2026 (P): Amanda, ligar para o cliente.\n"}
    assert montar_processo_safe("1" * 11, "01012000", item)["status"] == "Em acompanhamento pelo escritório"


def test_etapa_escrita_a_mao_nao_vai_para_o_portal(monkeypatch):
    """[PRIVACIDADE] so o catalogo e publicavel: texto livre fica no CRM."""
    import portal_common as pc
    monkeypatch.setenv("SUPABASE_URL", "https://exemplo.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "chave")
    linhas = {
        "clientes": [{"id": "c1", "cpf": "111.111.111-11"}, {"id": "c2", "cpf": "22222222222"}],
        "casos": [
            {"cliente_id": "c1", "etapa": "aguardando perícia", "fase": "inss",
             "mover_para": "🌻 INSS", "origem_lista": None},
            {"cliente_id": "c2", "etapa": "cliente sumiu, cobrar honorário", "fase": "inss",
             "mover_para": "🌻 INSS", "origem_lista": None},
        ],
    }
    monkeypatch.setattr(pc, "_supa_pagina",
                        lambda url, chave, caminho, pagina=1000:
                        linhas["clientes"] if "clientes" in caminho else linhas["casos"])
    mapa = pc.etapas_do_crm()
    assert mapa == {("11111111111", "🌻 INSS"): "aguardando perícia"}


def test_sem_banco_o_portal_roda_igual(monkeypatch):
    import portal_common as pc
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_KEY", raising=False)
    assert pc.etapas_do_crm() == {}


def test_caso_encerrado_nao_publica_etapa(monkeypatch):
    import portal_common as pc
    monkeypatch.setenv("SUPABASE_URL", "https://exemplo.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "chave")
    monkeypatch.setattr(pc, "_supa_pagina",
                        lambda url, chave, caminho, pagina=1000:
                        [{"id": "c1", "cpf": "11111111111"}] if "clientes" in caminho else
                        [{"cliente_id": "c1", "etapa": "decidido", "fase": "encerrado",
                          "mover_para": "🌻 INSS", "origem_lista": None}])
    assert pc.etapas_do_crm() == {}


def test_processo_do_portal_carrega_o_campo_etapa():
    """[F120] o portal precisa do campo proprio: e ele que vira a SITUACAO ATUAL,
    mostrada SEMPRE, e nao so quando falta andamento."""
    from build_portal_listas import montar_processo_safe
    item = {"lista": "🌻 INSS", "nome": "Fulano",
            "body": "10.09.2026 (P): Recurso ordinário protocolado.\n"}
    com = montar_processo_safe("1" * 11, "01012000", item, {"etapa": "em exigência"})
    sem = montar_processo_safe("1" * 11, "01012000", item)
    assert com["etapa"] == "Em exigência" and sem["etapa"] is None


# ---------------------------------------------- [F121] a fila do TRF3 no portal

def _falso_supa(pc, monkeypatch, clientes, casos):
    monkeypatch.setenv("SUPABASE_URL", "https://exemplo.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "chave")
    monkeypatch.setattr(pc, "_supa_pagina",
                        lambda url, chave, caminho, pagina=1000:
                        clientes if "clientes" in caminho else casos)


def test_fila_do_trf3_vai_ao_portal_com_a_data_da_consulta(monkeypatch):
    import portal_common as pc
    _falso_supa(pc, monkeypatch,
                [{"id": "c1", "cpf": "11111111111"}],
                [{"cliente_id": "c1", "etapa": "aguardando sentença", "fase": "judicial",
                  "mover_para": "👪 Judicial", "origem_lista": None,
                  "trf3": {"ordem": 60, "total": 944, "orgao": "Gab. 37 Des. Fed. Fulano",
                           "consultado_em": "2026-09-18"}}])
    assert pc.crm_do_cliente() == {("11111111111", "👪 Judicial"): {
        "etapa": "aguardando sentença", "fila": "60º de 944", "fila_em": "18/09/2026"}}


def test_fila_so_sai_quando_o_caso_esta_no_judicial(monkeypatch):
    """O dado do painel pode ficar gravado de uma fase anterior. Dizer ao
    cliente que ele está na fila quando o caso já saiu de lá é mentira."""
    import portal_common as pc
    _falso_supa(pc, monkeypatch,
                [{"id": "c1", "cpf": "11111111111"}],
                [{"cliente_id": "c1", "etapa": "decidido", "fase": "inss",
                  "mover_para": "🌻 INSS", "origem_lista": None,
                  "trf3": {"ordem": 60, "total": 944, "orgao": "Gab. 37 Des. Fed. Fulano"}}])
    assert pc.crm_do_cliente() == {("11111111111", "🌻 INSS"): {"etapa": "decidido"}}


def test_fila_de_primeiro_grau_tambem_vai_ao_cliente(monkeypatch):
    """O painel cobre a 3ª Região inteira. A fila da vara de JEF é fila de
    julgamento daquele órgão, e o cliente do primeiro grau pergunta o mesmo."""
    import portal_common as pc
    _falso_supa(pc, monkeypatch,
                [{"id": "c1", "cpf": "11111111111"}],
                [{"cliente_id": "c1", "etapa": "aguardando sentença", "fase": "judicial",
                  "mover_para": "👪 Judicial", "origem_lista": None,
                  "trf3": {"ordem": 118, "total": 1221, "grau": 1,
                           "orgao": "01ª VF Previd. com JEF Cível e Previd. de Catanduva"}}])
    assert pc.crm_do_cliente() == {("11111111111", "👪 Judicial"): {
        "etapa": "aguardando sentença", "fila": "118º de 1221"}}


def test_fila_sai_mesmo_sem_etapa_declarada(monkeypatch):
    """A posição vem do tribunal, não depende de o escritório ter declarado nada."""
    import portal_common as pc
    _falso_supa(pc, monkeypatch,
                [{"id": "c1", "cpf": "11111111111"}],
                [{"cliente_id": "c1", "etapa": None, "fase": "judicial",
                  "mover_para": "👪 Judicial", "origem_lista": None,
                  "trf3": {"ordem": 7, "orgao": "Gab. 12 Des. Fed. Fulano"}}])
    assert pc.crm_do_cliente() == {("11111111111", "👪 Judicial"): {"fila": "7º"}}


def test_processo_do_portal_carrega_a_fila():
    from build_portal_listas import montar_processo_safe
    item = {"lista": "👪 Judicial", "nome": "Fulano",
            "body": "10.09.2026 (P): Ação distribuída.\n"}
    p = montar_processo_safe("1" * 11, "01012000", item,
                             {"etapa": "aguardando sentença", "fila": "60º de 944",
                              "fila_em": "18/09/2026"})
    assert p["fila"] == "60º de 944" and p["fila_em"] == "18/09/2026"
    assert montar_processo_safe("1" * 11, "01012000", item)["fila"] is None


# ------------------------------- [BUG 19.09.2026] cp1252 zerou duas fichas
# `write_text` sem encoding usa cp1252 no Windows, estoura no 🌻 do nome da
# lista e deixa a ficha do cliente com ZERO byte, porque o arquivo já foi
# aberto (e esvaziado) antes da falha. Correção: encoding explícito + escrita
# atômica por arquivo temporário.

def test_gravar_json_escreve_utf8_com_emoji_e_acento(tmp_path):
    from portal_common import gravar_json
    alvo = tmp_path / "ficha.json"
    gravar_json(alvo, {"lista": "🌻 INSS", "nome": "José Antônio", "etapa": "Aguardando perícia"})
    lido = json.loads(alvo.read_text(encoding="utf-8"))
    assert lido["lista"] == "🌻 INSS" and lido["etapa"] == "Aguardando perícia"


def test_gravar_json_nunca_escreve_no_encoding_do_sistema(tmp_path, monkeypatch):
    """[BUG] se alguem tirar o encoding="utf-8", este teste cai."""
    import pathlib
    vistos = []
    original = pathlib.Path.write_text

    def espiao(self, data, encoding=None, *a, **kw):
        vistos.append(encoding)
        return original(self, data, encoding=encoding, *a, **kw)

    monkeypatch.setattr(pathlib.Path, "write_text", espiao)
    from portal_common import gravar_json
    gravar_json(tmp_path / "f.json", {"lista": "🙋 Escritório"})
    assert vistos == ["utf-8"]


def test_falha_no_meio_da_escrita_nao_destroi_a_ficha_publicada(tmp_path):
    """[BUG] o arquivo bom so e substituido quando a escrita terminou inteira."""
    from portal_common import gravar_json
    alvo = tmp_path / "ficha.json"
    alvo.write_text('{"nome": "ficha boa"}', encoding="utf-8")
    try:
        gravar_json(alvo, {"impossivel": {1, 2, 3}})   # set nao vira JSON
    except TypeError:
        pass
    assert json.loads(alvo.read_text(encoding="utf-8"))["nome"] == "ficha boa"
    assert alvo.stat().st_size > 0
