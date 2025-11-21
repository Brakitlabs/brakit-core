import fs from "fs";
import path from "path";
import jscodeshift from "jscodeshift";
import prettier from "prettier";
import {
  BaseUpdateResult,
  COMPONENT_MAP,
  SKIP_DIRECTORIES,
  SEARCH_DIRECTORIES,
} from "./types";
import { analyzeComponentForEditRisk, STYLE_PROPS } from "./smartEditAnalyzer";
import { logger } from "../../utils/logger";
import {
  findBestMatch,
  createCandidate,
  type ElementMatchCandidate,
} from "./elementMatcher";
import { resolveFilePath as resolveFilePathUtil } from "../../utils/fileResolver";
import { normalizeText as normalizeTextUtil } from "./textUtils";
import { actionHistory } from "../history";

const COMPONENT_FILE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];
const STYLE_PROP_SET = new Set(STYLE_PROPS);

export interface ElementMatchContext {
  filePath: string;
  ast: any;
  matchedNode: any;
  matchedPath: any;
  elementName?: string;
  hasInlineClassName: boolean;
  usagePropNames: string[];
}

export interface ElementMatcherOptions {
  identifier?: string;
  textContent?: string;
  className?: string;
  elementTag?: string;
  componentNameHint?: string;
}

export interface ComponentUsageMatch {
  componentName: string;
  hasInlineClassName: boolean;
  propNames: string[];
}

export interface ProjectComponentUsageMatch extends ComponentUsageMatch {
  filePath: string;
}

export abstract class BaseUpdateService {
  protected projectRoot: string;
  private componentResolutionCache = new Map<
    string,
    { mtimeMs: number; path: string | null }
  >();

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Normalize whitespace in text for reliable comparisons
   */
  protected normalizeText(value: string | null | undefined): string {
    return normalizeTextUtil(value);
  }

  /**
   * Resolve a file path from a URL path or relative path
   */
  protected resolveFilePath(sourceFile: string): string {
    return resolveFilePathUtil(sourceFile, this.projectRoot);
  }

  /**
   * Get possible tag names including component mappings
   */
  protected getPossibleTagNames(tag: string): string[] {
    const tagLower = tag.toLowerCase();
    const tagUpper = tag.charAt(0).toUpperCase() + tag.slice(1);
    return COMPONENT_MAP[tagLower] || [tag, tagLower, tagUpper];
  }

  protected buildElementMatchContext(
    filePath: string,
    ast: any,
    matchedNode: any,
    matchedPath: any
  ): ElementMatchContext {
    const attributes: any[] = matchedNode.openingElement?.attributes || [];

    const usagePropNames = Array.from(
      new Set(
        attributes
          .map((attr: any) => attr?.name?.name)
          .filter((name: string | undefined): name is string => Boolean(name))
      )
    );

    const elementName =
      matchedNode.openingElement?.name?.name ||
      matchedNode.openingElement?.name?.object?.name;

    const hasInlineClassName = attributes.some(
      (attr: any) => attr?.name?.name === "className"
    );

    return {
      filePath,
      ast,
      matchedNode,
      matchedPath,
      elementName,
      hasInlineClassName,
      usagePropNames,
    };
  }

  protected findLocalElementMatch(options: {
    filePath: string;
    ast: any;
    possibleNames: string[];
    matcher: (node: any, children: any[]) => boolean;
    className: string;
    text: string;
    serviceName: string;
  }): ElementMatchContext | null {
    const {
      filePath,
      ast,
      possibleNames,
      matcher,
      className,
      text,
      serviceName,
    } = options;

    const candidates = this.collectCandidateElements(ast, possibleNames, matcher);
    const elementMatch = this.selectBestMatchingElement(
      candidates,
      className,
      text,
      serviceName
    );

    if (!elementMatch) {
      return null;
    }

    return this.buildElementMatchContext(
      filePath,
      ast,
      elementMatch.matchedNode,
      elementMatch.matchedPath
    );
  }

  protected createElementMatcher(
    options: ElementMatcherOptions
  ): (node: any, children: any[]) => boolean {
    const normalizedIdentifier = this.normalizeText(options.identifier ?? "");
    const normalizedText = this.normalizeText(options.textContent ?? "");
    const elementTagHint = options.elementTag
      ? this.normalizeText(options.elementTag)
      : "";
    const componentNameHint = options.componentNameHint
      ? this.normalizeText(options.componentNameHint)
      : "";
    const classTokens = this.sanitizeClassTokens(options.className);

    return (node: any, children: any[]) => {
      const nodeName =
        node.openingElement?.name?.name ||
        node.openingElement?.name?.object?.name;
      const normalizedNodeName = nodeName
        ? this.normalizeText(nodeName)
        : "";

      const nodeText = this.extractNodeText(children);

      if (
        normalizedIdentifier &&
        nodeText.length > 0 &&
        nodeText.includes(normalizedIdentifier)
      ) {
        return true;
      }

      if (normalizedText && nodeText.includes(normalizedText)) {
        return true;
      }

      const attributes: any[] = node.openingElement?.attributes || [];
      for (const attr of attributes) {
        const attrName = attr?.name?.name;
        const value = this.extractStringValue(attr?.value);
        if (value) {
          const normalizedValue = this.normalizeText(value);
          if (
            (normalizedIdentifier &&
              normalizedValue.includes(normalizedIdentifier)) ||
            (normalizedText && normalizedValue.includes(normalizedText))
          ) {
            return true;
          }
        }

        if (attrName === "className" && typeof value === "string") {
          const nodeClassTokens = this.sanitizeClassTokens(value);
          if (this.hasClassOverlap(classTokens, nodeClassTokens)) {
            return true;
          }
        }
      }

      if (elementTagHint && normalizedNodeName === elementTagHint) {
        if (normalizedIdentifier || normalizedText || classTokens.size > 0) {
          return true;
        }
      }

      if (componentNameHint && normalizedNodeName === componentNameHint) {
        return true;
      }

      return false;
    };
  }

