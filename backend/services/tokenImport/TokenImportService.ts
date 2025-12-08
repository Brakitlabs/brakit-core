/**
 * Token Import Service
 *
 * Handles importing design tokens from external sources (Figma, Style Dictionary, etc.)
 * and converting them to Brakit's W3C format with sanitized names.
 */

import {
  BrakitDesignTokens,
  TokenType,
} from "../shared/tokens/types";

/**
 * Import source format types
 */
export type TokenSource = "figma" | "style-dictionary" | "w3c" | "auto";

/**
 * Request to import tokens
 */
export interface ImportTokensRequest {
  tokens: unknown; // Raw JSON from external source
  source?: TokenSource;
}

/**
 * Mapping from original name to sanitized name
 */
export interface TokenMapping {
  original: string;
  sanitized: string;
  category: string;
}

/**
 * Result of token import operation
 */
export interface ImportTokensResult {
  success: boolean;
  tokensImported: number;
  mappings: TokenMapping[];
  warnings: string[];
  tokens: BrakitDesignTokens;
}

/**
 * Intermediate token representation during import
 */
interface RawToken {
  type: TokenType;
  value: unknown;
  description?: string;
}

/**
 * Token Import Service
 *
 * Responsibilities:
 * 1. Validate input JSON format
 * 2. Sanitize token names to valid JS identifiers
 * 3. Normalize to W3C format
 * 4. Resolve token references
 * 5. Return sanitized tokens ready for saving
 */
export class TokenImportService {
  /**
   * Import tokens from external source
   */
  async importTokens(request: ImportTokensRequest): Promise<ImportTokensResult> {
    const warnings: string[] = [];
    const mappings: TokenMapping[] = [];

    try {
      // 1. Detect format if auto
      const source = request.source === "auto" || !request.source
        ? this.detectFormat(request.tokens)
        : request.source;

      // 2. Normalize to W3C format
      const normalizedTokens = this.normalizeToW3C(request.tokens, source);

      // 3. Sanitize token names and build mappings
      const { tokens, mappings: nameMappings } = this.sanitizeTokenNames(normalizedTokens);
      mappings.push(...nameMappings);

      // 4. Resolve token references (e.g., {color.primary})
      const resolvedTokens = this.resolveReferences(tokens);

      // 5. Validate final token structure
      const validationWarnings = this.validateTokens(resolvedTokens);
      warnings.push(...validationWarnings);

      // 6. Count imported tokens
      const tokensImported = this.countTokens(resolvedTokens);

      return {
        success: true,
        tokensImported,
        mappings,
        warnings,
        tokens: resolvedTokens,
      };
    } catch (error) {
      return {
        success: false,
        tokensImported: 0,
        mappings,
        warnings: [error instanceof Error ? error.message : String(error)],
        tokens: {} as BrakitDesignTokens,
      };
    }
  }

