import type { GeneratedTokens, GeneratedToken } from "./generators/tokenStructureBuilder";
import {
  findTokenByPattern,
  getPatternsForCategory,
  TYPOGRAPHY_PATTERNS,
  COLOR_PATTERNS,
  SPACING_PATTERNS,
  TAILWIND_FALLBACKS,
} from "./semanticPatterns";

/**
 * Token Helper - Provides smart fallbacks when accessing tokens that may not exist
 */
export class TokenHelper {
  private tokens: GeneratedTokens;

  constructor(tokens: GeneratedTokens) {
    this.tokens = tokens;
  }

  /** Get a typography token with intelligent fallbacks */
  getTypography(semanticName: string): GeneratedToken {
    const typography = this.tokens.typography || {};

    // Try exact match first
    if (typography[semanticName]) {
      return typography[semanticName];
    }

    // Use shared pattern matching
    const found = findTokenByPattern(typography, semanticName, TYPOGRAPHY_PATTERNS);
    if (found) return found;

    // Tailwind fallback
    const fallbackClass = TAILWIND_FALLBACKS.typography[semanticName as keyof typeof TAILWIND_FALLBACKS.typography] || "text-base";
    return { value: null, class: fallbackClass, var: null };
  }

  /** Get a color token with intelligent fallbacks */
  getColor(semanticName: string): GeneratedToken {
    const color = this.tokens.color || {};

    if (color[semanticName]) {
      return color[semanticName];
    }

    const found = findTokenByPattern(color, semanticName, COLOR_PATTERNS);
    if (found) return found;

    const fallbackClass = TAILWIND_FALLBACKS.color[semanticName as keyof typeof TAILWIND_FALLBACKS.color] || "";
    return { value: null, class: fallbackClass, var: null };
  }

  /** Get spacing token with fallbacks */
  getSpacing(semanticName: string): GeneratedToken {
    const spacing = this.tokens.spacing || {};

    if (spacing[semanticName]) {
      return spacing[semanticName];
    }

    const found = findTokenByPattern(spacing, semanticName, SPACING_PATTERNS);
    if (found) return found;

    const fallbackClass = TAILWIND_FALLBACKS.spacing[semanticName as keyof typeof TAILWIND_FALLBACKS.spacing] || "p-4";
    return { value: null, class: fallbackClass, var: null };
  }

  /** Get any token category with fallbacks */
  get(category: string, name: string): GeneratedToken {
    // Special-case categories with complex semantic fallback logic
    if (category === "typography") return this.getTypography(name);
    if (category === "color") return this.getColor(name);
    if (category === "spacing") return this.getSpacing(name);

    // Generic fallback for other categories
    const categoryTokens = this.tokens[category];
    if (categoryTokens) {
      if (categoryTokens[name]) return categoryTokens[name];

      // Try pattern matching for this category
      const patterns = getPatternsForCategory(category);
      const found = findTokenByPattern(categoryTokens, name, patterns);
      if (found) return found;
    }

    return { value: null, class: "", var: null };
  }
}

/** Create a proxy object that wraps GeneratedTokens with smart fallbacks */
export function createTokenProxy(tokens: GeneratedTokens): GeneratedTokens {
  const helper = new TokenHelper(tokens);

  return new Proxy(tokens, {
    get(target, category: string | symbol) {
      if (typeof category === "symbol" || !(category in target)) {
        return {};
      }

      const categoryTokens = target[category];

      return new Proxy(categoryTokens, {
        get(catTarget, tokenName: string | symbol) {
          if (typeof tokenName === "symbol") return undefined;
          if (tokenName in catTarget) return catTarget[tokenName];
          return helper.get(category as string, tokenName as string);
        },
      });
    },
  }) as GeneratedTokens;
}
