import { BackendClient, EditRequestPayload } from "../../services/backendClient";
import {
  ModalManager,
  ModalMode,
  ModalStatusStep,
} from "../managers/modalManager";
import { ToolManager } from "../managers/toolManager";
import { DrawAreaContext } from "../draw/drawContext";
import { logger } from "../../utils/logger";
import { ElementPayloadService } from "../../payload/ElementPayloadService";
import type { SpatialMapPayload } from "../../spatial/types";
import { UndoManager } from "../managers/undoManager";

interface InstructionProcessorOptions {
  toolManager: ToolManager;
  modalManager: ModalManager;
  backend: BackendClient;
  payloadService: ElementPayloadService;
  undoManager: UndoManager;
  getBubbleAnchorPosition: () => { x: number; y: number };
  buildSpatialContext?: (input: {
    drawArea: DrawAreaContext;
    instruction: string;
    action: SpatialMapPayload["action"];
  }) => SpatialMapPayload | null;
  clearDrawSelection: () => void;
  removeSelection: () => void;
  showToast: (
    message: string,
    type?: "success" | "error" | "info" | "warning",
    duration?: number,
    showUndo?: boolean,
    onUndo?: () => void
  ) => void;
  onSubmissionStateChanged: (isSubmitting: boolean) => void;
  onModalClosed: () => void;
  onErrorRecorded: (message: string) => void;
}

type EditOrigin = "draw" | "bubble" | "unknown";

export class InstructionProcessor {
  private readonly toolManager: ToolManager;
  private readonly modalManager: ModalManager;
  private readonly backend: BackendClient;
  private readonly payloadService: ElementPayloadService;
  private readonly undoManager: UndoManager;
  readonly options: InstructionProcessorOptions;

  private currentModalMode: ModalMode | null = null;
  private isSubmittingState = false;
  private lastResult: { diff?: string; targetFile?: string | null } | null =
    null;
  private pendingDrawContext: DrawAreaContext | null = null;
  private currentStatusTimeline: ModalStatusStep[] = [];

  constructor(options: InstructionProcessorOptions) {
    this.toolManager = options.toolManager;
    this.modalManager = options.modalManager;
    this.backend = options.backend;
    this.payloadService = options.payloadService;
    this.undoManager = options.undoManager;
    this.options = options;
  }

  openEditModal(origin: EditOrigin = "bubble") {
    const selectedInfo = this.toolManager.getSelectedElementInfo();
    if (!selectedInfo) {
      return;
    }

    this.currentModalMode = "edit";
    this.resetStatusTimeline();

    const descriptor =
      this.payloadService.buildTargetDescriptor(selectedInfo);
    const originLabel = this.describeOrigin(origin);

    const state = {
      mode: "edit" as ModalMode,
      instruction: "",
      elementTag: undefined,
      targetSummary: descriptor.summary,
      targetDetails: descriptor.details,
      originLabel,
      anchorPosition: this.options.getBubbleAnchorPosition(),
      hint: "Press Enter to apply • Esc to cancel",
      isSubmitting: false,
      errorMessage: undefined,
      submissionError: undefined,
      statusTimeline: undefined,
      resultDiff: undefined,
      resultFile: undefined,
      resultMessage: undefined,
      resultSummary: undefined,
      resultStatus: undefined,
      canUndo: false,
    };

    this.modalManager.open(state, {
      onSubmit: (instruction) => this.handleEditSubmit(instruction),
      onClose: () => this.handleModalClose(),
    });
  }

  openErrorModal(errorMessage: string) {
    this.resetStatusTimeline();
    this.currentModalMode = "error";

    const instruction = this.payloadService.buildErrorInstruction(errorMessage);

    this.modalManager.open(
      {
        mode: "error",
        instruction,
        elementTag: undefined,
        anchorPosition: this.options.getBubbleAnchorPosition(),
        hint: "Press Enter to apply • Esc to cancel",
        isSubmitting: false,
        errorMessage,
        submissionError: undefined,
        statusTimeline: undefined,
      },
      {
        onSubmit: (value) => this.handleErrorSubmit(value, errorMessage),
        onClose: () => this.handleErrorModalClose(),
      }
    );
  }

  async handleEditSubmit(instruction: string) {
    const selectedInfo = this.toolManager.getSelectedElementInfo();
    if (!selectedInfo) {
      logger.warn("Edit submit without selected element info");
      return;
    }

    const trimmedInstruction = instruction.trim();
    if (trimmedInstruction.length === 0) {
      return;
    }

    const spatialAction =
      this.payloadService.inferSpatialAction(trimmedInstruction);
    const drawContext = this.pendingDrawContext;
    const spatialContext =
      drawContext && this.options.buildSpatialContext
        ? this.options.buildSpatialContext({
            drawArea: drawContext,
            instruction: trimmedInstruction,
            action: spatialAction,
          }) ?? undefined
        : undefined;

    this.initializeStatusTimeline();
    this.modalManager.updateState({
      submissionError: undefined,
    });

    await this.submitInstruction({ instruction: trimmedInstruction }, () =>
      this.payloadService.buildEditPayload({
        instruction: trimmedInstruction,
        elementInfo: selectedInfo,
        drawAreaContext: drawContext,
        spatialContext,
      })
    );
  }

