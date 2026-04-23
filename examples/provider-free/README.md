# Provider-Free Example

An offline demo that exercises every Formloom LLM integration path without calling any LLM. No API keys. No network. Fully self-contained — which also makes it a CI gate for the whole protocol.

## What it demonstrates

- The three LLM integration paths:
  - **tool-call** — a structured tool response (OpenAI / Anthropic shape)
  - **response-format** — OpenAI's `response_format: { type: "json_schema" }` deterministic mode
  - **text-prompt** — a model that lacks tool-calling, emitting a ```` ```formloom ```` fenced JSON block in prose
- `parseFormloomResponse` extracting + validating the schema from each path shape
- `formatSubmission` wrapping submitted data as a provider-shaped tool response
- v1.2 schema features flowing through every path: option descriptions, `allowCustom` on radio + multi-select, `hints.variant`, `readOnly`
- **v1.3 `createFormloomCapabilities`** narrowing the prompt + tool JSON Schema + parser for a surface. Preset picker shows how `Full`, `Text-only`, and `No-file / no-conditional` each shrink the prompt and tighten the tool schema in real time.

## How to run

From the repo root:

```bash
pnpm install
pnpm build
pnpm --filter @formloom/example-provider-free dev
```

Opens at `http://localhost:5173`.

## Pickers

- **Schema** — pick one of three hand-rolled schemas (jobApplication, appointmentBooking, contactPreferences, crmOnboarding).
- **Path** — which LLM integration path to simulate.
- **Caps** — which capability profile to apply. Full = v1.2 default, Text-only = every other field type becomes a validation error through `bundle.parse`, No-file / no-conditional = `file` fields and `showIf` are both rejected.

The **Active capabilities** banner shows the profile in plain English and the narrowed system prompt's character count, so you can see the token savings at a glance.

When the simulated LLM output passes `bundle.parse`, the form renders. When it doesn't (e.g. you picked a schema that uses a disallowed field type), the error panel surfaces the exact validator error with its path.

## How it works

| File | Role |
|------|------|
| [src/schema-library.ts](src/schema-library.ts) | Four `FormloomSchema` objects covering v1.0 / v1.1 / v1.2 features |
| [src/paths/tool-call-path.ts](src/paths/tool-call-path.ts) | Simulates OpenAI tool_call args → `parseFormloomResponse` |
| [src/paths/response-format-path.ts](src/paths/response-format-path.ts) | Simulates `response_format` JSON string → `parseFormloomResponse` |
| [src/paths/text-prompt-path.ts](src/paths/text-prompt-path.ts) | Simulates prose with ```` ```formloom ```` fence → `parseFormloomResponse` |
| [src/FormloomRenderer.tsx](src/FormloomRenderer.tsx) | Renders the seven field primitives with section + visibility support |
| [src/App.tsx](src/App.tsx) | Picker UI (schema / path / caps) + submission preview with `formatSubmission` output + capabilities summary |

## Schemas included

| Schema | Demonstrates |
|--------|--------------|
| **jobApplication** | Number + file fields, `showIf`, sections, textarea hint, v1.2 option descriptions on employment type |
| **appointmentBooking** | Select, date, `showIf` revealing an insurance-provider field when the boolean is ticked |
| **contactPreferences** | Multi-select, `showIf` with `anyOf`, pattern validation on a phone field |
| **crmOnboarding** | v1.2 showcase: `readOnly` account id, `allowCustom` radio ("What CRM?"), multi-select with `allowCustom` + `hints.variant: "tool-select"` |

## CI gate

Because it has no API dependencies, this example doubles as a CI gate. Its build command exercises the full integration surface at type-check time:

```bash
pnpm --filter @formloom/example-provider-free build
```

If any cross-package type drift slips through the unit tests, this build fails.
