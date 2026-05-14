# MythKraken — Hermes Skill Pipeline

> Routing, invariants, and enforcement for the MythKraken monorepo.
> **Every step is a skill. Skills are the only routing unit.**

> This file is the source of truth for MythKraken project orchestration.
> It is Hermes-skill-native — no agents as routing concepts, no profiles as dispatchers.
> Reusable across: Hermes CLI, droid-CLI, and pi-CLI.

---

## 0. Vibe — how to talk to me

Chat replies only. Code, commits, docs: keep professional.

- Talk like a friend. "yeah that's broken because…" beats "the underlying issue is…".
- Plain words. "grabs data from the backend" beats "retrieves data via the API layer".
- Short and direct. No padding.
- No "as an AI…" preambles.
- Bullets > long paragraphs.

Vibe: senior dev at the bar, not a tech writer.

---

## 1. Task Intake

Before any work starts:

```
1. kanban_create() — title = short summary, body = full description
2. Invoke /kraken "<task description>" to start the pipeline
```

**Exceptions:** clarifying questions, conversational replies — no card needed.

The kanban card is the audit trail. `task-ingestion` syncs status back to Discord / Notion / Linear.

---

## 2. The Pipeline — sequential skill chain

Every non-trivial task walks this chain. The umbrella entry point is **`/kraken`**.

```
USER REQUEST
    │
    ▼
/kraken "<task description>"
    │
    ▼
[1] /kraken-researcher          (heavy: repomix + file scan)
    │     Reads codebase, emits research-context.json
    │
    ▼
[2] /kraken-planner              (reasoning: triage + decompose)
    │     Reads research-context.json
    │     Emits plan.md + phases.json + tests.json
    │     Tags each todo with ONE skill from §5 map
    │
    ▼
[3] /kraken-execute             (per-todo skill invocation)
    │     For each todo:
    │       • Vitest-covered → /tdd-vitest-executor (RED → GREEN → REFACTOR)
    │       • Pure visual / stories / refactor → specialist skill direct
    │       • After every .tsx write → /frontend-data-testid-checker (audit)
    │
    ▼
[4] /kraken-validate            (umbrella: Door 1 + Door 2)
    │     Door 1 — /frontend-first-validator (inline, build + lint + tsc)
    │     Door 2 — /test-flow-orchestrator + /e2e-orchestrator (background)
    │     Returns: PASS or FAIL with report
    │
    ▼
[5] /kraken-pre-commit-validator (final sanity)
    │     Dashboard → bun tsc + lint + build
    │     Backend   → dotnet build + test
    │
    ▼
[6] /pr-expert                  (repo-aware push or PR)
    │     Dashboard on dev-week* → push only
    │     Backend → feature branch + gh pr create
    │
    ▼
[7] /repomix-updater            (background: pack refresh)
```

**Failure recovery.** Any FAIL returns to step [2] with the report appended. Max 3 attempts. After 3rd: `/kraken-notify` → Mailgun → `HUMAN_EMAIL` (terminal fallback).

**Resume.** State lives under `Dashboard/claude/orchestrator-state/<plan-slug>/`. After `/compact`: invoke `/kraken-resume`.

---

## 3. Always-On Enforcement

Auto-applied on every task without explicit invocation:

1. **TDD inner loop** — for every non-trivial frontend phase:
   - `/tdd-vitest-planner` writes test plan (called from `/kraken-planner`)
   - `/tdd-vitest-executor` writes failing tests (RED) → specialist implements (GREEN) → conditional REFACTOR
   - Cycles logged to `tdd-cycles.json`
   - Phases with `vitestProject: null` skip the loop

2. **Validation gate** — `/kraken-validate` (Door 1 + Door 2) before any task is marked done.

3. **`data-*` attributes** — kebab-case, descriptive, parent-context prefix. Enforced by `/frontend-data-testid-checker` after every frontend file write.

4. **i18n** — all static UI text in `en.json`. Authority: `/frontend-translator`.

5. **Folder structure** — atomic design (`atoms/ui/helpers/hooks/components`, `types.ts`, `constants.ts`). `/folder-architect` audits on entry, `/frontend-organizator` audits on phase exit.

6. **File line limits** — TSX ≤ 800 lines, other source ≤ 300 lines. Audited by `/frontend-organizator`.

---

## 4. Repo Layout

