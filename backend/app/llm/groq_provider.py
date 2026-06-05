from typing import AsyncIterator

from groq import AsyncGroq

from app.llm.base import MessageDict


class GroqProvider:
    def __init__(self, api_key: str, model: str) -> None:
        if not api_key:
            raise ValueError("GROQ_API_KEY is not set. Add it to .env or the environment.")
        self._model = model
        self._client = AsyncGroq(api_key=api_key)

    async def stream_chat(self, messages: list[MessageDict]) -> AsyncIterator[str]:
        # The Groq SDK does not expose a `.stream()` context manager; the supported
        # streaming entry point is `create(..., stream=True)` which returns an
        # AsyncStream[ChatCompletionChunk]. Each chunk's `choices[0].delta.content`
        # is the next token (or None on role/finish chunks — skip those).
        stream = await self._client.chat.completions.create(
            model=self._model,
            messages=messages,  # type: ignore[arg-type]
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content is not None:
                yield chunk.choices[0].delta.content
