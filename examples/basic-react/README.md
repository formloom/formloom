# Basic React Example

A minimal demo that renders Formloom schemas using the headless `useFormloom` hook. No LLM involved — uses hardcoded mock schemas to demonstrate the rendering layer in isolation.

## What it does

- Four pre-built form schemas: **Contact**, **Feedback**, **Booking**, and **Job Application**
- Switch between them using the buttons at the top
- Fill out fields, see touch-based validation (errors appear after you leave a field)
- On submit, the raw `FormloomData` JSON is displayed below the form
- A "Reset" button appears once any field has been interacted with
- The **Job Application** schema demonstrates v1.1-only features: `number` and `file` fields, `showIf` conditional visibility, `sections`, and the `hints` registry (`display: "textarea"`)

## How it works

| File | Role |
|------|------|
| [src/mock-schemas.ts](src/mock-schemas.ts) | Four hardcoded `FormloomSchema` objects simulating LLM output |
| [src/FormloomRenderer.tsx](src/FormloomRenderer.tsx) | Calls `useFormloom` hook and maps each of the 7 field types to plain HTML inputs, honours `sections` and `visibleFields` |
| [src/App.tsx](src/App.tsx) | Schema switcher + displays submitted data as JSON |

The renderer is the key file — it shows how a headless hook gets wired to actual UI. The hook provides `state`, `onChange`, `onBlur`, and `visible` per field; the renderer decides what HTML to render based on `field.type` and any `hints`.

## Running

From the repo root:

```bash
pnpm install
pnpm build
pnpm --filter @formloom/example-basic-react dev
```

Opens at `http://localhost:5173`.

## Schemas included

| Schema | Demonstrates |
|--------|--------------|
| **Contact** | Text fields with regex validation, radio, boolean |
| **Feedback** | Radio rating, multi-select, text, boolean |
| **Booking** | Select, date picker, text |
| **Job Application** | **v1.1 features** — number + file fields, `showIf` (contract rate appears when employment is "Contract"), sections, textarea hint for the bio |
