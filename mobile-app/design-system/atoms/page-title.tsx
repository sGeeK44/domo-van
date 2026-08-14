import { StyleSheet, Text, type TextProps } from "react-native";
import { useThemeColor } from "@/design-system/theme/use-theme-color";
import { type Palette } from "@/design-system/tokens";

export type PageTitleProps = {
  children: string;
} & Omit<TextProps, "style">;

export function PageTitle({ children, ...props }: PageTitleProps) {
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
      fontSize: 38,
      fontWeight: "900",
      color: colors.text,
      letterSpacing: -1,
    },
  });
