import { logger } from "../utils/logger";
import type { DrawAreaContext } from "../core/draw/drawContext";
import type { SanitizedElementInfo } from "../core/processors/selection";
import type { ReactSourceInfo } from "../utils/reactSource";
import type { SpatialMapPayload } from "../spatial/types";

export interface CanvasComponent {
  id: string;
  type: string;
  template: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetSelector?: string;
}

const DEFAULT_BACKEND_URL = "http://localhost:3001";

export type FrameworkKind = "next" | "react";
export type RouterKind = "app" | "pages" | "react-router" | "unknown";

export interface EditorContextInfo {
  framework: FrameworkKind;
  hasTailwind: boolean;
  router?: RouterKind;
  pageRoots?: string[];
  summary?: string;
}

export interface CreatePagePayload {
  folder?: string;
  name: string;
  layout: string;
}

export interface CreatePageResponse {
  success: boolean;
  filePath?: string;
  directory?: string;
  framework?: FrameworkKind;
  router?: RouterKind;
  progressMessages?: string[];
}

export interface SmartEditUpdateResponse {
  success: boolean;
  warning?: boolean;
  message?: string;
  error?: string;
  details?: string;
  detectedProps?: string[];
  filePath?: string;
  componentName?: string;
  signals?: string[];
}

export interface EditRequestContext {
  elementDetails?: SanitizedElementInfo;
  reactSource?: ReactSourceInfo;
  timestamp?: string;
  drawArea?: DrawAreaContext;
  spatial?: SpatialMapPayload;
  [key: string]: unknown;
}

export interface EditRequestPayload {
  instruction: string;
  file?: string;
  line?: number;
  elementSelector?: string;
  context?: EditRequestContext;
}

export interface EditResponse {
  success: boolean;
  output?: string;
  error?: string;
  targetFile?: string;
  processedInstruction?: string;
  diff?: string;
  timestamp?: string;
}

export interface DeletePayload {
  sourceFile: string;
  componentName: string;
  elementIdentifier: string;
  elementTag?: string;
  className?: string;
  textContent?: string;
  ownerComponentName?: string;
  ownerFilePath?: string;
}

export interface DeleteResponse {
  success: boolean;
  message?: string;
  error?: string;
  filePath?: string;
  previousContent?: string;
}

export interface InsertComponentPayload {
  filePath: string;
  componentType: string;
  componentTemplate: string;
  insertIndex: number;
  targetSelector?: string;
}

export interface InsertComponentResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface GenerateCanvasCodePayload {
  filePath: string;
  components: CanvasComponent[];
  containerWidth?: number;
  containerHeight?: number;
}

export interface GenerateCanvasCodeResponse {
  success: boolean;
  message?: string;
  error?: string;
  progressMessages?: string[];
}

export interface HistoryActionSummary {
  id: string;
  type: string;
  label: string;
  timestamp: string;
  fileCount?: number;
  files?: string[];
}

export interface HistoryStatusResponse {
  success: boolean;
  hasAction: boolean;
  action?: HistoryActionSummary;
}

export interface UndoActionResponse {
  success: boolean;
  error?: string;
  restoredFiles?: string[];
  action?: HistoryActionSummary;
}

