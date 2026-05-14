# Project Kronos — Autonomous LLM Trainer
## Mission: Train a coding-specialized LLM with Claude Opus 4.6-level benchmarks
**Target specs:** $1/M tokens output, 2M context, 150-200 tok/s throughput
**Starting budget:** €100
**Starting date:** 2026-05-09
**Operator:** Hermes Agent (Jaime Billanueba)

---

## Executive Summary

A pure CPU/ephemeral-GPU strategy. No local GPU available, so:
- **Training** = free Google Colab + Kaggle GPU hours (no cost)
- **Serving/Inference** = llama.cpp + quantisation on CPU (Ryzen 9 7950X3D = fast enough)
- **Scaling** = rent GPU by-the-minute only when needed, always stay under budget

The plan treats $1/M output token as the PRODUCT goal, not just the operational cost —
it means we need to build a model that's actually GOOD (competitive with Claude Opus 4.6 on coding)
so someone would PAY $1/M to use it instead of free options.

---

## Phase 0 — Foundation (Days 1-7)
### Setup email reporting pipeline
- Configure Hermes cron to send daily report to jaimevillalcon@hotmail.com
- Email contains: EUR remaining, actions taken, results, next steps
- Use ReportLab (already installed) for PDF attachments with charts

### Setup Claude Code orchestration
- Create CLAUDE.md with project context in /var/www/kraken/Kronos/
- Create Claude Code agent skills for each role
- Configure tmux-based Claude Code spawning from Hermes

### Network intelligence gathering
- Scrape available free GPU offerings (Colab Pro, Kaggle, Paperspace, etc.)
- Track which free tiers are available and usable
- Document all free LLM API tiers usable for inference

### Repository setup
- Create /var/www/kraken/Kronos/ as project root
- Initialize GitHub repo for model weights and training code
- Setup HuggingFace organization and dataset repos

---

## Phase 1 — Base Model Selection (Days 3-14)
### Research & select base model candidates
Models ranked by Viability for 100€ budget:

| Rank | Model | Params | Why viable |
|------|-------|--------|------------|
| 1 | Qwen2.5-0.5B | 0.5B | Fine-tunable in 1 Colab session |
| 2 | TinyLlama-1.1B | 1.1B | Proven, active community |
| 3 | Phi-2 | 2.7B | Microsoft research, good coding |
| 4 | Qwen2.5-1.5B | 1.5B | Good quality, still Colab-feasible |
| 5 | CodeQwen1.5-7B | 7B | Needs A100 (expensive), fallback plan |

### Benchmark base models
- Use agent-browser to run HumanEval benchmarks via API
- Use OpenRouter free tiers or direct API calls
- Establish baseline scores for comparison

### Cost model validation
- Calculate actual cost to serve 1M tokens via llama.cpp on CPU
- Model the revenue needed to break even at $1/M
- Establish target: model must be good enough to attract paying users

---

## Phase 2 — Data Acquisition (Days 7-30)
### Free data sources for coding-specialized training:
1. **The Stack** (HuggingFace) — 300GB+ code, permissive license
2. **Google BigQuery** — GitHub public data (free tier)
3. **Kaggle datasets** — pre-processed code datasets
4. **LeetCode** — scrape problem/answer pairs
5. **GitHub** — clone high-star repos for code patterns

### Data pipeline
```
Scraper agents (tmux/Claude Code)
    → Raw data (JSONL)
    → Deduplication + filtering
    → Python preprocessing
    → HuggingFace dataset push
```

### Filter for coding quality:
- Remove boilerplate-heavy files
- Keep functions with docstrings
- Prefer repositories with tests
- Score by test-coverage ratio

---

## Phase 3 — Training (Days 14-60+)
### Strategy: Colab-free-first, burst GPU rental as backup

#### Training approach (Unsloth for speed):
```bash
# Unsloth trains 2-5x faster, 50% less VRAM
# Qwen2.5-0.5B fits in free Colab T4 (16GB VRAM)
# Qwen2.5-1.5B fits in Colab A100 (paid, ~$0.60/hr)

model = Qwen2.5-0.5B-Instruct
dataset = curated coding subset (1M-5M tokens)
method = LoRA/QLoRA (4-bit, minimal GPU needed)
training = Unsloth + TRL on Colab
output = adapter weights + merged model
```

