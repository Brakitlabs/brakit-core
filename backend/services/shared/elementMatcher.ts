import { logger } from "../../utils/logger";
import { normalizeText } from "./textUtils";

export interface ElementMatchCandidate {
  node: any;
  path: any;
  className: string;
  text: string;
  attributes: { name: string; value: string }[];
}

export interface ElementMatchResult {
  node: any;
  path: any;
  score: number;
  reason: string;
  attributeScore?: number;
}

/**
 * Calculate similarity score between two className strings
 * Returns a score from 0 to 1 based on how many classes match
 */
function calculateClassSimilarity(
  clickedClassName: string,
  candidateClassName: string
): number {
  // Normalize: split by whitespace, filter empty strings, and create sets
  const clickedClasses = new Set(
    clickedClassName
      .split(/\s+/)
      .map((c) => c.trim())
      .filter(Boolean)
  );
  const candidateClasses = new Set(
    candidateClassName
      .split(/\s+/)
      .map((c) => c.trim())
      .filter(Boolean)
  );

  // If both are empty, consider them equal
  if (clickedClasses.size === 0 && candidateClasses.size === 0) {
    return 1.0;
  }

  // If one is empty and the other is not, no match
  if (clickedClasses.size === 0 || candidateClasses.size === 0) {
    return 0;
  }

  // Calculate intersection
  const intersection = new Set(
    Array.from(clickedClasses).filter((c) => candidateClasses.has(c))
  );

  // Jaccard similarity: intersection / union
  const union = new Set([...clickedClasses, ...candidateClasses]);
  const similarity = intersection.size / union.size;

  return similarity;
}

/**
 * Extract className attribute value from a JSX element node
 */
function extractClassName(node: any): string {
  if (!node?.openingElement?.attributes) {
    return "";
  }

  for (const attr of node.openingElement.attributes) {
    if (attr.type === "JSXAttribute" && attr.name?.name === "className") {
      // Handle different className value types
      if (attr.value?.type === "StringLiteral") {
        return attr.value.value || "";
      } else if (attr.value?.type === "JSXExpressionContainer") {
        // For template literals or simple string expressions
        const expression = attr.value.expression;
        if (expression?.type === "StringLiteral") {
          return expression.value || "";
        } else if (expression?.type === "TemplateLiteral") {
          // Extract static parts only (ignore dynamic expressions)
          const staticParts =
            expression.quasis?.map((q: any) => q.value.cooked).join(" ") || "";
          return staticParts;
        }
      }
    }
  }

  return "";
}

function extractAttributeValue(node: any): string | null {
  if (!node) {
    return null;
  }

  if (
    node.type === "StringLiteral" ||
    node.type === "Literal" ||
    typeof node.value === "string"
  ) {
    return node.value ?? null;
  }

  if (node.type === "JSXExpressionContainer") {
    const expression = node.expression;
    if (!expression) {
      return null;
    }

    if (
      expression.type === "StringLiteral" ||
      expression.type === "Literal" ||
      typeof expression.value === "string"
    ) {
      return expression.value ?? null;
    }

    if (
      expression.type === "TemplateLiteral" &&
      (expression.expressions?.length ?? 0) === 0
    ) {
      return expression.quasis
        ?.map((q: any) => q.value.cooked)
        .join("") ?? null;
    }
  }

  return null;
}

function extractStringAttributes(node: any): { name: string; value: string }[] {
  const results: { name: string; value: string }[] = [];

  const attributes: any[] = node?.openingElement?.attributes || [];

  for (const attr of attributes) {
    if (attr?.type !== "JSXAttribute" || !attr.name?.name) {
      continue;
    }

    const literalValue = extractAttributeValue(attr.value);
    if (typeof literalValue === "string" && literalValue.length > 0) {
      results.push({ name: attr.name.name, value: literalValue });
    }
  }

  return results;
}

/**
 * Extract text content from JSX element children
 */
function extractText(node: any): string {
  if (!node?.children) {
    return "";
  }

  const texts: string[] = [];
  for (const child of node.children) {
    if (child.type === "JSXText" && child.value) {
      texts.push(child.value);
    } else if (child.type === "JSXExpressionContainer") {
      // We can't easily extract dynamic text, but we note its presence
      texts.push("[dynamic]");
    }
  }

  return normalizeText(texts.filter(Boolean).join(" "));
}

