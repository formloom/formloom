import { describe, it, expect } from "vitest";
import { validateSchema } from "../validate";
import type { FormloomSchema } from "../types";

// ---- Helpers ----

function validSchema(
  overrides: Partial<FormloomSchema> = {},
): FormloomSchema {
  return {
    version: "1.0",
    fields: [
      { id: "name", type: "text", label: "Name" },
    ],
    ...overrides,
  };
}

// ---- Valid schemas ----

describe("validateSchema - valid schemas", () => {
  it("accepts a minimal valid schema", () => {
    const result = validateSchema(validSchema());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("accepts a schema with all field types", () => {
    const result = validateSchema(
      validSchema({
        title: "Full Form",
        description: "A form with every field type",
        submitLabel: "Send",
        fields: [
          {
            id: "name",
            type: "text",
            label: "Name",
            placeholder: "Jane Doe",
            defaultValue: "",
          },
          {
            id: "agree",
            type: "boolean",
            label: "I agree",
            defaultValue: false,
          },
          {
            id: "color",
            type: "radio",
            label: "Favorite Color",
            options: [
              { value: "red", label: "Red" },
              { value: "blue", label: "Blue" },
            ],
            defaultValue: "red",
          },
          {
            id: "tags",
            type: "select",
            label: "Tags",
            options: [
              { value: "a", label: "Alpha" },
              { value: "b", label: "Beta" },
            ],
            multiple: true,
            placeholder: "Pick tags",
            defaultValue: ["a"],
          },
          {
            id: "dob",
            type: "date",
            label: "Date of Birth",
            placeholder: "YYYY-MM-DD",
            defaultValue: "1990-01-01",
          },
        ],
      }),
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("accepts a schema with validation rules and patterns", () => {
    const result = validateSchema(
      validSchema({
        fields: [
          {
            id: "email",
            type: "text",
            label: "Email",
            validation: {
              required: true,
              pattern: "^[^@]+@[^@]+\\.[^@]+$",
              patternMessage: "Must be a valid email",
            },
          },
        ],
      }),
    );
    expect(result.valid).toBe(true);
  });

  it("accepts extra unknown properties (forward compatibility)", () => {
    const input = {
      version: "1.0",
      fields: [
        {
          id: "x",
          type: "text",
          label: "X",
          futureProperty: true,
        },
      ],
      futureTopLevel: "something",
    };
    const result = validateSchema(input);
    expect(result.valid).toBe(true);
  });

  it("accepts a schema with render hints", () => {
    const result = validateSchema(
      validSchema({
        fields: [
          {
            id: "bio",
            type: "text",
            label: "Bio",
            hints: { display: "textarea", width: "full", rows: 5 },
          },
        ],
      }),
    );
    expect(result.valid).toBe(true);
  });

  it("handles a large schema (100 fields)", () => {
    const fields = Array.from({ length: 100 }, (_, i) => ({
      id: `field_${i}`,
      type: "text" as const,
      label: `Field ${i}`,
    }));
    const result = validateSchema(validSchema({ fields }));
    expect(result.valid).toBe(true);
  });

  it("accepts unicode in labels and values", () => {
    const result = validateSchema(
      validSchema({
        title: "Formulario de contacto",
        fields: [
          {
            id: "nombre",
            type: "radio",
            label: "Tamano",
            options: [
              { value: "pequeno", label: "Pequeno" },
              { value: "grande", label: "Grande" },
            ],
          },
        ],
      }),
    );
    expect(result.valid).toBe(true);
  });
});

// ---- Invalid top-level ----

describe("validateSchema - invalid top-level", () => {
  it("rejects null", () => {
    const result = validateSchema(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/non-null object/);
  });

  it("rejects non-object", () => {
    expect(validateSchema("string").valid).toBe(false);
    expect(validateSchema(42).valid).toBe(false);
    expect(validateSchema(true).valid).toBe(false);
    expect(validateSchema(undefined).valid).toBe(false);
  });

  it("rejects missing version", () => {
    const result = validateSchema({ fields: [{ id: "a", type: "text", label: "A" }] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "version")).toBe(true);
  });

  it("rejects wrong version", () => {
    const result = validateSchema({
      version: "2.0",
      fields: [{ id: "a", type: "text", label: "A" }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "version")).toBe(true);
  });

  it("rejects missing fields", () => {
    const result = validateSchema({ version: "1.0" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "fields")).toBe(true);
  });

  it("rejects empty fields array", () => {
    const result = validateSchema({ version: "1.0", fields: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("empty"))).toBe(true);
  });

  it("rejects non-array fields", () => {
    const result = validateSchema({ version: "1.0", fields: "not-an-array" });
    expect(result.valid).toBe(false);
  });

  it("rejects non-string title", () => {
    const result = validateSchema({
      version: "1.0",
      title: 123,
      fields: [{ id: "a", type: "text", label: "A" }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "title")).toBe(true);
  });

  it("rejects non-string submitLabel", () => {
    const result = validateSchema({
      version: "1.0",
      submitLabel: false,
      fields: [{ id: "a", type: "text", label: "A" }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "submitLabel")).toBe(true);
  });
});

// ---- Invalid fields ----

describe("validateSchema - invalid fields", () => {
  it("rejects field that is not an object", () => {
    const result = validateSchema({ version: "1.0", fields: ["string"] });
    expect(result.valid).toBe(false);
    expect(result.errors[0].path).toBe("fields[0]");
  });

  it("rejects null field", () => {
    const result = validateSchema({ version: "1.0", fields: [null] });
    expect(result.valid).toBe(false);
  });

  it("rejects missing id", () => {
    const result = validateSchema({
      version: "1.0",
      fields: [{ type: "text", label: "A" }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("id"))).toBe(true);
  });

  it("rejects empty id", () => {
    const result = validateSchema({
      version: "1.0",
      fields: [{ id: "  ", type: "text", label: "A" }],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects duplicate ids", () => {
    const result = validateSchema({
      version: "1.0",
      fields: [
        { id: "dup", type: "text", label: "First" },
        { id: "dup", type: "text", label: "Second" },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("Duplicate"))).toBe(true);
  });

  it("rejects invalid type", () => {
    const result = validateSchema({
      version: "1.0",
      fields: [{ id: "a", type: "email", label: "Email" }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("Unknown field type"))).toBe(true);
  });

  it("rejects missing label", () => {
    const result = validateSchema({
      version: "1.0",
      fields: [{ id: "a", type: "text" }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("label"))).toBe(true);
  });

  it("rejects empty label", () => {
    const result = validateSchema({
      version: "1.0",
      fields: [{ id: "a", type: "text", label: "" }],
    });
    expect(result.valid).toBe(false);
  });
});

// ---- Type-specific validation ----

describe("validateSchema - type-specific", () => {
  it("rejects radio with missing options", () => {
    const result = validateSchema({
      version: "1.0",
      fields: [{ id: "a", type: "radio", label: "Pick" }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("options"))).toBe(true);
  });

  it("rejects radio with empty options", () => {
    const result = validateSchema({
      version: "1.0",
      fields: [{ id: "a", type: "radio", label: "Pick", options: [] }],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects select with missing options", () => {
    const result = validateSchema({
      version: "1.0",
      fields: [{ id: "a", type: "select", label: "Pick" }],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects options with duplicate values", () => {
    const result = validateSchema({
      version: "1.0",
      fields: [
        {
          id: "a",
          type: "radio",
          label: "Pick",
          options: [
            { value: "x", label: "X" },
            { value: "x", label: "Y" },
          ],
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("Duplicate option"))).toBe(true);
  });

  it("rejects option without label", () => {
    const result = validateSchema({
      version: "1.0",
      fields: [
        {
          id: "a",
          type: "radio",
          label: "Pick",
          options: [{ value: "x" }],
        },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects wrong defaultValue type for text", () => {
    const result = validateSchema({
      version: "1.0",
      fields: [{ id: "a", type: "text", label: "A", defaultValue: 123 }],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects wrong defaultValue type for boolean", () => {
    const result = validateSchema({
      version: "1.0",
      fields: [{ id: "a", type: "boolean", label: "A", defaultValue: "yes" }],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects wrong defaultValue type for radio", () => {
    const result = validateSchema({
      version: "1.0",
      fields: [
        {
          id: "a",
          type: "radio",
          label: "A",
          options: [{ value: "x", label: "X" }],
          defaultValue: 123,
        },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects wrong defaultValue type for select", () => {
    const result = validateSchema({
      version: "1.0",
      fields: [
        {
          id: "a",
          type: "select",
          label: "A",
          options: [{ value: "x", label: "X" }],
          defaultValue: 123,
        },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects wrong defaultValue type for date", () => {
    const result = validateSchema({
      version: "1.0",
      fields: [{ id: "a", type: "date", label: "A", defaultValue: 123 }],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects invalid regex in pattern", () => {
    const result = validateSchema({
      version: "1.0",
      fields: [
        {
          id: "a",
          type: "text",
          label: "A",
          validation: { pattern: "[invalid" },
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("Invalid regex"))).toBe(true);
  });

  it("rejects non-boolean multiple on select", () => {
    const result = validateSchema({
      version: "1.0",
      fields: [
        {
          id: "a",
          type: "select",
          label: "A",
          options: [{ value: "x", label: "X" }],
          multiple: "yes",
        },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects non-object validation", () => {
    const result = validateSchema({
      version: "1.0",
      fields: [{ id: "a", type: "text", label: "A", validation: "required" }],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects non-boolean required in validation", () => {
    const result = validateSchema({
      version: "1.0",
      fields: [
        { id: "a", type: "text", label: "A", validation: { required: "yes" } },
      ],
    });
    expect(result.valid).toBe(false);
  });
});

// ---- Error collection ----

describe("validateSchema - error collection", () => {
  it("collects multiple errors from a single schema", () => {
    const result = validateSchema({
      version: "2.0",
      title: 123,
      fields: [
        { id: "", type: "unknown", label: "" },
        { id: "a", type: "text", label: "A", defaultValue: 999 },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(3);
  });
});
