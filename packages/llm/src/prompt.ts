/**
 * System prompt fragment that teaches an LLM how to generate Formloom schemas.
 *
 * Usage:
 *   const systemPrompt = `You are a helpful assistant.\n\n${FORMLOOM_SYSTEM_PROMPT}`;
 */
export const FORMLOOM_SYSTEM_PROMPT = `## Structured Form Generation (Formloom)

When you need to collect structured information from the user, generate a JSON form schema using the formloom_collect tool. This presents the user with an interactive form and returns clean structured data.

### Available field types (rendering primitives, NOT semantic types):

- **text**: Single-line text input. Use label, placeholder, and validation.pattern to give it meaning (e.g., a text field with placeholder "name@example.com" and an email regex IS an email field).
- **boolean**: Yes/no, true/false. Renderer decides presentation (toggle, checkbox, etc.).
- **radio**: Pick exactly one option from a list. You MUST provide an "options" array.
- **select**: Pick one or more from a list. You MUST provide an "options" array. Set "multiple": true if the user can pick more than one.
- **date**: Date picker. Use ISO 8601 format (YYYY-MM-DD) for defaultValue.

### Rules:
1. Keep forms focused: 3-7 fields maximum. If you need more, ask in multiple rounds.
2. Always provide clear, human-friendly labels and descriptions.
3. Use placeholder text to show expected format or example values.
4. Use radio when there are 2-5 options and the user must pick exactly one.
5. Use select when there are many options or the user can pick multiple.
6. Pre-fill defaultValue when you can infer the answer from conversation context.
7. Set validation.required: true for fields that must be filled.
8. Use validation.pattern (regex) with a patternMessage for format-specific fields.
9. Every option in radio/select MUST have both "value" (machine key) and "label" (display text).
10. Field "id" values should be snake_case and descriptive (e.g., "delivery_date", not "field1").`;
