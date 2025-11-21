export interface ReactSourceInfo {
  fileName?: string;
  lineNumber?: number;
  componentName?: string;
  props?: any;
}

const reactSourceCache = new WeakMap<HTMLElement, ReactSourceInfo>();
const SKIP_PROP_KEYS = new Set(["children", "key", "ref", "__self", "__source"]);
const MAX_PROP_DEPTH = 2;
const MAX_PROP_KEYS = 12;
const MAX_PROP_ARRAY_ITEMS = 6;
const MAX_PROP_STRING_LENGTH = 120;
const FRAMEWORK_COMPONENT_PATTERNS = [
  /^Anonymous/,
  /^Route(App)?/,
  /^Inner/,
  /^AppRouter/,
  /^LayoutRouter/,
  /^NotFound/,
];
const FRAMEWORK_FILE_HINTS = [
  "node_modules",
  ".next",
  "next/dist",
  "next-dev",
  "react-dom",
];

/**
 * Extracts React source information from a DOM element
 * Works with React DevTools in development mode
 */
export function getReactSourceInfo(element: HTMLElement): ReactSourceInfo {
  const cached = reactSourceCache.get(element);
  if (cached) {
    return cached;
  }

  const sourceInfo: ReactSourceInfo = {};
  const maxTraverse = 20;
  const maxDomTraverse = 10;

  try {
    const reactFiber = getReactFiber(element);

    if (reactFiber) {
      let currentFiber = reactFiber;
      let traverseCount = 0;
      let preferredComponentName: string | undefined;

      while (currentFiber && traverseCount < maxTraverse) {
        const source = extractSourceFromFiber(currentFiber);
        if (source && !isFrameworkFile(source.fileName)) {
          sourceInfo.fileName = source.fileName;
          sourceInfo.lineNumber = source.lineNumber;

          const componentName = getComponentDisplayName(currentFiber);
          if (
            componentName &&
            !isFrameworkComponentName(componentName)
          ) {
            sourceInfo.componentName = componentName;
          } else if (preferredComponentName) {
            sourceInfo.componentName = preferredComponentName;
          }
          break;
        }

        const componentName = getComponentDisplayName(currentFiber);

        if (componentName && typeof currentFiber.type === "function") {
          if (!preferredComponentName && !isFrameworkComponentName(componentName)) {
            preferredComponentName = componentName;
          }

          if (
            !sourceInfo.componentName ||
            isFrameworkComponentName(sourceInfo.componentName)
          ) {
            sourceInfo.componentName = componentName;
          }
        }

        currentFiber = currentFiber.return;
        traverseCount++;
      }

      if (!sourceInfo.componentName) {
        sourceInfo.componentName =
          preferredComponentName || getComponentDisplayName(reactFiber);
      } else if (
        preferredComponentName &&
        isFrameworkComponentName(sourceInfo.componentName)
      ) {
        sourceInfo.componentName = preferredComponentName;
      }

      if (!sourceInfo.fileName) {
        const fallbackSource = extractSourceFromFiber(reactFiber);
        if (fallbackSource && !isFrameworkFile(fallbackSource.fileName)) {
          sourceInfo.fileName = fallbackSource.fileName;
          sourceInfo.lineNumber = fallbackSource.lineNumber;
        }
      }

      if (reactFiber.memoizedProps) {
        const sanitizedProps = sanitizeProps(reactFiber.memoizedProps);
        if (sanitizedProps !== undefined) {
          sourceInfo.props = sanitizedProps;
        }
      }
    }

    if (!sourceInfo.fileName && (element as any).__source) {
      sourceInfo.fileName = (element as any).__source.fileName;
      sourceInfo.lineNumber = (element as any).__source.lineNumber;
    }

    if (!sourceInfo.fileName) {
      let parent = element.parentElement;
      let domTraverseCount = 0;

      while (
        parent &&
        !sourceInfo.fileName &&
        domTraverseCount < maxDomTraverse
      ) {
        const parentFiber = getReactFiber(parent);

        if (parentFiber) {
          let currentFiber = parentFiber;
          let fiberTraverseCount = 0;

          while (currentFiber && fiberTraverseCount < maxTraverse) {
            const source = extractSourceFromFiber(currentFiber);
            if (source && !isFrameworkFile(source.fileName)) {
              sourceInfo.fileName = source.fileName;
              sourceInfo.lineNumber = source.lineNumber;
              if (!sourceInfo.componentName) {
                const componentName = getComponentDisplayName(currentFiber);
                if (componentName) {
                  sourceInfo.componentName = componentName;
                }
              }
              break;
            }
            currentFiber = currentFiber.return;
            fiberTraverseCount++;
          }
        }

        if (sourceInfo.fileName) break;
        parent = parent.parentElement;
        domTraverseCount++;
      }
    }
  } catch (error) {
    console.warn("Failed to extract React source info:", error);
  }

  reactSourceCache.set(element, sourceInfo);
  return sourceInfo;
}

