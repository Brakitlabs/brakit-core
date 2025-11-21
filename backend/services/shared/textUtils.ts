/**
 * Normalize whitespace in text for reliable comparisons
 * Replaces multiple whitespace characters with single space and trims
 */
export function normalizeText(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().toLowerCase();
}
