import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("brakit-loading-overlay")
export class BrakitLoadingOverlay extends LitElement {
  @property({ type: Boolean })
  accessor visible = false;

  @property({ type: String })
  accessor message = "Generating Code";

  @property({ type: String })
  accessor submessage = "This may take a few moments...";

  @property({ type: Array })
  accessor progressSteps: string[] = [];

  @property({ type: Boolean })
  accessor showDoneButton = false;

  static styles = css`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483648;
      font-family:
        -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto,
        sans-serif;
    }

    :host([hidden]) {
      display: none;
    }

    .loading-content {
      background: white;
      border-radius: 16px;
      padding: 40px 48px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      min-width: 320px;
      max-width: 480px;
    }

    .loading-spinner {
      width: 56px;
      height: 56px;
      border: 4px solid rgba(0, 122, 255, 0.2);
      border-top-color: #007aff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .loading-text {
      font-size: 18px;
      font-weight: 600;
      color: #1d1d1f;
      margin-bottom: 6px;
      letter-spacing: -0.02em;
    }

    .loading-subtext {
      font-size: 14px;
      color: #86868b;
      margin-bottom: 16px;
    }

    .progress-steps {
      text-align: left;
      background: #f5f5f7;
      border-radius: 8px;
      padding: 12px 16px;
      margin-top: 16px;
      max-height: 200px;
      overflow-y: auto;
    }

    .progress-step {
      font-size: 13px;
      color: #1d1d1f;
      padding: 4px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .progress-step:not(:last-child) {
      border-bottom: 1px solid #e5e5e7;
    }

    .step-icon {
      flex-shrink: 0;
      font-size: 14px;
    }

    .step-text {
      flex: 1;
      line-height: 1.4;
    }

    .done-button {
      margin-top: 20px;
      padding: 12px 32px;
      background: #007aff;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      width: 100%;
    }

    .done-button:hover {
      background: #0056b3;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
    }

    .done-button:active {
      transform: translateY(0);
    }
  `;

  render() {
    return html`
      <div class="loading-content">
        ${!this.showDoneButton ? html`<div class="loading-spinner"></div>` : ""}
        <div class="loading-text">${this.message}</div>
        <div class="loading-subtext">${this.submessage}</div>
        ${this.progressSteps.length > 0
          ? html`
              <div class="progress-steps">
                ${this.progressSteps.map(
                  (step) => html`
                    <div class="progress-step">
                      <span class="step-icon">✓</span>
                      <span class="step-text">${step}</span>
                    </div>
                  `
                )}
              </div>
            `
          : ""}
        ${this.showDoneButton
          ? html`
              <button class="done-button" @click=${this.handleDoneClick}>
                Done
              </button>
            `
          : ""}
      </div>
    `;
  }

  show() {
    this.visible = true;
    this.message = "Generating Code";
    this.submessage = "This may take a few moments...";
    this.progressSteps = [];
    this.showDoneButton = false;
    this.removeAttribute("hidden");
  }

  hide() {
    this.visible = false;
    this.showDoneButton = false;
    this.setAttribute("hidden", "");
  }

  updateProgress(message: string, submessage?: string) {
    this.message = message;
    if (submessage) {
      this.submessage = submessage;
    }
  }

  addProgressStep(step: string) {
    this.progressSteps = [...this.progressSteps, step];
  }

  clearProgress() {
    this.progressSteps = [];
  }

  showCompletion() {
    this.showDoneButton = true;
  }

  private handleDoneClick() {
    this.dispatchEvent(
      new CustomEvent("done-clicked", { bubbles: true, composed: true })
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "brakit-loading-overlay": BrakitLoadingOverlay;
  }
}
