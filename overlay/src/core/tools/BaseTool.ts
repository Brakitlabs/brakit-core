import { logger } from "../../utils/logger";

/**
 * Abstract base class for all Brakit tools that provides common functionality
 * including lifecycle management, event handling, and overlay element detection.
 */
export abstract class BaseTool {
  protected readonly document: Document;
  protected active = false;
  protected hoveredElement: HTMLElement | null = null;

  constructor(document: Document) {
    this.document = document;
  }

  /**
   * Activate the tool
   */
  activate(): void {
    if (this.active) return;
    this.active = true;
    this.attachListeners();
    this.onActivate();
  }

  /**
   * Deactivate the tool
   */
  deactivate(options?: { preserveSelection?: boolean }): void {
    if (!this.active) return;
    this.active = false;
    this.detachListeners();
    this.clearHover();
    this.onDeactivate(options);
  }

  /**
   * Destroy the tool and clean up resources
   */
  destroy(): void {
    this.deactivate();
    this.onDestroy();
  }

  /**
   * Check if the tool is currently active
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Abstract methods that must be implemented by concrete tools
   */
  protected abstract attachListeners(): void;
  protected abstract detachListeners(): void;
  protected abstract onActivate(): void;
  protected abstract onDeactivate(options?: {
    preserveSelection?: boolean;
  }): void;
  protected abstract onDestroy(): void;

  /**
   * Check if an element should be ignored (is part of Brakit overlay system)
   */
  protected shouldIgnoreOverlayElement(element: HTMLElement): boolean {
    return Boolean(
      element.closest("brakit-bubble") ||
        element.closest("brakit-modal") ||
        element.closest("brakit-toast") ||
        element.closest("brakit-smart-edit-warning") ||
        element.closest("brakit-page-builder") ||
        element.closest("brakit-delete-confirmation") ||
        element.closest(".brakit-floating-toolbar") ||
        element.closest(".brakit-toolbar-handle") ||
        element.closest(".brakit-toolbar-tools") ||
        element.closest(".brakit-toolbar-divider") ||
        element.closest(".brakit-toolbar-close") ||
        element.closest("[data-tool]") ||
        element.closest("[data-action]") ||
        element.getAttribute("data-brakit-overlay") === "true" ||
        element.getAttribute("data-brakit-placeholder") === "true" ||
        element.getAttribute("data-brakit-editing") === "true" ||
        element.classList.contains("brakit-overlay") ||
        element.classList.contains("brakit-segment-view") ||
        element.classList.contains("segment-view-node") ||
        element.classList.contains("overlay-element") ||
        element.tagName === "HTML" ||
        element.tagName === "BODY" ||
        element.tagName === "SCRIPT" ||
        element.tagName === "STYLE" ||
        (element.id &&
          (element.id.includes("brakit") ||
            element.id.includes("overlay") ||
            element.id.includes("segment-view")))
    );
  }

  /**
   * Normalize a target element by finding the first non-overlay parent
   */
  protected normalizeTarget(element: HTMLElement | null): HTMLElement | null {
    if (!element) return null;
    if (element.nodeType !== Node.ELEMENT_NODE) return null;

    if (this.shouldIgnoreOverlayElement(element)) {
      const parent = element.parentElement;
      return parent ? this.normalizeTarget(parent) : null;
    }

    return element;
  }

  /**
   * Clear hover effects from the currently hovered element
   */
  protected clearHover(): void {
    if (this.hoveredElement) {
      this.hoveredElement.style.outline = "";
      this.hoveredElement.style.outlineOffset = "";
      this.hoveredElement.style.backgroundColor = "";
      this.hoveredElement = null;
    }
  }

  /**
   * Resolve the target element at given coordinates
   */
  protected resolveElementAt(x: number, y: number): HTMLElement | null {
    const raw = this.document.elementFromPoint(x, y) as HTMLElement | null;
    return this.normalizeTarget(raw);
  }

  /**
   * Handle common event prevention patterns
   */
  protected preventEvent(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Check if a click target should be ignored (toolbar/bubble elements)
   */
  protected shouldIgnoreClick(target: HTMLElement): boolean {
    return Boolean(
      target.closest(".brakit-floating-toolbar") ||
        target.closest("[data-tool]") ||
        target.closest("[data-action]") ||
        target.closest("brakit-bubble")
    );
  }

  /**
   * Handle ESC key for tool deactivation
   */
  protected handleEscapeKey(event: KeyboardEvent, onEscape?: () => void): void {
    if (event.key === "Escape") {
      this.preventEvent(event);
      if (onEscape) {
        onEscape();
      } else {
        this.deactivate();
      }
    }
  }
}
