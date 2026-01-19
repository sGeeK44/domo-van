import { StyleSheet, Text, type TextProps } from "react-native";
import { TextColors } from "@/design-system/theme";

export type PageTitleProps = {
  children: string;
} & Omit<TextProps, "style">;

export function PageTitle({ children, ...props }: PageTitleProps) {
  return (
    <Text style={styles.title} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 38,
    fontWeight: "900",
    color: TextColors.primary,
    letterSpacing: -1,
  },
});
