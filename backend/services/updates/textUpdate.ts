import fs from "fs";
import jscodeshift from "jscodeshift";
import { BaseUpdateService, ElementMatchContext } from "../shared/BaseUpdateService";
import { BaseUpdateResult } from "../shared/types";
import { logger } from "../../utils/logger";

export interface TextUpdatePayload {
  oldText: string;
  newText: string;
  tag: string;
  file: string;
  forceGlobal?: boolean;
  className: string;
  elementTag?: string;
  textContent?: string;
  ownerComponentName?: string;
  ownerFilePath?: string;
}

export type TextUpdateResult = BaseUpdateResult;

export class TextUpdateService extends BaseUpdateService {
  async updateText(payload: TextUpdatePayload): Promise<TextUpdateResult> {
    const { oldText, newText, tag, file, forceGlobal, className } = payload;

    try {
      const normalizedOldText = this.normalizeText(oldText);

      const lookupText =
        payload.textContent && payload.textContent.length > 0
          ? payload.textContent
          : oldText;

      const filePath = await this.resolveFileUsingMetadata({
        lookupText,
        tag,
        file,
        serviceName: "TextUpdate",
        ownerComponentName: payload.ownerComponentName,
        ownerFilePath: payload.ownerFilePath,
      });

      if (!filePath) {
        return {
          success: false,
          error: `Text "${lookupText}" not found in <${tag}> elements`,
        };
      }

      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: `File not found: ${filePath}`,
        };
      }

      const source = fs.readFileSync(filePath, "utf8");
      const { ast, possibleNames } = this.parseAndFindElements(source, tag);

      let found = false;
      let warningResult: BaseUpdateResult | null = null;
      let currentFileModified = false;

      const localMatch = this.findLocalElementMatch({
        filePath,
        ast,
        possibleNames,
        matcher: this.createTextOrClassNameMatcher(lookupText, className),
        className,
        text: lookupText,
        serviceName: "TextUpdate",
      });

