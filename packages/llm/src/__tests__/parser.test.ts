import { describe, it, expect } from "vitest";
import { parseFormloomResponse } from "../parser";

const VALID_SCHEMA = {
  version: "1.0",
  fields: [{ id: "name", type: "text", label: "Name" }],
};

describe("parseFormloomResponse", () => {
  // ---- Direct object ----
  it("parses a valid direct object", () => {
    const result = parseFormloomResponse(VALID_SCHEMA);
    expect(result.success).toBe(true);
    expect(result.schema).toEqual(VALID_SCHEMA);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects an invalid direct object", () => {
    const result = parseFormloomResponse({ version: "1.0", fields: [] });
    expect(result.success).toBe(false);
    expect(result.schema).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  // ---- JSON string ----
  it("parses a plain JSON string", () => {
    const result = parseFormloomResponse(JSON.stringify(VALID_SCHEMA));
    expect(result.success).toBe(true);
    expect(result.schema).toEqual(VALID_SCHEMA);
  });

  // ---- Markdown code block ----
  it("parses JSON from a markdown code block", () => {
    const markdown = `Here is the form:\n\n\`\`\`json\n${JSON.stringify(VALID_SCHEMA, null, 2)}\n\`\`\`\n\nPlease fill it out.`;
    const result = parseFormloomResponse(markdown);
    expect(result.success).toBe(true);
    expect(result.schema).toEqual(VALID_SCHEMA);
  });

  it("parses JSON from a code block without language tag", () => {
    const markdown = `\`\`\`\n${JSON.stringify(VALID_SCHEMA)}\n\`\`\``;
    const result = parseFormloomResponse(markdown);
    expect(result.success).toBe(true);
  });

  // ---- JSON embedded in prose ----
  it("extracts JSON embedded in prose text", () => {
    const prose = `Sure, here's the form for you: ${JSON.stringify(VALID_SCHEMA)} Hope that helps!`;
    const result = parseFormloomResponse(prose);
    expect(result.success).toBe(true);
    expect(result.schema).toEqual(VALID_SCHEMA);
  });

  // ---- Invalid inputs ----
  it("fails gracefully on malformed JSON string", () => {
    const result = parseFormloomResponse("{not valid json}");
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("fails gracefully on string with no JSON", () => {
    const result = parseFormloomResponse("Hello, how can I help you?");
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("Could not extract");
  });

  it("fails on valid JSON but invalid schema", () => {
    const badSchema = JSON.stringify({ version: "2.0", fields: [] });
    const result = parseFormloomResponse(badSchema);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects null input", () => {
    const result = parseFormloomResponse(null);
    expect(result.success).toBe(false);
  });

  it("rejects undefined input", () => {
    const result = parseFormloomResponse(undefined);
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("Unexpected input type");
  });

  it("rejects array input", () => {
    const result = parseFormloomResponse([VALID_SCHEMA]);
    expect(result.success).toBe(false);
  });

  it("rejects number input", () => {
    const result = parseFormloomResponse(42);
    expect(result.success).toBe(false);
  });

  it("returns validation errors from invalid schema in string", () => {
    const badSchema = JSON.stringify({
      version: "1.0",
      fields: [{ id: "", type: "text", label: "A" }],
    });
    const result = parseFormloomResponse(badSchema);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes("id"))).toBe(true);
  });
});
