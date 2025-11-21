import { getReactSourceInfo } from "../utils/reactSource";
import {
  collectElementMetadata,
  extractPrimaryText,
  sanitizeClassList,
} from "../utils/elementMetadata";
import type { DeletePayload, EditRequestPayload } from "../services/backendClient";
import type {
  SanitizedElementInfo,
  ResolvedSourceInfo,
} from "../core/processors/selection";
import type { DrawAreaContext } from "../core/draw/drawContext";
import type { SpatialMapPayload } from "../spatial/types";

export interface BuildDeletePayloadOptions {
  element: HTMLElement;
  sourceFileOverride?: string;
}

export interface BuildEditPayloadOptions {
  instruction: string;
  elementInfo: SanitizedElementInfo;
  drawAreaContext?: DrawAreaContext | null;
  spatialContext?: SpatialMapPayload;
  fileOverride?: string;
}

export interface BuildErrorPayloadOptions {
  instruction: string;
  errorMessage: string;
}

export type ResolvedElementSource = ResolvedSourceInfo;

export class ElementPayloadService {
  buildDeletePayload(options: BuildDeletePayloadOptions): DeletePayload {
    const { element, sourceFileOverride } = options;

    if (this.isClientComponent(element)) {
      return this.buildClientDeletePayload(element, sourceFileOverride);
    }

    return this.buildServerDeletePayload(element, sourceFileOverride);
  }

  buildEditPayload(options: BuildEditPayloadOptions): EditRequestPayload {
    const {
      instruction,
      elementInfo,
      drawAreaContext,
      spatialContext,
      fileOverride,
    } = options;

    const context: Record<string, unknown> = {
      element: elementInfo,
      reactSource: elementInfo.reactSource,
      timestamp: new Date().toISOString(),
    };

    if (drawAreaContext) {
      context.drawArea = drawAreaContext;
    }

    if (spatialContext) {
      context.spatial = spatialContext;
    }

    return {
      instruction,
      file: fileOverride || window.location.pathname,
      elementSelector: elementInfo.selector || undefined,
      context,
    };
  }

  buildErrorPayload(options: BuildErrorPayloadOptions): EditRequestPayload {
    const { instruction, errorMessage } = options;

    return {
      instruction,
      file: window.location.pathname,
      context: {
        isErrorFix: true,
        errorMessage,
        timestamp: new Date().toISOString(),
      },
    };
  }

  resolveElementSource(
    element: HTMLElement,
    existingInfo?: SanitizedElementInfo | null
  ): ResolvedElementSource | null {
    const reactInfo = getReactSourceInfo(element);
    const existingReact = existingInfo?.reactSource;

    const filePath =
      reactInfo.fileName || existingReact?.fileName || undefined;
    const lineNumber =
      reactInfo.lineNumber ?? existingReact?.lineNumber ?? undefined;
    let componentName =
      reactInfo.componentName ?? existingReact?.componentName ?? undefined;
    const domTag = element.tagName?.toLowerCase?.() || "";
    if (componentName && componentName.toLowerCase() === domTag) {
      componentName = undefined;
    }

    if (!filePath) {
      const fallback = this.inferSourceFile();
      return {
        filePath: fallback,
        displayPath: this.toDisplayPath(fallback),
        lineNumber,
        componentName,
        inferred: true,
      };
    }

    return {
      filePath,
      displayPath: this.toDisplayPath(filePath),
      lineNumber,
      componentName,
      inferred: false,
    };
  }

  buildErrorInstruction(errorMessage: string): string {
    const cleanMessage = errorMessage
      .replace(/^.*?Ecmascript file had an error/s, "")
      .replace(/Learn more:.*$/s, "")
      .trim();

    return `Fix this error:\n${cleanMessage}\n\nAdd any additional context if needed:`;
  }

  formatElementTag(info: SanitizedElementInfo): string {
    const tag = info.tagName.toLowerCase();
    const idSegment = info.id ? `#${info.id}` : "";
    const classTokens = info.className
      ? info.className
          .split(/\s+/)
          .filter((token) => token && !token.startsWith("brakit-"))
      : [];
    const classSegment =
      classTokens.length > 0 ? `.${classTokens.join(".")}` : "";

    return `${tag}${idSegment}${classSegment}`;
  }

  buildTargetDescriptor(info: SanitizedElementInfo): {
    summary: string;
    details: string[];
  } {
    const tag = info.tagName?.toLowerCase?.() || "element";
    const componentName = info.resolvedSource?.componentName;
    const textSnippet = info.textContent
      ? this.truncateForDisplay(info.textContent, 80)
      : "";

    let summary: string;
    if (textSnippet) {
      summary = `“${textSnippet}”`;
    } else if (componentName) {
      summary = componentName;
    } else {
      summary = `<${tag}> element`;
    }

    const details: string[] = [];
    details.push(`Tag · <${tag}>`);

    if (componentName && componentName !== summary) {
      details.push(`Component · ${componentName}`);
    }

    if (info.className) {
      details.push(`Classes · ${info.className}`);
    }

    if (info.id) {
      details.push(`ID · #${info.id}`);
    }

    if (textSnippet) {
      details.push(`Text · "${textSnippet}"`);
    }

    const displayPath = info.resolvedSource?.displayPath;
    if (displayPath) {
      details.push(`File · ${displayPath}`);
    }

    if (info.selector) {
      details.push(`Selector · ${info.selector}`);
    }

    return {
      summary,
      details,
    };
  }

