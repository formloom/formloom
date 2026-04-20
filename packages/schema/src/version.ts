/**
 * Schema version utilities.
 *
 * Formloom uses semver-ish major.minor strings. Within a major version, new
 * minor versions add fields and field types but must not remove or rename
 * anything a previous minor could produce. Unknown minor-version additions
 * degrade gracefully when validated with `forwardCompat: "lenient"`.
 */

export interface ParsedVersion {
  major: number;
  minor: number;
}

/**
 * Parses a "major.minor" version string. Returns null for malformed input.
 * Accepts any non-negative integers; trailing segments ("1.1.0") are rejected
 * so we keep the surface area small.
 */
export function parseSchemaVersion(v: unknown): ParsedVersion | null {
  if (typeof v !== "string") return null;
  const match = /^(\d+)\.(\d+)$/.exec(v);
  if (match === null) return null;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  if (!Number.isFinite(major) || !Number.isFinite(minor)) return null;
  return { major, minor };
}

/** True when `version` is within the library's supported major range. */
export function isSupportedVersion(
  version: string,
  supportedMajor: number,
): boolean {
  const parsed = parseSchemaVersion(version);
  return parsed !== null && parsed.major === supportedMajor;
}

/**
 * Compares two parsed versions. Returns negative if a < b, 0 if equal,
 * positive if a > b.
 */
export function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  return a.minor - b.minor;
}
