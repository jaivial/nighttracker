# Kraken — Project Rules (Hermes)

> Hermes-native project rules for MythKraken. Routing, invariants, and always-on enforcement.
> Skills live at `~/.hermes/skills/`, profiles at `~/.hermes/profiles/`. See `AGENTS.md` for the full catalogue.
> `CLAUDE.md` is kept identical for Claude Code compatibility — both files share the same rules.

---

## 0. Talk to me normal — chill, no fancy words

How you write back to me:

- **Talk casual, like a friend.** Skip the corporate / docs voice. "yeah, that's broken because..." beats "the underlying issue is...".
- **Plain words, not techie words.** When you can swap a fancy term for a normal one, do it.
  - "the function pulls data from the server" → "the function grabs the data from the backend"
  - "instantiate the component" → "drop the component in"
  - "the request is failing because of a CORS misconfiguration" → "the request is failing 'cause CORS isn't set up right"
- **Short and direct.** Don't pad. Don't write 4 sentences when 1 works.
- **Use examples instead of explaining.** Show me, don't lecture.
- **It's okay to say "this is dumb" or "this is gonna suck" or "easy fix"** — natural reactions, not buzzwords.
- **Keep the technical stuff accurate** — I want simple wording, not wrong info. If a term truly has no good casual swap (e.g. `useEffect`, `SignalR`, `Jotai atom`), use it — but explain in plain words next to it the first time.
- **No "as an AI..." preambles.** Skip.
- **Bullet lists and short paragraphs** beat long ones.

The vibe: like asking a senior dev next to you in a bar what's going on. Not a doc. Not a tutorial. Real talk.

This style applies to **chat replies and explanations**. It does NOT apply to:
- Code (write it normal — clean, idiomatic)
- Commit messages (still proper imperative-mood — "fix bug", "add endpoint")
- File contents like SKILL.md, agent prompts, INDEX.md (those are docs — keep professional)
- PR descriptions (proper, but can be relaxed)

---

## Task Intake (always runs before anything else)

**Every task the user describes in this session MUST become a Kanban card before any work starts.**

Before executing ANY task described by the user (bug report, feature request, refactor, investigation):
1. `kanban_create()` — title = short summary of the task, body = full description
2. Then proceed with routing, decomposition, and execution

**Exception:** Clarifying questions ("can we do X?"), conversational replies, and "just checking" queries do NOT need a card.

**Why:** A card on kanban.menustudioai.com gives the task a permanent audit trail, enables dependency tracking, unblocks parallel workers, and lets `task-ingestion` sync status back to external sources (Discord, Notion, Linear).

---

## 1. Routing — pick the right tool

For any non-trivial task, follow the pipeline. Detailed step-by-step procedures live inside the skill — invoke it, don't reimplement it here.

**Hermes profiles** are dispatchable workers at `~/.hermes/profiles/<name>/`. Each profile loads its paired skill. Use the profile name as the dispatch target in `mythkraken-orchestrator` Kanban calls.