function getReactFiber(element: HTMLElement): any {
  // Try React 18+ approach
  if ((element as any)._reactInternals) {
    return (element as any)._reactInternals;
  }

  // Try React 17 approach
  if ((element as any)._reactInternalFiber) {
    return (element as any)._reactInternalFiber;
  }

  if ((element as any).__reactInternalInstance) {
    return (element as any).__reactInternalInstance;
  }

  const key = Object.keys(element).find(
    (key) =>
      key.startsWith("__reactInternalInstance") ||
      key.startsWith("_reactInternalFiber") ||
      key.startsWith("_reactInternals") ||
      key.startsWith("__reactFiber$")
  );

  if (key) {
    return (element as any)[key];
  }

  return null;
}

function getComponentDisplayName(fiber: any): string | undefined {
  if (!fiber) {
    return undefined;
  }

  return (
    fiber.type?.displayName ||
    fiber.type?.name ||
    fiber.elementType?.displayName ||
    fiber.elementType?.name
  );
}

function extractSourceFromFiber(
  fiber: any
): { fileName: string; lineNumber?: number } | null {
  if (!fiber) {
    return null;
  }

  const debugSource = fiber._debugSource;
  if (debugSource?.fileName) {
    return {
      fileName: normalizeFileName(debugSource.fileName),
      lineNumber: debugSource.lineNumber,
    };
  }

  const propSource = fiber.memoizedProps?.__source;
  if (propSource?.fileName) {
    return {
      fileName: normalizeFileName(propSource.fileName),
      lineNumber: propSource.lineNumber,
    };
  }

  return null;
}

function normalizeFileName(fileName: string): string {
  if (!fileName) {
    return fileName;
  }

  if (fileName.startsWith("webpack-internal:///")) {
    return fileName.replace("webpack-internal:///", "");
  }

  if (fileName.startsWith("file://")) {
    return fileName.replace("file://", "");
  }

  return fileName;
}

function isFrameworkFile(fileName?: string): boolean {
  if (!fileName) {
    return false;
  }

  return FRAMEWORK_FILE_HINTS.some((hint) => fileName.includes(hint));
}

function isFrameworkComponentName(name?: string): boolean {
  if (!name) {
    return true;
  }

  return FRAMEWORK_COMPONENT_PATTERNS.some((pattern) => pattern.test(name));
}

function sanitizeProps(
  value: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet()
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (depth > MAX_PROP_DEPTH) {
    if (typeof value === "string") {
      return truncateString(value);
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    return undefined;
  }

  if (typeof value === "string") {
    return truncateString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_PROP_ARRAY_ITEMS)
      .map((item) => sanitizeProps(item, depth + 1, seen))
      .filter((item) => item !== undefined);
    return items.length > 0 ? items : undefined;
  }

  if (typeof value === "object") {
    if (seen.has(value as object)) {
      return undefined;
    }
    seen.add(value as object);
    const output: Record<string, unknown> = {};
    let count = 0;
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SKIP_PROP_KEYS.has(key)) {
        continue;
      }
      if (count >= MAX_PROP_KEYS) {
        break;
      }
      const sanitized = sanitizeProps(val, depth + 1, seen);
      if (sanitized !== undefined) {
        output[key] = sanitized;
        count += 1;
      }
    }
    return Object.keys(output).length > 0 ? output : undefined;
  }

  return undefined;
}

function truncateString(value: string): string {
  if (value.length <= MAX_PROP_STRING_LENGTH) {
    return value;
  }
  return `${value.slice(0, MAX_PROP_STRING_LENGTH)}…`;
}

/**
 * Generates a CSS selector for an element as fallback
 */
export function generateElementSelector(element: HTMLElement): string {
  const parts: string[] = [];

  parts.push(element.tagName.toLowerCase());

  if (element.id) {
    parts.push(`#${element.id}`);
  }

  if (element.className && typeof element.className === "string") {
    const classes = element.className.trim().split(/\s+/);
    classes.forEach((cls) => {
      if (cls) parts.push(`.${cls}`);
    });
  }

  const parent = element.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(element);
    if (index > 0) {
      parts.push(`:nth-child(${index + 1})`);
    }
  }

  return parts.join("");
}

/**
 * Extracts comprehensive element information
 */
export interface ElementInfo {
  tagName: string;
  id: string;
  className: string;
  textContent?: string | null;
  selector: string;
  reactSource: ReactSourceInfo;
  boundingRect: DOMRect;
  outerHTMLSnapshot?: string;
}

export function getElementInfo(element: HTMLElement): ElementInfo {
  const reactSource = getReactSourceInfo(element);
  const selector = generateElementSelector(element);

  const rawText = element.textContent || "";
  const trimmedText = rawText.substring(0, 100);
  const textContent = rawText.length > 100 ? `${trimmedText}...` : trimmedText;

  return {
    tagName: element.tagName,
    id: element.id,
    className: element.className,
    textContent,
    selector,
    reactSource,
    boundingRect: element.getBoundingClientRect(),
    outerHTMLSnapshot: getOuterHTMLSnapshot(element),
  };
}

function getOuterHTMLSnapshot(element: HTMLElement): string | undefined {
  try {
    const clone = element.cloneNode(true) as HTMLElement;
    stripBrakitClasses(clone);
    const html = clone.outerHTML;
    return html.length > 500 ? `${html.slice(0, 500)}...` : html;
  } catch (error) {
    return undefined;
  }
}

function stripBrakitClasses(node: HTMLElement) {
  node.classList.remove("brakit-selected");
  node
    .querySelectorAll(".brakit-selected")
    .forEach((el) => el.classList.remove("brakit-selected"));
}
