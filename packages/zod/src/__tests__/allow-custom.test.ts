import { describe, it, expect } from "vitest";
import { formloomToZod } from "../to-zod";
import { formloomToStandardSchema } from "../to-standard";
import type { FormloomSchema } from "@formloom/schema";

// ---- Radio ----

describe("formloomToZod — radio with allowCustom (R2)", () => {
  const schema: FormloomSchema = {
    version: "1.2",
    fields: [
      {
        id: "crm",
        type: "radio",
        label: "CRM",
        options: [
          { value: "salesforce", label: "Salesforce" },
          { value: "hubspot", label: "HubSpot" },
        ],
        allowCustom: true,
      },
    ],
  };

  it("accepts an option value", () => {
    const z = formloomToZod(schema);
    const result = z.safeParse({ crm: "salesforce" });
    expect(result.success).toBe(true);
  });

  it("accepts a freeform string outside the options", () => {
    const z = formloomToZod(schema);
    const result = z.safeParse({ crm: "Zoho" });
    expect(result.success).toBe(true);
  });

  it("applies pattern validation to custom values", () => {
    const patterned: FormloomSchema = {
      version: "1.2",
      fields: [
        {
          id: "slug",
          type: "radio",
          label: "Slug",
          options: [{ value: "one", label: "One" }],
          allowCustom: true,
          validation: {
            pattern: "^[a-z0-9-]+$",
            patternMessage: "lowercase and dashes only",
          },
        },
      ],
    };
    const z = formloomToZod(patterned);
    expect(z.safeParse({ slug: "hello-world" }).success).toBe(true);
    const bad = z.safeParse({ slug: "Hello World" });
    expect(bad.success).toBe(false);
    if (!bad.success) {
      expect(
        bad.error.issues.some((i) => i.message === "lowercase and dashes only"),
      ).toBe(true);
    }
  });
});

describe("formloomToZod — radio without allowCustom (regression)", () => {
  it("rejects freeform values", () => {
    const schema: FormloomSchema = {
      version: "1.2",
      fields: [
        {
          id: "crm",
          type: "radio",
          label: "CRM",
          options: [{ value: "salesforce", label: "Salesforce" }],
        },
      ],
    };
    const z = formloomToZod(schema);
    expect(z.safeParse({ crm: "Zoho" }).success).toBe(false);
    expect(z.safeParse({ crm: "salesforce" }).success).toBe(true);
  });
});

// ---- Select ----

describe("formloomToZod — multi-select with allowCustom", () => {
  const schema: FormloomSchema = {
    version: "1.2",
    fields: [
      {
        id: "tools",
        type: "select",
        label: "Tools",
        multiple: true,
        options: [
          { value: "notion", label: "Notion" },
          { value: "linear", label: "Linear" },
        ],
        allowCustom: true,
      },
    ],
  };

  it("accepts mixed option + freeform array", () => {
    const z = formloomToZod(schema);
    const result = z.safeParse({ tools: ["notion", "asana", "linear"] });
    expect(result.success).toBe(true);
  });

  it("accepts all-freeform array", () => {
    const z = formloomToZod(schema);
    const result = z.safeParse({ tools: ["asana", "jira"] });
    expect(result.success).toBe(true);
  });
});

// ---- Standard Schema adapter parity ----

describe("formloomToStandardSchema — allowCustom parity", () => {
  it("accepts freeform radio value", () => {
    const schema: FormloomSchema = {
      version: "1.2",
      fields: [
        {
          id: "crm",
          type: "radio",
          label: "CRM",
          options: [{ value: "sf", label: "SF" }],
          allowCustom: true,
        },
      ],
    };
    const s = formloomToStandardSchema(schema);
    const result = s["~standard"].validate({ crm: "Zoho" });
    expect("issues" in result).toBe(false);
  });

  it("accepts freeform multi-select value", () => {
    const schema: FormloomSchema = {
      version: "1.2",
      fields: [
        {
          id: "tools",
          type: "select",
          label: "Tools",
          multiple: true,
          options: [{ value: "x", label: "X" }],
          allowCustom: true,
        },
      ],
    };
    const s = formloomToStandardSchema(schema);
    const result = s["~standard"].validate({ tools: ["custom-a", "custom-b"] });
    expect("issues" in result).toBe(false);
  });

  it("rejects freeform value that fails pattern", () => {
    const schema: FormloomSchema = {
      version: "1.2",
      fields: [
        {
          id: "slug",
          type: "radio",
          label: "Slug",
          options: [{ value: "one", label: "One" }],
          allowCustom: true,
          validation: {
            pattern: "^[a-z]+$",
            patternMessage: "letters only",
          },
        },
      ],
    };
    const s = formloomToStandardSchema(schema);
    const result = s["~standard"].validate({ slug: "Bad Value" });
    expect("issues" in result).toBe(true);
  });
});
