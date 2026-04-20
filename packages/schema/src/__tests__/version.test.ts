import { describe, it, expect } from "vitest";
import {
  parseSchemaVersion,
  isSupportedVersion,
  compareVersions,
} from "../version";

describe("parseSchemaVersion", () => {
  it("parses a valid major.minor string", () => {
    expect(parseSchemaVersion("1.0")).toEqual({ major: 1, minor: 0 });
    expect(parseSchemaVersion("1.1")).toEqual({ major: 1, minor: 1 });
    expect(parseSchemaVersion("2.15")).toEqual({ major: 2, minor: 15 });
  });

  it("returns null for malformed input", () => {
    expect(parseSchemaVersion("1")).toBeNull();
    expect(parseSchemaVersion("1.0.0")).toBeNull();
    expect(parseSchemaVersion("v1.0")).toBeNull();
    expect(parseSchemaVersion("")).toBeNull();
    expect(parseSchemaVersion("latest")).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(parseSchemaVersion(1.0)).toBeNull();
    expect(parseSchemaVersion(null)).toBeNull();
    expect(parseSchemaVersion(undefined)).toBeNull();
    expect(parseSchemaVersion({ major: 1, minor: 0 })).toBeNull();
  });
});

describe("isSupportedVersion", () => {
  it("accepts same-major versions", () => {
    expect(isSupportedVersion("1.0", 1)).toBe(true);
    expect(isSupportedVersion("1.1", 1)).toBe(true);
    expect(isSupportedVersion("1.99", 1)).toBe(true);
  });

  it("rejects different-major versions", () => {
    expect(isSupportedVersion("2.0", 1)).toBe(false);
    expect(isSupportedVersion("0.9", 1)).toBe(false);
  });

  it("rejects malformed versions", () => {
    expect(isSupportedVersion("latest", 1)).toBe(false);
    expect(isSupportedVersion("1", 1)).toBe(false);
  });
});

describe("compareVersions", () => {
  it("compares by major then minor", () => {
    expect(compareVersions({ major: 1, minor: 0 }, { major: 1, minor: 0 })).toBe(0);
    expect(compareVersions({ major: 1, minor: 0 }, { major: 1, minor: 1 })).toBeLessThan(0);
    expect(compareVersions({ major: 1, minor: 1 }, { major: 1, minor: 0 })).toBeGreaterThan(0);
    expect(compareVersions({ major: 2, minor: 0 }, { major: 1, minor: 99 })).toBeGreaterThan(0);
  });
});
