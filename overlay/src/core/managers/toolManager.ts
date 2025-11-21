import { TextEditTool, TextUpdateData } from "../tools/textEditTool";
import { FontSizeTool, FontSizeUpdateData } from "../tools/fontSizeTool";
import { FontFamilyTool, FontFamilyUpdateData } from "../tools/fontFamilyTool";
import { ColorTool, ColorUpdateData } from "../tools/colorTool";
import { DeleteTool, DeleteElementData } from "../tools/deleteTool";
import { logger } from "../../utils/logger";
import { ElementPayloadService } from "../../payload/ElementPayloadService";
import { getElementInfo } from "../../utils/reactSource";
import {
  sanitizeElementDetails,
  type SanitizedElementInfo,
} from "../processors/selection";

export enum Tool {
  Text = "text",
  FontSize = "fontSize",
  FontFamily = "fontFamily",
  Color = "color",
  Delete = "delete",
}

type ToolKind = Tool | null;

interface ToolManagerOptions {
  document: Document;
  payloadService: ElementPayloadService;
  onTextUpdate?: (data: TextUpdateData) => void;
  onFontSizeUpdate?: (data: FontSizeUpdateData) => void;
  onFontFamilyUpdate?: (data: FontFamilyUpdateData) => void;
  onColorUpdate?: (data: ColorUpdateData) => void;
  onDeleteElement?: (data: DeleteElementData) => void;
}

export class ToolManager {
  private readonly document: Document;
  private readonly payloadService: ElementPayloadService;
  readonly options: ToolManagerOptions;

  private textEditTool: TextEditTool;
  private fontSizeTool: FontSizeTool;
  private fontFamilyTool: FontFamilyTool;
  private colorTool: ColorTool;
  private deleteTool: DeleteTool;
  private currentTool: ToolKind | null = null;
  private toolActive = false;
  private selectedElement: HTMLElement | null = null;
  private selectedElementInfo: SanitizedElementInfo | null = null;

  constructor(options: ToolManagerOptions) {
    this.document = options.document;
    this.payloadService = options.payloadService;
    this.options = options;

    this.textEditTool = new TextEditTool({
      document: this.document,
      onTextUpdate: (data) => {
        if (this.options.onTextUpdate) {
          this.options.onTextUpdate(data);
        }
      },
    });
    this.fontSizeTool = new FontSizeTool({
      document: this.document,
      onFontSizeUpdate: (data) => {
        if (this.options.onFontSizeUpdate) {
          this.options.onFontSizeUpdate(data);
        }
      },
    });
    this.fontFamilyTool = new FontFamilyTool({
      document: this.document,
      onFontFamilyUpdate: (data) => {
        if (this.options.onFontFamilyUpdate) {
          this.options.onFontFamilyUpdate(data);
        }
      },
    });
    this.colorTool = new ColorTool({
      document: this.document,
      onColorUpdate: (data) => {
        if (this.options.onColorUpdate) {
          this.options.onColorUpdate(data);
        }
      },
    });
    this.deleteTool = new DeleteTool({
      document: this.document,
      onDeleteElement: (data) => {
        if (this.options.onDeleteElement) {
          this.options.onDeleteElement(data);
        }
      },
    });

    this.document.addEventListener("brakit:pro-tool-change", ((event: CustomEvent) => {
      const tool = event.detail?.tool;
      if (tool !== null && this.toolActive) {
        logger.info("[ToolManager] Pro tool activated, deactivating core tools");
        this.handleToolChange(new CustomEvent("tool-change", {
          detail: { tool: null, source: "pro-plugin" },
        }));
      }
    }) as EventListener);
  }

  getCurrentTool(): ToolKind | null {
    return this.currentTool;
  }

  isToolActive(): boolean {
    return this.toolActive;
  }

  getSelectedElement() {
    return this.selectedElement;
  }

  getSelectedElementInfo() {
    return this.selectedElementInfo;
  }

  selectElement(element: HTMLElement) {
    const info = this.buildSelectionInfo(element);
    if (!info) {
      return;
    }

    if (this.selectedElement && this.selectedElement !== element) {
      this.selectedElement.classList.remove("brakit-selected");
    }

    this.selectedElement = element;
    this.selectedElement.classList.add("brakit-selected");
    this.selectedElementInfo = info;

    document.dispatchEvent(
      new CustomEvent("brakit-element-selected", {
        detail: { elementInfo: info },
        bubbles: true,
      })
    );
  }

