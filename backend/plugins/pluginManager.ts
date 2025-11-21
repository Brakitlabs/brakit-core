import fs from "fs";
import path from "path";
import { logger } from "../utils/logger";

export interface Plugin {
  name: string;
  entryPoint: string; // e.g., "plugin-name.js"
  absolutePath: string;
}

class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private pluginsDir: string;

  constructor(projectPath: string) {
    this.pluginsDir = path.join(projectPath, ".brakit", "plugins");
    this.discoverPlugins();
  }

  private discoverPlugins() {
    if (!fs.existsSync(this.pluginsDir)) {
      return;
    }

    try {
      const files = fs.readdirSync(this.pluginsDir);
      
      files.forEach((file) => {
        if (file.endsWith(".js") || file.endsWith(".mjs") || file.endsWith(".cjs")) {
          const name = path.basename(file, path.extname(file));
          
          this.plugins.set(name, {
            name,
            entryPoint: file,
            absolutePath: path.join(this.pluginsDir, file),
          });
          
          logger.info({ message: "Plugin discovered", context: { name, file } });
        }
      });
    } catch (error) {
      logger.error({ 
        message: "Failed to discover plugins", 
        context: { error: error instanceof Error ? error.message : String(error) } 
      });
    }
  }

  public getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  public getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  public getPluginContent(name: string): string | null {
    const plugin = this.plugins.get(name);
    if (!plugin) return null;

    try {
      return fs.readFileSync(plugin.absolutePath, "utf-8");
    } catch (error) {
      logger.error({ 
        message: "Failed to read plugin content", 
        context: { name, error: error instanceof Error ? error.message : String(error) } 
      });
      return null;
    }
  }
}

export default PluginManager;
