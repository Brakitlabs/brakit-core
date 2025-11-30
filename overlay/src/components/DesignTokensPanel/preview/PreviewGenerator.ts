/**
 * PreviewGenerator - Generates HTML preview from design tokens
 * Extracted from DesignTokensPanel for better maintainability
 */

export class PreviewGenerator {
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
    const layout = safeTokens.layout || {};
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
      const token = typography[key];
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
      layout,
      typeVars,
    });
  }

  /**
   * Generate the complete HTML document structure
   */
  private static generateDocument(ctx: any): string {
    const { v, shadowString, colors, border, radius, shadows, spacing, opacity, layout, typeVars } = ctx;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          :root {
            /* Colors */
            --surface: ${v(colors.surface, "#ffffff")};
            --surface-alt: ${v(colors["surface-alt"], "#f8fafc")};
            --text: ${v(colors["text-main"], "#0f172a")};
            --muted: ${v(colors["text-muted"], "#64748b")};
            --accent: ${v(colors.primary, "#2563eb")};
            --accent-soft: ${v(colors["primary-soft"], "#eff6ff")};
            --danger: ${v(colors.danger, "#dc2626")};
            --danger-soft: ${v(colors["danger-soft"], "#fef2f2")};
            --success: ${v(colors.success, "#059669")};
            --success-soft: ${v(colors["success-soft"], "#ecfdf5")};
            --warning: ${v(colors.warning, "#f59e0b")};
            --warning-soft: ${v(colors["warning-soft"], "#fffbeb")};
            --info: ${v(colors.info, "#0284c7")};
            --info-soft: ${v(colors["info-soft"], "#f0f9ff")};
            --border-color: ${v(colors["border-subtle"], "#e2e8f0")};
            --overlay: ${v(colors.overlay, "rgba(15, 23, 42, 0.64)")};
            --focus-ring: ${v(colors["focus-ring"], "rgba(37, 99, 235, 0.45)")};

            /* Borders */
            --border-width: ${v(border.subtle, "1px")};
            --border-strong: ${v(border.strong, "2px")};

            /* Radius */
            --radius: ${v(radius.default, "0.75rem")};
            --radius-sm: ${v(radius.sm, "0.375rem")};
            --radius-lg: ${v(radius.lg, "1rem")};
            --radius-pill: ${v(radius.pill, "9999px")};

            /* Shadows */
            --shadow: ${shadowString(shadows.default, "0 4px 6px -1px rgba(0,0,0,0.1)")};
            --shadow-sm: ${shadowString(shadows.default, "0 2px 4px rgba(0,0,0,0.08)")};
            --shadow-hover: ${shadowString(shadows.hover, "0 10px 25px -5px rgba(15,23,42,0.12)")};

            /* Spacing */
            --space-xs: ${v(spacing["space-xs"], "0.5rem")};
            --space-sm: ${v(spacing["space-sm"], "0.75rem")};
            --space-md: ${v(spacing["space-md"], "1rem")};
            --space-lg: ${v(spacing["space-lg"], "1.5rem")};
            --space-xl: ${v(spacing["space-xl"], "2rem")};
            --section-x: ${v(spacing["section-x"], "1.5rem")};
            --section-y: ${v(spacing["section-y"], "0.75rem")};

            /* Opacity */
            --overlay-opacity: ${v(opacity.overlay, 0.72)};

            /* Animation */
            --duration: 220ms;
            --easing: cubic-bezier(0.2, 0, 0, 1);

            ${typeVars}
          }

          ${this.getPreviewStyles()}
        </style>
      </head>
      <body>
        ${this.getPreviewBody()}
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
        height: 100vh;
        overflow: hidden;
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
        overflow: hidden;
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
    `;
  }

  /**
   * Get HTML body content for preview
   */
  private static getPreviewBody(): string {
    return `
      <header>
        <div class="logo">
          <div class="logo-dot"></div>
          <span>Token Preview</span>
        </div>
        <div class="badge badge-neutral">v1.2</div>
      </header>

      <main>
        <!-- Column 1: Typography & Spacing -->
        <div class="col">
          <div class="section">
            <div class="section-title">Typography</div>
            <div style="display: grid; gap: var(--space-sm)">
              <div class="type-card">
                <div class="h1">Aa</div>
                <div class="type-meta">Heading 1</div>
              </div>
              <div class="grid-2">
                <div class="type-card">
                  <div class="h2">Aa</div>
                  <div class="type-meta">Heading 2</div>
                </div>
                <div class="type-card">
                  <div class="h3">Aa</div>
                  <div class="type-meta">Heading 3</div>
                </div>
              </div>
              <div class="type-card">
                <div class="body">Body text regular.</div>
                <div class="type-meta">Body</div>
              </div>
              <div class="grid-2">
                <div class="type-card">
                  <div class="label">Label</div>
                  <div class="type-meta">Label</div>
                </div>
                <div class="type-card">
                  <div class="mono">Code</div>
                  <div class="type-meta">Mono</div>
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Spacing</div>
            <div style="display: grid; gap: var(--space-xs)">
              <div class="space-item"><div class="space-viz" style="width: var(--space-xs)"></div><div class="space-info">xs</div></div>
              <div class="space-item"><div class="space-viz" style="width: var(--space-sm)"></div><div class="space-info">sm</div></div>
              <div class="space-item"><div class="space-viz" style="width: var(--space-md)"></div><div class="space-info">md</div></div>
              <div class="space-item"><div class="space-viz" style="width: var(--space-lg)"></div><div class="space-info">lg</div></div>
              <div class="space-item"><div class="space-viz" style="width: var(--space-xl)"></div><div class="space-info">xl</div></div>
            </div>
          </div>
        </div>

        <!-- Column 2: Components -->
        <div class="col">
          <div class="section">
            <div class="section-title">Interactive Elements</div>
            
            <!-- Buttons -->
            <div class="card">
              <div class="label" style="margin-bottom: var(--space-sm)">Buttons</div>
              <div class="btn-group">
                <button class="btn btn-primary">Primary</button>
                <button class="btn btn-secondary">Secondary</button>
                <button class="btn btn-ghost">Ghost</button>
                <button class="btn btn-danger">Danger</button>
              </div>
            </div>

            <!-- Inputs -->
            <div class="card">
              <div class="label" style="margin-bottom: var(--space-sm)">Form Inputs</div>
              <div style="display: grid; gap: var(--space-md)">
                <div class="input-group">
                  <label class="input-label">Default Input</label>
                  <input type="text" class="input" placeholder="Type something..." />
                </div>
                <div class="input-group">
                  <label class="input-label" style="color: var(--danger)">Error State</label>
                  <input type="text" class="input input-error" value="Invalid value" />
                </div>
              </div>
            </div>

            <!-- Card Demo -->
            <div class="card card-interactive">
              <div class="h3">Interactive Card</div>
              <div class="body-sm" style="color: var(--muted); margin: var(--space-xs) 0 var(--space-md)">
                Hover me to see shadow and border transition.
              </div>
              <div class="badge-group">
                <span class="badge badge-accent">New</span>
                <span class="badge badge-success">Active</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Column 3: Colors & Status -->
        <div class="col">
          <div class="section">
            <div class="section-title">Semantic Colors</div>
            <div class="color-grid">
              <div class="swatch"><div class="swatch-color" style="background: var(--text)"></div><div class="swatch-info"><span class="swatch-name">Text</span><span class="swatch-val">Main</span></div></div>
              <div class="swatch"><div class="swatch-color" style="background: var(--muted)"></div><div class="swatch-info"><span class="swatch-name">Muted</span><span class="swatch-val">Text</span></div></div>
              <div class="swatch"><div class="swatch-color" style="background: var(--surface)"></div><div class="swatch-info"><span class="swatch-name">Surface</span><span class="swatch-val">Base</span></div></div>
              <div class="swatch"><div class="swatch-color" style="background: var(--surface-alt)"></div><div class="swatch-info"><span class="swatch-name">Surface</span><span class="swatch-val">Alt</span></div></div>
              <div class="swatch"><div class="swatch-color" style="background: var(--accent)"></div><div class="swatch-info"><span class="swatch-name">Primary</span><span class="swatch-val">Brand</span></div></div>
              <div class="swatch"><div class="swatch-color" style="background: var(--success)"></div><div class="swatch-info"><span class="swatch-name">Success</span><span class="swatch-val">Good</span></div></div>
              <div class="swatch"><div class="swatch-color" style="background: var(--warning)"></div><div class="swatch-info"><span class="swatch-name">Warning</span><span class="swatch-val">Alert</span></div></div>
              <div class="swatch"><div class="swatch-color" style="background: var(--danger)"></div><div class="swatch-info"><span class="swatch-name">Danger</span><span class="swatch-val">Error</span></div></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Effects</div>
            <div class="card" style="background: var(--surface-alt)">
              <div class="label" style="margin-bottom: var(--space-sm)">Shadows & Radius</div>
              <div style="display: flex; gap: var(--space-md)">
                <div style="width: 3rem; height: 3rem; background: var(--surface); border-radius: var(--radius-sm); box-shadow: var(--shadow); display: grid; place-items: center; font-size: 0.6rem; color: var(--muted)">sm</div>
                <div style="width: 3rem; height: 3rem; background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); display: grid; place-items: center; font-size: 0.6rem; color: var(--muted)">def</div>
                <div style="width: 3rem; height: 3rem; background: var(--surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-hover); display: grid; place-items: center; font-size: 0.6rem; color: var(--muted)">hover</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    `;
  }
}
