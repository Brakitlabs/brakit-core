import "./components/BrakitBubble.js";
import "./components/BrakitModal.js";
import "./components/BrakitToast.js";
import "./components/SmartEditWarning.js";
import "./components/PageBuilderModal.js";
import "./components/LoadingOverlay.js";
// @ts-ignore
import highlightStyles from "./styles/highlights.css?raw";
import { OverlayController } from "./core/overlayController";
import { ModalManager } from "./core/managers/modalManager";
import { BackendClient, EditorContextInfo } from "./services/backendClient";
import { ElementPayloadService } from "./payload/ElementPayloadService";
import { logger } from "./utils/logger";
import { buildDrawSelectionResult } from "./core/draw/drawContextBuilder";
import type { DrawSelectionResult } from "./core/draw/drawContext";
import type { InitializedSubsystems } from "./core/orchestrators";
import { PluginHost } from "./plugins/pluginHost";
import type { OverlayPluginContext } from "./plugins/types";

class BrakitOverlayApp {
  private controller: OverlayController;
  private backend: BackendClient;
  private subsystems: InitializedSubsystems;
  private bubble: HTMLElement | null = null;
  private toast: any | null = null;
  private smartEditWarning: HTMLElement | null = null;
  private observer: MutationObserver | null = null;
  private payloadService: ElementPayloadService;
  private pageBuilderModal: any | null = null;
  private editorContext: EditorContextInfo | null = null;
  private pageFolders: string[] = [];
  private isFetchingPageBuilderData = false;
  private hasLoadedPageBuilderData = false;
  private loadingOverlay: any | null = null;
  private editorContextPromise: Promise<EditorContextInfo | null> | null = null;
  private pluginHost = new PluginHost();
  private pendingPluginSelections: DrawSelectionResult[] = [];

  constructor() {
    this.injectHighlightStyles();
    this.backend = new BackendClient();
    this.controller = new OverlayController({
      document,
      backendClient: this.backend,
      modalManager: new ModalManager(document),
    });
    this.subsystems = this.controller.getSubsystems();
    this.payloadService = this.controller.getPayloadService();

    this.ensureBubble();
    this.ensureToast();
    this.ensureSmartEditWarning();
    this.ensurePageBuilderModal();
    this.ensureLoadingOverlay();
    this.observeDom();
    this.setupDeleteListener();
    this.setupPageBuilderListener();
    void this.ensureEditorContextLoaded();
    this.pluginHost.initialize(() => this.buildPluginContext());
    this.flushPendingPluginSelections();
  }

  private buildPluginContext(): OverlayPluginContext {
    return {
      app: this,
      document,
      backend: this.backend,
      controller: this.controller,
      payloadService: this.payloadService,
    };
  }

  private injectHighlightStyles() {
    if (document.getElementById("brakit-highlight-styles")) {
      return;
    }

    const styleElement = document.createElement("style");
    styleElement.id = "brakit-highlight-styles";
    styleElement.textContent = highlightStyles;
    (document.head || document.documentElement).appendChild(styleElement);
  }

  destroy() {
    this.controller.detach();
    this.observer?.disconnect();
    this.bubble?.remove();
    this.toast?.remove();
    this.smartEditWarning?.remove();
    this.bubble = null;
    this.toast = null;
    this.smartEditWarning = null;
    this.pluginHost.destroy();
  }

  private ensureSmartEditWarning() {
    const attach = (element: Element) => {
      this.smartEditWarning = element as HTMLElement;
      this.controller.attachSmartEditWarningElement(
        this.smartEditWarning as HTMLElement
      );
    };

    if (!document.body) {
      document.addEventListener(
        "DOMContentLoaded",
        () => this.ensureSmartEditWarning(),
        { once: true }
      );
      return;
    }

    const existing = document.querySelector("brakit-smart-edit-warning");
    if (existing) {
      attach(existing);
      return;
    }

    const element = document.createElement("brakit-smart-edit-warning");
    document.body.appendChild(element);
    attach(element);
  }

  private ensurePageBuilderModal() {
    if (this.pageBuilderModal) {
      return;
    }

    const attach = (element: Element) => {
      const modal = element as any;
      if (this.pageBuilderModal === modal) {
        return;
      }

      modal.addEventListener("page-builder:create", (event: CustomEvent) => {
        void this.handlePageBuilderCreate(event);
      });
      modal.addEventListener("page-builder:close", () =>
        this.handlePageBuilderClose()
      );
      modal.addEventListener("page-builder:reload-folders", () => {
        void this.fetchPageBuilderData(true);
      });

      if (this.editorContext) {
        modal.setFramework?.(this.editorContext);
      }
      if (this.pageFolders.length) {
        modal.setFolders?.(this.pageFolders);
      }
      if (this.isFetchingPageBuilderData) {
        modal.setFolderLoading?.(true);
      }

      this.pageBuilderModal = modal;
    };

    if (!document.body) {
      document.addEventListener(
        "DOMContentLoaded",
        () => this.ensurePageBuilderModal(),
        { once: true }
      );
      return;
    }

    const existing = document.querySelector("brakit-page-builder");
    if (existing) {
      attach(existing);
      return;
    }

    const element = document.createElement("brakit-page-builder");
    document.body.appendChild(element);
    attach(element);
  }

