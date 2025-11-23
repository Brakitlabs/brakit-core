import fs from "fs";
import jscodeshift, { ASTPath, JSXElement, JSXFragment, JSXText, Literal } from "jscodeshift";
import { namedTypes } from "ast-types";
import prettier from "prettier";
import { actionHistory } from "../history";
import { JSXChildNode } from "../shared/types";

export class ASTMutationEngine {
  public removeNodeFromAst(
    matchedPath: ASTPath<JSXElement>,
    parentPath: ASTPath<namedTypes.Node> | null | undefined
  ): boolean {
    if (!matchedPath || !parentPath) {
      return false;
    }

    const parentNode = parentPath.node;
    const node = matchedPath.node as unknown as namedTypes.Node;

    // Handle JSX children removal (standard case)
    if (parentNode.type === "JSXElement" || parentNode.type === "JSXFragment") {
      const parentChildren =
        (parentNode as unknown as { children?: JSXChildNode[] }).children || [];
      const idx = parentChildren.indexOf(node as unknown as JSXChildNode);
      if (idx !== -1) {
        parentChildren.splice(idx, 1);
        this.pruneEmptyAncestors(parentPath);
        return true;
      }
    }

    // element passed as prop: icon={<Element />}
    if (
      parentNode.type === "JSXExpressionContainer" &&
      parentPath.parent?.node.type === "JSXAttribute"
    ) {
      const attrPath = parentPath.parent as ASTPath<namedTypes.JSXAttribute>;
      const openingElement = attrPath.parent?.node as namedTypes.JSXOpeningElement;
      if (openingElement?.attributes) {
        const index = openingElement.attributes.indexOf(attrPath.node);
        if (index !== -1) {
          openingElement.attributes.splice(index, 1);
          this.pruneEmptyAncestors(attrPath.parent as ASTPath<namedTypes.Node>);
          return true;
        }
      }
      // Fallback: replace value with null
      attrPath.node.value = jscodeshift.jsxExpressionContainer(
        jscodeshift.literal(null)
      );
      this.pruneEmptyAncestors(attrPath.parent as ASTPath<namedTypes.Node>);
      return true;
    }

    // Conditional expression branches: isOpen ? <Element /> : null
    if (parentNode.type === "ConditionalExpression") {
      if ((parentNode as any).consequent === node) {
        (parentNode as any).consequent = jscodeshift.literal(null);
      } else if ((parentNode as any).alternate === node) {
        (parentNode as any).alternate = jscodeshift.literal(null);
      }
      this.pruneEmptyAncestors(parentPath);
      return true;
    }

    // Arrow function implicit return: () => <Element />
    if (
      parentNode.type === "ArrowFunctionExpression" &&
      (parentNode as any).body === node
    ) {
      (parentNode as any).body = jscodeshift.literal(null);
      this.pruneEmptyAncestors(parentPath);
      return true;
    }

    // Return statements: return <Element />
    if (
      parentNode.type === "ReturnStatement" &&
      (parentNode as any).argument === node
    ) {
      (parentNode as any).argument = jscodeshift.literal(null);
      this.pruneEmptyAncestors(parentPath);
      return true;
    }

    // JSXExpressionContainer wrapping element inside JSX
    if (
      parentNode.type === "JSXExpressionContainer" &&
      (parentPath.parent?.node.type === "JSXElement" ||
        parentPath.parent?.node.type === "JSXFragment")
    ) {
      const grandParent = parentPath.parent.node as unknown as {
        children?: JSXChildNode[];
      };
      const idx = (grandParent.children || []).indexOf(
        parentPath.value as unknown as JSXChildNode
      );
      if (idx !== -1 && grandParent.children) {
        grandParent.children.splice(idx, 1);
        this.pruneEmptyAncestors(parentPath.parent as ASTPath<namedTypes.Node>);
        return true;
      }
    }

    // Fallback to prune when available
    if (typeof matchedPath.prune === "function") {
      matchedPath.prune();
      this.pruneEmptyAncestors(parentPath);
      return true;
    }

    return false;
  }

  private pruneEmptyAncestors(
    path: ASTPath<namedTypes.Node> | null | undefined
  ): void {
    let current = path;

    while (current && current.value) {
      const node = current.value;

      if (node.type !== "JSXElement" && node.type !== "JSXFragment") {
        break;
      }

      const children: JSXChildNode[] =
        (node as unknown as { children?: JSXChildNode[] }).children || [];
      const hasMeaningfulChild = children.some((child) => {
        if (!child) {
          return false;
        }
        if (child.type === "JSXText") {
          const value = (child as JSXText).value;
          return typeof value === "string" && value.trim().length > 0;
        }
        return true;
      });

      if (hasMeaningfulChild) {
        break;
      }

      if (typeof current.prune === "function") {
        const parent = current.parent as
          | ASTPath<namedTypes.Node>
          | null
          | undefined;
        current.prune();
        current = parent;
        continue;
      }

      if (current.parent?.value?.children) {
        current.parent.value.children = current.parent.value.children.filter(
          (child: JSXChildNode) => child !== (node as unknown as JSXChildNode)
        );
        current = current.parent;
        continue;
      }

      break;
    }
  }

  public async writeFormattedSource(
    filePath: string,
    ast: { toSource(): string },
    originalSource: string
  ): Promise<boolean> {
    const newSource = ast.toSource();
    const formattedContent = await prettier.format(newSource, {
      parser: "typescript",
    });

    if (formattedContent === originalSource) {
      return false;
    }

    await fs.promises.writeFile(filePath, formattedContent, "utf8");
    actionHistory.recordFileChange(filePath, originalSource, formattedContent, {
      existedBefore: originalSource !== null,
      existedAfter: true,
    });
    return true;
  }
}
