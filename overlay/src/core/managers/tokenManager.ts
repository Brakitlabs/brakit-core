import type { DesignTokensResponse } from "../../services/backendClient";
import { logger } from "../../utils/logger";

export interface ResolvedTokens {
  color: Record<string, string>;
  typography: Record<string, string>;
  spacing: Record<string, string>;
  radius: Record<string, string>;
  shadow: Record<string, string>;
  layout: Record<string, string>;
  border: Record<string, string>;
  opacity: Record<string, string>;
  zIndex: Record<string, string>;
}

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
      colorCount: Object.keys(response.resolved.color).length,
      typographyCount: Object.keys(response.resolved.typography).length,
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
