import fs from "fs";
import {
  BaseUpdateService,
  ComponentUsageMatch,
  ProjectComponentUsageMatch,
} from "../shared/BaseUpdateService";
import { BaseUpdateResult } from "../shared/types";
import { logger } from "../../utils/logger";

export interface ColorUpdatePayload {
  textColor?: { old: string; new: string };
  backgroundColor?: { old: string; new: string };
  hoverBackgroundColor?: { old: string; new: string };
  text: string;
  tag: string;
  file: string;
  forceGlobal?: boolean;
  className: string;
  elementTag?: string;
  textContent?: string;
  ownerComponentName?: string;
  ownerFilePath?: string;
}

export type ColorUpdateResult = BaseUpdateResult;

export class ColorUpdateService extends BaseUpdateService {
  private updateClassValue(
    existing: string,
    textColor?: { old: string; new: string },
    backgroundColor?: { old: string; new: string },
    hoverBackgroundColor?: { old: string; new: string }
  ): { classValue: string; changed: boolean } {
    let tokens = existing.split(/\s+/).filter(Boolean);
    let changed = false;

    const replaceTokens = (
      matcher: (token: string) => boolean,
      newValue?: string
    ) => {
      if (!newValue) {
        return;
      }

      let encountered = false;
      const nextTokens: string[] = [];
      for (const token of tokens) {
        if (matcher(token)) {
          if (!encountered) {
            if (token !== newValue) {
              changed = true;
            }
            nextTokens.push(newValue);
            encountered = true;
          } else {
            changed = true; // remove duplicate tokens
          }
        } else {
          nextTokens.push(token);
        }
      }

      if (!encountered) {
        nextTokens.push(newValue);
        changed = true;
      }

      tokens = nextTokens;
    };

    const isTextToken = (token: string) =>
      token.startsWith("text-") && !token.includes("/") && token !== "text-transparent";
    const isBackgroundToken = (token: string) =>
      token.startsWith("bg-") && !token.startsWith("bg-gradient");
    const isHoverBgToken = (token: string) => token.startsWith("hover:bg-");

    replaceTokens(isTextToken, textColor?.new);
    replaceTokens(isBackgroundToken, backgroundColor?.new);
    replaceTokens(isHoverBgToken, hoverBackgroundColor?.new);

    return { classValue: tokens.join(" "), changed };
  }

  private classValueContainsTargets(
    classValue: string,
    textColor?: { old: string; new: string },
    backgroundColor?: { old: string; new: string },
    hoverBackgroundColor?: { old: string; new: string }
  ): boolean {
    const tokens = new Set(classValue.split(/\s+/).filter(Boolean));

    if (textColor && !tokens.has(textColor.new)) {
      return false;
    }

    if (backgroundColor && !tokens.has(backgroundColor.new)) {
      return false;
    }

    if (hoverBackgroundColor && !tokens.has(hoverBackgroundColor.new)) {
      return false;
    }

    return true;
  }

  private async applyGlobalColorUpdate(options: {
    usageFilePath: string;
    match: ComponentUsageMatch | ProjectComponentUsageMatch;
    tag: string;
    textColor?: { old: string; new: string };
    backgroundColor?: { old: string; new: string };
    hoverBackgroundColor?: { old: string; new: string };
    className: string;
    text: string;
  }): Promise<BaseUpdateResult | null> {
    const {
      usageFilePath,
      match,
      tag,
      textColor,
      backgroundColor,
      hoverBackgroundColor,
      className,
      text,
    } = options;

    const componentContext = this.loadComponentAst({
      usageFilePath,
      componentName: match.componentName,
      tag,
    });

    if (!componentContext) {
      logger.warn({
        message: `[ColorUpdate] Unable to resolve component file for <${match.componentName}>`,
        context: { usageFilePath },
      });
      return null;
    }

    logger.info({
      message: `[ColorUpdate] Applying global update to <${match.componentName}>`,
      context: {
        usageFilePath,
        componentFilePath: componentContext.componentFilePath,
        textColor: textColor?.new,
        backgroundColor: backgroundColor?.new,
        hoverBackgroundColor: hoverBackgroundColor?.new,
      },
    });

    const { ast, possibleNames } = componentContext;
    const propSet = new Set(match.propNames.filter(Boolean));

    let updated = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matcher = (node: any, children: any[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const attributes: any[] = node.openingElement?.attributes || [];
      let referencesProps = false;

      // Check children for prop references
      for (const child of children) {
        if (child?.type === "JSXExpressionContainer") {
          if (this.expressionReferencesProps(child.expression, propSet)) {
            referencesProps = true;
            break;
          }
        }
      }

      // Check attributes for prop references
      if (!referencesProps) {
        for (const attr of attributes) {
          if (attr?.value?.type === "JSXExpressionContainer") {
            if (
              this.expressionReferencesProps(attr.value.expression, propSet)
            ) {
              referencesProps = true;
              break;
            }
          }
        }
      }

      return referencesProps;
    };

    const elementMatch = this.findLocalElementMatch({
      filePath: componentContext.componentFilePath,
      ast,
      possibleNames,
      matcher,
      className,
      text,
      serviceName: "ColorUpdate:Global",
    });

    if (elementMatch) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const attributes: any[] =
        elementMatch.matchedNode.openingElement?.attributes || [];
      const classAttr = attributes.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (attr: any) => attr?.name?.name === "className"
      );

      if (!classAttr) {
        return null;
      }

      if (!classAttr.value || typeof classAttr.value.value !== "string") {
        return null;
      }

      const { classValue, changed } = this.updateClassValue(
        classAttr.value.value || "",
        textColor,
        backgroundColor,
        hoverBackgroundColor
      );

      const containsTargets = this.classValueContainsTargets(
        classValue,
        textColor,
        backgroundColor,
        hoverBackgroundColor
      );

      if (!changed && !containsTargets) {
        return null;
      }

      classAttr.value.value = classValue.trim();
      updated = true;
    }

