import type { ViewStyle } from "react-native";

/** Level-like quantities fill bottom-up; heat fills left-to-right. */
export type GaugeAxis = "vertical" | "horizontal";

export type GaugeExtent = Pick<ViewStyle, "width" | "height">;
export type GaugeLinePosition = Pick<ViewStyle, "left" | "bottom">;

/** A reading out of range, or missing altogether, still has to paint a surface. */
export function clampRatio(ratio: number): number {
  "worklet";
  if (Number.isNaN(ratio)) return 0;
  return Math.min(1, Math.max(0, ratio));
}

function percent(ratio: number): `${number}%` {
  "worklet";
  return `${Math.round(clampRatio(ratio) * 1000) / 10}%`;
}

export function fillExtent(ratio: number, axis: GaugeAxis): GaugeExtent {
  "worklet";
  return axis === "vertical"
    ? { height: percent(ratio) }
    : { width: percent(ratio) };
}

export function linePosition(
  ratio: number,
  axis: GaugeAxis,
): GaugeLinePosition {
  "worklet";
  return axis === "vertical"
    ? { bottom: percent(ratio) }
    : { left: percent(ratio) };
}

/** Read at render time, never from a worklet, hence no directive. A full surface has no boundary left to mark. */
export function drawsMeniscus(ratio: number, lineColor?: string): boolean {
  return lineColor !== undefined && clampRatio(ratio) < 1;
}
