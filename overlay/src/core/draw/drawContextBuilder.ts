import {
  DrawAreaContext,
  DrawContainerContext,
  DrawSelectionResult,
  DrawSiblingGroups,
  DrawSiblingSnapshot,
  LayoutSummary,
  Rect,
  RelativeRect,
} from "./drawContext";
import { sanitizeElementDetails } from "../processors/selection";
import { getElementInfo } from "../../utils/reactSource";

interface BuildDrawContextOptions {
  document: Document;
  bounds: Rect;
  anchorElement: HTMLElement | null;
}

export function buildDrawSelectionResult({
  document,
  bounds,
  anchorElement,
}: BuildDrawContextOptions): DrawSelectionResult {
  const effectiveAnchor =
    anchorElement ?? (document.body as HTMLElement | null) ?? null;

  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  const scrollOffset = {
    x: window.scrollX,
    y: window.scrollY,
  };

  const anchorInfo = effectiveAnchor
    ? sanitizeElementDetails(getElementInfo(effectiveAnchor))
    : undefined;

  const parentElement = effectiveAnchor?.parentElement ?? null;
  const parentInfo = parentElement
    ? sanitizeElementDetails(getElementInfo(parentElement))
    : undefined;

  const parentBounds = parentElement
    ? rectFromClientRect(parentElement.getBoundingClientRect())
    : undefined;

  const relativeBounds = computeRelativeBounds(bounds, parentBounds);

  const { container, siblings } = resolveContainerContext({
    document,
    selectionBounds: bounds,
    anchorElement: effectiveAnchor,
  });

  const context: DrawAreaContext = {
    viewport,
    bounds,
    parentBounds,
    relativeBounds,
    scrollOffset,
    anchorSelector: anchorInfo?.selector,
    anchor: anchorInfo,
    parent: parentInfo,
  };

  if (container) {
    context.container = container;
  }

  if (siblings) {
    context.siblings = siblings;
  }

  return {
    context,
    anchorElement: effectiveAnchor,
    anchorInfo,
  };
}

