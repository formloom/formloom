# Basic React Example

A minimal demo that renders Formloom schemas using the headless React hooks. No LLM involved — uses hardcoded mock schemas so the rendering layer can be studied in isolation.

## What it demonstrates

Every feature in `@formloom/schema` and `@formloom/react` that doesn't require an LLM:

- All seven field-type primitives (`text`, `boolean`, `radio`, `select`, `date`, `number`, `file`)
- Validation: required, pattern, patternMessage, min/max/step/integer
- Conditional visibility via `showIf` (`equals`, composed rules)
- Sections grouping
- Every canonical rendering hint: `display: "textarea" | "password" | "toggle" | "stepper"`, `width: "half" | "third"`, `rows`, `autocomplete`, `variant`
- v1.2 schema features: `FieldOption.description`, `allowCustom` on radio / multi-select, `readOnly`, `disabled`
- `useFormloom` hook with `onValueChange` live-state callback
- `useFormloomWizard` — multi-step stepper with progress strip and validation-gated next/back/skip
- Async validators (debounced, abortable) — exercised by the "Async" schema
- File uploads via `adaptFileList`

## How to run

From the repo root:

```bash
pnpm install
pnpm build
pnpm --filter @formloom/example-basic-react dev
```

Opens at `http://localhost:5173`.

## How it works

| File | Role |
|------|------|
| [src/mock-schemas.ts](src/mock-schemas.ts) | Eight `FormloomSchema` objects simulating LLM output — every feature covered |
| [src/FormloomRenderer.tsx](src/FormloomRenderer.tsx) | `useFormloom`-based flat renderer. Maps each field type to plain HTML, honours `sections`, `visibleFields`, `state.readOnly` / `state.disabled`, `FieldProps.custom`, and every canonical hint. `FieldBody` is exported for reuse by the wizard. |
| [src/WizardRenderer.tsx](src/WizardRenderer.tsx) | `useFormloomWizard`-based stepper. Progress strip, Back / Next / Skip buttons, validation-gated transitions, final-step submit. |
| [src/App.tsx](src/App.tsx) | Schema switcher + wizard-mode toggle + live `onValueChange` JSON panel + submitted-data JSON panel. Wires the async validator for the "Async" schema. |

The App exposes a **wizard-mode toggle** for any schema that declares `sections` — flip it to switch the same schema between the flat renderer and the stepper.

## Schemas included

| Schema | Demonstrates |
|--------|--------------|
| **Contact** | Text fields with regex validation, radio, boolean |
| **Feedback** | Radio rating, multi-select, text, boolean |
| **Booking** | Select, date picker, text |
| **Job App** | Number + file fields, `showIf` (contract rate appears when employment is "Contract"), sections, textarea hint for the bio |
| **Onboarding** | Two-line option descriptions, `allowCustom` radio + multi-select with freeform tags, `hints.variant: "tool-select"`, a `readOnly` Account ID, and sections — toggle **Wizard mode** to see `useFormloomWizard` |
| **Hints tour** | Every canonical hint: password + email autocomplete in a half-width pair, toggle, stepper, width `half`/`third`, textarea with `rows` |
| **Async** | Debounced async validator — try `alice` or `bob` to see it reject; any other value passes after ~450 ms |
| **Review** | `readOnly` (plain-text summary) + `disabled` (locked input) states in the same form |

## The "Live form state" panel

When Wizard mode is off, the app shows a live JSON panel fed by the hook's `onValueChange` option. This is the same mechanism a host would use to stream partial answers to an LLM context while the user types — see [packages/react/README.md](../../packages/react/README.md) for the debounced-userland pattern.
