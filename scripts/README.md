# scripts/

## benchmark.py

Runs the same fixed outfit-recommendation prompt against the Groq and OpenRouter LLM providers (3 runs each), measures time-to-first-token (TTFT) and total wall-clock time per run, then writes per-run results to `scripts/benchmark-results.csv` and prints a markdown summary table to stdout.

### How to run

```bash
# From the repo root
python scripts/benchmark.py
```

API keys are read from `backend/.env`. Providers whose key is blank or missing are skipped with a warning. At least one of `GROQ_API_KEY` or `OPENROUTER_API_KEY` must be set.
