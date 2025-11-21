import fs from "fs";
import path from "path";
import config from "../../config";

const IGNORED_DIRECTORIES = new Set(["node_modules", "dist"]);
const IGNORED_FILES = new Set([".brakit-history.json"]);
const ALLOWED_EXTENSIONS = new Set([
  ".tsx",
  ".ts",
  ".jsx",
  ".js",
  ".css",
  ".scss",
  ".html",
  ".json",
]);

interface ScanOptions {
  projectPath?: string;
}

type GetProjectFilesArg = string | ScanOptions | undefined;

export function getProjectFiles(arg?: GetProjectFilesArg): string[] {
  const workingDir = resolveProjectPath(arg);

  if (!fs.existsSync(workingDir)) {
    return [];
  }

  return scanDirectory(workingDir);
}

function resolveProjectPath(arg?: GetProjectFilesArg): string {
  if (typeof arg === "string") {
    return arg;
  }
  if (arg && typeof arg === "object" && arg.projectPath) {
    return arg.projectPath;
  }
  return config.project.root;
}

function scanDirectory(rootDir: string): string[] {
  const results: string[] = [];

  function walk(currentDir: string, relativePath = "") {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      const relativeEntryPath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        if (shouldDescend(entry.name)) {
          walk(absolutePath, relativeEntryPath);
        }
        continue;
      }

      if (entry.isFile() && shouldIncludeFile(entry.name)) {
        results.push(relativeEntryPath);
      }
    }
  }

  walk(rootDir);
  return results;
}

function shouldDescend(directoryName: string): boolean {
  if (directoryName.startsWith(".")) return false;
  return !IGNORED_DIRECTORIES.has(directoryName);
}

function shouldIncludeFile(fileName: string): boolean {
  if (IGNORED_FILES.has(fileName)) {
    return false;
  }
  const ext = path.extname(fileName);
  return ALLOWED_EXTENSIONS.has(ext);
}
