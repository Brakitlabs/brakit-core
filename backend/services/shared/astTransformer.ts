import jscodeshift, { FileInfo } from "jscodeshift";
import { parse } from "@babel/parser";
import prettier from "prettier";

export interface ASTTransformResult {
  success: boolean;
  newContent: string;
  error?: string;
}

export interface ASTDeletePayload {
  sourceFile: string;
  componentName: string;
  elementIdentifier: string;
}

export class ASTTransformer {
  private enableFormatting: boolean;
  private debug: boolean;
  private similarityThreshold: number;

  constructor(
    enableFormatting = true,
    debug = false,
    similarityThreshold = 0.4
  ) {
    this.enableFormatting = enableFormatting;
    this.debug = debug;
    this.similarityThreshold = similarityThreshold;
  }

  private log(message: string, ...args: unknown[]) {
    if (!this.debug) {
      return;
    }
    console.log(`[ASTTransformer] ${message}`, ...args);
  }

  private logError(message: string, error?: unknown) {
    if (!this.debug) {
      return;
    }
    console.error(`[ASTTransformer] ${message}`, error);
  }

  async deleteElement(
    payload: ASTDeletePayload,
    fileInfo: FileInfo
  ): Promise<ASTTransformResult> {
    try {
      const { sourceFile, componentName, elementIdentifier } = payload;

      const ast = jscodeshift(fileInfo.source);
      this.log(`Parsed AST for delete: ${sourceFile}`);

      const allElements = ast.findJSXElements(componentName);
      this.log(
        `Found ${allElements.length} <${componentName}> element(s) in file`
      );

      if (allElements.length === 0) {
        return {
          success: false,
          newContent: fileInfo.source,
          error: `Component "${componentName}" not found in file`,
        };
      }

      let elementToDelete: any = null;

      if (elementIdentifier) {
        const exactMatches = allElements.filter((path: any) => {
          return this.elementContainsIdentifier(path.node, elementIdentifier);
        });

        this.log(
          `Exact identifier matches: ${exactMatches.length} for "${elementIdentifier}"`
        );

        if (exactMatches.length > 0) {
          elementToDelete = exactMatches.get(0);
        } else {
          const fuzzyMatches = allElements.filter((path: any) => {
            return this.elementContainsFuzzyIdentifier(
              path.node,
              elementIdentifier
            );
          });

          this.log(
            `Fuzzy identifier matches: ${fuzzyMatches.length} for "${elementIdentifier}"`
          );

          if (fuzzyMatches.length > 0) {
            elementToDelete = fuzzyMatches.get(0);
          }
        }
      } else {
        elementToDelete = allElements.get(0);
      }

      if (!elementToDelete) {
        return {
          success: false,
          newContent: fileInfo.source,
          error: `Element "${componentName}" with identifier "${elementIdentifier}" not found`,
        };
      }

      const elementPath = elementToDelete;
      if (
        !elementPath ||
        !elementPath.parent ||
        !elementPath.parent.node.children
      ) {
        return {
          success: false,
          newContent: fileInfo.source,
          error: "Could not find parent container for element",
        };
      }

      const parentPath = elementPath.parent;
      const elementIndex = parentPath.node.children.findIndex(
        (child: any) => child === elementPath.node
      );

      if (elementIndex === -1) {
        return {
          success: false,
          newContent: fileInfo.source,
          error: "Element not found in parent container",
        };
      }

      parentPath.node.children.splice(elementIndex, 1);
      this.log(`Removed element at index ${elementIndex}`);

      let newContent = ast.toSource({ reuseWhitespace: true });

      if (this.enableFormatting) {
        try {
          newContent = await this.formatCode(newContent);
        } catch (formatError) {
          this.log("Formatting failed, continuing with unformatted content");
        }
      }

      if (!this.validateAST(newContent)) {
        this.logError("Generated code is invalid after delete");
        return {
          success: false,
          newContent: fileInfo.source,
          error: "Generated code validation failed",
        };
      }

      return {
        success: true,
        newContent,
      };
    } catch (error) {
      this.logError("Delete transformation failed", error);
      return {
        success: false,
        newContent: fileInfo.source,
        error:
          error instanceof Error
            ? error.message
            : "Unknown AST delete transformation error",
      };
    }
  }

