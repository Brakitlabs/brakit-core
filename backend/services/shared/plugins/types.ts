import type { BaseUpdateResult } from "../types";

export interface UpdateRequest {
  type: string;
  filePath?: string;
  property?: string;
  value?: string;
  metadata?: Record<string, any>;
}

export interface UpdatePluginContext {
  projectRoot: string;
  resolveFilePath: (filePath: string) => string | null;
  normalizeText: (text: string) => string;
}

export interface UpdateServicePlugin {
  name: string;
  canHandle(request: UpdateRequest): boolean;
  handle(request: UpdateRequest, context: UpdatePluginContext): Promise<BaseUpdateResult>;
}

export interface UpdatePluginRegistry {
  registerPlugin(plugin: UpdateServicePlugin): void;
  unregisterPlugin(pluginName: string): void;
  getPlugin(name: string): UpdateServicePlugin | undefined;
  getAllPlugins(): UpdateServicePlugin[];
}
