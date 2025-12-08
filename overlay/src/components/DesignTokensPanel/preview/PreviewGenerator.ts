import {
  findTokenByPattern,
  TYPOGRAPHY_PATTERNS,
  COLOR_PATTERNS,
  SPACING_PATTERNS,
  RADIUS_PATTERNS,
} from "../../../services/semanticPatterns";

/**
 * Generates HTML preview from design tokens using pattern matching for token resolution
 */
export class PreviewGenerator {
  /** Find a token using pattern matching */
  private static findToken(categoryTokens: any, patterns: string[]): any {
    if (!categoryTokens || typeof categoryTokens !== "object") return null;
    const keys = Object.keys(categoryTokens);
    if (keys.length === 0) return null;
    for (const pattern of patterns) {
      const found = keys.find((key) =>
        key.toLowerCase().includes(pattern.toLowerCase())
      );
      if (found) return categoryTokens[found];
    }
    return categoryTokens[keys[0]];
  }

  /** Find typography token by semantic name */
  private static findTypography(typography: any, semanticType: string): any {
    return findTokenByPattern(typography, semanticType, TYPOGRAPHY_PATTERNS);
  }

  /** Find color token by semantic name */
  private static findColor(colors: any, semanticColor: string): any {
    return findTokenByPattern(colors, semanticColor, COLOR_PATTERNS);
  }

  /** Find spacing token by semantic name */
  private static findSpacing(spacing: any, size: string): any {
    return findTokenByPattern(spacing, size, SPACING_PATTERNS);
  }

  /** Find radius token by semantic name */
  private static findRadius(radius: any, size: string): any {
    return findTokenByPattern(radius, size, RADIUS_PATTERNS);
  }

  /**
   * Generate complete HTML document for preview iframe
   */
  static generate(tokens: any): string {
    // If tokens is null/undefined (e.g. on reset), use empty object to trigger defaults
    const safeTokens = tokens || {};

    const colors = safeTokens.color || {};
    const typography = safeTokens.typography || {};
    const spacing = safeTokens.spacing || {};
    const radius = safeTokens.radius || {};
    const shadows = safeTokens.shadow || {};
    const opacity = safeTokens.opacity || {};
    const border = safeTokens.border || {};

    // Helper functions
    const v = (token: any, fallback: any) => token?.$value ?? fallback;
    
    const shadowString = (token: any, fallback: string) => {
      if (!token?.$value) return fallback;
      const {
        offsetX = "0",
        offsetY = "0",
        blur = "0",
        spread = "0",
        color = "rgba(0,0,0,0.1)",
      } = token.$value;
      return `${offsetX} ${offsetY} ${blur} ${spread || "0"} ${color}`;
    };

    // Typography defaults
    const typeDefaults: Record<string, any> = {
      h1: {
        fontSize: "2.25rem",
        fontWeight: "700",
        lineHeight: "1.3",
        letterSpacing: "0em",
      },
      h2: {
        fontSize: "1.875rem",
        fontWeight: "600",
        lineHeight: "1.4",
        letterSpacing: "0em",
      },
      h3: {
        fontSize: "1.5rem",
        fontWeight: "600",
        lineHeight: "1.35",
        letterSpacing: "0em",
      },
      body: {
        fontSize: "1rem",
        fontWeight: "400",
        lineHeight: "1.5",
        letterSpacing: "0em",
      },
      "body-sm": {
        fontSize: "0.875rem",
        fontWeight: "400",
        lineHeight: "1.5",
        letterSpacing: "0em",
      },
      label: {
        fontSize: "0.75rem",
        fontWeight: "500",
        lineHeight: "1.4",
        letterSpacing: "0.05em",
      },
      mono: {
        fontSize: "0.95rem",
        fontWeight: "500",
        lineHeight: "1.4",
        letterSpacing: "0em",
      },
    };

    const fallbackFontForType = (key: string) => {
      if (key === "mono") {
        return 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
      }
      return 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    };

    const typeFor = (key: string) => {
      const defaults = typeDefaults[key] || {};
      // Use smart typography finder instead of direct lookup
      const token = this.findTypography(typography, key);
      const value = token?.$value || {};

      return {
        fontSize: value.fontSize || defaults.fontSize,
        fontWeight: value.fontWeight || defaults.fontWeight,
        lineHeight: value.lineHeight || defaults.lineHeight,
        letterSpacing:
          value.letterSpacing !== undefined
            ? value.letterSpacing
            : defaults.letterSpacing ?? "0",
        fontFamily: value.fontFamily || fallbackFontForType(key),
      };
    };

    // Generate CSS variables for typography
    const typeVars = Object.keys(typeDefaults)
      .map((key) => {
        const type = typeFor(key);
        return `
          --${key}-size: ${type.fontSize};
          --${key}-weight: ${type.fontWeight};
          --${key}-line: ${type.lineHeight};
          --${key}-track: ${type.letterSpacing};
          --${key}-font: ${type.fontFamily};
        `;
      })
      .join("\n");

    // Generate complete HTML document
    return this.generateDocument({
      v,
      shadowString,
      colors,
      border,
      radius,
      shadows,
      spacing,
      opacity,
      typeVars,
    });
  }

