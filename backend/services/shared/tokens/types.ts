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
  | "shadow";

export interface BaseToken<T = unknown> {
  $type: TokenType;
  $value: T;
  $description?: string;
}

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

/**
 * Brakit Design Token Schema
 */
export interface BrakitDesignTokens {
  $schema?: string;
  color: {
    primary: ColorToken;
    "primary-soft": ColorToken;
    surface: ColorToken;
    "surface-alt": ColorToken;
    "border-subtle": ColorToken;
    danger: ColorToken;
    success: ColorToken;
    "text-main": ColorToken;
    "text-muted": ColorToken;
    [key: string]: ColorToken;
  };
  typography: {
    h1: TypographyToken;
    h2: TypographyToken;
    h3: TypographyToken;
    body: TypographyToken;
    "body-sm": TypographyToken;
    label: TypographyToken;
    [key: string]: TypographyToken;
  };
  spacing: {
    "section-y": DimensionToken;
    "section-x": DimensionToken;
    "space-xs": DimensionToken;
    "space-sm": DimensionToken;
    "space-md": DimensionToken;
    "space-lg": DimensionToken;
    "space-xl": DimensionToken;
    [key: string]: DimensionToken;
  };
  radius: {
    default: DimensionToken;
    pill: DimensionToken;
    [key: string]: DimensionToken;
  };
  shadow: {
    none: ShadowToken;
    default: ShadowToken;
    [key: string]: ShadowToken;
  };
  layout: {
    content: DimensionToken;
    wide: DimensionToken;
    [key: string]: DimensionToken;
  };
  border: {
    subtle: DimensionToken;
    strong: DimensionToken;
    [key: string]: DimensionToken;
  };
  opacity: {
    subtle: NumberToken;
    disabled: NumberToken;
    overlay: NumberToken;
    [key: string]: NumberToken;
  };
  zIndex: {
    base: NumberToken;
    popover: NumberToken;
    modal: NumberToken;
    toast: NumberToken;
    [key: string]: NumberToken;
  };
}

/**
 * Resolved Tailwind classes for consumption by templates
 */
export interface ResolvedTokens {
  color: Record<string, string>;
  typography: Record<string, string>;
  spacing: Record<string, string>;
  radius: Record<string, string>;
  shadow: Record<string, string>;
  layout: Record<string, string>;
  border: Record<string, string>;
  opacity: Record<string, string>;
  zIndex: Record<string, string>;
}
