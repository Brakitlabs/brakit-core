/**
 * W3C Design Tokens Format
 * https://design-tokens.github.io/community-group/format/
 */

export type TokenType =
  | "color"
  | "dimension"
  | "typography"
  | "fontWeight"
  | "number"
  | "shadow"
  | "duration"
  | "gradient"
  | string; // Allow custom types

export interface BaseToken<T = unknown> {
  $type: TokenType;
  $value: T;
  $description?: string;
}

/**
 * Generic token that can represent any W3C token type
 * Used for dynamic token categories
 */
export type Token =
  | ColorToken
  | DimensionToken
  | TypographyToken
  | NumberToken
  | ShadowToken
  | BaseToken;

export interface ColorToken extends BaseToken<string> {
  $type: "color";
  $value: string; // Hex, rgb, hsl
}

export interface DimensionToken extends BaseToken<string> {
  $type: "dimension";
  $value: string; // e.g., "1rem", "16px"
}

export interface TypographyToken extends BaseToken<TypographyValue> {
  $type: "typography";
  $value: TypographyValue;
}

export interface TypographyValue {
  fontFamily?: string;
  fontSize: string;
  fontWeight: string;
  lineHeight?: string;
  letterSpacing?: string;
}

export interface NumberToken extends BaseToken<number> {
  $type: "number";
  $value: number;
}

export interface ShadowToken extends BaseToken<ShadowValue> {
  $type: "shadow";
  $value: ShadowValue;
}

export interface ShadowValue {
  offsetX: string;
  offsetY: string;
  blur: string;
  spread?: string;
  color: string;
}

export interface BrakitDesignTokens {
  $schema?: string;
  [category: string]: Record<string, Token | undefined> | string | undefined;
}
