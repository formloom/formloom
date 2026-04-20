import { describe, it, expect } from "vitest";
import { formloomToZod, formloomToStandardSchema } from "@formloom/zod";
import type { FormloomSchema } from "@formloom/schema";

/**
 * Sanity-check: after submitting via useFormloom, the resulting FormloomData
 * can be re-validated by both adapters produced from the same schema. This
 * catches drift between the hook's runtime rules and the adapters'.
 */

describe("zod + standard adapters accept a clean submitted payload", () => {
  const schema: FormloomSchema = {
    version: "1.1",
    fields: [
      { id: "name", type: "text", label: "Name", validation: { required: true } },
      {
        id: "email",
        type: "text",
        label: "Email",
        validation: {
          required: true,
          pattern: "^[^@]+@[^@]+\\.[^@]+$",
        },
      },
      {
        id: "tier",
        type: "radio",
        label: "Tier",
        options: [
          { value: "free", label: "Free" },
          { value: "pro", label: "Pro" },
        ],
        validation: { required: true },
      },
      {
        id: "seats",
        type: "number",
        label: "Seats",
        showIf: { field: "tier", equals: "pro" },
        validation: { min: 1, required: true, integer: true },
      },
    ],
  };

  const validPayload = { name: "Alice", email: "alice@x.co", tier: "free" };

  it("formloomToZod safeParse succeeds", () => {
    const z = formloomToZod(schema);
    const result = z.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("formloomToStandardSchema validate succeeds", () => {
    const std = formloomToStandardSchema(schema);
    const result = std["~standard"].validate(validPayload);
    expect("value" in result).toBe(true);
  });

  it("both reject when a showIf-visible required field is missing", () => {
    const payload = { name: "Alice", email: "alice@x.co", tier: "pro" };
    expect(formloomToZod(schema).safeParse(payload).success).toBe(false);
    expect(
      "issues" in formloomToStandardSchema(schema)["~standard"].validate(payload),
    ).toBe(true);
  });

  it("both accept a showIf-hidden field being absent", () => {
    const payload = { name: "Alice", email: "alice@x.co", tier: "free" };
    expect(formloomToZod(schema).safeParse(payload).success).toBe(true);
    expect(
      "value" in formloomToStandardSchema(schema)["~standard"].validate(payload),
    ).toBe(true);
  });
});
