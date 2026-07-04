# -*- coding: utf-8 -*-
"""Auditoria de citações (skills e Modelos Ouro) contra o catálogo interno.

Uso:
  python3 auditoria_citacoes.py skills
      Varre _base-conhecimento-inss/skills/ (exceto o próprio catálogo) e grava
      /tmp/auditoria/achados_skills.json com toda citação que o catálogo não
      confirma, mais o resumo no stdout.

  python3 auditoria_citacoes.py modelos [--baixar]
      Com --baixar, baixa todos os arquivos das subpastas de "Modelos Ouro 2.0"
      do Drive para /tmp/auditoria/modelos/ (requer token do gdrive_client).
      Analisa os .md locais, classifica cada achado pela seção (QUARENTENA,
      DEFESA ou CORPO) e grava achados_modelos.json + modelos_corpo.json.

Importante: "NAO_CATALOGADO" NÃO significa falso; o catálogo é curado e mínimo.
O que exige ação imediata é: CANCELADO, SUSPENSO, SEM_TESE, AGUARDANDO citados
como vigentes, e NAO_CATALOGADO_NA_CORTE (possível homônimo de corte trocada).
Para o resto, verificar na fonte oficial (CJF abre; STJ SCON/TRF3 costumam
bloquear) e, confirmando, registrar em CATALOGO-COMPLEMENTAR-VERIFICADO.md.
"""
import re, os, sys, json, glob, unicodedata

RAIZ = os.path.dirname(os.path.abspath(__file__))
CATDIR = os.path.join(RAIZ, '_base-conhecimento-inss/skills/base-precedentes-catalogo-vinculantes/references')
OUTDIR = '/tmp/auditoria'
MODELOS_ROOT_ID = '10WkDbxiBnmSSFMFzkW-rcPqTqk6614Rm'  # pasta Modelos Ouro 2.0 no Drive


def norm(s):
    return unicodedata.normalize('NFC', s)


def carrega_catalogo():
    cat = {'TEMA': {}, 'SUMULA': {}, 'ENUNCIADO': {}}
    arqs = {'STF': 'CATALOGO-TEMAS-STF.md', 'STJ': 'CATALOGO-TEMAS-STJ.md', 'TNU': 'CATALOGO-TEMAS-TNU.md'}
    for corte, a in arqs.items():
        txt = norm(open(os.path.join(CATDIR, a), encoding='utf-8').read())
        for m in re.finditer(r'\*\*Tema (\d+):\*\*\s*(.{0,120})', txt):
            n = int(m.group(1)); tese = m.group(2).strip()
            status = 'OK'
            if '[Cancelado]' in tese: status = 'CANCELADO'
            elif '[Suspenso]' in tese: status = 'SUSPENSO'
            elif 'Não há tese' in tese: status = 'SEM_TESE'
            elif 'Aguardando julgamento' in tese: status = 'AGUARDANDO'
            elif 'tese literal a confirmar' in tese: status = 'JULGADO_TESE_A_CONFIRMAR'
            cat['TEMA'].setdefault(n, {})[corte] = status
    stnu = norm(open(os.path.join(CATDIR, 'CATALOGO-SUMULAS-TNU.md'), encoding='utf-8').read())
    for m in re.finditer(r'\*\*Súmula (\d+):\*\*', stnu):
        cat['SUMULA'].setdefault(int(m.group(1)), {})['TNU'] = 'OK'
    stj = norm(open(os.path.join(CATDIR, 'CATALOGO-TEMAS-STJ.md'), encoding='utf-8').read())
    for m in re.finditer(r'Súmula (\d+)[/ ]?(?:do |de |)(STJ)', stj):
        cat['SUMULA'].setdefault(int(m.group(1)), {})['STJ'] = 'VIA_TEMA'
    crps = norm(open(os.path.join(CATDIR, 'CATALOGO-ENUNCIADOS-CRPS.md'), encoding='utf-8').read())
    for m in re.finditer(r'\*\*ENUNCIADO Nº (\d+):\*\*', crps):
        cat['ENUNCIADO'].setdefault(int(m.group(1)), {})['CRPS'] = 'OK'
    # catálogo complementar verificado na fonte oficial (se existir)
    comp = os.path.join(CATDIR, 'CATALOGO-COMPLEMENTAR-VERIFICADO.md')
    if os.path.exists(comp):
        txt = norm(open(comp, encoding='utf-8').read())
        for m in re.finditer(r'\*\*Súmula (\d+)/(TNU|STF|STJ|TFR)', txt):
            cat['SUMULA'].setdefault(int(m.group(1)), {}).setdefault(m.group(2), 'OK_COMPLEMENTAR')
        for m in re.finditer(r'\*\*Tema (\d+)/(TNU|STF|STJ)', txt):
            cat['TEMA'].setdefault(int(m.group(1)), {}).setdefault(m.group(2), 'OK_COMPLEMENTAR')
    return cat


RX = [
    ('TEMA', re.compile(r'Tema\s*(?:n?º?\s*)?(\d+)\s*(?:/|\s+d[oa]\s+|\s+)(STF|STJ|TNU)', re.I)),
    ('SUMULA', re.compile(r'S[úu]mula\s*(?:n?º?\s*)?(\d+)\s*(?:/|\s+d[oa]\s+|\s+)(STF|STJ|TNU|TFR)', re.I)),
    ('ENUNCIADO', re.compile(r'Enunciado\s*(?:n?º?\s*)?(\d+)(?:\s*[,/]\s*[IVX0-9]+)?\s*(?:/|\s+d[oa]\s+|\s*)?(CRPS)?', re.I)),
]

