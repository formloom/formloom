import { describe, it, expect } from "vitest";
import { parseFormloomResponse } from "../parser";

const VALID_SCHEMA = {
  version: "1.1",
  fields: [{ id: "x", type: "text", label: "X" }],
};

describe("parseFormloomResponse - fence preference (v1.1)", () => {
  it("extracts a ```formloom fence", () => {
    const text = `Here is the form:\n\n\`\`\`formloom\n${JSON.stringify(VALID_SCHEMA)}\n\`\`\`\n`;
    const result = parseFormloomResponse(text);
    expect(result.success).toBe(true);
    expect(result.schema?.version).toBe("1.1");
  });

  it("prefers ```formloom over ```json when both are present", () => {
    const junk = { version: "1.1", fields: [{ id: "junk", type: "text", label: "Junk" }] };
    const text =
      `\`\`\`json\n${JSON.stringify(junk)}\n\`\`\`\n\n` +
      `\`\`\`formloom\n${JSON.stringify(VALID_SCHEMA)}\n\`\`\`\n`;
    const result = parseFormloomResponse(text);
    expect(result.success).toBe(true);
    expect(result.schema?.fields[0].id).toBe("x");
  });

  it("falls back to ```json when no ```formloom fence is present", () => {
    const text = `\`\`\`json\n${JSON.stringify(VALID_SCHEMA)}\n\`\`\``;
    const result = parseFormloomResponse(text);
    expect(result.success).toBe(true);
  });

  it("falls back to an unlabeled fence when neither formloom nor json is present", () => {
    const text = `\`\`\`\n${JSON.stringify(VALID_SCHEMA)}\n\`\`\``;
    const result = parseFormloomResponse(text);
    expect(result.success).toBe(true);
  });

  it("still handles inline JSON in prose", () => {
    const text = `Sure, here's the schema: ${JSON.stringify(VALID_SCHEMA)} — ready to render.`;
    const result = parseFormloomResponse(text);
    expect(result.success).toBe(true);
  });
});
