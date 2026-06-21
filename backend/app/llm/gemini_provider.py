from typing import AsyncIterator

from google import genai
from google.genai import types

from app.llm.base import MessageDict

# Default generation knobs — kept symmetric with the implicit defaults the Groq
# and OpenRouter providers rely on. Tuned for short, varied outfit suggestions.
_TEMPERATURE = 0.8
_MAX_OUTPUT_TOKENS = 1024


class GeminiProvider:
    """LLM provider backed by Google AI Studio (Gemini) via the google-genai SDK.

    The shared MessageDict contract uses OpenAI-style roles
    ("system" | "user" | "assistant"). Gemini's API differs in two ways, so this
    provider translates on the way in:
      * the system prompt is not a message — it goes in `system_instruction`;
      * the assistant role is named "model".
    """

    def __init__(self, api_key: str, model: str) -> None:
        if not api_key:
            raise ValueError("GOOGLE_API_KEY is not set. Add it to .env or the environment.")
        self._model = model
        self._client = genai.Client(api_key=api_key)

    async def stream_chat(self, messages: list[MessageDict]) -> AsyncIterator[str]:
        system_instruction, contents = _split_messages(messages)

        config = types.GenerateContentConfig(
            system_instruction=system_instruction or None,
            temperature=_TEMPERATURE,
            max_output_tokens=_MAX_OUTPUT_TOKENS,
        )

        # `client.aio` is the SDK's native async surface. The awaited call returns
        # an async iterator of chunks, so this stays non-blocking on the FastAPI
        # event loop without an asyncio.to_thread wrapper. Each chunk's `.text`
        # is the next token (or None/empty on non-text chunks — skip those).
        stream = await self._client.aio.models.generate_content_stream(
            model=self._model,
            contents=contents,
            config=config,
        )
        async for chunk in stream:
            if chunk.text:
                yield chunk.text


def _split_messages(
    messages: list[MessageDict],
) -> tuple[str, list[types.Content]]:
    """Translate OpenAI-style messages into a Gemini system_instruction + contents.

    System messages are concatenated into a single system instruction string.
    Remaining turns are mapped to Gemini Content objects with role "user" or
    "model" ("assistant" -> "model").
    """
    system_parts: list[str] = []
    contents: list[types.Content] = []

    for msg in messages:
        role = msg.get("role")
        content = msg.get("content", "")
        if role == "system":
            if content:
                system_parts.append(content)
            continue
        gemini_role = "model" if role == "assistant" else "user"
        contents.append(
            types.Content(role=gemini_role, parts=[types.Part(text=content)])
        )

    return "\n\n".join(system_parts), contents
