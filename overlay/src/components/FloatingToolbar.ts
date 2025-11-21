import { logger } from "../utils/logger";
import { OverlayEvents } from "../core/events";
import type { UndoUiState } from "../core/managers/undoManager";

export class FloatingToolbar {
  private container: HTMLElement;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  private isVisible = false;
  private activeTool: string | null = null;
  private readonly document: Document;
  private undoButton: HTMLButtonElement | null = null;
  private undoMetaLabel: HTMLElement | null = null;
  private undoState: UndoUiState = {
    available: false,
    busy: false,
  };

  constructor(document: Document) {
    this.document = document;
    this.container = this.createToolbar();
    this.attachListeners();
  }

  private createToolbar(): HTMLElement {
    const toolbar = this.document.createElement("div");
    toolbar.className = "brakit-floating-toolbar";
    toolbar.innerHTML = `
      <div class="brakit-toolbar-leading">
        <div class="brakit-toolbar-handle" data-handle="true">
          <svg width="16" height="16" viewBox="0 0 16 16">
            <circle cx="4" cy="5" r="1.5" fill="currentColor"/>
            <circle cx="4" cy="11" r="1.5" fill="currentColor"/>
            <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
            <circle cx="12" cy="11" r="1.5" fill="currentColor"/>
          </svg>
        </div>
      </div>

      <div class="brakit-toolbar-tools">
        <button data-tool="text" title="Edit Text (T)" class="brakit-tool-btn">
          <span class="brakit-tool-icon">A</span>
          <span class="brakit-tool-label">Text</span>
        </button>

        <button data-tool="fontSize" title="Font Size (F)" class="brakit-tool-btn">
          <span class="brakit-tool-icon">Aa</span>
          <span class="brakit-tool-label">Size</span>
        </button>

        <button data-tool="fontFamily" title="Font Family" class="brakit-tool-btn">
          <span class="brakit-tool-icon">𝓕</span>
          <span class="brakit-tool-label">Font</span>
        </button>

        <button data-tool="color" title="Colors (C)" class="brakit-tool-btn">
          <span class="brakit-tool-icon">🎨</span>
          <span class="brakit-tool-label">Color</span>
        </button>

        <div class="brakit-toolbar-divider"></div>

        <button data-tool="delete" title="Delete (Del)" class="brakit-tool-btn">
          <span class="brakit-tool-icon">🗑</span>
          <span class="brakit-tool-label">Delete</span>
        </button>

        <div class="brakit-toolbar-divider"></div>

        <button data-action="new-page" class="brakit-tool-btn brakit-new-page-btn" title="Create a new page">
          <span class="brakit-tool-icon">➕</span>
          <span class="brakit-tool-label">New Page</span>
        </button>

        <div class="brakit-toolbar-divider"></div>

        <button data-action="undo" class="brakit-tool-btn brakit-undo-btn" title="Undo last change" disabled>
          <span class="brakit-tool-icon">↺</span>
          <span class="brakit-tool-label">Undo</span>
          <span class="brakit-undo-status">
            <span class="brakit-undo-spinner" aria-hidden="true"></span>
            <span class="brakit-tool-meta"></span>
          </span>
        </button>
      </div>

      <button class="brakit-toolbar-close" data-action="close" title="Close (Esc)">
        <svg width="14" height="14" viewBox="0 0 14 14">
          <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    `;

    this.undoButton = toolbar.querySelector(
      "[data-action='undo']"
    ) as HTMLButtonElement | null;
    this.undoMetaLabel = this.undoButton?.querySelector(
      ".brakit-tool-meta"
    ) as HTMLElement | null;

    this.applyStyles(toolbar);
    this.applyInternalStyles(toolbar);
    this.setUndoState(this.undoState);
    return toolbar;
  }

