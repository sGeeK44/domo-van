import { StyleSheet, Text, type TextProps } from "react-native";
import { useThemeColor } from "@/design-system/theme/use-theme-color";
import {
  FontSize,
  FontWeight,
  Opacity,
  type ThemeColors,
} from "@/design-system/tokens";

export type SectionTitleProps = {
  children: string;
} & Omit<TextProps, "style">;

export function SectionTitle({ children, ...props }: SectionTitleProps) {
  const colors = useThemeColor();
  const styles = getStyles(colors);

  return (
    <Text style={styles.title} {...props}>
      {children}
    </Text>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    title: {
      color: colors.text.primary,
      fontSize: FontSize.s,
      fontWeight: `${FontWeight.extraBold}`,
      opacity: Opacity.high,
    },
  });
