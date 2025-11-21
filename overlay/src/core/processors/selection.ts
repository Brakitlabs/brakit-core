import { ElementInfo } from "../../utils/reactSource";

export interface ResolvedSourceInfo {
  filePath: string;
  displayPath: string;
  lineNumber?: number;
  componentName?: string;
  inferred?: boolean;
}

export type SanitizedElementInfo = ElementInfo & {
  className: string;
  selector: string;
  outerHTMLSnapshot?: string;
  resolvedSource?: ResolvedSourceInfo | null;
};

export function sanitizeSelector(selector: string | undefined): string {
  if (!selector) {
    return "";
  }
  return selector
    .replace(/\.brakit-selected/g, "")
    .replace(/:nth-child\(\d+\)/g, "");
}

export function sanitizeElementDetails(
  info: ElementInfo
): SanitizedElementInfo {
  const classTokens = (info.className || "")
    .split(/\s+/)
    .filter(
      (token) =>
        token && token !== "brakit-selected" && !token.startsWith("brakit-")
    );

  const sanitizedReactSource = info.reactSource
    ? {
        fileName: info.reactSource.fileName,
        lineNumber: info.reactSource.lineNumber,
        componentName: info.reactSource.componentName,
      }
    : info.reactSource;

  return {
    ...info,
    className: classTokens.join(" "),
    selector: sanitizeSelector(info.selector),
    outerHTMLSnapshot: info.outerHTMLSnapshot,
    reactSource: sanitizedReactSource,
  };
}
