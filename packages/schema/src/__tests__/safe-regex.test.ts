import { describe, it, expect, vi } from "vitest";
import {
  safeRegexTest,
  isCatastrophicPattern,
  isValidRegexSyntax,
} from "../safe-regex";

describe("isCatastrophicPattern", () => {
  it("flags nested quantifiers", () => {
    expect(isCatastrophicPattern("(a+)+")).toBe(true);
    expect(isCatastrophicPattern("(a*)*")).toBe(true);
    expect(isCatastrophicPattern("(a+)+$")).toBe(true);
    expect(isCatastrophicPattern("(x[0-9]+)+")).toBe(true);
  });

  it("flags bounded-quantifier nesting", () => {
    expect(isCatastrophicPattern("(a{1,5})+")).toBe(true);
    expect(isCatastrophicPattern("(a{3,})+")).toBe(true);
    expect(isCatastrophicPattern("(ab{2})*")).toBe(true);
  });

  it("flags overlapping alternations under quantifiers", () => {
    expect(isCatastrophicPattern("(a|a)+")).toBe(true);
    expect(isCatastrophicPattern("(a|ab)+")).toBe(true);
    expect(isCatastrophicPattern("(abc|abcd)+")).toBe(true);
  });

  it("flags backreferences", () => {
    expect(isCatastrophicPattern("(a+)\\1")).toBe(true);
    expect(isCatastrophicPattern("^(.+)\\1$")).toBe(true);
  });

  it("passes common safe patterns", () => {
    expect(isCatastrophicPattern("^[^@]+@[^@]+\\.[^@]+$")).toBe(false);
    expect(isCatastrophicPattern("^\\d{4}-\\d{2}-\\d{2}$")).toBe(false);
    expect(isCatastrophicPattern("^[a-zA-Z0-9_]+$")).toBe(false);
    expect(isCatastrophicPattern("https?://\\S+")).toBe(false);
  });

  it("returns false for non-string input", () => {
    expect(isCatastrophicPattern(42 as unknown as string)).toBe(false);
    expect(isCatastrophicPattern(null as unknown as string)).toBe(false);
  });
});

describe("isValidRegexSyntax", () => {
  it("accepts compilable patterns", () => {
    expect(isValidRegexSyntax("^abc$")).toBe(true);
    expect(isValidRegexSyntax("^[a-z]+$")).toBe(true);
  });

  it("rejects uncompilable patterns", () => {
    expect(isValidRegexSyntax("(")).toBe(false);
    expect(isValidRegexSyntax("[a-")).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isValidRegexSyntax(42 as unknown as string)).toBe(false);
  });
});

describe("safeRegexTest", () => {
  it("matches a safe pattern against a short value", () => {
    const result = safeRegexTest("^[a-z]+$", "abc");
    expect(result.skipped).toBe(false);
    expect(result.matched).toBe(true);
  });

  it("reports non-match for a safe pattern", () => {
    const result = safeRegexTest("^\\d+$", "abc");
    expect(result.skipped).toBe(false);
    expect(result.matched).toBe(false);
  });

  it("skips a catastrophic pattern without hanging", () => {
    const onWarn = vi.fn();
    const start = Date.now();
    const result = safeRegexTest("(a+)+$", "a".repeat(30) + "b", { onWarn });
    const elapsed = Date.now() - start;
    expect(result.skipped).toBe(true);
    expect(result.matched).toBe(false);
    expect(result.reason).toContain("catastrophic");
    expect(onWarn).toHaveBeenCalled();
    expect(elapsed).toBeLessThan(50);
  });

  it("skips when input exceeds the length cap", () => {
    const onWarn = vi.fn();
    const result = safeRegexTest("^a+$", "a".repeat(50), {
      maxInputLength: 10,
      onWarn,
    });
    expect(result.skipped).toBe(true);
    expect(result.reason).toContain("exceeds cap");
    expect(onWarn).toHaveBeenCalled();
  });

  it("skips when the pattern fails to compile", () => {
    const result = safeRegexTest("(", "anything");
    expect(result.skipped).toBe(true);
    expect(result.reason).toContain("failed to compile");
  });

  it("never throws on non-string inputs", () => {
    expect(() =>
      safeRegexTest(null as unknown as string, "x"),
    ).not.toThrow();
    const result = safeRegexTest(null as unknown as string, "x");
    expect(result.skipped).toBe(true);
  });
});
