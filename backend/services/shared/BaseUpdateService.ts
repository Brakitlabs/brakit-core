import fs from "fs";
import path from "path";
import jscodeshift from "jscodeshift";
import type {
  ASTPath,
  Collection,
  JSXAttribute,
  JSXElement,
  JSXExpressionContainer,
  JSXFragment,
  JSXIdentifier,
  JSXSpreadAttribute,
  JSXSpreadChild,
  JSXText,
  Literal,
  TemplateLiteral,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
  JSXNamespacedName,
  JSXMemberExpression,
} from "jscodeshift";
import type { namedTypes } from "ast-types";
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
} from "./elementMatcher/index";
import { resolveFilePath as resolveFilePathUtil } from "../../utils/fileResolver";
import { normalizeText as normalizeTextUtil } from "./textUtils";
import { actionHistory } from "../history";

const COMPONENT_FILE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];
const STYLE_PROP_SET = new Set(STYLE_PROPS);

type JSXChildNode =
  | JSXElement
  | JSXFragment
  | JSXText
  | JSXExpressionContainer
  | JSXSpreadChild
  | Literal
  | namedTypes.Node
  | null
  | undefined;

type ParsedAst = Collection<JSXElement>;

function resolveJSXElementName(
  nameNode:
    | JSXIdentifier
    | JSXNamespacedName
    | JSXMemberExpression
    | null
    | undefined
): string | undefined {
  if (!nameNode) {
    return undefined;
  }

  if (nameNode.type === "JSXIdentifier") {
    return nameNode.name;
  }

  if (nameNode.type === "JSXNamespacedName") {
    return nameNode.name.name;
  }

  if (nameNode.type === "JSXMemberExpression") {
    const object = nameNode.object;
    if (object.type === "JSXIdentifier") {
      return object.name;
    }
  }

  return undefined;
}

