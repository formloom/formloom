import { describe, it, expect } from "vitest";
import {
  evaluateShowIf,
  collectShowIfDependencies,
  findShowIfCycle,
} from "../show-if";
import type { ShowIfRule, FormloomData } from "../types";

describe("evaluateShowIf", () => {
  const data: FormloomData = {
    country: "US",
    age: 21,
    agreed: true,
    tags: ["a", "b"],
    empty: "",
    missing: null,
  };

  it("returns true when rule is undefined", () => {
    expect(evaluateShowIf(undefined, data)).toBe(true);
  });

  it("handles equals with strings, numbers, and booleans", () => {
    expect(evaluateShowIf({ field: "country", equals: "US" }, data)).toBe(true);
    expect(evaluateShowIf({ field: "country", equals: "CA" }, data)).toBe(false);
    expect(evaluateShowIf({ field: "age", equals: 21 }, data)).toBe(true);
    expect(evaluateShowIf({ field: "agreed", equals: true }, data)).toBe(true);
  });

  it("handles in membership", () => {
    expect(
      evaluateShowIf({ field: "country", in: ["US", "CA"] }, data),
    ).toBe(true);
    expect(
      evaluateShowIf({ field: "country", in: ["UK", "FR"] }, data),
    ).toBe(false);
  });

  it("handles notEmpty for strings, arrays, and null", () => {
    expect(evaluateShowIf({ field: "country", notEmpty: true }, data)).toBe(true);
    expect(evaluateShowIf({ field: "empty", notEmpty: true }, data)).toBe(false);
    expect(evaluateShowIf({ field: "missing", notEmpty: true }, data)).toBe(false);
    expect(evaluateShowIf({ field: "tags", notEmpty: true }, data)).toBe(true);
    expect(
      evaluateShowIf({ field: "tags", notEmpty: true }, { tags: [] }),
    ).toBe(false);
  });

  it("treats missing fields as null", () => {
    expect(
      evaluateShowIf({ field: "nope", equals: "anything" }, data),
    ).toBe(false);
    expect(evaluateShowIf({ field: "nope", notEmpty: true }, data)).toBe(false);
  });

  it("composes via allOf", () => {
    const rule: ShowIfRule = {
      allOf: [
        { field: "country", equals: "US" },
        { field: "age", equals: 21 },
      ],
    };
    expect(evaluateShowIf(rule, data)).toBe(true);
    expect(evaluateShowIf(rule, { ...data, age: 20 })).toBe(false);
  });

  it("composes via anyOf", () => {
    const rule: ShowIfRule = {
      anyOf: [
        { field: "country", equals: "CA" },
        { field: "agreed", equals: true },
      ],
    };
    expect(evaluateShowIf(rule, data)).toBe(true);
    expect(evaluateShowIf(rule, { ...data, agreed: false })).toBe(false);
  });

  it("composes via not", () => {
    expect(
      evaluateShowIf({ not: { field: "country", equals: "CA" } }, data),
    ).toBe(true);
    expect(
      evaluateShowIf({ not: { field: "country", equals: "US" } }, data),
    ).toBe(false);
  });

  it("handles empty allOf / anyOf", () => {
    expect(evaluateShowIf({ allOf: [] }, data)).toBe(true);
    expect(evaluateShowIf({ anyOf: [] }, data)).toBe(false);
  });
});

describe("collectShowIfDependencies", () => {
  it("collects direct field references", () => {
    const deps = collectShowIfDependencies({ field: "a", equals: "x" });
    expect([...deps]).toEqual(["a"]);
  });

  it("collects nested references", () => {
    const deps = collectShowIfDependencies({
      allOf: [
        { field: "a", equals: "x" },
        {
          anyOf: [
            { field: "b", notEmpty: true },
            { not: { field: "c", in: ["y"] } },
          ],
        },
      ],
    });
    expect([...deps].sort()).toEqual(["a", "b", "c"]);
  });
});

describe("findShowIfCycle", () => {
  it("returns null for a DAG", () => {
    expect(
      findShowIfCycle([
        { id: "a", showIf: { field: "b", equals: "x" } },
        { id: "b", showIf: { field: "c", equals: "x" } },
        { id: "c" },
      ]),
    ).toBeNull();
  });

  it("detects direct cycles (a -> b -> a)", () => {
    const cycle = findShowIfCycle([
      { id: "a", showIf: { field: "b", equals: "x" } },
      { id: "b", showIf: { field: "a", equals: "x" } },
    ]);
    expect(cycle).not.toBeNull();
    expect(cycle!.length).toBeGreaterThan(1);
    expect(cycle![0]).toBe(cycle![cycle!.length - 1]);
  });

  it("detects longer cycles", () => {
    const cycle = findShowIfCycle([
      { id: "a", showIf: { field: "b", equals: "x" } },
      { id: "b", showIf: { field: "c", equals: "x" } },
      { id: "c", showIf: { field: "a", equals: "x" } },
    ]);
    expect(cycle).not.toBeNull();
  });

  it("ignores references to non-existent fields", () => {
    expect(
      findShowIfCycle([
        { id: "a", showIf: { field: "ghost", equals: "x" } },
      ]),
    ).toBeNull();
  });
});