  private validateAST(content: string): boolean {
    try {
      parse(content, {
        sourceType: "module",
        allowImportExportEverywhere: true,
        plugins: ["jsx", "typescript"],
      });
      return true;
    } catch (error) {
      this.log("AST validation failed", error);
      return false;
    }
  }

  private async formatCode(content: string): Promise<string> {
    try {
      return await prettier.format(content, {
        parser: "babel",
        singleQuote: false,
        semi: true,
        trailingComma: "es5",
      });
    } catch (error) {
      this.log("Prettier formatting failed", error);
      return content;
    }
  }

  private elementContainsIdentifier(node: any, identifier: string): boolean {
    const { text, classes } = this.parseElementIdentifier(identifier);

    const textMatches = text ? this.checkElementText(node, text, false) : true;
    const classMatches =
      classes.length > 0 ? this.elementHasAllClasses(node, classes) : true;

    if (!text && classes.length === 0) {
      return true;
    }

    return textMatches && classMatches;
  }

  private elementContainsFuzzyIdentifier(
    node: any,
    identifier: string
  ): boolean {
    const { text, classes } = this.parseElementIdentifier(identifier);

    const textMatches = text ? this.checkElementText(node, text, true) : false;
    const classMatches =
      classes.length > 0 ? this.elementHasAllClasses(node, classes) : false;

    if (!text && classes.length === 0) {
      return true;
    }

    return textMatches || classMatches;
  }

  private checkElementText(
    node: any,
    identifier: string,
    fuzzy: boolean
  ): boolean {
    const elementText = this.normalizeText(this.collectTextContent(node));
    const identifierText = this.normalizeText(identifier);

    if (!elementText || !identifierText) {
      return false;
    }

    if (fuzzy) {
      const elementWords = elementText.split(" ");
      const identifierWords = identifierText.split(" ");

      return identifierWords.some((idWord) => {
        if (idWord.length < 3) return false;
        return elementWords.some((elemWord) => {
          return (
            elemWord.includes(idWord) ||
            idWord.includes(elemWord) ||
            this.calculateTextSimilarity(elemWord, idWord) >
              this.similarityThreshold
          );
        });
      });
    }

    return elementText.includes(identifierText);
  }

  private calculateTextSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private parseElementIdentifier(identifier: string): {
    text: string;
    classes: string[];
  } {
    const trimmed = identifier.trim();
    if (!trimmed) {
      return { text: "", classes: [] };
    }

    let textPart = trimmed;
    let classPart = "";

    const spaceDotIndex = trimmed.indexOf(" .");
    if (spaceDotIndex >= 0) {
      textPart = trimmed.substring(0, spaceDotIndex).trim();
      classPart = trimmed.substring(spaceDotIndex + 1).trim();
    } else if (trimmed.startsWith(".")) {
      textPart = "";
      classPart = trimmed;
    }

    const classes = classPart
      .split(".")
      .map((cls) => cls.trim())
      .filter(Boolean);

    return { text: textPart, classes };
  }

  private elementHasAllClasses(node: any, classes: string[]): boolean {
    const elementClasses = this.extractClassNames(node);
    if (!elementClasses.length) {
      return false;
    }

    return classes.every((cls) =>
      elementClasses.some((elementCls) => {
        if (elementCls === cls) return true;
        if (elementCls.includes(cls) || cls.includes(elementCls)) return true;
        if (cls.length > 3 && elementCls.length > 3) {
          return this.calculateTextSimilarity(elementCls, cls) > 0.7;
        }
        return false;
      })
    );
  }

