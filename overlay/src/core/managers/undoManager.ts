import { BackendClient, UndoActionResponse } from "../../services/backendClient";
import { logger } from "../../utils/logger";

export interface UndoUiState {
  available: boolean;
  busy: boolean;
  label?: string;
  timestamp?: string;
  fileCount?: number;
  attention?: boolean;
  actionId?: string;
}

interface UndoManagerOptions {
  backend: BackendClient;
  onStateChange?: (state: UndoUiState) => void;
}

export class UndoManager {
  private readonly backend: BackendClient;
  private readonly onStateChange?: (state: UndoUiState) => void;
  private state: UndoUiState = {
    available: false,
    busy: false,
  };
  private initialized = false;
  private attentionTimeout: ReturnType<typeof setTimeout> | null = null;
  private refreshRequestId = 0;

  constructor(options: UndoManagerOptions) {
    this.backend = options.backend;
    this.onStateChange = options.onStateChange;

    this.backend.onHistoryChange(() => {
      void this.refreshState();
    });
  }

  getState(): UndoUiState {
    return { ...this.state };
  }

  async bootstrap(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    await this.refreshState();
  }

  async refreshState(): Promise<void> {
    const requestId = ++this.refreshRequestId;
    try {
      const status = await this.backend.getHistoryStatus();
      if (requestId !== this.refreshRequestId) {
        logger.debug("Ignoring stale history status response", { requestId });
        return;
      }

      if (!status.success) {
        logger.warn("History status request failed; keeping previous state");
        return;
      }

      if (!status.hasAction || !status.action) {
        this.updateState({
          available: false,
          label: undefined,
          timestamp: undefined,
          fileCount: undefined,
          attention: false,
          actionId: undefined,
        });
        return;
      }

      this.updateState({
        available: true,
        label: status.action.label,
        timestamp: status.action.timestamp,
        fileCount: status.action.fileCount,
        actionId: status.action.id,
      });
    } catch (error) {
      logger.warn("Failed to refresh undo status", error);
    }
  }

  async undo(): Promise<UndoActionResponse> {
    if (this.state.busy) {
      return {
        success: false,
        error: "Undo already in progress",
      };
    }

    this.updateState({ busy: true });

    try {
      const response = await this.backend.undoLastAction();
      if (response.success) {
        await this.refreshState();
      }
      return response;
    } catch (error) {
      logger.error("Undo manager error", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to undo changes",
      };
    } finally {
      this.updateState({ busy: false });
    }
  }

  private updateState(
    patch: Partial<UndoUiState>,
    options?: { skipAttentionCheck?: boolean }
  ) {
    const previous = this.state;
    const nextState = {
      ...this.state,
      ...patch,
    };

    const changed =
      previous.available !== nextState.available ||
      previous.busy !== nextState.busy ||
      previous.label !== nextState.label ||
      previous.timestamp !== nextState.timestamp ||
      previous.fileCount !== nextState.fileCount ||
      previous.attention !== nextState.attention ||
      previous.actionId !== nextState.actionId;

    this.state = nextState;

    if (changed) {
      this.onStateChange?.({ ...this.state });
    }

    if (options?.skipAttentionCheck) {
      return;
    }

    const becameAvailable = !previous.available && nextState.available;
    const becameUnavailable = previous.available && !nextState.available;
    const newActionWhileAvailable =
      previous.available &&
      nextState.available &&
      previous.actionId !== nextState.actionId &&
      typeof nextState.actionId === "string";

    if (becameAvailable || newActionWhileAvailable) {
      this.startAttentionPulse();
    } else if (becameUnavailable) {
      this.stopAttentionPulse();
    }
  }

  private startAttentionPulse() {
    this.stopAttentionPulse();
    this.updateState({ attention: true }, { skipAttentionCheck: true });
    this.attentionTimeout = setTimeout(() => {
      this.updateState({ attention: false }, { skipAttentionCheck: true });
      this.attentionTimeout = null;
    }, 2200);
  }

  private stopAttentionPulse() {
    if (this.attentionTimeout) {
      clearTimeout(this.attentionTimeout);
      this.attentionTimeout = null;
    }
    if (this.state.attention) {
      this.updateState({ attention: false }, { skipAttentionCheck: true });
    }
  }
}
