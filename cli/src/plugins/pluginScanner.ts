import path from "path";
import fs from "fs";

interface Plugin {
  name: string;
  file: string;
}

export class PluginScanner {
  static scan(projectPath: string): Plugin[] {
    const pluginsDir = path.join(projectPath, ".brakit", "plugins");
    const plugins: Plugin[] = [];

    if (!fs.existsSync(pluginsDir)) {
      return plugins;
    }

    try {
      const files = fs.readdirSync(pluginsDir);
      files.forEach((file) => {
        if (file.endsWith(".js") || file.endsWith(".mjs") || file.endsWith(".cjs")) {
          plugins.push({
            name: path.basename(file, path.extname(file)),
            file,
          });
        }
      });
    } catch (err) {
      // Ignore scan errors
    }

    return plugins;
  }
}
