# Formloom

[![CI](https://github.com/formloom/formloom/actions/workflows/ci.yml/badge.svg)](https://github.com/formloom/formloom/actions/workflows/ci.yml)
[![npm @formloom/schema](https://img.shields.io/npm/v/@formloom/schema.svg?label=%40formloom%2Fschema)](https://www.npmjs.com/package/@formloom/schema)
[![npm @formloom/llm](https://img.shields.io/npm/v/@formloom/llm.svg?label=%40formloom%2Fllm)](https://www.npmjs.com/package/@formloom/llm)
[![npm @formloom/react](https://img.shields.io/npm/v/@formloom/react.svg?label=%40formloom%2Freact)](https://www.npmjs.com/package/@formloom/react)
[![npm @formloom/zod](https://img.shields.io/npm/v/@formloom/zod.svg?label=%40formloom%2Fzod)](https://www.npmjs.com/package/@formloom/zod)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Formloom lets your LLM present a full form UI instead of asking questions one by one. It defines a minimal schema that any LLM can produce, validates it, and gives you headless hooks to render it however you want.

**Instead of this:**
```
LLM: What's your name?
User: Alice
LLM: What's your email?
User: alice@example.com
LLM: How would you like to be contacted?
User: email
```

**You get this:**
```
LLM: [renders a structured form with all fields at once]
User: [fills out form, submits]
LLM: [receives clean { name: "Alice", email: "alice@example.com", contact: "email" }]
```

## Why Formloom?

- **Better UX** — users fill one form instead of playing 20 questions with a chatbot.
- **Structured data** — you get typed, validated data back, not free-text you need to parse.
- **LLM-friendly** — 7 rendering primitives (text, boolean, radio, select, date, number, file). Small surface area means fewer hallucinated schemas.
- **Conditional + grouped** — `showIf` for dependency rules, `sections` for grouping. Long forms stay focused.
- **Headless rendering** — no opinions about your UI. Works with any component library, CSS framework, or design system.
- **Provider-agnostic** — ships tool definitions for OpenAI, Anthropic, Gemini, Mistral, and Ollama, plus `response_format` for deterministic flows and a text-prompt fallback for models without tool-calling.
- **Round-trip helper** — `formatSubmission` wraps submitted data as a provider-specific tool response so the LLM can reason about what it collected.
- **Zod + Standard Schema adapters** — pipe submitted data into your existing validation stack.

## Install

```bash
# Everything
npm install @formloom/schema @formloom/llm @formloom/react

# Just what you need
npm install @formloom/schema                       # Types + validator only
npm install @formloom/schema @formloom/llm         # + prompts, tool defs, parser, formatSubmission
npm install @formloom/zod                          # + Zod / Standard Schema adapter
```

## Packages

| Package | Description |
|---------|-------------|
| [`@formloom/schema`](packages/schema/) | The spec: TypeScript types, JSON Schema, validator, `showIf` evaluator, safe regex. Zero dependencies. |
| [`@formloom/llm`](packages/llm/) | The bridge: prompt fragments, tool/function definitions for every major provider, parser, `formatSubmission` return-path helper. |
| [`@formloom/react`](packages/react/) | The renderer: headless React hooks for form state, visibility, sections, async validators, file handling. |
| [`@formloom/zod`](packages/zod/) | Adapters: `formloomToZod` and `formloomToStandardSchema` so integrators can plug submitted data into existing validators. |

## Quick start

### 1. Teach the LLM the Formloom vocabulary

```ts
import {
  FORMLOOM_SYSTEM_PROMPT,
  FORMLOOM_TOOL_OPENAI,
  parseFormloomResponse,
  formatSubmission,
} from "@formloom/llm";

const response = await openai.chat.completions.create({
  model: "gpt-5.2",
  messages: [
    { role: "system", content: `You are a helpful assistant.\n\n${FORMLOOM_SYSTEM_PROMPT}` },
    { role: "user", content: "I'd like to book an appointment" },
  ],
  tools: [FORMLOOM_TOOL_OPENAI],
});
```

### 2. Parse the schema out of the tool call

```ts
const toolCall = response.choices[0].message.tool_calls?.[0];
const parsed = parseFormloomResponse(toolCall?.function.arguments);
if (parsed.success) {
  renderForm(parsed.schema!);
}
```

The parser accepts direct objects, JSON strings, ` ```formloom ` fences, ` ```json ` fences, and inline prose JSON — whichever your LLM produces.

### 3. Render with React (headless)

```tsx
import { useFormloom } from "@formloom/react";

function MyForm({ schema, onDone }) {
  const form = useFormloom({
    schema,
    onSubmit: onDone,
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); void form.handleSubmit(); }}>
      {form.visibleFields.map(({ field, state, onChange, onBlur }) => (
        <div key={field.id}>
          <label>{field.label}</label>
          {/* render by field.type — see packages/react README */}
        </div>
      ))}
      <button type="submit" disabled={form.isSubmitting || !form.isValid}>
        {schema.submitLabel ?? "Submit"}
      </button>
    </form>
  );
}
```

### 4. Close the loop — hand submitted data back to the LLM

```ts
const nextMessage = formatSubmission(submittedData, {
  provider: "openai",
  toolCallId: toolCall.id,
});
// Append nextMessage to your conversation and call the model again.
```

## What a schema looks like

```json
{
  "version": "1.1",
  "title": "Job Application",
  "fields": [
    { "id": "name", "type": "text", "label": "Full name", "validation": { "required": true } },
    { "id": "years", "type": "number", "label": "Years of experience",
      "validation": { "min": 0, "max": 60, "integer": true, "required": true } },
    { "id": "employment_type", "type": "radio", "label": "Employment type",
      "options": [
        { "value": "full_time", "label": "Full-time" },
        { "value": "contract", "label": "Contract" }
      ], "validation": { "required": true } },
    { "id": "day_rate", "type": "number", "label": "Day rate (USD)",
      "showIf": { "field": "employment_type", "equals": "contract" } },
    { "id": "resume", "type": "file", "label": "Resume",
      "accept": "application/pdf", "maxSizeBytes": 2000000,
      "validation": { "required": true } }
  ],
  "sections": [
    { "id": "about",   "title": "About you", "fieldIds": ["name", "years"] },
    { "id": "role",    "title": "The role",  "fieldIds": ["employment_type", "day_rate"] },
    { "id": "docs",    "title": "Documents", "fieldIds": ["resume"] }
  ],
  "submitLabel": "Submit application"
}
```

## Providers

All first-class providers share the same JSON Schema:

| Provider | Tool export | Forcing | Response-format | `formatSubmission` |
|----------|-------------|---------|-----------------|--------------------|
| OpenAI | `FORMLOOM_TOOL_OPENAI` | `toolChoice.openai()` | `FORMLOOM_RESPONSE_FORMAT_OPENAI` | `provider: "openai"` |
| Anthropic | `FORMLOOM_TOOL_ANTHROPIC` | `toolChoice.anthropic()` | — | `provider: "anthropic"` |
| Gemini | `FORMLOOM_TOOL_GEMINI` | (docs recipes) | — (v1.2) | (generic) |
| Mistral | `FORMLOOM_TOOL_MISTRAL` | OpenAI-shape | — | (generic) |
| Ollama | `FORMLOOM_TOOL_OLLAMA` | OpenAI-shape | — | (generic) |

Text-only fallback (`FORMLOOM_TEXT_PROMPT`) works with any model that can produce fenced code blocks.

## Migrating from 1.0

- All v1.0 schemas validate under a v1.1 runtime — no runtime break.
- `FormloomData`'s value type widens from `string | boolean | string[] | null` to also include `number`, file values, and arrays of file values. If you iterate `Object.values(data)` with narrow types, switch to `FormloomFieldValue`.
- `FormloomSchema.version` relaxes from the `"1.0"` literal to `string`. Pattern-matching on it at runtime still works.
- `FORMLOOM_SCHEMA_VERSION` changes from `"1.0"` to `"1.1"`. Read at runtime? Audit those call sites.

New in 1.1:

- `number` and `file` field types
- `showIf` for conditional visibility
- `sections` for top-level grouping
- Canonical `hints` registry
- `FORMLOOM_TEXT_PROMPT`, `FORMLOOM_RESPONSE_FORMAT_OPENAI`, Gemini/Mistral/Ollama tool exports
- `formatSubmission` / `formatSubmissionError`, `toolChoice` helpers
- Async validators + upload handler in `useFormloom`
- `isSubmitting`, `isValidating`, `visibleFields`, `sections` on the hook return
- `@formloom/zod` package

## Examples

| Example | Description |
|---------|-------------|
| [`basic-react`](examples/basic-react/) | Renders hardcoded mock schemas with the headless hook — no LLM or API key needed. |
| [`provider-free`](examples/provider-free/) | Simulates three integration paths (tool call / response_format / ```formloom fenced text) entirely offline. CI gate. |
| [`fullstack`](examples/fullstack/) | Chat app where GPT generates forms and receives submissions back via `formatSubmission`. |

## Development

pnpm + Turborepo monorepo.

```bash
pnpm install       # Install all dependencies
pnpm build         # Build every package
pnpm test          # Run tests across every package
pnpm lint          # Lint
pnpm typecheck     # Type-check
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, PR conventions, and how to add a changeset.

Security issues: see [SECURITY.md](SECURITY.md) — please do **not** file public issues for vulnerabilities.

## License

[MIT](LICENSE)
