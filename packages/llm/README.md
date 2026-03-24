# @formloom/llm

LLM integration layer for Formloom. Provides prompt fragments, tool/function definitions, and a response parser.

## Installation

```bash
npm install @formloom/llm
```

## Usage with OpenAI

```ts
import { FORMLOOM_SYSTEM_PROMPT, FORMLOOM_TOOL_OPENAI, parseFormloomResponse } from "@formloom/llm";

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    {
      role: "system",
      content: `You are a helpful assistant.\n\n${FORMLOOM_SYSTEM_PROMPT}`,
    },
    { role: "user", content: "I need to book a dentist appointment" },
  ],
  tools: [FORMLOOM_TOOL_OPENAI],
});

const toolCall = response.choices[0].message.tool_calls?.[0];
if (toolCall?.function.name === "formloom_collect") {
  const result = parseFormloomResponse(JSON.parse(toolCall.function.arguments));
  if (result.success) {
    // result.schema is a validated FormloomSchema
  }
}
```

## Usage with Anthropic Claude

```ts
import { FORMLOOM_SYSTEM_PROMPT, FORMLOOM_TOOL_ANTHROPIC, parseFormloomResponse } from "@formloom/llm";

const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  system: `You are a helpful assistant.\n\n${FORMLOOM_SYSTEM_PROMPT}`,
  messages: [{ role: "user", content: "I want to submit a bug report" }],
  tools: [FORMLOOM_TOOL_ANTHROPIC],
});

const toolUse = response.content.find((block) => block.type === "tool_use");
if (toolUse?.name === "formloom_collect") {
  const result = parseFormloomResponse(toolUse.input);
  if (result.success) {
    // result.schema is a validated FormloomSchema
  }
}
```

## Usage with Vercel AI SDK

```ts
import { FORMLOOM_SYSTEM_PROMPT, parseFormloomResponse } from "@formloom/llm";
import { generateText, tool } from "ai";
import { z } from "zod";

const result = await generateText({
  model: yourModel,
  system: `You are a helpful assistant.\n\n${FORMLOOM_SYSTEM_PROMPT}`,
  prompt: "I need to register for the conference",
  tools: {
    formloom_collect: tool({
      description: "Present a form to collect structured data",
      parameters: z.any(),
      execute: async (args) => {
        const parsed = parseFormloomResponse(args);
        if (parsed.success) {
          // Render the form to the user
          return await renderAndCollect(parsed.schema);
        }
        return { error: parsed.errors };
      },
    }),
  },
});
```

## Parser

The parser handles multiple formats LLMs might output:

1. **Direct object** - Already-parsed tool call arguments
2. **JSON string** - Raw text containing JSON
3. **Markdown code block** - JSON inside \`\`\`json ... \`\`\`
4. **Embedded JSON** - JSON mixed into prose text

```ts
import { parseFormloomResponse } from "@formloom/llm";

const result = parseFormloomResponse(input);
// result.success: boolean
// result.schema: FormloomSchema | null
// result.errors: string[]
```

## Exports

| Export | Description |
|--------|-------------|
| `FORMLOOM_SYSTEM_PROMPT` | System prompt fragment teaching the LLM the Formloom vocabulary |
| `FORMLOOM_TOOL_OPENAI` | Tool definition in OpenAI function calling format |
| `FORMLOOM_TOOL_ANTHROPIC` | Tool definition in Anthropic tool_use format |
| `parseFormloomResponse` | Extract and validate a schema from LLM output |

## License

MIT
