import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "am", Path(__file__).parent.parent / "crm/fase2/aplicar_migracoes.py")
am = importlib.util.module_from_spec(spec)
spec.loader.exec_module(am)


def test_destrutiva_bloqueia_o_que_apaga():
    for sql in ["drop table x;", "alter table t drop column c;", "alter table t drop c;",
                "truncate t;", "delete from t where 1=1;", "DROP  TABLE if exists t"]:
        assert am.destrutiva(sql), sql


def test_destrutiva_deixa_passar_o_que_nao_apaga():
    for sql in ["drop policy if exists p on t;", "drop trigger if exists g on t;",
                "drop index if exists i;", "alter table t drop constraint k;",
                "alter table t add column c int;", "-- delete from t\nselect 1;",
                "/* drop table x */ select 1;", "create or replace function f() returns void as $$ $$;"]:
        assert am.destrutiva(sql) is None, sql


def test_marca_de_confirmacao_libera():
    assert am.destrutiva("-- destrutiva-confirmada: Paulo, 07.11.2026\ndrop table x;") is None


def test_linha_de_base_e_f433_pendente():
    base = am.linha_de_base()
    assert "f433_anotacoes_apagadas.sql" not in base
    nomes = [p.name for p in am.pendentes(set(base))]
    assert "f433_anotacoes_apagadas.sql" in nomes
    assert all((am.PASTA / n).exists() for n in base)


def test_migracoes_novas_conferidas():
    assert am.conferir() == 0
