import fs from "fs/promises";
import path from "path";

/**
 * Configure TypeScript path alias for brakit/tokens
 * This allows clean imports: import { tokens } from "@brakit/tokens"
 * 
 * @param projectRoot - Absolute path to project root
 * @throws {Error} If tsconfig.json exists but is invalid JSON
 * @returns Promise that resolves when configuration is complete
 */
export async function configureTsConfigPaths(projectRoot: string): Promise<void> {
  const tsconfigPath = path.join(projectRoot, "tsconfig.json");

  try {
    // Check if this is a TypeScript project first
    const packageJsonPath = path.join(projectRoot, "package.json");
    try {
      const pkgJsonContent = await fs.readFile(packageJsonPath, "utf-8");
      const pkgJson = JSON.parse(pkgJsonContent);
      const hasTypescript = 
        pkgJson.devDependencies?.typescript || 
        pkgJson.dependencies?.typescript;
      
      if (!hasTypescript) {
        // eslint-disable-next-line no-console
        console.warn("⚠️  TypeScript not found in package.json, skipping tsconfig configuration");
        return;
      }
    } catch {
      // package.json doesn't exist or is invalid, proceed with caution or skip
      // For now, we'll proceed assuming if tsconfig exists, they want it configured
    }

    // Read existing tsconfig
    const content = await fs.readFile(tsconfigPath, "utf-8");
    let tsconfig;
    try {
      tsconfig = JSON.parse(content);
    } catch (parseError) {
      throw new Error(
        `Failed to parse tsconfig.json: ${(parseError as Error).message}. ` +
        `File may contain syntax errors or comments (standard JSON.parse does not support comments).`
      );
    }

    // Ensure compilerOptions exists
    if (!tsconfig.compilerOptions) {
      tsconfig.compilerOptions = {};
    }

    // Ensure paths exists
    if (!tsconfig.compilerOptions.paths) {
      tsconfig.compilerOptions.paths = {};
    }

    // Add brakit/tokens alias if not already present
    if (!tsconfig.compilerOptions.paths["@brakit/tokens"]) {
      tsconfig.compilerOptions.paths["@brakit/tokens"] = [
        "./node_modules/@brakit/tokens",
      ];

      // Write back with formatting
      await fs.writeFile(
        tsconfigPath,
        JSON.stringify(tsconfig, null, 2) + "\n",
        "utf-8"
      );

      // eslint-disable-next-line no-console
      console.log("✅ Configured TypeScript path alias: @brakit/tokens");
    }
  } catch (error) {
    // If tsconfig doesn't exist or can't be parsed, create a minimal one
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      const minimalTsConfig = {
        compilerOptions: {
          paths: {
            "@brakit/tokens": ["./node_modules/@brakit/tokens"],
          },
        },
      };

      await fs.writeFile(
        tsconfigPath,
        JSON.stringify(minimalTsConfig, null, 2) + "\n",
        "utf-8"
      );

      // eslint-disable-next-line no-console
      console.log("✅ Created tsconfig.json with @brakit/tokens path alias");
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        "⚠️  Could not configure TypeScript path alias:",
        (error as Error).message
      );
    }
  }
}
