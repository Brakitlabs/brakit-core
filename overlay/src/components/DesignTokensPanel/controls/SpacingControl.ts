/**
 * SpacingControl - Enhanced spacing token controls
 * Features: Smart sliders with rem/px conversion, presets, visual preview
 */

import { BaseControl, TokenControlProps, PresetOption } from "./BaseControl";

export class SpacingControl extends BaseControl {
  constructor(props: TokenControlProps) {
    super(props);
  }

  render(): string {
    const content = Object.entries(this.tokens)
      .map(([key, token]: [string, any]) => this.renderSpacingToken(key, token))
      .join("");

    return this.renderCard(
      "Spacing",
      "Padding, margins, and gaps",
      content
    );
  }

  private renderSpacingToken(key: string, token: any): string {
    const value = token.$value;

    const presets: PresetOption[] = [
      { label: "Compact", value: "0.5rem" },
      { label: "Default", value: "0.75rem" },
      { label: "Comfortable", value: "1rem" },
      { label: "Spacious", value: "1.5rem" },
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
            max: 64,
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
