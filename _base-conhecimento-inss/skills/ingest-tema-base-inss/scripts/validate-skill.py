#!/usr/bin/env python3
"""Valida SKILL.md de uma skill temática da base-conhecimento-inss.

Regras verificadas:
  1. YAML frontmatter com name e description.
  2. description <= 1024 caracteres.
  3. Corpo do SKILL.md sem dois-pontos como separador lógico
     (permitido apenas em URL, frontmatter YAML e linhas de cabeçalho).
  4. Arquivos references/FUNDAMENTOS-E-CENARIOS.md e
     references/JURISPRUDENCIA-E-REFUTACAO.md presentes.

Uso:
  python3 validate-skill.py <caminho-da-skill>

Exemplo:
  python3 validate-skill.py skills/base-especial-ruido
"""

from __future__ import annotations

import pathlib
import re
import sys


def fail(msg: str) -> None:
    print(f"FALHA {msg}")


def ok(msg: str) -> None:
    print(f"OK {msg}")


def validate(skill_dir: pathlib.Path) -> int:
    errors = 0
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        fail(f"SKILL.md ausente em {skill_dir}")
        return 1
    text = skill_md.read_text(encoding="utf-8")
    m = re.search(r"^---\s*\n(.*?)\n---\s*\n", text, re.S)
    if not m:
        fail("frontmatter YAML ausente")
        errors += 1
    else:
        fm = m.group(1)
        body = text[m.end():]
        # description
        d = re.search(r'description:\s*"(.+?)"', fm, re.S)
        if not d:
            fail("description ausente no frontmatter")
            errors += 1
        else:
            if len(d.group(1)) > 1024:
                fail(f"description com {len(d.group(1))} caracteres, excede 1024")
                errors += 1
            else:
                ok(f"description com {len(d.group(1))} caracteres")
        # dois-pontos em linhas de corpo
        suspicious = []
        for line in body.splitlines():
            if not line.strip():
                continue
            if line.lstrip().startswith("#"):
                continue
            # remove URLs com scheme arbitrário (http, https, computer, file)
            tmp = re.sub(r"\b[a-zA-Z][\w+\-.]*://\S+", "", line)
            if ":" in tmp:
                suspicious.append(line)
        if suspicious:
            fail(f"possíveis dois-pontos como separador lógico ({len(suspicious)})")
            for s in suspicious[:5]:
                print(f"   -> {s.strip()[:120]}")
            errors += 1
        else:
            ok("sem dois-pontos como separador lógico")
    # skills operacionais (que trazem scripts/) são dispensadas de references
    scripts_dir = skill_dir / "scripts"
    is_operacional = scripts_dir.exists() and any(scripts_dir.iterdir())
    # references aceitos: padrão canônico (2 arquivos) ou padrão estendido (>=2 .md)
    refs_dir = skill_dir / "references"
    if is_operacional and not refs_dir.exists():
        ok("skill operacional (scripts) — references dispensada")
    elif not refs_dir.exists():
        fail("pasta references ausente")
        errors += 1
    else:
        canonical = [
            refs_dir / "FUNDAMENTOS-E-CENARIOS.md",
            refs_dir / "JURISPRUDENCIA-E-REFUTACAO.md",
        ]
        if all(p.exists() for p in canonical):
            for p in canonical:
                ok(f"references/{p.name} presente")
        else:
            md_files = sorted(refs_dir.glob("*.md"))
            if len(md_files) >= 2:
                ok(
                    f"references com {len(md_files)} arquivos .md "
                    f"(padrão estendido)"
                )
                for p in md_files:
                    ok(f"references/{p.name} presente")
            else:
                fail(
                    "references precisa conter pelo menos 2 arquivos .md "
                    "(padrão canônico ou estendido)"
                )
                errors += 1
    return errors


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("uso python3 validate-skill.py <caminho-da-skill>")
        return 2
    skill_dir = pathlib.Path(argv[1]).resolve()
    return 0 if validate(skill_dir) == 0 else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
