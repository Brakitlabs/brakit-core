import type { BrakitDesignTokens, Token } from "../types";
import { generateFileHeader } from "./hashUtils";
import { inferTypeScriptType } from "../tokenConfig";

/**
 * Convert hyphenated key to camelCase
 */
function toCamelCase(key: string): string {
  return key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Helper to safely get keys from a category
 */
function getCategoryKeys(tokens: BrakitDesignTokens, category: string): string[] {
  const categoryTokens = tokens[category];
  if (!categoryTokens || typeof categoryTokens !== "object") {
    return [];
  }
  return Object.keys(categoryTokens).filter(key => categoryTokens[key] !== undefined);
}

/**
 * Helper to get first token value from a category for type inference
 */
function getFirstTokenValue(tokens: BrakitDesignTokens, category: string): unknown {
  const categoryTokens = tokens[category];
  if (!categoryTokens || typeof categoryTokens !== "object") {
    return undefined;
  }
  const firstKey = Object.keys(categoryTokens).find(key => categoryTokens[key] !== undefined);
  if (!firstKey) return undefined;
  const token = categoryTokens[firstKey] as Token | undefined;
  return token?.$value;
}

/**
 * Generates tokens.d.ts with strict TypeScript types
 */
export class TokenDTSGenerator {
  /**
   * Generate complete tokens.d.ts content
   */
  static generate(tokens: BrakitDesignTokens, hash: string): string {
    const header = generateFileHeader(hash, "ts");
    const typeDefinitions = this.generateTypeDefinitions(tokens);

    return `${header}${typeDefinitions}`;
  }

  private static generateTypeDefinitions(tokens: BrakitDesignTokens): string {
    // Collect all categories that have tokens
    const categories: string[] = [];
    for (const [category, categoryTokens] of Object.entries(tokens)) {
      if (category.startsWith("$")) continue;
      if (!categoryTokens || typeof categoryTokens !== "object") continue;
      if (Object.keys(categoryTokens).length === 0) continue;
      categories.push(category);
    }

    // Generate interface content for each category
    const interfaceContent = categories
      .map(category => this.generateCategoryInterface(tokens, category))
      .join("\n\n");

    return `/**
 * Token structure with value, CSS class, and CSS variable
 */
export interface TokenValue<T> {
  value: T;
  class: string;
  var: string | null;
}

/**
 * Typography token value
 */
export interface TypographyValue {
  fontSize: string;
  fontWeight: string;
  lineHeight?: string;
  letterSpacing?: string;
  fontFamily?: string;
}

/**
 * Shadow token value
 */
export interface ShadowValue {
  offsetX: string;
  offsetY: string;
  blur: string;
  spread?: string;
  color: string;
}

/**
 * Brakit Design Tokens
 */
export interface Tokens {
${interfaceContent}
}

export declare const tokens: Tokens;
`;
  }

  /**
   * Generate interface content for a single category
   */
  private static generateCategoryInterface(tokens: BrakitDesignTokens, category: string): string {
    const keys = getCategoryKeys(tokens, category);
    if (keys.length === 0) {
      return `  ${category}: Record<string, TokenValue<unknown>>;`;
    }

    // Infer TypeScript type from first token value
    const firstValue = getFirstTokenValue(tokens, category);
    const tsType = this.inferTsType(category, firstValue);

    const entries = keys.map(key => {
      const safeKey = toCamelCase(key);
      // Use quoted keys for hyphenated names that didn't convert cleanly
      const keyFormat = safeKey.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/) ? safeKey : `"${key}"`;
      return `    ${keyFormat}: TokenValue<${tsType}>;`;
    });

    return `  ${category}: {\n${entries.join("\n")}\n  };`;
  }

  /**
   * Infer TypeScript type for a category based on its first value
   */
  private static inferTsType(category: string, firstValue: unknown): string {
    // Special cases for complex types
    if (category === "typography") return "TypographyValue";
    if (category === "shadow") return "ShadowValue";

    // Infer from actual value
    return inferTypeScriptType(firstValue);
  }
}
