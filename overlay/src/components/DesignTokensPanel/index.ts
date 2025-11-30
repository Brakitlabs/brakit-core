/**
 * DesignTokensPanel - Refactored Main Component
 * Apple-Inspired Interface for editing design tokens
 * 
 * This is the main orchestrator that coordinates:
 * - TokenPreview for preview iframe management
 * - Event handling for user interactions
 * - Token state management
 */

import { TokenPreview } from "./TokenPreview";
import { updateTokenValue, updateValueDisplay } from "./utils";
import { getDisplayValue } from "./controls/controlUtils";
import {
  ColorControl,
  TypographyControl,
  SpacingControl,
  RadiusControl,
  ShadowControl,
  BorderControl,
} from "./controls";

export class DesignTokensPanel extends HTMLElement {
  private isOpen = false;
  private tokens: any = null;
  private resolvedTokens: any = null;
  private preview: TokenPreview;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.preview = new TokenPreview(this.shadowRoot);
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  disconnectedCallback() {
    this.preview.destroy();
  }

  setTokens(tokens: any, resolved: any) {
    this.tokens = tokens || {};
    this.resolvedTokens = resolved || {};
    this.render();
    if (this.isOpen) {
      this.preview.init();
      this.preview.update(this.tokens);
    }
  }

  openPanel() {
    this.isOpen = true;
    this.render();
    setTimeout(() => {
      this.preview.init();
      this.preview.update(this.tokens);
    }, 100);
  }

  closePanel() {
    this.isOpen = false;
    this.render();
  }

