import fs from "fs";
import path from "path";
import type { BrakitDesignTokens } from "./types";
import { defaultDesignTokens } from "./defaults";
import {
  TokenFileReadError,
  TokenParseError,
} from "./errors";
import { TokenCodeGenerator } from "./generators/tokenCodeGenerator";
import { configureTsConfigPaths } from "./configureTsConfig";
import {
  TokenStructureBuilder,
  type GeneratedTokens,
} from "./generators/tokenStructureBuilder";

/**
 * Token Service
 * Manages design tokens for the Brakit system
 */
class TokenService {
  private tokens: BrakitDesignTokens;
  private generatedTokens: GeneratedTokens | null = null;
  private readonly tokensFilePath: string;
  private codeGenerator: TokenCodeGenerator;

  constructor() {
    this.tokensFilePath = this.getTokensFilePath();
    this.codeGenerator = new TokenCodeGenerator();

    // Load tokens from disk if they exist, otherwise use defaults
    const diskTokens = this.loadFromDisk();
    if (diskTokens) {
      // If tokens exist on disk, use them as-is (user has already configured them)
      this.tokens = diskTokens;
    } else {
      // No saved tokens - use defaults (first run)
      this.tokens = defaultDesignTokens;
    }

    // Generate code on initialization (async, non-blocking)
    this.regenerateCode().catch((error) => {
      // eslint-disable-next-line no-console
      console.error("Failed to generate token code on initialization:", error);
    });
  }

  /**
   * Get raw design tokens (W3C format)
   */
  getRawTokens(): BrakitDesignTokens {
    return this.tokens;
  }

  /**
   * Get generated tokens with { value, class, var } structure
   * This is the unified token format used by both backend and frontend
   */
  getGeneratedTokens(): GeneratedTokens {
    if (!this.generatedTokens) {
      this.generatedTokens = TokenStructureBuilder.build(this.tokens);
    }
    return this.generatedTokens;
  }

  /**
   * Get default tokens without mutating current state
   */
  getDefaultTokens(): BrakitDesignTokens {
    return defaultDesignTokens;
  }

  /**
   * Get generated tokens from defaults
   */
  getDefaultGeneratedTokens(): GeneratedTokens {
    return TokenStructureBuilder.build(defaultDesignTokens);
  }

  /**
   * Regenerate code files (tokens.js, tokens.d.ts, bindings.css)
   */
  async regenerateCode(): Promise<void> {
    await this.codeGenerator.generateAll(this.tokens);
    
    // Auto-configure tsconfig path alias (only runs once if not already configured)
    const projectRoot = process.env.PROJECT_ROOT || process.cwd();
    await configureTsConfigPaths(projectRoot).catch((error: unknown) => {
      // Non-critical, just log warning
      // eslint-disable-next-line no-console
      console.warn("Could not auto-configure tsconfig paths:", error);
    });
  }

  /**
   * Load/update tokens (for file persistence)
   * @param tokens - The tokens to load
   * @param options - Options for loading tokens
   * @param options.skipDefaults - If true, use tokens as-is without merging with defaults (used for imports)
   */
  loadTokens(tokens: BrakitDesignTokens, options?: { skipDefaults?: boolean }): void {
    this.tokens = options?.skipDefaults ? tokens : this.applyDefaults(tokens);
    this.generatedTokens = null; // Invalidate cache

    // Regenerate code files (async, non-blocking)
    this.regenerateCode().catch((error: unknown) => {
      // eslint-disable-next-line no-console
      console.error("Failed to regenerate token code:", error);
    });
  }

  /**
   * Update tokens (alias for loadTokens)
   */
  setTokens(tokens: BrakitDesignTokens): void {
    this.loadTokens(tokens);
  }

  /**
   * Reset to defaults
   */
  resetToDefaults(): void {
    this.tokens = defaultDesignTokens;
    this.generatedTokens = null;

    // Regenerate code files
    this.regenerateCode().catch((error: unknown) => {
      // eslint-disable-next-line no-console
      console.error("Failed to regenerate token code:", error);
    });
  }

  /**
   * Reload tokens from disk if a saved file exists
   */
  refreshFromDisk(): void {
    const loaded = this.loadFromDisk();
    if (loaded) {
      // Use tokens from disk as-is (they're already configured by the user)
      this.tokens = loaded;
      this.generatedTokens = null;

      // Regenerate code files
      this.regenerateCode().catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error("Failed to regenerate token code:", error);
      });
    }
  }

  /**
   * Where tokens are persisted on disk
   */
  private getTokensFilePath(): string {
    const projectRoot = process.env.PROJECT_ROOT || process.cwd();
    return path.join(projectRoot, ".brakit", "brakit.tokens.json");
  }

  /**
   * Try loading a saved token file
   */
  private loadFromDisk(): BrakitDesignTokens | null {
    try {
      if (!fs.existsSync(this.tokensFilePath)) {
        // No saved tokens - this is normal on first run
        return null;
      }

      const content = fs.readFileSync(this.tokensFilePath, "utf-8");
      
      try {
        const parsed = JSON.parse(content) as BrakitDesignTokens;
        return parsed;
      } catch (parseError) {
        throw new TokenParseError(this.tokensFilePath, parseError as Error);
      }
    } catch (error) {
      if (error instanceof TokenParseError) {
        // eslint-disable-next-line no-console
        console.error(
          `Token file is corrupted: ${this.tokensFilePath}. Falling back to defaults.`,
          error
        );
      } else {
        const readError = new TokenFileReadError(
          this.tokensFilePath,
          error as Error
        );
        // eslint-disable-next-line no-console
        console.error(
          "Failed to load design tokens from disk, falling back to defaults",
          readError
        );
      }
      return null;
    }
  }

  /**
   * Apply defaults to user tokens
   *
   * Dynamic Implementation:
   * - Loops over ALL categories in defaultDesignTokens
   * - Merges each category individually (user tokens override defaults)
   * - No hardcoded category list
   * - Works with unlimited extensibility
   */
  private applyDefaults(tokens: BrakitDesignTokens): BrakitDesignTokens {
    const result: BrakitDesignTokens = { ...defaultDesignTokens, ...tokens };

    // Loop over all default categories and merge with user tokens
    for (const [category, defaultCategoryTokens] of Object.entries(defaultDesignTokens)) {
      // Skip $schema and metadata
      if (category.startsWith("$")) {
        continue;
      }

      // Skip if not an object
      if (!defaultCategoryTokens || typeof defaultCategoryTokens !== "object") {
        continue;
      }

      // Merge default category tokens with user tokens
      // User tokens take precedence over defaults
      const userCategoryTokens = (tokens as any)[category];
      result[category as keyof BrakitDesignTokens] = {
        ...defaultCategoryTokens,
        ...(userCategoryTokens && typeof userCategoryTokens === "object" ? userCategoryTokens : {}),
      } as never;
    }

    return result;
  }
}

// Singleton instance
const tokenService = new TokenService();

export { tokenService, TokenService };
export type { BrakitDesignTokens, GeneratedTokens };
