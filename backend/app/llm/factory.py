from app.config import get_settings
from app.llm.base import LLMProvider

_provider: LLMProvider | None = None


def get_provider() -> LLMProvider:
    global _provider
    if _provider is not None:
        return _provider

    settings = get_settings()
    provider_name = settings.llm_provider.lower().strip()

    if provider_name == "groq":
        from app.llm.groq_provider import GroqProvider
        _provider = GroqProvider(api_key=settings.groq_api_key, model=settings.groq_model)
    elif provider_name == "openrouter":
        from app.llm.openrouter_provider import OpenRouterProvider
        _provider = OpenRouterProvider(
            api_key=settings.openrouter_api_key,
            model=settings.openrouter_model,
            base_url=settings.openrouter_base_url,
        )
    else:
        raise ValueError(
            f"Unknown LLM_PROVIDER: {provider_name!r}. Valid values: 'groq', 'openrouter'."
        )

    return _provider


def reset_provider() -> None:
    """Reset the singleton. For use in tests only."""
    global _provider
    _provider = None