| Trigger | Hermes Profile / Skill | Notes |
|---|---|---|
| Any non-trivial task | `mythkraken-orchestrator` | **Mandatory first step.** Pre-triages, then delegates: research → planner → execute → validate. |
| Step 1 — context gathering | `kraken-researcher` | First step inside the orchestrator. Uses cached repomix packs via repomix MCP. |
| Step 2 — plan creation | `kraken-planner` | After researcher. Triages size (trivial / simple / big), emits `phases.json` + `plan.md`. |
| Step 3.5 — test plan creation | `tdd-vitest-planner` | After kraken-planner. Reads phases.json, emits tests.json with failing tests per phase mapped to a Vitest project. Skips visual / stories / refactor phases (`vitestProject: null`). |
| Phase 4 inner loop — RED-GREEN-REFACTOR | `tdd-vitest-executor` | Wraps every non-trivial frontend phase. RED writes failing tests + verifies; specialist makes GREEN; conditional REFACTOR on smell detection. Logs to `tdd-cycles.json`. |
| Backend C#/.NET work | `backend-dev` | Controllers, services, repos, connectors, migrations. |
| React wiring (entry-point thin shell + shared atoms) | `frontend-react` | NARROWED. Body before return + `src/atoms/*Atom.ts`. No hooks/types/constants/atoms files. |
| Hook files (`hooks/use*.ts`) | `frontend-hooks` | Pure logic, no JSX. Parallel-safe. |
| Type files (`types.ts`) | `frontend-types` | Mirrors backend DTOs exactly. Parallel-safe. |
| Constants (`constants.ts`) | `frontend-constants` | Static values, no functions. Parallel-safe. |
| Atom components (`atoms/*.tsx`) | `frontend-atoms` | Pure presentational primitives. Parallel-safe. |
| CSS / Tailwind / visual | `frontend-designer` | Visual layer only — no logic. |
| Axios / API client | `frontend-endpoints` | Typed contracts, interceptors. |
| SignalR / real-time | `frontend-websockets` | Hub events, reconnection, `/articlehub`. |
| i18n / locales (all static text) | `frontend-translator` | **Owned exclusively here** (full handover from `frontend-ux`). |
| a11y / keyboard / loading-error-empty | `frontend-ux` | No longer covers i18n. |
| Storybook (`*.stories.tsx`, HMR, Vite) | `frontend-storybook` | Wraps `mythkraken-storybook` skill. |
| New / changed component | `folder-architect` | Atomic-design audit on `*.tsx` create/modify. |
| New API endpoint | `backend-dev` + `mythkraken-validator` | `[ApiController]` + `[RequireWorkspaceFlag]` + tests. |
| New Playwright E2E (CI) | `e2e-plan` → `e2e-dev` → `e2e-run` | Real backend fixture; never seeded sessions. `e2e-dev` appends to `TEST_INDEX.md`. |
| Live flow E2E (real-browser) | `flow-test-builder` → `flow-<name>-validator/auditor` | Files written to `Dashboard/claude/agents/`. Manual UI login mandatory. |
| Exploratory QA | `e2e-explore` (Mode A) or `dogfood` | Not for CI. |
| Coverage audit (orchestrator Layer 2) | `e2e-explore --flow <name>` (Mode B) | Reports `EXISTS <path>` or `MISSING`. |
| Throwaway experiment | `spike` | Not production-ready code. |
| Task-done gate | `mythkraken-validator` | Phase 5 — full suite + E2E + i18n + folder + acceptance. |
| Door 1 — light build+lint+tsc | `frontend-first-validator` | After Phase 5. Routes errors to specialists per file-ownership. |
| Door 2A — live agent-browser tests | `test-flow-orchestrator` | NEW nested orchestrator. Locates or creates flow-test agents; uses external-claude-runner if newly created. |
| Door 2B — Playwright replay | `e2e-orchestrator` | NEW nested orchestrator. Runs existing spec or creates one from agent-browser trace via e2e-test-101.md. |
| Door 3 — pre-commit gate | `kraken-pre-commit-validator` | Sanity re-check after Door 2 may have introduced new files. Same procedure as before. |
| PR creation | `pr-expert` | NEW final step. Cherry-pick task commits onto pr/<slug>, push, gh pr create against $SPRINT_BRANCH. |
| Background repomix refresh | `repomix-updater` | Auto-spawned post-success. Never blocks. |
| Failure-recovery email | `/kraken-notify` | After 3rd failed attempt. Mailgun → `HUMAN_EMAIL`, fallback terminal. |
| Resume after `/compact` | `/kraken-resume` | Picks up incomplete plan from `Dashboard/claude/orchestrator-state/`. |
| Pre-commit code review (manual) | `requesting-code-review` | Security + quality gates. |
| Find dead code | `code-rot-scan` → `code-rot-clean` | Per-batch user confirmation required. |
| External task source → kanban | `task-ingestion` | Bridge & status sync. |
| Plans before non-trivial work | `writing-plans` or `plan` | Tasks, paths, code snippets. (Used internally by `kraken-planner`.) |
| Plan execution via subagents | `subagent-driven-development` | 2-stage review. |
| Debugging | `systematic-debugging`, `python-debugpy`, `node-inspect-debugger` | Root cause first. |
| data-testid on every HTML element | `frontend-data-testid-checker` | **Mandatory post-write audit.** Every `data-*` attribute must be unique, kebab-case, parent-context prefixed. Check after any frontend file write. |

