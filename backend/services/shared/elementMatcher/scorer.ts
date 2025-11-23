/**
 * Scoring system for element matching.
 * 
 * Computes confidence scores based on multiple signals:
 * - Class name similarity (Jaccard)
 * - Text content matching
 * - Attribute matching
 * - Sibling index proximity
 * - Structural bonuses
 */

import { logger } from "../../../utils/logger";
import { normalizeText } from "../textUtils";
import { calculateClassSimilarity } from "./classNameExtractor";
import { DYNAMIC_TEXT_MARKER } from "./textExtractor";
import type { ElementMatchCandidate, ElementMatchResult } from "./types";

/**
 * Scoring weights (out of total ~2.0 max):
 * - Class similarity: 0.0 - 1.0
 * - Text match: 0.0 - 0.2
 * - Attribute match: 0.0 - 0.3
 * - Index match: 0.0 - 0.15
 * - Structure bonus: 0.0 - 0.2
 */
const WEIGHTS = {
  TEXT_MATCH: 0.2,
  TEXT_PARTIAL: 0.05,
  TEXT_EMPTY_BOTH: 0.1,
  ATTRIBUTE_MATCH: 0.3,
  INDEX_EXACT: 0.15,
  INDEX_CLOSE: 0.05,
  STRUCTURE_BONUS: 0.2,
} as const;

/**
 * Thresholds for match confidence:
 * - MIN_SCORE: Minimum score to consider a match
 * - MARGIN: Minimum score difference to prefer one candidate over another
 */
const THRESHOLDS = {
  MIN_SCORE: 0.1,
  MARGIN: 0.1,
} as const;

interface ScoringContext {
  clickedClassName: string;
  clickedText: string;
  clickedIndex?: number;
}

/**
 * Computes text matching score for a candidate.
 */
function computeTextScore(
  candidate: ElementMatchCandidate,
  normalizedClickedText: string
): number {
  const hasDynamicText = candidate.text.includes(DYNAMIC_TEXT_MARKER);
  const cleanCandidateText = candidate.text
    .replace(new RegExp(DYNAMIC_TEXT_MARKER, "g"), "")
    .trim();

  // Strip non-alphanumeric for fuzzy matching
  const strippedClicked = normalizedClickedText.replace(/[^a-z0-9]+/g, "");
  const strippedCandidate = normalizeText(cleanCandidateText).replace(
    /[^a-z0-9]+/g,
    ""
  );

  // Both have text content
  if (normalizedClickedText && cleanCandidateText) {
    // Exact or substring match
    if (
      cleanCandidateText.includes(normalizedClickedText) ||
      normalizedClickedText.includes(cleanCandidateText)
    ) {
      return WEIGHTS.TEXT_MATCH;
    }

    // Fuzzy match (ignoring whitespace/punctuation)
    if (
      strippedClicked &&
      strippedCandidate &&
      (strippedCandidate.includes(strippedClicked) ||
        strippedClicked.includes(strippedCandidate))
    ) {
      return WEIGHTS.TEXT_MATCH;
    }

    return 0;
  }

  // Clicked has text but candidate is dynamic
  if (normalizedClickedText && hasDynamicText) {
    return WEIGHTS.TEXT_PARTIAL;
  }

  // Both empty
  if (!normalizedClickedText && !cleanCandidateText) {
    return WEIGHTS.TEXT_EMPTY_BOTH;
  }

  return 0;
}

/**
 * Computes attribute matching score for a candidate.
 */
function computeAttributeScore(
  candidate: ElementMatchCandidate,
  normalizedClickedText: string
): number {
  if (!normalizedClickedText) {
    return 0;
  }

  const hasMatch = candidate.attributes.some((attr) => {
    const normalizedAttr = normalizeText(attr.value);
    
    if (!normalizedAttr) {
      return false;
    }

    return (
      normalizedAttr === normalizedClickedText ||
      normalizedAttr.includes(normalizedClickedText) ||
      normalizedClickedText.includes(normalizedAttr)
    );
  });

  return hasMatch ? WEIGHTS.ATTRIBUTE_MATCH : 0;
}

/**
 * Computes sibling index proximity score for a candidate.
 */
