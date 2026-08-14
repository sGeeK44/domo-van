import { useMemo } from "react";
import type { StyleSheet } from "react-native";
import { useThemeColor } from "@/design-system/theme/use-theme-color";
import type { Palette } from "@/design-system/tokens";

export function useStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: Palette) => T,
): T {
  const colors = useThemeColor();
  return useMemo(() => factory(colors), [colors, factory]);
}
