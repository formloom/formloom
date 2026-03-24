# Basic React Example

A minimal demo that renders Formloom schemas using the headless `useFormloom` hook. No LLM involved — uses hardcoded mock schemas to demonstrate the rendering layer in isolation.

## What it does

- Displays three pre-built form schemas: **Contact**, **Feedback**, and **Booking**
- Switch between them using the buttons at the top
- Fill out fields, see touch-based validation (errors appear after you leave a field)
- On submit, the raw `FormloomData` JSON is displayed below the form
- A "Reset" button appears once any field has been interacted with

## How it works

| File | Role |
|------|------|
| `src/mock-schemas.ts` | Three hardcoded `FormloomSchema` objects simulating LLM output |
| `src/FormloomRenderer.tsx` | Calls `useFormloom` hook and maps each field type to plain HTML inputs |
| `src/App.tsx` | Schema switcher + displays submitted data as JSON |

The `FormloomRenderer` is the key file — it shows how a headless hook gets wired to actual UI. The hook provides `state`, `onChange`, and `onBlur` per field; the renderer decides what HTML to render based on `field.type`.

## Running

From the repo root:

```bash
pnpm install
pnpm build
pnpm --filter @formloom/example-basic-react dev
```

Opens at `http://localhost:5173`.

## Schemas included

| Schema | Fields |
|--------|--------|
| **Contact** | Full name, email (regex validated), preferred contact method (radio), newsletter (checkbox) |
| **Feedback** | Satisfaction rating (radio), features used (multi-select), improvement text, recommend (checkbox) |
| **Booking** | Service type (select), preferred date (date picker), patient name, notes |
