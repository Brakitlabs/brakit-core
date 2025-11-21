import { BoundingBox, IndexedElement, Point, ReactMeta } from './types';

const OVERLAY_ATTR = 'data-brakit-overlay';
const BRAKIT_CLASS_PREFIX = 'brakit-';

export function isRenderable(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el.hasAttribute(OVERLAY_ATTR)) return false;

  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (parseFloat(style.opacity) === 0) return false;

  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export function elementRect(el: Element): DOMRect {
  return (el as HTMLElement).getBoundingClientRect();
}

export function elementCenter(rect: DOMRect): Point {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

export function buildElementIndex(root: ParentNode = document.body): IndexedElement[] {
  if (!root) return [];

  const all = Array.from(root.querySelectorAll<HTMLElement>('*')).filter(isRenderable);

  return all.map((el) => {
    const rect = elementRect(el);
    const center = elementCenter(rect);
    const style = window.getComputedStyle(el);
    const rawZ = parseFloat(style.zIndex);
    const zIndex = Number.isNaN(rawZ) ? 0 : rawZ;
    const className = sanitizeClassName(el.className);

    return {
      el,
      rect,
      center,
      tag: el.tagName.toLowerCase(),
      className,
      id: el.id || undefined,
      zIndex,
      react: extractReactMeta(el),
    } satisfies IndexedElement;
  });
}

export function extractReactMeta(el: Element): ReactMeta {
  const anyEl = el as any;
  const source = anyEl?.__brakit_source || anyEl?._source || anyEl?.__source;
  const componentName: string | undefined = anyEl?.__brakit_component || anyEl?.__brakitComponent;
  if (source && typeof source === 'object') {
    return {
      componentName,
      sourceFile: source.fileName ?? source.file ?? undefined,
      lineNumber: source.lineNumber ?? undefined,
    };
  }
  if (componentName) {
    return { componentName };
  }
  return {};
}

export function generateSamplePoints(box: BoundingBox, step = 20): Point[] {
  const points: Point[] = [];
  const maxX = box.x + box.width;
  const maxY = box.y + box.height;

  const safeStep = Math.max(4, step);

  for (let x = box.x; x <= maxX; x += safeStep) {
    for (let y = box.y; y <= maxY; y += safeStep) {
      points.push({ x, y });
    }
  }

  points.push({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
  points.push({ x: box.x, y: box.y });
  points.push({ x: maxX, y: box.y });
  points.push({ x: box.x, y: maxY });
  points.push({ x: maxX, y: maxY });

  return points;
}

export function topRenderableAt(x: number, y: number): Element | null {
  const stack = document.elementsFromPoint(x, y);
  for (const el of stack) {
    if (isRenderable(el)) return el;
  }
  return null;
}

export function viewportSize() {
  return { width: window.innerWidth, height: window.innerHeight };
}

export function serializeDOM(el: Element, maxLen = 2000): string {
  const clone = (el as HTMLElement).cloneNode(true) as HTMLElement;
  stripBrakitClassesDeep(clone);
  const html = clone.outerHTML ?? '';
  if (html.length <= maxLen) return html;
  return `${html.slice(0, maxLen)}…`;
}

export function summarizeStyles(els: Element[], max = 10): string {
  const lines: string[] = [];
  const limit = Math.max(0, Math.min(max, els.length));
  for (let i = 0; i < limit; i += 1) {
    const el = els[i] as HTMLElement;
    const cs = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const className = sanitizeClassName(el.className);
    const idSegment = el.id ? `#${el.id}` : '';
    const classSegment = className ? `.${className}` : '';
    lines.push(
      `${el.tagName.toLowerCase()}${idSegment}${classSegment} -> display:${cs.display}; position:${cs.position}; flex:${cs.flex}; grid-flow:${cs.gridAutoFlow || ''}; width:${Math.round(rect.width)}; height:${Math.round(rect.height)};`
    );
  }
  return lines.join('\n');
}

export function containsRect(container: DOMRect, target: BoundingBox): boolean {
  return (
    target.x >= container.left &&
    target.y >= container.top &&
    target.x + target.width <= container.right &&
    target.y + target.height <= container.bottom
  );
}

export function centerOfBox(box: BoundingBox): Point {
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
}

export function rectsOverlap(a: DOMRect, b: DOMRect): boolean {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
}

export function uniqueElements(elements: Element[]): Element[] {
  const seen = new Set<Element>();
  const out: Element[] = [];
  for (const el of elements) {
    if (!seen.has(el)) {
      seen.add(el);
      out.push(el);
    }
  }
  return out;
}

export function sanitizeClassName(value?: string): string {
  if (!value) return '';
  return value
    .split(/\s+/)
    .filter((token) => token && !token.startsWith(BRAKIT_CLASS_PREFIX))
    .join(' ');
}

export function stripBrakitClassesDeep(node: Element) {
  const elementQueue: Element[] = [node];
  while (elementQueue.length) {
    const current = elementQueue.pop()!;
    if (current instanceof HTMLElement && current.classList.length) {
      const toRemove: string[] = [];
      current.classList.forEach((token) => {
        if (token.startsWith(BRAKIT_CLASS_PREFIX)) {
          toRemove.push(token);
        }
      });
      if (toRemove.length) {
        current.classList.remove(...toRemove);
      }
    }
    elementQueue.push(...Array.from(current.children));
  }
}
