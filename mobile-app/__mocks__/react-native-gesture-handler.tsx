// The real package drives a native gesture runtime no test environment has, so the
// detector turns a mouse drag into the pan callbacks: a test slides with fireEvent.
import { type ReactNode, useRef } from "react";

type PanEvent = { translationX: number };

type PanHandlers = {
  start?: () => void;
  update?: (event: PanEvent) => void;
  end?: (event: PanEvent, success: boolean) => void;
};

export type PanGesture = {
  handlers: PanHandlers;
  onStart(handler: () => void): PanGesture;
  onUpdate(handler: (event: PanEvent) => void): PanGesture;
  onEnd(handler: (event: PanEvent, success: boolean) => void): PanGesture;
  minDistance(distance: number): PanGesture;
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
      minDistance() {
        return gesture;
      },
    };
    return gesture;
  },
};

export function GestureHandlerRootView({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

export function GestureDetector({
  gesture,
  children,
}: {
  gesture: PanGesture;
  children: ReactNode;
}) {
  const grabbedAt = useRef(0);
  const translationX = useRef(0);

  const finish = (success: boolean) =>
    gesture.handlers.end?.({ translationX: translationX.current }, success);

  return (
    <div
      data-testid="pan-gesture"
      onMouseDown={(event) => {
        grabbedAt.current = event.clientX;
        translationX.current = 0;
        gesture.handlers.start?.();
      }}
      onMouseMove={(event) => {
        translationX.current = event.clientX - grabbedAt.current;
        gesture.handlers.update?.({ translationX: translationX.current });
      }}
      onMouseUp={() => finish(true)}
      // RNGH ends a cancelled pan with success false; pointercancel is the web's interrupted pointer.
      onPointerCancel={() => finish(false)}
    >
      {children}
    </div>
  );
}
