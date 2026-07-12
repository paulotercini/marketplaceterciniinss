# -*- coding: utf-8 -*-
import json, io
d = json.load(io.open(r'C:\Users\VAIO\.claude\plugins\marketplaces\marketplace-tercini\audit_citacoes.json', encoding='utf-8'))
ks = [k for k in d['citacoes'] if k.startswith('SUMULA') and k.endswith('/TNU')]
ks.sort(key=lambda x: int(x.split()[1].split('/')[0]))
for k in ks:
    print(k, '| ocorrencias:', d['citacoes'][k]['n'], '| skills:', len(d['citacoes'][k]['skills']))
