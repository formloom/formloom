import { describe, it, expect } from "vitest";
import { validateSchema } from "../validate";

// ---- Version handling ----

describe("validateSchema - version acceptance (v1.1)", () => {
  it("accepts 1.0 schemas on a 1.1 runtime", () => {
    const result = validateSchema({
      version: "1.0",
      fields: [{ id: "a", type: "text", label: "A" }],
    });
    expect(result.valid).toBe(true);
  });

  it("accepts 1.1 schemas", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [{ id: "a", type: "text", label: "A" }],
    });
    expect(result.valid).toBe(true);
  });

  it("accepts future minor versions (1.99)", () => {
    const result = validateSchema({
      version: "1.99",
      fields: [{ id: "a", type: "text", label: "A" }],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects 2.x with a clear message", () => {
    const result = validateSchema({
      version: "2.0",
      fields: [{ id: "a", type: "text", label: "A" }],
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.message.includes("Unsupported schema major")),
    ).toBe(true);
  });

  it("rejects malformed version strings", () => {
    const result = validateSchema({
      version: "latest",
      fields: [{ id: "a", type: "text", label: "A" }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "version")).toBe(true);
  });
});

// ---- Number field ----

describe("validateSchema - number field", () => {
  it("accepts a minimal number field", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [{ id: "count", type: "number", label: "Count" }],
    });
    expect(result.valid).toBe(true);
  });

  it("accepts number with min/max/step/integer", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [
        {
          id: "age",
          type: "number",
          label: "Age",
          validation: { min: 0, max: 120, step: 1, integer: true },
          defaultValue: 18,
        },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects min > max", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [
        {
          id: "x",
          type: "number",
          label: "X",
          validation: { min: 10, max: 5 },
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.message.includes("min") && e.message.includes("<=")),
    ).toBe(true);
  });

  it("rejects step <= 0", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [
        {
          id: "x",
          type: "number",
          label: "X",
          validation: { step: 0 },
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.message.includes("step must be > 0")),
    ).toBe(true);
  });

  it("rejects non-number defaultValue", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [
        {
          id: "x",
          type: "number",
          label: "X",
          defaultValue: "5" as unknown as number,
        },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects non-integer defaultValue when validation.integer is true", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [
        {
          id: "x",
          type: "number",
          label: "X",
          validation: { integer: true },
          defaultValue: 3.5,
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.message.includes("must be an integer")),
    ).toBe(true);
  });
});

// ---- File field ----

describe("validateSchema - file field", () => {
  it("accepts a minimal file field", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [{ id: "avatar", type: "file", label: "Avatar" }],
    });
    expect(result.valid).toBe(true);
  });

  it("accepts accept / maxSizeBytes / multiple", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [
        {
          id: "docs",
          type: "file",
          label: "Documents",
          accept: "application/pdf",
          maxSizeBytes: 1_000_000,
          multiple: true,
        },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects defaultValue on file fields", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [
        {
          id: "x",
          type: "file",
          label: "X",
          defaultValue: "whatever" as unknown,
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) =>
        e.message.includes("do not support defaultValue"),
      ),
    ).toBe(true);
  });

  it("rejects non-integer maxSizeBytes", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [
        {
          id: "x",
          type: "file",
          label: "X",
          maxSizeBytes: 1.5,
        },
      ],
    });
    expect(result.valid).toBe(false);
  });
});

// ---- showIf ----