  private extractClassNames(node: any): string[] {
    if (!node.openingElement || !node.openingElement.attributes) {
      return [];
    }

    const classNameAttr = node.openingElement.attributes.find(
      (attr: any) => attr.name && attr.name.name === "className"
    );

    if (!classNameAttr || !classNameAttr.value) {
      return [];
    }

    const value = classNameAttr.value;

    if (value.type === "Literal" && typeof value.value === "string") {
      return value.value.split(" ").filter(Boolean);
    }

    if (value.type === "JSXExpressionContainer") {
      return this.extractFromExpression(value.expression);
    }

    return [];
  }

  private extractFromExpression(expr: any): string[] {
    const classes: string[] = [];

    switch (expr.type) {
      case "Literal":
        if (typeof expr.value === "string") {
          classes.push(...expr.value.split(" ").filter(Boolean));
        }
        break;
      case "TemplateLiteral":
        expr.quasis.forEach((quasi: any) => {
          if (quasi.value && quasi.value.raw) {
            classes.push(...quasi.value.raw.split(" ").filter(Boolean));
          }
        });
        break;
      case "ConditionalExpression":
        classes.push(...this.extractFromExpression(expr.consequent));
        classes.push(...this.extractFromExpression(expr.alternate));
        break;
      case "LogicalExpression":
        classes.push(...this.extractFromExpression(expr.left));
        classes.push(...this.extractFromExpression(expr.right));
        break;
      case "CallExpression":
        if (
          expr.callee &&
          expr.callee.type === "Identifier" &&
          ["clsx", "cn", "classNames"].includes(expr.callee.name)
        ) {
          expr.arguments.forEach((arg: any) => {
            classes.push(...this.extractFromExpression(arg));
          });
        }
        break;
      case "ArrayExpression":
        expr.elements.forEach((element: any) => {
          if (element) {
            classes.push(...this.extractFromExpression(element));
          }
        });
        break;
      case "ObjectExpression":
        expr.properties.forEach((prop: any) => {
          if (
            prop.key &&
            prop.key.type === "Literal" &&
            typeof prop.key.value === "string"
          ) {
            classes.push(...prop.key.value.split(" ").filter(Boolean));
          }
        });
        break;
      default:
        break;
    }

    return classes;
  }

  private collectTextContent(node: any): string {
    const parts: string[] = [];

    const addText = (value: unknown) => {
      if (typeof value === "string") {
        parts.push(value);
      }
    };

    const addAttributeText = (attributes: any[]) => {
      attributes.forEach((attr) => {
        if (!attr || attr.type !== "JSXAttribute" || !attr.value) {
          return;
        }

        if (attr.value.type === "StringLiteral") {
          addText(attr.value.value);
        } else if (
          attr.value.type === "JSXExpressionContainer" &&
          attr.value.expression
        ) {
          const expression = attr.value.expression;
          if (expression.type === "StringLiteral") {
            addText(expression.value);
          } else if (expression.type === "TemplateLiteral") {
            const templateText =
              expression.quasis
                ?.map((quasi: any) => quasi.value?.cooked || quasi.value?.raw)
                .join("") || "";
            addText(templateText);
          }
        }
      });
    };

    const visit = (current: any) => {
      if (!current) return;

      switch (current.type) {
        case "JSXText":
          addText(current.value);
          break;
        case "JSXElement":
          if (
            current.openingElement &&
            Array.isArray(current.openingElement.attributes)
          ) {
            addAttributeText(current.openingElement.attributes);
          }
          if (Array.isArray(current.children)) {
            current.children.forEach(visit);
          }
          break;
        case "JSXFragment":
          if (Array.isArray(current.children)) {
            current.children.forEach(visit);
          }
          break;
        case "JSXExpressionContainer":
          if (current.expression) {
            const expression = current.expression;
            if (expression.type === "StringLiteral") {
              addText(expression.value);
            } else if (expression.type === "TemplateLiteral") {
              const templateText =
                expression.quasis
                  ?.map(
                    (quasi: any) => quasi.value?.cooked || quasi.value?.raw
                  )
                  .join("") || "";
              addText(templateText);
            }
          }
          break;
        default:
          break;
      }
    };

    visit(node);

    return parts.join(" ");
  }

  private normalizeText(value: string): string {
    return value.replace(/\s+/g, " ").trim().toLowerCase();
  }
}
