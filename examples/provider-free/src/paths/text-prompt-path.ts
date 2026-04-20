import type { FormloomSchema } from "@formloom/schema";
import { parseFormloomResponse } from "@formloom/llm";

/**
 * Simulates a model that lacks tool-calling. Such models are told (via
 * FORMLOOM_TEXT_PROMPT) to emit a ```formloom fenced block in their prose
 * response; our parser extracts and validates it.
 */
export function textPromptPath(schema: FormloomSchema): {
  path: "text-prompt";
  label: string;
  result: ReturnType<typeof parseFormloomResponse>;
} {
  const prose = [
    "Sure, here's a form I've drafted for you:",
    "",
    "```formloom",
    JSON.stringify(schema, null, 2),
    "```",
    "",
    "Let me know when you've filled it out.",
  ].join("\n");
  const result = parseFormloomResponse(prose);
  return {
    path: "text-prompt",
    label: "text prompt (```formloom fenced)",
    result,
  };
}
