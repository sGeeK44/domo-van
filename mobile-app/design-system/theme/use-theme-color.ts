/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useTheme } from "@/design-system/theme/ThemeContext";
import { Colors, type Palette } from "@/design-system/tokens";

export function useThemeColor(): Palette {
  const { colorScheme } = useTheme();
  return Colors[colorScheme];
}
