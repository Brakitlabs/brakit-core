export interface DraggableOverlayOptions {
  element: HTMLElement;
  handle: HTMLElement;
  margin?: number;
  constrainToViewport?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export class DraggableOverlay {
  private readonly element: HTMLElement;
  private readonly handle: HTMLElement;
  private readonly margin: number;
  private readonly constrainToViewport: boolean;
  private readonly onDragStart?: () => void;
  private readonly onDragEnd?: () => void;

  private pointerId: number | null = null;
  private offset = { x: 0, y: 0 };

  private readonly boundPointerDown: (event: PointerEvent) => void;
  private readonly boundPointerMove: (event: PointerEvent) => void;
  private readonly boundPointerUp: (event: PointerEvent) => void;

  constructor(options: DraggableOverlayOptions) {
    this.element = options.element;
    this.handle = options.handle;
    this.margin = options.margin ?? 12;
    this.constrainToViewport = options.constrainToViewport ?? true;
    this.onDragStart = options.onDragStart;
    this.onDragEnd = options.onDragEnd;

    this.boundPointerDown = this.handlePointerDown.bind(this);
    this.boundPointerMove = this.handlePointerMove.bind(this);
    this.boundPointerUp = this.handlePointerUp.bind(this);

    this.handle.addEventListener("pointerdown", this.boundPointerDown, {
      passive: false,
    });
  }

  destroy(): void {
    this.handle.removeEventListener("pointerdown", this.boundPointerDown);
    window.removeEventListener("pointermove", this.boundPointerMove, true);
    window.removeEventListener("pointerup", this.boundPointerUp, true);
    window.removeEventListener("pointercancel", this.boundPointerUp, true);
  }

  setPosition(x: number, y: number): void {
    this.element.style.left = `${Math.round(x)}px`;
    this.element.style.top = `${Math.round(y)}px`;
  }

  private handlePointerDown(event: PointerEvent): void {
    if (event.button !== 0 || this.pointerId !== null) {
      return;
    }

    this.pointerId = event.pointerId;
    this.handle.setPointerCapture(event.pointerId);

    const rect = this.element.getBoundingClientRect();
    this.offset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    window.addEventListener("pointermove", this.boundPointerMove, true);
    window.addEventListener("pointerup", this.boundPointerUp, true);
    window.addEventListener("pointercancel", this.boundPointerUp, true);

    this.onDragStart?.();

    event.preventDefault();
  }

  private handlePointerMove(event: PointerEvent): void {
    if (this.pointerId === null || event.pointerId !== this.pointerId) {
      return;
    }

    const rect = this.element.getBoundingClientRect();
    const width = rect.width || this.element.offsetWidth;
    const height = rect.height || this.element.offsetHeight;

    let nextX = event.clientX - this.offset.x;
    let nextY = event.clientY - this.offset.y;

    if (this.constrainToViewport) {
      const maxX = Math.max(this.margin, window.innerWidth - width - this.margin);
      const maxY = Math.max(this.margin, window.innerHeight - height - this.margin);
      nextX = clamp(nextX, this.margin, maxX);
      nextY = clamp(nextY, this.margin, maxY);
    }

    this.setPosition(nextX, nextY);
  }

  private handlePointerUp(event: PointerEvent): void {
    if (this.pointerId === null || event.pointerId !== this.pointerId) {
      return;
    }

    try {
      this.handle.releasePointerCapture(this.pointerId);
    } catch {}

    this.pointerId = null;
    window.removeEventListener("pointermove", this.boundPointerMove, true);
    window.removeEventListener("pointerup", this.boundPointerUp, true);
    window.removeEventListener("pointercancel", this.boundPointerUp, true);

    this.onDragEnd?.();
  }
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return min;
  }
  if (max < min) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}
