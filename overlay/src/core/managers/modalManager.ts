import { OverlayEvents } from "../events";
import { logger } from "../../utils/logger";

export type ModalMode = "edit" | "error" | "result";

export type ModalStatusState = "pending" | "active" | "done" | "error";

export interface ModalStatusStep {
  id: string;
  label: string;
  state: ModalStatusState;
}

export interface ModalState {
  mode: ModalMode;
  instruction: string;
  elementTag?: string;
  isSubmitting?: boolean;
  hint?: string;
  anchorPosition?: { x: number; y: number };
  errorMessage?: string;
  submissionError?: string;
  originLabel?: string;
  targetSummary?: string;
  targetDetails?: string[];
  statusTimeline?: ModalStatusStep[];
  resultDiff?: string;
  resultFile?: string;
  resultMessage?: string;
  resultSummary?: string;
  resultStatus?: "success" | "error";
  canUndo?: boolean;
}

interface ModalListeners {
  onSubmit: (instruction: string) => void;
  onClose: () => void;
}

export class ModalManager {
  private modal: HTMLElement | null = null;
  private listeners: ModalListeners | null = null;

  constructor(private readonly rootDocument: Document) {}

  open(state: ModalState, listeners: ModalListeners) {
    this.listeners = listeners;

    if (!this.modal) {
      this.modal = this.createModalElement();
      this.rootDocument.body.appendChild(this.modal);
    }

    this.updateState(state);
  }

  updateState(state: Partial<ModalState>) {
    if (!this.modal) return;
    Object.entries(state).forEach(([key, value]) => {
      (this.modal as any)[key] = value;
    });
  }

  close() {
    if (!this.modal) return;
    this.modal.remove();
    this.modal = null;
    this.listeners = null;
  }

  isOpen(): boolean {
    return Boolean(this.modal);
  }

  private createModalElement(): HTMLElement {
    const modal = this.rootDocument.createElement("brakit-modal");

    modal.addEventListener(OverlayEvents.ModalSubmit, (event: Event) => {
      if (!this.listeners) return;
      const detail = (event as CustomEvent<{ instruction: string }>).detail;
      if (!detail || typeof detail.instruction !== "string") {
        logger.warn("Modal submitted without instruction detail");
        return;
      }
      this.listeners.onSubmit(detail.instruction.trim());
    });

    modal.addEventListener(OverlayEvents.ModalClose, () => {
      if (!this.listeners) return;
      this.listeners.onClose();
    });

    return modal;
  }
}
