/**
 * Utilities for extracting and analyzing className attributes from JSX nodes.
 */

export function extractClassName(node: any): string {
  if (!node?.openingElement?.attributes) {
    return "";
  }

  for (const attr of node.openingElement.attributes) {
    if (attr.type === "JSXAttribute" && attr.name?.name === "className") {
      if (attr.value?.type === "StringLiteral") {
        return attr.value.value || "";
      }
      
      if (attr.value?.type === "JSXExpressionContainer") {
        return extractDynamicClasses(attr.value.expression).join(" ");
      }
    }
  }

  return "";
}

/**
 * Recursively extracts static class names from dynamic expressions.
 * Handles: clsx(), template literals, conditionals, objects, arrays.
 */
export function extractDynamicClasses(expr: any): string[] {
  const classes: string[] = [];

  if (!expr) {
    return classes;
  }

  const visit = (node: any): void => {
    if (!node) {
      return;
    }

    switch (node.type) {
      case "StringLiteral":
      case "Literal":
        if (typeof node.value === "string") {
          classes.push(...node.value.split(/\s+/).filter(Boolean));
        }
        break;

      case "TemplateLiteral":
        node.quasis?.forEach((quasi: any) => {
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
        node.arguments?.forEach((arg: any) => visit(arg));
        break;

      case "ArrayExpression":
        node.elements?.forEach((element: any) => visit(element));
        break;

      case "ObjectExpression":
        node.properties?.forEach((prop: any) => {
          if (!prop?.key) {
            return;
          }

          if (prop.key.type === "StringLiteral" || prop.key.type === "Literal") {
            classes.push(...(prop.key.value as string).split(/\s+/).filter(Boolean));
          } else if (prop.key.type === "Identifier") {
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

/** Jaccard similarity: intersection / union */
export function calculateClassSimilarity(
  classNameA: string,
  classNameB: string
): number {
  const classesA = sanitizeClassTokens(classNameA);
  const classesB = sanitizeClassTokens(classNameB);

  if (classesA.size === 0 && classesB.size === 0) return 1.0;
  if (classesA.size === 0 || classesB.size === 0) return 0.0;

  const intersection = new Set(
    Array.from(classesA).filter((c) => classesB.has(c))
  );
  const union = new Set([...classesA, ...classesB]);

  return intersection.size / union.size;
}

/** Filters out brakit-internal classes */
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
  tokensA: Set<string>,
  tokensB: Set<string>
): boolean {
  if (tokensA.size === 0 || tokensB.size === 0) {
    return false;
  }

  for (const token of tokensA) {
    if (tokensB.has(token)) {
      return true;
    }
  }

  return false;
}