RX_NOTA_OK = re.compile(r'auditoria \d{2}/\d{2}/\d{4}|não citar|nao citar|removid|REVOGADA|CANCELAD|a confirmar', re.I)


def secao_do_modelo(linhas, idx):
    """Classifica a linha idx (0-based) pela última seção acima: QUARENTENA/DEFESA/CORPO."""
    for i in range(idx, -1, -1):
        u = linhas[i].upper()
        if 'A CONFERIR' in u and ('NÃO USAR' in u or 'NAO USAR' in u):
            return 'QUARENTENA'
        if 'DEFESA ANTECIPADA' in u or 'TESES DO INSS' in u or 'A REBATER' in u:
            return 'DEFESA'
        if re.match(r'^#{1,3} |^\d+\. [A-ZÀ-Ú]|^▮', linhas[i]) and i < idx:
            break
    return 'CORPO'


def analisa(paths, classificar_secao=False):
    cat = carrega_catalogo()
    achados = []
    for p in paths:
        try:
            txt = norm(open(p, encoding='utf-8', errors='replace').read())
        except OSError:
            continue
        linhas = txt.splitlines()
        for tipo, rx in RX:
            for m in rx.finditer(txt):
                num = int(m.group(1)); corte = (m.group(2) or 'CRPS').upper()
                lin = txt[:m.start()].count('\n')
                ctx = txt[max(0, m.start()-80):m.end()+80].replace('\n', ' ')
                ent = cat[tipo].get(num, {})
                if tipo == 'ENUNCIADO':
                    status = ent.get('CRPS', 'NAO_CATALOGADO')
                else:
                    status = ent.get(corte, 'NAO_CATALOGADO_NA_CORTE' if ent else 'NAO_CATALOGADO')
                if status in ('OK', 'VIA_TEMA', 'OK_COMPLEMENTAR'):
                    continue
                if RX_NOTA_OK.search(ctx):
                    continue  # já anotado/quarentenado no próprio texto
                item = {'arq': p, 'linha': lin+1, 'tipo': tipo, 'num': num,
                        'corte': corte, 'status': status, 'ctx': ctx[:170]}
                if classificar_secao:
                    item['secao'] = secao_do_modelo(linhas, lin)
                achados.append(item)
    return achados


def resumo(achados, label):
    from collections import Counter
    print(f"{label}: {len(achados)} citações a examinar em {len(set(x['arq'] for x in achados))} arquivos")
    for k, v in Counter((x['tipo'], x['num'], x['corte'], x['status']) for x in achados).most_common(40):
        print(f"  {v:3d}x {k[0]} {k[1]}/{k[2]} -> {k[3]}")


def baixa_modelos():
    sys.path.insert(0, RAIZ)
    import gdrive_client as g
    destino = os.path.join(OUTDIR, 'modelos')
    os.makedirs(destino, exist_ok=True)
    n = 0
    for sub in g.list_children(MODELOS_ROOT_ID):
        if not sub['mimeType'].endswith('folder'):
            continue
        for f in g.list_children(sub['id']):
            if 'google-apps' in f['mimeType'] or f['mimeType'].endswith('folder'):
                continue
            slug = re.sub(r'[^A-Za-z0-9]+', '_', sub['name'] + '_' + f['name'])[:90] + '.md'
            path = os.path.join(destino, slug)
            data = g.download(f['id']) if hasattr(g, 'download') else None
            if data is None:
                os.system(f"cd {RAIZ} && python3 gdrive_download.py {f['id']} '{path}' >/dev/null 2>&1")
            else:
                open(path, 'wb').write(data)
            n += 1
    print(f"modelos baixados: {n} -> {destino}")


if __name__ == '__main__':
    os.makedirs(OUTDIR, exist_ok=True)
    modo = sys.argv[1] if len(sys.argv) > 1 else 'skills'
    if modo == 'skills':
        paths = glob.glob(os.path.join(RAIZ, '_base-conhecimento-inss/skills/**/*.md'), recursive=True)
        paths = [p for p in paths if 'base-precedentes-catalogo-vinculantes' not in p]
        a = analisa(paths)
        json.dump(a, open(os.path.join(OUTDIR, 'achados_skills.json'), 'w'), ensure_ascii=False, indent=1)
        resumo(a, 'skills')
    elif modo == 'modelos':
        if '--baixar' in sys.argv:
            baixa_modelos()
        paths = glob.glob(os.path.join(OUTDIR, 'modelos/*.md'))
        if not paths:
            print('Nenhum modelo local; rode com --baixar.'); sys.exit(1)
        a = analisa(paths, classificar_secao=True)
        json.dump(a, open(os.path.join(OUTDIR, 'achados_modelos.json'), 'w'), ensure_ascii=False, indent=1)
        corpo = [x for x in a if x.get('secao') == 'CORPO']
        json.dump(corpo, open(os.path.join(OUTDIR, 'modelos_corpo.json'), 'w'), ensure_ascii=False, indent=1)
        resumo(a, 'modelos (todos)')
        print(f"\nNO CORPO (fora de quarentena/defesa): {len(corpo)} — ver modelos_corpo.json")
    else:
        print(__doc__)
