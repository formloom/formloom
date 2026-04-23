import type { FieldType } from "./types";

/**
 * Per-surface capability profile. Declares which field types and features a
 * given renderer supports so that one declaration can drive the LLM system
 * prompt, the tool JSON Schema, and the schema validator in lockstep.
 *
 * Omit a key to allow; set it to `false` (or provide an allowlist) to
 * constrain. An empty `{}` is equivalent to not passing capabilities at all.
 */
export interface FormloomCapabilities {
  /**
   * Allowed field types. Omit to allow all seven primitives; provide an
   * array to restrict.
   */
  fieldTypes?: readonly FieldType[];

  /**
   * Feature toggles. Omit a key to allow; set to `false` to forbid.
   */
  features?: {
    showIf?: boolean;
    sections?: boolean;
    allowCustom?: boolean;
    optionDescriptions?: boolean;
    readOnly?: boolean;
    disabled?: boolean;
  };

  /**
   * Variant policy.
   *   omit       = any string allowed (v1.2 default)
   *   string[]   = allowlist; other variants rejected
   *   false      = no `hints.variant` allowed at all
   */
  variants?: readonly string[] | false;

  /** Hard cap on total fields per schema. Omit for no cap. */
  maxFields?: number;

  /** Hard cap on options per radio/select. Omit for no cap. */
  maxOptions?: number;
}

/**
 * The permissive default — equivalent to passing no capabilities at all.
 * Exported so the LLM factory, tests, and power users can reference a
 * canonical "allow everything" value without redefining it.
 */
export const FULL_CAPABILITIES: FormloomCapabilities = Object.freeze({});

/**
 * Resolved feature flags. An undefined entry means "allowed"; `false` means
 * "forbidden". Used internally by the validator and the LLM narrowing helpers
 * so both call sites agree on interpretation.
 */
export interface ResolvedFeatures {
  showIf: boolean;
  sections: boolean;
  allowCustom: boolean;
  optionDescriptions: boolean;
  readOnly: boolean;
  disabled: boolean;
}

/**
 * Expands a `FormloomCapabilities.features` object into a fully-defined
 * `ResolvedFeatures` where every key is explicitly `true` or `false`. Missing
 * keys default to `true` (allowed).
 */
export function resolveFeatures(
  caps: FormloomCapabilities,
): ResolvedFeatures {
  const f = caps.features ?? {};
  return {
    showIf: f.showIf !== false,
    sections: f.sections !== false,
    allowCustom: f.allowCustom !== false,
    optionDescriptions: f.optionDescriptions !== false,
    readOnly: f.readOnly !== false,
    disabled: f.disabled !== false,
  };
}

/**
 * Returns whether a given field type is allowed under these capabilities.
 * When `fieldTypes` is omitted every type is allowed.
 */
export function isFieldTypeAllowed(
  caps: FormloomCapabilities,
  type: FieldType,
): boolean {
  if (caps.fieldTypes === undefined) return true;
  return caps.fieldTypes.includes(type);
}

/**
 * Returns whether a given variant string is allowed.
 *   - `variants` omitted → any string OK
 *   - `variants === false` → nothing OK (even if the field happens to carry one)
 *   - `variants` is an array → only those strings OK
 */
export function isVariantAllowed(
  caps: FormloomCapabilities,
  variant: string,
): boolean {
  if (caps.variants === undefined) return true;
  if (caps.variants === false) return false;
  return caps.variants.includes(variant);
}
