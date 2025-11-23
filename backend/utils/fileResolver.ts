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
import { PathResolver } from "./pathResolver";

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
  // Use the robust PathResolver
  const resolved = PathResolver.resolveFilePath(projectRoot, sourceFile);
  
  if (resolved) {
    return resolved;
  }

  // Fallback for legacy behavior: assume it's relative to project root if not found
  // This maintains backward compatibility for cases where PathResolver might be too strict
  // or for files that don't exist yet but are being created.
  return path.join(projectRoot, sourceFile);
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
