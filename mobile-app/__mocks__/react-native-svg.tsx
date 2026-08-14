// The real package needs native host views, so tests resolve every primitive to a stub.
import type { PropsWithChildren } from "react";
import { View } from "react-native-web";

function Stub({ children }: PropsWithChildren) {
  return <View>{children}</View>;
}

export default Stub;
export const Svg = Stub;
export const Circle = Stub;
export const Ellipse = Stub;
export const G = Stub;
export const Line = Stub;
export const Path = Stub;
export const Polygon = Stub;
export const Polyline = Stub;
export const Rect = Stub;
export const Defs = Stub;
export const Pattern = Stub;
export const Mask = Stub;
export const ClipPath = Stub;
export const LinearGradient = Stub;
export const RadialGradient = Stub;
export const Stop = Stub;
export const Text = Stub;
export const TSpan = Stub;
export const Use = Stub;
export const Symbol = Stub;
export const SvgImage = Stub;
