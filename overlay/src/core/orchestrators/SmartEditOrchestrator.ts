import {
  BackendClient,
  SmartEditUpdateResponse,
  DeletePayload,
  DeleteResponse,
} from "../../services/backendClient";
import { logger } from "../../utils/logger";
import type { SmartEditWarningOptions } from "../../components/SmartEditWarning";

export type SmartEditKind = "text" | "fontSize" | "fontFamily" | "color";

type SmartEditWarningElement = HTMLElement & {
  openWarning: (options: SmartEditWarningOptions) => void;
  closeWarning: () => void;
};

interface PendingSmartEdit {
  kind: SmartEditKind;
  payload: Record<string, any>;
  executor: (payload: Record<string, any>) => Promise<SmartEditUpdateResponse>;
}

interface SmartEditCallbacks {
  showToast: (
    message: string,
    type: "success" | "error" | "info" | "warning",
    duration?: number
  ) => void;
}

/**
 * Handles smart edit operations (text, font size, color updates) with
 * shared component detection and confirmation workflows
 */
export class SmartEditOrchestrator {
  private readonly backend: BackendClient;
  private readonly callbacks: SmartEditCallbacks;
  private smartEditWarning: SmartEditWarningElement | null = null;
  private pendingSmartEdit: PendingSmartEdit | null = null;

  constructor(backend: BackendClient, callbacks: SmartEditCallbacks) {
    this.backend = backend;
    this.callbacks = callbacks;
  }

  attachWarningElement(element: HTMLElement): void {
    const typed = element as SmartEditWarningElement;

    if (this.smartEditWarning === typed) {
      return;
    }

    if (this.smartEditWarning) {
      this.smartEditWarning.removeEventListener(
        "brakit-smart-edit-confirm",
        this.onSmartEditConfirm
      );
      this.smartEditWarning.removeEventListener(
        "brakit-smart-edit-cancel",
        this.onSmartEditCancel
      );
    }

    typed.addEventListener(
      "brakit-smart-edit-confirm",
      this.onSmartEditConfirm
    );
    typed.addEventListener("brakit-smart-edit-cancel", this.onSmartEditCancel);

    this.smartEditWarning = typed;
  }

  async handleTextUpdate(data: any): Promise<void> {
    const displayBefore = data.oldDisplayText ?? data.oldText;
    if (displayBefore === data.newText) {
      this.callbacks.showToast("No text changes detected.", "info");
      return;
    }

    const payload = {
      oldText: data.oldText,
      newText: data.newText,
      tag: data.tag,
      file: data.file,
      className: data.className,
      elementTag: data.elementTag ?? data.tag,
      textContent: data.textContent ?? data.oldText,
      ownerComponentName: data.ownerComponentName,
      ownerFilePath: data.ownerFilePath,
    };

    try {
      const response = await this.backend.updateText(payload);

      if (response.warning) {
        logger.warn("Smart edit warning for text update", {
          message: response.message,
          details: response.details,
          detectedProps: response.detectedProps,
        });

        this.promptSmartEditWarning(
          "text",
          payload,
          response,
          (retryPayload: Record<string, any>) =>
            this.backend.updateText(
              retryPayload as typeof payload & { forceGlobal?: boolean }
            )
        );
        return;
      }

      if (response.success) {
        if (response.message) {
          this.callbacks.showToast(response.message, "success");
        }
      } else {
        const errorMessage =
          response.error || response.message || "Text update failed";
        logger.warn("Text update failed", { error: errorMessage });
        this.callbacks.showToast(errorMessage, "error");
      }
    } catch (error) {
      logger.error("Text update error", error);
      this.callbacks.showToast("Unexpected error updating text", "error");
    }
  }

  async handleFontSizeUpdate(data: any): Promise<void> {
    if (data.oldSize === data.newSize) {
      this.callbacks.showToast(
        "Font size already set to the requested value.",
        "info"
      );
      return;
    }

    const payload = {
      oldSize: data.oldSize,
      newSize: data.newSize,
      text: data.text,
      tag: data.tag,
      file: data.file,
      className: data.className,
      elementTag: data.elementTag ?? data.tag,
      textContent: data.textContent ?? data.text,
      ownerComponentName: data.ownerComponentName,
      ownerFilePath: data.ownerFilePath,
    };

    try {
      const response = await this.backend.updateFontSize(payload);

      if (response.warning) {
        logger.warn("Smart edit warning for font size update", {
          message: response.message,
          details: response.details,
          detectedProps: response.detectedProps,
        });

        this.promptSmartEditWarning(
          "fontSize",
          payload,
          response,
          (retryPayload: Record<string, any>) =>
            this.backend.updateFontSize(
              retryPayload as typeof payload & { forceGlobal?: boolean }
            )
        );
        return;
      }

      if (response.success) {
        if (response.message) {
          this.callbacks.showToast(response.message, "success");
        }
      } else {
        const errorMessage =
          response.error || response.message || "Font size update failed";
        logger.warn("Font size update failed", { error: errorMessage });
        this.callbacks.showToast(errorMessage, "error");
      }
    } catch (error) {
      logger.error("Font size update error", error);
      this.callbacks.showToast("Unexpected error updating font size", "error");
    }
  }

