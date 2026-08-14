import { StyleSheet, Text, type TextProps } from "react-native";
import { useThemeColor } from "@/design-system/theme/use-theme-color";
import {
  FontSize,
  FontWeight,
  Opacity,
  type Palette,
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

const getStyles = (colors: Palette) =>
  StyleSheet.create({
    title: {
      color: colors.text,
      fontSize: FontSize.s,
      fontWeight: `${FontWeight.extraBold}`,
      opacity: Opacity.high,
    },
  });
