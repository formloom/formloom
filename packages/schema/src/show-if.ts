import type { FormloomData, FormloomFieldValue, ShowIfRule } from "./types";

/**
 * Evaluates a `showIf` rule against the current form data.
 *
 * Semantics:
 *   - `{ field, equals }` — strict equality against the field's current value.
 *   - `{ field, in }` — value must be one of the listed literals.
 *   - `{ field, notEmpty: true }` — value is non-null, non-empty string, and
 *     (for arrays) non-empty array.
 *   - `{ allOf }` / `{ anyOf }` — boolean composition. An empty `allOf` is
 *     vacuously true; an empty `anyOf` is vacuously false.
 *   - `{ not }` — inversion.
 *
 * The function is pure and side-effect-free. A missing field reads as `null`,
 * matching the renderer's "field does not exist → value is null" convention.
 */
export function evaluateShowIf(
  rule: ShowIfRule | undefined,
  data: FormloomData,
): boolean {
  if (rule === undefined) return true;

  if ("allOf" in rule) {
    return rule.allOf.every((sub) => evaluateShowIf(sub, data));
  }
  if ("anyOf" in rule) {
    return rule.anyOf.some((sub) => evaluateShowIf(sub, data));
  }
  if ("not" in rule) {
    return !evaluateShowIf(rule.not, data);
  }

  const value = data[rule.field] ?? null;

  if ("equals" in rule) {
    return literalEquals(value, rule.equals);
  }
  if ("in" in rule) {
    return rule.in.some((candidate) => literalEquals(value, candidate));
  }
  if ("notEmpty" in rule) {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }

  return true;
}

function literalEquals(
  fieldValue: FormloomFieldValue,
  literal: string | number | boolean,
): boolean {
  if (fieldValue === null || fieldValue === undefined) return false;
  if (typeof fieldValue === "object") return false;
  return fieldValue === literal;
}

/**
 * Collects the set of field ids that a rule depends on. Used by the validator
 * to check that every referenced field exists, and by the React hook to build
 * a reverse-dependency map for efficient re-evaluation.
 */
export function collectShowIfDependencies(rule: ShowIfRule): Set<string> {
  const deps = new Set<string>();
  walk(rule, deps);
  return deps;
}

function walk(rule: ShowIfRule, deps: Set<string>): void {
  if ("allOf" in rule) {
    for (const sub of rule.allOf) walk(sub, deps);
    return;
  }
  if ("anyOf" in rule) {
    for (const sub of rule.anyOf) walk(sub, deps);
    return;
  }
  if ("not" in rule) {
    walk(rule.not, deps);
    return;
  }
  deps.add(rule.field);
}

/**
 * Detects showIf dependency cycles. Returns the first cycle found as a list of
 * field ids (e.g. ["a", "b", "a"]) or null if the dependency graph is a DAG.
 * Cycles are errors at schema-validation time.
 */
export function findShowIfCycle(
  fields: Array<{ id: string; showIf?: ShowIfRule }>,
): string[] | null {
  const deps = new Map<string, Set<string>>();
  for (const f of fields) {
    deps.set(f.id, f.showIf ? collectShowIfDependencies(f.showIf) : new Set());
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const colour = new Map<string, number>();
  for (const id of deps.keys()) colour.set(id, WHITE);

  const path: string[] = [];

  function visit(id: string): string[] | null {
    const state = colour.get(id) ?? WHITE;
    if (state === GRAY) {
      const cycleStart = path.indexOf(id);
      return [...path.slice(cycleStart), id];
    }
    if (state === BLACK) return null;
    colour.set(id, GRAY);
    path.push(id);
    const neighbours = deps.get(id);
    if (neighbours !== undefined) {
      for (const next of neighbours) {
        if (!deps.has(next)) continue;
        const found = visit(next);
        if (found !== null) return found;
      }
    }
    path.pop();
    colour.set(id, BLACK);
    return null;
  }

  for (const id of deps.keys()) {
    const found = visit(id);
    if (found !== null) return found;
  }
  return null;
}
