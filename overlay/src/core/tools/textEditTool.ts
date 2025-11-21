import { logger } from "../../utils/logger";
import { BaseTool } from "./BaseTool";
import {
  buildSmartEditMetadata,
  type SmartEditMetadata,
} from "../../utils/elementMetadata";

interface TextEditToolOptions {
  document: Document;
  onTextUpdate?: (data: TextUpdateData) => void;
}

export interface TextUpdateData {
  element: HTMLElement;
  oldText: string;
  oldDisplayText?: string;
  newText: string;
  tag: string;
  file: string;
  className: string;
  elementTag: string;
  textContent: string;
  ownerComponentName?: string;
  ownerFilePath?: string;
}

export class TextEditTool extends BaseTool {
  private readonly onTextUpdate?: (data: TextUpdateData) => void;
  private editingElement: HTMLElement | null = null;
  private originalText: string = "";
  private originalRawText: string = "";
  private originalClassName: string = "";
  private originalMetadata: SmartEditMetadata | null = null;

  constructor(options: TextEditToolOptions) {
    super(options.document);
    this.onTextUpdate = options.onTextUpdate;
  }

  protected onActivate(): void {
    logger.info("Text edit mode enabled");
  }

  protected onDeactivate(options?: { preserveSelection?: boolean }): void {
    this.cancelEdit();
    logger.info("Text edit mode disabled");
  }

  protected onDestroy(): void {
    this.cancelEdit();
  }

  protected attachListeners(): void {
    this.document.addEventListener("pointermove", this.handlePointerMove, true);
    this.document.addEventListener("dblclick", this.handleDoubleClick, true);
    this.document.addEventListener("keydown", this.handleKeyDown, true);
  }

