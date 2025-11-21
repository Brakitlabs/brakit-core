import { logger } from "../../utils/logger";
import { BaseTool } from "./BaseTool";
import { buildSmartEditMetadata } from "../../utils/elementMetadata";
import {
  FONT_FAMILY_OPTIONS,
  FontFamilyOption,
  findFontOptionByClass,
  getDefaultFontOption,
} from "../../shared/fontFamilies";
import { DraggableOverlay } from "../../ui/DraggableOverlay";

interface FontFamilyToolOptions {
  document: Document;
  onFontFamilyUpdate?: (data: FontFamilyUpdateData) => void;
}

export interface FontFamilyUpdateData {
  element: HTMLElement;
  oldFont: string;
  newFont: string;
  text: string;
  tag: string;
  file: string;
  className: string;
  elementTag: string;
  textContent: string;
  ownerComponentName?: string;
  ownerFilePath?: string;
}

export class FontFamilyTool extends BaseTool {
  private readonly onFontFamilyUpdate?: (data: FontFamilyUpdateData) => void;
  private selectedElement: HTMLElement | null = null;
  private panel: HTMLElement | null = null;
  private panelDragController: DraggableOverlay | null = null;
  private optionButtons: Map<string, HTMLButtonElement> = new Map();

  private originalClassName = "";
  private originalInlineFontFamily = "";
  private originalFontOption: FontFamilyOption | null = null;
  private activeOption: FontFamilyOption | null = null;

  constructor(options: FontFamilyToolOptions) {
    super(options.document);
    this.onFontFamilyUpdate = options.onFontFamilyUpdate;
  }

  protected onActivate(): void {
    logger.info("Font family mode enabled");
  }

  protected onDeactivate(options?: { preserveSelection?: boolean }): void {
    if (!options?.preserveSelection) {
      this.cleanup();
    }
    logger.info("Font family mode disabled");
  }

  protected onDestroy(): void {
    this.cleanup();
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

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.active || this.selectedElement) return;

