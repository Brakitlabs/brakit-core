import { logger } from "../../utils/logger";
import { BaseTool } from "./BaseTool";
import { buildSmartEditMetadata } from "../../utils/elementMetadata";

interface FontSizeToolOptions {
  document: Document;
  onFontSizeUpdate?: (data: FontSizeUpdateData) => void;
}

export interface FontSizeUpdateData {
  element: HTMLElement;
  oldSize: string;
  newSize: string;
  text: string;
  tag: string;
  file: string;
  className: string;
  elementTag: string;
  textContent: string;
  ownerComponentName?: string;
  ownerFilePath?: string;
}

interface FontSizeOption {
  class: string;
  label: string;
  rem: number;
  px: number;
}

export class FontSizeTool extends BaseTool {
  private readonly onFontSizeUpdate?: (data: FontSizeUpdateData) => void;
  private selectedElement: HTMLElement | null = null;
  private sliderContainer: HTMLElement | null = null;
  private originalFontSize: string = "";
  private originalClassName: string = "";
  private isDraggingSlider = false;
  private sliderDragOffset = { x: 0, y: 0 };
  private sliderStyleElement: HTMLStyleElement | null = null;
  private measurementElement: HTMLElement | null = null;
  private originalInlineFontSize = "";
  private activeFontOption: FontSizeOption | null = null;
  private fallbackInlineActive = false;

  private readonly fontSizes: FontSizeOption[] = [
    { class: "text-xs", label: "XS", rem: 0.75, px: 12 },
    { class: "text-sm", label: "SM", rem: 0.875, px: 14 },
    { class: "text-base", label: "Base", rem: 1, px: 16 },
    { class: "text-lg", label: "LG", rem: 1.125, px: 18 },
    { class: "text-xl", label: "XL", rem: 1.25, px: 20 },
    { class: "text-2xl", label: "2XL", rem: 1.5, px: 24 },
    { class: "text-3xl", label: "3XL", rem: 1.875, px: 30 },
    { class: "text-4xl", label: "4XL", rem: 2.25, px: 36 },
    { class: "text-5xl", label: "5XL", rem: 3, px: 48 },
    { class: "text-6xl", label: "6XL", rem: 3.75, px: 60 },
  ];

  constructor(options: FontSizeToolOptions) {
    super(options.document);
    this.onFontSizeUpdate = options.onFontSizeUpdate;
  }

  protected onActivate(): void {
    logger.info("Font size mode enabled");
  }

  protected onDeactivate(options?: { preserveSelection?: boolean }): void {
    this.cleanup();
    logger.info("Font size mode disabled");
  }

  protected onDestroy(): void {
    this.cleanup();
  }

  protected attachListeners(): void {
    this.document.addEventListener("pointermove", this.handlePointerMove, true);
    this.document.addEventListener("click", this.handleClick, true);
    this.document.addEventListener("keydown", this.handleKeyDown, true);
    this.document.addEventListener("mousemove", this.handleSliderDragMove);
    this.document.addEventListener("mouseup", this.handleSliderDragEnd);
  }

