import { describe, it, expect } from "vitest";
import { validateField, mimeMatches, fileMatchesAccept } from "../validation";
import type { FormField } from "@formloom/schema";

describe("validateField - number", () => {
  const field: FormField = {
    id: "n",
    type: "number",
    label: "N",
    validation: { min: 0, max: 10, integer: true },
  };

  it("accepts a valid value", () => {
    expect(validateField(field, 5)).toBeNull();
  });

  it("rejects non-number values", () => {
    expect(validateField(field, "5" as unknown as number)).toContain("must be a number");
  });

  it("rejects below min", () => {
    expect(validateField(field, -1)).toContain("at least");
  });

  it("rejects above max", () => {
    expect(validateField(field, 11)).toContain("at most");
  });

  it("rejects non-integers when integer is required", () => {
    expect(validateField(field, 3.5)).toContain("whole number");
  });

  it("rejects step misalignment", () => {
    const stepField: FormField = {
      id: "s",
      type: "number",
      label: "S",
      validation: { min: 0, step: 0.5 },
    };
    expect(validateField(stepField, 0.5)).toBeNull();
    expect(validateField(stepField, 0.75)).toContain("multiple of");
  });

  it("skips validation when value is null", () => {
    expect(validateField(field, null)).toBeNull();
  });
});

describe("validateField - file", () => {
  const field: FormField = {
    id: "f",
    type: "file",
    label: "F",
    accept: "image/png,image/jpeg",
    maxSizeBytes: 1024,
  };

  const inlineFile = (size: number, mime = "image/png") => ({
    kind: "inline" as const,
    name: "a.png",
    mime,
    size,
    dataUrl: "data:image/png;base64,xxx",
  });

  it("accepts a valid inline file", () => {
    expect(validateField(field, inlineFile(500))).toBeNull();
  });

  it("rejects oversized files", () => {
    expect(validateField(field, inlineFile(2048))).toContain("larger than");
  });

  it("rejects disallowed MIME types", () => {
    expect(validateField(field, inlineFile(500, "application/pdf"))).toContain(
      "not accepted",
    );
  });

  it("handles multiple file arrays", () => {
    const multi = [inlineFile(500), inlineFile(2048)];
    expect(validateField(field, multi)).toContain("larger than");
  });
});

describe("validateField - required", () => {
  const textField: FormField = {
    id: "t",
    type: "text",
    label: "T",
    validation: { required: true },
  };

  it("rejects empty text", () => {
    expect(validateField(textField, "")).toContain("required");
    expect(validateField(textField, null)).toContain("required");
  });

  it("accepts non-empty text", () => {
    expect(validateField(textField, "hello")).toBeNull();
  });

  it("rejects empty array for required select", () => {
    const selField: FormField = {
      id: "s",
      type: "select",
      label: "S",
      options: [{ value: "a", label: "A" }],
      multiple: true,
      validation: { required: true },
    };
    expect(validateField(selField, [])).toContain("required");
  });
});

describe("validateField - pattern (safe)", () => {
  const emailField: FormField = {
    id: "e",
    type: "text",
    label: "Email",
    validation: {
      pattern: "^[^@]+@[^@]+\\.[^@]+$",
      patternMessage: "bad email",
    },
  };

  it("accepts matching patterns", () => {
    expect(validateField(emailField, "a@b.co")).toBeNull();
  });

  it("rejects mismatch with custom message", () => {
    expect(validateField(emailField, "nope")).toBe("bad email");
  });

  it("skips validation on empty non-required values", () => {
    expect(validateField(emailField, "")).toBeNull();
  });
});

describe("mimeMatches", () => {
  it("matches exact MIME", () => {
    expect(mimeMatches("image/png", "image/png")).toBe(true);
  });

  it("matches wildcards", () => {
    expect(mimeMatches("image/png", "image/*")).toBe(true);
    expect(mimeMatches("video/mp4", "image/*")).toBe(false);
  });

  it("matches comma-separated lists", () => {
    expect(mimeMatches("application/pdf", "image/*,application/pdf")).toBe(true);
  });

  it("allows */* and *", () => {
    expect(mimeMatches("anything/goes", "*/*")).toBe(true);
  });

  it("ignores bare-extension entries (no filename context)", () => {
    expect(mimeMatches("application/pdf", ".pdf")).toBe(false);
    expect(mimeMatches("image/png", ".heic,image/*")).toBe(true);
  });
});

describe("fileMatchesAccept", () => {
  it("matches on MIME", () => {
    expect(fileMatchesAccept("image/png", "image/png", "a.png")).toBe(true);
    expect(fileMatchesAccept("image/*", "image/png", "a.png")).toBe(true);
  });

  it("matches on filename extension", () => {
    expect(fileMatchesAccept(".pdf", "application/pdf", "a.pdf")).toBe(true);
    expect(fileMatchesAccept(".pdf", "application/pdf", "a.txt")).toBe(false);
  });

  it("matches on mixed MIME + extension lists", () => {
    expect(fileMatchesAccept("image/*,.pdf", "application/pdf", "a.pdf")).toBe(true);
    expect(fileMatchesAccept("image/*,.pdf", "image/png", "a.png")).toBe(true);
    expect(fileMatchesAccept("image/*,.pdf", "text/plain", "a.txt")).toBe(false);
  });

  it("is case-insensitive on filename extensions", () => {
    expect(fileMatchesAccept(".PDF", "application/pdf", "a.pdf")).toBe(true);
    expect(fileMatchesAccept(".pdf", "application/pdf", "a.PDF")).toBe(true);
  });

  it("returns true for empty accept lists", () => {
    expect(fileMatchesAccept("", "image/png", "a.png")).toBe(true);
  });
});
