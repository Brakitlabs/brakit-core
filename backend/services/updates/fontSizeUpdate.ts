import fs from "fs";
import jscodeshift from "jscodeshift";
import { BaseUpdateService } from "../shared/BaseUpdateService";
import { BaseUpdateResult } from "../shared/types";
import { logger } from "../../utils/logger";

export interface FontSizeUpdatePayload {
  oldSize: string;
  newSize: string;
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

export type FontSizeUpdateResult = BaseUpdateResult;

export class FontSizeUpdateService extends BaseUpdateService {
  private createFontSizeRegex(flags: string = ""): RegExp {
    return new RegExp(
      "\\btext-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\\b",
      flags
    );
  }

  private ensureStringHasFontSize(
    value: string,
    newSize: string
  ): { value: string; updated: boolean; hadSizeToken: boolean } {
    const replaceRegex = this.createFontSizeRegex("g");
    const testRegex = this.createFontSizeRegex();

    let hadSizeToken = false;
    let changed = false;

    const replaced = value.replace(replaceRegex, (match: string) => {
      hadSizeToken = true;
      if (match === newSize) {
        return match;
      }
      changed = true;
      return newSize;
    });

    if (hadSizeToken) {
      return { value: replaced, updated: changed || replaced !== value, hadSizeToken };
    }

    if (testRegex.test(value) || value.split(/\s+/).includes(newSize)) {
      return { value, updated: false, hadSizeToken: false };
    }

    const needsSpace = value.length > 0 && /\S$/.test(value);
    const appended = `${value}${needsSpace ? " " : ""}${newSize}`;
    return { value: appended, updated: true, hadSizeToken: false };
  }

  private ensureTemplateLiteralHasFontSize(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    template: any,
    newSize: string
  ): boolean {
    const replaceRegex = this.createFontSizeRegex("g");
    const testRegex = this.createFontSizeRegex();

    let updated = false;
    let hadSizeToken = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    template.quasis?.forEach((quasi: any) => {
      const cooked = quasi?.value?.cooked ?? "";
      if (!cooked) {
        return;
      }

      if (testRegex.test(cooked)) {
        hadSizeToken = true;
        const nextValue = cooked.replace(replaceRegex, (match: string) => {
          if (match === newSize) {
            return match;
          }
          updated = true;
          return newSize;
        });

        if (nextValue !== cooked) {
          quasi.value.cooked = nextValue;
          quasi.value.raw = nextValue;
        }
      }
    });

    if (hadSizeToken) {
      return updated;
    }

    const staticText =
      template.quasis
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ?.map((quasi: any) => quasi?.value?.cooked ?? "")
        .join("") ?? "";
    if (staticText.split(/\s+/).includes(newSize)) {
      return updated;
    }

    const lastQuasi = template.quasis?.[template.quasis.length - 1];
    if (lastQuasi) {
      const raw = lastQuasi.value?.raw ?? "";
      const needsSpace = raw.length > 0 && /\S$/.test(raw);
      const appended = `${raw}${needsSpace ? " " : ""}${newSize}`;
      lastQuasi.value.raw = appended;
      lastQuasi.value.cooked = appended;
    } else {
      template.quasis = [
        jscodeshift.templateElement({ cooked: "", raw: "" }, false),
        jscodeshift.templateElement(
          { cooked: ` ${newSize}`, raw: ` ${newSize}` },
          true
        ),
      ];
    }

    updated = true;
    return updated;
  }

  private wrapExpressionWithFontSize(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expression: any,
    newSize: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any {
    const template = jscodeshift.templateLiteral(
      [
        jscodeshift.templateElement({ cooked: "", raw: "" }, false),
        jscodeshift.templateElement(
          { cooked: ` ${newSize}`, raw: ` ${newSize}` },
          true
        ),
      ],
      [expression]
    );

    return jscodeshift.jsxExpressionContainer(template);
  }

  async updateFontSize(
    payload: FontSizeUpdatePayload
  ): Promise<FontSizeUpdateResult> {
    const {
      oldSize,
      newSize,
      text,
      tag,
      file,
      forceGlobal,
      className,
      textContent,
      ownerComponentName,
      ownerFilePath,
    } = payload;

    try {
      const lookupText =
        textContent && textContent.length > 0
          ? textContent
          : text;

      const filePath = await this.resolveFileUsingMetadata({
        lookupText,
        tag,
        file,
        serviceName: "FontSizeUpdate",
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

      let updated = false;
      let warningResult: BaseUpdateResult | null = null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matcher = (node: any, children: any[]) => {
        return this.createTextOrClassNameMatcher(lookupText, className, oldSize)(
          node,
          children
        );
      };

      const match = this.findLocalElementMatch({
        filePath,
        ast,
        possibleNames,
        matcher,
        className,
        text: lookupText,
        serviceName: "FontSizeUpdate",
      });

      if (match) {
        const attributes =
          match.matchedNode.openingElement.attributes ||
          (match.matchedNode.openingElement.attributes = []);

        let classAttr = attributes.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (attr: any) => attr.name?.name === "className"
        );

        const riskWarning = this.checkSmartEditRisk({
          sourceFilePath: filePath,
          elementName: match.elementName,
          hasInlineClassName: match.hasInlineClassName,
          usagePropNames: match.usagePropNames,
          forceGlobal,
        });

        if (riskWarning) {
          warningResult = riskWarning;
        } else {
          if (!classAttr) {
            classAttr = jscodeshift.jsxAttribute(
              jscodeshift.jsxIdentifier("className"),
              jscodeshift.stringLiteral(newSize)
            );
            attributes.push(classAttr);
            updated = true;
          } else if (!classAttr.value) {
            classAttr.value = jscodeshift.stringLiteral(newSize);
            updated = true;
          } else if (
            classAttr.value.type === "StringLiteral" ||
            classAttr.value.type === "Literal"
          ) {
            const result = this.ensureStringHasFontSize(
              classAttr.value.value || "",
              newSize
            );
            if (result.updated) {
              classAttr.value.value = result.value;
              updated = true;
            } else if (result.hadSizeToken) {
              updated = true;
            }
          } else if (classAttr.value.type === "JSXExpressionContainer") {
            const expression = classAttr.value.expression;

            if (
              expression?.type === "StringLiteral" ||
              expression?.type === "Literal"
            ) {
              const result = this.ensureStringHasFontSize(
                expression.value || "",
                newSize
              );
              if (result.updated) {
                expression.value = result.value;
                updated = true;
              } else if (result.hadSizeToken) {
                updated = true;
              }
            } else if (expression?.type === "TemplateLiteral") {
              const changed = this.ensureTemplateLiteralHasFontSize(
                expression,
                newSize
              );
              if (changed) {
                updated = true;
              }
            } else if (expression) {
              classAttr.value = this.wrapExpressionWithFontSize(
                expression,
                newSize
              );
              updated = true;
            }
          }
        }
      }

      if (warningResult) {
        return warningResult;
      }

      if (updated) {
        await this.writeFormattedSource(filePath, ast, source);
        return { success: true, message: "Font size updated successfully" };
      }

      return {
        success: false,
        error: `Font size class "${oldSize}" not found in <${tag}> element with text "${lookupText}"`,
      };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error({
        message: `[FontSizeUpdate] Error`,
        context: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
      return { success: false, error: error.message };
    }
  }
}
