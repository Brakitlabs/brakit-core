import { BackendClient } from "../services/backendClient";
import { ModalManager } from "./managers/modalManager";
import { logger } from "../utils/logger";
import { DrawAreaContext } from "./draw/drawContext";
import {
  SubsystemInitializer,
  type InitializedSubsystems,
} from "./orchestrators";
import { ElementPayloadService } from "../payload/ElementPayloadService";
import { OverlayEvents } from "./events";

interface OverlayControllerOptions {
  document: Document;
  backendClient?: BackendClient;
  modalManager?: ModalManager;
}

/**
 * Main coordinator for the Brakit overlay system.
 * Delegates to specialized orchestrators and handlers.
 *
 * Responsibilities:
 * - Initialize subsystems via SubsystemInitializer
 * - Wire up event listeners and callbacks
 * - Coordinate between subsystems
 * - Provide public API
 */
export class OverlayController {
  private readonly document: Document;
  private readonly backend: BackendClient;
  private readonly modalManager: ModalManager;
  private payloadService: ElementPayloadService;

  private subsystems: InitializedSubsystems;

  private lastErrorMessage = "";
  private pendingDrawContext: DrawAreaContext | null = null;

  constructor(options: OverlayControllerOptions) {
    this.document = options.document;
    this.backend = options.backendClient || new BackendClient();
    this.modalManager =
      options.modalManager || new ModalManager(options.document);

    this.subsystems = SubsystemInitializer.initialize({
      document: this.document,
      backend: this.backend,
      modalManager: this.modalManager,
    });
    this.payloadService = this.subsystems.payloadService;

    this.wireCallbacks();
    this.setupEventListeners();

    this.subsystems.eventManager.registerEventListeners();
    this.subsystems.eventManager.setupErrorMonitoring();
  }

  /**
   * Wires up callbacks between subsystems that have circular dependencies
   */
  private wireCallbacks(): void {
    const toolManagerOptions = (this.subsystems.toolManager as any).options;
    if (toolManagerOptions) {
      toolManagerOptions.onDrawSelection = (result: any) =>
        this.handleDrawSelection(result);
      toolManagerOptions.onDrawCancel = () => this.handleDrawCancel();
    }

    const eventManagerOptions = (this.subsystems.eventManager as any).options;
    if (eventManagerOptions) {
      eventManagerOptions.onBubbleClicked = () => this.handleBubbleClicked();
      eventManagerOptions.onFixError = (errorMessage: string) =>
        this.handleFixError(errorMessage);
      eventManagerOptions.onModalUndo = async () =>
        this.subsystems.instructionProcessor.onModalUndo();
      eventManagerOptions.onToolChange = (event: Event) =>
        this.subsystems.toolManager.handleToolChange(event);
      eventManagerOptions.onErrorRecorded = (message: string) =>
        this.recordError(message);
    }

    const instructionProcessorOptions = (
      this.subsystems.instructionProcessor as any
    ).options;
    if (instructionProcessorOptions) {
      instructionProcessorOptions.clearDrawSelection = () =>
        this.clearDrawSelection();
      instructionProcessorOptions.removeSelection = () =>
        this.subsystems.toolManager.removeSelection();
      instructionProcessorOptions.onErrorRecorded = (message: string) =>
        this.recordError(message);
    }

    (this.subsystems.uiCoordinator as any).callbacks = {};
  }

  private setupEventListeners(): void {
    this.document.addEventListener("brakit:toggle-toolbar", () => {
      this.subsystems.floatingToolbar.toggle();
    });

    this.document.addEventListener("brakit:tool-change", ((e: CustomEvent) => {
      const tool = e.detail.tool;
      this.subsystems.toolManager.setTool(tool);
      this.subsystems.floatingToolbar.setActiveTool(tool);
    }) as EventListener);

    this.document.addEventListener(OverlayEvents.UndoRequest, () => {
      void this.subsystems.instructionProcessor.onToolbarUndo();
    });
  }

  attachBubbleElement(bubble: HTMLElement): void {
    this.subsystems.uiCoordinator.attachBubbleElement(bubble as any);
  }

  attachToastElement(toast: any): void {
    this.subsystems.uiCoordinator.attachToastElement(toast);
  }

  attachSmartEditWarningElement(element: HTMLElement): void {
    this.subsystems.smartEditOrchestrator.attachWarningElement(element);
  }

  detach(): void {
    this.subsystems.eventManager.destroy();
    this.subsystems.toolManager.destroy();
  }

  getPayloadService(): ElementPayloadService {
    return this.payloadService;
  }

  getSubsystems(): InitializedSubsystems {
    return this.subsystems;
  }

  private handleBubbleClicked(): void {
    if (this.subsystems.instructionProcessor.isSubmitting()) {
      return;
    }

    if (!this.subsystems.toolManager.getSelectedElement()) {
      return;
    }

    this.subsystems.instructionProcessor.openEditModal("bubble");
  }

  private handleFixError(errorMessage: string): void {
    if (this.subsystems.instructionProcessor.isSubmitting()) {
      return;
    }

    this.subsystems.instructionProcessor.openErrorModal(errorMessage);
  }

  private clearDrawSelection(): void {
    this.pendingDrawContext = null;
    this.subsystems.toolManager.clearDrawSelection();
    this.subsystems.spatialProcessor.clearSpatialAnalysis();
  }

  private recordError(message: string): void {
    this.lastErrorMessage = message;
    this.subsystems.uiCoordinator.updateBubbleError(message);
    logger.warn("Captured error", message);
  }

  private handleDrawSelection(result: any): void {
    this.pendingDrawContext = result.context;
    this.subsystems.drawSelectionHandler.handleDrawSelection(result);
  }

  private handleDrawCancel(): void {
    this.clearDrawSelection();
  }
}
