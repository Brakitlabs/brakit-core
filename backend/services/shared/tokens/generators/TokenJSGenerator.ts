import type { BrakitDesignTokens } from "../types";
import { generateFileHeader } from "./hashUtils";

/**
 * Convert hyphenated key to camelCase
 * e.g., "space-xs" -> "spaceXs", "primary-soft" -> "primarySoft"
 */
function toCamelCase(key: string): string {
  return key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Generates tokens.js with { value, class, var } structure
 */
export class TokenJSGenerator {
  /**
   * Generate complete tokens.js content
   */
  static generate(tokens: BrakitDesignTokens, hash: string): string {
    const header = generateFileHeader(hash, "js");
    const tokenObject = this.generateTokenObject(tokens);

    return `${header}${tokenObject}`;
  }

  /**
   * Generate the main token export object
   */
  private static generateTokenObject(tokens: BrakitDesignTokens): string {
    const parts: string[] = [];

    // Color tokens
    parts.push(this.generateColorTokens(tokens));

    // Spacing tokens
    parts.push(this.generateSpacingTokens(tokens));

    // Typography tokens
    parts.push(this.generateTypographyTokens(tokens));

    // Radius tokens
    parts.push(this.generateRadiusTokens(tokens));

    // Shadow tokens
    parts.push(this.generateShadowTokens(tokens));

    // Layout tokens
    parts.push(this.generateLayoutTokens(tokens));

    // Border tokens
    if (tokens.border) {
      parts.push(this.generateBorderTokens(tokens));
    }

    // Opacity tokens
    if (tokens.opacity) {
      parts.push(this.generateOpacityTokens(tokens));
    }

    // Z-index tokens
    if (tokens.zIndex) {
      parts.push(this.generateZIndexTokens(tokens));
    }

    return `export const tokens = {
${parts.join(",\n\n")}
};
`;
  }

  private static generateColorTokens(tokens: BrakitDesignTokens): string {
    const entries: string[] = [];

    for (const [key, token] of Object.entries(tokens.color)) {
      const safeKey = this.toSafeKey(key);
      entries.push(`    "${safeKey}": {
      value: "${token.$value}",
      class: "bk-bg-${key}",
      var: "var(--bk-color-${key})"
    }`);
    }

    return `  // ───────────────────────────────────────────────────
  // COLOR TOKENS
  // ───────────────────────────────────────────────────
  color: {
${entries.join(",\n")}
  }`;
  }

  private static generateSpacingTokens(tokens: BrakitDesignTokens): string {
    const entries: string[] = [];

    for (const [key, token] of Object.entries(tokens.spacing)) {
      const safeKey = this.toSafeKey(key);
      entries.push(`    "${safeKey}": {
      value: "${token.$value}",
      class: "bk-p-${key}",
      var: "var(--bk-spacing-${key})"
    }`);
    }

    return `  // ───────────────────────────────────────────────────
  // SPACING TOKENS
  // ───────────────────────────────────────────────────
  spacing: {
${entries.join(",\n")}
  }`;
  }

  private static generateTypographyTokens(tokens: BrakitDesignTokens): string {
    const entries: string[] = [];

    for (const [key, token] of Object.entries(tokens.typography)) {
      const safeKey = this.toSafeKey(key);
      const value = JSON.stringify(token.$value, null, 6).replace(/\n/g, "\n      ");
      
      entries.push(`    "${safeKey}": {
      value: ${value},
      class: "bk-text-${key}",
      var: null
    }`);
    }

    return `  // ───────────────────────────────────────────────────
  // TYPOGRAPHY TOKENS
  // ───────────────────────────────────────────────────
  typography: {
${entries.join(",\n")}
  }`;
  }

  private static generateRadiusTokens(tokens: BrakitDesignTokens): string {
    const entries: string[] = [];

    for (const [key, token] of Object.entries(tokens.radius)) {
      const safeKey = this.toSafeKey(key);
      entries.push(`    "${safeKey}": {
      value: "${token.$value}",
      class: "bk-rounded-${key}",
      var: "var(--bk-radius-${key})"
    }`);
    }

    return `  // ───────────────────────────────────────────────────
  // RADIUS TOKENS
  // ───────────────────────────────────────────────────
  radius: {
${entries.join(",\n")}
  }`;
  }

  private static generateShadowTokens(tokens: BrakitDesignTokens): string {
    const entries: string[] = [];

    for (const [key, token] of Object.entries(tokens.shadow)) {
      const safeKey = this.toSafeKey(key);
      const value = JSON.stringify(token.$value, null, 6).replace(/\n/g, "\n      ");
      
      entries.push(`    "${safeKey}": {
      value: ${value},
      class: "bk-shadow-${key}",
      var: null
    }`);
    }

    return `  // ───────────────────────────────────────────────────
  // SHADOW TOKENS
  // ───────────────────────────────────────────────────
  shadow: {
${entries.join(",\n")}
  }`;
  }

  private static generateLayoutTokens(tokens: BrakitDesignTokens): string {
    const entries: string[] = [];

    for (const [key, token] of Object.entries(tokens.layout)) {
      const safeKey = this.toSafeKey(key);
      entries.push(`    "${safeKey}": {
      value: "${token.$value}",
      class: "bk-container-${key}",
      var: "var(--bk-layout-${key})"
    }`);
    }

    return `  // ───────────────────────────────────────────────────
  // LAYOUT TOKENS
  // ───────────────────────────────────────────────────
  layout: {
${entries.join(",\n")}
  }`;
  }

  private static generateBorderTokens(tokens: BrakitDesignTokens): string {
    const entries: string[] = [];

    for (const [key, token] of Object.entries(tokens.border!)) {
      const safeKey = this.toSafeKey(key);
      entries.push(`    "${safeKey}": {
      value: "${token.$value}",
      class: "bk-border-${key}",
      var: "var(--bk-border-${key})"
    }`);
    }

    return `  // ───────────────────────────────────────────────────
  // BORDER TOKENS
  // ───────────────────────────────────────────────────
  border: {
${entries.join(",\n")}
  }`;
  }

  private static generateOpacityTokens(tokens: BrakitDesignTokens): string {
    const entries: string[] = [];

    for (const [key, token] of Object.entries(tokens.opacity!)) {
      const safeKey = this.toSafeKey(key);
      entries.push(`    "${safeKey}": {
      value: ${token.$value},
      class: "bk-opacity-${key}",
      var: "var(--bk-opacity-${key})"
    }`);
    }

    return `  // ───────────────────────────────────────────────────
  // OPACITY TOKENS
  // ───────────────────────────────────────────────────
  opacity: {
${entries.join(",\n")}
  }`;
  }

  private static generateZIndexTokens(tokens: BrakitDesignTokens): string {
    const entries: string[] = [];

    for (const [key, token] of Object.entries(tokens.zIndex!)) {
      const safeKey = this.toSafeKey(key);
      entries.push(`    "${safeKey}": {
      value: ${token.$value},
      class: "bk-z-${key}",
      var: "var(--bk-z-index-${key})"
    }`);
    }

    return `  // ───────────────────────────────────────────────────
  // Z-INDEX TOKENS
  // ───────────────────────────────────────────────────
  zIndex: {
${entries.join(",\n")}
  }`;
  }

  /**
   * Convert keys with hyphens to camelCase for cleaner JavaScript API
   * e.g., "space-xs" -> "spaceXs", "primary-soft" -> "primarySoft"
   */
  private static toSafeKey(key: string): string {
    return toCamelCase(key);
  }
}
