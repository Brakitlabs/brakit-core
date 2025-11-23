import { logger } from "../../utils/logger";
import { normalizeText } from "./textUtils";

export interface ElementMatchCandidate {
  node: any;
  path: any;
  className: string;
  text: string;
  attributes: { name: string; value: string }[];
  siblingIndex: number;
  tagName: string;
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

  if (clickedClasses.size === 0 && candidateClasses.size === 0) {
    return 1.0;
  }

  if (clickedClasses.size === 0 || candidateClasses.size === 0) {
    return 0;
  }

  const intersection = new Set(
    Array.from(clickedClasses).filter((c) => candidateClasses.has(c))
  );

  const union = new Set([...clickedClasses, ...candidateClasses]);
  const similarity = intersection.size / union.size;

  return similarity;
}

/**
 * Extract className attribute value from a JSX element node
 * enhanced to handle dynamic expressions (clsx, template literals)
 */
function extractClassName(node: any): string {
  if (!node?.openingElement?.attributes) {
    return "";
  }

  for (const attr of node.openingElement.attributes) {
    if (attr.type === "JSXAttribute" && attr.name?.name === "className") {
      if (attr.value?.type === "StringLiteral") {
        return attr.value.value || "";
      } else if (attr.value?.type === "JSXExpressionContainer") {
        return extractDynamicClasses(attr.value.expression).join(" ");
      }
    }
  }

  return "";
}

/**
 * Recursively extract static class names from expressions
 */
/**
 * Recursively extract static class names from expressions
 */
export function extractDynamicClasses(expr: any): string[] {
  const classes: string[] = [];

  if (!expr) return classes;

  const visit = (node: any) => {
    if (!node) return;

    switch (node.type) {
      case "StringLiteral":
      case "Literal":
        if (typeof node.value === "string") {
          classes.push(...node.value.split(/\s+/).filter(Boolean));
        }
        break;
      case "TemplateLiteral":
        node.quasis.forEach((quasi: any) => {
          const raw = quasi.value?.cooked ?? quasi.value?.raw ?? "";
          if (raw) {
            classes.push(...raw.split(/\s+/).filter(Boolean));
          }
        });
        break;
      case "ConditionalExpression":
        visit(node.consequent);
        visit(node.alternate);
        break;
      case "LogicalExpression":
        visit(node.left);
        visit(node.right);
        break;
      case "CallExpression":
        // Handle clsx, cn, classNames, etc.
        node.arguments.forEach((arg: any) => visit(arg));
        break;
      case "ArrayExpression":
        node.elements.forEach((element: any) => visit(element));
        break;
      case "ObjectExpression":
        // Handle { 'class-name': condition }
        node.properties.forEach((prop: any) => {
          if (!prop) return;
          if (prop.key && (prop.key.type === "StringLiteral" || prop.key.type === "Literal")) {
             classes.push(...(prop.key.value as string).split(/\s+/).filter(Boolean));
          } else if (prop.key && prop.key.type === "Identifier") {
             classes.push(prop.key.name);
          }
        });
        break;
      case "JSXExpressionContainer":
        visit(node.expression);
        break;
    }
  };

  visit(expr);
  return classes;
}

export function sanitizeClassTokens(className?: string): Set<string> {
  if (!className) {
    return new Set();
  }

  return new Set(
    className
      .split(/\s+/)
      .map((token) => token.trim().toLowerCase())
      .filter(
        (token) =>
          token &&
          !token.startsWith("brakit-") &&
          token !== "brakit-reorderable" &&
          token !== "brakit-shake"
      )
  );
}

export function hasClassOverlap(
  targetTokens: Set<string>,
  nodeTokens: Set<string>
): boolean {
  if (targetTokens.size === 0 || nodeTokens.size === 0) {
    return false;
  }

  for (const token of targetTokens) {
    if (nodeTokens.has(token)) {
      return true;
    }
  }

  return false;
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
  const texts: string[] = [];

  const visit = (child: any) => {
    if (!child) return;

    switch (child.type) {
      case "JSXText":
        if (child.value) {
          texts.push(child.value);
        }
        break;
      case "JSXExpressionContainer": {
        const expr = child.expression;
        if (!expr) {
          return;
        }
        if (
          expr.type === "StringLiteral" ||
          expr.type === "Literal" ||
          typeof expr.value === "string"
        ) {
          texts.push(expr.value);
        } else if (
          expr.type === "TemplateLiteral" &&
          (expr.expressions?.length ?? 0) === 0
        ) {
          texts.push(
            expr.quasis?.map((q: any) => q.value.cooked).join("") ?? ""
          );
        } else {
          // Dynamic text marker so we can relax matching if needed
          texts.push("__DYNAMIC__");
        }
        break;
      }
      case "JSXElement":
      case "JSXFragment":
        (child.children || []).forEach(visit);
        break;
      default:
        break;
    }
  };

  (node?.children || []).forEach(visit);

  return normalizeText(texts.filter(Boolean).join(" "));
}