  protected detachListeners(): void {
    this.document.removeEventListener(
      "pointermove",
      this.handlePointerMove,
      true
    );
    this.document.removeEventListener("click", this.handleClick, true);
    this.document.removeEventListener("keydown", this.handleKeyDown, true);
    this.document.removeEventListener("mousemove", this.handleSliderDragMove);
    this.document.removeEventListener("mouseup", this.handleSliderDragEnd);
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

    // Check for slider container clicks first
    if (
      this.sliderContainer &&
      this.sliderContainer.contains(event.target as Node)
    ) {
      return;
    }

    // Use shared click ignore logic from BaseTool
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

  private shouldIgnore(element: HTMLElement): boolean {
    return Boolean(
      this.shouldIgnoreOverlayElement(element) ||
        element.closest(".brakit-font-slider") ||
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

    element.style.outline = "2px solid #f59e0b";
    element.style.outlineOffset = "2px";
    element.style.backgroundColor = "rgba(245, 158, 11, 0.1)";
  }

  private selectElement(element: HTMLElement) {
    // Close any existing slider first
    if (this.sliderContainer) {
      this.cleanup();
    }

    this.selectedElement = element;
    this.originalFontSize = this.getCurrentFontSizeClass(element);
    this.originalClassName = element.className;
    this.originalInlineFontSize = element.style.fontSize || "";
    this.activeFontOption = this.fontSizes[this.getCurrentSizeIndex()];
    this.fallbackInlineActive = false;
    this.clearHover();

    element.classList.add("brakit-text-editing");

    this.showSlider(element);

    if (this.activeFontOption) {
      this.applyPreview(this.activeFontOption);
    }

    logger.info("Selected element for font size editing", {
      tag: element.tagName,
      currentSize: this.originalFontSize,
    });
  }

  private showSlider(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const slider = this.createSliderUI(rect);

    this.sliderContainer = slider;
    this.document.body.appendChild(slider);

    this.positionSlider(slider, rect);
  }

  private positionSlider(slider: HTMLElement, rect: DOMRect) {
    const sliderHeight = 70;
    const spacing = 10;

    let top = rect.top - sliderHeight - spacing;
    if (top < 0) {
      top = rect.bottom + spacing;
    }

    const left = Math.max(
      10,
      Math.min(rect.left, window.innerWidth - slider.offsetWidth - 10)
    );

    slider.style.top = `${top}px`;
    slider.style.left = `${left}px`;
  }

  private createSliderUI(rect: DOMRect): HTMLElement {
    const container = this.document.createElement("div");
    container.className = "brakit-font-slider";
    container.style.cssText = `
      position: fixed;
      top: ${rect.top - 70}px;
      left: ${rect.left}px;
      background: white;
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.1);
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 280px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: move;
    `;

    const header = this.document.createElement("div");
    header.className = "brakit-slider-header";
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: grab;
      user-select: none;
    `;

    // Add drag handle icon
    const dragHandle = this.document.createElement("div");
    dragHandle.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    const handleIcon = this.document.createElement("span");
    handleIcon.innerHTML = "⋮⋮";
    handleIcon.style.cssText = `
      color: #9ca3af;
      font-size: 14px;
      line-height: 1;
    `;

    const label = this.document.createElement("span");
    label.textContent = "Font Size";
    label.style.cssText = `
      font-size: 13px;
      font-weight: 600;
      color: #374151;
    `;

    dragHandle.appendChild(handleIcon);
    dragHandle.appendChild(label);

    const closeBtn = this.document.createElement("button");
    closeBtn.innerHTML = "×";
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      color: #9ca3af;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    `;
    closeBtn.onmouseover = () => {
      closeBtn.style.background = "#f3f4f6";
      closeBtn.style.color = "#374151";
    };
    closeBtn.onmouseout = () => {
      closeBtn.style.background = "none";
      closeBtn.style.color = "#9ca3af";
    };
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      this.cancelEdit();
    };

    header.appendChild(dragHandle);
    header.appendChild(closeBtn);

    // Make header draggable
    header.addEventListener("mousedown", this.handleSliderDragStart);

    container.appendChild(header);

    const sliderRow = this.document.createElement("div");
    sliderRow.style.cssText = `
      display: flex;
      gap: 12px;
      align-items: center;
    `;

    if (this.sliderStyleElement) {
      this.sliderStyleElement.remove();
      this.sliderStyleElement = null;
    }

    const slider = this.document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = String(this.fontSizes.length - 1);
    slider.value = String(this.getCurrentSizeIndex());
    slider.style.cssText = `
      flex: 1;
      height: 6px;
      border-radius: 3px;
      background: linear-gradient(to right, #dbeafe 0%, #3b82f6 100%);
      outline: none;
      -webkit-appearance: none;
      cursor: pointer;
    `;

    slider.style.setProperty("-webkit-appearance", "none");
    const sliderThumbStyle = `
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #3b82f6;
      cursor: pointer;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    `;
    const styleEl = this.document.createElement("style");
    styleEl.textContent = `
      .brakit-font-slider input[type="range"]::-webkit-slider-thumb { ${sliderThumbStyle} }
      .brakit-font-slider input[type="range"]::-moz-range-thumb { ${sliderThumbStyle} }
    `;
    this.document.head.appendChild(styleEl);
    this.sliderStyleElement = styleEl;

    const display = this.document.createElement("div");
    display.style.cssText = `
      min-width: 50px;
      text-align: center;
      font-size: 14px;
      font-weight: 600;
      color: #3b82f6;
    `;
    display.textContent = this.fontSizes[parseInt(slider.value)].label;

    slider.addEventListener("input", (e) => {
      const index = parseInt((e.target as HTMLInputElement).value);
      const newSize = this.fontSizes[index];
      display.textContent = newSize.label;
      this.activeFontOption = newSize;
      this.applyPreview(newSize);
    });

    sliderRow.appendChild(slider);
    sliderRow.appendChild(display);
    container.appendChild(sliderRow);

    const buttonRow = this.document.createElement("div");
    buttonRow.style.cssText = `
      display: flex;
      gap: 8px;
      margin-top: 4px;
    `;

    const cancelBtn = this.document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `
      flex: 1;
      padding: 8px 16px;
      border: 1px solid #e5e7eb;
      background: white;
      color: #374151;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    `;
    cancelBtn.onmouseover = () => {
      cancelBtn.style.background = "#f9fafb";
      cancelBtn.style.borderColor = "#d1d5db";
    };
    cancelBtn.onmouseout = () => {
      cancelBtn.style.background = "white";
      cancelBtn.style.borderColor = "#e5e7eb";
    };
    cancelBtn.onclick = (e) => {
      e.stopPropagation();
      this.cancelEdit();
    };

    const applyBtn = this.document.createElement("button");
    applyBtn.textContent = "Apply";
    applyBtn.style.cssText = `
      flex: 1;
      padding: 8px 16px;
      border: none;
      background: #3b82f6;
      color: white;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    `;
    applyBtn.onmouseover = () => {
      applyBtn.style.background = "#2563eb";
      applyBtn.style.transform = "translateY(-1px)";
    };
    applyBtn.onmouseout = () => {
      applyBtn.style.background = "#3b82f6";
      applyBtn.style.transform = "translateY(0)";
    };
    applyBtn.onclick = (e) => {
      e.stopPropagation();
      this.saveFontSize();
    };

    buttonRow.appendChild(cancelBtn);
    buttonRow.appendChild(applyBtn);
    container.appendChild(buttonRow);

    return container;
  }

  private getCurrentSizeIndex(): number {
    const element = this.selectedElement;
    if (!element) return 2;

    for (let i = 0; i < this.fontSizes.length; i++) {
      if (element.classList.contains(this.fontSizes[i].class)) {
        return i;
      }
    }

    const computed = window.getComputedStyle(element).fontSize;
    const px = parseFloat(computed);

    let closest = 0;
    let minDiff = Math.abs(this.fontSizes[0].px - px);
    for (let i = 1; i < this.fontSizes.length; i++) {
      const diff = Math.abs(this.fontSizes[i].px - px);
      if (diff < minDiff) {
        minDiff = diff;
        closest = i;
      }
    }
    return closest;
  }

  private getCurrentFontSizeClass(element: HTMLElement): string {
    for (const size of this.fontSizes) {
      if (element.classList.contains(size.class)) {
        return size.class;
      }
    }
    return "text-base";
  }

  private ensureMeasurementElement(): HTMLElement | null {
    if (this.measurementElement && this.measurementElement.isConnected) {
      return this.measurementElement;
    }

    if (!this.document.body) {
      return null;
    }

    const element = this.document.createElement("span");
    element.textContent = "M";
    element.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      z-index: -1;
      font-size: 1rem;
    `;

    this.document.body.appendChild(element);
    this.measurementElement = element;
    return element;
  }

  private getRootFontSizePx(): number {
    const root = this.document.documentElement;
    const computed = root ? window.getComputedStyle(root).fontSize : null;
    const parsed = computed ? parseFloat(computed) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 16;
  }

  private classSupportsFontSize(option: FontSizeOption): boolean {
    const measurement = this.ensureMeasurementElement();
    if (!measurement) {
      return true;
    }

    measurement.className = "";
    measurement.classList.add(option.class);

    const computed = window.getComputedStyle(measurement).fontSize;
    const measuredPx = computed ? parseFloat(computed) : NaN;
    measurement.className = "";

    if (!Number.isFinite(measuredPx)) {
      return false;
    }

    const expectedPx = option.rem * this.getRootFontSizePx();
    return Math.abs(measuredPx - expectedPx) < 0.75;
  }

  private applyInlineFallback(
    element: HTMLElement,
    option: FontSizeOption
  ): void {
    element.dataset.brakitFontFallback = option.class;
    element.style.fontSize = `${option.rem}rem`;
    this.fallbackInlineActive = true;
  }

  private clearInlineFallback(element: HTMLElement, originalInline: string) {
    delete element.dataset.brakitFontFallback;
    if (originalInline) {
      element.style.fontSize = originalInline;
    } else {
      element.style.removeProperty("font-size");
    }
    this.fallbackInlineActive = false;
  }

  private applyPreview(option: FontSizeOption) {
    if (!this.selectedElement) return;

    this.fontSizes.forEach((size) => {
      this.selectedElement?.classList.remove(size.class);
    });

    this.selectedElement.classList.add(option.class);
    this.activeFontOption = option;

    const supportsClass = this.classSupportsFontSize(option);
    if (supportsClass) {
      this.clearInlineFallback(
        this.selectedElement,
        this.originalInlineFontSize
      );
    } else {
      this.applyInlineFallback(this.selectedElement, option);
    }
  }

  private async saveFontSize() {
    if (!this.selectedElement) return;

    const newSizeClass =
      this.fontSizes.find((s) =>
        this.selectedElement?.classList.contains(s.class)
      )?.class || "text-base";

    if (newSizeClass === this.originalFontSize) {
      logger.info("Font size unchanged, skipping save");
      this.cleanup();
      return;
    }

    logger.info("Saving font size change", {
      old: this.originalFontSize,
      new: newSizeClass,
    });

    if (this.onFontSizeUpdate) {
      const metadata = buildSmartEditMetadata(
        this.selectedElement,
        this.originalClassName
      );

      this.onFontSizeUpdate({
        element: this.selectedElement,
        oldSize: this.originalFontSize,
        newSize: newSizeClass,
        text: metadata.textContent || this.selectedElement.innerText.trim(),
        tag: metadata.elementTag || this.selectedElement.tagName.toLowerCase(),
        file: metadata.filePath,
        className: metadata.className,
        elementTag: metadata.elementTag || this.selectedElement.tagName.toLowerCase(),
        textContent: metadata.textContent || this.selectedElement.innerText.trim(),
        ownerComponentName: metadata.ownerComponentName,
        ownerFilePath: metadata.ownerFilePath,
      });
    }

    const element = this.selectedElement;
    const originalInline = this.originalInlineFontSize;
    const fallbackActive = this.fallbackInlineActive;
    const activeOption = this.activeFontOption;

    const shouldScheduleCleanup =
      fallbackActive && element && activeOption && originalInline === "";

    if (shouldScheduleCleanup && element && activeOption) {
      this.scheduleFallbackCleanup(element, activeOption);
    }

    this.cleanup({ preserveInline: fallbackActive });
  }

  private cancelEdit() {
    if (!this.selectedElement) return;

    this.fontSizes.forEach((size) => {
      this.selectedElement?.classList.remove(size.class);
    });

    if (this.originalFontSize) {
      this.selectedElement.classList.add(this.originalFontSize);
    }

    this.cleanup();
    logger.info("Font size edit cancelled");
  }

  private cleanup(options?: { preserveInline?: boolean }) {
    if (this.selectedElement) {
      const element = this.selectedElement;
      element.classList.remove("brakit-text-editing");
      if (!options?.preserveInline) {
        delete element.dataset.brakitFontFallback;
        if (this.originalInlineFontSize) {
          element.style.fontSize = this.originalInlineFontSize;
        } else {
          element.style.removeProperty("font-size");
        }
      }
      this.selectedElement = null;
    }

    this.fallbackInlineActive = false;
    this.activeFontOption = null;
    if (this.sliderContainer) {
      const header = this.sliderContainer.querySelector(
        ".brakit-slider-header"
      );
      if (header) {
        header.removeEventListener(
          "mousedown",
          this.handleSliderDragStart as EventListener
        );
      }
      this.sliderContainer.remove();
      this.sliderContainer = null;
    }

    if (this.sliderStyleElement) {
      this.sliderStyleElement.remove();
      this.sliderStyleElement = null;
    }

    this.originalFontSize = "";
    this.originalClassName = "";
    this.originalInlineFontSize = "";
  }

  private scheduleFallbackCleanup(
    element: HTMLElement,
    option: FontSizeOption
  ): void {
    let attempts = 0;
    const maxAttempts = 12;

    const checkSupport = () => {
      if (!element.isConnected) {
        return;
      }

      if (this.classSupportsFontSize(option)) {
        delete element.dataset.brakitFontFallback;
        element.style.removeProperty("font-size");
        return;
      }

      attempts += 1;
      if (attempts < maxAttempts) {
        window.setTimeout(checkSupport, 1200);
      }
    };

    window.setTimeout(checkSupport, 1200);
  }

  private handleSliderDragStart = (e: MouseEvent) => {
    if (!this.sliderContainer) return;

    // Don't drag if clicking on buttons or inputs
    const target = e.target as HTMLElement;
    if (target.tagName === "BUTTON" || target.tagName === "INPUT") {
      return;
    }

    this.isDraggingSlider = true;

    const rect = this.sliderContainer.getBoundingClientRect();
    this.sliderDragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    this.sliderContainer.style.cursor = "grabbing";
    const header = this.sliderContainer.querySelector(
      ".brakit-slider-header"
    ) as HTMLElement;
    if (header) {
      header.style.cursor = "grabbing";
    }

    this.document.addEventListener("mousemove", this.handleSliderDragMove);
    this.document.addEventListener("mouseup", this.handleSliderDragEnd);
  };

  private handleSliderDragMove = (e: MouseEvent) => {
    if (!this.isDraggingSlider || !this.sliderContainer) return;

    const x = e.clientX - this.sliderDragOffset.x;
    const y = e.clientY - this.sliderDragOffset.y;

    // Keep within viewport bounds
    const maxX = window.innerWidth - this.sliderContainer.offsetWidth;
    const maxY = window.innerHeight - this.sliderContainer.offsetHeight;

    const boundedX = Math.max(10, Math.min(x, maxX));
    const boundedY = Math.max(10, Math.min(y, maxY));

    this.sliderContainer.style.left = `${boundedX}px`;
    this.sliderContainer.style.top = `${boundedY}px`;
  };

  private handleSliderDragEnd = () => {
    if (!this.isDraggingSlider) return;

    this.isDraggingSlider = false;

    if (this.sliderContainer) {
      this.sliderContainer.style.cursor = "move";
      const header = this.sliderContainer.querySelector(
        ".brakit-slider-header"
      ) as HTMLElement;
      if (header) {
        header.style.cursor = "grab";
      }
    }

    this.document.removeEventListener("mousemove", this.handleSliderDragMove);
    this.document.removeEventListener("mouseup", this.handleSliderDragEnd);
  };

  destroy() {
    this.deactivate();
    this.cleanup();
    if (this.measurementElement) {
      this.measurementElement.remove();
      this.measurementElement = null;
    }
  }
}
