/**
 * RadiusControl - Enhanced border radius controls
 * Features: Smart sliders, visual preview, presets
 */

import { BaseControl, TokenControlProps, PresetOption } from "./BaseControl";

export class RadiusControl extends BaseControl {
  constructor(props: TokenControlProps) {
    super(props);
  }

  render(): string {
    const content = Object.entries(this.tokens)
      .filter(([key]) => key !== "pill")
      .map(([key, token]: [string, any]) => this.renderRadiusToken(key, token))
      .join("");

    return this.renderCard(
      "Border Radius",
      "Corner rounding for elements",
      content
    );
  }

  private renderRadiusToken(key: string, token: any): string {
    const value = token.$value;

    const presets: PresetOption[] = [
      { label: "Sharp", value: "0" },
      { label: "Subtle", value: "0.25rem" },
      { label: "Default", value: "0.75rem" },
      { label: "Round", value: "1.5rem" },
    ];

    return `
      <div class="token-input-group">
        <label class="token-label">
          <span>${key}</span>
        </label>
        ${this.renderSliderControl(
          key,
          value,
          {
            min: 0,
            max: 32,
            step: 1,
            unit: "rem",
            showPxConversion: true,
          },
          undefined,
          presets
        )}
      </div>
    `;
  }
}
