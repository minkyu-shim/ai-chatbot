"""LLM provider benchmark.

Usage (from repo root):
    cd /path/to/semester-project
    python scripts/benchmark.py

Requires GROQ_API_KEY and/or OPENROUTER_API_KEY in backend/.env.
Missing keys: that provider is skipped with a warning.
"""
import asyncio
import csv
import os
import sys
import time
from pathlib import Path
from statistics import median

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

# Load backend/.env so settings pick up API keys
from dotenv import load_dotenv
load_dotenv(REPO_ROOT / "backend" / ".env")

from app.config import get_settings
from app.llm import factory as llm_factory

SYSTEM_PROMPT = (
    "You are a personal outfit & mood diary assistant. "
    "Suggest ONE concrete outfit for the user based on the weather and their mood. "
    "Be specific, practical, two or three short sentences. Plain prose, no bullets."
)
USER_PROMPT = (
    "City: Paris. Weather: 12°C, overcast clouds, humidity 78%. "
    "Mood: tired. What should I wear today?"
)
MESSAGES = [
    {"role": "system", "content": SYSTEM_PROMPT},
    {"role": "user", "content": USER_PROMPT},
]
RUNS_PER_PROVIDER = 3
PROVIDERS = ["groq", "openrouter"]

OUTPUT_CSV = REPO_ROOT / "scripts" / "benchmark-results.csv"


async def run_once(provider) -> dict:
    """Run one benchmark pass against the given provider instance.

    Returns a dict with ttft_ms, total_ms, output_chars,
    output_tokens_approx, and output.
    """
    chunks = []
    ttft_ms = None

    start = time.perf_counter()
    # stream_chat is an async generator (async def + yield), so iterate directly.
    async for chunk in provider.stream_chat(MESSAGES):
        if ttft_ms is None:
            ttft_ms = (time.perf_counter() - start) * 1000
        chunks.append(chunk)
    total_ms = (time.perf_counter() - start) * 1000

    output = "".join(chunks)
    return {
        "ttft_ms": round(ttft_ms or 0, 1),
        "total_ms": round(total_ms, 1),
        "output_chars": len(output),
        "output_tokens_approx": len(output.split()),
        "output": output,
    }


def _get_api_key(provider_name: str) -> str:
    """Return the API key for the given provider from current settings."""
    settings = get_settings()
    if provider_name == "groq":
        return settings.groq_api_key
    if provider_name == "openrouter":
        return settings.openrouter_api_key
    return ""


def _get_model(provider_name: str) -> str:
    """Return the model name for the given provider from current settings."""
    settings = get_settings()
    if provider_name == "groq":
        return settings.groq_model
    if provider_name == "openrouter":
        return settings.openrouter_model
    return "unknown"


async def benchmark_provider(provider_name: str) -> list[dict]:
    """Run RUNS_PER_PROVIDER passes for one provider. Returns list of result dicts."""
    os.environ["LLM_PROVIDER"] = provider_name
    get_settings.cache_clear()
    llm_factory.reset_provider()

    api_key = _get_api_key(provider_name)
    if not api_key:
        print(f"[skip] {provider_name}: missing key")
        return []

    model = _get_model(provider_name)
    provider = llm_factory.get_provider()

    results = []
    for run_idx in range(RUNS_PER_PROVIDER):
        print(f"  [{provider_name}] run {run_idx + 1}/{RUNS_PER_PROVIDER} ...", end=" ", flush=True)
        try:
            result = await run_once(provider)
        except Exception as exc:
            print(f"ERROR: {exc}")
            continue
        print(f"ttft={result['ttft_ms']:.0f}ms  total={result['total_ms']:.0f}ms")
        results.append({
            "provider": provider_name,
            "run_idx": run_idx,
            "model": model,
            **result,
        })

    return results


def write_csv(all_results: list[dict]) -> None:
    """Write all benchmark results to CSV."""
    fieldnames = [
        "provider", "run_idx", "model",
        "ttft_ms", "total_ms", "output_chars", "output_tokens_approx",
        "output_excerpt",
    ]
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in all_results:
            writer.writerow({
                "provider": row["provider"],
                "run_idx": row["run_idx"],
                "model": row["model"],
                "ttft_ms": row["ttft_ms"],
                "total_ms": row["total_ms"],
                "output_chars": row["output_chars"],
                "output_tokens_approx": row["output_tokens_approx"],
                "output_excerpt": row["output"][:140],
            })
    print(f"\nResults written to {OUTPUT_CSV}")


def print_summary(all_results: list[dict]) -> None:
    """Print a markdown summary table grouped by provider."""
    # Group by provider
    by_provider: dict[str, list[dict]] = {}
    for row in all_results:
        by_provider.setdefault(row["provider"], []).append(row)

    print("\n## Benchmark Summary\n")
    header = "| Provider | Model | Runs | Median TTFT (ms) | Median Total (ms) | Avg output (chars) |"
    separator = "|---|---|---|---|---|---|"
    print(header)
    print(separator)

    for provider_name, rows in by_provider.items():
        model = rows[0]["model"]
        runs = len(rows)
        median_ttft = median(r["ttft_ms"] for r in rows)
        median_total = median(r["total_ms"] for r in rows)
        avg_chars = sum(r["output_chars"] for r in rows) / runs
        print(
            f"| {provider_name} | {model} | {runs} "
            f"| {median_ttft:.0f} | {median_total:.0f} | {avg_chars:.0f} |"
        )


async def main() -> None:
    all_results = []
    for provider_name in PROVIDERS:
        print(f"\nBenchmarking {provider_name}...")
        results = await benchmark_provider(provider_name)
        all_results.extend(results)

    if not all_results:
        print("\nNo results collected — check that at least one API key is set in backend/.env.")
        return

    write_csv(all_results)
    print_summary(all_results)


if __name__ == "__main__":
    asyncio.run(main())
