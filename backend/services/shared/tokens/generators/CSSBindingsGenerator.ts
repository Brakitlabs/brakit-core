import type {
  BrakitDesignTokens,
  ColorToken,
  DimensionToken,
  TypographyToken,
  ShadowToken,
  NumberToken,
} from "../types";
import { generateFileHeader } from "./hashUtils";

/**
 * Generates bindings.css with CSS custom properties and utility classes
 */
export class CSSBindingsGenerator {
  /**
   * Generate complete bindings.css content
   */
  static generate(tokens: BrakitDesignTokens, hash: string): string {
    const header = generateFileHeader(hash, "css");
    const cssVars = this.generateCSSVariables(tokens);
    const utilityClasses = this.generateUtilityClasses(tokens);

    return `${header}${cssVars}

${utilityClasses}`;
  }

  /**
   * Generate CSS custom properties (:root)
   */
  private static generateCSSVariables(tokens: BrakitDesignTokens): string {
    const vars: string[] = [];

    // Color variables
    for (const [key, token] of Object.entries(tokens.color)) {
      vars.push(`  --bk-color-${key}: ${token.$value};`);
    }

    // Spacing variables
    for (const [key, token] of Object.entries(tokens.spacing)) {
      vars.push(`  --bk-spacing-${key}: ${token.$value};`);
    }

    // Radius variables
    for (const [key, token] of Object.entries(tokens.radius)) {
      vars.push(`  --bk-radius-${key}: ${token.$value};`);
    }

    // Layout variables
    for (const [key, token] of Object.entries(tokens.layout)) {
      vars.push(`  --bk-layout-${key}: ${token.$value};`);
    }

    // Border variables
    if (tokens.border) {
      for (const [key, token] of Object.entries(tokens.border)) {
        vars.push(`  --bk-border-${key}: ${token.$value};`);
      }
    }

    // Opacity variables
    if (tokens.opacity) {
      for (const [key, token] of Object.entries(tokens.opacity)) {
        vars.push(`  --bk-opacity-${key}: ${token.$value};`);
      }
    }

    // Z-index variables
    if (tokens.zIndex) {
      for (const [key, token] of Object.entries(tokens.zIndex)) {
        vars.push(`  --bk-z-index-${key}: ${token.$value};`);
      }
    }

    return `/* ───────────────────────────────────────────────────
   CSS CUSTOM PROPERTIES
   ─────────────────────────────────────────────────── */
:root {
${vars.join("\n")}
}`;
  }

  /**
   * Generate utility classes
   */
  private static generateUtilityClasses(tokens: BrakitDesignTokens): string {
    const sections: string[] = [];

    // Background color utilities
    sections.push(this.generateColorUtilities(tokens, "bg", "background-color"));

    // Text color utilities
    sections.push(this.generateColorUtilities(tokens, "text", "color"));

    // Border color utilities
    sections.push(this.generateColorUtilities(tokens, "border", "border-color"));

    // Typography utilities
    sections.push(this.generateTypographyUtilities(tokens));

    // Spacing utilities (padding & margin)
    sections.push(this.generateSpacingUtilities(tokens));

    // Border radius utilities
    sections.push(this.generateRadiusUtilities(tokens));

    // Shadow utilities
    sections.push(this.generateShadowUtilities(tokens));

    // Layout utilities
    sections.push(this.generateLayoutUtilities(tokens));

    // Border width utilities
    if (tokens.border) {
      sections.push(this.generateBorderWidthUtilities(tokens));
    }

    // Opacity utilities
    if (tokens.opacity) {
      sections.push(this.generateOpacityUtilities(tokens));
    }

    // Z-index utilities
    if (tokens.zIndex) {
      sections.push(this.generateZIndexUtilities(tokens));
    }

    return sections.join("\n\n");
  }

  private static generateColorUtilities(
    tokens: BrakitDesignTokens,
    prefix: string,
    property: string
  ): string {
    const classes: string[] = [];

    for (const [key] of Object.entries(tokens.color)) {
      const className = `.bk-${prefix}-${key}`;
      const cssVar = `var(--bk-color-${key})`;
      classes.push(`${className} { ${property}: ${cssVar}; }`);
    }

    return `/* ───────────────────────────────────────────────────
   ${prefix.toUpperCase()} COLOR UTILITIES
   ─────────────────────────────────────────────────── */
${classes.join("\n")}`;
  }

  private static generateTypographyUtilities(tokens: BrakitDesignTokens): string {
    const classes: string[] = [];

    for (const [key, token] of Object.entries(tokens.typography)) {
      const className = `.bk-text-${key}`;
      const value = token.$value;
      const props: string[] = [];

      if (value.fontSize) props.push(`font-size: ${value.fontSize};`);
      if (value.fontWeight) props.push(`font-weight: ${value.fontWeight};`);
      if (value.lineHeight) props.push(`line-height: ${value.lineHeight};`);
      if (value.letterSpacing) props.push(`letter-spacing: ${value.letterSpacing};`);
      if (value.fontFamily) props.push(`font-family: ${value.fontFamily};`);

      classes.push(`${className} {\n  ${props.join("\n  ")}\n}`);
    }

    return `/* ───────────────────────────────────────────────────
   TYPOGRAPHY UTILITIES
   ─────────────────────────────────────────────────── */
${classes.join("\n\n")}`;
  }

