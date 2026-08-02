"""Regressão da rotina do Claude (Fase 2) — crm/fase2/claude_rotina.py.
Só as partes determinísticas (as detecções); a chamada de API não roda aqui."""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "crm" / "fase2"))
import claude_rotina as cr
import escrever_todo


# ── detecção de exigência ─────────────────────────────────────────────────

def test_abertura_de_exigencia_detectada():
    assert cr.eh_abertura_de_exigencia("INSS abriu exigência: apresentar CTPS 1985-1990.")


def test_cumprimento_nao_reabre_exigencia():
    assert not cr.eh_abertura_de_exigencia("Exigência cumprida e protocolada no INSS.")
    assert not cr.eh_abertura_de_exigencia("Exigência atendida em 01.07.")


def test_texto_comum_nao_vira_exigencia():
    assert not cr.eh_abertura_de_exigencia("Petição inicial protocolada.")


def test_prazo_legal_30_dias():
    assert cr.prazo_legal("2026-08-02T12:00:00-03:00") == "2026-09-01"


# ── preenchimento de modelos de mensagem ──────────────────────────────────

def test_preencher_modelo_de_pericia():
    texto = cr.preencher(
        "Olá, {primeiro_nome}! Sua perícia: dia {data}, às {hora}, em {local}.",
        nome="Maria Exemplo Silva", data="2026-08-09", hora="14:30", local="Fórum de Franca",
    )
    assert texto == "Olá, Maria! Sua perícia: dia 09.08.2026, às 14:30, em Fórum de Franca."


def test_preencher_sem_local_usa_a_confirmar():
    assert "(local a confirmar)" in cr.preencher("Em {local}.", nome="X")


# ── idempotência das sugestões ────────────────────────────────────────────

def test_ids_deterministicos_evitam_sugestao_repetida():
    assert cr.uid("exig", "caso-1", "2026-08-01") == cr.uid("exig", "caso-1", "2026-08-01")
    assert cr.uid("exig", "caso-1", "2026-08-01") != cr.uid("exig", "caso-1", "2026-08-02")


# ── mapeamento fase -> lista do To Do (cliente novo criado no app) ────────

def test_fase_para_lista():
    assert escrever_todo.fase_para_lista("inss") == "🌻 INSS"
    assert escrever_todo.fase_para_lista("pagamento") == "💵 Pagamentos"
    assert escrever_todo.fase_para_lista("desconhecida") == "🙋 Escritório"
