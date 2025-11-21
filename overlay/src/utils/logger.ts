const DEBUG_FLAG = "BRAKIT_DEBUG";

type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
  private enabled: boolean;

  constructor() {
    this.enabled = this.shouldEnableDebug();
  }

  debug(message: string, ...args: unknown[]) {
    if (!this.enabled) return;
    this.write("debug", message, ...args);
  }

  info(message: string, ...args: unknown[]) {
    this.write("info", message, ...args);
  }

  warn(message: string, ...args: unknown[]) {
    this.write("warn", message, ...args);
  }

  error(message: string, ...args: unknown[]) {
    this.write("error", message, ...args);
  }

  private write(level: LogLevel, message: string, ...args: unknown[]) {
    const prefix = `[Brakit:${level}]`;
    switch (level) {
      case "debug":
        console.debug(prefix, message, ...args);
        break;
      case "info":
        console.info(prefix, message, ...args);
        break;
      case "warn":
        console.warn(prefix, message, ...args);
        break;
      case "error":
        console.error(prefix, message, ...args);
        break;
      default:
        console.log(prefix, message, ...args);
    }
  }

  private shouldEnableDebug(): boolean {
    try {
      const flag = (window as any)[DEBUG_FLAG];
      if (typeof flag === "boolean") {
        return flag;
      }
      const fromStorage = window.localStorage.getItem(DEBUG_FLAG);
      return fromStorage === "true";
    } catch (error) {
      return false;
    }
  }
}

export const logger = new Logger();