  /**
   * Sanitize a token name to a valid JavaScript identifier
   *
   * Examples:
   * - 'primary-100' → 'primary100'
   * - 'brand-blue-light' → 'brandBlueLight'
   * - 'spacing/gap-sm' → 'spacingGapSm'
   * - '100-primary' → 'token100Primary' (starts with number)
   */
  private sanitizeTokenName(name: string): string {
    // Split by common separators (-, /, ., space, _)
    const parts = name.split(/[-/.\s_]+/).filter(Boolean);

    // CamelCase: first part lowercase, rest capitalized
    const sanitized = parts
      .map((part, index) => {
        if (index === 0) {
          return part.toLowerCase();
        }
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join("");

    // Ensure starts with letter (not number)
    if (/^\d/.test(sanitized)) {
      return "token" + sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
    }

    // Remove remaining invalid characters
    const cleaned = sanitized.replace(/[^a-zA-Z0-9_]/g, "");

    // Ensure not empty
    if (!cleaned) {
      return "token" + Math.random().toString(36).substring(2, 8);
    }

    return cleaned;
  }

  /**
   * Detect the format of the input tokens
   */
  private detectFormat(tokens: unknown): TokenSource {
    if (!tokens || typeof tokens !== "object") {
      return "w3c";
    }

    const obj = tokens as Record<string, unknown>;

    // Check for W3C format ($type, $value)
    const hasW3CTokens = Object.values(obj).some(
      (val) =>
        val &&
        typeof val === "object" &&
        "$type" in val &&
        "$value" in val
    );

    if (hasW3CTokens) {
      return "w3c";
    }

    // Check for nested structure (likely Figma or Style Dictionary)
    const hasNestedStructure = Object.values(obj).some(
      (val) => val && typeof val === "object" && !("$type" in val)
    );

    if (hasNestedStructure) {
      return "figma"; // Figma and Style Dictionary have similar nested structures
    }

    return "w3c";
  }

  /**
   * Normalize external format to W3C format
   */
  private normalizeToW3C(
    input: unknown,
    source: TokenSource
  ): Record<string, Record<string, RawToken>> {
    if (!input || typeof input !== "object") {
      throw new Error("Invalid token input: expected object");
    }

    const obj = input as Record<string, unknown>;

    // Dynamic category detection - starts empty and creates categories on-the-fly
    // Works with ANY token category: color, spacing, animation, gradient, filter, etc.
    const normalized: Record<string, Record<string, RawToken>> = {};

    // Process each category
    for (const [categoryKey, categoryValue] of Object.entries(obj)) {
      if (!categoryValue || typeof categoryValue !== "object") {
        continue;
      }

      // Determine category (color, spacing, etc.)
      const category = this.mapCategoryName(categoryKey);

      // Process tokens in this category
      const categoryObj = categoryValue as Record<string, unknown>;
      for (const [tokenName, tokenValue] of Object.entries(categoryObj)) {
        const rawToken = this.normalizeToken(tokenValue, category);
        if (rawToken) {
          // Create category dynamically if it doesn't exist
          // This allows unlimited extensibility!
          if (!normalized[category]) {
            normalized[category] = {};
          }
          normalized[category][tokenName] = rawToken;
        }
      }
    }

    return normalized;
  }

  /**
   * Map external category names to Brakit categories
   */
  private mapCategoryName(name: string): string {
    const lower = name.toLowerCase();

    // Direct matches
    const categoryMap: Record<string, string> = {
      color: "color",
      colors: "color",
      colour: "color",
      colours: "color",
      typography: "typography",
      font: "typography",
      fonts: "typography",
      text: "typography",
      spacing: "spacing",
      space: "spacing",
      gap: "spacing",
      margin: "spacing",
      padding: "spacing",
      radius: "radius",
      borderradius: "radius",
      "border-radius": "radius",
      shadow: "shadow",
      shadows: "shadow",
      elevation: "shadow",
      layout: "layout",
      width: "layout",
      maxwidth: "layout",
      "max-width": "layout",
      border: "border",
      borders: "border",
      borderwidth: "border",
      "border-width": "border",
      opacity: "opacity",
      alpha: "opacity",
      zindex: "zIndex",
      "z-index": "zIndex",
      layer: "zIndex",
    };

    return categoryMap[lower] || lower;
  }

  /**
   * Normalize a single token to RawToken format
   */
  private normalizeToken(value: unknown, category: string): RawToken | null {
    if (!value || typeof value !== "object") {
      // Primitive value - wrap it
      return {
        type: this.inferTokenType(category, value),
        value,
      };
    }

    const obj = value as Record<string, unknown>;

    // W3C format already
    if ("$type" in obj && "$value" in obj) {
      return {
        type: obj.$type as TokenType,
        value: obj.$value,
        description: obj.$description as string | undefined,
      };
    }

    // Figma/Style Dictionary format - extract value
    if ("value" in obj) {
      return {
        type: this.inferTokenType(category, obj.value),
        value: obj.value,
        description: obj.description as string | undefined,
      };
    }

    // Nested object - might be typography or shadow
    if (category === "typography") {
      return {
        type: "typography",
        value: obj,
        description: obj.description as string | undefined,
      };
    }

    if (category === "shadow") {
      return {
        type: "shadow",
        value: obj,
        description: obj.description as string | undefined,
      };
    }

    return null;
  }

  /**
   * Infer token type from category and value
   */
  private inferTokenType(category: string, value: unknown): TokenType {
    // Map category to token type
    const typeMap: Record<string, TokenType> = {
      color: "color",
      typography: "typography",
      spacing: "dimension",
      radius: "dimension",
      shadow: "shadow",
      layout: "dimension",
      border: "dimension",
      opacity: "number",
      zIndex: "number",
    };

    const inferredType = typeMap[category];
    if (inferredType) {
      return inferredType;
    }

    // Fallback: infer from value
    if (typeof value === "number") {
      return "number";
    }

    if (typeof value === "string") {
      // Check if it's a color (hex, rgb, hsl)
      if (/^#[0-9a-f]{3,8}$/i.test(value) || /^(rgb|hsl)/.test(value)) {
        return "color";
      }

      // Check if it's a dimension (px, rem, em, %)
      if (/\d+(px|rem|em|%|vh|vw)/.test(value)) {
        return "dimension";
      }
    }

    return "color"; // Default
  }

  /**
   * Sanitize all token names and build mappings
   */
  private sanitizeTokenNames(
    rawTokens: Record<string, Record<string, RawToken>>
  ): {
    tokens: Partial<BrakitDesignTokens>;
    mappings: TokenMapping[];
  } {
    const tokens: Partial<BrakitDesignTokens> = {};
    const mappings: TokenMapping[] = [];

    for (const [category, categoryTokens] of Object.entries(rawTokens)) {
      if (!categoryTokens || Object.keys(categoryTokens).length === 0) {
        continue;
      }

      const sanitizedCategory: Record<string, { $type: TokenType; $value: unknown; $description?: string }> = {};

      for (const [originalName, rawToken] of Object.entries(categoryTokens)) {
        const sanitizedName = this.sanitizeTokenName(originalName);

        // Track mapping if name changed
        if (sanitizedName !== originalName) {
          mappings.push({
            original: originalName,
            sanitized: sanitizedName,
            category,
          });
        }

        // Create typed token directly
        sanitizedCategory[sanitizedName] = {
          $type: rawToken.type,
          $value: rawToken.value,
          ...(rawToken.description ? { $description: rawToken.description } : {}),
        };
      }

      if (Object.keys(sanitizedCategory).length > 0) {
        tokens[category as keyof BrakitDesignTokens] = sanitizedCategory as never;
      }
    }

    return { tokens, mappings };
  }

  /**
   * Resolve token references like {color.primary}
   */
  private resolveReferences(tokens: Partial<BrakitDesignTokens>): BrakitDesignTokens {
    // For now, return as-is
    // TODO: Implement reference resolution in future iteration
    return tokens as BrakitDesignTokens;
  }

  /**
   * Validate final token structure
   *
   * Dynamic Implementation:
   * - Checks ALL categories that exist in the imported tokens
   * - No hardcoded category list
   * - Works with unlimited extensibility
   */
  private validateTokens(tokens: BrakitDesignTokens): string[] {
    const warnings: string[] = [];

    // Loop over all categories dynamically
    for (const [category, categoryTokens] of Object.entries(tokens)) {
      // Skip $schema and metadata
      if (category.startsWith("$")) {
        continue;
      }

      // Warn if category exists but is empty
      if (!categoryTokens || typeof categoryTokens !== "object" || Object.keys(categoryTokens).length === 0) {
        warnings.push(`Category '${category}' is empty`);
      }
    }

    return warnings;
  }

  /**
   * Count total tokens across all categories
   */
  private countTokens(tokens: BrakitDesignTokens): number {
    let count = 0;

    for (const category of Object.values(tokens)) {
      if (category && typeof category === "object") {
        count += Object.keys(category).length;
      }
    }

    return count;
  }
}
