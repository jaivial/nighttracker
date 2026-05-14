# Plan: Hermes as 24/7 Kronos Pipeline Orchestrator

## Architecture

```
Cortex frontend (browser)
  ↓ POST /api/submit
Kronos SDK (port 8199)
  ├─ creates flow in sqlite
  └─ POST webhook → Hermes gateway endpoint
        ↓
Hermes (one task at a time, serial)
  ├─ reads prompt from sqlite
  ├─ decides which agents needed
  ├─ for each agent:
  │   ├─ generate MCP config (reuse build_mcp_config)
  │   ├─ spawn claude/claudio -p
  │   ├─ poll for completion (stdout/exit code)
  │   ├─ read result from sqlite
  │   └─ POST webhook → Cortex automations API
  └─ marks flow done/failed
```

## Trigger: webhook, not polling

When a user submits a task, the kronos SDK creates the sqlite row then
POSTs to a Hermes webhook endpoint. Hermes has a webhook subscription
that fires a cron run on each submission. The run picks the oldest
`received` task, processes it serially, and returns.

The cron wrapper is still useful for:
- Health checks (recover orphaned tasks after crash)
- Periodic sweeps (catch tasks that never got a webhook)

## Serial execution: one task at a time

Hermes uses a lock ("hermes-kronos-orchestrator") so only one task
flow runs at any moment. When a webhook arrives while Hermes is busy,
the task stays in sqlite as `received` and gets picked up when the
current flow finishes.

## Hermes decision logic

Hermes reads the task prompt + available tools and decides:

```
IF prompt is simple (1-2 files, UI-only, no API):
  → skip wide_research
  → executor directly

IF prompt is complex (cross-module, backend+frontend, new feature):
  → wide_research (claudio + wide-researcher MCP)
  → read research_context from sqlite artifact
  → IF research reveals unexpected scope:
      prompt_enhancer → planner → per-phase executors
    ELSE (research says "already done" or "trivial"):
      skip to done
  → validator_1 (build check with tsc/dotnet)
  → IF build fails:
      fix → re-validate (up to 3 retries)
  → validator_2 (browser test with agent-browser)
```

Hermes is not forced to run all 6 steps. It reads sqlite after each
agent and decides what to do next. It can skip, reorder, retry, or
even create new agent types on the fly.

## Implementation files

New in qabot/python/:

| File | Purpose |
|---|---|
| `kronos_hermes_webhook.py` | FastAPI endpoint: receive webhook → enqueue task |
| `kronos_hermes_engine.py` | Main loop: pick task → decide → spawn → monitor → report |
| `kronos_agent_runner.py` | Spawn claude/claudio subprocess with MCP config, return result |
| `kronos_hermes_cron.py` | Cron/scheduled sweeper: reclaim orphaned tasks |

Reused from existing:

| File | Used for |
|---|---|
| `kronos_automations.py` | Webhook POSTs to Cortex, pipeline JSON storage |
| `kronos_db.py` | SQLite read/write (flows, steps, artifacts) |
| `kronos_spawner.py` | build_mcp_config(), role prompts, AgentSpawnConfig |
| `kronos_config.py` | PIPELINE_STEPS, AGENT_DEFAULTS |

## Deployment

1. Two systemd services:
   - `kronos-pipeline.service` — the HTTP SDK (already running)
   - `kronos-hermes.service` — Hermes orchestrator engine

2. Or a single cron job that checks for orphaned tasks every 5 min

3. Webhook subscription in Hermes:
   ```yaml
   webhooks:
     kronos-task-submitted:
       url: /api/webhooks/kronos-task
       script: kronos_hermes_engine.py
   ```
