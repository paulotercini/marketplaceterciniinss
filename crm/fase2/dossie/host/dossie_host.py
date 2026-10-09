"""DOSSIÊ · grava os PDFs da extensão na pasta do cliente no Google Drive.

A extensão do navegador só escreve em Downloads; este programa recebe cada PDF
por "native messaging" (o Chrome/Comet o abre sozinho, mensagem em JSON no
stdin com 4 bytes de tamanho) e grava em

    <raiz>\\<Letra>\\<Nome Do Cliente #CPF>\\Dossie\\<fonte>\\<arquivo>.pdf

A PASTA QUE JÁ EXISTE VENCE. Medido em 08.10.2026 no G:\\Meu Drive\\Processos:
754 pastas, 460 com "#CPF" no fim, 4 com o CPF em outro formato (com pontos,
faltando dígito), 290 SEM CPF (as antigas) e 13 numa letra que não é a inicial.
Por isso a busca olha todas as letras: primeiro pelo CPF, depois pelo nome sem
acento. Só quando nada casa é que nasce "Letra\\Nome Capitalizado #CPF".

`raiz` vem de dossie_host.json, ao lado deste arquivo (o instalador escreve).
"""
import base64
import json
import os
import re
import struct
import sys
import unicodedata

AQUI = os.path.dirname(os.path.abspath(__file__))
MINUSCULAS = {'da', 'de', 'do', 'das', 'dos', 'e', 'di', 'du'}   # 228 pastas assim, 36 com maiúscula


def sem_acento(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')


def chave_nome(s):
    """Nome comparável: sem o "#..." do fim, sem acento, minúsculo, espaço simples."""
    s = s.split('#')[0]
    return ' '.join(sem_acento(s).lower().split())


def capitalizar(nome):
    """MARIA APARECIDA DA SILVA -> Maria Aparecida da Silva."""
    partes = nome.lower().split()
    return ' '.join(p if (i and p in MINUSCULAS) else p[:1].upper() + p[1:] for i, p in enumerate(partes))


def seguro(s):
    """Nome que o Windows aceita como pasta/arquivo."""
    s = re.sub(r'[\\/:*?"<>|\x00-\x1f]', ' ', s)
    return ' '.join(s.split()).strip(' .') or 'documento'


def cpf_da_pasta(nome):
    """Dígitos depois do '#', com zeros à esquerda (há pasta com 10 dígitos)."""
    if '#' not in nome:
        return ''
    d = re.sub(r'\D', '', nome.split('#', 1)[1])
    return d.zfill(11) if 9 <= len(d) <= 11 else ''


def achar_ou_criar(raiz, cpf, nome):
    cpf = re.sub(r'\D', '', cpf).zfill(11)
    alvo_nome = chave_nome(nome)
    por_nome = None
    for letra in os.scandir(raiz):
        if not letra.is_dir():
            continue
        for p in os.scandir(letra.path):
            if not p.is_dir():
                continue
            if cpf_da_pasta(p.name) == cpf:
                return p.path, False
            if por_nome is None and alvo_nome and '#' not in p.name and chave_nome(p.name) == alvo_nome:
                por_nome = p.path        # pasta antiga sem CPF: vale se nenhuma tiver o CPF
    if por_nome:
        return por_nome, False
    bonito = capitalizar(nome) if nome.strip() else 'Cliente'
    letra = sem_acento(bonito)[:1].upper() or '_'
    caminho = os.path.join(raiz, letra, seguro(f'{bonito} #{cpf}'))
    os.makedirs(caminho, exist_ok=True)
    return caminho, True


def dentro(raiz, caminho):
    raiz, caminho = os.path.realpath(raiz), os.path.realpath(caminho)
    return os.path.commonpath([raiz, caminho]) == raiz


def tratar(msg, raiz):
    if msg.get('acao') == 'pasta':
        caminho, criada = achar_ou_criar(raiz, msg['cpf'], msg.get('nome', ''))
        return {'ok': True, 'pasta': caminho, 'criada': criada}
    if msg.get('acao') == 'salvar':
        pasta = msg['pasta']
        # fronteira de confiança: a mensagem não escolhe lugar fora da raiz
        sub = [seguro(x) for x in str(msg.get('fonte', 'Outros')).split('/')]
        destino = os.path.join(pasta, 'Dossie', *sub, seguro(msg['arquivo']))
        if not dentro(raiz, pasta) or not dentro(pasta, destino):
            return {'erro': 'caminho fora da pasta de processos'}
        os.makedirs(os.path.dirname(destino), exist_ok=True)
        with open(destino, 'wb') as f:
            f.write(base64.b64decode(msg['b64']))
        return {'ok': True, 'caminho': destino}
    if msg.get('acao') == 'ping':
        return {'ok': True, 'raiz': raiz, 'existe': os.path.isdir(raiz)}
    return {'erro': 'ação desconhecida'}


def main():
    # utf-8-sig: o PowerShell 5 grava o json com BOM
    with open(os.path.join(AQUI, 'dossie_host.json'), encoding='utf-8-sig') as f:
        raiz = json.load(f)['raiz']
    entrada, saida = sys.stdin.buffer, sys.stdout.buffer
    while True:
        tam = entrada.read(4)
        if len(tam) < 4:
            return
        msg = json.loads(entrada.read(struct.unpack('<I', tam)[0]).decode('utf-8'))
        try:
            resp = tratar(msg, raiz)
        except Exception as e:  # o navegador só vê o que vier aqui
            resp = {'erro': f'{type(e).__name__}: {e}'}
        dado = json.dumps(resp, ensure_ascii=False).encode('utf-8')
        saida.write(struct.pack('<I', len(dado)) + dado)
        saida.flush()


if __name__ == '__main__':
    main()
