---
"@formloom/schema": minor
"@formloom/react": minor
"@formloom/llm": minor
"@formloom/zod": minor
---

v1.2 — schema and hook extensions for LLM agent-builder integration. Backward compatible with v1.0 / v1.1 schemas.

**`@formloom/schema`**
- `FieldOption.description?: string` — optional one-line sub-label for radio/select options.
- `allowCustom?: boolean` on radio and select (plus `customLabel`, `customPlaceholder`) — opt-in "Other…" freeform input that accepts any string. Pattern validation still applies to custom values.
- `hints.variant?: string` — opaque host-defined widget key. The sanctioned extension point for custom field renderers; replaces ad-hoc monkey-patching of the validator.
- `FieldHints` exported as a declaration-mergeable interface alias of `CanonicalHints`, so hosts can augment types from userland.
- `BaseField.readOnly?: boolean` and `BaseField.disabled?: boolean` — presentation flags passed through to renderers.
- New helpers `resolveMultiSelectValue(field, values)` and `isRadioCustomValue(field, value)` for splitting submitted data into option-matched and custom buckets.
- Schema format bumped to `1.2` (min supported stays `1.0`).

**`@formloom/react`**
- New `useFormloomWizard` hook — minimal headless section-stepper on top of `useFormloom`. Exposes `currentStepIndex`, `totalSteps`, `currentStep`, `canGoNext`, `canSkip`, `next()`, `back()`, `skip()`, plus the full `useFormloom` return. Requires `sections` in the schema.
- `useFormloom({ onValueChange })` — synchronous per-change callback with `(fieldId, value, data)`. Survives Strict-Mode double-invoke; not fired on `reset()` or initial render. No built-in debounce — consumers wrap with `useDebouncedCallback` when needed.
- `useFormloom({ readOnly, disabled })` plus per-field overrides via `BaseField.readOnly` / `disabled`. Effective flags flow onto `FieldProps.state.readOnly` / `.disabled`. `handleSubmit` no-ops when either hook-level flag is true; `handleChange` ignores updates on locked fields as a safety net.
- `FieldProps.custom` — metadata for renderers of radio/select fields with `allowCustom: true` (`allowed`, `label`, `placeholder`, `isCustomValue`).
- Re-exports `FieldHints`, `resolveMultiSelectValue`, `isRadioCustomValue`.

**`@formloom/llm`**
- System prompt teaches option descriptions, `allowCustom`, and `hints.variant`. Text-mode example updated to `"version": "1.2"`.
- Tool parameter schema (`FORMLOOM_PARAMETERS` and every provider tool export) admits `option.description`, `allowCustom` trio, `readOnly` / `disabled`, and `hints.variant`.

**`@formloom/zod`**
- `formloomToZod` and `formloomToStandardSchema` accept freeform values when `allowCustom: true`, applying `validation.pattern` to custom entries. Radios/selects without `allowCustom` are unchanged.
