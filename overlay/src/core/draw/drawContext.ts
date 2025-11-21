import { SanitizedElementInfo } from "../processors/selection";

/**
 * Minimal draw-context metadata kept for historical compatibility. Most spatial reasoning is
 * handled by the spatial engine, so we only retain anchor pointers and viewport-relative bounds.
 */
export interface DrawAreaContext {
  /** Size of the browser viewport when the draw action completed (in CSS pixels). */
  viewport: Dimensions;

  /** Absolute rectangle (in CSS pixels) for the drawn area, relative to the viewport. */
  bounds: Rect;

  /** Rectangle of the parent container that the anchor element belongs to (viewport-relative). */
  parentBounds?: Rect;

  /**
   * The drawn rectangle expressed as ratios of the parent bounds (0..1), allowing the backend
   * to size new content proportionally instead of hard-coding pixels.
   */
  relativeBounds?: RelativeRect;

  /** Offset of the window scroll position when the selection was captured. */
  scrollOffset: Point;

  /** Optional CSS selector for the anchor element (sanitised to avoid Brakit classes). */
  anchorSelector?: string;

  /** Sanitised metadata for the anchor element. */
  anchor?: SanitizedElementInfo;

  /** Sanitised metadata for the anchor’s parent element (if available). */
  parent?: SanitizedElementInfo;

  /** Context describing the container where the drawn content should be inserted. */
  container?: DrawContainerContext;

  /** Snapshots of the surrounding siblings to aid precise placement. */
  siblings?: DrawSiblingGroups;
}

/** Width/height pair used for viewport and element rectangles. */
export interface Dimensions {
  width: number;
  height: number;
}

/** Basic rectangle in CSS pixels, relative to the viewport. */
export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Rectangle expressed as ratios of a reference container. */
export interface RelativeRect {
  /** `bounds.left / parentBounds.width` */
  x: number;
  /** `bounds.top / parentBounds.height` */
  y: number;
  /** `bounds.width / parentBounds.width` */
  width: number;
  /** `bounds.height / parentBounds.height` */
  height: number;
}

/** 2D point in CSS pixels, typically used for scroll offsets. */
export interface Point {
  x: number;
  y: number;
}

/**
 * Result emitted by the draw tool when the user completes a selection.
 *
 * The anchor element is kept separately so the controller can decide whether to
 * focus/select it, while the context is serialisable and safe to pass to the backend.
 */
export interface DrawSelectionResult {
  context: DrawAreaContext;
  anchorElement: HTMLElement | null;
  anchorInfo?: SanitizedElementInfo;
}

export interface DrawContainerContext {
  selector?: string;
  info?: SanitizedElementInfo;
  bounds: Rect;
  layout?: LayoutSummary;
  childCount?: number;
  insertionIndex?: number;
}

export interface DrawSiblingGroups {
  before?: DrawSiblingSnapshot[];
  after?: DrawSiblingSnapshot[];
}

export interface DrawSiblingSnapshot {
  index: number;
  tagName: string;
  id?: string;
  className?: string;
  selector?: string;
  bounds: Rect;
  display?: string;
}

export interface LayoutSummary {
  display?: string;
  position?: string;
  flexDirection?: string;
  flexWrap?: string;
  justifyContent?: string;
  alignItems?: string;
  alignContent?: string;
  gap?: string;
  columnGap?: string;
  rowGap?: string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridAutoFlow?: string;
}