#### Cloud GPU budget allocation:
| Spend/month | Provider | GPU | Hours/day | Notes |
|------------|----------|-----|-----------|-------|
| €0 (free) | Google Colab | T4 | 12-24 | Rotating sessions |
| €0 (free) | Kaggle | T4 | 12 | Weekly quota |
| €5-10 | Lambda Labs | RTX 4000 | 2-4 hrs/day | Only if Colab exhausted |
| €3-5 | Vast.ai | Various | Burst | Emergency only |

#### Training rounds:
1. **Round 1:** Qwen2.5-0.5B on Colab — establish pipeline
2. **Round 2:** TinyLlama-1.1B — test at 1B scale
3. **Round 3:** Qwen2.5-1.5B — quality jump if budget allows
4. **Round 4:** Merge best adapters, quantize to GGUF

---

## Phase 4 — Inference Optimization (Days 30-90+)
### llama.cpp CPU serving on Ryzen 9 7950X3D

The 7950X3D has:
- 16 cores / 32 threads
- 23GB RAM
- Large cache (3D V-Cache on CCD0)

Projected throughput with Q4量化：
| Model | Quant | Threads | tok/s (estimated) |
|-------|-------|---------|-------------------|
| Qwen2.5-0.5B | Q4_K_M | 16 | 80-120 |
| Qwen2.5-1.5B | Q4_K_M | 16 | 40-60 |
| TinyLlama-1.1B | Q4_K_M | 16 | 60-90 |

For 150-200 tok/s target: use speculative decoding or ensemble
- Primary: small fast model (0.5B Q4)
- Draft: even smaller draft model
- Or: use small model + caching for perceived speed

### Cost optimization for $1/M output:
```
Assumptions for profitability at $1/M:
- Server: Ryzen 7950X3D (one-time €400 hardware, or current VM)
- Electricity: ~€0.10/kWh, 150W idle → negligible
- Bandwidth: included in current setup

Revenue at $1/M tokens:
- 150 tok/s × 86,400 s/day × 30 days = 388M tokens/month
- At $1/M = $388/month = ~€355

This means: if the model serves 388M tokens/month,
it BREAKS EVEN on a €355/month server cost.
At current setup (systemd services already running), marginal cost ≈ €0.
```

---

## Phase 5 — Benchmarking & Iteration (Ongoing)
### HumanEval benchmark targets:
- Base: 30-40% (random small model)
- After fine-tuning: target 55-70% (coding-specialized)
- Goal: match Claude Opus 4.6 level (~90% on HumanEval)

### Benchmarking infrastructure:
- agent-browser MCP to run LiveBench / EvalPlus
- OpenRouter API for baseline comparison
- Daily automated benchmark runs

### Iterative improvement loop:
```
benchmark() → identify weaknesses → retrain on gap data →
re-benchmark → quality check → if good → publish
```

---

## Agent Architecture (tmux-based Claude Code orchestration)

### Agent Roles:
```
┌─────────────────────────────────────────────────────────┐
│  kronos-commander (Hermes main controller)              │
│  - Decides daily priorities                             │
│  - Spawns tmux Claude Code agents                      │
│  - Reports to jaimebillanueba@... via email           │
└────────────────────┬──────────────────────────────────┘
                     │
     ┌───────────────┼──────────────────┐
     ▼               ▼                  ▼
kronos-researcher  kronos-trainer   kronos-scaler
(skills scout)     (fine-tuning)    (benchmarking + ops)
     │               │                  │
     └───────────────┼──────────────────┘
                     │
                     ▼
           kronos-scorer (daily benchmarks)
                     │
                     ▼
           kronos-reporter (email summary)
```

### Each agent = tmux session + Claude Code print-mode
- Spawned by Hermes via `terminal(command="tmux new-session...")`
- Resume capability via `--continue` flag
- Inter-process communication via shared file system

---

## Skills to Create for Hermes

1. **`kronos-researcher`** — Monitor free GPU credits, API tiers, model releases
2. **`kronos-trainer`** — Orchestrate Colab/Kaggle fine-tuning runs
3. **`kronos-scorer`** — Run automated benchmarks via agent-browser
4. **`kronos-reporter`** — Generate daily PDF reports via email
5. **`kronos-scaler`** — Monitor costs, optimize inference, manage burst GPU spend

