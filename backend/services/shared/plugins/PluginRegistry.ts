import type { UpdateServicePlugin, UpdatePluginRegistry } from "./types";
import { logger } from "../../../utils/logger";

export class UpdateServicePluginRegistry implements UpdatePluginRegistry {
  private plugins: Map<string, UpdateServicePlugin> = new Map();

  registerPlugin(plugin: UpdateServicePlugin): void {
    if (this.plugins.has(plugin.name)) {
      logger.warn({
        message: "Plugin already registered, replacing",
        context: { pluginName: plugin.name },
      });
    }

    this.plugins.set(plugin.name, plugin);
    logger.info({
      message: "Plugin registered",
      context: { pluginName: plugin.name },
    });
  }

  unregisterPlugin(pluginName: string): void {
    if (this.plugins.delete(pluginName)) {
      logger.info({
        message: "Plugin unregistered",
        context: { pluginName },
      });
    }
  }

  getPlugin(name: string): UpdateServicePlugin | undefined {
    return this.plugins.get(name);
  }

  getAllPlugins(): UpdateServicePlugin[] {
    return Array.from(this.plugins.values());
  }
}