  private setupEventListeners() {
    // Click event delegation
    this.shadowRoot?.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      e.stopPropagation();

      if (target.closest(".close-btn")) {
        e.preventDefault();
        this.closePanel();
        return;
      }

      if (target.closest(".overlay-backdrop")) {
        e.preventDefault();
        this.closePanel();
        return;
      }

      if (target.closest(".save-btn")) {
        e.preventDefault();
        this.handleSave();
        return;
      }

      if (target.closest(".reset-btn")) {
        e.preventDefault();
        this.handleReset();
        return;
      }

      // Preset buttons
      if (target.closest(".preset-btn")) {
        const btn = target.closest(".preset-btn") as HTMLButtonElement;
        this.handlePresetClick(btn);
        return;
      }

      // Weight buttons
      if (target.closest(".weight-btn")) {
        const btn = target.closest(".weight-btn") as HTMLButtonElement;
        this.handlePresetClick(btn);
        return;
      }
    });

    // Input event delegation
    this.shadowRoot?.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      e.stopPropagation();

      const tokenPath = target.dataset.token;
      const field = target.dataset.field;
      const unit = target.dataset.unit;

      if (!tokenPath) return;

      this.handleInput(target, tokenPath, field, unit);
    });
  }

  private handlePresetClick(btn: HTMLButtonElement) {
    const tokenPath = btn.dataset.token;
    const value = btn.dataset.presetValue;
    const field = btn.dataset.field;

    if (!tokenPath || value === undefined) return;

    // Update token value
    if (updateTokenValue(this.tokens, tokenPath, value, field)) {
      // Update UI inputs
      const inputs = this.shadowRoot?.querySelectorAll(
        `input[data-token="${tokenPath}"]${field ? `[data-field="${field}"]` : ""}`
      );
      
      inputs?.forEach((input) => {
        if (input instanceof HTMLInputElement) {
           if (input.type === "range") {
             // For sliders, we need to handle the value conversion if it's rem
             const isRem = input.dataset.isRem === "true";
             if (isRem && value.endsWith("rem")) {
               const num = parseFloat(value);
               input.value = (num * 16).toString();
             } else {
               // Try to parse number from string (e.g. "12px" -> 12)
               const num = parseFloat(value);
               input.value = isNaN(num) ? value : num.toString();
             }
           } else {
             input.value = value;
           }
        }
      });

      // Update active state of buttons
      const container = btn.parentElement;
      container?.querySelectorAll(".preset-btn, .weight-btn").forEach(b => b.classList.remove("preset-btn-active", "weight-btn-active"));
      btn.classList.add(btn.classList.contains("weight-btn") ? "weight-btn-active" : "preset-btn-active");

      this.preview.debouncedUpdate(this.tokens);
    }
  }

  private handleInput(
    target: HTMLInputElement,
    tokenPath: string,
    field?: string,
    unit?: string
  ) {
    let value: string;

    if (target.type === "range") {
      const isRem = target.dataset.isRem === "true";
      let numValue = parseFloat(target.value);
      
      if (isRem) {
        // Slider is in px (0-64), convert to rem
        numValue = numValue / 16;
        // Round to meaningful precision
        numValue = Math.round(numValue * 10000) / 10000;
      }

      value = unit ? `${numValue}${unit}` : target.value;

      // Sync with text input
      const textInput = this.shadowRoot?.querySelector(
        `input[type="text"][data-token="${tokenPath}"]${field ? `[data-field="${field}"]` : ""}`
      ) as HTMLInputElement;
      if (textInput) {
        textInput.value = value;
      }
    } else {
      value = target.value;
      
      // Sync with slider if exists
      const slider = this.shadowRoot?.querySelector(
        `input[type="range"][data-token="${tokenPath}"]${field ? `[data-field="${field}"]` : ""}`
      ) as HTMLInputElement;
      
      if (slider) {
        const isRem = slider.dataset.isRem === "true";
        const num = parseFloat(value);
        if (!isNaN(num)) {
          if (isRem && value.endsWith("rem")) {
             slider.value = (num * 16).toString();
          } else {
             slider.value = num.toString();
          }
        }
      }
    }

    // Update token value
    if (updateTokenValue(this.tokens, tokenPath, value, field)) {
      // Update display value (e.g. "1rem = 16px")
      const container = target.closest(".slider-block");
      if (container) {
        const displayEl = container.querySelector(".token-value");
        if (displayEl) {
          displayEl.textContent = getDisplayValue(value);
        }
      } else {
        // Fallback for non-slider controls
        // This logic was previously inside the `if (updateTokenValue)` block.
        // Now it's moved outside to be handled consistently.
        // The `updateValueDisplay` utility is no longer needed as we directly update the display element.
        const displayEl = target.parentElement?.querySelector(".token-value");
        if (displayEl) {
          displayEl.textContent = getDisplayValue(value);
        }
      }
      
      this.preview.debouncedUpdate(this.tokens);
    }
  }

  private handleSave() {
    document.dispatchEvent(
      new CustomEvent("brakit:save-tokens", {
        detail: { tokens: this.tokens },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleReset() {
    document.dispatchEvent(
      new CustomEvent("brakit:reset-tokens", {
        bubbles: true,
        composed: true,
      })
    );
  }

  private render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getStyles()}
      </style>
      ${this.renderHTML()}
    `;
  }

  private getStyles(): string {
    return `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      /* Apple-inspired design system */
      :host {
        --bg-primary: #fafbfc;
        --bg-secondary: #ffffff;
        --border-subtle: #e5e7eb;
        --text-primary: #111827;
        --text-secondary: #6b7280;
        --accent: #2563eb;
        --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
        --shadow-md: 0 2px 8px rgba(0,0,0,0.12);
        --shadow-lg: 0 25px 50px rgba(0,0,0,0.15);
        --radius: 12px;
        --transition: cubic-bezier(0.4, 0, 0.2, 1);
      }

      .overlay-backdrop {
        display: ${this.isOpen ? "block" : "none"};
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 999999;
        backdrop-filter: blur(8px);
      }

      .panel-container {
        display: ${this.isOpen ? "flex" : "none"};
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 1800px;
        max-width: 95vw;
        height: 900px;
        max-height: 92vh;
        background: var(--bg-primary);
        z-index: 1000000;
        box-shadow: var(--shadow-lg);
        border-radius: var(--radius);
        overflow: hidden;
        flex-direction: column;
      }

      /* Header */
      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        background: var(--bg-secondary);
        border-bottom: 1px solid var(--border-subtle);
      }

      .panel-title {
        font-size: 17px;
        font-weight: 600;
        color: var(--text-primary);
        letter-spacing: -0.01em;
      }

      .header-actions {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .btn {
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s var(--transition);
        border: none;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
      }

      .btn-secondary {
        background: var(--bg-primary);
        color: var(--text-secondary);
        border: 1px solid var(--border-subtle);
      }

      .btn-secondary:hover {
        background: #f3f4f6;
        border-color: #d1d5db;
      }

      .btn-primary {
        background: var(--accent);
        color: white;
      }

      .btn-primary:hover {
        background: #1d4ed8;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 20px;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 6px;
        transition: all 0.2s var(--transition);
        line-height: 1;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .close-btn:hover {
        background: var(--bg-primary);
        color: var(--text-primary);
      }

      /* Main content - split view */
      .panel-body {
        flex: 1;
        display: flex;
        overflow: hidden;
      }

      /* Editor panel (left) */
      .editor-panel {
        width: 50%;
        overflow-y: auto;
        padding: 24px;
        background: var(--bg-secondary);
        border-right: 1px solid var(--border-subtle);
      }

      .editor-panel::-webkit-scrollbar {
        width: 8px;
      }

      .editor-panel::-webkit-scrollbar-track {
        background: transparent;
      }

      .editor-panel::-webkit-scrollbar-thumb {
        background: var(--border-subtle);
        border-radius: 4px;
      }

      .editor-panel::-webkit-scrollbar-thumb:hover {
        background: #d1d5db;
      }

      /* Preview panel (right) */
      .preview-panel {
        width: 50%;
        background: #f9fafb;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .preview-header {
        padding: 16px 20px;
        background: var(--bg-secondary);
        border-bottom: 1px solid var(--border-subtle);
        font-size: 13px;
        font-weight: 500;
        color: var(--text-secondary);
      }

      .preview-iframe {
        flex: 1;
        border: none;
        background: white;
      }

      /* Token cards */
      .token-card {
        background: var(--bg-primary);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius);
        padding: 20px;
        margin-bottom: 20px;
      }

      .token-card-header {
        margin-bottom: 16px;
      }

      .token-card-title {
        font-size: 15px;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 4px;
      }

      .token-card-description {
        font-size: 13px;
        color: var(--text-secondary);
      }

      .token-grid {
        display: grid;
        gap: 16px;
      }

      /* Token input groups */
      .token-input-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .token-label {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-primary);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .token-value {
        font-size: 12px;
        color: var(--text-secondary);
        font-family: "SF Mono", Monaco, monospace;
      }

      .token-input {
        padding: 8px 12px;
        border: 1px solid var(--border-subtle);
        border-radius: 6px;
        font-size: 13px;
        font-family: inherit;
        transition: all 0.2s var(--transition);
        background: var(--bg-secondary);
      }

      .token-input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }

      .token-input[type="color"] {
        height: 40px;
        padding: 4px;
        cursor: pointer;
      }

      .slider-block {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .slider-input {
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: var(--border-subtle);
        outline: none;
        -webkit-appearance: none;
      }

      .slider-input::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--accent);
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }

      .slider-input::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--accent);
        cursor: pointer;
        border: none;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }

      /* Typography controls */
      .typography-row {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      /* Shadow controls */
      .shadow-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      /* Presets */
      .preset-btn {
        padding: 4px 10px;
        border: 1px solid var(--border-subtle);
        background: var(--bg-secondary);
        border-radius: 6px;
        font-size: 11px;
        cursor: pointer;
        color: var(--text-secondary);
        transition: all 0.2s;
      }
      
      .preset-btn:hover {
        border-color: var(--accent);
        color: var(--accent);
      }
      
      .preset-btn-active {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
      }

      /* Weight buttons */
      .weight-btn {
        width: 36px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--border-subtle);
        background: var(--bg-secondary);
        border-radius: 6px;
        font-size: 11px;
        cursor: pointer;
        color: var(--text-secondary);
        transition: all 0.2s;
      }

      .weight-btn:hover {
        border-color: var(--accent);
        color: var(--accent);
      }

      .weight-btn-active {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
      }
    `;
  }

  private renderHTML(): string {
    return `
      <div class="overlay-backdrop"></div>
      <div class="panel-container">
        <div class="panel-header">
          <div class="panel-title">Design Tokens</div>
          <div class="header-actions">
            <button class="btn btn-secondary reset-btn">Reset</button>
            <button class="btn btn-primary save-btn">Save</button>
            <button class="close-btn">×</button>
          </div>
        </div>
        <div class="panel-body">
          <div class="editor-panel">
            ${this.renderTokenControls()}
          </div>
          <div class="preview-panel">
            <div class="preview-header">Live Preview</div>
            <iframe class="preview-iframe"></iframe>
          </div>
        </div>
      </div>
    `;
  }

  private renderTokenControls(): string {
    if (!this.tokens) return "<p>No tokens loaded</p>";

    const colorControl = new ColorControl({
      tokens: this.tokens.color || {},
      category: "color",
    });

    const typographyControl = new TypographyControl({
      tokens: this.tokens.typography || {},
      category: "typography",
    });

    const spacingControl = new SpacingControl({
      tokens: this.tokens.spacing || {},
      category: "spacing",
    });

    const radiusControl = new RadiusControl({
      tokens: this.tokens.radius || {},
      category: "radius",
    });

    const borderControl = new BorderControl({
      tokens: this.tokens.border || {},
      category: "border",
    });

    const shadowControl = new ShadowControl({
      tokens: this.tokens.shadow || {},
      category: "shadow",
    });

    return `
      ${colorControl.render()}
      ${typographyControl.render()}
      ${spacingControl.render()}
      ${radiusControl.render()}
      ${borderControl.render()}
      ${shadowControl.render()}
    `;
  }
}

customElements.define("brakit-design-tokens", DesignTokensPanel);
