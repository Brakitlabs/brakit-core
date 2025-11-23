import fs from "fs";
import path from "path";
import jscodeshift, {
  ASTPath,
  JSXElement,
  JSXIdentifier,
  JSXNamespacedName,
  JSXMemberExpression,
  JSXAttribute,
  JSXSpreadAttribute,
  JSXText,
  JSXExpressionContainer,
} from "jscodeshift";
import { logger } from "../../utils/logger";
import {
  SEARCH_DIRECTORIES,
  SKIP_DIRECTORIES,
  ParsedAst,
  JSXChildNode,
  ComponentUsageMatch,
  ProjectComponentUsageMatch,
} from "../shared/types";
import { normalizeText } from "../shared/textUtils";
import { createCandidate, ElementMatchCandidate } from "../shared/elementMatcher";

// Helper to resolve element names
function resolveJSXElementName(
  nameNode:
    | JSXIdentifier
    | JSXNamespacedName
    | JSXMemberExpression
    | null
    | undefined
): string | undefined {
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

export class ASTQueryEngine {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  public parseAndFindElements(
    source: string,
    tag: string,
    possibleNames: string[]
  ): { ast: ParsedAst } {
    const j = jscodeshift.withParser("tsx");
    const ast = j(source) as ParsedAst;
    return { ast };
  }

  public collectCandidateElements(
    ast: ParsedAst,
    possibleNames: string[],
    textMatcher: (node: JSXElement, children: JSXChildNode[]) => boolean
  ): ElementMatchCandidate[] {
    const candidates: ElementMatchCandidate[] = [];

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

  public findComponentUsageByText(
    ast: ParsedAst,
    text: string
  ): ComponentUsageMatch | null {
    const normalizedTarget = normalizeText(text);

    if (!normalizedTarget) {
      return null;
    }

    let match: ComponentUsageMatch | null = null;

    ast.find(jscodeshift.JSXElement).forEach((path: ASTPath<JSXElement>) => {
      if (match) {
        return;
      }

      const node = path.node;
      const nameNode = node.openingElement?.name;
      const candidateName = resolveJSXElementName(nameNode);

      if (!candidateName || !/^[A-Z]/.test(candidateName)) {
        return;
      }

      const attributeSet = new Set<string>();
      const attributes: Array<
        JSXAttribute | JSXSpreadAttribute | null | undefined
      > = node.openingElement?.attributes || [];

      for (const attr of attributes) {
        if (!attr || attr.type !== "JSXAttribute") {
          continue;
        }

        const attrName =
          typeof attr.name?.name === "string" ? attr.name.name : undefined;
        if (attrName) {
          attributeSet.add(attrName);
        }

        const literalValue = this.extractStringValue(attr.value as any);
        if (
          literalValue &&
          normalizeText(literalValue) === normalizedTarget
        ) {
          match = {
            componentName: candidateName,
            hasInlineClassName: attributeSet.has("className"),
            propNames: Array.from(attributeSet),
          };
          return;
        }
      }

      const children: JSXChildNode[] =
        ((node.children as unknown as JSXChildNode[]) || []) as JSXChildNode[];
      for (const child of children) {
        const literalValue = this.extractStringValue(child);
        if (
          literalValue &&
          normalizeText(literalValue) === normalizedTarget
        ) {
          match = {
            componentName: candidateName,
            hasInlineClassName: attributeSet.has("className"),
            propNames: Array.from(attributeSet),
          };
          return;
        }
      }
    });

    return match;
  }

  public findComponentUsageInProject(
    text: string
  ): ProjectComponentUsageMatch | null {
    const normalizedTarget = normalizeText(text);

    if (!normalizedTarget) {
      return null;
    }

    const searchDirs = SEARCH_DIRECTORIES.map((dir) =>
      path.join(this.projectRoot, dir)
    ).filter((dir) => fs.existsSync(dir));

    if (searchDirs.length === 0) {
      searchDirs.push(this.projectRoot);
    }

    for (const dir of searchDirs) {
      const match = this.searchDirectoryForComponentUsage(dir, text);
      if (match) {
        return match;
      }
    }

    return null;
  }

  private searchDirectoryForComponentUsage(
    dir: string,
    text: string
  ): ProjectComponentUsageMatch | null {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (SKIP_DIRECTORIES.includes(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          const match = this.searchDirectoryForComponentUsage(fullPath, text);
          if (match) {
            return match;
          }
        } else if (entry.isFile() && /\.(tsx|jsx)$/.test(entry.name)) {
          const source = fs.readFileSync(fullPath, "utf8");

          if (!source.includes(text)) {
            continue;
          }

          try {
            const j = jscodeshift.withParser("tsx");
            const ast = j(source) as ParsedAst;
            const usageMatch = this.findComponentUsageByText(ast, text);

            if (usageMatch) {
              return { filePath: fullPath, ...usageMatch };
            }
          } catch (error) {
            logger.warn({
              message: `[ASTQuery] Failed to parse component file during usage search`,
              context: {
                filePath: fullPath,
                error: error instanceof Error ? error.message : String(error),
              },
            });
          }
        }
      }
    } catch (error) {
      logger.warn({
        message: `[ASTQuery] Error scanning directory for component usage`,
        context: {
          directory: dir,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }

    return null;
  }

  public async fileContainsText(
    filePath: string,
    text: string,
    possibleTags: string[],
    options?: { allowDynamicFallback?: boolean }
  ): Promise<boolean> {
    const allowDynamicFallback = options?.allowDynamicFallback !== false;
    try {
      const source = fs.readFileSync(filePath, "utf8");
      const j = jscodeshift.withParser("tsx");
      const ast = j(source) as ParsedAst;

      let found = false;
      const normalizedTarget = normalizeText(text);

      ast.findJSXElements().forEach((path: ASTPath<JSXElement>) => {
        if (found) return;

        const { node } = path;
        const nodeName = resolveJSXElementName(node.openingElement?.name);

        if (nodeName && possibleTags.includes(nodeName)) {
          const children: JSXChildNode[] =
            ((node.children as unknown as JSXChildNode[]) || []) as JSXChildNode[];
          let hasStaticText = false;
          const textInfo = this.collectNodeTextInfo(children);
          const normalizedCombinedText = normalizeText(textInfo.text);
          const hasDynamicContent = textInfo.hasDynamicContent;

          if (
            normalizedTarget.length > 0 &&
            normalizedCombinedText === normalizedTarget
          ) {
            found = true;
            hasStaticText = true;
          }

          if (!hasStaticText && hasDynamicContent && allowDynamicFallback) {
            found = true;
          }
        }
      });

      return found;
    } catch (error) {
      return false;
    }
  }

  // TODO: This duplicates logic in elementMatcher.ts/BaseUpdateService.ts
  // Should be consolidated in ElementMatcher or TextUtils
  private collectNodeTextInfo(children: JSXChildNode[]): {
    text: string;
    hasDynamicContent: boolean;
  } {
    const parts: string[] = [];
    let hasDynamicContent = false;

    for (const child of children) {
      if (!child) {
        continue;
      }

      if (child.type === "JSXText" && (child as JSXText).value) {
        parts.push((child as JSXText).value as string);
        continue;
      }

      if (child.type === "JSXExpressionContainer") {
        const expression = (child as JSXExpressionContainer).expression;
        if (!expression || expression.type === "JSXEmptyExpression") {
          continue;
        }

        const value = this.extractStringValue(expression as any);
        if (value) {
          parts.push(value);
        } else {
          hasDynamicContent = true;
        }
        continue;
      }

      if (child.type === "JSXElement") {
        const nestedInfo = this.collectNodeTextInfo(
          ((child as JSXElement).children || []) as JSXChildNode[]
        );
        if (nestedInfo.text) {
          parts.push(nestedInfo.text);
        }
        if (nestedInfo.hasDynamicContent) {
          hasDynamicContent = true;
        }
        continue;
      }

      const value = this.extractStringValue(child);
      if (value) {
        parts.push(value);
      }
    }

    return {
      text: parts.join(""),
      hasDynamicContent,
    };
  }

  private extractStringValue(node: any): string | null {
    if (!node) {
      return null;
    }

    switch (node.type) {
      case "StringLiteral":
      case "Literal": {
        return typeof node.value === "string" ? node.value : null;
      }
      case "TemplateLiteral":
        if (node.expressions && node.expressions.length > 0) {
          return null;
        }
        return (
          node.quasis
            ?.map((q: any) => q.value.cooked ?? "")
            .join("") ?? null
        );
      case "JSXExpressionContainer": {
        return this.extractStringValue(node.expression);
      }
      case "JSXText": {
        return typeof node.value === "string" ? node.value : null;
      }
      default:
        return null;
    }
  }
}
