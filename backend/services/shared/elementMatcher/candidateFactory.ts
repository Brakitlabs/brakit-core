/**
 * Factory for creating element match candidates from AST nodes.
 */

import { extractClassName } from "./classNameExtractor";
import { extractStringAttributes } from "./attributeExtractor";
import { extractText } from "./textExtractor";
import type { ElementMatchCandidate } from "./types";

export function createCandidate(
  node: any,
  path: any
): ElementMatchCandidate {
  // JSCodeshift paths have 'key' or 'name' properties for array indices
  let siblingIndex = -1;
  
  if (typeof path.key === "number") {
    siblingIndex = path.key;
  } else if (typeof path.name === "number") {
    siblingIndex = path.name;
  }

  return {
    node,
    path,
    className: extractClassName(node),
    text: extractText(node),
    attributes: extractStringAttributes(node),
    siblingIndex,
    tagName: node.openingElement?.name?.name || "unknown",
  };
}