    if (!updated) {
      return null;
    }

    await this.writeFormattedSource(
      componentContext.componentFilePath,
      ast,
      componentContext.source
    );

    logger.info({
      message: `[ColorUpdate] Applied global color update to <${match.componentName}>`,
      context: { componentFilePath: componentContext.componentFilePath },
    });

    return {
      success: true,
      message: `Updated colors in <${match.componentName}>`,
    };
  }

  async updateColor(payload: ColorUpdatePayload): Promise<ColorUpdateResult> {
    const {
      textColor,
      backgroundColor,
      hoverBackgroundColor,
      text,
      tag,
      file,
      forceGlobal,
      className,
      textContent,
      ownerComponentName,
      ownerFilePath,
    } = payload;

    const lookupText = textContent && textContent.length > 0 ? textContent : text;

    try {
      const filePath = await this.resolveFileUsingMetadata({
        lookupText,
        tag,
        file,
        serviceName: "ColorUpdate",
        ownerComponentName,
        ownerFilePath,
      });

      if (!filePath) {
        return {
          success: false,
          error: `Text "${text}" not found in <${tag}> elements`,
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

      const localMatch = this.findLocalElementMatch({
        filePath,
        ast,
        possibleNames,
        matcher: this.createTextOrClassNameMatcher(lookupText, className),
        className,
        text: lookupText,
        serviceName: "ColorUpdate",
      });

      if (localMatch) {
        const classAttr = localMatch.matchedNode.openingElement.attributes?.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (attr: any) => attr.name?.name === "className"
        );

        const riskWarning = this.checkSmartEditRisk({
          sourceFilePath: filePath,
          elementName: localMatch.elementName,
          hasInlineClassName: localMatch.hasInlineClassName,
          usagePropNames: localMatch.usagePropNames,
          forceGlobal,
        });

        if (riskWarning) {
          warningResult = riskWarning;
          found = true;
        } else if (classAttr && classAttr.value) {
          const { classValue } = this.updateClassValue(
            classAttr.value.value || "",
            textColor,
            backgroundColor,
            hoverBackgroundColor
          );

          classAttr.value.value = classValue;
          found = true;
        } else if (!classAttr) {
          warningResult = {
            success: false,
            error: `Cannot update colors on <${localMatch.elementName || tag}> because it does not expose a className to override.`,
          };
          found = true;
        }
      }

      if (warningResult) {
        return warningResult;
      }

      if (!found) {
        const usageResolution = this.resolveComponentUsage(lookupText, ast, filePath);
        const componentMatch = usageResolution.localUsage ?? null;
        const externalComponentMatch = usageResolution.externalUsage ?? null;

        if (componentMatch) {
          const warning = this.checkSmartEditRisk({
            sourceFilePath: filePath,
            elementName: componentMatch.componentName,
            hasInlineClassName: componentMatch.hasInlineClassName,
            usagePropNames: componentMatch.propNames,
            forceGlobal,
          });

          if (warning) {
            return warning;
          }

          if (forceGlobal) {
            logger.info({
              message: `[ColorUpdate] Applying forceGlobal override`,
              context: {
                component: componentMatch.componentName,
                usageFilePath: filePath,
              },
            });
            const globalResult = await this.applyGlobalColorUpdate({
              usageFilePath: filePath,
              match: componentMatch,
              tag,
              textColor,
              backgroundColor,
              hoverBackgroundColor,
              className,
              text: lookupText,
            });

            if (globalResult) {
              return globalResult;
            }

            logger.warn({
              message: `[ColorUpdate] Force global override produced no changes`,
              context: { component: componentMatch.componentName },
            });
          }
        } else if (externalComponentMatch) {
          const warning = this.checkSmartEditRisk({
            sourceFilePath: externalComponentMatch.filePath,
            elementName: externalComponentMatch.componentName,
            hasInlineClassName: externalComponentMatch.hasInlineClassName,
            usagePropNames: externalComponentMatch.propNames,
            forceGlobal,
          });

          if (warning) {
            return warning;
          }

          if (forceGlobal) {
            logger.info({
              message: `[ColorUpdate] Applying forceGlobal override`,
              context: {
                component: externalComponentMatch.componentName,
                usageFilePath: externalComponentMatch.filePath,
              },
            });
            const globalResult = await this.applyGlobalColorUpdate({
              usageFilePath: externalComponentMatch.filePath,
              match: externalComponentMatch,
              tag,
              textColor,
              backgroundColor,
              hoverBackgroundColor,
              className,
              text: lookupText,
            });

            if (globalResult) {
              return globalResult;
            }

            logger.warn({
              message: `[ColorUpdate] Force global override produced no changes`,
              context: { component: externalComponentMatch.componentName },
            });
          }
        }

        if (forceGlobal && (componentMatch || externalComponentMatch)) {
          const componentName =
            externalComponentMatch?.componentName ||
            componentMatch?.componentName ||
            "component";

          return {
            success: false,
            error: `Unable to apply color update automatically for shared component <${componentName}>. Please edit the component manually.`,
          };
        }

        return {
          success: false,
          error: `Text "${text}" not found in <${tag}> elements`,
        };
      }

      await this.writeFormattedSource(filePath, ast, source);

      return {
        success: true,
        message: `Updated colors in <${tag}>`,
      };
    } catch (error) {
      logger.error({
        message: `[ColorUpdate] Error`,
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
}