  async handleErrorSubmit(instruction: string, errorMessage: string) {
    this.initializeStatusTimeline();
    this.modalManager.updateState({
      submissionError: undefined,
    });

    await this.submitInstruction({ instruction }, () =>
      this.payloadService.buildErrorPayload({
        instruction,
        errorMessage,
      })
    );
  }

  private async submitInstruction(
    { instruction }: { instruction: string },
    payloadBuilder: () => EditRequestPayload
  ) {
    if (this.isSubmittingState) {
      return;
    }

    if (!instruction || instruction.trim().length === 0) {
      logger.info("Ignoring empty instruction");
      return;
    }

    this.isSubmittingState = true;
    this.ensureStatusTimeline();
    this.activateStatusStep("prepare");
    this.options.onSubmissionStateChanged(true);
    this.modalManager.updateState({
      isSubmitting: true,
      errorMessage: undefined,
      submissionError: undefined,
      statusTimeline: this.currentStatusTimeline.slice(),
    });

    try {
      const payload = payloadBuilder();
      const drawAreaContext = payload.context?.drawArea as
        | DrawAreaContext
        | undefined;
      if (drawAreaContext) {
        logger.debug("Submitting drawArea context", drawAreaContext);
      }
      logger.debug("Prepared edit payload", payload);

      this.completeStatusStep("prepare");
      this.activateStatusStep("send");

      // Dispatch event for plugins to handle
      const response = await new Promise<any>((resolve, reject) => {
        const requestId = Math.random().toString(36).substring(7);
        
        const handleResponse = (event: CustomEvent) => {
          if (event.detail.requestId === requestId) {
            document.removeEventListener("brakit:instruction-response", handleResponse as EventListener);
            resolve(event.detail.response);
          }
        };

        document.addEventListener("brakit:instruction-response", handleResponse as EventListener);

        // Timeout after 120s
        setTimeout(() => {
          document.removeEventListener("brakit:instruction-response", handleResponse as EventListener);
          reject(new Error("Instruction submission timed out"));
        }, 1200000);

        document.dispatchEvent(
          new CustomEvent("brakit:submit-instruction", {
            detail: {
              requestId,
              payload,
            },
          })
        );
      });

      this.completeStatusStep("send");
      this.activateStatusStep("apply");

      if (!response.success) {
        this.failStatusStep("apply");
        this.modalManager.updateState({
          isSubmitting: false,
          submissionError: response.error || "Failed to apply changes",
        });
        this.options.onSubmissionStateChanged(false);
        return;
      }

      this.completeStatusStep("apply");

      const previousMode = this.currentModalMode;

      this.lastResult = {
        diff: response.diff,
        targetFile: response.targetFile,
      };

      const resultMessage = this.extractResultSummary(response.output || "");

      this.currentModalMode = "result" as ModalMode;
      this.modalManager.updateState({
        mode: "result" as ModalMode,
        instruction: "",
        elementTag: undefined,
        isSubmitting: false,
        hint: undefined,
        errorMessage: undefined,
        submissionError: undefined,
        resultDiff: response.diff,
        resultFile: response.targetFile,
        resultMessage,
        resultSummary: resultMessage,
        resultStatus: "success",
        canUndo: Boolean(response.diff),
        statusTimeline: this.currentStatusTimeline.slice(),
      });

      if (response.diff) {
        this.options.showToast(
          "Undo ready — use the glowing button to revert.",
          "info",
          2400
        );
      }

      if (previousMode === "error") {
        this.options.onErrorRecorded("");
      }
      this.options.clearDrawSelection();
      this.options.onSubmissionStateChanged(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to apply changes";
      logger.error("Submit instruction failed", error);
      this.failStatusStep("apply");
      this.modalManager.updateState({
        isSubmitting: false,
        submissionError: message,
      });
      this.options.onSubmissionStateChanged(false);
    } finally {
      this.isSubmittingState = false;
    }
  }

  private describeOrigin(origin: EditOrigin): string {
    switch (origin) {
      case "draw":
        return "Selection area";
      case "bubble":
        return "Toolbar";
      default:
        return "Selected element";
    }
  }

  private initializeStatusTimeline() {
    this.currentStatusTimeline = [
      {
        id: "prepare",
        label: "Collecting page context",
        state: "active",
      },
      {
        id: "send",
        label: "Sending instructions",
        state: "pending",
      },
      {
        id: "apply",
        label: "Applying changes",
        state: "pending",
      },
    ];
    this.syncStatusTimeline();
  }

  private ensureStatusTimeline() {
    if (this.currentStatusTimeline.length === 0) {
      this.initializeStatusTimeline();
    }
  }

  private syncStatusTimeline() {
    this.modalManager.updateState({
      statusTimeline: this.currentStatusTimeline.slice(),
    });
  }

  private activateStatusStep(stepId: string) {
    let changed = false;
    this.currentStatusTimeline = this.currentStatusTimeline.map((step) => {
      if (step.id === stepId) {
        if (step.state !== "active") {
          changed = true;
          return { ...step, state: "active" };
        }
        return step;
      }
      if (step.state === "active") {
        changed = true;
        return { ...step, state: "done" };
      }
      return step;
    });

    if (changed) {
      this.syncStatusTimeline();
    }
  }

  private completeStatusStep(stepId: string) {
    let changed = false;
    this.currentStatusTimeline = this.currentStatusTimeline.map((step) => {
      if (step.id === stepId && step.state !== "done") {
        changed = true;
        return { ...step, state: "done" };
      }
      return step;
    });

    if (changed) {
      this.syncStatusTimeline();
    }
  }

  private failStatusStep(stepId: string) {
    let changed = false;
    this.currentStatusTimeline = this.currentStatusTimeline.map((step) => {
      if (step.id === stepId) {
        if (step.state !== "error") {
          changed = true;
          return { ...step, state: "error" };
        }
        return step;
      }

      if (step.state === "active") {
        changed = true;
        return { ...step, state: "done" };
      }

      return step;
    });

    if (changed) {
      this.syncStatusTimeline();
    }
  }

  private resetStatusTimeline() {
    if (this.currentStatusTimeline.length === 0) {
      return;
    }
    this.currentStatusTimeline = [];
    this.modalManager.updateState({
      statusTimeline: undefined,
    });
  }

  private handleModalClose() {
    this.resetStatusTimeline();
    this.modalManager.close();
    this.currentModalMode = null;
    this.isSubmittingState = false;
    this.lastResult = null;
    this.options.removeSelection();
    this.options.clearDrawSelection();
    this.options.onModalClosed();
  }

  private handleErrorModalClose() {
    this.resetStatusTimeline();
    this.modalManager.close();
    this.currentModalMode = null;
    this.isSubmittingState = false;
  }

  private async handleUndoRequest(source: "modal" | "toolbar") {
    if (this.isSubmittingState) {
      logger.info("Cannot undo while another submission is in progress");
      return;
    }

    logger.info("Undo requested", {
      source,
      lastResultKnown: Boolean(this.lastResult),
      undoReady: this.undoManager.getState().available,
    });

    this.isSubmittingState = true;
    this.options.onSubmissionStateChanged(true);

    if (source === "modal") {
      this.modalManager.updateState({
        isSubmitting: true,
        errorMessage: undefined,
      });
    }

    try {
      const response = await this.undoManager.undo();
      logger.debug("Undo response", response);

      if (!response.success) {
        const errorMessage = response.error || "Failed to undo changes";
        if (source === "modal") {
          this.modalManager.updateState({
            isSubmitting: false,
            errorMessage,
          });
        } else {
          this.options.showToast(errorMessage, "error");
        }
        this.options.onSubmissionStateChanged(false);
        return;
      }

      this.lastResult = null;
      this.options.removeSelection();
      this.options.clearDrawSelection();
      logger.info("Undo completed successfully");

      if (source === "modal") {
        this.modalManager.updateState({
          isSubmitting: false,
          resultMessage: "Changes reverted. Hot reload in progress...",
          canUndo: false,
        });

        setTimeout(() => {
          this.modalManager.close();
          this.currentModalMode = null;
          this.options.onModalClosed();
        }, 1500);
      } else {
        const label = response.action?.label
          ? ` (${response.action.label})`
          : "";
        this.options.showToast(
          `Last change reverted${label}.`,
          "success",
          2500
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to undo changes";
      logger.error("Undo failed", error);
      if (source === "modal") {
        this.modalManager.updateState({
          isSubmitting: false,
          errorMessage: message,
        });
      } else {
        this.options.showToast(message, "error");
      }
    } finally {
      this.isSubmittingState = false;
      this.options.onSubmissionStateChanged(false);
    }
  }

  private extractResultSummary(output: string): string {
    if (!output) return "Changes applied successfully.";

    const lines = output.split("\n").filter((line) => line.trim());
    if (lines.length === 0) return "Changes applied successfully.";

    // Look for common success patterns
    const successPatterns = [
      /successfully/i,
      /applied/i,
      /updated/i,
      /created/i,
      /modified/i,
      /completed/i,
    ];

    for (const line of lines) {
      if (successPatterns.some((pattern) => pattern.test(line))) {
        return line.trim();
      }
    }

    return lines[lines.length - 1] || "Changes applied successfully.";
  }

  // Public interface methods
  getCurrentModalMode(): ModalMode | null {
    return this.currentModalMode;
  }

  getLastResult() {
    return this.lastResult;
  }

  setPendingDrawContext(context: DrawAreaContext | null) {
    this.pendingDrawContext = context;
  }

  getPendingDrawContext(): DrawAreaContext | null {
    return this.pendingDrawContext;
  }

  isSubmitting(): boolean {
    return this.isSubmittingState;
  }

  // Event handlers for external access
  onModalUndo = () => this.handleUndoRequest("modal");
  onToolbarUndo = () => this.handleUndoRequest("toolbar");
}