  inferSpatialAction(instruction: string): SpatialMapPayload["action"] {
    const normalized = instruction.toLowerCase();
    const insertKeywords = [
      "add",
      "insert",
      "create",
      "place",
      "drop",
      "include",
      "append",
      "put",
      "embed",
      "build",
      "render",
    ];
    const editKeywords = [
      "update",
      "change",
      "modify",
      "adjust",
      "tweak",
      "replace",
      "remove",
      "delete",
      "eliminate",
      "clean",
      "strip",
    ];

    if (editKeywords.some((keyword) => normalized.includes(keyword))) {
      return "edit_component";
    }

    if (insertKeywords.some((keyword) => normalized.includes(keyword))) {
      return "insert_component";
    }

    return "insert_component";
  }

  private truncateForDisplay(value: string, maxLength = 80): string {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length <= maxLength) {
      return normalized;
    }
    return `${normalized.slice(0, maxLength - 1)}…`;
  }

  private buildClientDeletePayload(
    element: HTMLElement,
    sourceFileOverride?: string
  ): DeletePayload {
    const reactInfo = getReactSourceInfo(element);
    const metadata = collectElementMetadata(element);
    const isMainComponent = this.isMainComponent(
      reactInfo.componentName,
      reactInfo.fileName
    );
    const componentName =
      isMainComponent || !reactInfo.componentName
        ? metadata.elementTag
        : reactInfo.componentName;
    const sourceFile =
      reactInfo.fileName || sourceFileOverride || this.inferSourceFile();
    const elementIdentifier = this.createElementIdentifier(
      element,
      componentName
    );

    return {
      sourceFile,
      componentName,
      elementIdentifier,
      elementTag: metadata.elementTag,
      className: metadata.className,
      textContent: metadata.textContent,
      ownerComponentName:
        metadata.ownerComponentName ?? reactInfo.componentName ?? undefined,
      ownerFilePath:
        metadata.ownerFilePath ?? reactInfo.fileName ?? undefined,
    };
  }

  private buildServerDeletePayload(
    element: HTMLElement,
    sourceFileOverride?: string
  ): DeletePayload {
    const metadata = collectElementMetadata(element);
    const elementIdentifier = this.createElementIdentifier(
      element,
      metadata.elementTag
    );
    const sourceFile = sourceFileOverride ?? this.inferSourceFile();

    return {
      sourceFile,
      componentName: metadata.elementTag,
      elementIdentifier,
      elementTag: metadata.elementTag,
      className: metadata.className,
      textContent: metadata.textContent,
    };
  }

  private createElementIdentifier(
    element: HTMLElement,
    fallback: string
  ): string {
    const elementText = extractPrimaryText(element);
    const elementClasses = sanitizeClassList(element.className);
    const MAX_IDENTIFIER_LENGTH = 200;

    if (elementText) {
      const normalizedText =
        elementText.length > MAX_IDENTIFIER_LENGTH
          ? elementText.substring(0, MAX_IDENTIFIER_LENGTH)
          : elementText;
      return normalizedText.trim();
    }

    if (elementClasses) {
      return `.${elementClasses.replace(/\s+/g, ".")}`;
    }

    return fallback;
  }

  private inferSourceFile(): string {
    const path = window.location.pathname;
    if (path === "/" || path === "") {
      return "page";
    }
    return path.replace(/^\//, "").replace(/\/$/, "") || "page";
  }

  private isClientComponent(element: HTMLElement): boolean {
    const keys = Object.keys(element);
    const fiberKey = keys.find((k) => k.startsWith("__reactFiber$"));
    return Boolean(fiberKey);
  }

  private isMainComponent(
    componentName?: string,
    fileName?: string
  ): boolean {
    if (!componentName) {
      return false;
    }

    const normalizedName = this.normalizeComponentName(componentName);
    const inferredRoute = this.inferSourceFile();
    const routeLeaf = this.extractRouteLeaf(inferredRoute);
    const nameCandidates = this.buildMainComponentNameCandidates(routeLeaf);
    const isLikelyMainName = nameCandidates.has(normalizedName);

    if (!fileName) {
      return isLikelyMainName;
    }

    const isMainFile = this.isMainComponentFilePath(fileName);
    const result = isLikelyMainName && isMainFile;

    return result;
  }

  private normalizeComponentName(value?: string): string {
    return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  private extractRouteLeaf(route: string): string {
    const segments = route.split("/").filter(Boolean);
    if (segments.length === 0) {
      return route || "page";
    }
    return segments[segments.length - 1];
  }

  private buildMainComponentNameCandidates(routeLeaf: string): Set<string> {
    const normalizedRoute = this.normalizeComponentName(routeLeaf);
    const candidates = new Set<string>([
      normalizedRoute,
      this.normalizeComponentName("page"),
      this.normalizeComponentName("app"),
      this.normalizeComponentName("layout"),
      this.normalizeComponentName("home"),
      this.normalizeComponentName("homepage"),
      this.normalizeComponentName("index"),
    ]);

    if (normalizedRoute) {
      candidates.add(this.normalizeComponentName(`${routeLeaf}Page`));
      candidates.add(this.normalizeComponentName(`${routeLeaf}Layout`));
    }

    return candidates;
  }

  private isMainComponentFilePath(fileName: string): boolean {
    const normalized = fileName.toLowerCase();
    return (
      normalized.includes("page.tsx") ||
      normalized.includes("layout.tsx") ||
      normalized.includes("app.tsx")
    );
  }

  private toDisplayPath(filePath: string): string {
    const normalized = filePath.replace(/\\/g, "/");
    const markers = ["/src/", "/app/", "/pages/", "/components/"];

    for (const marker of markers) {
      const index = normalized.lastIndexOf(marker);
      if (index >= 0) {
        return normalized.substring(index + 1);
      }
    }

    const segments = normalized.split("/");
    return segments.slice(-3).join("/");
  }
}
