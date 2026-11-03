'use client';

import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useRef,
  useState,
} from 'react';

type Offset = { x: number; y: number };

export function useDraggableDialog() {
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null>(null);

  const start = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (window.innerWidth < 768 || event.button !== 0) return;
      const dialog = event.currentTarget.closest('[data-slot="dialog-content"]');
      if (!(dialog instanceof HTMLElement)) return;
      const rect = dialog.getBoundingClientRect();
      drag.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: offset.x,
        originY: offset.y,
        minX: offset.x - rect.left + 12,
        maxX: offset.x + window.innerWidth - rect.right - 12,
        minY: offset.y - rect.top + 12,
        maxY: offset.y + window.innerHeight - rect.bottom - 12,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [offset],
  );

  const move = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    setOffset({
      x: Math.min(
        current.maxX,
        Math.max(
          current.minX,
          current.originX + event.clientX - current.startX,
        ),
      ),
      y: Math.min(
        current.maxY,
        Math.max(
          current.minY,
          current.originY + event.clientY - current.startY,
        ),
      ),
    });
  }, []);

  const stop = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  }, []);
  const reset = useCallback(() => setOffset({ x: 0, y: 0 }), []);

  return { offset, start, move, stop, reset };
}
