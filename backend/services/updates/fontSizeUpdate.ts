import fs from "fs";
import jscodeshift, {
  type JSXAttribute,
  type JSXElement,
  type JSXExpressionContainer,
} from "jscodeshift";
import type { namedTypes } from "ast-types";

type TemplateExpression = Parameters<typeof jscodeshift.templateLiteral>[1][number];
type AllowedExpression = Extract<TemplateExpression, namedTypes.Expression>;
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
    template: namedTypes.TemplateLiteral,
    newSize: string
  ): boolean {
    const replaceRegex = this.createFontSizeRegex("g");
    const testRegex = this.createFontSizeRegex();

    let updated = false;
    let hadSizeToken = false;

    template.quasis?.forEach((quasi) => {
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
      template.quasis?.map((quasi) => quasi?.value?.cooked ?? "").join("") ??
      "";
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
    expression: AllowedExpression,
    newSize: string
  ): JSXExpressionContainer {
    const template = jscodeshift.templateLiteral(
      [
        jscodeshift.templateElement({ cooked: "", raw: "" }, false),
        jscodeshift.templateElement(
          { cooked: ` ${newSize}`, raw: ` ${newSize}` },
          true
        ),
      ],
      [expression] as Parameters<typeof jscodeshift.templateLiteral>[1]
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

      const matcher = (
        node: JSXElement,
        children: Array<namedTypes.Node | null | undefined>
      ) =>
        this.createTextOrClassNameMatcher(lookupText, className, oldSize)(
          node,
          children
        );

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
          (attr): attr is JSXAttribute =>
            attr?.type === "JSXAttribute" && attr.name?.name === "className"
        );

        const riskWarning = this.checkSmartEditRisk({
          sourceFilePath: filePath,
          elementName: match.elementName,
          hasInlineClassName: match.hasInlineClassName,
          usagePropNames: match.usagePropNames,
          forceGlobal,
        });

        if (riskWarning && !match.hasInlineClassName) {
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
            const literal = classAttr.value as
              | namedTypes.StringLiteral
              | namedTypes.Literal;
            const result = this.ensureStringHasFontSize(
              typeof literal.value === "string" ? literal.value : "",
              newSize
            );
            if (result.updated) {
              literal.value = result.value;
              updated = true;
            } else if (result.hadSizeToken) {
              updated = true;
            }
          } else if (classAttr.value.type === "JSXExpressionContainer") {
            const expression = (classAttr.value as JSXExpressionContainer)
              .expression as namedTypes.Expression | null;

            if (
              expression?.type === "StringLiteral" ||
              expression?.type === "Literal"
            ) {
              const result = this.ensureStringHasFontSize(
                typeof (expression as namedTypes.Literal).value === "string"
                  ? ((expression as namedTypes.Literal).value as string)
                  : "",
                newSize
              );
              if (result.updated) {
                (expression as namedTypes.Literal).value = result.value;
                updated = true;
              } else if (result.hadSizeToken) {
                updated = true;
              }
            } else if (expression?.type === "TemplateLiteral") {
              const changed = this.ensureTemplateLiteralHasFontSize(
                expression as namedTypes.TemplateLiteral,
                newSize
              );
              if (changed) {
                updated = true;
              }
            } else if (expression) {
              classAttr.value = this.wrapExpressionWithFontSize(
                expression as TemplateExpression,
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({
        message: `[FontSizeUpdate] Error`,
        context: {
          error: message,
        },
      });
      return { success: false, error: message };
    }
  }
}
