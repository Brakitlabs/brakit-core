type BubbleElement = HTMLElement & {
  hasError?: boolean;
  errorMessage?: string;
  requestUpdate?: () => void;
  position?: { x: number; y: number };
  activeTool?: string;
};

interface UICallbacks {}

/**
 * Manages UI components (bubble, toast, toolbar)
 * and their lifecycle
 */
export class UICoordinator {
  private bubble: BubbleElement | null = null;
  private toast: any | null = null;
  private readonly callbacks: UICallbacks;

  constructor(callbacks: UICallbacks = {}) {
    this.callbacks = callbacks;
  }

  attachBubbleElement(bubble: BubbleElement): void {
    this.bubble = bubble;
  }

  attachToastElement(toast: any): void {
    this.toast = toast;
  }

  showToast(
    message: string,
    type: "success" | "error" | "info" | "warning" = "info",
    duration: number = 3000,
    showUndo: boolean = false,
    onUndo?: () => void
  ): void {
    if (this.toast && typeof this.toast.show === "function") {
      this.toast.show(message, type, duration, showUndo, onUndo);
    }
  }

  updateBubbleError(errorMessage: string): void {
    if (this.bubble) {
      this.bubble.hasError = true;
      this.bubble.errorMessage = errorMessage;
      this.bubble.requestUpdate && this.bubble.requestUpdate();
    }
  }

  updateBubbleToolState(activeTool: string | null): void {
    if (this.bubble) {
      this.bubble.activeTool =
        activeTool === null ? undefined : (activeTool as any);
      this.bubble.requestUpdate && this.bubble.requestUpdate();
    }
  }

  getBubbleAnchorPosition(): { x: number; y: number } | undefined {
    if (!this.bubble) return undefined;

    const shadowRoot = (this.bubble as any).shadowRoot as
      | ShadowRoot
      | undefined;
    const container = shadowRoot?.querySelector(
      ".bubble-container"
    ) as HTMLElement | null;

    const target = container || this.bubble;
    const rect = target.getBoundingClientRect();
    return { x: rect.left, y: rect.top };
  }
}
