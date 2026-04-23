---
"@formloom/schema": minor
"@formloom/llm": minor
---

v1.3 — capability profiles for per-surface LLM constraint.

Adds `FormloomCapabilities` type + `validateSchema({ capabilities })` option in `@formloom/schema`, and a `createFormloomCapabilities` factory in `@formloom/llm` that generates a narrowed system prompt, tool JSON Schema, and provider tool definitions from a single declaration. One declaration drives three gates — prompt (fewer tokens, clearer reasoning), tool schema (provider-level hard constraint), and validator (strict reject or lenient drop, same knob as `forwardCompat`).

**`@formloom/schema`**

- `FormloomCapabilities` type: `fieldTypes` allowlist, `features` toggles (`showIf`, `sections`, `allowCustom`, `optionDescriptions`, `readOnly`, `disabled`), `variants` policy (omit/array/`false`), `maxFields`, `maxOptions`.
- `validateSchema(input, { capabilities, forwardCompat })` enforces the declaration; every existing v1.2 validation path is untouched when `capabilities` is omitted.
- Helpers `resolveFeatures`, `isFieldTypeAllowed`, `isVariantAllowed`, and the `FULL_CAPABILITIES` constant for tests and power users.

**`@formloom/llm`**

- `createFormloomCapabilities(caps)` returns a bundle with `systemPrompt`, `textPrompt`, `parameters`, `tool.{openai, anthropic, gemini, mistral, ollama}`, `responseFormat`, and a `parse(input, opts?)` that runs the parser with the same capabilities.
- Power-user exports: `buildSystemPrompt`, `buildTextPrompt`, `narrowParameters`.
- Prompt and parameters are refactored into composable fragments; the default `FORMLOOM_SYSTEM_PROMPT` and `FORMLOOM_PARAMETERS` exports are unchanged at the bytes/deep-equal level (CI-enforced regression).

Backward compatible. `@formloom/react` and `@formloom/zod` are unchanged. Schema format stays `1.2`.

See `docs/proposals/v1.3-capabilities-profile.md` for the full design rationale.
