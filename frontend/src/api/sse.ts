// SSE stream parser — works with fetch + ReadableStream (NOT EventSource).
// EventSource cannot send Authorization headers, so we use fetch instead.

export type SSEEvent =
  | { event: "meta"; data: { weather: unknown; photo_url: string | null } }
  | { event: "token"; data: string }
  | { event: "done"; data: { message_id: number } }
  | { event: "error"; data: { detail: string } };

/**
 * Async generator that reads an SSE response body chunk-by-chunk,
 * buffers partial lines, splits on double-newline event boundaries,
 * and yields typed SSEEvent objects.
 */
export async function* parseSSEStream(response: Response): AsyncGenerator<SSEEvent, void, void> {
  if (!response.ok) {
    let detail = `SSE request failed: HTTP ${response.status}`;
    try {
      const json = await response.json();
      if (json?.detail) detail = String(json.detail);
    } catch { /* ignore — keep default message */ }
    throw new Error(detail);
  }
  if (!response.body) throw new Error("SSE response has no body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      // stream: true tells the decoder this chunk may be mid-character
      buffer += decoder.decode(value, { stream: true });

      // SSE events are delimited by blank lines (\n\n)
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const parsed = parseEventBlock(rawEvent);
        if (parsed) yield parsed;
        boundary = buffer.indexOf("\n\n");
      }
    }

    // Flush any remaining buffered data after the stream closes
    const tail = buffer.trim();
    if (tail) {
      const parsed = parseEventBlock(tail);
      if (parsed) yield parsed;
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Parse a single SSE event block (the text between two \n\n delimiters).
 * Extracts the `event:` type and joins all `data:` lines.
 */
function parseEventBlock(block: string): SSEEvent | null {
  let event = "";
  const dataLines: string[] = [];

  for (const rawLine of block.split("\n")) {
    // Strip trailing \r in case of \r\n line endings
    const line = rawLine.replace(/\r$/, "");
    if (line.startsWith("event: ")) event = line.slice(7);
    else if (line.startsWith("data: ")) dataLines.push(line.slice(6));
  }

  const dataStr = dataLines.join("\n");

  switch (event) {
    case "meta":
      return { event: "meta", data: JSON.parse(dataStr) };
    case "token":
      // IMPORTANT: token data is raw text — do NOT JSON.parse it
      return { event: "token", data: dataStr };
    case "done":
      return { event: "done", data: JSON.parse(dataStr) };
    case "error":
      return { event: "error", data: JSON.parse(dataStr) };
    default:
      return null;
  }
}
