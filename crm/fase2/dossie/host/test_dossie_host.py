"""python -m pytest crm/fase2/dossie/host -q"""
import base64
import os

import dossie_host as H


def _arvore(tmp_path, *pastas):
    for p in pastas:
        (tmp_path / p).mkdir(parents=True)
    return str(tmp_path)


def test_capitaliza_com_preposicao_minuscula():
    assert H.capitalizar('MARIA APARECIDA DA SILVA E SOUZA') == 'Maria Aparecida da Silva e Souza'
    assert H.capitalizar('de souza') == 'De Souza'          # a primeira palavra sempre maiúscula


def test_cpf_da_pasta_aceita_os_formatos_que_existem():
    assert H.cpf_da_pasta('Maria Silva #12345678901') == '12345678901'
    assert H.cpf_da_pasta('Ana Lima #123.456.789-01') == '12345678901'
    assert H.cpf_da_pasta('Joao Paulo #1234567890') == '01234567890'   # faltou o zero
    assert H.cpf_da_pasta('Sem Cpf') == ''
    assert H.cpf_da_pasta('Nome#') == ''


def test_acha_pelo_cpf_mesmo_em_outra_letra(tmp_path):
    raiz = _arvore(tmp_path, 'M/Maria Aparecida da Silva #12345678901', 'L/Luis X #11111111111')
    p, criada = H.achar_ou_criar(raiz, '123.456.789-01', 'Outro Nome Qualquer')
    assert p.endswith('Maria Aparecida da Silva #12345678901') and not criada


def test_acha_pasta_antiga_sem_cpf_pelo_nome_sem_acento(tmp_path):
    raiz = _arvore(tmp_path, 'M/MARIA APARECIDA DA SILVA')
    p, criada = H.achar_ou_criar(raiz, '12345678901', 'Maria Aparecida da Silva')
    assert p.endswith('MARIA APARECIDA DA SILVA') and not criada


def test_cliente_novo_cria_letra_e_nome_capitalizado(tmp_path):
    raiz = _arvore(tmp_path, 'M')
    p, criada = H.achar_ou_criar(raiz, '12345678901', 'ÉRICA DOS SANTOS')
    assert criada and p == os.path.join(raiz, 'E', 'Érica dos Santos #12345678901') and os.path.isdir(p)


def test_salvar_grava_em_dossie_e_barra_caminho_fora_da_raiz(tmp_path):
    raiz = _arvore(tmp_path, 'M/Maria #12345678901')
    pasta = os.path.join(raiz, 'M', 'Maria #12345678901')
    b64 = base64.b64encode(b'%PDF-1.5').decode()
    r = H.tratar({'acao': 'salvar', 'pasta': pasta, 'fonte': 'Recursos/123', 'arquivo': 'a:b.pdf', 'b64': b64}, raiz)
    assert r['caminho'] == os.path.join(pasta, 'Dossie', 'Recursos', '123', 'a b.pdf')
    assert open(r['caminho'], 'rb').read() == b'%PDF-1.5'
    fora = H.tratar({'acao': 'salvar', 'pasta': str(tmp_path.parent), 'fonte': 'x', 'arquivo': 'y.pdf', 'b64': b64}, raiz)
    assert 'erro' in fora
    sobe = H.tratar({'acao': 'salvar', 'pasta': pasta, 'fonte': '../..', 'arquivo': 'y.pdf', 'b64': b64}, raiz)
    assert 'erro' in sobe or sobe['caminho'].startswith(pasta)