```
/var/www/kraken/
├── .hermes.md                 # Hermes source of truth (this file)
├── PIPELINE.md                # mirror of .hermes.md (pure skill pipeline)
├── CLAUDE.md                  # Claude-Code-specific — separate, do NOT sync
├── Backend/                   # C#/.NET solution
└── Dashboard/                 # React frontend
    ├── .hermes.md             # mirror
    ├── PIPELINE.md            # mirror
    └── claude/                # orchestrator state (gitignored)
        └── orchestrator-state/<plan-slug>/
```

### Two independent git repos

| Repo | Path | Remote |
|---|---|---|
| Frontend (MythKraken.Dashboard) | `/var/www/kraken/Dashboard` | `Myth-Developers/MythKraken.Dashboard` |
| Backend (MythKraken.Backend) | `/var/www/kraken/Backend` | `Myth-Developers/MythKraken.Backend` |

Frontend and Backend have independent histories — never combine into one branch or one PR.

### Branching policy

- **Dashboard** — direct commit on `dev-week<N>-<month>` only. No feature branch, no PR. Stop and ask if off-policy.
- **Backend** — feature branch + PR mandatory. Fork `<type>/<short-desc>-$(date +%Y%m%d)` from `PARENT_BRANCH`, PR back to `PARENT_BRANCH`. Never commit directly to long-lived branches.
- **Forbidden:** force-push, auto-merge, `--no-verify`, commits to branches you didn't create.

### Local stack (systemd only — never start manually)

| Service | Role | Port |
|---|---|---|
| `kraken-dashboard.service` | Vite dev server | 5173 |
| `kraken-backend.service` | .NET API | 5134 |
| `cloudflared-kraken.service` | Tunnel to `kraken.menustudioai.com` + `api-kraken-backend.menustudioai.com` | — |
| `storybook.service` | Storybook | 6006 |

Diagnostics: `systemctl status <name>` + `journalctl -u <name> -n 100 --no-pager`.

**Pre-flight before browser tests:**
```bash
systemctl is-active kraken-dashboard kraken-backend cloudflared-kraken
# Must print three "active" lines
```

### Auth / DB / E2E

