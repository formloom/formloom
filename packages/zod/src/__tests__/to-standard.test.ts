import { describe, it, expect } from "vitest";
import { formloomToStandardSchema } from "../to-standard";
import type { FormloomSchema } from "@formloom/schema";

describe("formloomToStandardSchema - spec compliance", () => {
  const schema: FormloomSchema = {
    version: "1.1",
    fields: [
      { id: "name", type: "text", label: "Name", validation: { required: true } },
    ],
  };

  it("returns a Standard Schema v1 shaped object", () => {
    const std = formloomToStandardSchema(schema);
    expect(std["~standard"].version).toBe(1);
    expect(std["~standard"].vendor).toBe("formloom");
    expect(typeof std["~standard"].validate).toBe("function");
  });
});

describe("formloomToStandardSchema - validate success", () => {
  const schema: FormloomSchema = {
    version: "1.1",
    fields: [
      { id: "name", type: "text", label: "Name", validation: { required: true } },
      { id: "count", type: "number", label: "Count", validation: { min: 0 } },
      { id: "agreed", type: "boolean", label: "Agreed" },
    ],
  };

  it("accepts valid data", () => {
    const std = formloomToStandardSchema(schema);
    const result = std["~standard"].validate({
      name: "Alice",
      count: 5,
      agreed: true,
    });
    expect("value" in result).toBe(true);
  });
});

describe("formloomToStandardSchema - validate failure", () => {
  const schema: FormloomSchema = {
    version: "1.1",
    fields: [
      { id: "name", type: "text", label: "Name", validation: { required: true } },
      {
        id: "age",
        type: "number",
        label: "Age",
        validation: { min: 0, max: 120, integer: true },
      },
    ],
  };

  it("reports issues with paths", () => {
    const std = formloomToStandardSchema(schema);
    const result = std["~standard"].validate({
      name: "",
      age: 3.5,
    });
    expect("issues" in result).toBe(true);
    if (!("issues" in result)) return;
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.some((i) => i.path?.[0] === "name")).toBe(true);
    expect(result.issues.some((i) => i.path?.[0] === "age")).toBe(true);
  });
});

describe("formloomToStandardSchema - showIf", () => {
  const schema: FormloomSchema = {
    version: "1.1",
    fields: [
      { id: "plan", type: "text", label: "Plan" },
      {
        id: "seats",
        type: "number",
        label: "Seats",
        validation: { required: true, min: 1 },
        showIf: { field: "plan", equals: "team" },
      },
    ],
  };

  it("does not require hidden required fields", () => {
    const std = formloomToStandardSchema(schema);
    const result = std["~standard"].validate({ plan: "solo" });
    expect("value" in result).toBe(true);
  });

  it("requires the field when visibility is true", () => {
    const std = formloomToStandardSchema(schema);
    const result = std["~standard"].validate({ plan: "team" });
    expect("issues" in result).toBe(true);
  });
});

describe("formloomToStandardSchema - file maxSizeBytes", () => {
  const schema: FormloomSchema = {
    version: "1.1",
    fields: [
      {
        id: "upload",
        type: "file",
        label: "Upload",
        maxSizeBytes: 500,
      },
    ],
  };

  it("rejects over-limit files", () => {
    const std = formloomToStandardSchema(schema);
    const result = std["~standard"].validate({
      upload: {
        kind: "inline",
        name: "x.png",
        mime: "image/png",
        size: 1000,
        dataUrl: "data:image/png;base64,x",
      },
    });
    expect("issues" in result).toBe(true);
  });
});
