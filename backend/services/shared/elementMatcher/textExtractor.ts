/**
 * Utilities for extracting text content from JSX element children.
 */

import { normalizeText } from "../textUtils";

export const DYNAMIC_TEXT_MARKER = "__DYNAMIC__";

export function extractText(node: any): string {
  const texts: string[] = [];

  const visit = (child: any): void => {
    if (!child) {
      return;
    }

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
          texts.push(DYNAMIC_TEXT_MARKER);
        }
        break;
      }

      case "JSXElement":
      case "JSXFragment":
        (child.children || []).forEach(visit);
        break;
    }
  };

  (node?.children || []).forEach(visit);

  return normalizeText(texts.filter(Boolean).join(" "));
}
