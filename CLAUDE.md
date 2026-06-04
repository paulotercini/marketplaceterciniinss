# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

This is a **Claude Code plugin marketplace** owned by the law office of Paulo Roberto Tercini Filho (OAB/SP 331.110). It is not a conventional software project — it ships two things:

1. **A plugin marketplace** (`.claude-plugin/marketplace.json`) exposing the `base-conhecimento-inss` plugin: a curated knowledge base of Brazilian social-security (INSS / previdenciário) law, written as ~125 thematic Claude Code **skills**. The content is in Portuguese and is the actual product.
2. **A set of helper Python scripts** at the repo root that audit and triage the office's Microsoft To Do task lists via the Microsoft Graph API. These are office-internal tooling, unrelated to the published plugin.

There is no build step, no test suite, no package manifest. The "code" is mostly Markdown skill content plus standalone Python scripts that run with only the standard library (except `audit_generate_excel.py`, which needs `openpyxl`).

## Repository layout

```
.claude-plugin/marketplace.json     # Marketplace manifest (lists the plugin, version, tags)
_base-conhecimento-inss/            # The published plugin (note leading underscore)
  .claude-plugin/plugin.json        # Plugin manifest — MUST be version-synced with marketplace.json
  README.md                         # Editorial philosophy and ingestion flow
  skills/<skill-name>/
    SKILL.md                        # Frontmatter (name, description) + body
    references/*.md                 # Deep-dive reference docs the skill points to
  scripts/ingest-tema.sh            # OCR ingestion pipeline for thematic source ZIPs
graph_client.py, graph_devflow.py,  # Microsoft Graph (To Do) auth + API helpers
graph_refresh.py
audit_*.py, inspect_tasks.py,       # Task-list audit/triage pipeline (office-internal)
triagem.py
```

Skills follow three naming prefixes:
- `base-*` (117) — thematic knowledge bases (one benefit, thesis, or procedural topic each).
- `ponte-*` (6) — "bridge" / orchestrator skills that route between `base-*` skills for a workflow (e.g. `ponte-workflow-crps`).
- operational skills without a prefix (`ingest-tema-base-inss`, `processos-amanda-administrativo`).

## Editorial conventions for skill content (critical)

These are domain rules from `_base-conhecimento-inss/README.md`, not optional style preferences. When creating or editing any `SKILL.md` or reference doc:

- **No colons (`:`) as a logical separator.** This is a firm office writing standard. Use a period and a new sentence instead.
- **Strict normative hierarchy.** Cite in order: Constituição Federal → leis complementares → leis ordinárias → decretos → IN 128/2022 → portarias → CRPS enunciados → INSS internal guidance.
- **Jurisprudence only after verification** against an official primary source with a link, and only when it supports the segurado (the insured). Never cite to support the State/INSS.
- **Pro-segurado posture always.** Theses are positioned for the insured, never for the Fazenda or the autarquia.
- **Radical honesty** about controversy, absence of precedent, or minority positions.
- **Anti-hallucination protocol.** Every normative or jurisprudential claim must be verified in a primary source (the project maintains a `base-legislacao-fontes-primarias` skill with SHA-256-verified documents). Social-media insights are pauta input only, never a source.

Each skill's `SKILL.md` starts with YAML frontmatter containing `name` and a long `description`. The `description` is keyword-dense on purpose — it drives skill auto-activation, so it enumerates every statute, tema, súmula, and trigger phrase the skill should match, plus `Cruza com ...` cross-references and explicit `NÃO use para ...` exclusions.

## Versioning and release workflow

Releases are tracked as **"Ondas"** (waves). Each wave bumps the version and is recorded in three places that **must stay in sync**:

1. `.claude-plugin/marketplace.json` → `plugins[0].version`
2. `_base-conhecimento-inss/.claude-plugin/plugin.json` → `version`
3. The git commit message

A desync between the marketplace catalog and the internal `plugin.json` previously caused the plugin to stop updating in Claude Code (see commit `2e32086`) — always update both manifests together.

Commit message convention (Portuguese, present in `git log`):
```
v<version> - Onda <N> <short title> - <detailed description of what changed>
```
Commit messages are long and descriptive by design, summarizing the wave's content and ending with the running total skill count (e.g. "125 skills ao todo").

When adding a skill, also append its relevant trigger keywords to the `tags` array in `marketplace.json` and `keywords` in both `plugin.json` files — the existing entries show the expected granularity.

## Thematic ingestion pipeline

New knowledge is ingested from thematic source ZIPs via `_base-conhecimento-inss/scripts/ingest-tema.sh`:

```bash
ingest-tema.sh <caminho-zip> <slug-skill>
```

Requires `tesseract`, `tesseract-ocr-por`, and `unzip`. It unzips, OCRs all images in Portuguese, and consolidates to `/tmp/ingest-<slug>/_ocr_bruto.txt`. The raw OCR output is **working material only** — triage it, verify every relevant claim against a primary source, write the `SKILL.md` + `references/*.md`, then destroy the raw material. Never commit OCR dumps or source ZIPs.

## Microsoft Graph audit/triage scripts (office-internal)

These root-level Python scripts manage the office's Microsoft To Do task lists. They are **not** part of the published plugin.

**Auth (run in this order on first use):**
```bash
python3 graph_devflow.py     # Device-code OAuth login → writes graph_tokens.json
python3 graph_refresh.py     # Renew access_token from saved refresh_token
```
`graph_client.py` is the shared Graph API wrapper used by the others.

**Audit pipeline (run in numbered order):**
```bash
python3 audit_build_cache.py        # Fetch all tasks+checklists → /tmp/audit_cache.json
python3 audit_stage1_overview.py    # → /tmp/audit_stage1.md  (quantitative inventory)
python3 audit_stage2_titles.py      # → /tmp/audit_stage2.md  (title/naming patterns)
python3 audit_stage3_catalog.py     # → /tmp/audit_stage3.md  (benefits/action types)
python3 audit_stage4_vocab.py       # → /tmp/audit_stage4.md  (body vocabulary)
python3 audit_stage5_workflow.py    # → /tmp/audit_stage5.md  (collaborator flow P/A/M/D/I)
python3 audit_stage6_issues.py      # → /tmp/audit_stage6.md  (operational diagnostics)
python3 audit_generate_excel.py     # → audit_excel/*.xlsx     (needs openpyxl)
```
`inspect_tasks.py` and `triagem.py` are ad-hoc helpers (sample task structure; triage Paulo's tasks by due date).

**Sensitive data handling:** task data contains CPFs, phone numbers, passwords, and client histories. The cache lives at `/tmp/audit_cache.json` and the Excel output in `audit_excel/` — both are deliberately **gitignored along with `graph_tokens.json` and `graph_device.json`**. The stage report `.md` files are aggregated to be safe to share, but never commit anything containing personal data.

## Git workflow

The default branch is `main`. Wave releases are committed directly with the versioned message format above. The marketplace ships entirely from committed files, so anything that should appear in the published plugin must be committed.
