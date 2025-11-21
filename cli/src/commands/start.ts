import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import http from "http";
import httpProxy from "http-proxy";
import detectPort from "detect-port";
import chalk from "chalk";
import zlib from "zlib";
import path from "path";
import type {
  IncomingMessage,
  ServerResponse,
  OutgoingHttpHeaders,
} from "http";
import type { Socket } from "net";

import { allocatePorts, AllocatedPorts } from "../utils/portAllocator";
import { checkForUpdates } from "../utils/updateChecker";
import { PluginScanner } from "../plugins/pluginScanner";
import { PluginInjector } from "../plugins/pluginInjector";

const packageJson = require(path.resolve(__dirname, "../../../package.json"));

interface BrakitConfig {
  backend?: {
    host?: string;
    port?: number;
  };
  server?: {
    proxyPort?: number;
  };
  proxy?: {
    port?: number;
  };
  app?: {
    port?: number;
  };
}

interface ProxyOptions {
  proxyPort: number;
  appPort: number;
  backendPort: number;
  backendHost: string;
  plugins: string[];
}

let userAppProcess: ChildProcess | null = null;
let backendProcess: ChildProcess | null = null;
let proxyServer: http.Server | null = null;
let runtimePorts: AllocatedPorts | null = null;
let runtimeHost = "localhost";
let isVerbose = false;

