import { StyleSheet, Text, type TextProps } from "react-native";
import { useStyles } from "@/design-system/theme/use-styles";
import { type Palette } from "@/design-system/tokens";

export type PageTitleProps = {
  children: string;
} & Omit<TextProps, "style">;

export function PageTitle({ children, ...props }: PageTitleProps) {
  const styles = useStyles(makeStyles);

  return (
    <Text style={styles.title} {...props}>
      {children}
    </Text>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    title: {
      fontSize: 38,
      fontWeight: "900",
      color: colors.text,
      letterSpacing: -1,
    },
  });
