"""Tests for the LLM provider abstraction (M4).

All tests use mocked SDKs — no real API calls are made.
"""
import pytest
from unittest.mock import MagicMock, patch

from app.llm.base import LLMProvider, MessageDict
from app.llm.factory import get_provider, reset_provider
from app.llm.groq_provider import GroqProvider
from app.llm.openrouter_provider import OpenRouterProvider


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _aiter(items):
    """Async generator that yields items from a list."""
    for item in items:
        yield item


def _make_chunk(content):
    """Build a minimal mock chunk object matching the SDK shape."""
    delta = MagicMock()
    delta.content = content
    choice = MagicMock()
    choice.delta = delta
    chunk = MagicMock()
    chunk.choices = [choice]
    return chunk


def _make_async_stream(chunks):
    """Return a coroutine that, when awaited, yields an async iterator of chunks.

    Mirrors the real SDK contract: `await client.chat.completions.create(..., stream=True)`
    returns an `AsyncStream` you can `async for` over.
    """
    async def _coro(*args, **kwargs):
        return _aiter(chunks)
    return _coro


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def isolate_provider():
    """Reset the factory singleton before and after every test."""
    reset_provider()
    yield
    reset_provider()


# ---------------------------------------------------------------------------
# GroqProvider tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_groq_streams_non_none_content():
    """GroqProvider yields only chunks where content is not None."""
    chunks = [
        _make_chunk("Hello"),
        _make_chunk(None),   # should be skipped
        _make_chunk(", "),
        _make_chunk("world"),
    ]

    with patch("app.llm.groq_provider.AsyncGroq") as mock_groq_cls:
        mock_client = MagicMock()
        mock_groq_cls.return_value = mock_client
        mock_client.chat.completions.create = _make_async_stream(chunks)

        provider = GroqProvider(api_key="test-key", model="llama-3.1-8b-instant")
        result = []
        async for token in provider.stream_chat([{"role": "user", "content": "Hi"}]):
            result.append(token)

    assert result == ["Hello", ", ", "world"]


def test_groq_raises_on_empty_api_key():
    """GroqProvider raises ValueError when api_key is empty."""
    with pytest.raises(ValueError, match="GROQ_API_KEY"):
        GroqProvider(api_key="", model="llama-3.1-8b-instant")


# ---------------------------------------------------------------------------
# OpenRouterProvider tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_openrouter_streams_non_none_content():
    """OpenRouterProvider yields only chunks where content is not None."""
    chunks = [
        _make_chunk("Hi"),
        _make_chunk(None),   # should be skipped
        _make_chunk(" there"),
    ]

    with patch("app.llm.openrouter_provider.AsyncOpenAI") as mock_openai_cls:
        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client
        mock_client.chat.completions.create = _make_async_stream(chunks)

        provider = OpenRouterProvider(
            api_key="test-key",
            model="openai/gpt-4o-mini",
            base_url="https://openrouter.ai/api/v1",
        )
        result = []
        async for token in provider.stream_chat([{"role": "user", "content": "Hey"}]):
            result.append(token)

    assert result == ["Hi", " there"]


def test_openrouter_raises_on_empty_api_key():
    """OpenRouterProvider raises ValueError when api_key is empty."""
    with pytest.raises(ValueError, match="OPENROUTER_API_KEY"):
        OpenRouterProvider(api_key="", model="openai/gpt-4o-mini", base_url="https://openrouter.ai/api/v1")


# ---------------------------------------------------------------------------
# Factory tests
# ---------------------------------------------------------------------------

def _mock_settings(provider: str, **kwargs):
    """Build a mock Settings object with sensible defaults."""
    s = MagicMock()
    s.llm_provider = provider
    s.groq_api_key = kwargs.get("groq_api_key", "fake-groq-key")
    s.groq_model = kwargs.get("groq_model", "llama-3.1-8b-instant")
    s.openrouter_api_key = kwargs.get("openrouter_api_key", "fake-or-key")
    s.openrouter_model = kwargs.get("openrouter_model", "openai/gpt-4o-mini")
    s.openrouter_base_url = kwargs.get("openrouter_base_url", "https://openrouter.ai/api/v1")
    return s


def test_get_provider_returns_groq_instance():
    """get_provider() with llm_provider='groq' returns a GroqProvider."""
    with patch("app.llm.factory.get_settings", return_value=_mock_settings("groq")):
        with patch("app.llm.groq_provider.AsyncGroq"):
            provider = get_provider()
    assert isinstance(provider, GroqProvider)


def test_get_provider_returns_openrouter_instance():
    """get_provider() with llm_provider='openrouter' returns an OpenRouterProvider."""
    with patch("app.llm.factory.get_settings", return_value=_mock_settings("openrouter")):
        with patch("app.llm.openrouter_provider.AsyncOpenAI"):
            provider = get_provider()
    assert isinstance(provider, OpenRouterProvider)


def test_get_provider_raises_on_unknown_provider():
    """get_provider() raises ValueError for an unrecognised provider name."""
    with patch("app.llm.factory.get_settings", return_value=_mock_settings("anthropic")):
        with pytest.raises(ValueError, match="Unknown LLM_PROVIDER"):
            get_provider()


def test_get_provider_singleton():
    """Calling get_provider() twice returns the same object."""
    with patch("app.llm.factory.get_settings", return_value=_mock_settings("groq")):
        with patch("app.llm.groq_provider.AsyncGroq"):
            p1 = get_provider()
            p2 = get_provider()
    assert p1 is p2


def test_reset_provider_clears_singleton():
    """After reset_provider(), the next get_provider() call creates a fresh instance."""
    with patch("app.llm.factory.get_settings", return_value=_mock_settings("groq")):
        with patch("app.llm.groq_provider.AsyncGroq"):
            p1 = get_provider()
            reset_provider()
            p2 = get_provider()
    assert p1 is not p2


# ---------------------------------------------------------------------------
# Protocol runtime check
# ---------------------------------------------------------------------------

def test_groq_provider_satisfies_llm_protocol():
    """GroqProvider satisfies the LLMProvider Protocol at runtime."""
    with patch("app.llm.groq_provider.AsyncGroq"):
        provider = GroqProvider(api_key="test-key", model="llama-3.1-8b-instant")
    assert isinstance(provider, LLMProvider)
