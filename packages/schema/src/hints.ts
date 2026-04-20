/**
 * Canonical rendering-hint registry.
 *
 * Hints are advisory — renderers honour the ones they understand and ignore
 * the rest. Publishing this registry gives the ecosystem a shared vocabulary
 * so an "email" hint from one renderer means the same thing in another.
 *
 * Unknown hints are not rejected at validation time. New hints can ship in a
 * minor version without any breaking change; existing renderers just keep
 * rendering the base primitive.
 *
 * The registry is exported in two complementary shapes:
 *   - {@link CANONICAL_HINTS} — a flat, uniform map keyed by hint name where
 *     every entry has the same `{ kind, values?, description }` shape.
 *   - {@link CANONICAL_HINT_VALUES} — value enumerations only (for the
 *     enum-shaped hints `display` and `width`), convenient for TypeScript
 *     narrowing.
 */

export type CanonicalHintEntry =
  | {
      kind: "enum";
      values: Readonly<Record<string, string>>;
      description: string;
    }
  | {
      kind: "scalar";
      description: string;
    };

export const CANONICAL_HINTS: Readonly<Record<string, CanonicalHintEntry>> =
  Object.freeze({
    display: {
      kind: "enum",
      values: Object.freeze({
        textarea:
          "Multi-line text input; pair with `rows` to control height.",
        password: "Mask input characters.",
        toggle: "Render boolean as a switch rather than a checkbox.",
        stepper:
          "Render number as a +/- stepper rather than a free numeric input.",
      }),
      description: "Suggested widget variant for a field.",
    },
    width: {
      kind: "enum",
      values: Object.freeze({
        full: "Full form width (default).",
        half: "Half form width.",
        third: "One-third form width.",
      }),
      description: "Layout hint for multi-column forms.",
    },
    rows: {
      kind: "scalar",
      description:
        "For textarea display: number of visible lines (integer >= 1).",
    },
    autocomplete: {
      kind: "scalar",
      description:
        "HTML autocomplete token, e.g. 'email', 'street-address', 'cc-number'.",
    },
  });

export const CANONICAL_HINT_VALUES = Object.freeze({
  display: ["textarea", "password", "toggle", "stepper"] as const,
  width: ["full", "half", "third"] as const,
});

/**
 * TypeScript shape of the canonical hints. Still permits unknown keys so
 * renderers can extend without a major version bump.
 */
export interface CanonicalHints {
  display?: "textarea" | "password" | "toggle" | "stepper";
  width?: "full" | "half" | "third";
  rows?: number;
  autocomplete?: string;
  [key: string]: unknown;
}

/** Literal union of the canonical `display` hints. */
export type CanonicalDisplayHint = (typeof CANONICAL_HINT_VALUES.display)[number];

/** Literal union of the canonical `width` hints. */
export type CanonicalWidthHint = (typeof CANONICAL_HINT_VALUES.width)[number];