      if (localMatch) {
        const riskWarning = this.checkSmartEditRisk({
          sourceFilePath: filePath,
          elementName: localMatch.elementName,
          hasInlineClassName: localMatch.hasInlineClassName,
          usagePropNames: localMatch.usagePropNames,
          forceGlobal,
        });

        if (riskWarning && !localMatch.hasInlineClassName) {
          warningResult = riskWarning;
          found = true;
        } else {
          const children = localMatch.matchedNode.children || [];
          for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.type === "JSXText" && child.value) {
              const normalizedChild = this.normalizeText(child.value);
              if (
                normalizedOldText.length > 0 &&
                normalizedChild === normalizedOldText
              ) {
                const leadingWhitespace = child.value.match(/^\s*/)?.[0] || "";
                const trailingWhitespace = child.value.match(/\s*$/)?.[0] || "";
                child.value = leadingWhitespace + newText + trailingWhitespace;

                found = true;
                currentFileModified = true;
                break;
              }
            }
          }
        }
      }

      if (!found && !warningResult && localMatch) {
        const usageUpdate = await this.updateTextThroughUsage({
          lookupText,
          newText,
          filePath,
          ast,
          localMatch,
          ownerComponentName: payload.ownerComponentName,
          ownerFilePath: payload.ownerFilePath,
        });

        if (usageUpdate.updated) {
          found = true;
          if (usageUpdate.currentFileUpdated) {
            currentFileModified = true;
          }
        }
      }

      if (warningResult) {
        return warningResult;
      }

      if (!found) {
        return {
          success: false,
          error: `Text "${lookupText}" not found in <${tag}> elements`,
        };
      }

      if (currentFileModified) {
        await this.writeFormattedSource(filePath, ast, source);
      }

      return {
        success: true,
        message: `Updated text in <${tag}>`,
      };
    } catch (error) {
      logger.error({
        message: `[TextUpdate] Error`,
        context: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async updateTextThroughUsage(options: {
    lookupText: string;
    newText: string;
    filePath: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ast: any;
    localMatch: ElementMatchContext;
    ownerComponentName?: string;
    ownerFilePath?: string;
  }): Promise<{
    updated: boolean;
    currentFileUpdated: boolean;
  }> {
    const {
      lookupText,
      newText,
      filePath,
      ast,
      localMatch,
      ownerComponentName,
      ownerFilePath,
    } = options;

    const usageResolution = this.resolveComponentUsage(
      lookupText,
      ast,
      filePath
    );

    const candidates: Array<{
      componentName: string;
      usageFilePath: string;
      propNames: string[];
    }> = [];
    const seen = new Set<string>();

    const addCandidate = (
      componentName: string | undefined,
      usageFilePath: string,
      propNames: string[]
    ) => {
      if (!componentName) {
        return;
      }
      const key = `${usageFilePath}::${componentName}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      candidates.push({
        componentName,
        usageFilePath,
        propNames,
      });
    };

    if (usageResolution.localUsage) {
      addCandidate(
        usageResolution.localUsage.componentName,
        filePath,
        usageResolution.localUsage.propNames
      );
    }

    if (usageResolution.externalUsage) {
      addCandidate(
        usageResolution.externalUsage.componentName,
        usageResolution.externalUsage.filePath,
        usageResolution.externalUsage.propNames
      );
    }

    if (ownerComponentName && ownerFilePath) {
      addCandidate(
        ownerComponentName,
        ownerFilePath,
        localMatch.usagePropNames ?? []
      );
    }

    if (candidates.length === 0) {
      return { updated: false, currentFileUpdated: false };
    }

    let updated = false;
    let currentFileUpdated = false;

    const fallbackPropNames =
      localMatch.usagePropNames && localMatch.usagePropNames.length > 0
        ? localMatch.usagePropNames
        : [];

    for (const candidate of candidates) {
      const propNames =
        candidate.propNames && candidate.propNames.length > 0
          ? candidate.propNames
          : fallbackPropNames;

      if (candidate.usageFilePath === filePath) {
        const changed = this.updateComponentUsageInAst(ast, {
          componentName: candidate.componentName,
          propNames,
          lookupText,
          newText,
        });
        if (changed) {
          updated = true;
          currentFileUpdated = true;
        }
      } else {
        const changed = await this.updateComponentUsageInExternalFile({
          usageFilePath: candidate.usageFilePath,
          componentName: candidate.componentName,
          propNames,
          lookupText,
          newText,
        });
        if (changed) {
          updated = true;
        }
      }
    }

    return { updated, currentFileUpdated };
  }

  private updateComponentUsageInAst(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    root: any,
    options: {
      componentName: string;
      propNames: string[];
      lookupText: string;
      newText: string;
    }
  ): boolean {
    const { componentName, propNames, lookupText, newText } = options;
    if (!componentName || !lookupText) {
      return false;
    }

    const normalizedLookup = this.normalizeText(lookupText);
    if (!normalizedLookup) {
      return false;
    }

    const propSet =
      propNames && propNames.length > 0
        ? new Set(propNames.map((name) => name.trim()).filter(Boolean))
        : null;

    const j = jscodeshift.withParser("tsx") as typeof jscodeshift;
    let updated = false;

    root
      .find(j.JSXElement)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .forEach((path: any) => {
        const opening = path.node.openingElement;
        if (!opening) {
          return;
        }

        const elementName = this.getJsxElementName(opening.name);
        if (elementName !== componentName) {
          return;
        }

        const attributes = opening.attributes || [];

        for (const attr of attributes) {
          if (attr?.type !== "JSXAttribute" || !attr.name?.name) {
            continue;
          }

          if (propSet && !propSet.has(attr.name.name)) {
            continue;
          }

          const literalValue = this.extractStringValue(attr.value);
          if (!literalValue) {
            continue;
          }

          if (this.normalizeText(literalValue) === normalizedLookup) {
            if (this.setJsxAttributeStringValue(attr, newText)) {
              updated = true;
            }
          }
        }

        const shouldCheckChildren =
          !propSet || propSet.has("children") || propSet.size === 0;

        if (!shouldCheckChildren) {
          return;
        }

        const children = path.node.children || [];
        for (const child of children) {
          if (child.type === "JSXText" && child.value) {
            const normalizedChild = this.normalizeText(child.value);
            if (normalizedChild === normalizedLookup) {
              const leadingWhitespace = child.value.match(/^\s*/)?.[0] || "";
              const trailingWhitespace =
                child.value.match(/\s*$/)?.[0] || "";
              child.value =
                leadingWhitespace + newText + trailingWhitespace;
              updated = true;
            }
          }
        }
      });

    return updated;
  }

  private async updateComponentUsageInExternalFile(options: {
    usageFilePath: string;
    componentName: string;
    propNames: string[];
    lookupText: string;
    newText: string;
  }): Promise<boolean> {
    const { usageFilePath, componentName, propNames, lookupText, newText } =
      options;

    if (!fs.existsSync(usageFilePath)) {
      return false;
    }

    const source = fs.readFileSync(usageFilePath, "utf8");
    const j = jscodeshift.withParser("tsx") as typeof jscodeshift;
    const root = j(source);

    const updated = this.updateComponentUsageInAst(root, {
      componentName,
      propNames,
      lookupText,
      newText,
    });

    if (!updated) {
      return false;
    }

    await this.writeFormattedSource(usageFilePath, root, source);
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private setJsxAttributeStringValue(attr: any, newValue: string): boolean {
    const j = jscodeshift.withParser("tsx") as typeof jscodeshift;

    if (!attr.value) {
      attr.value = j.stringLiteral(newValue);
      return true;
    }

    if (attr.value.type === "StringLiteral") {
      if (attr.value.value === newValue) {
        return false;
      }
      attr.value.value = newValue;
      return true;
    }

    if (attr.value.type === "Literal") {
      if (typeof attr.value.value === "string") {
        if (attr.value.value === newValue) {
          return false;
        }
        attr.value.value = newValue;
        return true;
      }
      return false;
    }

    if (attr.value.type === "JSXExpressionContainer") {
      const expression = attr.value.expression;
      if (!expression) {
        return false;
      }

      if (expression.type === "StringLiteral") {
        if (expression.value === newValue) {
          return false;
        }
        expression.value = newValue;
        return true;
      }

      if (expression.type === "Literal") {
        if (typeof expression.value === "string") {
          if (expression.value === newValue) {
            return false;
          }
          expression.value = newValue;
          return true;
        }
        return false;
      }

      if (expression.type === "TemplateLiteral") {
        if ((expression.expressions?.length ?? 0) > 0) {
          return false;
        }

        expression.quasis = [
          j.templateElement({ cooked: newValue, raw: newValue }, true),
        ];
        expression.expressions = [];
        return true;
      }
    }

    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getJsxElementName(nameNode: any): string | null {
    if (!nameNode) {
      return null;
    }

    if (nameNode.type === "JSXIdentifier") {
      return nameNode.name ?? null;
    }

    if (nameNode.type === "JSXMemberExpression") {
      return this.getJsxElementName(nameNode.property);
    }

    return null;
  }

}
