/**
 * ColorControl - Renders color token controls
 */

import { BaseControl, TokenControlProps } from "./BaseControl";

export class ColorControl extends BaseControl {
  constructor(props: TokenControlProps) {
    super(props);
  }

  render(): string {
    const content = Object.entries(this.tokens)
      .map(([key, token]: [string, any]) => this.renderColorInput(key, token))
      .join("");

    return this.renderCard(
      "Colors",
      "Brand and semantic colors",
      `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
        ${content}
      </div>`
    );
  }
}
