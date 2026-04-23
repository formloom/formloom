# Fullstack Example

An end-to-end chat app where an LLM dynamically generates forms in response to user messages — and receives the submitted data back via `formatSubmission` so it can reason about what was collected. This is the complete Formloom round-trip with every production-shaped concern layered in.

## What it demonstrates

- Live LLM integration via LangChain (`@langchain/openai`, Responses API with reasoning)
- **`createFormloomCapabilities`** on the server — one declaration narrows the system prompt, tool JSON Schema, and validator the LLM's response is parsed through
- `formatSubmission` wrapping submitted data as an OpenAI `tool_result` so the model can continue the conversation
- **Server-side validation with `@formloom/zod`** — the submitted data is independently validated on the server before being replayed to the LLM; drift between client and server is impossible because both read the same `FormloomSchema`
- Renderer support for every field-type primitive: text, boolean, radio, select, date, number, file
- Section grouping, `showIf` visibility, textarea + password hints (whatever the LLM emits within the capabilities profile)

## Pipeline

```
User: "I want to book an appointment"
  → POST /api/chat
  → LangChain ChatOpenAI with bundle.tool.openai registered
  → Model returns a tool call with a FormloomSchema
  → bundle.parse(args) validates against the capabilities profile
  → Server responds { type: "form", schema, toolCallId }
  → Client renders the form inline via useFormloom
  → User fills out and submits
  → POST /api/continue
  → Server runs formloomToZod(schema).safeParse(data)  ← independent server-side gate
  → formatSubmission wraps the data as an OpenAI tool_result
  → Replays [system, user, assistant(tool_call), tool(result)] to the LLM
  → Model returns a natural-language follow-up
  → Client appends it to the conversation
```

## How it works

### Server (`server/`)

| File | Role |
|------|------|
| [server/index.ts](server/index.ts) | Express server exposing `POST /api/chat` and `POST /api/continue` |
| [server/chat.ts](server/chat.ts) | `handleChat` runs the initial turn through a `createFormloomCapabilities` bundle; `handleFormSubmission` closes the loop with `@formloom/zod` validation + `formatSubmission` + LangChain's `ToolMessage`. Model: GPT-5.2 via LangChain's Responses API with reasoning enabled. |

### Client (`src/`)

| File | Role |
|------|------|
| [src/App.tsx](src/App.tsx) | Chat UI. Tracks `toolCallId` + `originalUserMessage` per form message. When a form is submitted, it hits `/api/continue`. |
| [src/FormloomForm.tsx](src/FormloomForm.tsx) | Renders every field-type primitive, honours `sections`, `visibleFields`, textarea + password hints. |

## Capabilities constraint

`server/chat.ts` constructs the capability bundle once and reuses it across turns:

```ts
const capabilities = createFormloomCapabilities({
  maxFields: 8,
});

// …in handleChat:
const llmWithTools = llm.bindTools([capabilities.tool.openai], { tool_choice: "auto" });
const parseResult = capabilities.parse(toolCall.args);
```

The default profile in the example allows every feature but caps forms at 8 fields. Tighten it for a particular deployment — e.g. a compliance-sensitive surface might set `features: { file: false }` to keep the LLM from ever suggesting an upload, or a mobile surface might restrict `fieldTypes` to `text / select / boolean`. Every change in the declaration flows through all three gates automatically.

## Server-side validation with @formloom/zod

`handleFormSubmission` validates the submitted data against the same `FormloomSchema` the LLM emitted — but through the Zod adapter on the server, independent of whatever the client renderer did:

```ts
const zodSchema = formloomToZod(args.schema);
const zodResult = zodSchema.safeParse(args.data);
if (!zodResult.success) {
  // Reject the submission; return a helpful message to the user.
}
```

This means a malicious client that bypasses the hook (submitting via curl, say) still can't smuggle bad data into the LLM's context. The validation contract is the schema itself.

## Setup

### 1. Get an OpenAI API key

```bash
cp .env.example .env
```

Edit `.env`:

```
OPENAI_API_KEY=sk-your-key-here
```

### 2. Install and build

From the repo root:

```bash
pnpm install
pnpm build
```

### 3. Run

```bash
pnpm --filter @formloom/example-fullstack dev
```

Starts both the Express server (port 3001) and the Vite dev server concurrently. Opens at `http://localhost:5173`.

Try messages like:

- "I want to book an appointment"
- "Help me submit a bug report"
- "I'd like to apply for the senior engineer role"

## Stack

- **LLM**: GPT-5.2 via LangChain (`@langchain/openai`), Responses API with reasoning
- **Server**: Express 5 with JSON body limit raised to 10 MB for inline file submissions
- **Client**: React 19 + Vite
- **Formloom packages**: `@formloom/schema`, `@formloom/llm`, `@formloom/react`, `@formloom/zod`
