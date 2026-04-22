# Formloom

[![CI](https://github.com/formloom/formloom/actions/workflows/ci.yml/badge.svg)](https://github.com/formloom/formloom/actions/workflows/ci.yml)
[![npm @formloom/schema](https://img.shields.io/npm/v/@formloom/schema.svg?label=%40formloom%2Fschema)](https://www.npmjs.com/package/@formloom/schema)
[![npm @formloom/llm](https://img.shields.io/npm/v/@formloom/llm.svg?label=%40formloom%2Fllm)](https://www.npmjs.com/package/@formloom/llm)
[![npm @formloom/react](https://img.shields.io/npm/v/@formloom/react.svg?label=%40formloom%2Freact)](https://www.npmjs.com/package/@formloom/react)
[![npm @formloom/zod](https://img.shields.io/npm/v/@formloom/zod.svg?label=%40formloom%2Fzod)](https://www.npmjs.com/package/@formloom/zod)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Some moments are better served by a dropdown than a dialogue.**
> Formloom lets your LLM hand the user a real UI mid-conversation, when the moment calls for one, and pick the chat back up when it's done.

---

## What it feels like, with Formloom

Your user wants to book a consultation. The model decides this is a form moment, not a chat moment, and hands over an interface they already know how to use:

```text
You  ›  I'd like to book a consultation.
Bot  ›  Sure. Grab a few details below.

        ┌────────────────────────────────────────┐
        │                                        │
        │  Book a consultation                   │
        │                                        │
        │  Name    [ Alice Chen           ]      │
        │  Email   [ alice@example.com    ]      │
        │  Date    [ Fri, Apr 24     ▾    ]      │
        │  Time    ○ Morning                     │
        │          ● Afternoon                   │
        │                                        │
        │          [   Submit   ]                │
        │                                        │
        └────────────────────────────────────────┘

You  ›  (fills it once, submits)
Bot  ›  Booked for Fri, Apr 24 at 2:00 PM.
        Confirmation sent to alice@example.com.
```

A tap on a date picker instead of typing "Friday afternoon." A radio instead of a sentence. A file dialog instead of a file-size explanation. The user can see the whole task at once, fix a mistake from earlier without scrolling, and submit with a single click.

They're not being interviewed. They're getting something done.

The form renders with *your* components, in *your* design system. Formloom just owns the moment when the LLM reaches for a UI instead of another message.

## What it replaces

The same moment, the old way:

```text
You  ›  I'd like to book a consultation.
Bot  ›  Sure! What's your full name?
You  ›  Alice Chen
Bot  ›  And your email?
You  ›  alice@example.com
Bot  ›  What date works?
You  ›  Friday?
Bot  ›  This Friday or next?
You  ›  …
```

Nothing here is *broken*. The model is polite, the user is patient. But every turn is a tiny writing exercise, a sentence composed for a machine that could have handed over a button. Chat treats every input as prose. That's wonderful for open-ended conversation. It's the wrong mode for picking a date, choosing one of three options, or uploading a file.

Formloom gives the LLM a way to say, mid-conversation: *"this part should be tactile, not typed."*

## What Formloom is

Formloom is the bridge between an LLM turn and a real UI.

Mid-conversation, your model can effectively say:

> *"This part deserves an interface. Here's the shape of it."*

It emits a small JSON schema. Formloom validates it, your frontend renders it using *your* components, the user submits, and the structured result flows straight back into the conversation.

Three pieces, each doing one thing well:

- **A schema vocabulary** the model already knows how to speak. Seven field primitives, no more.
- **A parser + validator** so nothing malformed ever reaches your UI.
- **A headless React hook** that turns the schema into *your* form, not ours.

Your chat stays a chat. Your design system stays yours. Formloom just owns the handoff.

## Why this matters

- **Familiar beats novel.** Users have tapped date pickers, radios, and dropdowns since the 90s. Let them use muscle memory instead of composing sentences.
- **The whole task, at a glance.** A form shows everything up front. Chat drips it out one question at a time, so the user can't skim, can't plan, can't see how close they are to done.
- **Fix mistakes where you made them.** Edit field one after filling field five. In chat, that's a scroll-up, a re-explain, and a hope that the model understands.
- **Your design system stays yours.** Formloom renders nothing on its own. It hands you the schema and state; your components render the pixels.
- **Plays nicely with every provider.** OpenAI, Anthropic, Gemini, Mistral, Ollama. Use a tool call, a `response_format`, or a plain-text fallback. No lock-in.

## A schema looks like this

```json
{
  "version": "1.1",
  "title": "Job Application",
  "fields": [
    {
      "id": "name",
      "type": "text",
      "label": "Full name",
      "validation": { "required": true }
    },
    {
      "id": "years",
      "type": "number",
      "label": "Years of experience",
      "validation": { "min": 0, "max": 60, "integer": true, "required": true }
    },
    {
      "id": "employment_type",
      "type": "radio",
      "label": "Employment type",
      "options": [
        { "value": "full_time", "label": "Full-time" },
        { "value": "contract", "label": "Contract" }
      ],
      "validation": { "required": true }
    },
    {
      "id": "day_rate",
      "type": "number",
      "label": "Day rate (USD)",
      "showIf": { "field": "employment_type", "equals": "contract" }
    }
  ],
  "sections": [
    { "id": "about", "title": "About you", "fieldIds": ["name", "years"] },
    { "id": "role", "title": "Role details", "fieldIds": ["employment_type", "day_rate"] }
  ],
  "submitLabel": "Submit application"
}
```

Field types are deliberately small:

`text` • `boolean` • `radio` • `select` • `date` • `number` • `file`

Rich behavior comes from composition: conditional visibility (`showIf`), grouping (`sections`), validation rules, rendering hints, and async validators in React.

## Which package do you need?

| Package | Use it when you need... |
|---------|--------------------------|
| [`@formloom/schema`](packages/schema/) | Schema types, validator, `showIf` engine, safe regex handling |
| [`@formloom/llm`](packages/llm/) | System prompt, provider tool definitions, parser, submission formatter |
| [`@formloom/react`](packages/react/) | Headless React hooks to render and submit Formloom forms |
| [`@formloom/zod`](packages/zod/) | Zod / Standard Schema adapters for server-side validation |

Most React apps want:

```bash
npm install @formloom/schema @formloom/llm @formloom/react
```

Add `@formloom/zod` if you want server-side validation that matches the client exactly.

## Three steps, end to end

### 1. Ask the model for a form

```ts
import {
  FORMLOOM_SYSTEM_PROMPT,
  FORMLOOM_TOOL_OPENAI,
  parseFormloomResponse,
} from "@formloom/llm";

const response = await openai.chat.completions.create({
  model: "your-model",
  messages: [
    { role: "system", content: `You are a helpful assistant.\n\n${FORMLOOM_SYSTEM_PROMPT}` },
    { role: "user", content: "I want to book an appointment" },
  ],
  tools: [FORMLOOM_TOOL_OPENAI],
});

const toolCall = response.choices[0].message.tool_calls?.[0];
const parsed = parseFormloomResponse(toolCall?.function.arguments);
```

`FORMLOOM_SYSTEM_PROMPT` teaches the model the vocabulary. `FORMLOOM_TOOL_OPENAI` fixes the return shape. `parseFormloomResponse` validates everything before it ever touches your UI.

### 2. Render it, your way

```tsx
import { useFormloom } from "@formloom/react";

function MyForm({ schema, onDone }) {
  const form = useFormloom({ schema, onSubmit: onDone });

  return (
    <form onSubmit={(e) => { e.preventDefault(); void form.handleSubmit(); }}>
      {form.visibleFields.map(({ field, state, onChange, onBlur }) => (
        <div key={field.id}>
          <label>{field.label}</label>
          {field.type === "text" && (
            <input
              value={(state.value as string | null) ?? ""}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onBlur}
            />
          )}
          {state.touched && state.error !== null && <p>{state.error}</p>}
        </div>
      ))}

      <button type="submit" disabled={form.isSubmitting || !form.isValid}>
        {schema.submitLabel ?? "Submit"}
      </button>
    </form>
  );
}
```

`useFormloom` owns state, visibility, validation, and submission. `visibleFields` already respects `showIf`, so hidden fields never render and never submit. You own every pixel.

### 3. Send the result back

```ts
import { formatSubmission } from "@formloom/llm";

const nextMessage = formatSubmission(submittedData, {
  provider: "openai",
  toolCallId: toolCall.id,
});
```

`formatSubmission` wraps the submitted data in the shape the provider expects. Append it to the conversation. The model continues, this time with clean structured values in hand.

## Integration modes

Pick whichever fits your flow:

| Mode | Best for | What you reach for |
|------|----------|---------------------|
| **Tool calling** | Chat flows where the model chooses when a form is needed | `FORMLOOM_SYSTEM_PROMPT`, provider tool export, `parseFormloomResponse`, `formatSubmission` |
| **`response_format`** | Deterministic flows where the model must always return a schema | `FORMLOOM_RESPONSE_FORMAT_OPENAI`, `parseFormloomResponse` |
| **Text fallback** | Models without tool calling | `FORMLOOM_TEXT_PROMPT`, `parseFormloomResponse` |

Provider tool exports shipped today:

`FORMLOOM_TOOL_OPENAI` • `FORMLOOM_TOOL_ANTHROPIC` • `FORMLOOM_TOOL_GEMINI` • `FORMLOOM_TOOL_MISTRAL` • `FORMLOOM_TOOL_OLLAMA`

## Features you get

- Schema validation before a single pixel renders
- Conditional fields via `showIf` with `equals`, `in`, `notEmpty`, composed via `allOf` / `anyOf` / `not`
- Section grouping for longer forms
- File uploads, inline or delegated to your upload handler
- Async field validators in React (debounced, abortable, flushed on submit)
- ReDoS-safe regex handling for LLM-authored patterns
- Zod and Standard Schema adapters for server-side parity

## Examples in this repo

| Example | What it shows | Run it with |
|---------|----------------|-------------|
| [`examples/basic-react`](examples/basic-react/) | Hardcoded schemas, no LLM. All seven field types, sections, hints, `showIf` | `pnpm --filter @formloom/example-basic-react dev` |
| [`examples/provider-free`](examples/provider-free/) | Simulated tool-call, `response_format`, and text-prompt flows. No API key needed | `pnpm --filter @formloom/example-provider-free dev` |
| [`examples/fullstack`](examples/fullstack/) | End-to-end chat app where the model generates a form and receives the submission back | `pnpm --filter @formloom/example-fullstack dev` |

For the fullstack example, copy the env file first:

```bash
cp examples/fullstack/.env.example examples/fullstack/.env
```

Then add your API key.

## Development

This repo is a `pnpm` workspace using Turborepo.

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, PR flow, and changesets.

For security issues, see [SECURITY.md](SECURITY.md). Please don't open a public vulnerability report.

## License

[MIT](LICENSE)
