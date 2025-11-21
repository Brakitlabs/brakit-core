import { BaseTool } from "./BaseTool";
import { buildSmartEditMetadata } from "../../utils/elementMetadata";
import { DraggableOverlay } from "../../ui/DraggableOverlay";

type ColorFieldKey = "textColor" | "backgroundColor" | "hoverBackgroundColor";

const COLOR_FIELD_CONFIG: Record<
  ColorFieldKey,
  { type: "text" | "bg"; variant?: "hover" }
> = {
  textColor: { type: "text" },
  backgroundColor: { type: "bg" },
  hoverBackgroundColor: { type: "bg", variant: "hover" },
};

interface ColorToolOptions {
  document: Document;
  onColorUpdate?: (data: ColorUpdateData) => void;
}

export interface ColorUpdateData {
  element: HTMLElement;
  textColor?: {
    old: string;
    new: string;
  };
  backgroundColor?: {
    old: string;
    new: string;
  };
  hoverBackgroundColor?: {
    old: string;
    new: string;
  };
  text: string;
  tag: string;
  file: string;
  className: string;
  elementTag: string;
  textContent: string;
  ownerComponentName?: string;
  ownerFilePath?: string;
}

interface ColorState {
  textColor: string | null;
  backgroundColor: string | null;
  hoverBackgroundColor: string | null;
}

export class ColorTool extends BaseTool {
  private readonly onColorUpdate?: (data: ColorUpdateData) => void;
  private selectedElement: HTMLElement | null = null;
  private pickerContainer: HTMLElement | null = null;
  private pickerDragController: DraggableOverlay | null = null;
  private originalClasses: string = "";
  private currentState: ColorState = {
    textColor: null,
    backgroundColor: null,
    hoverBackgroundColor: null,
  };
  private pickerInputs: Partial<
    Record<
      ColorFieldKey,
      { colorInput: HTMLInputElement; hexInput: HTMLInputElement; preview: HTMLElement }
    >
  > = {};
  private previewState: "default" | "hover" = "default";
  private previewButtons?: { default: HTMLButtonElement; hover: HTMLButtonElement };
  private previewSwatches?: {
    default: { chip: HTMLElement; text: HTMLElement };
    hover: { chip: HTMLElement; text: HTMLElement };
  };

  constructor(options: ColorToolOptions) {
    super(options.document);
    this.onColorUpdate = options.onColorUpdate;
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
    // Color picker mode enabled
  }

  protected onDeactivate(options?: { preserveSelection?: boolean }): void {
    this.cleanup();
  }

