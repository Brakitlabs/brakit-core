import { LitElement, html, css } from "lit";
import { OverlayEvents } from "../core/events";

interface Point {
  x: number;
  y: number;
}

const STORAGE_KEY = "brakit-bubble-position";
const BUBBLE_SIZE = 64;
const POSITION_MARGIN = 20;
const CLICK_THRESHOLD = 5;

export class BrakitBubble extends LitElement {
  static properties = {
    isDragging: { type: Boolean },
    isExpanded: { type: Boolean },
    position: { type: Object },
    hasError: { type: Boolean },
    errorMessage: { type: String },
  };

  isDragging = false;
  isExpanded = false;
  position: Point = { x: 20, y: 20 };
  hasError = false;
  errorMessage = "";

  private dragOffset: Point = { x: 0, y: 0 };
  private dragStart: Point | null = null;
  private activePointerId: number | null = null;

  static styles = css`
    :host {
      display: block;
      font-family:
        -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
        Arial, sans-serif;
    }

    .bubble-container {
      position: fixed;
      z-index: 2147483647;
      pointer-events: auto;
      cursor: grab;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .bubble-container:active {
      cursor: grabbing;
    }

    .bubble-container.dragging {
      transition: none;
    }

    .bubble-container.expanded {
      transform: scale(1.1);
    }

    .bubble {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      box-shadow:
        0 4px 16px rgba(0, 0, 0, 0.12),
        0 1px 3px rgba(0, 0, 0, 0.08),
        inset 0 0 0 0.5px rgba(0, 0, 0, 0.04);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .bubble:hover {
      transform: scale(1.08);
      box-shadow:
        0 8px 24px rgba(0, 0, 0, 0.15),
        0 2px 6px rgba(0, 0, 0, 0.1),
        inset 0 0 0 0.5px rgba(0, 0, 0, 0.06);
    }

    .bubble:active {
      transform: scale(0.96);
      transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .bubble-icon {
      font-size: 24px;
      line-height: 1;
      opacity: 0.85;
      transition: opacity 0.2s;
    }

    .bubble:hover .bubble-icon {
      opacity: 1;
    }

    .ripple {
      position: absolute;
      border-radius: 16px;
      background: rgba(0, 0, 0, 0.1);
      pointer-events: none;
      animation: ripple-animation 0.5s ease-out;
    }

    @keyframes ripple-animation {
      from {
        transform: scale(0);
        opacity: 1;
      }
      to {
        transform: scale(2.5);
        opacity: 0;
      }
    }

    .error-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 20px;
      height: 20px;
      background: #ef4444;
      border-radius: 50%;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      animation: pulse-error 2s ease-in-out infinite;
    }

    @keyframes pulse-error {
      0%,
      100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
      }
      50% {
        transform: scale(1.1);
        box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
      }
    }

    .tool-panel {
      display: flex;
      gap: 6px;
      background: rgba(255, 255, 255, 0.88);
      backdrop-filter: blur(20px) saturate(160%);
      -webkit-backdrop-filter: blur(20px) saturate(160%);
      border-radius: 14px;
      padding: 8px 10px;
      box-shadow:
        0 6px 18px rgba(15, 23, 42, 0.16),
        inset 0 0 0 0.5px rgba(0, 0, 0, 0.06);
      opacity: 0;
      transform: translateY(6px);
      transition:
        opacity 0.2s ease,
        transform 0.2s ease;
      pointer-events: none;
    }

    .bubble-container:hover .tool-panel,
    .tool-panel:focus-within {
      opacity: 1;
      transform: translateY(0px);
      pointer-events: auto;
    }

    .bubble-container.expanded .tool-panel {
      opacity: 1;
      transform: translateY(0px);
      pointer-events: auto;
    }

    .tool-button {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      background: transparent;
      color: #1f2937;
      cursor: pointer;
      transition:
        background 0.15s ease,
        transform 0.15s ease;
    }

    .tool-button:hover {
      background: rgba(15, 23, 42, 0.08);
    }

    .tool-button.active {
      background: rgba(15, 23, 42, 0.12);
      color: #111827;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.loadPosition();
    window.addEventListener("resize", this.handleResize);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("resize", this.handleResize);
    this.removePointerListeners();
  }

  private loadPosition() {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
        this.position = this.constrainPosition(parsed);
      }
    } catch (error) {
      // Ignore corrupted values
    }
  }

  private savePosition() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.position));
    } catch (error) {
      // Ignore storage failures
    }
  }

  private handleResize = () => {
    this.position = this.constrainPosition(this.position);
    this.savePosition();
  };

  private handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const target = event.target as HTMLElement | null;
    if (target?.closest(".tool-panel")) return;

    const container = this.getBubbleContainer();
    if (!container) return;

    this.isDragging = true;
    this.dragStart = { x: event.clientX, y: event.clientY };

    const rect = container.getBoundingClientRect();
    this.dragOffset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    this.activePointerId = event.pointerId;
    try {
      container.setPointerCapture(event.pointerId);
    } catch (error) {
      // Some environments do not support pointer capture; ignore
    }
    container.addEventListener("pointermove", this.handlePointerMove);
    container.addEventListener("pointerup", this.handlePointerUp);
    container.addEventListener("pointercancel", this.handlePointerCancel);

    event.preventDefault();
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.isDragging || event.pointerId !== this.activePointerId) return;

    this.position = this.constrainPosition({
      x: event.clientX - this.dragOffset.x,
      y: event.clientY - this.dragOffset.y,
    });
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (!this.isDragging || event.pointerId !== this.activePointerId) return;

    this.isDragging = false;
    this.removePointerListeners();
    this.savePosition();

    if (!this.dragStart) {
      this.dragStart = { x: event.clientX, y: event.clientY };
    }

    const distance = Math.hypot(
      event.clientX - this.dragStart.x,
      event.clientY - this.dragStart.y
    );

    this.dragStart = null;

    if (distance <= CLICK_THRESHOLD) {
      this.handleClick();
    }
  };

  private handlePointerCancel = (event: PointerEvent) => {
    if (event.pointerId !== this.activePointerId) return;

    this.isDragging = false;
    this.dragStart = null;
    this.removePointerListeners();
  };

  private handleClick() {
    this.playRipple();
    this.isExpanded = true;

    if (this.hasError) {
      // Show error details and provide option to clear
      console.warn("[Brakit] Error details:", this.errorMessage);

      // Clear the error after showing it
      this.clearError();

      this.dispatchEvent(
        new CustomEvent(OverlayEvents.BubbleFixError, {
          detail: { errorMessage: this.errorMessage },
          bubbles: true,
          composed: true,
        })
      );
      return;
    }
  }

  clearError() {
    this.hasError = false;
    this.errorMessage = "";
    this.requestUpdate();
  }

  private playRipple() {
    const bubble = this.shadowRoot?.querySelector(".bubble");
    if (!bubble) return;

    const ripple = document.createElement("div");
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = "100%";
    ripple.style.left = ripple.style.top = "0";
    bubble.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  private getBubbleContainer(): HTMLElement | null {
    return this.shadowRoot?.querySelector(
      ".bubble-container"
    ) as HTMLElement | null;
  }

  private removePointerListeners() {
    const container = this.getBubbleContainer();
    if (!container) {
      this.activePointerId = null;
      return;
    }

    if (this.activePointerId !== null) {
      try {
        container.releasePointerCapture(this.activePointerId);
      } catch (error) {
        // Pointer capture may already be released; ignore
      }
    }

    container.removeEventListener("pointermove", this.handlePointerMove);
    container.removeEventListener("pointerup", this.handlePointerUp);
    container.removeEventListener("pointercancel", this.handlePointerCancel);

    this.activePointerId = null;
  }

  private constrainPosition(point: Point): Point {
    return {
      x: Math.max(
        POSITION_MARGIN,
        Math.min(window.innerWidth - BUBBLE_SIZE - POSITION_MARGIN, point.x)
      ),
      y: Math.max(
        POSITION_MARGIN,
        Math.min(window.innerHeight - BUBBLE_SIZE - POSITION_MARGIN, point.y)
      ),
    };
  }

  render() {
    const containerClasses = [
      "bubble-container",
      this.isDragging ? "dragging" : "",
      this.isExpanded ? "expanded" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return html`
      <div
        class=${containerClasses}
        style="left: ${this.position.x}px; top: ${this.position.y}px;"
        @pointerdown=${this.handlePointerDown}
      >
        <div class="bubble">
          <div
            class="bubble-icon"
            title="${this.hasError
              ? `Error: ${this.errorMessage}`
              : "Brakit Overlay"}"
          >
            ${this.hasError ? "🔴" : "✨"}
          </div>
          ${this.hasError ? html`<div class="error-badge">!</div>` : ""}
        </div>
        <div class="tool-panel">
          <button
            class="tool-button toolbar-button"
            title="Open Edit Toolbar"
            @click=${(event: Event) => this.handleToggleToolbar(event)}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  private handleToggleToolbar(event: Event) {
    event.stopPropagation();
    document.dispatchEvent(new CustomEvent("brakit:toggle-toolbar"));
  }
}

customElements.define("brakit-bubble", BrakitBubble);
