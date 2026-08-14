// The real package drives a native gesture runtime no test environment has, so the
// detector turns a mouse drag into the pan callbacks: a test slides with fireEvent.
import { type ReactNode, useRef } from "react";

type PanEvent = { translationX: number };

type PanHandlers = {
  start?: () => void;
  update?: (event: PanEvent) => void;
  end?: () => void;
};

export type PanGesture = {
  handlers: PanHandlers;
  onStart(handler: () => void): PanGesture;
  onUpdate(handler: (event: PanEvent) => void): PanGesture;
  onEnd(handler: () => void): PanGesture;
};

export const Gesture = {
  Pan(): PanGesture {
    const handlers: PanHandlers = {};
    const gesture: PanGesture = {
      handlers,
      onStart(handler) {
        handlers.start = handler;
        return gesture;
      },
      onUpdate(handler) {
        handlers.update = handler;
        return gesture;
      },
      onEnd(handler) {
        handlers.end = handler;
        return gesture;
      },
    };
    return gesture;
  },
};

export function GestureDetector({
  gesture,
  children,
}: {
  gesture: PanGesture;
  children: ReactNode;
}) {
  const grabbedAt = useRef(0);

  return (
    <div
      data-testid="pan-gesture"
      onMouseDown={(event) => {
        grabbedAt.current = event.clientX;
        gesture.handlers.start?.();
      }}
      onMouseMove={(event) =>
        gesture.handlers.update?.({
          translationX: event.clientX - grabbedAt.current,
        })
      }
      onMouseUp={() => gesture.handlers.end?.()}
    >
      {children}
    </div>
  );
}
