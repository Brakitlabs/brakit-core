import fs from "fs";
import path from "path";

/**
 * Shared file resolution utilities for Next.js projects.
 * Consolidates logic previously duplicated across BaseUpdateService,
 * visualReorderService, and edit/fileResolver.
 */

const APP_BASE_DIRECTORIES = ["app", "src/app"] as const;
const PAGES_BASE_DIRECTORIES = ["pages", "src/pages"] as const;
const PAGE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"] as const;

/**
 * Resolve a file path (URL path, component path, or file path) to an absolute file system path.
 * Handles Next.js App Router and Pages Router conventions.
 *
 * @param sourceFile - The source file path (can be URL like "/products", component like "Button.tsx", or file path)
 * @param projectRoot - The root directory of the project
 * @returns Absolute path to the resolved file
 */
export function resolveFilePath(
  sourceFile: string,
  projectRoot: string
): string {
  // Handle root path
  if (sourceFile === "/" || sourceFile === "" || !sourceFile) {
    return resolveRootPageFile(projectRoot);
  }

  const normalizedInput = sourceFile.replace(/\\/g, "/");

  // If the file has an extension, treat it as a direct file reference
  const extensionMatch = normalizedInput.match(/\.(tsx|ts|jsx|js)$/);
  if (extensionMatch) {
    return resolveFileWithExtension(normalizedInput, projectRoot);
  }

  // Otherwise, treat as URL path and try Next.js patterns
  return resolveUrlPath(normalizedInput, projectRoot);
}

/**
 * Resolve root page file (/ or empty path).
 * Tries both app/page.tsx and src/app/page.tsx.
 */
function resolveRootPageFile(projectRoot: string): string {
  const candidates = [
    path.join(projectRoot, "app/page.tsx"),
    path.join(projectRoot, "src/app/page.tsx"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Default fallback
  return path.join(projectRoot, "src/app/page.tsx");
}

/**
 * Resolve a file that already has an extension.
 * Handles both absolute and relative paths.
 */
function resolveFileWithExtension(
  normalizedPath: string,
  projectRoot: string
): string {
  const candidates = new Set<string>();

  // If absolute, try it directly
  if (path.isAbsolute(normalizedPath)) {
    candidates.add(normalizedPath);
  } else {
    // Try various common locations
    candidates.add(normalizedPath);
    candidates.add(`src/${normalizedPath}`);
    candidates.add(`app/${normalizedPath}`);
    candidates.add(`src/app/${normalizedPath}`);
  }

  // Check each candidate
  for (const candidate of candidates) {
    const absolutePath = path.isAbsolute(candidate)
      ? candidate
      : path.join(projectRoot, candidate);

    if (fs.existsSync(absolutePath)) {
      return absolutePath;
    }
  }

  // Default fallback: assume it's relative to project root
  return path.isAbsolute(normalizedPath)
    ? normalizedPath
    : path.join(projectRoot, normalizedPath);
}

/**
 * Resolve a URL path (like "/products" or "products") to a file.
 * Tries Next.js App Router and Pages Router conventions.
 */
function resolveUrlPath(normalizedPath: string, projectRoot: string): string {
  // Remove leading slash if present
  const cleanPath = normalizedPath.startsWith("/")
    ? normalizedPath.substring(1)
    : normalizedPath;

  const patterns = [
    // App Router patterns (prioritized)
    `src/app/${cleanPath}/page.tsx`,
    `app/${cleanPath}/page.tsx`,
    `src/app/${cleanPath}.tsx`,
    `app/${cleanPath}.tsx`,
    // Pages Router patterns
    `src/pages/${cleanPath}.tsx`,
    `pages/${cleanPath}.tsx`,
    // Direct file paths
    `src/${cleanPath}.tsx`,
    `${cleanPath}.tsx`,
    `${cleanPath}`,
  ];

  for (const pattern of patterns) {
    const fullPath = path.join(projectRoot, pattern);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  // Default fallback: assume App Router
  return path.join(projectRoot, `src/app/${cleanPath}/page.tsx`);
}

/**
 * Resolve a URL path to a file path relative to the repository root.
 * Used primarily by the edit service for Aider integration.
 *
 * @param urlPath - The URL path (e.g., "/products", "/")
 * @param projectPath - The project directory path
 * @returns Relative path from repo root, or null if not found
 */
export function resolveUrlToFilePath(
  urlPath: string,
  projectPath: string
): string | null {
  const normalizedPath = normalizeUrlPath(urlPath);
  const candidates = buildNextJsCandidates(normalizedPath);

  // Find the git repo root to return paths relative to it
  const repoRoot = findRepositoryRoot(projectPath);

  for (const candidate of candidates) {
    const fullPath = path.join(projectPath, candidate);
    if (fs.existsSync(fullPath)) {
      const relativeToRepo = path.relative(repoRoot, fullPath);
      return relativeToRepo;
    }
  }

  return null;
}

/**
 * Normalize a URL path: remove leading/trailing slashes, handle root.
 */
function normalizeUrlPath(urlPath: string): string {
  if (!urlPath || urlPath === "/") {
    return "";
  }

  return urlPath.replace(/^\/+/, "").replace(/\/+/g, "/").replace(/\/$/, "");
}

/**
 * Build candidate file paths for a given URL path.
 * Returns paths relative to project root.
 */
function buildNextJsCandidates(normalizedPath: string): string[] {
  const candidates: string[] = [];

  // App Router candidates
  const appSuffix = normalizedPath ? `/${normalizedPath}` : "";
  for (const base of APP_BASE_DIRECTORIES) {
    for (const ext of PAGE_EXTENSIONS) {
      candidates.push(`${base}${appSuffix}/page${ext}`);
    }
  }

  // Pages Router candidates
  const pageSlug = normalizedPath || "index";
  for (const base of PAGES_BASE_DIRECTORIES) {
    for (const ext of PAGE_EXTENSIONS) {
      candidates.push(`${base}/${pageSlug}${ext}`);
    }
  }

  return candidates;
}

/**
 * Find the git repository root by walking up the directory tree.
 * Falls back to the start directory if no .git folder is found.
 */
export function findRepositoryRoot(startDir: string): string {
  let current = path.resolve(startDir);
  const { root } = path.parse(current);

  while (true) {
    const gitPath = path.join(current, ".git");
    if (fs.existsSync(gitPath)) {
      return current;
    }
    if (current === root) {
      // If no git repo found, return the start directory as fallback
      return startDir;
    }
    current = path.dirname(current);
  }
}
