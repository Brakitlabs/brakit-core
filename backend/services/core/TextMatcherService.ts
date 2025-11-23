import { JSXElement, JSXText, JSXExpressionContainer } from "jscodeshift";
import { normalizeText } from "../shared/textUtils";
import { JSXChildNode } from "../shared/types";

/**
 * Service for extracting and matching text content in JSX elements.
 * Handles both static text and dynamic expressions.
 */
export class TextMatcherService {
  /**
   * Collect text content from JSX children, identifying dynamic parts
   */
  public collectNodeTextInfo(children: JSXChildNode[]): {
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

  /**
   * Extract normalized text from JSX children
   */
  public extractNodeText(children: JSXChildNode[]): string {
    const { text } = this.collectNodeTextInfo(children);
    return normalizeText(text);
  }

  /**
   * Extract a static string value from an AST node if possible
   */
  public extractStringValue(node: any): string | null {
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
          node.quasis?.map((q: any) => q.value.cooked ?? "").join("") ?? null
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

  /**
   * Create a matcher function that checks if an element matches text or class criteria
   */
  public createTextOrClassNameMatcher(
    text: string,
    className: string
  ): (node: JSXElement, children: JSXChildNode[]) => boolean {
    const normalizedText = normalizeText(text);
    const hasText = normalizedText.length > 0;
    const hasClassName = className.length > 0;

    return (node: JSXElement, children: JSXChildNode[]): boolean => {
      if (!hasText && !hasClassName) {
        return true;
      }

      let textMatch = false;
      let classMatch = false;

      if (hasText) {
        const textInfo = this.collectNodeTextInfo(children);
        const normalizedCombinedText = normalizeText(textInfo.text);
        const hasDynamicContent = textInfo.hasDynamicContent;

        if (
          normalizedText.length > 0 &&
          normalizedCombinedText === normalizedText
        ) {
          textMatch = true;
        } else if (hasDynamicContent) {
          // If content is dynamic and we have some static text, allow partial match
          textMatch = normalizedCombinedText.includes(normalizedText);
        }
      } else {
        textMatch = true;
      }

      if (hasClassName) {
        // Check className attribute
        const attributes = node.openingElement?.attributes || [];
        const classNameAttr = attributes.find(
          (attr: any) =>
            attr.type === "JSXAttribute" && attr.name?.name === "className"
        );

        if (classNameAttr) {
          classMatch = true; // Simplified - actual matching done by elementMatcher
        }
      } else {
        classMatch = true;
      }

      return textMatch && classMatch;
    };
  }
}
