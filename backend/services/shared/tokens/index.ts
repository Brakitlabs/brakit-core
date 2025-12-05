import fs from "fs";
import path from "path";
import type { BrakitDesignTokens, ResolvedTokens } from "./types";
import { defaultDesignTokens } from "./defaults";
import { TokenResolver } from "./resolver";
import {
  TokenFileReadError,
  TokenParseError,
} from "./errors";
import { TokenCodeGenerator } from "./generators/TokenCodeGenerator";
import { configureTsConfigPaths } from "./configureTsConfig";

/**
 * Token Service
 * Manages design tokens for the Brakit system
 */
class TokenService {
  private tokens: BrakitDesignTokens;
  private resolvedTokens: ResolvedTokens | null = null;
  private readonly tokensFilePath: string;
  private codeGenerator: TokenCodeGenerator;

  constructor() {
    this.tokensFilePath = this.getTokensFilePath();
    this.codeGenerator = new TokenCodeGenerator();
    this.tokens = this.applyDefaults(
      this.loadFromDisk() ?? defaultDesignTokens
    );
    
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
   * Get resolved tokens (Tailwind classes)
   */
  getResolvedTokens(): ResolvedTokens {
    if (!this.resolvedTokens) {
      this.resolvedTokens = TokenResolver.resolve(this.tokens);
    }
    return this.resolvedTokens;
  }

  /**
   * Get default tokens without mutating current state
   */
  getDefaultTokens(): BrakitDesignTokens {
    return defaultDesignTokens;
  }

  /**
   * Get resolved defaults without mutating current state
   */
  getDefaultResolvedTokens(): ResolvedTokens {
    return TokenResolver.resolve(defaultDesignTokens);
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
   */
  loadTokens(tokens: BrakitDesignTokens): void {
    this.tokens = this.applyDefaults(tokens);
    this.resolvedTokens = null; // Invalidate cache
    
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
    this.resolvedTokens = null;
    
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
      this.tokens = this.applyDefaults(loaded);
      this.resolvedTokens = null;
      
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

  private applyDefaults(tokens: BrakitDesignTokens): BrakitDesignTokens {
    return {
      ...defaultDesignTokens,
      ...tokens,
      color: { ...defaultDesignTokens.color, ...(tokens.color ?? {}) },
      typography: {
        ...defaultDesignTokens.typography,
        ...(tokens.typography ?? {}),
      },
      spacing: { ...defaultDesignTokens.spacing, ...(tokens.spacing ?? {}) },
      radius: { ...defaultDesignTokens.radius, ...(tokens.radius ?? {}) },
      shadow: { ...defaultDesignTokens.shadow, ...(tokens.shadow ?? {}) },
      layout: { ...defaultDesignTokens.layout, ...(tokens.layout ?? {}) },
      border: { ...defaultDesignTokens.border, ...(tokens.border ?? {}) },
      opacity: { ...defaultDesignTokens.opacity, ...(tokens.opacity ?? {}) },
      zIndex: { ...defaultDesignTokens.zIndex, ...(tokens.zIndex ?? {}) },
    };
  }
}

// Singleton instance
const tokenService = new TokenService();

export { tokenService, TokenService };
export type { BrakitDesignTokens, ResolvedTokens };
