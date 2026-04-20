import { describe, it, expect } from "vitest";
import { parseFormloomResponse } from "@formloom/llm";
import type { FormloomSchema } from "@formloom/schema";

/**
 * Every first-class provider must deliver tool arguments in a shape the parser
 * accepts. This test pretends to be each provider and asserts the parser
 * yields the same FormloomSchema downstream.
 */

const schema: FormloomSchema = {
  version: "1.1",
  title: "Provider parity",
  fields: [
    { id: "name", type: "text", label: "Name", validation: { required: true } },
  ],
};

describe("parser accepts every provider's tool call shape", () => {
  it("OpenAI: JSON string arguments", () => {
    const result = parseFormloomResponse(JSON.stringify(schema));
    expect(result.success).toBe(true);
    expect(result.schema?.fields[0].id).toBe("name");
  });

  it("Anthropic: already-parsed input object", () => {
    const result = parseFormloomResponse(schema);
    expect(result.success).toBe(true);
  });

  it("Gemini: already-parsed function-call args", () => {
    // Gemini hands functionCall.args as an object
    const result = parseFormloomResponse({ ...schema });
    expect(result.success).toBe(true);
  });

  it("Text-only mode: ```formloom fenced prose", () => {
    const prose = [
      "Here's the form:",
      "",
      "```formloom",
      JSON.stringify(schema),
      "```",
      "",
      "That's all.",
    ].join("\n");
    const result = parseFormloomResponse(prose);
    expect(result.success).toBe(true);
  });
});
