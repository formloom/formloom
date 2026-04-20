import { describe, it, expect } from "vitest";
import { toolChoice } from "../tool-choice";

describe("toolChoice.openai()", () => {
  it("forces the formloom_collect function", () => {
    expect(toolChoice.openai()).toEqual({
      type: "function",
      function: { name: "formloom_collect" },
    });
  });
});

describe("toolChoice.anthropic()", () => {
  it("forces the formloom_collect tool", () => {
    expect(toolChoice.anthropic()).toEqual({
      type: "tool",
      name: "formloom_collect",
    });
  });
});
