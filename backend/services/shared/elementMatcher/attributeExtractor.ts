/**
 * Utilities for extracting static attribute values from JSX nodes.
 */

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
      return (
        expression.quasis?.map((q: any) => q.value.cooked).join("") ?? null
      );
    }
  }

  return null;
}

export function extractStringAttributes(
  node: any
): Array<{ name: string; value: string }> {
  const results: Array<{ name: string; value: string }> = [];
  const attributes: any[] = node?.openingElement?.attributes || [];

  for (const attr of attributes) {
    if (attr?.type !== "JSXAttribute" || !attr.name?.name) {
      continue;
    }

    const literalValue = extractAttributeValue(attr.value);
    
    if (typeof literalValue === "string" && literalValue.length > 0) {
      results.push({ 
        name: attr.name.name, 
        value: literalValue 
      });
    }
  }

  return results;
}
