import { describe, it, expect } from "vitest";
import { FORMLOOM_SYSTEM_PROMPT, FORMLOOM_TEXT_PROMPT } from "../prompt";

describe("FORMLOOM_SYSTEM_PROMPT (v1.1)", () => {
  it("mentions every primitive field type", () => {
    for (const t of [
      "text",
      "boolean",
      "radio",
      "select",
      "date",
      "number",
      "file",
    ]) {
      expect(FORMLOOM_SYSTEM_PROMPT).toMatch(new RegExp(`\\b${t}\\b`));
    }
  });

  it("mentions showIf and sections", () => {
    expect(FORMLOOM_SYSTEM_PROMPT).toMatch(/showIf/);
    expect(FORMLOOM_SYSTEM_PROMPT).toMatch(/sections/);
  });

  it("mentions canonical hints", () => {
    expect(FORMLOOM_SYSTEM_PROMPT).toMatch(/hints\.display/);
  });

  it("stays within the 3 KB budget", () => {
    expect(FORMLOOM_SYSTEM_PROMPT.length).toBeLessThan(3072);
  });
});

describe("FORMLOOM_TEXT_PROMPT", () => {
  it("tells the model to emit a ```formloom fenced block", () => {
    expect(FORMLOOM_TEXT_PROMPT).toMatch(/```formloom/);
  });

  it("includes a concrete example", () => {
    expect(FORMLOOM_TEXT_PROMPT).toMatch(/"version":\s*"1\.1"/);
  });
});
