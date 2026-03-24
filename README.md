# Formloom

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

- **Better UX** — Users fill one form instead of playing 20 questions with a chatbot
- **Structured data** — You get typed, validated data back, not free-text you need to parse
- **LLM-friendly** — Only 5 field types (text, boolean, radio, select, date). Small surface area means fewer hallucinated schemas
- **Headless rendering** — No opinions about your UI. Works with any component library, CSS framework, or design system
- **Provider agnostic** — Ships tool definitions for both OpenAI and Anthropic. The schema itself works with any LLM

## Install

```bash
# All three packages
npm install @formloom/schema @formloom/llm @formloom/react

# Or just what you need
npm install @formloom/schema          # Types + validator only
npm install @formloom/schema @formloom/llm   # Schema + LLM tooling, no React
```

## Packages

| Package | Description |
|---------|-------------|
| [`@formloom/schema`](packages/schema/) | The spec. TypeScript types, JSON Schema, and a validator. Zero dependencies. |
| [`@formloom/llm`](packages/llm/) | The bridge. Prompt fragments and tool/function-call definitions for OpenAI and Anthropic. |
| [`@formloom/react`](packages/react/) | The renderer. Headless React hooks for form state, validation, and submission. |

## What a schema looks like

This is the JSON your LLM produces — 5 field types, flat structure, nothing exotic:

```json
{
  "version": "1.0",
  "title": "Contact Information",
  "fields": [
    {
      "id": "full_name",
      "type": "text",
      "label": "Full Name",
      "placeholder": "Jane Doe",
      "validation": { "required": true }
    },
    {
      "id": "email",
      "type": "text",
      "label": "Email",
      "placeholder": "jane@example.com",
      "validation": {
        "required": true,
        "pattern": "^[^@]+@[^@]+\\.[^@]+$",
        "patternMessage": "Please enter a valid email address"
      }
    },
    {
      "id": "contact_method",
      "type": "radio",
      "label": "Preferred Contact Method",
      "options": [
        { "value": "email", "label": "Email" },
        { "value": "phone", "label": "Phone" }
      ],
      "defaultValue": "email"
    },
    {
      "id": "subscribe",
      "type": "boolean",
      "label": "Subscribe to newsletter",
      "defaultValue": false
    }
  ],
  "submitLabel": "Save"
}
```

Field types: `text`, `boolean`, `radio`, `select`, `date` — that's it. Meaning comes from the combination of type + placeholder + validation (e.g. a `text` field with an email regex becomes an email field).

## Quick Start

### 1. Teach your LLM the Formloom vocabulary

#### OpenAI

```ts
import { FORMLOOM_SYSTEM_PROMPT, FORMLOOM_TOOL_OPENAI } from "@formloom/llm";

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: `You are a helpful assistant.\n\n${FORMLOOM_SYSTEM_PROMPT}` },
    { role: "user", content: "I'd like to book an appointment" },
  ],
  tools: [FORMLOOM_TOOL_OPENAI],
});
```

#### Anthropic

```ts
import { FORMLOOM_SYSTEM_PROMPT, FORMLOOM_TOOL_ANTHROPIC } from "@formloom/llm";

const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  system: `You are a helpful assistant.\n\n${FORMLOOM_SYSTEM_PROMPT}`,
  messages: [
    { role: "user", content: "I'd like to book an appointment" },
  ],
  tools: [FORMLOOM_TOOL_ANTHROPIC],
});
```

### 2. Parse the LLM's response

```ts
import { parseFormloomResponse } from "@formloom/llm";

// Works with both OpenAI tool_calls and Anthropic tool_use blocks
const result = parseFormloomResponse(toolCallArguments);

if (result.success) {
  // result.schema is a validated FormloomSchema
  renderForm(result.schema);
} else {
  console.error(result.errors);
}
```

The parser handles multiple input formats — direct objects, JSON strings, markdown code blocks, and prose with embedded JSON.

### 3. Render with React (headless)

```tsx
import { useFormloom } from "@formloom/react";

function MyForm({ schema }) {
  const form = useFormloom({
    schema,
    onSubmit: (data) => console.log("Submitted:", data),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
      {form.fields.map(({ field, state, onChange, onBlur }) => (
        <div key={field.id}>
          <label>{field.label}</label>
          {field.type === "text" && (
            <input
              value={state.value ?? ""}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onBlur}
            />
          )}
          {state.touched && state.error && <span>{state.error}</span>}
        </div>
      ))}
      <button type="submit">Submit</button>
    </form>
  );
}
```

The hook gives you `state`, `onChange`, and `onBlur` per field. You decide what HTML, component library, or framework renders it — Material UI, Chakra, Tailwind, anything.

### 4. Use without React

`@formloom/schema` and `@formloom/llm` have no React dependency. You can use them with Vue, Svelte, server-side rendering, or any other setup — just consume the validated `FormloomSchema` object and build your own renderer.

## Architecture

```
LLM Provider          Your App              User
     |                    |                   |
     |  tool_call with    |                   |
     |  FormloomSchema    |                   |
     |------------------->|                   |
     |                    |  render form      |
     |                    |------------------>|
     |                    |                   |
     |                    |  FormloomData     |
     |                    |<------------------|
     |  structured data   |                   |
     |<-------------------|                   |
```

## Examples

| Example | Description |
|---------|-------------|
| [`basic-react`](examples/basic-react/) | Renders hardcoded mock schemas with the headless hook — no LLM or API key needed |
| [`fullstack`](examples/fullstack/) | Chat app where GPT dynamically generates forms via tool calls |

Run the basic example:

```bash
pnpm install
pnpm build
pnpm --filter @formloom/example-basic-react dev
```

## Development

This is a pnpm monorepo using [Turborepo](https://turbo.build/repo) for task orchestration.

```bash
pnpm install       # Install all dependencies
pnpm build         # Build all packages (schema -> llm -> react)
pnpm test          # Run tests across all packages
pnpm lint          # Lint all packages
pnpm typecheck     # Type-check all packages
```

Packages are built with [tsup](https://tsup.egoist.dev/) and tested with [Vitest](https://vitest.dev/).

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.
