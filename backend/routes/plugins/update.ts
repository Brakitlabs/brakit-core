import express from "express";
import type { UpdateServicePluginRegistry, UpdateRequest } from "../../services/shared/plugins";
import { logger } from "../../utils/logger";

export function createPluginUpdateRouter(registry: UpdateServicePluginRegistry) {
  const router = express.Router();

  router.post("/", async (req, res) => {
    try {
      const request: UpdateRequest = req.body;

      if (!request.type) {
        return res.status(400).json({
          success: false,
          error: "Missing required field: type",
        });
      }

      const plugins = registry.getAllPlugins();
      const plugin = plugins.find((p) => p.canHandle(request));

      if (!plugin) {
        return res.status(404).json({
          success: false,
          error: `No plugin found to handle request type: ${request.type}`,
        });
      }

      logger.info({
        message: "Delegating to plugin",
        context: {
          pluginName: plugin.name,
          requestType: request.type,
        },
      });

      const projectPath = process.env.BRAKIT_PROJECT_PATH || process.cwd();
      const context = {
        projectRoot: projectPath,
        resolveFilePath: (filePath: string) => filePath,
        normalizeText: (text: string) => text.toLowerCase().trim(),
      };

      const result = await plugin.handle(request, context);

      return res.json(result);
    } catch (error) {
      logger.error({
        message: "Plugin update error",
        context: { error: error instanceof Error ? error.message : "Unknown error" },
      });

      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  });

  return router;
}
