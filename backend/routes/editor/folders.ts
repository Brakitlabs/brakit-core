import express from "express";
import { promises as fs } from "fs";
import path from "path";
import { detectFramework, FrameworkInfo } from "../../utils/detectFramework";

const router = express.Router();

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".hg",
  ".next",
  ".turbo",
  ".cache",
  ".output",
  ".vercel",
  "node_modules",
  "dist",
  "build",
  "out",
  "api",
]);

router.get("/", async (req, res) => {
  try {
    const info = detectFramework();
    const projectRoot = process.cwd();
    const folders = await collectProjectFolders(projectRoot, info);

    res.json({
      success: true,
      framework: info.framework,
      router: info.router,
      folders,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;

async function collectProjectFolders(
  projectRoot: string,
  info: FrameworkInfo
): Promise<string[]> {
  const seen = new Set<string>();

  const baseDirs = await resolveBaseDirectories(projectRoot, info);
  for (const base of baseDirs) {
    await addDirectoryTree(projectRoot, base, seen);
  }

  // Always allow project root as a fallback location
  seen.add("/");

  return Array.from(seen).sort((a, b) => {
    if (a === "/") return -1;
    if (b === "/") return 1;
    return a.localeCompare(b);
  });
}

async function resolveBaseDirectories(
  projectRoot: string,
  info: FrameworkInfo
): Promise<string[]> {
  const candidates =
    info.pageRoots.length > 0
      ? info.pageRoots
      : info.framework === "next"
        ? ["app", path.join("src", "app"), "pages", path.join("src", "pages")]
        : ["src/pages", "src/routes", "pages"];

  const resolved: string[] = [];
  for (const relativePath of candidates) {
    const normalized = normalizeFolderPath(relativePath);
    if (!normalized) {
      continue;
    }

    const absolute = path.join(projectRoot, normalized);
    if (await directoryExists(absolute)) {
      resolved.push(normalized);
    }
  }

  return resolved;
}

async function addDirectoryTree(
  root: string,
  relativeBase: string,
  seen: Set<string>
) {
  const absoluteBase = path.join(root, relativeBase);
  if (!(await directoryExists(absoluteBase))) {
    return;
  }

  seen.add(relativeBase);

  const stack: string[] = [absoluteBase];
  while (stack.length) {
    const current = stack.pop()!;

    try {
      const entries = await fs.readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        if (IGNORED_DIRECTORIES.has(entry.name) || entry.name.startsWith(".")) {
          continue;
        }

        const fullPath = path.join(current, entry.name);
        const relativePath = path.relative(root, fullPath);
        const normalized = normalizeFolderPath(relativePath);

        if (!normalized) {
          continue;
        }

        seen.add(normalized);
        stack.push(fullPath);
      }
    } catch {
      continue;
    }
  }
}

function normalizeFolderPath(relativePath: string): string {
  const parts = relativePath.split(path.sep).filter(Boolean);
  return parts.join("/");
}

async function directoryExists(targetPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(targetPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}
