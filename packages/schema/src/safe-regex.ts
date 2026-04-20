/**
 * ReDoS-aware regex checking.
 *
 * Regex patterns in Formloom schemas come from an LLM, which means they are
 * untrusted input. A hand-crafted catastrophic pattern can pin a browser tab
 * or a server thread for seconds. This module wraps `RegExp` execution with
 * two protections:
 *
 *   1. Static analysis (`isCatastrophicPattern`) rejects the well-known
 *      ReDoS shapes before the regex is ever compiled.
 *   2. Runtime input-length cap limits how much text the regex is asked to
 *      match against.
 *
 * Neither layer is a complete defence — a linear-time regex engine (re2) is
 * the only true fix — but together they handle the common classes without a
 * WASM dependency. The module never throws: degenerate patterns return
 * `{ matched: false, skipped: true, reason }`.
 */

/** Default input length above which we skip pattern validation. */
export const DEFAULT_MAX_INPUT_LENGTH = 10_000;

/** Cap on how much of a pattern string we echo back in warning messages. */
const MAX_LOGGED_PATTERN_LENGTH = 128;

function describePattern(pattern: string): string {
  if (pattern.length <= MAX_LOGGED_PATTERN_LENGTH) return pattern;
  return `${pattern.slice(0, MAX_LOGGED_PATTERN_LENGTH)}...`;
}

export interface SafeRegexOptions {
  /** Maximum input string length before validation is skipped. */
  maxInputLength?: number;
  /** If provided, receives a warning message for every skipped/degenerate pattern. */
  onWarn?: (message: string) => void;
}

export interface SafeRegexResult {
  matched: boolean;
  skipped: boolean;
  reason?: string;
}

/**
 * Detects regex patterns known to exhibit catastrophic backtracking.
 *
 * The analysis is deliberately conservative — it flags every shape we recognise
 * as risky, including some that would be safe in practice. A false positive
 * costs us a pattern check; a false negative costs us a hung tab.
 */
export function isCatastrophicPattern(pattern: string): boolean {
  if (typeof pattern !== "string") return false;

  if (/\\\d/.test(pattern)) {
    return true;
  }

  // Nested quantifier: an inner `+`/`*`/`?`/`{n,m}` inside a group that is
  // itself quantified. Catches `(a+)+`, `(a{1,5})+`, `(a*)*`, etc.
  const nestedQuantifier = /\([^()]*(?:[+*?]|\{\d+,?\d*\})[^()]*\)[+*?{]/.test(
    pattern,
  );
  if (nestedQuantifier) {
    return true;
  }

  const overlappingAlternation = /\((?:[^()|]*\|)+[^()|]*\)[+*?{]/.test(
    pattern,
  );
  if (overlappingAlternation) {
    const body = pattern.match(/\(((?:[^()|]*\|)+[^()|]*)\)[+*?{]/);
    if (body !== null && body[1] !== undefined) {
      const alternatives = body[1].split("|");
      const seen = new Set<string>();
      for (const alt of alternatives) {
        const normalized = alt.trim();
        if (seen.has(normalized)) return true;
        for (const other of seen) {
          if (
            normalized.length > 0 &&
            other.length > 0 &&
            (normalized.startsWith(other) || other.startsWith(normalized))
          ) {
            return true;
          }
        }
        seen.add(normalized);
      }
    }
  }

  return false;
}

/**
 * Runs a regex against a value with ReDoS protections.
 *
 * Never throws. When the pattern is degenerate or the input exceeds the
 * configured cap, returns `{ matched: false, skipped: true, reason }` so the
 * caller can decide whether to treat that as pass-through or fail-closed. The
 * validator treats it as pass-through (degraded mode).
 */
export function safeRegexTest(
  pattern: string,
  value: string,
  opts: SafeRegexOptions = {},
): SafeRegexResult {
  const { maxInputLength = DEFAULT_MAX_INPUT_LENGTH, onWarn } = opts;

  if (typeof pattern !== "string" || typeof value !== "string") {
    return {
      matched: false,
      skipped: true,
      reason: "pattern or value is not a string",
    };
  }

  if (isCatastrophicPattern(pattern)) {
    const reason = `pattern "${describePattern(pattern)}" was skipped: matches a known catastrophic shape`;
    onWarn?.(reason);
    return { matched: false, skipped: true, reason };
  }

  if (value.length > maxInputLength) {
    const reason = `input length ${value.length} exceeds cap ${maxInputLength}; pattern validation skipped`;
    onWarn?.(reason);
    return { matched: false, skipped: true, reason };
  }

  let regex: RegExp;
  try {
    regex = new RegExp(pattern);
  } catch {
    const reason = `pattern "${describePattern(pattern)}" failed to compile`;
    onWarn?.(reason);
    return { matched: false, skipped: true, reason };
  }

  try {
    return { matched: regex.test(value), skipped: false };
  } catch {
    const reason = `pattern "${describePattern(pattern)}" threw at test time`;
    onWarn?.(reason);
    return { matched: false, skipped: true, reason };
  }
}

/** True when compiling `pattern` would succeed. Pure syntactic check. */
export function isValidRegexSyntax(pattern: string): boolean {
  if (typeof pattern !== "string") return false;
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}