  /**
   * Generate the complete HTML document structure
   */
  private static generateDocument(ctx: any): string {
    const { v, shadowString, colors, border, radius, shadows, spacing, opacity, typeVars } = ctx;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }

          html {
            overflow-y: auto;
            height: 100%;
          }

          body {
            min-height: 100%;
            overflow-y: auto;
          }

          :root {
            /* Colors - Smart pattern matching */
            --surface: ${v(this.findColor(colors, "surface"), "#ffffff")};
            --surface-alt: ${v(this.findColor(colors, "surface-alt"), "#f8fafc")};
            --text: ${v(this.findColor(colors, "text-main"), "#0f172a")};
            --muted: ${v(this.findColor(colors, "text-muted"), "#64748b")};
            --accent: ${v(this.findColor(colors, "primary"), "#2563eb")};
            --accent-soft: ${v(this.findColor(colors, "primary-soft"), "#eff6ff")};
            --danger: ${v(this.findColor(colors, "danger"), "#dc2626")};
            --danger-soft: ${v(this.findColor(colors, "danger-soft"), "#fef2f2")};
            --success: ${v(this.findColor(colors, "success"), "#059669")};
            --success-soft: ${v(this.findColor(colors, "success-soft"), "#ecfdf5")};
            --warning: ${v(this.findColor(colors, "warning"), "#f59e0b")};
            --warning-soft: ${v(this.findColor(colors, "warning-soft"), "#fffbeb")};
            --info: ${v(this.findColor(colors, "info"), "#0284c7")};
            --info-soft: ${v(this.findColor(colors, "info-soft"), "#f0f9ff")};
            --border-color: ${v(this.findColor(colors, "border-subtle"), "#e2e8f0")};
            --overlay: ${v(this.findColor(colors, "overlay"), "rgba(15, 23, 42, 0.64)")};
            --focus-ring: ${v(this.findColor(colors, "focus-ring"), "rgba(37, 99, 235, 0.45)")};

            /* Borders - Smart pattern matching */
            --border-width: ${v(this.findToken(border, ["subtle", "default", "base"]), "1px")};
            --border-strong: ${v(this.findToken(border, ["strong", "thick", "bold"]), "2px")};

            /* Radius - Smart pattern matching */
            --radius: ${v(this.findRadius(radius, "default"), "0.75rem")};
            --radius-sm: ${v(this.findRadius(radius, "sm"), "0.375rem")};
            --radius-lg: ${v(this.findRadius(radius, "lg"), "1rem")};
            --radius-pill: ${v(this.findRadius(radius, "pill"), "9999px")};

            /* Shadows - Smart pattern matching */
            --shadow: ${shadowString(this.findToken(shadows, ["default", "base", "md"]), "0 4px 6px -1px rgba(0,0,0,0.1)")};
            --shadow-sm: ${shadowString(this.findToken(shadows, ["sm", "small"]), "0 2px 4px rgba(0,0,0,0.08)")};
            --shadow-hover: ${shadowString(this.findToken(shadows, ["hover", "lg", "large"]), "0 10px 25px -5px rgba(15,23,42,0.12)")};

            /* Spacing - Smart pattern matching */
            --space-xs: ${v(this.findSpacing(spacing, "space-xs"), "0.5rem")};
            --space-sm: ${v(this.findSpacing(spacing, "space-sm"), "0.75rem")};
            --space-md: ${v(this.findSpacing(spacing, "space-md"), "1rem")};
            --space-lg: ${v(this.findSpacing(spacing, "space-lg"), "1.5rem")};
            --space-xl: ${v(this.findSpacing(spacing, "space-xl"), "2rem")};
            --section-x: ${v(this.findSpacing(spacing, "section-x"), "1.5rem")};
            --section-y: ${v(this.findSpacing(spacing, "section-y"), "0.75rem")};

            /* Opacity - Smart pattern matching */
            --overlay-opacity: ${v(this.findToken(opacity, ["overlay", "backdrop", "default"]), 0.72)};

            /* Animation */
            --duration: 220ms;
            --easing: cubic-bezier(0.2, 0, 0, 1);

            ${typeVars}
          }

