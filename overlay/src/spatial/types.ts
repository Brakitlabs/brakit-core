export type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface ReactMeta {
  componentName?: string;
  sourceFile?: string;
  lineNumber?: number;
}

export interface IndexedElement {
  el: Element;
  rect: DOMRect;
  center: Point;
  tag: string;
  className: string;
  id?: string;
  zIndex: number;
  react?: ReactMeta;
}

export interface NeighborInfo {
  direction: Direction;
  distancePx: number;
  distanceNorm: number;
  tag: string;
  className?: string;
  id?: string;
  componentName?: string;
  sourceFile?: string;
  lineNumber?: number;
  rect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

export interface ContainerInfo {
  tag: string;
  className?: string;
  id?: string;
  rect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  componentName?: string;
  sourceFile?: string;
  lineNumber?: number;
}

export interface SpatialMapPayload {
  action: 'insert_component' | 'edit_component';
  region: BoundingBox;
  instruction: string;
  neighbors: NeighborInfo[];
  container?: ContainerInfo;
  domFragment?: string;
  cssContext?: string;
}
