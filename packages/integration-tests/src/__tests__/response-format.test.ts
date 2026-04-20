import { describe, it, expect } from "vitest";
import {
  FORMLOOM_RESPONSE_FORMAT_OPENAI,
  parseFormloomResponse,
} from "@formloom/llm";
import type { FormloomSchema } from "@formloom/schema";

/**
 * Guardrails for the OpenAI `response_format: { type: "json_schema" }` export.
 *
 * OpenAI rejects a response_format payload if:
 *   - `strict: true` is set on a schema that has open objects (additionalProperties unset or true) or `required` that doesn't list every property.
 *
 * Formloom's canonical schema is intentionally permissive (hints has `additionalProperties: true`; field items only require id/type/label). This test
 * pins the export to non-strict mode so the documented README recipe works
 * against the real API.
 */
describe("FORMLOOM_RESPONSE_FORMAT_OPENAI", () => {
  it("uses type: json_schema", () => {
    expect(FORMLOOM_RESPONSE_FORMAT_OPENAI.type).toBe("json_schema");
  });

  it("does not set strict: true — Formloom's schema is intentionally permissive", () => {
    expect("strict" in FORMLOOM_RESPONSE_FORMAT_OPENAI.json_schema).toBe(false);
  });

  it("names the schema and attaches a description", () => {
    expect(FORMLOOM_RESPONSE_FORMAT_OPENAI.json_schema.name).toBe(
      "formloom_collect",
    );
    expect(
      typeof FORMLOOM_RESPONSE_FORMAT_OPENAI.json_schema.description,
    ).toBe("string");
  });

  it("round-trips through parseFormloomResponse", () => {
    const simulatedResponseContent = JSON.stringify({
      version: "1.1",
      title: "From response_format",
      fields: [{ id: "name", type: "text", label: "Name" }],
    } satisfies FormloomSchema);

    const result = parseFormloomResponse(simulatedResponseContent);
    expect(result.success).toBe(true);
    expect(result.schema?.title).toBe("From response_format");
  });
});
