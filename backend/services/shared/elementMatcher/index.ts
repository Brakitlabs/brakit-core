/**
 * Element Matcher - Finds the best AST node match for a user-clicked DOM element.
 */

export type { ElementMatchCandidate, ElementMatchResult } from "./types";

export { findBestMatch } from "./scorer";
export { createCandidate } from "./candidateFactory";

export {
  extractClassName,
  extractDynamicClasses,
  calculateClassSimilarity,
  sanitizeClassTokens,
  hasClassOverlap,
} from "./classNameExtractor";

export { extractStringAttributes } from "./attributeExtractor";
export { extractText, DYNAMIC_TEXT_MARKER } from "./textExtractor";