---

## Daily Cron Schedule (Hermes)

| Time | Job | Description |
|------|-----|-------------|
| 08:00 UTC | kronos-morning-scan | Check free GPU availability, Colab/Kaggle status |
| 10:00 UTC | kronos-benchmark | Run quick HumanEval subset |
| 14:00 UTC | kronos-training-trigger | Start/stop training jobs based on schedule |
| 18:00 UTC | kronos-evening-report | Generate daily report PDF, email to jaimebillanueba@... |
| 22:00 UTC | kronos-cost-check | Verify spend vs. budget, alert if anomalies |

---

## Budget Tracking (100€)

| Category | Allocation | Provider/Notes |
|----------|-----------|----------------|
| Cloud GPU (burst) | €60 | Lambda Labs / Vast.ai — only when Colab exhausted |
| Data storage | €10 | HuggingFace Pro (1TB), or self-hosted |
| API services | €10 | OpenRouter for baseline benchmarks |
| Contingency | €20 | Emergency compute, new opportunities |
| **Total** | **€100** | |

**Target end-state:** Model serving at $1/M → self-sustaining via user revenue

---

## Key Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Colab gets detected and banned | Medium | Use Kaggle as backup; rotate accounts |
| Model quality too low for users | High | Iterate fast; use RLHF if budget allows |
| Can't hit 150 tok/s on CPU | Low | Speculative decoding; smaller batches |
| Run out of free GPU credits | High | Pre-register multiple Colab/Kaggle accounts |
| Kaggle/GH issues with ToS | Medium | Use only permissively-licensed data |

---

## Next Actions (Priority Order)

### Day 1 (TODAY):
1. [ ] Create /var/www/kraken/Kronos/ directory structure
2. [ ] Create Hermes skills: kronos-researcher, kronos-reporter
3. [ ] Configure daily email cron job (18:00 UTC)
4. [ ] Write Claude Code agent prompts for kronos-researcher
5. [ ] Test email delivery from jaimevillalcon@hotmail.com SMTP
6. [ ] Verify credit card credentials (PENDING from Jaime)
7. [ ] Setup Colab/Kaggle accounts if not already done

### Day 2-3:
8. [ ] Run first benchmark baseline on candidate models
9. [ ] Begin data acquisition pipeline
10. [ ] Write kronos-trainer skill
11. [ ] Setup first Colab fine-tuning notebook

### Week 1:
12. [ ] First fine-tuned model (Qwen2.5-0.5B)
13. [ ] First llama.cpp inference test
14. [ ] First benchmark improvement measurement
15. [ ] First revenue test (deploy and offer $1/M)

---

## Success Metrics

| Metric | Day 0 | Day 30 | Day 60 | Day 90 |
|--------|-------|--------|--------|--------|
| HumanEval | 28% (base) | 40% | 55% | 70%+ |
| Context window | 32K | 128K | 512K | 2M |
| Throughput (tok/s) | N/A | 40 | 80 | 150+ |
| Cost to serve | N/A | <$5/M | <$2/M | $1/M |
| Budget remaining | €100 | ~€70 | ~€40 | ~€10 |
| Revenue (if any) | €0 | €0 | TBD | TBD |

---

## Architecture Diagram

```
INTERNET
    │
    ├─ Google Colab (free T4 GPU)
    │      └─ Unsloth fine-tuning
    │          └─ Adapter weights → HuggingFace
    │
    ├─ Kaggle (free weekly GPU)
    │      └─ Additional training rounds
    │
    ├─ This VM: 7950X3D (llama.cpp serving)
    │      ├─ Qwen2.5-0.5B-Q4_K_M → 80-120 tok/s
    │      ├─ Speculative decoding → 150+ tok/s
    │      └─ REST API → users pay $1/M
    │
    └─ Hermes (systemd, 24/7)
           ├─ Daily cron jobs
           ├─ Claude Code agents (tmux)
           └─ Email reports → jaimebillanueba@gmail.com
```

---

*Plan version: 1.0 — Created 2026-05-09*
*Next update: After Day 1 execution*