export interface ElementMatchContext {
  filePath: string;
  ast: ParsedAst;
  matchedNode: JSXElement;
  matchedPath: ASTPath<JSXElement>;
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

import { ComponentResolver } from "../core/ComponentResolver";
import { ASTQueryEngine } from "../core/ASTQueryEngine";
import { ASTMutationEngine } from "../core/ASTMutationEngine";
import { ElementLocator } from "../core/ElementLocator";
import { TextMatcherService } from "../core/TextMatcherService";
import {
  extractDynamicClasses,
  sanitizeClassTokens,
  hasClassOverlap,
} from "./elementMatcher/index";

/**
 * Base service for AST-based updates to React/JSX files.
 * Provides core functionality for locating, analyzing, and modifying JSX elements.
 *
 * Architecture:
 * - ComponentResolver: Locates component files
 * - ASTQueryEngine: Reads and traverses ASTs
 * - ASTMutationEngine: Modifies and writes ASTs
 * - ElementLocator: Finds elements by various criteria
 * - TextMatcherService: Extracts and matches text content
 */
export abstract class BaseUpdateService {
  protected projectRoot: string;
  protected componentResolver: ComponentResolver;
  protected astQueryEngine: ASTQueryEngine;
  protected astMutationEngine: ASTMutationEngine;
  protected elementLocator: ElementLocator;
  protected textMatcher: TextMatcherService;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.componentResolver = new ComponentResolver(projectRoot);
    this.astQueryEngine = new ASTQueryEngine(projectRoot);
    this.astMutationEngine = new ASTMutationEngine();
    this.elementLocator = new ElementLocator();
    this.textMatcher = new TextMatcherService();
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
    ast: ParsedAst,
    matchedNode: JSXElement,
    matchedPath: ASTPath<JSXElement>
  ): ElementMatchContext {
    const attributes: Array<
      JSXAttribute | JSXSpreadAttribute | null | undefined
    > = matchedNode.openingElement?.attributes || [];

    const usagePropNames = Array.from(
      new Set(
        attributes
          .map((attr) =>
            attr && "name" in attr ? (attr.name as JSXIdentifier | null) : null
          )
          .map((identifier) => identifier?.name)
          .filter((name: string | undefined): name is string => Boolean(name))
      )
    );

    const elementName = resolveJSXElementName(matchedNode.openingElement?.name);

    const hasInlineClassName = attributes.some(
      (attr): attr is JSXAttribute =>
        attr?.type === "JSXAttribute" && attr.name?.name === "className"
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
    ast: ParsedAst;
    possibleNames: string[];
    matcher: (node: JSXElement, children: JSXChildNode[]) => boolean;
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

    const candidates = this.collectCandidateElements(
      ast,
      possibleNames,
      matcher
    );
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
  ): (node: JSXElement, children: JSXChildNode[]) => boolean {
    const normalizedIdentifier = this.normalizeText(options.identifier ?? "");
    const normalizedText = this.normalizeText(options.textContent ?? "");
    const elementTagHint = options.elementTag
      ? this.normalizeText(options.elementTag)
      : "";
    const componentNameHint = options.componentNameHint
      ? this.normalizeText(options.componentNameHint)
      : "";
    const classTokens = this.sanitizeClassTokens(options.className);

    return (node: JSXElement, children: JSXChildNode[]) => {
      const nodeName = resolveJSXElementName(node.openingElement?.name);
      const normalizedNodeName = nodeName ? this.normalizeText(nodeName) : "";

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

      const attributes: Array<
        JSXAttribute | JSXSpreadAttribute | null | undefined
      > = node.openingElement?.attributes || [];
      for (const attr of attributes) {
        if (!attr || attr.type !== "JSXAttribute") {
          continue;
        }

        const attrName = attr.name?.name;
        const value = this.extractStringValue(attr.value as any);
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

  // ========== COMPONENT RESOLUTION ==========

  /**
   * Resolve where a component is being used (locally or in external file)
   */
  protected resolveComponentUsage(
    text: string,
    ast: ParsedAst,
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
    ast: ParsedAst;
    possibleNames: string[];
  } | null {
    const { usageFilePath, componentName, tag, componentFileOverride } =
      options;

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
    node: namedTypes.Node | null | undefined,
    propNames: Set<string>
  ): boolean {
    if (!node) {
      return false;
    }

    switch (node.type) {
      case "Identifier": {
        const identifier = node as namedTypes.Identifier;
        return propNames.has(identifier.name);
      }
      case "MemberExpression": {
        const member = node as namedTypes.MemberExpression;
        const object = member.object as namedTypes.Node | null | undefined;
        const property = member.property as namedTypes.Node | null | undefined;

        if (object?.type === "Identifier") {
          const objIdentifier = object as namedTypes.Identifier;
          if (
            propNames.has(objIdentifier.name) ||
            objIdentifier.name === "props"
          ) {
            if (
              !member.computed &&
              property?.type === "Identifier" &&
              propNames.has((property as namedTypes.Identifier).name)
            ) {
              return true;
            }
            return true;
          }
        }

        if (this.expressionReferencesProps(object, propNames)) {
          return true;
        }

        if (property && this.expressionReferencesProps(property, propNames)) {
          return true;
        }

        return false;
      }
      case "CallExpression": {
        const call = node as namedTypes.CallExpression;
        if (
          this.expressionReferencesProps(
            call.callee as namedTypes.Node,
            propNames
          )
        ) {
          return true;
        }
        return call.arguments?.some((arg) =>
          this.expressionReferencesProps(arg as namedTypes.Node, propNames)
        );
      }
      case "TemplateLiteral": {
        const template = node as namedTypes.TemplateLiteral;
        return template.expressions?.some((expr) =>
          this.expressionReferencesProps(expr as namedTypes.Node, propNames)
        );
      }
      case "BinaryExpression":
      case "LogicalExpression": {
        const binary = node as namedTypes.BinaryExpression;
        return (
          this.expressionReferencesProps(
            binary.left as namedTypes.Node,
            propNames
          ) ||
          this.expressionReferencesProps(
            binary.right as namedTypes.Node,
            propNames
          )
        );
      }
      case "ConditionalExpression": {
        const conditional = node as namedTypes.ConditionalExpression;
        return (
          this.expressionReferencesProps(
            conditional.test as namedTypes.Node,
            propNames
          ) ||
          this.expressionReferencesProps(
            conditional.consequent as namedTypes.Node,
            propNames
          ) ||
          this.expressionReferencesProps(
            conditional.alternate as namedTypes.Node,
            propNames
          )
        );
      }
      case "ArrayExpression": {
        const arrayExpr = node as namedTypes.ArrayExpression;
        return arrayExpr.elements?.some((el) =>
          this.expressionReferencesProps(el as namedTypes.Node, propNames)
        );
      }
      case "ObjectExpression": {
        const objectExpr = node as namedTypes.ObjectExpression;
        return objectExpr.properties?.some((prop) => {
          if (!prop) {
            return false;
          }
          if (prop.type === "Property") {
            return this.expressionReferencesProps(
              (prop as namedTypes.Property).value as namedTypes.Node,
              propNames
            );
          }
          if (prop.type === "SpreadElement") {
            return this.expressionReferencesProps(
              (prop as namedTypes.SpreadElement).argument as namedTypes.Node,
              propNames
            );
          }
          return false;
        });
      }
      case "UnaryExpression":
      case "UpdateExpression":
      case "AwaitExpression":
      case "YieldExpression":
      case "TSNonNullExpression":
      case "TSAsExpression":
      case "TypeCastExpression":
      case "ParenthesizedExpression": {
        const expr = node as namedTypes.Node & {
          argument?: namedTypes.Node;
          expression?: namedTypes.Node;
        };
        return this.expressionReferencesProps(
          expr.argument ?? expr.expression,
          propNames
        );
      }
      case "AssignmentExpression": {
        const assignment = node as namedTypes.AssignmentExpression;
        return (
          this.expressionReferencesProps(
            assignment.left as namedTypes.Node,
            propNames
          ) ||
          this.expressionReferencesProps(
            assignment.right as namedTypes.Node,
            propNames
          )
        );
      }
      case "JSXExpressionContainer": {
        const jsxExpr = node as JSXExpressionContainer;
        return this.expressionReferencesProps(
          jsxExpr.expression as namedTypes.Node,
          propNames
        );
      }
      case "JSXElement": {
        const jsxElement = node as JSXElement;
        return !!jsxElement.children?.some((child: JSXChildNode) =>
          child?.type === "JSXExpressionContainer"
            ? this.expressionReferencesProps(
                (child as JSXExpressionContainer).expression as namedTypes.Node,
                propNames
              )
            : false
        );
      }
    }

    return false;
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
    const normalizedLookup = this.normalizeText(options.lookupText);

    if (!normalizedLookup) {
      const hintedEarly = this.resolveFileFromOwnerHints({
        requestedSourcePath,
        ownerComponentName: options.ownerComponentName,
        ownerFilePath: options.ownerFilePath,
      });

      if (hintedEarly) {
        return hintedEarly;
      }
    }

    const localMatch = await this.findFileForText(
      normalizedLookup,
      options.tag,
      options.file,
      options.serviceName
    );

    if (localMatch) {
      return localMatch;
    }

    const hinted = this.resolveFileFromOwnerHints({
      requestedSourcePath,
      ownerComponentName: options.ownerComponentName,
      ownerFilePath: options.ownerFilePath,
    });

    if (hinted) {
      return hinted;
    }

    if (options.ownerComponentName) {
      const componentFile = this.findComponentFileByName(
        options.ownerComponentName
      );
      if (componentFile && fs.existsSync(componentFile)) {
        return componentFile;
      }
    }

    return null;
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
    return this.astQueryEngine.fileContainsText(
      filePath,
      text,
      possibleTags,
      options
    );
  }

  // ========== AST PARSING & QUERIES ==========

  /**
   * Parse AST and find matching JSX elements
   */
  protected parseAndFindElements(
    source: string,
    tag: string
  ): { ast: ParsedAst; possibleNames: string[] } {
    const possibleNames = this.getPossibleTagNames(tag);
    const { ast } = this.astQueryEngine.parseAndFindElements(
      source,
      tag,
      possibleNames
    );
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
  ): (node: JSXElement, children: JSXChildNode[]) => boolean {
    const normalizedTarget = this.normalizeText(targetText);
    const targetClassTokens = this.sanitizeClassTokens(targetClassName);
    const additionalClassTokens =
      this.sanitizeClassTokens(additionalClassMatch);

    return (node: JSXElement, children: JSXChildNode[]) => {
      let textMatched = false;
      const textInfo = this.collectNodeTextInfo(children);
      const normalizedCombinedText = this.normalizeText(textInfo.text);
      const hasDynamicContent = textInfo.hasDynamicContent;

      if (
        normalizedTarget.length > 0 &&
        normalizedCombinedText === normalizedTarget
      ) {
        textMatched = true;
      } else if (
        normalizedTarget.length > 0 &&
        hasDynamicContent &&
        normalizedCombinedText.length > 0 &&
        (normalizedTarget.startsWith(normalizedCombinedText) ||
          normalizedCombinedText.startsWith(normalizedTarget))
      ) {
        // Allow prefix/suffix match when content is partially dynamic (e.g., "Box 2" vs "Box __DYNAMIC__")
        textMatched = true;
      }

      // If no text match, try matching by className when we have enough context
      if (
        !textMatched &&
        (hasDynamicContent || normalizedCombinedText.length === 0) &&
        (targetClassTokens.size > 0 || additionalClassTokens.size > 0)
      ) {
        const classAttr = node.openingElement.attributes?.find(
          (attr): attr is JSXAttribute =>
            attr?.type === "JSXAttribute" && attr.name?.name === "className"
        );
        const nodeClassTokens = this.extractClassTokensFromAttribute(classAttr);
        if (nodeClassTokens.size > 0) {
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

      return textMatched;
    };
  }

  /**
   * Extract a static string value from an AST node
   */
  protected extractStringValue(
    node:
      | Literal
      | TemplateLiteral
      | JSXExpressionContainer
      | JSXText
      | namedTypes.Node
      | null
      | undefined
  ): string | null {
    return this.textMatcher.extractStringValue(node as any);
  }

  // ========== COMPONENT USAGE QUERIES ==========

  protected findComponentUsageByText(
    ast: ParsedAst,
    text: string
  ): ComponentUsageMatch | null {
    return this.astQueryEngine.findComponentUsageByText(ast, text);
  }

  protected findComponentUsageInProject(
    text: string
  ): ProjectComponentUsageMatch | null {
    return this.astQueryEngine.findComponentUsageInProject(text);
  }

  protected findComponentFileByName(componentName: string): string | null {
    return this.componentResolver.findComponentFileByName(componentName);
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
    return this.componentResolver.resolveComponentFilePath(
      sourceFilePath,
      componentName
    );
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

  // ========== ELEMENT MATCHING & SELECTION ==========

  /**
   * Select the best matching element from candidates using sophisticated scoring
   */
  protected selectBestMatchingElement(
    candidates: ElementMatchCandidate[],
    className: string,
    text: string,
    serviceName: string
  ): { matchedNode: JSXElement; matchedPath: ASTPath<JSXElement> } | null {
    return this.elementLocator.selectBestMatchingElement(
      candidates,
      className,
      text,
      serviceName
    );
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
    ast: ParsedAst,
    possibleNames: string[],
    textMatcher: (node: JSXElement, children: JSXChildNode[]) => boolean
  ): ElementMatchCandidate[] {
    return this.astQueryEngine.collectCandidateElements(
      ast,
      possibleNames,
      textMatcher
    );
  }

  // ========== AST MUTATION & FILE I/O ==========

  /**
   * Remove a matched element from the AST
   */
  protected removeNodeFromAst(target: ElementMatchContext): boolean {
    return this.astMutationEngine.removeNodeFromAst(
      target.matchedPath,
      target.matchedPath.parent
    );
  }

  protected async writeFormattedSource(
    filePath: string,
    ast: { toSource(): string },
    originalSource: string
  ): Promise<boolean> {
    return this.astMutationEngine.writeFormattedSource(
      filePath,
      ast,
      originalSource
    );
  }

  protected sanitizeClassTokens(className?: string): Set<string> {
    return sanitizeClassTokens(className);
  }

  protected extractClassTokensFromExpression(
    expr: namedTypes.Node | null | undefined
  ): Set<string> {
    const classes = extractDynamicClasses(expr);
    return this.sanitizeClassTokens(classes.join(" "));
  }

  protected extractClassTokensFromAttribute(
    attr: JSXAttribute | JSXSpreadAttribute | null | undefined
  ): Set<string> {
    if (
      !attr ||
      attr.type !== "JSXAttribute" ||
      attr.name?.name !== "className"
    ) {
      return new Set();
    }

    const value = (attr as JSXAttribute).value as
      | Literal
      | TemplateLiteral
      | JSXExpressionContainer
      | null
      | undefined;

    if (!value) {
      return new Set();
    }

    if (value.type === "Literal") {
      return this.sanitizeClassTokens(
        typeof (value as Literal).value === "string"
          ? ((value as Literal).value as string)
          : ""
      );
    }

    if ((value as any).type === "StringLiteral") {
      const stringVal = (value as any).value;
      return this.sanitizeClassTokens(
        typeof stringVal === "string" ? (stringVal as string) : ""
      );
    }

    if (value.type === "JSXExpressionContainer") {
      return this.extractClassTokensFromExpression(
        (value as JSXExpressionContainer).expression as namedTypes.Node
      );
    }

    return new Set();
  }

  /**
   * Collect text content info from JSX children
   */
  protected collectNodeTextInfo(children: JSXChildNode[]): {
    text: string;
    hasDynamicContent: boolean;
  } {
    return this.textMatcher.collectNodeTextInfo(children);
  }

  /**
   * Extract and normalize text from JSX children
   */
  protected extractNodeText(children: JSXChildNode[]): string {
    return this.textMatcher.extractNodeText(children);
  }

  // ========== CLASS UTILITIES ==========

  protected hasClassOverlap(
    targetTokens: Set<string>,
    nodeTokens: Set<string>
  ): boolean {
    return hasClassOverlap(targetTokens, nodeTokens);
  }
}
