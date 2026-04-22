# Fullstack Example

An end-to-end chat app where an LLM dynamically generates forms in response to user messages — and receives the submitted data back via `formatSubmission` so it can reason about what was collected. This is the complete Formloom round-trip.

## What it does

- Chat interface where you type natural language messages
- The LLM decides whether to respond with text or present a form
- When a form is needed, the LLM calls the `formloom_collect` tool
- The form renders inline in the chat using the headless `useFormloom` hook (all 7 field-type primitives supported)
- On submit, the app calls `formatSubmission` and sends the result back to the LLM
- The LLM generates a natural-language follow-up acknowledging the submission

Try messages like:
- "I want to book an appointment"
- "Help me submit a bug report"
- "I'd like to apply for the senior engineer role"

## Pipeline

```
User: "I want to book an appointment"
  -> POST /api/chat
  -> LangChain -> GPT-5.2 with FORMLOOM_TOOL_OPENAI registered
  -> Model returns a tool call with a FormloomSchema
  -> parseFormloomResponse() validates the schema
  -> Server responds { type: "form", schema, toolCallId }
  -> Client renders the form inline via useFormloom
  -> User fills out and submits
  -> POST /api/continue
  -> Server formats the submission via formatSubmission({ provider: "openai", toolCallId })
  -> Replays [system, user, assistant(tool_call), tool(result)] to the LLM
  -> Model returns a natural-language follow-up
  -> Client appends it to the conversation
```

## How it works

### Server (`server/`)

| File | Role |
|------|------|
| [server/index.ts](server/index.ts) | Express server exposing `POST /api/chat` and `POST /api/continue` |
| [server/chat.ts](server/chat.ts) | `handleChat` runs the initial turn; `handleFormSubmission` closes the loop using `formatSubmission` + LangChain's `ToolMessage`. Model: GPT-5.2 via LangChain's Responses API with reasoning enabled. |

### Client (`src/`)

| File | Role |
|------|------|
| [src/App.tsx](src/App.tsx) | Chat UI. Tracks `toolCallId` + `originalUserMessage` per form message. When a form is submitted, it hits `/api/continue`. |
| [src/FormloomForm.tsx](src/FormloomForm.tsx) | Renders every field-type primitive: text, boolean, radio, select, date, number, file. Honours `sections`, `visibleFields`, textarea + password hints. |

## Setup

### 1. Get an OpenAI API key

Copy the example env file and add your key:

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

## Stack

- **LLM**: GPT-5.2 via LangChain (`@langchain/openai`), Responses API with reasoning
- **Server**: Express 5 with JSON body limit raised to 10 MB for inline file submissions
- **Client**: React 19 + Vite
- **Formloom packages**: `@formloom/schema`, `@formloom/llm`, `@formloom/react`