    const candidate = this.resolveTextElementAt(event.clientX, event.clientY);
    if (candidate !== this.hoveredElement) {
      this.clearHover();
      this.hoveredElement = candidate;
      this.highlightElement(candidate);
    }
  };

  private handleClick = (event: MouseEvent) => {
    if (!this.active) return;

    if (this.panel && this.panel.contains(event.target as Node)) {
      return;
    }

    const target = event.target as HTMLElement;
    if (this.shouldIgnoreClick(target)) {
      return;
    }

    const candidate = this.resolveTextElementAt(event.clientX, event.clientY);
    if (!candidate) {
      this.cleanup();
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.selectElement(candidate);
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (!this.active || !this.selectedElement) return;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.cancelEdit();
    } else if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      this.saveFontFamily();
    }
  };

  private resolveTextElementAt(x: number, y: number): HTMLElement | null {
    const raw = this.document.elementFromPoint(x, y) as HTMLElement | null;
    if (!raw) return null;

    const normalized = this.normalizeTarget(raw);
    if (!normalized) return null;

    if (!this.hasEditableText(normalized)) return null;

    return normalized;
  }

  private hasEditableText(element: HTMLElement): boolean {
    const text = element.innerText?.trim();
    return typeof text === "string" && text.length > 0;
  }

  private highlightElement(element: HTMLElement | null) {
    if (!element) return;

    element.style.outline = "2px solid #6366f1";
    element.style.outlineOffset = "2px";
    element.style.backgroundColor = "rgba(99, 102, 241, 0.08)";
  }

  private selectElement(element: HTMLElement) {
    if (this.panel) {
      this.cleanup();
    }

    this.selectedElement = element;
    this.originalClassName = element.className;
    this.originalInlineFontFamily = element.style.fontFamily;
    this.originalFontOption = findFontOptionByClass(element.classList) || null;
    this.activeOption = this.originalFontOption ?? getDefaultFontOption();
    this.clearHover();

    element.classList.add("brakit-text-editing");

    this.showPanel(element);
    this.applyPreview(this.activeOption);

    logger.info("Selected element for font family editing", {
      tag: element.tagName,
      currentFont: this.originalFontOption?.className ?? "none",
    });
  }

  private showPanel(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const panel = this.document.createElement("div");
    panel.className = "brakit-font-family-panel";
    panel.style.cssText = `
      position: fixed;
      top: ${rect.bottom + 12}px;
      left: ${Math.max(
        12,
        Math.min(rect.left, window.innerWidth - 320 - 12)
      )}px;
      width: 320px;
      background: rgba(255, 255, 255, 0.96);
      border-radius: 16px;
      box-shadow:
        0 16px 32px rgba(79, 70, 229, 0.18),
        0 6px 16px rgba(30, 41, 59, 0.12),
        inset 0 0 0 0.5px rgba(79, 70, 229, 0.08);
      z-index: 999999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    `;

    const header = this.document.createElement("div");
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px 12px;
      cursor: grab;
      user-select: none;
      gap: 12px;
      background: linear-gradient(180deg, rgba(99,102,241,0.08), transparent);
    `;

    const title = this.document.createElement("div");
    title.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 2px;
    `;

    const titleLabel = this.document.createElement("span");
    titleLabel.textContent = "Font Family";
    titleLabel.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      color: #312e81;
    `;

    const subtitle = this.document.createElement("span");
    subtitle.textContent = "Choose a font style for the selected text.";
    subtitle.style.cssText = `
      font-size: 12px;
      color: #6b7280;
    `;

    title.appendChild(titleLabel);
    title.appendChild(subtitle);

    const closeBtn = this.document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "×";
    closeBtn.style.cssText = `
      border: none;
      background: rgba(99,102,241,0.08);
      color: #4338ca;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    `;
    closeBtn.onmouseover = () => {
      closeBtn.style.background = "rgba(99,102,241,0.16)";
    };
    closeBtn.onmouseout = () => {
      closeBtn.style.background = "rgba(99,102,241,0.08)";
    };
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      this.cancelEdit();
    };

    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const list = this.document.createElement("div");
    list.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 0 18px 12px;
      max-height: 220px;
      overflow-y: auto;
    `;

    FONT_FAMILY_OPTIONS.forEach((option) => {
      const button = this.document.createElement("button");
      button.type = "button";
      button.dataset.fontOption = option.id;
      button.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid transparent;
        background: rgba(248, 250, 252, 0.8);
        cursor: pointer;
        transition: all 0.18s ease;
        text-align: left;
        gap: 12px;
      `;

      button.onmouseover = () => {
        if (button.classList.contains("active")) {
          return;
        }
        button.style.background = "rgba(236, 242, 255, 0.9)";
      };
      button.onmouseout = () => {
        if (button.classList.contains("active")) {
          return;
        }
        button.style.background = "rgba(248, 250, 252, 0.8)";
      };

      const labelContainer = this.document.createElement("div");
      labelContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 2px;
      `;

      const label = this.document.createElement("span");
      label.textContent = option.label;
      label.style.cssText = `
        font-size: 13px;
        font-weight: 600;
        color: #111827;
      `;

      const description = this.document.createElement("span");
      description.textContent =
        option.description ?? option.previewFamily.split(",")[0];
      description.style.cssText = `
        font-size: 11px;
        color: #6b7280;
      `;

      labelContainer.appendChild(label);
      labelContainer.appendChild(description);

      const preview = this.document.createElement("span");
      preview.textContent = "Aa";
      preview.style.cssText = `
        font-size: 20px;
        font-weight: 500;
        color: #4338ca;
      `;
      preview.style.fontFamily = option.previewFamily;

      button.appendChild(labelContainer);
      button.appendChild(preview);

      button.onclick = (e) => {
        e.stopPropagation();
        this.setActiveOption(option);
      };

      if (this.activeOption && option.id === this.activeOption.id) {
        this.markButtonActive(button);
      }

      list.appendChild(button);
      this.optionButtons.set(option.id, button);
    });

    panel.appendChild(list);

    const footer = this.document.createElement("div");
    footer.style.cssText = `
      display: flex;
      gap: 10px;
      padding: 10px 18px 16px;
      border-top: 1px solid rgba(148, 163, 184, 0.18);
      background: rgba(248, 250, 252, 0.9);
    `;

    const cancelBtn = this.document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `
      flex: 1;
      border: 1px solid rgba(148, 163, 184, 0.5);
      background: white;
      color: #1f2937;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      padding: 10px;
      cursor: pointer;
      transition: all 0.18s ease;
    `;
    cancelBtn.onmouseover = () => {
      cancelBtn.style.background = "#f9fafb";
    };
    cancelBtn.onmouseout = () => {
      cancelBtn.style.background = "white";
    };
    cancelBtn.onclick = (e) => {
      e.stopPropagation();
      this.cancelEdit();
    };

    const applyBtn = this.document.createElement("button");
    applyBtn.type = "button";
    applyBtn.textContent = "Apply";
    applyBtn.style.cssText = `
      flex: 1;
      border: none;
      background: #6366f1;
      color: white;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      padding: 10px;
      cursor: pointer;
      transition: all 0.18s ease;
      box-shadow: 0 8px 14px rgba(99, 102, 241, 0.25);
    `;
    applyBtn.onmouseover = () => {
      applyBtn.style.background = "#4f46e5";
      applyBtn.style.transform = "translateY(-1px)";
    };
    applyBtn.onmouseout = () => {
      applyBtn.style.background = "#6366f1";
      applyBtn.style.transform = "translateY(0)";
    };
    applyBtn.onclick = (e) => {
      e.stopPropagation();
      this.saveFontFamily();
    };

    footer.appendChild(cancelBtn);
    footer.appendChild(applyBtn);
    panel.appendChild(footer);

    this.document.body.appendChild(panel);
    this.panel = panel;

    this.panelDragController = new DraggableOverlay({
      element: panel,
      handle: header,
      margin: 12,
    });
  }

  private setActiveOption(option: FontFamilyOption) {
    if (!this.selectedElement) return;

    this.activeOption = option;

    this.optionButtons.forEach((btn, id) => {
      if (id === option.id) {
        this.markButtonActive(btn);
      } else {
        btn.classList.remove("active");
        btn.style.background = "rgba(248, 250, 252, 0.8)";
        btn.style.borderColor = "transparent";
        btn.style.color = "#111827";
      }
    });

    this.applyPreview(option);
  }

  private markButtonActive(button: HTMLButtonElement) {
    button.classList.add("active");
    button.style.background = "rgba(99,102,241,0.12)";
    button.style.borderColor = "rgba(99,102,241,0.35)";
  }

  private applyPreview(option: FontFamilyOption | null) {
    if (!this.selectedElement || !option) return;

    FONT_FAMILY_OPTIONS.forEach((opt) => {
      if (opt.className) {
        this.selectedElement?.classList.remove(opt.className);
      }
    });

    if (option.className) {
      this.selectedElement.classList.add(option.className);
    }

    if (option.previewFamily) {
      this.selectedElement.style.fontFamily = option.previewFamily;
    }
  }

  private saveFontFamily() {
    if (!this.selectedElement || !this.activeOption) return;

    const newClass = this.activeOption.className;
    const oldClass = this.originalFontOption?.className ?? "";

    if (newClass === oldClass) {
      logger.info("Font family unchanged, skipping save");
      this.cleanup();
      return;
    }

    logger.info("Saving font family change", {
      old: oldClass || "none",
      new: newClass,
    });

    if (this.onFontFamilyUpdate) {
      const metadata = buildSmartEditMetadata(
        this.selectedElement,
        this.originalClassName
      );

      this.onFontFamilyUpdate({
        element: this.selectedElement,
        oldFont: oldClass,
        newFont: newClass,
        text: metadata.textContent || this.selectedElement.innerText.trim(),
        tag: metadata.elementTag || this.selectedElement.tagName.toLowerCase(),
        file: metadata.filePath,
        className: metadata.className,
        elementTag:
          metadata.elementTag || this.selectedElement.tagName.toLowerCase(),
        textContent:
          metadata.textContent || this.selectedElement.innerText.trim(),
        ownerComponentName: metadata.ownerComponentName,
        ownerFilePath: metadata.ownerFilePath,
      });
    }

    this.cleanup();
  }

  private cancelEdit() {
    if (!this.selectedElement) return;

    this.selectedElement.className = this.originalClassName;
    this.selectedElement.style.fontFamily = this.originalInlineFontFamily;
    this.cleanup();
    logger.info("Font family edit cancelled");
  }

  private cleanup() {
    if (this.selectedElement) {
      this.selectedElement.classList.remove("brakit-text-editing");
      this.selectedElement.style.fontFamily = this.originalInlineFontFamily;
      this.selectedElement = null;
    }

    if (this.panelDragController) {
      this.panelDragController.destroy();
      this.panelDragController = null;
    }

    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }

    this.optionButtons.clear();
    this.originalClassName = "";
    this.originalInlineFontFamily = "";
    this.originalFontOption = null;
    this.activeOption = null;
  }
}
