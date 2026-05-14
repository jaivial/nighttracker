# Plan: Hermes as 24/7 Kronos Pipeline Orchestrator

## Vision

Replace the hardcoded 6-step SDK pipeline with Hermes as an autonomous
orchestrator. Hermes reads each submitted task, decides which agents are
needed, spawns claude/claudio sessions on demand, monitors their output,
and reports progress to Cortex via the automations webhook API.

Hermes does NOT write code or do research itself — it only orchestrates
claude/claudio subprocesses and reads their results from sqlite.

---

## Phase 1 — Cron-based orchestrator (24/7 loop)

A cron job running every 30 seconds polls the kronos sqlite DB for new
tasks with status='received'. For each one:

1. Marks status → 'researching', sends task.started webhook
2. Reads the prompt
3. Decides which agents to spawn and in what order
4. For each agent: spawns claude/claudio -p with the right MCP config
5. Polls for completion by checking agent stdout/exit
6. Reports progress via automations webhook
7. On completion: marks flow as 'done' or 'failed'

File: `~/.hermes/scripts/kronos-orchestrator.sh` or `.py`

---

## Phase 2 — Agent definitions (5 agents)

Each agent is a claude/claudio -p invocation with role-specific prompt
and MCP tools:

| Agent | Binary | MCP tools | Prompt source |
|---|---|---|---|
| wide_research | claudio (minimax) | wide-researcher (wr_* tools) | agent_spawner.py ROLE_PROMPTS |
| prompt_enhancer | claudio (minimax) | sqlite + agent_mcp | agent_spawner.py |
| planner | claudio (minimax) | sqlite + agent_mcp + wide-researcher | agent_spawner.py |
| executor | claude or claudio | filesystem + sqlite | agent_spawner.py |
| validator | claude or claudio | agent-browser + sqlite | agent_spawner.py |

MCP configs are generated per-agent (already done in build_mcp_config).

---

## Phase 3 — Hermes decision logic

Hermes reads the task and decides:

```
IF prompt is simple (1-2 files, no API changes):
  → skip wide_research, go direct to executor

IF prompt is complex (cross-module, backend+frontend):
  → wide_research → read research_context
  → prompt_enhancer → read enhanced_prompt
  → planner → read plan phases
  → for each phase: spawn executor
  → validator_1 (build check)
  → IF build passes: validator_2 (browser test)
  → IF build fails: fix → re-validate
```

Hermes reads sqlite step results after each agent completes to decide
the next action. It can skip, reorder, or retry based on results.

---

## Phase 4 — WebSocket notifications to Cortex

After each agent completes, Hermes calls the automations webhook API:

- task.node_entered → current step name
- log → agent output summary
- task.finished → on completion

This makes the pipeline visible in the Cortex automations Live tab.

---

## Phase 5 — Implementation files

New files in qabot/python/:

| File | Purpose |
|---|---|
| `kronos_hermes_orchestrator.py` | Main loop: poll DB → decide → spawn → monitor → report |
| `kronos_agent_runner.py` | Spawn a claude/claudio subprocess with MCP config |
| `kronos_hermes_cron.sh` | Shell wrapper for the cron job |

Existing files reused:

| File | Reused for |
|---|---|
| `kronos_automations.py` | Webhook + pipeline JSON storage |
| `kronos_db.py` | SQLite read/write |
| `kronos_spawner.py` | MCP config generation, role prompts |
| `kronos_config.py` | Pipeline step definitions |

---

## Phase 6 — Deployment

1. Create systemd service `kronos-hermes-orchestrator.service`
2. Or a cron job: `* * * * * hermes cron run kronos-orchestrator`
3. The old `kronos-pipeline.service` can be kept for backward compat
   or phased out once Hermes proves stable

---

## Architecture flow

```
Cortex frontend (browser)
  ↓ POST /api/submit
Kronos SDK (port 8199) — creates flow in sqlite
  ↓
Hermes orchestrator (cron) — polls sqlite every 30s
  ↓ reads prompt
  ↓ decides which agents needed
  ↓ for each agent:
      ├─ generate MCP config
      ├─ spawn claude/claudio -p
      ├─ poll for completion
      ├─ read result from sqlite
      └─ POST webhook to Cortex automations API
  ↓
Cortex frontend — LiveTasksPanel shows real-time updates
```