          ${this.getPreviewStyles()}
        </style>
      </head>
      <body>
        ${this.getPreviewBody(ctx)}
      </body>
      </html>
    `;
  }

  /**
   * Get CSS styles for preview
   */
  private static getPreviewStyles(): string {
    return `
      body {
        font-family: var(--body-font, var(--font-body));
        background: var(--surface-alt);
        color: var(--text);
        font-size: var(--body-size);
        line-height: var(--body-line);
        letter-spacing: var(--body-track);
        min-height: 100vh;
        overflow-y: auto;
        display: grid;
        grid-template-rows: auto 1fr;
      }

      /* Typography Utilities */
      .h1 { font: var(--h1-weight) var(--h1-size)/var(--h1-line) var(--h1-font); letter-spacing: var(--h1-track); }
      .h2 { font: var(--h2-weight) var(--h2-size)/var(--h2-line) var(--h2-font); letter-spacing: var(--h2-track); }
      .h3 { font: var(--h3-weight) var(--h3-size)/var(--h3-line) var(--h3-font); letter-spacing: var(--h3-track); }
      .body { font: var(--body-weight) var(--body-size)/var(--body-line) var(--body-font); letter-spacing: var(--body-track); }
      .body-sm { font: var(--body-sm-weight) var(--body-sm-size)/var(--body-sm-line) var(--body-font); letter-spacing: var(--body-sm-track); }
      .label { font: var(--label-weight) var(--label-size)/var(--label-line) var(--label-font); letter-spacing: var(--label-track); text-transform: uppercase; }
      .mono { font: var(--mono-weight) var(--mono-size)/var(--mono-line) var(--mono-font); letter-spacing: var(--mono-track); }