export async function startCommand(options?: {
  verbose?: boolean;
}): Promise<void> {
  isVerbose = options?.verbose ?? false;
  const startTime = Date.now();
  const projectDir = process.cwd();
  verifyInitialization(projectDir);
  
  const discoveredPlugins = PluginScanner.scan(projectDir);
  const plugins = discoveredPlugins.map(p => p.name);

  console.log("");
  console.log(chalk.cyan(`  ⚡ Brakit v${packageJson.version}`));
  console.log("");

  await checkForUpdates({ isVerbose });

  try {
    const config = loadConfig(projectDir);

    runtimeHost = resolveHost(config);
    runtimePorts = await allocatePorts(resolvePreferredPorts(config));

    if (isVerbose) {
      console.log(chalk.gray("  Starting services..."));
    }

    const backendClientHost =
      runtimeHost === "0.0.0.0" ? "localhost" : runtimeHost;
    const backendHealthUrl = `http://${backendClientHost}:${runtimePorts.backendPort}/api/health`;

    await Promise.all([
      (async () => {
        await startUserApp(projectDir, runtimePorts.appPort);
        await waitForPort(runtimePorts.appPort, 30_000);
        if (isVerbose) {
          console.log(
            chalk.gray(`  ✓ App server (port ${runtimePorts.appPort})`)
          );
        }
      })(),
      (async () => {
        await startBackend(
          projectDir,
          runtimeHost,
          runtimePorts.backendPort
        );
        await waitForHttpHealth(backendHealthUrl, 30_000);
        if (isVerbose) {
          console.log(
            chalk.gray(`  ✓ Backend (port ${runtimePorts.backendPort})`)
          );
        }
      })(),
    ]);

    await startProxy({
      proxyPort: runtimePorts.proxyPort,
      appPort: runtimePorts.appPort,
      backendPort: runtimePorts.backendPort,
      backendHost: runtimeHost,
      plugins,
    });

    if (isVerbose) {
      console.log(chalk.gray(`  ✓ Proxy (port ${runtimePorts.proxyPort})`));
      console.log("");
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(
      chalk.cyan(`  ➜  Local:   http://localhost:${runtimePorts.proxyPort}`)
    );
    console.log("");
    console.log(chalk.green(`  Ready in ${elapsed}s`));
    console.log("");
    console.log(chalk.white("  Look for the bubble in your browser"));
    console.log(chalk.gray("  Press Ctrl+C to stop"));
    console.log("");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log("");
    console.error(chalk.red(`  ✖ Error: ${message}`));
    console.log("");
    cleanup();
    process.exit(1);
  }
}

function loadConfig(projectDir: string): BrakitConfig {
  const brakitDir = path.join(projectDir, ".brakit");
  const jsonPath = path.join(brakitDir, "config.json");

  if (fs.existsSync(jsonPath)) {
    try {
      const contents = fs.readFileSync(jsonPath, "utf8");
      return JSON.parse(contents) as BrakitConfig;
    } catch (error) {
      console.warn(
        chalk.yellow(
          `⚠️  Failed to parse .brakit/config.json: ${(error as Error).message}`
        )
      );
    }
  }

  return {};
}

function resolveHost(config: BrakitConfig): string {
  return (
    config?.backend?.host ||
    process.env.BRAKIT_BACKEND_HOST ||
    process.env.HOST ||
    "localhost"
  );
}

function resolvePreferredPorts(config: BrakitConfig) {
  const fallback = (value: unknown, defaultValue: number) =>
    typeof value === "number" && Number.isFinite(value) ? value : defaultValue;

  return {
    proxyPort: fallback(config?.server?.proxyPort ?? config?.proxy?.port, 3000),
    backendPort: fallback(config?.backend?.port, 3001),
    appPort: fallback(config?.app?.port, 3333),
  };
}

async function startUserApp(
  projectDir: string,
  appPort: number
): Promise<void> {
  if (isVerbose) {
    console.log(chalk.gray(`  Starting your app on port ${appPort}...`));
  }

  userAppProcess = spawn(
    "npm",
    ["run", "dev", "--", "--port", String(appPort)],
    {
      cwd: projectDir,
      stdio: isVerbose
        ? ["ignore", "inherit", "inherit"]
        : ["ignore", "ignore", "pipe"],
      shell: true,
      env: { ...process.env, PORT: String(appPort) },
    }
  );

  if (!isVerbose && userAppProcess.stderr) {
    userAppProcess.stderr.on("data", (data: Buffer) => {
      const message = data.toString();
      if (message.toLowerCase().includes("error")) {
        process.stderr.write(data);
      }
    });
  }

  userAppProcess.on("error", (err) => {
    console.log("");
    console.error(chalk.red(`  ✖ Failed to start app: ${err.message}`));
    console.log("");
    process.exit(1);
  });
}

async function startBackend(
  projectDir: string,
  host: string,
  backendPort: number
): Promise<void> {
  const proEnabled = process.env.BRAKIT_PRO_ENABLED === "true";
  if (isVerbose) {
    console.log(
      chalk.gray(`  Starting Brakit backend on port ${backendPort}...`)
    );
  }

  const backendPath = path.resolve(__dirname, "../../../backend/dist/index.js");

  backendProcess = spawn("node", [backendPath], {
    env: {
      ...process.env,
      PORT: String(backendPort),
      HOST: host,
      BRAKIT_PROJECT_PATH: projectDir,
      BRAKIT_PRO_ORIGIN: process.env.BRAKIT_PRO_ORIGIN || "",
      BRAKIT_PRO_AUTH_TOKEN: process.env.BRAKIT_PRO_AUTH_TOKEN || "",
      BRAKIT_PRO_TIMEOUT: process.env.BRAKIT_PRO_TIMEOUT || "",
    },
    stdio: isVerbose
      ? ["ignore", "inherit", "inherit"]
      : ["ignore", "ignore", "pipe"],
  });

  if (!isVerbose && backendProcess.stderr) {
    backendProcess.stderr.on("data", (data: Buffer) => {
      const message = data.toString();
      if (message.toLowerCase().includes("error")) {
        process.stderr.write(data);
      }
    });
  }

  backendProcess.on("error", (err) => {
    console.log("");
    console.error(chalk.red(`  ✖ Failed to start backend: ${err.message}`));
    console.log("");
    cleanup();
    process.exit(1);
  });
}

async function startProxy(options: ProxyOptions): Promise<void> {
  const { proxyPort, appPort, backendPort, backendHost, plugins } =
    options;
  const target = `http://localhost:${appPort}`;
  const backendClientHost =
    backendHost === "0.0.0.0" ? "localhost" : backendHost;
  const backendOrigin = `http://${backendClientHost}:${backendPort}`;

  const proxy = httpProxy.createProxyServer({
    target,
    changeOrigin: true,
    selfHandleResponse: true,
    ws: true,
  });

  proxy.on(
    "proxyRes",
    (proxyRes: IncomingMessage, req: IncomingMessage, res: ServerResponse) => {
      const contentType = proxyRes.headers?.["content-type"] ?? "";
      const contentEncoding = proxyRes.headers?.["content-encoding"];

      if (!contentType.includes("text/html")) {
        res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
        proxyRes.pipe(res);
        return;
      }

      const chunks: Buffer[] = [];
      proxyRes.on("data", (chunk: Buffer) => chunks.push(chunk));

      proxyRes.on("end", () => {
        let body: Buffer = Buffer.concat(chunks);

        if (contentEncoding === "gzip") {
          body = zlib.gunzipSync(body);
        } else if (contentEncoding === "deflate") {
          body = zlib.inflateSync(body);
        } else if (contentEncoding === "br") {
          body = zlib.brotliDecompressSync(body);
        }

        let bodyString = body.toString("utf8");

        const overlayScripts = [
          `<script>\n    window.BRAKIT_BACKEND_URL = '${backendOrigin}';\n  </script>`,
          `<script src="${backendOrigin}/brakit-overlay.js"></script>`,
          PluginInjector.buildScriptTags(plugins, backendOrigin),
        ];

        const overlayScript = `\n${overlayScripts.filter(Boolean).join("\n")}\n`;

        if (bodyString.includes("</head>")) {
          bodyString = bodyString.replace("</head>", overlayScript + "</head>");
        } else if (bodyString.includes("</body>")) {
          bodyString = bodyString.replace("</body>", overlayScript + "</body>");
        }

        const headers: OutgoingHttpHeaders = { ...proxyRes.headers };
        headers["content-length"] = Buffer.byteLength(bodyString);
        delete headers["content-encoding"];

        res.writeHead(proxyRes.statusCode ?? 200, headers);
        res.end(bodyString);
      });
    }
  );

  proxy.on("error", (err: Error, req: IncomingMessage, res: ServerResponse) => {
    console.error(chalk.red(`❌ Proxy error: ${err.message}`));
    if (res.writeHead) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Proxy error");
    }
  });

  proxyServer = http.createServer((req, res) => {
    proxy.web(req, res);
  });

  proxyServer.on("upgrade", (req, socket, head) => {
    proxy.ws(req, socket as unknown as Socket, head);
  });

  await new Promise<void>((resolve, reject) => {
    proxyServer?.listen(proxyPort, (err?: Error) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function waitForPort(port: number, timeout = 30_000): Promise<void> {
  const startTime = Date.now();
  let attempt = 0;

  while (Date.now() - startTime < timeout) {
    try {
      const availablePort = await detectPort(port);
      if (availablePort !== port) {
        return;
      }
    } catch (err) {}

    attempt++;
    const delay = Math.min(100 * Math.pow(2, attempt - 1), 1000);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new Error(`Timeout waiting for port ${port}`);
}

async function waitForHttpHealth(url: string, timeout = 30_000): Promise<void> {
  const startTime = Date.now();
  let attempt = 0;

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });

      if (response.ok) {
        return;
      }
    } catch (err) {}

    attempt++;
    const delay = Math.min(100 * Math.pow(2, attempt - 1), 1000);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new Error(`Timeout waiting for health check: ${url}`);
}

function cleanup(): void {
  if (isVerbose) {
    console.log("");
    console.log(chalk.gray("  Stopping Brakit..."));
  }

  if (userAppProcess) {
    killProcessCrossPlatform(userAppProcess);
    userAppProcess = null;
  }

  if (backendProcess) {
    killProcessCrossPlatform(backendProcess);
    backendProcess = null;
  }

  if (proxyServer) {
    proxyServer.close();
    proxyServer = null;
  }

  if (!isVerbose) {
    console.log("");
    console.log(chalk.gray("  Brakit stopped"));
    console.log("");
  }
}

function killProcessCrossPlatform(proc: ChildProcess): void {
  if (process.platform === "win32") {
    try {
      spawn("taskkill", ["/pid", String(proc.pid), "/f", "/t"], {
        stdio: "ignore",
      });
    } catch (err) {
      proc.kill("SIGKILL");
    }
  } else {
    proc.kill("SIGTERM");
    setTimeout(() => {
      if (proc.exitCode === null) {
        proc.kill("SIGKILL");
      }
    }, 1000);
  }
}

process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});