- DB: `Backend/appsettings.Secrets.json` → `ConnectionStrings.default`
- E2E creds: `Dashboard/.env.e2e` (gitignored) — `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, `E2E_BASE_URL`, `E2E_FRONTEND_URL`
- `SPRINT_BRANCH` in `Dashboard/.env` — required by `/pr-expert` for off-policy Dashboard branches
- Live flow skills must log in via real `/auth/login` UI — never seed `sid` cookies or mock the endpoint

---

## 5. Skill Assignment Map

When `/kraken-planner` decomposes work, each todo is tagged with exactly one skill. This is the routing table — skills run sequentially, this map ensures the planner picks the right skill per file slice.

| Skill | Writes only here |
|---|---|
| `/frontend-designer` | `.tsx` return JSX block + Tailwind classes |
| `/frontend-react` | `.tsx` body before return (thin shell); shared `src/atoms/*Atom.ts` |
| `/frontend-hooks` | `hooks/use*.ts` |
| `/frontend-types` | `types.ts` |
| `/frontend-constants` | `constants.ts` |
| `/frontend-atoms` | `atoms/*.tsx`, `src/components/ui/<X>/<X>.tsx` |
| `/frontend-translator` | `src/locales/<ns>/*.json`, `src/i18n/i18n.ts` |
| `/frontend-storybook` | `*.stories.tsx` |
| `/frontend-endpoints` | `src/api/endpoints.ts` (append-only) |
| `/frontend-websockets` | `src/signalr/*.ts`, hub-event subscribers |
| `/backend-dev` | `Backend/MythKraken.*/**/*.cs` |
| `/folder-architect` | **NONE** — pre-flight audit only |
| `/frontend-organizator` | **NONE** — post-phase audit + refactor only |
| `/frontend-data-testid-checker` | **NONE** — post-write audit only |

If a todo touches more than one slice, `/kraken-planner` splits it into separate todos — one per skill.

---

## 6. Skill Catalogue

All MythKraken skills live at `~/.hermes/skills/software-development/<name>/SKILL.md`.

### Pipeline entry points

| Skill | Role |
|---|---|
| `/kraken` | Master pipeline. research → plan → execute → validate → pre-commit → PR |
| `/kraken-researcher` | Repomix + file scan → `research-context.json` |
| `/kraken-planner` | Triages, decomposes, emits `plan.md` + `phases.json` + `tests.json` |
| `/kraken-execute` | Per-todo skill invocation, TDD inner loop |
| `/kraken-validate` | Door 1 + Door 2 validation umbrella |
| `/kraken-pre-commit-validator` | Final sanity (build + lint + tsc) |
| `/kraken-resume` | Pick up paused plan from `orchestrator-state/` |
| `/kraken-notify` | Failure email after 3 failed attempts |

### Pipeline sub-skills

| Skill | Role |
|---|---|
| `/tdd-vitest-planner` | `tests.json` from `phases.json` |
| `/tdd-vitest-executor` | RED-GREEN-REFACTOR inner loop |
| `/frontend-first-validator` | Door 1 — build + lint + tsc |
| `/test-flow-orchestrator` | Door 2A — live agent-browser tests |
| `/e2e-orchestrator` | Door 2B — Playwright replay or build |
| `/pr-expert` | Repo-aware push or PR creation |
| `/repomix-updater` | Background pack refresh |
| `/mythkraken-orchestrator` | **Legacy** — prefer `/kraken` |
| `/mythkraken-validator` | **Legacy** — prefer `/kraken-validate` |

### Frontend specialists

| Skill | Role |
|---|---|
| `/frontend-react` | React entry-point shell |
| `/frontend-designer` | CSS / Tailwind visual |
| `/frontend-hooks` | Business logic hooks |
| `/frontend-types` | TypeScript interfaces |
| `/frontend-constants` | Runtime constants |
| `/frontend-atoms` | Atomic UI primitives |
| `/frontend-ux` | a11y, keyboard, loading/error/empty |
| `/frontend-translator` | i18n locale files |
| `/frontend-storybook` | Storybook stories |
| `/frontend-endpoints` | Axios API layer |
| `/frontend-websockets` | SignalR real-time |
| `/frontend-organizator` | Folder structure audit + refactor |
| `/frontend-data-testid-checker` | `data-*` audit |
| `/folder-architect` | Atomic design pre-flight |

### Backend specialist

| Skill | Role |
|---|---|
| `/backend-dev` | C# / .NET 8 |

### Testing & QA

| Skill | Role |
|---|---|
| `/e2e-plan` | Plan a Playwright E2E test |
| `/e2e-dev` | Scaffold a new E2E spec |
| `/e2e-run` | Run E2E suite |
| `/e2e-explore` | Exploratory QA / coverage audit |
| `/flow-test-builder` | Generate validator + auditor pairs |
| `/flow-test-authoring` | Recipe + templates for flow-test skills |
| `/flow-quick-article-validator` | Quick-article live validator |
| `/flow-quick-article-auditor` | Quick-article auditor |
| `/dogfood` | Exploratory QA |
| `/spike` | Throwaway experiments |
| `/kraken-fullsite-qa` | Full QA session |
| `/agent-browser` | Browser automation |
| `/browser-agent` | Browser automation (alt) |
| `/browser-validation-agent` | UI state verification |
| `/mythkraken-browser-agent` | MythKraken browser patterns |

### Code-quality & operations

| Skill | Role |
|---|---|
| `/code-rot-scan` | Dead code scanner |
| `/code-rot-clean` | Dead code cleaner |
| `/requesting-code-review` | Pre-commit review |
| `/task-ingestion` | External → kanban bridge |
| `/kraken-database` | MySQL test data |
| `/external-claude-runner` | Spawn fresh Claude CLI for newly-created skills |
| `/hermes-agent-skill-authoring` | Author SKILL.md |
| `/mythkraken-storybook` | Storybook deployment / config |

### Methodology & utilities

| Skill | Role |
|---|---|
| `/test-driven-development` | TDD methodology |
| `/subagent-driven-development` | Subagent orchestration |
| `/plan` | Plan mode (no exec) |
| `/writing-plans` | Implementation plans |
| `/systematic-debugging` | 4-phase debug |
| `/python-debugpy` | Python DAP debugging |
| `/node-inspect-debugger` | Node.js debugging |
| `/debugging-hermes-tui-commands` | Hermes TUI slash command debug |

---

## 7. Orchestrator State

Persists under:
```
Dashboard/claude/orchestrator-state/<plan-slug>/
├── plan.md
├── phases.json
├── tests.json
├── tdd-cycles.json
├── state.json
├── research-context.json
└── precommit.log
```

Gitignored — survives `/compact`. Resume with `/kraken-resume`.

Failure reports → `Dashboard/claude/reports/` (git-tracked for forensics).

---

## 8. Sync Rule

`.hermes.md` is the source of truth. It is mirrored verbatim:

```bash
cp /var/www/kraken/.hermes.md /var/www/kraken/PIPELINE.md
cp /var/www/kraken/.hermes.md /var/www/kraken/Dashboard/.hermes.md
cp /var/www/kraken/.hermes.md /var/www/kraken/Dashboard/PIPELINE.md
```

`CLAUDE.md` is **not** part of this sync — it is Claude-Code-specific and diverges intentionally. Do not overwrite it.

---

## 9. What Changed from AGENTS.md

| Before (AGENTS.md) | After (PIPELINE.md) |
|---|---|
| Hybrid model: skill → agent | Pure skill chain — every step is a skill |
| "kraken-researcher agent" (spawned by skill) | `/kraken-researcher` skill (does its own heavy work via `delegate_task` internally if needed) |
| Profiles as environment shells | Profiles removed from routing — pure skill dispatch |
| "agent" as routing concept | "agent" removed from routing vocabulary — stays only as internal execution mechanism |
| `mythkraken-orchestrator` as legacy | `/mythkraken-orchestrator` skill (legacy) vs `/kraken` skill (canonical) |
| 7-step pipeline with agent/skill hybrid | 7-step pipeline, 100% skills |
| AGENTS.md naming | PIPELINE.md naming — clearer intent |

The **reusability for droid-cli and pi-cli** comes from: no agents as routing concepts, no profile dependencies, pure skill invocations that work the same way regardless of which CLI is running Hermes underneath.

---

## 10. wide-researcher MCP — Mandatory Code Search at `/var/www/kraken`

**Scope**: any session, subagent, or skill running with `workdir` set to `/var/www/kraken/` or any of its subdirectories.

### The rule

At `/var/www/kraken`, code-content search (`grep`, `find`, `glob`, `search_files`, `ripgrep`, `terminal find/grep`, etc.) over `.ts` / `.tsx` / `.cs` / `.py` / `.go` / `.rs` / `.java` / `.kt` / `.vue` / `.jsx` / `.css` / `.scss` / `.sql` / `.yaml` / `.json` source files is **banned as a primary search mechanism**. The wide-researcher MCP is the authoritative search layer.

**wide-researcher MCP tools are the only primary search tools here:**
```
mcp__wide-researcher__wr_find   — semantic + keyword + hybrid (RRF) in one call
mcp__wide-researcher__wr_impact — impact-radius: "what files does this change affect?"
mcp__wide-researcher__wr_file   — all chunks for one file (use after wr_find narrows it down)
```

**Bash/Terminal/Grep/Glob are reserved for only:**
- git operations (`git log`, `git diff`, `git blame`, `git status`)
- file metadata (size, mtime, permissions) — not content
- config/file-format inspection: `package.json`, `tsconfig.json`, `.env`, `.csproj`, `.sln`
- log file scanning (`.log`, `.txt` in known log dirs)
- system probes (`df`, `free`, `ps`, `curl` health checks)

### Why this matters

The Qdrant index at `/var/www/kraken` holds **57,617 indexed points** across the full codebase. Hybrid search (Cohere v4 1536-dim + BM25) runs in ~30ms. Raw grep over a multi-GB tree is 500× slower and misses semantic hits.

The MCP server is registered at:
```yaml
# ~/.hermes/config.yaml
mcp_servers:
  wide-researcher:
    command: node
    args:
    - /var/www/wide-researcher/bin/wide-researcher-mcp.js
    - --project-config
    - /var/www/kraken/.wide-researcher/config.json
```

Config: `/var/www/kraken/.wide-researcher/config.json` → collection `kraken_code`, embed model `embed-v4.0`, 1536-dim.

### Loading the skill

Before any code-search task at `/var/www/kraken`, load:
```
/skill wide-research
```
This loads the full tool reference, Qdrant collection layout, embed worker protocol, and known bugs.

### If the MCP is unavailable

If `wr_find`/`wr_impact`/`wr_file` return errors (connection refused, collection not found, embed worker down), fall back to terminal search as a last resort. After restoring service, re-verify with the MCP.

**Qdrant not running?** Start it:
```bash
cd ~/.wide-researcher/qdrant && ./qdrant --config-path config.yaml &
curl http://127.0.0.1:6333/healthz
```

**Collection gone after colleague DB transfer?** Re-run the reindex:
```bash
sudo systemd-run --unit=kraken-reindex --service-type=oneshot \
  bash -c "cd /var/www/kraken && WIDE_RESEARCHER_PROJECT_CONFIG=/var/www/kraken/.wide-researcher/config.json \
  ~/.wide-researcher/venv/bin/python -m indexer reindex --fresh"
```
