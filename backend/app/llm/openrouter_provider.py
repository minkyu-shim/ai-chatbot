from typing import AsyncIterator

from openai import AsyncOpenAI

from app.llm.base import MessageDict


class OpenRouterProvider:
    def __init__(self, api_key: str, model: str, base_url: str) -> None:
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY is not set. Add it to .env or the environment.")
        self._model = model
        self._client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url.rstrip("/") + "/",
        )

    async def stream_chat(self, messages: list[MessageDict]) -> AsyncIterator[str]:
        # Use the unified `create(..., stream=True)` pattern (returns an
        # AsyncStream of ChatCompletionChunk). The OpenAI SDK does expose
        # a higher-level `.stream()` helper, but its event objects have a
        # different shape — sticking to `create(stream=True)` keeps Groq and
        # OpenRouter providers symmetrical and lets them share the chunk-shape
        # contract `chunk.choices[0].delta.content`.
        stream = await self._client.chat.completions.create(
            model=self._model,
            messages=messages,  # type: ignore[arg-type]
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content is not None:
                yield chunk.choices[0].delta.content
