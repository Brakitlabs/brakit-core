import {
  BaseUpdateService,
  ComponentUsageMatch,
  ElementMatchContext,
  ProjectComponentUsageMatch,
} from "../shared/BaseUpdateService";
import { safeReadFile } from "../shared/fileUtils";
import { DeletePayload, DeleteResult } from "../../types/delete";
import { logger } from "../../utils/logger";
import jscodeshift from "jscodeshift";

const j = jscodeshift.withParser("tsx") as typeof jscodeshift;

const DATA_VALUE_KEYS = new Set([
  "label",
  "title",
  "text",
  "name",
  "value",
  "heading",
  "content",
  "id",
  "body",
  "description",
]);

interface UsageCandidate {
  usage: ComponentUsageMatch | ProjectComponentUsageMatch;
  usageFilePath: string;
  componentFilePathOverride?: string;
  className?: string;
  textContent?: string;
  elementTag?: string;
}

type DeleteMatchKind = "local" | "component" | "usage" | "data";

export class VisualDeleteService extends BaseUpdateService {
  constructor(projectRoot: string) {
    super(projectRoot);
  }

  async deleteElement(payload: DeletePayload): Promise<DeleteResult> {
    const {
      sourceFile,
      componentName,
      elementIdentifier,
      elementTag,
      className,
      textContent,
      ownerComponentName,
      ownerFilePath,
    } = payload;

    try {
      const lookupText =
        textContent && textContent.length > 0
          ? textContent
          : elementIdentifier;

      const pageFilePath = this.resolveFilePath(sourceFile);
      if (!pageFilePath) {
        return {
          success: false,
          error: `Source file "${sourceFile}" not found`,
        };
      }

      const targetTag = elementTag ?? componentName;
      const resolvedOwnerPath = this.resolveFileFromOwnerHints({
        requestedSourcePath: pageFilePath,
        ownerComponentName,
        ownerFilePath,
      });

      const attemptedPaths = new Set<string>();

      if (resolvedOwnerPath) {
        attemptedPaths.add(resolvedOwnerPath);
      }

      if (
        resolvedOwnerPath &&
        resolvedOwnerPath !== pageFilePath
      ) {
        const ownerResult = await this.tryDirectDeleteInFile({
          filePath: resolvedOwnerPath,
          tag: targetTag,
          elementIdentifier,
          className,
          textContent,
          elementTag,
          logLabel: "owner",
          matchKind: "component",
          matchLabel: ownerComponentName ?? componentName,
        });

        if (ownerResult) {
          return ownerResult;
        }
      }

      const resolvedByContent = await this.resolveFileUsingMetadata({
        lookupText,
        tag: targetTag,
        file: sourceFile,
        serviceName: "Delete",
        ownerComponentName,
        ownerFilePath,
      });

      if (
        resolvedByContent &&
        resolvedByContent !== pageFilePath &&
        !attemptedPaths.has(resolvedByContent)
      ) {
        const directContentResult = await this.tryDirectDeleteInFile({
          filePath: resolvedByContent,
          tag: targetTag,
          elementIdentifier,
          className,
          textContent,
          elementTag,
          logLabel: "content",
          matchKind: "component",
          matchLabel: ownerComponentName ?? componentName,
        });

        if (directContentResult) {
          return directContentResult;
        }
        attemptedPaths.add(resolvedByContent);
      }

      const originalSource = await safeReadFile(pageFilePath);
      if (!originalSource) {
        return {
          success: false,
          error: `Could not read source file: ${pageFilePath}`,
        };
      }

      logger.info(
        `[VisualDelete] Starting delete operation: ${sourceFile}, ${componentName}, ${elementIdentifier}`
      );

      const { ast, possibleNames } = this.parseAndFindElements(
        originalSource,
        componentName
      );

      const matcherHints = {
        identifier: elementIdentifier,
        textContent,
        className,
        elementTag,
      };

      const localMatch = this.findLocalElementMatch({
        filePath: pageFilePath,
        ast,
        possibleNames,
        matcher: this.createElementMatcher({
          identifier: matcherHints.identifier,
          textContent: matcherHints.textContent,
          className: matcherHints.className,
          elementTag: matcherHints.elementTag,
        }),
        className: className ?? "",
        text: textContent ?? elementIdentifier,
        serviceName: "Delete",
      });

      if (localMatch) {
        const removed = await this.applyRemoval({
          target: localMatch,
          filePath: pageFilePath,
          originalSource,
          logLabel: "local",
        });

        if (removed) {
          return this.buildSuccessResult("local", componentName, pageFilePath);
        }
      }

      const usageResolution = this.resolveComponentUsage(
        textContent ?? elementIdentifier,
        ast,
        pageFilePath
      );

      const usageCandidates: UsageCandidate[] = [];

      if (usageResolution.localUsage) {
        usageCandidates.push({
          usage: usageResolution.localUsage,
          usageFilePath: pageFilePath,
          className,
          textContent,
          elementTag,
        });
      }

      if (usageResolution.externalUsage) {
        usageCandidates.push({
          usage: usageResolution.externalUsage,
          usageFilePath: usageResolution.externalUsage.filePath,
          className,
          textContent,
          elementTag,
        });
      }

      if (ownerComponentName && resolvedOwnerPath) {
        usageCandidates.push({
          usage: {
            componentName: ownerComponentName,
            hasInlineClassName: true,
            propNames: [],
          },
          usageFilePath: pageFilePath,
          componentFilePathOverride: resolvedOwnerPath,
          className,
          textContent,
          elementTag,
        });
      }

      for (const candidate of usageCandidates) {
        const componentResult = await this.tryDeleteInComponent({
          usageCandidate: candidate,
          tag: componentName,
          elementIdentifier,
          className: candidate.className ?? className,
          textContent: candidate.textContent ?? textContent,
          elementTag: candidate.elementTag ?? elementTag,
        });

        if (componentResult) {
          return componentResult;
        }
      }

      for (const candidate of usageCandidates) {
        const usageResult = await this.removeComponentUsage({
          usageCandidate: candidate,
          elementIdentifier,
          className: candidate.className ?? className,
          textContent: candidate.textContent ?? textContent,
          elementTag: candidate.elementTag ?? elementTag,
          ownerComponentName,
        });

        if (usageResult) {
          return usageResult;
        }
      }

      const dataRemoved = await this.tryRemoveFromDataCollections({
        ast,
        filePath: pageFilePath,
        originalSource,
        elementIdentifier,
        textContent,
      });

      if (dataRemoved) {
        return this.buildSuccessResult("data", componentName, pageFilePath);
      }

      logger.warn(
        `[VisualDelete] Unable to locate "${elementIdentifier}" for deletion`
      );
      return {
        success: false,
        error: `Element "${elementIdentifier}" not found or could not be deleted`,
      };
    } catch (error) {
      logger.error(`[VisualDelete] Delete operation failed: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown delete error",
      };
    }
  }

  private buildSuccessResult(
    matchKind: DeleteMatchKind,
    componentName: string,
    filePath: string
  ): DeleteResult {
    logger.info(
      `[VisualDelete] Delete operation completed successfully via ${matchKind}`
    );

    return {
      success: true,
      message: `Element "${componentName}" deleted successfully`,
      matchKind,
      updatedFile: filePath,
    };
  }

  private async applyRemoval(options: {
    target: ElementMatchContext;
    filePath: string;
    originalSource: string;
    logLabel: string;
  }): Promise<boolean> {
    const { target, filePath, originalSource, logLabel } = options;

    try {
      const removed = this.removeNodeFromAst(target);
      if (!removed) {
        return false;
      }

      const updated = await this.writeFormattedSource(
        filePath,
        target.ast,
        originalSource
      );

      if (!updated) {
        return false;
      }

      logger.info({
        message: `[VisualDelete] Removed element via ${logLabel} path`,
        context: { filePath },
      });
      return true;
    } catch (error) {
      logger.warn({
        message: `[VisualDelete] Failed to prune element via ${logLabel}`,
        context: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
      return false;
    }
  }

  private async tryDirectDeleteInFile(options: {
    filePath: string;
    tag: string;
    elementIdentifier: string;
    className?: string;
    textContent?: string;
    elementTag?: string;
    logLabel: string;
    matchKind: DeleteMatchKind;
    matchLabel: string;
  }): Promise<DeleteResult | null> {
    const {
      filePath,
      tag,
      elementIdentifier,
      className,
      textContent,
      elementTag,
      logLabel,
      matchKind,
      matchLabel,
    } = options;

    const source = await safeReadFile(filePath);
    if (!source) {
      return null;
    }

    const { ast, possibleNames } = this.parseAndFindElements(source, tag);
    const matcher = this.createElementMatcher({
      identifier: elementIdentifier,
      textContent,
      className,
      elementTag,
    });

    const directMatch = this.findLocalElementMatch({
      filePath,
      ast,
      possibleNames,
      matcher,
      className: className ?? "",
      text: textContent ?? elementIdentifier,
      serviceName: `Delete:${logLabel}`,
    });

    if (!directMatch) {
      return null;
    }

    const removed = await this.applyRemoval({
      target: directMatch,
      filePath,
      originalSource: source,
      logLabel,
    });

    if (!removed) {
      return null;
    }

    return this.buildSuccessResult(matchKind, matchLabel, filePath);
  }

  private async tryDeleteInComponent(options: {
    usageCandidate: UsageCandidate;
    tag: string;
    elementIdentifier: string;
    className?: string;
    textContent?: string;
    elementTag?: string;
  }): Promise<DeleteResult | null> {
    const { usageCandidate, tag, elementIdentifier, className, textContent, elementTag } = options;

    const componentContext = this.loadComponentAst({
      usageFilePath: usageCandidate.usageFilePath,
      componentName: usageCandidate.usage.componentName,
      tag,
      componentFileOverride: usageCandidate.componentFilePathOverride,
    });

    if (!componentContext) {
      return null;
    }

    const matcher = (node: any, children: any[]) => {
      const deleteMatcher = this.createElementMatcher({
        identifier: elementIdentifier,
        textContent,
        className,
        elementTag,
        componentNameHint: usageCandidate.usage.componentName,
      });
      if (deleteMatcher(node, children)) {
        return true;
      }

      const propSet = new Set(
        usageCandidate.usage.propNames.filter(Boolean)
      );
      if (propSet.size === 0) {
        return false;
      }

      const attributes: any[] = node.openingElement?.attributes || [];
      for (const attr of attributes) {
        if (
          attr?.value?.type === "JSXExpressionContainer" &&
          this.expressionReferencesProps(attr.value.expression, propSet)
        ) {
          return true;
        }
      }

      for (const child of children) {
        if (
          child?.type === "JSXExpressionContainer" &&
          this.expressionReferencesProps(child.expression, propSet)
        ) {
          return true;
        }
      }

      return false;
    };

    const componentMatch = this.findLocalElementMatch({
      filePath: componentContext.componentFilePath,
      ast: componentContext.ast,
      possibleNames: componentContext.possibleNames,
      matcher,
      className: "",
      text: elementIdentifier,
      serviceName: "Delete:Component",
    });

    if (!componentMatch) {
      return null;
    }

    const removed = await this.applyRemoval({
      target: componentMatch,
      filePath: componentContext.componentFilePath,
      originalSource: componentContext.source,
      logLabel: "component",
    });

    if (!removed) {
      return null;
    }

    return this.buildSuccessResult(
      "component",
      usageCandidate.usage.componentName,
      componentContext.componentFilePath
    );
  }

  private async removeComponentUsage(options: {
    usageCandidate: UsageCandidate;
    elementIdentifier: string;
    className?: string;
    textContent?: string;
    elementTag?: string;
    ownerComponentName?: string;
  }): Promise<DeleteResult | null> {
    const {
      usageCandidate,
      elementIdentifier,
      className,
      textContent,
      elementTag,
      ownerComponentName,
    } = options;
    const usageSource = await safeReadFile(usageCandidate.usageFilePath);

    if (!usageSource) {
      return null;
    }

    const { ast, possibleNames } = this.parseAndFindElements(
      usageSource,
      usageCandidate.usage.componentName
    );

    const usageMatch = this.findLocalElementMatch({
      filePath: usageCandidate.usageFilePath,
      ast,
      possibleNames,
      matcher: this.createElementMatcher({
        identifier: elementIdentifier,
        textContent,
        className,
        elementTag,
        componentNameHint: ownerComponentName ?? usageCandidate.usage.componentName,
      }),
      className: className ?? "",
      text: textContent ?? elementIdentifier,
      serviceName: "Delete:Usage",
    });

    if (!usageMatch) {
      return null;
    }

    const removed = await this.applyRemoval({
      target: usageMatch,
      filePath: usageCandidate.usageFilePath,
      originalSource: usageSource,
      logLabel: "usage",
    });

    if (!removed) {
      return null;
    }

    return this.buildSuccessResult(
      "usage",
      usageCandidate.usage.componentName,
      usageCandidate.usageFilePath
    );
  }

  private async tryRemoveFromDataCollections(options: {
    ast: any;
    filePath: string;
    originalSource: string;
    elementIdentifier: string;
    textContent?: string;
  }): Promise<boolean> {
    const { ast, filePath, originalSource, elementIdentifier, textContent } =
      options;

    const targets = new Set<string>();
    const primary = this.normalizeText(elementIdentifier);
    if (primary) {
      targets.add(primary);
    }

    if (textContent) {
      const normalized = this.normalizeText(textContent);
      if (normalized) {
        targets.add(normalized);
      }
    }

    if (targets.size === 0) {
      return false;
    }

    let modified = false;

    const matchesLiteral = (value: string | null | undefined): boolean => {
      if (!value) {
        return false;
      }
      const normalized = this.normalizeText(value);
      return normalized.length > 0 && targets.has(normalized);
    };

    const extractLiteralText = (node: any): string | null => {
      if (!node) {
        return null;
      }

      if (node.type === "StringLiteral") {
        return node.value ?? null;
      }

      if (node.type === "Literal") {
        return typeof node.value === "string" ? node.value : null;
      }

      if (node.type === "TemplateLiteral") {
        if (node.expressions && node.expressions.length > 0) {
          return null;
        }
        const combined =
          node.quasis?.map((q: any) => q.value?.cooked ?? "").join("") ?? "";
        return combined || null;
      }

      return null;
    };

    const nodeMatchesTarget = (element: any): boolean => {
      if (!element) {
        return false;
      }

      if (
        element.type === "StringLiteral" ||
        element.type === "Literal" ||
        element.type === "TemplateLiteral"
      ) {
        const text = extractLiteralText(element);
        return matchesLiteral(text);
      }

      if (element.type === "JSXText") {
        return matchesLiteral(element.value);
      }

      if (element.type === "ObjectExpression") {
        for (const prop of element.properties || []) {
          if (!prop || prop.type !== "Property") {
            continue;
          }

          let propName: string | null = null;
          if (prop.key.type === "Identifier") {
            propName = prop.key.name;
          } else if (prop.key.type === "StringLiteral") {
            propName = prop.key.value;
          }

          if (!propName) {
            continue;
          }

          if (!DATA_VALUE_KEYS.has(propName)) {
            continue;
          }

          const valueText = extractLiteralText(prop.value);
          if (matchesLiteral(valueText)) {
            return true;
          }
        }
      }

      return false;
    };

    ast.find(j.ArrayExpression).forEach((path: any) => {
      const arrayNode = path.node;
      const elements = arrayNode.elements || [];
      const filtered: any[] = [];
      let removedHere = false;

      for (const element of elements) {
        if (nodeMatchesTarget(element)) {
          removedHere = true;
          continue;
        }
        filtered.push(element);
      }

      if (removedHere) {
        arrayNode.elements = filtered;
        modified = true;
      }
    });

    if (!modified) {
      return false;
    }

    await this.writeFormattedSource(filePath, ast, originalSource);

    logger.info({
      message: "[VisualDelete] Removed element via data collection pruning",
      context: {
        filePath,
        elementIdentifier,
      },
    });

    return true;
  }

}