      /* Layout */
      header {
        background: var(--surface);
        border-bottom: var(--border-width) solid var(--border-color);
        padding: var(--space-sm) var(--section-x);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .logo {
        font-weight: 700;
        color: var(--text);
        display: flex;
        align-items: center;
        gap: var(--space-xs);
      }
      .logo-dot { width: 8px; height: 8px; background: var(--accent); border-radius: 50%; }

      main {
        padding: var(--section-y) var(--section-x);
        display: grid;
        grid-template-columns: 1fr 1.2fr 1fr;
        gap: var(--space-lg);
        overflow: visible;
        max-width: 1600px;
        margin: 0 auto;
        width: 100%;
      }

      .col {
        display: flex;
        flex-direction: column;
        gap: var(--space-lg);
        overflow-y: auto;
        padding-right: 4px; /* Space for scrollbar if needed */
      }
      
      /* Hide scrollbar but keep functionality */
      .col::-webkit-scrollbar { width: 0; height: 0; }

      .section {
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
      }

      .section-title {
        color: var(--muted);
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding-bottom: var(--space-xs);
        border-bottom: 1px solid var(--border-color);
        margin-bottom: var(--space-xs);
      }

      /* Cards & Grids */
      .card {
        background: var(--surface);
        border: var(--border-width) solid var(--border-color);
        border-radius: var(--radius);
        padding: var(--space-md);
        box-shadow: var(--shadow);
        transition: all var(--duration) var(--easing);
      }
      
      .card-interactive:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-hover);
        border-color: var(--accent);
      }

      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm); }
      .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-sm); }

      /* Typography Grid */
      .type-card {
        padding: var(--space-sm);
        background: var(--surface);
        border: var(--border-width) solid var(--border-color);
        border-radius: var(--radius-sm);
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
      }
      .type-meta { font-size: 0.65rem; color: var(--muted); font-family: var(--mono-font); }

      /* Spacing Grid */
      .space-item {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        padding: var(--space-xs);
        background: var(--surface);
        border: var(--border-width) solid var(--border-color);
        border-radius: var(--radius-sm);
      }
      .space-viz { background: var(--accent-soft); height: 1.5rem; border-radius: 2px; min-width: 4px; }
      .space-info { font-size: 0.7rem; font-weight: 500; }

      /* Buttons */
      .btn-group { display: flex; flex-wrap: wrap; gap: var(--space-sm); }
      
      .btn {
        appearance: none;
        border: none;
        background: transparent;
        font-family: inherit;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.625rem 1rem;
        border-radius: var(--radius);
        font-size: var(--body-sm-size);
        font-weight: 500;
        transition: all 0.2s;
        gap: 0.5rem;
      }

      .btn-primary { background: var(--accent); color: white; box-shadow: var(--shadow-sm); }
      .btn-primary:hover { filter: brightness(1.1); box-shadow: var(--shadow); }
      
      .btn-secondary { background: var(--surface); border: var(--border-width) solid var(--border-color); color: var(--text); box-shadow: var(--shadow-sm); }
      .btn-secondary:hover { border-color: var(--muted); background: var(--surface-alt); }

      .btn-danger { background: var(--danger); color: white; box-shadow: var(--shadow-sm); }
      .btn-danger:hover { filter: brightness(1.1); box-shadow: var(--shadow); }

      .btn-ghost { color: var(--muted); }
      .btn-ghost:hover { background: var(--surface-alt); color: var(--text); }

      /* Inputs */
      .input-group { display: flex; flex-direction: column; gap: var(--space-xs); }
      .input-label { font-size: 0.75rem; font-weight: 500; color: var(--text); }
      
      .input {
        width: 100%;
        padding: 0.625rem;
        background: var(--surface);
        border: var(--border-width) solid var(--border-color);
        border-radius: var(--radius);
        color: var(--text);
        font-family: inherit;
        font-size: var(--body-sm-size);
        transition: all 0.2s;
      }
      
      .input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--focus-ring);
      }

      .input-error { border-color: var(--danger); }
      .input-error:focus { box-shadow: 0 0 0 3px var(--danger-soft); border-color: var(--danger); }

      /* Colors */
      .color-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--space-sm);
      }

      .swatch {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        padding: var(--space-xs);
        background: var(--surface);
        border: var(--border-width) solid var(--border-color);
        border-radius: var(--radius-sm);
      }

      .swatch-color {
        width: 2rem;
        height: 2rem;
        border-radius: var(--radius-sm);
        border: 1px solid rgba(0,0,0,0.05);
      }

      .swatch-info { display: flex; flex-direction: column; }
      .swatch-name { font-size: 0.75rem; font-weight: 600; color: var(--text); }
      .swatch-val { font-size: 0.65rem; color: var(--muted); font-family: var(--mono-font); }

      /* Badges */
      .badge-group { display: flex; gap: var(--space-xs); flex-wrap: wrap; }
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.5rem;
        border-radius: var(--radius-sm);
        font-size: 0.7rem;
        font-weight: 600;
        line-height: 1;
      }

      .badge-neutral { background: var(--surface-alt); color: var(--text); border: 1px solid var(--border-color); }
      .badge-accent { background: var(--accent-soft); color: var(--accent); }
      .badge-success { background: var(--success-soft); color: var(--success); }

      /* Empty State */
      .empty-state {
        padding: var(--space-lg);
        text-align: center;
        color: var(--muted);
        font-size: 0.875rem;
        background: var(--surface-alt);
        border: 1px dashed var(--border-color);
        border-radius: var(--radius);
      }

      /* Enhanced Typography Cards */
      .type-details {
        font-size: 0.65rem;
        color: var(--muted);
        font-family: var(--mono-font);
        margin-top: 0.25rem;
      }

      /* Enhanced Spacing */
      .space-info {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
      }
      .space-name {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text);
      }
      .space-val {
        font-size: 0.65rem;
        color: var(--muted);
        font-family: var(--mono-font);
      }

      /* Radius Preview */
      .radius-item {
        display: flex;
        align-items: center;
        gap: var(--space-md);
        padding: var(--space-sm);
        background: var(--surface);
        border: var(--border-width) solid var(--border-color);
        border-radius: var(--radius-sm);
      }
      .radius-box {
        width: 3rem;
        height: 3rem;
        background: var(--accent-soft);
        border: 2px solid var(--accent);
        flex-shrink: 0;
      }
      .radius-info {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
        min-width: 0;
      }
      .radius-name {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text);
      }
      .radius-val {
        font-size: 0.65rem;
        color: var(--muted);
        font-family: var(--mono-font);
      }

      /* Shadow Preview */
      .shadow-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-xs);
      }
      .shadow-box {
        width: 100%;
        height: 4rem;
        background: var(--surface);
        border-radius: var(--radius);
        display: grid;
        place-items: center;
      }
      .shadow-info {
        width: 100%;
        text-align: center;
      }
      .shadow-name {
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--text);
      }

      /* Border Preview */
      .border-item {
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
        padding: var(--space-sm);
        background: var(--surface);
        border: var(--border-width) solid var(--border-color);
        border-radius: var(--radius-sm);
      }
      .border-viz {
        width: 100%;
        height: 0;
      }
      .border-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .border-name {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text);
      }
      .border-val {
        font-size: 0.65rem;
        color: var(--muted);
        font-family: var(--mono-font);
      }
    `;
  }

  /**
   * Get HTML body content for preview - FULLY DYNAMIC
   * Generates a page that adapts 100% to the tokens provided
   */
  private static getPreviewBody(ctx: any): string {
    const { colors, typography, spacing, radius, shadows } = ctx;

    // Analyze what tokens we have
    const colorEntries = Object.entries(colors || {});
    const typographyEntries = Object.entries(typography || {});
    const spacingEntries = Object.entries(spacing || {});
    const radiusEntries = Object.entries(radius || {});
    const shadowEntries = Object.entries(shadows || {});

    const hasColors = colorEntries.length > 0;
    const hasTypography = typographyEntries.length > 0;
    const hasSpacing = spacingEntries.length > 0;
    const hasRadius = radiusEntries.length > 0;
    const hasShadows = shadowEntries.length > 0;

    // If no tokens at all, show empty state
    if (!hasColors && !hasTypography && !hasSpacing && !hasRadius && !hasShadows) {
      return this.generateEmptyState();
    }

    return `
      <div style="min-height: 100vh; background: var(--surface-alt); padding: var(--space-lg); padding-bottom: calc(var(--space-xl) * 2);">
        <div style="max-width: 1400px; margin: 0 auto;">

          <!-- Page Header -->
          ${this.generateDynamicHeader(colorEntries)}

          <!-- Dynamic Content Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: var(--space-lg); margin-top: var(--space-xl);">

            ${hasColors ? this.generateColorShowcase(colorEntries) : ''}
            ${hasTypography ? this.generateTypographyShowcase(typographyEntries) : ''}
            ${hasSpacing ? this.generateSpacingShowcase(spacingEntries) : ''}
            ${hasRadius ? this.generateRadiusShowcase(radiusEntries) : ''}
            ${hasShadows ? this.generateShadowShowcase(shadowEntries) : ''}

          </div>

          <!-- Dynamic UI Examples -->
          ${hasColors ? this.generateUIExamples(colorEntries) : ''}

        </div>
      </div>
    `;
  }

  /**
   * Generate empty state when no tokens exist
   */
  private static generateEmptyState(): string {
    return `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: var(--surface-alt);">
        <div style="text-align: center; max-width: 500px; padding: var(--space-xl);">
          <div style="font-size: 4rem; margin-bottom: var(--space-lg);">🎨</div>
          <h2 class="h2" style="color: var(--text); margin-bottom: var(--space-md);">No Design Tokens Yet</h2>
          <p class="body" style="color: var(--muted);">
            Import or create design tokens to see them come to life in this preview.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Generate dynamic header using actual color tokens
   */
  private static generateDynamicHeader(colorEntries: [string, any][]): string {
    // Use first color as accent if available
    const firstColor = colorEntries[0];
    const accentColor = firstColor ? firstColor[1].$value : 'var(--accent)';

    return `
      <header style="background: var(--surface); padding: var(--space-lg); border-radius: var(--radius); box-shadow: var(--shadow); margin-bottom: var(--space-xl);">
        <div style="display: flex; align-items: center; gap: var(--space-md);">
          <div style="width: 48px; height: 48px; background: ${accentColor}; border-radius: var(--radius);"></div>
          <div>
            <h1 class="h2" style="color: var(--text); margin-bottom: 0.25rem;">Design System Preview</h1>
            <p class="body-sm" style="color: var(--muted);">Live preview of your design tokens</p>
          </div>
        </div>
      </header>
    `;
  }

  /**
   * Generate color showcase using ALL color tokens
   */
  private static generateColorShowcase(colorEntries: [string, any][]): string {
    const colorCards = colorEntries.map(([name, token]) => {
      const value = token?.$value || '#cccccc';
      return `
        <div style="background: ${value}; padding: var(--space-md); border-radius: var(--radius-sm); min-height: 80px; display: flex; flex-direction: column; justify-content: flex-end;">
          <div style="background: rgba(0,0,0,0.7); color: white; padding: 0.5rem; border-radius: 0.25rem; font-size: 0.75rem;">
            <div style="font-weight: 600;">${name}</div>
            <div style="opacity: 0.9; font-family: var(--mono-font); font-size: 0.7rem;">${value}</div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="card" style="padding: var(--space-lg);">
        <h3 class="h3" style="color: var(--text); margin-bottom: var(--space-md);">Colors (${colorEntries.length})</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--space-sm);">
          ${colorCards}
        </div>
      </div>
    `;
  }

  /**
   * Generate typography showcase using ALL typography tokens
   */
  private static generateTypographyShowcase(typographyEntries: [string, any][]): string {
    const typeSamples = typographyEntries.map(([name, token]) => {
      const value = token?.$value || {};
      const fontSize = value.fontSize || '1rem';
      const fontWeight = value.fontWeight || '400';
      const lineHeight = value.lineHeight || '1.5';

      return `
        <div style="margin-bottom: var(--space-md); padding: var(--space-md); background: var(--surface-alt); border-radius: var(--radius-sm);">
          <div style="font-size: ${fontSize}; font-weight: ${fontWeight}; line-height: ${lineHeight}; color: var(--text); margin-bottom: var(--space-xs);">
            The quick brown fox jumps over the lazy dog
          </div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--mono-font);">
            ${name} · ${fontSize} · ${fontWeight}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="card" style="padding: var(--space-lg);">
        <h3 class="h3" style="color: var(--text); margin-bottom: var(--space-md);">Typography (${typographyEntries.length})</h3>
        ${typeSamples}
      </div>
    `;
  }

  /**
   * Generate spacing showcase using ALL spacing tokens
   */
  private static generateSpacingShowcase(spacingEntries: [string, any][]): string {
    const spacingBars = spacingEntries.map(([name, token]) => {
      const value = token?.$value || '0px';
      return `
        <div style="display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-sm);">
          <div style="width: ${value}; height: 24px; background: var(--accent); border-radius: 0.25rem;"></div>
          <div style="font-size: 0.75rem; color: var(--text); font-weight: 600;">${name}</div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--mono-font);">${value}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="card" style="padding: var(--space-lg);">
        <h3 class="h3" style="color: var(--text); margin-bottom: var(--space-md);">Spacing (${spacingEntries.length})</h3>
        ${spacingBars}
      </div>
    `;
  }

  /**
   * Generate radius showcase using ALL radius tokens
   */
  private static generateRadiusShowcase(radiusEntries: [string, any][]): string {
    const radiusBoxes = radiusEntries.map(([name, token]) => {
      const value = token?.$value || '0px';
      return `
        <div style="text-align: center;">
          <div style="width: 80px; height: 80px; background: var(--accent-soft); border: 2px solid var(--accent); border-radius: ${value}; margin: 0 auto var(--space-sm);"></div>
          <div style="font-size: 0.75rem; color: var(--text); font-weight: 600;">${name}</div>
          <div style="font-size: 0.7rem; color: var(--muted); font-family: var(--mono-font);">${value}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="card" style="padding: var(--space-lg);">
        <h3 class="h3" style="color: var(--text); margin-bottom: var(--space-md);">Border Radius (${radiusEntries.length})</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: var(--space-lg);">
          ${radiusBoxes}
        </div>
      </div>
    `;
  }

  /**
   * Generate shadow showcase using ALL shadow tokens
   */
  private static generateShadowShowcase(shadowEntries: [string, any][]): string {
    const shadowBoxes = shadowEntries.map(([name, token]) => {
      const shadowVal = token?.$value;
      let shadowString = '0 2px 4px rgba(0,0,0,0.1)';
      if (shadowVal && typeof shadowVal === 'object') {
        const { offsetX = '0', offsetY = '0', blur = '0', spread = '0', color = 'rgba(0,0,0,0.1)' } = shadowVal;
        shadowString = `${offsetX} ${offsetY} ${blur} ${spread} ${color}`;
      }

      return `
        <div style="text-align: center;">
          <div style="width: 100px; height: 100px; background: var(--surface); box-shadow: ${shadowString}; border-radius: var(--radius); margin: var(--space-md) auto;"></div>
          <div style="font-size: 0.75rem; color: var(--text); font-weight: 600;">${name}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="card" style="padding: var(--space-lg);">
        <h3 class="h3" style="color: var(--text); margin-bottom: var(--space-md);">Shadows (${shadowEntries.length})</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: var(--space-lg);">
          ${shadowBoxes}
        </div>
      </div>
    `;
  }

  /** Generate realistic UI examples using actual tokens */
  private static generateUIExamples(colorEntries: [string, any][]): string {
    const buttons = colorEntries.slice(0, 5).map(([name, token]) => {
      const value = token?.$value || '#2563eb';
      return `<button class="btn" style="background: ${value}; color: white; border: none;">${name}</button>`;
    }).join('');

    return `
      <div class="card" style="padding: var(--space-xl); margin-top: var(--space-xl); grid-column: 1 / -1;">
        <h3 class="h2" style="color: var(--text); margin-bottom: var(--space-lg); text-align: center;">UI Component Examples</h3>

        <div style="margin-bottom: var(--space-xl);">
          <h4 class="h3" style="color: var(--text); margin-bottom: var(--space-md);">Buttons</h4>
          <div style="display: flex; flex-wrap: wrap; gap: var(--space-md);">
            ${buttons}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-lg);">
          ${colorEntries.slice(0, 3).map(([name, token]) => {
            const value = token?.$value || '#ffffff';
            return `
              <div class="card" style="border-left: 4px solid ${value}; padding: var(--space-lg);">
                <h4 class="h3" style="color: var(--text); margin-bottom: var(--space-sm);">Feature Card</h4>
                <p class="body" style="color: var(--muted);">This card uses the ${name} color as an accent.</p>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
}
