import { LitElement, html, css, PropertyValues } from "lit";
import { OverlayEvents } from "../core/events";
import { ModalMode, ModalStatusStep } from "../core/managers/modalManager";

interface AnchorPosition {
  x: number;
  y: number;
}

function getStatusIcon(step: ModalStatusStep): string {
  if (step.state === "done") return "✓";
  if (step.state === "error") return "!";
  return "";
}

export class BrakitModal extends LitElement {
  static properties = {
    mode: { type: String },
    instruction: { type: String },
    elementTag: { type: String },
    isSubmitting: { type: Boolean },
    hint: { type: String },
    anchorPosition: { type: Object },
    errorMessage: { type: String },
    submissionError: { type: String },
    originLabel: { type: String },
    targetSummary: { type: String },
    targetDetails: { type: Array },
    statusTimeline: { type: Array },
    resultDiff: { type: String },
    resultFile: { type: String },
    resultMessage: { type: String },
    resultSummary: { type: String },
    resultStatus: { type: String },
    canUndo: { type: Boolean },
  };

  mode: ModalMode = "edit";
  instruction = "";
  elementTag?: string;
  isSubmitting = false;
  hint = "Press Enter to apply • Esc to cancel";
  warning = "Generated result position might not be exact.";
  anchorPosition?: AnchorPosition;
  errorMessage?: string;
  submissionError?: string;
  originLabel?: string;
  targetSummary?: string;
  targetDetails?: string[];
  statusTimeline?: ModalStatusStep[];
  resultDiff?: string;
  resultFile?: string;
  resultMessage?: string;
  resultSummary?: string;
  resultStatus?: "success" | "error";
  canUndo = false;

  private currentValue = "";
  private detailsExpanded = false;