/**
 * Find the best matching element from a list of candidates
 * Uses className similarity as the primary matching criterion
 *
 * @param candidates - Array of candidate elements
 * @param clickedClassName - className of the element the user clicked
 * @param clickedText - text content of the element the user clicked (for fallback)
 * @returns The best matching element, or null if no good match found
 */
export function findBestMatch(
  candidates: ElementMatchCandidate[],
  clickedClassName: string,
  clickedText: string
): ElementMatchResult | null {
  if (candidates.length === 0) {
    return null;
  }

  // If only one candidate, return it (no ambiguity)
  if (candidates.length === 1) {
    return {
      node: candidates[0].node,
      path: candidates[0].path,
      score: 1.0,
      reason: "Only one candidate",
    };
  }

  logger.info({
    message: "[ElementMatcher] Multiple candidates, scoring...",
    context: {
      count: candidates.length,
      clickedClassName,
      clickedText,
    },
  });

  const normalizedClickedText = normalizeText(clickedText);

  // Score each candidate
  const scored = candidates.map((candidate) => {
    const classSimilarity = calculateClassSimilarity(
      clickedClassName,
      candidate.className
    );

    const attributeMatch = candidate.attributes.some((attr) => {
      const normalizedAttr = normalizeText(attr.value);
      if (!normalizedAttr || !normalizedClickedText) {
        return false;
      }
      return (
        normalizedAttr === normalizedClickedText ||
        normalizedAttr.includes(normalizedClickedText) ||
        normalizedClickedText.includes(normalizedAttr)
      );
    })
      ? 0.3
      : 0;

    // Text match is a tiebreaker (less important than className)
    const textMatch =
      normalizedClickedText && candidate.text.includes(normalizedClickedText)
        ? 0.1
        : 0;

    const totalScore = classSimilarity + textMatch + attributeMatch;

    logger.info({
      message: "[ElementMatcher] Candidate scored",
      context: {
        candidateClassName: candidate.className,
        candidateText: candidate.text,
        classSimilarity,
        textMatch,
        attributeMatch,
        totalScore,
      },
    });

    return {
      node: candidate.node,
      path: candidate.path,
      attributeScore: attributeMatch,
      score: totalScore,
      reason: `className similarity: ${classSimilarity.toFixed(
        2
      )}, text match: ${textMatch.toFixed(2)}, attribute match: ${attributeMatch.toFixed(
        2
      )}`,
    };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  const secondBest = scored[1];

  const noConfidence =
    best.score <= 0 && (!secondBest || secondBest.score <= 0);

  if (!secondBest) {
    if (noConfidence) {
      logger.warn({
        message: "[ElementMatcher] Unable to determine best match (no confidence)",
        context: {
          bestScore: best.score,
          bestReason: best.reason,
        },
      });
      return null;
    }

    logger.info({
      message: "[ElementMatcher] Single candidate selected",
      context: {
        score: best.score,
        reason: best.reason,
      },
    });
    return best;
  }

  if (noConfidence) {
    logger.warn({
      message: "[ElementMatcher] No confident match (all scores zero)",
      context: {
        bestScore: best.score,
        secondBestScore: secondBest.score,
      },
    });
    return null;
  }

  // If the best score is significantly better than the second best, return it
  if (best.score > secondBest.score + 0.1) {
    logger.info({
      message: "[ElementMatcher] Best match found",
      context: {
        score: best.score,
        reason: best.reason,
      },
    });
    return best;
  }

  if ((best.attributeScore ?? 0) > (secondBest.attributeScore ?? 0)) {
    logger.info({
      message: "[ElementMatcher] Attribute match resolved tie",
      context: {
        score: best.score,
        reason: best.reason,
        attributeScore: best.attributeScore,
      },
    });
    return best;
  }

  // If scores are too close, we're not confident
  logger.warn({
    message: "[ElementMatcher] Ambiguous match, scores too close",
    context: {
      bestScore: best.score,
      secondBestScore: secondBest.score,
    },
  });

  return null;
}

/**
 * Create a candidate from a JSX element node and path
 */
export function createCandidate(node: any, path: any): ElementMatchCandidate {
  return {
    node,
    path,
    className: extractClassName(node),
    text: extractText(node),
    attributes: extractStringAttributes(node),
  };
}
