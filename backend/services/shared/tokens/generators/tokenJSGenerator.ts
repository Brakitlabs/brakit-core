import type { BrakitDesignTokens, Token } from "../types";
import { generateFileHeader } from "./hashUtils";
import { getCategoryConfig, generateClassName, generateVarName } from "../tokenConfig";

/**
 * Convert hyphenated key to camelCase
 */
function toCamelCase(key: string): string {
  return key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Helper to safely get tokens from a category
 */
function getTokens(tokens: BrakitDesignTokens, category: string): Record<string, Token> {
  const categoryTokens = tokens[category];
  if (!categoryTokens || typeof categoryTokens !== "object") {
    return {};
  }
  const result: Record<string, Token> = {};
  for (const [key, token] of Object.entries(categoryTokens)) {
    if (token) result[key] = token;
  }
  return result;
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

    // Iterate over all categories dynamically
    for (const [category, categoryTokens] of Object.entries(tokens)) {
      if (category.startsWith("$")) continue;
      if (!categoryTokens || typeof categoryTokens !== "object") continue;

      const safeTokens = getTokens(tokens, category);
      if (Object.keys(safeTokens).length === 0) continue;

      parts.push(this.generateCategoryTokens(category, safeTokens));
    }

    return `export const tokens = {
${parts.join(",\n\n")}
};
`;
  }

  /**
   * Generate tokens for a single category
   */
  private static generateCategoryTokens(
    category: string,
    categoryTokens: Record<string, Token>
  ): string {
    const config = getCategoryConfig(category);
    const entries: string[] = [];

    for (const [key, token] of Object.entries(categoryTokens)) {
      const safeKey = toCamelCase(key);
      const className = generateClassName(category, key, config);
      const varName = generateVarName(category, key, config);

      // Format value based on type
      const formattedValue = this.formatValue(token.$value);

      entries.push(`    "${safeKey}": {
      value: ${formattedValue},
      class: "${className}",
      var: ${varName ? `"${varName}"` : "null"}
    }`);
    }

    const title = category.toUpperCase().replace(/([A-Z])/g, " $1").trim();
    return `  // ───────────────────────────────────────────────────
  // ${title} TOKENS
  // ───────────────────────────────────────────────────
  ${category}: {
${entries.join(",\n")}
  }`;
  }

  /**
   * Format a token value for JavaScript output
   */
  private static formatValue(value: unknown): string {
    if (typeof value === "string") {
      return `"${value}"`;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value, null, 6).replace(/\n/g, "\n      ");
    }
    return "null";
  }
}