  protected resolveComponentUsage(
    text: string,
    ast: any,
    filePath: string
  ): {
    localUsage?: ComponentUsageMatch | null;
    externalUsage?: ProjectComponentUsageMatch | null;
  } {
    const componentMatch = this.findComponentUsageByText(ast, text);
    const externalMatch = componentMatch
      ? null
      : this.findComponentUsageInProject(text);

    return {
      localUsage: componentMatch,
      externalUsage: externalMatch,
    };
  }

  protected loadComponentAst(options: {
    usageFilePath: string;
    componentName: string;
    tag: string;
    componentFileOverride?: string;
  }): {
    componentFilePath: string;
    source: string;
    ast: any;
    possibleNames: string[];
  } | null {
    const { usageFilePath, componentName, tag, componentFileOverride } = options;

    const componentFilePath = componentFileOverride
      ? componentFileOverride
      : this.resolveComponentFilePath(usageFilePath, componentName);

    if (!componentFilePath || !fs.existsSync(componentFilePath)) {
      return null;
    }

    const source = fs.readFileSync(componentFilePath, "utf8");
    const { ast, possibleNames } = this.parseAndFindElements(source, tag);

    return {
      componentFilePath,
      source,
      ast,
      possibleNames,
    };
  }

  protected expressionReferencesProps(
    node: any,
    propNames: Set<string>
  ): boolean {
    if (!node) {
      return false;
    }

    switch (node.type) {
      case "Identifier":
        return propNames.has(node.name);
      case "MemberExpression":
        if (node.object) {
          if (
            node.object.type === "Identifier" &&
            (propNames.has(node.object.name) || node.object.name === "props")
          ) {
            if (!node.computed && node.property?.type === "Identifier") {
              if (propNames.has(node.property.name)) {
                return true;
              }
            }
            return true;
          }

          if (this.expressionReferencesProps(node.object, propNames)) {
            return true;
          }
        }

        if (
          node.property &&
          this.expressionReferencesProps(node.property, propNames)
        ) {
          return true;
        }
        return false;
      case "CallExpression":
        if (this.expressionReferencesProps(node.callee, propNames)) {
          return true;
        }
        return node.arguments?.some((arg: any) =>
          this.expressionReferencesProps(arg, propNames)
        );
      case "TemplateLiteral":
        return node.expressions?.some((expr: any) =>
          this.expressionReferencesProps(expr, propNames)
        );
      case "BinaryExpression":
      case "LogicalExpression":
        return (
          this.expressionReferencesProps(node.left, propNames) ||
          this.expressionReferencesProps(node.right, propNames)
        );
      case "ConditionalExpression":
        return (
          this.expressionReferencesProps(node.test, propNames) ||
          this.expressionReferencesProps(node.consequent, propNames) ||
          this.expressionReferencesProps(node.alternate, propNames)
        );
      case "ArrayExpression":
        return node.elements?.some((el: any) =>
          this.expressionReferencesProps(el, propNames)
        );
      case "ObjectExpression":
        return node.properties?.some((prop: any) => {
          if (!prop) {
            return false;
          }
          if (prop.type === "Property") {
            return this.expressionReferencesProps(prop.value, propNames);
          }
          if (prop.type === "SpreadElement") {
            return this.expressionReferencesProps(prop.argument, propNames);
          }
          return false;
        });
      case "UnaryExpression":
      case "UpdateExpression":
      case "AwaitExpression":
      case "YieldExpression":
      case "TSNonNullExpression":
      case "TSAsExpression":
      case "TypeCastExpression":
      case "ParenthesizedExpression":
        return this.expressionReferencesProps(
          node.argument ?? node.expression,
          propNames
        );
      case "AssignmentExpression":
        return (
          this.expressionReferencesProps(node.left, propNames) ||
          this.expressionReferencesProps(node.right, propNames)
        );
      case "JSXExpressionContainer":
        return this.expressionReferencesProps(node.expression, propNames);
      case "JSXElement":
        return node.children?.some((child: any) =>
          child?.type === "JSXExpressionContainer"
            ? this.expressionReferencesProps(child.expression, propNames)
            : false
        );
      default:
        return false;
    }
  }

