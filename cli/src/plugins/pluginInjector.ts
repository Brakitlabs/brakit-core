export class PluginInjector {
  static buildScriptTags(plugins: string[], backendOrigin: string): string {
    if (plugins.length === 0) {
      return "";
    }

    return plugins
      .map((pluginName) => {
        return `<script src="${backendOrigin}/plugins/${pluginName}.js"></script>`;
      })
      .join("\n");
  }
}
