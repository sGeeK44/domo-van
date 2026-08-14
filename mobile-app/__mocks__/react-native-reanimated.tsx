// The real package drives a worklet runtime no test environment has, so every helper
// here settles synchronously: a test observes the geometry the animation targets.
import { type ComponentType, useRef, useState } from "react";
import { View } from "react-native-web";

export type SharedValue<T> = { value: T };

/** Writing `.value` repaints, which is what lets useAnimatedStyle recompute in a test. */
export function useSharedValue<T>(initial: T): SharedValue<T> {
  const [, repaint] = useState(0);
  const holder = useRef<SharedValue<T> | null>(null);

  if (holder.current === null) {
    let current = initial;
    holder.current = {
      get value() {
        return current;
      },
      set value(next: T) {
        if (Object.is(next, current)) return;
        current = next;
        repaint((count) => count + 1);
      },
    };
  }

  return holder.current;
}

export function withTiming<T>(target: T): T {
  return target;
}

export function withSpring<T>(target: T): T {
  return target;
}

export function useAnimatedStyle<T>(factory: () => T): T {
  return factory();
}

export function useAnimatedProps<T>(factory: () => T): T {
  return factory();
}

export function runOnJS<A extends unknown[], R>(fn: (...args: A) => R) {
  return fn;
}

export function interpolate(
  value: number,
  input: readonly number[],
  output: readonly number[],
): number {
  const [inMin = 0, inMax = 1] = input;
  const [outMin = 0, outMax = 1] = output;
  if (inMax === inMin) return outMin;
  const progress = Math.min(1, Math.max(0, (value - inMin) / (inMax - inMin)));
  return outMin + progress * (outMax - outMin);
}

export const Extrapolation = {
  IDENTITY: "identity",
  CLAMP: "clamp",
  EXTEND: "extend",
} as const;

const linear = (progress: number) => progress;

export const Easing = {
  linear,
  ease: linear,
  quad: linear,
  cubic: linear,
  exp: linear,
  in: () => linear,
  out: () => linear,
  inOut: () => linear,
  bezier: () => ({ factory: () => linear }),
};

export const FadeIn = {};
export const FadeOut = {};

export function createAnimatedComponent<P extends object>(
  component: ComponentType<P>,
): ComponentType<P> {
  return component;
}

const Animated = { View, createAnimatedComponent };

export default Animated;