  private openPageBuilderModal() {
    this.ensurePageBuilderModal();
    const modal = this.pageBuilderModal;
    if (!modal) {
      return;
    }
    if (this.editorContext) {
      modal.setFramework?.(this.editorContext);
    }
    if (this.pageFolders.length) {
      modal.setFolders?.(this.pageFolders);
    }
    if (!this.hasLoadedPageBuilderData) {
      modal.setFolderLoading?.(true);
    }

    modal.openModal?.();
    void this.fetchPageBuilderData();
  }

  private async fetchPageBuilderData(force = false) {
    const modal = this.pageBuilderModal;
    if (!modal) {
      return;
    }

    if (this.isFetchingPageBuilderData) {
      return;
    }

    if (this.hasLoadedPageBuilderData && !force) {
      return;
    }

    this.isFetchingPageBuilderData = true;
    modal.setFolderLoading?.(true);
    modal.setFolderError?.(null);

    try {
      const [contextResult, foldersResult] = await Promise.allSettled([
        this.backend.getEditorContext(),
        this.backend.listFolders(),
      ]);

      if (contextResult.status === "fulfilled") {
        this.applyEditorContext(contextResult.value);
      } else if (contextResult.reason) {
        console.warn(
          "[Brakit] Failed to load editor context",
          contextResult.reason
        );
      }

      if (foldersResult.status === "fulfilled") {
        this.pageFolders = foldersResult.value;
        modal.setFolders?.(this.pageFolders);
        modal.setFolderError?.(null);
        this.hasLoadedPageBuilderData = true;
      } else {
        const reason = foldersResult.reason;
        const message =
          reason instanceof Error ? reason.message : "Unable to load folders";
        modal.setFolderError?.(message);
        this.hasLoadedPageBuilderData = false;
      }
    } finally {
      this.isFetchingPageBuilderData = false;
      modal.setFolderLoading?.(false);
    }
  }