  static styles = css`
    :host {
      display: block;
      font-family:
        -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
        Arial, sans-serif;
    }

    .modal-shell {
      position: fixed;
      width: 360px;
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(40px) saturate(180%);
      -webkit-backdrop-filter: blur(40px) saturate(180%);
      border-radius: 18px;
      box-shadow:
        0 24px 70px rgba(15, 23, 42, 0.18),
        0 12px 30px rgba(15, 23, 42, 0.08),
        inset 0 0 0 0.5px rgba(255, 255, 255, 0.35);
      overflow: hidden;
      z-index: 2147483647;
      color: #111827;
    }

    .modal-header {
      padding: 18px 20px 14px;
      background: rgba(248, 250, 252, 0.78);
      border-bottom: 1px solid rgba(15, 23, 42, 0.06);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .header-title {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    .modal-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .modal-body.result {
      gap: 18px;
    }

    textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 14px 16px;
      border: 1px solid rgba(15, 23, 42, 0.12);
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.5;
      font-family: inherit;
      resize: none;
      min-height: 96px;
      background: rgba(255, 255, 255, 0.88);
      color: #111827;
      transition: all 0.18s ease;
    }

    textarea:focus {
      outline: none;
      border-color: rgba(99, 102, 241, 0.45);
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
      background: #ffffff;
    }

    textarea:disabled {
      cursor: not-allowed;
      background: rgba(248, 250, 252, 0.8);
      color: #9ca3af;
    }

    .hint {
      font-size: 11px;
      color: #6b7280;
      letter-spacing: 0.01em;
    }

    .warning {
      font-size: 11px;
      color: #9ca3af;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .error-banner,
    .submission-error {
      border-radius: 12px;
      padding: 12px 14px;
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .error-banner {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #b91c1c;
    }

    .submission-error {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #b91c1c;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .submission-error strong {
      font-size: 12px;
    }

    .status-timeline {
      border-radius: 14px;
      border: 1px solid rgba(99, 102, 241, 0.12);
      background: rgba(248, 250, 252, 0.88);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .status-timeline.compact {
      background: rgba(248, 250, 252, 0.7);
    }

    .status-step {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      color: #6b7280;
      letter-spacing: -0.01em;
    }

    .status-indicator {
      width: 20px;
      height: 20px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      background: #d1d5db;
      color: #374151;
    }

    .status-step.active .status-indicator {
      background: #6366f1;
      color: #ffffff;
      box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.34);
      animation: pulse 1.8s ease-out infinite;
    }

    .status-step.active {
      color: #4f46e5;
      font-weight: 500;
    }

    .status-step.done .status-indicator {
      background: #16a34a;
      color: #ffffff;
    }

    .status-step.done {
      color: #047857;
    }

    .status-step.error .status-indicator {
      background: #ef4444;
      color: #ffffff;
    }

    .status-step.error {
      color: #b91c1c;
      font-weight: 600;
    }

    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.32);
      }
      70% {
        box-shadow: 0 0 0 10px rgba(99, 102, 241, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
      }
    }

    .result-message {
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
      letter-spacing: -0.01em;
      text-align: center;
    }

    .footer-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 20px;
      border-top: 1px solid rgba(15, 23, 42, 0.05);
      background: rgba(248, 250, 252, 0.86);
    }

    .footer-actions button {
      border: none;
      border-radius: 10px;
      padding: 9px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition:
        transform 0.16s ease,
        box-shadow 0.16s ease,
        opacity 0.16s ease;
    }

    .footer-actions button.primary {
      background: #111827;
      color: #ffffff;
    }

    .footer-actions button.secondary {
      background: rgba(15, 23, 42, 0.08);
      color: #111827;
    }

    .footer-actions button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .footer-actions button:not(:disabled):hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 18px rgba(15, 23, 42, 0.14);
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.currentValue = this.instruction;
    document.addEventListener("keydown", this.handleKeyDown);
    setTimeout(() => {
      document.addEventListener("click", this.handleOutsideClick);
      this.focusTextarea();
    }, 0);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("click", this.handleOutsideClick);
  }

  protected willUpdate(changedProperties: PropertyValues<this>) {
    if (
      changedProperties.has("instruction") &&
      this.instruction !== this.currentValue
    ) {
      this.currentValue = this.instruction || "";
    }

    if (changedProperties.has("targetDetails")) {
      this.detailsExpanded = false;
    }

    if (changedProperties.has("mode") && this.mode !== "edit") {
      this.detailsExpanded = false;
    }
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      this.emitClose();
    } else if (
      event.key === "Enter" &&
      !event.shiftKey &&
      this.mode !== "result"
    ) {
      event.preventDefault();
      this.emitSubmit();
    }
  };

  private handleOutsideClick = (event: MouseEvent) => {
    const shell = this.shadowRoot?.querySelector(".modal-shell");
    if (!shell) return;
    if (this.isSubmitting) return;

    if (!event.composedPath().includes(shell)) {
      this.emitClose();
    }
  };

  private handleInput = (event: Event) => {
    this.currentValue = (event.target as HTMLTextAreaElement).value;
  };

  private emitSubmit() {
    if (this.isSubmitting) return;
    const trimmed = this.currentValue.trim();
    if (!trimmed) return;

    this.dispatchEvent(
      new CustomEvent(OverlayEvents.ModalSubmit, {
        detail: { instruction: trimmed },
        bubbles: true,
        composed: true,
      })
    );
  }

  private emitClose() {
    if (this.isSubmitting) return;
    this.dispatchEvent(
      new CustomEvent(OverlayEvents.ModalClose, {
        bubbles: true,
        composed: true,
      })
    );
  }

  private emitUndo() {
    if (this.isSubmitting || !this.canUndo) return;
    this.dispatchEvent(
      new CustomEvent(OverlayEvents.ModalUndo, {
        bubbles: true,
        composed: true,
      })
    );
  }

  private focusTextarea() {
    if (this.mode === "result") return;
    const textarea = this.shadowRoot?.querySelector("textarea") as
      | HTMLTextAreaElement
      | undefined;
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  }

  private getPositionStyle() {
    const modalWidth = 340;
    const padding = 16;
    const bubbleSize = 64;
    const position = this.anchorPosition;

    if (!position) {
      return "left: 120px; top: 120px;";
    }

    let left = position.x + bubbleSize + padding;
    let top = position.y;

    if (left + modalWidth > window.innerWidth - padding) {
      left = position.x - modalWidth - padding;
    }

    if (left < padding) {
      left = padding;
    }

    if (top < padding) {
      top = padding;
    }

    if (top > window.innerHeight - 220) {
      top = window.innerHeight - 220;
    }

    return `left: ${left}px; top: ${top}px;`;
  }

  private renderHeader() {
    const baseTitle =
      this.mode === "error"
        ? "Fix error"
        : this.mode === "result"
          ? this.resultStatus === "error"
            ? "Action needed"
            : "Changes applied"
          : "Edit element";

    return html`
      <div class="modal-header">
        <span class="header-title">${baseTitle}</span>
      </div>
    `;
  }

  private renderStatusTimeline(compact = false) {
    const steps = this.statusTimeline || [];
    if (!steps.length) {
      return null;
    }

    const timelineClass = compact
      ? "status-timeline compact"
      : "status-timeline";

    return html`
      <div class=${timelineClass}>
        ${steps.map(
          (step) => html`
            <div class="status-step ${step.state}">
              <div class="status-indicator">${getStatusIcon(step)}</div>
              <span>${step.label}</span>
            </div>
          `
        )}
      </div>
    `;
  }

  private renderSubmissionError() {
    if (!this.submissionError) {
      return null;
    }

    return html`
      <div class="submission-error">
        <strong>We couldn't apply that instruction.</strong>
        <span>${this.submissionError}</span>
      </div>
    `;
  }

  private renderEditContent() {
    return html`
      <div class="modal-body">
        ${this.errorMessage
          ? html`<div class="error-banner">${this.errorMessage}</div>`
          : null}
        ${this.renderSubmissionError()}
        <textarea
          placeholder=${this.mode === "error"
            ? "Describe the fix you want applied..."
            : "What would you like to change?"}
          .value=${this.currentValue}
          ?disabled=${this.isSubmitting}
          @input=${this.handleInput}
        ></textarea>
        ${this.hint ? html`<div class="hint">${this.hint}</div>` : null}
        ${this.warning
          ? html`<div class="warning">
              <span aria-hidden="true">⚠️</span>
              <span>${this.warning}</span>
            </div>`
          : null}
        ${this.renderStatusTimeline()}
      </div>
    `;
  }

  private renderResultContent() {
    const isError = this.resultStatus === "error";
    const message =
      this.resultSummary ||
      this.resultMessage ||
      (isError
        ? "We couldn't apply the changes."
        : "Changes applied successfully.");

    return html`
      <div class="modal-body result">
        <div class="result-message">${message}</div>
        ${this.renderStatusTimeline(true)}
      </div>
    `;
  }

  private renderFooter() {
    if (this.mode !== "result") {
      return null;
    }

    return html`
      <div class="footer-actions">
        <button
          class="primary"
          @click=${() => this.emitUndo()}
          ?disabled=${!this.canUndo || this.isSubmitting}
        >
          ${this.isSubmitting ? "Reverting..." : "Undo change"}
        </button>
        <button
          class="secondary"
          @click=${() => this.emitClose()}
          ?disabled=${this.isSubmitting}
        >
          Close
        </button>
      </div>
    `;
  }

  render() {
    const content =
      this.mode === "result"
        ? this.renderResultContent()
        : this.renderEditContent();

    return html`
      <div
        class="modal-shell"
        style=${this.getPositionStyle()}
        @click=${(event: Event) => event.stopPropagation()}
      >
        ${this.renderHeader()} ${content} ${this.renderFooter()}
      </div>
    `;
  }
}

customElements.define("brakit-modal", BrakitModal);
