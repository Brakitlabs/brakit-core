import { OverlayEvents } from "../events";
import { ModalManager } from "./modalManager";
import { ToolManager } from "./toolManager";
import { logger } from "../../utils/logger";

interface EventManagerOptions {
  document: Document;
  toolManager: ToolManager;
  modalManager: ModalManager;
  onBubbleClicked: () => void;
  onFixError: (errorMessage: string) => void;
  onModalUndo: () => Promise<void>;
  onToolChange: (event: Event) => void;
  onErrorRecorded: (message: string) => void;
}

export class EventManager {
  private readonly document: Document;
  private readonly toolManager: ToolManager;
  private readonly modalManager: ModalManager;
  readonly options: EventManagerOptions;

  private originalConsoleError?: typeof console.error;
  private errorDetectionTimeout: NodeJS.Timeout | null = null;

  constructor(options: EventManagerOptions) {
    this.document = options.document;
    this.toolManager = options.toolManager;
    this.modalManager = options.modalManager;
    this.options = options;
  }

  registerEventListeners() {
    this.document.addEventListener(
      OverlayEvents.BubbleClicked,
      this.handleBubbleClicked as EventListener
    );
    this.document.addEventListener(
      OverlayEvents.BubbleFixError,
      this.handleFixError as EventListener
    );
    this.document.addEventListener(
      OverlayEvents.ModalUndo,
      this.handleModalUndo as EventListener
    );
    this.document.addEventListener(
      OverlayEvents.ToolChange,
      this.handleToolChange as EventListener
    );
  }

  removeEventListeners() {
    this.document.removeEventListener(
      OverlayEvents.BubbleClicked,
      this.handleBubbleClicked as EventListener
    );
    this.document.removeEventListener(
      OverlayEvents.BubbleFixError,
      this.handleFixError as EventListener
    );
    this.document.removeEventListener(
      OverlayEvents.ModalUndo,
      this.handleModalUndo as EventListener
    );
    this.document.removeEventListener(
      OverlayEvents.ToolChange,
      this.handleToolChange as EventListener
    );
  }

  setupErrorMonitoring() {
    if (this.originalConsoleError) {
      return; // already set up
    }

    this.originalConsoleError = console.error.bind(console);
    console.error = (...args: any[]) => {
      this.originalConsoleError!(...args);
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
        )
        .join(" ");
      this.recordError(message);
    };

    window.addEventListener("error", this.handleWindowError as EventListener);
    window.addEventListener(
      "unhandledrejection",
      this.handleUnhandledRejection as EventListener
    );
  }

  teardownErrorMonitoring() {
    if (this.originalConsoleError) {
      console.error = this.originalConsoleError;
      this.originalConsoleError = undefined;
    }
    window.removeEventListener(
      "error",
      this.handleWindowError as EventListener
    );
    window.removeEventListener(
      "unhandledrejection",
      this.handleUnhandledRejection as EventListener
    );
  }

  startErrorDetection(): void {
    if (this.errorDetectionTimeout) {
      clearTimeout(this.errorDetectionTimeout);
    }
    // Removed automatic error recording - only record actual errors
    // The timeout was too aggressive and causing false positives
    this.errorDetectionTimeout = setTimeout(() => {
      // Just clear the timeout, don't automatically record an error
      this.errorDetectionTimeout = null;
    }, 2000);
  }

  stopErrorDetection(): void {
    if (this.errorDetectionTimeout) {
      clearTimeout(this.errorDetectionTimeout);
      this.errorDetectionTimeout = null;
    }
  }

  private handleBubbleClicked = () => {
    this.options.onBubbleClicked();
  };

  private handleFixError = (event: Event) => {
    const detail = (event as CustomEvent<{ errorMessage?: string }>).detail;
    const errorMessage = detail?.errorMessage || "";
    if (!errorMessage) {
      logger.warn("Fix error triggered without message");
      return;
    }

    this.options.onFixError(errorMessage);
  };

  private handleModalUndo = async () => {
    await this.options.onModalUndo();
  };

  private handleToolChange = (event: Event) => {
    this.options.onToolChange(event);
  };

  private handleWindowError = (event: ErrorEvent) => {
    const message = `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;
    this.recordError(message);
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const message = event.reason
      ? typeof event.reason === "object"
        ? event.reason.message || JSON.stringify(event.reason)
        : String(event.reason)
      : "Unknown promise rejection";
    this.recordError(`Unhandled Promise Rejection: ${message}`);
  };

  private recordError(message: string) {
    this.options.onErrorRecorded(message);
  }

  destroy() {
    this.removeEventListeners();
    this.teardownErrorMonitoring();
    this.stopErrorDetection();
  }
}
