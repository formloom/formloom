/**
 * System prompt fragment that teaches an LLM how to generate Formloom schemas
 * via the formloom_collect tool.
 *
 * Usage:
 *   const systemPrompt = `You are a helpful assistant.\n\n${FORMLOOM_SYSTEM_PROMPT}`;
 *
 * Budget ~2 KB so the fragment stays prompt-cache-friendly across turns.
 */
export const FORMLOOM_SYSTEM_PROMPT = `## Structured Form Generation (Formloom)

When you need to collect structured information from the user, generate a JSON form schema using the formloom_collect tool. This presents the user with an interactive form and returns clean structured data.

### Field types (rendering primitives, NOT semantic types)

Meaning comes from the combination of type + placeholder + validation + hints.

- **text**: Single-line text input. Placeholder + validation.pattern gives it meaning (a text field with an email regex IS an email field).
- **boolean**: Yes/no. Renderer picks toggle or checkbox (hint with hints.display: "toggle" to bias).
- **radio**: Pick exactly one from 2-5 options. Requires "options".
- **select**: Pick one or many from a list. Requires "options". Set "multiple": true for multi-select.
- **date**: Date picker. Use ISO 8601 (YYYY-MM-DD) for defaultValue.
- **number**: Numeric input. Use validation.min/max/step/integer.
- **file**: File upload. Use "accept" (MIME globs) and "maxSizeBytes" (keep small — large base64 payloads bloat tool results). No defaultValue.

### Conditional fields

Attach "showIf" to a field to hide it until a condition is met. Hidden fields are excluded from submitted data. Rules:
- { "field": "country", "equals": "US" }
- { "field": "plan", "in": ["pro", "enterprise"] }
- { "field": "coupon", "notEmpty": true }
- { "allOf": [ ... ] } / { "anyOf": [ ... ] } / { "not": { ... } }

### Sections

For longer forms, add a top-level "sections" array grouping fieldIds into visual sections. When "sections" is present, every field id must belong to exactly one section.

### Rendering hints (all optional)

- hints.display: "textarea" | "password" | "toggle" | "stepper"
- hints.width: "full" | "half" | "third"
- hints.rows: integer (for textarea)
- hints.autocomplete: HTML autocomplete token

### Rules

1. Keep forms focused: 3-7 visible fields. Use showIf to keep the initial form short.
2. Every option in radio/select has both "value" (machine key) and "label" (display text).
3. Field "id" values are snake_case and descriptive ("delivery_date", not "field1").
4. Pre-fill defaultValue whenever you can infer the answer from conversation context.
5. Set validation.required: true for fields that must be filled. Use validation.pattern (plus patternMessage) for format checks. Avoid nested quantifiers and overlapping alternations — catastrophic regexes are rejected at schema validation.
6. Always set version: "1.1" on new schemas.`;

/**
 * Prompt variant for models that lack tool-calling. Instructs the model to
 * emit a fenced JSON block that the `parseFormloomResponse` parser will
 * extract. Prefer this only when you cannot use tool-calling or the
 * OpenAI `response_format` equivalent.
 */
export const FORMLOOM_TEXT_PROMPT = `## Structured Form Generation (Formloom — text mode)

When you need to collect structured information, emit a JSON schema inside a code fence tagged \`\`\`formloom. Do not use the formloom_collect tool; do not call any other tool; do not wrap the JSON in prose. The rendering layer will extract the block, validate it, and present a form.

${FORMLOOM_SYSTEM_PROMPT.replace("## Structured Form Generation (Formloom)\n\n", "")}

### Example output

\`\`\`formloom
{
  "version": "1.1",
  "title": "Contact",
  "fields": [
    { "id": "email", "type": "text", "label": "Email", "validation": { "required": true } }
  ]
}
\`\`\``;
