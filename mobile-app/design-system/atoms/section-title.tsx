import { StyleSheet, Text, type TextProps } from "react-native";
import { FontSize, FontWeight, Opacity, TextColors } from "@/design-system/theme";

export type SectionTitleProps = {
  children: string;
} & Omit<TextProps, "style">;

export function SectionTitle({ children, ...props }: SectionTitleProps) {
  return (
    <Text style={styles.title} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    color: TextColors.primary,
    fontSize: FontSize.s,
    fontWeight: `${FontWeight.extraBold}`,
    opacity: Opacity.high,
  },
});
