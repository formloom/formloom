import type { FormloomSchema } from "@formloom/schema";
import {
  parseFormloomResponse,
  FORMLOOM_RESPONSE_FORMAT_OPENAI,
} from "@formloom/llm";

/**
 * Simulates OpenAI's `response_format: { type: "json_schema" }` deterministic
 * flow. With response_format set, the model returns a raw JSON string in the
 * message content; our parser handles both direct objects and JSON strings.
 */
export function responseFormatPath(schema: FormloomSchema): {
  path: "response-format";
  label: string;
  responseFormat: typeof FORMLOOM_RESPONSE_FORMAT_OPENAI;
  result: ReturnType<typeof parseFormloomResponse>;
} {
  const simulatedContent = JSON.stringify(schema);
  const result = parseFormloomResponse(simulatedContent);
  return {
    path: "response-format",
    label: "response_format (OpenAI JSON mode)",
    responseFormat: FORMLOOM_RESPONSE_FORMAT_OPENAI,
    result,
  };
}
