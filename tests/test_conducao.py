"""F189 · rito do caso pelos dados (crm/conducao.py).

Um caso-ouro fictício por regra. Números de processo inventados, no formato
CNJ; nenhum dado de cliente. Rode com: python3 -m pytest tests/ -q"""
import pathlib, re, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from crm.conducao import classificar, rito_conselho, rito_inss, rito_judicial  # noqa: E402

JEF = "0000001-11.2025.4.03.6314"
VARA = "0000002-22.2024.4.03.6136"
TJSP = "0000003-33.2023.8.26.0368"


def r(fn, **k):
    return fn(k)[:2]


# ---------------------------------------------------------------- INSS
def test_inss_pela_especie():
    assert r(rito_inss, especie="B31") == ("inss_inc", "alta")
    assert r(rito_inss, especie="B94") == ("inss_b94", "alta")
    assert r(rito_inss, especie="B36") == ("inss_b94", "alta")
    assert r(rito_inss, especie="B87") == ("inss_bpc", "alta")
    assert r(rito_inss, especie="B42") == ("inss_apos", "alta")


def test_inss_aposentadoria_pcd_vai_para_bpc_e_pcd():
    assert r(rito_inss, especie="B42", subespecie="B42.PCD") == ("inss_bpc", "alta")


def test_inss_sem_especie_le_o_beneficio_escrito():
    assert r(rito_inss, beneficio="Auxílio-acidente do trabalho") == ("inss_b94", "media")
    assert r(rito_inss, beneficio="LOAS deficiente") == ("inss_bpc", "media")
    assert r(rito_inss, beneficio="nada reconhecível") == ("inss_apos", "baixa")


# ---------------------------------------------------------------- Conselho
def test_conselho_camara_por_recurso_especial():
    assert rito_conselho({"re_protocolado_em": "2026-01-02"})[:2] == ("crps_camara", "alta")
    bloco = [{"orgao_atual": "2ª Câmara de Julgamento", "eventos": []}]
    assert rito_conselho({"crps": bloco})[:2] == ("crps_camara", "alta")
    assert rito_conselho({}, camara_pat=True)[:2] == ("crps_camara", "media")


def test_conselho_junta_por_padrao():
    bloco = [{"orgao_atual": "16ª Junta de Recursos", "eventos": []}]
    assert rito_conselho({"crps": bloco})[:2] == ("crps_junta", "alta")
    assert rito_conselho({})[:2] == ("crps_junta", "media")


# ---------------------------------------------------------------- Judicial
def test_mandado_de_seguranca_pela_classe():
    assert r(rito_judicial, processo=VARA, classe_judicial="MSCiv") == ("ms", "alta")
    assert r(rito_judicial, processo=VARA, datajud={"classe": "Mandado de Segurança Cível"}) == ("ms", "alta")


def test_numero_cnj_decide_jef_e_vara():
    assert r(rito_judicial, processo=VARA) == ("vara", "alta")
    assert r(rito_judicial, processo=JEF, especie="B31") == ("jef_inc", "alta")
    assert r(rito_judicial, processo=JEF, especie="B41") == ("jef_apos", "alta")


def test_jef_sem_especie_usa_beneficio_e_depois_a_pericia():
    assert r(rito_judicial, processo=JEF, beneficio="Aposentadoria rural") == ("jef_apos", "media")
    assert rito_judicial({"processo": JEF}, pericia=True)[:2] == ("jef_inc", "media")
    assert r(rito_judicial, processo=JEF) == ("jef_apos", "baixa")


def test_tjsp_separa_acidentario_delegada_e_a_confirmar():
    assert r(rito_judicial, processo=TJSP, especie="B94") == ("acid", "alta")
    assert r(rito_judicial, processo=TJSP, beneficio="auxílio-acidente") == ("acid", "alta")
    assert r(rito_judicial, processo=TJSP, especie="B31") == ("acid", "media")
    assert r(rito_judicial, processo=TJSP, especie="B42") == ("delegada", "media")
    assert r(rito_judicial, processo=TJSP) == ("acid", "baixa")


def test_sem_numero_e_sempre_confianca_baixa():
    assert r(rito_judicial, especie="B31") == ("jef_inc", "baixa")


# ---------------------------------------------------------------- conjunto
def test_classificar_so_as_fases_que_o_caso_tem():
    assert classificar({"fase": "escritorio"})["ritos"] == {}
    c = classificar({"fase": "judicial", "processo": JEF, "especie": "B31", "protocolos": ["123"]})
    assert set(c["ritos"]) == {"inss", "judicial"}
    assert c["ritos"]["judicial"]["r"] == "jef_inc"


def test_todo_rito_sugerido_existe_na_trilha_do_app():
    """Coerência com o app: rito que a trilha não conhece cairia no padrão."""
    app = (pathlib.Path(__file__).resolve().parent.parent / "crm/fase2/app.html").read_text("utf-8")
    bloco = app[app.index("const TRILHAS = {"):app.index("// a palavra antiga (casos.etapa)")]
    ritos_app = set(re.findall(r"^\s*([a-z0-9_]+):\{fase:", bloco, re.M))
    usados = {"inss_inc", "inss_b94", "inss_bpc", "inss_apos", "crps_camara", "crps_junta",
              "ms", "vara", "jef_inc", "jef_apos", "acid", "delegada"}
    assert usados <= ritos_app, usados - ritos_app