/**
 * Find the best matching element from a list of candidates
 * Uses className similarity, text matching, and sibling index as signals.
 *
 * @param candidates - Array of candidate elements
 * @param clickedClassName - className of the element the user clicked
 * @param clickedText - text content of the element the user clicked (for fallback)
 * @param clickedIndex - index of the element among its siblings (0-based)
 * @returns The best matching element, or null if no good match found
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

  if (candidates.length === 1) {
    // Even with one candidate, we should verify it's not a complete mismatch
    // unless we are very desperate. But for now, preserving original behavior of trusting single candidates
    // slightly more, but maybe we should check score?
    // Let's score it to be safe.
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

  const normalizedClickedText = normalizeText(clickedText);

  const scored = candidates.map((candidate) => {
    // 1. Class Similarity (0.0 - 1.0)
    const classSimilarity = calculateClassSimilarity(
      clickedClassName,
      candidate.className
    );

    // 2. Text Match (0.0 or 0.1)
    // If candidate has dynamic text, we are more lenient
    const hasDynamicText = candidate.text.includes("__DYNAMIC__");
    const cleanCandidateText = candidate.text.replace(/__DYNAMIC__/g, "").trim();
    const strippedClicked = normalizedClickedText.replace(/[^a-z0-9]+/g, "");
    const strippedCandidate = normalizeText(cleanCandidateText).replace(
      /[^a-z0-9]+/g,
      ""
    );
    
    let textMatch = 0;
    if (normalizedClickedText && cleanCandidateText) {
        if (cleanCandidateText.includes(normalizedClickedText) || normalizedClickedText.includes(cleanCandidateText)) {
            textMatch = 0.2; // Boosted text match weight
        } else if (
          strippedClicked &&
          strippedCandidate &&
          (strippedCandidate.includes(strippedClicked) ||
            strippedClicked.includes(strippedCandidate))
        ) {
          // Allow matches that only differ by whitespace/punctuation (e.g., "Active users18,245" vs "Active users 18,245")
          textMatch = 0.2;
        }
    } else if (normalizedClickedText && hasDynamicText) {
        // If we have text but candidate is dynamic, we can't be sure. 
        // We don't penalize, but we don't award full points.
        textMatch = 0.05; 
    } else if (!normalizedClickedText && !cleanCandidateText) {
        // Both empty
        textMatch = 0.1;
    }

    // 3. Attribute Match (0.0 or 0.3)
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

    // 4. Sibling Index Match (0.0 or 0.15)
    // We treat this as a secondary signal.
    let indexMatch = 0;
    if (clickedIndex !== undefined && candidate.siblingIndex !== undefined) {
        // Exact match
        if (clickedIndex === candidate.siblingIndex) {
            indexMatch = 0.15;
        } 
        // Close match (off by one due to text nodes/comments?)
        else if (Math.abs(clickedIndex - candidate.siblingIndex) <= 1) {
            indexMatch = 0.05;
        }
    }

    // Structure-First Override:
    // If text doesn't match, but Class + Index + Tag are strong, we boost.
    // (Tag is implicitly matched by caller usually, but we have it in candidate)
    let structureBonus = 0;
    if (classSimilarity > 0.8 && indexMatch > 0.1) {
        structureBonus = 0.2;
    }

    const totalScore = classSimilarity + textMatch + attributeMatch + indexMatch + structureBonus;

    logger.info({
      message: "[ElementMatcher] Candidate scored",
      context: {
        candidateClassName: candidate.className,
        classSimilarity,
        textMatch,
        attributeMatch,
        indexMatch,
        structureBonus,
        totalScore,
      },
    });

    return {
      node: candidate.node,
      path: candidate.path,
      attributeScore: attributeMatch,
      score: totalScore,
      reason: `class: ${classSimilarity.toFixed(2)}, text: ${textMatch.toFixed(2)}, attr: ${attributeMatch.toFixed(2)}, index: ${indexMatch.toFixed(2)}`,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  const secondBest = scored[1];

  // Thresholds
  if (best.score < 0.1) {
       logger.warn({
        message: "[ElementMatcher] No confident match (score too low)",
        context: { bestScore: best.score },
      });
      return null;
  }

  if (!secondBest) {
    return best;
  }

  // Margin of error
  if (best.score > secondBest.score + 0.1) {
    return best;
  }

  // Tie-breakers
  if ((best.attributeScore ?? 0) > (secondBest.attributeScore ?? 0)) {
    return best;
  }

  logger.warn({
    message: "[ElementMatcher] Ambiguous match",
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
  // Calculate sibling index if possible
  // jscodeshift paths usually have a 'name' or 'key' property that is the index in the parent array
  let siblingIndex = -1;
  if (typeof path.key === 'number') {
      siblingIndex = path.key;
  } else if (typeof path.name === 'number') {
      siblingIndex = path.name;
  }

  return {
    node,
    path,
    className: extractClassName(node),
    text: extractText(node),
    attributes: extractStringAttributes(node),
    siblingIndex,
    tagName: node.openingElement?.name?.name || "unknown"
  };
}
