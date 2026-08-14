import { useCallback, useSyncExternalStore } from "react";
import type { Observable } from "@/core/observable";

const NEVER_EMITS = () => () => {};

/**
 * Subscribes a component to an observable, falling back to `defaultValue`
 * while there is none — which is the normal state before a device connects.
 *
 * `defaultValue` must be referentially stable, otherwise every render
 * produces a new snapshot and React re-renders forever.
 */
export function useObservable<T>(observable: Observable<T>): T;
export function useObservable<T>(
  observable: Observable<T> | null,
  defaultValue: T,
): T;
export function useObservable<T>(
  observable: Observable<T> | null,
  defaultValue?: T,
): T {
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      observable ? observable.subscribe(onStoreChange) : NEVER_EMITS(),
    [observable],
  );

  const getSnapshot = useCallback(
    () => (observable ? observable.getValue() : (defaultValue as T)),
    [observable, defaultValue],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
