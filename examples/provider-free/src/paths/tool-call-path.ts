import type { FormloomSchema } from "@formloom/schema";
import { parseFormloomResponse } from "@formloom/llm";

/**
 * Simulates an OpenAI/Anthropic tool-call response. The runtime hands the
 * tool call arguments (already parsed from JSON) to `parseFormloomResponse`,
 * which validates and returns a typed schema.
 */
export function toolCallPath(schema: FormloomSchema): {
  path: "tool-call";
  label: string;
  result: ReturnType<typeof parseFormloomResponse>;
} {
  const simulatedToolCallArgs = JSON.parse(JSON.stringify(schema));
  const result = parseFormloomResponse(simulatedToolCallArgs);
  return {
    path: "tool-call",
    label: "tool_call (OpenAI / Anthropic)",
    result,
  };
}