  private applyStyles(toolbar: HTMLElement) {
    toolbar.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 255, 255, 0.85);
      border-radius: 16px;
      padding: 10px 14px;
      display: none;
      align-items: center;
      gap: 10px;
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.08),
        0 2px 8px rgba(0, 0, 0, 0.04),
        inset 0 1px 0 rgba(255, 255, 255, 0.8);
      z-index: 999998;
      cursor: move;
      user-select: none;
      backdrop-filter: blur(40px) saturate(180%);
      -webkit-backdrop-filter: blur(40px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.6);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    `;
  }

  private applyInternalStyles(toolbar: HTMLElement) {
    const leading = toolbar.querySelector(
      ".brakit-toolbar-leading"
    ) as HTMLElement | null;
    if (leading) {
      leading.style.display = "flex";
      leading.style.alignItems = "center";
      leading.style.gap = "12px";
      leading.style.marginRight = "12px";
    }

    const handle = toolbar.querySelector(
      ".brakit-toolbar-handle"
    ) as HTMLElement | null;
    if (handle) {
      handle.style.cursor = "grab";
      handle.style.padding = "4px";
      handle.style.borderRadius = "12px";
      handle.style.background = "rgba(15, 23, 42, 0.04)";
      handle.style.display = "flex";
      handle.style.alignItems = "center";
      handle.style.justifyContent = "center";
    }
  }

  show() {
    this.isVisible = true;
    this.container.style.display = "flex";

    this.container.style.opacity = "0";
    this.container.style.transform = "translateX(-50%) translateY(-20px)";

    requestAnimationFrame(() => {
      this.container.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
      this.container.style.opacity = "1";
      this.container.style.transform = "translateX(-50%) translateY(0)";
    });

    logger.info("Floating toolbar opened");
  }

  hide() {
    this.isVisible = false;
    this.container.style.opacity = "0";
    this.container.style.transform = "translateX(-50%) translateY(-20px)";

    setTimeout(() => {
      this.container.style.display = "none";
    }, 300);

    logger.info("Floating toolbar closed");
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  setActiveTool(tool: string | null) {
    const buttons = this.container.querySelectorAll(".brakit-tool-btn");
    buttons.forEach((btn) => btn.classList.remove("active"));

    if (tool) {
      const btn = this.container.querySelector(`[data-tool="${tool}"]`);
      btn?.classList.add("active");
    }

    this.activeTool = tool;
  }

  setUndoState(state: UndoUiState) {
    this.undoState = state;
    if (!this.undoButton) {
      return;
    }

    const label = this.undoButton.querySelector(
      ".brakit-tool-label"
    ) as HTMLElement | null;
    if (label) {
      label.textContent = state.busy ? "Undoing…" : "Undo";
    }

    if (this.undoButton) {
      const ready = state.available && !state.busy;
      this.undoButton.classList.toggle("is-busy", state.busy);
      this.undoButton.classList.toggle("is-available", ready);
      this.undoButton.classList.toggle(
        "is-attention",
        Boolean(state.attention && ready)
      );
    }

    const icon = this.undoButton.querySelector(
      ".brakit-tool-icon"
    ) as HTMLElement | null;
    if (icon) {
      icon.style.opacity = state.busy ? "0.6" : "1";
    }

    const meta = this.buildUndoMeta(state);
    if (this.undoMetaLabel) {
      this.undoMetaLabel.classList.remove(
        "is-visible",
        "variant-info",
        "variant-neutral"
      );
      if (meta) {
        this.undoMetaLabel.textContent = meta.text;
        this.undoMetaLabel.classList.add("is-visible");
        this.undoMetaLabel.classList.add(
          meta.variant === "info" ? "variant-info" : "variant-neutral"
        );
      } else {
        this.undoMetaLabel.textContent = "";
      }
    }

    this.undoButton.setAttribute("title", this.describeUndoTooltip(state));

    const shouldDisable = !state.available || state.busy;
    this.undoButton.disabled = shouldDisable;
  }

  private buildUndoMeta(
    state: UndoUiState
  ): { text: string; variant: "info" | "neutral" } | null {
    if (state.busy) {
      return { text: "Working…", variant: "info" };
    }
    if (state.attention && state.available) {
      return { text: "Undo ready", variant: "info" };
    }
    if (state.fileCount && state.fileCount > 0) {
      const fileText =
        state.fileCount === 1 ? "1 file" : `${state.fileCount} files`;
      return { text: fileText, variant: "neutral" };
    }
    const relative = this.formatRelativeTime(state.timestamp);
    if (relative) {
      return { text: relative, variant: "neutral" };
    }
    return null;
  }

  private describeUndoTooltip(state: UndoUiState): string {
    if (state.busy) {
      return "Undo in progress…";
    }
    if (!state.available) {
      return "Undo unavailable. Make a change to enable it.";
    }
    const actionLabel = state.label ? `Undo "${state.label}"` : "Undo last change";
    const fileSuffix =
      state.fileCount && state.fileCount > 0
        ? state.fileCount === 1
          ? " touching 1 file"
          : ` touching ${state.fileCount} files`
        : "";
    const relative = this.formatRelativeTime(state.timestamp);
    return relative ? `${actionLabel}${fileSuffix} – ${relative}` : `${actionLabel}${fileSuffix}`;
  }

  private formatRelativeTime(timestamp?: string): string | null {
    if (!timestamp) {
      return null;
    }
    const parsed = Date.parse(timestamp);
    if (Number.isNaN(parsed)) {
      return null;
    }
    const diffMs = Date.now() - parsed;
    const absMs = Math.abs(diffMs);
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (absMs < 30 * 1000) {
      return "Just now";
    }
    if (absMs < hour) {
      const minutes = Math.round(absMs / minute);
      return `${minutes}m ago`;
    }
    if (absMs < day) {
      const hours = Math.round(absMs / hour);
      return `${hours}h ago`;
    }
    const days = Math.round(absMs / day);
    return `${days}d ago`;
  }

  private attachListeners() {
    this.container.addEventListener("mousedown", this.handleDragStart);
    this.document.addEventListener("mousemove", this.handleDragMove);
    this.document.addEventListener("mouseup", this.handleDragEnd);

    this.container.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest("[data-tool]") as HTMLElement;

      if (btn && !btn.hasAttribute("disabled")) {
        const tool = btn.dataset.tool!;
        this.handleToolSelect(tool);
      }

      if (target.closest("[data-action='undo']")) {
        if (!this.undoButton?.disabled && !this.undoState.busy) {
          this.document.dispatchEvent(
            new CustomEvent(OverlayEvents.UndoRequest, {
              detail: {},
            })
          );
        }
      }

      if (target.closest("[data-action='close']")) {
        this.hide();
      }

      const newPageButton = target.closest(
        "[data-action='new-page']"
      ) as HTMLElement | null;
      if (newPageButton) {
        console.log("📄 New Page button clicked, dispatching event");
        this.document.dispatchEvent(
          new CustomEvent("brakit:new-page", {
            detail: {},
          })
        );
      }
    });

    this.document.addEventListener("keydown", (e) => {
      if (!this.isVisible) return;

      if (e.key === "Escape") {
        this.hide();
        this.setActiveTool(null);
        this.document.dispatchEvent(
          new CustomEvent("brakit:tool-change", {
            detail: { tool: null },
          })
        );
      }
    });
  }

  private handleDragStart = (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    if (
      target.hasAttribute("data-handle") ||
      target.closest(".brakit-toolbar-handle") ||
      target === this.container
    ) {
      this.isDragging = true;

      const rect = this.container.getBoundingClientRect();
      this.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      this.container.style.cursor = "grabbing";
      this.container.style.transition = "none";
    }
  };

  private handleDragMove = (e: MouseEvent) => {
    if (!this.isDragging) return;

    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;

    const maxX = window.innerWidth - this.container.offsetWidth;
    const maxY = window.innerHeight - this.container.offsetHeight;

    const boundedX = Math.max(0, Math.min(x, maxX));
    const boundedY = Math.max(0, Math.min(y, maxY));

    this.container.style.left = `${boundedX}px`;
    this.container.style.top = `${boundedY}px`;
    this.container.style.transform = "none";
  };

  private handleDragEnd = () => {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.container.style.cursor = "move";

    this.snapToEdge();
  };

  private snapToEdge() {
    const rect = this.container.getBoundingClientRect();
    const snapThreshold = 30;

    if (rect.top < snapThreshold) {
      this.container.style.top = "12px";
    }

    if (window.innerHeight - rect.bottom < snapThreshold) {
      this.container.style.top = `${window.innerHeight - rect.height - 12}px`;
    }
  }

  private handleToolSelect(tool: string) {
    const newTool = this.activeTool === tool ? null : tool;
    this.setActiveTool(newTool);

    this.document.dispatchEvent(
      new CustomEvent("brakit:tool-change", {
        detail: { tool: newTool },
      })
    );

    logger.info(`Tool selected: ${newTool || "none"}`);
  }

  mount() {
    if (!this.document.body) {
      logger.warn("Cannot mount toolbar: document.body is null");
      // Retry when DOM is ready with multiple strategies
      if (this.document.readyState === "loading") {
        this.document.addEventListener("DOMContentLoaded", () => this.mount(), {
          once: true,
        });
      } else {
        // If document is not loading but body is still null, try again after a short delay
        setTimeout(() => {
          if (this.document.body) {
            this.document.body.appendChild(this.container);
          } else {
            logger.warn(
              "Still cannot mount toolbar after delay - body is still null"
            );
          }
        }, 100);
      }
      return;
    }
    this.document.body.appendChild(this.container);
  }

  destroy() {
    this.container.remove();
  }
}
