import { LitElement, html, css, PropertyValues } from "lit";
import { OverlayEvents } from "../core/events";

export interface DeleteConfirmationOptions {
  componentName: string;
  elementText?: string;
  filePath?: string;
  elementPreview?: string;
}

export class DeleteConfirmationDialog extends LitElement {
  static properties = {
    open: { type: Boolean, reflect: true },
    componentName: { type: String },
    elementText: { type: String },
    filePath: { type: String },
    elementPreview: { type: String },
  };

  open = false;
  componentName = "";
  elementText = "";
  filePath = "";
  elementPreview = "";

  private syncVisibility() {
    if (this.open) {
      this.style.display = "block";
      this.style.pointerEvents = "auto";
      this.removeAttribute("aria-hidden");
    } else {
      this.style.display = "none";
      this.style.pointerEvents = "none";
      this.setAttribute("aria-hidden", "true");
    }
  }

  private keydownHandler = (event: KeyboardEvent) => {
    if (!this.open) return;
    if (event.key === "Escape") {
      event.stopPropagation();
      this.handleCancel();
    }
  };

  static styles = css`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      display: block;
      z-index: 2147483647;
      font-family:
        -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
        Arial, sans-serif;
    }

    :host([open]) {
      pointer-events: auto;
    }

    .backdrop {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.35);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }

    .backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }

    .dialog {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.96);
      width: min(420px, calc(100vw - 32px));
      background: rgba(255, 255, 255, 0.98);
      border-radius: 18px;
      box-shadow:
        0 24px 60px rgba(15, 23, 42, 0.18),
        0 8px 20px rgba(15, 23, 42, 0.12),
        inset 0 0 0 0.6px rgba(255, 255, 255, 0.4);
      overflow: hidden;
      color: #0f172a;
      pointer-events: none;
      opacity: 0;
      transition:
        opacity 0.2s ease,
        transform 0.2s ease;
    }

    .dialog.open {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
      pointer-events: auto;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 22px 12px;
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
    }

    .alert-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(
        135deg,
        rgba(239, 68, 68, 0.28),
        rgba(220, 38, 38, 0.32)
      );
      display: flex;
      align-items: center;
      justify-content: center;
      color: #dc2626;
      font-size: 22px;
    }

    .title {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .title h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    .title span {
      font-size: 13px;
      color: rgba(15, 23, 42, 0.6);
    }

    .body {
      padding: 18px 22px 12px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .warning {
      font-size: 14px;
      line-height: 1.6;
      color: rgba(220, 38, 38, 0.9);
      background: rgba(254, 242, 242, 0.8);
      border-radius: 10px;
      padding: 12px 14px;
      border: 1px solid rgba(252, 165, 165, 0.3);
    }

    .element-info {
      font-size: 14px;
      line-height: 1.6;
      color: rgba(15, 23, 42, 0.88);
    }

    .component-name {
      font-weight: 600;
      color: #1e40af;
    }

    .element-preview {
      font-size: 12px;
      color: rgba(15, 23, 42, 0.65);
      background: rgba(248, 250, 252, 0.8);
      border-radius: 8px;
      padding: 10px 12px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      font-family: "SF Mono", "Menlo", monospace;
      max-height: 80px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .file {
      font-size: 12px;
      color: rgba(15, 23, 42, 0.55);
      background: rgba(15, 23, 42, 0.04);
      padding: 8px 10px;
      border-radius: 8px;
      font-family: "SF Mono", "Menlo", monospace;
      word-break: break-all;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 16px 22px 20px;
      background: rgba(248, 250, 252, 0.85);
      border-top: 1px solid rgba(15, 23, 42, 0.06);
    }

    button {
      border: none;
      border-radius: 10px;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition:
        transform 0.15s ease,
        box-shadow 0.15s ease;
    }

    .cancel {
      background: rgba(15, 23, 42, 0.05);
      color: rgba(15, 23, 42, 0.8);
    }

    .confirm {
      background: #dc2626;
      color: white;
      box-shadow: 0 10px 20px rgba(220, 38, 38, 0.2);
    }

    button:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 16px rgba(15, 23, 42, 0.14);
    }

    button:active {
      transform: translateY(0);
    }

    .confirm:hover {
      box-shadow: 0 10px 20px rgba(220, 38, 38, 0.3);
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("keydown", this.keydownHandler, true);
    this.syncVisibility();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.keydownHandler, true);
  }

  openDialog(options: DeleteConfirmationOptions) {
    this.componentName = options.componentName;
    this.elementText = options.elementText || "";
    this.filePath = options.filePath || "";
    this.elementPreview = options.elementPreview || "";
    this.open = true;
    this.syncVisibility();
  }

  closeDialog() {
    this.open = false;
    this.syncVisibility();
  }

  protected updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("open")) {
      this.syncVisibility();
    }
    super.updated(changedProperties);
  }

  private handleCancel = () => {
    this.closeDialog();
    this.dispatchEvent(
      new CustomEvent("brakit-delete-cancel", {
        bubbles: true,
        composed: true,
      })
    );
  };

  private handleConfirm = () => {
    this.closeDialog();
    this.dispatchEvent(
      new CustomEvent("brakit-delete-confirm", {
        bubbles: true,
        composed: true,
      })
    );
  };

  render() {
    const fileName = this.filePath
      ? this.filePath.split(/[\\/]/).pop()
      : undefined;

    const truncatedText =
      this.elementText.length > 100
        ? `${this.elementText.substring(0, 100)}...`
        : this.elementText;

    return html`
      <div class="backdrop ${this.open ? "open" : ""}">
        <div class="dialog ${this.open ? "open" : ""}">
          <div class="header">
            <div class="alert-icon">🗑️</div>
            <div class="title">
              <h2>Delete Element</h2>
              <span>This action cannot be undone</span>
            </div>
          </div>
          <div class="body">
            <div class="warning">
              ⚠️ You are about to permanently delete this element from your
              code.
            </div>
            <div class="element-info">
              Are you sure you want to delete the
              <span class="component-name">${this.componentName}</span> element?
            </div>
            ${this.elementText
              ? html`<div class="element-preview">${truncatedText}</div>`
              : null}
            ${this.filePath
              ? html`<div class="file">
                  ${fileName ? html`<strong>${fileName}</strong><br />` : null}
                  ${this.filePath}
                </div>`
              : null}
          </div>
          <div class="actions">
            <button class="cancel" @click=${this.handleCancel}>Cancel</button>
            <button class="confirm" @click=${this.handleConfirm}>
              Delete Element
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("brakit-delete-confirmation", DeleteConfirmationDialog);
