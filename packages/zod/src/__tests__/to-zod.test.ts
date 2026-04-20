import { describe, it, expect } from "vitest";
import { formloomToZod, formloomToZodObject } from "../to-zod";
import type { FormloomSchema } from "@formloom/schema";

describe("formloomToZod - text + required", () => {
  const schema: FormloomSchema = {
    version: "1.1",
    fields: [
      { id: "name", type: "text", label: "Name", validation: { required: true } },
      {
        id: "email",
        type: "text",
        label: "Email",
        validation: {
          pattern: "^[^@]+@[^@]+\\.[^@]+$",
          patternMessage: "bad email",
        },
      },
    ],
  };

  it("accepts valid data", () => {
    const z = formloomToZod(schema);
    const result = z.safeParse({ name: "Alice", email: "alice@x.co" });
    expect(result.success).toBe(true);
  });

  it("rejects missing required field", () => {
    const z = formloomToZod(schema);
    const result = z.safeParse({ email: "alice@x.co" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(
      result.error.issues.some((i) => i.path[0] === "name"),
    ).toBe(true);
  });

  it("rejects pattern mismatch with custom message", () => {
    const z = formloomToZod(schema);
    const result = z.safeParse({ name: "Alice", email: "not-an-email" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(
      result.error.issues.some((i) => i.message === "bad email"),
    ).toBe(true);
  });
});

describe("formloomToZod - number", () => {
  const schema: FormloomSchema = {
    version: "1.1",
    fields: [
      {
        id: "age",
        type: "number",
        label: "Age",
        validation: { min: 0, max: 120, integer: true, required: true },
      },
    ],
  };

  it("accepts valid integer in range", () => {
    const z = formloomToZod(schema);
    expect(z.safeParse({ age: 30 }).success).toBe(true);
  });

  it("rejects out-of-range", () => {
    const z = formloomToZod(schema);
    expect(z.safeParse({ age: 200 }).success).toBe(false);
  });

  it("rejects non-integers when integer is true", () => {
    const z = formloomToZod(schema);
    expect(z.safeParse({ age: 30.5 }).success).toBe(false);
  });
});

describe("formloomToZod - showIf", () => {
  const schema: FormloomSchema = {
    version: "1.1",
    fields: [
      { id: "country", type: "text", label: "Country" },
      {
        id: "state",
        type: "text",
        label: "State",
        validation: { required: true },
        showIf: { field: "country", equals: "US" },
      },
    ],
  };

  it("does not require hidden dependent fields", () => {
    const z = formloomToZod(schema);
    expect(z.safeParse({ country: "FR" }).success).toBe(true);
  });

  it("requires dependent field when the rule is met", () => {
    const z = formloomToZod(schema);
    expect(z.safeParse({ country: "US" }).success).toBe(false);
    expect(z.safeParse({ country: "US", state: "CA" }).success).toBe(true);
  });
});

describe("formloomToZod - select multiple", () => {
  const schema: FormloomSchema = {
    version: "1.1",
    fields: [
      {
        id: "tags",
        type: "select",
        label: "Tags",
        multiple: true,
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
      },
    ],
  };

  it("accepts a valid array of enum values", () => {
    const z = formloomToZod(schema);
    expect(z.safeParse({ tags: ["a", "b"] }).success).toBe(true);
  });

  it("rejects arrays containing unknown values", () => {
    const z = formloomToZod(schema);
    expect(z.safeParse({ tags: ["a", "x"] }).success).toBe(false);
  });
});

describe("formloomToZod - file", () => {
  const schema: FormloomSchema = {
    version: "1.1",
    fields: [
      {
        id: "photo",
        type: "file",
        label: "Photo",
        maxSizeBytes: 1000,
      },
    ],
  };

  it("accepts a valid inline file", () => {
    const z = formloomToZod(schema);
    const result = z.safeParse({
      photo: {
        kind: "inline",
        name: "a.png",
        mime: "image/png",
        size: 500,
        dataUrl: "data:image/png;base64,xxx",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects files over maxSizeBytes", () => {
    const z = formloomToZod(schema);
    const result = z.safeParse({
      photo: {
        kind: "inline",
        name: "a.png",
        mime: "image/png",
        size: 5000,
        dataUrl: "data:image/png;base64,xxx",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects files whose MIME does not match accept", () => {
    const acceptSchema: FormloomSchema = {
      version: "1.1",
      fields: [
        {
          id: "resume",
          type: "file",
          label: "Resume",
          accept: "application/pdf,.pdf",
        },
      ],
    };
    const z = formloomToZod(acceptSchema);
    const result = z.safeParse({
      resume: {
        kind: "inline",
        name: "notes.txt",
        mime: "text/plain",
        size: 50,
        dataUrl: "data:text/plain;base64,xxx",
      },
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(
      result.error.issues.some((i) => i.message.includes("not accepted")),
    ).toBe(true);
  });

  it("exposes formloomToZodObject so consumers can access .shape", () => {
    const schema: FormloomSchema = {
      version: "1.1",
      fields: [{ id: "name", type: "text", label: "Name" }],
    };
    const object = formloomToZodObject(schema);
    expect(Object.keys(object.shape)).toContain("name");
  });

  it("accepts files when filename extension matches the accept list", () => {
    const acceptSchema: FormloomSchema = {
      version: "1.1",
      fields: [
        {
          id: "resume",
          type: "file",
          label: "Resume",
          accept: ".pdf",
        },
      ],
    };
    const z = formloomToZod(acceptSchema);
    const result = z.safeParse({
      resume: {
        kind: "inline",
        name: "resume.pdf",
        mime: "application/pdf",
        size: 100,
        dataUrl: "data:application/pdf;base64,xxx",
      },
    });
    expect(result.success).toBe(true);
  });
});
