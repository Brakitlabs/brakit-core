import fs from "fs";
import jscodeshift, {
  type JSXAttribute,
  type JSXElement,
  type JSXExpressionContainer,
} from "jscodeshift";
import { BaseUpdateService } from "../shared/BaseUpdateService";
import { BaseUpdateResult } from "../shared/types";
import { logger } from "../../utils/logger";
import type { namedTypes } from "ast-types";

type TemplateExpression = Parameters<typeof jscodeshift.templateLiteral>[1][number];
type AllowedExpression = Extract<TemplateExpression, namedTypes.Expression>;

export interface FontFamilyUpdatePayload {
  oldFont: string;
  newFont: string;
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

export type FontFamilyUpdateResult = BaseUpdateResult;

export class FontFamilyUpdateService extends BaseUpdateService {
  private readonly KNOWN_FONT_TOKENS = new Set([
    "font-sans",
    "font-serif",
    "font-mono",
  ]);

  private isFontFamilyToken(token: string): boolean {
    if (!token) {
      return false;
    }

    if (this.KNOWN_FONT_TOKENS.has(token)) {
      return true;
    }

    if (token.startsWith("[font-family:") && token.endsWith("]")) {
      return true;
    }

    if (/^font-\[[^\]]+\]$/.test(token)) {
      return true;
    }

    return false;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private ensureStringHasFontFamily(
    value: string,
    oldFont: string,
    newFont: string
  ): { value: string; updated: boolean; hadToken: boolean } {
    const tokens = value.split(/\s+/).filter(Boolean);
    let updated = false;
    let hadToken = false;

    const filtered = tokens.filter((token) => {
      if (oldFont && token === oldFont) {
        hadToken = true;
        updated = true;
        return false;
      }

      if (this.isFontFamilyToken(token) && token !== newFont) {
        hadToken = true;
        updated = true;
        return false;
      }

      return true;
    });

    if (!filtered.includes(newFont)) {
      filtered.push(newFont);
      updated = true;
    }

    const nextValue = filtered.join(" ");
    return { value: nextValue, updated, hadToken };
  }

  private tokenListHasFont(value: string, font: string): boolean {
    if (!font) {
      return false;
    }
    return value.split(/\s+/).includes(font);
  }

  private ensureTemplateLiteralHasFontFamily(
    template: namedTypes.TemplateLiteral,
    oldFont: string,
    newFont: string
  ): boolean {
    const replaceRegex =
      oldFont.length > 0 ? new RegExp(this.escapeRegExp(oldFont), "g") : null;

    let updated = false;
    let hadToken = false;

    template.quasis?.forEach((quasi) => {
      const cooked = quasi?.value?.cooked ?? "";
      if (!cooked) {
        return;
      }

      let nextValue = cooked;

      if (replaceRegex && replaceRegex.test(cooked)) {
        replaceRegex.lastIndex = 0;
        nextValue = cooked.replace(replaceRegex, newFont);
        if (nextValue !== cooked) {
          updated = true;
          hadToken = true;
        }
      }

      const tokens = nextValue.split(/\s+/).filter(Boolean);
      const filtered = tokens.filter((token: string) => {
        if (oldFont && token === oldFont) {
          hadToken = true;
          updated = true;
          return false;
        }
        if (this.isFontFamilyToken(token) && token !== newFont) {
          hadToken = true;
          updated = true;
          return false;
        }
        return true;
      });

      if (!filtered.includes(newFont)) {
        filtered.push(newFont);
        updated = true;
      }

      const joined = filtered.join(" ");
      if (joined !== cooked) {
        quasi.value.cooked = joined;
        quasi.value.raw = joined;
      }
    });

    const combined =
      template.quasis?.map((quasi) => quasi?.value?.cooked ?? "").join(" ") ??
      "";

    if (!combined.split(/\s+/).includes(newFont)) {
      const lastQuasi = template.quasis?.[template.quasis.length - 1];
      if (lastQuasi) {
        const raw = lastQuasi.value?.raw ?? "";
        const needsSpace = raw.length > 0 && !/\s$/.test(raw);
        const appended = `${raw}${needsSpace ? " " : ""}${newFont}`;
        lastQuasi.value.raw = appended;
        lastQuasi.value.cooked = appended;
      } else {
        template.quasis = [
          jscodeshift.templateElement({ cooked: "", raw: "" }, false),
          jscodeshift.templateElement({ cooked: newFont, raw: newFont }, true),
        ];
      }
      updated = true;
    }

    return updated || hadToken;
  }

