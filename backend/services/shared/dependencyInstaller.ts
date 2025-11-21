import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { logger } from "../../utils/logger";

const execAsync = promisify(exec);

export const FORM_DEPENDENCIES = [
  "react-hook-form",
  "zod",
  "@hookform/resolvers",
] as const;

export interface PackageInstallOptions {
  label?: string;
  dev?: boolean;
  onProgress?: (message: string) => void;
}

export async function ensurePackagesInstalled(
  projectRoot: string,
  packages: readonly string[],
  options: PackageInstallOptions = {}
): Promise<void> {
  const missing = packages.filter(
    (dependency) => !hasDependency(projectRoot, dependency)
  );

  if (missing.length === 0) {
    logger.info({
      message: "Dependencies already installed",
      context: { packages },
    });
    return;
  }

  const label = options.label ?? "dependencies";
  const installMessage = `📦 Installing ${label} (${missing.join(", ")})...`;
  options.onProgress?.(installMessage);

  try {
    const installFlag = options.dev ? "--save-dev" : "--save";
    await execAsync(`npm install ${missing.join(" ")} ${installFlag}`, {
      cwd: projectRoot,
    });

    const successMessage = `✅ ${label
      .charAt(0)
      .toUpperCase()}${label.slice(1)} installed`;
    options.onProgress?.(successMessage);

    logger.info({
      message: "Dependencies installed",
      context: { packages: missing, dev: options.dev ?? false },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    options.onProgress?.(
      `❌ Failed to install ${label}: ${errorMessage}`
    );
    logger.error({
      message: "Failed to install dependencies",
      context: { packages: missing, error: errorMessage },
    });
    throw new Error(`Dependency installation failed: ${errorMessage}`);
  }
}

function hasDependency(projectRoot: string, dependency: string): boolean {
  try {
    const packageJsonPath = path.join(projectRoot, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      return false;
    }

    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, "utf8")
    );

    return Boolean(
      packageJson.dependencies?.[dependency] ||
        packageJson.devDependencies?.[dependency]
    );
  } catch (error) {
    logger.warn({
      message: "Unable to read package.json when checking dependencies",
      context: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return false;
  }
}
