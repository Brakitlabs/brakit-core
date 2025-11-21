import { BoundingBox, ContainerInfo, IndexedElement } from './types';
import { containsRect, sanitizeClassName } from './domUtils';

export interface ContainerMatch {
  element: HTMLElement;
  info: ContainerInfo;
}

function isLayoutDisplay(style: CSSStyleDeclaration): boolean {
  if (style.display === 'flex' || style.display === 'grid' || style.display === 'inline-grid') {
    return true;
  }
  if (style.display === 'flow-root') return true;
  if (style.display === 'block' && style.position !== 'static') return true;
  return false;
}

export function findContainerForInsertion(box: BoundingBox, startEl: Element): ContainerMatch | undefined {
  let el: Element | null = startEl;

  while (el && el !== document.documentElement) {
    if (!(el instanceof HTMLElement)) {
      el = el.parentElement;
      continue;
    }

    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const wideEnough = rect.width >= Math.min(window.innerWidth * 0.4, 480);
    const isLayout = isLayoutDisplay(style) || wideEnough;

    if (isLayout && containsRect(rect, box)) {
      const anyEl = el as any;
      const source = anyEl?.__brakit_source || anyEl?._source || anyEl?.__source;
      const info: ContainerInfo = {
        tag: el.tagName.toLowerCase(),
        className: sanitizeClassName(el.className) || undefined,
        id: el.id || undefined,
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
        componentName: anyEl?.__brakit_component || undefined,
        sourceFile: source?.fileName ?? source?.file ?? undefined,
        lineNumber: source?.lineNumber ?? undefined,
      };

      return { element: el, info };
    }

    el = el.parentElement;
  }

  return undefined;
}

export function pickContainerSeed(index: IndexedElement[]): Element | null {
  if (!index.length) return null;
  const sorted = [...index].sort((a, b) => {
    if (a.zIndex !== b.zIndex) return b.zIndex - a.zIndex;
    const areaA = a.rect.width * a.rect.height;
    const areaB = b.rect.width * b.rect.height;
    return areaB - areaA;
  });
  return sorted[0]?.el ?? null;
}
