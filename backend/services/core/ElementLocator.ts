import { JSXElement, ASTPath } from "jscodeshift";
import { logger } from "../../utils/logger";
import {
  findBestMatch,
  createCandidate,
  type ElementMatchCandidate,
  type ElementMatchResult,
} from "../shared/elementMatcher";
import { ParsedAst, JSXChildNode } from "../shared/types";
import { TextMatcherService } from "./TextMatcherService";

/**
 * Resolves JSX element names from different node types
 */
function resolveJSXElementName(nameNode: any): string | undefined {
  if (!nameNode) {
    return undefined;
  }

  if (nameNode.type === "JSXIdentifier") {
    return nameNode.name;
  }

  if (nameNode.type === "JSXNamespacedName") {
    return nameNode.name.name;
  }

  if (nameNode.type === "JSXMemberExpression") {
    const object = nameNode.object;
    if (object.type === "JSXIdentifier") {
      return object.name;
    }
  }

  return undefined;
}

/**
 * Service for locating JSX elements in the AST based on various criteria.
 * Handles element matching by tag name, text content, class names, and sibling index.
 */
export class ElementLocator {
  private textMatcher: TextMatcherService;

  constructor() {
    this.textMatcher = new TextMatcherService();
  }

  /**
   * Find a local element match in the AST
   * 
   * @param ast - Parsed AST to search
   * @param tag - Tag name to match
   * @param text - Text content to match
   * @param className - Class name to match
   * @param possibleNames - Array of possible component names
   * @param siblingIndex - Optional sibling index for disambiguation
   * @param serviceName - Name of calling service for logging
   * @returns Match result or null
   */
  public findLocalElementMatch(
    ast: ParsedAst,
    tag: string,
    text: string,
    className: string,
    possibleNames: string[],
    siblingIndex: number | undefined,
    serviceName: string
  ): { matchedNode: JSXElement; matchedPath: ASTPath<JSXElement> } | null {
    logger.info({
      message: `[${serviceName}] Searching for element`,
      context: {
        tag,
        text: text.substring(0, 50),
        className,
        possibleNames,
        siblingIndex,
      },
    });

    // Collect candidates that match tag name and basic criteria
    const candidates = this.collectCandidates(
      ast,
      possibleNames,
      text,
      className
    );

    if (candidates.length === 0) {
      logger.warn({
        message: `[${serviceName}] No candidates found`,
        context: { tag, possibleNames },
      });
      return null;
    }

    logger.info({
      message: `[${serviceName}] Found ${candidates.length} candidate(s)`,
      context: {
        count: candidates.length,
        className,
      },
    });

    // Use element matcher to find best match
    const bestMatch = findBestMatch(candidates, className, text, siblingIndex);
    
    if (!bestMatch) {
      logger.warn({
        message: `[${serviceName}] No suitable match after scoring`,
      });
      return null;
    }

    logger.info({
      message: `[${serviceName}] Selected best match`,
      context: {
        score: bestMatch.score,
        reason: bestMatch.reason,
      },
    });

    return {
      matchedNode: bestMatch.node as JSXElement,
      matchedPath: bestMatch.path as ASTPath<JSXElement>,
    };
  }

  /**
   * Collect candidate elements that match basic criteria
   */
  private collectCandidates(
    ast: ParsedAst,
    possibleNames: string[],
    text: string,
    className: string
  ): ElementMatchCandidate[] {
    const candidates: ElementMatchCandidate[] = [];
    const textMatcher = this.textMatcher.createTextOrClassNameMatcher(
      text,
      className
    );

    ast.findJSXElements().forEach((path: ASTPath<JSXElement>) => {
      const { node } = path;
      const nodeName = resolveJSXElementName(node.openingElement?.name);

      if (nodeName && possibleNames.includes(nodeName)) {
        const children: JSXChildNode[] =
          ((node.children as unknown as JSXChildNode[]) || []) as JSXChildNode[];

        if (textMatcher(node, children)) {
          candidates.push(createCandidate(node, path));
        }
      }
    });

    return candidates;
  }

  /**
   * Select the best matching element from candidates using scoring
   */
  public selectBestMatchingElement(
    candidates: ElementMatchCandidate[],
    className: string,
    text: string,
    serviceName: string
  ): { matchedNode: JSXElement; matchedPath: ASTPath<JSXElement> } | null {
    if (candidates.length === 0) {
      return null;
    }

    logger.info({
      message: `[${serviceName}] Found ${candidates.length} candidate(s)`,
      context: {
        count: candidates.length,
        className,
      },
    });

    const bestMatch = findBestMatch(candidates, className, text);
    if (!bestMatch) {
      return null;
    }

    logger.info({
      message: `[${serviceName}] Selected best match`,
      context: {
        score: bestMatch.score,
        reason: bestMatch.reason,
      },
    });

    return {
      matchedNode: bestMatch.node as JSXElement,
      matchedPath: bestMatch.path as ASTPath<JSXElement>,
    };
  }
}
