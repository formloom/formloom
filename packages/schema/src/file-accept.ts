/**
 * File-accept matching helpers.
 *
 * Implements HTML `<input accept>` semantics: a comma-separated list of
 * MIME types (`image/png`), MIME wildcards (`image/*`), and filename
 * extensions (`.png`). Exposed from `@formloom/schema` so every layer of
 * the stack — validator, hook, Zod adapter, Standard Schema adapter —
 * shares the same rule set.
 */

/**
 * Matches a file against an `accept` string. Prefer this over
 * {@link mimeMatches} whenever a filename is available, because bare
 * extension tokens (`.pdf`) can only be resolved by the filename.
 */
export function fileMatchesAccept(
  accept: string,
  mime: string,
  fileName: string,
): boolean {
  const entries = splitAccept(accept);
  if (entries.length === 0) return true;

  const lowerName = fileName.toLowerCase();

  for (const entry of entries) {
    if (entry === "*/*" || entry === "*") return true;
    if (entry.startsWith(".")) {
      if (lowerName.endsWith(entry.toLowerCase())) return true;
      continue;
    }
    if (entry === mime) return true;
    if (entry.endsWith("/*")) {
      const prefix = entry.slice(0, -1);
      if (mime.startsWith(prefix)) return true;
    }
  }
  return false;
}

/**
 * MIME-only subset of {@link fileMatchesAccept}. Returns `true` when the MIME
 * matches an explicit MIME entry or a `type/*` wildcard; extension tokens are
 * ignored because no filename context is supplied.
 */
export function mimeMatches(mime: string, accept: string): boolean {
  const entries = splitAccept(accept);
  if (entries.length === 0) return true;

  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    if (entry === "*/*" || entry === "*") return true;
    if (entry === mime) return true;
    if (entry.endsWith("/*")) {
      const prefix = entry.slice(0, -1);
      if (mime.startsWith(prefix)) return true;
    }
  }
  return false;
}

function splitAccept(accept: string): string[] {
  return accept
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}
