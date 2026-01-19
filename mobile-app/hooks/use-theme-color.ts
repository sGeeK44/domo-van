/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from "@/design-system/theme";
import { useTheme } from "@/hooks/ThemeContext";

export function useThemeColor(): typeof Colors.light | typeof Colors.dark {
  const { colorScheme } = useTheme();
  return Colors[colorScheme];
}