  async handleFontFamilyUpdate(data: any): Promise<void> {
    if (data.oldFont === data.newFont) {
      this.callbacks.showToast(
        "Font already set to the requested family.",
        "info"
      );
      return;
    }

    const payload = {
      oldFont: data.oldFont,
      newFont: data.newFont,
      text: data.text,
      tag: data.tag,
      file: data.file,
      className: data.className,
      elementTag: data.elementTag ?? data.tag,
      textContent: data.textContent ?? data.text,
      ownerComponentName: data.ownerComponentName,
      ownerFilePath: data.ownerFilePath,
    };

    try {
      const response = await this.backend.updateFontFamily(payload);

      if (response.warning) {
        logger.warn("Smart edit warning for font family update", {
          message: response.message,
          details: response.details,
          detectedProps: response.detectedProps,
        });

        this.promptSmartEditWarning(
          "fontFamily",
          payload,
          response,
          (retryPayload: Record<string, any>) =>
            this.backend.updateFontFamily(
              retryPayload as typeof payload & { forceGlobal?: boolean }
            )
        );
        return;
      }

      if (response.success) {
        if (response.message) {
          this.callbacks.showToast(response.message, "success");
        }
      } else {
        const errorMessage =
          response.error || response.message || "Font update failed";
        logger.warn("Font family update failed", { error: errorMessage });
        this.callbacks.showToast(errorMessage, "error");
      }
    } catch (error) {
      logger.error("Font family update error", error);
      this.callbacks.showToast("Unexpected error updating font family", "error");
    }
  }

  async handleColorUpdate(data: any): Promise<void> {
    const noTextColorChange =
      !data.textColor || data.textColor.old === data.textColor.new;
    const noBackgroundChange =
      !data.backgroundColor ||
      data.backgroundColor.old === data.backgroundColor.new;
    const noHoverBackgroundChange =
      !data.hoverBackgroundColor ||
      data.hoverBackgroundColor.old === data.hoverBackgroundColor.new;

    if (
      noTextColorChange &&
      noBackgroundChange &&
      noHoverBackgroundChange
    ) {
      this.callbacks.showToast(
        "Colors already match the requested values.",
        "info"
      );
      return;
    }

    const payload = {
      textColor: data.textColor,
      backgroundColor: data.backgroundColor,
      hoverBackgroundColor: data.hoverBackgroundColor,
      text: data.text,
      tag: data.tag,
      file: data.file,
      className: data.className,
      elementTag: data.elementTag ?? data.tag,
      textContent: data.textContent ?? data.text,
      ownerComponentName: data.ownerComponentName,
      ownerFilePath: data.ownerFilePath,
    };

    logger.info("Submitting color update", payload);

    try {
      const response = await this.backend.updateColor(payload);

      if (response.warning) {
        logger.warn("Smart edit warning for color update", {
          message: response.message,
          details: response.details,
          detectedProps: response.detectedProps,
        });

        this.promptSmartEditWarning(
          "color",
          payload,
          response,
          (retryPayload: Record<string, any>) =>
            this.backend.updateColor(
              retryPayload as typeof payload & { forceGlobal?: boolean }
            )
        );
        return;
      }

      if (response.success) {
        if (response.message) {
          this.callbacks.showToast(response.message, "success");
        }
      } else {
        const errorMessage =
          response.error || response.message || "Color update failed";
        logger.warn("Color update failed", { error: errorMessage });
        this.callbacks.showToast(errorMessage, "error");
      }
    } catch (error) {
      logger.error("Color update error", error);
      this.callbacks.showToast("Unexpected error updating color", "error");
    }
  }