function rectFromClientRect(rect: DOMRect): Rect {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function computeRelativeBounds(
  bounds: Rect,
  parentBounds?: Rect
): RelativeRect | undefined {
  if (!parentBounds) {
    return undefined;
  }
  const { left, top, width, height } = parentBounds;
  if (width === 0 || height === 0) {
    return undefined;
  }

  return {
    x: clamp((bounds.left - left) / width),
    y: clamp((bounds.top - top) / height),
    width: clamp(bounds.width / width),
    height: clamp(bounds.height / height),
  };
}

function clamp(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

const MAX_SIBLING_SNAPSHOTS = 3;

interface ContainerResolutionInput {
  document: Document;
  selectionBounds: Rect;
  anchorElement: HTMLElement | null;
}

interface ContainerResolutionResult {
  container?: DrawContainerContext;
  siblings?: DrawSiblingGroups;
}

function resolveContainerContext({
  document,
  selectionBounds,
  anchorElement,
}: ContainerResolutionInput): ContainerResolutionResult {
  const containerElement =
    findContainingAncestor(anchorElement, selectionBounds) ??
    (document.body as HTMLElement);

  if (!containerElement) {
    return {};
  }

  const containerInfo = sanitizeElementDetails(getElementInfo(containerElement));
  const containerRect = rectFromClientRect(
    containerElement.getBoundingClientRect()
  );
  const layout = summarizeLayout(getComputedStyle(containerElement));

  const siblingContext = collectSiblingSnapshots(
    containerElement,
    selectionBounds
  );

  const container: DrawContainerContext = {
    selector: containerInfo.selector,
    info: containerInfo,
    bounds: containerRect,
    layout,
    childCount: siblingContext.childCount,
    insertionIndex: siblingContext.insertionIndex,
  };

  return {
    container,
    siblings: siblingContext.groups,
  };
}

function findContainingAncestor(
  start: HTMLElement | null,
  bounds: Rect
): HTMLElement | null {
  let current: HTMLElement | null = start;

  while (current) {
    if (!shouldIgnoreElementForContext(current)) {
      const rect = current.getBoundingClientRect();
      if (
        rect.left <= bounds.left &&
        rect.top <= bounds.top &&
        rect.right >= bounds.left + bounds.width &&
        rect.bottom >= bounds.top + bounds.height
      ) {
        return current;
      }
    }
    current = current.parentElement;
  }

  return null;
}

function collectSiblingSnapshots(
  container: HTMLElement,
  selectionBounds: Rect
): {
  groups: DrawSiblingGroups | undefined;
  childCount: number;
  insertionIndex: number;
} {
  const rawChildren = Array.from(container.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && !shouldIgnoreElementForContext(child)
  );

  const snapshots: DrawSiblingSnapshot[] = [];

  rawChildren.forEach((child, index) => {
    const rect = child.getBoundingClientRect();
    if (rect.width < 1 && rect.height < 1) {
      return;
    }
    const summary = sanitizeElementDetails(getElementInfo(child));
    snapshots.push({
      index,
      tagName: summary.tagName.toLowerCase(),
      id: summary.id || undefined,
      className: summary.className || undefined,
      selector: summary.selector || undefined,
      bounds: rectFromClientRect(rect),
      display: window.getComputedStyle(child).display || undefined,
    });
  });

  const childCount = snapshots.length;
  if (childCount === 0) {
    return {
      groups: undefined,
      childCount: 0,
      insertionIndex: 0,
    };
  }

  const selectionCenter =
    selectionBounds.top + selectionBounds.height / 2;
  let insertionIndex = childCount;

  for (const snapshot of snapshots) {
    const siblingCenter =
      snapshot.bounds.top + snapshot.bounds.height / 2;
    if (selectionCenter <= siblingCenter) {
      insertionIndex = snapshot.index;
      break;
    }
  }

  const before = snapshots.filter((snap) => snap.index < insertionIndex);
  const after = snapshots.filter((snap) => snap.index >= insertionIndex);

  const groups: DrawSiblingGroups = {
    before: before.slice(-MAX_SIBLING_SNAPSHOTS),
    after: after.slice(0, MAX_SIBLING_SNAPSHOTS),
  };

  return {
    groups,
    childCount,
    insertionIndex,
  };
}

function summarizeLayout(style: CSSStyleDeclaration): LayoutSummary {
  const summary: LayoutSummary = {};

  const assign = (key: keyof LayoutSummary, value: string | null) => {
    if (value && value !== "auto" && value !== "normal" && value !== "0px") {
      summary[key] = value;
    }
  };

  assign("display", style.display);
  assign("position", style.position);

  if (style.display.includes("flex")) {
    assign("flexDirection", style.flexDirection);
    assign("flexWrap", style.flexWrap);
    assign("justifyContent", style.justifyContent);
    assign("alignItems", style.alignItems);
    assign("alignContent", style.alignContent);
    assign("gap", style.gap);
  }

  if (style.display.includes("grid")) {
    assign("gridTemplateColumns", style.gridTemplateColumns);
    assign("gridTemplateRows", style.gridTemplateRows);
    assign("gridAutoFlow", style.gridAutoFlow);
    assign("columnGap", style.columnGap);
    assign("rowGap", style.rowGap);
  }

  if (!summary.gap) {
    assign("gap", style.gap);
  }

  assign("columnGap", style.columnGap);
  assign("rowGap", style.rowGap);

  return summary;
}

function shouldIgnoreElementForContext(element: HTMLElement): boolean {
  if (element.hasAttribute("data-brakit-overlay")) return true;
  if (element.hasAttribute("data-brakit-placeholder")) return true;
  if (element.hasAttribute("data-brakit-editing")) return true;

  const tag = element.tagName.toLowerCase();
  if (tag === "script" || tag === "style") {
    return true;
  }

  const id = element.id || "";
  if (id.includes("brakit") || id.includes("overlay") || id.includes("segment-view")) {
    return true;
  }

  return Array.from(element.classList).some((token) =>
    token.startsWith("brakit-")
  );
}
