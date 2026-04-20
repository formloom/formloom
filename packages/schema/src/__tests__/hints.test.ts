import { describe, it, expect } from "vitest";
import { CANONICAL_HINTS, CANONICAL_HINT_VALUES } from "../hints";

describe("CANONICAL_HINTS", () => {
  it("every entry has a uniform { kind, description } shape", () => {
    for (const [name, entry] of Object.entries(CANONICAL_HINTS)) {
      expect(typeof entry.description).toBe("string");
      expect(entry.description.length).toBeGreaterThan(0);
      if (entry.kind === "enum") {
        expect(typeof entry.values).toBe("object");
        for (const desc of Object.values(entry.values)) {
          expect(typeof desc).toBe("string");
        }
      } else {
        expect(entry.kind).toBe("scalar");
      }
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("documents the canonical display values", () => {
    const entry = CANONICAL_HINTS.display;
    expect(entry.kind).toBe("enum");
    if (entry.kind !== "enum") throw new Error("unreachable");
    expect(Object.keys(entry.values)).toEqual(
      expect.arrayContaining(["textarea", "password", "toggle", "stepper"]),
    );
  });

  it("documents the canonical width values", () => {
    const entry = CANONICAL_HINTS.width;
    expect(entry.kind).toBe("enum");
    if (entry.kind !== "enum") throw new Error("unreachable");
    expect(Object.keys(entry.values)).toEqual(
      expect.arrayContaining(["full", "half", "third"]),
    );
  });

  it("exposes rows and autocomplete as scalar hints", () => {
    expect(CANONICAL_HINTS.rows.kind).toBe("scalar");
    expect(CANONICAL_HINTS.autocomplete.kind).toBe("scalar");
  });

  it("is frozen so consumers cannot mutate the registry", () => {
    expect(Object.isFrozen(CANONICAL_HINTS)).toBe(true);
    const displayEntry = CANONICAL_HINTS.display;
    if (displayEntry.kind !== "enum") throw new Error("unreachable");
    expect(Object.isFrozen(displayEntry.values)).toBe(true);
  });
});

describe("CANONICAL_HINT_VALUES", () => {
  it("mirrors the enum-hint keys for TypeScript narrowing", () => {
    expect([...CANONICAL_HINT_VALUES.display]).toEqual(
      expect.arrayContaining(["textarea", "password", "toggle", "stepper"]),
    );
    expect([...CANONICAL_HINT_VALUES.width]).toEqual(
      expect.arrayContaining(["full", "half", "third"]),
    );
  });
});
