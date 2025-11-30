import type {
  BrakitDesignTokens,
  ColorToken,
  DimensionToken,
  TypographyToken,
  ShadowToken,
  NumberToken,
  ResolvedTokens,
} from "./types";

/**
 * Resolves W3C design token values to Tailwind CSS classes
 */
export class TokenResolver {
  /**
   * Resolve all tokens to Tailwind classes
   */
  static resolve(tokens: BrakitDesignTokens): ResolvedTokens {
    return {
      color: this.resolveColors(tokens.color),
      typography: this.resolveTypography(tokens.typography),
      spacing: this.resolveSpacing(tokens.spacing),
      radius: this.resolveRadius(tokens.radius),
      shadow: this.resolveShadows(tokens.shadow),
      layout: this.resolveLayout(tokens.layout),
      border: this.resolveBorders(tokens.border ?? {}),
      opacity: this.resolveOpacity(tokens.opacity ?? {}),
      zIndex: this.resolveZIndex(tokens.zIndex ?? {}),
    };
  }

  /**
   * Resolve color tokens to Tailwind classes
   */
  private static resolveColors(
    colors: Record<string, ColorToken>
  ): Record<string, string> {
    const resolved: Record<string, string> = {};

    for (const [key, token] of Object.entries(colors)) {
      // For now, we'll use inline styles via arbitrary values
      // Later we can map to actual Tailwind colors
      const hexValue = this.escapeArbitrary(token.$value);
      
      // Determine if this is primarily a background or text color based on key
      if (key.includes("text")) {
        resolved[key] = `text-[${hexValue}]`;
      } else if (key.includes("border")) {
        resolved[key] = `border-[${hexValue}]`;
      } else {
        // Default to background color
        resolved[key] = `bg-[${hexValue}]`;
      }
    }

    return resolved;
  }

  /**
   * Resolve typography tokens to Tailwind classes
   */
  private static resolveTypography(
    typography: Record<string, TypographyToken>
  ): Record<string, string> {
    const resolved: Record<string, string> = {};

    for (const [key, token] of Object.entries(typography)) {
      const classes: string[] = [];
      const value = token.$value;

      // Font size
      if (value.fontSize) {
        classes.push(`text-[${this.escapeArbitrary(value.fontSize)}]`);
      }

      // Font weight
      if (value.fontWeight) {
        const weightMap: Record<string, string> = {
          "300": "font-light",
          "400": "font-normal",
          "500": "font-medium",
          "600": "font-semibold",
          "700": "font-bold",
          "800": "font-extrabold",
        };
        classes.push(weightMap[value.fontWeight] || `font-[${value.fontWeight}]`);
      }

      // Line height
      if (value.lineHeight) {
        classes.push(`leading-[${this.escapeArbitrary(value.lineHeight)}]`);
      }

      // Letter spacing
      if (value.letterSpacing) {
        classes.push(`tracking-[${this.escapeArbitrary(value.letterSpacing)}]`);
      }

      if (value.fontFamily) {
        classes.push(`font-[${this.escapeArbitrary(value.fontFamily)}]`);
      }

      resolved[key] = classes.join(" ");
    }

    return resolved;
  }

  /**
   * Resolve spacing tokens to Tailwind classes
   */
  private static resolveSpacing(
    spacing: Record<string, DimensionToken>
  ): Record<string, string> {
    const resolved: Record<string, string> = {};

    for (const [key, token] of Object.entries(spacing)) {
      const value = token.$value;
      
      // Map common spacing patterns
      if (key.endsWith("-y")) {
        resolved[key] = `py-[${this.escapeArbitrary(value)}]`;
      } else if (key.endsWith("-x")) {
        resolved[key] = `px-[${this.escapeArbitrary(value)}]`;
      } else if (key.startsWith("gap")) {
        resolved[key] = `gap-[${this.escapeArbitrary(value)}]`;
      } else if (key.endsWith("-p")) {
        resolved[key] = `p-[${this.escapeArbitrary(value)}]`;
      } else {
        // Default spacing tokens map to padding to keep legacy templates aligned
        resolved[key] = `p-[${this.escapeArbitrary(value)}]`;
      }
    }

    return resolved;
  }

  /**
   * Resolve radius tokens to Tailwind classes
   */
  private static resolveRadius(
    radius: Record<string, DimensionToken>
  ): Record<string, string> {
    const resolved: Record<string, string> = {};

    for (const [key, token] of Object.entries(radius)) {
      const value = token.$value;
      
      // Special case for full radius
      if (value === "9999px" || value === "50%" || key === "pill") {
        resolved[key] = "rounded-full";
      } else {
        resolved[key] = `rounded-[${this.escapeArbitrary(value)}]`;
      }
    }

    return resolved;
  }

  /**
   * Resolve shadow tokens to Tailwind classes
   */
  private static resolveShadows(
    shadows: Record<string, ShadowToken>
  ): Record<string, string> {
    const resolved: Record<string, string> = {};

    for (const [key, token] of Object.entries(shadows)) {
      const value = token.$value;
      
      // Check for no shadow
      if (value.blur === "0" || key === "none") {
        resolved[key] = "shadow-none";
      } else {
        // Build shadow value
        const shadowValue = [
          value.offsetX,
          value.offsetY,
          value.blur,
          value.spread || "0",
          value.color,
        ].join(" ");
        
        resolved[key] = `shadow-[${this.escapeArbitrary(shadowValue)}]`;
      }
    }

    return resolved;
  }

  /**
   * Resolve layout tokens to Tailwind classes
   */
  private static resolveLayout(
    layout: Record<string, DimensionToken>
  ): Record<string, string> {
    const resolved: Record<string, string> = {};

    for (const [key, token] of Object.entries(layout)) {
      const value = token.$value;
      resolved[key] = `max-w-[${this.escapeArbitrary(value)}] mx-auto`;
    }

    return resolved;
  }

  private static resolveBorders(
    borders: Record<string, DimensionToken>
  ): Record<string, string> {
    const resolved: Record<string, string> = {};

    for (const [key, token] of Object.entries(borders)) {
      const value = token.$value;
      resolved[key] = `border-[${this.escapeArbitrary(value)}]`;
    }

    return resolved;
  }

  private static resolveOpacity(
    opacity: Record<string, NumberToken>
  ): Record<string, string> {
    const resolved: Record<string, string> = {};

    for (const [key, token] of Object.entries(opacity)) {
      const value = token.$value;
      resolved[key] = `opacity-[${value}]`;
    }

    return resolved;
  }

  private static resolveZIndex(
    zIndex: Record<string, NumberToken>
  ): Record<string, string> {
    const resolved: Record<string, string> = {};

    for (const [key, token] of Object.entries(zIndex)) {
      resolved[key] = `z-[${token.$value}]`;
    }

    return resolved;
}

  /**
   * Tailwind arbitrary values cannot contain raw spaces; swap them for underscores.
   */
  private static escapeArbitrary(value: string): string {
    return value.replace(/\s+/g, "_").replace(/['"]/g, "").replace(/,/g, "_");
  }
}
