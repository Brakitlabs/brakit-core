import fs from "fs";
import path from "path";
import jscodeshift from "jscodeshift";
import { logger } from "../../utils/logger";
import { SEARCH_DIRECTORIES, SKIP_DIRECTORIES } from "../shared/types";
import { PathResolver } from "../../utils/pathResolver";
import type { ImportSpecifier, ImportDefaultSpecifier, ImportNamespaceSpecifier } from "jscodeshift";

const COMPONENT_FILE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];

export class ComponentResolver {
  private projectRoot: string;
  private componentResolutionCache = new Map<
    string,
    { mtimeMs: number; path: string | null }
  >();

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  public resolveComponentFilePath(
    sourceFilePath: string,
    componentName: string
  ): string | null {
    if (!componentName) {
      return null;
    }

    const cacheKey = `${sourceFilePath}:${componentName}`;
    let stats: fs.Stats | null = null;

    try {
      stats = fs.statSync(sourceFilePath);
      const cached = this.componentResolutionCache.get(cacheKey);
      if (cached && cached.mtimeMs === stats.mtimeMs) {
        return cached.path;
      }
    } catch (error) {
      this.componentResolutionCache.delete(cacheKey);
      return null;
    }

    let resolvedPath: string | null = null;

    try {
      const source = fs.readFileSync(sourceFilePath, "utf8");
      const j = jscodeshift.withParser("tsx");
      const ast = j(source);

      let importTarget: string | null = null;

      ast.find(jscodeshift.ImportDeclaration).forEach((path) => {
        if (importTarget) {
          return;
        }

        const declaration = path.node;
        const specifiers: Array<
          | ImportSpecifier
          | ImportDefaultSpecifier
          | ImportNamespaceSpecifier
          | null
          | undefined
        > = declaration.specifiers || [];
        const matches = specifiers.some((specifier) => {
          if (!specifier || !specifier.local?.name) {
            return false;
          }
          return specifier.local.name === componentName;
        });

        if (matches) {
          const moduleSource = declaration.source.value;
          if (typeof moduleSource === "string") {
            importTarget = moduleSource;
          }
        }
      });

      if (importTarget) {
        resolvedPath = this.resolveModuleToFile(
          importTarget,
          path.dirname(sourceFilePath)
        );
      }
    } catch (error) {
      logger.warn({
        message: `[ComponentResolver] Failed to resolve component from file`,
        context: {
          componentName,
          sourceFilePath,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }

    if (stats) {
      this.componentResolutionCache.set(cacheKey, {
        mtimeMs: stats.mtimeMs,
        path: resolvedPath,
      });
    }

    return resolvedPath;
  }

  public findComponentFileByName(componentName: string): string | null {
    if (!componentName) {
      return null;
    }

    const searchDirs = SEARCH_DIRECTORIES.map((dir) =>
      path.join(this.projectRoot, dir)
    ).filter((dir) => fs.existsSync(dir));

    if (searchDirs.length === 0) {
      searchDirs.push(this.projectRoot);
    }

    for (const dir of searchDirs) {
      const match = this.searchDirectoryForComponentFile(dir, componentName);
      if (match) {
        return match;
      }
    }

    return null;
  }

  private resolveModuleToFile(
    moduleSpecifier: string,
    fromDir: string
  ): string | null {
    const normalized = moduleSpecifier.replace(/\\/g, "/");
    const candidates: string[] = [];

    const pushCandidate = (candidate: string | null | undefined) => {
      if (!candidate) {
        return;
      }
      if (!candidates.includes(candidate)) {
        candidates.push(candidate);
      }
    };

    const addWithExtensions = (base: string) => {
      const hasKnownExtension = COMPONENT_FILE_EXTENSIONS.some((ext) =>
        base.endsWith(ext)
      );

      pushCandidate(base);

      if (!hasKnownExtension) {
        for (const ext of COMPONENT_FILE_EXTENSIONS) {
          pushCandidate(`${base}${ext}`);
        }
      }

      for (const ext of COMPONENT_FILE_EXTENSIONS) {
        pushCandidate(path.join(base, `index${ext}`));
      }
    };

    if (normalized.startsWith(".")) {
      addWithExtensions(path.resolve(fromDir, normalized));
    } else if (normalized.startsWith("@/")) {
      const trimmed = normalized.slice(2);
      // Use PathResolver logic implicitly by checking common roots
      addWithExtensions(path.join(this.projectRoot, trimmed));
      addWithExtensions(path.join(this.projectRoot, "src", trimmed));
      addWithExtensions(path.join(this.projectRoot, "app", trimmed));
    } else if (normalized.startsWith("~/")) {
      const trimmed = normalized.slice(2);
      addWithExtensions(path.join(this.projectRoot, trimmed));
      addWithExtensions(path.join(this.projectRoot, "src", trimmed));
    } else if (normalized.startsWith("/")) {
      addWithExtensions(path.join(this.projectRoot, normalized));
      addWithExtensions(path.join(this.projectRoot, "src", normalized));
    } else {
      // Node modules or absolute imports that might be aliased
      addWithExtensions(path.join(this.projectRoot, normalized));
      addWithExtensions(path.join(this.projectRoot, "src", normalized));
      addWithExtensions(path.join(this.projectRoot, "app", normalized));
      addWithExtensions(path.join(this.projectRoot, "components", normalized));
    }

    for (const candidate of candidates) {
      try {
        if (!fs.existsSync(candidate)) {
          continue;
        }

        const stats = fs.statSync(candidate);
        if (stats.isFile()) {
          return candidate;
        }
      } catch (error) {
        // Ignore
      }
    }

    return null;
  }

  private searchDirectoryForComponentFile(
    dir: string,
    componentName: string
  ): string | null {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(".")) {
          continue;
        }

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (SKIP_DIRECTORIES.includes(entry.name)) {
            continue;
          }

          const indexMatch = this.matchComponentIndexFile(
            fullPath,
            componentName
          );
          if (indexMatch) {
            return indexMatch;
          }

          const nested = this.searchDirectoryForComponentFile(
            fullPath,
            componentName
          );
          if (nested) {
            return nested;
          }
        } else if (entry.isFile()) {
          if (
            COMPONENT_FILE_EXTENSIONS.some((ext) => entry.name.endsWith(ext)) &&
            this.matchesComponentBaseName(entry.name, componentName)
          ) {
            return fullPath;
          }
        }
      }
    } catch (error) {
      logger.warn({
        message: `[ComponentResolver] Failed component search`,
        context: {
          componentName,
          dir,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }

    return null;
  }

  private matchComponentIndexFile(
    dirPath: string,
    componentName: string
  ): string | null {
    try {
      const stats = fs.statSync(dirPath);
      if (!stats.isDirectory()) {
        return null;
      }

      if (
        !this.matchesComponentBaseName(path.basename(dirPath), componentName)
      ) {
        return null;
      }

      for (const ext of COMPONENT_FILE_EXTENSIONS) {
        const candidate = path.join(dirPath, `index${ext}`);
        if (fs.existsSync(candidate)) {
          const candidateStats = fs.statSync(candidate);
          if (candidateStats.isFile()) {
            return candidate;
          }
        }
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  private matchesComponentBaseName(
    fileName: string,
    componentName: string
  ): boolean {
    if (!fileName || !componentName) {
      return false;
    }

    const baseName = fileName.replace(/\.[^.]+$/, "");
    return baseName === componentName;
  }
}
