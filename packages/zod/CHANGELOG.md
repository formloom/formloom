# @formloom/zod

## 0.3.0

### Minor Changes

- [#6](https://github.com/formloom/formloom/pull/6) [`b1debeb`](https://github.com/formloom/formloom/commit/b1debebfff88e190d643af2c0079c0025c78423d) Thanks [@hasgar-aot](https://github.com/hasgar-aot)! - v1.2 — schema and hook extensions for LLM agent-builder integration. Backward compatible with v1.0 / v1.1 schemas.

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

### Patch Changes

- Updated dependencies [[`b1debeb`](https://github.com/formloom/formloom/commit/b1debebfff88e190d643af2c0079c0025c78423d)]:
  - @formloom/schema@0.3.0

## 0.2.0

### Minor Changes

- [#2](https://github.com/formloom/formloom/pull/2) [`5723fb8`](https://github.com/formloom/formloom/commit/5723fb8336f3f5ebbe8c7162c8135c43c6aed298) Thanks [@hasgar-aot](https://github.com/hasgar-aot)! - Initial public release.

  ### Schema primitives

  - `number` and `file` field types (7 primitives total).
  - `showIf` DSL: `equals` / `in` / `notEmpty` / `allOf` / `anyOf` / `not`, with cycle and missing-reference validation.
  - `sections` for top-level grouping; every field must belong to exactly one section when `sections` is declared.
  - `CANONICAL_HINTS` registry (display / width / rows / autocomplete) with TypeScript narrowing.
  - `safeRegexTest` with static catastrophic-shape detection + input-length cap; never throws, never hangs.
  - `fileMatchesAccept` and `mimeMatches` helpers following HTML `<input accept>` semantics.
  - Version acceptance widened to any `1.x`; `validateSchema(schema, { forwardCompat: "lenient" })` drops unknown field types with warnings.

  ### LLM integration

  - Canonical `FORMLOOM_PARAMETERS` JSON Schema as single source of truth.
  - Provider tool exports: OpenAI, Anthropic, Gemini, Mistral, Ollama.
  - `FORMLOOM_RESPONSE_FORMAT_OPENAI` for deterministic response-format flows.
  - `FORMLOOM_TEXT_PROMPT` for models without tool calling; parser prefers ` ```formloom ` fences.
  - `formatSubmission` / `formatSubmissionError` — the return path.
  - `toolChoice.openai()` / `toolChoice.anthropic()` helpers.

  ### React hook

  - `visibleFields`, per-field `visible`, hidden fields omitted from submitted data.
  - `form.sections` grouped fields with visibility derived from children.
  - `number` and `file` field support.
  - Async validators with debounce, abort, and flush-on-submit.
  - `isSubmitting`, `isValidating` (form-wide and per-field).

  ### New package

  - `@formloom/zod` — `formloomToZod`, `formloomToZodObject`, `formloomToStandardSchema`. Shares validation primitives with the runtime for guaranteed client/server parity.

### Patch Changes

- Updated dependencies [[`5723fb8`](https://github.com/formloom/formloom/commit/5723fb8336f3f5ebbe8c7162c8135c43c6aed298)]:
  - @formloom/schema@0.2.0
