/**
 * BorderControl - Enhanced border width controls
 * Features: Smart sliders with visual preview
 */

import { BaseControl, TokenControlProps } from "./BaseControl";

export class BorderControl extends BaseControl {
  constructor(props: TokenControlProps) {
    super(props);
  }

  render(): string {
    const content = Object.entries(this.tokens)
      .filter(([key]) => key !== "none")
      .map(([key, token]: [string, any]) => this.renderBorderToken(key, token))
      .join("");

    return this.renderCard(
      "Border Width",
      "Border thickness for elements",
      content
    );
  }

  private renderBorderToken(key: string, token: any): string {
    const value = token.$value;

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
            max: 8,
            step: 1,
            unit: "px",
          }
        )}
      </div>
    `;
  }
}
