import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { logger } from "../../utils/logger";

export interface ActionMetadata {
  type: string;
  label: string;
  details?: Record<string, unknown>;
}

interface FileChangeRecord {
  absolutePath: string;
  relativePath: string;
  beforeContent: string | null;
  afterContent: string | null;
  existedBefore: boolean;
  existedAfter: boolean;
}

export interface ActionEntry extends ActionMetadata {
  id: string;
  timestamp: string;
  files: FileChangeRecord[];
}

export interface UndoResult {
  success: boolean;
  restoredFiles?: string[];
  action?: {
    id: string;
    type: string;
    label: string;
    timestamp: string;
  };
  error?: string;
}

interface ActionContext {
  metadata: ActionMetadata;
  files: Map<string, FileChangeRecord>;
}

interface RecordFileChangeOptions {
  existedBefore?: boolean;
  existedAfter?: boolean;
}

export class ActionHistory {
  private storage = new AsyncLocalStorage<ActionContext>();
  private lastAction: ActionEntry | null = null;
  private readonly historyFilePath: string;

  constructor(private readonly projectRoot: string) {
    this.historyFilePath = path.resolve(
      this.projectRoot,
      ".brakit-history.json"
    );
    this.restorePersistedHistory();
  }

  async runAction<T>(metadata: ActionMetadata, handler: () => Promise<T>): Promise<T> {
    const context: ActionContext = {
      metadata,
      files: new Map(),
    };

    return await this.storage.run(context, async () => {
      try {
        const result = await handler();
        this.commitIfNeeded();
        return result;
      } catch (error) {
        this.discardContext();
        throw error;
      }
    });
  }

  recordFileChange(
    filePath: string,
    beforeContent: string | null,
    afterContent: string | null,
    options?: RecordFileChangeOptions
  ): void {
    const context = this.storage.getStore();
    if (!context) {
      logger.info({
        message: "[ActionHistory] Attempted to record change without active context",
        context: { filePath },
      });
      return;
    }

    const normalized = this.normalizePath(filePath);
    const existedBefore =
      options?.existedBefore ?? (beforeContent !== null);
    const existedAfter =
      options?.existedAfter ?? (afterContent !== null);
    const existing = context.files.get(normalized.absolutePath);

    if (!existing) {
      context.files.set(normalized.absolutePath, {
        absolutePath: normalized.absolutePath,
        relativePath: normalized.relativePath,
        beforeContent,
        afterContent,
        existedBefore,
        existedAfter,
      });
      return;
    }

    // Preserve the very first "before" content, but always update the latest "after" state
    existing.afterContent = afterContent;
    existing.existedAfter = existedAfter;
  }

  getLastActionSummary() {
    if (!this.lastAction) {
      return null;
    }

    return {
      id: this.lastAction.id,
      type: this.lastAction.type,
      label: this.lastAction.label,
      timestamp: this.lastAction.timestamp,
      fileCount: this.lastAction.files.length,
      files: this.lastAction.files.map((file) => file.relativePath),
    };
  }

  async undoLastAction(): Promise<UndoResult> {
    if (!this.lastAction) {
      return {
        success: false,
        error: "No action available to undo",
      };
    }

    try {
      for (const file of this.lastAction.files) {
        if (!file.existedBefore) {
          if (fs.existsSync(file.absolutePath)) {
            fs.unlinkSync(file.absolutePath);
          }
          continue;
        }

        fs.mkdirSync(path.dirname(file.absolutePath), { recursive: true });
        fs.writeFileSync(file.absolutePath, file.beforeContent ?? "", "utf8");
      }

      const undoneAction = this.lastAction;
      this.lastAction = null;
      this.persistHistoryState();

      return {
        success: true,
        restoredFiles: undoneAction.files.map((file) => file.relativePath),
        action: {
          id: undoneAction.id,
          type: undoneAction.type,
          label: undoneAction.label,
          timestamp: undoneAction.timestamp,
        },
      };
    } catch (error) {
      const currentAction = this.lastAction;
      logger.error({
        message: "[ActionHistory] Failed to undo action",
        context: {
          error: error instanceof Error ? error.message : String(error),
          actionId: currentAction?.id,
        },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to undo changes",
      };
    }
  }

  clear(): void {
    this.lastAction = null;
    this.persistHistoryState();
  }

  private commitIfNeeded(): void {
    const context = this.storage.getStore();
    if (!context) {
      return;
    }

    if (context.files.size === 0) {
      return;
    }

    const meaningfulFiles = Array.from(context.files.values()).filter(
      (file) => {
        const changed =
          file.existedBefore !== file.existedAfter ||
          file.beforeContent !== file.afterContent;

        if (!changed) {
          return false;
        }

        if (file.existedBefore && file.beforeContent === null) {
          logger.warn({
            message:
              "[ActionHistory] Skipping file without captured baseline content",
            context: { file: file.relativePath, actionType: context.metadata.type },
          });
          return false;
        }

        return true;
      }
    );

    if (meaningfulFiles.length === 0) {
      return;
    }

    const timestamp = new Date().toISOString();
    const id = randomUUID();

    this.lastAction = {
      id,
      timestamp,
      type: context.metadata.type,
      label: context.metadata.label,
      details: context.metadata.details,
      files: meaningfulFiles,
    };
    this.persistHistoryState();
  }

  private discardContext(): void {
    const context = this.storage.getStore();
    if (!context) {
      return;
    }

    for (const file of context.files.values()) {
      if (file.afterContent === file.beforeContent) {
        continue;
      }

      logger.warn({
        message: "[ActionHistory] Discarding recorded changes due to error",
        context: {
          file: file.relativePath,
          actionType: context.metadata.type,
        },
      });
    }
  }

  private normalizePath(filePath: string): {
    absolutePath: string;
    relativePath: string;
  } {
    const absolutePath = path.resolve(filePath);
    const relativeFromProject = path.relative(this.projectRoot, absolutePath);

    const relativePath = relativeFromProject.startsWith("..")
      ? absolutePath
      : relativeFromProject;

    return {
      absolutePath,
      relativePath,
    };
  }

  private restorePersistedHistory() {
    try {
      if (!fs.existsSync(this.historyFilePath)) {
        return;
      }
      const raw = fs.readFileSync(this.historyFilePath, "utf8");
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.id === "string" &&
        Array.isArray(parsed.files)
      ) {
        this.lastAction = parsed as ActionEntry;
      }
    } catch (error) {
      logger.warn({
        message: "[ActionHistory] Failed to restore persisted history",
        context: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  private persistHistoryState() {
    try {
      if (!this.lastAction) {
        if (fs.existsSync(this.historyFilePath)) {
          fs.unlinkSync(this.historyFilePath);
        }
        return;
      }

      const payload = JSON.stringify(this.lastAction, null, 2);
      fs.writeFileSync(this.historyFilePath, payload, "utf8");
    } catch (error) {
      logger.warn({
        message: "[ActionHistory] Failed to persist history state",
        context: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }
}
