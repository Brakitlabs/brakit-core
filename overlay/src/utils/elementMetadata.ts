import { getReactSourceInfo } from "./reactSource";

export interface ElementMetadata {
  elementTag: string;
  className: string;
  textContent: string;
  ownerComponentName?: string;
  ownerFilePath?: string;
}

export interface SmartEditMetadata extends ElementMetadata {
  element: HTMLElement;
  filePath: string;
}

export function collectElementMetadata(element: HTMLElement): ElementMetadata {
  const reactInfo = getReactSourceInfo(element);
  const elementTag = element.tagName?.toLowerCase?.() || "";

  return {
    elementTag,
    className: sanitizeClassList(element.className),
    textContent: extractPrimaryText(element),
    ownerComponentName: reactInfo.componentName || undefined,
    ownerFilePath: reactInfo.fileName || undefined,
  };
}

export function buildSmartEditMetadata(
  element: HTMLElement,
  fallbackClassName?: string
): SmartEditMetadata {
  const reactInfo = getReactSourceInfo(element);
  const metadata = collectElementMetadata(element);

  const filePath =
    metadata.ownerFilePath ||
    reactInfo.fileName ||
    element.ownerDocument?.location?.pathname ||
    "/";

  return {
    element,
    filePath,
    elementTag: metadata.elementTag,
    textContent: metadata.textContent,
    className: fallbackClassName
      ? sanitizeClassList(fallbackClassName)
      : metadata.className,
    ownerComponentName:
      metadata.ownerComponentName || reactInfo.componentName || undefined,
    ownerFilePath: metadata.ownerFilePath || reactInfo.fileName || undefined,
  };
}

export function sanitizeClassList(className: string): string {
  if (!className || typeof className !== "string") {
    return "";
  }

  return className
    .split(/\s+/)
    .filter(
      (cls) =>
        cls &&
        !cls.startsWith("brakit-") &&
        cls !== "brakit-reorderable" &&
        cls !== "brakit-shake"
    )
    .join(" ");
}

export function extractPrimaryText(element: HTMLElement): string {
  const raw =
    element.textContent ??
    element.innerText ??
    "";
  const segments = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const combined = segments.join(" ");
  const MAX_LENGTH = 500;
  return combined.length > MAX_LENGTH
    ? combined.substring(0, MAX_LENGTH)
    : combined;
}
