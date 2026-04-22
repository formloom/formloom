import { describe, it, expect } from "vitest";
import { FORMLOOM_SYSTEM_PROMPT, FORMLOOM_TEXT_PROMPT } from "../prompt";

describe("FORMLOOM_SYSTEM_PROMPT", () => {
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

  it("stays within the 4 KB budget", () => {
    // Raised from 3 KB in v1.2 to accommodate option descriptions, allowCustom,
    // and hints.variant. Still comfortably prompt-cache-friendly.
    expect(FORMLOOM_SYSTEM_PROMPT.length).toBeLessThan(4096);
  });
});

describe("FORMLOOM_TEXT_PROMPT", () => {
  it("tells the model to emit a ```formloom fenced block", () => {
    expect(FORMLOOM_TEXT_PROMPT).toMatch(/```formloom/);
  });

  it("includes a concrete example with the current schema version", () => {
    expect(FORMLOOM_TEXT_PROMPT).toMatch(/"version":\s*"1\.2"/);
  });
});