  private async handlePageBuilderCreate(event: CustomEvent) {
    if (!this.pageBuilderModal) {
      return;
    }

    const detail = event.detail as
      | { folder?: string; name?: string; layout?: string }
      | undefined;
    const folderRaw = (detail?.folder || "").trim();
    const nameRaw = (detail?.name || "").trim();
    const layout = (detail?.layout || "").trim();

    const name = nameRaw || "Untitled";
    const folder =
      folderRaw && folderRaw !== "/"
        ? folderRaw.replace(/\/+$/, "")
        : undefined;

    this.pageBuilderModal.setCreateError?.(null);
    this.pageBuilderModal.setCreatePending?.(true);
    this.loadingOverlay?.show();
    this.loadingOverlay?.updateProgress(
      "Scaffolding your page",
      "Installing dependencies and setting up the layout..."
    );
    this.loadingOverlay?.addProgressStep("🚀 Starting page setup...");

    try {
      const response = await this.backend.createPage({
        folder,
        name,
        layout,
      });

      if (
        Array.isArray(response.progressMessages) &&
        response.progressMessages.length > 0
      ) {
        this.loadingOverlay?.clearProgress();
        response.progressMessages.forEach((message) => {
          this.loadingOverlay?.addProgressStep(message);
        });
      }
      this.loadingOverlay?.addProgressStep("✅ Page created successfully!");
      this.loadingOverlay?.updateProgress(
        "✅ Complete!",
        "Your new page is ready."
      );
      this.loadingOverlay?.showCompletion();
      await new Promise<void>((resolve) => {
        const handleDone = () => {
          document.removeEventListener("done-clicked", handleDone);
          resolve();
        };
        document.addEventListener("done-clicked", handleDone);
      });

      if (!this.loadingOverlay && Array.isArray(response.progressMessages)) {
        response.progressMessages.forEach((message, index) => {
          window.setTimeout(() => this.showToast(message), index * 250);
        });
      }

      const previewUrl =
        typeof this.pageBuilderModal.getPreviewUrl === "function"
          ? this.pageBuilderModal.getPreviewUrl()
          : null;

      const redirectUrl =
        previewUrl && previewUrl.startsWith("http") ? previewUrl : null;

      const displayPath =
        redirectUrl !== null
          ? new URL(redirectUrl).pathname || "/"
          : previewUrl && previewUrl.startsWith("/")
            ? previewUrl
            : this.buildFallbackDisplayPath(folderRaw, name);

      this.pageBuilderModal.setCreatePending?.(false);
      this.pageBuilderModal.closeModal?.();

      this.showToast(
        `✅ Created ${displayPath} using the “${layout || "blank"}” layout.`
      );

      if (redirectUrl) {
        window.setTimeout(() => {
          window.location.assign(redirectUrl);
        }, 600);
      }

      this.hasLoadedPageBuilderData = false;
      void this.fetchPageBuilderData(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create page";
      this.pageBuilderModal.setCreateError?.(message);
      this.pageBuilderModal.setCreatePending?.(false);
      this.showToast(`⚠️ ${message}`);
    } finally {
      this.loadingOverlay?.hide();
    }
  }

  private handlePageBuilderClose() {
    if (!this.pageBuilderModal) {
      return;
    }
    this.pageBuilderModal.setCreateError?.(null);
    this.pageBuilderModal.setCreatePending?.(false);
    this.pageBuilderModal.closeModal?.();
  }

  private setupPageBuilderListener() {
    document.addEventListener("brakit:new-page", () => {
      this.openPageBuilderModal();
    });
  }

  /**
   * Setup delete element listener
   */
  private setupDeleteListener() {
    document.addEventListener("brakit:delete-element", ((
      event: CustomEvent
    ) => {
      const { element } = event.detail;
      this.handleDeleteAction(element);
    }) as EventListener);
  }

  /**
   * Handle delete action from DeleteTool
   */
  private handleDeleteAction(element: HTMLElement) {
    // Proceed with deletion
    this.performDelete(element);
  }

  /**
   * Perform the actual deletion
   */
  private async performDelete(element: HTMLElement) {
    try {
      // Build delete payload using React Fiber
      const payload = this.buildDeletePayload(element);

      // Send to backend
      const response = await this.backend.deleteElement(payload);

      if (response.success) {
        this.showToast("✓ Element deleted! Page reloading...");

        window.setTimeout(() => {
          window.location.reload();
        }, 600);
      } else {
        this.showToast(`Failed: ${response.error || "Unknown error"}`);
      }
    } catch (error) {
      this.showToast("Failed to delete element");
    }
  }

  /**
   * Build delete payload for backend
   */
  private buildDeletePayload(element: HTMLElement): any {
    return this.payloadService.buildDeletePayload({ element });
  }

  /**
   * Show toast notification
   */
  showToast(message: string) {
    if (this.toast && typeof this.toast.show === "function") {
      this.toast.show(message);
    }
  }

  private buildFallbackDisplayPath(folderRaw: string, name: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const folder =
      folderRaw && folderRaw !== "/" ? folderRaw.replace(/^\/+|\/+$/g, "") : "";

    if (!slug && !folder) {
      return "/";
    }

    const combined = slug ? `${folder ? `${folder}/` : ""}${slug}` : folder;

    return combined.startsWith("/") ? combined : `/${combined}`;
  }

  private ensureBubble() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", () => this.ensureBubble(), {
        once: true,
      });
      return;
    }

    if (document.querySelector("brakit-bubble")) {
      this.bubble = document.querySelector("brakit-bubble");
      this.controller.attachBubbleElement(this.bubble as HTMLElement);
      return;
    }

    const bubble = document.createElement("brakit-bubble");
    document.body.appendChild(bubble);
    this.bubble = bubble;
    this.controller.attachBubbleElement(bubble);
  }

  private ensureToast() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", () => this.ensureToast(), {
        once: true,
      });
      return;
    }

    if (document.querySelector("brakit-toast")) {
      this.toast = document.querySelector("brakit-toast");
      this.controller.attachToastElement(this.toast);
      return;
    }

    const toast = document.createElement("brakit-toast");
    document.body.appendChild(toast);
    this.toast = toast;
    this.controller.attachToastElement(toast);
  }

  private ensureLoadingOverlay() {
    const attach = (element: Element) => {
      this.loadingOverlay = element;
      this.loadingOverlay.hide();
    };

    if (!document.body) {
      document.addEventListener(
        "DOMContentLoaded",
        () => this.ensureLoadingOverlay(),
        { once: true }
      );
      return;
    }

    const existing = document.querySelector("brakit-loading-overlay");
    if (existing) {
      attach(existing);
      return;
    }

    const loading = document.createElement("brakit-loading-overlay");
    document.body.appendChild(loading);
    attach(loading);
  }

  getLoadingOverlay() {
    this.ensureLoadingOverlay();
    return this.loadingOverlay;
  }

  createDrawSelection(
    bounds: {
      left: number;
      top: number;
      width: number;
      height: number;
    },
    anchorElement: HTMLElement | null
  ): DrawSelectionResult {
    return buildDrawSelectionResult({
      document,
      bounds,
      anchorElement,
    });
  }

  handlePluginDrawSelection(result: DrawSelectionResult) {
    if (!result) {
      return;
    }

    const handler = this.subsystems.drawSelectionHandler;
    if (!handler) {
      this.pendingPluginSelections.push(result);
      return;
    }

    while (this.pendingPluginSelections.length) {
      const next = this.pendingPluginSelections.shift();
      if (next) {
        handler.handleDrawSelection(next);
      }
    }

    handler.handleDrawSelection(result);
  }

  private flushPendingPluginSelections() {
    const handler = this.subsystems.drawSelectionHandler;
    if (!handler || this.pendingPluginSelections.length === 0) {
      return;
    }
    while (this.pendingPluginSelections.length) {
      const next = this.pendingPluginSelections.shift();
      if (next) {
        handler.handleDrawSelection(next);
      }
    }
  }

  async ensureEditorContextLoaded(): Promise<EditorContextInfo | null> {
    if (this.editorContext) {
      return this.editorContext;
    }

    if (!this.editorContextPromise) {
      this.editorContextPromise = (async () => {
        try {
          const context = await this.backend.getEditorContext();
          if (context) {
            this.applyEditorContext(context);
          }
          return context;
        } catch (error) {
          logger.warn("Failed to load editor context", error);
          return null;
        } finally {
          this.editorContextPromise = null;
        }
      })();
    }

    try {
      await this.editorContextPromise;
    } catch {
      // Already logged in ensureEditorContextLoaded
    }
    return this.editorContext;
  }

  private applyEditorContext(context: EditorContextInfo) {
    this.editorContext = context;
    this.pageBuilderModal?.setFramework?.(context);
  }

  getCurrentRouteSegments(): string[] {
    return window.location.pathname.split("/").filter(Boolean);
  }

  buildRouteFilePath(segments: string[]): string {
    const normalizedSegments = segments.filter(Boolean);
    const framework = this.editorContext?.framework ?? "next";
    const router = this.editorContext?.router ?? "app";

    if (framework === "next") {
      if (router === "pages") {
        return this.buildNextPagesFilePath(normalizedSegments);
      }
      return this.buildNextAppFilePath(normalizedSegments);
    }

    if (router === "react-router") {
      return this.buildReactRouterFilePath(normalizedSegments);
    }

    return this.buildNextAppFilePath(normalizedSegments);
  }

  private buildNextAppFilePath(segments: string[]): string {
    const base =
      this.findPageRoot(/(^|\/)app$/, ["app", "src/app"]) || "src/app";
    const suffix =
      segments.length > 0 ? `${segments.join("/")}/page.tsx` : "page.tsx";
    return this.joinPaths(base, suffix);
  }

  private buildNextPagesFilePath(segments: string[]): string {
    const base =
      this.findPageRoot(/(^|\/)pages$/, ["pages", "src/pages"]) || "pages";
    const suffix =
      segments.length > 0 ? `${segments.join("/")}.tsx` : "index.tsx";
    return this.joinPaths(base, suffix);
  }

  private buildReactRouterFilePath(segments: string[]): string {
    const base =
      this.findPageRoot(/pages|routes/, ["src/pages", "src/routes", "pages"]) ||
      "src/pages";
    const suffix =
      segments.length > 0 ? `${segments.join("/")}.tsx` : "index.tsx";
    return this.joinPaths(base, suffix);
  }

  private findPageRoot(
    matcher: RegExp,
    fallbacks: string[]
  ): string | undefined {
    const normalizedRoots = (this.editorContext?.pageRoots ?? [])
      .map((root) => root.replace(/^\/+|\/+$/g, ""))
      .filter(Boolean);

    const matchingRoot = normalizedRoots.find((root) => matcher.test(root));
    if (matchingRoot) {
      return matchingRoot;
    }

    return fallbacks.find((fallback) => normalizedRoots.includes(fallback));
  }

  private joinPaths(base: string, relative: string): string {
    const normalizedBase = base.replace(/\/+$/, "");
    return `${normalizedBase}/${relative}`.replace(/^\/+/, "");
  }

  private observeDom() {
    if (this.observer) return;

    this.observer = new MutationObserver(() => {
      if (!document.body) return;
      if (!document.querySelector("brakit-bubble")) {
        this.ensureBubble();
      }
    });

    const startObserving = () => {
      if (!document.body) return;
      this.observer?.observe(document.body, {
        childList: true,
        subtree: false,
      });
    };

    if (document.body) {
      startObserving();
    } else {
      document.addEventListener("DOMContentLoaded", startObserving, {
        once: true,
      });
    }
  }
}

if (typeof window !== "undefined") {
  window.brakitOverlay = new BrakitOverlayApp();
}

export type { BrakitOverlayApp };
