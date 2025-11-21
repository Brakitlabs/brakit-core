import { logger } from "../../utils/logger";
import { DeleteConfirmationDialog } from "../../components/DeleteConfirmationDialog";
import { DialogInitializer } from "../../utils/dialogInitializer";
import { BaseTool } from "./BaseTool";
import { buildSmartEditMetadata } from "../../utils/elementMetadata";

export interface DeleteElementData {
  file: string;
  tag: string;
  text: string;
  identifier: string;
  element: HTMLElement;
  className: string;
  elementTag: string;
  textContent: string;
  ownerComponentName?: string;
  ownerFilePath?: string;
}

interface DeleteToolOptions {
  document: Document;
  onDeleteElement?: (data: DeleteElementData) => void;
}

export class DeleteTool extends BaseTool {
  private readonly options: DeleteToolOptions;
  private selectedElement: HTMLElement | null = null;
  private confirmationDialog: DeleteConfirmationDialog | null = null;
  private pendingDeleteData: DeleteElementData | null = null;
  private dialogOpen = false;

  constructor(options: DeleteToolOptions) {
    super(options.document);
    this.options = options;
    this.initializeDialog();
  }

  protected attachListeners(): void {
    this.document.addEventListener("pointermove", this.handlePointerMove, true);
    this.document.addEventListener("click", this.handleClick, true);
    this.document.addEventListener("keydown", this.handleKeyDown, true);
  }

  protected detachListeners(): void {
    this.document.removeEventListener(
      "pointermove",
      this.handlePointerMove,
      true
    );
    this.document.removeEventListener("click", this.handleClick, true);
    this.document.removeEventListener("keydown", this.handleKeyDown, true);
  }

  protected onActivate(): void {
    logger.debug("Delete mode enabled");
  }

  protected onDeactivate(options?: { preserveSelection?: boolean }): void {
    this.cleanup();
    logger.debug("Delete mode disabled");
  }

  protected onDestroy(): void {
    this.cleanup();

    if (this.confirmationDialog) {
      this.confirmationDialog.remove();
      this.confirmationDialog = null;
    }
  }

  private initializeDialog() {
    this.confirmationDialog = new DeleteConfirmationDialog();

    DialogInitializer.appendToBodySafe(
      this.document,
      this.confirmationDialog,
      "DeleteTool"
    );
    this.setupDialogEventListeners();
  }

  private setupDialogEventListeners() {
    if (this.confirmationDialog) {
      this.confirmationDialog.addEventListener("brakit-delete-confirm", () => {
        this.handleDeleteConfirm();
      });

      this.confirmationDialog.addEventListener("brakit-delete-cancel", () => {
        this.handleDeleteCancel();
      });
    }
  }

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.active || this.selectedElement || this.dialogOpen) return;

    const target = event.target as HTMLElement;
    if (this.shouldIgnoreClick(target)) {
      this.clearHover();
      return;
    }

    const candidate = this.resolveDeletableElementAt(
      event.clientX,
      event.clientY
    );

    if (candidate !== this.hoveredElement) {
      this.clearHover();
      this.hoveredElement = candidate;
      this.highlightElement(candidate);
    }
  };

  private handleClick = (event: MouseEvent) => {
    if (!this.active || this.dialogOpen) return;

    const target = event.target as HTMLElement;
    if (this.shouldIgnoreClick(target)) {
      return;
    }

    const candidate = this.resolveDeletableElementAt(
      event.clientX,
      event.clientY
    );

    if (!candidate) {
      this.cleanup();
      return;
    }

    this.preventEvent(event);
    this.selectElement(candidate);
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (!this.active) return;

    this.handleEscapeKey(event, () => {
      if (this.selectedElement) {
        this.cancelDelete();
      } else {
        this.deactivate();
      }
    });
  };

  private resolveDeletableElementAt(x: number, y: number): HTMLElement | null {
    const raw = this.document.elementFromPoint(x, y) as HTMLElement | null;
    if (!raw) return null;

    const normalized = this.normalizeTarget(raw);
    if (!normalized) return null;

    return normalized;
  }

  private shouldIgnore(element: HTMLElement): boolean {
    return this.shouldIgnoreOverlayElement(element);
  }

  private highlightElement(element: HTMLElement | null) {
    if (!element) return;

    element.style.outline = "2px solid #dc2626";
    element.style.outlineOffset = "2px";
    element.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
  }

  private selectElement(element: HTMLElement) {
    this.selectedElement = element;
    this.highlightElement(element);

    this.showDeleteConfirmation(element);
  }

  private showDeleteConfirmation(element: HTMLElement) {
    if (this.shouldIgnore(element)) {
      logger.warn("[DeleteTool] Attempted to delete overlay element, ignoring");
      return;
    }

    const metadata = buildSmartEditMetadata(element);
    let componentName = element.tagName.toLowerCase();

    if (componentName.toLowerCase() === "segmentviewnode") {
      componentName = element.tagName.toLowerCase();
    }

    const lowerName = componentName.toLowerCase();
    if (lowerName.includes("overlay") || lowerName.includes("toolbar")) {
      logger.warn(
        `[DeleteTool] Attempted to delete overlay component (${componentName}), ignoring`
      );
      return;
    }

    // Extract text content for identifier
    const primaryText = metadata.textContent || element.textContent?.trim() || "";
    const identifier =
      primaryText.length > 50
        ? `${primaryText.substring(0, 50)}...`
        : primaryText;

    // Try to determine the current page file from the URL
    const currentPageFile = this.getCurrentPageFile();

    this.pendingDeleteData = {
      file: metadata.filePath || currentPageFile || "unknown",
      tag: componentName,
      text: identifier,
      identifier: identifier,
      element,
      className: metadata.className,
      elementTag: metadata.elementTag || componentName,
      textContent: metadata.textContent || identifier,
      ownerComponentName: metadata.ownerComponentName,
      ownerFilePath: metadata.ownerFilePath,
    };

    if (this.confirmationDialog) {
      this.dialogOpen = true;
      this.confirmationDialog.openDialog({
        componentName,
        elementText: identifier,
        filePath: this.pendingDeleteData.file,
        elementPreview: element.outerHTML.substring(0, 200) + "...",
      });
    }
  }

  private handleDeleteConfirm() {
    this.dialogOpen = false;

    if (this.pendingDeleteData && this.options.onDeleteElement) {
      this.options.onDeleteElement(this.pendingDeleteData);
    }

    this.cleanup();
  }

  private handleDeleteCancel() {
    this.dialogOpen = false;
    this.cleanup();
  }

  private getCurrentPageFile(): string | null {
    try {
      const pathname =
        this.document.location?.pathname || window.location?.pathname;
      if (!pathname) return null;

      let filePath =
        pathname === "/" ? "page.tsx" : `${pathname.substring(1)}/page.tsx`;

      logger.debug(`[DeleteTool] Inferred file path from URL: ${filePath}`);
      return filePath;
    } catch (error) {
      logger.warn("[DeleteTool] Failed to determine current page file:", error);
      return null;
    }
  }

  private cancelDelete() {
    this.selectedElement = null;
    this.clearHover();
    this.pendingDeleteData = null;

    if (this.confirmationDialog) {
      this.confirmationDialog.closeDialog();
    }
    this.dialogOpen = false;
  }

  private cleanup() {
    this.selectedElement = null;
    this.clearHover();
    this.pendingDeleteData = null;

    if (this.confirmationDialog) {
      this.confirmationDialog.closeDialog();
    }
    this.dialogOpen = false;
  }
}
