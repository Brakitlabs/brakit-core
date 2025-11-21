import { LitElement, html, css, PropertyValues } from "lit";
import { OverlayEvents } from "../core/events";

export interface SmartEditWarningOptions {
  message: string;
  details?: string;
  detectedProps?: string[];
  filePath?: string;
  componentName?: string;
  signals?: string[];
  rationale?: string;
}

export class SmartEditWarning extends LitElement {
  static properties = {
    open: { type: Boolean, reflect: true },
    message: { type: String },
    rationale: { type: String },
  };

  open = false;
  message = "";
  rationale = "";

  private static readonly SIGNAL_DESCRIPTIONS: Record<string, string> = {
    "variant-prop": "Variant-based styling detected.",
    "dynamic-class": "Dynamic class usage detected.",
  };

  private static describeSignal(signal: string): string {
    const cleaned = signal.trim().toLowerCase();
    if (SmartEditWarning.SIGNAL_DESCRIPTIONS[cleaned]) {
      return SmartEditWarning.SIGNAL_DESCRIPTIONS[cleaned];
    }
    return cleaned.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private static buildRationale(
    options: SmartEditWarningOptions,
    baseMessage: string
  ): string {
    const reasons: string[] = [];

    const addReason = (value?: string) => {
      const trimmed = value?.trim();
      if (trimmed && trimmed.length > 0 && trimmed !== baseMessage) {
        reasons.push(trimmed);
      }
    };

    addReason(options.rationale);
    addReason(options.details);

    if (options.componentName) {
      addReason(`${options.componentName} is shared across the app.`);
    }

    if (Array.isArray(options.detectedProps) && options.detectedProps.length) {
      const uniqueProps = Array.from(
        new Set(
          options.detectedProps
            .map((prop) => prop?.trim())
            .filter((prop): prop is string => Boolean(prop))
        )
      );
      if (uniqueProps.length) {
        addReason(`Variant props detected: ${uniqueProps.join(", ")}.`);
      }
    }

    if (Array.isArray(options.signals) && options.signals.length) {
      const uniqueSignals = Array.from(
        new Set(
          options.signals
            .map((signal) => SmartEditWarning.describeSignal(signal))
            .filter(Boolean)
        )
      );
      if (uniqueSignals.length) {
        addReason(uniqueSignals.join(" "));
      }
    }

    if (!reasons.length) {
      addReason("This component appears in multiple places.");
    }

    return Array.from(new Set(reasons)).join(" ");
  }

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
      inset: 0;
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
      transition: opacity 0.16s ease;
    }

    .backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }

    .panel {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.95);
      width: min(320px, calc(100vw - 32px));
      background: rgba(255, 255, 255, 0.98);
      border-radius: 16px;
      box-shadow:
        0 20px 40px rgba(15, 23, 42, 0.18),
        0 8px 16px rgba(15, 23, 42, 0.12),
        inset 0 0 0 0.5px rgba(255, 255, 255, 0.45);
      color: #0f172a;
      pointer-events: none;
      opacity: 0;
      transition:
        opacity 0.16s ease,
        transform 0.16s ease;
    }

    .panel.open {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
      pointer-events: auto;
    }

    .content {
      padding: 20px 22px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .headline {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(248, 113, 113, 0.16);
      color: #b91c1c;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    .headline h2 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    .message {
      font-size: 14px;
      line-height: 1.6;
      color: rgba(15, 23, 42, 0.9);
      white-space: pre-wrap;
    }

    .rationale {
      font-size: 12.5px;
      color: rgba(15, 23, 42, 0.65);
      line-height: 1.5;
      background: rgba(248, 250, 252, 0.85);
      border-radius: 12px;
      padding: 10px 12px;
      border: 1px solid rgba(148, 163, 184, 0.15);
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 12px 22px 18px;
      border-top: 1px solid rgba(15, 23, 42, 0.08);
      background: rgba(248, 250, 252, 0.9);
    }

    button {
      border: none;
      border-radius: 9px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition:
        transform 0.15s ease,
        box-shadow 0.15s ease;
    }

    .cancel {
      background: rgba(15, 23, 42, 0.05);
      color: rgba(15, 23, 42, 0.75);
    }

    .confirm {
      background: #0ea5e9;
      color: #ffffff;
      box-shadow: 0 10px 18px rgba(14, 165, 233, 0.22);
    }

    button:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 12px rgba(15, 23, 42, 0.12);
    }

    button:active {
      transform: translateY(0);
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

  openWarning(options: SmartEditWarningOptions) {
    const baseMessage =
      options.message?.trim() || "This change may update shared UI.";
    this.message = baseMessage;
    this.rationale = SmartEditWarning.buildRationale(options, baseMessage);
    this.open = true;
    this.syncVisibility();
  }

  closeWarning() {
    this.open = false;
    this.syncVisibility();
  }

  private handleCancel = () => {
    this.closeWarning();
    this.dispatchEvent(
      new CustomEvent(OverlayEvents.SmartEditCancel, {
        bubbles: true,
        composed: true,
      })
    );
  };

  private handleConfirm = () => {
    this.closeWarning();
    this.dispatchEvent(
      new CustomEvent(OverlayEvents.SmartEditConfirm, {
        bubbles: true,
        composed: true,
      })
    );
  };

  protected updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("open")) {
      this.syncVisibility();
    }
    super.updated(changedProperties);
  }

  render() {
    return html`
      <div class="backdrop ${this.open ? "open" : ""}">
        <div class="panel ${this.open ? "open" : ""}">
          <div class="content">
            <div class="headline">
              <div class="icon">⚠️</div>
              <h2>Review potential global impact</h2>
            </div>
            <div class="message">${this.message}</div>
            ${this.rationale
              ? html`<div class="rationale">${this.rationale}</div>`
              : null}
          </div>
          <div class="actions">
            <button class="cancel" @click=${this.handleCancel}>Cancel</button>
            <button class="confirm" @click=${this.handleConfirm}>
              Apply globally
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("brakit-smart-edit-warning", SmartEditWarning);
