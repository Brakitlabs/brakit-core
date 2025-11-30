/**
 * Shared utilities for Design Token controls
 * Handles value parsing, unit conversion, and formatting
 */

/**
 * Convert rem to pixels (assuming 16px base)
 */
export function remToPx(rem: number): number {
  return Math.round(rem * 16);
}

/**
 * Convert pixels to rem (assuming 16px base)
 */
export function pxToRem(px: number): number {
  return parseFloat((px / 16).toFixed(4));
}

/**
 * Parse a CSS value into number and unit
 */
export function parseValue(value: string): { num: number; unit: string } {
  const match = value.match(/^(-?\d+\.?\d*)(.*)$/);
  if (!match) {
    return { num: 0, unit: "" };
  }
  return {
    num: parseFloat(match[1]),
    unit: match[2] || "",
  };
}

export function formatValue(num: number, unit: string): string {
  // Round to 4 decimal places to avoid floating point issues
  const rounded = Math.round(num * 10000) / 10000;
  return `${rounded}${unit}`;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Convert between units
 */
export function convertUnit(
  value: string,
  targetUnit: "px" | "rem"
): string {
  const { num, unit } = parseValue(value);

  if (unit === targetUnit) {
    return value;
  }

  if (targetUnit === "px" && unit === "rem") {
    return formatValue(remToPx(num), "px");
  }

  if (targetUnit === "rem" && unit === "px") {
    return formatValue(pxToRem(num), "rem");
  }

  return value;
}

/**
 * Get display value with both units
 */
export function getDisplayValue(value: string): string {
  const { num, unit } = parseValue(value);

  if (unit === "rem") {
    return `${value} = ${remToPx(num)}px`;
  }

  if (unit === "px") {
    return `${value} = ${pxToRem(num)}rem`;
  }

  return value;
}

/**
 * Debounce function for input handling
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

/**
 * Escape HTML for safe rendering
 */
export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Escape quotes for HTML attributes
 */
export function escapeQuotes(text: string): string {
  return text.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
