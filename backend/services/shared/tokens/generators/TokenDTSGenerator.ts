import type { BrakitDesignTokens, TypographyValue, ShadowValue } from "../types";
import { generateFileHeader } from "./hashUtils";

/**
 * Convert hyphenated key to camelCase
 */
function toCamelCase(key: string): string {
  return key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
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
  color: {
${this.generateColorTypes(tokens)}
  };
  
  spacing: {
${this.generateSpacingTypes(tokens)}
  };
  
  typography: {
${this.generateTypographyTypes(tokens)}
  };
  
  radius: {
${this.generateRadiusTypes(tokens)}
  };
  
  shadow: {
${this.generateShadowTypes(tokens)}
  };
  
  layout: {
${this.generateLayoutTypes(tokens)}
  };
  
  border: {
${this.generateBorderTypes(tokens)}
  };
  
  opacity: {
${this.generateOpacityTypes(tokens)}
  };
  
  zIndex: {
${this.generateZIndexTypes(tokens)}
  };
}

export declare const tokens: Tokens;
`;
  }

  private static generateColorTypes(tokens: BrakitDesignTokens): string {
    const entries: string[] = [];
    
    for (const key of Object.keys(tokens.color)) {
      const camelKey = toCamelCase(key);
      entries.push(`    ${camelKey}: TokenValue<string>;`);
    }
    
    return entries.join("\n");
  }

  private static generateSpacingTypes(tokens: BrakitDesignTokens): string {
    const entries: string[] = [];
    
    for (const key of Object.keys(tokens.spacing)) {
      const camelKey = toCamelCase(key);
      entries.push(`    ${camelKey}: TokenValue<string>;`);
    }
    
    return entries.join("\n");
  }

  private static generateTypographyTypes(tokens: BrakitDesignTokens): string {
    const entries: string[] = [];
    
    for (const key of Object.keys(tokens.typography)) {
      const camelKey = toCamelCase(key);
      entries.push(`    ${camelKey}: TokenValue<TypographyValue>;`);
    }
    
    return entries.join("\n");
  }

  private static generateRadiusTypes(tokens: BrakitDesignTokens): string {
    const entries: string[] = [];
    
    for (const key of Object.keys(tokens.radius)) {
      entries.push(`    "${key}": TokenValue<string>;`);
    }
    
    return entries.join("\n");
  }

  private static generateShadowTypes(tokens: BrakitDesignTokens): string {
    const entries: string[] = [];
    
    for (const key of Object.keys(tokens.shadow)) {
      entries.push(`    "${key}": TokenValue<ShadowValue>;`);
    }
    
    return entries.join("\n");
  }

  private static generateLayoutTypes(tokens: BrakitDesignTokens): string {
    const entries: string[] = [];
    
    for (const key of Object.keys(tokens.layout)) {
      entries.push(`    "${key}": TokenValue<string>;`);
    }
    
    return entries.join("\n");
  }

  private static generateBorderTypes(tokens: BrakitDesignTokens): string {
    const entries: string[] = [];
    
    if (tokens.border) {
      for (const key of Object.keys(tokens.border)) {
        entries.push(`    "${key}": TokenValue<string>;`);
      }
    }
    
    return entries.length > 0 ? entries.join("\n") : '    [key: string]: TokenValue<string>;';
  }

  private static generateOpacityTypes(tokens: BrakitDesignTokens): string {
    const entries: string[] = [];
    
    if (tokens.opacity) {
      for (const key of Object.keys(tokens.opacity)) {
        entries.push(`    "${key}": TokenValue<number>;`);
      }
    }
    
    return entries.length > 0 ? entries.join("\n") : '    [key: string]: TokenValue<number>;';
  }

  private static generateZIndexTypes(tokens: BrakitDesignTokens): string {
    const entries: string[] = [];
    
    if (tokens.zIndex) {
      for (const key of Object.keys(tokens.zIndex)) {
        entries.push(`    "${key}": TokenValue<number>;`);
      }
    }
    
    return entries.length > 0 ? entries.join("\n") : '    [key: string]: TokenValue<number>;';
  }
}
