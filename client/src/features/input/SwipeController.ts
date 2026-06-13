import {
  PointerEventTypes,
  type Scene,
  type AbstractMesh,
  type PointerInfo,
} from '@babylonjs/core';

export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

export interface SwipeStart {
  row: number;
  col: number;
}

export interface SwipeEnd {
  from: SwipeStart;
  to: SwipeStart;
  direction: SwipeDirection;
}

export interface SwipeHandlers {
  onSwipe: (swipe: SwipeEnd) => void;
  onDrag?: (from: SwipeStart, direction: SwipeDirection, progress: number) => void;
  onDragCancel?: () => void;
  canInteract: () => boolean;
}

const SWIPE_THRESHOLD_PX = 28;

export class SwipeController {
  private active: SwipeStart | null = null;
  private startX = 0;
  private startY = 0;
  private lastX = 0;
  private lastY = 0;
  private dragging = false;

  constructor(
    private scene: Scene,
    private handlers: SwipeHandlers,
  ) {
    this.scene.onPointerObservable.add((info) => {
      if (!this.handlers.canInteract()) return;

      switch (info.type) {
        case PointerEventTypes.POINTERDOWN:
          this.onPointerDown(info);
          break;
        case PointerEventTypes.POINTERMOVE:
          this.onPointerMove(info);
          break;
        case PointerEventTypes.POINTERUP:
          this.onPointerUp();
          break;
      }
    });
  }

  private pickCell(pickedMesh: AbstractMesh | null | undefined): SwipeStart | null {
    if (!pickedMesh?.metadata) return null;
    const { row, col } = pickedMesh.metadata;
    if (typeof row !== 'number' || typeof col !== 'number') return null;
    return { row, col };
  }

  private onPointerDown(info: PointerInfo): void {
    const cell = this.pickCell(info.pickInfo?.pickedMesh ?? undefined);
    if (!cell) return;

    const ev = info.event as PointerEvent;
    this.active = cell;
    this.startX = ev.clientX;
    this.startY = ev.clientY;
    this.lastX = this.startX;
    this.lastY = this.startY;
    this.dragging = false;
  }

  private onPointerMove(info: PointerInfo): void {
    if (!this.active) return;

    const ev = info.event as PointerEvent;
    this.lastX = ev.clientX;
    this.lastY = ev.clientY;

    const dx = this.lastX - this.startX;
    const dy = this.lastY - this.startY;
    const dist = Math.hypot(dx, dy);

    if (dist < 8) return;

    this.dragging = true;
    const direction = this.resolveDirection(dx, dy);
    if (!direction) return;

    const progress = Math.min(dist / SWIPE_THRESHOLD_PX, 1);
    this.handlers.onDrag?.(this.active, direction, progress);
  }

  private onPointerUp(): void {
    if (!this.active) return;

    const dx = this.lastX - this.startX;
    const dy = this.lastY - this.startY;
    const dist = Math.hypot(dx, dy);

    if (!this.dragging || dist < SWIPE_THRESHOLD_PX) {
      this.handlers.onDragCancel?.();
      this.reset();
      return;
    }

    const direction = this.resolveDirection(dx, dy);
    if (!direction) {
      this.handlers.onDragCancel?.();
      this.reset();
      return;
    }

    const to = this.adjacent(this.active, direction);
    if (!to) {
      this.handlers.onDragCancel?.();
      this.reset();
      return;
    }

    this.handlers.onSwipe({
      from: this.active,
      to,
      direction,
    });

    this.reset();
  }

  private resolveDirection(dx: number, dy: number): SwipeDirection | null {
    if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return null;
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    }
    return dy > 0 ? 'down' : 'up';
  }

  private adjacent(from: SwipeStart, dir: SwipeDirection): SwipeStart | null {
    switch (dir) {
      case 'up':
        return from.row > 0 ? { row: from.row - 1, col: from.col } : null;
      case 'down':
        return from.row < 7 ? { row: from.row + 1, col: from.col } : null;
      case 'left':
        return from.col > 0 ? { row: from.row, col: from.col - 1 } : null;
      case 'right':
        return from.col < 7 ? { row: from.row, col: from.col + 1 } : null;
    }
  }

  private reset(): void {
    this.active = null;
    this.dragging = false;
  }
}