  private static generateSpacingUtilities(tokens: BrakitDesignTokens): string {
    const classes: string[] = [];

    for (const [key] of Object.entries(tokens.spacing)) {
      const cssVar = `var(--bk-spacing-${key})`;
      
      // Padding utilities
      classes.push(`.bk-p-${key} { padding: ${cssVar}; }`);
      classes.push(`.bk-px-${key} { padding-left: ${cssVar}; padding-right: ${cssVar}; }`);
      classes.push(`.bk-py-${key} { padding-top: ${cssVar}; padding-bottom: ${cssVar}; }`);
      classes.push(`.bk-pt-${key} { padding-top: ${cssVar}; }`);
      classes.push(`.bk-pr-${key} { padding-right: ${cssVar}; }`);
      classes.push(`.bk-pb-${key} { padding-bottom: ${cssVar}; }`);
      classes.push(`.bk-pl-${key} { padding-left: ${cssVar}; }`);
      
      // Margin utilities
      classes.push(`.bk-m-${key} { margin: ${cssVar}; }`);
      classes.push(`.bk-mx-${key} { margin-left: ${cssVar}; margin-right: ${cssVar}; }`);
      classes.push(`.bk-my-${key} { margin-top: ${cssVar}; margin-bottom: ${cssVar}; }`);
      classes.push(`.bk-mt-${key} { margin-top: ${cssVar}; }`);
      classes.push(`.bk-mr-${key} { margin-right: ${cssVar}; }`);
      classes.push(`.bk-mb-${key} { margin-bottom: ${cssVar}; }`);
      classes.push(`.bk-ml-${key} { margin-left: ${cssVar}; }`);
      
      // Gap utilities
      classes.push(`.bk-gap-${key} { gap: ${cssVar}; }`);
    }

    return `/* ───────────────────────────────────────────────────
   SPACING UTILITIES
   ─────────────────────────────────────────────────── */
${classes.join("\n")}`;
  }

  private static generateRadiusUtilities(tokens: BrakitDesignTokens): string {
    const classes: string[] = [];

    for (const [key] of Object.entries(tokens.radius)) {
      const cssVar = `var(--bk-radius-${key})`;
      classes.push(`.bk-rounded-${key} { border-radius: ${cssVar}; }`);
    }

    return `/* ───────────────────────────────────────────────────
   BORDER RADIUS UTILITIES
   ─────────────────────────────────────────────────── */
${classes.join("\n")}`;
  }

  private static generateShadowUtilities(tokens: BrakitDesignTokens): string {
    const classes: string[] = [];

    for (const [key, token] of Object.entries(tokens.shadow)) {
      const className = `.bk-shadow-${key}`;
      const value = token.$value;

      if (key === "none" || value.blur === "0") {
        classes.push(`${className} { box-shadow: none; }`);
      } else {
        const shadow = `${value.offsetX} ${value.offsetY} ${value.blur} ${value.spread || "0"} ${value.color}`;
        classes.push(`${className} { box-shadow: ${shadow}; }`);
      }
    }

    return `/* ───────────────────────────────────────────────────
   SHADOW UTILITIES
   ─────────────────────────────────────────────────── */
${classes.join("\n")}`;
  }

  private static generateLayoutUtilities(tokens: BrakitDesignTokens): string {
    const classes: string[] = [];

    for (const [key] of Object.entries(tokens.layout)) {
      const cssVar = `var(--bk-layout-${key})`;
      classes.push(`.bk-max-w-${key} { max-width: ${cssVar}; }`);
      classes.push(`.bk-container-${key} { max-width: ${cssVar}; margin-left: auto; margin-right: auto; }`);
    }

    return `/* ───────────────────────────────────────────────────
   LAYOUT UTILITIES
   ─────────────────────────────────────────────────── */
${classes.join("\n")}`;
  }

  private static generateBorderWidthUtilities(tokens: BrakitDesignTokens): string {
    const classes: string[] = [];

    for (const [key] of Object.entries(tokens.border!)) {
      const cssVar = `var(--bk-border-${key})`;
      classes.push(`.bk-border-${key} { border-width: ${cssVar}; }`);
    }

    return `/* ───────────────────────────────────────────────────
   BORDER WIDTH UTILITIES
   ─────────────────────────────────────────────────── */
${classes.join("\n")}`;
  }

  private static generateOpacityUtilities(tokens: BrakitDesignTokens): string {
    const classes: string[] = [];

    for (const [key] of Object.entries(tokens.opacity!)) {
      const cssVar = `var(--bk-opacity-${key})`;
      classes.push(`.bk-opacity-${key} { opacity: ${cssVar}; }`);
    }

    return `/* ───────────────────────────────────────────────────
   OPACITY UTILITIES
   ─────────────────────────────────────────────────── */
${classes.join("\n")}`;
  }

  private static generateZIndexUtilities(tokens: BrakitDesignTokens): string {
    const classes: string[] = [];

    for (const [key] of Object.entries(tokens.zIndex!)) {
      const cssVar = `var(--bk-z-index-${key})`;
      classes.push(`.bk-z-${key} { z-index: ${cssVar}; }`);
    }

    return `/* ───────────────────────────────────────────────────
   Z-INDEX UTILITIES
   ─────────────────────────────────────────────────── */
${classes.join("\n")}`;
  }
}
