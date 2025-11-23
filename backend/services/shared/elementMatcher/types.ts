/**
 * Core types for element matching system.
 */

export interface ElementMatchCandidate {
  node: any;
  path: any;
  className: string;
  text: string; // May include __DYNAMIC__ markers
  attributes: Array<{ name: string; value: string }>;
  siblingIndex: number; // 0-based, -1 if unknown
  tagName: string;
}

export interface ElementMatchResult {
  node: any;
  path: any;
  score: number; // Confidence score (0.0 - 2.0+)
  reason: string; // Human-readable explanation
  attributeScore?: number;
}
