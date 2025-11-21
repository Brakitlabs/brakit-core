import fs from "fs";
import jscodeshift from "jscodeshift";
import { BaseUpdateService } from "../shared/BaseUpdateService";
import { BaseUpdateResult } from "../shared/types";
import { logger } from "../../utils/logger";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    template: any,
    oldFont: string,
    newFont: string
  ): boolean {
    const replaceRegex =
      oldFont.length > 0 ? new RegExp(this.escapeRegExp(oldFont), "g") : null;

    let updated = false;
    let hadToken = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    template.quasis?.forEach((quasi: any) => {
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
      template.quasis
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ?.map((quasi: any) => quasi?.value?.cooked ?? "")
        .join(" ") ?? "";

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private wrapExpressionWithFontFamily(expression: any, newFont: string): any {
    const template = jscodeshift.templateLiteral(
      [
        jscodeshift.templateElement({ cooked: "", raw: "" }, false),
        jscodeshift.templateElement(
          { cooked: ` ${newFont}`, raw: ` ${newFont}` },
          true
        ),
      ],
      [expression]
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matcher = (node: any, children: any[]) =>
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
            const originalValue = classAttr.value.value || "";
            if (this.tokenListHasFont(originalValue, newFont)) {
              alreadyPresent = true;
            }
            const result = this.ensureStringHasFontFamily(
              originalValue,
              oldFont,
              newFont
            );
            if (result.updated) {
              classAttr.value.value = result.value;
              updated = true;
            } else if (result.hadToken) {
              updated = true;
            }
          } else if (classAttr.value.type === "JSXExpressionContainer") {
            const expression = classAttr.value.expression;

            if (
              expression?.type === "StringLiteral" ||
              expression?.type === "Literal"
            ) {
              const originalValue = expression.value || "";
              if (this.tokenListHasFont(originalValue, newFont)) {
                alreadyPresent = true;
              }
              const result = this.ensureStringHasFontFamily(
                originalValue,
                oldFont,
                newFont
              );
              if (result.updated) {
                expression.value = result.value;
                updated = true;
              } else if (result.hadToken) {
                updated = true;
              }
            } else if (expression?.type === "TemplateLiteral") {
              const staticJoined =
                expression.quasis
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ?.map((quasi: any) => quasi?.value?.cooked ?? "")
                  .join(" ") ?? "";
              if (this.tokenListHasFont(staticJoined, newFont)) {
                alreadyPresent = true;
              }
              const changed = this.ensureTemplateLiteralHasFontFamily(
                expression,
                oldFont,
                newFont
              );
              if (changed) {
                updated = true;
              }
            } else if (expression) {
              classAttr.value = this.wrapExpressionWithFontFamily(
                expression,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error({
        message: `[FontFamilyUpdate] Error`,
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
