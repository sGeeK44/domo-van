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

/**
 * `title` names the page, `crumb` the module a settings form belongs to, and
 * `close` leaves a page that is not part of the stack under it.
 */
export type SettingsHeaderVariant = "title" | "crumb" | "close";

type Glyph = { name: "arrow-back" | "close"; size: number; muted: boolean };

const GLYPHS: Record<SettingsHeaderVariant, Glyph> = {
  title: { name: "arrow-back", size: 22, muted: false },
  crumb: { name: "arrow-back", size: 24, muted: false },
  close: { name: "close", size: 26, muted: true },
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
  const glyph = GLYPHS[variant];
  const layout = {
    title: styles.titleHeader,
    crumb: styles.crumbHeader,
    close: styles.closeHeader,
  }[variant];
  const heading = {
    title: styles.title,
    crumb: styles.crumb,
    close: styles.closeTitle,
  }[variant];

  return (
    <View testID="settings-header" style={[styles.header, layout]}>
      <Pressable onPress={onBackPress} hitSlop={10}>
        <IconSymbol
          name={glyph.name}
          size={glyph.size}
          color={glyph.muted ? colors.textMuted : colors.text}
        />
      </Pressable>
      <Text style={heading}>{title}</Text>
      {variant !== "close" && <View style={{ width: glyph.size }} />}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
    },
    titleHeader: {
      justifyContent: "space-between",
      paddingHorizontal: Spacing.xxl,
      paddingTop: Spacing.s,
      paddingBottom: Spacing.l,
    },
    crumbHeader: {
      justifyContent: "space-between",
      paddingHorizontal: Spacing.gutter,
      paddingTop: Spacing.xxl,
      paddingBottom: Spacing.l,
    },
    closeHeader: {
      gap: Spacing.xl,
      paddingHorizontal: Spacing.gutter,
      paddingVertical: Spacing.xxl,
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
    closeTitle: {
      ...TextStyles.screenTitle,
      color: colors.text,
    },
  });
