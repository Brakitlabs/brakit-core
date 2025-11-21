import type { OverlayPluginContext, PluginInitializer } from "./types";
import { logger } from "../utils/logger";

export class PluginHost {
  private cleanups: Array<() => void> = [];

  initialize(buildContext: () => OverlayPluginContext): void {
    const runInitializer = (initializer: PluginInitializer) => {
      try {
        const cleanup = initializer(buildContext());
        if (typeof cleanup === "function") {
          this.cleanups.push(cleanup);
        }
      } catch (error) {
        logger.warn("Overlay plugin initialization failed", error);
      }
    };

    const queue = Array.isArray(window.__brakitPluginQueue)
      ? window.__brakitPluginQueue
      : [];

    queue.forEach(runInitializer);

    const queueProxy: PluginInitializer[] = [];
    queueProxy.push = ((initializer: PluginInitializer) => {
      runInitializer(initializer);
      return queueProxy.length;
    }) as typeof queueProxy.push;
    window.__brakitPluginQueue = queueProxy;

    window.registerBrakitPlugin = (initializer: PluginInitializer) => {
      runInitializer(initializer);
    };

    logger.info("Plugin host initialized");
  }

  destroy(): void {
    for (const cleanup of this.cleanups) {
      try {
        cleanup();
      } catch (error) {
        logger.warn("Plugin cleanup failed", error);
      }
    }
    this.cleanups = [];
    if (window.registerBrakitPlugin) {
      delete window.registerBrakitPlugin;
    }
  }

  getCleanups(): Array<() => void> {
    return this.cleanups;
  }
}
