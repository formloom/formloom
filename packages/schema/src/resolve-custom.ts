import type { RadioField, SelectField } from "./types";

/**
 * Splits a submitted multi-select value into option-matched and custom
 * (freeform) entries. Use with `SelectField` where `allowCustom: true`.
 *
 * Ordering is preserved: `selected` lists option matches in the order they
 * appear in `values`; `custom` lists freeform entries in the same order.
 * Entries that are not strings are ignored.
 */
export function resolveMultiSelectValue(
  field: SelectField,
  values: readonly unknown[],
): { selected: string[]; custom: string[] } {
  const allowed = new Set(field.options.map((o) => o.value));
  const selected: string[] = [];
  const custom: string[] = [];
  for (const v of values) {
    if (typeof v !== "string") continue;
    if (allowed.has(v)) selected.push(v);
    else custom.push(v);
  }
  return { selected, custom };
}

/**
 * Returns whether a submitted radio value is a freeform custom entry
 * (i.e. not present in `field.options`). Returns `false` for null / empty.
 */
export function isRadioCustomValue(
  field: RadioField,
  value: unknown,
): boolean {
  if (typeof value !== "string" || value === "") return false;
  return !field.options.some((o) => o.value === value);
}