  private promptSmartEditWarning(
    kind: SmartEditKind,
    payload: Record<string, any>,
    response: SmartEditUpdateResponse,
    executor: (payload: Record<string, any>) => Promise<SmartEditUpdateResponse>
  ): void {
    const payloadCopy = { ...payload };
    const pending: PendingSmartEdit = {
      kind,
      payload: payloadCopy,
      executor,
    };

    if (
      !this.smartEditWarning ||
      typeof this.smartEditWarning.openWarning !== "function"
    ) {
      logger.warn("Smart edit warning component not available", {
        kind,
        message: response.message,
      });
      this.pendingSmartEdit = null;
      this.callbacks.showToast(
        response.message ??
          `This ${this.getSmartEditLabel(kind)} may affect shared components.`,
        "warning"
      );
      return;
    }

    this.pendingSmartEdit = pending;

    this.smartEditWarning.openWarning({
      message:
        response.message ??
        `This ${this.getSmartEditLabel(kind)} may affect shared components.`,
      details: response.details,
      detectedProps: response.detectedProps,
      filePath: response.filePath,
      componentName: response.componentName,
      signals: response.signals,
    });
  }

  private onSmartEditConfirm = async (): Promise<void> => {
    if (!this.pendingSmartEdit) {
      return;
    }

    const pending = this.pendingSmartEdit;
    this.pendingSmartEdit = null;

    const retryPayload = {
      ...pending.payload,
      forceGlobal: true,
    };

    if (this.smartEditWarning) {
      this.smartEditWarning.closeWarning();
    }

    try {
      const response = await pending.executor(retryPayload);

      if (response.warning) {
        logger.warn("Smart edit still flagged after force override", {
          kind: pending.kind,
          message: response.message,
        });
        this.callbacks.showToast(
          response.message ??
            "This component still appears to be shared. Consider editing it directly.",
          "warning"
        );
        return;
      }

      if (response.success) {
        const message =
          response.message || this.getSmartEditSuccessMessage(pending.kind);
        this.callbacks.showToast(message, "success");
      } else {
        const errorMessage =
          response.error ||
          response.message ||
          `Unable to apply ${this.getSmartEditLabel(pending.kind)} globally`;
        logger.warn("Smart edit global update failed", {
          kind: pending.kind,
          error: errorMessage,
        });
        this.callbacks.showToast(errorMessage, "error");
      }
    } catch (error) {
      logger.error("Smart edit global retry error", {
        kind: pending.kind,
        error,
      });
      this.callbacks.showToast(
        `Unexpected error while applying ${this.getSmartEditLabel(
          pending.kind
        )} globally`,
        "error"
      );
    }
  };

  private onSmartEditCancel = (): void => {
    if (!this.pendingSmartEdit) {
      return;
    }

    const kind = this.pendingSmartEdit.kind;
    if (this.smartEditWarning) {
      this.smartEditWarning.closeWarning();
    }
    this.callbacks.showToast(
      `Skipped global ${this.getSmartEditLabel(kind)}`,
      "info"
    );
    this.pendingSmartEdit = null;
  };

  private getSmartEditLabel(kind: SmartEditKind): string {
    switch (kind) {
      case "text":
        return "text edit";
      case "fontSize":
        return "font size edit";
      case "fontFamily":
        return "font edit";
      case "color":
        return "color edit";
      default:
        return "edit";
    }
  }

  private getSmartEditSuccessMessage(kind: SmartEditKind): string {
    switch (kind) {
      case "text":
        return "Text updated globally.";
      case "fontSize":
        return "Font size updated globally.";
      case "fontFamily":
        return "Font family updated globally.";
      case "color":
        return "Color updated globally.";
      default:
        return "Update applied globally.";
    }
  }

  async handleDeleteElement(data: {
    file: string;
    tag: string;
    text: string;
    identifier: string;
    className?: string;
    elementTag?: string;
    textContent?: string;
    ownerComponentName?: string;
    ownerFilePath?: string;
  }): Promise<void> {
    const payload: DeletePayload = {
      sourceFile: data.file,
      componentName: data.tag,
      elementIdentifier: data.text || data.identifier,
      className: data.className,
      elementTag: data.elementTag || data.tag,
      textContent: data.textContent || data.text,
      ownerComponentName: data.ownerComponentName,
      ownerFilePath: data.ownerFilePath,
    };

    try {
      const response = await this.backend.deleteElement(payload);

      if (response.success) {
        const message =
          response.message || `Element "${data.tag}" deleted successfully`;

        this.callbacks.showToast(message, "success");
      } else {
        const errorMessage =
          response.error || response.message || "Delete failed";
        logger.warn("Delete failed", { error: errorMessage });
        this.callbacks.showToast(errorMessage, "error");
      }
    } catch (error) {
      logger.error("Delete error", error);
      this.callbacks.showToast("Unexpected error deleting element", "error");
    }
  }
}
