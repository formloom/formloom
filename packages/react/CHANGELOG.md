# @formloom/react

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