**Rule of thumb:** if a profile/skill exists for the work, invoke it. Don't reproduce its rules in this file.

---

## 2. Always-on enforcement

Auto-applied on every task without explicit invocation:

1. **TDD enforced as a Phase-4 inner loop, not a per-specialist convention.** For every non-trivial frontend phase, `tdd-vitest-planner` writes a test plan (Phase 3.5), then `tdd-vitest-executor` writes the failing tests, confirms RED, hands off to the specialist for implementation, confirms GREEN, prompts REFACTOR only when smells are detected. The cycle is logged to `Dashboard/claude/orchestrator-state/<plan-slug>/tdd-cycles.json`. Phases with `vitestProject: null` (pure visual, stories, structural refactor) skip the loop. Authority for the cycle procedure: `tdd-vitest-executor`. Authority for the methodology: `test-driven-development`.
2. **Validator gate** — `mythkraken-validator` before any task is marked done. Lint + type + build + tests must pass.
3. **`data-` attribute on every meaningful HTML element** — kebab-case, descriptive, parent-context prefix. **Enforced by `frontend-data-testid-checker`** — invoke after every frontend file write. No two elements in the same component may share the same `data-` value.
4. **i18n for all static UI text** — never hardcode user-facing strings. Source of truth: `en.json`.
5. **Folder structure** — `folder-architect` audits atomic-design layout (`atoms/ui/helpers/hooks/components`, `types.ts`, `constants.ts`) after any component change.
6. **File line limits** — TSX ≤ 800 lines, all other source files ≤ 300 lines.

---

## 3. UI Component Rules (Dashboard)

Every reusable component in `Dashboard/src/components/...` must satisfy:

1. **Folder structure** — own folder named after the component, with `types.ts`, `constants.ts`, `hooks/`, `atoms/`, `helpers/`, `ui/`, `components/` as needed. `folder-architect` audits this on every change.
2. **Open/Closed via props** — accept `className`, `style`, `data-testid`. Variants and behaviour extended via props, not by editing the source.
3. **Storybook story is mandatory** — `<Component>.stories.tsx` next to the component. Cover all variants, sizes, states, and edge cases. CSF3 format, `tags: ['autodocs']`.
4. **`data-` attribute on every meaningful element** — kebab-case, parent-context prefix. **After every write, invoke `frontend-data-testid-checker`** to audit the component for missing or duplicate `data-` attributes.

Storybook conventions, plugin conflicts, and the `react-children-shim` bridge → `mythkraken-storybook`.

---

## 4. Project invariants (no skill owns these)

### Repo layout

```
/var/www/kraken/
├── AGENTS.md                    # Hermes project rules (this file)
├── CLAUDE.md                    # identical — Claude Code compatibility
├── .hermes.md                   # Hermes highest-priority context
├── MythKraken.Backend/          # C#/.NET solution, 5 projects
└── Dashboard/
    ├── AGENTS.md                # identical copy of Hermes rules
    └── claude/                  # repo-tracked skills/agents (see INDEX.md)
```

### Local stack — managed by systemd. **Never start/restart manually.**

| Service | Role | Port |
|---|---|---|
| `kraken-dashboard.service` | Vite dev server | 5173 |
| `kraken-backend.service` | .NET API (`ASPNETCORE_ENVIRONMENT=Development`) | 5134 |
| `cloudflared-kraken.service` | Tunnel: `kraken.menustudioai.com` → :5173, `api-kraken-backend.menustudioai.com` → :5134 | — |
| `storybook.service` | Storybook | 6006 |
| `cloudflared-storybook.service` | Storybook tunnel | — |

**Forbidden:** `npm run dev`, `dotnet run`, `cloudflared tunnel ...`. Use `systemctl status <name>` and `journalctl -u <name> -n 100 --no-pager` for diagnostics.