  protected onDestroy(): void {
    this.cleanup();
  }

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.active || this.selectedElement) return;

    const candidate = this.resolveColorableElementAt(
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
    if (!this.active) return;

    // If clicking inside the color picker, don't do anything
    if (
      this.pickerContainer &&
      this.pickerContainer.contains(event.target as Node)
    ) {
      return;
    }

    const target = event.target as HTMLElement;
    if (this.shouldIgnoreClick(target)) {
      return;
    }

    const candidate = this.resolveColorableElementAt(
      event.clientX,
      event.clientY
    );
    if (!candidate) {
      return; // Don't close on random clicks
    }

    event.preventDefault();
    event.stopPropagation();
    this.selectElement(candidate);
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (!this.active) return;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (this.selectedElement) {
        this.cancelEdit();
      } else {
        this.cleanup();
      }
    }
  };

  private resolveColorableElementAt(x: number, y: number): HTMLElement | null {
    const raw = this.document.elementFromPoint(x, y) as HTMLElement | null;
    if (!raw) return null;

    const normalized = this.normalizeTarget(raw);
    if (!normalized) return null;

    return normalized;
  }

  private shouldIgnore(element: HTMLElement): boolean {
    return Boolean(
      this.shouldIgnoreOverlayElement(element) ||
        element.closest(".brakit-color-picker") ||
        element.tagName === "SVG" ||
        element.tagName === "PATH"
    );
  }

  private highlightElement(element: HTMLElement | null) {
    if (!element) return;
    element.style.outline = "2px solid #3b82f6";
    element.style.outlineOffset = "2px";
    element.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
  }

  private selectElement(element: HTMLElement) {
    if (this.pickerContainer) {
      this.cleanup();
    }

    this.selectedElement = element;
    this.originalClasses = element.className;
    this.currentState = this.detectCurrentColors(element);
    this.previewState = "default";
    this.clearHover();
    element.classList.add("brakit-color-editing");
    this.showPicker(element);
    this.applyPreview();
  }

  private detectCurrentColors(element: HTMLElement): ColorState {
    const classes = element.className
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);

    const textColor =
      classes.find(
        (c) => c.startsWith("text-") && !c.includes("/")
      ) || null;
    const bgColor =
      classes.find(
        (c) =>
          c.startsWith("bg-") &&
          !c.startsWith("bg-gradient")
      ) || null;

    const hoverBackgroundColor =
      classes.find(
        (c) => c.startsWith("hover:bg-")
      ) || null;

    return {
      textColor,
      backgroundColor: bgColor,
      hoverBackgroundColor,
    };
  }


  private showPicker(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const picker = this.createPickerUI(rect);
    this.pickerContainer = picker;
    this.document.body.appendChild(picker);
    this.positionPicker(picker, rect);
  }

  private positionPicker(picker: HTMLElement, rect: DOMRect) {
    const pickerWidth = 300;
    const pickerHeight = 400;
    const spacing = 20;
    const margin = 20;

    let left = rect.right + spacing;
    let top = rect.top;

    if (left + pickerWidth > window.innerWidth - margin) {
      left = rect.left - pickerWidth - spacing;
    }
    if (left < margin) {
      left = Math.max(margin, (window.innerWidth - pickerWidth) / 2);
    }
    if (top + pickerHeight > window.innerHeight - margin) {
      top = rect.top - pickerHeight - spacing;
    }
    if (top < margin) {
      top = Math.max(margin, (window.innerHeight - pickerHeight) / 2);
    }

    left = Math.max(
      margin,
      Math.min(left, window.innerWidth - pickerWidth - margin)
    );
    top = Math.max(
      margin,
      Math.min(top, window.innerHeight - pickerHeight - margin)
    );

    picker.style.top = `${top}px`;
    picker.style.left = `${left}px`;
  }

  private createPickerUI(rect: DOMRect): HTMLElement {
    const container = this.document.createElement("div");
    container.className = "brakit-color-picker";
    container.style.cssText = `
      position: fixed;
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(40px) saturate(180%);
      border-radius: 16px;
      padding: 16px 18px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.1);
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 300px;
      max-height: 400px;
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: grab;
      border: 1px solid rgba(0,0,0,0.1);
      user-select: none;
      pointer-events: auto;
    `;

    const header = this.createHeader();
    if (this.pickerDragController) {
      this.pickerDragController.destroy();
      this.pickerDragController = null;
    }
    container.appendChild(header);
    container.appendChild(this.createPreviewControls());
    container.appendChild(
      this.createColorBlock({
        title: "Text color",
        description: "Applies to labels and content.",
        key: "textColor",
      })
    );
    container.appendChild(
      this.createColorBlock({
        title: "Background color",
        description: "Default fill when the button is idle.",
        key: "backgroundColor",
        actions: [
          {
            label: "Use hover color",
            onClick: () =>
              this.copyColor("hoverBackgroundColor", "backgroundColor"),
          },
        ],
      })
    );
    container.appendChild(
      this.createColorBlock({
        title: "Hover background",
        description: "Color shown when the element is hovered.",
        key: "hoverBackgroundColor",
        actions: [
          {
            label: "Match default",
            onClick: () =>
              this.copyColor("backgroundColor", "hoverBackgroundColor"),
          },
        ],
      })
    );
    container.appendChild(this.createButtons());

    this.pickerDragController = new DraggableOverlay({
      element: container,
      handle: header,
      margin: 20,
      onDragStart: () => {
        container.style.cursor = "grabbing";
        container.style.userSelect = "none";
      },
      onDragEnd: () => {
        container.style.cursor = "grab";
        container.style.userSelect = "auto";
      },
    });

    return container;
  }

  private createHeader(): HTMLElement {
    const header = this.document.createElement("div");
    header.className = "brakit-picker-header";
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: grab;
      user-select: none;
    `;

    const dragHandle = this.document.createElement("div");
    dragHandle.style.cssText = `display: flex; align-items: center; gap: 8px;`;

    const handleIcon = this.document.createElement("span");
    handleIcon.innerHTML = "⋮⋮";
    handleIcon.style.cssText = `color: #9ca3af; font-size: 14px;`;

    const label = this.document.createElement("span");
    label.textContent = "Colors";
    label.style.cssText = `font-size: 13px; font-weight: 600; color: #374151;`;

    dragHandle.appendChild(handleIcon);
    dragHandle.appendChild(label);

    const closeBtn = this.document.createElement("button");
    closeBtn.innerHTML = "×";
    closeBtn.style.cssText = `
      background: none; border: none; font-size: 24px; color: #9ca3af;
      cursor: pointer; padding: 0; width: 24px; height: 24px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 4px; transition: all 0.2s;
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
    return header;
  }

  private createPreviewControls(): HTMLElement {
    const container = this.document.createElement("div");
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;

    const label = this.document.createElement("div");
    label.textContent = "Preview state";
    label.style.cssText = `
      font-size: 11px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    `;

    const toggleRow = this.document.createElement("div");
    toggleRow.style.cssText = `display: flex; gap: 8px;`;
    const defaultBtn = this.createPreviewButton("Default", "default");
    const hoverBtn = this.createPreviewButton("Hover", "hover");
    this.previewButtons = { default: defaultBtn, hover: hoverBtn };
    toggleRow.append(defaultBtn, hoverBtn);

    const swatchRow = this.document.createElement("div");
    swatchRow.style.cssText = `display: flex; gap: 12px;`;
    const defaultSwatch = this.createPreviewSwatch("Default state");
    const hoverSwatch = this.createPreviewSwatch("Hover state");
    this.previewSwatches = {
      default: defaultSwatch.refs,
      hover: hoverSwatch.refs,
    };
    swatchRow.append(defaultSwatch.element, hoverSwatch.element);

    container.append(label, toggleRow, swatchRow);
    this.updatePreviewButtons();
    this.updatePreviewSwatches();
    return container;
  }

  private createPreviewButton(
    label: string,
    mode: "default" | "hover"
  ): HTMLButtonElement {
    const button = this.document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.style.cssText = `
      flex: 1;
      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid #d1d5db;
      background: #f9fafb;
      color: #4b5563;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    button.onclick = (event) => {
      event.preventDefault();
      this.setPreviewState(mode);
    };
    return button;
  }

  private createPreviewSwatch(label: string): {
    element: HTMLElement;
    refs: { chip: HTMLElement; text: HTMLElement };
  } {
    const wrapper = this.document.createElement("div");
    wrapper.style.cssText = `
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #ffffff;
    `;

    const chip = this.document.createElement("div");
    chip.style.cssText = `
      width: 48px;
      height: 34px;
      border-radius: 8px;
      border: 1px solid #d1d5db;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
    `;

    const sample = this.document.createElement("span");
    sample.textContent = "Aa";
    sample.style.cssText = `font-weight: 600; font-size: 14px; color: #111827;`;
    chip.appendChild(sample);

    const textLabel = this.document.createElement("div");
    textLabel.textContent = label;
    textLabel.style.cssText = `
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    `;

    wrapper.append(chip, textLabel);
    return { element: wrapper, refs: { chip, text: sample } };
  }

  private createColorBlock(config: {
    title: string;
    description?: string;
    key: ColorFieldKey;
    actions?: { label: string; onClick: () => void }[];
  }): HTMLElement {
    const section = this.document.createElement("div");
    section.style.cssText = `display: flex; flex-direction: column; gap: 6px;`;

    const header = this.document.createElement("div");
    header.style.cssText = `display: flex; justify-content: space-between; align-items: center; gap: 8px;`;

    const title = this.document.createElement("div");
    title.textContent = config.title;
    title.style.cssText = `font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;`;
    header.appendChild(title);

    if (config.actions && config.actions.length > 0) {
      const actionsWrapper = this.document.createElement("div");
      actionsWrapper.style.cssText = `display: flex; gap: 6px;`;
      for (const action of config.actions) {
        const button = this.document.createElement("button");
        button.type = "button";
        button.textContent = action.label;
        button.style.cssText = `
          border: 1px solid #d1d5db;
          border-radius: 999px;
          background: #f9fafb;
          color: #4b5563;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        `;
        button.onclick = (event) => {
          event.preventDefault();
          action.onClick();
        };
        actionsWrapper.appendChild(button);
      }
      header.appendChild(actionsWrapper);
    }

    section.appendChild(header);

    if (config.description) {
      const description = this.document.createElement("div");
      description.textContent = config.description;
      description.style.cssText = `
        font-size: 12px;
        color: #9ca3af;
      `;
      section.appendChild(description);
    }

    section.appendChild(this.createColorPicker(config.key));
    return section;
  }

  private createColorPicker(key: ColorFieldKey): HTMLElement {
    const container = this.document.createElement("div");
    container.style.cssText = `display: flex; gap: 8px; align-items: center;`;

    const colorInput = this.document.createElement("input");
    colorInput.type = "color";
    colorInput.value = this.getCurrentColorHex(key);
    colorInput.style.cssText = `
      width: 48px; height: 48px; border: 2px solid #e5e7eb; border-radius: 12px;
      cursor: pointer; background: none; transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;

    const hexInput = this.document.createElement("input");
    hexInput.type = "text";
    hexInput.placeholder = "#000000";
    hexInput.value = this.getCurrentColorHex(key);
    hexInput.style.cssText = `
      flex: 1; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 8px;
      font-size: 14px; font-family: monospace; font-weight: 500;
      transition: all 0.2s ease; background: #fafafa;
    `;

    const colorPreview = this.document.createElement("div");
    colorPreview.style.cssText = `
      width: 40px; height: 40px; border-radius: 10px; border: 2px solid #e5e7eb;
      background: ${this.getCurrentColorHex(key)}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: all 0.2s ease; position: relative; overflow: hidden;
    `;

    // Add hover effects
    colorInput.addEventListener("mouseenter", () => {
      colorInput.style.borderColor = "#3b82f6";
      colorInput.style.transform = "scale(1.05)";
      colorInput.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
    });
    colorInput.addEventListener("mouseleave", () => {
      colorInput.style.borderColor = "#e5e7eb";
      colorInput.style.transform = "scale(1)";
      colorInput.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
    });

    hexInput.addEventListener("focus", () => {
      hexInput.style.borderColor = "#3b82f6";
      hexInput.style.background = "#ffffff";
      hexInput.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
    });
    hexInput.addEventListener("blur", () => {
      hexInput.style.borderColor = "#e5e7eb";
      hexInput.style.background = "#fafafa";
      hexInput.style.boxShadow = "none";
    });

    // Sync inputs
    const activatePreview = () => {
      if (key === "hoverBackgroundColor") {
        this.setPreviewState("hover");
      } else {
        this.setPreviewState("default");
      }
    };

    colorInput.addEventListener("focus", activatePreview);
    hexInput.addEventListener("focus", activatePreview);

    colorInput.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      const normalized = this.normalizeHex(target.value);
      if (!normalized) {
        return;
      }
      hexInput.value = normalized;
      colorPreview.style.background = normalized;
      this.updateColorState(normalized, key);
      this.applyPreview();
    });

    hexInput.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      const normalized = this.normalizeHex(target.value);
      if (normalized) {
        target.value = normalized;
        colorInput.value = normalized;
        colorPreview.style.background = normalized;
        this.updateColorState(normalized, key);
        this.applyPreview();
      }
    });

    container.appendChild(colorInput);
    container.appendChild(hexInput);
    container.appendChild(colorPreview);

    this.pickerInputs[key] = {
      colorInput,
      hexInput,
      preview: colorPreview,
    };

    return container;
  }


  private setPreviewState(mode: "default" | "hover") {
    if (this.previewState === mode) {
      return;
    }
    this.previewState = mode;
    this.updatePreviewButtons();
    this.applyPreview();
  }

  private updatePreviewButtons() {
    if (!this.previewButtons) return;
    for (const [mode, button] of Object.entries(this.previewButtons)) {
      if (!button) continue;
      const isActive = mode === this.previewState;
      button.style.background = isActive ? "#111827" : "#f9fafb";
      button.style.color = isActive ? "#ffffff" : "#4b5563";
      button.style.borderColor = isActive ? "#111827" : "#d1d5db";
    }
  }

  private updatePreviewSwatches() {
    if (!this.previewSwatches) return;
    this.updatePreviewSwatch("default");
    this.updatePreviewSwatch("hover");
  }

  private updatePreviewSwatch(mode: "default" | "hover") {
    if (!this.previewSwatches) return;
    const refs = this.previewSwatches[mode];
    if (!refs) return;

    const textKey: ColorFieldKey = "textColor";
    const bgKey =
      mode === "hover" ? "hoverBackgroundColor" : "backgroundColor";

    const textHex =
      this.getStateHex(textKey) ||
      this.getStateHex("textColor") ||
      "#111827";
    const bgHex =
      this.getStateHex(bgKey) ||
      this.getStateHex("backgroundColor") ||
      "#ffffff";

    refs.chip.style.background = bgHex;
    refs.text.style.color = textHex;
  }

  private createButtons(): HTMLElement {
    const buttons = this.document.createElement("div");
    buttons.style.cssText = `display: flex; gap: 8px; margin-top: 4px;`;

    const cancelBtn = this.document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `
      flex: 1; padding: 8px 16px; border: 1px solid #e5e7eb; background: white;
      color: #374151; border-radius: 6px; font-size: 13px; font-weight: 500;
      cursor: pointer; transition: all 0.2s;
    `;
    cancelBtn.onmouseover = () => {
      cancelBtn.style.background = "#f9fafb";
    };
    cancelBtn.onmouseout = () => {
      cancelBtn.style.background = "white";
    };
    cancelBtn.onclick = () => this.cancelEdit();

    const applyBtn = this.document.createElement("button");
    applyBtn.textContent = "Apply";
    applyBtn.style.cssText = `
      flex: 1; padding: 8px 16px; border: none; background: #3b82f6;
      color: white; border-radius: 6px; font-size: 13px; font-weight: 500;
      cursor: pointer; transition: all 0.2s;
    `;
    applyBtn.onmouseover = () => {
      applyBtn.style.background = "#2563eb";
    };
    applyBtn.onmouseout = () => {
      applyBtn.style.background = "#3b82f6";
    };
    applyBtn.onclick = () => this.saveColors();

    buttons.appendChild(cancelBtn);
    buttons.appendChild(applyBtn);
    return buttons;
  }


  private applyPreview() {
    if (!this.selectedElement) return;
    const useHover = this.previewState === "hover";
    const textHex = this.getStateHex("textColor");
    const bgHex =
      this.getStateHex(useHover ? "hoverBackgroundColor" : "backgroundColor") ||
      this.getStateHex("backgroundColor");

    this.selectedElement.style.color = textHex || "";
    this.selectedElement.style.backgroundColor = bgHex || "";
    this.updatePreviewSwatches();
  }

  private getCurrentColorHex(key: ColorFieldKey): string {
    const resolved = this.getStateHex(key);
    if (resolved) return resolved;
    if (key === "hoverBackgroundColor") {
      return this.getCurrentColorHex("backgroundColor");
    }
    return this.getDefaultHexForKey(key);
  }

  private getStateHex(key: ColorFieldKey): string | null {
    const currentColor = this.currentState[key];
    if (!currentColor) return null;
    if (currentColor.startsWith("#")) {
      return this.normalizeHex(currentColor);
    }
    return this.getHexFromClassName(currentColor);
  }

  private getDefaultHexForKey(key: ColorFieldKey): string {
    return key.includes("background") ? "#ffffff" : "#000000";
  }

  private updateColorState(value: string, key: ColorFieldKey) {
    const nextValue = this.normalizeHex(value) || value;
    this.currentState[key] = nextValue;
    this.refreshPickerInputs(key);
    this.updatePreviewSwatches();
    this.applyPreview();
  }

  private normalizeHex(hex: string): string | null {
    if (!hex) return null;
    const match = hex.trim().match(/^#?([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/);
    if (!match) return null;
    const value = match[1];
    const expanded =
      value.length === 3
        ? value
            .split("")
            .map((char) => char + char)
            .join("")
        : value;
    return `#${expanded.toLowerCase()}`;
  }

  private getHexFromClassName(className: string): string | null {
    const withoutVariant = className.startsWith("hover:")
      ? className.slice("hover:".length)
      : className;
    const match = withoutVariant.match(/^(?:text|bg)-(.*?)$/);
    if (!match) return null;

    const colorName = match[1];
    
    // Only support arbitrary hex values like text-[#ff0000]
    const arbitraryMatch = colorName.match(
      /^\[#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})\]$/
    );
    if (arbitraryMatch) {
      return this.normalizeHex(arbitraryMatch[1]) || null;
    }

    // For Tailwind named colors, we can't convert to hex without the palette
    // Just return null and let the color picker show a default
    return null;
  }

  private formatColorClass(value: string, key: ColorFieldKey): string {
    if (!value) return value;
    const config = COLOR_FIELD_CONFIG[key];
    if (!value.startsWith("#")) {
      if (config.variant && !value.startsWith(`${config.variant}:`)) {
        return `${config.variant}:${value}`;
      }
      return value;
    }
    const normalized = this.normalizeHex(value);
    if (!normalized) return value;
    const variantPrefix = config.variant ? `${config.variant}:` : "";
    return `${variantPrefix}${config.type}-[${normalized}]`;
  }

  private refreshPickerInputs(key: ColorFieldKey) {
    const refs = this.pickerInputs[key];
    if (!refs) return;
    const hex = this.getCurrentColorHex(key);
    refs.colorInput.value = hex;
    refs.hexInput.value = hex;
    refs.preview.style.background = hex;
  }

  private copyColor(from: ColorFieldKey, to: ColorFieldKey) {
    const value = this.getStateHex(from);
    if (!value) {
      return;
    }
    this.currentState[to] = value;
    this.refreshPickerInputs(to);
    this.updatePreviewSwatches();
    this.applyPreview();
  }

  private async saveColors() {
    if (!this.selectedElement) return;

    const originalState = this.detectCurrentColors({
      className: this.originalClasses,
    } as HTMLElement);
    const textChanged = this.currentState.textColor !== originalState.textColor;
    const bgChanged =
      this.currentState.backgroundColor !== originalState.backgroundColor;
    const hoverBgChanged =
      this.currentState.hoverBackgroundColor !==
      originalState.hoverBackgroundColor;

    if (!textChanged && !bgChanged && !hoverBgChanged) {
      this.cleanup();
      return;
    }

    if (this.onColorUpdate) {
      const metadata = buildSmartEditMetadata(
        this.selectedElement,
        this.originalClasses
      );

      const data: ColorUpdateData = {
        element: this.selectedElement,
        text: metadata.textContent || this.selectedElement.innerText.trim(),
        tag: metadata.elementTag || this.selectedElement.tagName.toLowerCase(),
        file: metadata.filePath,
        className: metadata.className,
        elementTag: metadata.elementTag || this.selectedElement.tagName.toLowerCase(),
        textContent: metadata.textContent || this.selectedElement.innerText.trim(),
        ownerComponentName: metadata.ownerComponentName,
        ownerFilePath: metadata.ownerFilePath,
      };

      if (textChanged) {
        data.textColor = {
          old: originalState.textColor || "",
          new: this.formatColorClass(this.currentState.textColor || "", "textColor"),
        };
      }

      if (bgChanged) {
        data.backgroundColor = {
          old: originalState.backgroundColor || "",
          new: this.formatColorClass(
            this.currentState.backgroundColor || "",
            "backgroundColor"
          ),
        };
      }

      if (hoverBgChanged) {
        data.hoverBackgroundColor = {
          old: originalState.hoverBackgroundColor || "",
          new: this.formatColorClass(
            this.currentState.hoverBackgroundColor || "",
            "hoverBackgroundColor"
          ),
        };
      }

      this.onColorUpdate(data);
    }

    this.clearInlineStyles();
    this.cleanup();
  }

  private clearInlineStyles() {
    if (!this.selectedElement) return;
    this.selectedElement.style.color = "";
    this.selectedElement.style.backgroundColor = "";
  }

  private cancelEdit() {
    if (!this.selectedElement) return;
    this.selectedElement.className = this.originalClasses;
    this.selectedElement.style.color = "";
    this.selectedElement.style.backgroundColor = "";
    this.cleanup();
  }

  private cleanup() {
    if (this.selectedElement) {
      this.selectedElement.classList.remove("brakit-color-editing");
      this.selectedElement.style.color = "";
      this.selectedElement.style.backgroundColor = "";
      this.selectedElement = null;
    }

    if (this.pickerDragController) {
      this.pickerDragController.destroy();
      this.pickerDragController = null;
    }

    if (this.pickerContainer) {
      this.pickerContainer.remove();
      this.pickerContainer = null;
    }

    this.originalClasses = "";
    this.pickerInputs = {};
    this.previewButtons = undefined;
    this.previewSwatches = undefined;
    this.previewState = "default";
  }

  destroy() {
    this.deactivate();
    this.cleanup();
  }
}
