/**
 * TypographyControl - Enhanced typography token controls
 * Features: Smart sliders, weight selector, live preview
 */

import { BaseControl, TokenControlProps, PresetOption } from "./BaseControl";
import { parseValue } from "./controlUtils";

export class TypographyControl extends BaseControl {
  constructor(props: TokenControlProps) {
    super(props);
  }

  render(): string {
    const content = Object.entries(this.tokens)
      .map(([key, token]: [string, any]) => this.renderTypographyToken(key, token))
      .join("");

    return this.renderCard(
      "Typography",
      "Font sizes, weights, and line heights",
      content
    );
  }

  private renderTypographyToken(key: string, token: any): string {
    const value = token.$value;
    const fontSize = value.fontSize || "1rem";
    const fontWeight = value.fontWeight || "400";
    const lineHeight = value.lineHeight || "1.5";
    const letterSpacing = value.letterSpacing || "0";

    const { num: sizeNum, unit: sizeUnit } = parseValue(fontSize);
    const sizeInPx = sizeUnit === "rem" ? sizeNum * 16 : sizeNum;

    const sizePresets: PresetOption[] = [
      { label: "Small", value: "0.875rem" },
      { label: "Base", value: "1rem" },
      { label: "Large", value: "1.5rem" },
      { label: "XL", value: "2rem" },
    ];

    return `
      <div class="token-input-group" style="padding: 16px 0; border-bottom: 1px solid var(--border-subtle);">
        <div class="token-label" style="margin-bottom: 16px;">
          <span style="font-size: 15px; font-weight: 600;">${key}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <!-- Font Size -->
          <div>
            <label class="token-label" style="font-size: 12px; margin-bottom: 8px; display: block;">
              <span>Size</span>
            </label>
            ${this.renderSliderControl(
              key,
              fontSize,
              {
                min: 12,
                max: 64,
                step: 1,
                unit: "rem",
                showPxConversion: true,
              },
              "fontSize",
              sizePresets
            )}
          </div>

          <!-- Font Weight -->
          <div>
            <label class="token-label" style="font-size: 12px; margin-bottom: 8px; display: block;">
              <span>Weight</span>
            </label>
            ${this.renderWeightSelector(key, fontWeight, "fontWeight")}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <!-- Line Height -->
          <div>
            <label class="token-label" style="font-size: 12px; margin-bottom: 8px; display: block;">
              <span>Line Height</span>
            </label>
            ${this.renderSliderControl(
              key,
              lineHeight,
              {
                min: 1.0,
                max: 2.0,
                step: 0.05,
              },
              "lineHeight"
            )}
          </div>

          <!-- Letter Spacing -->
          <div>
            <label class="token-label" style="font-size: 12px; margin-bottom: 8px; display: block;">
              <span>Spacing</span>
            </label>
            ${this.renderSliderControl(
              key,
              letterSpacing,
              {
                min: -0.1,
                max: 0.5,
                step: 0.01,
                unit: "em",
              },
              "letterSpacing"
            )}
          </div>
        </div>
      </div>
    `;
  }
}