  protected detachListeners(): void {
    this.document.removeEventListener(
      "pointermove",
      this.handlePointerMove,
      true
    );
    this.document.removeEventListener("dblclick", this.handleDoubleClick, true);
    this.document.removeEventListener("keydown", this.handleKeyDown, true);
  }

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.active || this.editingElement) return;

    const candidate = this.resolveTextElementAt(event.clientX, event.clientY);
    if (candidate !== this.hoveredElement) {
      this.clearHover();
      this.hoveredElement = candidate;
      this.highlightElement(candidate);
    }
  };

  private handleDoubleClick = (event: MouseEvent) => {
    if (!this.active) return;

    // Use shared click ignore logic from BaseTool
    const target = event.target as HTMLElement;
    if (this.shouldIgnoreClick(target)) {
      return;
    }

    const candidate = this.resolveTextElementAt(event.clientX, event.clientY);
    if (!candidate) return;

    event.preventDefault();
    event.stopPropagation();

    this.startEdit(candidate);
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (!this.editingElement) return;

    // Only handle if the event target is our editing element
    if (event.target !== this.editingElement) return;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.cancelEdit();
    } else if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      this.saveEdit();
    }
  };

  private resolveTextElementAt(x: number, y: number): HTMLElement | null {
    const raw = this.document.elementFromPoint(x, y) as HTMLElement | null;
    if (!raw) return null;

    const normalized = this.normalizeTarget(raw);
    if (!normalized) return null;

    // Only return elements with text content
    if (!this.hasEditableText(normalized)) return null;

    return normalized;
  }

  private shouldIgnore(element: HTMLElement): boolean {
    return Boolean(
      this.shouldIgnoreOverlayElement(element) ||
        element.tagName === "INPUT" ||
        element.tagName === "TEXTAREA" ||
        element.tagName === "SELECT"
    );
  }

  private hasEditableText(element: HTMLElement): boolean {
    const text = element.innerText?.trim();
    return typeof text === "string" && text.length > 0;
  }

  private highlightElement(element: HTMLElement | null) {
    if (!element) return;

    element.style.outline = "2px solid #10b981";
    element.style.outlineOffset = "2px";
    element.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
  }

  private startEdit(element: HTMLElement) {
    this.editingElement = element;
    this.originalText = element.innerText;
    this.originalRawText = element.textContent ?? element.innerText;
    this.originalClassName = element.className;
    this.originalMetadata = buildSmartEditMetadata(element, element.className);

    // Make element editable with proper settings
    element.contentEditable = "true";
    element.spellcheck = false;
    element.classList.add("brakit-text-editing");
    this.clearHover();

    // Prevent button/link click behavior while editing
    element.style.pointerEvents = "auto";
    element.style.userSelect = "text";
    element.style.cursor = "text";

    // For buttons/links, ensure they don't trigger default behavior
    if (element.tagName === "BUTTON" || element.tagName === "A") {
      element.setAttribute("data-brakit-editing", "true");
    }

    element.focus();

    // Select all text for easy editing
    const range = this.document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    element.addEventListener("blur", this.handleBlur);
    element.addEventListener("click", this.preventClick, true);
    element.addEventListener("mousedown", this.preventDefault, true);

    logger.info("Started editing text", {
      tag: element.tagName,
      text: this.originalText,
    });
  }

  private preventDefault = (event: Event) => {
    // Prevent default button/link behavior during editing
    if (this.editingElement?.getAttribute("data-brakit-editing") === "true") {
      event.preventDefault();
    }
  };

  private preventClick = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  private handleBlur = () => {
    this.saveEdit();
  };

  private saveEdit() {
    if (!this.editingElement) return;

    const newDisplayText = this.editingElement.innerText.trim();
    const oldDisplayText = this.originalText.trim();
    const oldSourceText = (this.originalRawText || this.originalText).trim();

    // Validation: cannot be empty
    if (newDisplayText.length === 0) {
      logger.warn("Cannot save empty text, reverting");
      this.editingElement.innerText = this.originalText;
      this.cleanupEdit();

      // Show toast notification
      this.document.dispatchEvent(
        new CustomEvent("brakit:show-toast", {
          detail: {
            message: "⚠️ Text cannot be empty",
            type: "error",
            duration: 2000,
          },
        })
      );
      return;
    }

    if (newDisplayText !== oldDisplayText) {
      logger.info("Text changed", {
        old: oldDisplayText,
        new: newDisplayText,
      });

      if (this.onTextUpdate) {
        const metadata =
          this.originalMetadata ??
          buildSmartEditMetadata(this.editingElement, this.originalClassName);

        this.onTextUpdate({
          element: this.editingElement,
          oldText: oldSourceText,
          oldDisplayText: oldDisplayText,
          newText: newDisplayText,
          tag: metadata.elementTag || this.editingElement.tagName.toLowerCase(),
          file: metadata.filePath,
          className: metadata.className,
          elementTag: metadata.elementTag || this.editingElement.tagName.toLowerCase(),
          textContent: metadata.textContent || oldSourceText,
          ownerComponentName: metadata.ownerComponentName,
          ownerFilePath: metadata.ownerFilePath,
        });
      }
    }

    this.cleanupEdit();
  }

  private cancelEdit() {
    if (!this.editingElement) return;

    this.editingElement.innerText = this.originalText;
    this.cleanupEdit();
    logger.info("Edit cancelled");
  }

  private cleanupEdit() {
    if (!this.editingElement) return;

    const element = this.editingElement;
    this.editingElement = null;
    this.originalText = "";
    this.originalRawText = "";
    this.originalClassName = "";
    this.originalMetadata = null;

    element.contentEditable = "false";
    element.spellcheck = true;
    element.classList.remove("brakit-text-editing");
    element.removeAttribute("data-brakit-editing");
    element.removeEventListener("blur", this.handleBlur);
    element.removeEventListener("click", this.preventClick, true);
    element.removeEventListener("mousedown", this.preventDefault, true);
    element.style.pointerEvents = "";
    element.style.userSelect = "";
    element.style.cursor = "";
  }

  destroy() {
    this.deactivate();
    this.cancelEdit();
  }
}
