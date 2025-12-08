import fs from "fs/promises";
import path from "path";
import type { BrakitDesignTokens } from "../types";
import { generateTokenHash } from "./hashUtils";
import { TokenJSGenerator } from "./tokenJSGenerator";
import { TokenDTSGenerator } from "./tokenDTSGenerator";
import { CSSBindingsGenerator } from "./cssBindingsGenerator";

/**
 * Main code generator for design tokens
 * Orchestrates generation of tokens.js, tokens.d.ts, and bindings.css
 */
export class TokenCodeGenerator {
  private projectRoot: string;
  private generatedDir: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.env.PROJECT_ROOT || process.cwd();
    // Generate to node_modules/@brakit/tokens for clean imports
    this.generatedDir = path.join(
      this.projectRoot,
      "node_modules",
      "@brakit",
      "tokens"
    );
  }

  /**
   * Generate all token files
   */
  async generateAll(tokens: BrakitDesignTokens): Promise<void> {
    // Ensure .brakit/generated directory exists
    await fs.mkdir(this.generatedDir, { recursive: true });

    // Generate content hash for versioning
    const hash = generateTokenHash(JSON.stringify(tokens));

    // Generate all files
    const tokensJS = TokenJSGenerator.generate(tokens, hash);
    const tokensDTS = TokenDTSGenerator.generate(tokens, hash);
    const bindingsCSS = CSSBindingsGenerator.generate(tokens, hash);

    // Write files
    await Promise.all([
      fs.writeFile(path.join(this.generatedDir, "index.js"), tokensJS, "utf-8"),
      fs.writeFile(
        path.join(this.generatedDir, "index.d.ts"),
        tokensDTS,
        "utf-8"
      ),
      fs.writeFile(
        path.join(this.generatedDir, "styles.css"),
        bindingsCSS,
        "utf-8"
      ),
    ]);

    // eslint-disable-next-line no-console
    console.log(`♻️  Design tokens generated (hash: ${hash})`);
  }

  /**
   * Get the path to generated directory
   */
  getGeneratedDir(): string {
    return this.generatedDir;
  }

  /**
   * Check if generated files exist
   */
  async generatedFilesExist(): Promise<boolean> {
    try {
      const tokensPath = path.join(this.generatedDir, "index.js");
      await fs.access(tokensPath);
      return true;
    } catch {
      return false;
    }
  }
}