  /**
   * Two-phase search: Try resolved file first, then search codebase
   */
  protected async findFileForText(
    text: string,
    tag: string,
    file: string,
    serviceName: string
  ): Promise<string | null> {
    const possibleNames = this.getPossibleTagNames(tag);
    const resolvedPath = this.resolveFilePath(file);

    if (
      fs.existsSync(resolvedPath) &&
      (await this.fileContainsText(resolvedPath, text, possibleNames, {
        allowDynamicFallback: false,
      }))
    ) {
      return resolvedPath;
    }

    const strictSearch = await this.findFileWithText(text, possibleNames, {
      allowDynamicFallback: false,
    });
    if (strictSearch) {
      return strictSearch;
    }

    if (
      fs.existsSync(resolvedPath) &&
      (await this.fileContainsText(resolvedPath, text, possibleNames, {
        allowDynamicFallback: true,
      }))
    ) {
      return resolvedPath;
    }

    return await this.findFileWithText(text, possibleNames, {
      allowDynamicFallback: true,
    });
  }

  protected async resolveFileUsingMetadata(options: {
    lookupText: string;
    tag: string;
    file: string;
    serviceName: string;
    ownerComponentName?: string;
    ownerFilePath?: string;
  }): Promise<string | null> {
    const requestedSourcePath = options.file
      ? this.resolveFilePath(options.file)
      : null;

    const hinted = this.resolveFileFromOwnerHints({
      requestedSourcePath,
      ownerComponentName: options.ownerComponentName,
      ownerFilePath: options.ownerFilePath,
    });

    if (hinted) {
      return hinted;
    }

    return this.findFileForText(
      options.lookupText,
      options.tag,
      options.file,
      options.serviceName
    );
  }

  protected resolveFileFromOwnerHints(options: {
    requestedSourcePath: string | null;
    ownerComponentName?: string;
    ownerFilePath?: string;
  }): string | null {
    const { requestedSourcePath, ownerComponentName, ownerFilePath } = options;

    if (ownerFilePath) {
      try {
        const resolvedOwner = this.resolveFilePath(ownerFilePath);
        if (fs.existsSync(resolvedOwner)) {
          return resolvedOwner;
        }
      } catch {
        // Ignore resolution errors and continue to other strategies
      }
    }

    if (ownerComponentName) {
      if (requestedSourcePath && fs.existsSync(requestedSourcePath)) {
        const resolvedFromRequest = this.resolveComponentFilePath(
          requestedSourcePath,
          ownerComponentName
        );

        if (resolvedFromRequest && fs.existsSync(resolvedFromRequest)) {
          return resolvedFromRequest;
        }
      }

      const fallbackMatch = this.findComponentFileByName(ownerComponentName);
      if (fallbackMatch && fs.existsSync(fallbackMatch)) {
        return fallbackMatch;
      }
    }

    return null;
  }

  /**
   * Search all source files for text in a specific tag
   */
  private async findFileWithText(
    text: string,
    possibleTags: string[],
    options: { allowDynamicFallback: boolean }
  ): Promise<string | null> {
    // Build list of directories to search, only include those that exist
    const searchDirs = SEARCH_DIRECTORIES.map((dir) =>
      path.join(this.projectRoot, dir)
    ).filter((dir) => fs.existsSync(dir));

    if (searchDirs.length === 0) {
      // Fallback: If none of the common directories exist, search project root
      // This handles edge cases like non-standard project structures
      searchDirs.push(this.projectRoot);
    }

    for (const searchDir of searchDirs) {
      const result = await this.searchDirectoryForText(
        searchDir,
        text,
        possibleTags,
        options
      );
      if (result) return result; // Early return on first match
    }

    return null;
  }

