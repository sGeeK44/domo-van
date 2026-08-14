import { useId } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Svg, { Defs, Pattern, Rect } from "react-native-svg";
import { useThemeColor } from "@/design-system/theme/use-theme-color";

const STRIPE = 7;

export type HatchProps = {
  /** The caller sizes it, usually with an absolute-fill style behind a gauge. */
  style?: StyleProp<ViewStyle>;
};

export function Hatch({ style }: HatchProps) {
  const colors = useThemeColor();
  const patternId = useId().replace(/:/g, "");

  return (
    <Svg width="100%" height="100%" style={style}>
      <Defs>
        <Pattern
          id={patternId}
          patternUnits="userSpaceOnUse"
          width={STRIPE}
          height={STRIPE}
          patternTransform="rotate(135)"
        >
          <Rect width={STRIPE} height={STRIPE} fill={colors.hatchBase} />
          <Rect width={STRIPE / 2} height={STRIPE} fill={colors.hatchStripe} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </Svg>
  );
}
