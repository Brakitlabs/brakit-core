/**
 * Shared types for DesignTokensPanel components
 */

export interface TokenChangeEvent {
  tokenPath: string;
  value: string;
  field?: string;
}

export interface DesignTokensData {
  tokens: any;
  resolved: any;
}
