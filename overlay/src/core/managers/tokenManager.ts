import type {
  DesignTokensResponse,
  ImportTokensResponse,
  ImportTokensPreviewResponse,
  TokenMapping,
} from "../../services/backendClient";
import { logger } from "../../utils/logger";

export type ResolvedTokens = Record<string, Record<string, any>>;

/**
 * TokenManager
 * Manages design tokens in the overlay
 */
export class TokenManager {
  private rawTokens: any = null;
  private resolvedTokens: ResolvedTokens | null = null;
  private listeners = new Set<() => void>();

  /**
   * Set tokens (called after fetching from backend)
   */
  setTokens(response: DesignTokensResponse): void {
    this.rawTokens = response.tokens;
    this.resolvedTokens = response.resolved;
    this.notifyListeners();
    logger.info("Design tokens loaded", {
      categories: Object.keys(response.resolved).length,
    });
  }

  /**
   * Get raw W3C format tokens
   */
  getRawTokens(): any {
    return this.rawTokens;
  }

  /**
   * Get resolved Tailwind class tokens
   */
  getResolvedTokens(): ResolvedTokens | null {
    return this.resolvedTokens;
  }

  /**
   * Check if tokens are loaded
   */
  isLoaded(): boolean {
    return this.resolvedTokens !== null;
  }

  /**
   * Subscribe to token changes
   */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Handle successful token import
   */
  setImportedTokens(response: ImportTokensResponse): void {
    this.rawTokens = response.tokens;
    this.resolvedTokens = response.resolved;
    this.notifyListeners();
    logger.info("Design tokens imported successfully", {
      tokensImported: response.tokensImported,
      mappingsCount: response.mappings.length,
      warnings: response.warnings.length,
    });
  }

  /**
   * Notify all listeners of token changes
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        logger.warn("Token change listener failed", error);
      }
    });
  }
}

export type { TokenMapping, ImportTokensResponse, ImportTokensPreviewResponse };
