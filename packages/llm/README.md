# @formloom/llm

LLM integration layer for Formloom. Provides prompt fragments, tool/function definitions, a response parser, and a return-path helper.

## Installation

```bash
npm install @formloom/llm
```

## Usage with OpenAI (tool call)

```ts
import {
  FORMLOOM_SYSTEM_PROMPT,
  FORMLOOM_TOOL_OPENAI,
  parseFormloomResponse,
  formatSubmission,
  toolChoice,
} from "@formloom/llm";

const response = await openai.chat.completions.create({
  model: "gpt-5.2",
  messages: [
    { role: "system", content: `You are a helpful assistant.\n\n${FORMLOOM_SYSTEM_PROMPT}` },
    { role: "user", content: "I need to book a dentist appointment" },
  ],
  tools: [FORMLOOM_TOOL_OPENAI],
  // Force a form on this turn:
  // tool_choice: toolChoice.openai(),
});

const toolCall = response.choices[0].message.tool_calls?.[0];
if (toolCall?.function.name === "formloom_collect") {
  const result = parseFormloomResponse(toolCall.function.arguments);
  if (result.success) {
    const submitted = await renderForm(result.schema!); // your UI
    const toolMessage = formatSubmission(submitted, {
      provider: "openai",
      toolCallId: toolCall.id,
    });
    // Append `toolMessage` as the next message to continue the conversation.
  }
}
```

## Usage with Anthropic Claude (tool_use)

```ts
import {
  FORMLOOM_SYSTEM_PROMPT,
  FORMLOOM_TOOL_ANTHROPIC,
  parseFormloomResponse,
  formatSubmission,
  toolChoice,
} from "@formloom/llm";

const response = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  system: `You are a helpful assistant.\n\n${FORMLOOM_SYSTEM_PROMPT}`,
  messages: [{ role: "user", content: "I want to submit a bug report" }],
  tools: [FORMLOOM_TOOL_ANTHROPIC],
  // tool_choice: toolChoice.anthropic(),
});

const toolUse = response.content.find((block) => block.type === "tool_use");
if (toolUse?.name === "formloom_collect") {
  const result = parseFormloomResponse(toolUse.input);
  if (result.success) {
    const submitted = await renderForm(result.schema!);
    const nextUserMessage = formatSubmission(submitted, {
      provider: "anthropic",
      toolCallId: toolUse.id,
    });
    // Append as the next user message to continue.
  }
}
```

## Deterministic flows (OpenAI `response_format`)

When the model must always return a form:

```ts
import { FORMLOOM_RESPONSE_FORMAT_OPENAI } from "@formloom/llm";

const response = await openai.chat.completions.create({
  model: "gpt-5.2",
  messages: [ /* ... */ ],
  response_format: FORMLOOM_RESPONSE_FORMAT_OPENAI,
});
```

The parser accepts the raw JSON string from `response.choices[0].message.content`.

## Text-only fallback

For models without tool-calling, use `FORMLOOM_TEXT_PROMPT`. It teaches the model to emit a ```` ```formloom ```` fenced JSON block, which `parseFormloomResponse` extracts:

```ts
import { FORMLOOM_TEXT_PROMPT, parseFormloomResponse } from "@formloom/llm";

const response = await localModel.chat({
  system: FORMLOOM_TEXT_PROMPT,
  user: "I'd like to sign up for the newsletter",
});
const result = parseFormloomResponse(response.content); // handles fenced blocks
```

## Other providers

```ts
import {
  FORMLOOM_TOOL_GEMINI,   // functionDeclarations array
  FORMLOOM_TOOL_MISTRAL,  // OpenAI-shaped
  FORMLOOM_TOOL_OLLAMA,   // OpenAI-shaped
} from "@formloom/llm";
```

Gemini, Mistral, and Ollama ship as lean exports. Deep integration (`tool_choice`, `formatSubmission`) is OpenAI + Anthropic for now.

## What's new in v1.2

The system prompt and tool parameter schema now teach every v1.2 schema feature:

- **Option descriptions** — radio/select options can carry a one-line `description` sub-label.
- **`allowCustom` on radio/select** — the model knows when to open a freeform "Other…" input for plausible-but-not-exhaustive option sets (`"What CRM?"`).
- **`hints.variant`** — opaque host-defined widget key the host advertises to the model; emit it only when the host supports the variant.

`FORMLOOM_PARAMETERS` admits these fields plus `readOnly` / `disabled` on any field (typically host-set, not LLM-emitted). Existing `FORMLOOM_TEXT_PROMPT` + parser accept v1.0, v1.1, and v1.2 schemas interchangeably.

## Narrowing for a surface (v1.3)

Different LLM-form surfaces (intake, mid-run clarification, public pages) often want different UX contracts. A **capabilities bundle** lets a host declare what's allowed and derive a narrowed system prompt, tool JSON Schema, and validator from one declaration:

```ts
import { createFormloomCapabilities } from "@formloom/llm";

const intake = createFormloomCapabilities({
  fieldTypes: ["text", "select", "boolean"],
  features: { showIf: false, allowCustom: true },
  variants: ["combobox"],
  maxFields: 7,
});