function computeIndexScore(
  candidate: ElementMatchCandidate,
  clickedIndex?: number
): number {
  if (
    clickedIndex === undefined ||
    clickedIndex < 0 ||
    candidate.siblingIndex === undefined ||
    candidate.siblingIndex < 0
  ) {
    return 0;
  }

  const diff = Math.abs(clickedIndex - candidate.siblingIndex);

  if (diff === 0) {
    return WEIGHTS.INDEX_EXACT;
  }

  // Close match (off by one due to text nodes/comments)
  if (diff <= 1) {
    return WEIGHTS.INDEX_CLOSE;
  }

  return 0;
}

/**
 * Computes structural bonus if class and index are both strong.
 */
function computeStructureBonus(
  classSimilarity: number,
  indexScore: number
): number {
  if (classSimilarity > 0.8 && indexScore > 0.1) {
    return WEIGHTS.STRUCTURE_BONUS;
  }
  return 0;
}

/**
 * Scores a single candidate against the clicked element context.
 */
function scoreCandidate(
  candidate: ElementMatchCandidate,
  context: ScoringContext
): ElementMatchResult {
  const normalizedClickedText = normalizeText(context.clickedText);

  // 1. Class similarity (Jaccard index)
  const classSimilarity = calculateClassSimilarity(
    context.clickedClassName,
    candidate.className
  );

  // 2. Text matching
  const textScore = computeTextScore(candidate, normalizedClickedText);

  // 3. Attribute matching
  const attributeScore = computeAttributeScore(candidate, normalizedClickedText);

  // 4. Index proximity
  const indexScore = computeIndexScore(candidate, context.clickedIndex);

  // 5. Structural bonus
  const structureBonus = computeStructureBonus(classSimilarity, indexScore);

  const totalScore =
    classSimilarity + textScore + attributeScore + indexScore + structureBonus;

  logger.info({
    message: "[ElementMatcher] Candidate scored",
    context: {
      candidateClassName: candidate.className,
      classSimilarity,
      textScore,
      attributeScore,
      indexScore,
      structureBonus,
      totalScore,
    },
  });

  return {
    node: candidate.node,
    path: candidate.path,
    attributeScore,
    score: totalScore,
    reason: `class: ${classSimilarity.toFixed(2)}, text: ${textScore.toFixed(
      2
    )}, attr: ${attributeScore.toFixed(2)}, index: ${indexScore.toFixed(2)}`,
  };
}

/**
 * Finds the best matching element from candidates.
 * 
 * Scores all candidates and returns the highest-scoring one,
 * with confidence thresholds and tie-breaking logic.
 */
export function findBestMatch(
  candidates: ElementMatchCandidate[],
  clickedClassName: string,
  clickedText: string,
  clickedIndex?: number
): ElementMatchResult | null {
  if (candidates.length === 0) {
    return null;
  }

  logger.info({
    message: "[ElementMatcher] Scoring candidates",
    context: {
      count: candidates.length,
      clickedClassName,
      clickedText,
      clickedIndex,
    },
  });

  const context: ScoringContext = {
    clickedClassName,
    clickedText,
    clickedIndex,
  };

  // Score all candidates
  const scored = candidates
    .map((candidate) => scoreCandidate(candidate, context))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const secondBest = scored[1];

  // Confidence threshold check
  if (best.score < THRESHOLDS.MIN_SCORE) {
    logger.warn({
      message: "[ElementMatcher] No confident match (score too low)",
      context: { bestScore: best.score },
    });
    return null;
  }

  // Only one candidate
  if (scored.length === 1 || !secondBest) {
    return best;
  }

  // Clear winner with sufficient margin
  if (best.score > secondBest.score + THRESHOLDS.MARGIN) {
    return best;
  }

  // Tie-breaker: prefer candidate with better attribute match
  if ((best.attributeScore ?? 0) > (secondBest.attributeScore ?? 0)) {
    return best;
  }

  // Too ambiguous
  logger.warn({
    message: "[ElementMatcher] Ambiguous match",
    context: {
      bestScore: best.score,
      secondBestScore: secondBest.score,
    },
  });

  return null;
}