export class BackendClient {
  private baseUrl: string;
  private historyListeners = new Set<() => void>();

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || resolveBackendUrl();
  }

  async getEditorContext(): Promise<EditorContextInfo> {
    const endpoint = `${this.baseUrl}/api/editor/context`;
    logger.debug("Fetching editor context", { endpoint });

    try {
      const response = await fetch(endpoint);
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.success !== true) {
        const message =
          typeof data?.error === "string"
            ? data.error
            : `Failed with status ${response.status}`;
        throw new Error(message);
      }

      const framework =
        data.framework === "next" || data.framework === "react"
          ? (data.framework as FrameworkKind)
          : "react";

      const context: EditorContextInfo = {
        framework,
        hasTailwind: Boolean(data.hasTailwind),
      };

      if (
        typeof data.router === "string" &&
        ["app", "pages", "react-router", "unknown"].includes(data.router)
      ) {
        context.router = data.router as RouterKind;
      }

      if (Array.isArray(data.pageRoots)) {
        context.pageRoots = data.pageRoots.filter(
          (item: unknown): item is string => typeof item === "string"
        );
      }

      if (typeof data.summary === "string") {
        context.summary = data.summary;
      }

      return context;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load editor context";
      logger.error("Failed to fetch editor context", error);
      throw new Error(message);
    }
  }

  async listFolders(): Promise<string[]> {
    const endpoint = `${this.baseUrl}/api/editor/folders`;
    logger.debug("Fetching project folders", { endpoint });

    try {
      const response = await fetch(endpoint);
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.success !== true) {
        const message =
          typeof data?.error === "string"
            ? data.error
            : `Failed with status ${response.status}`;
        throw new Error(message);
      }

      if (!Array.isArray(data.folders)) {
        throw new Error("Folders payload missing or invalid");
      }

      return data.folders.filter(
        (item: unknown): item is string => typeof item === "string"
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load folders";
      logger.error("Failed to fetch folders", error);
      throw new Error(message);
    }
  }

  async createPage(payload: CreatePagePayload): Promise<CreatePageResponse> {
    const endpoint = `${this.baseUrl}/api/editor/create`;
    logger.debug("Creating page", payload);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.success !== true) {
        const message =
          typeof data?.error === "string"
            ? data.error
            : `Failed with status ${response.status}`;
        throw new Error(message);
      }

      this.notifyHistoryChange();
      return {
        success: true,
        filePath: typeof data.filePath === "string" ? data.filePath : undefined,
        directory:
          typeof data.directory === "string" ? data.directory : undefined,
        framework:
          data.framework === "next" || data.framework === "react"
            ? (data.framework as FrameworkKind)
            : undefined,
        router:
          data.router === "app" ||
          data.router === "pages" ||
          data.router === "react-router"
            ? (data.router as RouterKind)
            : undefined,
        progressMessages: Array.isArray(data.progressMessages)
          ? data.progressMessages.filter(
              (item: unknown): item is string => typeof item === "string"
            )
          : undefined,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create page";
      logger.error("Failed to create page", error);
      throw new Error(message);
    }
  }

  async getHistoryStatus(): Promise<HistoryStatusResponse> {
    const endpoint = `${this.baseUrl}/api/history/status`;
    logger.debug("Fetching history status");

    try {
      const response = await fetch(endpoint);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage =
          typeof data.error === "string"
            ? data.error
            : `History status failed with status ${response.status}`;
        logger.warn("History status request failed", errorMessage);
        return { success: false, hasAction: false };
      }

      const action =
        data?.action && typeof data.action === "object"
          ? {
              id: String(data.action.id),
              type: String(data.action.type ?? ""),
              label: String(data.action.label ?? ""),
              timestamp: String(data.action.timestamp ?? ""),
              fileCount:
                typeof data.action.fileCount === "number"
                  ? data.action.fileCount
                  : undefined,
              files: Array.isArray(data.action.files)
                ? data.action.files.filter(
                    (value: unknown): value is string =>
                      typeof value === "string"
                  )
                : undefined,
            }
          : undefined;

      return {
        success: true,
        hasAction: Boolean(data?.hasAction && action),
        action: action && data?.hasAction ? action : undefined,
      };
    } catch (error) {
      logger.error("History status request error", error);
      return {
        success: false,
        hasAction: false,
      };
    }
  }

  async undoLastAction(): Promise<UndoActionResponse> {
    const endpoint = `${this.baseUrl}/api/history/undo`;
    logger.debug("Requesting undo of last action");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage =
          typeof data.error === "string"
            ? data.error
            : `Undo failed with status ${response.status}`;
        logger.warn("Undo failed", errorMessage);
        return { success: false, error: errorMessage };
      }

      const action =
        data?.action && typeof data.action === "object"
          ? {
              id: String(data.action.id),
              type: String(data.action.type ?? ""),
              label: String(data.action.label ?? ""),
              timestamp: String(data.action.timestamp ?? ""),
              fileCount:
                typeof data.action.fileCount === "number"
                  ? data.action.fileCount
                  : undefined,
              files: Array.isArray(data.action.files)
                ? data.action.files.filter(
                    (value: unknown): value is string =>
                      typeof value === "string"
                  )
                : undefined,
            }
          : undefined;

      logger.debug("Undo succeeded");
      this.notifyHistoryChange();

      return {
        success: true,
        restoredFiles: Array.isArray(data?.restoredFiles)
          ? (data.restoredFiles.filter(
              (value: unknown): value is string => typeof value === "string"
            ) as string[])
          : undefined,
        action,
      };
    } catch (error) {
      logger.error("Undo request error", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async deleteElement(payload: DeletePayload): Promise<DeleteResponse> {
    const endpoint = `${this.baseUrl}/api/delete-element`;
    logger.debug("Submitting delete", payload);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage =
          typeof data.error === "string"
            ? data.error
            : `Delete failed with status ${response.status}`;
        logger.warn("Delete request failed", errorMessage);
        return { success: false, error: errorMessage };
      }

      const message =
        typeof data.message === "string" ? data.message : undefined;

      this.notifyHistoryChange();
      return { success: true, message };
    } catch (error) {
      logger.error("Delete request error", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }


  private parseSmartEditResponse(data: any): SmartEditUpdateResponse {
    const success = typeof data.success === "boolean" ? data.success : false;
    const warning = typeof data.warning === "boolean" ? data.warning : false;
    const message = typeof data.message === "string" ? data.message : undefined;
    const error = typeof data.error === "string" ? data.error : undefined;
    const details = typeof data.details === "string" ? data.details : undefined;
    const filePath =
      typeof data.filePath === "string" ? data.filePath : undefined;
    const detectedProps = Array.isArray(data.detectedProps)
      ? (data.detectedProps.filter(
          (value: unknown): value is string => typeof value === "string"
        ) as string[])
      : undefined;
    const componentName =
      typeof data.componentName === "string" ? data.componentName : undefined;
    const signals = Array.isArray(data.signals)
      ? (data.signals.filter(
          (value: unknown): value is string => typeof value === "string"
        ) as string[])
      : undefined;

    return {
      success,
      warning,
      message,
      error,
      details,
      detectedProps,
      filePath,
      componentName,
      signals,
    };
  }

  async updateText(payload: {
    oldText: string;
    newText: string;
    tag: string;
    file: string;
    className?: string;
    elementTag?: string;
    textContent?: string;
    ownerComponentName?: string;
    ownerFilePath?: string;
    forceGlobal?: boolean;
  }): Promise<SmartEditUpdateResponse> {
    const endpoint = `${this.baseUrl}/api/update-text`;
    logger.debug("Submitting text update", payload);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage =
          typeof data.error === "string"
            ? data.error
            : `Text update failed with status ${response.status}`;
        logger.warn("Text update request failed", errorMessage);
        return { success: false, error: errorMessage };
      }

      const normalized = this.parseSmartEditResponse(data);
      if (typeof data.success !== "boolean") {
        normalized.success = true;
      }
      if (normalized.success && !normalized.warning) {
        this.notifyHistoryChange();
      }
      return normalized;
    } catch (error) {
      logger.error("Text update request error", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async updateFontSize(payload: {
    oldSize: string;
    newSize: string;
    text: string;
    tag: string;
    file: string;
    className?: string;
    elementTag?: string;
    textContent?: string;
    ownerComponentName?: string;
    ownerFilePath?: string;
    forceGlobal?: boolean;
  }): Promise<SmartEditUpdateResponse> {
    const endpoint = `${this.baseUrl}/api/update-font-size`;
    logger.debug("Submitting font size update", payload);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage =
          typeof data.error === "string"
            ? data.error
            : `Font size update failed with status ${response.status}`;
        logger.warn("Font size update request failed", errorMessage);
        return { success: false, error: errorMessage };
      }

      const normalized = this.parseSmartEditResponse(data);
      if (typeof data.success !== "boolean") {
        normalized.success = true;
      }
      if (normalized.success && !normalized.warning) {
        this.notifyHistoryChange();
      }
      return normalized;
    } catch (error) {
      logger.error("Font size update request error", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async updateColor(payload: {
    textColor?: { old: string; new: string };
    backgroundColor?: { old: string; new: string };
    hoverBackgroundColor?: { old: string; new: string };
    text: string;
    tag: string;
    file: string;
    className?: string;
    elementTag?: string;
    textContent?: string;
    ownerComponentName?: string;
    ownerFilePath?: string;
    forceGlobal?: boolean;
  }): Promise<SmartEditUpdateResponse> {
    const endpoint = `${this.baseUrl}/api/update-color`;
    logger.debug("Submitting color update", payload);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage =
          typeof data.error === "string"
            ? data.error
            : `Color update failed with status ${response.status}`;
        logger.warn("Color update request failed", errorMessage);
        return { success: false, error: errorMessage };
      }

      const normalized = this.parseSmartEditResponse(data);
      if (typeof data.success !== "boolean") {
        normalized.success = true;
      }
      if (normalized.success && !normalized.warning) {
        this.notifyHistoryChange();
      }
      return normalized;
    } catch (error) {
      logger.error("Color update request error", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async updateFontFamily(payload: {
    oldFont?: string;
    newFont: string;
    text: string;
    tag: string;
    file: string;
    className?: string;
    elementTag?: string;
    textContent?: string;
    ownerComponentName?: string;
    ownerFilePath?: string;
    forceGlobal?: boolean;
  }): Promise<SmartEditUpdateResponse> {
    const endpoint = `${this.baseUrl}/api/update-font-family`;
    logger.debug("Submitting font family update", payload);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage =
          typeof data.error === "string"
            ? data.error
            : `Font family update failed with status ${response.status}`;
        logger.warn("Font family update request failed", errorMessage);
        return { success: false, error: errorMessage };
      }

      const normalized = this.parseSmartEditResponse(data);
      if (typeof data.success !== "boolean") {
        normalized.success = true;
      }
      if (normalized.success && !normalized.warning) {
        this.notifyHistoryChange();
      }
      return normalized;
    } catch (error) {
      logger.error("Font family update request error", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  onHistoryChange(listener: () => void): () => void {
    this.historyListeners.add(listener);
    return () => {
      this.historyListeners.delete(listener);
    };
  }

  private notifyHistoryChange() {
    this.historyListeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        logger.warn("History listener failed", error);
      }
    });
  }
}

function resolveBackendUrl(): string {
  if (typeof window !== "undefined") {
    const globalValue = (window as any).BRAKIT_BACKEND_URL;
    if (typeof globalValue === "string" && globalValue.length > 0) {
      return globalValue;
    }
  }

  const envValue = (import.meta as any)?.env?.BRAKIT_BACKEND_URL;
  if (typeof envValue === "string" && envValue.length > 0) {
    return envValue;
  }

  if (typeof process !== "undefined") {
    const processEnv = (process as any).env?.BRAKIT_BACKEND_URL;
    if (typeof processEnv === "string" && processEnv.length > 0) {
      return processEnv;
    }
  }

  if (typeof window !== "undefined" && window.location) {
    const { protocol, hostname, port } = window.location;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:3001`;
    }

    if (port && port.length > 0) {
      return `${protocol}//${hostname}:3001`;
    }

    return `${protocol}//${hostname}:3001`;
  }

  return DEFAULT_BACKEND_URL;
}
