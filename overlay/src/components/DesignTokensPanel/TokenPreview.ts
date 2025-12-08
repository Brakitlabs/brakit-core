/**
 * TokenPreview - Manages preview iframe updates
 * Simple: Always shows live preview of current tokens
 */

import { PreviewGenerator } from "./preview/PreviewGenerator";

export class TokenPreview {
  private iframe: HTMLIFrameElement | null = null;
  private updateTimeout: any = null;

  constructor(private container: ShadowRoot | null) {}

  init() {
    if (!this.container) return;
    this.iframe = this.container.querySelector(
      ".preview-iframe"
    ) as HTMLIFrameElement;
  }

  debouncedUpdate(tokens: any) {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    this.updateTimeout = setTimeout(() => {
      this.update(tokens);
    }, 16); // 60fps
  }

  update(tokens: any) {
    if (!this.iframe || !this.iframe.contentDocument) return;

    // Always generate live preview with current tokens
    const html = PreviewGenerator.generate(tokens);

    const doc = this.iframe.contentDocument;
    doc.open();
    doc.write(html);
    doc.close();
  }

  destroy() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
  }
}
