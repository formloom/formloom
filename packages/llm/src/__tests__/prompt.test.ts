import { describe, it, expect } from "vitest";
import { FORMLOOM_SYSTEM_PROMPT } from "../prompt";
import { FIELD_TYPES } from "@formloom/schema";

describe("FORMLOOM_SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof FORMLOOM_SYSTEM_PROMPT).toBe("string");
    expect(FORMLOOM_SYSTEM_PROMPT.length).toBeGreaterThan(100);
  });

  it("mentions all field types", () => {
    for (const type of FIELD_TYPES) {
      expect(FORMLOOM_SYSTEM_PROMPT).toContain(`**${type}**`);
    }
  });

  it("mentions the tool name", () => {
    expect(FORMLOOM_SYSTEM_PROMPT).toContain("formloom_collect");
  });

  it("contains key instructions", () => {
    expect(FORMLOOM_SYSTEM_PROMPT).toContain("validation.required");
    expect(FORMLOOM_SYSTEM_PROMPT).toContain("snake_case");
    expect(FORMLOOM_SYSTEM_PROMPT).toContain("options");
    expect(FORMLOOM_SYSTEM_PROMPT).toContain("pattern");
  });
});
