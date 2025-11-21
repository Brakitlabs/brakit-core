import { BoundingBox, Direction, IndexedElement, NeighborInfo } from './types';
import { centerOfBox, rectsOverlap } from './domUtils';

function angleToDirection(dx: number, dy: number): Direction {
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle >= -22.5 && angle < 22.5) return 'E';
  if (angle >= 22.5 && angle < 67.5) return 'SE';
  if (angle >= 67.5 && angle < 112.5) return 'S';
  if (angle >= 112.5 && angle < 157.5) return 'SW';
  if (angle >= -67.5 && angle < -22.5) return 'NE';
  if (angle >= -112.5 && angle < -67.5) return 'N';
  if (angle >= -157.5 && angle < -112.5) return 'NW';
  return 'W';
}

export function findNearestNeighbors(
  box: BoundingBox,
  index: IndexedElement[],
  containerRect?: DOMRect,
  maxPerDirection = 1
): NeighborInfo[] {
  if (!index.length) return [];

  const scopedIndex = containerRect
    ? index.filter((entry) => rectsOverlap(entry.rect, containerRect))
    : index;

  const workingIndex = scopedIndex.length ? scopedIndex : index;

  const center = centerOfBox(box);
  const scored = workingIndex.map((entry) => {
    const dx = entry.center.x - center.x;
    const dy = entry.center.y - center.y;
    const distancePx = Math.hypot(dx, dy);
    const direction = angleToDirection(dx, dy);
    return { entry, direction, distancePx };
  });

  const grouped = new Map<Direction, { entry: IndexedElement; distancePx: number }[]>();
  for (const score of scored) {
    const arr = grouped.get(score.direction) ?? [];
    arr.push({ entry: score.entry, distancePx: score.distancePx });
    grouped.set(score.direction, arr);
  }

  const normalizationBase = containerRect
    ? Math.max(containerRect.width, containerRect.height)
    : Math.max(window.innerWidth, window.innerHeight);

  const neighbors: NeighborInfo[] = [];
  for (const [direction, entries] of grouped.entries()) {
    entries.sort((a, b) => a.distancePx - b.distancePx);
    const picks = entries.slice(0, Math.max(1, maxPerDirection));
    for (const { entry, distancePx } of picks) {
      const r = entry.rect;
      neighbors.push({
        direction,
        distancePx,
        distanceNorm: normalizationBase ? Math.min(1, distancePx / normalizationBase) : 0,
        tag: entry.tag,
        className: entry.className || undefined,
        id: entry.id,
        componentName: entry.react?.componentName,
        sourceFile: entry.react?.sourceFile,
        lineNumber: entry.react?.lineNumber,
        rect: {
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
        },
      });
    }
  }

  return neighbors;
}
