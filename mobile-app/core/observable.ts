export type Unsubscribe = () => void;

export type Listener<T> = (value: T) => void;


export type Observable<T> = {
  getValue: () => T;
  subscribe: (listener: Listener<T>) => Unsubscribe;
};

export type MutableObservable<T> = Observable<T> & {
  setValue: (next: T) => void;
  update: (fn: (prev: T) => T) => void;
  destroy: () => void;
};

export function createObservable<T>(initial: T): MutableObservable<T> {
  let value = initial;
  const listeners = new Set<Listener<T>>();
  let destroyed = false;

  function emit() {
    for (const cb of listeners) {
      try {
        cb(value);
      } catch {
        // never crash callers
      }
    }
  }

  return {
    getValue: () => value,
    subscribe: (listener: Listener<T>): Unsubscribe => {
      if (destroyed) return () => {};
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setValue: (next: T) => {
      if (destroyed) return;
      value = next;
      emit();
    },
    update: (fn: (prev: T) => T) => {
      if (destroyed) return;
      value = fn(value);
      emit();
    },
    destroy: () => {
      destroyed = true;
      listeners.clear();
    },
  };
}
