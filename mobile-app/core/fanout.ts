import type { Listener, Unsubscribe } from "./observable";

/** Anything that can be closed once, such as a BLE characteristic monitor. */
export type Source = { remove: () => void };

export type Fanout<T> = {
  readonly size: number;
  add: (listener: Listener<T>) => Unsubscribe;
  emit: (value: T) => void;
};

/** One entry per add(), so the same function may subscribe twice and leave once. */
type Registration<T> = { readonly notify: Listener<T> };

/** A fanout that owns no upstream, for values pushed in by its owner. */
export function createDetachedFanout<T>(): Fanout<T> {
  return createFanout<T>(() => ({ remove: () => {} }));
}

/** Serves many listeners off one source, so a second one cannot orphan the first. */
export function createFanout<T>(openSource: () => Source): Fanout<T> {
  const registrations: Registration<T>[] = [];
  let source: Source | null = null;

  function forget(registration: Registration<T>): void {
    const index = registrations.indexOf(registration);
    if (index < 0) return;
    registrations.splice(index, 1);
  }

  function closeWhenIdle(): void {
    if (registrations.length > 0 || source === null) return;
    const closing = source;
    source = null;
    try {
      closing.remove();
    } catch {
      // a source that refuses to close must not strand the fanout
    }
  }

  function openOnce(registration: Registration<T>): void {
    if (source !== null) return;
    try {
      source = openSource();
    } catch (error) {
      forget(registration);
      throw error;
    }
  }

  return {
    get size() {
      return registrations.length;
    },

    add(listener: Listener<T>): Unsubscribe {
      const registration: Registration<T> = { notify: listener };
      registrations.push(registration);
      openOnce(registration);

      return () => {
        forget(registration);
        closeWhenIdle();
      };
    },

    emit(value: T): void {
      for (const registration of [...registrations]) {
        try {
          registration.notify(value);
        } catch {
          // never crash callers
        }
      }
    },
  };
}
