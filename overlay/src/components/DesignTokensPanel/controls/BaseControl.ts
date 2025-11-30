/**
 * BaseControl - Base class for all token control components
 * Provides common functionality for rendering token controls
 */

import { parseValue, formatValue, getDisplayValue, escapeQuotes as escapeQuotesUtil } from "./controlUtils";

export interface TokenControlProps {
  tokens: Record<string, any>;
  category: string;
}

export interface SliderConfig {
  min: number;
  max: number;
  step: number;
  unit?: string;
  showPxConversion?: boolean;
}

export interface PresetOption {
  label: string;
  value: string | number;
}

export abstract class BaseControl {
  protected tokens: Record<string, any>;
  protected category: string;

  constructor(props: TokenControlProps) {
    this.tokens = props.tokens;
    this.category = props.category;
  }

  /**
   * Render the control HTML
   */
  abstract render(): string;

  /**
   * Get the card wrapper HTML
   */
  protected renderCard(title: string, description: string, content: string): string {
    return `
      <div class="token-card">
        <div class="token-card-header">
          <div class="token-card-title">${title}</div>
          <div class="token-card-description">${description}</div>
        </div>
        <div class="token-grid">
          ${content}
        </div>
      </div>
    `;
  }

  /**
   * Escape quotes in values for HTML attributes
   */
  protected escapeQuotes(value: string): string {
    return escapeQuotesUtil(value);
  }

  /**
   * Render a smart slider with text input (dual-mode control)
   */
  protected renderSliderControl(
    key: string,
    value: string,
    config: SliderConfig,
    field?: string,
    presets?: PresetOption[]
  ): string {
    const { num, unit } = parseValue(value);
    const sliderValue = unit === "rem" && config.unit === "rem" ? num * 16 : num;
    const dataField = field ? `data-field="${field}"` : "";
    const tokenPath = field ? `${this.category}.${key}` : `${this.category}.${key}`;
    
    const displayValue = config.showPxConversion ? getDisplayValue(value) : value;

    return `
      <div class="slider-block">
        <input
          type="range"
          class="slider-input"
          min="${config.min}"
          max="${config.max}"
          step="${config.step}"
          value="${sliderValue}"
          data-token="${tokenPath}"
          ${dataField}
          ${config.unit ? `data-unit="${config.unit}"` : ""}
          ${unit === "rem" ? 'data-is-rem="true"' : ""}
        />
        <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
          <input
            type="text"
            class="token-input"
            value="${this.escapeQuotes(value)}"
            data-token="${tokenPath}"
            ${dataField}
            style="flex: 1;"
          />
          ${config.showPxConversion ? `<span class="token-value" style="font-size: 11px; white-space: nowrap;">${displayValue}</span>` : ""}
        </div>
        ${presets ? this.renderPresets(tokenPath, presets, value, field) : ""}
      </div>
    `;
  }

  /**
   * Render preset buttons
   */
  protected renderPresets(
    tokenPath: string,
    presets: PresetOption[],
    currentValue: string,
    field?: string
  ): string {
    const dataField = field ? `data-field="${field}"` : "";
    
    return `
      <div style="display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap;">
        ${presets
          .map((preset) => {
            const isActive = preset.value.toString() === currentValue;
            return `
              <button
                class="preset-btn ${isActive ? "preset-btn-active" : ""}"
                data-token="${tokenPath}"
                data-preset-value="${this.escapeQuotes(preset.value.toString())}"
                ${dataField}
                type="button"
              >
                ${preset.label}
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  /**
   * Render a simple text input
   */
  protected renderTextInput(
    key: string,
    token: any,
    placeholder: string = ""
  ): string {
    return `
      <div class="token-input-group">
        <label class="token-label">
          <span>${key}</span>
          <span class="token-value">${token.$value}</span>
        </label>
        <input
          type="text"
          class="token-input"
          value="${this.escapeQuotes(token.$value)}"
          data-token="${this.category}.${key}"
          placeholder="${placeholder}"
        />
      </div>
    `;
  }

  /**
   * Render an enhanced color input with hex text input
   */
  protected renderColorInput(key: string, token: any): string {
    return `
      <div class="token-input-group">
        <label class="token-label">
          <span>${key}</span>
          <span class="token-value">${token.$value}</span>
        </label>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input
            type="color"
            class="token-input"
            value="${token.$value}"
            data-token="${this.category}.${key}"
            style="width: 60px; height: 40px; padding: 4px; cursor: pointer;"
          />
          <input
            type="text"
            class="token-input"
            value="${this.escapeQuotes(token.$value)}"
            data-token="${this.category}.${key}"
            placeholder="#000000"
            style="flex: 1; font-family: 'SF Mono', Monaco, monospace; font-size: 13px;"
          />
        </div>
      </div>
    `;
  }

  /**
   * Render a number input
   */
  protected renderNumberInput(
    key: string,
    token: any,
    min?: string,
    max?: string,
    step?: string,
    placeholder: string = ""
  ): string {
    return `
      <div class="token-input-group">
        <label class="token-label">
          <span>${key}</span>
          <span class="token-value">${token.$value}</span>
        </label>
        <input
          type="number"
          class="token-input"
          value="${token.$value}"
          data-token="${this.category}.${key}"
          ${min ? `min="${min}"` : ""}
          ${max ? `max="${max}"` : ""}
          ${step ? `step="${step}"` : ""}
          placeholder="${placeholder}"
        />
      </div>
    `;
  }

  /**
   * Render weight selector buttons
   */
  protected renderWeightSelector(
    key: string,
    currentWeight: string,
    field: string = "fontWeight"
  ): string {
    const weights = ["300", "400", "500", "600", "700", "800"];
    const tokenPath = `${this.category}.${key}`;

    return `
      <div style="display: flex; gap: 4px; flex-wrap: wrap;">
        ${weights
          .map((weight) => {
            const isActive = weight === currentWeight;
            return `
              <button
                class="weight-btn ${isActive ? "weight-btn-active" : ""}"
                data-token="${tokenPath}"
                data-field="${field}"
                data-preset-value="${weight}"
                type="button"
                style="font-weight: ${weight};"
              >
                ${weight}
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }
}