  /**
   * Recursively search directory for files containing the text
   */
  private async searchDirectoryForText(
    dir: string,
    text: string,
    possibleTags: string[],
    options: { allowDynamicFallback: boolean }
  ): Promise<string | null> {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip irrelevant directories (performance optimization)
        if (SKIP_DIRECTORIES.includes(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          const result = await this.searchDirectoryForText(
            fullPath,
            text,
            possibleTags,
            options
          );
          if (result) return result; // Early termination
        } else if (entry.isFile() && /\.(tsx|jsx)$/.test(entry.name)) {
          // Only search .tsx and .jsx files (not .ts or .js for performance)
          if (
            await this.fileContainsText(fullPath, text, possibleTags, options)
          ) {
            return fullPath;
          }
        }
      }
    } catch (error) {
      logger.warn({
        message: `Error searching directory ${dir}`,
        context: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }

    return null;
  }

  /**
   * Check if file contains text in specified tags
   */
  protected async fileContainsText(
    filePath: string,
    text: string,
    possibleTags: string[],
    options?: { allowDynamicFallback?: boolean }
  ): Promise<boolean> {
    const allowDynamicFallback = options?.allowDynamicFallback !== false;
    try {
      const source = fs.readFileSync(filePath, "utf8");
      const j = jscodeshift.withParser("tsx") as typeof jscodeshift;
      const ast = j(source);

      let found = false;
      const normalizedTarget = this.normalizeText(text);

      ast.findJSXElements().forEach((path: any) => {
        if (found) return;

        const { node } = path;
        const nodeName =
          node.openingElement?.name?.name ||
          node.openingElement?.name?.object?.name;

        if (possibleTags.includes(nodeName)) {
          const children = node.children || [];
          let hasStaticText = false;
          const textInfo = this.collectNodeTextInfo(children);
          const normalizedCombinedText = this.normalizeText(textInfo.text);
          const hasDynamicContent = textInfo.hasDynamicContent;

          if (
            normalizedTarget.length > 0 &&
            normalizedCombinedText === normalizedTarget
          ) {
            found = true;
            hasStaticText = true;
          }

          // If allowed, accept dynamic content as fallback, but only when no static match is found
          if (!hasStaticText && hasDynamicContent && allowDynamicFallback) {
            found = true;
          }
        }
      });

      return found;
    } catch (error) {
      // Ignore parse errors in files
      return false;
    }
  }

  /**
   * Parse AST and find matching JSX elements
   */
  protected parseAndFindElements(
    source: string,
    tag: string
  ): { ast: any; possibleNames: string[] } {
    const j = jscodeshift.withParser("tsx") as typeof jscodeshift;
    const ast = j(source);
    const possibleNames = this.getPossibleTagNames(tag);
    return { ast, possibleNames };
  }

  /**
   * Shared predicate for matching elements by text content or className.
   * Handles both static text (JSXText) and dynamic content (JSXExpressionContainer).
   * Falls back to className matching when content is dynamic.
   */
  protected createTextOrClassNameMatcher(
    targetText: string,
    targetClassName?: string,
    additionalClassMatch?: string
  ): (node: any, children: any[]) => boolean {
    const normalizedTarget = this.normalizeText(targetText);
    const targetClassTokens = this.sanitizeClassTokens(targetClassName);
    const additionalClassTokens = this.sanitizeClassTokens(additionalClassMatch);

    return (node: any, children: any[]) => {
      let textMatched = false;
      const textInfo = this.collectNodeTextInfo(children);
      const normalizedCombinedText = this.normalizeText(textInfo.text);
      const hasDynamicContent = textInfo.hasDynamicContent;

      if (
        normalizedTarget.length > 0 &&
        normalizedCombinedText === normalizedTarget
      ) {
        textMatched = true;
      }

      // If no text match, try matching by className when we have enough context
      if (
        !textMatched &&
        (hasDynamicContent || normalizedCombinedText.length === 0) &&
        (targetClassTokens.size > 0 || additionalClassTokens.size > 0)
      ) {
        const classAttr = node.openingElement.attributes?.find(
          (attr: any) => attr.name?.name === "className"
        );
        if (classAttr && classAttr.value) {
          const classValue =
            this.extractStringValue(classAttr.value) || "";
          if (classValue) {
            const nodeClassTokens = this.sanitizeClassTokens(classValue);

            // Try additional class match first (e.g., oldSize for font updates)
            if (
              additionalClassTokens.size > 0 &&
              this.hasClassOverlap(additionalClassTokens, nodeClassTokens)
            ) {
              textMatched = true;
            }
            // Otherwise try matching by target className
            else if (
              targetClassTokens.size > 0 &&
              this.hasClassOverlap(targetClassTokens, nodeClassTokens)
            ) {
              textMatched = true;
            }
          }
        }
      }

      return textMatched;
    };
  }

  protected extractStringValue(node: any): string | null {
    if (!node) {
      return null;
    }

    switch (node.type) {
      case "StringLiteral":
      case "Literal":
        return typeof node.value === "string" ? node.value : null;
      case "TemplateLiteral":
        if (node.expressions && node.expressions.length > 0) {
          return null;
        }
        return node.quasis?.map((q: any) => q.value.cooked).join("") ?? null;
      case "JSXExpressionContainer":
        return this.extractStringValue(node.expression);
      case "JSXText":
        return typeof node.value === "string" ? node.value : null;
      default:
        return null;
    }
  }

  protected findComponentUsageByText(
    ast: any,
    text: string
  ): ComponentUsageMatch | null {
    const normalizedTarget = this.normalizeText(text);

    if (!normalizedTarget) {
      return null;
    }

    let match: ComponentUsageMatch | null = null;

    ast.find(jscodeshift.JSXElement).forEach((path: any) => {
      if (match) {
        return;
      }

      const node: any = path.node;
      const nameNode: any = node.openingElement?.name;
      const candidateName: string | undefined =
        nameNode?.name ?? nameNode?.object?.name;

      if (!candidateName || !/^[A-Z]/.test(candidateName)) {
        return;
      }

      const attributeSet = new Set<string>();
      const attributes: any[] = node.openingElement?.attributes || [];

      for (const attr of attributes) {
        if (!attr?.name?.name) {
          continue;
        }

        attributeSet.add(attr.name.name);
        const literalValue = this.extractStringValue(attr.value);
        if (
          literalValue &&
          this.normalizeText(literalValue) === normalizedTarget
        ) {
          match = {
            componentName: candidateName,
            hasInlineClassName: attributeSet.has("className"),
            propNames: Array.from(attributeSet),
          };
          return;
        }
      }

      const children: any[] = node.children || [];
      for (const child of children) {
        const literalValue = this.extractStringValue(child);
        if (
          literalValue &&
          this.normalizeText(literalValue) === normalizedTarget
        ) {
          match = {
            componentName: candidateName,
            hasInlineClassName: attributeSet.has("className"),
            propNames: Array.from(attributeSet),
          };
          return;
        }
      }
    });

    return match;
  }

  protected findComponentUsageInProject(
    text: string
  ): ProjectComponentUsageMatch | null {
    const normalizedTarget = this.normalizeText(text);

    if (!normalizedTarget) {
      return null;
    }

    const searchDirs = SEARCH_DIRECTORIES.map((dir) =>
      path.join(this.projectRoot, dir)
    ).filter((dir) => fs.existsSync(dir));

    if (searchDirs.length === 0) {
      searchDirs.push(this.projectRoot);
    }

    for (const dir of searchDirs) {
      const match = this.searchDirectoryForComponentUsage(dir, text);
      if (match) {
        return match;
      }
    }

    return null;
  }

  protected findComponentFileByName(componentName: string): string | null {
    if (!componentName) {
      return null;
    }

    const searchDirs = SEARCH_DIRECTORIES.map((dir) =>
      path.join(this.projectRoot, dir)
    ).filter((dir) => fs.existsSync(dir));

    if (searchDirs.length === 0) {
      searchDirs.push(this.projectRoot);
    }

    for (const dir of searchDirs) {
      const match = this.searchDirectoryForComponentFile(dir, componentName);
      if (match) {
        return match;
      }
    }

    return null;
  }

  private searchDirectoryForComponentFile(
    dir: string,
    componentName: string
  ): string | null {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(".")) {
          continue;
        }

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (SKIP_DIRECTORIES.includes(entry.name)) {
            continue;
          }

          const indexMatch = this.matchComponentIndexFile(fullPath, componentName);
          if (indexMatch) {
            return indexMatch;
          }

          const nested = this.searchDirectoryForComponentFile(
            fullPath,
            componentName
          );
          if (nested) {
            return nested;
          }
        } else if (entry.isFile()) {
          if (
            COMPONENT_FILE_EXTENSIONS.some((ext) =>
              entry.name.endsWith(ext)
            ) &&
            this.matchesComponentBaseName(entry.name, componentName)
          ) {
            return fullPath;
          }
        }
      }
    } catch (error) {
      logger.warn({
        message: `[BaseUpdate] Failed component search`,
        context: {
          componentName,
          dir,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }

    return null;
  }

  private matchComponentIndexFile(dirPath: string, componentName: string): string | null {
    try {
      const stats = fs.statSync(dirPath);
      if (!stats.isDirectory()) {
        return null;
      }

      if (!this.matchesComponentBaseName(path.basename(dirPath), componentName)) {
        return null;
      }

      for (const ext of COMPONENT_FILE_EXTENSIONS) {
        const candidate = path.join(dirPath, `index${ext}`);
        if (fs.existsSync(candidate)) {
          const candidateStats = fs.statSync(candidate);
          if (candidateStats.isFile()) {
            return candidate;
          }
        }
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  private matchesComponentBaseName(fileName: string, componentName: string): boolean {
    if (!fileName || !componentName) {
      return false;
    }

    const baseName = fileName.replace(/\.[^.]+$/, "");
    return baseName === componentName;
  }

  private searchDirectoryForComponentUsage(
    dir: string,
    text: string
  ): ProjectComponentUsageMatch | null {
    const normalizedTarget = this.normalizeText(text);

    if (!normalizedTarget) {
      return null;
    }

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (SKIP_DIRECTORIES.includes(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          const match = this.searchDirectoryForComponentUsage(fullPath, text);
          if (match) {
            return match;
          }
        } else if (entry.isFile() && /\.(tsx|jsx)$/.test(entry.name)) {
          const source = fs.readFileSync(fullPath, "utf8");

          if (!source.includes(text)) {
            continue;
          }

          try {
            const j = jscodeshift.withParser("tsx") as typeof jscodeshift;
            const ast = j(source);
            const usageMatch = this.findComponentUsageByText(ast, text);

            if (usageMatch) {
              return { filePath: fullPath, ...usageMatch };
            }
          } catch (error) {
            logger.warn({
              message: `[SmartEdit] Failed to parse component file during usage search`,
              context: {
                filePath: fullPath,
                error: error instanceof Error ? error.message : String(error),
              },
            });
          }
        }
      }
    } catch (error) {
      logger.warn({
        message: `[SmartEdit] Error scanning directory for component usage`,
        context: {
          directory: dir,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }

    return null;
  }

  protected checkSmartEditRisk(options: {
    sourceFilePath: string;
    elementName?: string;
    hasInlineClassName: boolean;
    forceGlobal?: boolean;
    usagePropNames?: string[];
  }): BaseUpdateResult | null {
    const {
      sourceFilePath,
      elementName,
      hasInlineClassName,
      forceGlobal,
      usagePropNames = [],
    } = options;

    if (forceGlobal) {
      return null;
    }

    try {
      const aggregatedSignals = new Set<string>();
      const detectedProps = new Set<string>();

      const normalizedUsageProps = Array.from(
        new Set(
          usagePropNames
            .map((name) => name?.trim())
            .filter((name): name is string => Boolean(name))
        )
      );

      const usageStyleProps = normalizedUsageProps.filter((name) =>
        STYLE_PROP_SET.has(name)
      );

      if (!hasInlineClassName) {
        aggregatedSignals.add("no-inline-classname");
      }

      if (usageStyleProps.length > 0) {
        aggregatedSignals.add("variant-prop");
        usageStyleProps.forEach((prop) => detectedProps.add(prop));
      }

      const pageAnalysis = analyzeComponentForEditRisk(sourceFilePath);

      const includeAnalysisSignals = (analysis: typeof pageAnalysis | null) => {
        if (!analysis) {
          return;
        }

        analysis.signals?.forEach((signal) => aggregatedSignals.add(signal));
        analysis.detectedProps?.forEach((prop) => detectedProps.add(prop));
      };

      const buildResult = (params: {
        message: string;
        detailsParts?: string[];
        filePath: string;
        componentName: string;
      }): BaseUpdateResult => {
        const { message, detailsParts, filePath, componentName } = params;

        return {
          success: false,
          warning: true,
          message,
          details:
            detailsParts && detailsParts.length
              ? detailsParts.join(" ")
              : undefined,
          detectedProps:
            detectedProps.size > 0 ? Array.from(detectedProps) : undefined,
          filePath,
          componentName,
          signals:
            aggregatedSignals.size > 0
              ? Array.from(aggregatedSignals)
              : undefined,
        };
      };

      if (!elementName) {
        if (pageAnalysis.risky) {
          includeAnalysisSignals(pageAnalysis);
          return buildResult({
            message:
              pageAnalysis.reason ??
              "This file appears to rely on shared styling. Editing it may affect multiple instances.",
            detailsParts: pageAnalysis.reason
              ? [pageAnalysis.reason]
              : undefined,
            filePath: pageAnalysis.filePath,
            componentName:
              pageAnalysis.componentName ??
              this.extractComponentNameFromTag(elementName),
          });
        }

        return null;
      }

      const isComponentTag = /^[A-Z]/.test(elementName);

      if (!isComponentTag) {
        if (pageAnalysis.risky) {
          includeAnalysisSignals(pageAnalysis);
          return buildResult({
            message:
              pageAnalysis.reason ??
              `Editing <${elementName}> may affect multiple instances in this file.`,
            detailsParts: pageAnalysis.reason
              ? [pageAnalysis.reason]
              : undefined,
            filePath: pageAnalysis.filePath,
            componentName: this.extractComponentNameFromTag(elementName),
          });
        }

        return null;
      }

      const componentFilePath = this.resolveComponentFilePath(
        sourceFilePath,
        elementName
      );

      if (!componentFilePath) {
        if (!hasInlineClassName) {
          const detailsParts = [
            `The <${elementName}> usage you're editing doesn't set a className override.`,
            "Brakit couldn't locate the component's source file to confirm whether it supports scoped styling.",
          ];

          if (pageAnalysis.risky) {
            includeAnalysisSignals(pageAnalysis);
            if (pageAnalysis.reason) {
              detailsParts.push(pageAnalysis.reason);
            }
          }

          return buildResult({
            message: `<${elementName}> looks like a shared design component. Applying this edit will impact every instance.`,
            detailsParts,
            filePath: sourceFilePath,
            componentName: elementName,
          });
        }

        if (usageStyleProps.length > 0) {
          if (pageAnalysis.risky) {
            includeAnalysisSignals(pageAnalysis);
          }

          const detailsParts = [
            `This <${elementName}> usage passes styling props (${usageStyleProps.join(", ")}), so edits may apply globally.`,
          ];

          return buildResult({
            message: `<${elementName}> appears to rely on shared styling.`,
            detailsParts,
            filePath: sourceFilePath,
            componentName: elementName,
          });
        }

        if (pageAnalysis.risky) {
          includeAnalysisSignals(pageAnalysis);
          return buildResult({
            message:
              pageAnalysis.reason ??
              `<${elementName}> appears to rely on shared styling.`,
            detailsParts: pageAnalysis.reason
              ? [pageAnalysis.reason]
              : undefined,
            filePath: pageAnalysis.filePath,
            componentName: elementName,
          });
        }

        return null;
      }

      const componentAnalysis = analyzeComponentForEditRisk(componentFilePath);
      includeAnalysisSignals(componentAnalysis);

      const lacksClassNameSupport =
        componentAnalysis.metadata?.hasClassNameProp === false;

      const componentReasons: string[] = [];

      if (usageStyleProps.length > 0) {
        componentReasons.push(
          `This <${elementName}> usage passes styling props (${usageStyleProps.join(", ")}), so edits may apply globally.`
        );
      }

      if (!hasInlineClassName) {
        componentReasons.push(
          `The <${elementName}> usage you're editing doesn't set a className override.`
        );
      }

      if (lacksClassNameSupport) {
        componentReasons.push(
          `${componentAnalysis.componentName ?? elementName} doesn't expose a className prop or other style override.`
        );
      }

      if (componentAnalysis.reason) {
        componentReasons.push(componentAnalysis.reason);
      }

      const shouldWarn =
        usageStyleProps.length > 0 ||
        componentAnalysis.risky ||
        (!hasInlineClassName && lacksClassNameSupport);

      if (!shouldWarn) {
        return null;
      }

      return buildResult({
        message: `<${elementName}> looks like a shared design component. Applying this edit will change every instance.`,
        detailsParts: componentReasons,
        filePath: componentAnalysis.filePath ?? componentFilePath,
        componentName: componentAnalysis.componentName ?? elementName,
      });
    } catch (error) {
      logger.warn({
        message: `[SmartEdit] Unable to evaluate smart edit risk`,
        context: {
          elementName,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      return null;
    }
  }

  protected resolveComponentFilePath(
    sourceFilePath: string,
    componentName: string
  ): string | null {
    if (!componentName) {
      return null;
    }

    const cacheKey = `${sourceFilePath}:${componentName}`;
    let stats: fs.Stats | null = null;

    try {
      stats = fs.statSync(sourceFilePath);
      const cached = this.componentResolutionCache.get(cacheKey);
      if (cached && cached.mtimeMs === stats.mtimeMs) {
        return cached.path;
      }
    } catch (error) {
      this.componentResolutionCache.delete(cacheKey);
      return null;
    }

    let resolvedPath: string | null = null;

    try {
      const source = fs.readFileSync(sourceFilePath, "utf8");
      const j = jscodeshift.withParser("tsx") as typeof jscodeshift;
      const ast = j(source);

      let importTarget: string | null = null;

      ast.find(jscodeshift.ImportDeclaration).forEach((path) => {
        if (importTarget) {
          return;
        }

        const declaration = path.node;
        const specifiers = declaration.specifiers || [];
        const matches = specifiers.some((specifier: any) => {
          if (!specifier?.local?.name) {
            return false;
          }
          return specifier.local.name === componentName;
        });

        if (matches) {
          const moduleSource = declaration.source.value;
          if (typeof moduleSource === "string") {
            importTarget = moduleSource;
          }
        }
      });

      if (importTarget) {
        resolvedPath = this.resolveModuleToFile(
          importTarget,
          path.dirname(sourceFilePath)
        );
      }
    } catch (error) {
      logger.warn({
        message: `[SmartEdit] Failed to resolve component from file`,
        context: {
          componentName,
          sourceFilePath,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }

    if (stats) {
      this.componentResolutionCache.set(cacheKey, {
        mtimeMs: stats.mtimeMs,
        path: resolvedPath,
      });
    }

    return resolvedPath;
  }

  private resolveModuleToFile(
    moduleSpecifier: string,
    fromDir: string
  ): string | null {
    const normalized = moduleSpecifier.replace(/\\/g, "/");
    const candidates: string[] = [];

    const pushCandidate = (candidate: string | null | undefined) => {
      if (!candidate) {
        return;
      }
      if (!candidates.includes(candidate)) {
        candidates.push(candidate);
      }
    };

    const addWithExtensions = (base: string) => {
      const hasKnownExtension = COMPONENT_FILE_EXTENSIONS.some((ext) =>
        base.endsWith(ext)
      );

      pushCandidate(base);

      if (!hasKnownExtension) {
        for (const ext of COMPONENT_FILE_EXTENSIONS) {
          pushCandidate(`${base}${ext}`);
        }
      }

      for (const ext of COMPONENT_FILE_EXTENSIONS) {
        pushCandidate(path.join(base, `index${ext}`));
      }
    };

    if (normalized.startsWith(".")) {
      addWithExtensions(path.resolve(fromDir, normalized));
    } else if (normalized.startsWith("@/")) {
      const trimmed = normalized.slice(2);
      addWithExtensions(path.join(this.projectRoot, trimmed));
      addWithExtensions(path.join(this.projectRoot, "src", trimmed));
      addWithExtensions(path.join(this.projectRoot, "app", trimmed));
    } else if (normalized.startsWith("~/")) {
      const trimmed = normalized.slice(2);
      addWithExtensions(path.join(this.projectRoot, trimmed));
      addWithExtensions(path.join(this.projectRoot, "src", trimmed));
    } else if (normalized.startsWith("/")) {
      addWithExtensions(path.join(this.projectRoot, normalized));
      addWithExtensions(path.join(this.projectRoot, "src", normalized));
    } else {
      addWithExtensions(path.join(this.projectRoot, normalized));
      addWithExtensions(path.join(this.projectRoot, "src", normalized));
      addWithExtensions(path.join(this.projectRoot, "app", normalized));
      addWithExtensions(path.join(this.projectRoot, "components", normalized));
    }

    for (const candidate of candidates) {
      try {
        if (!fs.existsSync(candidate)) {
          continue;
        }

        const stats = fs.statSync(candidate);
        if (stats.isFile()) {
          return candidate;
        }
      } catch (error) {
        logger.warn({
          message: `[SmartEdit] Failed to stat component candidate`,
          context: {
            candidate,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }

    return null;
  }

  private extractComponentNameFromTag(tag?: string): string {
    if (!tag || tag.length === 0) {
      return "Component";
    }

    if (/^[A-Z]/.test(tag)) {
      return tag;
    }

    return tag.charAt(0).toUpperCase() + tag.slice(1);
  }

  protected selectBestMatchingElement(
    candidates: ElementMatchCandidate[],
    className: string,
    text: string,
    serviceName: string
  ): { matchedNode: any; matchedPath: any } | null {
    if (candidates.length === 0) {
      return null;
    }

    logger.info({
      message: `[${serviceName}] Found ${candidates.length} candidate(s)`,
      context: {
        count: candidates.length,
        className,
      },
    });

    const bestMatch = findBestMatch(candidates, className, text);
    if (!bestMatch) {
      return null;
    }

    logger.info({
      message: `[${serviceName}] Selected best match`,
      context: {
        score: bestMatch.score,
        reason: bestMatch.reason,
      },
    });

    return {
      matchedNode: bestMatch.node,
      matchedPath: bestMatch.path,
    };
  }

  /**
   * Collect candidate elements that match a predicate function
   * This replaces the repeated pattern of forEach + candidates.push()
   *
   * @param ast - The jscodeshift AST
   * @param possibleNames - Array of possible tag names to match
   * @param textMatcher - Function to check if an element matches the text requirement
   * @returns Array of candidates
   */
  protected collectCandidateElements(
    ast: any,
    possibleNames: string[],
    textMatcher: (node: any, children: any[]) => boolean
  ): ElementMatchCandidate[] {
    const candidates: ElementMatchCandidate[] = [];

    ast.findJSXElements().forEach((path: any) => {
      const { node } = path;
      const nodeName =
        node.openingElement?.name?.name ||
        node.openingElement?.name?.object?.name;

      if (possibleNames.includes(nodeName)) {
        const children = node.children || [];

        if (textMatcher(node, children)) {
          candidates.push(createCandidate(node, path));
        }
      }
    });

    return candidates;
  }

  protected removeNodeFromAst(target: ElementMatchContext): boolean {
    const matchedPath: any = target.matchedPath;
    if (typeof matchedPath?.prune === "function") {
      const parentPath = matchedPath.parent;
      matchedPath.prune();
      this.pruneEmptyAncestors(parentPath);
      return true;
    }

    if (matchedPath?.parent) {
      const parent = matchedPath.parent;
      const parentChildren = parent.value.children;
      parent.value.children = parentChildren.filter(
        (child: any) => child !== target.matchedNode
      );
      this.pruneEmptyAncestors(parent);
      return true;
    }

    return false;
  }

  private pruneEmptyAncestors(path: any): void {
    let current = path;

    while (current && current.value) {
      const node = current.value;

      if (
        node.type !== "JSXElement" &&
        node.type !== "JSXFragment"
      ) {
        break;
      }

      const children = node.children || [];
      const hasMeaningfulChild = children.some((child: any) => {
        if (!child) {
          return false;
        }
        if (child.type === "JSXText") {
          return child.value && child.value.trim().length > 0;
        }
        return true;
      });

      if (hasMeaningfulChild) {
        break;
      }

      if (typeof current.prune === "function") {
        const parent = current.parent;
        current.prune();
        current = parent;
        continue;
      }

      if (current.parent?.value?.children) {
        current.parent.value.children = current.parent.value.children.filter(
          (child: any) => child !== node
        );
        current = current.parent;
        continue;
      }

      break;
    }
  }

  protected async writeFormattedSource(
    filePath: string,
    ast: any,
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

  protected sanitizeClassTokens(className?: string): Set<string> {
    if (!className) {
      return new Set();
    }

    return new Set(
      className
        .split(/\s+/)
        .map((token) => token.trim().toLowerCase())
        .filter(
          (token) =>
            token &&
            !token.startsWith("brakit-") &&
            token !== "brakit-reorderable" &&
            token !== "brakit-shake"
        )
    );
  }

  protected collectNodeTextInfo(
    children: any[]
  ): { text: string; hasDynamicContent: boolean } {
    const parts: string[] = [];
    let hasDynamicContent = false;

    for (const child of children) {
      if (!child) {
        continue;
      }

      if (child.type === "JSXText" && child.value) {
        parts.push(child.value);
        continue;
      }

      if (child.type === "JSXExpressionContainer") {
        const expression = child.expression;
        if (!expression || expression.type === "JSXEmptyExpression") {
          continue;
        }

        const value = this.extractStringValue(expression);
        if (value) {
          parts.push(value);
        } else {
          hasDynamicContent = true;
        }
        continue;
      }

      if (child.type === "JSXElement") {
        const nestedInfo = this.collectNodeTextInfo(child.children || []);
        if (nestedInfo.text) {
          parts.push(nestedInfo.text);
        }
        if (nestedInfo.hasDynamicContent) {
          hasDynamicContent = true;
        }
        continue;
      }

      const value = this.extractStringValue(child);
      if (value) {
        parts.push(value);
      }
    }

    return {
      text: parts.join(""),
      hasDynamicContent,
    };
  }

  protected extractNodeText(children: any[]): string {
    const { text } = this.collectNodeTextInfo(children);
    return this.normalizeText(text);
  }

  protected hasClassOverlap(
    targetTokens: Set<string>,
    nodeTokens: Set<string>
  ): boolean {
    if (targetTokens.size === 0 || nodeTokens.size === 0) {
      return false;
    }

    for (const token of targetTokens) {
      if (nodeTokens.has(token)) {
        return true;
      }
    }

    return false;
  }
}