**Pre-flight before any browser-driven test:**
```bash
systemctl is-active kraken-dashboard kraken-backend cloudflared-kraken
# Must print three "active" lines. If not, stop — do not auto-start anything.
```

### Backend dependency rule (cannot be enforced by tooling)

- **Core** references nothing.
- **API** never references **Data** or **Connectors** directly — go via Core interfaces + DI.
- Only Infra, Data, Connectors reference Core.

### Auth / DB / E2E

- DB connection string: `MythKraken.Backend/appsettings.Secrets.json` → `ConnectionStrings.default` (default `Server=localhost;Port=3306;Database=krakendb;Uid=root;Pwd=myth`).
- E2E credentials: `Dashboard/.env.e2e` (gitignored). Keys: `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, `E2E_BASE_URL`, `E2E_FRONTEND_URL`.
- **`SPRINT_BRANCH`** must be set in `Dashboard/.env` (gitignored). Default: `sprint/may-week1`. `pr-expert` reads this to target the PR base branch. Without it, PR creation aborts.
- Live flow-test agents (`flow-<name>-validator/auditor`) **must** log in via the real `/auth/login` UI form. Never seed `sid` cookies, never mock `/api/auth/login`.
- Playwright `.spec.ts` may use `e2e/fixtures/realBackend.fixture.ts` (server-side login + cookie seed).

---

## 4.5 Parallelization model — file-ownership per specialist

In Phase 4, multiple specialists in the same parallel batch are dispatched concurrently. Conflicts are impossible because each owns a strict file slice:

| Specialist | Owns (writes only here) |
|---|---|
| `frontend-designer` | The `.tsx` file's **return JSX block** + Tailwind classes |
| `frontend-react` | The `.tsx` file's **body before return** (thin shell); shared `src/atoms/*Atom.ts` |
| `frontend-hooks` | `hooks/use*.ts` |
| `frontend-types` | `types.ts` |
| `frontend-constants` | `constants.ts` |
| `frontend-atoms` | `atoms/*.tsx`, `src/components/ui/<X>/<X>.tsx` |
| `frontend-translator` | `src/locales/<ns>/*.json`, `src/i18n/i18n.ts` |
| `frontend-storybook` | `*.stories.tsx` |
| `frontend-endpoints` | `src/api/endpoints.ts` (append-only) |
| `frontend-websockets` | `src/signalr/*.ts`, hub-event subscribers |
| `backend-dev` | `Backend/MythKraken.*/**.cs` |
| `folder-architect` | NONE in execution (pre-flight only) |
| `frontend-organizator` | NONE in execution (audit + per-batch refactor only, scheduled at end of each phase) |
| `frontend-data-testid-checker` | Post-write audit only — no source file writes |

The planner emits per-phase `batches` arrays; the orchestrator dispatches all specialists in a batch via concurrent `Agent(...)` calls in a single message.

---

## 5. Phase-state & resume

The orchestrator persists per-plan state under:

```
/var/www/kraken/Dashboard/claude/orchestrator-state/<plan-slug>/
├── plan.md
├── phases.json
├── state.json
├── research-context.json
└── precommit.log
```

This directory is gitignored. State files are workspace-local and survive `/compact` — pick up a paused plan with `/kraken-resume`.

Failure reports (after 3 failed attempts) are written to `Dashboard/claude/reports/` and **are tracked in git** for forensic value.

---

## 6. Hermes profiles — quick reference

All profiles are at `~/.hermes/profiles/<name>/`. Each loads its paired skill automatically.

| Profile | Skill |
|---|---|
| `mythkraken-orchestrator` | Orchestrates the full pipeline |
| `backend-dev` | C#/.NET backend |
| `frontend-react` | React entry-point shell |
| `frontend-designer` | CSS/Tailwind visual |
| `frontend-hooks` | Business logic hooks |
| `frontend-types` | TypeScript interfaces |
| `frontend-constants` | Runtime constants |
| `frontend-atoms` | Atomic UI primitives |
| `frontend-ux` | a11y, keyboard, loading/error/empty |
| `frontend-translator` | i18n locale files |
| `frontend-storybook` | Storybook stories |
| `frontend-endpoints` | Axios API layer |
| `frontend-websockets` | SignalR real-time |
| `frontend-first-validator` | Door 1 build gate |
| `frontend-organizator` | Folder structure audit |
| `frontend-data-testid-checker` | data-* attribute audit |
| `test-flow-orchestrator` | Door 2A live browser |
| `e2e-orchestrator` | Door 2B Playwright replay |
| `e2e-dev` | New E2E spec |
| `e2e-plan` | Plan E2E test |
| `e2e-run` | Run E2E suite |
| `e2e-explore` | Exploratory QA |
| `tdd-vitest-planner` | Test plan from phases.json |
| `tdd-vitest-executor` | RED-GREEN-REFACTOR cycle |
| `kraken-planner` | plan.md + phases.json |
| `kraken-researcher` | Context gathering |
| `kraken-pre-commit-validator` | Door 3 pre-commit |
| `mythkraken-validator` | Task-done gate |
| `pr-expert` | Cherry-pick + PR |
| `dogfood` | Exploratory QA |
| `spike` | Throwaway experiments |
| `flow-test-builder` | Generates validator+auditor pairs |
| `flow-quick-article-validator` | Quick article live validator |
| `flow-quick-article-auditor` | Quick article auditor |
| `repomix-updater` | Background pack refresh |
| `task-ingestion` | External → kanban bridge |
| `folder-architect` | Atomic design pre-flight |
| `code-rot-scan` | Dead code scanner |
| `code-rot-clean` | Dead code cleaner |
| `requesting-code-review` | Pre-commit review |
| `systematic-debugging` | 4-phase debug |
| `python-debugpy` | Python DAP debugging |
| `node-inspect-debugger` | Node.js debugging |
| `plan` | Plan mode (no exec) |
| `writing-plans` | Implementation plans |
| `subagent-driven-development` | Subagent orchestration |
| `test-driven-development` | TDD methodology |
| `github-auth` | GitHub credentials setup |
| `github-issues` | GitHub issue management |
| `github-code-review` | PR diffs and comments |
| `github-pr-workflow` | Full PR lifecycle |
| `github-repo-management` | Clone/fork/releases |
| `codebase-inspection` | LOC and metrics analysis |
| `notion` | Notion API integration |
| `linear` | Linear project management |
| `airtable` | Airtable REST API |
| `google-workspace` | Gmail/Calendar/Drive |
| `powerpoint` | .pptx automation |
| `maps` | OpenStreetMap services |
| `nano-pdf` | Lightweight PDF editing |
| `ocr-and-documents` | Text extraction from PDFs |
| `arxiv` | Academic paper discovery |
| `polymarket` | Prediction market data |
| `blogwatcher` | RSS/Atom feed monitoring |
| `llm-wiki` | LLM knowledge base |
| `research-paper-writing` | Research assistant |
| `spotify` | Spotify playback control |
| `youtube-content` | YouTube transcript processing |
| `gif-search` | GIF search and download |
| `heartmula` | AI music generation |
| `songsee` | Audio feature analysis |
| `huggingface-hub` | HF model/dataset access |
| `kanban-orchestrator` | Kanban pipeline orchestration |
| `kanban-worker` | Kanban task execution |
| `webhook-subscriptions` | Webhook event-driven runs |
| `agent-browser` | Browser automation |
| `mythkraken-browser-agent` | MythKraken browser patterns |
| `browser-validation-agent` | UI state verification |
| `kraken-database` | MySQL test data |
| `external-claude-runner` | Spawn Claude CLI sessions |
| `hermes-agent-skill-authoring` | Create Hermes skills |
| `kraken-fullsite-qa` | Full 8-hour QA session |
| `yuanbao` | Yuanbao group messaging |

---

## 7. Sync rule

`AGENTS.md` and `CLAUDE.md` are kept identical. When you edit one, copy to the other:

```bash
cp /var/www/kraken/AGENTS.md /var/www/kraken/CLAUDE.md
cp /var/www/kraken/AGENTS.md /var/www/kraken/Dashboard/AGENTS.md
cp /var/www/kraken/AGENTS.md /var/www/kraken/Dashboard/CLAUDE.md
```