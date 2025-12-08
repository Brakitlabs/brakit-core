import type { BrakitDesignTokens, Token } from "../types";
import { getCategoryConfig, generateClassName, generateVarName } from "../tokenConfig";

/**
 * Generated token with value, class, and CSS variable
 */
export interface GeneratedToken {
  value: unknown;
  class: string;
  var: string | null;
}

/**
 * Generated tokens organized by category
 */
export type GeneratedTokens = {
  [category: string]: Record<string, GeneratedToken>;
};

/**
 * TokenStructureBuilder - Creates the unified token structure
 * used by both backend and frontend.
 *
 * Output format:
 * {
 *   color: {
 *     primary: { value: "#2563eb", class: "bk-bg-primary", var: "var(--bk-color-primary)" }
 *   },
 *   typography: {
 *     heading1: { value: { fontSize: "2.5rem", ... }, class: "bk-text-heading1", var: null }
 *   }
 * }
 */
export class TokenStructureBuilder {
  /**
   * Build structured tokens from W3C design tokens
   */
  static build(tokens: BrakitDesignTokens): GeneratedTokens {
    const result: GeneratedTokens = {};

    for (const [category, categoryTokens] of Object.entries(tokens)) {
      // Skip $schema and other metadata
      if (category.startsWith("$")) continue;

      // Skip non-object categories
      if (!categoryTokens || typeof categoryTokens !== "object") continue;

      // Build tokens for this category
      result[category] = this.buildCategory(category, categoryTokens as Record<string, Token>);
    }

    return result;
  }

  /**
   * Build generated tokens for a single category
   */
  private static buildCategory(
    category: string,
    categoryTokens: Record<string, Token>
  ): Record<string, GeneratedToken> {
    const result: Record<string, GeneratedToken> = {};
    const config = getCategoryConfig(category);

    for (const [key, token] of Object.entries(categoryTokens)) {
      if (!token) continue;

      result[key] = {
        value: token.$value,
        class: generateClassName(category, key, config),
        var: generateVarName(category, key, config),
      };
    }

    return result;
  }
}