export default { startCommand };

function verifyInitialization(projectDir: string): void {
  const brakitDir = path.join(projectDir, ".brakit");
  const configPath = path.join(brakitDir, "config.json");
  const loaderPath = path.join(brakitDir, "loader.js");
  const gitignorePath = path.join(projectDir, ".gitignore");

  const missingItems: string[] = [];

  if (!fs.existsSync(brakitDir)) {
    missingItems.push(".brakit/ directory");
  }

  if (!fs.existsSync(configPath)) {
    missingItems.push(".brakit/config.json");
  }

  if (!fs.existsSync(loaderPath)) {
    missingItems.push(".brakit/loader.js");
  }

  const gitignoreHasEntry =
    fs.existsSync(gitignorePath) &&
    fs.readFileSync(gitignorePath, "utf8").includes(".brakit/");

  if (!gitignoreHasEntry) {
    missingItems.push(".gitignore entry for .brakit/");
  }

  if (missingItems.length === 0) {
    return;
  }

  console.log("");
  console.log(
    chalk.yellow(
      "  ⚠️  Brakit needs to be initialized before running `npx brakit start`."
    )
  );
  console.log("");
  console.log(
    chalk.white("  Run `npx brakit init` once in this project, then try again.")
  );
  console.log("");
  process.exit(1);
}
