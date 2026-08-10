/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useTheme } from "@/design-system/theme/ThemeContext";
import { Colors } from "@/design-system/tokens";

export function useThemeColor(): typeof Colors.light | typeof Colors.dark {
  const { colorScheme } = useTheme();
  return Colors[colorScheme];
}
