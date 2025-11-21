import {
  BoundingBox,
  ContainerInfo,
  IndexedElement,
  NeighborInfo,
  SpatialMapPayload,
} from './types';
import {
  buildElementIndex,
  generateSamplePoints,
  serializeDOM,
  summarizeStyles,
  topRenderableAt,
  uniqueElements,
} from './domUtils';
import { findNearestNeighbors } from './neighbors';
import { ContainerMatch, findContainerForInsertion, pickContainerSeed } from './container';

export interface BuildOptions {
  step?: number;
  includeDomFragment?: boolean;
  includeCssSummary?: boolean;
}

export interface SpatialAnalysis {
  payload: SpatialMapPayload;
  index: IndexedElement[];
  sampledElements: Element[];
  containerMatch?: ContainerMatch;
}

export function analyzeRegion(
  box: BoundingBox,
  instruction: string,
  action: SpatialMapPayload['action'] = 'insert_component',
  opts: BuildOptions = {}
): SpatialAnalysis {
  const { step = 20, includeDomFragment = true, includeCssSummary = true } = opts;

  const index = buildElementIndex(document.body);

  const samples = generateSamplePoints(box, step);
  const hits: Element[] = [];
  for (const point of samples) {
    const el = topRenderableAt(point.x, point.y);
    if (el) hits.push(el);
  }
  const sampledElements = uniqueElements(hits);

  const preferredSeed = sampledElements.find((el): el is HTMLElement => el instanceof HTMLElement);
  const fallbackSeed = pickContainerSeed(index);
  const containerMatch = preferredSeed
    ? findContainerForInsertion(box, preferredSeed)
    : fallbackSeed
    ? findContainerForInsertion(box, fallbackSeed)
    : undefined;

  const containerRect = containerMatch
    ? new DOMRect(
        containerMatch.info.rect.left,
        containerMatch.info.rect.top,
        containerMatch.info.rect.width,
        containerMatch.info.rect.height
      )
    : undefined;

  const neighbors: NeighborInfo[] = findNearestNeighbors(box, index, containerRect, 1);

  let domFragment: string | undefined;
  if (includeDomFragment && containerMatch) {
    domFragment = serializeDOM(containerMatch.element);
  }

  let cssContext: string | undefined;
  if (includeCssSummary && sampledElements.length) {
    cssContext = summarizeStyles(sampledElements);
  }

  const payload: SpatialMapPayload = {
    action,
    region: box,
    instruction,
    neighbors,
    container: containerMatch?.info,
    domFragment,
    cssContext,
  };

  return { payload, index, sampledElements, containerMatch };
}

export function buildSpatialPayload(
  box: BoundingBox,
  instruction: string,
  action: SpatialMapPayload['action'] = 'insert_component',
  opts: BuildOptions = {}
): SpatialMapPayload {
  return analyzeRegion(box, instruction, action, opts).payload;
}