describe("validateSchema - showIf", () => {
  it("accepts a basic equals rule", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [
        { id: "country", type: "text", label: "Country" },
        {
          id: "state",
          type: "text",
          label: "State",
          showIf: { field: "country", equals: "US" },
        },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it("accepts composed rules", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [
        { id: "a", type: "text", label: "A" },
        { id: "b", type: "text", label: "B" },
        {
          id: "c",
          type: "text",
          label: "C",
          showIf: {
            allOf: [
              { field: "a", equals: "x" },
              { anyOf: [{ field: "b", notEmpty: true }] },
            ],
          },
        },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects showIf referencing a missing field", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [
        {
          id: "x",
          type: "text",
          label: "X",
          showIf: { field: "ghost", equals: "y" },
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.message.includes('unknown field "ghost"')),
    ).toBe(true);
  });

  it("rejects a self-reference", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [
        {
          id: "x",
          type: "text",
          label: "X",
          showIf: { field: "x", equals: "y" },
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.message.includes("cannot reference itself")),
    ).toBe(true);
  });

  it("rejects cyclic dependencies", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [
        {
          id: "a",
          type: "text",
          label: "A",
          showIf: { field: "b", equals: "x" },
        },
        {
          id: "b",
          type: "text",
          label: "B",
          showIf: { field: "a", equals: "x" },
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("cycle"))).toBe(true);
  });

  it("rejects multiple operators on the same leaf", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [
        {
          id: "a",
          type: "text",
          label: "A",
        },
        {
          id: "b",
          type: "text",
          label: "B",
          showIf: { field: "a", equals: "x", in: ["x", "y"] } as unknown,
        },
      ],
    });
    expect(result.valid).toBe(false);
  });
});

// ---- Sections ----

describe("validateSchema - sections", () => {
  it("accepts a valid sections layout", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [
        { id: "a", type: "text", label: "A" },
        { id: "b", type: "text", label: "B" },
      ],
      sections: [
        { id: "main", title: "Main", fieldIds: ["a", "b"] },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects when a field is in two sections", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [
        { id: "a", type: "text", label: "A" },
        { id: "b", type: "text", label: "B" },
      ],
      sections: [
        { id: "s1", fieldIds: ["a", "b"] },
        { id: "s2", fieldIds: ["a"] },
      ],
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.message.includes("already belongs")),
    ).toBe(true);
  });

  it("rejects sections referencing unknown fields", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [{ id: "a", type: "text", label: "A" }],
      sections: [{ id: "s1", fieldIds: ["ghost"] }],
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) =>
        e.message.includes('references unknown field "ghost"'),
      ),
    ).toBe(true);
  });

  it("rejects when a field is not in any section (but sections is present)", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [
        { id: "a", type: "text", label: "A" },
        { id: "b", type: "text", label: "B" },
      ],
      sections: [{ id: "s1", fieldIds: ["a"] }],
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.message.includes('"b" is not assigned')),
    ).toBe(true);
  });

  it("rejects duplicate section ids", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [{ id: "a", type: "text", label: "A" }],
      sections: [
        { id: "s", fieldIds: ["a"] },
        { id: "s", fieldIds: [] },
      ],
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.message.includes("Duplicate section id")),
    ).toBe(true);
  });
});

// ---- forwardCompat ----

describe("validateSchema - forwardCompat", () => {
  it("errors on unknown field type by default (strict)", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [{ id: "a", type: "signature", label: "Sign" }],
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.message.includes("Unknown field type")),
    ).toBe(true);
  });

  it("drops unknown field types in lenient mode", () => {
    const result = validateSchema(
      {
        version: "1.1",
        fields: [
          { id: "name", type: "text", label: "Name" },
          { id: "sig", type: "signature", label: "Sign" },
        ],
      },
      { forwardCompat: "lenient" },
    );
    expect(result.valid).toBe(true);
    expect(result.droppedFields).toContain("sig");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("in lenient mode, dropped field ids are not required in sections", () => {
    const result = validateSchema(
      {
        version: "1.1",
        fields: [
          { id: "name", type: "text", label: "Name" },
          { id: "sig", type: "signature", label: "Sign" },
        ],
        sections: [{ id: "s1", fieldIds: ["name"] }],
      },
      { forwardCompat: "lenient" },
    );
    expect(result.valid).toBe(true);
  });
});

// ---- Catastrophic pattern ----

describe("validateSchema - regex safety", () => {
  it("rejects patterns known to backtrack catastrophically", () => {
    const result = validateSchema({
      version: "1.1",
      fields: [
        {
          id: "a",
          type: "text",
          label: "A",
          validation: { pattern: "(a+)+$" },
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.message.includes("catastrophic")),
    ).toBe(true);
  });
});
