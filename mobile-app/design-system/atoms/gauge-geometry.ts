import type { ViewStyle } from "react-native";

/** Level-like quantities fill bottom-up; heat fills left-to-right. */
export type GaugeAxis = "vertical" | "horizontal";

export type GaugeExtent = Pick<ViewStyle, "width" | "height">;
export type GaugeLinePosition = Pick<ViewStyle, "left" | "bottom">;
export type GaugeLineInset = Pick<ViewStyle, "marginLeft" | "marginBottom">;

/** The meniscus and the setpoint marker are both this thick. */
export const LINE_THICKNESS = 2;

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

/** A marker at ratio 1 sits at 100 %, entirely outside the clipped surface: pull it back by its own thickness, proportionally, which also centres it on the boundary in between. */
export function markerInset(ratio: number, axis: GaugeAxis): GaugeLineInset {
  "worklet";
  const inset = -LINE_THICKNESS * clampRatio(ratio);
  return axis === "vertical" ? { marginBottom: inset } : { marginLeft: inset };
}

/** Read at render time, never from a worklet, hence no directive. A full surface has no boundary left to mark. */
export function drawsMeniscus(ratio: number, lineColor?: string): boolean {
  return lineColor !== undefined && clampRatio(ratio) < 1;
}