const response = await openai.chat.completions.create({
  messages: [{ role: "system", content: intake.systemPrompt }, /* ... */],
  tools: [intake.tool.openai],
});

const toolCall = response.choices[0].message.tool_calls?.[0];
const result = intake.parse(toolCall.function.arguments);
if (result.success) renderForm(result.schema);
```

`intake.systemPrompt` drops the sections for features you've disabled (token savings); `intake.tool.openai`, `.anthropic`, `.gemini`, `.mistral`, `.ollama`, and `.responseFormat` all wrap the narrowed `parameters` so the provider's structured-output layer enforces the subset; `intake.parse(input)` validates against the same capabilities and accepts `{ forwardCompat: "strict" | "lenient" }`.

**Three gates in one declaration:**

1. **Prompt** — narrowed system prompt (fewer tokens, clearer reasoning for the LLM).
2. **Tool JSON Schema** — provider enforces `type.enum`, dropped properties, variant allowlist.
3. **Validator** — `bundle.parse` rejects (or drops) anything that slipped through text-mode or copy-paste.

Omit keys to allow; empty `createFormloomCapabilities({})` is equivalent to the default `FORMLOOM_SYSTEM_PROMPT` + `FORMLOOM_PARAMETERS`. The factory is pure — cache the bundle in userland if you construct the same one per request.

**Public helpers** for power users: `buildSystemPrompt(caps)`, `buildTextPrompt(caps)`, and `narrowParameters(caps)` are all individually exported and can be composed outside the bundle.

## `formatSubmission` — the return path

```ts
formatSubmission(data, { provider: "openai", toolCallId: "..." })
// → { role: "tool", tool_call_id, content: string }

formatSubmission(data, { provider: "anthropic", toolCallId: "..." })
// → { role: "user", content: [{ type: "tool_result", tool_use_id, content }] }

formatSubmission(data, { provider: "generic" })
// → { role: "user", content: string }
```

File values are serialised inline by default. Set `attachFiles: "omit"` to replace byte payloads with a metadata stub when you don't want to transport base64 back to the model.

### Errors and cancellations

```ts
import { formatSubmissionError } from "@formloom/llm";

formatSubmissionError(
  { kind: "cancelled", reason: "user closed form" },
  { provider: "openai", toolCallId: "..." },
);
```

Supports `validation` (with per-field errors), `cancelled`, and `timeout` reasons.

## Parser

Handles five input shapes, in order of preference:

1. A plain object (already-parsed tool call args).
2. A JSON string.
3. A ` ```formloom ` fenced block (preferred when present).
4. A ` ```json ` fenced block.
5. The first `{ ... }` block in prose — last-resort fallback.

```ts
const result = parseFormloomResponse(input);
// result.success: boolean
// result.schema: FormloomSchema | null
// result.errors: string[]
```

## Exports

### Values

| Export | Description |
|--------|-------------|
| `FORMLOOM_SYSTEM_PROMPT` | System prompt for tool-call flows |
| `FORMLOOM_TEXT_PROMPT` | Prompt variant for text-only models |
| `FORMLOOM_TOOL_OPENAI` / `_ANTHROPIC` / `_GEMINI` / `_MISTRAL` / `_OLLAMA` | Provider tool definitions |
| `FORMLOOM_RESPONSE_FORMAT_OPENAI` | OpenAI `response_format` wrapper |
| `FORMLOOM_PARAMETERS` | Canonical JSON Schema for the tool parameters |
| `FORMLOOM_TOOL_NAME` | The tool name string (`"formloom_collect"`) — match against `toolCall.function.name` |
| `FORMLOOM_TOOL_DESCRIPTION` | The tool description string (useful if you build your own tool definition for an unlisted provider) |
| `parseFormloomResponse` | Extract and validate a schema from LLM output |
| `formatSubmission` / `formatSubmissionError` | Wrap submitted data as a provider tool response |
| `toolChoice.openai()` / `toolChoice.anthropic()` | Force `formloom_collect` on a turn |
| `createFormloomCapabilities` | **v1.3** — bundles a narrowed prompt + tool + parser for a surface |
| `buildSystemPrompt` / `buildTextPrompt` | **v1.3** — render the system prompt fragments for a given `FormloomCapabilities` |
| `narrowParameters` | **v1.3** — returns a narrowed clone of `FORMLOOM_PARAMETERS` |
| `FULL_CAPABILITIES` | **v1.3** — re-exported from `@formloom/schema` for convenience |

### Types

```ts
import type {
  ParseResult,                  // return type of parseFormloomResponse
  ParseOptions,                 // v1.3 — { forwardCompat?, capabilities? }
  SubmissionProvider,           // "openai" | "anthropic" | "generic"
  AttachFilesMode,              // "inline" | "omit"
  FormatSubmissionOptions,
  FormattedSubmission,          // union covering openai/anthropic/generic shapes
  FormatSubmissionErrorReason,  // { kind: "validation" | "cancelled" | "timeout", ... }
  FormloomCapabilities,         // v1.3 — re-exported from @formloom/schema
  FormloomCapabilitiesBundle,   // v1.3 — return type of createFormloomCapabilities
} from "@formloom/llm";
```

## License

MIT
