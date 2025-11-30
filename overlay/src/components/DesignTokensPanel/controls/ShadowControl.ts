/**
 * ShadowControl - Enhanced shadow token controls
 * Features: Smart sliders for X/Y/Blur/Spread, color picker, visual preview
 */

import { BaseControl, TokenControlProps } from "./BaseControl";

export class ShadowControl extends BaseControl {
  constructor(props: TokenControlProps) {
    super(props);
  }

  render(): string {
    const content = Object.entries(this.tokens)
      .filter(([key]) => key !== "none")
      .map(([key, token]: [string, any]) => this.renderShadowToken(key, token))
      .join("");

    return this.renderCard(
      "Shadows",
      "Box shadows and elevation",
      content
    );
  }

  private renderShadowToken(key: string, token: any): string {
    const value = token.$value;
    const offsetX = value.offsetX || "0";
    const offsetY = value.offsetY || "0";
    const blur = value.blur || "0";
    const spread = value.spread || "0";
    const color = value.color || "#000000";

    const shadowString = `${offsetX} ${offsetY} ${blur} ${spread} ${color}`;

    return `
      <div class="token-input-group" style="padding: 16px 0; border-bottom: 1px solid var(--border-subtle);">
        <div class="token-label" style="margin-bottom: 16px;">
          <span style="font-size: 15px; font-weight: 600;">${key}</span>
        </div>

        <!-- Controls Grid -->
        <div style="display: grid; gap: 16px;">
          <!-- X Offset -->
          <div>
            <label class="token-label" style="font-size: 12px; margin-bottom: 8px; display: block;">
              <span>X Offset</span>
            </label>
            ${this.renderSliderControl(
              key,
              offsetX,
              {
                min: -50,
                max: 50,
                step: 1,
                unit: "px",
              },
              "offsetX"
            )}
          </div>

          <!-- Y Offset -->
          <div>
            <label class="token-label" style="font-size: 12px; margin-bottom: 8px; display: block;">
              <span>Y Offset</span>
            </label>
            ${this.renderSliderControl(
              key,
              offsetY,
              {
                min: -50,
                max: 50,
                step: 1,
                unit: "px",
              },
              "offsetY"
            )}
          </div>

          <!-- Blur -->
          <div>
            <label class="token-label" style="font-size: 12px; margin-bottom: 8px; display: block;">
              <span>Blur Radius</span>
            </label>
            ${this.renderSliderControl(
              key,
              blur,
              {
                min: 0,
                max: 100,
                step: 1,
                unit: "px",
              },
              "blur"
            )}
          </div>

          <!-- Spread -->
          <div>
            <label class="token-label" style="font-size: 12px; margin-bottom: 8px; display: block;">
              <span>Spread</span>
            </label>
            ${this.renderSliderControl(
              key,
              spread,
              {
                min: -50,
                max: 50,
                step: 1,
                unit: "px",
              },
              "spread"
            )}
          </div>

          <!-- Color -->
          <div>
            <label class="token-label" style="font-size: 12px; margin-bottom: 8px; display: block;">
              <span>Shadow Color</span>
            </label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input
                type="color"
                class="token-input"
                value="${color}"
                data-token="${this.category}.${key}"
                data-field="color"
                style="width: 60px; height: 40px; padding: 4px; cursor: pointer;"
              />
              <input
                type="text"
                class="token-input"
                value="${color}"
                data-token="${this.category}.${key}"
                data-field="color"
                placeholder="#000000"
                style="flex: 1; font-family: 'SF Mono', Monaco, monospace; font-size: 13px;"
              />
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
