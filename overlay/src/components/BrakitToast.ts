import { LitElement, html, css } from "lit";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";

export type ToastType = "success" | "error" | "info" | "warning";
export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface ToastShowOptions {
  message: string;
  type?: ToastType;
  duration?: number;
  showUndo?: boolean;
  onUndo?: () => void;
  position?: ToastPosition;
}

export class BrakitToast extends LitElement {
  static properties = {
    position: { type: String },
  };

  position: ToastPosition = "bottom-right";

  static styles = css`
    :host {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2147483646;
    }
    /* Optional small overrides for Toastify instances we create */
    .brakit-toast {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 10px;
      font-family:
        -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
        Arial, sans-serif;
    }
    .brakit-toast__message {
      font-weight: 500;
    }
    .brakit-toast__undo {
      margin-left: 8px;
      padding: 6px 10px;
      font-size: 12px;
      border-radius: 6px;
      border: 1px solid rgba(14, 165, 233, 0.4);
      background: rgba(14, 165, 233, 0.12);
      color: #0ea5e9;
      cursor: pointer;
    }
  `;

  /**
   * Shows a toast notification
   */
  show(
    messageOrOptions: string | ToastShowOptions,
    type: ToastType = "info",
    duration: number = 3000,
    showUndo: boolean = false,
    onUndo?: () => void
  ) {
    const options: ToastShowOptions =
      typeof messageOrOptions === "string"
        ? { message: messageOrOptions, type, duration, showUndo, onUndo }
        : messageOrOptions;

    const {
      message,
      type: resolvedType = "info",
      duration: resolvedDuration = 3000,
      showUndo: resolvedShowUndo = false,
      onUndo: resolvedOnUndo,
      position = this.position,
    } = options;

    const container = document.createElement("div");
    container.className = "brakit-toast";
    container.setAttribute(
      "role",
      resolvedType === "error" ? "alert" : "status"
    );
    container.setAttribute(
      "aria-live",
      resolvedType === "error" ? "assertive" : "polite"
    );
    container.dataset.position = position;
    container.dataset.type = resolvedType;

    const messageEl = document.createElement("span");
    messageEl.className = "brakit-toast__message";
    messageEl.textContent = message;
    container.appendChild(messageEl);

    if (resolvedShowUndo && resolvedOnUndo) {
      const btn = document.createElement("button");
      btn.className = "brakit-toast__undo";
      btn.type = "button";
      btn.textContent = "Undo";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        resolvedOnUndo();
      });
      container.appendChild(btn);
    }

    const background =
      resolvedType === "success"
        ? "#ecfdf5"
        : resolvedType === "error"
          ? "#fef2f2"
          : resolvedType === "warning"
            ? "#fffbeb"
            : "#eff6ff";
    const color = "#111827";
    const borderLeft =
      resolvedType === "success"
        ? "4px solid #10b981"
        : resolvedType === "error"
          ? "4px solid #ef4444"
          : resolvedType === "warning"
            ? "4px solid #f59e0b"
            : "4px solid #3b82f6";

    const [vertical, horizontal] = position.split("-") as [
      "top" | "bottom",
      "left" | "center" | "right",
    ];
    const gravity = vertical === "top" ? "top" : "bottom";
    const alignment =
      horizontal === "center"
        ? "center"
        : horizontal === "left"
          ? "left"
          : "right";
    const offsetValue = alignment === "center" ? 0 : 24;
    const offset = {
      x: offsetValue,
      y: 24,
    };

    const placementStyle: Record<string, string> = {
      position: "fixed",
      pointerEvents: "auto",
      zIndex: "2147483647",
    };

    if (gravity === "top") {
      placementStyle.top = `${offset.y}px`;
    } else {
      placementStyle.bottom = `${offset.y}px`;
    }

    if (alignment === "center") {
      placementStyle.left = "50%";
      placementStyle.transform = "translateX(-50%)";
    } else if (alignment === "left") {
      placementStyle.left = `${offset.x}px`;
    } else {
      placementStyle.right = `${offset.x}px`;
    }

    Toastify({
      node: container,
      duration: resolvedDuration,
      gravity,
      position: alignment,
      close: true,
      stopOnFocus: true,
      className: "brakit-toast",
      offset,
      style: {
        background,
        color,
        borderLeft,
        borderRadius: "12px",
        padding: "12px 14px",
        display: "inline-flex",
        alignItems: "center",
        width: "auto",
        maxWidth: "min(360px, calc(100vw - 48px))",
        boxShadow:
          "0 8px 24px rgba(0,0,0,.12), 0 2px 6px rgba(0,0,0,.08), inset 0 0 0 1px rgba(0,0,0,.04)",
        ...placementStyle,
      },
    }).showToast();
  }

  render() {
    return html``;
  }
}

customElements.define("brakit-toast", BrakitToast);
