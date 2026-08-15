import { Pressable, StyleSheet, Text, View } from "react-native";
import { IconSymbol } from "@/design-system/atoms/icon-symbol";
import { useStyles } from "@/design-system/theme/use-styles";
import { useThemeColor } from "@/design-system/theme/use-theme-color";
import {
  FontSize,
  FontWeight,
  type Palette,
  Spacing,
  TextStyles,
} from "@/design-system/tokens";

/** `crumb` names the module a settings form belongs to; `title` names the page itself. */
export type SettingsHeaderVariant = "title" | "crumb";

const BACK_SIZE: Record<SettingsHeaderVariant, number> = {
  title: 22,
  crumb: 24,
};

export type SettingsHeaderProps = {
  title: string;
  variant?: SettingsHeaderVariant;
  onBackPress: () => void;
};

export function SettingsHeader({
  title,
  variant = "title",
  onBackPress,
}: SettingsHeaderProps) {
  const colors = useThemeColor();
  const styles = useStyles(makeStyles);
  const isCrumb = variant === "crumb";
  const backSize = BACK_SIZE[variant];

  return (
    <View
      testID="settings-header"
      style={[styles.header, isCrumb && styles.crumbHeader]}
    >
      <Pressable onPress={onBackPress} hitSlop={10}>
        <IconSymbol name="arrow-back" size={backSize} color={colors.text} />
      </Pressable>
      <Text style={isCrumb ? styles.crumb : styles.title}>{title}</Text>
      <View style={{ width: backSize }} />
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: Spacing.xxl,
      paddingTop: Spacing.s,
      paddingBottom: Spacing.l,
    },
    crumbHeader: {
      paddingHorizontal: Spacing.gutter,
      paddingTop: Spacing.xxl,
    },
    title: {
      color: colors.text,
      fontSize: FontSize.xl,
      fontWeight: `${FontWeight.extraBold}`,
    },
    crumb: {
      ...TextStyles.crumb,
      color: colors.text,
    },
  });