  private wrapExpressionWithFontFamily(
    expression: AllowedExpression,
    newFont: string
  ): JSXExpressionContainer {
    const template = jscodeshift.templateLiteral(
      [
        jscodeshift.templateElement({ cooked: "", raw: "" }, false),
        jscodeshift.templateElement(
          { cooked: ` ${newFont}`, raw: ` ${newFont}` },
          true
        ),
      ],
      [expression] as Parameters<typeof jscodeshift.templateLiteral>[1]
    );

    return jscodeshift.jsxExpressionContainer(template);
  }

  async updateFontFamily(
    payload: FontFamilyUpdatePayload
  ): Promise<FontFamilyUpdateResult> {
    const {
      oldFont,
      newFont,
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
        serviceName: "FontFamilyUpdate",
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
      let alreadyPresent = false;

      const matcher = (
        node: JSXElement,
        children: Array<namedTypes.Node | null | undefined>
      ) =>
        this.createTextOrClassNameMatcher(
          lookupText,
          className,
          oldFont
        )(node, children);

      const match = this.findLocalElementMatch({
        filePath,
        ast,
        possibleNames,
        matcher,
        className,
        text: lookupText,
        serviceName: "FontFamilyUpdate",
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
              jscodeshift.stringLiteral(newFont)
            );
            attributes.push(classAttr);
            updated = true;
          } else if (!classAttr.value) {
            classAttr.value = jscodeshift.stringLiteral(newFont);
            updated = true;
          } else if (
            classAttr.value.type === "StringLiteral" ||
            classAttr.value.type === "Literal"
          ) {
            const literal = classAttr.value as
              | namedTypes.StringLiteral
              | namedTypes.Literal;
            const originalValue =
              typeof literal.value === "string" ? literal.value : "";
            if (this.tokenListHasFont(originalValue, newFont)) {
              alreadyPresent = true;
            }
            const result = this.ensureStringHasFontFamily(
              originalValue,
              oldFont,
              newFont
            );
            if (result.updated) {
              literal.value = result.value;
              updated = true;
            } else if (result.hadToken) {
              updated = true;
            }
          } else if (classAttr.value.type === "JSXExpressionContainer") {
            const expression = (classAttr.value as JSXExpressionContainer)
              .expression as namedTypes.Expression | null;

            if (
              expression?.type === "StringLiteral" ||
              expression?.type === "Literal"
            ) {
              const originalValue =
                typeof (expression as namedTypes.Literal).value === "string"
                  ? ((expression as namedTypes.Literal).value as string)
                  : "";
              if (this.tokenListHasFont(originalValue, newFont)) {
                alreadyPresent = true;
              }
              const result = this.ensureStringHasFontFamily(
                originalValue,
                oldFont,
                newFont
              );
              if (result.updated) {
                (expression as namedTypes.Literal).value = result.value;
                updated = true;
              } else if (result.hadToken) {
                updated = true;
              }
            } else if (expression?.type === "TemplateLiteral") {
              const staticJoined =
                (expression as namedTypes.TemplateLiteral).quasis
                  ?.map((quasi) => quasi?.value?.cooked ?? "")
                  .join(" ") ?? "";
              if (this.tokenListHasFont(staticJoined, newFont)) {
                alreadyPresent = true;
              }
              const changed = this.ensureTemplateLiteralHasFontFamily(
                expression as namedTypes.TemplateLiteral,
                oldFont,
                newFont
              );
              if (changed) {
                updated = true;
              }
            } else if (expression) {
              classAttr.value = this.wrapExpressionWithFontFamily(
                expression as TemplateExpression,
                newFont
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
        return {
          success: true,
          message: "Font family updated successfully",
        };
      }

      if (alreadyPresent) {
        return {
          success: true,
          message: "Font already set to the requested family.",
        };
      }

      return {
        success: false,
        error: `Unable to apply font update for text "${lookupText}" in <${tag}>`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({
        message: `[FontFamilyUpdate] Error`,
        context: {
          error: message,
        },
      });
      return {
        success: false,
        error: message,
      };
    }
  }
}
