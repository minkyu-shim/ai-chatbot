from typing import AsyncIterator, Protocol, runtime_checkable

MessageDict = dict[str, str]


@runtime_checkable
class LLMProvider(Protocol):
    async def stream_chat(
        self,
        messages: list[MessageDict],
    ) -> AsyncIterator[str]: ...
