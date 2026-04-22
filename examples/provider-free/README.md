# Provider-Free Example

An offline demo that exercises every Formloom integration path without calling any LLM. No API keys. No network. Fully self-contained — which also makes it the CI gate for the whole protocol.

## What it does

- Switch between three schemas that cover the core schema surface — number, file, `showIf`, sections, and hints
- Switch between three LLM integration paths and see the simulated LLM output being parsed and rendered:
  - **tool-call** — a structured tool response (OpenAI / Anthropic shape)
  - **response-format** — OpenAI's `response_format: { type: "json_schema" }` deterministic mode
  - **text-prompt** — a model that lacks tool-calling, emitting a ```` ```formloom ```` fenced JSON block in prose
- After submitting the form, the demo calls `formatSubmission` and displays the exact provider-shaped payload that would be fed back to the LLM

## How it works

| File | Role |
|------|------|
| [src/schema-library.ts](src/schema-library.ts) | Three `FormloomSchema` objects that cover the core schema surface |
| [src/paths/tool-call-path.ts](src/paths/tool-call-path.ts) | Simulates OpenAI tool_call args → `parseFormloomResponse` |
| [src/paths/response-format-path.ts](src/paths/response-format-path.ts) | Simulates `response_format` JSON string → `parseFormloomResponse` |
| [src/paths/text-prompt-path.ts](src/paths/text-prompt-path.ts) | Simulates prose with ```` ```formloom ```` fence → `parseFormloomResponse` |
| [src/FormloomRenderer.tsx](src/FormloomRenderer.tsx) | Renders all 7 field-type primitives with section + visibility support |
| [src/App.tsx](src/App.tsx) | Picker UI + submission preview with `formatSubmission` output |

## Running

From the repo root:

```bash
pnpm install
pnpm build
pnpm --filter @formloom/example-provider-free dev
```

Opens at `http://localhost:5173`.

## CI gate

Because it has no API dependencies, this example doubles as a CI gate. Its build command exercises the full integration surface at type-check time:

```bash
pnpm --filter @formloom/example-provider-free build
```

If any cross-package type drift slips through the unit tests, this build fails.
