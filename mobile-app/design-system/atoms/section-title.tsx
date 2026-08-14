import { StyleSheet, Text, type TextProps } from "react-native";
import { useStyles } from "@/design-system/theme/use-styles";
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
      color: colors.text,
      fontSize: FontSize.s,
      fontWeight: `${FontWeight.extraBold}`,
      opacity: Opacity.high,
    },
  });