  removeSelection() {
    if (this.selectedElement) {
      this.selectedElement.classList.remove("brakit-selected");
    }
    this.selectedElement = null;
    this.selectedElementInfo = null;
  }

  clearDrawSelection() {
    this.document.dispatchEvent(
      new CustomEvent("brakit:clear-draw-selection")
    );
  }

  setTool(tool: ToolKind | null) {
    const event = new CustomEvent("tool-change", {
      detail: { tool, source: "toolbar" },
    });
    this.handleToolChange(event);
  }

  handleToolChange = (event: Event) => {
    const detail = (
      event as CustomEvent<{ tool?: string | null; source?: string }>
    ).detail;
    const requestedTool = detail?.tool;

    if (requestedTool === null) {
      logger.info("[ToolManager] Deactivating all tools (null requested)");

      if (this.toolActive) {
        if (this.currentTool === Tool.Text) {
          this.textEditTool.deactivate();
        } else if (this.currentTool === Tool.FontSize) {
          this.fontSizeTool.deactivate();
        } else if (this.currentTool === Tool.Color) {
          this.colorTool.deactivate();
        } else if (this.currentTool === Tool.FontFamily) {
          this.fontFamilyTool.deactivate();
        } else if (this.currentTool === Tool.Delete) {
          this.deleteTool.deactivate();
        }
      }

      this.toolActive = false;
      logger.debug(
        "[ToolManager] All tools deactivated, toolActive:",
        this.toolActive
      );
      return;
    }

    const tool: Tool =
      requestedTool === "text"
        ? Tool.Text
        : requestedTool === "fontSize"
          ? Tool.FontSize
          : requestedTool === "fontFamily"
            ? Tool.FontFamily
            : requestedTool === "color"
              ? Tool.Color
              : requestedTool === "delete"
                ? Tool.Delete
                : Tool.Text;

    if (this.currentTool === tool && this.toolActive) {
      return;
    }

    if (this.toolActive) {
      if (this.currentTool === Tool.Text) {
        this.textEditTool.deactivate();
      } else if (this.currentTool === Tool.FontSize) {
        this.fontSizeTool.deactivate();
      } else if (this.currentTool === Tool.Color) {
        this.colorTool.deactivate();
      } else if (this.currentTool === Tool.FontFamily) {
        this.fontFamilyTool.deactivate();
      } else if (this.currentTool === Tool.Delete) {
        this.deleteTool.deactivate();
      }
    }

    this.currentTool = tool;
    this.toolActive = true;

    switch (tool) {
      case Tool.Text:
        this.fontSizeTool.deactivate();
        this.fontFamilyTool.deactivate();
        this.colorTool.deactivate();
        this.deleteTool.deactivate();
        this.textEditTool.activate();
        break;
      case Tool.FontSize:
        this.textEditTool.deactivate();
        this.fontFamilyTool.deactivate();
        this.colorTool.deactivate();
        this.deleteTool.deactivate();
        this.fontSizeTool.activate();
        break;
      case Tool.FontFamily:
        this.textEditTool.deactivate();
        this.fontSizeTool.deactivate();
        this.colorTool.deactivate();
        this.deleteTool.deactivate();
        this.fontFamilyTool.activate();
        break;
      case Tool.Color:
        this.textEditTool.deactivate();
        this.fontSizeTool.deactivate();
        this.fontFamilyTool.deactivate();
        this.deleteTool.deactivate();
        this.colorTool.activate();
        break;

      case Tool.Delete:
        this.textEditTool.deactivate();
        this.fontSizeTool.deactivate();
        this.fontFamilyTool.deactivate();
        this.colorTool.deactivate();
        this.deleteTool.activate();
        break;
    }

    this.document.dispatchEvent(
      new CustomEvent("brakit:tool-change", {
        detail: { tool },
      })
    );
  };

  destroy() {
    if (this.toolActive) {
      this.textEditTool.destroy();
    }
    this.fontSizeTool.destroy();
    this.fontFamilyTool.destroy();
    this.toolActive = false;
  }

  private buildSelectionInfo(
    element: HTMLElement
  ): SanitizedElementInfo | null {
    const elementInfo = getElementInfo(element);
    const sanitized = sanitizeElementDetails(elementInfo);
    const tagName = sanitized.tagName?.toLowerCase?.() || "";
    if (tagName.startsWith("brakit-")) {
      return null;
    }

    const resolvedSource = this.payloadService.resolveElementSource(
      element,
      sanitized
    );
    sanitized.resolvedSource = resolvedSource;
    return sanitized;
  }
}
