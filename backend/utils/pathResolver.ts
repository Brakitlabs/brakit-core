import fs from "fs";
import path from "path";
import { logger } from "./logger";

export class PathResolver {
  private static readonly ROUTE_GROUP_REGEX = /^\(.*\)$/;
  private static readonly APP_PAGE_FILES = [
    "page.tsx",
    "page.ts",
    "page.jsx",
    "page.js",
  ];

  /**
   * Resolves a URL-derived file path to the actual file system path.
   * Handles:
   * 1. Standard paths
   * 2. 'src/' directory prefix
   * 3. Next.js Route Groups (e.g., (auth), (dashboard))
   *
   * @param projectRoot The root directory of the project
   * @param relativePath The path received from the frontend (e.g., "login/page.tsx")
   * @returns The absolute file system path, or null if not found
   */
  public static resolveFilePath(
    projectRoot: string,
    relativePath: string
  ): string | null {
    const normalizedRelativePath = relativePath.replace(/^\/+/, "");

    // 1. Try direct resolution first (most common)
    const directPath = path.join(projectRoot, normalizedRelativePath);
    if (fs.existsSync(directPath)) {
      return directPath;
    }

    // 2. Try with 'src/' prefix if not already present
    if (!normalizedRelativePath.startsWith("src/")) {
      const srcPath = path.join(projectRoot, "src", normalizedRelativePath);
      if (fs.existsSync(srcPath)) {
        return srcPath;
      }
    }

    // 3. Try resolving Next.js Route Groups
    // We need to handle both root-level app/ and src/app/
    const appDirs = [
      path.join(projectRoot, "app"),
      path.join(projectRoot, "src", "app"),
    ];

    for (const appDir of appDirs) {
      if (fs.existsSync(appDir)) {
        // If the path starts with 'app/', strip it for the search relative to appDir
        // If it doesn't, we assume it's relative to appDir anyway for this search
        const cleanPath = normalizedRelativePath.replace(/^(src\/)?app\//, "");
        const segments = cleanPath
          .split("/")
          .filter((segment) => segment.length > 0);
        const resolved = this.findFileInRouteGroups(appDir, segments);
        if (resolved) {
          return resolved;
        }
      }
    }

    logger.warn({
      message: "[PathResolver] Could not resolve file path",
      context: { projectRoot, relativePath },
    });
    return null;
  }

  /**
   * Recursively searches for a file path through route groups.
   *
   * @param currentDir The directory to search in
   * @param segments The remaining path segments to find (e.g., ["login", "page.tsx"])
   * @returns Absolute path if found, null otherwise
   */
  private static findFileInRouteGroups(
    currentDir: string,
    segments: string[]
  ): string | null {
    if (segments.length === 0) {
      return null;
    }

    const [head, ...tail] = segments;

    // Case A: The next segment exists directly in currentDir
    const directPath = path.join(currentDir, head);
    
    if (tail.length === 0) {
      // Last segment: could be a file OR a directory containing page.* for app router
      if (fs.existsSync(directPath)) {
        const stats = fs.statSync(directPath);
        if (stats.isFile()) {
          return directPath;
        }
        if (stats.isDirectory()) {
          for (const pageFile of this.APP_PAGE_FILES) {
            const candidate = path.join(directPath, pageFile);
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
              return candidate;
            }
          }
        }
      }
    } else if (fs.existsSync(directPath) && fs.statSync(directPath).isDirectory()) {
      // If it's a directory, recurse into it
      const result = this.findFileInRouteGroups(directPath, tail);
      if (result) return result;
    }

    // Case B: The next segment might be hidden inside a Route Group
    // We only look for route groups if we are looking for a directory, 
    // OR if we are at the file level but haven't found it directly (though route groups usually wrap directories)
    
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory() && this.ROUTE_GROUP_REGEX.test(entry.name)) {
          const groupPath = path.join(currentDir, entry.name);
          
          // Try to find the SAME head segment inside this group
          const result = this.findFileInRouteGroups(groupPath, segments);
          if (result) return result;
        }
      }
    } catch (error) {
      // Ignore read errors (permissions, etc)
    }

    return null;
  }
}
