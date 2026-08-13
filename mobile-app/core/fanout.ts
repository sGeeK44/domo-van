import type { Listener, Unsubscribe } from "./observable";

/** Anything that can be closed once, such as a BLE characteristic monitor. */
export type Source = { remove: () => void };

export type Fanout<T> = {
  readonly size: number;
  add: (listener: Listener<T>) => Unsubscribe;
  emit: (value: T) => void;
};

/** Serves many listeners off one source, so a second one cannot orphan the first. */
export function createFanout<T>(openSource: () => Source): Fanout<T> {
  const listeners = new Set<Listener<T>>();
  let source: Source | null = null;

  function closeWhenIdle(): void {
    if (listeners.size > 0 || source === null) return;
    const closing = source;
    source = null;
    try {
      closing.remove();
    } catch {
      // a source that refuses to close must not strand the fanout
    }
  }

  return {
    get size() {
      return listeners.size;
    },

    add(listener: Listener<T>): Unsubscribe {
      listeners.add(listener);
      source ??= openSource();

      return () => {
        listeners.delete(listener);
        closeWhenIdle();
      };
    },

    emit(value: T): void {
      for (const listener of [...listeners]) {
        try {
          listener(value);
        } catch {
          // never crash callers
        }
      }
    },
  };
}
