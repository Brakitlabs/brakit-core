/**
 * Shared utility functions for token manipulation
 */

/**
 * Get a token from a dot-notation path
 */
export function getTokenFromPath(tokens: any, tokenPath: string): any {
  if (!tokens) return null;

  const parts = tokenPath.split(".");
  let current: any = tokens;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }

  return current;
}

/**
 * Update a token value at the given path
 */
export function updateTokenValue(
  tokens: any,
  tokenPath: string,
  value: string,
  field?: string
): boolean {
  const token = getTokenFromPath(tokens, tokenPath);
  if (!token || typeof token !== "object") return false;

  if (field && typeof token.$value === "object" && token.$value !== null) {
    token.$value[field] = value;
  } else {
    token.$value = value;
  }

  return true;
}

/**
 * Update value display in UI
 */
export function updateValueDisplay(element: HTMLElement, value: string) {
  const container =
    element.closest(".token-input-group") || element.closest(".slider-block");
  const valueEl = container?.querySelector(".token-value");
  if (valueEl) {
    valueEl.textContent = value;
  }
}
