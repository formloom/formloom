# Fullstack Example

An end-to-end chat app where an LLM dynamically generates forms in response to user messages. This demonstrates the complete Formloom pipeline — from LLM tool call to rendered, interactive form.

## What it does

- Chat interface where you type natural language messages
- The LLM decides whether to respond with text or present a form
- When a form is needed, the LLM calls the `formloom_collect` tool
- The form renders inline in the chat using the headless `useFormloom` hook
- Submitted data is displayed as JSON in the chat thread

Try messages like:
- "I want to book an appointment"
- "Help me submit a bug report"
- "I need to register for an event"

## How it works

### Server (`server/`)

| File | Role |
|------|------|
| `server/index.ts` | Express server with a single `POST /api/chat` endpoint |
| `server/chat.ts` | Sends user message to GPT via LangChain, with `FORMLOOM_SYSTEM_PROMPT` and `FORMLOOM_TOOL_OPENAI` registered as a tool. Parses the response with `parseFormloomResponse`. |

### Client (`src/`)

| File | Role |
|------|------|
| `src/App.tsx` | Chat UI — sends messages to `/api/chat`, renders text or form based on response type |
| `src/FormloomForm.tsx` | Calls `useFormloom` hook and renders each field type as plain HTML inputs |

### The pipeline

```
User types "I want to book an appointment"
  -> POST /api/chat
  -> LangChain sends to GPT with formloom_collect tool
  -> GPT returns a tool call with a FormloomSchema
  -> parseFormloomResponse() validates the schema
  -> Server responds with { type: "form", schema: {...} }
  -> Client renders the form inline using useFormloom
  -> User fills out and submits
  -> Submitted data displayed as JSON
```

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

This starts both the Express server (port 3001) and the Vite dev server concurrently. Opens at `http://localhost:5173`.

## Stack

- **LLM**: GPT via LangChain (`@langchain/openai`)
- **Server**: Express 5
- **Client**: React 19 + Vite
- **Formloom packages**: `@formloom/schema`, `@formloom/llm`, `@formloom/react`
