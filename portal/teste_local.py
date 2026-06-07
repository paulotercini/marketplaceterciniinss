"""Teste local: monta um cliente ficticio e roda o pipeline de processamento.

Util para validar o gerador e o frontend sem precisar mexer no To Do real.
Gera site/data/<hash>.json a partir de tarefas mock e imprime as credenciais
de acesso pra testar no navegador.

USO:
    python3 portal/teste_local.py
    cd portal/site && python3 -m http.server 8000
    # abrir http://localhost:8000 e usar as credenciais impressas
"""
import sys, json
from pathlib import Path
from datetime import datetime, timedelta

sys.path.insert(0, str(Path(__file__).parent))
from gerar_portal import (
    processar_tarefa, hash_chave, SALT, PBKDF_ITER, DATA_DIR
)

# 3 tarefas ficticias para o mesmo cliente (CPF 11122233344, DN 07/06/1990)
TAREFAS_MOCK = [
    {
        "lista": "🌻 INSS",
        "task": {
            "title": "João da Silva Teste #11122233344",
            "status": "notStarted",
            "body": {
                "contentType": "text",
                "content": """João da Silva Teste #11122233344
DN: 07/06/1990
Verificar pedido de auxilio-doenca
Sistema de verificacao: MEUINSS

15.05.2026 (P): Beneficio solicitado - em analise.
20.05.2026 (P): Pericia agendada para o dia 12/06/2026 as 10:30h no INSS de Matao. Relembrar em 10/06.
07.06.2026 (PUB): Documentos recebidos. Aguardando a pericia medica na proxima semana.
[BOT-LOG] PERICIA_MEDICA-AVISO-1206 em 05.06.2026
"""
            }
        }
    },
    {
        "lista": "👪 Judicial",
        "task": {
            "title": "João da Silva Teste #11122233344",
            "status": "notStarted",
            "body": {
                "contentType": "text",
                "content": """João da Silva Teste #11122233344
DN: 07/06/1990

01.06.2026 (P): Peticao inicial distribuida. Processo n. 5001234-56.2026.4.03.6109.
03.06.2026 (PUB): Acao judicial distribuida. Vamos acompanhar e avisar dos andamentos.
"""
            }
        }
    },
    {
        "lista": "🙋 Escritório",
        "task": {
            "title": "João da Silva Teste #11122233344",
            "status": "notStarted",
            "body": {
                "contentType": "text",
                "content": """João da Silva Teste #11122233344
DN: 07/06/1990

05.06.2026 (P): Audiencia designada para o dia 18/08/2026 as 14h00 na 1a Vara Federal.
"""
            }
        }
    }
]


def main():
    print("=" * 70)
    print("TESTE LOCAL — gerando JSON ficticio para validar o portal")
    print("=" * 70)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    processos = []
    for item in TAREFAS_MOCK:
        p = processar_tarefa(item["task"], item["lista"])
        if not p:
            print(f"FALHOU: nao processou tarefa em {item['lista']}")
            continue
        processos.append(p)
        print(f"OK: {item['lista']} -> {p['status']}")

    if not processos:
        print("Nenhum processo gerado. Abortando.")
        return

    cpf = processos[0]["cpf"]
    dn = processos[0]["dn"]
    h = hash_chave(cpf, dn)

    payload = {
        "nome": processos[0]["nome"],
        "atualizado_em": datetime.now().strftime("%d/%m/%Y as %H:%M"),
        "processos": processos,
    }
    (DATA_DIR / f"{h}.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # cria _meta.json se nao existir (para o app.js conseguir o salt)
    meta_path = DATA_DIR / "_meta.json"
    if not meta_path.exists():
        meta_path.write_text(json.dumps({
            "atualizado_em": datetime.now().strftime("%d/%m/%Y %H:%M"),
            "total_clientes": 1,
            "salt": SALT.decode("utf-8"),
            "iter": PBKDF_ITER,
        }, ensure_ascii=False, indent=2), encoding="utf-8")

    cpf_fmt = f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"
    dn_fmt = f"{dn[:2]}/{dn[2:4]}/{dn[4:]}"

    print()
    print("=" * 70)
    print("ARQUIVO GERADO:", DATA_DIR / f"{h}.json")
    print("=" * 70)
    print()
    print("PARA TESTAR NO NAVEGADOR:")
    print()
    print("  1. Em outro terminal:")
    print("     cd portal/site && python3 -m http.server 8000")
    print()
    print("  2. Abra http://localhost:8000 e digite:")
    print(f"     CPF: {cpf_fmt}")
    print(f"     DN:  {dn_fmt}")
    print()
    print("PREVIEW DO JSON GERADO:")
    print("-" * 70)
    print(json.dumps(payload, ensure_ascii=False, indent=2)[:2000])


if __name__ == "__main__":
    main()
