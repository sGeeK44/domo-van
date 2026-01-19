import { StyleSheet, Text, type TextProps } from "react-native";
import { type ThemeColors } from "@/design-system/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

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

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    title: {
      fontSize: 38,
      fontWeight: "900",
      color: colors.text.primary,
      letterSpacing: -1,
    },
  });
