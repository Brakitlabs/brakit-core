import fs from "fs";
import path from "path";

export type FrameworkKind = "next" | "react";
export type RouterKind = "app" | "pages" | "react-router" | "unknown";

export interface FrameworkInfo {
  framework: FrameworkKind;
  hasTailwind: boolean;
  router: RouterKind;
  pageRoots: string[];
  summary: string;
}

const POSSIBLE_TAILWIND_FILES = [
  "tailwind.config.js",
  "tailwind.config.cjs",
  "tailwind.config.mjs",
  "tailwind.config.ts",
  "tailwind.config.mts",
];

const NEXT_APP_DIRS = ["app", path.join("src", "app")];
const NEXT_PAGES_DIRS = ["pages", path.join("src", "pages")];
const REACT_PAGE_DIRS = ["src/pages", "src/routes", "pages"];

export function detectFramework(
  projectRoot: string = process.cwd()
): FrameworkInfo {
  const pkg = readPackageJson(projectRoot);
  const dependencies = {
    ...(pkg?.dependencies ?? {}),
    ...(pkg?.devDependencies ?? {}),
  };

  const nextConfigExists =
    fileExists(projectRoot, "next.config.js") ||
    fileExists(projectRoot, "next.config.mjs") ||
    fileExists(projectRoot, "next.config.ts") ||
    fileExists(projectRoot, "next.config.cjs");

  const appDirs = collectExistingDirs(projectRoot, NEXT_APP_DIRS);
  const pagesDirs = collectExistingDirs(projectRoot, NEXT_PAGES_DIRS);
  const reactDirs = collectExistingDirs(projectRoot, REACT_PAGE_DIRS);

  const hasNextDependency = hasDependency(dependencies, "next");
  const hasNextIndicators =
    hasNextDependency || nextConfigExists || appDirs.length > 0 || pagesDirs.length > 0;

  const framework: FrameworkKind = hasNextIndicators ? "next" : "react";
  const hasTailwind = detectTailwind(projectRoot, dependencies);

  let router: RouterKind = "unknown";
  const pageRoots = new Set<string>();

  if (framework === "next") {
    if (appDirs.length > 0) {
      router = "app";
      appDirs.forEach((dir) => pageRoots.add(dir));
    }

    if (pagesDirs.length > 0) {
      if (router === "unknown") {
        router = "pages";
      }
      pagesDirs.forEach((dir) => pageRoots.add(dir));
    }

    if (router === "unknown") {
      router = "pages";
    }

    if (!pageRoots.size) {
      getDefaultRoots("next").forEach((candidate) => {
        const absolute = path.join(projectRoot, candidate);
        if (directoryExists(absolute)) {
          pageRoots.add(normalizeFolderPath(candidate));
        }
      });
    }
  } else {
    if (reactDirs.length > 0) {
      router = "react-router";
      reactDirs.forEach((dir) => pageRoots.add(dir));
    } else {
      getDefaultRoots("react").forEach((candidate) => {
        const absolute = path.join(projectRoot, candidate);
        if (directoryExists(absolute)) {
          router = "react-router";
          pageRoots.add(normalizeFolderPath(candidate));
        }
      });
    }

    if (router === "unknown") {
      router = "react-router";
    }
  }

  const pageRootsList = Array.from(pageRoots).sort();
  const summary = buildSummary(framework, router, hasTailwind, pageRootsList);

  return { framework, hasTailwind, router, pageRoots: pageRootsList, summary };
}

function detectTailwind(
  projectRoot: string,
  dependencies: Record<string, unknown>
): boolean {
  if (POSSIBLE_TAILWIND_FILES.some((file) => fileExists(projectRoot, file))) {
    return true;
  }

  if (dependencies?.tailwindcss) {
    return true;
  }

  const postcssConfigFiles = [
    "postcss.config.js",
    "postcss.config.cjs",
    "postcss.config.mjs",
    "postcss.config.ts",
    "postcss.config.mts",
  ];

  const postcssConfig = postcssConfigFiles.find((file) =>
    fileExists(projectRoot, file)
  );

  if (!postcssConfig) {
    return false;
  }

  const postcssPath = path.join(projectRoot, postcssConfig);

  try {
    const content = fs.readFileSync(postcssPath, "utf-8");
    return content.includes("tailwindcss");
  } catch {
    return false;
  }
}

function collectExistingDirs(
  projectRoot: string,
  candidates: string[]
): string[] {
  const dirs: string[] = [];
  for (const candidate of candidates) {
    const absolute = path.join(projectRoot, candidate);
    if (directoryExists(absolute)) {
      dirs.push(normalizeFolderPath(candidate));
    }
  }
  return dirs;
}

function directoryExists(fullPath: string): boolean {
  try {
    return fs.statSync(fullPath).isDirectory();
  } catch {
    return false;
  }
}

function fileExists(root: string, relativePath: string): boolean {
  return fs.existsSync(path.join(root, relativePath));
}

function normalizeFolderPath(relativePath: string): string {
  return relativePath.split(path.sep).filter(Boolean).join("/");
}

function hasDependency(
  dependencies: Record<string, unknown>,
  name: string
): boolean {
  return Boolean(dependencies?.[name]);
}

function readPackageJson(
  projectRoot: string
): { dependencies?: Record<string, unknown>; devDependencies?: Record<string, unknown> } | null {
  const pkgPath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(pkgPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(pkgPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getDefaultRoots(framework: FrameworkKind): string[] {
  if (framework === "next") {
    return [...NEXT_APP_DIRS, ...NEXT_PAGES_DIRS];
  }

  return REACT_PAGE_DIRS;
}

function buildSummary(
  framework: FrameworkKind,
  router: RouterKind,
  hasTailwind: boolean,
  pageRoots: string[]
): string {
  const frameworkLabel = framework === "next" ? "Next.js" : "React";

  let routerLabel = "";
  if (framework === "next") {
    if (router === "app") {
      routerLabel = "app router";
    } else if (router === "pages") {
      routerLabel = "pages router";
    }
  } else if (router === "react-router") {
    routerLabel = "React Router";
  }

  const parts = [`Detected ${frameworkLabel}${routerLabel ? ` (${routerLabel})` : ""}`];
  if (pageRoots.length) {
    parts.push(`Folders: ${pageRoots.join(", ")}`);
  }
  parts.push(hasTailwind ? "Tailwind CSS detected" : "Tailwind CSS not detected");

  return parts.join(" • ");
}
